// Big-screen live leaderboard (live.html)
//
// Shows the top N players and makes every change visible: rows slide to
// their new rank, a changed score counts up and flashes, and the footer
// reports how long ago the last score came in.
import type { LeaderboardEntry } from './types';
import { initSupabase, getSupabaseClient } from './utils/supabase';
import { fetchLeaderboard } from './utils/player-session';

const params = new URLSearchParams(window.location.search);
const requestedTop = parseInt(params.get('top') || '30', 10);
const TOP = Math.min(100, Math.max(3, Number.isNaN(requestedTop) ? 30 : requestedTop));
// Rows per column: one column reads best up to a dozen, then split.
const COLS = TOP <= 12 ? 1 : TOP <= 30 ? 2 : 3;
const PER_COL = Math.ceil(TOP / COLS);
const SAFETY_REFRESH_MS = 30_000;
const COUNT_UP_MS = 700;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const boardEl = document.getElementById('board') as HTMLOListElement;
const emptyEl = document.getElementById('empty') as HTMLParagraphElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const playersEl = document.getElementById('players') as HTMLSpanElement;
const lastEl = document.getElementById('last') as HTMLSpanElement;

interface BoardRow {
  el: HTMLLIElement;
  rankEl: HTMLSpanElement;
  barFillEl: HTMLSpanElement;
  scoreEl: HTMLSpanElement;
  levelEl: HTMLSpanElement;
  score: number;
  counter: number | null;
}

const rows = new Map<string, BoardRow>();
let lastScoreAt: number | null = null;
let firstRender = true;

function formatScore(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

function createRow(username: string): BoardRow {
  const el = document.createElement('li');
  el.className = 'row is-entering';
  el.style.setProperty('--i', String(PER_COL));
  el.style.setProperty('--col', String(COLS - 1));
  const span = (className: string, text = ''): HTMLSpanElement => {
    const s = document.createElement('span');
    s.className = className;
    s.textContent = text;
    return s;
  };
  const rankEl = span('row-rank');
  const userEl = span('row-user', username);
  const barEl = span('row-bar');
  const barFillEl = span('row-bar-fill');
  const scoreEl = span('row-score', '0');
  const levelEl = span('row-level');
  barEl.appendChild(barFillEl);
  el.append(rankEl, userEl, barEl, scoreEl, levelEl);
  boardEl.appendChild(el);

  return { el, rankEl, barFillEl, scoreEl, levelEl, score: 0, counter: null };
}

function countUp(row: BoardRow, from: number, to: number): void {
  if (row.counter !== null) cancelAnimationFrame(row.counter);
  if (reduceMotion || from === to) {
    row.scoreEl.textContent = formatScore(to);
    return;
  }
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / COUNT_UP_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    row.scoreEl.textContent = formatScore(Math.round(from + (to - from) * eased));
    row.counter = t < 1 ? requestAnimationFrame(step) : null;
  };
  row.counter = requestAnimationFrame(step);
}

function flash(row: BoardRow): void {
  row.el.classList.remove('is-flash');
  void row.el.offsetWidth; // restart the animation
  row.el.classList.add('is-flash');
}

function render(entries: LeaderboardEntry[]): void {
  const top = entries.filter(e => !!e.username).slice(0, TOP);
  emptyEl.hidden = top.length > 0;

  const leaderScore = top[0]?.score || 1;
  const seen = new Set<string>();
  const created: BoardRow[] = [];

  top.forEach((entry, index) => {
    const key = entry.username as string;
    seen.add(key);

    let row = rows.get(key);
    if (!row) {
      row = createRow(key);
      rows.set(key, row);
      created.push(row);
    }

    row.rankEl.textContent = String(index + 1);
    row.levelEl.textContent = `Lv.${entry.current_level ?? '-'}`;
    row.el.classList.toggle('is-top', index < 3);
    row.barFillEl.style.width = `${Math.max(3, Math.round((entry.score / leaderScore) * 100))}%`;

    if (entry.score !== row.score) {
      countUp(row, row.score, entry.score);
      if (!firstRender && !created.includes(row)) flash(row);
      row.score = entry.score;
    }

    const changedAt = entry.updated_at ? Date.parse(entry.updated_at) : 0;
    if (changedAt && (lastScoreAt === null || changedAt > lastScoreAt)) {
      lastScoreAt = changedAt;
    }
  });

  // Slide new rows up from the bottom once they exist in the DOM.
  if (created.length > 0) {
    void boardEl.offsetHeight;
    requestAnimationFrame(() => {
      created.forEach(row => row.el.classList.remove('is-entering'));
      positionRows(top);
    });
  } else {
    positionRows(top);
  }

  // Rows that fell off the list drop out of view.
  for (const [key, row] of rows) {
    if (seen.has(key)) continue;
    rows.delete(key);
    row.el.classList.add('is-leaving');
    row.el.style.setProperty('--i', String(PER_COL));
    window.setTimeout(() => row.el.remove(), 600);
  }

  firstRender = false;
  updateLastScoreLabel();
}

function positionRows(top: LeaderboardEntry[]): void {
  top.forEach((entry, index) => {
    const el = rows.get(entry.username as string)?.el;
    if (!el) return;
    el.style.setProperty('--col', String(Math.floor(index / PER_COL)));
    el.style.setProperty('--i', String(index % PER_COL));
  });
}

function sizeBoard(): void {
  boardEl.style.setProperty('--rows', String(PER_COL));
  boardEl.style.setProperty('--cols', String(COLS));
  boardEl.style.setProperty('--row-px', `${boardEl.clientHeight / PER_COL}px`);
  boardEl.classList.toggle('is-compact', COLS > 1);
}

async function refreshPlayerCount(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { count, error } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .gt('score', 0);
  if (error || count === null) return;
  playersEl.textContent = `${count} ${count === 1 ? 'player' : 'players'}`;
}

function updateLastScoreLabel(): void {
  if (lastScoreAt === null) {
    lastEl.textContent = 'Waiting for the first score';
    return;
  }
  const seconds = Math.max(0, Math.round((Date.now() - lastScoreAt) / 1000));
  let ago: string;
  if (seconds < 60) ago = `${seconds} s ago`;
  else if (seconds < 3600) ago = `${Math.floor(seconds / 60)} min ago`;
  else if (seconds < 86400) ago = `${Math.floor(seconds / 3600)} h ago`;
  else ago = `${Math.floor(seconds / 86400)} days ago`;
  lastEl.textContent = `Last score ${ago}`;
}

function setConnection(live: boolean, label: string): void {
  statusEl.classList.toggle('is-live', live);
  statusEl.textContent = label;
}

async function refresh(): Promise<void> {
  const [entries] = await Promise.all([fetchLeaderboard(TOP), refreshPlayerCount()]);
  render(entries);
}

// ?demo=1 fills the board with sample players and keeps them moving, so staff
// can check the stage screen before the event without real scores.
function startDemo(): void {
  const names = ['ASF', 'RK7', 'ELA', 'OKI', 'DAN', 'BLO', '999', 'RK1', 'LII', 'FCK',
    'MAX', 'ZOE', 'TOM', 'ANA', 'LEO', 'EVA', 'NIK', 'IVO', 'KAT', 'JAN',
    'ULA', 'RAJ', 'MIA', 'BEN', 'INA', 'OTO', 'PIA', 'ROB', 'SAM', 'TEO',
    'UGO', 'VIK', 'WIM', 'XIA', 'YAN', 'ZAK'];
  const demo: LeaderboardEntry[] = names.slice(0, TOP + 2).map((username, i) => ({
    username,
    score: 7800 - i * 190,
    current_level: Math.max(1, 10 - Math.floor(i / 4)),
    updated_at: new Date().toISOString()
  }));
  const paint = (): void => {
    demo.sort((a, b) => b.score - a.score);
    render(demo.map(e => ({ ...e })));
    playersEl.textContent = `${demo.length} players`;
  };
  sizeBoard();
  window.addEventListener('resize', sizeBoard);
  setConnection(true, 'Demo');
  paint();
  window.setInterval(() => {
    const pick = demo[Math.floor(Math.random() * demo.length)];
    pick.score = Math.min(10000, pick.score + 250 + Math.floor(Math.random() * 600));
    pick.updated_at = new Date().toISOString();
    lastScoreAt = Date.now();
    paint();
  }, 3000);
  window.setInterval(updateLastScoreLabel, 1000);
}

function start(): void {
  if (params.get('demo') === '1') {
    startDemo();
    return;
  }

  const supabase = initSupabase();
  if (!supabase) {
    setConnection(false, 'Not connected');
    emptyEl.hidden = false;
    emptyEl.textContent = 'Leaderboard unavailable: Supabase is not configured.';
    return;
  }

  sizeBoard();
  window.addEventListener('resize', sizeBoard);
  refresh();

  supabase
    .channel('live-board')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
      lastScoreAt = Date.now();
      refresh();
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') setConnection(true, 'Live');
      else setConnection(false, 'Reconnecting');
    });

  // Belt and braces for long events: refetch even if the socket goes quiet.
  window.setInterval(refresh, SAFETY_REFRESH_MS);
  window.setInterval(updateLastScoreLabel, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
}

start();

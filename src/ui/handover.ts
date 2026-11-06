// Laptop hand-over: shows who is playing, offers "New player", and resets
// the session after inactivity so event staff never have to clear anything.
import { getPlayerSession, clearPlayerSession } from '../utils/player-session';
import { saveMusicPosition } from '../utils/sounds';

const IDLE_QUIET_MS = 150_000;   // silence before the warning appears
const IDLE_WARNING_S = 30;       // countdown shown before reset

let idleTimer: number | null = null;
let countdownTimer: number | null = null;

function startOver(target: string): void {
  clearPlayerSession();
  saveMusicPosition();
  window.location.href = target;
}

/**
 * Fill the "Playing as ABC" bar. Hidden until someone has registered.
 */
export function refreshPlayerBar(): void {
  const bar = document.getElementById('player-bar');
  const label = document.getElementById('player-label');
  if (!bar || !label) return;

  const session = getPlayerSession();
  if (!session) {
    bar.hidden = true;
    return;
  }
  label.textContent = '';
  label.append('Playing as ');
  const name = document.createElement('strong');
  name.textContent = session.username;
  label.append(name);
  bar.hidden = false;
}

function createConfirmModal(): { show: () => void } {
  const modal = document.createElement('div');
  modal.id = 'new-player-modal';
  modal.className = 'modal';

  const content = document.createElement('div');
  content.className = 'modal-content modal-content--medium';

  const body = document.createElement('div');
  body.className = 'modal-body';

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = 'Hand over to a new player?';

  const text = document.createElement('p');
  text.className = 'modal-text';

  const buttons = document.createElement('div');
  buttons.className = 'handover-buttons';

  const confirm = document.createElement('button');
  confirm.className = 'modal-btn modal-btn--primary';
  confirm.textContent = 'New player';

  const cancel = document.createElement('button');
  cancel.className = 'modal-btn handover-cancel';
  cancel.textContent = 'Keep playing';

  buttons.append(confirm, cancel);
  body.append(title, text, buttons);
  content.append(body);
  modal.append(content);
  document.getElementById('modal-container')?.appendChild(modal);

  confirm.onclick = () => startOver('/play.html?level=1');
  cancel.onclick = () => { modal.style.display = 'none'; };
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });

  return {
    show: () => {
      const session = getPlayerSession();
      text.textContent = session
        ? `${session.username}'s score is saved. The next player will sign up with their own email.`
        : 'The next player will sign up with their own email.';
      modal.style.display = 'block';
    }
  };
}

function createIdleOverlay(): { show: () => void; hide: () => void; setSeconds: (s: number) => void } {
  const modal = document.createElement('div');
  modal.id = 'idle-modal';
  modal.className = 'modal';

  const content = document.createElement('div');
  content.className = 'modal-content modal-content--medium';

  const body = document.createElement('div');
  body.className = 'modal-body';

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = 'Still playing?';

  const text = document.createElement('p');
  text.className = 'modal-text';
  const before = document.createTextNode('Starting over for the next player in ');
  const seconds = document.createElement('strong');
  seconds.textContent = String(IDLE_WARNING_S);
  const after = document.createTextNode(' s.');
  text.append(before, seconds, after);

  const keep = document.createElement('button');
  keep.className = 'modal-btn modal-btn--primary';
  keep.textContent = "I'm still playing";

  body.append(title, text, keep);
  content.append(body);
  modal.append(content);
  document.getElementById('modal-container')?.appendChild(modal);

  keep.onclick = () => resetIdleTimer();

  return {
    show: () => { modal.style.display = 'block'; },
    hide: () => { modal.style.display = 'none'; },
    setSeconds: (s: number) => { seconds.textContent = String(s); }
  };
}

let idleOverlay: ReturnType<typeof createIdleOverlay> | null = null;

function clearTimers(): void {
  if (idleTimer !== null) window.clearTimeout(idleTimer);
  if (countdownTimer !== null) window.clearInterval(countdownTimer);
  idleTimer = null;
  countdownTimer = null;
}

function resetIdleTimer(): void {
  clearTimers();
  idleOverlay?.hide();

  // Nobody registered yet: nothing to reset.
  if (!getPlayerSession()) return;

  idleTimer = window.setTimeout(() => {
    let remaining = IDLE_WARNING_S;
    idleOverlay?.setSeconds(remaining);
    idleOverlay?.show();
    countdownTimer = window.setInterval(() => {
      remaining -= 1;
      idleOverlay?.setSeconds(remaining);
      if (remaining <= 0) {
        clearTimers();
        startOver('/index.html');
      }
    }, 1000);
  }, IDLE_QUIET_MS);
}

/**
 * Wire the player bar, the New player button and the idle reset.
 */
export function initHandover(): void {
  refreshPlayerBar();

  const confirmModal = createConfirmModal();
  idleOverlay = createIdleOverlay();

  document.getElementById('new-player-btn')?.addEventListener('click', () => confirmModal.show());

  // Any real interaction counts as activity. The countdown overlay's own
  // button calls resetIdleTimer, so clicks inside it are covered too.
  const activity = () => {
    if (countdownTimer !== null) return; // let the warning stand until they answer it
    resetIdleTimer();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, activity, { passive: true })
  );

  resetIdleTimer();
}

// Main game initialization for play page
import type { LevelEntry, LeaderboardEntry, GameState, AnimationState } from './types';
import { createEngine, calculateScore, countCommands } from './engine/index';
import { drawLevel, initRenderer } from './render/index';
import { levels, getLevelByPassword, getLevelByNumber } from './levels/index';
import { initSounds, loadSoundPreference, toggleSound, isSoundEnabled, playBackgroundMusic, saveMusicPosition } from './utils/sounds';
import { initTerminal, getTerminalCommands } from './ui/terminal';
import { initMobileCommands } from './ui/mobile-commands';
import { createPasswordModal, createIntroModal, createRegistrationModal } from './ui/modals';
import { initNavigation, navigateToNextLevel } from './ui/navigation';
import { initSupabase } from './utils/supabase';
import { 
  isPlayerRegistered, 
  getPlayerSession, 
  registerPlayer, 
  updatePlayerScore, 
  subscribeToLeaderboard
} from './utils/player-session';
import { animateCelebration } from './render/animations';

// Get level from URL: /play.html?level=1 or /play.html?password=JMP
function getCurrentLevel(): LevelEntry | null {
  const params = new URLSearchParams(window.location.search);
  
  const levelNum = params.get('level');
  if (levelNum) {
    return getLevelByNumber(parseInt(levelNum, 10));
  }
  
  const password = params.get('password');
  if (password) {
    return getLevelByPassword(password);
  }
  
  // Default to level 1
  return getLevelByNumber(1);
}

async function initGame(): Promise<void> {
  const levelInfo = getCurrentLevel();
  if (!levelInfo) {
    window.location.href = '/index.html';
    return;
  }
  
  const level = levelInfo.data;
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const engine = createEngine(level);
  const status = document.getElementById('status')!;
  const scoreDisplay = document.getElementById('score')!;
  const terminal = document.getElementById('terminal') as HTMLTextAreaElement;
  
  // Update UI with level info
  const levelTitle = document.getElementById('level-title');
  const levelPassword = document.getElementById('level-password');
  if (levelTitle) levelTitle.textContent = `Level ${levelInfo.number}`;
  if (levelPassword) levelPassword.textContent = `pass: ${levelInfo.password}`;
  document.title = `Startie – Level ${levelInfo.number}`;
  
  // Initialize systems
  loadSoundPreference();
  initSounds();
  initTerminal(terminal);
  
  // Set starter hints in terminal
  if (levelInfo.hints && levelInfo.hints.length > 0) {
    terminal.value = levelInfo.hints.map(cmd => `> ${cmd}`).join('\n');
  }
  
  // Initialize mobile commands if on mobile
  const mobileCommands = initMobileCommands(terminal, updateScore);
  
  // Show while button on mobile if level has a laptop
  if (level.laptop) {
    const whileBtn = document.getElementById('while-btn');
    if (whileBtn) {
      whileBtn.style.display = 'block';
    }
  }
  
  // Initialize modals
  const passwordModal = createPasswordModal(levels);
  
  // Create registration modal
  const registrationModal = createRegistrationModal(registerPlayer);
  
  // Show intro modal on level 1, then registration if not registered
  if (levelInfo.number === 1) {
    createIntroModal(levelInfo.number, () => {
      // After intro closes, show registration if not already registered
      if (!isPlayerRegistered()) {
        registrationModal.show();
      }
    });
  }
  
  // Navigation
  initNavigation(levelInfo);
  
  document.getElementById('password-btn')?.addEventListener('click', () => passwordModal.show());
  document.getElementById('mobile-password-btn')?.addEventListener('click', () => passwordModal.show());
  
  // Initialize Supabase
  initSupabase();
  
  // Check if on mobile
  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
  
  // Store latest leaderboard for mobile modal
  let latestLeaderboard: LeaderboardEntry[] = [];
  
  // Initialize highscores panel with real-time updates
  let unsubscribeLeaderboard: (() => void) | null = null;
  
  function updateHighscoresPanel(leaderboard: LeaderboardEntry[]): void {
    latestLeaderboard = leaderboard; // Store for mobile modal
    
    const highscoresList = document.getElementById('highscores-list');
    if (!highscoresList) return;
    
    highscoresList.innerHTML = '';
    
    if (!leaderboard || leaderboard.length === 0) {
      highscoresList.innerHTML = '<div class="highscore-empty">No scores yet</div>';
      return;
    }
    
    // Get current player to highlight their entry
    const session = getPlayerSession();
    
    leaderboard.forEach((entry, index) => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'highscore-entry';
      const isCurrentPlayer = session && entry.username === session.username;
      const rankClass = index < 3 ? 'highscore-rank highscore-rank--top' : 'highscore-rank';
      const codeClass = isCurrentPlayer ? 'highscore-code highscore-code--current' : 'highscore-code';
      entryDiv.innerHTML = `
        <span class="${rankClass}">#${index + 1}</span>
        <span class="${codeClass}">${entry.username}</span>
        <span class="highscore-score">${entry.score.toLocaleString()}</span>
      `;
      highscoresList.appendChild(entryDiv);
    });
  }
  
  // Show mobile highscores modal
  function showMobileHighscores(onContinue: () => void): void {
    const modal = document.getElementById('mobile-highscores-modal');
    const list = document.getElementById('mobile-highscores-list');
    const continueBtn = document.getElementById('mobile-highscores-continue');
    
    if (!modal || !list || !continueBtn) return;
    
    // Update button text based on whether there's a next level
    continueBtn.textContent = levelInfo.next ? 'Continue to Next Level' : 'Go to Leaderboard';
    
    list.innerHTML = '';
    
    if (latestLeaderboard.length === 0) {
      list.innerHTML = '<div class="highscore-empty">No scores yet</div>';
    } else {
      const session = getPlayerSession();
      latestLeaderboard.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'highscore-entry';
        const isCurrentPlayer = session && entry.username === session.username;
        const rankClass = index < 3 ? 'highscore-rank highscore-rank--top' : 'highscore-rank';
        const codeClass = isCurrentPlayer ? 'highscore-code highscore-code--current' : 'highscore-code';
        entryDiv.innerHTML = `
          <span class="${rankClass}">#${index + 1}</span>
          <span class="${codeClass}">${entry.username}</span>
          <span class="highscore-score">${entry.score.toLocaleString()}</span>
        `;
        list.appendChild(entryDiv);
      });
    }
    
    modal.style.display = 'block';
    
    continueBtn.onclick = () => {
      modal.style.display = 'none';
      onContinue();
    };
  }
  
  // Subscribe to real-time leaderboard updates
  unsubscribeLeaderboard = subscribeToLeaderboard(updateHighscoresPanel);
  
  // Start background music automatically when level 1 loads
  if (levelInfo.number === 1) {
    playBackgroundMusic(true);
  } else {
    playBackgroundMusic(false);
  }
  
  // Sound toggle button
  const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
  function updateSoundButton(): void {
    soundToggle.textContent = isSoundEnabled() ? '🔊' : '🔇';
    soundToggle.classList.toggle('muted', !isSoundEnabled());
  }
  updateSoundButton();
  
  soundToggle.onclick = () => {
    toggleSound();
    updateSoundButton();
  };
  
  // Real-time score calculation
  function updateScore(): void {
    const commandText = mobileCommands ? mobileCommands.getCommands() : getTerminalCommands(terminal);
    const lines = commandText.trim().split('\n').filter(l => l);
    
    if (lines.length === 0) {
      scoreDisplay.textContent = 'SCORE: 1000';
      return;
    }
    
    const result = engine.parse(commandText);
    if (result.error || !result.actions) {
      scoreDisplay.textContent = 'SCORE: 1000';
      return;
    }
    
    const commandCount = countCommands(result.actions);
    const score = calculateScore(commandCount);
    scoreDisplay.textContent = `SCORE: ${score}`;
  }
  
  terminal.addEventListener('input', updateScore);
  updateScore();
  
  // Initialize game state
  engine.state.x = level.start.x;
  engine.state.y = level.start.y;
  engine.state.z = 0;
  engine.state.facing = 'SE';
  
  // Initialize renderer
  initRenderer(() => {
    drawLevel(ctx, level, engine.state, engine.animState);
  }, level);
  drawLevel(ctx, level, engine.state, engine.animState);
  
  // Run button
  const runButton = document.getElementById('run') as HTMLButtonElement;
  runButton.onclick = () => {
    status.textContent = '';
    
    const commandText = mobileCommands ? mobileCommands.getCommands() : getTerminalCommands(terminal);
    
    if (!commandText.trim()) {
      status.textContent = 'No commands to execute';
      return;
    }
    
    const result = engine.parse(commandText);
    if (result.error) {
      status.textContent = result.error;
      return;
    }

    if (!result.actions || result.actions.length === 0) {
      status.textContent = 'No commands to execute';
      return;
    }

    engine.execute(result.actions, (s: GameState, animState: AnimationState) => drawLevel(ctx, level, s, animState), (s: GameState) => {
      if (s.failed) {
        status.textContent = 'Game Over — Try Again';
      } else {
        // Check win condition
        const isAtGoal = level.goals.some(g => s.x === g.x && s.y === g.y);
        
        // For multi-goal levels, check if all goals are visited
        const hasCompletedLevel = level.goals.length === 1 
          ? isAtGoal
          : s.visitedGoals.size >= level.goals.length;
        
        if (hasCompletedLevel) {
          const commandCount = countCommands(result.actions!);
          const score = calculateScore(commandCount);
          scoreDisplay.textContent = `SCORE: ${score}`;
          
          // Update player score in database
          updatePlayerScore(score, levelInfo.number);
          
          status.textContent = '✓ Level Complete';
          animateCelebration(s, (state: GameState) => drawLevel(ctx, level, state, engine.animState), 1500);
          
          // On mobile, show highscores modal before navigating
          if (isMobile) {
            setTimeout(() => {
              showMobileHighscores(() => {
                navigateToNextLevel(levelInfo);
              });
            }, 1800);
          } else {
            setTimeout(() => {
              navigateToNextLevel(levelInfo);
            }, 2000);
          }
        } else {
          status.textContent = 'Try again';
        }
      }
    });
  };
  
  // Save music position before page unload
  window.addEventListener('beforeunload', () => {
    saveMusicPosition();
    // Cleanup leaderboard subscription
    if (unsubscribeLeaderboard) {
      unsubscribeLeaderboard();
    }
  });
}

// Start the game
initGame();

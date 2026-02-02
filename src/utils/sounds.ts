// Sound manager for game audio
import { getAssetPath } from './assets';

let soundEnabled = true;
let backgroundMusic: HTMLAudioElement | null = null;
let jumpSound: HTMLAudioElement | null = null;
let spinSound: HTMLAudioElement | null = null;

// Initialize sounds
export function initSounds(): void {
  // Background music
  backgroundMusic = new Audio(getAssetPath('sounds/soundtrack.mp3'));
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.1;
  
  // Track playback position for seamless transitions
  backgroundMusic.addEventListener('timeupdate', () => {
    if (backgroundMusic && !backgroundMusic.paused) {
      sessionStorage.setItem('musicPosition', backgroundMusic.currentTime.toString());
      sessionStorage.setItem('musicTimestamp', Date.now().toString());
    }
  });
  
  // Jump sound
  jumpSound = new Audio(getAssetPath('sounds/jumpsound.mp3'));
  jumpSound.volume = 0.01;
  
  // Spin sound
  spinSound = new Audio(getAssetPath('sounds/spinsound.mp3'));
  spinSound.volume = 0.05;
}

// Toggle sound on/off
export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  
  if (!soundEnabled) {
    // Stop all sounds (pause but keep position for seamless resume)
    if (backgroundMusic) {
      // Save current playing state before pausing
      const wasPlaying = !backgroundMusic.paused;
      if (wasPlaying) {
        sessionStorage.setItem('wasMusicPlayingBeforeMute', 'true');
      }
      backgroundMusic.pause();
    }
  } else {
    // Sound enabled - resume music if it was playing before muting
    if (backgroundMusic) {
      const wasPlayingBeforeMute = sessionStorage.getItem('wasMusicPlayingBeforeMute') === 'true';
      const shouldPlay = localStorage.getItem('musicPlaying') === 'true';
      
      // Resume if it should be playing (either from localStorage or was playing before mute)
      if (shouldPlay || wasPlayingBeforeMute) {
        backgroundMusic.play().catch(err => {
          console.log('Background music resume blocked:', err);
        });
        localStorage.setItem('musicPlaying', 'true');
        sessionStorage.removeItem('wasMusicPlayingBeforeMute'); // Clear the flag
      }
    }
  }
  
  // Save preference to localStorage
  localStorage.setItem('soundEnabled', soundEnabled.toString());
  
  return soundEnabled;
}

// Get current sound state
export function isSoundEnabled(): boolean {
  return soundEnabled;
}

// Load sound preference from localStorage
export function loadSoundPreference(): void {
  const saved = localStorage.getItem('soundEnabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
}

// Play background music (only if not already playing)
export function playBackgroundMusic(forceStart = false): void {
  if (soundEnabled && backgroundMusic) {
    // Check if music is already playing to avoid restarting
    if (backgroundMusic.paused) {
      // Try to resume from previous position for seamless transitions
      const savedPosition = sessionStorage.getItem('musicPosition');
      const savedTimestamp = sessionStorage.getItem('musicTimestamp');
      
      if (savedPosition && savedTimestamp && !forceStart) {
        // Calculate elapsed time since last save
        const elapsed = (Date.now() - parseInt(savedTimestamp)) / 1000;
        const resumePosition = parseFloat(savedPosition) + elapsed;
        
        // Set position (will wrap if past end due to loop)
        // Wait for metadata to load if duration is not available
        if (backgroundMusic.duration && !isNaN(backgroundMusic.duration)) {
          backgroundMusic.currentTime = resumePosition % backgroundMusic.duration;
        } else {
          backgroundMusic.addEventListener('loadedmetadata', () => {
            if (backgroundMusic) {
              backgroundMusic.currentTime = resumePosition % backgroundMusic.duration;
            }
          }, { once: true });
        }
      } else if (forceStart) {
        // Force start from beginning (level 1)
        backgroundMusic.currentTime = 0;
      }
      
      backgroundMusic.play().catch(err => {
        // Autoplay may be blocked, that's okay
        console.log('Background music autoplay blocked:', err);
      });
    }
    // Mark that music should be playing
    localStorage.setItem('musicPlaying', 'true');
  }
}

// Stop background music
export function stopBackgroundMusic(): void {
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
  localStorage.setItem('musicPlaying', 'false');
  sessionStorage.removeItem('musicPosition');
  sessionStorage.removeItem('musicTimestamp');
}

// Save music position before page unload (for seamless transitions)
export function saveMusicPosition(): void {
  if (backgroundMusic && !backgroundMusic.paused) {
    sessionStorage.setItem('musicPosition', backgroundMusic.currentTime.toString());
    sessionStorage.setItem('musicTimestamp', Date.now().toString());
  }
}

// Auto-start music on level load if it should be playing
export function autoStartMusic(): void {
  const shouldPlay = localStorage.getItem('musicPlaying') === 'true';
  if (shouldPlay && soundEnabled) {
    playBackgroundMusic();
  }
}

// Play jump sound
export function playJumpSound(): void {
  if (soundEnabled && jumpSound) {
    jumpSound.currentTime = 0; // Reset to start
    jumpSound.play().catch(() => {
      // Ignore play errors
    });
  }
}

// Play spin sound
export function playSpinSound(): void {
  if (soundEnabled && spinSound) {
    spinSound.currentTime = 0; // Reset to start
    spinSound.play().catch(() => {
      // Ignore play errors
    });
  }
}

// Play fall sound (reuse spin sound for now, or can be separate)
export function playFallSound(): void {
  if (soundEnabled && spinSound) {
    spinSound.currentTime = 0; // Reset to start
    spinSound.play().catch(() => {
      // Ignore play errors
    });
  }
}

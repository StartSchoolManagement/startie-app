// Navigation buttons
import type { LevelEntry } from '../types';
import { saveMusicPosition } from '../utils/sounds';
import { levels } from '../levels/index';

export function initNavigation(levelInfo: LevelEntry): void {
  const homeBtn = document.getElementById('home-btn');
  const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
  const mobileHomeBtn = document.getElementById('mobile-home-btn');
  const mobilePrevBtn = document.getElementById('mobile-prev-btn') as HTMLButtonElement | null;
  
  // Home buttons
  if (homeBtn) {
    homeBtn.onclick = () => {
      saveMusicPosition();
      window.location.href = '/index.html';
    };
  }
  
  if (mobileHomeBtn) {
    mobileHomeBtn.onclick = () => {
      saveMusicPosition();
      window.location.href = '/index.html';
    };
  }
  
  // Previous level buttons
  if (levelInfo.prev !== null) {
    const prevPassword = levels[levelInfo.prev]?.password;
    if (prevBtn) {
      prevBtn.disabled = false;
      prevBtn.onclick = () => {
        saveMusicPosition();
        window.location.href = `/play.html?password=${prevPassword}`;
      };
    }
    
    if (mobilePrevBtn) {
      mobilePrevBtn.disabled = false;
      mobilePrevBtn.onclick = () => {
        saveMusicPosition();
        window.location.href = `/play.html?password=${prevPassword}`;
      };
    }
  } else {
    // Disable if no previous level
    if (prevBtn) prevBtn.disabled = true;
    if (mobilePrevBtn) mobilePrevBtn.disabled = true;
  }
}

export function navigateToNextLevel(levelInfo: LevelEntry): void {
  saveMusicPosition();
  if (levelInfo.next !== null) {
    const nextPassword = levels[levelInfo.next]?.password;
    window.location.href = `/play.html?password=${nextPassword}`;
  } else {
    // Final level - go to highscores
    window.location.href = '/highscores.html';
  }
}

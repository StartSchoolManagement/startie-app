// Modal management
import type { ModalController, LevelInfo, RegistrationResult, RegistrationData } from '../types';

export type { RegistrationData };

export function createPasswordModal(levels: Record<number, LevelInfo>): ModalController {
  const modal = document.createElement('div');
  modal.id = 'password-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Enter Level Password</h2>
      <input type="text" id="password-input" placeholder="Password">
      <button id="password-submit">Go</button>
      <div id="password-error"></div>
    </div>
  `;
  
  document.getElementById('modal-container')?.appendChild(modal);
  
  const closeBtn = modal.querySelector('.close') as HTMLSpanElement;
  const passwordSubmit = modal.querySelector('#password-submit') as HTMLButtonElement;
  const passwordInput = modal.querySelector('#password-input') as HTMLInputElement;
  const errorDiv = modal.querySelector('#password-error') as HTMLDivElement;
  
  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };
  
  window.onclick = (e: MouseEvent) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };
  
  passwordSubmit.onclick = () => {
    const password = passwordInput.value.trim();
    if (!password) {
      errorDiv.textContent = 'Please enter a password';
      return;
    }
    
    const levelData = Object.values(levels).find(l => l.password.toLowerCase() === password.toLowerCase());
    
    if (levelData) {
      window.location.href = `/play.html?password=${password.toUpperCase()}`;
    } else {
      errorDiv.textContent = 'Incorrect password';
    }
  };
  
  passwordInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      passwordSubmit.click();
    }
  });
  
  return {
    show: () => {
      modal.style.display = 'block';
      passwordInput.value = '';
      errorDiv.textContent = '';
      setTimeout(() => passwordInput.focus(), 100);
    },
    hide: () => {
      modal.style.display = 'none';
    }
  };
}

export function createIntroModal(levelNumber: number, onClose: (() => void) | null = null): HTMLDivElement | null {
  if (levelNumber !== 1) return null;
  
  const modal = document.createElement('div');
  modal.id = 'intro-modal';
  modal.className = 'modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content modal-content--wide">
      <div class="modal-body modal-body--compact">
        <img id="intro-celebrate-img" src="/celebrate.png" alt="Startie" class="intro-image">
        <h2 class="modal-title">Hi, I'm Startie!</h2>
        <p class="modal-text">Can you get me to the next level?<br>Write code to move me around, the less commands you write, the higher your score!</p>
        <button id="intro-close" class="intro-button">Let's Go!</button>
      </div>
    </div>
  `;
  
  document.getElementById('modal-container')?.appendChild(modal);
  
  const closeBtn = modal.querySelector('#intro-close') as HTMLButtonElement;
  const celebrateImg = modal.querySelector('#intro-celebrate-img') as HTMLImageElement;
  
  const handleClose = (): void => {
    modal.style.display = 'none';
    if (onClose) onClose();
  };
  
  closeBtn.onclick = handleClose;
  
  window.onclick = (e: MouseEvent) => {
    if (e.target === modal) {
      handleClose();
    }
  };
  
  // Animate the celebrate image
  if (celebrateImg) {
    import('../render/animations').then(({ animateCelebrationImage }) => {
      celebrateImg.onload = () => {
        animateCelebrationImage(celebrateImg, 1500);
      };
      if (celebrateImg.complete) {
        animateCelebrationImage(celebrateImg, 1500);
      }
    });
  }
  
  return modal;
}

/**
 * Registration data interface
 */
export interface RegistrationData {
  name: string;
  username: string;
  email: string;
  consent: boolean;
}

/**
 * Create registration modal for capturing user data after level 1
 */
export function createRegistrationModal(onRegister: (data: RegistrationData) => Promise<RegistrationResult>): ModalController {
  const modal = document.createElement('div');
  modal.id = 'registration-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content modal-content--medium">
      <div class="modal-body">
        <h2 class="modal-title modal-title--tight">Join the Leaderboard!</h2>
        <p class="modal-text--muted">
          Enter your details to compete with other players!<br>
          Your scores will update in real-time as you progress.
        </p>
        
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="reg-name" placeholder="Your Name" class="form-input">
        </div>
        
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="reg-email" placeholder="your@email.com" class="form-input">
        </div>
        
        <div class="form-group">
          <label class="form-label">Username (3 characters)</label>
          <input type="text" id="reg-username" placeholder="ABC" maxlength="3" class="form-input form-input--username">
        </div>
        
        <div class="form-group form-group--checkbox">
          <label class="checkbox-label">
            <input type="checkbox" id="reg-consent" class="form-checkbox">
            <span class="checkbox-text">I agree to receive StartSchool announcements</span>
          </label>
        </div>
        
        <div id="reg-error" class="form-error"></div>
        
        <button id="reg-submit" class="modal-btn modal-btn--primary">
          Start Playing
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('modal-container')?.appendChild(modal);
  
  const nameInput = modal.querySelector('#reg-name') as HTMLInputElement;
  const emailInput = modal.querySelector('#reg-email') as HTMLInputElement;
  const usernameInput = modal.querySelector('#reg-username') as HTMLInputElement;
  const consentCheckbox = modal.querySelector('#reg-consent') as HTMLInputElement;
  const errorDiv = modal.querySelector('#reg-error') as HTMLDivElement;
  const submitBtn = modal.querySelector('#reg-submit') as HTMLButtonElement;
  
  // Auto-uppercase username
  usernameInput.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  
  submitBtn.onclick = async () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const username = usernameInput.value.trim().toUpperCase();
    const consent = consentCheckbox.checked;
    
    errorDiv.textContent = '';
    
    // Validate name
    if (!name || name.length < 2) {
      errorDiv.textContent = 'Please enter your name (at least 2 characters)';
      return;
    }
    
    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorDiv.textContent = 'Please enter a valid email address';
      return;
    }
    
    // Validate username
    if (username.length !== 3 || !/^[A-Z0-9]{3}$/.test(username)) {
      errorDiv.textContent = 'Username must be exactly 3 letters or numbers';
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Starting...';
    
    try {
      const result = await onRegister({ name, email, username, consent });
      
      if (result.success) {
        // Registration successful - close modal and start playing
        modal.style.display = 'none';
      } else {
        errorDiv.textContent = result.error || 'Registration failed. Please try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Start Playing';
      }
    } catch (error) {
      errorDiv.textContent = (error as Error).message || 'An error occurred';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Start Playing';
    }
  };
  
  // Enter key navigation
  nameInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') emailInput.focus();
  });
  emailInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') usernameInput.focus();
  });
  usernameInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') submitBtn.click();
  });
  
  return {
    show: () => {
      modal.style.display = 'block';
      setTimeout(() => nameInput.focus(), 100);
    },
    hide: () => {
      modal.style.display = 'none';
    }
  };
}

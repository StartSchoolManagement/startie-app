// Mobile command palette (drag-and-drop interface)
import type { MobileCommandsController } from '../types';

interface CommandItem {
  type: 'command' | 'while';
  value: string;
  children?: CommandItem[]; // For while loops
}

export function initMobileCommands(terminal: HTMLTextAreaElement, onCommandsChange: () => void): MobileCommandsController | null {
  const terminalDropZone = document.getElementById('terminal-drop-zone');
  let commandItems: CommandItem[] = []; // Structured command storage

  // Check if mobile (touch device or small screen)
  const isMobileDevice = window.innerWidth <= 768 || ('ontouchstart' in window);

  if (!isMobileDevice || !terminalDropZone) return null;

  // Convert structured commands to flat string array for terminal
  function flattenCommands(items: CommandItem[]): string[] {
    const result: string[] = [];
    items.forEach(item => {
      if (item.type === 'while') {
        result.push('while(hacking) {');
        if (item.children) {
          item.children.forEach(child => {
            result.push(child.value);
          });
        }
        result.push('}');
      } else {
        result.push(item.value);
      }
    });
    return result;
  }

  // Create a command chip element
  function createCommandChip(cmd: string, onRemove: () => void, onParamChange?: (newCmd: string) => void): HTMLDivElement {
    const chip = document.createElement('div');
    chip.className = 'command-chip';
    
    const isSpinDirection = cmd === 'spin(l)' || cmd === 'spin(r)';
    
    if (isSpinDirection) {
      chip.innerHTML = `
        <span class="command-text">${cmd}</span>
        <button class="remove-btn">×</button>
      `;
      
      const removeBtn = chip.querySelector('.remove-btn') as HTMLButtonElement;
      removeBtn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        onRemove();
      };
    } else {
      const match = cmd.match(/^(\w+)\((\d*)\)$/);
      const baseCmd = match ? match[1] : cmd.replace(/\(.*\)/, '');
      const param = match ? match[2] : '';
      
      chip.innerHTML = `
        <span class="command-text">${baseCmd}(</span>
        <input type="text" class="command-param" value="${param}" inputmode="numeric" pattern="[0-9]*" maxlength="2">
        <span class="command-text">)</span>
        <button class="remove-btn">×</button>
      `;
      
      const paramInput = chip.querySelector('.command-param') as HTMLInputElement;
      const removeBtn = chip.querySelector('.remove-btn') as HTMLButtonElement;
      
      paramInput.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const newParam = target.value.replace(/[^0-9]/g, '');
        target.value = newParam;
        const newCmd = newParam ? `${baseCmd}(${newParam})` : `${baseCmd}()`;
        if (onParamChange) onParamChange(newCmd);
      });
      
      paramInput.addEventListener('blur', () => {
        const newParam = paramInput.value.replace(/[^0-9]/g, '');
        const newCmd = newParam ? `${baseCmd}(${newParam})` : `${baseCmd}()`;
        if (onParamChange) onParamChange(newCmd);
      });
      
      chip.addEventListener('click', (e: MouseEvent) => {
        if (e.target !== removeBtn && e.target !== paramInput) {
          paramInput.focus();
          setTimeout(() => paramInput.select(), 10);
        }
      });
      
      paramInput.addEventListener('focus', () => {
        paramInput.select();
      });
      
      removeBtn.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        onRemove();
      };
    }
    
    return chip;
  }

  // Track current drag target for while body
  let currentWhileBodyTarget: HTMLElement | null = null;

  function updateTerminalFromCommands(): void {
    // Update textarea with flattened commands
    const flatCommands = flattenCommands(commandItems);
    if (terminal && flatCommands.length > 0) {
      terminal.value = flatCommands.map(cmd => `> ${cmd}`).join('\n');
    } else if (terminal) {
      terminal.value = '';
    }
    
    // Update drop zone display
    terminalDropZone!.classList.toggle('empty', commandItems.length === 0);
    terminalDropZone!.innerHTML = '';
    
    commandItems.forEach((item, index) => {
      if (item.type === 'while') {
        // Create while block container
        const whileBlock = document.createElement('div');
        whileBlock.className = 'command-while';
        whileBlock.dataset.index = index.toString();
        
        // While header
        const whileHeader = document.createElement('div');
        whileHeader.className = 'command-chip command-chip--while-start';
        whileHeader.innerHTML = `
          <span class="command-text">while(hacking) {</span>
          <button class="remove-btn">×</button>
        `;
        
        const headerRemoveBtn = whileHeader.querySelector('.remove-btn') as HTMLButtonElement;
        headerRemoveBtn.onclick = (e: MouseEvent) => {
          e.stopPropagation();
          commandItems.splice(index, 1);
          updateTerminalFromCommands();
          if (onCommandsChange) onCommandsChange();
        };
        
        whileBlock.appendChild(whileHeader);
        
        // While body (drop zone for nested commands)
        const whileBody = document.createElement('div');
        whileBody.className = 'command-while-body';
        whileBody.dataset.whileIndex = index.toString();
        
        if (item.children && item.children.length > 0) {
          item.children.forEach((child, childIndex) => {
            const chip = createCommandChip(
              child.value,
              () => {
                item.children!.splice(childIndex, 1);
                updateTerminalFromCommands();
                if (onCommandsChange) onCommandsChange();
              },
              (newCmd: string) => {
                child.value = newCmd;
                updateTerminalFromCommands();
                if (onCommandsChange) onCommandsChange();
              }
            );
            chip.classList.add('command-chip--nested');
            whileBody.appendChild(chip);
          });
        } else {
          // Empty state hint
          const hint = document.createElement('div');
          hint.className = 'while-body-hint';
          hint.textContent = 'Tap commands to add here';
          whileBody.appendChild(hint);
        }
        
        whileBlock.appendChild(whileBody);
        
        // While footer
        const whileFooter = document.createElement('div');
        whileFooter.className = 'command-chip command-chip--while-end';
        whileFooter.innerHTML = `<span class="command-text">}</span>`;
        whileBlock.appendChild(whileFooter);
        
        terminalDropZone!.appendChild(whileBlock);
      } else {
        // Regular command
        const chip = createCommandChip(
          item.value,
          () => {
            commandItems.splice(index, 1);
            updateTerminalFromCommands();
            if (onCommandsChange) onCommandsChange();
          },
          (newCmd: string) => {
            item.value = newCmd;
            updateTerminalFromCommands();
            if (onCommandsChange) onCommandsChange();
          }
        );
        chip.dataset.index = index.toString();
        terminalDropZone!.appendChild(chip);
      }
    });
  }

  // Find the while block that a touch is over
  function findWhileBodyAtPoint(x: number, y: number): { whileIndex: number; element: HTMLElement } | null {
    const whileBodies = terminalDropZone!.querySelectorAll('.command-while-body');
    for (const body of whileBodies) {
      const rect = (body as HTMLElement).getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const whileIndex = parseInt((body as HTMLElement).dataset.whileIndex || '-1', 10);
        return { whileIndex, element: body as HTMLElement };
      }
    }
    return null;
  }

  // Add command - checks if there's an active while block to add to
  function addCommand(command: string, targetWhileIndex: number = -1): void {
    if (command === 'while') {
      // Add while block
      commandItems.push({ type: 'while', value: 'while', children: [] });
    } else if (targetWhileIndex >= 0 && commandItems[targetWhileIndex]?.type === 'while') {
      // Add to specific while block
      if (!commandItems[targetWhileIndex].children) {
        commandItems[targetWhileIndex].children = [];
      }
      commandItems[targetWhileIndex].children!.push({ type: 'command', value: command });
    } else {
      // Check if there's a while block - if so, add inside it by default for non-while commands
      const lastWhileIndex = commandItems.findIndex(item => item.type === 'while');
      if (lastWhileIndex >= 0 && command !== 'while') {
        if (!commandItems[lastWhileIndex].children) {
          commandItems[lastWhileIndex].children = [];
        }
        commandItems[lastWhileIndex].children!.push({ type: 'command', value: command });
      } else {
        // Add as top-level command
        commandItems.push({ type: 'command', value: command });
      }
    }
    updateTerminalFromCommands();
    if (onCommandsChange) onCommandsChange();
  }

  // Command palette functionality
  const commandButtons = document.querySelectorAll('.command-btn') as NodeListOf<HTMLButtonElement>;
  
  commandButtons.forEach(btn => {
    // Primary method: tap/click to add
    btn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const command = btn.dataset.command;
      if (command) {
        addCommand(command);
        
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 150);
      }
    });
    
    // Touch-based drag support
    let btnTouchStartY = 0;
    let btnTouchStartX = 0;
    let btnIsDragging = false;
    
    btn.addEventListener('touchstart', (e: TouchEvent) => {
      btnTouchStartY = e.touches[0].clientY;
      btnTouchStartX = e.touches[0].clientX;
      btnIsDragging = false;
    }, { passive: true });
    
    btn.addEventListener('touchmove', (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = Math.abs(touchY - btnTouchStartY);
      const deltaX = Math.abs(touchX - btnTouchStartX);
      
      if ((deltaY > 10 || deltaX > 10) && !btnIsDragging) {
        btnIsDragging = true;
        btn.classList.add('dragging');
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      
      if (btnIsDragging && e.cancelable) {
        e.preventDefault();
        
        // Check if over a while body
        const whileTarget = findWhileBodyAtPoint(touchX, touchY);
        
        // Clear previous highlighting
        if (currentWhileBodyTarget && currentWhileBodyTarget !== whileTarget?.element) {
          currentWhileBodyTarget.classList.remove('drag-over');
        }
        
        if (whileTarget && btn.dataset.command !== 'while') {
          whileTarget.element.classList.add('drag-over');
          currentWhileBodyTarget = whileTarget.element;
          terminalDropZone!.style.borderColor = '#555';
        } else {
          currentWhileBodyTarget = null;
          const rect = terminalDropZone!.getBoundingClientRect();
          if (touchY >= rect.top && touchY <= rect.bottom) {
            terminalDropZone!.style.borderColor = '#0f0';
          } else {
            terminalDropZone!.style.borderColor = '#555';
          }
        }
      }
    }, { passive: false });
    
    btn.addEventListener('touchend', (e: TouchEvent) => {
      if (btnIsDragging) {
        btn.classList.remove('dragging');
        const touchY = e.changedTouches[0].clientY;
        const touchX = e.changedTouches[0].clientX;
        
        // Check if dropped on while body
        const whileTarget = findWhileBodyAtPoint(touchX, touchY);
        
        if (whileTarget && btn.dataset.command !== 'while') {
          // Add to while block
          const command = btn.dataset.command;
          if (command) {
            addCommand(command, whileTarget.whileIndex);
          }
          whileTarget.element.classList.remove('drag-over');
        } else {
          const rect = terminalDropZone!.getBoundingClientRect();
          if (touchY >= rect.top && touchY <= rect.bottom) {
            const command = btn.dataset.command;
            if (command) {
              // For while command, add it; otherwise add as top-level
              if (command === 'while') {
                addCommand(command);
              } else {
                // Add to end (check if while exists for default behavior)
                addCommand(command);
              }
            }
          }
        }
        
        if (currentWhileBodyTarget) {
          currentWhileBodyTarget.classList.remove('drag-over');
          currentWhileBodyTarget = null;
        }
        terminalDropZone!.style.borderColor = '#555';
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      btnIsDragging = false;
    }, { passive: false });
  });

  // Initialize
  updateTerminalFromCommands();
  
  return {
    getCommands: () => flattenCommands(commandItems).join('\n'),
    setCommands: (newCommands: string[]) => {
      // Parse flat commands back into structured format
      commandItems = [];
      let currentWhile: CommandItem | null = null;
      
      newCommands.forEach(cmd => {
        if (cmd === 'while(hacking) {') {
          currentWhile = { type: 'while', value: 'while', children: [] };
          commandItems.push(currentWhile);
        } else if (cmd === '}' && currentWhile) {
          currentWhile = null;
        } else if (currentWhile) {
          currentWhile.children!.push({ type: 'command', value: cmd });
        } else {
          commandItems.push({ type: 'command', value: cmd });
        }
      });
      
      updateTerminalFromCommands();
    }
  };
}

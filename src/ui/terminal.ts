// Terminal input handling
export function initTerminal(terminal: HTMLTextAreaElement): void {
  // Terminal input formatting
  function formatTerminalLines(): void {
    const lines = terminal.value.split('\n');
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed === '') return '> ';
      if (trimmed.startsWith('>')) return trimmed;
      return '> ' + trimmed;
    });
    const newValue = formatted.join('\n');
    if (newValue !== terminal.value) {
      const cursorPos = terminal.selectionStart;
      terminal.value = newValue;
      terminal.setSelectionRange(cursorPos, cursorPos);
    }
  }

  // Handle Enter key - add > to new line
  terminal.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const start = terminal.selectionStart;
      const end = terminal.selectionEnd;
      const text = terminal.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      terminal.value = before + '\n> ' + after;
      terminal.setSelectionRange(start + 3, start + 3);
    }
    
    // Handle Backspace at start of line - delete the line
    if (e.key === 'Backspace') {
      const start = terminal.selectionStart;
      const text = terminal.value;
      if (start >= 2 && text.substring(start - 2, start) === '> ') {
        const beforeCursor = text.substring(0, start - 2);
        if (beforeCursor.endsWith('\n') || beforeCursor === '') {
          e.preventDefault();
          const lineStart = text.substring(0, start - 2).lastIndexOf('\n') + 1;
          const lineEnd = text.indexOf('\n', start);
          const endPos = lineEnd === -1 ? text.length : lineEnd + 1;
          if (lineStart > 0) {
            terminal.value = text.substring(0, lineStart - 1) + text.substring(endPos);
            terminal.setSelectionRange(lineStart - 1, lineStart - 1);
          } else if (endPos < text.length) {
            terminal.value = text.substring(endPos);
            terminal.setSelectionRange(0, 0);
          }
        }
      }
    }
  });

  terminal.addEventListener('input', formatTerminalLines);
}

export function getTerminalCommands(terminal: HTMLTextAreaElement): string {
  const lines = terminal.value.split('\n')
    .map(line => line.trim().replace(/^>\s*/, ''))
    .filter(text => text.length > 0);
  return lines.join('\n');
}

export function setTerminalContent(terminal: HTMLTextAreaElement, commands: string[]): void {
  const formatted = commands.map(cmd => `> ${cmd}`).join('\n');
  terminal.value = formatted;
}

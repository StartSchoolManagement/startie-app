// Tests for command parser
import { describe, it, expect } from 'vitest';
import { parse } from '../src/engine/commands';

describe('Command Parser', () => {
  describe('move command', () => {
    it('parses move() without count', () => {
      const result = parse('move()');
      expect(result.actions).toEqual([{ type: 'move', count: 1 }]);
    });

    it('parses move(5) with count', () => {
      const result = parse('move(5)');
      expect(result.actions).toEqual([{ type: 'move', count: 5 }]);
    });

    it('parses multiple move commands', () => {
      const result = parse('move()\nmove()\nmove()');
      expect(result.actions).toHaveLength(3);
      expect(result.actions!.every(a => a.type === 'move')).toBe(true);
    });
  });

  describe('jump command', () => {
    it('parses jump() without count', () => {
      const result = parse('jump()');
      expect(result.actions).toEqual([{ type: 'jump', count: 1 }]);
    });

    it('parses jump(3) with count', () => {
      const result = parse('jump(3)');
      expect(result.actions).toEqual([{ type: 'jump', count: 3 }]);
    });
  });

  describe('spin command', () => {
    it('parses spin(r) for right', () => {
      const result = parse('spin(r)');
      expect(result.actions).toEqual([{ type: 'spin', direction: 'right' }]);
    });

    it('parses spin(l) for left', () => {
      const result = parse('spin(l)');
      expect(result.actions).toEqual([{ type: 'spin', direction: 'left' }]);
    });
  });

  describe('while loop', () => {
    it('parses while(hacking) with body', () => {
      const result = parse('while(hacking) {\nmove()\n}');
      expect(result.actions).toHaveLength(1);
      expect(result.actions![0].type).toBe('while');
      expect((result.actions![0] as { condition: string }).condition).toBe('hacking');
      expect((result.actions![0] as { body: unknown[] }).body).toEqual([{ type: 'move', count: 1 }]);
    });

    it('parses while with multiple commands in body', () => {
      const result = parse('while(hacking) {\nmove()\nspin(r)\njump()\n}');
      expect((result.actions![0] as { body: unknown[] }).body).toHaveLength(3);
    });

    it('returns error for unknown condition', () => {
      const result = parse('while(unknown) {\nmove()\n}');
      expect(result.error).toContain('Unknown while condition');
    });

    it('returns error for unclosed loop', () => {
      const result = parse('while(hacking) {\nmove()');
      expect(result.error).toBe('Unclosed while loop');
    });
  });

  describe('terminal formatting', () => {
    it('handles > prefix from terminal', () => {
      const result = parse('> move()\n> jump()');
      expect(result.actions).toHaveLength(2);
    });

    it('handles mixed formatting', () => {
      const result = parse('> move()\njump()\n> spin(r)');
      expect(result.actions).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    it('returns error for unknown command', () => {
      const result = parse('fly()');
      expect(result.error).toContain('Unknown command');
    });

    it('returns error for malformed move', () => {
      const result = parse('move');
      expect(result.error).toContain('Unknown command');
    });
  });
});

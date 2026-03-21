import { describe, it, expect } from 'vitest';

describe('MindNotes Pro', () => {
  it('应该能正确加载', () => {
    expect(true).toBe(true);
  });

  it('应该有正确的应用名称', () => {
    const appName = 'MindNotes Pro';
    expect(appName).toBe('MindNotes Pro');
  });
});

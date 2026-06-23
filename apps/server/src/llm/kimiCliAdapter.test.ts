import { describe, expect, it } from 'vitest';
import { extractTextDelta } from './kimiCliAdapter';

describe('extractTextDelta', () => {
  it('parses Kimi 1.47 assistant content arrays and ignores thinking parts', () => {
    expect(
      extractTextDelta({
        role: 'assistant',
        content: [
          { type: 'think', think: 'hidden reasoning' },
          { type: 'text', text: '第一段\n\n第二段' },
        ],
      }),
    ).toBe('第一段\n\n第二段');
  });

  it('keeps compatibility with legacy assistant string content', () => {
    expect(extractTextDelta({ role: 'assistant', content: 'pong' })).toBe('pong');
  });

  it('keeps compatibility with content_block_delta frames', () => {
    expect(
      extractTextDelta({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'hello' },
      }),
    ).toBe('hello');
  });

  it('ignores meta frames', () => {
    expect(extractTextDelta({ role: 'meta', content: 'To resume this session' })).toBeUndefined();
  });
});

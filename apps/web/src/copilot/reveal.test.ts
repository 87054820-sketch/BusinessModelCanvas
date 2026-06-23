import { describe, expect, it } from 'vitest';
import { splitStreamingBlocks, takeRevealChunk } from './reveal';

describe('copilot reveal helpers', () => {
  it('reveals at paragraph boundaries before hard cutting', () => {
    const first = '甲'.repeat(140);
    const second = '乙'.repeat(260);
    expect(takeRevealChunk(`${first}\n\n${second}`)).toBe(`${first}\n\n`);
  });

  it('reveals at sentence boundaries for long prose', () => {
    const first = `${'甲'.repeat(130)}。`;
    const second = '乙'.repeat(260);
    expect(takeRevealChunk(`${first}${second}`)).toBe(first);
  });

  it('splits streaming text into visible paragraph cards', () => {
    expect(splitStreamingBlocks('第一段\n\n第二段\n\n')).toEqual(['第一段', '第二段']);
  });
});

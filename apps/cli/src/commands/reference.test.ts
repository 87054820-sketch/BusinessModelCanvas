import { describe, expect, it } from 'vitest';
import { referenceResolveHandler } from './reference.js';
import type { Context } from '../lib/context.js';

describe('referenceResolveHandler', () => {
  it('uses shared taxonomy to keep resources and canvas templates separate', async () => {
    const ctx = {
      client: {
        get: async (path: string) => {
          if (path === '/canvas-defs') {
            return [
              { id: 'bcg-growth-share-matrix', name: { en: 'BCG Growth-Share Matrix', zh: 'BCG 增长份额矩阵' } },
            ];
          }
          if (path === '/library/cases') return [{ slug: 'airbnb', companyName: { en: 'Airbnb', zh: 'Airbnb' }, summary: { en: '', zh: '' }, kind: 'company', tags: [], canvasCount: 1, storyCount: 1 }];
          if (path === '/library/resources') return [{ slug: 'business-model-generation', type: 'book', title: { en: 'Business Model Generation', zh: '商业模式新生代' }, summary: { en: '', zh: '' }, authors: [], tags: [] }];
          if (path === '/library/patterns') return [];
          if (path === '/library/strategy-frameworks') return [];
          if (path === '/library/experiments') return [];
          return [];
        },
      },
    } as unknown as Context;

    const result = await referenceResolveHandler(
      { text: '先看 BCG 增长份额矩阵，再读 Business Model Generation。', lang: 'zh' },
      ctx,
    );

    expect(result.missing).toHaveLength(0);
    expect(result.resolved.map((item) => item.reference.kind)).toEqual(expect.arrayContaining(['canvasTemplate', 'resource']));
  });
});

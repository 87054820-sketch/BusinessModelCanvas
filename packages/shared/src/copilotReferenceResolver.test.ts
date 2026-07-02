import { describe, expect, it } from 'vitest';
import { resolveCopilotReferences, type CopilotReferenceCatalog } from './copilotReferenceResolver.js';

const catalog: CopilotReferenceCatalog = {
  entries: [
    { kind: 'canvasTemplate', defId: 'business-model-canvas', label: '商业模式画布', aliases: ['Business Model Canvas', 'BMC'] },
    { kind: 'canvasTemplate', defId: 'business-model-environment', label: '商业模式环境', aliases: ['商业模式环境扫描'] },
    { kind: 'canvasTemplate', defId: 'bcg-growth-share-matrix', label: 'BCG 增长份额矩阵', aliases: ['BCG 矩阵'] },
    { kind: 'canvasTemplate', defId: 'portfolio-map', label: '业务组合地图', aliases: ['业务组合管理'] },
    { kind: 'strategyFramework', slug: 'blue-ocean-strategy', label: '蓝海战略', aliases: ['Blue Ocean Strategy'] },
    { kind: 'resource', slug: 'business-model-generation', resourceSlug: 'business-model-generation', label: 'Business Model Generation / 商业模式新生代' },
    { kind: 'case', slug: 'airbnb', label: 'Airbnb' },
  ],
};

describe('copilot reference resolver', () => {
  it('resolves canvas templates as previewable methods, not missing canvas instances', () => {
    const result = resolveCopilotReferences({
      catalog,
      lang: 'zh',
      text: '建议使用 BCG 增长份额矩阵、商业模式画布、商业模式环境扫描和业务组合地图。',
    });

    expect(result.missing).toHaveLength(0);
    expect(result.resolved.filter((item) => item.reference.kind === 'canvasTemplate').map((item) => item.reference.defId)).toEqual(
      expect.arrayContaining([
        'bcg-growth-share-matrix',
        'business-model-canvas',
        'business-model-environment',
        'portfolio-map',
      ]),
    );
    expect(result.resolved.every((item) => item.reference.kind !== 'canvasInstance')).toBe(true);
  });

  it('keeps resources separate from cases', () => {
    const result = resolveCopilotReferences({
      catalog,
      lang: 'zh',
      text: '参考阅读可以先看 Business Model Generation / 商业模式新生代，不要把它放进案例列表。',
    });

    expect(result.resolved.some((item) => item.reference.kind === 'resource' && item.reference.slug === 'business-model-generation')).toBe(true);
    expect(result.resolved.some((item) => item.reference.kind === 'case' && item.reference.slug === 'business-model-generation')).toBe(false);
  });

  it('marks explicit missing open targets as missing', () => {
    const result = resolveCopilotReferences({
      catalog,
      references: [{ kind: 'canvasInstance', label: 'Missing canvas', canvasId: '00000000-0000-0000-0000-000000000000', intent: 'open' }],
    });

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.reference.kind).toBe('canvasInstance');
  });
});

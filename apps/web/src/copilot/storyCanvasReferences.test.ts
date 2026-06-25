import { describe, expect, it } from 'vitest';
import { rewriteStoryCanvasDirectivesToCanvasIds } from './storyCanvasReferences';

describe('story canvas reference helpers', () => {
  it('rewrites defId-only directives to exact canvasId directives', () => {
    const content = '# Story\n\n::canvas[business-model-canvas]{}';

    expect(
      rewriteStoryCanvasDirectivesToCanvasIds(content, [
        { canvasId: 'c1', defId: 'business-model-canvas', title: 'BMC' },
      ]),
    ).toBe('# Story\n\n::canvas[business-model-canvas]{canvasId="c1" title="BMC"}');
  });

  it('keeps existing canvasId directives unchanged', () => {
    const content = '::canvas[business-model-canvas]{canvasId="c1"}';

    expect(
      rewriteStoryCanvasDirectivesToCanvasIds(content, [
        { canvasId: 'c2', defId: 'business-model-canvas', title: 'BMC' },
      ]),
    ).toBe(content);
  });
});

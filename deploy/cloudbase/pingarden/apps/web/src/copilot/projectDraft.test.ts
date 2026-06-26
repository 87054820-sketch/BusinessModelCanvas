import { describe, expect, it } from 'vitest';
import {
  extractDiscussionInsights,
  extractProjectDrafts,
  extractProjectUpdateDrafts,
  getSourceCoverageIssues,
  stripProjectDraftBlocks,
} from './projectDraft';

describe('copilot project draft helpers', () => {
  it('parses project drafts with source coverage and stories', () => {
    const drafts = extractProjectDrafts(`Here is the draft:

\`\`\`json
{
  "kind": "pingarden.projectDraft",
  "project": { "name": "A", "description": "B" },
  "sourceCoverage": {
    "sourceImageCount": 1,
    "findings": [{ "id": "img1-1", "sourceType": "image", "sourceIndex": 1, "text": "Label" }],
    "mappedFindingIds": ["img1-1"],
    "unmappedSourceItems": []
  },
  "canvases": [{
    "defId": "business-model-canvas",
    "title": "BMC",
    "stickies": [{ "zoneId": "value-propositions", "text": "Value", "sourceRefs": ["img1-1"] }]
  }],
  "stories": [{ "title": "Story", "content": "# Story" }]
}
\`\`\``);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.stories?.[0]?.title).toBe('Story');
    expect(drafts[0]?.sourceCoverage?.findings).toHaveLength(1);
  });

  it('parses project update drafts', () => {
    const drafts = extractProjectUpdateDrafts(`\`\`\`json
{
  "kind": "pingarden.projectUpdateDraft",
  "projectId": "p1",
  "summary": "Add story",
  "operations": [{ "type": "createStory", "title": "Story", "content": "# Story" }]
}
\`\`\``);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.operations[0]?.type).toBe('createStory');
  });

  it('parses discussion insights', () => {
    const insights = extractDiscussionInsights(`\`\`\`json
{
  "kind": "pingarden.discussionInsight",
  "title": "平台模式洞察",
  "summary": "这个案例适合沉淀为项目假设。",
  "insights": [{ "id": "i1", "title": "双边冷启动", "summary": "先补供给侧密度。" }],
  "sourceRefs": [{ "id": "s1", "type": "case", "label": "Airbnb" }],
  "suggestedActions": [{ "id": "a1", "type": "updateProject", "label": "更新项目", "rationale": "可补充渠道假设" }]
}
\`\`\``);

    expect(insights).toHaveLength(1);
    expect(insights[0]?.insights[0]?.title).toBe('双边冷启动');
    expect(insights[0]?.suggestedActions?.[0]?.type).toBe('updateProject');
  });

  it('reports missing image findings and unmapped source items', () => {
    const issues = getSourceCoverageIssues(
      {
        sourceImageCount: 2,
        findings: [{ id: 'img1-1', sourceType: 'image', sourceIndex: 1, text: 'A' }],
        mappedFindingIds: ['img1-1'],
        unmappedSourceItems: [{ findingId: 'x', text: 'B', reason: 'unclear' }],
      },
      { requireCompleteCoverage: true },
    );

    expect(issues).toContain('image:2:no-findings');
    expect(issues).toContain('source:unmapped-items');
  });

  it('requires coverage for the real attached image count', () => {
    expect(getSourceCoverageIssues(undefined, { expectedImageCount: 2 })).toContain('source:missing-coverage');

    const issues = getSourceCoverageIssues(
      {
        sourceImageCount: 1,
        findings: [{ id: 'img1-1', sourceType: 'image', sourceIndex: 1, text: 'A' }],
        mappedFindingIds: ['img1-1'],
        unmappedSourceItems: [],
      },
      { expectedImageCount: 2 },
    );

    expect(issues).toContain('source:image-count:1<2');
    expect(issues).toContain('image:2:no-findings');
  });

  it('strips create, update, and insight blocks', () => {
    const content = `Visible
\`\`\`json
{"kind":"pingarden.projectDraft","project":{"name":"A"},"canvases":[]}
\`\`\`
Text
\`\`\`json
{"kind":"pingarden.projectUpdateDraft","projectId":"p1","summary":"S","operations":[]}
\`\`\`
More
\`\`\`json
{"kind":"pingarden.discussionInsight","title":"T","summary":"S","insights":[]}
\`\`\``;

    expect(stripProjectDraftBlocks(content)).toBe('Visible\n\nText\n\nMore');
  });
});

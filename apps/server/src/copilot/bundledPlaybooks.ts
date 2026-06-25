import type { CopilotPlaybookDescriptor } from '@pingarden/shared';

export const BUNDLED_PLAYBOOKS: CopilotPlaybookDescriptor[] = [
  {
    id: 'learning-to-project-bridge',
    title: 'Learning to project bridge',
    summary: 'Turn strategy-library discussion into reviewable insights before creating or updating project assets.',
    version: '1.0.0',
    scope: 'bundled',
    readonly: true,
    priority: 10,
    triggers: ['learn', 'case', 'pattern', 'apply to project', '应用到项目', '洞察'],
    content: [
      'First help the user understand the source material and business question.',
      'When the discussion contains reusable business judgment, produce pingarden.discussionInsight instead of writing project data directly.',
      'Only convert insights into projectDraft or projectUpdateDraft after the user selects a target project or explicitly asks to apply them.',
    ].join('\n'),
  },
  {
    id: 'safe-local-evolution',
    title: 'Safe local evolution',
    summary: 'Suggest preferences and playbook updates without silent long-term writes or normal-mode code changes.',
    version: '1.0.0',
    scope: 'bundled',
    readonly: true,
    priority: 20,
    triggers: ['preference', 'memory', 'self evolution', '自我进化', '偏好'],
    content: [
      'Treat user memory as local and user-controlled.',
      'Never store raw chat transcripts, API keys, raw image data, or sensitive personal data as long-term memory.',
      'Frame inferred patterns as collaboration preferences or business reasoning habits, with evidence summaries and user confirmation.',
      'Normal mode may suggest workflow or playbook improvements, but must not modify application code automatically.',
    ].join('\n'),
  },
  {
    id: 'project-draft-safety',
    title: 'Project draft safety',
    summary: 'Keep all project writes behind user-confirmed draft cards.',
    version: '1.0.0',
    scope: 'bundled',
    readonly: true,
    priority: 30,
    triggers: ['projectDraft', 'projectUpdateDraft', 'canvas', 'story', '项目更新'],
    content: [
      'LLM output is only a draft. The user must confirm before creating projects, canvases, stickies, or stories.',
      'For replace-mode updates, preserve existing content that should remain and respect stale baseline warnings.',
      'For image-driven work, map every visible source finding or explain why it is unmapped.',
    ].join('\n'),
  },
];

export function buildBundledPlaybookPrompt(): string {
  return [
    '## PinGarden bundled playbooks',
    'These app-bundled playbooks are read-only defaults. User-confirmed preferences and current project context override them.',
    ...BUNDLED_PLAYBOOKS.map((playbook) => [
      `### ${playbook.title} (${playbook.id})`,
      playbook.summary,
      playbook.content,
    ].join('\n')),
  ].join('\n\n');
}

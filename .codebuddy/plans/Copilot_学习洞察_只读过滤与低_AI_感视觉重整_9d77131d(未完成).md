---
name: Copilot 学习洞察：只读过滤与低 AI 感视觉重整
overview: 在修复学习洞察弹窗把只读策略库项目列入目标的功能冲突之外，同步把洞察卡、会话洞察条和应用弹窗从强 AI 感的渐变/高饱和视觉，调整为与 PinGarden 主应用一致的白底、stone/gray 边框、低对比卡片和克制按钮风格。
design:
  architecture:
    framework: react
  styleKeywords:
    - 克制
    - 产品原生
    - 白底卡片
    - Stone Gray
    - 低饱和品牌色
    - 轻量弹窗
  fontSystem:
    fontFamily: Inter, system-ui, PingFang SC
    heading:
      size: 18px
      weight: 600
    subheading:
      size: 14px
      weight: 600
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#2A6B6B"
      - "#111827"
    background:
      - "#FFFFFF"
      - "#FAFAF9"
      - "#F5F5F4"
    text:
      - "#111827"
      - "#4B5563"
      - "#6B7280"
    functional:
      - "#E7E5E4"
      - "#D6D3D1"
      - "#245D5D"
      - "#9CA3AF"
todos:
  - id: filter-library-projects
    content: 过滤 CopilotApplyLearningDialog.tsx 的 library 项目，只保留用户项目和新项目
    status: pending
  - id: defensive-readonly-actions
    content: 为只读 target 增加 action 禁用和 selected 兜底
    status: pending
    dependencies:
      - filter-library-projects
  - id: restyle-apply-dialog
    content: Use [skill:css-architecture] 重整应用弹窗为 stone 白底风格
    status: pending
    dependencies:
      - defensive-readonly-actions
  - id: restyle-insight-basket
    content: Use [skill:css-architecture] 重整学习摘记条，移除 AI 渐变
    status: pending
    dependencies:
      - restyle-apply-dialog
  - id: restyle-insight-card
    content: Use [skill:css-architecture] 重整洞察卡片、来源标签和建议动作区
    status: pending
    dependencies:
      - restyle-insight-basket
  - id: neutralize-insight-copy
    content: 更新 zh.json 和 en.json 的洞察文案为产品化表达
    status: pending
    dependencies:
      - restyle-insight-card
  - id: verify
    content: 运行 pnpm -r typecheck，必要时运行 web build 验证
    status: pending
    dependencies:
      - neutralize-insight-copy
---

## User Requirements

- Review the current plan for the “learning insight” feature and extend it beyond the functional conflict fix.
- The current insight-related UI looks too “AI-like” and does not match the overall PinGarden app style.
- The “apply learning insight to project” flow should not expose read-only strategy-library projects as editable targets.
- The insight feature should feel like a natural part of the app: closer to projects, notes, library, and canvas workflows, rather than a separate AI assistant panel.

## Product Overview

Optimize the Copilot learning insight experience by fixing read-only project conflicts and restyling the insight UI to match PinGarden’s restrained, document-like product style.

## Core Features

- Filter strategy-library read-only projects from the target selector.
- Add defensive handling so read-only targets cannot trigger project update, canvas creation, story creation, or project-insight saving.
- Restyle the insight dialog, insight basket, and insight card from saturated AI gradients to white, stone, gray, and subtle brand-accent styling.
- Adjust copy from AI/tool-oriented wording such as “Copilot” and “basket” toward product-native wording such as “摘记”, “整理”, and “可确认草稿”.
- Keep long-term insight persistence out of scope for this plan.

## Tech Stack Selection

- Frontend: existing React, TypeScript, Tailwind CSS, i18next.
- Backend: no backend changes required for this plan.
- Data model: reuse existing `Project.source`, `CopilotDiscussionInsight`, and `CopilotSessionInsightItem` types.
- API: reuse `projectsApi.list(displayName)` and filter on the frontend, consistent with `MyProjectsPage.tsx`.

## Implementation Approach

The implementation should combine a small functional fix with a focused UI style correction. The functional fix filters out `project.source === 'library'` in `CopilotApplyLearningDialog.tsx`, matching the pattern already used in `MyProjectsPage.tsx`. The UI correction removes large indigo and teal AI-style gradients from insight-related surfaces and replaces them with the app’s existing white, stone, gray, subtle border, and restrained brand-accent patterns.

Key decisions:

- Do not change backend read-only behavior: `FederatedStorage` already enforces read-only library projects.
- Do not change shared types or Copilot protocol output: the current issue is presentation and target selection, not schema.
- Keep the current session-scoped insight basket behavior: long-term insight persistence needs separate product confirmation.
- Use Tailwind class changes in existing components rather than introducing new CSS files, matching current component style conventions.

## Implementation Notes

- Filter projects with `project.source !== 'library'` because user-created projects may omit `source`.
- If `currentProjectId` points to a library project, reset selected target to `new` or the first available user project to avoid stale invalid selection.
- Keep defensive readonly logic even after filtering, so future entry points cannot accidentally submit library targets.
- Avoid large gradients, saturated indigo backgrounds, and “AI assistant” visual language in learning insight UI.
- Reuse visual patterns verified in:
- `apps/web/src/pages/MyProjectsPage.tsx`
- `apps/web/src/pages/LibraryPage.tsx`
- `apps/web/src/story/StoryEditor.tsx`
- `apps/web/src/story/EmbeddedCanvas.tsx`
- Keep changes localized to the learning insight components and i18n files.

## Architecture Design

This remains a localized frontend refinement:

- `CopilotApplyLearningDialog.tsx` owns target selection, action selection, dialog layout, and apply prompt generation.
- `CopilotSessionInsightBasket.tsx` owns the session-level collected insight strip.
- `CopilotDiscussionInsightCard.tsx` owns individual assistant-generated insight cards inside the Copilot drawer.
- `zh.json` and `en.json` provide product-native copy.

No new architecture layer, persistence mechanism, or backend endpoint is introduced.

## Directory Structure

```text
apps/web/src/components/
  CopilotApplyLearningDialog.tsx    # [MODIFY] Filter library projects, defensively disable readonly actions, restyle dialog to app-native stone and white style.
  CopilotSessionInsightBasket.tsx   # [MODIFY] Restyle session insight strip from AI gradient to neutral learning-note surface.
  CopilotDiscussionInsightCard.tsx  # [MODIFY] Restyle insight cards, source chips, suggested actions, and buttons to match app cards.

apps/web/src/i18n/
  zh.json                           # [MODIFY] Replace AI/tool-like learning insight wording with natural product copy.
  en.json                           # [MODIFY] Mirror neutral English copy for the same learning insight flow.
```

## Key Code Structures

No new shared interfaces are required. Existing `Project.source?: 'user' | 'library'` is sufficient for filtering and defensive readonly checks.

## Design Approach

The learning insight UI should be redesigned as a calm, app-native “learning notes” experience rather than a futuristic AI module.

### Visual Direction

Use PinGarden’s existing product language: white cards, stone borders, soft gray backgrounds, rounded panels, restrained shadows, and limited use of the teal brand accent. Remove saturated indigo or AI-like gradients from the dialog, insight card, and basket strip.

### Component Styling

- Apply dialog: use a regular modal with white body, stone border, subtle shadow, and a `stone-50` header.
- Insight summary area: use `bg-stone-50/70` with `border-stone-200`, not indigo panels.
- Session insight basket: make it feel like a lightweight note shelf or project utility bar.
- Insight cards: use white cards, gray headings, stone chips, and subtle action sections.
- Primary action: keep dark gray or brand teal only where a clear action emphasis is needed.
- Secondary action: use bordered white buttons consistent with Library and My Projects pages.

### Copy Tone

Replace AI-forward wording with product-native language:

- “会话洞察篮子” to “本次学习摘记”
- “加入篮子” to “加入摘记”
- “把学习洞察应用到项目” to “整理到项目”
- “Copilot 会生成可确认草稿” to “系统会先整理成可确认草稿”

## Agent Extensions

### Skill

- **css-architecture**
- Purpose: Review and adjust insight-related Tailwind styling so it aligns with the existing app visual system instead of adding fragmented custom styles.
- Expected outcome: The dialog, basket, and card styling reuse consistent component-level patterns with minimal duplicated visual decisions.
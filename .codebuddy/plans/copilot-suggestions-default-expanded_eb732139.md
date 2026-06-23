---
name: copilot-suggestions-default-expanded
overview: 将 Copilot 建议操作面板从默认收起改为默认展开，仅调整打开抽屉或切换上下文时的初始展开状态。
todos:
  - id: update-default-state
    content: 修改 CopilotDrawer 建议面板默认展开
    status: completed
  - id: preserve-toggle
    content: 确认保留手动收起展开切换
    status: completed
    dependencies:
      - update-default-state
  - id: verify-typecheck
    content: 运行类型检查验证 Copilot 状态变更
    status: completed
    dependencies:
      - preserve-toggle
---

## User Requirements

- 保留 Copilot「建议操作」面板的收起/展开能力。
- 将建议操作面板的初始状态从“默认收起”改为“默认展开”。
- 打开 Copilot 或切换上下文后，应默认展示建议操作卡片，减少用户额外点击。
- 用户仍可手动点击“收起”将建议操作面板折叠。

## Product Overview

Copilot 顶部建议操作区域继续作为上下文快捷入口存在，但默认展示完整建议内容，方便用户直接选择推荐动作。

## Core Features

- 建议操作面板默认展开。
- 保留展开/收起交互。
- 不调整文案、样式和建议卡片内容。

## Tech Stack Selection

- 沿用现有 React + TypeScript 前端实现。
- 继续使用现有 `CopilotDrawer.tsx` 内部状态管理。
- 不新增依赖，不调整路由、API、服务端或 i18n 文案。

## Implementation Approach

本次只修改 Copilot 抽屉内建议面板的默认折叠状态。当前 `suggestionsCollapsed` 初始化为 `true`，并且在打开 Copilot 或上下文变化时通过 effect 重置为 `true`；需要将这两处改为 `false`，让面板默认展开，同时保留现有 `setSuggestionsCollapsed((v) =&gt; !v)` 的手动切换逻辑。

## Implementation Notes

- 只改默认状态，不改 `suggestionsDismissed` 逻辑。
- 不移除收起/展开按钮，避免破坏用户手动折叠能力。
- 不修改中英文 `suggestions.expand` / `suggestions.collapse` 文案。
- 修改范围控制在 Copilot UI 状态，不影响聊天、上下文、项目草稿或画布预览逻辑。

## Architecture Design

该变更不引入新架构。仍由 `CopilotDrawer` 管理建议面板状态，并通过 `ChatPane` props 向下传递 `suggestionsCollapsed` 与 `onToggleSuggestions`。

## Directory Structure

```
BusinessModelCanvas/
└── apps/
    └── web/
        └── src/
            └── components/
                └── CopilotDrawer.tsx  # [MODIFY] 修改建议操作面板默认状态：初始化为展开，并在打开 Copilot 或切换上下文时重置为展开；保留现有手动收起/展开逻辑。
```
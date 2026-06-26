---
name: Copilot 学习洞察：只读项目过滤 + 方向重置
overview: CopilotApplyLearningDialog 在"目标"下拉里把 library（只读/策略库）项目也列出来，并且"行动"里 createCanvas/createStory 对只读项目不适用。本计划先做小修复：过滤只读项目、收紧行动；然后停下来与用户对长期沉淀方向。
todos:
  - id: filter-library-projects
    content: 在 CopilotApplyLearningDialog 的 useEffect 拉取后过滤 project.source === 'library'，确保下拉只剩 user 项目 + 新项目
    status: pending
  - id: disable-actions-on-library
    content: 行动下拉对 library target 防御性 disable updateProject/createCanvas/createStory；saveProjectInsight 在 library 上也 disable
    status: pending
    dependencies:
      - filter-library-projects
  - id: typecheck
    content: 跑 pnpm -r typecheck 验证编译通过
    status: pending
    dependencies:
      - disable-actions-on-library
---

## Product Overview

修复 Copilot "把学习洞察应用到项目" 弹窗的三个相关问题：把只读策略库项目从"目标"下拉中过滤掉，避免与"编辑/创建画布"等不可用功能的功能冲突；同时回应用户对学习洞察"长期沉淀"方向上的困惑——澄清当前 basket 是 session 内短生命周期收集盒，不持久化、不进入 system prompt，需要在方向上对齐再决定是否扩成长期资产。

## Core Features

- **过滤 library 项目**：在 `CopilotApplyLearningDialog` 中按 `project.source !== 'library'` 过滤下拉项，只展示用户自己的项目 + "新项目"。
- **行动下拉感知目标类型**：当 target 是 library 时，`createCanvas` / `createStory` / `updateProject` 灰禁用（同时这条与上一条互斥——library 已被过滤掉时不会走到这分支；保留为防御性逻辑）。
- **方向澄清（不写代码）**：在用户回复前不实施"长期沉淀"功能；本计划只做"过滤 library"这一项确定改动，并在计划中明确后续可选的"长期洞察归档"方向供用户拍板。
- **i18n**：暂无新增/修改字符串。

## Tech Stack

- 沿用现有 React + TypeScript + i18next 栈
- 单文件改动 `apps/web/src/components/CopilotApplyLearningDialog.tsx`：在拉取项目后用 `project.source === 'library'` 过滤；行动下拉做防御性 disable
- 不改 `projectsApi.list`、不改 `Project` 类型、不改后端 FederatedStorage
- 不引入新依赖

## Implementation Approach

1. 在 `CopilotApplyLearningDialog` 的 `useEffect` 拉取后，对返回的 `Project[]` 做 `filter(p => p.source !== 'library')`。这样"游戏业务企业微信服务"等 user 项目会保留，策略库全部消失。
2. 行动下拉按"目标是否只读"动态 disable：

- 新建项目（`kind: 'new-project'`）→ 全部可选（含 `updateProject`，因为这是新生成项目不是 update；`createCanvas` / `createStory` / `saveProjectInsight` 都合理）
- 现有 user 项目 → 全部可选
- 现有 library 项目 → 理论上不会出现（已过滤），但保留 disable 兜底：`updateProject` / `createCanvas` / `createStory` 全部 disable；`saveProjectInsight` 在 library 上没有"项目归属"语义，也 disable

3. 不动 `buildApplyPrompt`，因为过滤后不会进入 library 路径。
4. 不持久化 basket、不动 system prompt（按用户对方向的疑问，本轮先收手）。

## Architecture Design

- 前端唯一改动点：弹窗组件。
- 方向性问题（长期沉淀）通过 `plan_content` 的"后续可选"段落输出，让用户拍板。
- 后端契约不变：`FederatedStorage.isProjectReadOnly` 继续作为唯一真相源。

## Directory Structure

```
apps/web/src/components/
  CopilotApplyLearningDialog.tsx   # [MODIFY] filter library projects + 防御性 disable 行动选项
```

## Implementation Notes

- **`source` 是 optional**：过滤必须用 `!== 'library'`，因为 user 项目可能没显式标 `source`。
- **防御 disable**：UI 上 disabled + 灰底，避免用户从 console 改 select 值还能提交。
- **不写单测**：当前组件没有 vitest 用例，过滤是单行表达式，code review 即可保证。
- **性能**：拉的还是全量（user + library），数据量小（个位数到几十），无需服务端分页。
- **不持久化**：本轮不动 basket；持久化方向需要单独立项确认后再做。

## 后续可选方向（不在本计划执行范围，需要用户拍板）

- **A. 维持现状**：basket 是 session 内"临时收藏夹"，主要价值是"快速回到刚才看过的洞察"。优点是零持久化成本，缺点是刷新即丢、不会进入 system prompt 影响后续回答。
- **B. 长期洞察归档**（建议但工作量大 1-2 天）：

1. 新增 `useCopilotUserInsightArchive`：用 localStorage 持久化，cap 200，加导出/导入
2. 服务端 `apps/server/src/http/copilot.ts` 的 system prompt 注入"用户已收藏的洞察"摘要（让 LLM 在后续回答中引用）
3. UI 在 `CopilotSessionInsightBasket` 加"存入长期洞察库"按钮（与"应用到项目"并列）
4. `CopilotUserProfile` 增加 `archivedInsights` 字段，与已有 preferences/reasoningHabits 同级

- **C. 直接让 LLM 沉淀**：跳过 basket，Copilot 在回答结束时直接写一段"已沉淀的洞察"到 `CopilotUserProfile.reasoningHabits`（高风险：可能沉淀太多无价值内容，需要严格的 confidence/evidence 阈值）。
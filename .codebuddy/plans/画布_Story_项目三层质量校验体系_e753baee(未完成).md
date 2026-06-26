---
name: 画布/Story/项目三层质量校验体系
overview: 在 shared 包实现三层质量校验器（project / canvas+sticky / story+关联），硬规则阻塞 apply、软规则警告展示。混合 hard rules in shared + soft hints in manifest，触发点覆盖实时草稿生成、确认卡渲染、apply 前拦截。
todos:
  - id: design-hard-rules
    content: 在 packages/shared/src/qualityRules.ts 编写 20 张画布的硬规则表与 validate* 函数
    status: pending
  - id: add-quality-types
    content: 在 shared copilot 类型中给 CopilotProjectDraft / CopilotProjectUpdateDraft 加 quality 字段
    status: pending
    dependencies:
      - design-hard-rules
  - id: parse-quality
    content: 在 apps/web/src/copilot/projectDraft.ts 解析器中写入 draft.quality，并补单测
    status: pending
    dependencies:
      - add-quality-types
  - id: ui-render
    content: 在 CopilotProjectDraftCard / CopilotProjectUpdateDraftCard 渲染 quality issue，hard 阻塞 Apply
    status: pending
    dependencies:
      - parse-quality
  - id: apply-guard
    content: 在 applyDraft / applyOperation 中复用 draft.quality 做最后一道硬规则兜底
    status: pending
    dependencies:
      - ui-render
  - id: i18n-keys
    content: 在 en.json / zh.json 补 library.copilot.quality.* 文案
    status: pending
    dependencies:
      - ui-render
  - id: manifest-soft-hints
    content: 为 20 张 manifest 各自补 quality.softHints 软提示
    status: pending
    dependencies:
      - add-quality-types
  - id: server-prompt
    content: 在 apps/server/src/http/copilot.ts prompt 中注入硬规则摘要，引导模型生成时遵循
    status: pending
    dependencies:
      - design-hard-rules
  - id: hard-rules-tests
    content: 新增 qualityRules.test.ts 覆盖 20 张画布硬规则基线
    status: pending
    dependencies:
      - design-hard-rules
  - id: validate
    content: 运行 pnpm typecheck / pnpm --filter @pingarden/web test / pnpm --filter @pingarden/web build 验证
    status: pending
    dependencies:
      - apply-guard
      - i18n-keys
      - manifest-soft-hints
      - server-prompt
      - hard-rules-tests
---

## Product Overview

为 PinGarden 画布、Story、项目元数据建立三层质量校验体系，覆盖创建/更新草稿的实时生成、确认卡渲染、apply 前三个时机，按硬规则阻塞 + 软规则警告分级反馈，避免空画布、空 Story、不满足方法论最低密度的产出流入项目。

## Core Features

- 画布密度硬规则：每张 sticky 型画布的每个 zone 必须满足最低 sticky 数（参考其方法论理论，如 BMC 9 块各≥1、JTBD situation≥1、Empathy Map 4 方向各≥1）；pin/chart 型画布至少 N 个 pin + 曲线完整。
- 画布理论软提示：放在 `manifest.json` 的 `quality.softHints`，校验器只展示不阻塞。
- Story 校验：非空标题、≥ N 个有效段落、不能只有标题无内容；嵌入的 `::canvas[defId]{canvasId="..."}` 指令必须能解析到目标项目已存在画布。
- 项目元数据校验：项目名/描述非空、关联画布可达、关联 Story 可达。
- 关联一致性：草稿引用的 `canvasId`/`storyId` 必须存在于目标项目。
- 严重级别：硬规则 issue → 阻塞 apply、确认卡禁用按钮；软规则 issue → 黄色提示，不阻塞。
- 三时机触发：草稿解析时（projectDraft.ts 静态解析层）、确认卡渲染时（CopilotProjectDraftCard/UpdateCard）、apply 时（applyDraft/applyOperation）。

## User Requirements

盘点 20 张画布的方法论 → 抽取硬规则到 shared → 软提示在 manifest → Story + 项目元数据 + 关联一致性也校验 → 硬阻塞 + 软警告 + 三时机触发。

## Tech Stack

- 保持现有 TypeScript / React / Fastify / Vitest 栈
- 新增逻辑放在 `packages/shared/src/qualityRules.ts`（硬规则集中处）和 `apps/web/src/copilot/quality.ts`（UI 状态层）
- 画布特定的硬规则通过查表 `CANVAS_HARD_RULES[defId]` 注入；其余回退到 manifest 的 `quality.hardRules`
- 软提示统一从 `manifest.quality.softHints` 解析

## Implementation Approach

1. **集中硬规则**：在 `packages/shared/src/qualityRules.ts` 内置一张 `CANVAS_HARD_RULES` 表，覆盖 20 张画布的 `defId → 最低 sticky 数 / pin 数 / chart 要求 / 必需 zone 文本` 等。`manifest` 的 `quality.hardRules` 用来覆盖默认值（manifest 优先）。
2. **软提示**：从 `manifest.json` 的 `quality.softHints` 数组解析，每条含 `{ id, message, severity }`，渲染时只展示不阻塞。
3. **三层校验器**：

- `validateCanvas(def, stickies, pins?)` → 硬 issue + 软 issue
- `validateStory(story, projectCanvasRefs)` → 硬 issue（title/content/canvas 指令）
- `validateProjectMeta(project)` → 硬 issue（name/description）
- `validateProjectDraft(draft, project?)` → 组合
- `validateProjectUpdateDraft(draft, canvasRefs)` → 组合

4. **三时机触发**：

- 草稿解析时：`projectDraft.ts` 解析器中直接调用 `validateProjectDraft` / `validateProjectUpdateDraft` 写入 `draft.quality` 字段
- 确认卡渲染时：`CopilotProjectDraftCard` / `CopilotProjectUpdateDraftCard` 读 `draft.quality` 显示 issue 列表，禁用 Apply 按钮（硬 issue 非空时）
- apply 时：apply 前再校验一次（防止 Copilot 状态过期），失败抛错

5. **i18n**：en/zh 双语文案 `library.copilot.quality.{hardEmptyCanvas,hardLowStickyDensity,softZoneHint,...}`
6. **测试**：`projectDraft.test.ts` 模式复用，新增 `qualityRules.test.ts` 覆盖 20 张画布的硬规则基线

## Architecture Design

- 共享层（shared）拥有硬规则定义 + 校验器
- 前端消费 `draft.quality` 渲染 + 控制按钮 disabled
- 后端 `copilot.ts` 注入画布方法论提示到 prompt（让模型知道硬规则 + 软提示），让模型在生成时尽量满足
- 草稿解析层（projectDraft.ts）做第一道校验，确认卡做展示，apply 做最后一道兜底

## Directory Structure

```
packages/shared/src/
  qualityRules.ts                 # [NEW] 硬规则表 + validateCanvas/Story/Project 函数 + 类型
  qualityRules.test.ts            # [NEW] 硬规则单测（覆盖 20 张画布 + Story + Project）
  copilot.ts                      # [MODIFY] 在 CopilotProjectDraft/UpdateDraft 类型上加 quality 字段；re-export 校验器

apps/web/src/
  copilot/
    projectDraft.ts               # [MODIFY] 解析器内调用 validateProjectDraft 写入 draft.quality
    projectDraft.test.ts          # [MODIFY] 新增 quality 字段解析测试
    quality.ts                    # [NEW] 前端 helper：按 issue severity 分类、按 zone 聚合展示
  components/
    CopilotProjectDraftCard.tsx   # [MODIFY] 渲染 quality 列表，hard issue 存在时禁用 Apply
    CopilotProjectUpdateDraftCard.tsx  # [MODIFY] 同上
    CopilotProjectDraftCard.module.css / 内联 style — [MODIFY] 警告区
  i18n/
    en.json                       # [MODIFY] library.copilot.quality.*
    zh.json                       # [MODIFY] library.copilot.quality.*

apps/server/src/
  http/copilot.ts                 # [MODIFY] 在 buildCopilotProtocol / buildSystemPrompt 中注入质量规则摘要，让模型生成时遵循

packages/canvases/*/manifest.json # [MODIFY] 20 个 manifest 各自补充 quality.softHints（可选，软规则）
  例：business-model-canvas/manifest.json 加 softHints: [
    { id: "bcc-cross-check", severity: "soft", message: { en: "BMC 9 块建议交叉验证：价值主张 ↔ 客户细分", zh: "..." } }
  ]
```

## Implementation Notes

- 硬规则的 `defId → rules` 表用 const 对象，避免动态 import，便于测试和静态分析
- 软提示完全在 manifest 配，不在代码内硬编码画布具体提示（满足 manifest 配置软规则的决策）
- apply 前的最终校验要复用确认卡渲染时的同一份 `draft.quality` 数据，避免双源漂移
- issue 严重级别用枚举 `hard` | `soft`，UI 用颜色（红/黄）区分
- 不要修改 zone shape / viewBox / defaultColorLegend 等现有 manifest 字段，只追加 `quality.softHints`
- 保持 source coverage 校验逻辑不变（已有），新加的 quality 是补充层
- 保持 4 个 manifest `display` 块不变，避免影响 SVG 渲染

## Agent Extensions

无新增扩展。所有实现用现有 TypeScript / React / Fastify / Vitest 栈即可。
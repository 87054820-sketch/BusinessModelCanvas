---
name: update-ad-lib-value-proposition-theory
overview: 更新 `ad-lib-value-proposition` 画布的理论说明与区块指导，参考 Strategyzer Ad-lib 模板和 Semrush 价值主张写作文章，补齐中英文知识内容。
todos:
  - id: review-canvas-knowledge
    content: 使用 [subagent:code-explorer] 复核 Ad-Lib 画布 knowledge 结构
    status: pending
  - id: add-canvas-theory
    content: 新增中英文 intro 和 body 理论说明
    status: pending
    dependencies:
      - review-canvas-knowledge
  - id: enhance-block-guidance
    content: 扩写 8 个区块的中英文填写指导
    status: pending
    dependencies:
      - add-canvas-theory
  - id: check-content-consistency
    content: 检查中英文内容、参考来源和术语一致性
    status: pending
    dependencies:
      - enhance-block-guidance
  - id: verify-markdown-loading
    content: 验证 Markdown 文件路径和画布知识加载约定
    status: pending
    dependencies:
      - check-content-consistency
---

## User Requirements

更新 Ad-Lib Value Proposition 画布的理论说明内容，参考 Strategyzer 的 Ad-lib Value Proposition Template 与 Semrush 的 Value Proposition 写作文章。

## Product Overview

为「Ad-Lib Value Proposition / 价值主张速写模版」补充更完整的画布方法论说明，让用户理解这张画布的用途、填空句式、关键组成、使用步骤、常见误区和后续验证方式。

## Core Features

- 增加画布级理论说明：解释 Ad-Lib Value Proposition 是一种快速原型化价值主张的填空工具。
- 明确标准句式：产品/服务、目标客户、客户任务、痛点缓解、收益创造、替代方案。
- 补充使用方法：建议一次写出 3–5 个不同方向，用于比较、测试和迭代。
- 强化区块说明：让每个填写区域说明更具体，帮助用户写出清晰、可验证的价值主张。
- 同步中英文内容，保留中文和英文两套说明。

## Tech Stack Selection

- 当前项目是 PinGarden 画布系统，画布定义位于 `packages/canvases/<id>/`。
- 本次主要更新画布知识内容，采用项目现有的 Markdown knowledge 机制。
- 不修改前端组件、服务端接口、SVG 背景或画布坐标，避免扩大影响范围。
- 中英文内容均放在对应语言的 Markdown 文件中，符合项目 EN ⇄ 中文可用要求。

## Implementation Approach

本次采用“新增画布级理论说明 + 增强区块级指导”的方式完成。`ad-lib-value-proposition` 当前已有 8 个区块的 block guidance，但缺少 `intro` 和 `body` 级别的系统说明，因此应新增画布整体说明，并适度扩写每个区块的说明。

关键决策：

- 新增 `knowledge/intro.zh.md`、`knowledge/intro.en.md`：用于快速说明这张画布什么时候用、解决什么问题。
- 新增 `knowledge/body.zh.md`、`knowledge/body.en.md`：用于承载完整理论说明，包括句式、组成、步骤、常见误区、延伸参考。
- 修改 `knowledge/blocks/*.md`：将当前过短的说明扩展为更可操作的填写指导。
- 不直接复制外部网页原文，而是结合参考资料提炼成项目内自有说明，避免版权和风格问题。
- 不改 `manifest.json` 的 zones，因为当前 8 个字段已经覆盖 Strategyzer 句式的核心组成。

## Implementation Notes

- 保持现有 Markdown 风格：短段落、直接、工作坊口吻，参考 `value-proposition-canvas/knowledge/body.zh.md` 的结构。
- 中英文内容要表达一致，但不需要逐字互译；中文优先自然可读。
- 引用外部资料时只在“延伸阅读 / References”中列来源名称和链接，不嵌入大段原文。
- Block guidance 应聚焦“怎么写得更具体”，避免泛泛解释。
- Markdown-only 改动无需触发前端架构变更；完成后读文件检查即可，必要时运行轻量类型检查确保无意外。

## Architecture Design

项目的画布知识加载链路已存在：

- `packages/canvases/ad-lib-value-proposition/knowledge/*.md` 存放画布理论说明。
- `apps/server/src/canvasDefs/loader.ts` 支持读取 `intro`、`body` 和 `blocks`。
- `apps/server/src/http/canvasDefs.ts` 在请求画布定义时返回 knowledge。
- `apps/web/src/api/client.ts` 中 `CanvasKnowledge` 已包含 `intro?: string`、`body?: string`、`blocks`。
- 前端 Inspector 会展示这些 knowledge 内容，无需新增 API。

因此本次仅补充和更新 canvas bundle 内的 Markdown 内容。

## Directory Structure Summary

本次更新集中在 Ad-Lib Value Proposition 画布包，新增画布级理论说明，并增强 8 个区块的中英文填写指导。

```text
packages/canvases/ad-lib-value-proposition/
└── knowledge/
    ├── intro.zh.md                         # [NEW] 中文短说明。说明这张画布用于快速写出和比较价值主张方向。
    ├── intro.en.md                         # [NEW] English intro. Summarizes when and why to use this canvas.
    ├── body.zh.md                          # [NEW] 中文完整理论说明。包含标准句式、8 个组成要素、使用步骤、判断标准、常见误区和参考资料。
    ├── body.en.md                          # [NEW] English theory guide. Mirrors the Chinese methodology content for EN users.
    └── blocks/
        ├── products-services.zh.md         # [MODIFY] 扩写“产品与服务”填写指导，强调具体提供物而非抽象能力。
        ├── products-services.en.md         # [MODIFY] English guidance for products/services specificity.
        ├── customer-segment.zh.md          # [MODIFY] 扩写目标客户细分指导，强调单一细分、场景、角色。
        ├── customer-segment.en.md          # [MODIFY] English customer segment guidance.
        ├── jobs-to-be-done.zh.md           # [MODIFY] 扩写客户任务指导，区分任务、目标、产品动作。
        ├── jobs-to-be-done.en.md           # [MODIFY] English JTBD guidance.
        ├── pain-verb.zh.md                 # [MODIFY] 扩写痛点动词指导，说明减少、避免、消除等动词选择。
        ├── pain-verb.en.md                 # [MODIFY] English pain verb guidance.
        ├── customer-pain.zh.md             # [MODIFY] 扩写客户痛点指导，强调具体阻碍、风险、成本。
        ├── customer-pain.en.md             # [MODIFY] English customer pain guidance.
        ├── gain-verb.zh.md                 # [MODIFY] 扩写收益动词指导，说明提升、启用、加速等动词选择。
        ├── gain-verb.en.md                 # [MODIFY] English gain verb guidance.
        ├── customer-gain.zh.md             # [MODIFY] 扩写客户收益指导，强调可感知结果和验证指标。
        ├── customer-gain.en.md             # [MODIFY] English customer gain guidance.
        ├── competing-value-proposition.zh.md # [MODIFY] 扩写替代方案指导，包含竞品、人工流程、Excel、什么都不做。
        └── competing-value-proposition.en.md # [MODIFY] English competing alternative guidance.
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 复核 Ad-Lib Value Proposition 画布包、knowledge 加载约定和类似画布说明写法。
- Expected outcome: 确认新增/修改文件路径准确，内容结构符合当前画布知识系统，不影响画布渲染链路。
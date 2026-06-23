---
name: fix-sticky-legend-missing
overview: 修复部分画布顶部便签图例不显示的问题，重点覆盖案例库只读画布与已生成 live.ydoc 未包含 colorLegend 的场景。
todos:
  - id: add-legend-fallback-resolver
    content: 在 colorLegend.ts 增加默认图例合并解析函数
    status: completed
  - id: update-workspace-legend
    content: 更新 StickyLegendPalette 和 ProjectWorkspacePage 显示默认图例
    status: completed
    dependencies:
      - add-legend-fallback-resolver
  - id: update-embedded-canvas
    content: 修复 EmbeddedCanvas 嵌入画布默认图例显示
    status: completed
    dependencies:
      - add-legend-fallback-resolver
  - id: update-case-author
    content: 让 caseAuthor 自动写入画布默认 colorLegend
    status: completed
    dependencies:
      - add-legend-fallback-resolver
  - id: validate-fix
    content: 使用 [skill:pingarden] 执行类型检查、Web 构建和案例校验
    status: completed
    dependencies:
      - update-workspace-legend
      - update-embedded-canvas
      - update-case-author
---

## User Requirements

修复 PinGarden 中“部分画布的便签图例说明没有显示”的问题。截图显示在只读案例库画布中，顶部图例栏存在，但便签颜色图例没有渲染出来，影响用户理解不同颜色便签的含义。

## Product Overview

当前问题主要发生在带有默认便签颜色图例的画布上，例如三层增长地图、BCG 增长份额矩阵等。用户期望这些画布在工作区和故事嵌入视图中，都能正确显示便签图例，尤其是只读案例库画布也应该显示画布模板定义的默认图例。

## Core Features

- 恢复部分画布顶部便签图例显示。
- 支持只读案例库画布使用模板默认便签图例。
- 支持故事中嵌入画布时显示默认便签图例。
- 保留用户自定义图例优先级：已有画布自定义图例不应被默认图例覆盖。
- 后续新生成案例应自动带上模板默认便签图例，减少同类问题再次出现。

## Tech Stack Selection

- 前端：React + TypeScript，沿用 `apps/web` 现有组件结构。
- 协作数据：Yjs 文档，沿用 `colorLegend` Y.Map 的现有读写模型。
- 画布定义：`packages/canvases/*/manifest.json` 中的 `defaultColorLegend` 作为模板默认图例来源。
- 共享类型与编码：`packages/shared/src/index.ts` 和 `packages/shared/src/yjs.ts`。
- CLI 案例生成：`apps/cli/src/commands/caseAuthor.ts`。

## Implementation Approach

采用“运行时 fallback + 生成时补齐”的组合方案：

1. 前端显示层不再只依赖 Y.Doc 中已持久化的 `colorLegend`，而是允许从当前画布定义的 `defaultColorLegend` 解析出可显示图例。
2. 当 Y.Doc 中已有某个颜色的自定义 label/description 时，以用户自定义为准；缺失时才回退到 manifest 默认值。
3. 对只读案例库画布不写入 Y.Doc，只在 UI 层合并显示默认图例，避免破坏只读语义。
4. 对未来通过 `case author` 生成的新案例，在输入未显式提供 `colorLegend` 时，自动从 canvas def 的 `defaultColorLegend` 生成持久化图例，降低后续数据缺失概率。

这个方案影响面小，不需要改画布数据结构，也不需要批量重写历史 live.ydoc；同时兼顾当前线上显示问题和后续案例生成一致性。

## Implementation Notes

- 保持现有 `seedColorLegendDefaults()` 逻辑不变或仅小幅调整；用户项目仍可按当前机制把默认图例写入可编辑 Y.Doc。
- 新增 resolver 应为纯函数，避免在只读场景产生写入副作用。
- `StickyLegendPalette` 应接收可选 `defaultColorLegend`，并通过合并 resolver 得到展示 entries。
- `EmbeddedCanvas` 当前通过 `hasColorLegend(doc)` 判断是否显示图例栏，需要扩展为同时考虑 `def.defaultColorLegend`。
- 若需要在 `EmbeddedCanvas` 中拿到 def，可利用 `CanvasRenderer` render-prop 已经返回的 `def`，或新增轻量 wrapper 避免重复请求。
- 避免硬编码 BCG、Three Horizons 等画布 ID，应对所有定义了 `defaultColorLegend` 的画布通用生效。
- 不改变便签颜色本身，不改变现有 sticky 数据和案例故事内容。

## Architecture Design

当前数据流：

```text
Canvas manifest.defaultColorLegend
        ↓
可编辑项目：seedColorLegendDefaults 写入 Y.Doc
        ↓
StickyLegendPalette 从 Y.Doc 读取并显示
```

问题点：

```text
只读案例库画布跳过 seedColorLegendDefaults
        ↓
Y.Doc 中没有 colorLegend
        ↓
StickyLegendPalette 无 entries 可显示
```

修复后：

```text
Y.Doc colorLegend + CanvasDef.defaultColorLegend
        ↓
resolveVisibleLegendEntries 合并
        ↓
StickyLegendPalette 显示用户自定义或默认图例
```

## Directory Structure

```text
BusinessModelCanvas/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── collab/
│   │       │   └── colorLegend.ts
│   │       │       # [MODIFY] 新增默认图例解析与合并函数。应将 Y.Doc 中的 live legend 与 manifest defaultColorLegend 合并，live 数据优先，默认数据兜底，并提供判断是否有可显示图例的工具函数。
│   │       ├── canvas/
│   │       │   └── StickyLegendPalette.tsx
│   │       │       # [MODIFY] 增加 defaultColorLegend 可选 props，使用合并后的 entries 渲染图例 chips。保持 readOnly 下不可编辑，但可显示默认图例。
│   │       ├── pages/
│   │       │   └── ProjectWorkspacePage.tsx
│   │       │       # [MODIFY] 将 bundle.def.defaultColorLegend 传入 StickyLegendPalette。只读案例库不写入 doc，但显示层可 fallback 到默认图例。
│   │       └── story/
│   │           └── EmbeddedCanvas.tsx
│   │               # [MODIFY] 嵌入画布图例栏判断需同时考虑 Y.Doc 图例和 def.defaultColorLegend，并将默认图例传入 StickyLegendPalette。
│   └── cli/
│       └── src/
│           └── commands/
│               └── caseAuthor.ts
│                   # [MODIFY] 生成案例时，如果输入 canvas 未提供 colorLegend 且对应 def 存在 defaultColorLegend，则自动转成 ObjectsBulkInput.colorLegend，确保新案例 live.ydoc 持久化默认图例。
└── packages/
    └── shared/
        └── src/
            └── yjs.ts
                # [MODIFY] 如需要共享默认图例转换逻辑，可新增纯函数或复用类型；保持 encodeObjectsBulk 的 replace 语义不变。
```

## Key Code Structures

可采用以下接口级设计，不直接改变现有数据模型：

```ts
type VisibleColorLegendEntry = {
  hex: string;
  label: string;
  description?: string;
  source: 'live' | 'default';
};
```

核心规则：

- live label 非空：显示 live label 和 live description。
- live label 空但 default label 存在：显示 default label 和 default description。
- live description 单独存在但 label 缺失：仍不显示为 chip，避免无名称图例。
- 默认图例仅用于显示 fallback，不应自动覆盖用户清空的 label，除非是新生成案例时的 authoring 默认。

## Agent Extensions

### Skill

- **pingarden**
- Purpose: 校验 PinGarden 画布、案例库、CLI 和画布图例相关改动是否符合项目约定。
- Expected outcome: 修复后相关画布能显示便签图例，并通过 PinGarden 项目的类型检查、Web 构建和案例校验。

### SubAgent

- **code-explorer**
- Purpose: 如实现时发现图例显示链路仍不完整，用于继续追踪 Y.Doc、CanvasRenderer、EmbeddedCanvas 和案例生成链路。
- Expected outcome: 快速定位遗漏调用点，避免只修复工作区而漏掉故事嵌入或案例生成场景。
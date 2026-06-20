---
name: case-card-tags-and-next-strategy-framework
overview: 优化案例卡片中“模式”和“战略分析”标签的布局，减少垂直占用；同时规划下一个战略分析框架的内容结构、案例挂载和验证流程。
todos:
  - id: merge-case-card-chips
    content: 合并 CaseCard 中模式与战略分析标签为两列紧凑布局
    status: pending
  - id: plan-environment-framework
    content: 使用 [skill:pingarden] 规划商业模式环境扫描框架内容
    status: pending
  - id: create-framework-files
    content: 新增 business-model-environment-scan 双语框架文件
    status: pending
    dependencies:
      - plan-environment-framework
  - id: audit-case-links
    content: 使用 [subagent:code-explorer] 审计并补充适用案例关联
    status: pending
    dependencies:
      - create-framework-files
  - id: sync-manifest-skill
    content: 更新 manifest 并重新生成本地 Skill
    status: pending
    dependencies:
      - create-framework-files
      - audit-case-links
  - id: validate-and-restart
    content: 运行校验构建并重启服务验证
    status: pending
    dependencies:
      - merge-case-card-chips
      - sync-manifest-skill
---

## User Requirements

- 优化案例卡片中的“模式”和“战略分析”标签展示，不再分成上下两行。
- 将两类标签合并到同一个标签区域中，减少卡片竖向占用。
- 当标签数量较多时，按半列宽度排列，形成更紧凑的两列排布。
- 规划下一个“战略分析”框架，作为继“蓝海战略”之后的第二个战略分析方法。
- 补修蓝海战略第二批、第三批案例中 `language: "zh"` 但商业模式画布 sticky 内容仍为英文的问题。
- 建立后续防漏机制：不能只检查 `meta.language`，必须校验实际画布内容是否完成本地化。

## Product Overview

案例库卡片需要更紧凑地展示案例所应用的商业模式与战略分析方法。战略分析库需要继续扩展新的分析框架，让用户可以从不同战略视角阅读案例、理解商业模式受到的外部环境和竞争压力。

## Core Features

- 合并“模式”和“战略分析”标签区域
- 多标签两列紧凑排列
- 保持标签点击跳转到对应详情的能力
- 新增一个战略分析框架规划
- 框架需包含双语说明、示例案例、适用场景和与画布的关系
- 蓝海战略案例的中文商业模式画布必须使用中文 sticky 内容，不能只是标题和 metadata 标成中文
- 新增案例内容本地化质量门禁，避免英文内容混入中文画布

## Tech Stack Selection

- 前端：沿用现有 React + TypeScript + Tailwind CSS。
- 数据模型：沿用 `@pingarden/shared` 中的 `CaseLibraryEntry`、`BusinessModelPattern`、`StrategyFramework`。
- 案例库内容：沿用 `packages/case-library/strategy-frameworks/<slug>/` 结构。
- 校验与同步：沿用现有 `case validate`、CLI build、Skill install、本地 server 重启流程。

## Implementation Approach

本次分四部分处理：

1. **卡片标签布局优化**

- 修改 `apps/web/src/components/CaseCard.tsx`。
- 将当前两段独立渲染的 `applied` 与 `appliedFrameworks` 合并成一个统一 chip 区域。
- 保留原有颜色语义：商业模式继续使用 violet，战略分析继续使用 indigo。
- 使用两列/半列宽布局，例如 `grid grid-cols-2 gap-1`，每个 chip `w-full`、文本截断，避免竖向堆叠。
- 保留原有点击行为：模式 chip 调用 `onPatternClick`，战略分析 chip 调用 `onStrategyFrameworkClick`。

2. **规划并新增下一个战略分析框架**

- 建议优先选择 **Business Model Environment Scan / 商业模式环境扫描**。
- 理由：
    - 项目已有 `packages/canvases/business-model-environment/` 画布和知识文档。
    - 它天然属于战略分析，而不是商业模式 pattern。
    - 可与 BMC 强绑定，用于解释外部趋势、市场力量、行业力量、宏观经济如何影响商业模式。
    - 可以承接 Porter 五力、PESTEL、趋势扫描等分析视角，但不需要立即新增复杂画布。
- 新框架应放入 `packages/case-library/strategy-frameworks/business-model-environment-scan/`。
- 需要新增：
    - `framework.json`
    - `description.en.md`
    - `description.zh.md`
    - `skill.en.md`
    - `skill.zh.md`
- 同步更新：
    - `packages/case-library/manifest.json`
    - 相关案例的 `case.json` 中 `appliesStrategyFrameworks[]`
    - 生成后的 `.claude/skills/pingarden/strategy-frameworks/` 内容

3. **补修蓝海战略案例中文商业画布**

- 先审计所有 `appliesStrategyFrameworks` 包含 `blue-ocean-strategy` 的案例，重点覆盖第二批、第三批新增案例。
- 对每个案例检查 `canvases/*/meta.json` 中 `defId: "business-model-canvas"` 且 `language: "zh"` 的画布，确认 `live.ydoc` 中 sticky 文本是否为中文。
- 需要修复的对象不是 `case.json` 摘要，而是对应中文 BMC 的实际 sticky 内容；保持 `zoneId` 不变，只翻译/重写 sticky 文本。
- 当前应优先复核这些蓝海案例：`qb-house`、`novo-nordisk-novopen`、`bloomberg-terminal`、`salesforce-crm`、`citizenm-hotels`、`nickel-bank`、`marvel-studios`、`stitch-fix`、`healthmedia`、`drybar`、`tata-nano`、`transsion-africa`、`ping-an-good-doctor`、`nvidia-cuda`，并顺手抽查第一批 `cirque-du-soleil`、`yellow-tail`、`nintendo-wii`。
- 修复后更新每个 case 的 `canvasCount` / `canvasesByLanguage` 如有需要，但不改变案例 slug、projectId、canvasId。

4. **新增本地化防漏机制**

- 在 `case validate` 中增加内容级 i18n 检查：不能只校验 `description.zh.md` 或 `meta.language === "zh"`，还要解码中文画布的 `live.ydoc` / 故事正文并检测实际文本。
- 对 `language: "zh"` 的画布执行启发式校验：sticky 文本应包含足够中文字符；若大段 ASCII/英文长句占比过高，输出 error 或至少 warn。
- 对 `business-model-canvas`、`value-proposition-canvas`、`blue-ocean-strategy-canvas` 等核心画布优先启用该检查。
- 将防漏规则写入 `pingarden` Skill 的案例创作/战略框架流程：新增或批量导入双语案例时，必须运行 `case read <slug> --lang zh --json` 抽查实际中文内容，而不是只看标题。

## Implementation Notes

- 保持改动范围集中，避免重构整个卡片组件。
- 标签布局只改 `CaseCard` 展示层，不改接口和数据模型。
- `CaseCard` 当前已经在 `LibraryPage.tsx` 中接收 `patterns` 与 `strategyFrameworks`，无需新增数据请求。
- 新战略框架不应归入 `patterns`，必须继续使用 `strategyFrameworks` 体系。
- 新增框架后必须重启 server，因为 `BundleStorage` 会在启动时读取 case-library manifest 和 framework bundles。
- 若修改 `business-model-environment/manifest.json`，可顺手清理重复的 `relatedNotes` 键，避免 JSON 语义歧义。
- 新框架的示例案例应从现有案例中谨慎挑选，只标记确实适合“环境扫描”的案例，避免弱关联滥标。
- 这次蓝海案例问题的根因是只完成了中文 metadata / story，却没有核对中文 BMC 的 `live.ydoc` sticky 内容；后续以实际画布内容为验收对象。
- 修复中文画布时必须保留画布结构、`zoneId`、颜色语义和对象类型，只替换用户可见的 sticky 文本。

## Architecture Design

当前结构已经支持多战略框架，无需新增后端路由或新内容类型。

数据流：

- `packages/case-library/manifest.json`
- `BundleStorage.loadStrategyFramework()`
- `/library/strategy-frameworks`
- `libraryApi.listStrategyFrameworks()`
- `LibraryPage`
- `CaseCard`
- `StrategyFrameworkList`
- `StrategyFrameworkDetailModal`

新增框架只需要按现有 `blue-ocean-strategy` 结构扩展内容，并通过 manifest 暴露。

## Directory Structure Summary

本次计划包含一个前端展示优化、一个新增战略分析框架内容包、蓝海战略中文画布补修，以及案例本地化质量门禁。

```
BusinessModelCanvas/
├── apps/
│   ├── web/
│   │   └── src/
│   │       └── components/
│   │           └── CaseCard.tsx
│   │               # [MODIFY] 合并商业模式与战略分析 chip 区域。
│   │               # 保留两类 chip 的点击行为和视觉颜色。
│   │               # 使用两列紧凑布局，减少卡片竖向高度。
│   │
│   └── cli/
│       └── src/
│           └── commands/
│               └── caseAuthor.ts
│                   # [MODIFY] 在 case validate 中增加中文画布内容级检查。
│
├── packages/
│   └── case-library/
│       ├── manifest.json
│       │   # [MODIFY] 在 strategyFrameworks 数组中加入 business-model-environment-scan。
│       │
│       ├── strategy-frameworks/
│       │   └── business-model-environment-scan/
│       │       ├── framework.json
│       │       │   # [NEW] 新战略框架元数据。
│       │       │   # 包含 slug、双语名称、双语摘要、references、examples、relatedCanvasDefIds。
│       │       │
│       │       ├── description.en.md
│       │       │   # [NEW] 英文长说明。
│       │       │   # 说明环境扫描的用途、四类外部力量、与 BMC 的关系、案例阅读方式。
│       │       │
│       │       ├── description.zh.md
│       │       │   # [NEW] 中文长说明。
│       │       │   # 面向用户解释如何用环境扫描识别趋势、市场、行业和宏观压力。
│       │       │
│       │       ├── skill.en.md
│       │       │   # [NEW] AI 使用指南英文版。
│       │       │   # 说明何时使用、填写顺序、质量标准和反模式。
│       │       │
│       │       └── skill.zh.md
│       │           # [NEW] AI 使用指南中文版。
│       │           # 供 Skill 生成时输出到 .claude/skills/pingarden。
│       │
│       └── cases/
│           ├── */case.json
│           │   # [MODIFY] 为适合环境扫描的案例补充 appliesStrategyFrameworks。
│           │   # 候选案例优先考虑受外部环境强烈影响的案例，如 Kodak/Blockbuster 若后续新增，
│           │   # 当前库中可优先审计 Patagonia、Carvana、Uber、Airbnb、Alibaba、Cemex 等。
│           │
│           └── <blue-ocean-case>/canvases/*/live.ydoc
│               # [MODIFY] 修复 language=zh 的 business-model-canvas sticky 内容，确保中文画布不是英文文本。
│
├── packages/
│   └── canvases/
│       └── business-model-environment/
│           └── manifest.json
│               # [OPTIONAL MODIFY] 如触及该文件，清理重复 relatedNotes 键。
│
└── .claude/
    └── skills/
        └── pingarden/
            └── strategy-frameworks/
                ├── business-model-environment-scan.en.md
                └── business-model-environment-scan.zh.md
                    # [GENERATED] 通过 CLI skill install 生成，不手写。
```

## Validation Plan

- `pnpm typecheck`
- `pnpm --filter @pingarden/cli exec tsx src/index.ts case validate --json`
- `pnpm --filter @pingarden/web run build`
- `pnpm --filter @pingarden/cli run build`
- `node apps/cli/dist/index.js skill install --local --json`
- `./stop.sh && ./start.sh`
- 验证：
- `/library/strategy-frameworks` 返回两个框架
- 新框架详情页能打开
- 案例卡片的模式与战略分析 chip 同行紧凑展示
- 对所有蓝海战略案例执行中文内容抽查：`case read <slug> --lang zh --json`，确认 `business-model-canvas` sticky 文本为中文
- 新增 i18n 内容门禁后，刻意用英文文本伪造一个 `language: "zh"` 的测试样本，确认 `case validate` 能报错或警告

## Agent Extensions

### Skill

- **pingarden**
- Purpose: 对齐 PinGarden 的案例库、战略分析框架、画布和 Skill 生成规范。
- Expected outcome: 新框架结构、案例关联、验证命令和 Skill 同步流程符合现有项目约定。

### SubAgent

- **code-explorer**
- Purpose: 在实施前复核 `CaseCard`、strategy-framework 数据流、候选案例关联和现有画布文档。
- Expected outcome: 明确所有修改点，避免漏改 manifest、Skill 模板或案例反向引用。
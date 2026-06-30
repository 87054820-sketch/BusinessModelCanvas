---
name: chapter-content-multi-agent-workflow
overview: 使用多 Agent 团队分工协作，完成 12 本书的章节内容创作。角色分离：提取团队 → 规范团队（覆盖清单） → 写作团队（中英文章节） → 审计团队（覆盖率核对），最后完成前端弹框重构。
todos:
  - id: stage1-extract-pdfs
    content: Stage 1 — 使用 [skill:pdf] 提取 7 本待处理书的 PDF，将文本存入 extracts/ 目录，按章节拆分为 txt 文件
    status: completed
  - id: stage2-batch1-checklist
    content: Stage 2 — 清单 Agent：为 Batch 1（BMC、VPC、Invincible）创建覆盖清单，每章一个 JSON 文件，包含概念、论证、案例、逻辑链、术语
    status: completed
    dependencies:
      - stage1-extract-pdfs
  - id: stage3-batch1-write
    content: Stage 3 — 写作 Agent：基于 Batch 1 覆盖清单撰写中英文章节内容，覆盖清单中每一项
    status: completed
    dependencies:
      - stage2-batch1-checklist
  - id: stage4-batch1-audit
    content: Stage 4 — 审计 Agent：逐项核对 Batch 1 章节覆盖率，输出审计报告，未通过项返回 Stage 3 修正
    status: completed
    dependencies:
      - stage3-batch1-write
  - id: stage2-batch2-checklist
    content: Stage 2 — 清单 Agent：为 Batch 2（Christensen、Testing Business Ideas、Scenario Planning）创建覆盖清单
    status: completed
    dependencies:
      - stage4-batch1-audit
  - id: stage3-batch2-write
    content: Stage 3 — 写作 Agent：基于 Batch 2 覆盖清单撰写中英文章节内容
    status: completed
    dependencies:
      - stage2-batch2-checklist
  - id: stage4-batch2-audit
    content: Stage 4 — 审计 Agent：逐项核对 Batch 2 章节覆盖率，输出审计报告
    status: completed
    dependencies:
      - stage3-batch2-write
  - id: stage2-batch3-checklist
    content: Stage 2 — 清单 Agent：为 Batch 3（Blue Ocean Strategy、Blue Ocean Shift、Porter Competitive Strategy）创建覆盖清单
    status: completed
    dependencies:
      - stage4-batch2-audit
  - id: stage3-batch3-write
    content: Stage 3 — 写作 Agent：基于 Batch 3 覆盖清单撰写中英文章节内容
    status: pending
    dependencies:
      - stage2-batch3-checklist
  - id: stage4-batch3-audit
    content: Stage 4 — 审计 Agent：逐项核对 Batch 3 章节覆盖率，输出审计报告
    status: pending
    dependencies:
      - stage3-batch3-write
  - id: stage2-batch4-checklist
    content: Stage 2 — 清单 Agent：为 Batch 4（Porter Competitive Advantage、Art of the Long View、Platform Revolution）创建覆盖清单
    status: pending
    dependencies:
      - stage4-batch3-audit
  - id: stage3-batch4-write
    content: Stage 3 — 写作 Agent：基于 Batch 4 覆盖清单撰写中英文章节内容
    status: pending
    dependencies:
      - stage2-batch4-checklist
  - id: stage4-batch4-audit
    content: Stage 4 — 审计 Agent：逐项核对 Batch 4 章节覆盖率，输出审计报告，全量完成
    status: pending
    dependencies:
      - stage3-batch4-write
---

## 产品概述

为 PinGarden 案例库中的 12 本商业书籍构建结构化章节内容。每本书的每个章节需要从源材料中提取覆盖清单，然后基于覆盖清单撰写中英双语深度章节内容，最后通过独立审计确保内容质量。

## 核心目标

1. **角色分离**：源材料提取、覆盖清单制作、章节写作、内容审计四个阶段由独立 Agent 执行，互相制衡
2. **源材料驱动**：10 本有 PDF/txt 源材料的书，章节内容必须忠实覆盖原文中的每个概念、论证和案例
3. **质量门控**：每个章节在"覆盖清单 → 写作 → 审计"三关中通过后才能标记为完成
4. **双语同步**：英文和中文版本覆盖相同的清单项，但在表达方式上适配各自读者

## 阶段划分

| 阶段 | 角色 | 职责 | 产出 |
| --- | --- | --- | --- |
| Stage 1 | 提取 Agent | 将 PDF 转为结构化 txt 章节文件 | `extracts/<book>/chapters/` |
| Stage 2 | 清单 Agent | 读源材料，提取每章的覆盖清单 | `checklists/<book>/<chapter>.json` |
| Stage 3 | 写作 Agent | 按覆盖清单撰写中英文章节 | `chapters/{slug}.{en,zh}.md` |
| Stage 4 | 审计 Agent | 逐项核对清单覆盖率，标记 pass/fail | `audit-reports/<book>.md` |


## 技术栈

- **内容提取工具**：[skill:pdf] 将 PDF 源文件转为结构化 txt
- **文件格式**：覆盖清单为 JSON，章节内容为 Markdown，审计报告为 Markdown
- **现有基础设施**：前端 TypeScript/React 组件已就绪，后端 Fastify API 已实现，类型定义已扩展

## 实现方案

### 管线架构

```mermaid
flowchart TD
    PDF[PDF 源文件] -->|Stage 1| EXTRACT[提取 Agent<br/>PDF→txt 章节拆分]
    EXTRACT -->|extracts/| CHECK[清单 Agent<br/>读源材料提取概念/论证/案例]
    CHECK -->|checklists/*.json| WRITE[写作 Agent<br/>按清单写 EN+ZH 章节]
    WRITE -->|chapters/*.{en,zh}.md| AUDIT[审计 Agent<br/>逐项核对覆盖率]
    AUDIT -->|PASS| DONE[章节完成]
    AUDIT -->|FAIL| WRITE
```

### 四阶段角色分离

**Stage 1 — 提取 Agent**（与写作/审计完全独立）

- 职责：将 BusinessBooks 目录下的 PDF 转为 `extracts/<book>/chapters/*.txt`
- 工具：[skill:pdf] 读取 PDF 文本内容，按目录结构拆分为章节文件
- 产出：每本书一个 `extracts/<book>/` 目录，包含 `toc.json` + `chapters/` + `full.txt`

**Stage 2 — 清单 Agent**（只读源材料，不写作）

- 职责：读取 Stage 1 产出的 extracts 文件，提取每章的覆盖清单
- 清单格式（JSON）：

```
{
"chapter": "01-canvas",
"sourcePages": "16-50",
"concepts": [{ "name": "Business Model Canvas", "definition": "..." }],
"arguments": [{ "claim": "...", "evidence": "..." }],
"cases": [{ "name": "Apple iPod/iTunes", "illustrates": "..." }],
"logicChains": [{ "flow": "step1 → step2 → step3" }],
"terminology": [{ "term": "Value Network", "preciseDefinition": "..." }],
"nuance": ["author clarifies that X is NOT Y"]
}
```

- 存储位置：`packages/case-library/resources/<slug>/checklists/<chapter>.json`
- Tier A 书：清单项必须能追溯到源材料的具体段落
- Tier B 书（2 本无源材料）：清单基于权威目录+摘要研究

**Stage 3 — 写作 Agent**（只看清单，不看源材料）

- 职责：基于 Stage 2 的覆盖清单，撰写中英文章节 markdown
- 必须遵循 `CHAPTER_QUALITY_SPEC.md` 中的 8 段结构模板
- 必须覆盖清单中的每一项（概念、论证、案例、逻辑链、术语、nuance）
- 中英文内容必须覆盖同一份清单，但表达风格可各自适配
- 跨引用 slug 必须从 manifest.json 中验证有效性

**Stage 4 — 审计 Agent**（只看清单 + 产出，不看源材料）

- 职责：逐项核对章节内容是否覆盖清单中的所有项
- 产出审计报告：

```markdown
## Audit: <book>/<chapter>
| 清单项 | 类型 | EN 覆盖 | ZH 覆盖 | 备注 |
| Business Model Canvas | concept | PASS | PASS | |
| 9 Building Blocks | concept | FAIL | PASS | EN 缺少 CS/CH/CR 三个块的解释 |
```

- 通过标准：所有清单项的 EN 和 ZH 覆盖均为 PASS
- 未通过 → 返回 Stage 3 修正

### 执行策略

**分批处理**：12 本书分为 4 个批次，每批 3 本，单批内流水线并行

| 批次 | 书目 | 理由 |
| --- | --- | --- |
| Batch 1 | BMC、VPC、Invincible | extracts 已就绪，可立即进入 Stage 2-4 |
| Batch 2 | Christensen、Testing Business Ideas、Scenario Planning | Christensen 有现成 txt，后两本 PDF 较小 |
| Batch 3 | Blue Ocean Strategy、Blue Ocean Shift、Porter Competitive Strategy | 蓝海有中英文 PDF，Porter CS 是经典 |
| Batch 4 | Porter Competitive Advantage、The Art of the Long View、Platform Revolution | 最后两本是 Tier B，需研究补充 |


### 性能与可靠性

- 每次 Agent 输出的覆盖清单和章节内容都写入文件系统，支持断点续传
- 审计报告追加写入，不覆盖已有内容
- 每批完成后整体运行一次 `pnpm typecheck` + `pnpm build` 确保代码层无回归

## Agent 扩展

### Skill

- **pdf**
- 用途：Stage 1 中读取 `BusinessBooks/` 下的 PDF 源文件，提取完整文本内容并保存为 `extracts/<book>/` 下的结构化 txt 文件
- 预期结果：每本书输出 `toc.json`(目录结构)、`chapters/*.txt`(按章节拆分的文本文件)、`full.txt`(全书文本)，格式对齐已有 extracts 目录(bmc-en、invincible-en 等)

### SubAgent

- **code-explorer**
- 用途：在 Stage 2 清单 Agent 工作时，快速读取大型 extracts 文本文件、验证 manifest.json 和 canvas 清单中的 slug 有效性
- 预期结果：提供精确的源材料文本内容和有效的跨引用 slug 列表
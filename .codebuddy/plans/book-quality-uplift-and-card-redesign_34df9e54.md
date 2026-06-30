---
name: book-quality-uplift-and-card-redesign
overview: 分三块推进：(1) 先把"清单→写作→审计"质量流程沉淀为可复用的 book-chapter-quality skill（吸收规范 v3 + 三角色 SOP + 检查脚本），规范降为其 reference，规则只放一句红线；(2) 用该 skill 驱动，把 9 本未达标书籍提升到 A 级深度（含审计全 PASS 门控）；(3) 重新设计资源库书籍卡片与详情弹框 UI。
design:
  architecture:
    framework: react
  fontSystem:
    fontFamily: Source Sans Pro
    heading:
      size: 20px
      weight: 600
    subheading:
      size: 15px
      weight: 600
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#B45309"
      - "#D97706"
      - "#F59E0B"
    background:
      - "#FFFFFF"
      - "#FAFAF9"
      - "#F5F5F4"
    text:
      - "#1C1917"
      - "#44403C"
      - "#78716C"
    functional:
      - "#059669"
      - "#DC2626"
      - "#B45309"
todos:
  - id: create-skill
    content: 用 [skill:skill-creator] 创建 book-chapter-quality skill：SKILL.md（三阶段SOP）+ references（规范v3/清单格式/8段模板）+ scripts（厚度/孤儿/覆盖率/双语校验）
    status: completed
  - id: cleanup-and-rule
    content: 删除 blue-ocean-strategy 孤儿文件，在 .codebuddy/rules 增一条触发红线，CHAPTER_QUALITY_SPEC.md 标注已并入 skill references
    status: completed
    dependencies:
      - create-skill
  - id: upgrade-tier-b
    content: B 级三本（Christensen 9 章、Testing BI 4 章、Scenario Planning 5 章）：按 book-chapter-quality skill 用 [subagent:code-explorer] 复核清单→重写偏薄章节→补 audit 并逐项 PASS
    status: completed
    dependencies:
      - cleanup-and-rule
  - id: blue-ocean-books
    content: Blue Ocean Strategy（复核 ch01–03、补 ch04–09）+ Blue Ocean Shift（8 章）：按 skill 用 [subagent:code-explorer] 跑清单→写作→审计，全 PASS
    status: completed
    dependencies:
      - cleanup-and-rule
  - id: porter-books
    content: Porter CS（7 章）+ CA（8 章）：按 skill 用 [subagent:code-explorer] 跑清单→写作→审计，全 PASS
    status: completed
    dependencies:
      - cleanup-and-rule
  - id: longview-platform
    content: Art of the Long View（7 章）+ Platform Revolution（7 章）：按 skill 用 [subagent:code-explorer] 跑清单→写作→审计，全 PASS
    status: completed
    dependencies:
      - cleanup-and-rule
  - id: final-cross-audit
    content: 全量终审：用 skill 脚本与 [subagent:code-explorer] 核对 12 本均具备完整 checklists + 双语章节 + audit-report 且逐项 PASS，修补遗漏与失效交叉引用
    status: completed
    dependencies:
      - upgrade-tier-b
      - blue-ocean-books
      - porter-books
      - longview-platform
  - id: redesign-card
    content: 重设计书籍卡片 ResourceList/ResourceCard：书籍质感、章节数徽标、信息层级与悬停微交互，兼容无章节数据资源；按需 i18n 增补文案
    status: completed
    dependencies:
      - cleanup-and-rule
  - id: redesign-modal
    content: 重设计详情弹框 ResourceDetailModal：克制头部 + 章节左导航 + 右正文阅读排版 + 关联区，保持后端 API 与 Tab 语义不变
    status: completed
    dependencies:
      - redesign-card
  - id: verify-build
    content: 运行 pnpm typecheck 全绿 + pnpm --filter @pingarden/web build 成功，并实际渲染核对卡片与章节弹框显示正常
    status: completed
    dependencies:
      - final-cross-audit
      - redesign-modal
---

## 产品概述

为 PinGarden 资源库做两件事，并将其中的质量方法论沉淀为可复用能力：

1. **沉淀质量能力**：把"书籍章节质量提升流程"做成一个深度 Skill `book-chapter-quality`（吸收质量规范 + 三角色 SOP + 可执行检查脚本），让流程可触发、可门控、可复用；规范文档降级为该 Skill 的 reference，规则只保留一句触发红线。
2. **书籍质量与内容提升**：调用该 Skill，对 9 本未达标书籍（B/F 级）按"清单 → 写作 → 审计"流水线拉齐到 A 级深度。
3. **卡片与弹框 UI 优化**：重设计资源库书籍卡片与详情弹框，提升浏览与阅读体验。

## 核心特性

### Skill 化质量能力（新增，作为第 1 步）

- `.claude/skills/book-chapter-quality/`：`SKILL.md`（触发词 + 三阶段 SOP 总纲）+ `references/`（质量规范 v3、清单 JSON 格式、8 段章节模板与 A 级深度基准）+ `scripts/`（厚度统计、孤儿文件检测、审计覆盖率核对、双语一致性校验）。
- 单一真相源：`CHAPTER_QUALITY_SPEC.md` 内容吸收进 Skill 的 reference（v3），避免"两份规范"。
- 一条极简规则红线：涉及书籍章节内容的增改必须走该 Skill；审计未全 PASS 不算完成。

### 书籍质量提升（调用 Skill）

- 三角色互斥（清单/写作/审计）、互相制衡，审计未通过打回重写；逐本逐章推进，禁止批量加速。
- 12 本全为 Tier A（均有 `extracts/` 源材料可逐项核对），以 BMC/VPC/Invincible 为深度基准。
- 每本产出：完整 `checklists/` + 双语章节 + `audit-report.md`，逐项 PASS。

### 卡片与弹框 UI

- 卡片：书籍质感（书脊/首字母徽标）、清晰信息层级、章节数徽标、悬停微交互，兼容无章节数据资源。
- 弹框：克制头部 + 章节左导航 + 右正文阅读排版 + 关联内容区，保持后端 API 与 Tab 语义不变。

## 验收标准

- Skill 建成可用：`SKILL.md` + `references/`（规范 v3）+ `scripts/` 齐全，三角色 SOP 清晰可调用，脚本可运行。
- 每本书：完整 `checklists/` + `chapters/*.{en,zh}.md` + `audit-report.md`，审计逐项 PASS，深度对标 A 级。
- 前端：`pnpm typecheck` 全绿 + `pnpm --filter @pingarden/web build` 成功，卡片与弹框正常渲染。

## 技术栈

- **Skill 载体**：`.claude/skills/book-chapter-quality/`（Markdown SOP + reference + Python 脚本），与现有 `pingarden` skill 同级、独立成域；由 `skill-creator` 规范化生成结构。
- **内容流水线**：源材料已全部提取至 `extracts/`（12 本均 Tier A）；产出 = 覆盖清单 JSON + 双语 Markdown + 审计报告 Markdown。
- **检查脚本**：Python3（标准库即可），对齐既有 `tools/extract-pdf.py` 风格；PDF 复核如需则用 `tools/extract-pdf.py`（PyMuPDF）。
- **前端**：React + TypeScript + Tailwind CSS，`react-markdown` 渲染章节正文，`react-i18next` 国际化。
- **后端**：Fastify，章节 API 已就绪 `GET /library/resources/:slug/chapters/:chapterSlug`。
- **类型层**：`packages/shared/src/index.ts` 已有 `ResourceChapterMeta` / `ResourceChapterDetail`。

## 实现方案

### 决策结论：为什么做成 Skill（而非只留规范 / 塞规则）

根因诊断：`CHAPTER_QUALITY_SPEC.md`（v2）**只在首批 3 本被完整执行**，B/F 级书目均跳过清单与审计——因为它是"被动文档、无可触发可执行载体"。三种载体定位：

- **Skill** = 可按需加载的工作流包（SOP + 脚本 + reference），最适合"反复执行、需门控、可脚本校验"的质量流程 → **主体**。
- **规范文档** = 被动参考 → 降级为 Skill 的 reference，避免双份真相。
- **规则 RULES** = 常驻硬约束 → 只放一句触发红线，不放细节（避免长期占用 context）。

不并入 `pingarden`：后者是"应用/画布 CLI 操作"域，本能力是"内容生产质量"域，职责不同且含清单/写作/审计 ≥2 个独立场景，单独成域更清晰。

### Skill 内部结构（用 [skill:skill-creator] 规范化生成）

```
.claude/skills/book-chapter-quality/
├── SKILL.md                  # 触发描述 + 三阶段 SOP 总纲 + 调用方式 + 脚本索引
├── references/
│   ├── quality-spec.md       # 吸收并升级自 CHAPTER_QUALITY_SPEC.md → v3
│   ├── checklist-schema.md   # 覆盖清单 JSON 格式定义
│   └── chapter-template.md   # 8 段章节结构模板 + A 级深度基准样例
└── scripts/
    ├── check-thickness.py    # EN/ZH 章节字节厚度统计（识别残桩）
    ├── check-orphans.py      # chapters/*.md 与 index.json slug 一致性（孤儿检测）
    ├── audit-coverage.py     # 成稿对 checklist 条目覆盖率核对辅助
    └── check-bilingual.py    # EN/ZH 是否覆盖同一份清单
```

v3 规范要点：标注 12 本全 Tier A；把"审计全 PASS"设为强制完成门槛；写入 A 级深度基准（BMC/VPC/Invincible 每章 EN 3.8K–7.8KB、概念/论证/案例齐全）。

### 三角色质量流水线（由 Skill 编排，均用 [subagent:code-explorer] 承担、职责互斥）

```mermaid
flowchart LR
    SRC[extracts 源材料] --> CL[清单角色<br/>只读源材料<br/>产出 checklists/*.json]
    CL --> WR[写作角色<br/>只读清单<br/>按8段模板写 EN+ZH]
    WR --> AU[审计角色<br/>只读清单+成稿<br/>逐项核对覆盖率]
    AU -->|PASS| DONE[章节定稿]
    AU -->|FAIL| WR
```

- **清单角色**：读 `extracts/<book>/chapters/*.txt`，提取概念/论证/案例/逻辑链/术语/nuance → `checklists/<chapter>.json`，禁止写章节。
- **写作角色**：仅依据清单，按 8 段结构写 EN+ZH，两语覆盖同一清单，禁止读源材料。
- **审计角色**：逐项核对成稿是否覆盖清单全部条目 → `audit-report.md`；任一项 FAIL 打回写作。

### Part A 执行批次（逐本逐章，不批量加速）

1. **建 Skill + 清理 + 规则红线**：用 skill-creator 生成 `book-chapter-quality` skill（含 v3 规范、脚本）；删除 blue-ocean-strategy 孤儿文件；在 `.codebuddy/rules/` 增一条触发红线；`CHAPTER_QUALITY_SPEC.md` 标注"已并入 skill，见 references"。
2. **B 级补强**（Christensen 9 章、Testing BI 4 章、Scenario Planning 5 章）：复核清单 → 重写偏薄章节 → 补审计。
3. **Blue Ocean 两本**（Strategy 复核 ch01–03、补 ch04–09；Shift 8 章）：清单→写作→审计。
4. **Porter 两本**（CS 7 章、CA 8 章）：清单→写作→审计。
5. **Long View + Platform**（各 7 章）：清单→写作→审计。
6. **全量终审**：12 本均有 audit-report 且全 PASS，修补遗漏与失效交叉引用。

### Part B：卡片与弹框重设计

- `ResourceList.tsx`：重做 `ResourceCard`，引入书籍质感（书脊/首字母徽标）、清晰信息层级、章节数徽标、悬停微交互；兼容无章节数据资源（隐藏徽标）。
- `ResourceDetailModal.tsx`：克制头部 + 章节左导航 + 右正文（优化 prose 字号行距）+ 关联区，保持 4 Tab 语义与后端 API 不变，仅重构展现层。
- 章节数来源：复用 `LibraryResourceDetail.chapters`，避免逐卡 N+1 请求。

### 实现要点

- **单一真相源**：Skill 的 `references/quality-spec.md` 为 v3 真相源；`CHAPTER_QUALITY_SPEC.md` 仅留指针。
- **向后兼容**：后端 API、类型、i18n key 复用现有；新增 UI 文案在 `apps/web/src/i18n/{en,zh}.json` 增补，禁止硬编码。
- **质量门控**：审计未全 PASS 不得标记完成；内容可追溯源材料，禁止臆造概念或失效 slug。
- **脚本无副作用**：检查脚本只读统计、输出报告，不改写章节文件。

## 目录结构（涉及的新增/修改文件）

```
.claude/skills/book-chapter-quality/   # [NEW] 书籍质量 Skill（主体）
├── SKILL.md                           # [NEW] 触发+三阶段SOP总纲+调用方式
├── references/{quality-spec,checklist-schema,chapter-template}.md  # [NEW] 规范v3+格式+模板
└── scripts/{check-thickness,check-orphans,audit-coverage,check-bilingual}.py  # [NEW] 检查脚本

.codebuddy/rules/book-chapter-quality.md   # [NEW] 一条触发红线规则

packages/case-library/
├── CHAPTER_QUALITY_SPEC.md            # [MODIFY] 标注已并入 skill references（保留指针）
└── resources/<book-slug>/
    ├── chapters/index.json            # [既有] slug 真相源
    ├── checklists/<chapter>.json      # [NEW/MODIFY] 覆盖清单（B/F 级补齐）
    ├── chapters/<chapter>.{en,zh}.md  # [MODIFY] 按清单重写至 A 级深度
    └── audit-report.md                # [NEW] 每本书审计报告，逐项 PASS

apps/web/src/components/
├── ResourceList.tsx                   # [MODIFY] 卡片重设计
└── ResourceDetailModal.tsx            # [MODIFY] 弹框重设计
apps/web/src/i18n/{en,zh}.json         # [MODIFY] 如需新增卡片/弹框文案
```

清理项：`blue-ocean-strategy/chapters/ch01-blue-ocean.{en,zh}.md`、`ch02-six-paths.{en,zh}.md`（孤儿文件，删除）。

## 设计目标

为商业书籍资源库打造"精品图书馆"质感的浏览与阅读体验。延续 PinGarden 暖琥珀色调与克制留白，提升书籍视觉辨识度与信息层级——卡片像书架藏书、弹框像沉浸式阅读器。

## 重设计页面（2 个）

### 1. 资源库书籍卡片（ResourceList / ResourceCard）

- **封面区**：左侧书脊色块或首字母徽标（按资源类型着色）+ 右侧标题与类型 badge。
- **推荐语区**：推荐理由（line-clamp 控行），暖色细描边背景区分。
- **元信息区**：作者 · 年份，次级灰度文字。
- **底部标签区**：标签 chips（≤3）+ 章节数徽标（仅书籍）+ 关联数。
- **交互**：悬停轻微抬升 + 边框转琥珀 + 阴影，键盘可聚焦；数据类资源隐藏章节徽标、保持布局一致。

### 2. 书籍详情弹框（ResourceDetailModal）

- **顶部导航条**：类型 badge + 标题 + 作者/出版/年份 + 关闭按钮，去除冗余 slug 噪音。
- **推荐语条**：暖色高亮条，一句话推荐理由。
- **Tab 栏**：详细说明 / 章节（带计数）/ 关联内容 / 参考文献。
- **章节阅读区（核心）**：左侧 200–220px 章节树（序号+标题，当前项高亮）+ 右侧优化 prose 正文（舒适字号行距、标题层级、引用块、关联案例卡片）。
- **响应式**：max-w-4xl 限高滚动；窄屏章节树折叠为顶部下拉。

## 设计风格

精品编辑/图书馆风：温暖、克制、专业。大量留白、清晰字体层级、暖琥珀点缀色、柔和阴影与圆角，正文使用更适合长文的字号行距。

## Agent 扩展

### Skill

- **skill-creator**
- 用途：规范化生成新 skill `book-chapter-quality` 的目录结构（SKILL.md + references/ + scripts/），确保触发描述、SOP、脚本索引符合 skill 规范。
- 预期结果：产出结构完整、可被自动触发与调用的 `book-chapter-quality` skill。
- **pdf**
- 用途：当某本书源材料需复核或重新按章拆分时，读取 `BusinessBooks/` 下 PDF 并输出对齐 `extracts/<book>/` 格式的 txt。
- 预期结果：补全/修正缺失或错乱的源章节文本，保证清单角色有可靠原文可依。

### SubAgent

- **code-explorer**
- 用途：承担质量流水线三角色——清单角色（读 `extracts/` 产出 `checklists/*.json`）、写作角色（依清单写 EN+ZH 章节）、审计角色（逐项核对覆盖率产出 `audit-report.md`），三角色职责互斥、互相制衡；并核对交叉引用 slug 在 `manifest.json` 中的有效性。
- 预期结果：每本书产出可追溯的覆盖清单、A 级深度双语章节、逐项 PASS 的审计报告。
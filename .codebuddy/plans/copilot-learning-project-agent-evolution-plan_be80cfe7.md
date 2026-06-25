---
name: copilot-learning-project-agent-evolution-plan
overview: 围绕 PinGarden Copilot 的两大核心场景（资料库学习讨论、项目绘制/更新）设计一期产品与技术方案，并补充本地化用户偏好、App 预置 skill/playbook、可控自我进化能力的分层路线。
design:
  architecture:
    framework: react
  styleKeywords:
    - 清晰工作流
    - 轻量卡片
    - 知识到项目
    - 本地隐私
    - 可审阅自我进化
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 18px
      weight: 700
    subheading:
      size: 13px
      weight: 600
    body:
      size: 12px
      weight: 400
  colorSystem:
    primary:
      - "#111827"
      - "#4F46E5"
      - "#0F766E"
    background:
      - "#FFFFFF"
      - "#F8FAFC"
      - "#EEF2FF"
    text:
      - "#111827"
      - "#4B5563"
      - "#6B7280"
    functional:
      - "#059669"
      - "#D97706"
      - "#DC2626"
      - "#2563EB"
todos:
  - id: explore-copilot-seams
    content: 使用 [subagent:code-explorer] 核对 Copilot 链路和新增切点
    status: completed
  - id: define-insight-contracts
    content: 设计 discussionInsight、会话篮子和应用到项目协议
    status: completed
    dependencies:
      - explore-copilot-seams
  - id: build-session-bridge
    content: 实现洞察卡、会话篮子和应用到项目流程
    status: completed
    dependencies:
      - define-insight-contracts
  - id: design-local-evolution
    content: 使用 [subagent:context-manager] 设计本地偏好和安全记忆模型
    status: completed
    dependencies:
      - define-insight-contracts
  - id: add-playbooks
    content: 使用 [skill:skill-creator] 设计内置 playbook 与本地覆盖机制
    status: completed
    dependencies:
      - design-local-evolution
  - id: validate-docs
    content: 更新架构文档、补测试并运行验证
    status: completed
    dependencies:
      - build-session-bridge
      - add-playbooks
---

## User Requirements

- Copilot 需要围绕两类核心场景重新规划：学习资料库内容并讨论商业问题，以及绘制、创建、更新用户自己的项目。
- 两类场景需要自然衔接：用户在学习案例、框架、模式、书籍或实验方法时，如果获得有价值洞察，可以把这段讨论转化为已有项目或新项目中的画布、便签、Story 或项目洞察。
- 多轮对话上下文以一期范围为主：App 打开期间保留临时上下文，关闭 App 后清空聊天；只有用户确认保存的内容才进入项目或长期偏好。
- Plan 需要包含“自我进化能力”的产品与架构方案，包括每个 App 预置类似 skill 的能力、用户长期偏好的本地记录、以及对用户思维方式或工作习惯的周期性总结。
- 用户本地数据需要和 App 预置能力区分，不同用户可以拥有不同偏好；长期记忆必须透明、可控、可查看、可删除。

## Product Overview

Copilot 将从普通聊天助手升级为“学习研究”和“项目创作”之间的桥梁。用户可以先围绕资料库内容讨论商业问题，再把讨论中形成的洞察安全地应用到自己的项目中。系统支持本地化的工作偏好记录和 App 预置 playbook，但不在普通模式下自动修改代码或静默写入长期记忆。

## Core Features

- 学习资料库内容并讨论商业问题
- 从讨论中提炼结构化洞察卡
- 会话级洞察篮子，关闭 App 默认清空
- 将讨论洞察应用到已有项目或新项目
- App 预置 playbook，用户本地偏好可覆盖
- 用户确认后记录工作偏好和协作习惯
- 分层自我进化：偏好、流程建议、用户确认的 playbook 更新、开发者模式代码优化

## Tech Stack Selection

- 复用当前项目技术栈：React、TypeScript、Vite、Tailwind CSS、Fastify、pnpm workspace。
- 共享契约继续放在 `packages/shared/src/copilot.ts`，避免前后端协议漂移。
- 前端会话态继续沿用当前 `useConversation` 的 session-only 方向，新增 session insight basket 也优先使用内存态，关闭 App 后默认清空。
- 后端继续复用 Fastify HTTP 路由、现有身份头和 `config.dataDir` 数据目录；与项目画布数据相关的写入继续避免绕开现有存储边界。
- App 预置 skill-like 能力建议命名为 bundled playbooks，和 CodeBuddy 外部 skill 概念区分，避免混淆运行时边界。

## Implementation Approach

### Strategy

本计划采用渐进式架构：先补齐“学习讨论到项目落地”的桥梁，再引入可控的本地偏好和 playbook 机制。核心思路是新增一个中间层 `discussionInsight`，让 Copilot 先把多轮讨论整理成可审阅的洞察卡，再由用户选择目标项目和动作，最后转成现有 `projectDraft` 或 `projectUpdateDraft`。

### Key Decisions

- 不直接让学习讨论生成项目更新，先生成 `discussionInsight`，减少长对话上下文导致的误写入风险。
- 会话篮子默认不落盘，符合“关闭 App 清空对话”的一期边界。
- 长期用户偏好不记录原始聊天全文，只记录用户确认后的偏好、工作方式、常用画布、常用判断框架和被采纳的流程建议。
- “思维方式分析”应产品化为“协作偏好和商业推理习惯”，避免过度心理画像。
- 自我进化分层实现：一期只做 Level 0 和小范围 Level 1，并为 Level 2 留数据结构；Level 3 仅作为 Developer Mode 规划，不进入普通用户流程。
- App 预置 playbook 只读、版本化；用户本地 playbook 覆盖必须可查看、可回滚。

### Performance and Reliability

- 会话篮子只保存结构化摘要、来源引用和候选动作，不保存完整上下文，避免内存膨胀。
- 周期性总结按触发条件执行，例如达到指定轮数、用户点击总结、会话结束前提示；避免每轮都调用模型。
- 本地偏好文件保持小型 JSON 结构，按用户身份隔离；读写走服务层，避免 HTTP handler 直接操作文件。
- 所有长期写入必须用户确认，且提供查看、删除、导出能力。
- 继续保留当前已实现的来源覆盖校验、stale baseline 校验和 operation-level apply report。

## Implementation Notes

- 复用 `projectDraft`、`projectUpdateDraft` 的确认卡写入原则：LLM 只生成草稿，真实写入必须由用户确认。
- 新增 `discussionInsight` 不应破坏已有 `projectDraft` 和 `projectUpdateDraft` 解析逻辑；解析器应并行识别三类结构化块。
- `apply-learning-to-project` 应在生成更新草稿前重新拉取目标项目上下文，避免用旧讨论覆盖新项目状态。
- 本地记忆不要记录 API key、图片原始 dataUrl、完整聊天日志或敏感个人信息。
- 用户偏好与 inferred traits 要区分：事实偏好可以直接展示；推断项需要 confidence、evidence summary 和用户确认状态。
- App bundled playbooks 和用户本地 playbooks 要有明确优先级：当前项目上下文优先，其次用户确认偏好，其次用户本地 playbook，最后 App bundled playbook。
- 普通用户模式禁止自动改代码；Developer Mode 才允许生成代码改进建议、运行测试和展示 diff。

## Architecture Design

### Components

- Copilot Conversation Layer：管理聊天、图片、attachedRef、session-only 上下文。
- Discussion Insight Layer：从学习讨论中提炼洞察、来源引用和候选动作。
- Session Basket Layer：保存本次 App session 内用户认为有用的洞察和待应用动作。
- Apply-to-Project Layer：选择目标项目或新项目，将洞察转成 `projectDraft` 或 `projectUpdateDraft`。
- Local Evolution Layer：管理用户确认后的偏好、协作方式、playbook override 和流程建议。
- Bundled Playbook Layer：提供 App 预置 skill-like 指南，作为 Copilot 的只读背景能力。

### Data Flow

学习讨论产生回答后，前端解析 `discussionInsight` 并展示洞察卡。用户可以加入会话篮子，也可以直接选择“应用到项目”。应用时，系统获取目标项目最新上下文，把洞察、来源和目标动作组成新的 Copilot 请求，再生成可确认的项目草稿或更新草稿。若用户选择保存偏好或 playbook 变更，则进入本地记忆确认流程。

## Directory Structure Summary

本实现将扩展现有 Copilot 架构，新增 discussion insight、session basket、apply-to-project 和本地自我进化数据层。以下为预计修改和新增文件。

```
BusinessModelCanvas/
├── packages/
│   └── shared/
│       └── src/
│           ├── copilot.ts
│           │   # [MODIFY] 扩展 Copilot 共享类型。新增 CopilotDiscussionInsight、CopilotSessionInsightItem、CopilotSuggestedAction、CopilotUserPreference、CopilotPlaybookDescriptor、CopilotMemorySuggestion 等类型，并保持现有 projectDraft/projectUpdateDraft 类型兼容。
│           └── index.ts
│               # [MODIFY] 继续 re-export shared Copilot 类型，保持 @pingarden/shared 导入方式稳定。
├── apps/
│   ├── server/
│   │   └── src/
│   │       ├── copilot/
│   │       │   ├── protocols.ts
│   │       │   │   # [MODIFY] 新增 discussionInsight 和 apply-learning-to-project hidden protocol，要求输出可审阅洞察卡而非直接写项目。
│   │       │   ├── bundledPlaybooks.ts
│   │       │   │   # [NEW] 定义 App 预置只读 playbook，包括学习资料库、商业问题讨论、项目落地、自我反思规则等。
│   │       │   ├── userProfileStore.ts
│   │       │   │   # [NEW] 管理本地用户偏好和协作习惯文件。应基于 config.dataDir，按用户身份隔离，提供读写、更新、删除、导出能力。
│   │       │   └── memorySummarizer.ts
│   │       │       # [NEW] 生成本地记忆建议，不直接写入长期记忆。输出待用户确认的偏好、流程建议和 playbook 更新建议。
│   │       ├── http/
│   │       │   ├── copilot.ts
│   │       │   │   # [MODIFY] 支持新 intent，向模型注入 bundled playbooks 和用户确认偏好；保持 SSE 主链路不变。
│   │       │   └── copilotMemory.ts
│   │       │       # [NEW] 提供本地 profile、memory suggestions、playbook overrides 的读取、确认、删除和导出接口。
│   │       └── server.ts
│   │           # [MODIFY] 注册 copilotMemory 路由，保持现有 Copilot 路由和 bodyLimit 逻辑。
│   └── web/
│       └── src/
│           ├── api/
│           │   └── copilot.ts
│           │       # [MODIFY] 扩展 CopilotIntent，新增获取 playbooks、读取本地 profile、提交用户确认记忆和生成应用草稿的 API。
│           ├── copilot/
│           │   ├── projectDraft.ts
│           │   │   # [MODIFY] 增加 discussionInsight JSON 块解析、隐藏和测试；保持现有 projectDraft/projectUpdateDraft 解析兼容。
│           │   ├── useConversation.ts
│           │   │   # [MODIFY] 增加消息级 insight 元数据和本轮学习来源引用，但仍保持 session-only。
│           │   ├── useSessionInsightBasket.ts
│           │   │   # [NEW] 管理本次 App session 的洞察篮子，支持添加、移除、清空、标记有用和选择应用动作。
│           │   └── localEvolution.ts
│           │       # [NEW] 前端本地偏好与记忆建议的状态模型和辅助函数。
│           ├── components/
│           │   ├── CopilotDrawer.tsx
│           │   │   # [MODIFY] 增加学习讨论、洞察卡、会话篮子入口和“应用到项目”动作；不强制用户手动切模式。
│           │   ├── CopilotDiscussionInsightCard.tsx
│           │   │   # [NEW] 展示讨论洞察、来源引用、候选项目动作，并支持加入会话篮子。
│           │   ├── CopilotSessionInsightBasket.tsx
│           │   │   # [NEW] 展示本次 session 已收集的洞察，关闭 App 默认清空，支持应用到项目。
│           │   ├── CopilotApplyLearningDialog.tsx
│           │   │   # [NEW] 选择目标项目、新项目或当前项目，并触发 projectDraft/projectUpdateDraft 生成。
│           │   ├── CopilotMemoryReviewPanel.tsx
│           │   │   # [NEW] 展示待确认的用户偏好、工作方式和 playbook 更新建议，支持接受、忽略、删除。
│           │   └── SkillPackPane.tsx
│           │       # [MODIFY] 可展示 App bundled playbooks 和用户本地覆盖状态，区分只读和可编辑来源。
│           ├── i18n/
│           │   ├── en.json
│           │   │   # [MODIFY] 新增洞察卡、会话篮子、应用到项目、本地记忆确认、playbook 管理等英文文案。
│           │   └── zh.json
│           │       # [MODIFY] 新增对应中文文案，避免硬编码用户可见字符串。
│           └── tests/
│               # [AFFECTED] 新增或扩展 Copilot parser、basket reducer、memory review 和 apply flow 相关测试。
└── docs/
    ├── COPILOT_ARCHITECTURE.md
    │   # [MODIFY] 更新 Copilot 两大场景、discussionInsight、session basket、apply-learning-to-project 和自我进化分层。
    └── COPILOT_EVOLUTION_PLAN.md
        # [NEW] 记录 App bundled playbooks、本地用户偏好、隐私边界、自我进化等级和普通模式禁用自动改代码的原则。
```

## Key Code Structures

建议在 shared 中只新增类型级契约，不急于引入复杂运行时 schema。关键结构包括：

- `CopilotDiscussionInsight`：标题、摘要、洞察列表、来源引用、建议动作。
- `CopilotSessionInsightItem`：session 内洞察篮子条目、来源消息、用户标记状态。
- `CopilotUserProfile`：用户确认的偏好、常用画布、协作方式、推理习惯、更新时间。
- `CopilotMemorySuggestion`：待用户确认的偏好或 playbook 更新建议，包含 evidence summary、confidence 和状态。
- `CopilotPlaybookDescriptor`：App bundled playbook 和用户本地 playbook 的版本、作用域、优先级和只读状态。

## Design Approach

本次 UI 重点是在现有 Copilot 抽屉内增加轻量但清晰的“学习到项目”桥梁，不重做整套界面。设计应保持右侧抽屉工作流，新增洞察卡、会话篮子和应用到项目弹层。

## Screen and Block Planning

### Copilot Drawer

- 顶部保留当前 Copilot 标题、上下文引用和设置入口。
- 对话区继续展示普通回答、资料引用、项目草稿和更新草稿。
- 新增 discussion insight card，位于回答下方，展示关键洞察、来源和建议动作。
- 底部输入区保留原交互，并增加“应用这段讨论到项目”的轻量入口。

### Session Insight Basket

- 作为抽屉内可折叠区或侧栏小面板。
- 展示本次 session 收集的洞察数量、来源、候选动作。
- 支持移除、清空、标记有用、应用到项目。
- 明确提示“关闭 App 后默认清空，保存到项目需确认”。

### Apply Learning Dialog

- 第一步选择目标：当前项目、已有项目、新项目。
- 第二步选择动作：生成项目草稿、更新画布、创建 Story、保存项目洞察。
- 第三步预览将要发送给 Copilot 的洞察摘要和来源。
- 生成后回到现有确认卡流程。

### Memory Review Panel

- 仅展示待用户确认的长期偏好或 playbook 建议。
- 每条建议包含来源摘要、置信度、影响范围。
- 操作包括接受、忽略、编辑、删除。
- 不展示原始聊天全文。

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 核对现有 Copilot、Skill Pack、存储、i18n 和项目写入链路，避免计划遗漏实际调用点。
- Expected outcome: 输出精确文件路径、函数边界、复用模式和潜在回归点。

- **context-manager**
- Purpose: 设计本地用户偏好、会话洞察、长期记忆建议和自我进化分层的数据边界。
- Expected outcome: 给出安全、可控、可删除、可回滚的本地记忆架构。

### Skill

- **skill-creator**
- Purpose: 参考 skill 设计方法，定义 App bundled playbooks 的结构、版本、触发条件和用户覆盖规则。
- Expected outcome: 形成可维护的内置 playbook 规范，而不是临时 prompt 拼接。
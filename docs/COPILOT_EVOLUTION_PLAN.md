# Copilot Evolution Plan

本文档定义 PinGarden Copilot 的自我进化边界：App 预置 playbook、本地用户偏好、会话洞察、长期记忆建议，以及普通模式和 Developer Mode 的能力分层。

## 1. 能力分层

### Level 0：本地偏好 Profile

- 记录用户确认过的工作偏好、常用画布、协作方式和商业推理习惯。
- 按 `displayName` 派生本地目录隔离。
- 不保存原始聊天全文、API key、原图 dataUrl 或敏感个人信息。
- 用户可以查看、删除、导出。

### Level 1：流程反思建议

- Copilot 可以提出“是否记住这个偏好”或“是否调整 playbook”的建议。
- 建议默认只是 pending suggestion，不是长期记忆。
- 必须包含 `evidenceSummary` 和 `confidence`。
- 用户接受后才写入 profile。

### Level 2：用户确认的本地 Playbook 覆盖

- App bundled playbooks 是只读默认能力。
- 用户本地 playbook 可以覆盖或补充 bundled playbook。
- 覆盖必须可查看、可回滚、可删除。
- 一期只预留数据结构，不默认开放复杂编辑。

### Level 3：Developer Mode 自我改代码

- 普通用户模式禁止自动改代码。
- Developer Mode 可生成改进计划、修改代码、运行测试、展示 diff。
- 必须显式确认，且不得绕过测试和版本控制审查。

## 2. 数据边界

本地记忆位于服务端 `config.dataDir` 下：

```text
<dataDir>/copilot/users/<userKey>/memory.json
```

`userKey` 由 `displayName` 计算而来，避免路径注入和跨用户混淆。

长期存储只包含：

- `CopilotUserProfile`
- `CopilotMemorySuggestion[]`
- 用户本地 playbook 覆盖

不长期存储：

- 完整聊天记录
- API key
- 图片原始数据
- 未确认的心理画像
- 敏感个人信息

## 3. App Bundled Playbooks

内置 playbook 位于：

- `apps/server/src/copilot/bundledPlaybooks.ts`

它们是只读、版本化、随 App 分发的 skill-like 能力，用于指导 Copilot：

1. 学习讨论先提炼 `discussionInsight`。
2. 应用到项目必须生成可确认草稿。
3. 自我进化只能生成建议，不可静默写长期记忆。

优先级：

```text
当前项目上下文 > 用户确认偏好 > 用户本地 playbook > App bundled playbook
```

## 4. 学习到项目的桥

一期采用中间层：

```text
学习资料 / 商业讨论
  -> pingarden.discussionInsight
  -> session insight basket
  -> Apply Learning Dialog
  -> projectDraft / projectUpdateDraft
  -> 用户确认
  -> 项目写入
```

`discussionInsight` 默认只属于当前 App session，关闭 App 后清空。只有用户明确应用到项目或接受记忆建议时，内容才会持久化。

## 5. 安全原则

- LLM 不直接写项目数据。
- LLM 不直接写长期记忆。
- 用户本地偏好只作为协作指导，不作为事实来源。
- “思维方式分析”只能表述为“协作偏好 / 商业推理习惯”，并且需要证据摘要和用户确认。
- 普通模式不允许自动改代码。

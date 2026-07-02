# Copilot Architecture

本文档整理 PinGarden Copilot 当前架构、协议边界、写入链路和后续优化计划。它用于约束后续 Copilot 迭代，避免把“聊天建议”“项目创建”“项目更新”“画布写入”“Story 写入”的职责混在一起。

AI 测试矩阵和每次 AI 迭代的自检清单见 `docs/COPILOT_AI_TESTING.md`。任何 prompt、provider、router、resolver、skill、CLI、结构化卡片改动都必须同步检查测试覆盖和历史 fixture。

模型接入由后端 AI Catalog 驱动：用户可见 provider 通过 `/copilot/health` 下发，当前包括 Kimi、DeepSeek、MiniMax；前端只渲染 `visibility=user` 的模型；`fixture-ai`、`agent-bridge-ai` 等 `internal-test` provider 只服务自动化测试和 fixture 迭代，不能作为用户无 key 时的产品 fallback。

## 1. 核心原则

1. **LLM 只生成草稿，不直接写数据**
   - Copilot 回复中可以包含结构化 JSON 草稿。
   - 真实写入必须由前端确认卡触发。

2. **学习讨论和项目写入分离**
   - `pingarden.discussionInsight`：把资料库学习和商业讨论整理成会话级洞察卡。
   - `pingarden.projectDraft`：创建新项目。
   - `pingarden.projectUpdateDraft`：更新已有用户项目。
   - “应用到项目”必须先选择目标，再生成可确认草稿。

3. **用户确认后才落库**
   - 新项目、画布、便签、Story 都必须经过确认卡。
   - Copilot 不能只在聊天中声称“已完成”。

4. **画布更新按完整目标状态写入**
   - 已有画布的便签更新使用 replace-mode。
   - 模型必须输出保留原内容后的完整目标便签列表。

5. **图片和文字来源必须可审计**
   - 多张图片中的可见标签、便签、注释必须先抽取为 `sourceFindings`。
   - 每个 finding 必须映射到 sticky 或 Story，或进入 `unmappedSourceItems` 并说明原因。

6. **Story 引用必须可解析**
   - Story 中的 `::canvas[...]` directive 必须能解析到当前项目中的画布。
   - 创建项目时可以先使用 defId directive，画布创建后再由服务端校验。

## 2. 主要文件地图

### Shared DTO

- `packages/shared/src/copilot.ts`
  - `CopilotImageAttachment`
  - `CopilotSourceFinding`
  - `CopilotSourceCoverage`
  - `CopilotDraftSticky`
  - `CopilotDraftCanvas`
  - `CopilotDraftStory`
  - `CopilotProjectDraft`
  - `CopilotProjectUpdateDraft`
  - `CopilotDiscussionInsight`
  - `CopilotSessionInsightItem`
  - `CopilotUserProfile`
  - `CopilotPlaybookDescriptor`
  - `getCopilotSourceCoverageIssues`

- `packages/shared/src/index.ts`
  - 统一 re-export Copilot DTO，保持 `@pingarden/shared` 导入方式不变。

### Web 前端

- `apps/web/src/components/CopilotDrawer.tsx`
  - Copilot 抽屉主入口。
  - 管理用户输入、图片附件、上下文绑定、intent 推断、SSE 消息接收。

- `apps/web/src/api/copilot.ts`
  - Copilot HTTP 客户端。
  - 支持 `project-draft`、`project-update`、`discussion-insight`、`apply-learning-to-project` intent。
  - 提供本地 memory / bundled playbook 查询接口。

- `apps/web/src/copilot/projectDraft.ts`
  - 从 Copilot 回复中解析结构化 JSON 草稿。
  - 识别并隐藏 `projectDraft` / `projectUpdateDraft` / `discussionInsight` 代码块。
  - 复用 shared source coverage 校验逻辑。

- `apps/web/src/copilot/useSessionInsightBasket.ts`
  - 管理本次 App session 内的洞察篮子，关闭 App 后默认清空。

- `apps/web/src/components/CopilotDiscussionInsightCard.tsx`
  - 展示学习讨论提炼出的洞察卡，支持加入篮子或应用到项目。

- `apps/web/src/components/CopilotApplyLearningDialog.tsx`
  - 选择新项目或已有项目，把洞察转成可确认项目草稿/更新草稿。

- `apps/web/src/components/CopilotMemoryReviewPanel.tsx`
  - 展示本地用户偏好和待确认记忆建议。

- `apps/web/src/copilot/storyCanvasReferences.ts`
  - 将 Story 中可解析的 `::canvas[defId]{}` 重写为 `::canvas[defId]{canvasId="..."}`。

- `apps/web/src/components/CopilotProjectDraftCard.tsx`
  - 新项目创建确认卡。
  - 创建项目、画布、便签、Story。
  - 阻止空画布和来源覆盖不足的草稿。

- `apps/web/src/components/CopilotProjectUpdateDraftCard.tsx`
  - 已有项目更新确认卡。
  - 支持新增画布、替换已有画布便签、创建 Story、更新 Story。
  - 阻止项目不匹配、空操作、空画布、空 Story、来源覆盖不足。

- `apps/web/src/api/client.ts`
  - 项目、画布、便签写入 API。

- `apps/web/src/api/stories.ts`
  - Story 创建和更新 API。

### Server 后端

- `apps/server/src/http/copilot.ts`
  - Copilot HTTP 路由。
  - 构建系统提示、上下文 Markdown、latest user message。
  - 调用 Kimi CLI 并通过 SSE 返回结果。

- `apps/server/src/copilot/protocols.ts`
  - 维护 `projectDraft` / `projectUpdateDraft` / `discussionInsight` / `apply-learning-to-project` hidden protocol。

- `apps/server/src/copilot/bundledPlaybooks.ts`
  - App 内置只读 playbook，作为 PinGarden Copilot 的预置 skill-like 能力。

- `apps/server/src/copilot/userProfileStore.ts`
  - 基于 `config.dataDir` 管理本地用户偏好、记忆建议和本地 playbook 覆盖。

- `apps/server/src/http/copilotMemory.ts`
  - 提供本地记忆查看、确认、忽略、删除、导出和内置 playbook 查询接口。

- `apps/server/src/http/stories.ts`
  - Story API。
  - 校验 Story 中嵌入的 canvas directive 是否解析到同项目画布。

- `apps/server/src/llm/kimiCliAdapter.ts`
  - Kimi CLI 流式输出适配。

- `apps/server/src/llm/kimiConfig.ts`
  - 每次请求前写入 Kimi API key 配置。

## 3. Copilot 模式

Copilot 通过当前 `AttachedRef` 推导工作模式。

### `createProject`

触发条件：

- 没有绑定 project / canvas / story / case / pattern。
- 用户从空白 Copilot 入口发起创建。

目标：

- 从图片、链接、描述文字创建新项目草稿。
- 输出 `pingarden.projectDraft`。

### `libraryReference`

触发条件：

- 当前引用为 case。
- 当前引用为 pattern。
- 当前引用为只读 library project。

目标：

- 基于参考内容解释、总结或生成可复制的新项目草稿。
- 不能直接更新只读 library project。

### `projectWork`

触发条件：

- 当前引用为用户自己的 project / canvas / story。

目标：

- 基于最新项目上下文生成可应用更新。
- 输出 `pingarden.projectUpdateDraft`。

## 4. 请求与响应链路

```text
User input / images
  -> CopilotDrawer
  -> infer intent: discussion-insight | project-draft | project-update | apply-learning-to-project
  -> fetch attached context / target project context when needed
  -> copilotApi.streamChat()
  -> POST /copilot/chat
  -> server validates request and images
  -> server injects hidden protocol
  -> Kimi CLI streaming
  -> SSE delta frames
  -> CopilotDrawer appends assistant message
  -> projectDraft parser extracts structured draft / discussion insight
  -> insight card or confirmation card renders
  -> user adds insight to basket or confirms project write
  -> write APIs create/update project data only after confirmation
```

## 5. 图片附件链路

当前图片链路：

1. 用户上传或粘贴图片。
2. 前端保存附件信息。
3. Copilot 请求携带 `CopilotImageAttachment[]`。
4. 后端校验图片类型、数量和大小。
5. hidden protocol 要求模型从每张图抽取 `sourceFindings`。

当前约束：

- 最大图片数量：`COPILOT_MAX_IMAGE_ATTACHMENTS = 9`
- 单图最大大小：`COPILOT_MAX_IMAGE_BYTES = 5MB`
- 支持类型：png / jpeg / webp / gif
- 服务端 `bodyLimit` 按 `图片数量 * 单图上限 * base64 开销` 计算，避免原图 dataUrl 被请求体限制拦截。

重要结论：

- Copilot 图片大概率是商业画布、截图、信息图、标签墙，细节密度高。
- Copilot 聊天图片发送给模型时使用原图 dataUrl，不再使用压缩 preview。
- UI 仍可使用缩略图展示，但缩略图不参与模型输入。

## 6. `pingarden.projectDraft`

职责：创建新项目。

适用场景：

- 用户上传多张图片创建项目。
- 用户输入描述性文字，希望形成项目和 Story。
- 用户基于 case / pattern / library project 创建自己的项目。

核心结构：

```json
{
  "kind": "pingarden.projectDraft",
  "project": {
    "name": "Project name",
    "description": "One-sentence description"
  },
  "sourceCoverage": {
    "sourceImageCount": 4,
    "findings": [],
    "mappedFindingIds": [],
    "unmappedSourceItems": []
  },
  "canvases": [],
  "stories": [],
  "missingFields": [],
  "notes": []
}
```

必须满足：

- 每张上传图片都要尽量抽取可见标签、便签、注释。
- 每张被创建的画布必须至少有 1 个有效 sticky。
- 用户提供描述性文字时，必须尽量生成至少 1 个 Story。
- 未覆盖来源必须显式列入 `unmappedSourceItems`。

写入顺序：

1. 创建 project。
2. 创建 canvases。
3. 写入 canvas stickies。
4. 创建 stories。
5. 刷新项目页。

## 7. `pingarden.projectUpdateDraft`

职责：更新已有用户项目。

适用场景：

- 给已有画布补充便签。
- 新增相关画布并写入便签。
- 创建 Story。
- 更新已有 Story。
- 根据新图片或新文字继续优化项目。

核心结构：

```json
{
  "kind": "pingarden.projectUpdateDraft",
  "projectId": "current-project-id",
  "summary": "What will change",
  "sourceCoverage": {
    "sourceImageCount": 1,
    "findings": [],
    "mappedFindingIds": [],
    "unmappedSourceItems": []
  },
  "operations": [],
  "notes": []
}
```

支持操作：

| Operation | 用途 | 关键要求 |
| --- | --- | --- |
| `createCanvas` | 新增画布 | 必须带非空 stickies |
| `replaceCanvasStickies` | 替换已有画布便签 | 必须是完整目标状态 |
| `createStory` | 新增 Story | title / content 必须非空 |
| `replaceStory` | 更新已有 Story | content 是完整目标 Markdown |

必须满足：

- `projectId` 必须等于当前用户项目。
- library project 不允许应用 update draft。
- 新增画布不得为空。
- 替换已有画布时必须保留应继续存在的原便签。
- Story 的 canvas directive 必须能被服务端校验通过。

## 8. 写入边界

### Project

- 创建入口来自 `CopilotProjectDraftCard`。
- 更新入口不直接改 project metadata，当前 update draft 聚焦 canvas / sticky / story。

### Canvas

- 新建 canvas 使用现有 create canvas API。
- 模型输出的 `defId` 必须能匹配现有 canvas definition。

### Stickies

- 新建画布后写入初始 stickies。
- 更新已有画布使用 replace-mode。
- `zoneId` 必须来自对应 canvas definition。

### Story

- 创建和更新使用 `storiesApi.create()` / `storiesApi.update()`。
- 服务端 `stories.ts` 负责校验嵌入画布引用。

## 9. 当前主要风险

### R1. 图片压缩导致标签识别缺失

风险：

- 商业画布和信息图通常文字密集。
- 压缩后小字、便签边界、分区标题容易丢失。
- 模型会基于低清图生成不完整 `sourceFindings`。

当前实现：

- Copilot 聊天图片不压缩，直接使用用户上传原图 dataUrl。
- 单图上限调整为 5MB，并同步提高服务端请求体上限。
- UI 缩略图仅用于展示，不参与模型输入。

后续可选：

- 创建/更新确认卡展示每张图的 finding 数量，低于阈值时阻止应用或提示重试。

### R2. `sourceCoverage` 不能只信模型自报

风险：

- 模型可能漏抽图片内容，却仍声称覆盖完成。
- `sourceImageCount` 可能小于实际上传图片数量。

当前实现：

- 前端将本轮真实上传图片数量写入 assistant 草稿消息的 `expectedSourceImageCount`。
- `CopilotProjectDraftCard` 和 `CopilotProjectUpdateDraftCard` 应用前校验每张图片至少有一个 finding。
- 如果实际有 4 张图，但 coverage 只覆盖 2 张，阻止应用。

### R3. replace-mode 覆盖风险

风险：

- Copilot 获取上下文后，用户又手动改了画布。
- 再应用旧草稿会覆盖新内容。

建议：

- 为 canvas context 增加 `stateHash` 或 `updatedAt`。
- update draft 应携带基线版本。
- 应用前检查基线是否变化，变化则要求重新生成草稿。

### R4. 多操作应用没有事务

风险：

- `projectUpdateDraft` 一次可能包含多个操作。
- 中途失败会产生部分成功状态。

建议：

- 卡片展示 apply report。
- 每个 operation 独立记录成功/失败。
- 后续支持重试失败操作或应用前快照。

### R5. Story defId directive 可能歧义

风险：

- `::canvas[business-model-canvas]{}` 在项目内有多个同类画布时可能解析到非预期画布。

建议：

- 新建画布完成后，尽量将 Story directive 改写为带 `canvasId` 的精确引用。
- 更新已有项目时，优先使用 `canvasId` directive。

### R6. project-update intent 推断过宽

风险：

- 用户只是想问建议，但关键词触发了可应用更新草稿。

建议：

- UI 区分“问 Copilot”和“生成可应用更新”。
- 或在 update draft 卡片中强化“不会自动应用，需确认”。

### R7. 协议和上下文构建集中在单个后端文件

风险：

- `apps/server/src/http/copilot.ts` 职责持续膨胀。
- hidden protocol、context builder、route handler、image validation 混在一起。

建议：

- 拆分：
  - `apps/server/src/copilot/protocols.ts`
  - `apps/server/src/copilot/contextBuilders.ts`
  - `apps/server/src/copilot/imageValidation.ts`

### R8. 草稿 schema 应集中化

风险：

- shared 只有 TS interface。
- 前端 guard 和后端 protocol 示例容易漂移。

建议：

- 将 Copilot schema 拆到 shared 独立文件。
- 使用统一 runtime schema 支持前端解析、测试 fixture、文档示例。

## 10. 改进计划

### P0：取消 Copilot 图片压缩（已完成）

目标：

- Copilot 聊天中发送给模型的图片使用原图 dataUrl。
- 保留图片数量、格式、大小限制。
- 优先保证信息图、画布截图、便签墙的文字识别质量。

建议改动：

- 前端图片附件发送逻辑不再使用压缩后的 prompt preview。
- UI 仍可使用缩略图做展示，但模型输入使用原图。
- 如果原图超过上限，提示用户换更清晰但小于限制的图片，而不是自动压缩到低清。

验收：

- 上传 4 张画布截图时，请求中每张图保留原始尺寸 dataUrl。
- 确认卡显示每张图的 `sourceFindings`。
- 小字标签识别数量明显多于压缩图版本。

### P0：expected image count 校验（已完成）

目标：

- 不再只依赖模型自报 `sourceImageCount`。

建议改动：

- 前端把本轮发送的图片数量作为 `expectedImageCount`。
- `CopilotProjectDraftCard` 和 `CopilotProjectUpdateDraftCard` 应用前校验每张图都有 finding。

验收：

- 实际上传 4 张图，但 draft 只覆盖 3 张时，阻止应用。
- 卡片明确提示缺失第几张图的来源抽取。

### P1：replace-mode 基线校验（已完成）

目标：

- 避免旧 update draft 覆盖用户后续手动修改。

当前实现：

- 生成 `project-update` 草稿前，前端捕获当前项目内 canvas / story 的 `updatedAt` 基线。
- 应用 `replaceCanvasStickies` / `replaceStory` 前重新读取目标对象。
- 如果当前 `updatedAt` 与草稿生成时不一致，阻止应用并提示重新生成草稿。

验收：

- 生成草稿后手动改画布，再应用旧草稿时会提示重新生成。

### P1：Story directive 精确化

目标：

- 避免 defId directive 在多画布项目中产生歧义。

建议改动：

- 创建画布后建立 `defId -> canvasId` 映射。
- 创建 Story 前将可解析 defId directive 改写为 `canvasId` directive。

验收：

- 新建项目 Story 中的画布引用能精确定位到刚创建的画布。
- 同项目有多个同类画布时不会引用错。

### P1：项目更新应用报告（已完成）

目标：

- 多操作更新失败时，用户知道哪些成功、哪些失败。

建议改动：

- `CopilotProjectUpdateDraftCard` 维护 operation-level result。
- 部分失败时展示失败操作和错误原因。

验收：

- 多操作中一个失败时，成功项不被误报失败。
- 用户能看到可重试/需重新生成的范围。

### P2：后端 Copilot 模块拆分

目标：

- 降低 `copilot.ts` 文件复杂度。

当前实现：

- hidden protocol 已拆到 `apps/server/src/copilot/protocols.ts`。

后续可选：

- 继续拆分 context builder、image validation。
- 给协议输出增加单元测试或快照测试。

验收：

- `/copilot/chat` route 只负责请求校验、SSE 和 orchestration。
- protocol 文案变更有独立测试覆盖。

### P2：Copilot schema 独立化（已完成基础拆分）

目标：

- 让 DTO、runtime validation、测试 fixture、文档保持一致。

建议改动：

- 从 `packages/shared/src/index.ts` 拆出 `copilot.ts` 或 `copilotSchemas.ts`。
- 前端 parser 使用同一套 guard/schema。

验收：

- `projectDraft.test.ts` 覆盖 schema 成功/失败样例。
- 文档示例和测试 fixture 一致。

## 11. 边界场景 Checklist

### 创建项目

- [ ] 1 张图片创建项目。
- [ ] 4 张图片创建项目。
- [ ] 图片 + 描述文字创建项目。
- [ ] 图片没有可识别 finding，阻止应用。
- [ ] 某张图片无 finding，阻止应用。
- [ ] finding 未映射到 sticky / Story，阻止应用。
- [ ] 画布为空，阻止应用。
- [ ] `zoneId` 不存在，阻止或过滤并提示。
- [ ] 描述文字存在但无 Story，提示补齐。

### 更新项目

- [ ] 用户项目页新增画布。
- [ ] 用户画布页补充便签。
- [ ] 用户 Story 页更新 Story。
- [ ] library project 不显示 update apply card。
- [ ] update draft projectId 不匹配，阻止应用。
- [ ] replace-mode 前后基线变化，阻止应用。
- [ ] 多操作部分失败，展示 operation-level report。

### Story

- [ ] Story 引用现有 canvasId。
- [ ] Story 引用 defId 并能解析到项目画布。
- [ ] Story 引用不存在画布，服务端拒绝。
- [ ] 同项目多个同类画布时，Story 引用不歧义。

### 图片

- [ ] 原图 dataUrl 进入模型请求。
- [ ] UI 缩略图不影响模型输入。
- [ ] 超过大小限制时提示用户，而不是自动低清压缩。
- [ ] 多图 source index 稳定对应上传顺序。

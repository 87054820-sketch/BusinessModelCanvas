---
name: Copilot 推荐卡片三项修复
overview: 把快捷 prompt 模板里"书籍/文章不要放进案例列表"的规则下沉到服务端 system prompt；为资源卡（书籍/网页/报告）补一个"查看源链接"按钮（书籍优先 Amazon）；画布看板卡片增加项目名、去掉中文标签和 contentDateLabel 描述。
todos:
  - id: trim-prompts
    content: 删除 CopilotDrawer.tsx 三处 template 末尾的"不要把书籍/文章写成案例"冗余规则（中英同步）
    status: pending
  - id: strengthen-server-rule
    content: 在 apps/server/src/http/copilot.ts L424 末尾追加内置规则说明，让 LLM 在用户 prompt 不重复时仍按规则执行
    status: pending
  - id: add-view-source
    content: 在 CopilotCanvasReferenceBoard.tsx 的 CopilotResourceReferenceBoard 资源卡加"查看源"按钮 + getResourcePrimaryUrl 推断函数
    status: pending
  - id: canvas-project-name
    content: 在 CopilotCanvasReferenceBoard.tsx 的 CopilotCanvasReference 类型加 projectName；useCopilotRecommendationReferences 中批量查 projectsApi.get；CopilotCanvasReferenceBoard 卡片顶部显示项目名
    status: pending
  - id: canvas-trim-fields
    content: 在 CopilotCanvasReferenceBoard.tsx 画布卡移除 language 和 contentDateLabel/date 显示
    status: pending
  - id: i18n-view-source
    content: 在 zh.json / en.json 的 library.copilot.readingRefs 新增 viewSource 键
    status: pending
  - id: verify
    content: 跑 pnpm -r typecheck 和 pnpm --filter @pingarden/web build 验证
    status: pending
    dependencies:
      - trim-prompts
      - strengthen-server-rule
      - add-view-source
      - canvas-project-name
      - canvas-trim-fields
      - i18n-view-source
---

## Product Overview

优化 Copilot 推荐的三个交互问题：

1. 快捷 prompt 模板中冗余的"书籍/文章是参考阅读，不要放进案例列表"规则——应从用户可见 prompt 中移除，迁为服务端系统提示的内置规则
2. 资源卡（书籍/网页/报告）只显示内部预览，缺跳转到外部原网页/Amazon 的入口
3. 画布看板卡片缺项目名、且包含冗余的语言标签和描述文字

## Core Features

- **快捷 prompt 清理**：从 `CopilotDrawer.tsx` 的 3 处 template 字符串中移除冗余的"不要把书籍/文章写成案例"句尾
- **服务端系统规则强化**：在 `apps/server/src/http/copilot.ts` 的 L424 规则后追加"用户在 prompt 中已不再重复该约束"，确保 LLM 仍按规则执行
- **资源卡外部链接**：在 `CopilotResourceReferenceBoard` 资源卡上加"查看源"按钮（从 `sources[]` 推断：书籍→Amazon，网页/报告→首个 URL）
- **画布看板卡片重排**：
- 新增 projectName 字段（按需查 `projectsApi.get`）
- 显示项目名（顶部小灰字）
- 移除 language 标签
- 移除 contentDateLabel/description
- **i18n 补充**：新增 `library.copilot.readingRefs.viewSource`（查看源 / View source）

## User Requirements

1. 快捷方式 prompt 里的"注意：书籍/文章是参考阅读，不要放进案例列表"改为内置规则，不再放到用户 prompt
2. 资源卡要能跳到原网页/Amazon，否则信息链断了
3. 画布看板显示项目名 + 该项目下的画布类型；语言标签和说明文字不需要

## Tech Stack

- 沿用现有 React + TypeScript + Tailwind + i18next 栈
- 单文件 `apps/web/src/components/CopilotCanvasReferenceBoard.tsx` 承担三处改动（资源卡按钮、画布卡字段、projectName lookup）
- 服务端 `apps/server/src/http/copilot.ts` 改 system rule 文本（一行强化）
- i18n 双语文件：仅新增 1 个 key

## Implementation Approach

### 改动 1：快捷 prompt 移除冗余规则（前端）

- 删 `CopilotDrawer.tsx` L1044 strategy-choice 模板末尾"注意：书籍/文章是参考阅读，不要放进案例列表。"
- 删 L1082 case-inspiration 模板末尾"注意不要把参考资料写成案例。"
- 删 L1101 business-model-pattern 模板末尾"注意不要把书籍/文章写成案例。"
- 中英两版同步删除

### 改动 2：服务端系统规则强化（后端）

- 改 `apps/server/src/http/copilot.ts` L424 末尾追加一句：

> "This rule is built-in; the user prompt will not repeat it — apply it unconditionally."

- 中文版同理（当 lang === 'zh' 时输出对应版本）
- 因为 system rule 一直生效，所以删掉用户 prompt 中的重复句后，LLM 仍按规则执行

### 改动 3：资源卡外部链接（前端）

- 在 `CopilotCanvasReferenceBoard.tsx` 新增纯函数 `getResourcePrimaryUrl(resource)`：
- `resource.type === 'book'`：找第一个 label 含 "Amazon" 且有 URL 的 source
- 其他类型：找第一个有 URL 的 source
- 都找不到返回 undefined
- 在 `CopilotResourceReferenceBoard` 卡片底部行（预览按钮旁）加一个 `<a>` 外部链接按钮：
- 当 `getResourcePrimaryUrl` 返回值时显示 "查看源"（zh）/ "View source"（en）
- `target="_blank" rel="noreferrer"`
- 用与预览按钮相近的 amber 色系但边框样式区分（实心 vs outline），避免与预览冲突
- 不改 `LibraryResource` schema

### 改动 4：画布看板卡片（前端）

- `CopilotCanvasReference` 类型加可选字段 `projectName: string`
- `useCopilotRecommendationReferences` 中：
- 已有 `caseRef.detail.project.name` 走 matchedCaseCanvasRefs 路径，直接赋值
- uuid 路径下批量 `projectsApi.get(projectId, displayName)` 按 `projectId` 去重查询
- 失败回退为 `projectId`（与现有 `defName` 回退一致）
- `CopilotCanvasReferenceBoard` 卡片 JSX：
- 顶部加一行项目名（小号 gray-500）
- 删除 language span
- 删除 contentDateLabel/date span
- 保留 defName tag、title、预览按钮
- 不动 `CanvasMeta` schema

### 改动 5：i18n

- `apps/web/src/i18n/zh.json` + `en.json` 的 `library.copilot.readingRefs` 加 `viewSource` 键
- 不动其他 i18n 文案

## Architecture Design

- 单文件收敛（CopilotCanvasReferenceBoard.tsx）— 资源卡和画布卡的渲染同源
- 服务端规则与前端解耦：规则只在 server 提示中保留
- 数据流不变：useCopilotRecommendationReferences 仍是唯一 hook；projectName 走 `projectId` 查表回填

## Directory Structure

```
apps/web/src/components/
  CopilotCanvasReferenceBoard.tsx          # [MODIFY] 资源卡加查看源按钮、画布卡加 projectName/去语言/去描述；新增 getResourcePrimaryUrl
apps/web/src/components/
  CopilotDrawer.tsx                        # [MODIFY] 删除 3 处 template 末尾冗余规则
apps/server/src/http/
  copilot.ts                               # [MODIFY] L424 system rule 末尾追加内置说明
apps/web/src/i18n/
  zh.json                                  # [MODIFY] readingRefs.viewSource 新增
  en.json                                  # [MODIFY] readingRefs.viewSource 新增
```

## Implementation Notes

- **projectName 缓存**：useEffect 内 `Map<projectId, projectName>` 缓存，避免重复请求；canvasRefs 变化时只对未命中的 projectId 增量 fetch
- **getResourcePrimaryUrl 健壮性**：label 大小写不敏感匹配 "amazon"
- **i18n key 命名**：跟随现有 `library.copilot.readingRefs.*` 命名空间
- **blast radius**：仅 5 个文件，所有改动是显示/规则文本/类型扩展，不动 schema 与接口
- **性能**：资源卡按钮不引入新数据获取（仅读 sources[]）；画布卡额外只 N 次 projects API（N = 不同 projectId 数，通常 1-4 个）
- **不新增 LibraryResource.primaryUrl 字段**：避免 schema 变更和 14 个 resource.json 同步维护

## Agent Extensions

无新增扩展。改动均在已有 TypeScript / React / i18next 栈内完成，未触发任何 Skill / MCP / SubAgent。
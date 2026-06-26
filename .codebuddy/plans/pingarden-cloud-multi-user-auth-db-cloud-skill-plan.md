# PinGarden Cloud 多用户账号、数据库存储与云端 Skill 改造计划

## 背景

当前项目已连接 CloudBase：

- EnvId: `pingarden-d5gyvjbtdc321cc10`
- Alias: `pingarden`
- Region: `ap-shanghai`
- CloudRun service: `pingarden`
- 当前云端 Copilot: `PINGARDEN_AI_PROVIDER=kimi-http`，BYOK，不保存用户 Kimi API Key

现状限制：

1. 云端仍使用 `FileSystemStorage` + `DATA_DIR=/tmp/pingarden-data`，只适合预览，不适合持久化和多用户。
2. 当前身份是 `localStorage` 自填昵称 + `X-Display-Name`，没有真实登录、账号、权限边界。
3. 当前 Skill Pack 面向本地桌面/CLI，云端下载后无法直接操作 Cloud 项目。

## 产品目标

把 PinGarden 从“单机/预览云服务”升级为“云端多用户项目管理”：

- 用户可登录。
- 每个账号拥有自己的项目、画布、故事、快照和 Copilot 记忆。
- 案例库继续作为只读公共资源。
- 云端不再分发本地 CLI Skill 作为主路径，改为 Cloud Connector / MCP 方向。

## 总体方案

```text
Browser
  -> CloudBase Web Auth / WeChat Login
  -> PinGarden CloudRun API
      -> auth middleware
      -> currentUser
      -> FederatedStorage
          -> DatabaseStorage(user data)
          -> BundleStorage(read-only library)
      -> Copilot BYOK(request-scoped Kimi key)

AI Agent
  -> PinGarden Cloud Connector / MCP
  -> scoped access token
  -> CloudRun API
  -> user's projects only
```

## 阶段 0：云端 Copilot 504 超时治理

现象：

- 云端 Copilot 显示 `✓ Kimi API`，说明 provider health 正常。
- 用户点击“问资料”后，前端收到 HTML 错误页：`504 Gateway Time-out` / `nginx/1.17.8`。
- 错误发生在 CloudRun 网关层，不是前端解析错误。

初步判断：

- `/copilot/chat` 的 Kimi HTTP BYOK 流式请求耗时超过 CloudRun / nginx 网关允许的首包或整体等待时间。
- 也可能是服务端等待 Kimi 上游首个 token 期间没有及时写出 SSE headers / heartbeat，导致网关认为后端超时。
- 当前前端把 HTML 504 错误页直接展示到对话区，需要做错误清洗。

优先改动点：

- `apps/server/src/http/copilot.ts`
  - SSE 建连后立即写出 headers。
  - 在等待 Kimi 上游首个 token 前先发送轻量 heartbeat / progress frame，避免网关空等。
  - 对上游超时设置显式 timeout，并返回结构化 SSE error。
- `apps/server/src/llm/kimiHttpProvider.ts`
  - 检查 fetch streaming 是否真正逐块转发。
  - 增加上游超时、错误脱敏和可观测日志。
  - 避免一次性等待完整响应再写给客户端。
- `apps/web/src/api/copilot.ts`
  - 如果 HTTP status 非 2xx 且 body 是 HTML，转换成短错误文案，不把整段 HTML 注入聊天区。
- `apps/web/src/components/CopilotDrawer.tsx`
  - 展示“云端 AI 请求超时，请重试或缩小资料范围”。
  - 可选：提供“继续生成 / 重试”入口。

可选增强：

- 对“问资料”场景压缩上下文，降低首 token 延迟。
- 将长任务拆成异步 job：先返回 jobId，前端轮询/订阅结果。
- 针对 CloudRun 调整服务超时、最小实例和资源配置。

验收：

- 云端点击“问资料”不会再直接显示 HTML `504` 页面。
- 即使 Kimi 上游慢，也能在 UI 中得到可读错误。
- 正常情况下 `/copilot/chat` 能持续收到 SSE `delta` 或 heartbeat，不被网关提前断开。

## 阶段 0.5：云端发布测试门禁

目标：上线前自动发现“health 正常但 Copilot 不通”“前端资源未更新”“SSE 被网关吞掉/超时”等问题。

已补充：

- 测试方案文档：`docs/CLOUD_RELEASE_TEST_PLAN.md`
- 可执行 smoke 脚本：`scripts/cloud-smoke-test.mjs`
- 根脚本：`pnpm smoke:cloud`

发布前必跑：

```bash
pnpm typecheck
pnpm test
pnpm --filter @pingarden/web build
pnpm --filter @pingarden/server build
pnpm smoke:cloud -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com
```

默认 smoke 覆盖：

- `/health`
- `/copilot/health`
- 首页 HTML
- 首页 JS/CSS 静态资源
- `/copilot/chat` 无效 Key SSE 链路
- 确认错误响应不泄漏 API Key
- 确认不返回 nginx HTML `504`

真实 Kimi 可用性可选：

```bash
PINGARDEN_SMOKE_KIMI_API_KEY=sk-xxx pnpm smoke:cloud -- --real-kimi
```

验收：

- smoke test 失败时禁止宣布上线完成。
- UI 改动还需要人工或后续 Playwright 验证，例如 `+ 图片` 按钮是否可见。

## 阶段 1：云端 Skill 入口降级

目标：避免云端用户下载一个只能操作本地 CLI 的 Skill Pack。

改动点：

- `apps/web/src/components/SkillPackPane.tsx`
  - 检测 cloud mode。
  - 云端显示“桌面版 Skill Pack”说明，而不是默认引导下载。
  - 增加 Cloud Connector coming soon 卡片。
- `apps/server/src/http/skillPack.ts`
  - 保留接口给桌面版/本地版。
  - 可在 health/config 中暴露 `skillPackMode: desktop-only | cloud-connector`。
- i18n：补充中英文文案。

验收：

- CloudRun 页面不再让用户误以为下载 Skill 后可操作云端项目。
- 桌面版 Skill 下载不受影响。

## 阶段 2：账号体系与微信登录

建议：第一阶段以微信登录为主，但账号模型支持多 provider，避免锁死。

优先选型：

- Web 云端版：CloudBase Auth Web SDK + 微信登录能力。
- 若微信开放平台扫码登录配置成本高，可先启用 CloudBase Auth 支持的邮箱/短信登录作为 fallback。

新增/调整：

- `apps/web/src/identity/useIdentity.ts`
  - 从本地昵称迁移为 CloudBase Auth session。
  - 保留 display name / avatar 展示。
- `apps/server/src/http/identity.ts`
  - 从 `X-Display-Name` 升级为解析 CloudBase session/JWT。
  - `RequestIdentity` 扩展为：
    - `userId`
    - `displayName`
    - `avatarUrl?`
    - `provider`
- 新增 auth routes：
  - `GET /me`
  - `POST /auth/logout`（如前端 SDK 不足以覆盖）

账号模型：

```sql
users
- id
- display_name
- avatar_url
- primary_provider
- created_at
- updated_at
- _openid

user_identities
- id
- user_id
- provider              -- wechat | email | phone | github | token
- provider_user_id      -- openid / unionid / email / phone
- union_id
- raw_profile_json
- created_at
- _openid
```

验收：

- 未登录访问项目 API 返回 401。
- 登录后 `/me` 返回当前用户。
- 页面 header 显示真实用户信息。

## 阶段 3：数据库存储替换

目标：保留现有 `CanvasStorage` seam，不改业务层大结构。

新增：

- `apps/server/src/storage/DatabaseStorage.ts`
  - 实现 `CanvasStorage`。
  - 所有 user data 按 `owner_user_id` 隔离。
- `apps/server/src/storage/createStorage.ts` 或等价工厂
  - `PINGARDEN_STORAGE=filesystem | cloudbase-sql`
  - 本地默认 `filesystem`
  - CloudRun 默认 `cloudbase-sql`

推荐表：

```sql
projects
- id
- owner_user_id
- name
- description
- source
- created_by
- updated_by
- created_at
- updated_at
- _openid

project_members
- project_id
- user_id
- role                  -- owner | editor | viewer
- created_at
- _openid

canvases
- id
- project_id
- owner_user_id
- def_id
- title
- lang
- meta_json
- ydoc_state            -- BLOB / BYTEA
- created_by
- updated_by
- created_at
- updated_at
- _openid

stories
- id
- project_id
- owner_user_id
- title
- content_json
- created_by
- updated_by
- created_at
- updated_at
- _openid

snapshots
- id
- canvas_id
- project_id
- owner_user_id
- kind
- name
- state_blob
- meta_json
- created_at
- _openid

copilot_profiles
- user_id
- profile_json
- updated_at
- _openid
```

说明：

- 第一版可以把 Yjs state 放数据库 BLOB。
- 如果后续画布状态变大，再迁移到 Cloud Storage，数据库只存 object key。
- CloudBase SQL 表按规范保留 `_openid`，同时业务权限用 `owner_user_id` / `project_members` 控制。

验收：

- CloudRun 重启后项目仍存在。
- A 用户看不到 B 用户项目。
- 只读案例库仍可浏览、fork 到自己的项目。

## 阶段 4：API 权限改造

核心原则：所有写操作必须绑定 currentUser。

改造点：

- 所有项目列表：只返回 `owner_user_id = currentUser.id` 或 `project_members` 可访问项目。
- 所有 get/update/delete：校验项目成员权限。
- `createdBy` / `updatedBy` 从 `displayName` 迁移为真实用户信息。
- `CopilotUserProfileStore` 从 `displayName` key 迁移为 `userId` key。

验收：

- 直接猜测 projectId/canvasId 不会越权。
- Copilot 记忆按账号隔离。

## 阶段 5：本地数据迁移

新增迁移命令：

```bash
pingarden cloud migrate --user <userId> --data-dir <local DATA_DIR>
```

迁移范围：

- projects
- canvases metadata
- live `.ydoc`
- snapshots
- stories
- copilot memory（可选）

验收：

- 本地项目可导入到云端指定账号。
- 迁移支持 dry-run。

## 阶段 6：Cloud Connector / MCP

短期：Cloud Skill Markdown

- 不依赖本地 CLI。
- 引导 Agent 调 Cloud API。
- 用户在 PinGarden Cloud 生成 token。

中期：Cloud Connector API

新增表：

```sql
agent_tokens
- id
- user_id
- token_hash
- label
- scopes              -- project:read, project:write, canvas:write, copilot:read
- expires_at
- created_at
- last_used_at
- revoked_at
- _openid
```

长期：MCP / Remote Connector

工具建议：

- `list_projects`
- `get_project_context`
- `create_project`
- `update_canvas_stickies`
- `create_story`
- `fork_case`
- `search_library`

验收：

- Agent 只可访问授权用户自己的项目。
- Token 可撤销、可限 scope、可过期。

## 阶段 7：部署配置

CloudRun 环境变量建议：

```text
PINGARDEN_AI_PROVIDER=kimi-http
PINGARDEN_STORAGE=cloudbase-sql
PINGARDEN_AUTH=cloudbase
CLOUDBASE_ENV_ID=pingarden-d5gyvjbtdc321cc10
```

`cloudbaserc.json` 继续保留：

```json
{
  "envId": "pingarden-d5gyvjbtdc321cc10",
  "cloudrun": { "name": "pingarden" }
}
```

## 推荐执行顺序

1. 先修复云端 Copilot `504 Gateway Time-out`：SSE 首包/heartbeat、上游 timeout、前端 HTML 错误清洗。
2. 建立云端发布测试门禁：`docs/CLOUD_RELEASE_TEST_PLAN.md` + `pnpm smoke:cloud`。
3. 云端 Skill 入口降级。
4. CloudBase Auth provider 检查与登录 UI。
5. `identity.ts` 升级为真实用户身份 seam。
6. 建 SQL schema。
7. 实现 `DatabaseStorage`。
8. 项目 API 加 owner/member 权限。
9. CloudRun 切 `PINGARDEN_STORAGE=cloudbase-sql`。
10. 做迁移脚本。
11. 做 Cloud Connector / MCP。

## 风险点

- 云端 Copilot 走外部 Kimi HTTP 上游，长上下文场景可能触发 CloudRun/nginx 504，需要先解决流式首包、heartbeat 和超时控制。
- 微信 Web 登录需要平台配置和域名回调审核，可能不是纯代码任务。
- 数据库 schema 一旦上线，要避免直接破坏已有 CloudRun 预览数据。
- Yjs state 存 BLOB 简单但后续可能需要对象存储拆分。
- Cloud Connector 一定要等账号、token、权限完成后再做，否则会产生越权风险。

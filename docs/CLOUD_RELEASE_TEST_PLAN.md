# PinGarden Cloud 上线前测试方案

## 目标

避免云端发布后出现以下问题才被用户发现：

- CloudRun 服务不可访问或仍指向旧版本。
- `/copilot/health` 显示正常，但 `/copilot/chat` 实际不可用。
- SSE 被网关缓冲或超时，前端长时间卡住。
- nginx / CloudRun HTML 错误页直接显示在 Copilot 聊天区。
- 前端资源没有更新，导致按钮或交互缺失，例如 `+ 图片` 上传按钮不可见。
- Kimi API Key 被误保存到服务端或错误日志里。

## 分层测试门禁

### 1. 本地代码门禁

发布前必须通过：

```bash
pnpm typecheck
pnpm test
pnpm --filter @pingarden/web build
pnpm --filter @pingarden/server build
```

覆盖点：

- TypeScript 类型完整。
- 现有 `vitest` 单元测试通过。
- Web 产物可构建。
- Server 产物可构建。

### 2. 本地 Cloud 模式 smoke test

目标：在部署前模拟 CloudRun 的 `kimi-http` 模式。

建议测试：

| 用例 | 检查点 | 预期 |
| --- | --- | --- |
| local-health | `GET /health` | `200` 且 `{ ok: true }` |
| local-copilot-health | `GET /copilot/health` | provider 为 `kimi-http`，`storesKeyServerSide=false` |
| local-chat-invalid-key | 用无效 key 调 `/copilot/chat` | 立即返回 SSE 帧，不返回 HTML，不 504 |
| local-assets | 访问 `/` 与主要静态资源 | HTML 和 JS/CSS 可访问 |

### 3. CloudRun 部署后 smoke test

目标：部署后立即验证线上服务真的可用。

命令：

```bash
pnpm smoke:cloud -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com
```

如果要验证真实 Kimi 可用性：

```bash
PINGARDEN_SMOKE_KIMI_API_KEY=sk-xxx pnpm smoke:cloud -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com --real-kimi
```

必测用例：

| 用例 | 检查点 | 预期 |
| --- | --- | --- |
| cloud-health | `GET /health` | `200` 且 `{ ok: true }` |
| cloud-copilot-health | `GET /copilot/health` | provider 为 `kimi-http`，`available=true` |
| cloud-home-html | `GET /` | 包含 `PinGarden`，不是 5xx HTML |
| cloud-static-assets | 首页引用的 JS/CSS | 全部 `200` |
| cloud-chat-sse-invalid-key | 无效 key 调 `/copilot/chat` | 返回 SSE，包含 `data:` 或 SSE comment；不得返回 nginx HTML 504 |
| cloud-no-key-leak | chat 错误响应 | 不包含原始 API Key |
| cloud-real-kimi-optional | 真实 key 调 `/copilot/test-key` 或短 chat | 在超时内返回 `ok` 或可读错误 |

### 4. UI 回归测试

发布后人工或浏览器自动化检查：

| 场景 | 预期 |
| --- | --- |
| 打开 Copilot | 状态栏显示 `✓ Kimi API` |
| 输入区 | 可见 `+ 图片` 按钮 |
| 上传图片 | 可选择文件，图片进入 attachment grid |
| 粘贴截图 | 图片进入 attachment grid |
| 拖拽截图 | 图片进入 attachment grid |
| 超过 9 张 | 显示数量限制错误 |
| 无 key 发送 | 发送按钮禁用或提示配置 Key |
| 上游超时 | 显示可读错误，不显示 HTML |

### 5. Kimi / Copilot 专项测试

| 场景 | 输入 | 预期 |
| --- | --- | --- |
| 策略库问答 | “我想了解蓝海战略，请给学习顺序” | 有回答或明确可读错误，不能白屏/504 |
| 长资料问答 | “问资料”携带策略库上下文 | 不出现 HTML 504；必要时提示缩小资料范围 |
| 图片建项目 | 上传 1 张小图 + 创建项目 | 图片进入请求；若模型成功，返回 projectDraft；若失败，错误可读 |
| 错误 key | `sk-test` | 返回 invalid auth 错误，不泄漏 key |
| 超时 | 人为缩短 `PINGARDEN_KIMI_HTTP_TIMEOUT_MS` | 前端显示“云端 AI 请求超时” |

## 发布流程建议

1. 本地运行代码门禁。
2. 构建 CloudRun 部署上下文。
3. 部署 CloudRun。
4. 等待版本切换。
5. 运行 `pnpm smoke:cloud`。
6. 打开页面人工确认 Copilot 和 `+ 图片` 按钮。
7. Smoke test 失败时禁止继续宣布上线完成。

## 当前已知缺口

- 还没有浏览器级自动化 UI 测试；后续可加入 Playwright 覆盖 `+ 图片` 按钮、文件选择、Copilot 面板打开等交互。
- 真实 Kimi 测试依赖用户自己的 API Key，默认 smoke test 只能验证链路/SSE/错误处理，不能保证真实模型质量。
- CloudRun 版本切换是异步的，部署命令返回成功后仍需轮询 `queryCloudRun detail` 或重复 smoke test，直到线上资源更新。

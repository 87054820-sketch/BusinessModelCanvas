# CloudBase / CloudRun 发布经验沉淀

## 结论

发布链路应该同时沉淀为：

1. **脚本**：用于可重复的本地构建、产物核对、云端 smoke check。
2. **Runbook**：记录 CloudBase CLI 的交互行为、发布中状态、失败判断和人工接管步骤。

原因：CloudBase `cloudrun deploy` 目前仍会出现交互式灰度选择，自动化脚本只能覆盖“检查”和“标准命令”，不能完全替代控制台/CLI 的发布确认。

## 标准发布前检查

```bash
pnpm typecheck
pnpm test
pnpm --filter @pingarden/web build
pnpm --filter @pingarden/server build
pnpm build:skill-pack
pnpm audit:learning
pnpm audit:canvas-quality -- --fail-under=90
pnpm audit:canvas-sources -- --all
```

检查本地 skill zip：

```bash
ls -lh apps/cli/build/skill/pingarden-skill-*.zip
unzip -l apps/cli/build/skill/pingarden-skill-*.zip | grep -E 'resource-reading|resource-quality'
```

## CloudBase 发布命令

```bash
cloudbase login
cloudbase cloudrun list --serviceName pingarden --json
cloudbase cloudrun deploy --serviceName pingarden --source . --port 3000 --force
```

当 CLI 提示“是否启用灰度部署”时：

- 选择 **否**：发布成功后自动切流到新版本。
- 选择 **是**：进入灰度，需要后续手动 `promote` 或 `rollback`。

灰度管理：

```bash
cloudbase cloudrun traffic promote --serviceName pingarden --json
cloudbase cloudrun traffic rollback --serviceName pingarden --json
cloudbase cloudrun traffic --serviceName pingarden --stable 50 --canary 50 --json
```

## 部署完成判断

CloudBase `cloudrun deploy` 返回“提交完成”不等于所有实例已经立刻切换，但它已经把一次部署请求交给 CloudBase。发布时按下面顺序判断，不要因为短时间内 smoke / release check 仍读到旧内容就反复提交：

1. 运行 `cloudbase cloudrun list --serviceName pingarden --json`。
2. 只要 `UpdateTime` 已经从部署前时间变成新的时间戳，就视为“本次部署已提交并被 CloudRun 接收”。
3. 到这一步先停止重复 deploy，等待 CloudRun 自己完成构建、实例替换和流量切换。
4. 后续 smoke / release check 如果短时间仍看到旧 zip、旧静态资源或旧接口，先等待 1-3 分钟后复查；只有 `UpdateTime` 没变、服务状态异常、或控制台显示构建失败时，才重新提交部署。

2026-07-02 的一次发布中，`UpdateTime` 已从 `2026-07-01 20:27:15` 变为 `2026-07-02 16:56:10`，随后再次变为 `2026-07-02 17:02:03`。后一种情况说明第二次提交已经被 CloudRun 接收；此后不应继续重复提交，应该交给人工或控制台检查异步切换状态。

## 发布后验证

```bash
curl -s https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/health
curl -s https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/copilot/skill-pack/info
curl -s 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/copilot/library-context?lang=zh&q=非客户'
curl -s 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/copilot/resource-context/blue-ocean-strategy?lang=zh&q=非客户'
pnpm smoke:cloud -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com
pnpm check:cloud-release -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com
```

## 常见情况与判断

| 情况 | 表现 | 判断 | 处理 |
|---|---|---|---|
| CLI 卡在灰度选择 | 输出“是否启用灰度部署？”后停住 | 不是构建慢，是交互等待 | 在真实终端选择；或改用控制台发布 |
| 命令被 IDE 标记 skipped | `Execution skipped: may take a long time` | IDE 阻止长任务继续运行 | 用本地终端执行部署命令 |
| `UpdateTime` 已变但内容短时未更新 | `/health` OK，但新路由 404 / skill zip size 旧 | CloudRun 可能还在异步构建、替换实例或流量切换 | 不要立即重复 deploy；等待 1-3 分钟后复查 release check / smoke |
| `UpdateTime` 未变且内容未更新 | `/health` OK，但新路由 404 / skill zip size 旧 | 部署提交可能未成功，或 CloudBase 未接收新版本 | 重新部署；必要时查控制台部署记录 |
| skill-pack 未进入镜像 | `/copilot/skill-pack/info` 仍是旧 filename / sizeBytes | source 上传没有包含 `apps/cli/build/skill`，或本地没先跑 `pnpm build:skill-pack` | 先跑 `pnpm build:skill-pack`；确认 `.dockerignore` 显式包含 `!apps/cli/build/`、`!apps/cli/build/skill/`、`!apps/cli/build/skill/**` |
| skill-pack 版本名相同但大小不同 | filename 一样，sizeBytes 不同 | 内容 hash/版本策略未区分模板外改动，可能造成缓存认知混淆 | 发布后用 sizeBytes 和 zip 内容核对，不只看版本名 |
| 新 API 404 | 如 `/copilot/resource-context/...` 返回 Not Found | 云端仍是旧服务版本 | 等待发布完成或重新部署 |
| library-context 没有章节摘要 | Resources 只有书名和简介 | 云端未包含 Autopilot 资源上下文升级 | 重新部署服务端代码 |
| 灰度发布中 | 部分请求新、部分请求旧 | 流量未完全切换 | `traffic promote` 完成灰度，或 `rollback` 回滚 |
| smoke chat 返回 `401 AUTH_REQUIRED` | `/copilot/chat` 不是 SSE，而是未登录错误 | smoke 脚本没有按当前 auth 机制创建本机 session | 先调用 `/auth/local/start`，再用 `Authorization: Bearer <token>` 请求 chat；`scripts/cloud-smoke-test.mjs` 已按此规则实现 |
| `check:cloud-release` 把 `--` 当 URL | 报 `Failed to parse URL from --/health` | pnpm 会把 `--` 传给脚本，脚本没有跳过分隔符 | 使用 `pnpm check:cloud-release -- --url <url>`；脚本已兼容 `--` 和 `--url` |
| smoke 504 / SSE 超时 | `/copilot/chat` 返回网关超时或无 SSE | 模型响应慢或云端超时配置不足 | 保留 `/health` 和静态检查；单独查 Copilot provider / timeout |

## 2026-07-02 发布观察

- 发布前门禁通过：`pnpm typecheck`、`pnpm test`、web build、server build、`pnpm build:skill-pack`、learning audit、canvas quality audit、canvas sources audit。
- `scripts/cloud-smoke-test.mjs` 需要按当前登录机制先创建 local session，否则 `/copilot/chat` 会被 `AUTH_REQUIRED` 正确拦截。
- `.dockerignore` 必须显式重新包含 `apps/cli/build/` 父目录，否则 CloudBase source 上传可能漏掉 `apps/cli/build/skill` 下的新 skill zip。
- `cloudbase cloudrun list --serviceName pingarden --json` 的 `UpdateTime` 变更后，本轮部署应停止重复提交，由人工或后续 smoke/release check 观察异步切换结果。

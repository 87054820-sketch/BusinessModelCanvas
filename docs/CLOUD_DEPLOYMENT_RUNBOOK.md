# CloudBase / CloudRun 发布经验沉淀

## 结论

发布链路应该同时沉淀为：

1. **脚本**：用于可重复的本地构建、产物核对、云端 smoke check。
2. **Runbook**：记录 CloudBase CLI 的交互行为、发布中状态、失败判断和人工接管步骤。

原因：CloudBase `cloudrun deploy` 目前仍会出现交互式灰度选择，自动化脚本只能覆盖“检查”和“标准命令”，不能完全替代控制台/CLI 的发布确认。

## 标准发布前检查

```bash
pnpm typecheck
pnpm --filter @pingarden/web build
pnpm build:skill-pack
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

## 发布后验证

```bash
curl -s https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/health
curl -s https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/copilot/skill-pack/info
curl -s 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/copilot/library-context?lang=zh&q=非客户'
curl -s 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/copilot/resource-context/blue-ocean-strategy?lang=zh&q=非客户'
pnpm smoke:cloud -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com
```

## 常见情况与判断

| 情况 | 表现 | 判断 | 处理 |
|---|---|---|---|
| CLI 卡在灰度选择 | 输出“是否启用灰度部署？”后停住 | 不是构建慢，是交互等待 | 在真实终端选择；或改用控制台发布 |
| 命令被 IDE 标记 skipped | `Execution skipped: may take a long time` | IDE 阻止长任务继续运行 | 用本地终端执行部署命令 |
| 服务状态 normal 但内容未更新 | `/health` OK，但新路由 404 / skill zip size 旧 | 发布未完成、旧版本仍在跑、或镜像未包含新产物 | 查 `cloudrun list` 更新时间；重新发布；验证 Dockerfile COPY |
| skill-pack 版本名相同但大小不同 | filename 一样，sizeBytes 不同 | 内容 hash/版本策略未区分模板外改动，可能造成缓存认知混淆 | 发布后用 sizeBytes 和 zip 内容核对，不只看版本名 |
| 新 API 404 | 如 `/copilot/resource-context/...` 返回 Not Found | 云端仍是旧服务版本 | 等待发布完成或重新部署 |
| library-context 没有章节摘要 | Resources 只有书名和简介 | 云端未包含 Autopilot 资源上下文升级 | 重新部署服务端代码 |
| 灰度发布中 | 部分请求新、部分请求旧 | 流量未完全切换 | `traffic promote` 完成灰度，或 `rollback` 回滚 |
| smoke 504 / SSE 超时 | `/copilot/chat` 返回网关超时或无 SSE | 模型响应慢或云端超时配置不足 | 保留 `/health` 和静态检查；单独查 Copilot provider / timeout |

## 本次观察

- 本地已具备新能力：`/copilot/resource-context/:slug` 可返回资源章节索引和相关章节摘录。
- 云端当前仍是旧能力：`/copilot/resource-context/...` 返回 `Not Found`，`library-context` 仍只有资源级摘要。
- 因此部署未成功切换到包含新代码的版本；下一步应在真实终端或控制台完成 CloudRun 发布，再跑发布后验证。

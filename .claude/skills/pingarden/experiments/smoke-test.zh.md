# Smoke Test (烟雾测试)

> 一个看起来真实的落地页,推广一个你*还没造出来*的产品或功能。测访问到注册的转化,在投入工程之前看真实需求是否存在。Validation 阶段最经典的第一个实验。

## Slug

`smoke-test` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## 速览

| | |
| --- | --- |
| **阶段** | 验证 (Validation) |
| **风险类别** | 需求性 (Desirability) |
| **证据强度** | 中 (medium) |
| **成本** | 中等 (medium) |
| **准备时间** | 天级 |
| **执行时间** | 天级 |
| **能力要求** | `landing-page-copy` · `ad-targeting` · `analytics-funnel` |
| **关联画布** | `value-proposition-canvas` · `business-model-canvas` · `ad-lib-value-proposition` |

# Smoke Test — AI Agent 速查

**什么时候推荐。** Discovery 完成。用户在投工程之前需要量化需求证据。决策 gate 是 "要不要做?"。

**证据强度。** 中。验证 *promise* + 目标流量转化。**还不验证** 会真付钱或留得住。要付费用 Pre-Sale;要留存用 Wizard of Oz / Concierge。

**样本。** 500-2000 目标访问,单页单 CTA。阈值跑之前定。

**准备 / 执行。** 天(页面 + 广告创意 + 埋点)/ 天(广告窗口)。

**能力。** `landing-page-copy`、`ad-targeting`、`analytics-funnel`。

**决策树。**

- Discovery 都没做? → 不推荐。先 Customer Interview / Survey。
- 长周期 B2B? → 不推荐。Letter of Intent。
- 方案需要解释超过 30 秒? → 改 Concierge / Wizard of Oz。
- 用户想验证真付费意愿? → Smoke Test 只是起点,后接 Pre-Sale。

**反模式。**

- 伪造结账流程默默吃卡 —— 烧信任。
- 无目标流量 = 噪音。
- 事后调阈值。
- 邮箱名单没有跟进 ≠ 已验证需求。

**跨画布。** 验证 `value-proposition-canvas`(价值主张能不能转化)、`ad-lib-value-proposition`(哪句一行 claim 起作用)、`business-model-canvas`(渠道这一块 —— 付费获客对这个 ICP 走得通吗?)。

## 出处

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Validation / 4-1 Smoke Test
- Eric Ries · The Lean Startup · Crown Business · 2011

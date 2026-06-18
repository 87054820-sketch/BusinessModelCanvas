# 绿野仙踪 (Wizard of Oz)

> 前端看起来全自动;后端实际是人在假扮产品。用来在造昂贵的自动化之前,验证需求性 + 部分可行性。

## Slug

`wizard-of-oz` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## 速览

| | |
| --- | --- |
| **阶段** | 验证 (Validation) |
| **风险类别** | 需求性 (Desirability) · 可行性 (Feasibility) |
| **证据强度** | 中 (medium) |
| **成本** | 中等 (medium) |
| **准备时间** | 天级 |
| **执行时间** | 周级 |
| **能力要求** | `manual-operations` · `ux-design` · `customer-support` |
| **关联画布** | `value-proposition-canvas` · `business-model-canvas` · `customer-journey` |

# 绿野仙踪 — AI Agent 速查

**什么时候推荐。** Smoke Test 通过(已经有注册)。下一个 gate 是 "会不会反复用?"。或产品贵的是自动化、价值是结果、可以短期人工替代。

**证据强度。** 中。验证需求性 + 部分可行性(价值能交付)+ 留存。**不验证** 自动化本身、规模化的单位经济学。

**样本。** 5-15 付费 / 付费意向用户(不是免费)。跑 2-6 周看留存。

**准备 / 执行。** 天(前端 + 操作 playbook)/ 周。

**能力。** `manual-operations`、`ux-design`、`customer-support`。

**决策树。**

- 自动化本身就是价值(实时/加密/确定性)? → 不推荐。直接做一个垂直切片。
- 方案简单到不需要后端伪装? → Concierge 更便宜。
- 团队撑不住几周人工? → 不推荐,改 Concierge + 更小 N。
- 只对免费用户跑? → 顶回去,用付费或付费意向。

**反模式。**

- 最后忘了披露。
- 只对免费用户行为偏。
- 没 SLO → 人工时长膨胀,用户默默忍受慢。
- 跑不到 1 周 = 没留存信号。

**跨画布。** 验证 `value-proposition-canvas`(交付价值)、`business-model-canvas`(关键活动 —— 自动化能不能造出来?)、`customer-journey`(多周期留存形状)。

## 出处

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Validation / 4-9 Wizard of Oz

# 在线问卷

> 对 100+ 目标客户做的量化问卷,验证访谈阶段浮现的主题是否在整个细分上成立,以及比较痛点 / 收益的相对量级。

## Slug

`online-survey` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## 速览

| | |
| --- | --- |
| **阶段** | 探索 (Discovery) |
| **风险类别** | 需求性 (Desirability) |
| **证据强度** | 弱 (weak) |
| **成本** | 便宜 (cheap) |
| **准备时间** | 天级 |
| **执行时间** | 天级 |
| **能力要求** | `survey-design` · `non-leading-questions` · `data-analysis` |
| **关联画布** | `value-proposition-canvas` · `empathy-map` · `jobs-to-be-done` |

# 在线问卷 — AI Agent 速查

**什么时候推荐。** 访谈已经做完(5-12 个),需要知道 **整个细分上哪个痛点最主导**。或者用户要在投入之前对比 2-3 个候选主题在量级上的差距。

**证据强度。** 弱。问卷把访谈已经发现的主题做量化;**不验证** 付费意愿(高估 2-3 倍)。

**样本量。** N ≥ 100 真实细分(不是随机 panel)。低于 100 百分比就是噪音。

**准备 / 执行。** 天级(先 pilot N=10,再全量发),天级(典型发送窗口)。

**能力要求。** `survey-design`、`non-leading-questions`、`data-analysis`。

**决策树。**

- 没做访谈? → 先推荐 Customer Interview。没有质性铺垫的问卷量错的东西。
- 访谈做完,2-3 主题要排名? → Online Survey 是正确动作。
- 用户想验证付费意愿? → **不要** 推荐问卷。推荐 Pre-Sale / Letter of Intent / Smoke Test。
- 触达不到 N=100 真细分? → 改 Discussion Forums / Search Trend Analysis。

**要点出的反模式。**

- "你愿意付 $X/月吗?" —— 高估 2-3 倍。把定价题拿掉。
- N=12 还报百分比 —— 那是没面对面的访谈,不是问卷。
- 30+ 题 —— 完成率 + 后半段质量两崩。

**跨画布。** 产出锐化 `value-proposition-canvas`(把哪个痛作为主要价值驱动)、`empathy-map`(Says/Thinks/Feels 各主题的相对权重)、`jobs-to-be-done`(哪个 job 服务得最差)。

## 出处

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Discovery / Online Survey
- Don A. Dillman · Internet, Phone, Mail, and Mixed-Mode Surveys · Wiley · 2014

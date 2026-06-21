---
canvas: evidence-scorecard
language: zh
source: packages/canvases/evidence-scorecard/
---

# 证据评分卡

## When to use

证据评分卡用于复盘一个探索项目或关键假设目前的证据状态。它把实验结果、证据强度、学习速度、风险下降和组合决策放在一张画布上，避免团队只汇报活动数量。

## Blocks

`zoneId` 是 API 的稳定标识符,`pingarden canvas write` payload 必须用它,不要翻译。

### `critical-assumption` — 关键假设

**Prompt** — 这张卡正在评估哪一个最关键、最脆弱的假设？

**Example** — 目标客户愿意为自动化报告支付月费

### `current-evidence` — 当前证据

**Prompt** — 目前有哪些真实证据？写实验结果、行为数据、客户原话，不写观点。

**Example** — 8 位受访者中 6 位描述了现有绕行方案

### `evidence-strength` — 证据强度

**Prompt** — 证据是弱、中、强？为什么足以或不足以支撑下一步？

**Example** — 弱：只有访谈意向，没有行为

### `learning-velocity` — 学习速度

**Prompt** — 团队多久获得一次可改变决策的新证据？最近学到了什么？

**Example** — 两周跑完一次实验

### `risk-reduction` — 风险下降

**Prompt** — 需求性、可行性、可营性风险分别下降了多少？还有什么没被验证？

**Example** — 需求性下降；可营性仍弱

### `portfolio-decision` — 组合决策

**Prompt** — 基于证据，下一步应该继续、转向、补实验、转入、加码还是终止？

**Example** — 继续：进入 Concierge 测试

### `next-experiment` — 下一轮实验

**Prompt** — 下一轮最便宜、最能改变决策的实验是什么？通过/失败标准是什么？

**Example** — 2 周内预售给 5 个目标客户；≥2 单付款才进入产品化

## Colour legend

- `0` — **证据**: 观察事实、实验结果、原话或使用数据。
- `1` — **学习**: 团队认知发生了什么变化。
- `2` — **决策**: 继续、转向、转入、投入或终止。
- `3` — **风险**: 剩余不确定性或弱证据。

## Pairs with

这张画布常和这些一起用,做完后引导用户接下去做:

- `experiment-canvas`
- `portfolio-map`
- `innovation-culture-map`

---
Source: `packages/canvases/evidence-scorecard/` — regenerate with `pingarden skill build`.

# 可点击原型

> 用 Figma / Sketch / 纸面做的有跳转的原型 —— 看起来像真的,但不是。用于在写代码之前对一段具体旅程做有指导或无指导的可用性测试。

## Slug

`clickable-prototype` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## 速览

| | |
| --- | --- |
| **阶段** | 探索 (Discovery) |
| **风险类别** | 需求性 (Desirability) · 可行性 (Feasibility) |
| **证据强度** | 中 (medium) |
| **成本** | 便宜 (cheap) |
| **准备时间** | 天级 |
| **执行时间** | 天级 |
| **能力要求** | `ux-design` · `prototyping-tools` · `usability-testing` |
| **关联画布** | `value-proposition-canvas` · `customer-journey` · `design-criteria-canvas` |

# 可点击原型 — AI Agent 速查

**什么时候推荐。** 某段具体旅程是最大的需求性 / 可行性风险。或团队有 UX 产能但还没投工程。或干系人需要比故事板更实但又在 build 之前。

**证据强度。** 中。验证某*段旅程能走通*;**不验证** 付费意愿、甚至自发使用。

**样本。** N=5-8(Krug 5 用户法则)。一段目标旅程,约 10-20 屏。

**准备 / 执行。** 天 / 天。

**能力。** `ux-design`、`prototyping-tools`、`usability-testing`。

**决策树。**

- 风险是 "他们到底想不想要"? → 不推荐。改 Customer Interview / Smoke Test。
- 交互新颖、跳转屏没法伪造? → Wizard of Oz / Concierge。
- 干系人想签整个产品? → 顶回去,只测一段。

**反模式。**

- Lorem-ipsum 掩盖理解问题。
- 引导用户毁掉测试。
- 完成 ≠ 自发使用。

**跨画布。** 产出锐化 `value-proposition-canvas`(哪些交互去除痛点)、`customer-journey`(步骤级摩擦)、`design-criteria-canvas`(旅程上的 must-have 与 nice-to-have)。

## 出处

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Discovery / Clickable Prototype
- Steve Krug · Rocket Surgery Made Easy · New Riders · 2010

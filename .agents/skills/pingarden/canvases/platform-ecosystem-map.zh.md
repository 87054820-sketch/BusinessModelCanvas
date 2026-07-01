---
canvas: platform-ecosystem-map
language: zh
source: packages/canvases/platform-ecosystem-map/
---

# 平台生态地图

## When to use

平台生态地图用于分析多边平台的参与方、核心交互、网络效应、治理、变现和风险。它适合 Uber、Airbnb、Visa、Google、NVIDIA CUDA 等平台型案例。

## Blocks

`zoneId` 是 API 的稳定标识符,`pingarden canvas write` payload 必须用它,不要翻译。

### `demand-side` — 需求侧

**Prompt** — 平台服务哪些需求侧参与方？他们为什么来？

**Example** — 乘客需要更快打到车

### `core-interaction` — 核心交互

**Prompt** — 平台最小可行的价值交换是什么？谁生产价值单元，谁消费？

**Example** — 房东发布房源，旅客搜索、预订、评价

### `supply-side` — 供给侧 / 互补方

**Prompt** — 供给侧或互补方是谁？他们为什么愿意参与？

**Example** — 司机用闲置时间接单

### `network-effects` — 网络效应

**Prompt** — 网络效应来自同边还是跨边？增长如何让下一位参与者更有价值？

**Example** — 更多司机缩短等待时间，吸引更多乘客

### `governance-trust` — 治理与信任

**Prompt** — 平台用什么规则、审核、声誉或激励机制保证质量和信任？

**Example** — 双向评价

### `monetization` — 变现机制

**Prompt** — 平台如何收费？收费是否会伤害核心交互或参与方激励？

**Example** — 交易抽佣

### `cold-start-risks` — 冷启动 / 风险

**Prompt** — 先激活哪一边？有哪些监管、欺诈、质量、补贴或反噬风险？

**Example** — 先补贴供给侧形成覆盖

## Colour legend

- `0` — **参与方**: 需求侧、供给侧、互补方或生态参与者。
- `1` — **交互**: 核心价值交换、匹配或交易流程。
- `2` — **治理**: 规则、信任机制、质量控制或激励。
- `3` — **风险**: 冷启动、欺诈、监管或变现风险。

## Pairs with

这张画布常和这些一起用,做完后引导用户接下去做:

- `business-model-canvas`
- `value-proposition-canvas`
- `customer-journey`
- `portfolio-map`

---
Source: `packages/canvases/platform-ecosystem-map/` — regenerate with `pingarden skill build`.

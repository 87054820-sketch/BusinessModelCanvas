# 商业模式组合管理

> 一套管理商业模式组合的战略框架：用业务组合地图同时管理正在开发的现有业务和正在探索的未来业务，并围绕风险、收益和更新动作做决策。

## Slug

`business-model-portfolio-management` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 商业模式组合管理 — AI 使用指南

当用户询问 portfolio、双元组织、持续重塑、核心业务与未来增长如何平衡，或一家成熟公司如何同时管理多个商业模式时，使用这个框架。

## 分析流程

1. 先定义分析颗粒度：商业模式、业务单元、产品线、创业项目或价值主张。不要混用层级。
2. 把对象分成 `Explore / 探索` 与 `Exploit / 开发`。
3. 对 Explore 对象，基于证据估计 `预期收益` 与 `创新风险`。
4. 对 Exploit 对象，估计 `收益` 与 `死亡 / 颠覆风险`。
5. 选择动作：
   - Explore：Ideate、Persevere、Pivot、Retire、Spinout、Transfer、Invest。
   - Exploit：Acquire、Merge、Partner、Invest、Improve、Divest、Dismantle。
6. 对重要 pin 展开成 BMC；对高风险 Explore pin 设计实验。

## 在 PinGarden 中使用

- 读取框架：`pingarden strategy-framework get business-model-portfolio-management --json`。
- 用 `portfolio-map` 作为主画布。
- 用 `business-model-canvas` 展开某个 pin。
- 用 `experiment-canvas` 为 Explore 对象降低不确定性。
- 用 `pingarden case read <slug> --json` 阅读示例案例。

## 反模式

- 不要因为一家公司“很创新”就打上这个框架标签。
- 不要把功能、产品线、整个业务混在同一张图里。
- 不要把组合地图当成静态 2x2。组合管理的重点是随时间移动。
- 不要用执行型 KPI 衡量 Explore 项目；探索项目需要证据、学习速度和风险下降指标。

## Related canvases

- `portfolio-map`
- `business-model-canvas`
- `experiment-canvas`

## Example cases shipped in this skill

- `ping-an-group` (primary)
- `nestle-portfolio` (primary)
- `bosch-accelerator` (primary)
- `alibaba-group` (primary)
- `procter-gamble-cd` (secondary)
- `nvidia-cuda` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get business-model-portfolio-management --json`.

## References

### 书籍

- **Osterwalder et al. 2020** · *Alexander Osterwalder, Yves Pigneur, Fred Etiemble & Alan Smith · The Invincible Company · Wiley* · 2020 · Portfolio Map, Explore/Exploit, Portfolio Actions, Innovation Metrics, Culture sections
  Explore/Exploit 组合区分、业务组合地图和组合动作体系的主要来源。

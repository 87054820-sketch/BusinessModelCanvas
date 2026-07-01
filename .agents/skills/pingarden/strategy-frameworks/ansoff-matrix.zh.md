# 安索夫矩阵

> 一套增长方向框架：把增长动作放在「现有/新产品 × 现有/新市场」两个轴上，得到 4 条路径（市场渗透、市场开发、产品开发、多元化），按风险递增排列。

## Slug

`ansoff-matrix` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 安索夫矩阵

## 何时选择本框架

- 单一业务面前有多条增长路径，团队必须先选一个方向。
- 团队在不知不觉中一个功能一个功能从渗透滑向多元化，需要把性质变化点名。
- 用户在比较增长动作的风险结构；安索夫按执行风险给 4 条路径排序。

## 使用这些画布

1. `business-model-canvas` — 把所选象限对应到 BMC 哪些块必须改。
2. `portfolio-map` — 多元化 = 新的 Explore pin；产品 / 市场开发 = 现有 pin 上的分支。
3. `design-criteria-canvas` — 编码约束（如「必须共享渠道」），让团队不滑出所选象限。

## 必问的问题

- 现在产品 × 市场位置在哪？
- 候选动作分别落在哪个象限？
- 哪些维持不变？哪些必须改？
- 每个候选最致命的假设是什么？
- 团队有没有同时跑多个象限的容量？

## 与其它框架的接力

- **安索夫 vs. BCG**：BCG 在组合层——它给**现有业务**分类。安索夫在业务层——它为单一业务选**增长方向**。单业务 → 跳过 BCG，直接用安索夫。多业务 → 先 BCG 在 SBU 间分配资源，再对每个业务用安索夫选方向。逐 BCG 象限对照：现金牛 → 安索夫渗透；明星 → 市场或产品开发；问题 → 安索夫是决策工具（渗透、差异化或砍掉）；瘦狗 → 原地收割或尝试多元化。
- 做时间分层时，把象限选择放进**三层增长**的位置。
- 多元化特别需要在放大前用**创新指标**验证。

## 红线

不要把小功能增加叫「多元化」。不要在同一时期把两个象限叠加在同一业务上，除非显式规划了容量。不要因为其它象限无聊就选多元化——说清新旧之间共享什么。

## Related canvases

- `ansoff-matrix`
- `business-model-canvas`
- `portfolio-map`
- `design-criteria-canvas`

## Example cases shipped in this skill

- `spotify` (primary)
- `stitch-fix` (primary)
- `nintendo-wii` (primary)
- `nestle-portfolio` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get ansoff-matrix --json`.

## References

### 书籍

- **Ansoff 1965** · *H. Igor Ansoff · Corporate Strategy · McGraw-Hill* · 1965
  对增长矩阵及其在公司战略中位置的书籍版扩展。

### 文章

- **Ansoff 1957** · *[H. Igor Ansoff · Strategies for Diversification · Harvard Business Review](https://hbr.org/1957/09/strategies-for-diversification)* · 1957
  首次提出产品-市场增长矩阵及四个增长向量的 HBR 原文。

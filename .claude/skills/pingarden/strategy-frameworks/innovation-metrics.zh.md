# 创新指标

> 一套衡量探索型创新的框架：用证据强度、学习速度、风险下降和组合决策，而不是过早套用成熟业务 KPI。

## Slug

`innovation-metrics` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 创新指标

## 什么时候用

当用户想判断一个探索项目是否值得继续投入、转向、转入或停止时使用。尤其适合搭配 Portfolio Map、Experiment Canvas 和 Evidence Scorecard。

## 操作顺序

1. 明确项目所处阶段：Explore 还是 Exploit。
2. 写出 3–5 条关键假设。
3. 为每条假设记录实验、证据强度和最新学习。
4. 判断风险是否下降，而不是只看活动数量。
5. 给出组合动作：继续、转向、补实验、转入、终止。

## 反模式

不要用成熟业务 KPI 过早评价探索项目；不要把访谈次数、会议数、原型数当作最终成果。

## Related canvases

- `evidence-scorecard`
- `experiment-canvas`
- `portfolio-map`
- `innovation-culture-map`

## Example cases shipped in this skill

- `bosch-accelerator` (primary)
- `ping-an-group` (primary)
- `procter-gamble-cd` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get innovation-metrics --json`.

## References

### 书籍

- **Osterwalder et al. 2020** · *The Invincible Company · Wiley* · 2020 · Innovation Metrics and Portfolio sections
  用证据、风险和组合移动衡量探索组合，而不是过早要求收入确定性的主要来源。

- **Bland & Osterwalder 2019** · *Testing Business Ideas · Wiley* · 2019
  实验设计来源，支撑证据强度、通过/失败标准和可证伪学习。

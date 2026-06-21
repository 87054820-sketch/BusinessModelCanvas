# 情景规划

> 一套把环境信号和关键不确定性转成多个可信未来，并检验哪些商业模式动作在多个情景下都稳健的框架。

## Slug

`scenario-planning` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 情景规划

## 什么时候用

当用户面对高不确定性环境、想从环境扫描进入多未来战略选择时使用。

## 操作顺序

1. 从 Business Model Environment 收集外部信号。
2. 区分趋势、驱动力和关键不确定性。
3. 选择两个最会改变战略选择的不确定性。
4. 用 Scenario Matrix 生成四个可信情景。
5. 对每个情景检查 BMC、Portfolio Map 和实验重点。
6. 找出跨情景稳健动作和需要监测的早期信号。

## 反模式

不要做乐观/中性/悲观三档预测；不要把情景写成科幻故事而不落到战略动作。

## Related canvases

- `scenario-matrix`
- `business-model-environment`
- `business-model-canvas`
- `portfolio-map`
- `design-criteria-canvas`

## Example cases shipped in this skill

- `nintendo-wii` (primary)
- `transsion-africa` (primary)
- `tata-nano` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get scenario-planning --json`.

## References

### 书籍

- **Schwartz 1991** · *Peter Schwartz · The Art of the Long View · Currency Doubleday* · 1991
  情景思考、驱动力、关键不确定性和跨未来稳健战略的经典来源。

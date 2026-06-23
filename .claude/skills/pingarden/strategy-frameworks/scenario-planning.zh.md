# 情景规划

> 一套把环境信号和关键不确定性转成多个可信未来，并检验哪些商业模式动作在多个情景下都稳健的框架。

## Slug

`scenario-planning` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 情景规划

## 什么时候用

当用户面对高不确定性环境、想从环境扫描进入多未来战略选择时使用。

## 操作顺序

1. 定义焦点议题和时间范围。
2. 用 `business-model-environment` 收集外部信号。
3. 区分趋势、驱动力和关键不确定性。
4. 选择最会改变战略选择的不确定性。
5. 用 `scenario-matrix` 构造可信且内部一致的情景。
6. 用每个情景对 BMC、组合押注和设计准则做风洞测试。
7. 找出稳健动作、条件动作、保留选项和早期预警信号。
8. 如果需要组织采纳，切换到 `performance-based-scenario-planning` 来管理准备、实施和评估。

## 画布映射

- BME 输入信号。
- Scenario Matrix 构造未来。
- BMC 和 Portfolio Map 测试战略选项。
- Design Criteria Canvas 固化稳健规则。

## 反模式

不要做乐观/中性/悲观三档预测；不要把情景写成科幻故事而不落到战略动作；如果要指导真实决策，不要跳过早期信号和项目评估。

## Related canvases

- `scenario-matrix`
- `business-model-environment`
- `business-model-canvas`
- `portfolio-map`
- `design-criteria-canvas`

## Example cases shipped in this skill

- `patagonia` (primary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get scenario-planning --json`.

## References

### 书籍

- **Schwartz 1991** · *Peter Schwartz · The Art of the Long View · Currency Doubleday* · 1991
  情景思考、驱动力、关键不确定性和跨未来稳健战略的经典来源。

- **Chermack 2011** · *Thomas J. Chermack · Scenario Planning in Organizations · Berrett-Koehler Publishers* · 2011 · Performance-Based Scenario System; Project Preparation; Scenario Exploration; Scenario Development; Scenario Implementation; Project Assessment
  补充情景规划的组织项目、实施、评估和人的感知层。

### 文章

- **Schoemaker 1995** · *Paul J. H. Schoemaker · Scenario Planning: A Tool for Strategic Thinking · Sloan Management Review* · 1995
  把情景规划定位为不确定性下战略思考工具的经典管理文章。

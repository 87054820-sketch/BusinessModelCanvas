# 商业模式环境扫描

> 一套用外部环境压力测试商业模式的战略分析框架：系统扫描关键趋势、市场力量、行业力量和宏观经济力量。

## Slug

`business-model-environment-scan` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 商业模式环境扫描 — AI 使用指南

当用户需要理解商业模式受到的外部压力时使用这个框架：趋势、市场变化、行业结构、监管、宏观条件、基础设施或利益相关者压力。

## 填写顺序

1. 从一张具体的 `business-model-canvas` 开始，不要抽象地扫描环境。
2. 找出 3–6 个外部信号，放入 `business-model-environment` 的关键趋势、市场力量、行业力量和宏观经济力量。
3. 为每个信号标出受影响的 BMC 模块。
4. 判断它是威胁、机会、约束，还是不确定性。
5. 把压力翻译回 BMC：价值主张、客户细分、渠道、伙伴、收入、成本或关键活动需要如何调整。

## 质量标准

- 每个环境 sticky 都必须是观察到的信号，或明确标注的假设。
- 每个信号都必须连到至少一个 BMC 模块。
- 行业分析不能挤掉另外三类外部力量。
- 输出应该给出战略回应，而不是只总结外部世界。

## 反模式

- 不要把它归类为商业模式类型。
- 不要写没有 BMC 影响的泛泛趋势标题。
- 不要把本质不同的客户细分放在同一张环境图里。
- 不要把环境图当作静态文件；BMC 或外部环境变化时要重新打开复核。

## Related canvases

- `business-model-environment`
- `business-model-canvas`

## Example cases shipped in this skill

- `patagonia` (primary)
- `alibaba-group` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get business-model-environment-scan --json`.

## References

### 书籍

- **BMG 2010** · *Alexander Osterwalder & Yves Pigneur · Business Model Generation · Wiley* · 2010 · Business Model Environment section, pp. 200-211
  商业模式环境四类力量及其与 BMC 压力点联动的经典来源。

- **Porter 1980** · *Michael E. Porter · Competitive Strategy · Free Press* · 1980
  可用于行业力量象限：竞争者、新进入者、替代品、供应商和买方，并在本框架中扩展到利益相关者。

### 网页

- **Strategyzer Library** · *Strategyzer Library · How to scan through your environment's disruptive threats and opportunities*
  说明如何把环境信号当作威胁、机会和约束处理，而不是泛泛记录趋势。

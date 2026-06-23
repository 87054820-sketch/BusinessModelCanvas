# 波特价值链分析

> 波特提出的内部活动分析框架，把公司拆成 9 类活动：5 类主要活动（进货物流、生产运营、出货物流、营销与销售、售后服务）+ 4 类支持活动（企业基础设施、人力资源管理、技术开发、采购），让团队看清利润和差异化到底在哪一环产生。

## Slug

`porters-value-chain` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 波特价值链分析

## 何时选择本框架

- 团队有了战略意图（拼成本 / 拼质量 / 拼服务），但还说不清哪些活动必须改。
- 能力清单看着没问题，利润却一直被侵蚀——漏点通常在两类活动的**联动**处。
- 用户准备写 BMC 的 关键活动 / 关键资源 / 关键伙伴，需要先有高分辨率视图。

## 使用这些画布

1. `business-model-canvas` — 把每个活动翻译成 KA / KR / KP 的 sticky；差异化活动也喂回价值主张。
2. `design-criteria-canvas` — 编码活动级规则（如「毛利不低于 30%」「服务必须 4 小时内响应」）。

## 必问的问题

- 分析单元是什么（单一业务，不是整个集团）？
- 9 类活动里分别有哪些具体子活动？
- 每个活动：成本水平、差异化贡献、能力强度？
- 哪些联动彼此加强或彼此打架？
- 承重的 2–3 个差异化活动是哪几个？

## 与其它框架的接力

- 想看组织整体自洽性，接 **麦肯锡 7S** —— 软的一面支撑活动结构吗？
- 多边 / 平台业务，配合 **平台战略** —— 网络效应通常压过单点活动优势。
- 想接上外部压力，接在 **五力** 或 **BMEScan** 之后——价值链是同一诊断的内部一半。

## 红线

不要把 9 个格子画成通用流程图。不要单独看每个活动——联动才是真正的差异化所在。不要跳过支持活动；它们通常是最难复制的护城河。不要停在图上——翻译成 BMC KA/KR/KP 的改动。

## Related canvases

- `porters-value-chain`
- `business-model-canvas`
- `design-criteria-canvas`

## Example cases shipped in this skill

- `patagonia` (primary)
- `cainiao` (primary)
- `gillette` (secondary)
- `nestle-portfolio` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get porters-value-chain --json`.

## References

### 书籍

- **Porter 1985** · *Michael E. Porter · Competitive Advantage · Free Press* · 1985
  9 类活动价值链、主要 / 支持活动划分、活动之间的联动以及成本-差异化诊断逻辑的经典来源。

# 贝恩价值元素

> 贝恩提出的客户价值透镜，把感知价值拆成 30 个元素，分布在功能、情感、改变人生和社会影响四个层级。用它在 VPC、JTBD、共情图和客户旅程上具体指出某个价值主张到底站在哪几层价值上。

## Slug

`bain-elements-of-value` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# 贝恩价值元素

## 定位

这是战略框架库中的 `customer-value-lens` 框架，分析对象是客户感知价值的层级。把它接在 `value-proposition-canvas`、`jobs-to-be-done`、`empathy-map` 和 `customer-journey` 后面，用 30 个价值元素具体指出哪几个元素真正在承载价值。

## 何时选择

- 价值主张很空泛，反复使用“方便”“高端”“简单”“愉悦”等词。
- 用户已经有 VPC/JTBD/旅程内容，但 `gains`、`gain-creators` 或体验收益缺少清晰分类。
- 用户想解释某个案例为什么被客户感知为“有价值”，而不只是描述功能。

## 推荐链路

1. 先用 `jobs-to-be-done` 写清情境、动机、功能结果、情感/社交任务。
2. 再用 `value-proposition-canvas` 承接 `jobs`、`pains`、`gains`，设计 `pain-relievers` 和 `gain-creators`。
3. 然后用 Bain 给关键收益打标签：`[功能-节省时间]`、`[情感-降低焦虑]`、`[社会-身份认同]`、`[高阶-自我实现]`。
4. 用 `customer-journey` 标出这些价值在哪个触点出现、增强或断裂。
5. 如果价值元素还没有客户证据，转入 `experiment-canvas` 或客户访谈验证。

## 使用画布

1. `value-proposition-canvas` —— 主工作面，把选中的价值元素映射到 `gains`、`gain-creators` 和 `pain-relievers`。
2. `jobs-to-be-done` —— 解释价值背后的情境和任务，尤其是情感/社交任务。
3. `empathy-map` —— 从客户视角验证情感和社会价值是否来自证据，而不是团队投射。
4. `customer-journey` —— 定位价值在哪些阶段出现、增强、断裂或被浪费。

## 关键问题

- 分析哪个客户细分和情境？
- 哪些功能价值已经被证明？
- 哪些情感、社会或高层级价值有证据？
- 哪几个元素应定义这个价值主张，而不是把 30 个元素全写上？
- 每个价值元素对应 VPC 的哪条 `gain`、`gain-creator` 或 `pain-reliever`？
- 它在客户旅程的哪个阶段被客户真正感知到？

## 红旗

不要声称 30 个元素全都有。不要把元素当营销文案。基础功能价值未成立前，不要急着添加高层级价值。不要单独输出一张 Bain checklist 后就结束，必须回连 VPC/JTBD/旅程。

## Related canvases

- `value-proposition-canvas`
- `jobs-to-be-done`
- `empathy-map`
- `customer-journey`

## Example cases shipped in this skill

- `nespresso` (primary)
- `drybar` (secondary)
- `stitch-fix` (secondary)
- `citizenm-hotels` (secondary)
- `novo-nordisk-novopen` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get bain-elements-of-value --json`.

## References

### 文章

- **Bain Elements of Value 2016** · *[Bain & Company · The Elements of Value](https://www.bain.com/insights/the-elements-of-value-hbr/)* · 2016
  介绍 30 个价值元素及四个层级的 Bain/HBR 主要文章。

### 网页

- **Bain interactive graphic** · *[Bain & Company · Elements of Value interactive graphic](https://media.bain.com/elements-of-value/)*
  可公开查看的价值层级交互图，可用于映射到 VPC、JTBD、共情图和客户旅程。

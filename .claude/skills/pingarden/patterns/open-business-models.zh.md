# 开放式商业模式

> 公司通过系统性地与外部伙伴协作来创造与捕获价值。Chesbrough 区分两个结构上不同的子类型:由外而内(把外部创意引入企业的研发流程,典型如宝洁 Connect & Develop);由内而外(把企业内部闲置的知识产权外溢给外部使用,典型如葛兰素史克的专利池)。

## Slug

`open-business-models` — referenced by `CaseLibraryEntry.appliesPatterns[]` on cases that exemplify this pattern.

# 开放式商业模式 — AI 技能页

## TL;DR

一种**让价值跨越企业边界主动流动**的模式 —— 要么外部创意流**进**来
(由外而内),要么内部闲置 IP 流**出**去(由内而外)。依据 *(BMG 2010)*,
开放式有**两个结构上不同的子类型** —— 选对子类型就是关键。

## 两个子类型

### 由外而内(外部创意进入)
公司把研发 / 产品流程对外开放,系统性地获取外部创意、技术与 IP。
搭建网关:技术猎手、众包平台、许可引入合同。**姐妹模式**:
`multi-sided-platforms`(把外部 Solver 聚合起来的连接器平台**就是**
多边的)。范例:宝洁 Connect & Develop、GE 绿色创想、乐高 Ideas、
InnoCentive(作为连接器平台)。

### 由内而外(闲置 IP 输出)
公司通过授权、分拆、合资或专利池把内部闲置 IP 商业化 —— 从那些自己
不会商业化的资产中拿回价值。范例:葛兰素史克专利池(被忽视疾病)、
IBM 专利授权(每年约 10 亿美元)、特斯拉开放专利(2014,生态捕获变体)、
Xerox PARC 分拆(授权定价过低的反面教材)。

## 这个模式何时适用(信号)

- BMC 上有一个**关键业务**专门是开放式创新管理(寻源、授权、整合、
  IP 估值)
- 创新 Pipeline 中有一个或两个方向上 ≥ 25-30% 的内容跨越企业边界
- **重要合作**包含创新平台合作伙伴(由外而内)或被许可方 / 池成员
  (由内而外)
- **成本结构**用可变的外部成本换取一部分内部研发固定成本下降

## 怎么从 BMC 识别它

- **重要合作**:两个子类型共同的标志格子。由外而内 → 创新平台、大学
  技术转移办公室、寻源机构。由内而外 → 被许可方、池成员、分拆投资人。
- **核心资源**(由外而内):内部资源旁出现「外部寻源 IP / 合作伙伴
  网络」。
- **收入来源**(由内而外):核心收入旁出现「许可费 / 版税 / 分拆股权」流。
- **关键业务**:「开放式创新管理」作为一项真正的业务出现,而不是顺带提及。

## 决策树 —— 哪个子类型?

问:**价值跨越企业边界时朝哪个方向流动?**
- *外部创意、技术、IP 流**进**来,在内部使用* → 由外而内。
- *内部闲置 IP 流**出**去,在外部使用* → 由内而外。
- *两个方向都有显著体量* → 双向并行,同时打两个标签。绝大多数成熟的
  开放式创新公司(宝洁、葛兰素、IBM)实际上**两个方向都在跑**。

## 反模式

- ❌ 把任何合作或授权交易都叫做开放式。这一模式的成立条件是:开放式
  创新是**关键业务**,占创新 Pipeline 中可度量的份额(进出方向各
  25-30% 是典型阈值),而不是一段一段的合作关系。
- ❌ 没有整合能力的由外而内。外部创意进了公司却死在整合阶段(NIH
  综合症)。整合能力本身必须是关键业务,有预算权 —— 不能只是「我们
  会去评估一下」的承诺。
- ❌ 没有诚实「闲置盘点」的由内而外。授权决策被否决,理由是「这个
  资产**也许将来**自己能商业化」—— 哪怕它已经在战略路线图上躺了
  5 年没动过。没有这种诚实,「由内而外」流量就一直是零。
- ❌ 「由内而外」首批交易定价过低。没有授权基准时,首批交易倾向于
  一次性付费,没有版税也没有股权。Xerox PARC 把 Adobe / 3Com / 苹果
  GUI 的交易做成这个样子,是经典反面教材 —— Xerox 几乎没拿回价值。

## 与其他模式的关联

- **`multi-sided-platforms`** —— 把由外而内**作为服务**提供给众多
  Seeker 的连接器平台(InnoCentive、Topcoder、Kaggle)**就是**多边
  平台。`innocentive` 案例同时打两个标签,是有意为之。
- **`unbundling-business-models`** —— 开放式创新的压力经常推着一家
  整合型企业把研发与商业化解耦。大型药企转向「从生物科技公司许可引
  入」就是经典案例。
- 非开放式对照:`gillette` 是经典封闭式创新(全部内部完成,通过专利
  保卫 IP)。当锁定足够强(诱饵与钩子),没有开放式创新模型也能跑得通。

## 怎么基于它行动

当用户问到一家开放式商业模式公司:

1. `pingarden pattern get open-business-models` —— 读示例列表和子类
   型分解。
2. **先确定子类型**,再开始画 BMC。走上面的决策树。许多公司两个方向
   都在跑 —— 这种情况下要明说,并把 BMC 标签按双向标记。
3. 深入子类型代表案例的 BMC(`pingarden case get procter-gamble-cd`
   看由外而内;`pingarden case get glaxosmithkline-patent-pool` 看
   由内而外;`pingarden case get innocentive` 看由外而内的连接器平
   台变体)。
4. 注意:连接器平台案例(`innocentive`)通常同时打了
   `multi-sided-platforms` 标签 —— 两个模式在这个变体上结构上是重叠的。

## Sub-types

这个模式有 2 个结构上不同的子类型 —— 选对子类型是关键(走 `description.zh.md` 里的决策树)。

### 由外而内(外部创意进入企业)

公司把研发或产品流程对外开放,系统性地获取外部的创意、技术或知识产权 —— 通过技术猎手、合作伙伴、众包平台或许可引入。搜索成本下降,以放弃「不是我们发明的就不用」的心态换取研发产出率。

**范例**: `procter-gamble-cd` (primary), `innocentive` (secondary)

### 由内而外(内部闲置 IP 外溢)

公司把内部闲置的知识产权、研发产出或技术,通过授权、分拆、合资或专利池等方式商业化 —— 从那些自己不会商业化的资产里捕获价值。最大的障碍是对自我蚕食的担忧。

**范例**: `glaxosmithkline-patent-pool` (primary)


## Examples shipped in this skill

- `procter-gamble-cd` (primary)
- `glaxosmithkline-patent-pool` (primary)
- `innocentive` (secondary)

To explore an example case's BMC, follow with `pingarden case get <slug>` → `pingarden case canvases <slug>` → `pingarden canvas describe <canvas-id> --json`.

## References

### 书籍

- **Chesbrough 2006** · *Henry Chesbrough · Open Business Models: How to Thrive in the New Innovation Landscape · Harvard Business Review Press* · 2006
  把后来在业界通用的「由外而内 / 由内而外」二分法系统化的书籍版本。论证开放的不能只是研发流程,商业模式本身也要开放,否则外部创意会卡在商业化阶段。

- **BMG 2010** · *Osterwalder & Pigneur · Business Model Generation · Wiley* · 2010 · pp. 108–119
  把开放式商业模式收录为 BMC 模式手册(第 5 号模式)。以宝洁 Connect & Develop 作为「由外而内」范式、葛兰素史克专利池作为「由内而外」范式;并把 InnoCentive 作为承担连接器角色、把这一模式以服务形式提供给众多 Seeker 的平台来介绍。

### 文章

- **Chesbrough 2003 MIT Sloan** · *[Henry Chesbrough · 'The Era of Open Innovation' · MIT Sloan Management Review](https://sloanreview.mit.edu/article/the-era-of-open-innovation/)* · 2003 · Vol. 44 No. 3, Spring 2003
  把「开放创新」这个名字立起来的原始文章。把封闭式创新范式(聪明人都在我们公司;靠最好的内部研发取胜)与开放式范式做对照,论证只要把流动设计好,外部知识与企业内部未使用的 IP 都能创造价值。

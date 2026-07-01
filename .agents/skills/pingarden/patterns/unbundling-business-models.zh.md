# 解绑型商业模式

> 大多数公司把三种本质不同的业务捆绑在一家实体里:客户关系、产品创新、基础设施。它们各有自己的经济、竞争和文化驱动力。解绑就是把它们拆分到独立的公司或事业部,消除捆绑必然带来的内生冲突。

## Slug

`unbundling-business-models` — referenced by `CaseLibraryEntry.appliesPatterns[]` on cases that exemplify this pattern.

# 解绑型商业模式 —— AI 技能要点

## TL;DR

捆绑型公司其实是三块业务粘在一起:客户关系、产品创新、基础设施。
每一块有自己的经济和文化;放在一起必然产生内生冲突。
解绑就是把它们拆成各自最优化的独立单元。

## 适用信号

- 公司在同一屋檐下做差异巨大的业务 ——
  比如一家银行同时跑客户服务、支付基础设施、产品创新;
  一家电信运营商同时拥有网络、客户品牌、终端组合。
- 内部战略决策感觉像在做"强制妥协" ——
  客户侧要灵活,基础设施侧要标准化,产品侧要速度。
- 竞争对手已经解绑,正在某一维度上赢,
  而在位者三个维度都被卡住。

## 如何从 BMC 中识别

**捆绑**状态下,一张 BMC 同时服务三套逻辑:
- 客户细分混着高触达零售和批发。
- 核心资源既有关系基础设施(CRM、网点),又有生产能力(工厂、网络)。
- 成本结构混着不同维度的变动 / 固定成本曲线,任何单一维度都对不上。

**解绑**状态下,你画三张 BMC:
- *客户关系*:广覆盖产品组合(来自产品创新公司),
  收入与关系时长 / 客户份额挂钩。
- *产品创新*:研发占成本大头,通过与关系型公司合作进行分销,
  高毛利 / 短保质期。
- *基础设施*:商品化定价,规模驱动的成本优势,
  把上述两类作为**批发客户**服务。

## 反模式

- **化妆式解绑。** 三个事业部,激励一致,共享服务一致。
  组织架构变了,经济结构没变。冲突依旧。
- **强行解绑。** 有些业务真受益于集成(被监管的行业、保密依赖型产品)。
  不要因为模式存在就强行解绑垂直整合的优势。
- **卡在中途。** 启动了解绑但没完成。
  新实体存在,但老公司还在做主要工作。
  成本全付,好处没拿到。

## 交叉引用

- **多边平台** 有时是基础设施解绑的产物
  (剥离出来的基础设施服务多个下游品牌)。
- 案例库里两个行业示例:
  `swiss-private-banking`、`mobile-telco-unbundling`。
  两个案例都展示了捆绑型 archetype + 变体。

## 如何处理用户请求

用户描述一家"什么都做"的公司时:

1. 探问公司是否同时有三种逻辑(客户关系 + 产品创新 + 基础设施)。
2. 如果是 —— `pingarden pattern get unbundling-business-models`,
   把他们带过"三张 BMC"的心智模型。
3. 建议先画捆绑 BMC 把冲突暴露出来,*再*画三张解绑 BMC 作为备选。
4. 可指引的示例:`pingarden case get swiss-private-banking`、
   `pingarden case get mobile-telco-unbundling`。

## Examples shipped in this skill

- `swiss-private-banking` (primary)
- `mobile-telco-unbundling` (primary)

To explore an example case's BMC, follow with `pingarden case get <slug>` → `pingarden case canvases <slug>` → `pingarden canvas describe <canvas-id> --json`.

## References

### 书籍

- **Treacy & Wiersema 1995** · *Michael Treacy & Fred Wiersema · The Discipline of Market Leaders · Addison-Wesley* · 1995
  Hagel 之前的奠基性框架。提出三种价值规则(客户亲密、产品领先、运营卓越),与解绑后的三类业务几乎一一对应。

- **BMG 2010** · *Osterwalder & Pigneur · Business Model Generation · Wiley* · 2010 · pp. 56–65
  把解绑收录为 BMC 模式手册(第 1 号模式)。书中两个范式案例:瑞士私人银行业、移动电信业 —— 本案例库均已收录。

### 论文

- **Hagel & Singer 1999** · *[John Hagel III & Marc Singer · 'Unbundling the Corporation' · Harvard Business Review](https://hbr.org/1999/03/unbundling-the-corporation)* · 1999 · Mar–Apr 1999 issue
  原始论文。提出三类业务(客户关系、产品创新、基础设施)的概念,论证把它们捆绑在一家公司里必然导致战略妥协。

# 多边平台

> 一个把两类或更多类相互依赖的客户群聚到一起的平台 —— 价值只有在各方都到场时才产生,定价通常不对称(给一方补贴以吸引另一方)。搜索引擎、支付网络、交易市场、应用商店、游戏主机都跑的是这个模式。

## Slug

`multi-sided-platforms` — referenced by `CaseLibraryEntry.appliesPatterns[]` on cases that exemplify this pattern.

# 多边平台 — AI 技能页

## TL;DR

一个服务**两类或更多类、相互依赖的客户群**的平台。价值只有在各方都到场时才出现
(跨边网络效应)。定价不对称 —— 通常补贴一边以吸引另一边到场。
源头:Rochet & Tirole 2003 → Eisenmann/Parker/Van Alstyne 2006(HBR)→ BMG 2010 第 3 号模式。

## 这个模式何时适用(信号)

- BMC 上有**两个或更多个不互相替代的客户细分** —— 它们是相互依赖的需求群。
- 一边的人变多会让另一边觉得更值(跨边网络效应)。
- 各边的收入结构**不对称** —— 一边被补贴,另一边付费。
- 平台主要是**连接**而非生产 —— 有搜索 / 推荐 / 匹配层 + 信任与支付基础设施。

## 怎么从 BMC 识别它

- **客户细分**:2 个以上,且互不替代。如果所有客户细分都是替代关系
  (不同人口买同一类东西),那不是多边平台,只是单边业务的市场细分。
- **价值主张**:大致每边一份,且每一边的价值都依赖另一边到场
  (「向有转化意图的搜索者卖注意力」 —— 没有搜索者就没价值)。
- **收入来源**:各边定价不对称 —— 补贴方付得很少或不付,收钱方承担收入。
- **核心资源**:平台本身(索引 / 目录 / 匹配算法 / 支付管道)+ 各边的用户池。

## 反模式

- ❌ 把垂直整合的零售商当成多边平台。Carvana、Patagonia、
  Cainiao 大部分业务都是单边的,即便它们的客户群多元。
- ❌ 把市场细分当作多边性。不同年龄段买同样的产品是市场细分,不是多边。
- ❌ 向补贴方收费。会让飞轮在点火前就熄火。
- ❌ 忽视吞并风险。一个相邻的、更大的平台借由共享同一边客户,
  可以「免费」把你的补贴方吸过去,收钱方也会跟着走。

## 与其他模式的关联

- **长尾**经常与多边平台共生(eBay、YouTube、Lulu.com、LEGO Ideas —— 既有创作者又有消费者,
  外加长目录)。
- **Free**(免费)模式本质上就是「补贴方不付费」的多边平台 —— Google 的搜索者就是 Free 那一侧。
- 在案例库中,对比多边平台的「两边各付不同的钱」与解绑的「一家公司里塞了三种业务」——
  两者都是在攻击垂直整合的在位者,但攻击轴不同。

## 怎么基于它行动

当用户问到一家多边平台公司:

1. `pingarden pattern get multi-sided-platforms` —— 读示例列表 + 简明说明。
2. 深入其中一个示例的 BMC(`pingarden case get google-multi-sided`,
   `pingarden case canvases google-multi-sided`,
   `pingarden canvas describe <id> --json`)。
3. 如果用户想为**自己的**点子画 MSP 类 BMC,先明确确认:
   有没有**两个或更多个相互依赖的客户群**?
   如果只有一个,不要硬套这个模式。
4. 然后再依次识别:补贴方 vs 收钱方、先有鸡还是先有蛋的点火策略、
   被吞并的风险 —— 这些都搞清楚再开始填 BMC 的具体块。

## Examples shipped in this skill

- `google-multi-sided` (primary)
- `visa` (primary)
- `nintendo-wii` (primary)
- `uber` (primary)
- `airbnb` (primary)
- `udemy` (primary)
- `aliexpress` (primary)
- `alibaba-group` (secondary)
- `cainiao` (secondary)
- `lulu-com` (secondary)
- `lego-long-tail` (secondary)

To explore an example case's BMC, follow with `pingarden case get <slug>` → `pingarden case canvases <slug>` → `pingarden canvas describe <canvas-id> --json`.

## References

### 书籍

- **BMG 2010** · *Osterwalder & Pigneur · Business Model Generation · Wiley* · 2010 · pp. 76–81
  把多边平台收录为 BMC 模式手册(第 3 号模式)。书中重点案例:Google(三边:用户 + 广告主 + 内容站)与任天堂 Wii(玩家 + 游戏开发者)。

### 论文

- **Rochet & Tirole 2003** · *[Jean-Charles Rochet & Jean Tirole · 'Platform Competition in Two-Sided Markets' · Journal of the European Economic Association](https://doi.org/10.1162/154247603322493212)* · 2003 · vol. 1, no. 4, pp. 990–1029
  原始经济学论文,正式描述双边市场的定价模型与跨边网络效应。Tirole 后因相关研究获 2014 年诺贝尔经济学奖。

- **Eisenmann, Parker & Van Alstyne 2006** · *[Thomas Eisenmann, Geoffrey Parker & Marshall Van Alstyne · 'Strategies for Two-Sided Markets' · Harvard Business Review](https://hbr.org/2006/10/strategies-for-two-sided-markets)* · 2006 · Oct 2006 issue
  把学术理论翻译给管理者读的一篇。引入了「补贴方 / 收钱方」的视角、先有鸡还是先有蛋的启动困境,以及平台被吞并的风险。

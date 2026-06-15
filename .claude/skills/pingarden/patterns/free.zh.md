# 免费模式

> 至少有一类客户群持续从「免费」中获益,而成本由业务的另一部分或另一类客户群承担。书中识别出三种结构上各不相同的子类型:广告支持、Freemium 增值订阅、诱饵与钩子(锁定)。

## Slug

`free` — referenced by `CaseLibraryEntry.appliesPatterns[]` on cases that exemplify this pattern.

# 免费模式 — AI 技能页

## TL;DR

一种**至少有一个客户群持续免费拿到产品**的模式,成本由另一类客户群或业务的另一部分承担。
依据 *(BMG 2010)*,免费模式有**三个结构上不同的子类型** —— 选对子类型就是关键。

## 三个子类型

### 广告支持型
其中一边免费;另一边(广告主)付钱购买访问权。机制上是「一边定价为零」的多边平台。
**姐妹模式**:`multi-sided-platforms`。范例:Google 搜索、地铁免费报、免费电视、YouTube 观众端。

### Freemium
免费档 + 付费高级档;通常 5-10% 用户转付费(*(Anderson 2009)* 提出的 1:9 比)。
补贴发生在同一平台的不同用户之间。范例:Spotify、Skype(历史)、Dropbox、Slack。

### 诱饵与钩子(锁定)
前端产品低价或赠送,把客户锁进高价的耗材或持续消费。补贴发生在**时间维度** ——
现在便宜,以后贵。范例:吉列剃须刀 + 刀头(1901 年原型)、HP 打印机 + 墨盒、
Nespresso 咖啡机 + 胶囊、手机合约补贴。

## 这个模式何时适用(信号)

- BMC 上有 2+ 个相互依赖的客户细分
- 其中一条收入流是零(或接近零)
- 免费方的边际成本接近零(数字商品、广告位、或可由钩子毛利回收)

## 怎么从 BMC 识别它

- **客户细分**:2+ 类客户,或同一类客户的 2+ 定价档。
- **收入来源**:其中一条流是 0,其他承担整个模型。
- **价值主张**:每边一份 —— 「免费产品」+ 「广告主买注意力」/「高级功能」/「锁定客户的耗材」。
- **成本结构**:免费方的边际成本必须接近零。

## 决策树 —— 哪个子类型?

问:**钱从哪里来?**
- *从完全不同的另一类客户* → 广告支持型。
- *从同一类客户,但只有付费的少数* → Freemium。
- *从同一类客户,但在以后的时间点、在不同 SKU 上* → 诱饵与钩子。

## 反模式

- ❌ 把任何「免费试用」或「首月免费」当成 Free 模式。这里的 Free 是**结构性的、永久性的**,不是营销手段。
- ❌ Freemium 配上诱饵 & 钩子的经济学。如果每个免费用户都让你产生真实的、非可摊销的成本,
  那 Freemium 数学就不成立,你其实在诱饵 & 钩子领域,前端产品必须被设计成能把客户锁住。
- ❌ 把垂直整合的零售商当成 Free 模式,只因为它有些商品是亏本品。那是促销定价,不是这个模式。

## 与其他模式的关联

- **`multi-sided-platforms`** —— 广告支持型 Free 机制上就是 MSP。`google-multi-sided`
  这样的案例同时适用两个模式,标签都打上。
- **`long-tail`** —— 经常与 Freemium 共存(Spotify、Lulu)。
- 非 Free 对照:`nintendo-wii` 是 MSP 不是 Free,因为硬件微利出货 ——
  有意与诱饵 & 钩子的后代区分开。

## 怎么基于它行动

当用户问到一家 Free 模式公司:

1. `pingarden pattern get free` —— 读示例列表和子类型分解。
2. **先确定子类型**,再开始画 BMC。走上面的决策树。
   错的子类型会做出一张不自洽的 BMC,而且失败方式与预期不同。
3. 深入子类型代表案例的 BMC(诱饵 & 钩子用 `pingarden case get gillette`;
   Freemium 用 `pingarden case get spotify`;广告支持型用 `pingarden case get google-multi-sided`)。
4. 注意:广告支持型案例通常同时打了 `multi-sided-platforms` 标签 ——
   两个模式在这个子类型上结构上是重叠的。

## Sub-types

这个模式有 3 个结构上不同的子类型 —— 选对子类型是关键(走 `description.zh.md` 里的决策树)。

### 广告支持型

其中一边客户免费,因为另一边(广告主)在为他们的注意力买单。机制上是「一侧定价为零」的多边平台 —— BMC 与多边平台模式高度重叠。

**范例**: `google-multi-sided` (primary)

### Freemium 增值订阅

绝大多数用户用免费版;一小部分(通常 5-10%)升级到付费高级版,这部分收入支撑整个用户基数。补贴发生在同一平台不同用户之间。

**范例**: `spotify` (primary), `udemy` (secondary)

### 诱饵与钩子(锁定)

前端产品低价出售或赠送(诱饵),把客户锁进高价的耗材或持续消费(钩子)。补贴发生在时间维度 —— 现在便宜,以后贵。

**范例**: `gillette` (primary), `nespresso` (secondary)


## Examples shipped in this skill

- `google-multi-sided` (primary)
- `spotify` (primary)
- `gillette` (primary)
- `nespresso` (primary)
- `udemy` (secondary)

To explore an example case's BMC, follow with `pingarden case get <slug>` → `pingarden case canvases <slug>` → `pingarden canvas describe <canvas-id> --json`.

## References

### 书籍

- **Anderson 2009** · *Chris Anderson · Free: The Future of a Radical Price · Hyperion* · 2009
  书籍版的完整扩展。明确划分了三种「免费」形态:跨边补贴(广告支持)、Freemium、礼物经济。书中提出的 1:9 / 1:99 付费转化比成为后来 SaaS 行业的标准思维。

- **BMG 2010** · *Osterwalder & Pigneur · Business Model Generation · Wiley* · 2010 · pp. 88–107
  把免费模式收录为 BMC 模式手册(第 4 号模式)。把这一模式拆为三个结构上不同的子类型 —— 各自对应一个范式案例(Metro 报纸 / Skype / 吉列剃须刀)。

### 文章

- **Anderson 2008 Wired** · *[Chris Anderson · 'Why $0.00 Is the Future of Business' · Wired](https://www.wired.com/2008/02/ff-free/)* · 2008 · Feb 2008 issue
  把这一模式命名出来的 Wired 特稿。论证数字商品边际成本不断下降时,「免费」是一种严肃的商业战略,而非营销噱头。

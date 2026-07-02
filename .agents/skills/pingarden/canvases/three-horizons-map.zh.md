---
canvas: three-horizons-map
language: zh
source: packages/canvases/three-horizons-map/
---

# 三层增长地图

## 何时使用

当用户需要按增长成熟度和时间逻辑整理组合时，使用三层增长地图：当前核心业务、新增长引擎、未来选项。

## 何时不用

- 分析单一商业模式：使用 `business-model-canvas`。
- 只看风险/收益位置、不看时间接续：使用 `portfolio-map`。
- 按市场份额分类业务：使用 `bcg-growth-share-matrix`。

## 填写顺序

1. 定义分析单元。
2. 用 H1 填写当前核心业务。
3. 用 H2 填写已有证据的新增长业务。
4. 用 H3 填写早期选项和学习型押注。
5. 为 H3→H2、H2→H1 写迁移动作。
6. 为每个迁移判断补充证据与风险。
7. 把高风险假设导入 `experiment-canvas` 和 `evidence-scorecard`。

## 红旗信号

- H2 里是没有证据的想法。
- H3 只是流行技术清单。
- H1 吃掉全部资源，H2 永远不移动。
- 地图没有迁移标准或下次复盘时间。

## Blocks

`zoneId` 是 API 的稳定标识符,`pingarden canvas write` payload 必须用它,不要翻译。

### `horizon-1-core` — H1 —— 当前核心业务

**Prompt** — 列出今天为公司贡献现金和规模的当前业务，并说明每项业务应如何防守、改善或延展。

**Example** — 保险和银行核心业务持续产生现金

**Quality bar** — H1 放置今天创造收入、利润、数据、渠道或运营杠杆的业务。 重要 H1 项目应展开为 `business-model-canvas`，并通过 `portfolio-map` 持续监测颠覆风险。

### `horizon-2-emerging` — H2 —— 新增长引擎

**Prompt** — 列出已经有一定证据、如果扩张得当可能成为重要增长引擎的业务。

**Example** — 已有早期牵引力的数字医疗平台

**Quality bar** — H2 放置已有证据和早期牵引力、但尚未成为稳定核心引擎的业务。 用 `evidence-scorecard` 判断应该扩张、转向还是暂停。 好答案会写清牵引力、可重复性缺口、能力需求和下一条证据阈值。

### `horizon-3-options` — H3 —— 未来选项

**Prompt** — 列出仍需学习验证的早期选项、技术、市场空间或商业模式想法。

**Example** — 自动化服务概念

**Quality bar** — H3 放置不确定性高、学习比立刻扩张更重要的早期选项。 在申请规模化资金前，把 H3 假设转成 `experiment-canvas` 实验。 好答案会写出未来可能性、不确定性和学习目标。

### `migration-actions` — 迁移动作

**Prompt** — 一个项目从 H3 进入 H2，或从 H2 进入 H1，需要发生什么？写清投入、治理、转入和扩张动作。

**Example** — 把医疗平台从创新董事会转入运营单元

**Quality bar** — 这个区域把地图变成管理决策。 只有当证据、资金、治理和运营归属准备好时，项目才应该迁移层级。 每个动作都应写清负责人、触发条件、资金决策和下次复盘时间。 好答案会写清决策、触发条件、负责人、资源变化和复盘节奏。

### `evidence-risks` — 证据与风险

**Prompt** — 记录决定每个层级项目是否值得继续投入、调整或终止的证据、假设和风险。

**Example** — H2 仍缺少可复用获客渠道

**Quality bar** — 这个区域记录让层级判断变得诚实的假设，避免把愿望当作事实。 弱证据进入 `evidence-scorecard`，下一步验证进入 `experiment-canvas`。 好答案会区分证据、假设和未知，并写明哪个决策依赖这条证据。

## Colour legend

- `0` — **H1 核心业务**: 需要防守、延展和改善的当前业务。
- `1` — **H2 增长引擎**: 有机会成为重要增长引擎的新兴业务。
- `2` — **H3 未来选项**: 需要先学习验证的早期选项、技术或市场。
- `3` — **风险 / 假设**: 阻碍项目进入下一层级的关键假设。
- `4` — **迁移动作**: 改变层级位置所需的投入、转入、治理或组织动作。

## Pairs with

这张画布常和这些一起用,做完后引导用户接下去做:

- `portfolio-map` — 业务组合地图用于看整体风险/收益位置；当重点是时间、成熟度以及核心业务、增长业务、未来选项之间的迁移时，使用三层增长地图。
- `business-model-canvas` — 每个重要的层级项目在获得重大投入前，都应能展开为一套清晰的商业模式逻辑。
- `experiment-canvas` — H2 和 H3 项目需要实验来降低阻碍其向核心业务推进的关键假设风险。
- `evidence-scorecard` — 用证据评分卡判断某个项目是否有足够证据继续推进、追加投入、暂停、转向或终止。

---
Source: `packages/canvases/three-horizons-map/` — regenerate with `pingarden skill build`.

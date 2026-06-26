# 实验设置

明确实验怎么跑:方法、原型材料、样本、时间窗、负责人、变量。

## 从实验库挑方法

不要自由发挥。技能里附了约 12 个 TBI 精选实验,在 `experiments/<slug>.{en,zh}.md`。按三个信号匹配:

- **阶段** —— Discovery(便宜、证据弱;默认先做)或 Validation(贵一点、证据强;Discovery 锁定方向后再跳)。
- **风险** —— 需求性 / 可行性 / 可营性(在致命假设那一块已经定好)。
- **成本带** —— `cheap` / `medium` / `expensive`,看团队预算。

常见组合:

- **Discovery / 需求性 / 便宜** → `customer-interview`、`online-survey`、`discussion-forums`、`search-trend-analysis`、`boomerang`、`storyboard`
- **Discovery / 需求性 + 可行性 / 便宜** → `clickable-prototype`
- **Validation / 需求性 / 中等** → `smoke-test`
- **Validation / 需求性 + 可行性 / 中等** → `wizard-of-oz`
- **Validation / 需求性 + 可营性 / 中等-强** → `concierge`(最便宜)、`pre-sale`(B2C / prosumer)
- **Validation / 可营性 (B2B) / 强** → `letter-of-intent`

## 检查问题

- 实验对象是谁?会影响到谁?
- 样本是否足够代表目标客户?(每个实验技能页里有样本量指引。)
- 谁负责招募、执行、记录、复盘?
- 给出明确答案的最便宜方法是什么?(学习成本和 build 一样高,那就直接 build。)

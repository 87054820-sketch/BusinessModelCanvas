---
canvas: experiment-canvas
language: zh
source: packages/canvases/experiment-canvas/
---

# 实验画布

## 何时使用

用 Experiment Canvas 设计**一次便宜、可证伪**的实验,测试一条最致命的假设 —— 在你**开始建造之前**。这是 Bland & Osterwalder《Testing Business Ideas》/ Strategyzer 的标配,顺承 Lean Startup 谱系:风险归类 → 立假设 → 从实验库挑方法 → 测量 → 学习 → 决策。

一张画布对应一个实验。多条致命假设 = 多张实验画布(能并行就并行)。这张画布的任务是确保每个实验**具体到能失败**。

## 何时不该用

- 还没识别出致命假设。先用 **Design Criteria Canvas** + **VPC** 把假设暴露出来;**Experiment Canvas** 是下一步。
- 长周期产品构建。如果你的"实验"要 6 周,那是项目。真实验天计。
- 对已经充分验证过的假设做"确认测试"。实验必须**能失败**才算有意义。

## 填写顺序 —— 风险先,设计中,承诺后

1. **`riskiest-assumption`** —— 你押上去的那一个:错了就整盘垮的事。要狠,挑最致命的,不是最容易测的。**先把它归到 D / F / V 哪一类**(TBI 的三类风险) —— 这个分类直接喂给第 3 步选实验。常见致命假设:某细分会付 X 元(D + V)、某痛点严重到愿意切换(D)、某渠道能廉价触达细分(D / F)、采购在 Q3 前签字(V)。
2. **`falsifiable-hypothesis`** —— 用 TBI 的 4 行模板:"我们相信 X。为了验证,我们将 Y。并测量 Z。如果 [预设阈值] 就算对,在 [时间窗] 内。" 没有数字和截止时间就不可证伪。
3. **`experiment-setup`** —— 从 **实验库** 挑方法(`experiments/<slug>.{en,zh}.md`,12 个 TBI 精选实验)。按阶段(Discovery → Validation)、风险(第 1 步定的 D/F/V)、成本带匹配。看下文 "从实验库挑实验"。
4. **`metrics-criteria`** —— 测哪个数,什么阈值算**通过 / 失败**?**事前承诺**。("30 个里 ≥ 8 个预付" = 通过,"< 8" = 失败。)没有事前承诺,结果会被偏见解读。
5. **`results-conclusion`** —— 实验**做完之后**填。实际观察到的数字;**已验证 / 已证伪 / 不清晰**(TBI 三态)。不允许重新解读。负面结果同样有信息量。
6. **`next-steps`** —— 基于结果:Persevere(同方向再实验)、pivot(换个假设)、kill(这个提供物活不了)。明确选哪个。

## 从实验库挑实验

不要自由发挥。技能里附了 12 个 TBI 精选实验(`experiments/`)。按三个信号匹配:

- **阶段。** 默认走 **Discovery**(便宜、证据弱、快纠偏)。只有当 (a) Discovery 锁定了方向、(b) 你需要更强证据来投工程或资金时才跳到 **Validation**。
- **风险。** 第 1 步的 D/F/V 分类。
- **成本带。** `cheap` / `medium` / `expensive`,看团队预算。

常见组合:

- D + 便宜 + Discovery → `customer-interview`、`online-survey`、`discussion-forums`、`search-trend-analysis`、`boomerang`、`storyboard`
- D + F + 便宜 + Discovery → `clickable-prototype`
- D + 中 + Validation → `smoke-test`
- D + F + 中 + Validation → `wizard-of-oz`
- D + V + 中 + Validation → `concierge`(最便宜)、`pre-sale`(B2C / prosumer)
- V (B2B) + 中 + Validation → `letter-of-intent`

推荐时给 **2-3 个候选 + 各自 tradeoff** —— 不要只给一个 "对的答案"。完整的匹配启发式见 `workflows/experiments.md`。

## 跨模块一致性

- **`riskiest-assumption` 必须是真正最致命的**,不是最容易测的。团队默认挑容易的。逼自己问:错了会让这事垮的是什么?
- **`falsifiable-hypothesis` 必须含数字和截止时间**。否则就是个观点。
- **`setup` 必须便宜**,相对于答案的价值。学习成本和建造成本一样,那就直接建。
- **阈值必须在跑实验之前定**。事前承诺。否则团队会给任何回来的结果合理化。
- **结果按观察到的事实报告**,不是按团队希望。事前承诺的意义就是中和事后合理化。
- **TBI 的"证据强度"经验法则。** 行动 > 意见(一次点击强过一个问卷评分)。N ≥ 5 起步。量化 + 质性 > 单独一种。真实测试 > 回忆口述。阈值事前定 > 事后定。

## 反模式 —— 不允许

- ❌ **空泛的假设。** "客户会喜欢" 不可证伪。加:"≥ X / Y 会在 [Z 天] 内 [具体动作]"。
- ❌ **设计成"必通过"的测试。** 如果实验不能失败,那是营销,不是测试。
- ❌ **结果出来后再定阈值。** "20% 互动其实还行" —— 实验作废。事前承诺,不然啥都没学到。
- ❌ **致命假设 = 第二致命的。** 团队会绕开最吓人的那条,去测稍安全的。最致命是那条**会让你垮**的,不是最容易测的。
- ❌ **跳过 D/F/V 归类。** 没有归类,选实验就是猜 —— 你会用客户访谈测定价、用 Smoke Test 测可行性。错配率很高。
- ❌ **把 Discovery 的结果说成"已验证"。** 客户访谈 / 问卷 / 论坛是 Discover,不是 Validate。说话要精确。
- ❌ **实验太贵。** 花 4 周做 MVP 来测"有没有人想要这个" —— 测试应该天计,不是周计。
- ❌ **next-steps 没有 pivot/kill 分支。** 如果唯一结局是"继续",你根本不是在测。
- ❌ **结果按希望的剧本写。** 负面结果 = 真学习。如实记录。

## 语气

每一块是一段紧凑陈述。假设是一句话。Setup 2-3 句话(加上挑出的实验 slug)。结果一个数字 + 一行字。结论一个动词(persevere / pivot / kill)+ 一句话。

## Blocks

`zoneId` 是 API 的稳定标识符,`pingarden canvas write` payload 必须用它,不要翻译。

### `riskiest-assumption` — 最高风险假设

**Prompt** — 如果它错了，整个方案会在哪里失败？

**Example** — 用户愿意为自动化报告每月付费

**Quality bar** — 写下当前最需要验证、风险最高的假设。 按 Bland & Osterwalder 在 TBI 里的归类,每条假设都属于三类风险之一 —— **先归类**: 常见来源:价值主张、商业模式、渠道、定价、客户需求、组织采纳。

### `falsifiable-hypothesis` — 可证伪假设

**Prompt** — 我们相信什么行动会在多长时间内带来什么结果？

**Example** — 我们相信演示页会在 2 周内带来 30 个预约

**Quality bar** — 把风险假设改写成数据能验证或推翻的句子。 用 TBI 的 4 行模板: 也可以用早期的公式(同样有效):「我们相信 `具体动作` 会在 `时间范围` 内带来 `可衡量结果`」。

### `experiment-setup` — 实验设置

**Prompt** — 用什么实验方式、样本、材料和周期来验证？

**Example** — 面向 50 个目标客户投放落地页测试

**Quality bar** — 明确实验怎么跑:方法、原型材料、样本、时间窗、负责人、变量。 不要自由发挥。 技能里附了约 12 个 TBI 精选实验,在 `experiments/<slug>. {en,zh}. md`。 按三个信号匹配: 常见组合:

### `metrics-criteria` — 指标与判定标准

**Prompt** — 哪些数据证明假设成立或不成立？

**Example** — 预约转化率 ≥ 8% 视为验证

**Quality bar** — 在运行实验前定义如何判断结果。 这里相当于 Open Practice Library 里的 Results 与 Litmus Test：既要写成功/失败标准，也要写需要收集的数据。

### `results-conclusion` — 结果与结论

**Prompt** — 实际发生了什么？结论是验证、推翻还是不明确？

**Example** — 32 个预约，转化率 9.4%，假设验证

**Quality bar** — 实验结束后记录真实发生的事情，包括定量数据、定性反馈、异常情况和样本限制。 然后判断结论：已验证、已推翻，还是结果不明确。

### `next-steps` — 下一步

**Prompt** — 继续推进、转向，还是重新实验？谁负责？

**Example** — 继续：扩大样本到 200 个目标客户

**Quality bar** — 根据结论决定继续、转向或重做实验。 不要只写“继续观察”，要写清楚行动、负责人和时间点。

## Colour legend

_未自定义,使用六色 sticky 默认调色板。颜色无固定语义,作者可自行约定。_

## Pairs with

这张画布常和这些一起用,做完后引导用户接下去做:

- `design-criteria-canvas` — 实验通过的话,把结论锁进 Design Criteria Canvas 的 Must-have。
- `value-proposition-canvas` — 致命假设大多藏在 VPC 里 —— 痛点是否真的够痛、收益创造能否真的产生收益。
- `business-model-canvas` — 致命假设是结构性的(渠道、收入来源等)时,把结果反馈进 BMC 对应那一块。

---
Source: `packages/canvases/experiment-canvas/` — regenerate with `pingarden skill build`.

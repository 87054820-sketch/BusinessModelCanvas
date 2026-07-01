---
canvas: design-criteria-canvas
language: zh
source: packages/canvases/design-criteria-canvas/
---

# 设计准则画布

## 何时使用

用 Design Criteria Canvas(Strategyzer / IDEO 风格的工具)把**验证过的洞察翻译成硬约束**,在设计下一版产品之前定下来。目标:把权衡显性化,让团队**辩论优先级,而不是个人偏好**。

四个区用 **MoSCoW** 语义:**必须(Must)/ 应该(Should)/ 可以(Could)/ 不要(Won't)**。"不要"和"必须"一样重要 —— 它是一个承诺,不只是省略。

## 何时不该用

- 还没验证就开始用。Design Criteria 排在 VPC + 客户调研**之后**。基于团队主观的标准就是 wishlist 优先级。
- 做高层愿景 —— 那是 BMC。Design Criteria 是给下一版产品迭代用的。
- 没有 owner。每条标准都要有人对"是否达成"负责。否则 MoSCoW 就变成凭感觉。

## 填写顺序 —— 必须最先,不要第二

1. **`must-have`** —— 不可谈判的项。任何一条不满足,产品都不算可行。每条都要追溯到一个**验证过的洞察**(VPC 痛点、观察到的客户行为、法规要求)。
2. **`wont-have`** —— 显式**圈外**的决定。把团队会面临的诱惑现在就排除掉。("v1 不做 Android。""v1 不做企业级 SSO。")这是最被跳过的象限,也是最有价值的:它在构建中途阻止 scope 蔓延。
3. **`should-have`** —— 重要但不致命;在合理资源下应该有。资源紧时它要么升必须、要么砍掉。
4. **`could-have`** —— 锦上添花。所有"想要"项;scope 收紧时第一批被砍。

按这个顺序填,逼团队先把脊柱(必须)和负空间(不要)定下来,再辩论中间的可选项。

## 跨模块一致性

- **每条 must-have 都要有证据可循** —— VPC 痛点、可测量的客户行为、合规条款。"工程团队觉得重要"不是证据。
- **won't-have 要针对真实诱惑。** 不要列那些根本没人提过的东西。列出**已经被提案过、你选择推迟**的项。
- **could-have 不许在执行中悄悄变成 must-have** —— MVP 变 18 个月就是这么炼成的。频繁回头校准。
- 四个区合起来应该描述**同一个**设计阶段 / 发布。混了 v1 和 v3 就拆。

## 反模式 —— 不允许

- ❌ **全是 must-have。** 每个团队的初稿都太多必须项。封顶。"必须"应该数量少:通常 3-7 项。
- ❌ **空的 won't-have。** 这个象限空着说明团队没做硬优先级。强制至少 3 条。
- ❌ **标准没有 owner。** 每条 must-have 都要点名:谁负责交付或验证。
- ❌ **wishlist 伪装成标准。** "应该支持企业客户" —— 这分解成什么?认证、审计日志、租户隔离等等。分解到可执行。
- ❌ **不回头校准。** kickoff 定下来再不动的标准会变成民间传说。执行期每周回头看。
- ❌ **VPC 还没完就开始建。** 如果 Design Criteria 是从团队直觉填出来的,跳了一步。暂停,先验证。

## 语气

每条标准是一句**约束陈述**,不是功能描述("首次用户下单 < 60 秒"比"快速结账"强)。won't-have 要写得最直接:"本季度不做原生移动 app"。

## Blocks

`zoneId` 是 API 的稳定标识符,`pingarden canvas write` payload 必须用它,不要翻译。

### `must-have` — 必须满足

**Prompt** — 哪些标准不可妥协，否则方案就不成立？

**Example** — 必须在 3 个月内验证真实购买意愿

**Quality bar** — 这些是不可妥协的设计准则。 如果某个方案无法满足这里的标准，就不应该继续推进。

### `should-have` — 应该满足

**Prompt** — 哪些标准很重要，但不是生死线？

**Example** — 应该复用现有销售渠道

**Quality bar** — 这些是重要的设计准则，但不是绝对生死线。 它们通常显著影响用户体验、商业可行性或组织接受度。

### `could-have` — 可以满足

**Prompt** — 哪些是有价值但可延后的加分项？

**Example** — 可以支持多语言界面

**Quality bar** — 这些是有价值但可以延后的加分项。 它们可能提升体验、增强差异化或打开未来机会，但不应阻塞当前验证。

### `wont-have` — 明确不做

**Prompt** — 哪些方向明确排除，同样不能妥协？

**Example** — 不做需要大量人工审核的流程

**Quality bar** — 这些是明确排除的方向，也是不可妥协的边界。 它帮助团队避免范围蔓延、错误激励和短期诱惑。

## Colour legend

_未自定义,使用六色 sticky 默认调色板。颜色无固定语义,作者可自行约定。_

## Pairs with

这张画布常和这些一起用,做完后引导用户接下去做:

- `business-model-canvas` — Must-have 必须能用 BMC 的价值主张和客户细分来辩护。
- `value-proposition-canvas` — 每条 must-have 都要追溯到 VPC 的某条痛点或收益。否则就是 wishlist。
- `experiment-canvas` — Should-have 或 won't-have 拿不准时,设计一个实验来定。

---
Source: `packages/canvases/design-criteria-canvas/` — regenerate with `pingarden skill build`.

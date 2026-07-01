---
canvas: scenario-matrix
language: zh
source: packages/canvases/scenario-matrix/
---

# 情景矩阵

# 情景矩阵

## 何时使用

当用户已有外部信号，并需要把不确定性转成多个可信未来来压力测试战略时使用。

## 填写顺序

1. 定义焦点战略议题。
2. 从 `business-model-environment` 带入信号。
3. 选择两个相互独立的关键不确定性。
4. 写出每个不确定性的两个端点。
5. 写出四个具有不同战略逻辑的情景。
6. 在每个情景中测试 BMC、组合押注和设计准则。
7. 记录稳健动作和早期信号。

## 红旗信号

- 写成好/中/坏版本，而不是不同未来。
- 没有 BMC 或组合含义。
- 没有早期信号。
- 后续监测没有负责人。

## Blocks

`zoneId` 是 API 的稳定标识符,`pingarden canvas write` payload 必须用它,不要翻译。

### `uncertainty-a` — 关键不确定性 A

**Prompt** — 选择一个会显著改变战略选择的不确定性，并写出两端状态。

**Example** — 监管开放 ↔ 监管收紧

### `uncertainty-b` — 关键不确定性 B

**Prompt** — 选择第二个独立的不确定性，避免和 A 描述同一件事。

**Example** — 技术成熟快 ↔ 技术成熟慢

### `scenario-1` — 情景 1

**Prompt** — 在 A 的一端和 B 的一端同时成立时，市场会怎样？BMC 哪些模块承压？

**Example** — 写出情景名称、关键信号、机会、威胁和商业模式影响

### `scenario-2` — 情景 2

**Prompt** — 写出第二个组合情景，重点看客户、渠道、伙伴或收入逻辑如何变化。

**Example** — 哪些价值主张更强？哪些成本结构会失控？

### `scenario-3` — 情景 3

**Prompt** — 写出第三个组合情景，不要把它简单写成悲观版本。

**Example** — 这个未来中谁受益？谁受损？我们有哪些期权？

### `scenario-4` — 情景 4

**Prompt** — 写出第四个组合情景，并找出它和其他情景最不同的战略逻辑。

**Example** — 哪些假设需要最早验证？哪些信号值得监测？

### `robust-moves` — 稳健动作 / 早期信号

**Prompt** — 哪些动作在多个情景下都值得做？哪些外部信号会提示情景正在成形？

**Example** — 保留轻资产渠道期权

## Colour legend

- `0` — **信号**: 外部趋势、弱信号或触发事件。
- `1` — **情景影响**: 这个未来会如何改变商业模式。
- `2` — **稳健动作**: 在多个情景下都值得做的动作。

## Pairs with

这张画布常和这些一起用,做完后引导用户接下去做:

- `business-model-environment`
- `business-model-canvas`
- `portfolio-map`
- `design-criteria-canvas`

---
Source: `packages/canvases/scenario-matrix/` — regenerate with `pingarden skill build`.

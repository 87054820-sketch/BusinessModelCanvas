---
name: simplify-copilot-create-project-hint
overview: 简化 Copilot 创建项目提示区：移除“上传图/写几句/生成草稿”快捷按钮，仅保留一行提示文案。
todos:
  - id: simplify-composer-hint
    content: 精简 CopilotDrawer 的 ComposerContextHint 为纯文字提示
    status: pending
  - id: cleanup-unused-props
    content: 清理提示组件不再使用的按钮回调参数
    status: pending
    dependencies:
      - simplify-composer-hint
  - id: update-create-project-copy
    content: 更新创建项目提示区中英文文案
    status: pending
    dependencies:
      - simplify-composer-hint
  - id: verify-copilot-composer
    content: 验证类型检查和 Web 构建通过
    status: pending
    dependencies:
      - cleanup-unused-props
      - update-create-project-copy
---

## User Requirements

- 移除 Copilot 创建项目提示区域中的快捷入口按钮，包括“上传图”“写几句”，以及同一区域内可能出现的“生成草稿”按钮。
- 保留提示区域本身，但只显示一句简洁说明文字。
- 提示文案应引导用户：如果想创建新项目，可以直接在输入框中描述项目想法、资料或链接，系统会先生成项目草稿供确认。
- 不移除底部正常的“+ 图片”附件按钮，也不改变发送输入内容的主流程。

## Product Overview

Copilot 输入区将更简洁：创建项目模式下只显示一条说明提示，不再出现额外快捷按钮，减少界面干扰。

## Core Features

- 创建项目提示区仅保留文字说明。
- 删除提示区中的“上传图”“写几句”“生成草稿”快捷按钮。
- 更新中英文提示文案。
- 保持底部图片上传、文本输入和发送能力不变。

## Tech Stack Selection

- 复用现有前端技术栈：React、TypeScript、Vite、Tailwind CSS。
- 复用现有组件结构和 i18n 体系，不新增组件库或样式体系。
- 修改范围集中在 Copilot 输入区组件和中英文文案文件。

## Implementation Approach

本次改动是局部 UI 精简，不改变 Copilot 对话、图片附件、项目草稿生成或发送逻辑。方案是在 `ComposerContextHint` 中移除 createProject 模式下的按钮渲染分支，并同步清理不再使用的 props，避免保留无效回调和冗余代码。

关键决策：

- 只删除绿色提示区内的快捷按钮，不删除输入区底部的“+ 图片”附件按钮。
- `ComposerContextHint` 保留为轻量提示组件，继续根据 `mode` 展示不同提示文案。
- 更新 `createProject.hint` 文案，使其表达“想创建新项目时，直接输入项目想法、资料或链接”。
- 清理 `onPickImage`、`onSeedIdea`、`onStart`、`disabled` 等仅服务于被删除按钮的参数，减少组件噪声。
- 如 `hasImages` 只用于“已有图片”徽标，可视实际代码判断是否保留；若目标是“只剩一句提示话”，应一并移除该徽标。

## Implementation Notes

- 保持 `handleProjectGuideStart`、`handleProjectIdeaSeed` 等现有函数不做大范围删除，除非 TypeScript 明确提示已完全无引用且删除不会影响其他流程。
- 避免改动 `handleAddImageFiles`、`pendingImages`、文件粘贴/拖拽逻辑和底部附件按钮。
- 不调整 Copilot 消息区、建议操作卡片、案例/画布入口逻辑。
- 修改后运行 `pnpm typecheck` 和 `pnpm --filter @pingarden/web build` 验证。

## Architecture Design

本次不引入新架构，仅收敛现有组件职责：

- `CopilotDrawer.tsx`
- `ChatPane` 仍负责输入区整体布局。
- `ComposerContextHint` 从“提示 + 快捷操作”简化为“纯提示”。
- 底部 composer 的附件按钮和发送按钮保持现状。

- i18n
- `zh.json` 更新创建项目模式提示语。
- `en.json` 更新英文对应提示语。
- 可保留旧按钮文案 key 以降低改动范围，也可在确认无引用后清理。

## Directory Structure

```text
BusinessModelCanvas/
├── apps/web/src/components/
│   └── CopilotDrawer.tsx
│       # [MODIFY] 精简 ComposerContextHint，移除创建项目提示区的上传图、写几句、生成草稿按钮。
│       # 清理不再使用的 props，并保持底部图片附件和发送流程不变。
└── apps/web/src/i18n/
    ├── zh.json
    │   # [MODIFY] 更新 createProject.hint 中文文案，引导用户直接输入项目想法、资料或链接。
    └── en.json
        # [MODIFY] 更新 createProject.hint 英文文案，与中文体验一致。
```
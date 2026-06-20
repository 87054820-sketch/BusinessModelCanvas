# PinGarden 安装指南

> 当前版本:**v0.4.1**(macOS · Apple Silicon)

PinGarden 是一个本地运行的商业模式画布工具(BMC / VPC / 客户旅程 / JTBD …),核心特点是 **AI 助手能直接帮你起草和迭代画布**。

你拿到了两个文件,按顺序装就行:

| 文件 | 作用 |
| --- | --- |
| **`PinGarden-0.4.1-arm64.dmg`** | 桌面应用本体 |
| **`pingarden-skill-0.4.1-*.zip`** | AI 助手的"使用说明书",让 Claude / Cursor 等 AI 知道怎么操作 PinGarden |

整个安装大约 **3 分钟**,只在终端粘贴 1~2 条命令。

---

## 第一步:装桌面应用

1. 双击 `PinGarden-0.4.1-arm64.dmg`,在弹出的窗口里把 `PinGarden` 图标拖到旁边的 `Applications` 文件夹快捷方式上。
2. ⚠️ **关键一步:复制下面这条命令,粘到「终端 (Terminal)」里回车**:

   ```bash
   xattr -cr /Applications/PinGarden.app
   ```

   执行成功不会有任何输出,这就是正常的。
3. 在「启动台」里找到 PinGarden 图标,点开它。

> **为什么必须做第 2 步?**
> PinGarden 目前没有付费的 Apple 开发者签名,直接打开会被 macOS 弹"应用已损坏"的提示 —— 其实没坏,只是系统在拦截未签名应用。这条命令告诉系统"我知道这是哪来的,放行",**只对你这一台机器生效,不影响系统安全**。
> 等以后接入 Apple 开发者签名后,这一步就不用了。

打开应用后,会让你填一个**显示名称**(随便写,可以是中文,以后能改)—— 这个名字会标在你创建/修改的项目上,方便区分。

---

## 第二步:装 AI 技能包

技能包的作用是教会 AI 助手:PinGarden 里有哪些画布、每张画布每块该填什么、怎么把内容写回应用。

### 🟢 用 Claude Code(推荐)

打开终端,粘贴并运行(把 `~/Downloads/pingarden-skill-*.zip` 替换成你的 zip 实际路径,大部分人就是 `~/Downloads`):

```bash
unzip -o ~/Downloads/pingarden-skill-*.zip -d ~/.claude/skills/
```

下次启动 Claude Code 时,技能会自动加载。

### 用其他 AI 工具(Cursor / Copilot / Cline …)

zip 文件解压出来里面带了一份 `INSTALL.md`,涵盖每种工具具体的安装路径。先把 zip 解压看一下就好。

---

## 第三步:试一下 —— 让 AI 帮你画一张画布

确认 PinGarden **桌面应用是开着的**,然后在 Claude Code 里发一句话试试:

> 给我画一张 Spotify 的商业模式画布

AI 应该会:

1. 自动加载 PinGarden 技能。
2. 调用 PinGarden 给你创建一个新项目,把 9 个块都填好。
3. 给你一个本地链接,点开就能在 PinGarden 里看到结果,还能继续改。

—— 整个过程**不需要你做任何额外操作**,AI 会自己处理。

---

## 如果 AI 说"找不到 pingarden 命令"(少数情况)

大多数情况下,AI 会自己找到 PinGarden 应用里自带的命令行工具,不需要你额外做什么。

但如果 AI 反复告诉你"`pingarden: command not found`"或者"找不到 CLI",**把下面这句话原封不动复制粘贴给 AI**:

> 请帮我把 pingarden CLI 装到系统 PATH 上,这样以后你就能直接用了。我是 macOS。如果需要我装 Node / npm,告诉我具体步骤。

AI 会自动选一种方式帮你装好(通常是 `npm install -g @pingarden/cli`),然后继续完成你原来的任务。装好之后**这台电脑以后都不需要再处理这个问题了**。

> 如果 AI 让你装 Node,可以在浏览器搜 "Node.js 官网" 下载安装包(或者用 Homebrew 跑 `brew install node`),装完再让 AI 继续。

---

## 更多用法(给 AI 的话术模板)

下面这些是验证过的提示词。把 `<...>` 里的内容换成你自己的,直接发给 AI 就行。

### 1. 从零起一份商业模式画布

> "我有一个想法:面向 **<目标用户>**,做一个解决 **<什么痛点>** 的产品,目前在 **<阶段:idea / 还没上线 / 已上线>**。帮我起一份 BMC 草稿。**先把客户细分和价值主张这两块填好**,其它块用 'TBD' 占位,我们一会儿再迭代。"

要点:**先填两块,其他留白**,质量比一股脑填满九宫格高很多。

### 2. 拿现有公司案例改写成自己的

> "我做的事情和 **<Spotify / Uber / Nespresso / 哪家公司>** 比较像,fork 一份它的画布过来,**把客户细分和收入流改成我的:<我和它的差别>**,其它先保留原版做对照。"

要点:案例库里有 22 家公司的真实画布(Uber / Airbnb / Spotify / Nespresso …),fork 出来都是**你的私有副本**,可以随便改。

### 3. 让 AI 判断"我这是什么商业模式"

> "我的业务一句话是 **<...>**,主要靠 **<怎么赚钱>**。在 Long Tail / 免费模式 / 多边平台 / 开放式商业模式 / 解绑 这 5 个范式里,**哪个最贴近我**?另外给我两三家同类公司参考一下。"

要点:适合做**早期定位检验**,看看自己心里那个"我们这是订阅制 / 平台 / freemium" 是不是真的成立。

### 4. 复制一份画布,让 AI 优化某几块

> "现在这个项目,**先存一个快照**(命名 'before-revenue-rework'),然后 **只重写收入流和成本结构这两块**,目标是 **<比如:验证能不能转 SaaS 订阅 / 把毛利从 20% 提到 40% / …>**。其它块不要动。"

要点:"**先存快照**"很关键 —— 万一 AI 改得不好,一句"恢复到那个快照"就回滚。可以连续跑几次得到几个不同的"如果改成 X" 副本对比。

### 5. 跨画布串联(BMC → VPC → JTBD)

> "基于刚才这份 BMC,**接着帮我做一份 Value Proposition Canvas**(用 BMC 里的客户细分填客户侧,用价值主张填价值侧),做完再做一份 JTBD 把客户的 'job to be done' 抽出来。"

### 6. 双语切换(中文 ⇄ 英文)

> "我这份画布现在是中文,帮我加上英文版,**英文版独立一份**,不要覆盖中文。"

---

## 遇到问题怎么办

| 现象 | 怎么办 |
| --- | --- |
| 双击 .app 弹出"已损坏,无法打开" | 没跑那条 `xattr -cr` 命令,回到 §第一步·2 |
| `xattr` 命令报权限错误 | 在前面加 `sudo`:`sudo xattr -cr /Applications/PinGarden.app` |
| AI 加载了技能,但说"找不到 pingarden 命令" | 见上文「**如果 AI 说"找不到 pingarden 命令"**」一节 —— 复制那句话给 AI |
| 应用打开后浏览器是空白 / 报端口冲突 | 端口 4000 被其他程序占用,关掉那个程序后重启 PinGarden |
| AI 完全没反应,不知道有 PinGarden | 检查 `~/.claude/skills/pingarden/SKILL.md` 这个文件存不存在,不存在就重新跑 §第二步的 unzip 命令 |
| 升级技能包但 AI 还在用旧版 | 把新的 zip 重新 unzip 一遍盖上去就行 |

---

## 不想要了,怎么卸载

```bash
# 1. 删除桌面应用
rm -rf /Applications/PinGarden.app

# 2. 删除本地数据(你创建过的项目、画布、快照都在这里)
rm -rf ~/Library/Application\ Support/PinGarden

# 3. 删除 AI 技能包
rm -rf ~/.claude/skills/pingarden
```

如果当时让 AI 帮忙装过 `pingarden` 命令,再多跑一句:`npm uninstall -g @pingarden/cli`。

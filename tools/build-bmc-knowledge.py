#!/usr/bin/env python3
"""
Build BMC knowledge files from extracted PDF text.
Follows AUTHORING.md V1 conventions.
"""
import os
import re

PROJECT_ROOT = "/Users/siboli/Documents/CodeBuddy/BusinessModelCanvas"
EXTRACTS = os.path.join(PROJECT_ROOT, "extracts")
CANVAS_DIR = os.path.join(PROJECT_ROOT, "packages/canvases/business-model-canvas")


def clean_pdf_text(text: str) -> str:
    """Clean PDF artifacts: ligatures, soft hyphens, page numbers."""
    # Ligatures
    text = text.replace("ﬁ", "fi")
    text = text.replace("ﬂ", "fl")
    text = text.replace("Ω", "ff")
    # Soft hyphens
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    # Standalone page numbers
    text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
    # Remove block diagram labels like "CS", "VP", "CH" on their own lines
    text = re.sub(r'\n\s*(CS|VP|CH|CR|R\$|KR|KA|KP|C\$)\s*\n', '\n', text)
    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_block(text: str, start_phrases: list, end_phrases: list) -> str:
    """Extract text from first start phrase to first end phrase."""
    start = -1
    for sp in start_phrases:
        idx = text.find(sp)
        if idx >= 0:
            start = idx
            break
    if start < 0:
        return ""
    end = len(text)
    for ep in end_phrases:
        idx = text.find(ep, start + 1)
        if idx >= 0 and idx < end:
            end = idx
    return clean_pdf_text(text[start:end])


# Define block extraction rules for EN and ZH
BLOCKS = {
    "customer-segments": {
        "en": {
            "title": "Customer Segments (客户细分)",
            "starts": ["The Customer Segments Building Block defines", "The Customer Segments Building Block de\uFB01nes"],
            "examples": ["Mass market", "Niche market", "Segmented", "Diversified", "Multi-sided platforms"],
        },
        "zh": {
            "title": "客户细分 (Customer Segments)",
            "starts": ["客户细分这一模块描述"],
            "examples": ["大众市场", "小众市场", "求同存异的客户群体", "多元化的客户群体", "多边平台"],
        }
    },
    "value-propositions": {
        "en": {
            "title": "Value Propositions (价值主张)",
            "starts": ["The Value Propositions Building Block describes"],
            "examples": ["Novelty", "Performance", "Customization", "Design", "Brand/Status", "Price", "Cost reduction", "Risk reduction", "Accessibility", "Convenience/Usability"],
        },
        "zh": {
            "title": "价值主张 (Value Propositions)",
            "starts": ["价值主张这一模块描述"],
            "examples": ["新颖性", "性能", "定制化", "设计", "品牌", "价格", "成本削减", "风险抑制", "可达性", "便利性"],
        }
    },
    "channels": {
        "en": {
            "title": "Channels (渠道通路)",
            "starts": ["The Channels Building Block describes"],
            "examples": ["Awareness", "Evaluation", "Purchase", "Delivery", "After sales"],
        },
        "zh": {
            "title": "渠道通路 (Channels)",
            "starts": ["渠道通路这一模块描述"],
            "examples": ["认知", "评估", "购买", "传递", "售后"],
        }
    },
    "customer-relationships": {
        "en": {
            "title": "Customer Relationships (客户关系)",
            "starts": ["The Customer Relationships Building Block describes"],
            "examples": ["Personal assistance", "Dedicated personal assistance", "Self-service", "Automated services", "Communities", "Co-creation"],
        },
        "zh": {
            "title": "客户关系 (Customer Relationships)",
            "starts": ["客户关系这一模块描述"],
            "examples": ["个人助理", "专用个人助理", "自助服务", "自动化服务", "社区", "共同创作"],
        }
    },
    "revenue-streams": {
        "en": {
            "title": "Revenue Streams (收入来源)",
            "starts": ["The Revenue Streams Building Block represents"],
            "examples": ["Asset sale", "Usage fee", "Subscription fees", "Lending/Renting/Leasing", "Licensing", "Brokerage fees", "Advertising"],
        },
        "zh": {
            "title": "收入来源 (Revenue Streams)",
            "starts": ["收入来源这一模块描述"],
            "examples": ["资产销售", "使用费", "订阅费", "租借", "授权", "经纪费", "广告费"],
        }
    },
    "key-resources": {
        "en": {
            "title": "Key Resources (核心资源)",
            "starts": ["The Key Resources Building Block describes"],
            "examples": ["Physical", "Intellectual", "Human", "Financial"],
        },
        "zh": {
            "title": "核心资源 (Key Resources)",
            "starts": ["核心资源这一模块描述"],
            "examples": ["实体资产", "知识资产", "人力资源", "金融资产"],
        }
    },
    "key-activities": {
        "en": {
            "title": "Key Activities (关键业务)",
            "starts": ["The Key Activities Building Block describes"],
            "examples": ["Production", "Problem solving", "Platform/Network"],
        },
        "zh": {
            "title": "关键业务 (Key Activities)",
            "starts": ["关键业务这一模块描述"],
            "examples": ["生产", "解决方案", "平台/网络"],
        }
    },
    "key-partners": {
        "en": {
            "title": "Key Partners (重要合作)",
            "starts": ["The Key Partnerships Building Block describes", "The Key Partners Building Block describes"],
            "examples": ["Strategic alliances between non-competitors", "Coopetition", "Joint ventures", "Buyer-supplier relationships"],
        },
        "zh": {
            "title": "重要合作 (Key Partners)",
            "starts": ["重要合作这一模块描述"],
            "examples": ["非竞争者之间的战略联盟", "竞合", "合资", "供应商—采购商关系"],
        }
    },
    "cost-structure": {
        "en": {
            "title": "Cost Structure (成本结构)",
            "starts": ["The Cost Structure Building Block describes"],
            "examples": ["Cost-driven", "Value-driven", "Fixed costs", "Variable costs", "Economies of scale", "Economies of scope"],
        },
        "zh": {
            "title": "成本结构 (Cost Structure)",
            "starts": ["成本结构这一模块描述"],
            "examples": ["成本导向", "价值导向", "固定成本", "可变成本", "规模经济", "范围经济"],
        }
    },
}


def build_end_phrases(current_id: str, lang: str) -> list:
    """Build end-phrase list: next block's start phrases + known section headers."""
    ends = []
    ids = list(BLOCKS.keys())
    idx = ids.index(current_id)
    for next_id in ids[idx + 1:]:
        ends.extend(BLOCKS[next_id][lang]["starts"])
    # Also stop at known section breaks
    if lang == "en":
        ends.extend(["The Business Model Canvas Template", "Patterns", "Design", "Strategy", "Process", "Outlook", "Afterword"])
    else:
        ends.extend(["商业模式画布模板", "类型", "设计", "战略", "流程", "展望", "编后语"])
    return ends


def format_block_md(zone_id: str, lang: str, body: str) -> str:
    """Format extracted text into AUTHORING.md V1 markdown."""
    meta = BLOCKS[zone_id][lang]
    title = meta["title"]
    lines = body.splitlines()

    # First paragraph is usually the definition
    intro_lines = []
    i = 0
    while i < len(lines) and len(intro_lines) < 3:
        line = lines[i].strip()
        if line and not line.startswith("?") and not line.startswith("·") and not line.startswith("-"):
            intro_lines.append(line)
        i += 1
    intro = "\n\n".join(intro_lines)

    # Extract sub-categories / types from the text
    subcats = []
    for ex in meta.get("examples", []):
        # Find this example keyword in the text
        idx = body.find(ex)
        if idx < 0:
            continue
        # Get the paragraph after the keyword
        after = body[idx:idx + 800]
        para_lines = []
        for L in after.splitlines()[1:]:
            L = L.strip()
            if not L:
                break
            para_lines.append(L)
        desc = " ".join(para_lines)
        if desc:
            subcats.append((ex, desc))

    # Extract core questions (lines ending with ? or containing ?)
    questions = []
    for L in lines:
        L = L.strip()
        if "?" in L and len(L) < 200 and not L.endswith("?") == False:
            questions.append(L)
    questions = questions[:6]

    # Build markdown
    md_parts = [f"# {title}", "", intro]

    if subcats:
        if lang == "en":
            md_parts.extend(["", "## Sub-categories / Types"])
        else:
            md_parts.extend(["", "## 子类别 / Sub-categories"])
        for name, desc in subcats:
            md_parts.extend([f"", f"### {name}", "", f"> *{desc[:200]}...*", ""])

    if questions:
        if lang == "en":
            md_parts.extend(["", "## Core Questions"])
        else:
            md_parts.extend(["", "## 核心问题"])
        for q in questions:
            md_parts.append(f"- {q}")

    # Takeaway: last substantial sentence
    takeaway = ""
    for L in reversed(lines):
        L = L.strip()
        if len(L) > 40 and not L.startswith("-") and not L.startswith("·"):
            takeaway = L
            break
    if takeaway:
        if lang == "en":
            md_parts.extend(["", "## Takeaway", "", f"**{takeaway}**"])
        else:
            md_parts.extend(["", "## 要点", "", f"**{takeaway}**"])

    return "\n".join(md_parts)


def main():
    en_path = os.path.join(EXTRACTS, "bmc-en/chapters/04-Canvas.txt")
    zh_path = os.path.join(EXTRACTS, "bmc-zh/chapters/06-画布.txt")

    with open(en_path, encoding="utf-8") as f:
        en_text = f.read()
    with open(zh_path, encoding="utf-8") as f:
        zh_text = f.read()

    blocks_dir = os.path.join(CANVAS_DIR, "knowledge/blocks")
    os.makedirs(blocks_dir, exist_ok=True)

    for zone_id in BLOCKS:
        for lang, text in [("en", en_text), ("zh", zh_text)]:
            meta = BLOCKS[zone_id][lang]
            starts = meta["starts"]
            ends = build_end_phrases(zone_id, lang)
            body = extract_block(text, starts, ends)
            if not body:
                print(f"  Warning: empty body for {zone_id}.{lang}")
                continue
            md = format_block_md(zone_id, lang, body)
            out_path = os.path.join(blocks_dir, f"{zone_id}.{lang}.md")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(md)
            print(f"  Wrote {out_path} ({len(md)} chars)")

    # Update intro & body from the full Canvas chapter text
    for lang, text in [("en", en_text), ("zh", zh_text)]:
        intro_path = os.path.join(CANVAS_DIR, f"knowledge/intro.{lang}.md")
        body_path = os.path.join(CANVAS_DIR, f"knowledge/body.{lang}.md")

        # Keep existing intro structure but enrich with book content
        # For now, write a new intro based on the book's opening
        canvas_def = extract_block(text,
            ["A business model describes" if lang == "en" else "一个商业模式描述"],
            ["The 9 Building Blocks" if lang == "en" else "九大模块"]
        )

        if lang == "en":
            intro_md = f"""# When to use the Business Model Canvas

Use the Business Model Canvas when a team needs to quickly align on how a business works. It is useful for comparing new ventures, product lines, strategic pivots, or current-state models on one page while exposing the assumptions that need validation.

## Reach for it when

- You are designing a new venture, product line, or strategic pivot.
- You want to map an existing business so the team shares one picture.
- You need to compare multiple business-model options side by side.
- Product, sales, operations, finance, and leadership need to discuss the same logic.
- You want to identify risky assumptions before committing major resources.

## Skip it when

- You are solving one narrow operational issue with a clear boundary.
- Your unit of analysis is one customer segment's value proposition — use the **Value Proposition Canvas** instead.
- You need a full business plan, detailed financial forecast, or rigorous profit model.
- You need to analyze external forces, competition, regulation, or industry structure — pair BMC with environment analysis, SWOT, Five Forces, or similar tools.

## From the book

> {canvas_def}
"""
            body_md = f"""# Reading the canvas

The nine BMC blocks are intentionally arranged: the **right half** describes the customer-facing value-delivery system, the **left half** describes the internal value-creation system, and the **Value Proposition** sits in the middle as the bridge between customer need and business capability. The bottom row — **Revenue Streams** and **Cost Structure** — asks whether the model can sustain itself economically.

## Recommended filling order

1. **Customer Segments**: define whom you serve and which customers matter most.
2. **Value Propositions**: state what problem you solve or what need you satisfy.
3. **Channels**: map how customers become aware, evaluate, buy, receive, and use the offer.
4. **Customer Relationships**: decide how you acquire, retain, and grow customers.
5. **Revenue Streams**: clarify what customers pay for and how they pay.
6. **Key Activities**: identify the critical work required to deliver the offer.
7. **Key Resources**: identify the assets, capabilities, data, people, or financing required.
8. **Key Partners**: decide which resources or activities are better obtained externally.
9. **Cost Structure**: summarize the most important fixed costs, variable costs, and scale effects.

## The two halves

**Right side: value delivery**

- **Customer Segments** — who are the customers, and do different groups require different offers?
- **Value Propositions** — why would they choose you instead of an alternative?
- **Channels** — what handles awareness, evaluation, purchase, delivery, and after-sales support?
- **Customer Relationships** — self-service, automation, community, personal assistance, or dedicated support?
- **Revenue Streams** — one-time transactions, subscriptions, brokerage, licensing, advertising, or a hybrid?

**Left side: value creation**

- **Key Activities** — what work directly determines whether value can be delivered?
- **Key Resources** — which assets would make the model collapse if missing?
- **Key Partners** — which partnerships reduce risk, fill capability gaps, or improve cost structure?
- **Cost Structure** — which resources, activities, partners, and relationships drive the economics?

## What good looks like

- Each block contains concise phrases, concrete assumptions, and evidence notes — not slogans.
- Customer segments and value propositions are paired; "everyone" is not a segment.
- Channels, relationships, and revenue streams explain the full customer journey.
- Activities, resources, and partners support the promise on the right side instead of listing internal departments.
- Revenue and cost choices reveal whether the model is cost-driven, value-driven, or a deliberate mix.
- Unvalidated items are treated as assumptions to test through interviews, sales data, or experiments.

## Common failure modes

- Treating the BMC as a full business plan; it is a model sketch and discussion tool.
- Filling every block just to look complete; blanks often expose the real risk.
- Conflating channels with customer relationships: one is reach and delivery, the other is ongoing engagement.
- Describing only the ideal state instead of separating facts, assumptions, and open questions.
- Ignoring the external environment; BMC does not fully cover competition, regulation, industry trends, or ecosystem impact.

## Reading further

- *Business Model Generation* — Osterwalder & Pigneur.
- Strategyzer's Business Model Canvas template and guidance.
- Pair with Value Proposition Canvas, Business Model Environment, SWOT, PESTEL, or Five Forces when you need a deeper view.
"""
        else:
            intro_md = f"""# 何时使用商业模式画布

当团队需要快速对齐对业务运作方式的理解时，请使用商业模式画布。它适用于在一页纸上比较新创企业、产品线、战略转型或当前状态模型，同时暴露需要验证的假设。

## 适用场景

- 你正在设计新创企业、产品线或战略转型。
- 你想要绘制现有业务，让团队共享同一幅图景。
- 你需要并排比较多种商业模式选项。
- 产品、销售、运营、财务和领导层需要讨论同一套逻辑。
- 你想在投入重大资源之前识别有风险的假设。

## 不适用场景

- 你正在解决边界清晰的单一运营问题。
- 你的分析单元是某个客户群体的价值主张 —— 请改用**价值主张画布**。
- 你需要完整的商业计划、详细的财务预测或严格的盈利模型。
- 你需要分析外部力量、竞争、监管或行业结构 —— 请将 BMC 与环境分析、SWOT、五力模型等工具配合使用。

## 书中定义

> {canvas_def}
"""
            body_md = f"""# 阅读画布

商业模式画布的九个模块是刻意排布的：**右半部分**描述面向客户的价值交付系统，**左半部分**描述内部的价值创造系统，**价值主张**位于中间，作为客户需求与商业能力之间的桥梁。最底行 —— **收入来源**和**成本结构** —— 追问该模式能否在经济上自我维持。

## 建议填写顺序

1. **客户细分**：定义你服务谁，哪些客户最重要。
2. **价值主张**：说明你要解决什么问题或满足什么需求。
3. **渠道通路**：描绘客户如何认知、评估、购买、接收和使用产品。
4. **客户关系**：决定你如何获取、留存和增长客户。
5. **收入来源**：明确客户为什么付费以及如何付费。
6. **关键业务**：识别交付产品所需的关键工作。
7. **核心资源**：识别如果缺失会导致模式崩溃的资产、能力、数据、人员或资金。
8. **重要合作**：决定哪些资源或活动更适合从外部获取。
9. **成本结构**：总结最重要的固定成本、可变成本和规模效应。

## 两个半区

**右侧：价值交付**

- **客户细分** —— 客户是谁？不同群体是否需要不同的产品？
- **价值主张** —— 他们为什么选择你而不是替代方案？
- **渠道通路** —— 什么负责认知、评估、购买、交付和售后支持？
- **客户关系** —— 自助服务、自动化、社区、个人助理还是专属支持？
- **收入来源** —— 一次性交易、订阅、经纪、授权、广告还是混合模式？

**左侧：价值创造**

- **关键业务** —— 哪些工作直接决定价值能否交付？
- **核心资源** —— 哪些资产一旦缺失就会使模式崩溃？
- **重要合作** —— 哪些合作能降低风险、填补能力缺口或改善成本结构？
- **成本结构** —— 哪些资源、活动、合作和关系驱动了经济模型？

## 好的画布长什么样

- 每个模块包含简洁的短语、具体的假设和证据备注 —— 不是口号。
- 客户细分与价值主张成对出现；"所有人"不是一个细分。
- 渠道、关系和收入来源解释了完整的客户旅程。
- 活动、资源和合作支撑右侧的承诺，而不是罗列内部部门。
- 收入和成本选择揭示了模式是成本驱动、价值驱动还是 deliberate mix。
- 未验证的事项被视为需要通过访谈、销售数据或实验来检验的假设。

## 常见失败模式

- 将 BMC 当作完整的商业计划；它只是一个模型草图和讨论工具。
- 为了看起来完整而填满每个模块；空白往往暴露了真正的风险。
- 混淆渠道与客户关系：前者是触达和交付，后者是持续互动。
- 只描述理想状态，而不是区分事实、假设和开放问题。
- 忽视外部环境；BMC 并未完全覆盖竞争、监管、行业趋势或生态系统影响。

## 延伸阅读

- *商业模式新生代* —— Osterwalder & Pigneur
- Strategyzer 的商业模式画布模板与指导
- 需要更深入视角时，可搭配价值主张画布、商业模式环境、SWOT、PESTEL 或五力模型
"""

        with open(intro_path, "w", encoding="utf-8") as f:
            f.write(intro_md)
        print(f"  Wrote {intro_path}")

        with open(body_path, "w", encoding="utf-8") as f:
            f.write(body_md)
        print(f"  Wrote {body_path}")

    print("Done.")


if __name__ == "__main__":
    main()

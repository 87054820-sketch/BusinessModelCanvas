#!/usr/bin/env python3
"""
Build BMC knowledge files from extracted PDF text (v2).
Uses positional anchors for reliable block extraction.
"""
import os
import re

PROJECT_ROOT = "/Users/siboli/Documents/CodeBuddy/BusinessModelCanvas"
EXTRACTS = os.path.join(PROJECT_ROOT, "extracts")
CANVAS_DIR = os.path.join(PROJECT_ROOT, "packages/canvases/business-model-canvas")


def clean_pdf_text(text: str) -> str:
    """Clean PDF artifacts."""
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("Ω", "ff")
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
    text = re.sub(r'\n\s*(CS|VP|CH|CR|R\$|KR|KA|KP|C\$)\s*\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_en_blocks(text: str) -> dict:
    """Extract EN blocks using known section headers."""
    # Map block_id -> list of possible start phrases
    anchors = {
        "customer-segments": ["The Customer Segments Building Block defi nes", "The Customer Segments Building Block defines"],
        "value-propositions": ["The Value Propositions Building Block describes"],
        "channels": ["The Channels Building Block describes"],
        "customer-relationships": ["The Customer Relationships Building Block describes"],
        "revenue-streams": ["The Revenue Streams Building Block represents"],
        "key-resources": ["The Key Resources Building Block describes"],
        "key-activities": ["The Key Activities Building Block describes"],
        "key-partners": ["The Key Partnerships Building Block describes", "The Key Partners Building Block describes"],
        "cost-structure": ["The Cost Structure Building Block describes", "The Cost Structure describes"],
    }
    # Build ordered list of all anchors for end-detection
    all_anchors = []
    for bid, phrases in anchors.items():
        for p in phrases:
            all_anchors.append((bid, p))

    blocks = {}
    for bid, phrases in anchors.items():
        start = -1
        used_phrase = ""
        for p in phrases:
            idx = text.find(p)
            if idx >= 0:
                start = idx
                used_phrase = p
                break
        if start < 0:
            print(f"  Warning: could not find start for {bid}")
            continue

        # Find next anchor after this one
        end = len(text)
        for other_bid, other_phrases in anchors.items():
            if other_bid == bid:
                continue
            for op in other_phrases:
                idx = text.find(op, start + len(used_phrase))
                if idx >= 0 and idx < end:
                    end = idx
        # Also stop at major section breaks
        for break_word in ["The Business Model Canvas Template", "Patterns", "Design", "Strategy", "Process", "Outlook", "Afterword"]:
            idx = text.find(break_word, start + len(used_phrase))
            if idx >= 0 and idx < end:
                end = idx

        blocks[bid] = clean_pdf_text(text[start:end])
    return blocks


def extract_zh_blocks(text: str) -> dict:
    """Extract ZH blocks using positional anchors."""
    # Ordered list of (block_id, start_phrase)
    # These are the "detailed description" headers, not the overview list
    anchors = [
        ("customer-segments", "客户细分（customer segments）\n客户细分这一模块描述"),
        ("value-propositions", "价值主张（value propositions）\n价值主张这一模块描述"),
        ("channels", "渠道通路（channels）\n渠道通路这一模块描述"),
        ("customer-relationships", "客户关系（customer relationships）\n客户关系模块描述"),
        ("revenue-streams", "收入来源（revenue streams）\n收入来源这一模块代表"),
        ("key-resources", "核心资源（key resources）\n核心资源这个模块描述"),
        ("key-activities", "关键业务（key activities）\n关键业务这个模块描述"),
        ("key-partners", "重要合作（key partnerships）\n重要合作这个模块描述"),
        ("cost-structure", "成本结构（cost structure）\n成本结构描述"),
    ]

    blocks = {}
    for i, (bid, start_phrase) in enumerate(anchors):
        start = text.find(start_phrase)
        if start < 0:
            # Fallback: try just the Chinese name with English in parens
            fallback = start_phrase.split("\n")[0]
            start = text.find(fallback)
            if start < 0:
                print(f"  Warning: could not find start for {bid}")
                continue

        end = len(text)
        for j in range(i + 1, len(anchors)):
            _, next_phrase = anchors[j]
            idx = text.find(next_phrase, start + 1)
            if idx >= 0 and idx < end:
                end = idx
        # Also stop at section breaks
        for break_word in ["类型", "设计", "战略", "流程", "展望", "编后语"]:
            idx = text.find(break_word, start + 1)
            if idx >= 0 and idx < end:
                end = idx

        blocks[bid] = clean_pdf_text(text[start:end])
    return blocks


def format_block_md(zone_id: str, lang: str, body: str) -> str:
    """Format into AUTHORING.md V1 markdown."""
    titles = {
        "customer-segments": {"en": "Customer Segments (客户细分)", "zh": "客户细分 (Customer Segments)"},
        "value-propositions": {"en": "Value Propositions (价值主张)", "zh": "价值主张 (Value Propositions)"},
        "channels": {"en": "Channels (渠道通路)", "zh": "渠道通路 (Channels)"},
        "customer-relationships": {"en": "Customer Relationships (客户关系)", "zh": "客户关系 (Customer Relationships)"},
        "revenue-streams": {"en": "Revenue Streams (收入来源)", "zh": "收入来源 (Revenue Streams)"},
        "key-resources": {"en": "Key Resources (核心资源)", "zh": "核心资源 (Key Resources)"},
        "key-activities": {"en": "Key Activities (关键业务)", "zh": "关键业务 (Key Activities)"},
        "key-partners": {"en": "Key Partners (重要合作)", "zh": "重要合作 (Key Partners)"},
        "cost-structure": {"en": "Cost Structure (成本结构)", "zh": "成本结构 (Cost Structure)"},
    }
    title = titles[zone_id][lang]
    lines = [l.strip() for l in body.splitlines() if l.strip()]

    # Intro: first 1-3 substantial paragraphs
    intro_lines = []
    for L in lines:
        if len(L) > 30 and not L.startswith("-") and not L.startswith("·") and "?" not in L:
            intro_lines.append(L)
        if len(intro_lines) >= 3:
            break
    intro = "\n\n".join(intro_lines)

    # Sub-categories: lines that look like bold labels or numbered items
    subcats = []
    for L in lines:
        # EN: "Mass market" or "Mass Market"
        # ZH: "大众市场" or lines with parentheses
        m = re.match(r'^([A-Z][a-zA-Z\s]+|[^\s]{2,10})\s*[（(]', L)
        if m and len(L) > 50:
            name = m.group(1).strip()
            desc = L[len(name):].strip("（(）) ")
            subcats.append((name, desc))
    if not subcats:
        # Fallback: look for bullet-like structure
        for L in lines:
            if (L.startswith("-") or L.startswith("·")) and len(L) > 40:
                parts = L[1:].strip().split("，", 1)
                if len(parts) == 2:
                    subcats.append((parts[0], parts[1]))

    # Core questions
    questions = [L for L in lines if "?" in L and len(L) < 180]
    questions = questions[:6]

    # Takeaway
    takeaway = ""
    for L in reversed(lines):
        if len(L) > 40 and not L.startswith("-") and "?" not in L:
            takeaway = L
            break

    md_parts = [f"# {title}", "", intro]

    if subcats:
        md_parts.extend(["", "## 子类别 / Sub-categories" if lang == "zh" else "## Sub-categories / Types"])
        for name, desc in subcats[:8]:
            md_parts.extend(["", f"### {name}", "", f"> *{desc[:220]}*", ""])

    if questions:
        md_parts.extend(["", "## 核心问题" if lang == "zh" else "## Core Questions"])
        for q in questions:
            md_parts.append(f"- {q}")

    if takeaway:
        md_parts.extend(["", "## 要点" if lang == "zh" else "## Takeaway", "", f"**{takeaway}**"])

    return "\n".join(md_parts)


def main():
    en_path = os.path.join(EXTRACTS, "bmc-en/chapters/04-Canvas.txt")
    zh_path = os.path.join(EXTRACTS, "bmc-zh/chapters/06-画布.txt")

    with open(en_path, encoding="utf-8") as f:
        en_text = f.read()
    with open(zh_path, encoding="utf-8") as f:
        zh_text = f.read()

    print("Extracting EN blocks...")
    en_blocks = extract_en_blocks(en_text)
    print("Extracting ZH blocks...")
    zh_blocks = extract_zh_blocks(zh_text)

    blocks_dir = os.path.join(CANVAS_DIR, "knowledge/blocks")
    os.makedirs(blocks_dir, exist_ok=True)

    for zone_id in ["customer-segments", "value-propositions", "channels", "customer-relationships",
                    "revenue-streams", "key-resources", "key-activities", "key-partners", "cost-structure"]:
        for lang, blocks in [("en", en_blocks), ("zh", zh_blocks)]:
            body = blocks.get(zone_id, "")
            if not body:
                print(f"  Skipping {zone_id}.{lang} (empty)")
                continue
            md = format_block_md(zone_id, lang, body)
            out_path = os.path.join(blocks_dir, f"{zone_id}.{lang}.md")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(md)
            print(f"  Wrote {out_path} ({len(md)} chars)")

    print("Done.")


if __name__ == "__main__":
    main()

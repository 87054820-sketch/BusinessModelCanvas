#!/usr/bin/env python3
"""
Split BMC Canvas chapter text into per-block markdown files.
Also creates the book/ directory structure.
"""
import json
import os
import re
import shutil

PROJECT_ROOT = "/Users/siboli/Documents/CodeBuddy/BusinessModelCanvas"
EXTRACTS = os.path.join(PROJECT_ROOT, "extracts")
CANVAS_DIR = os.path.join(PROJECT_ROOT, "packages/canvases/business-model-canvas")


def clean_text(text: str) -> str:
    """Remove page numbers, headers, fix hyphenation."""
    # Remove standalone page numbers (lines with just digits)
    text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
    # Remove hyphenated line breaks like "di\u2126erent" -> "different"
    text = text.replace("Ω", "ff")  # common PDF ligature issue in this book
    text = text.replace("ﬁ", "fi")
    text = text.replace("ﬂ", "fl")
    # Remove soft hyphens followed by newlines
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    text = re.sub(r'(\w)\n(\w)', r'\1 \2', text)  # join broken lines
    # Collapse multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_block_sections(text: str, lang: str):
    """Extract per-block sections from BMC Canvas chapter."""
    if lang == "en":
        blocks = [
            ("customer-segments", "Customer Segments",
             r"The Customer Segments Building Block defines"),
            ("value-propositions", "Value Propositions",
             r"The Value Propositions Building Block describes"),
            ("channels", "Channels",
             r"The Channels Building Block describes"),
            ("customer-relationships", "Customer Relationships",
             r"The Customer Relationships Building Block describes"),
            ("revenue-streams", "Revenue Streams",
             r"The Revenue Streams Building Block represents"),
            ("key-resources", "Key Resources",
             r"The Key Resources Building Block describes"),
            ("key-activities", "Key Activities",
             r"The Key Activities Building Block describes"),
            ("key-partners", "Key Partners",
             r"The Key Partnerships Building Block describes"),
            ("cost-structure", "Cost Structure",
             r"The Cost Structure Building Block describes"),
        ]
    else:
        blocks = [
            ("customer-segments", "客户细分", r"客户细分构造块"),
            ("value-propositions", "价值主张", r"价值主张构造块"),
            ("channels", "渠道通路", r"渠道通路构造块"),
            ("customer-relationships", "客户关系", r"客户关系构造块"),
            ("revenue-streams", "收入来源", r"收入来源构造块"),
            ("key-resources", "核心资源", r"核心资源构造块"),
            ("key-activities", "关键业务", r"关键业务构造块"),
            ("key-partners", "重要合作", r"重要合作构造块"),
            ("cost-structure", "成本结构", r"成本结构构造块"),
        ]

    sections = {}
    for zone_id, title, start_pat in blocks:
        m = re.search(start_pat, text, re.IGNORECASE)
        if not m:
            print(f"  Warning: could not find start for {zone_id}")
            continue
        start = m.start()
        # Find next block start or end of text
        end = len(text)
        for _, _, next_pat in blocks:
            if next_pat == start_pat:
                continue
            nm = re.search(next_pat, text[start + 1:], re.IGNORECASE)
            if nm:
                candidate = start + 1 + nm.start()
                if candidate < end:
                    end = candidate
        sections[zone_id] = clean_text(text[start:end])
    return sections


def build_knowledge_block(zone_id: str, title: str, body: str, lang: str) -> str:
    """Format a block markdown following AUTHORING.md conventions."""
    if lang == "en":
        h1 = f"# {title}"
        intro = body[:800].strip()
        # Find sub-categories by looking for bullet patterns or key questions
        lines = body.splitlines()
        questions = [l for l in lines if l.strip().startswith("?") or "?" in l and len(l) < 200]
        questions_md = "\n".join(f"- {q.strip()}" for q in questions[:5])
        takeaway = lines[-1] if lines else ""
        md = f"""{h1}

{intro}

## Main Questions

{questions_md}

## How it flows into BMC

{takeaway}
"""
    else:
        h1 = f"# {title}"
        intro = body[:800].strip()
        lines = body.splitlines()
        questions = [l for l in lines if "?" in l and len(l) < 200]
        questions_md = "\n".join(f"- {q.strip()}" for q in questions[:5])
        takeaway = lines[-1] if lines else ""
        md = f"""{h1}

{intro}

## 核心问题

{questions_md}

## 如何流向 BMC

{takeaway}
"""
    return md


def main():
    # --- EN ---
    en_txt_path = os.path.join(EXTRACTS, "bmc-en/chapters/04-Canvas.txt")
    zh_txt_path = os.path.join(EXTRACTS, "bmc-zh/chapters/06-画布.txt")

    with open(en_txt_path, encoding="utf-8") as f:
        en_text = f.read()
    with open(zh_txt_path, encoding="utf-8") as f:
        zh_text = f.read()

    print("Extracting EN block sections...")
    en_blocks = extract_block_sections(en_text, "en")
    print("Extracting ZH block sections...")
    zh_blocks = extract_block_sections(zh_text, "zh")

    # Track A: update existing blocks/*.md
    blocks_dir = os.path.join(CANVAS_DIR, "knowledge/blocks")
    os.makedirs(blocks_dir, exist_ok=True)

    for zone_id, title, _ in [
        ("customer-segments", "Customer Segments", None),
        ("value-propositions", "Value Propositions", None),
        ("channels", "Channels", None),
        ("customer-relationships", "Customer Relationships", None),
        ("revenue-streams", "Revenue Streams", None),
        ("key-resources", "Key Resources", None),
        ("key-activities", "Key Activities", None),
        ("key-partners", "Key Partners", None),
        ("cost-structure", "Cost Structure", None),
    ]:
        en_body = en_blocks.get(zone_id, "")
        zh_body = zh_blocks.get(zone_id, "")
        if en_body:
            path = os.path.join(blocks_dir, f"{zone_id}.en.md")
            with open(path, "w", encoding="utf-8") as f:
                f.write(build_knowledge_block(zone_id, title, en_body, "en"))
            print(f"  Wrote {path}")
        if zh_body:
            path = os.path.join(blocks_dir, f"{zone_id}.zh.md")
            with open(path, "w", encoding="utf-8") as f:
                f.write(build_knowledge_block(zone_id, title, zh_body, "zh"))
            print(f"  Wrote {path}")

    # Track B: create book/ structure
    book_dir = os.path.join(CANVAS_DIR, "knowledge/book")
    for lang in ["en", "zh"]:
        lang_dir = os.path.join(book_dir, lang)
        os.makedirs(lang_dir, exist_ok=True)

    # Copy chapters as markdown
    for src, dst_name in [
        ("bmc-en/chapters/04-Canvas.txt", "book/en/01-canvas.md"),
        ("bmc-en/chapters/05-Patterns.txt", "book/en/02-patterns.md"),
        ("bmc-en/chapters/06-Design.txt", "book/en/03-design.md"),
        ("bmc-en/chapters/07-Strategy.txt", "book/en/04-strategy.md"),
        ("bmc-en/chapters/08-Process.txt", "book/en/05-process.md"),
        ("bmc-zh/chapters/06-画布.txt", "book/zh/01-画布.md"),
        ("bmc-zh/chapters/07-类型.txt", "book/zh/02-类型.md"),
        ("bmc-zh/chapters/08-设计.txt", "book/zh/03-设计.md"),
        ("bmc-zh/chapters/09-战略.txt", "book/zh/04-战略.md"),
        ("bmc-zh/chapters/10-流程.txt", "book/zh/05-流程.md"),
    ]:
        src_path = os.path.join(EXTRACTS, src)
        dst_path = os.path.join(CANVAS_DIR, "knowledge", dst_name)
        if os.path.exists(src_path):
            with open(src_path, encoding="utf-8") as f:
                text = f.read()
            with open(dst_path, "w", encoding="utf-8") as f:
                f.write(clean_text(text))
            print(f"  Wrote {dst_path}")

    # Copy selected images (>50KB, reasonable dimensions)
    assets_dir = os.path.join(book_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)
    for lang, img_src in [("en", "bmc-en/images"), ("zh", "bmc-zh/images")]:
        src_dir = os.path.join(EXTRACTS, img_src)
        if not os.path.exists(src_dir):
            continue
        copied = 0
        for fname in os.listdir(src_dir):
            fpath = os.path.join(src_dir, fname)
            if os.path.getsize(fpath) > 50000:  # >50KB = likely a real diagram
                dst = os.path.join(assets_dir, f"{lang}-{fname}")
                shutil.copy2(fpath, dst)
                copied += 1
        print(f"  Copied {copied} images from {lang}")

    print("Done.")


if __name__ == "__main__":
    main()

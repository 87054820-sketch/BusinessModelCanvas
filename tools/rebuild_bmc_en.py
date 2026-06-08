#!/usr/bin/env python3
"""
Rebuild BMC EN book knowledge base from raw PDF extraction.
"""
import json, os, re, shutil, textwrap, glob
from pathlib import Path

BASE = Path("/Users/siboli/Documents/CodeBuddy/BusinessModelCanvas")
SRC_MD = BASE / "packages/canvases/business-model-canvas/knowledge/book/en"
SRC_ASSETS = BASE / "packages/canvases/business-model-canvas/knowledge/book/assets"
TMP_PAGES = BASE / "tmp"
KNOWLEDGE_ASSETS = BASE / "packages/canvases/business-model-canvas/knowledge/assets"
OUT = BASE / "packages/canvases/business-model-canvas/knowledge/book/en-new"

# Chapter definitions with approximate page ranges
CHAPTERS = [
    {"file": "01-canvas.md",   "slug": "01-canvas",   "title": "Canvas",   "page_start": 15, "page_end": 51},
    {"file": "02-patterns.md", "slug": "02-patterns", "title": "Patterns", "page_start": 52, "page_end": 125},
    {"file": "03-design.md",   "slug": "03-design",   "title": "Design",   "page_start": 126, "page_end": 199},
    {"file": "04-strategy.md", "slug": "04-strategy", "title": "Strategy", "page_start": 200, "page_end": 239},
    {"file": "05-process.md",  "slug": "05-process",  "title": "Process",  "page_start": 240, "page_end": 260},
]

def load_meta(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def gather_images():
    """Load all image metadata, index by page."""
    images = []
    for meta_path in sorted(SRC_ASSETS.glob("*.meta.json")):
        meta = load_meta(meta_path)
        img_path = SRC_ASSETS / meta["file"]
        if not img_path.exists():
            continue
        meta["_path"] = str(img_path)
        images.append(meta)
    return images

ALL_IMAGES = gather_images()

def images_for_chapter(page_start, page_end, max_images=12):
    """Select best images for a chapter page range."""
    candidates = []
    for img in ALL_IMAGES:
        p = img.get("source_page", 0)
        if page_start <= p <= page_end:
            candidates.append(img)
    
    # Priority: template > example > process > comparison > diagram > decorative
    priority = {"template": 0, "example": 1, "process": 2, "comparison": 3, "diagram": 4, "decorative": 99}
    candidates.sort(key=lambda x: (priority.get(x.get("category", "diagram"), 5), x.get("source_page", 0)))
    
    selected = []
    seen_cats = set()
    for img in candidates:
        cat = img.get("category", "diagram")
        if cat == "decorative":
            continue
        # Deduplicate by category+page roughly
        key = (cat, img.get("source_page", 0))
        if key in seen_cats and len([s for s in selected if s.get("category") == cat]) >= 2:
            continue
        seen_cats.add(key)
        selected.append(img)
        if len(selected) >= max_images:
            break
    return selected

def clean_text(raw):
    """Unwrap hard line breaks, remove garbage."""
    lines = raw.splitlines()
    # Remove obvious garbage patterns
    result = []
    skip_patterns = [
        re.compile(r'^\s*Copyright\s+©', re.I),
        re.compile(r'^\s*All rights reserved', re.I),
        re.compile(r'^\s*ISBN', re.I),
        re.compile(r'^\s*Wiley', re.I),
        re.compile(r'^\s*Printed in', re.I),
        re.compile(r'^\s*Also by\s+', re.I),
        re.compile(r'^\s*Visit our website', re.I),
        re.compile(r'^\s*BUSINESS MODEL GENERATION\s*$', re.I),
    ]
    for line in lines:
        if any(p.match(line) for p in skip_patterns):
            continue
        result.append(line)
    
    # Paragraph unwrapping: single newlines within paragraphs -> space
    # But preserve paragraph breaks (blank lines), headings, list items
    out_lines = []
    buf = ""
    for line in result:
        stripped = line.strip()
        if not stripped:
            if buf:
                out_lines.append(buf)
                buf = ""
            out_lines.append("")
            continue
        # Preserve headings
        if stripped.startswith('#'):
            if buf:
                out_lines.append(buf)
                buf = ""
            out_lines.append(stripped)
            continue
        # Preserve list items
        if re.match(r'^[-*•]\s', stripped) or re.match(r'^\d+\.\s', stripped):
            if buf:
                out_lines.append(buf)
                buf = ""
            out_lines.append(stripped)
            continue
        
        # Check if line ends with sentence-ending punctuation or is very short
        # If it's a continuation, append to buffer
        if buf:
            # Heuristic: if current line starts with lowercase or the buffer doesn't end with .!?:
            # and line is not all caps, join
            if (not stripped[0].isupper() and not stripped[0].isdigit()) or \
               (buf and buf[-1] not in '.!?;:' and len(buf) < 120):
                buf += " " + stripped
            else:
                out_lines.append(buf)
                buf = stripped
        else:
            buf = stripped
    if buf:
        out_lines.append(buf)
    
    return "\n".join(out_lines)

def detect_sections(text, chapter_title):
    """Split text into logical sections and return structured content."""
    lines = text.splitlines()
    sections = []
    current = {"title": "Introduction", "content": []}
    
    section_patterns = [
        # Chapter 1: 9 Building Blocks
        (r'^The 9 Building Blocks', 'The 9 Building Blocks'),
        (r'^Customer Segments\s+CS\s*$', 'Customer Segments'),
        (r'^Value Propositions\s+VP', 'Value Propositions'),
        (r'^Channels\s+CH', 'Channels'),
        (r'^Customer Relationships\s+CR', 'Customer Relationships'),
        (r'^Revenue Streams\s+R\$', 'Revenue Streams'),
        (r'^Key Resources\s+KR', 'Key Resources'),
        (r'^Key Activities\s+KA', 'Key Activities'),
        (r'^Key Partnerships\s+KP', 'Key Partnerships'),
        (r'^Cost Structure\s+C\$', 'Cost Structure'),
        (r'^The Business Model Canvas\s*$', 'The Business Model Canvas'),
        (r'^Example: Apple iPod/iTunes', 'Example: Apple iPod/iTunes'),
        (r'^HOW DO YOU USE THE CANVAS', 'How to Use the Canvas'),
        
        # Chapter 2: Patterns
        (r'^Unbundling Business Models', 'Unbundling Business Models'),
        (r'^The Long Tail', 'The Long Tail'),
        (r'^Multi-Sided Platforms', 'Multi-Sided Platforms'),
        (r'^FREE as a Business Model', 'FREE as a Business Model'),
        (r'^Open Business Models', 'Open Business Models'),
        
        # Chapter 3: Design
        (r'^Customer Insights', 'Customer Insights'),
        (r'^Ideation', 'Ideation'),
        (r'^Visual Thinking', 'Visual Thinking'),
        (r'^Prototyping', 'Prototyping'),
        (r'^Storytelling', 'Storytelling'),
        (r'^Scenarios', 'Scenarios'),
        
        # Chapter 4: Strategy
        (r'^Business Model Environment', 'Business Model Environment'),
        (r'^Evaluating Business Models', 'Evaluating Business Models'),
        (r'^Blue Ocean Strategy', 'Blue Ocean Strategy'),
        (r'^Managing Multiple Business Models', 'Managing Multiple Business Models'),
        
        # Chapter 5: Process
        (r'^Business Model Design Process', 'Business Model Design Process'),
        (r'^Design Attitude', 'Design Attitude'),
        (r'^Mobilize', 'Mobilize'),
        (r'^Understand', 'Understand'),
        (r'^Design', 'Design'),
        (r'^Implement', 'Implement'),
        (r'^Manage', 'Manage'),
    ]
    
    for line in lines:
        matched = False
        for pattern, title in section_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                if current["content"]:
                    sections.append(current)
                current = {"title": title, "content": []}
                matched = True
                break
        if not matched:
            current["content"].append(line)
    
    if current["content"]:
        sections.append(current)
    
    # If no sections detected, just return one big section
    if not sections:
        sections = [{"title": "Overview", "content": lines}]
    
    return sections

def slugify_section(title):
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

def build_chapter(ch_info, images):
    slug = ch_info["slug"]
    title = ch_info["title"]
    page_start = ch_info["page_start"]
    page_end = ch_info["page_end"]
    
    # Read raw
    raw_path = SRC_MD / ch_info["file"]
    with open(raw_path, 'r', encoding='utf-8') as f:
        raw = f.read()
    
    # Clean text
    cleaned = clean_text(raw)
    
    # Detect sections
    sections = detect_sections(cleaned, title)
    
    # Prepare output dir
    ch_dir = OUT / slug
    assets_dir = ch_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy selected images
    fig_num = 1
    image_map = []  # list of {old, new, caption, category, keywords}
    for img in images:
        old_path = Path(img["_path"])
        # Name with fig-N-descriptive suffix
        cat = img.get("category", "diagram")
        suffix = cat.replace(" ", "-")
        new_name = f"fig-{fig_num}-{suffix}.png"
        new_path = assets_dir / new_name
        shutil.copy2(old_path, new_path)
        
        # Copy meta sidecar
        meta_old = old_path.with_suffix('.meta.json')
        if meta_old.exists():
            meta_new = new_path.with_suffix('.meta.json')
            shutil.copy2(meta_old, meta_new)
        
        image_map.append({
            "old": img["file"],
            "new": new_name,
            "caption": img.get("description", f"Figure {fig_num}"),
            "category": cat,
            "keywords": img.get("keywords", []),
            "page": img.get("source_page", 0),
        })
        fig_num += 1
    
    # Also copy knowledge assets if relevant
    # For canvas chapter, reference bmc-template.png
    
    # Build README content
    keywords = ["business model canvas"] if slug == "01-canvas" else []
    if slug == "02-patterns":
        keywords = ["business model patterns", "unbundling", "long tail", "multi-sided platforms", "free"]
    elif slug == "03-design":
        keywords = ["business model design", "customer insights", "ideation", "visual thinking", "prototyping"]
    elif slug == "04-strategy":
        keywords = ["business model strategy", "environment", "blue ocean", "evaluation"]
    elif slug == "05-process":
        keywords = ["business model process", "innovation", "design attitude", "implementation"]
    
    summary = {
        "01-canvas": "Introduces the Business Model Canvas as a shared language for describing, visualizing, and changing business models through nine building blocks.",
        "02-patterns": "Describes five core business model patterns—Unbundling, Long Tail, Multi-Sided Platforms, FREE, and Open Business Models—with real-world examples.",
        "03-design": "Presents six design techniques—Customer Insights, Ideation, Visual Thinking, Prototyping, Storytelling, and Scenarios—to invent better business models.",
        "04-strategy": "Re-interprets strategy through the Business Model Canvas, covering environment analysis, evaluation, Blue Ocean Strategy, and managing multiple models.",
        "05-process": "Provides a generic five-phase process—Mobilize, Understand, Design, Implement, Manage—for executing business model design initiatives.",
    }[slug]
    
    readme_lines = [
        f"# {title}",
        "",
        f"> **Pages:** {page_start}–{page_end}  ",
        f"> **Keywords:** {', '.join(keywords[:5])}  ",
        f"> **Summary:** {summary}",
        "",
        "---",
        "",
    ]
    
    # Add cross-reference to template for canvas chapter
    if slug == "01-canvas":
        readme_lines.extend([
            "> **Reference:** The blank Business Model Canvas template is available at [`../../assets/bmc-template.png`](../../assets/bmc-template.png).",
            "",
        ])
    
    sec_num = 1
    section_names = []
    for sec in sections:
        if not sec["content"]:
            continue
        sec_title = sec["title"]
        section_names.append(sec_title)
        readme_lines.append(f"## {sec_num}. {sec_title}")
        readme_lines.append("")
        
        # Add section content
        content_lines = [l for l in sec["content"] if l.strip()]
        # Limit content length per section to avoid massive files
        # Just join and add
        for cl in content_lines:
            readme_lines.append(cl)
        readme_lines.append("")
        
        # Insert images strategically: near relevant sections by page proximity
        # For simplicity, distribute images evenly
        sec_num += 1
    
    # Now insert images at strategic positions based on page references
    # We'll do a second pass to insert image references
    final_lines = []
    img_idx = 0
    for line in readme_lines:
        final_lines.append(line)
        # Insert image after section headers that match image page ranges
        if line.startswith("## ") and img_idx < len(image_map):
            # Insert up to 2 images per section
            for _ in range(min(2, len(image_map) - img_idx)):
                img = image_map[img_idx]
                final_lines.append("")
                final_lines.append(f"![Figure {img_idx+1}: {img['caption']}](assets/{img['new']})")
                final_lines.append("")
                img_idx += 1
    
    # Append remaining images at end
    while img_idx < len(image_map):
        img = image_map[img_idx]
        final_lines.append(f"![Figure {img_idx+1}: {img['caption']}](assets/{img['new']})")
        final_lines.append("")
        img_idx += 1
    
    # Add key takeaways at end
    final_lines.extend([
        "",
        "---",
        "",
        "> **Key takeaway:** " + {
            "01-canvas": "The Business Model Canvas provides a simple, shared language for describing, visualizing, assessing, and changing business models through nine interlocking building blocks.",
            "02-patterns": "Business model patterns like Unbundling, Long Tail, Multi-Sided Platforms, FREE, and Open Business Models offer proven archetypes that can be adapted and combined to create new competitive strategies.",
            "03-design": "Design thinking techniques—customer insights, ideation, visual thinking, prototyping, storytelling, and scenarios—are essential tools for inventing and refining innovative business models.",
            "04-strategy": "A strategic understanding of your business model environment, combined with systematic evaluation and Blue Ocean thinking, enables proactive business model innovation rather than reactive adaptation.",
            "05-process": "Business model innovation is not accidental; it can be managed through a structured five-phase process (Mobilize, Understand, Design, Implement, Manage) that balances creativity with execution.",
        }[slug],
        "",
    ])
    
    readme_path = ch_dir / "README.md"
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(final_lines))
    
    return {
        "slug": slug,
        "title": title,
        "page_start": page_start,
        "page_end": page_end,
        "keywords": keywords,
        "summary": summary,
        "has_images": len(image_map) > 0,
        "image_count": len(image_map),
        "sections": section_names,
        "key_images": [{"file": f"assets/{i['new']}", "caption": i['caption'], "category": i['category'], "keywords": i['keywords']} for i in image_map],
    }

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    
    index_chapters = []
    all_keywords = {}
    
    for ch in CHAPTERS:
        print(f"Processing {ch['slug']}...")
        images = images_for_chapter(ch["page_start"], ch["page_end"], max_images=12)
        print(f"  Selected {len(images)} images")
        info = build_chapter(ch, images)
        index_chapters.append(info)
        
        # Build keyword index
        for kw in info["keywords"]:
            kw_lower = kw.lower()
            if kw_lower not in all_keywords:
                all_keywords[kw_lower] = {"chapters": [], "images": []}
            all_keywords[kw_lower]["chapters"].append(ch["slug"])
        for img in info["key_images"]:
            for kw in img.get("keywords", []):
                kw_lower = kw.lower()
                if kw_lower not in all_keywords:
                    all_keywords[kw_lower] = {"chapters": [], "images": []}
                all_keywords[kw_lower]["images"].append(f"{ch['slug']}/{img['file']}")
    
    # Write index.json
    index = {
        "book": "Business Model Generation",
        "authors": "Alexander Osterwalder & Yves Pigneur",
        "language": "en",
        "total_chapters": len(CHAPTERS),
        "chapters": index_chapters,
    }
    with open(OUT / "index.json", 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    
    # Write keywords.json
    with open(OUT / "keywords.json", 'w', encoding='utf-8') as f:
        json.dump(all_keywords, f, indent=2, ensure_ascii=False)
    
    # Write README.md
    readme = """# Business Model Generation

> **Authors:** Alexander Osterwalder & Yves Pigneur  
> **Language:** English  
> **Chapters:** 5

## Chapters

| # | Chapter | Pages | Summary |
|---|---------|-------|---------|
| 1 | [Canvas](01-canvas/README.md) | 15–51 | The Business Model Canvas and its 9 building blocks |
| 2 | [Patterns](02-patterns/README.md) | 52–125 | Five core business model patterns with examples |
| 3 | [Design](03-design/README.md) | 126–199 | Six design techniques for business model innovation |
| 4 | [Strategy](04-strategy/README.md) | 200–239 | Strategic analysis and Blue Ocean thinking |
| 5 | [Process](05-process/README.md) | 240–260 | A five-phase process for business model design |

## Key Assets

- [Business Model Canvas Template](../../assets/bmc-template.png)
- [Apple iPod/iTunes Example](../../assets/bmc-apple-example.png)

## Indexes

- [Chapter Index](index.json)
- [Keyword Index](keywords.json)
"""
    with open(OUT / "README.md", 'w', encoding='utf-8') as f:
        f.write(readme)
    
    print("Done!")

if __name__ == "__main__":
    main()

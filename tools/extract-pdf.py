#!/usr/bin/env python3
"""
Extract TOC, chapter text, and images from PDFs for knowledge-base ingestion.

Usage:
    python tools/extract-pdf.py <pdf-path> <output-dir> [--start-page N] [--end-page N]
"""

import argparse
import json
import os
import re
import sys
import fitz  # PyMuPDF


def sanitize_filename(name: str) -> str:
    """Remove characters unsafe for filenames."""
    name = name.replace('/', '-').replace('\\', '-')
    name = re.sub(r'[<>:"|?*]', '', name)
    name = name.strip().replace(' ', '-')
    return name[:80]


def extract_toc(doc: fitz.Document) -> list:
    """Return flat list of {level, title, page} from PDF TOC."""
    toc = doc.get_toc()
    out = []
    for level, title, page in toc:
        out.append({"level": level, "title": title.strip(), "page": int(page)})
    return out


def extract_images(doc: fitz.Document, output_dir: str, start_page: int = 0, end_page: int = None):
    """Extract embedded images from page range and save as PNG."""
    if end_page is None:
        end_page = len(doc)
    img_dir = os.path.join(output_dir, "images")
    os.makedirs(img_dir, exist_ok=True)
    saved = []
    for page_num in range(start_page, end_page):
        page = doc[page_num]
        img_list = page.get_images(full=True)
        for img_index, img in enumerate(img_list, start=1):
            xref = img[0]
            try:
                pix = fitz.Pixmap(doc, xref)
                if pix.n != 3:  # Convert anything not RGB to RGB
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                filename = f"page-{page_num + 1}-img-{img_index}.png"
                filepath = os.path.join(img_dir, filename)
                pix.save(filepath)
                saved.append({
                    "page": page_num + 1,
                    "filename": filename,
                    "width": pix.width,
                    "height": pix.height,
                })
            except Exception as e:
                print(f"  Warning: skipping image on page {page_num + 1} img {img_index}: {e}")
    return saved


def extract_text_by_chapters(doc: fitz.Document, toc: list, output_dir: str, start_page: int = 0, end_page: int = None):
    """Split text by TOC chapters and write one .txt per chapter."""
    if end_page is None:
        end_page = len(doc)
    text_dir = os.path.join(output_dir, "chapters")
    os.makedirs(text_dir, exist_ok=True)

    # Filter TOC entries to page range and meaningful levels (1-2)
    filtered_toc = [
        e for e in toc
        if start_page <= e["page"] < end_page and e["level"] <= 2
    ]

    chapters = []
    for i, entry in enumerate(filtered_toc):
        chap_start = entry["page"]
        chap_end = filtered_toc[i + 1]["page"] if i + 1 < len(filtered_toc) else end_page
        # Clamp to range
        chap_start = max(chap_start, start_page)
        chap_end = min(chap_end, end_page)

        texts = []
        for p in range(chap_start, chap_end):
            texts.append(doc[p].get_text())
        full_text = "\n\n".join(texts)

        slug = f"{i+1:02d}-{sanitize_filename(entry['title'])}"
        filepath = os.path.join(text_dir, f"{slug}.txt")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {entry['title']}\n\n")
            f.write(full_text)

        chapters.append({
            "index": i + 1,
            "title": entry["title"],
            "slug": slug,
            "page_start": chap_start + 1,
            "page_end": chap_end,
            "filepath": filepath,
        })

    return chapters


def main():
    parser = argparse.ArgumentParser(description="Extract PDF contents for knowledge base")
    parser.add_argument("pdf", help="Path to PDF file")
    parser.add_argument("outdir", help="Output directory")
    parser.add_argument("--start-page", type=int, default=0, help="0-based start page (inclusive)")
    parser.add_argument("--end-page", type=int, default=None, help="0-based end page (exclusive)")
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    doc = fitz.open(args.pdf)
    end_page = args.end_page if args.end_page is not None else len(doc)

    print(f"Opened: {args.pdf} ({len(doc)} pages)")
    print(f"Range: pages {args.start_page + 1} – {end_page}")

    # 1. TOC
    toc = extract_toc(doc)
    toc_path = os.path.join(args.outdir, "toc.json")
    with open(toc_path, "w", encoding="utf-8") as f:
        json.dump(toc, f, ensure_ascii=False, indent=2)
    print(f"TOC entries: {len(toc)} → {toc_path}")

    # 2. Images
    images = extract_images(doc, args.outdir, args.start_page, end_page)
    print(f"Images extracted: {len(images)}")

    # 3. Chapters
    chapters = extract_text_by_chapters(doc, toc, args.outdir, args.start_page, end_page)
    print(f"Chapters extracted: {len(chapters)}")
    for c in chapters:
        print(f"  {c['index']:02d}. {c['title']} (p{c['page_start']}–{c['page_end']})")

    # 4. Full raw text (for reference / manual splitting when TOC is poor)
    raw_path = os.path.join(args.outdir, "full.txt")
    with open(raw_path, "w", encoding="utf-8") as f:
        for p in range(args.start_page, end_page):
            f.write(doc[p].get_text())
            f.write("\n\n---PAGE BREAK---\n\n")
    print(f"Full raw text: {raw_path}")

    doc.close()
    print("Done.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
check-bilingual.py — Verify EN/ZH parity for a book's chapters and checklists.
Read-only; no side effects.

Checks:
  - Every chapter slug has BOTH chapters/<slug>.en.md and chapters/<slug>.zh.md.
  - Every checklist exists (one JSON per slug; checklists are language-neutral).
  - (info) flags chapters where ZH is < RATIO of EN bytes (possible dropped items).

Exit code 0 = parity clean, 1 = missing-language or checklist gaps found.
The ZH/EN ratio warning is informational and does NOT affect exit code.

Usage:
    python3 check-bilingual.py <book-slug>
    python3 check-bilingual.py <book-slug> --json
"""
import argparse
import json
import os
import re
import sys

RATIO_WARN = 0.45  # ZH below 45% of EN bytes -> informational "thin ZH" warning


def find_repo_root(start):
    cur = os.path.abspath(start)
    while True:
        if os.path.exists(os.path.join(cur, "pnpm-workspace.yaml")) or os.path.isdir(
            os.path.join(cur, ".git")
        ):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            return os.path.abspath(start)
        cur = parent


def load_index_slugs(book_dir):
    idx = os.path.join(book_dir, "chapters", "index.json")
    with open(idx, encoding="utf-8") as f:
        data = json.load(f)
    return [c["slug"] for c in data if "slug" in c]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book", help="book slug, e.g. business-model-generation")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = find_repo_root(__file__)
    book_dir = os.path.join(root, "packages", "case-library", "resources", args.book)
    ch_dir = os.path.join(book_dir, "chapters")
    cl_dir = os.path.join(book_dir, "checklists")
    if not os.path.isdir(ch_dir):
        print(f"ERROR: chapters dir not found: {ch_dir}", file=sys.stderr)
        sys.exit(2)

    try:
        slugs = load_index_slugs(book_dir)
    except FileNotFoundError:
        print(f"ERROR: chapters/index.json not found in {book_dir}", file=sys.stderr)
        sys.exit(2)

    missing_en, missing_zh, missing_checklist, thin_zh = [], [], [], []
    rows = []
    for slug in slugs:
        en_p = os.path.join(ch_dir, f"{slug}.en.md")
        zh_p = os.path.join(ch_dir, f"{slug}.zh.md")
        cl_p = os.path.join(cl_dir, f"{slug}.json")
        has_en, has_zh = os.path.exists(en_p), os.path.exists(zh_p)
        has_cl = os.path.exists(cl_p)
        if not has_en:
            missing_en.append(slug)
        if not has_zh:
            missing_zh.append(slug)
        if not has_cl:
            missing_checklist.append(slug)
        ratio = None
        if has_en and has_zh:
            en_sz = os.path.getsize(en_p)
            zh_sz = os.path.getsize(zh_p)
            ratio = (zh_sz / en_sz) if en_sz else None
            if ratio is not None and ratio < RATIO_WARN:
                thin_zh.append(slug)
        rows.append({"slug": slug, "en": has_en, "zh": has_zh,
                     "checklist": has_cl, "zhEnRatio": ratio})

    problems = missing_en or missing_zh or missing_checklist

    if args.json:
        print(json.dumps({
            "book": args.book,
            "chapters": rows,
            "missingEn": missing_en,
            "missingZh": missing_zh,
            "missingChecklist": missing_checklist,
            "thinZh": thin_zh,
            "clean": not problems,
        }, ensure_ascii=False, indent=2))
        sys.exit(0 if not problems else 1)

    print(f"== check-bilingual: {args.book} ==  ({len(slugs)} chapters)")
    print(f"{'chapter':<28} {'EN':>4} {'ZH':>4} {'CL':>4} {'ZH/EN':>7}")
    print("-" * 52)
    for r in rows:
        ratio = f"{r['zhEnRatio']:.2f}" if r["zhEnRatio"] is not None else "—"
        print(f"{r['slug']:<28} "
              f"{'✓' if r['en'] else '✗':>4} "
              f"{'✓' if r['zh'] else '✗':>4} "
              f"{'✓' if r['checklist'] else '✗':>4} "
              f"{ratio:>7}")
    if missing_en:
        print(f"\nMISSING EN: {', '.join(missing_en)}")
    if missing_zh:
        print(f"MISSING ZH: {', '.join(missing_zh)}")
    if missing_checklist:
        print(f"MISSING checklist: {', '.join(missing_checklist)}")
    if thin_zh:
        print(f"(info) thin ZH (<{int(RATIO_WARN*100)}% of EN bytes): "
              f"{', '.join(thin_zh)} — verify no items dropped")
    if not problems:
        print("\nCLEAN ✅  every chapter has EN + ZH + checklist")
    sys.exit(0 if not problems else 1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
check-orphans.py — Verify chapter/checklist files match the slug truth-source
(chapters/index.json) for a book. Read-only; no side effects.

Reports three classes of mismatch:
  - ORPHAN file   : a chapters/<slug>.{en,zh}.md or checklists/<slug>.json whose
                    <slug> is NOT in index.json (a stray / renamed leftover).
  - MISSING file  : a slug in index.json with no matching chapter/checklist file.
  - (info) counts : how many index slugs are fully covered.

Exit code 0 = clean, 1 = problems found.

Usage (run from anywhere; repo root auto-detected):
    python3 check-orphans.py <book-slug>
    python3 check-orphans.py <book-slug> --json
"""
import argparse
import json
import os
import re
import sys


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
    if not os.path.exists(idx):
        return None, f"index.json not found at {idx}"
    with open(idx, encoding="utf-8") as f:
        data = json.load(f)
    slugs = [c["slug"] for c in data if "slug" in c]
    return slugs, None


def scan_chapter_slugs(book_dir):
    """Return set of slugs implied by chapters/*.{en,zh}.md filenames."""
    ch_dir = os.path.join(book_dir, "chapters")
    slugs = set()
    if not os.path.isdir(ch_dir):
        return slugs
    pat = re.compile(r"^(.+)\.(en|zh)\.md$")
    for name in os.listdir(ch_dir):
        m = pat.match(name)
        if m:
            slugs.add(m.group(1))
    return slugs


def scan_checklist_slugs(book_dir):
    cl_dir = os.path.join(book_dir, "checklists")
    slugs = set()
    if not os.path.isdir(cl_dir):
        return slugs
    for name in os.listdir(cl_dir):
        if name.endswith(".json"):
            slugs.add(name[: -len(".json")])
    return slugs


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book", help="book slug, e.g. business-model-generation")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = find_repo_root(__file__)
    book_dir = os.path.join(root, "packages", "case-library", "resources", args.book)
    if not os.path.isdir(book_dir):
        print(f"ERROR: book dir not found: {book_dir}", file=sys.stderr)
        sys.exit(2)

    index_slugs, err = load_index_slugs(book_dir)
    if err:
        print(f"ERROR: {err}", file=sys.stderr)
        sys.exit(2)
    index_set = set(index_slugs)

    chapter_slugs = scan_chapter_slugs(book_dir)
    checklist_slugs = scan_checklist_slugs(book_dir)

    orphan_chapters = sorted(chapter_slugs - index_set)
    orphan_checklists = sorted(checklist_slugs - index_set)
    missing_chapters = sorted(index_set - chapter_slugs)
    missing_checklists = sorted(index_set - checklist_slugs)

    problems = (orphan_chapters or orphan_checklists
                or missing_chapters or missing_checklists)

    if args.json:
        print(json.dumps({
            "book": args.book,
            "indexSlugs": index_slugs,
            "orphanChapters": orphan_chapters,
            "orphanChecklists": orphan_checklists,
            "missingChapters": missing_chapters,
            "missingChecklists": missing_checklists,
            "clean": not problems,
        }, ensure_ascii=False, indent=2))
        sys.exit(0 if not problems else 1)

    print(f"== check-orphans: {args.book} ==")
    print(f"index.json slugs: {len(index_slugs)}")
    if orphan_chapters:
        print(f"\nORPHAN chapter files (slug not in index.json):")
        for s in orphan_chapters:
            print(f"  - chapters/{s}.{{en,zh}}.md")
    if orphan_checklists:
        print(f"\nORPHAN checklist files (slug not in index.json):")
        for s in orphan_checklists:
            print(f"  - checklists/{s}.json")
    if missing_chapters:
        print(f"\nMISSING chapter files (index slug with no .md):")
        for s in missing_chapters:
            print(f"  - {s}")
    if missing_checklists:
        print(f"\nMISSING checklist files (index slug with no .json):")
        for s in missing_checklists:
            print(f"  - {s}")
    if not problems:
        print("\nCLEAN ✅  all chapter & checklist slugs match index.json")
    sys.exit(0 if not problems else 1)


if __name__ == "__main__":
    main()

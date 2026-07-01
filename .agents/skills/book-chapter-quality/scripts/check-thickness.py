#!/usr/bin/env python3
"""
check-thickness.py — Per-chapter EN/ZH byte sizes for a book, flagging residual
stubs that fall below the A-level depth baseline. Read-only; no side effects.

A-level EN chapters run ~3.8K–7.8 KB (a proxy, not the goal — coverage is the real
target). Files materially below the floor are likely stubs (copies of the index.json
summary or bare bullet lists) and should be rewritten.

Exit code 0 = no stubs flagged, 1 = at least one file below the floor.

Usage (run from anywhere; repo root auto-detected):
    python3 check-thickness.py <book-slug>
    python3 check-thickness.py <book-slug> --floor 3000
    python3 check-thickness.py <book-slug> --json
"""
import argparse
import json
import os
import re
import sys

DEFAULT_FLOOR = 3500   # bytes; below this an EN chapter is suspected stub
DEFAULT_CEIL = 7800    # bytes; informational upper marker of the A-level band


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


def human(n):
    for unit in ("B", "KB", "MB"):
        if n < 1024:
            return f"{n:.0f}{unit}" if unit == "B" else f"{n/1:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}GB"


def fmt_kb(n):
    return f"{n/1024:.1f}KB"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book", help="book slug, e.g. business-model-generation")
    ap.add_argument("--floor", type=int, default=DEFAULT_FLOOR,
                    help=f"EN byte floor below which a chapter is flagged (default {DEFAULT_FLOOR})")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = find_repo_root(__file__)
    ch_dir = os.path.join(root, "packages", "case-library", "resources", args.book,
                          "chapters")
    if not os.path.isdir(ch_dir):
        print(f"ERROR: chapters dir not found: {ch_dir}", file=sys.stderr)
        sys.exit(2)

    pat = re.compile(r"^(.+)\.(en|zh)\.md$")
    sizes = {}  # slug -> {"en": bytes, "zh": bytes}
    for name in sorted(os.listdir(ch_dir)):
        m = pat.match(name)
        if not m:
            continue
        slug, lang = m.group(1), m.group(2)
        size = os.path.getsize(os.path.join(ch_dir, name))
        sizes.setdefault(slug, {})[lang] = size

    rows = []
    flagged = []
    for slug in sorted(sizes):
        en = sizes[slug].get("en", 0)
        zh = sizes[slug].get("zh", 0)
        stub = en < args.floor
        rows.append({"slug": slug, "en": en, "zh": zh, "stub": stub})
        if stub:
            flagged.append(slug)

    if args.json:
        print(json.dumps({
            "book": args.book,
            "floor": args.floor,
            "chapters": rows,
            "flagged": flagged,
            "clean": not flagged,
        }, ensure_ascii=False, indent=2))
        sys.exit(0 if not flagged else 1)

    print(f"== check-thickness: {args.book} ==  (EN floor {fmt_kb(args.floor)}, "
          f"A-band ~{fmt_kb(DEFAULT_FLOOR)}-{fmt_kb(DEFAULT_CEIL)})")
    print(f"{'chapter':<28} {'EN':>9} {'ZH':>9}   flag")
    print("-" * 60)
    for r in rows:
        flag = "STUB ⚠" if r["stub"] else "ok"
        print(f"{r['slug']:<28} {fmt_kb(r['en']):>9} {fmt_kb(r['zh']):>9}   {flag}")
    if flagged:
        print(f"\n{len(flagged)} chapter(s) below floor — rewrite to A-level:")
        for s in flagged:
            print(f"  - {s}")
    else:
        print("\nCLEAN ✅  no chapters below the stub floor")
    sys.exit(0 if not flagged else 1)


if __name__ == "__main__":
    main()

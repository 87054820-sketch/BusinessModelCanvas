#!/usr/bin/env python3
"""
audit-coverage.py — Coverage AID for the audit role. For each checklist item, greps
the finished EN/ZH chapter prose for a signal of presence, producing a draft pass/
fail grid. Read-only; no side effects.

IMPORTANT: this is a heuristic AID, not the authority. A keyword can appear without
the concept being truly explained, and a concept can be covered with different
wording. The human-readable audit-report.md table — produced by the audit role
reading the prose — remains the source of truth. Use this to focus attention on
likely-missing items.

For each item it derives short probe tokens (e.g. a concept's name, a case's name,
a term) and checks whether they occur in the chapter text (case-insensitive).

Exit code 0 always (it is an aid, not a gate).

Usage:
    python3 audit-coverage.py <book-slug> <chapter-slug>
    python3 audit-coverage.py <book-slug> <chapter-slug> --json
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


def probe_tokens(label):
    """Derive a few searchable tokens from a checklist item's label.

    Strategy: take the label, strip parenthetical abbreviations, split on
    punctuation, keep words >=4 chars (or any CJK run). Returns a small token list;
    a hit on ANY token counts as a (heuristic) presence signal.
    """
    # primary: text before any '(' or ':' is usually the canonical name
    head = re.split(r"[(:：]", label, 1)[0].strip()
    tokens = []
    if head:
        tokens.append(head)
    # also pull a parenthetical abbreviation like (CS), (RPV)
    m = re.search(r"\(([A-Za-z$]{2,6})\)", label)
    if m:
        tokens.append(m.group(1))
    # fall back: significant words
    for w in re.findall(r"[A-Za-z][A-Za-z\-]{3,}|[\u4e00-\u9fff]{2,}", head):
        if w.lower() not in {"the", "and", "for", "with", "that", "this"}:
            tokens.append(w)
    # de-dup preserving order
    seen, out = set(), []
    for t in tokens:
        k = t.lower()
        if k not in seen:
            seen.add(k)
            out.append(t)
    return out[:4]


def present(text_lower, tokens):
    return any(t.lower() in text_lower for t in tokens) if tokens else False


def iter_items(cl):
    for c in cl.get("concepts", []):
        yield ("concept", c.get("name", ""))
    for a in cl.get("arguments", []):
        yield ("argument", a.get("claim", ""))
    for c in cl.get("cases", []):
        yield ("case", c.get("name", ""))
    for lc in cl.get("logicChains", []):
        yield ("logicChain", (lc.get("description", "")[:48]))
    for t in cl.get("terminology", []):
        yield ("terminology", t.get("term", ""))
    for n in cl.get("nuance", []):
        yield ("nuance", n[:48])


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book", help="book slug")
    ap.add_argument("chapter", help="chapter slug, e.g. ch01-canvas")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = find_repo_root(__file__)
    base = os.path.join(root, "packages", "case-library", "resources", args.book)
    cl_p = os.path.join(base, "checklists", f"{args.chapter}.json")
    en_p = os.path.join(base, "chapters", f"{args.chapter}.en.md")
    zh_p = os.path.join(base, "chapters", f"{args.chapter}.zh.md")

    if not os.path.exists(cl_p):
        print(f"ERROR: checklist not found: {cl_p}", file=sys.stderr)
        sys.exit(2)
    with open(cl_p, encoding="utf-8") as f:
        cl = json.load(f)

    en_text = open(en_p, encoding="utf-8").read().lower() if os.path.exists(en_p) else ""
    zh_text = open(zh_p, encoding="utf-8").read().lower() if os.path.exists(zh_p) else ""

    rows = []
    miss_en = miss_zh = 0
    for itype, label in iter_items(cl):
        if not label:
            continue
        toks = probe_tokens(label)
        in_en = present(en_text, toks)
        in_zh = present(zh_text, toks)
        if not in_en:
            miss_en += 1
        if not in_zh:
            miss_zh += 1
        rows.append({"type": itype, "label": label, "tokens": toks,
                     "en": in_en, "zh": in_zh})

    if args.json:
        print(json.dumps({
            "book": args.book, "chapter": args.chapter,
            "items": rows, "likelyMissingEn": miss_en, "likelyMissingZh": miss_zh,
        }, ensure_ascii=False, indent=2))
        sys.exit(0)

    print(f"== audit-coverage (AID): {args.book}/{args.chapter} ==")
    print("Heuristic only — confirm by reading prose; audit-report.md is authority.\n")
    print(f"{'type':<12} {'EN':>4} {'ZH':>4}  item")
    print("-" * 70)
    for r in rows:
        print(f"{r['type']:<12} "
              f"{'✓' if r['en'] else '?':>4} "
              f"{'✓' if r['zh'] else '?':>4}  {r['label'][:48]}")
    print(f"\nLikely-missing signals — EN: {miss_en}, ZH: {miss_zh} "
          f"(verify each '?' by reading the chapter).")
    sys.exit(0)


if __name__ == "__main__":
    main()

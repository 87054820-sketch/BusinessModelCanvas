#!/usr/bin/env python3
"""
clean-artifacts.py — Reclaim disk + de-noise git by removing extraction
*process artifacts* under extracts/ and tmp/, while protecting source material.

Process artifacts (SAFE TO DELETE — regenerable by tools/extract-pdf.py from the
source PDFs in ../BusinessBooks/):
  - extracts/<book>/images/**        (PDF-embedded page images, page-N-img-X.png)
  - extracts/<book>/extract.log      (extraction run logs)
  - extracts/**/.DS_Store            (macOS cruft)
  - tmp/*.png                        (first-batch page renders: bmc/vpc/pm-*.png)
  - tmp/**/.DS_Store

PROTECTED — never touched (the actual source of truth + curated products):
  - extracts/<book>/chapters/*.txt, full.txt, toc.json   (checklist-role source)
  - any *.json / *.md / *.txt outside images/            (e.g. toc.json)
  - tmp/invincible-company-case-specs/*.json             (curated case specs)
  - packages/canvases/**                                 (canvas knowledge assets)

Default is DRY-RUN (report only). Pass --apply to actually delete. For git-tracked
artifacts it runs `git rm --cached` so deletions are staged for commit.

Usage (run from anywhere; repo root is auto-detected):
    python3 clean-artifacts.py            # dry-run report
    python3 clean-artifacts.py --apply    # perform deletion + git rm --cached
    python3 clean-artifacts.py --json      # machine-readable report
"""
import argparse
import json
import os
import subprocess
import sys


def find_repo_root(start):
    """Walk up until a dir containing pnpm-workspace.yaml or .git is found."""
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
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f}{unit}" if unit != "B" else f"{n}B"
        n /= 1024


def git_tracked(root, rel):
    """Return True if rel path is tracked by git."""
    res = subprocess.run(
        ["git", "ls-files", "--error-unmatch", rel],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return res.returncode == 0


def collect_targets(root):
    """Return list of (relpath, size_bytes, is_dir) artifact entries."""
    targets = []
    extracts = os.path.join(root, "extracts")
    if os.path.isdir(extracts):
        for book in sorted(os.listdir(extracts)):
            book_dir = os.path.join(extracts, book)
            if not os.path.isdir(book_dir):
                continue
            # 1) images/ directory (whole)
            img_dir = os.path.join(book_dir, "images")
            if os.path.isdir(img_dir):
                size = sum(
                    os.path.getsize(os.path.join(dp, f))
                    for dp, _, fs in os.walk(img_dir)
                    for f in fs
                )
                targets.append((os.path.relpath(img_dir, root) + "/", size, True))
            # 2) extract.log
            log = os.path.join(book_dir, "extract.log")
            if os.path.isfile(log):
                targets.append((os.path.relpath(log, root), os.path.getsize(log), False))
        # 3) .DS_Store under extracts/
        for dp, _, fs in os.walk(extracts):
            for f in fs:
                if f == ".DS_Store":
                    p = os.path.join(dp, f)
                    targets.append((os.path.relpath(p, root), os.path.getsize(p), False))

    # 4) tmp/*.png (top-level only — protects tmp/invincible-company-case-specs/)
    tmp = os.path.join(root, "tmp")
    if os.path.isdir(tmp):
        for f in sorted(os.listdir(tmp)):
            p = os.path.join(tmp, f)
            if os.path.isfile(p) and f.lower().endswith(".png"):
                targets.append((os.path.relpath(p, root), os.path.getsize(p), False))
        # tmp/**/.DS_Store
        for dp, _, fs in os.walk(tmp):
            for f in fs:
                if f == ".DS_Store":
                    p = os.path.join(dp, f)
                    targets.append((os.path.relpath(p, root), os.path.getsize(p), False))
    return targets


def remove(root, rel, is_dir):
    abs_path = os.path.join(root, rel.rstrip("/"))
    if not os.path.exists(abs_path):
        return
    if is_dir:
        import shutil

        shutil.rmtree(abs_path)
    else:
        os.remove(abs_path)


def main():
    ap = argparse.ArgumentParser(description="Clean extraction process artifacts.")
    ap.add_argument("--apply", action="store_true", help="actually delete (default: dry-run)")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = find_repo_root(os.path.dirname(os.path.abspath(__file__)))
    targets = collect_targets(root)

    total = sum(t[1] for t in targets)
    tracked = []
    for rel, _, is_dir in targets:
        # check tracking via pathspec (dir -> ls-files <dir>)
        check = rel.rstrip("/")
        res = subprocess.run(
            ["git", "ls-files", check],
            cwd=root,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        if res.stdout.strip():
            tracked.append(check)

    if args.json:
        print(json.dumps({
            "root": root,
            "targets": [{"path": r, "bytes": s, "dir": d} for r, s, d in targets],
            "total_bytes": total,
            "git_tracked": tracked,
            "applied": args.apply,
        }, ensure_ascii=False, indent=2))
    else:
        print(f"Repo root: {root}")
        print(f"\n{'MODE: APPLY (deleting)' if args.apply else 'MODE: DRY-RUN (no changes)'}")
        print(f"\nArtifacts to clean ({len(targets)} entries, {human(total)} total):")
        for rel, size, is_dir in targets:
            mark = " [git-tracked]" if rel.rstrip("/") in tracked else ""
            print(f"  {human(size):>10}  {rel}{mark}")
        print(f"\nProtected (never touched): chapters/*.txt, full.txt, toc.json, "
              f"tmp/invincible-company-case-specs/*.json, packages/canvases/**")

    if not args.apply:
        if not args.json:
            print("\nDry-run only. Re-run with --apply to delete.")
        return

    # APPLY: git rm --cached for tracked entries first, then physical remove leftovers
    for rel, _, is_dir in targets:
        check = rel.rstrip("/")
        if check in tracked:
            subprocess.run(
                ["git", "rm", "-r", "--cached", "--quiet", check],
                cwd=root,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        remove(root, rel, is_dir)

    if not args.json:
        print(f"\nDone. Reclaimed ~{human(total)}. "
              f"{len(tracked)} git-tracked entries staged for removal (commit to finalize).")


if __name__ == "__main__":
    main()

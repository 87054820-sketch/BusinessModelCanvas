# Artifact Cleanup — Source vs. Process Artifact Contract

PDF ingestion (`tools/extract-pdf.py`) produces both the **source material** the
checklist role depends on **and** bulky **process artifacts** that are only useful
during extraction. Left unmanaged, the artifacts (mostly PDF-embedded page PNGs)
bloat the repo to ~85MB and flood `git status`. This reference defines exactly what
is keepable vs. disposable, so cleanup is safe and repeatable.

## Classification

### KEEP — source of truth (never delete)

| Path | Why |
|------|-----|
| `extracts/<book>/chapters/*.txt` | Per-chapter source text — the checklist role's only input |
| `extracts/<book>/full.txt` | Full-book fallback text |
| `extracts/<book>/toc.json` | Chapter → page mapping |
| `extracts/<book>/chapters/index.json` *(if present)* | Slug truth-source |
| `tmp/invincible-company-case-specs/*.json` | Curated case specs (a product, not an artifact) |
| `packages/canvases/**/knowledge/assets/*.png` | Canvas knowledge images (shipped assets) |

### DELETE — process artifacts (regenerable from source PDFs)

| Path | What it is | Regenerate via |
|------|-----------|----------------|
| `extracts/<book>/images/**` | PDF-embedded images `page-N-img-X.png` | `tools/extract-pdf.py` `extract_images()` |
| `extracts/<book>/extract.log` | Extraction run log | re-run extraction |
| `extracts/**/.DS_Store` | macOS Finder cruft | n/a |
| `tmp/*.png` | First-batch page renders (`bmc/vpc/pm-*.png`) | `tools/extract-pdf.py` |
| `tmp/**/.DS_Store` | macOS cruft | n/a |

> Source PDFs live in `../BusinessBooks/` (18 books). Any deleted image can be
> re-extracted, so deletion is non-destructive to the knowledge pipeline.

## Why images are disposable

The three-role pipeline reads **only** `chapters/*.txt` + `toc.json`. The PNGs under
`images/` are never consumed by checklist / writing / audit roles. They exist only
as an extraction by-product. If a future need requires figures, re-run extraction.

## .gitignore policy

These globs keep artifacts out of version control permanently:

```gitignore
# Book extraction process artifacts (regenerable from ../BusinessBooks PDFs)
extracts/**/images/
extracts/**/extract.log
# First-batch page renders (keep tmp/invincible-company-case-specs/*.json)
tmp/*.png
```

`.DS_Store` is already ignored repo-wide.

> Use `tmp/*.png` (top-level glob), **not** `tmp/`, so curated
> `tmp/invincible-company-case-specs/*.json` stays tracked.

## Cleanup SOP

1. **Inventory (dry-run)** — never delete blind:
   ```bash
   python3 .claude/skills/book-chapter-quality/scripts/clean-artifacts.py
   ```
   Review the per-entry size report; entries marked `[git-tracked]` will be
   `git rm --cached`'d on apply.
2. **Apply**:
   ```bash
   python3 .claude/skills/book-chapter-quality/scripts/clean-artifacts.py --apply
   ```
   Physically removes artifacts and stages tracked ones for removal.
3. **Update `.gitignore`** with the policy globs above (idempotent — skip if present).
4. **Commit** the staged removals so they leave history going forward.

## Guardrails

- The script's KEEP set is hard-coded; it only ever targets `images/`, `extract.log`,
  `.DS_Store`, and top-level `tmp/*.png`. It cannot reach `chapters/`, `*.txt`,
  `toc.json`, or `packages/canvases/`.
- Always run dry-run first and eyeball the list before `--apply`.
- The script has no side effects without `--apply`.

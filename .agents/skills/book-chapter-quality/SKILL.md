---
name: book-chapter-quality
description: >-
  Produce and verify high-quality bilingual (EN/ZH) book-chapter content for the
  PinGarden case-library under packages/case-library/resources/<book-slug>/. This
  skill should be used whenever chapter Markdown (chapters/<slug>.{en,zh}.md),
  coverage checklists (checklists/<slug>.json), or audit reports (audit-report.md)
  for a business book are created, expanded, rewritten, or reviewed. It enforces a
  three-role pipeline — checklist (concept extraction from extracts/), writing
  (compose to the checklist), and audit (item-by-item coverage verification) — with
  a hard "audit-all-PASS" completion gate. Use it for tasks like "deepen this book's
  chapters", "the chapters are too thin", "add checklists/audit", "bring blue-ocean /
  porter / christensen chapters up to A-level depth", or any edit touching book
  chapter content. The quality bar is concept-coverage, not word-count. It also
  owns cleanup of bulky PDF-extraction process artifacts (extracts/**/images PNGs,
  extract.log, tmp/*.png) — use it for "clean up scan images / process artifacts",
  "extracts is too big", "de-noise git / repo bloat from book extraction".
---

# Book Chapter Quality

## Purpose

Bring every book in the PinGarden case-library to **A-level depth** — where each
chapter faithfully reproduces the source book's concepts, arguments, cases, logic
chains, terminology, and nuance, in both English and Chinese. The quality bar is
**concept-coverage verified against source material**, never word-count.

This skill exists because the prior quality spec was a *passive document*: it was
fully executed for only the first 3 books, then silently skipped from Batch 2
onward, causing depth to collapse. This skill makes the process **triggerable,
gated, and script-checkable**.

## When To Use

Trigger on any task that creates, expands, rewrites, or reviews:

- `packages/case-library/resources/<slug>/chapters/<chapter>.{en,zh}.md`
- `packages/case-library/resources/<slug>/checklists/<chapter>.json`
- `packages/case-library/resources/<slug>/audit-report.md`

Phrases like "deepen the chapters", "chapters too thin", "add checklists/audit",
"bring book X to A-level", "fix orphan chapter files", "verify coverage".

Also trigger for **artifact cleanup**: "clean up the scan images / PDF page PNGs",
"extracts is too big / wastes space", "de-noise git", "remove extraction
by-products". See the Artifact Cleanup section below.

## Hard Rules (completion gate)

1. **Audit-all-PASS is the only definition of done.** A book is NOT complete until
   `audit-report.md` shows every checklist item covered in both EN and ZH.
2. **Three roles are mutually exclusive.** Never let one agent both write a chapter
   and audit it. See the pipeline below.
3. **No word-count shortcuts.** Depth = coverage of every checklist item with
   explanation, evidence, and lesson — not padding.
4. **No hallucination.** Every concept/case must trace to the source `extracts/`.
   Every cross-reference slug must resolve to a real entry in `manifest.json`.
5. **EN and ZH cover the same checklist.** Not different content.

## The Three-Role Pipeline

```
extracts/<book>/chapters/*.txt
        │
        ▼
 [1] CHECKLIST role  — reads ONLY source extracts → writes checklists/<ch>.json
        │              (forbidden: writing chapter prose)
        ▼
 [2] WRITING role    — reads ONLY the checklist → writes chapters/<ch>.{en,zh}.md
        │              (forbidden: reading source extracts; must cover every item)
        ▼
 [3] AUDIT role      — reads checklist + finished prose → writes audit-report.md
                       PASS  → chapter done
                       FAIL  → return to WRITING role to fix the missing items
```

Each role SHOULD be carried by a separate `[subagent:code-explorer]` invocation so
responsibilities stay isolated. Give each subagent ONLY the inputs its role allows.

### Role 1 — Checklist (concept extraction)

- Input: `extracts/<book>/chapters/<file>.txt` (+ `toc.json` for chapter mapping).
- Output: `checklists/<chapter>.json` following `references/checklist-schema.md`.
- Extract: named concepts/frameworks, key arguments+evidence, cases (context →
  what it illustrates → lesson), logic chains, precise terminology, nuance, and
  cross-references. Forbidden from writing chapter prose.

### Role 2 — Writing (compose to checklist)

- Input: ONLY `checklists/<chapter>.json` (do not re-read source extracts).
- Output: `chapters/<chapter>.en.md` and `.zh.md` using the 8-section structure in
  `references/chapter-template.md`. Every checklist item MUST appear and be
  explained. EN and ZH cover the same items.

### Role 3 — Audit (coverage verification)

- Input: `checklists/<chapter>.json` + the finished `.en.md`/`.zh.md`.
- Output: append a per-chapter table to `audit-report.md` marking each item ✅/❌
  for EN and ZH (see the BMC `audit-report.md` format). Any ❌ → verdict FAIL →
  hand back to Role 2. Only when all items are ✅ in both languages → PASS.

## Workflow

1. **Locate the slug truth-source**: `chapters/index.json` lists the canonical
   chapter slugs. All filenames must match these slugs exactly.
2. **Baseline scan** with scripts (read-only, no side effects):
   - `python3 scripts/check-orphans.py <book-slug>` — chapter files vs index.json.
   - `python3 scripts/check-thickness.py <book-slug>` — per-chapter byte size to
     spot residual stubs (A-level EN chapters are ~3.8K–7.8KB).
   - `python3 scripts/check-bilingual.py <book-slug>` — EN/ZH file parity.
3. **Run the three-role pipeline** per chapter (checklist → write → audit).
4. **Coverage check**: `python3 scripts/audit-coverage.py <book-slug> <chapter>`
   to list checklist items and grep the prose for each, as an aid to the audit role
   (the human-readable `audit-report.md` table remains the authority).
5. **Completion gate**: book is done only when `audit-report.md` is all-PASS and the
   orphan/thickness/bilingual scripts report clean.

## Artifact Cleanup (disk + git hygiene)

PDF ingestion leaves bulky **process artifacts** (PDF-embedded page PNGs under
`extracts/<book>/images/`, `extract.log`, `tmp/*.png`, `.DS_Store`) that balloon the
repo to ~85MB and flood `git status`. These are **regenerable** from the source PDFs
in `../BusinessBooks/` and are never read by the three-role pipeline (which uses only
`chapters/*.txt` + `toc.json`), so they are safe to delete.

Two independent levers — choose per situation:

- **Non-destructive (keeps files on disk):** add the policy globs to `.gitignore`
  (`extracts/**/images/`, `extracts/**/extract.log`, `tmp/*.png`) and `git rm
  --cached` any already-tracked artifacts. Git becomes clean; disk usage unchanged;
  no re-extraction ever needed.
- **Destructive (frees disk):** run the cleanup script with `--apply` to physically
  delete. Re-extract from the source PDF only if images are needed again.

SOP (full contract: `references/artifact-cleanup.md`):

1. Dry-run inventory (no changes):
   `python3 .Codex/skills/book-chapter-quality/scripts/clean-artifacts.py`
2. Apply (delete + `git rm --cached` tracked ones):
   `python3 .Codex/skills/book-chapter-quality/scripts/clean-artifacts.py --apply`
3. Ensure `.gitignore` carries the policy globs, then commit the staged removals.

**Protected, never touched:** `chapters/*.txt`, `full.txt`, `toc.json`,
`tmp/invincible-company-case-specs/*.json`, `packages/canvases/**`.

> Recommended timing: run cleanup **after all books reach A-level**, so any
> incidental need to re-inspect a figure during writing/audit is still satisfiable
> from the local `images/` cache. Until then, the gitignore lever alone keeps git
> tidy without deleting anything.

## Reference Files

- `references/quality-spec.md` — the full quality specification (v3). The single
  source of truth; `packages/case-library/CHAPTER_QUALITY_SPEC.md` is just a pointer.
- `references/checklist-schema.md` — the `checklists/<chapter>.json` JSON schema.
- `references/chapter-template.md` — the 8-section chapter structure + an A-level
  depth sample (annotated from BMC ch01).
- `references/artifact-cleanup.md` — source-vs-artifact contract + cleanup SOP.

## Scripts (read-only, no side effects)

- `scripts/check-thickness.py <slug>` — per-chapter EN/ZH byte sizes; flags stubs.
- `scripts/check-orphans.py <slug>` — chapter files vs `index.json` slug mismatches.
- `scripts/check-bilingual.py <slug>` — EN/ZH parity for chapters and checklists.
- `scripts/audit-coverage.py <slug> [chapter]` — checklist-item presence aid.
- `scripts/clean-artifacts.py [--apply]` — remove extraction process artifacts;
  **dry-run by default**, the only script that mutates (with `--apply`).

Run scripts from the repo root. They assume `packages/case-library/resources/<slug>/`.

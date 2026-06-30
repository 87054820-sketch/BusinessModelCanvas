# Chapter Content Quality Specification v3

> **Single source of truth.** This file supersedes
> `packages/case-library/CHAPTER_QUALITY_SPEC.md`, which is now only a pointer here.
> It governs the quality bar for every `chapters/<slug>.{en,zh}.md` in the
> case-library. **The core standard is concept-coverage, not word-count.**

---

## 0. Capability Classification

All 12 books are now **Tier A — source-verified**: every book has per-chapter
source text under `extracts/<book>/chapters/*.txt` (+ `toc.json`), so every concept,
argument, and case can be cross-checked against the original text. There is no
longer a "research-backed" tier — if a book lacks extracts, extract it first with
`tools/extract-pdf.py` before writing.

| Book slug | Extract dir | Chapters |
|---|---|---|
| `business-model-generation` | `extracts/bmc-en/` + `extracts/bmc-zh/` | 5 |
| `value-proposition-design` | `extracts/vpc-en/` + `extracts/vpc-zh/` | 5 |
| `the-invincible-company` | `extracts/invincible-en/` | 5 |
| `christensen-innovators-dilemma` | `extracts/christensen-en/` | 9 |
| `testing-business-ideas` | `extracts/testing-bi-en/` | 4 |
| `scenario-planning-in-organizations` | `extracts/scenario-planning-en/` | 5 |
| `blue-ocean-strategy` | `extracts/bos-en/` | 9 |
| `blue-ocean-shift` | `extracts/bos-shift-en/` | 8 |
| `porter-competitive-strategy` | `extracts/porter-cs-en/` | 7 |
| `porter-competitive-advantage` | `extracts/porter-ca-en/` | 8 |
| `the-art-of-the-long-view` | `extracts/art-of-long-view/` | 7 |
| `platform-revolution` | `extracts/platform-revolution/` | 7 |

---

## 1. The A-Level Depth Baseline

The depth benchmark is set by the first three books that were fully executed:
**Business Model Generation, Value Proposition Design, The Invincible Company.**

A chapter is at A-level when:

- **EN body is ~3.8K–7.8 KB** (a proxy, never the goal — coverage drives length).
- It carries the **full 8-section structure** (see `chapter-template.md`).
- It reproduces **every** named concept, key argument (claim + evidence + reasoning),
  case (context → what happened → what it proves → lesson), logic chain, precise
  terminology, and nuance from the source chapter.
- ZH covers the **same checklist** as EN — same concepts, arguments, cases.
- Cross-references resolve to **real** slugs in `manifest.json`.

A chapter is a **stub / residual** (must be rewritten) when it is a copy of the
`index.json` summary, a bare bullet list, or visibly thinner than its checklist.

---

## 2. Pre-Writing Step: The Coverage Checklist

**Before writing any chapter, produce `checklists/<chapter>.json`.** It is the
machine-readable list of every key concept, argument, case, logic step, term, and
nuance the original chapter covers. The checklist IS the quality gate.

Build it by reading `extracts/<book>/chapters/<file>.txt` and extracting:

- **Named concepts/frameworks** — anything authors introduce, define, or name.
- **Key arguments/claims** — the chapter thesis + supporting claims, each with its
  evidence and reasoning.
- **Case studies/examples** — every company/product/industry cited as evidence,
  with context, what it illustrates, and the practitioner lesson.
- **Logic chains/flow** — the causal reasoning the chapter walks through.
- **Terminology with precise definitions** — terms given a specific meaning.
- **Counter-arguments / nuance** — things the author explicitly says are NOT the case.
- **Cross-references** — related canvas-def-ids, case slugs, pattern slugs, and
  sibling chapters (must later resolve in `manifest.json`).

The JSON shape is defined in `checklist-schema.md`.

---

## 3. Writing Rules

### 3.1 Write to the checklist

Every chapter Markdown must cover **every** item from its checklist. If an item is
in the checklist, it must appear and be explained in the chapter. No exceptions.

### 3.2 Required structure

Use the 8-section bilingual structure in `chapter-template.md`. Do not invent a new
shape; consistency across books is part of the product.

### 3.3 Bilingual rules

- EN and ZH cover the **same checklist** — same concepts, arguments, cases.
- ZH may use shorter, more concrete sentences but must not drop items.
- Named concepts use standard Chinese translations.
- Cross-reference slugs are **identical** between EN and ZH.

---

## 4. Verification Process (per chapter)

1. **Build checklist** from source → `checklists/<chapter>.json`.
2. **Write** EN + ZH chapter Markdown, covering every checklist item.
3. **Audit** — read finished prose against the checklist, mark each item ✅/❌ for
   EN and ZH in `audit-report.md`. Any ❌ → verdict FAIL → return to writing.
4. **Completion gate** — a chapter is done only when its `audit-report.md` row is
   all ✅ (EN + ZH) and the orphan / thickness / bilingual scripts report clean.

The three steps are carried by **mutually exclusive roles** (checklist / writing /
audit); never let one agent both write and audit the same chapter.

---

## 5. Anti-Patterns

- ❌ Chapter content = copy-paste of `index.json` summary.
- ❌ Chapter content = checklist items listed without explanation.
- ❌ Introducing concepts the source chapter doesn't discuss (hallucination).
- ❌ Omitting a concept present in the source.
- ❌ Cross-references to non-existent slugs.
- ❌ EN and ZH covering different content.
- ❌ Marking a book "done" before `audit-report.md` is all-PASS.

---

## 6. Completion Gate (hard rule)

A **book** is complete only when:

1. Every chapter in `chapters/index.json` has matching `.en.md` + `.zh.md` files.
2. Every chapter has a `checklists/<chapter>.json`.
3. `audit-report.md` lists every chapter with verdict **PASS** (all items ✅).
4. `check-orphans.py`, `check-thickness.py`, `check-bilingual.py` report clean.

---

*Version 3.0 — absorbed into the `book-chapter-quality` skill. All 12 books Tier A.*

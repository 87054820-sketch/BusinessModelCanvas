# Chapter Content Quality Specification

> **⚠️ MOVED — this document is now only a pointer.**
> The authoritative, maintained quality specification (v3) and its executable
> workflow live in the **`book-chapter-quality` skill**:
>
> - Spec (single source of truth): `.claude/skills/book-chapter-quality/references/quality-spec.md`
> - Checklist JSON schema: `.claude/skills/book-chapter-quality/references/checklist-schema.md`
> - 8-section chapter template + A-level sample: `.claude/skills/book-chapter-quality/references/chapter-template.md`
> - Three-role SOP + scripts: `.claude/skills/book-chapter-quality/SKILL.md`
>
> Any work on book chapter content MUST go through that skill. The text below is
> retained for historical reference only (v2) and is superseded by the skill's v3.

---

This spec governs the quality bar for every `chapters/{slug}.{en,zh}.md` in the
case-library. **The core standard is concept-coverage, not word-count.**

---

## 0. Capability Classification

Books fall into two tiers based on what source material is available:

| Tier | Books | Source available | Verification method |
|---|---|---|---|
| **A — Source-verified** | BMC, VPC, The Invincible Company | `extracts/<book>/chapters/*.txt` + `toc.json` | Cross-check every concept against source text |
| **B — Research-backed** | Blue Ocean Strategy/Shift, The Art of the Long View, Scenario Planning, Platform Revolution, Christensen, Testing Business Ideas, Porter 2× | Authoritative book summaries, published TOC, academic syllabi | Cross-check against well-researched chapter outlines |

**Tier B books**: Before writing chapter content, first produce a **chapter outline** for each chapter (derived from the published table of contents + recognized summaries), then write content against that outline.

---

## 1. Pre-Writing Step: The Coverage Checklist

**Before writing any chapter, produce a coverage checklist.** This is a bullet list of
every key concept, argument, case, framework, and logic step the original chapter
covers. The checklist IS the quality gate.

### 1.1 How to build the checklist (Tier A)

Read the source extract (`extracts/<book>/chapters/<chapter-file>.txt`) and extract:

- **Named concepts/frameworks**: anything the authors introduce, define, or name (e.g. "Value Network", "RPV Theory", "the 9 Building Blocks")
- **Key arguments/claims**: the chapter's thesis and supporting claims (e.g. "incumbents fail NOT because of bad management but because of rational resource allocation within their value network")
- **Case studies/examples**: every company, product, or industry cited as evidence (e.g. "Nucor mini-mills → rebar → bar → structural → sheet steel")
- **Logic chains/flow**: the causal reasoning the chapter walks through (e.g. "HDD industry: 14-inch leaders couldn't see 8-inch opportunity → because their best customers didn't want smaller drives → so they rationally ignored the small market → but the small market grew → by the time it was big enough, new entrants had all the capabilities")
- **Terminology with precise definitions**: any term the author gives a specific meaning to
- **Counter-arguments or nuance**: things the author explicitly says are NOT the case
- **Diagrams/frameworks described in text**: even if we don't have the image, describe what it shows

### 1.2 How to build the checklist (Tier B)

Research the chapter from:
- Published table of contents (original book)
- Authoritative book summaries (Harvard Business Review summaries, Blinkist, etc.)
- Academic course syllabi that assign the chapter
- The book's own introduction chapter (which often previews the structure)

Extract the same categories as Tier A. Mark items that you're confident about vs. items that need more research.

### 1.3 Checklist format

```markdown
## Coverage checklist — {Chapter Title}

### Named concepts/frameworks
- [ ] Concept A: {definition if known}
- [ ] Concept B: {definition if known}

### Key arguments
- [ ] Argument 1: {the claim}
- [ ] Argument 2: {the claim}

### Cases/examples
- [ ] Case 1: {company/scenario → what it illustrates}
- [ ] Case 2: {company/scenario → what it illustrates}

### Logic chains
- [ ] Logic flow: {step 1} → {step 2} → {step 3}

### Terminology
- [ ] Term 1: {precise definition as used in the book}
- [ ] Term 2: {precise definition as used in the book}

### Nuance/qualifications
- [ ] The author explicitly says X is NOT the same as Y
- [ ] Limitation of the framework: {what it can't do}
```

---

## 2. Writing Rules

### 2.1 Write to the checklist

Every chapter markdown must cover **every checked item** from the coverage checklist.
If an item is in the checklist, it must appear in the chapter content. No exceptions.

### 2.2 Required structure

```markdown
# {Chapter Title}

> **核心论点 / Core argument:** {one-sentence thesis}

## 本章在全书中的位置 / Why This Chapter Matters

{Place this chapter in the book's overall argument arc}

## 核心概念 / Core Concepts

### {概念名 / Concept Name}
{what it is, why it matters, how it relates to other concepts}

### {另一个概念 / Another Concept}
...

## 关键论证 / Key Arguments

### {论证 / Argument}
{the claim + the evidence + the reasoning}

## 案例 / Real-World Cases

### {案例 / Case}
{context → what happened → what it proves → lesson for practitioners}

## 应用启示 / Connecting to Practice

{concrete practitioner advice}

## 关联 / Connections

- **本书内部 / Within this book:** {related chapters}
- **PinGarden 映射 / To PinGarden:** `canvas-def-id` / `pattern-slug` / `case-slug`

## 关键要点 / Key Takeaways

{numbered list derived from the checklist}
```

### 2.3 Bilingual rules

- EN and ZH must cover the **same checklist** — same concepts, arguments, cases
- ZH may use shorter, more concrete sentences
- Named concepts must use standard Chinese translations
- Cross-references (slugs) must be identical between EN and ZH

---

## 3. Verification Process (per chapter)

### Step 1: Build checklist from source

Read the source material → produce the coverage checklist (Section 1 format).

### Step 2: Write chapter content

Write EN and ZH chapter markdown, covering every checklist item.

### Step 3: Self-audit

Read the generated content against the checklist:

- [ ] Every named concept appears and is explained
- [ ] Every key argument appears with its supporting evidence
- [ ] Every case study appears with context + lesson
- [ ] Every logic chain is faithfully reproduced
- [ ] No hallucinated concepts (concepts not in the source)
- [ ] No hallucinated cross-references (slugs that don't exist)
- [ ] EN and ZH cover the same checklist (not different content)

### Step 4: Acceptance criteria

A chapter is **done** when:
1. All checklist items are covered in both EN and ZH
2. Self-audit passes all checks
3. Cross-references resolve to valid slugs

---

## 4. Anti-Patterns

- ❌ Chapter content = copy-paste of `index.json` summary
- ❌ Chapter content = checklist items listed without explanation
- ❌ Introducing concepts the source chapter doesn't discuss
- ❌ Omitting a concept present in the source
- ❌ Cross-references to non-existent slugs
- ❌ EN and ZH covering different content

---

## 5. Source Material Map

### Tier A — Source-verified (PDF/txt available, just needs extraction)

| # | Book slug | Source material | Language | Status |
|---|---|---|---|---|
| 1 | `business-model-generation` | `extracts/bmc-en/` (12 txt) + `extracts/bmc-zh/` (13 txt) + PDF | EN+ZH | ✅ Extracts ready |
| 2 | `value-proposition-design` | `extracts/vpc-zh/` (10 txt) + `BusinessBooks/Value+Proposition+FULL.txt` (471 lines EN) + PDF | EN+ZH | 🔧 Need EN chapter splitting |
| 3 | `the-invincible-company` | `extracts/invincible-en/` (38 txt) + PDF | EN only | ⚠️ EN ready, no ZH |
| 4 | `blue-ocean-strategy` | `BusinessBooks/Blue Ocean Strategy.pdf` (EN) + 蓝海战略×3 PDF (ZH) | EN+ZH | 🔧 Need PDF→txt extraction |
| 5 | `blue-ocean-shift` | `BusinessBooks/蓝海战略 2.pdf` (ZH) | ZH only | 🔧 Need extraction, EN missing |
| 6 | `porter-competitive-strategy` | `BusinessBooks/Michael.Porter.-.Competitive.Strategy.pdf` (EN) | EN only | 🔧 Need PDF→txt extraction |
| 7 | `porter-competitive-advantage` | `BusinessBooks/Michael.Porter.-.Competitive.Advantage.pdf` (EN) | EN only | 🔧 Need PDF→txt extraction |
| 8 | `scenario-planning-in-organizations` | `BusinessBooks/Scenario+Planning+in+Organizations.pdf` (EN) | EN only | 🔧 Need PDF→txt extraction |
| 9 | `testing-business-ideas` | `BusinessBooks/Testing Business Ideas.pdf` (EN) | EN only | 🔧 Need PDF→txt extraction |
| 10 | `christensen-innovators-dilemma` | `BusinessBooks/The+Innovators+Dilemma.pdf` (EN) + `[创新者的窘境].txt` (1780 lines, EN+ZH) | EN+ZH | 🔧 Need txt chapter splitting |

### Tier B — Research-backed (no source PDF available)

| # | Book slug | Source material | Notes |
|---|---|---|---|
| 11 | `the-art-of-the-long-view` | No PDF found | Research from published TOC + summaries |
| 12 | `platform-revolution` | No PDF found | Research from published TOC + summaries |

---

*Version 2.0 — Last updated 2026-06-29*

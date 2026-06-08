# Book Rebuild Specification

This document governs how agents rebuild raw PDF extractions into structured,
readable, searchable book knowledge bases.

## 1. Output Structure

Each book lives at `packages/canvases/<canvas>/knowledge/book/`:

```
book/
├── README.md              # Book metadata + quick nav
├── index.json             # Chapter index
├── keywords.json          # Inverted keyword index
├── en/
│   ├── 01-canvas/
│   │   ├── README.md      # Main chapter doc
│   │   └── assets/        # Chapter images + .meta.json sidecars
│   ├── 02-patterns/
│   └── ...
└── zh/
    └── ... (mirror structure)
```

**Slug rules:**
- Format: `{NN}-{kebab-case-title}`
- Example: `01-canvas`, `02-patterns`, `07-explore-and-exploit`
- Must match between `en/` and `zh/` for cross-language linking

## 2. Chapter README.md Format

```markdown
# {Chapter Title}

> **Pages:** {start}–{end}  
> **Keywords:** {3–5 comma-separated keywords}  
> **Summary:** {1–2 sentence TL;DR}

---

## 1. {Section Title}

{Paragraphs of soft-wrapped prose. No hard line-breaks mid-sentence.}

{Another paragraph.}

![Figure 1: {Descriptive caption explaining what the diagram shows}](assets/fig-1.png)

> **Key takeaway:** {A bolded highlight or core insight from the book.}

## 2. {Section Title}

...
```

**Content rules:**
1. **Paragraphs** — soft-wrapped prose. Remove all inline hard line-breaks from PDF extraction.
2. **Headings** — use `## 1. Title`, `## 2. Title` for major sections within the chapter. Deeper nesting with `###` if needed.
3. **Images** — every `![...](...)` must have a **descriptive caption** (not just "Figure 1"). Caption should explain what the reader will see.
4. **Key takeaways** — use `> **Key takeaway:** ...` block quotes for the most important insight in each section.
5. **Page references** — keep original page numbers inline as footnotes: `[^p42]` or simply note `(p.42)` where helpful.
6. **No garbage** — delete copyright blurbs, adverts, blank TOC pages, index pages, glossary pages. These are not chapters.
7. **No decorative filler** — skip images classified as `decorative` by `analyze-images.py` unless they are iconic (e.g., the brain MRI in BMC). Keep `template`, `example`, `process`, `comparison`, `diagram`.

## 3. Image Handling

### 3.1 Image Sources

Each canvas has three potential image sources:

| Source | Location | Quality | Notes |
|--------|----------|---------|-------|
| PDF embedded images | `book/assets/en-page-N-img-M.png` | Variable | Extracted by PyMuPDF; many are icons/decorative |
| Page renders | `tmp/{book-id}-p{N}.png` | High | Full-page renders; best for info-graphics and templates |
| Knowledge assets | `knowledge/assets/*.png` | Curated | Already hand-picked for canvas knowledge panels |

**Priority:** Page renders > PDF embedded images > knowledge assets (for book content).

### 3.2 Image Selection Criteria

For each chapter, pick **5–15 images** max. Use these criteria:

- **Must include:**
  - The blank canvas/template diagram (if chapter introduces it)
  - At least one real-world example (filled-in canvas)
  - Key conceptual diagrams mentioned in the text
- **Skip:**
  - `decorative` category images (check `.meta.json`)
  - Duplicate diagrams (same concept shown twice)
  - Tiny icons (< 200px)
  - Pages that are mostly text with no visual structure

### 3.3 Image Naming

```
assets/
├── fig-1-template.png           # numbered + descriptive suffix
├── fig-2-apple-example.png
├── fig-3-process-flow.png
└── fig-1-template.meta.json     # sidecar from analyze-images.py
```

### 3.4 Image Metadata

Every image in `assets/` must have a `.meta.json` sidecar with:

```json
{
  "file": "fig-1-template.png",
  "source_page": 44,
  "description": "The blank Business Model Canvas showing 9 building blocks",
  "category": "template",
  "keywords": ["canvas", "template", "nine blocks"]
}
```

Generate with `python tools/analyze-images.py <assets-dir>`.

## 4. Text Cleaning Rules

### 4.1 Paragraph Unwrapping

PDF extractions often have hard line-breaks every 60–80 chars. Fix them:

```python
# Before (raw):
# A business model describes the rationale of how an
# organization creates, delivers, and captures value.

# After (clean):
# A business model describes the rationale of how an organization
# creates, delivers, and captures value.
```

Algorithm:
1. Collapse single newlines within paragraphs: `replace("\n", " ")`
2. Preserve double newlines as paragraph breaks: `replace("\n\n", "\n\n")`
3. Preserve headings (lines starting with `#`) and list items (`- `, `1. `)

### 4.2 Heading Detection

If raw text contains ALL-CAPS lines or bold phrases that look like section headers,
promote them to `##` or `###` headings.

### 4.3 Garbage Detection

Skip pages/chapters that are:
- Copyright/legal boilerplate (> 50% of text is "Copyright", "ISBN", "Wiley", "All rights reserved")
- Blank TOC pages (only page numbers and dots)
- Index pages (alphabetical lists with page numbers)
- Advert pages ("Also by...", "Visit our website...")
- Acknowledgments/About the Author (unless specifically requested)

## 5. index.json Format

```json
{
  "book": "Business Model Generation",
  "authors": "Alexander Osterwalder & Yves Pigneur",
  "language": "en",
  "total_chapters": 5,
  "chapters": [
    {
      "slug": "01-canvas",
      "title": "Canvas",
      "page_start": 15,
      "page_end": 51,
      "keywords": ["business model canvas", "nine building blocks", "shared language"],
      "summary": "Introduces the Business Model Canvas as a shared language for describing, visualizing, and changing business models.",
      "has_images": true,
      "image_count": 12,
      "sections": ["Introduction", "The 9 Building Blocks", "The Business Model Canvas Template"],
      "key_images": [
        {
          "file": "assets/fig-1-template.png",
          "caption": "The blank Business Model Canvas with 9 building blocks",
          "category": "template",
          "keywords": ["canvas template", "nine blocks"]
        }
      ]
    }
  ]
}
```

## 6. keywords.json Format

```json
{
  "business model canvas": {
    "chapters": ["01-canvas", "02-patterns"],
    "images": ["01-canvas/assets/fig-1-template.png"]
  },
  "customer segments": {
    "chapters": ["01-canvas"],
    "images": []
  }
}
```

Keywords should come from:
1. Chapter titles and section headings
2. Image `.meta.json` keywords
3. Bolded terms in the text

## 7. Per-Book Quick Reference

### BMC (Business Model Generation)
- **Pages:** ~260 (EN), ~430 (ZH)
- **Chapters:** 5 (Canvas, Patterns, Design, Strategy, Process)
- **Key images:** Blank canvas template, Apple iTunes example, 9 building blocks diagrams, patterns gallery
- **Notes:** ZH is an omnibus (5 books in 1); book 1 covers BMC pages 33–87

### VPC (Value Proposition Design)
- **Pages:** ~260 (EN)
- **Chapters:** 4 major sections (Canvas, Design, Test, Evolve)
- **Key images:** VPC overview, Customer Profile, Value Map, Fit diagram, testing process
- **Notes:** EN has very few extracted images (only 3); rely heavily on page renders (`tmp/vpc-en-p*.png`)

### PM (Portfolio Map / The Invincible Company)
- **Pages:** ~370 (EN)
- **Chapters:** 37 raw files, but many are garbage. Real chapters: Tool, Manage, Invent, Improve, Culture
- **Key images:** Portfolio Map template, Explore/Exploit continuum, innovation journey, four quadrants
- **Notes:** Has the most extraneous files (copyright, contents, adverts, index). Aggressive garbage removal needed.

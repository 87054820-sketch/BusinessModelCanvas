# Chapter Structure Template + A-Level Sample

Every `chapters/<slug>.{en,zh}.md` follows the same 8-section structure. The EN and
ZH files are mirror translations covering the same checklist. Headings are bilingual
where the existing books are bilingual; match the sibling chapters in the same book
for heading style.

## The 8 sections

```markdown
# {Chapter Title}

> **Core argument:** {one-sentence thesis of the chapter}

## Why This Chapter Matters
{Place this chapter in the book's overall argument arc — what came before, what this
adds, why a practitioner should care. 1 substantial paragraph.}

## Core Concepts
### {Concept Name}
{What it is, why it matters, how it relates to other concepts. One short section per
`concepts[]` checklist item.}

## Key Arguments
### {Argument}
{The claim + the evidence + the reasoning. One per `arguments[]` item.}

## Real-World Cases
### {Case}
{context → what happened → what it proves → lesson for practitioners. One per
`cases[]` item.}

## Connecting to Practice
{Concrete, actionable practitioner advice synthesized from the chapter. Where useful,
walk the `logicChains[]` as a how-to.}

## Connections
- **Within this book:** {related sibling chapters from relatedChapters}
- **To PinGarden:** `canvas-def-id` / `pattern-slug` / `case-slug`
  {only slugs that resolve in manifest.json}

## Key Takeaways
{Numbered list derived from the checklist — the load-bearing points, including any
`nuance[]` qualifications and `terminology[]` definitions woven in.}
```

## Section ↔ checklist mapping

| Checklist field | Lands in section |
|---|---|
| `concepts[]` | Core Concepts (one `###` each) |
| `arguments[]` | Key Arguments (one `###` each) |
| `cases[]` | Real-World Cases (one `###` each) |
| `logicChains[]` | Connecting to Practice (narrated as how-to) |
| `terminology[]` | woven into Core Concepts / Key Takeaways |
| `nuance[]` | woven into the relevant section + Key Takeaways |
| `crossReferences` | Connections |

Every checklist item must be traceable to text in the chapter — that is exactly what
the audit role verifies, item by item, for both EN and ZH.

## A-level depth markers (the bar to clear)

From the benchmark books (BMC / VPC / Invincible):

- EN body roughly **3.8K–7.8 KB** (proxy only; coverage is the real target).
- Each concept gets a **substantive paragraph**, not a one-liner — definition + why
  it matters + how it connects (see the annotated sample below).
- Each case carries the full **context → happened → proves → lesson** arc.
- Arguments state the **claim AND its evidence/reasoning**, not just the claim.

## Annotated A-level sample (BMC ch01, abridged)

```markdown
# Canvas: The Business Model Canvas

> **Core argument:** A shared visual language of nine interconnected building blocks
> is the precondition for systematically describing, challenging, and reinventing how
> any organization creates, delivers, and captures value.

## Why This Chapter Matters
Every conversation about strategy comes back to one question: what exactly is our
business model? Without a shared definition teams talk past each other — marketing
calls it the go-to-market plan, operations the supply chain, finance the P&L. This
chapter introduces the canvas: a practical tool giving everyone the same nine-block
vocabulary. It is not a shorter business plan; it is a shared hypothesis map that
changes as evidence changes.

## Core Concepts
### Customer Segments (CS)
Different groups of people or organizations an enterprise aims to reach and serve.
Groups become distinct segments when they require fundamentally different offers, are
reached through different channels, demand different relationship types, have
substantially different profitability, or pay for different aspects of the value
proposition. Segmentation is about distinct needs that demand distinct business-model
responses — not demographics alone.
...

## Real-World Cases
### Apple iPod/iTunes
Apple did not invent the MP3 player — it reinvented the business model around it
(context). It combined hardware (iPod), software (iTunes), and a new revenue stream
(99¢ songs) that solved a legal pain point for the music industry (what happened).
This shows how all nine blocks interact to create a system-level innovation, not just
a product one (what it proves). Lesson: business-model innovation often matters more
than product innovation, and a model whose blocks reinforce each other is hard to
copy.

## Key Takeaways
1. A business model is the rationale of how an organization creates, delivers, and
   captures value, expressed in nine interconnected blocks.
2. The blocks form a system: a choice in one cascades through the others.
3. The canvas is a shared hypothesis map, not a shorter business plan.
...
```

Notice: every paragraph carries source-faithful substance; the case has the full
arc; the takeaways fold in nuance. That density across all sections is "A-level".

# Value Proposition Design — Book Case Extraction

This note records the copyright-safe extraction from the local full PDF and EPUB of *Value Proposition Design: How to Create Products and Services Customers Want*.

## Local source check

| File | Status | Notes |
|---|---|---|
| `/Users/siboli/Documents/CodeBuddy/BusinessBooks/Value+Proposition+FULL.pdf` | Complete PDF | 323 PDF pages; metadata title `Value Proposition Design`; author metadata lists Alan Smith, Alexander Osterwalder, Yves Pigneur, Gregory Bernarda, Trish Papadakos; PDF outline exposes full book structure. |
| `/Users/siboli/Documents/CodeBuddy/BusinessBooks/Value+Proposition+Design_+How+to+Create+Products+and+Services+Customers+Want-Wil.epub` | Complete EPUB | EPUB metadata includes `Value Proposition Design: How to Create Products and Services Customers Want (Strategyzer)`, Wiley, language `en`, identifier `9781118973103`; 468 HTML chapter fragments. |
| `/Users/siboli/Documents/CodeBuddy/BusinessBooks/Value-proposition-design.pdf` | Preview / partial | Previously confirmed as preview material, not the full book. |

The EPUB is better for clean keyword search. The PDF is better for page references because it has a full outline and stable page positions.

## Chapter map from PDF outline

- Front matter and tool overview: PDF pages 8–28
- Chapter 1 — Canvas: PDF pages 30–93
  - Customer Profile: jobs, pains, gains, ranking, best practices
  - Value Map: products/services, pain relievers, gain creators
  - Fit: three kinds of fit, B2B profiles, multiple fits, context variants
- Chapter 2 — Design: PDF pages 94–201
  - Prototyping possibilities
  - Starting points and design constraints
  - Understanding customers
  - Making choices and competitor comparison
  - Finding the right business model
  - Designing in established organizations
- Chapter 3 — Test: PDF pages 202–283
  - What to test
  - Testing step-by-step
  - Experiment library
  - Owlet case
- Chapter 4 — Evolve: PDF pages 284–303
  - Alignment, measuring, improving, reinventing
  - Taobao case
- Index and back matter: PDF pages 304–323

## Case / example extraction matrix

| Example | Book location | VPD concept | PinGarden status | Action |
|---|---:|---|---|---|
| Azuri / Eight19 | Design 2.5; printed pp. 146–151; PDF pp. 174–179 | Fit between technology, customer pain, pricing, payment mechanism, and viable business model | No existing case | Candidate new case only. Strong teaching value, but needs separate approval before creating a full case. |
| Owlet | Test 3.4; printed pp. 246–251; PDF pp. 274–279 | Systematic testing, pivot from hospital/nurse segment to worried parents, interviews, landing page, A/B price test | No existing case | Candidate new case only. Strong VPD/Test example, but should be separately scoped because it needs canvases and public fact review. |
| Taobao / Alibaba | Evolve; printed pp. 268–271; PDF pp. 296–299 | Evolving value proposition and business model as trust, payment, logistics, sellers, and buyers change | Existing `alibaba-group` | Add VPD source and include in VPD resource case index. No new case needed. |
| Airbnb | Design 2.2; printed p. 91; PDF around p. 119 | Platform design constraint; different value propositions for both sides of a marketplace | Existing `airbnb` | Add VPD source and include in VPD resource case index. No new case needed. |
| Nespresso | Design 2.2; printed p. 90; PDF around p. 118 | Razor-blade / recurring consumable design constraint; value proposition embedded in business model | Existing `nespresso` | Add VPD source and retain in VPD resource case index. |
| Swatch | Design 2.2; printed p. 90 | Trendsetter design constraint; turning cheap production technology into fashion value | No existing case | Resource-only mention; not enough current PinGarden context to create a case now. |
| Hilti | Design 2.2; printed p. 90 | Servitization constraint; shifting product sale to service/subscription logic | No existing case | Candidate for future service-model case, not added now. |
| Southwest | Design 2.2; printed p. 91 | Low-cost simplification constraint | No existing case | Resource-only mention; may fit future low-cost pattern work. |
| Apple / App Store / WhatsApp | Design 2.4 and index entries | Competitor assessment / context and platform comparison | No existing case | Resource-only mention; not enough VPC-specific case depth here. |
| Dropbox / Marriott landing-page examples | Test experiment library | Experiment examples such as landing page or unique-link tracking | No existing case | Keep as experiment-method reference, not case material. |

## Selection principles

- Existing cases should be enriched only when the book clearly teaches a VPD concept.
- Weak mentions stay in this audit note or the resource reading map, not in `case.json`.
- New cases such as Azuri and Owlet should require a separate case-authoring pass because they need public fact review, canvases, and story quality work.
- Do not copy long book passages into the repository. Use original summaries and page/chapter references only.

## Recommended first changes

1. Update `value-proposition-design` resource to acknowledge the full PDF/EPUB review.
2. Add a book-case index to the VPD reading notes.
3. Add `airbnb` and `alibaba-group` to VPD `relatedCaseSlugs` because they are directly in the book.
4. Add VPD source rows to `airbnb`, `alibaba-group`, and `nespresso`.
5. Keep Azuri and Owlet as future case candidates until explicitly approved.

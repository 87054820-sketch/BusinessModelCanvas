# Search Trend Analysis

Use Google Trends, Ahrefs / SEMrush keyword volumes, Baidu Index, and Reddit / Hacker News search to gauge whether the unmet-need vocabulary you've heard in interviews shows up at scale on the public web — and whether it's trending up, flat, or down.

## When to use

- After interviews surfaced specific problem language ("PR review fatigue", "AI hallucination cost"); you want to see if the language travels.
- Sizing whether a niche is wide or narrow before committing engineering.
- Sanity-check on the Business Model Environment's "key trends" block — is the macro trend you assumed in the BMC actually happening?
- Picking between two segment candidates by relative search volume.

Don't use:

- Most B2B niches — search volume signal is weak when buyers research via analyst reports + word-of-mouth, not Google.
- New problem framings that don't have vocabulary yet — you'll see "no volume" but it could just be missing language.

## How to run

1. **Translate interview language into 5-15 query candidates.** Both head terms ("AI code review") and long-tails ("how to triage 80 PRs a day").
2. **Pull volumes + trend lines** for each. 5-year window for trend, 12-month for noise.
3. **Compare relative magnitudes** between candidates. A 10× difference in volume is signal; a 2× difference inside the same noise band isn't.
4. **Look at related queries.** The "rising" panel in Trends often surfaces vocabulary you didn't think of.
5. **Cross-reference with Reddit/HN search counts.** If volume is high but no community discusses it, the keyword may be hijacked by a pre-existing solution category.

## What good looks like

- One head term clearly outranks alternatives (3-10× volume).
- Trend line is flat-or-up over 5 years (a flat-or-falling trend is fatal — don't go to market against gravity).
- Vocabulary maps onto the Customer Interview language.
- Geography and seasonality match the segment you're targeting.

## Anti-patterns

- ❌ Over-fitting on a single head term. The picture only emerges from 5-15 queries.
- ❌ Confusing absolute volume with addressable market — high search volume can be hobbyists.
- ❌ Reading a 30-day spike as a trend. Use 5 years.
- ❌ Skipping Reddit/HN cross-check — Google volume can be inflated by SEO spam targeting that keyword.

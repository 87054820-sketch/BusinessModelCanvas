# Open Business Models

> *Open business models can be used by companies to create and capture
> value by systematically collaborating with outside partners. This
> may happen from the "outside-in" by exploiting external ideas within
> the firm, or from the "inside-out" by providing external parties
> with ideas or assets lying idle within the firm.*
> — Osterwalder & Pigneur, *Business Model Generation*, p. 109  *(BMG 2010)*

## Why this pattern matters

Henry Chesbrough's 2003 article in *MIT Sloan Management Review*
*(Chesbrough 2003 MIT Sloan)* did to corporate R&D what Anderson's
*Wired* essay did to pricing: it named a paradigm shift that had
already been happening in plain sight. The closed-innovation paradigm
— "smart people work for us; we win by doing the best internal R&D" —
was breaking down. Talented engineers worked at startups, top
researchers stayed in academia, and venture-funded ecosystems were
faster than corporate R&D budgets. Chesbrough argued the right
response wasn't to spend more on internal R&D, it was to *open the
process*: bring external ideas in, let internal ideas out, capture
value at the boundary.

The 2006 book *(Chesbrough 2006)* extended the argument from R&D to
the *business model*. The crucial insight: external ideas die in
commercialisation if the business model is closed, because the
commercialisation steps (channels, customer relationships, revenue
streams) all assume the firm did the inventing. To make
open-innovation actually pay, the BMC has to be redesigned for it.

*Business Model Generation (BMG 2010)* canonicalises Open as Pattern
No. 5 in its catalog and adopts Chesbrough's outside-in / inside-out
distinction. The split matters because the two flows rewrite different
BMC blocks: outside-in changes Key Resources and Key Activities (you
acquire ideas externally); inside-out changes Revenue Streams and Key
Partners (you sell or pool what was idle). A BMC designed for one is
incoherent for the other.

## Two sub-types of Open

The pattern has two sub-types. The decisive question is *which
direction does the value flow across the firm boundary*.

### 1. Outside-in (external ideas in)

Internal R&D is supplemented — sometimes replaced — by ideas, IP, and
technology acquired from outside. The firm builds *gateways*
(scouting roles, internet platforms, retired-scientist programmes,
licensing-in agreements) to systematically capture external know-how
and route it to internal product teams. Cost of search drops; "Not
Invented Here" syndrome is the cultural enemy.

**Paradigm**: Procter & Gamble's "Connect & Develop" (2000-onward).
A.G. Lafley took over as CEO in 2000 mid-share-price-slide and set a
goal that 50% of P&G's innovations would come from outside the firm
(up from ~15%). They reached the goal in 2007; R&D productivity went
up 85% on roughly flat R&D spend. Three "bridges" did the work:
technology entrepreneurs (P&G scientists scouting outside), internet
platforms like InnoCentive, and a YourEncore.com platform that
re-engaged retired industry scientists. Olay Regenerist, Mr. Clean
Magic Eraser, and the Crest SpinBrush all shipped via Connect &
Develop.

The BMC change: **Key Resources** stops being "our patents and our
labs" and becomes "our patents, our labs, AND a curated network of
external scientists, startups, and crowdsourcing platforms". **Key
Activities** adds "scout and integrate external IP". **Key Partners**
gains a whole new tier of innovation-platform relationships.

The trade-off: **NIH syndrome and integration cost**. External ideas
need internal advocates; without them they get rejected as
"not-invented-here" or starved of commercialisation budget. And every
external partnership has its own legal, technical, and managerial
overhead — outside-in only pays when the integration capability is
itself a Key Activity, not a one-off.

### 2. Inside-out (idle IP out)

The firm's own R&D produces more than it commercialises. Patents sit
unused in legal portfolios, technologies stay unrelated to the core
business, scientists' best ideas are out of strategic scope. Inside-
out monetises those idle assets through licensing, spin-out, joint
venture, or IP pools — capturing some value from assets that would
otherwise generate zero return.

**Paradigm**: GlaxoSmithKline's patent pools for neglected tropical
diseases (announced 2009 by then-CEO Andrew Witty, formally launched
2010). Big-pharma R&D produces lots of compounds with potential
activity against neglected diseases (malaria, leishmaniasis,
schistosomiasis, etc.) but no path to a profitable drug — neglected
populations can't afford typical pharma pricing. GSK pooled the
relevant IP and opened it to outside researchers, charging modest
license fees while gaining reputation, regulatory goodwill, and
follow-on R&D leads. WIPO Re:Search expanded the model to other
pharma companies in 2011.

The BMC change: **Revenue Streams** gain a new line (license fees,
royalties, spin-out equity) for assets that previously generated
nothing. **Key Partners** gains the licensees / spin-out partners.
**Customer Segments** sometimes gains a new segment that was never
the firm's commercial market (researchers, NGOs, generic
manufacturers).

The trade-off: **cannibalisation fear**. Internal voices argue
licensing-out IP creates a future competitor. The fear is usually
overstated for assets that are genuinely idle — the firm wasn't going
to commercialise them — but it's real for assets near the core. The
discipline is being honest about what's actually idle and what only
*looks* idle because internal teams haven't gotten to it yet.

## What an Open BMC looks like

There is no single "Open BMC" — outside-in and inside-out rewrite
different blocks. What's universal:

- **Key Partners** — this is the signature block in both directions.
  Outside-in adds innovation-platform partners (InnoCentive,
  university tech-transfer offices, scouting agencies). Inside-out
  adds licensee partners or pool members (other pharma, IP funds,
  open-source consortia).
- **Key Resources** (outside-in) or **Revenue Streams** (inside-out)
  is where the new value flow shows up. Outside-in: external IP
  network, scouting team, integration capability. Inside-out: license
  fee stream, royalty stream, spin-out equity.
- **Key Activities** — both sub-types add an "open-innovation
  management" activity that the closed model didn't need: contract
  templates, IP valuation, partnership operations, integration
  governance.
- **Cost Structure** — open models trade variable external costs for
  reduced internal R&D fixed costs. The trade is favourable only when
  the integration capability is mature; for firms with no
  open-innovation muscle the variable costs alone are net new without
  the offsetting reduction.

## Concrete examples

**Outside-in**:

- **Procter & Gamble Connect & Develop** — primary. The case we go
  deep on (`procter-gamble-cd`). Two BMCs: closed-R&D archetype
  (pre-2000) + open Connect & Develop variant (post-2000). 50%
  external goal achieved 2007; R&D productivity +85%.
- **InnoCentive** — secondary, also tagged `multi-sided-platforms`.
  See `innocentive` in this library — the platform that runs
  outside-in *as a service* for many seekers (P&G, Eli Lilly, NASA,
  Rockefeller Foundation). Mechanically a multi-sided platform
  connecting "seekers" (companies with unsolved problems) and
  "solvers" (independent scientists).
- **GE Ecomagination open-innovation challenges** (2005–) — GE
  publishes specific cleantech problems and partners with winning
  startups for joint commercialisation.
- **LEGO Ideas** (2008–) — fan-designed sets are upvoted, the LEGO
  team commercialises the winners and pays the original designer a
  royalty. Outside-in for product, not R&D, but the mechanism is the
  same.

**Inside-out**:

- **GlaxoSmithKline patent pools** — primary. The case we go deep on
  (`glaxosmithkline-patent-pool`). Pool of IP for neglected tropical
  diseases opened to external researchers. License fees as side
  revenue; reputation and access dividend.
- **Xerox PARC → spinouts** — Xerox's research lab generated more
  ideas than Xerox could commercialise; PostScript (Adobe), Ethernet
  (3Com), the GUI (Apple licence) all left as spinouts that became
  larger than parts of the parent. Often cited as a *failed*
  inside-out — Xerox didn't capture value because the spin-out
  contracts didn't include royalty or equity stakes.
- **IBM patent licensing** — IBM earns ~$1B/yr in licensing revenue
  from its patent portfolio independent of its operating businesses.
  A discipline of inside-out turned a defensive IP moat into a
  revenue stream.
- **Tesla open-sourcing patents (2014)** — explicitly *not* charging
  license fees, but the same flow direction: idle patents released
  externally to grow the EV ecosystem. The capture mechanism is
  ecosystem leverage rather than royalty.

**Bilateral**: many mature open-innovation firms run *both* directions
in parallel. P&G runs Connect & Develop *and* licenses out P&G
technology that doesn't fit consumer products. GSK runs the patent
pool *and* licenses-in compounds from outside. Treating the two
sub-types as exclusive is a common authoring mistake.

## What goes wrong

Different failure modes per sub-type — the symptoms tell you which
sub-type the model is actually trying to be:

- **NIH ("Not Invented Here") rejection (outside-in).** External
  ideas reach the firm but die at integration. Internal teams
  consider them lower-quality or threatening; they get rejected,
  starved of budget, or buried in a long-tail "evaluation"
  bureaucracy. The fix is structural: external ideas need internal
  champions with budget authority, and the integration capability has
  to be measured (50% target was P&G's structural fix).
- **Search cost dominates (outside-in).** If finding the right
  external idea costs more than developing it internally, the
  arithmetic doesn't work. Connector platforms (InnoCentive,
  YourEncore) exist precisely to push search costs down via
  aggregated networks; firms without those platforms often spend
  more on scouting than they save on R&D.
- **Cannibalisation fear (inside-out).** Internal voices argue
  licensing-out IP creates a future competitor. The conservative
  default is "don't license", which keeps the IP idle and earning
  zero. The discipline is admitting what's *actually* idle versus
  what's nominally on the strategic roadmap but never moving.
- **Underpriced licensing (inside-out).** Licensors often
  systematically underprice IP in the first deals because they have
  no benchmarks. Xerox PARC's spinouts captured almost no value back
  to Xerox because the licensing terms were one-shot fees with no
  royalties or equity.
- **Mistaking ad-hoc partnership for the pattern.** Every R&D org has
  *some* outside relationships; that doesn't make them open. The
  pattern starts when open-innovation becomes a Key Activity with a
  measurable share of the model — typical threshold ~25-30% of
  innovation pipeline coming from / going to outside.

## Read the examples

Three cases ship in the library across the two sub-types. Read them
in this order to see the mechanism:

- **`procter-gamble-cd`** — primary, *outside-in*. Two BMCs: closed
  R&D archetype (pre-2000) + Connect & Develop variant (post-2000).
  Read first to see outside-in at full corporate scale.
- **`glaxosmithkline-patent-pool`** — primary, *inside-out*. Two
  BMCs: traditional Big Pharma archetype + patent-pool variant. Read
  to see inside-out where the strategic logic includes reputation
  and access, not just license fees.
- **`innocentive`** — secondary, *outside-in (and MSP)*. One BMC.
  Read to see the connector platform that runs the pattern as-a-
  service for many seekers; demonstrates the structural overlap with
  Multi-Sided Platforms.

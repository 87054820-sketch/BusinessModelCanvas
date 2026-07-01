# Case library — read for inspiration, fork to edit

PinGarden ships a curated **case library** at `packages/case-library/` (read-only) — real company analyses across multiple canvases, with the user's local "my projects" living in writable user storage. The library and the user's projects are federated: the same HTTP routes (and the same CLI) read both, but the library cannot be edited.

Two flows you'll see most:

## 1. Read-only borrow — "show me how X did it"

User asks "how would Tesla fill the BMC?" or "I want a private-banking BMC like Maerki Baumann does it." Don't fork yet — first read the library, learn the shape, then apply that knowledge to the user's own canvases.

```bash
# Browse what's available
pingarden case list --json
pingarden case list --tag automotive --json

# Get the structural shape (zone titles, color legend, canvas list) without
# pulling every sticky — cheap, good for orientation
pingarden case describe <slug> --lang <en|zh> --json

# THE KILLER COMMAND: pull every canvas + every story body of a case
# in one shot. Use this when the user wants you to actually mirror the
# analysis or quote from it.
pingarden case read <slug> --lang <en|zh> --json
```

`case read` returns the full `AiContext` for every canvas (block-grouped sticky JSON, identical to `canvas read`) plus the markdown body of every story. Same shape as a normal canvas read — just batched and labelled by case.

The library is **read-only**: any `canvas write` against a library canvas returns 403. If the user wants to actually edit, you must fork first.

## 2. Fork to edit — "use Y as my starting point"

User wants their own copy of a library case (often "the structure looks great, change the company / details"). Fork = deep copy into user storage with new UUIDs; story `::canvas[]{canvasId="..."}` directives are rewritten to point at the new canvases so the forked story renders correctly.

```bash
# 1. Fork — returns the new project + canvas + story IDs
pingarden case fork <slug> --json

# 2. From here it's standard editing. The new canvases are normal user
#    canvases — write, snapshot, restore, story all work as usual.
pingarden canvas read <newCanvasId> --json
echo '<payload>' | pingarden canvas write <newCanvasId> --json
```

The fork does NOT track the upstream — future library updates won't propagate. That's deliberate; the user's copy is fully independent.

## When to read vs fork

- **Read** when the user wants insight, comparison, or to copy *concepts* into their own work. Don't pollute their workspace with a copy they didn't ask for.
- **Fork** only when the user explicitly says "I want my own version" / "use this as my starting point" / "edit it for me." Never auto-fork.

## Anti-patterns

- ❌ Trying to `canvas write` against a case-library canvas. The 403 will block you, and the user wasn't asking to edit the library anyway.
- ❌ Forking a case "just in case the user wants to edit later." Forks are visible in their project list — only fork when asked.
- ❌ Pulling `case read` for every case in the library at once to "have context." Pull the one(s) you actually need; `case list` gives you the slug + summary first.

# Iterate — refine an existing canvas

```bash
# 1. Read current state
pingarden canvas read <canvasId> --lang <en|zh> --json

# 2. Read the methodology for this canvas (so refinements respect block semantics)
# → consult canvases/<defId>.<lang>.md

# 3. Compose your refined complete state — NOT a diff. Replace-mode means
#    every sticky you don't include is GONE.

# 4. Preview the diff
echo '<payload>' | pingarden canvas write <canvasId> --dry-run --json

# 5. Apply (auto-snapshot fires)
echo '<payload>' | pingarden canvas write <canvasId> --json
```

**Diff sanity check**: if your dry-run shows a huge negative net, you probably forgot to include all existing stickies. Re-read the canvas, then send the FULL desired end state.

**When in doubt**, take an explicit milestone first:
```bash
pingarden snapshot create <canvasId> --label "before-pricing-pivot"
```
This is on top of the auto pre-edit snapshot. Two layers of undo is fine.

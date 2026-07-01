# Greenfield — turn a chat into a canvas

Use when the user has been discussing a business case (a new venture, a pivot, a strategic option) and wants the analysis written into PinGarden.

```bash
# 1. See what templates exist (sanity)
pingarden template list --json

# 2. Get the structure of the canvas you'll fill — ZONE IDS COME FROM HERE
pingarden canvas describe-template <defId> --lang <en|zh> --json

# 3. Create the project (if it doesn't already exist)
pingarden project create --name "<name>" --description "<one line>" --json

# 4. Create the canvas under it
pingarden canvas create \
  --project <projectId> \
  --def <defId> \
  --title "<canvas title>" \
  --lang <en|zh> \
  --json

# 5. Compose the bulk JSON locally — see canvases/<defId>.<lang>.md for fill order + quality bar
# 6. Preview the diff before writing
echo '<payload>' | pingarden canvas write <canvasId> --dry-run --json

# 7. Write for real (auto-snapshot fires before the bulk POST)
echo '<payload>' | pingarden canvas write <canvasId> --json
```

**Sticky granularity**: 1 concept per sticky. ~5–15 words. Don't write essays. If a sticky needs more, it should be 2 stickies.

**Color**: leave `color` unset unless the canvas declares a `defaultColorLegend` (see the colour legend section in the per-canvas md). Default `#FCF1A8` is fine for vanilla notes.

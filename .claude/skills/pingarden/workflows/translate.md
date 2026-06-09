# Translate — en ⇄ zh

```bash
# 1. Read source language
pingarden canvas read <canvasId> --lang en --json

# 2. Translate the sticky text in your reply (the AI's job, not the CLI's)

# 3. Write the translated payload back. Replace-mode applies — all stickies
#    are recreated with new server-assigned ids, but the canvas language can
#    be flipped via canvas update if you want the UI to default to the new
#    language.
echo '<payload-with-translated-text>' | pingarden canvas write <canvasId> --json
pingarden canvas update <canvasId> --lang zh
```

When translating, **do not translate `zoneId` keys** — they are stable API identifiers (`customer-segments`, etc.). Only the `text` field of each sticky should change.

The `prompt` and `title` shown in `canvas describe` already come back in the requested `--lang`, so use those as the anchor for what each block expects.

# Story — narrate canvases

Stories are markdown documents at the project level, optionally embedding canvases. Use stories to:

- Explain WHY a canvas is the way it is.
- Capture decisions, dates, and people.
- Tie multiple canvases into a coherent narrative.

```markdown
# Coffee Co — March narrative

We targeted urban specialty coffee drinkers and decided on weekly subscription delivery.

::canvas[business-model-canvas]{canvasId="<bmc-uuid>"}

The unit economics still need stress testing.

::canvas[value-proposition-canvas]{canvasId="<vpc-uuid>"}

Next: validate the wholesale-cafés segment with a 4-week pilot.
```

```bash
pingarden story create \
  --project <projectId> \
  --title "<title>" \
  --file story.md \
  --json
```

The server validates that every `::canvas[...]{canvasId="..."}` directive points to a canvas in the same project. `defId` (the brackets) must match the canvas's actual def.

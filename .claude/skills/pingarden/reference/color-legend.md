# Sticky color palette

The six default sticky colours come from `STICKY_PALETTE` (`packages/shared/src/index.ts`). `pingarden canvas write` only accepts these hex values for the `color` field:

- `#FCF1A8` — cream (default; vanilla notes)
- `#FFD9A8` — peach
- `#F4B8B8` — rose
- `#D5E2C0` — sage
- `#B8D5E2` — sky
- `#D5C0E2` — lavender

Per-canvas semantics (when defined): see `Colour legend` section of each `canvases/<defId>.<lang>.md`. Most canvases don't define semantics — colours are then purely organisational, used by the user to cluster related stickies visually.

When you must encode meaning (e.g. JTBD encodes pain/gain via colour), include a `colorLegend` field in your bulk write so the meaning is visible in the canvas inspector:

```json
{
  "stickies": [...],
  "colorLegend": {
    "#F4B8B8": { "label": "Pain", "description": "Friction, frustration, risk" },
    "#D5E2C0": { "label": "Gain", "description": "Outcomes, hopes, social wins" }
  }
}
```

Off-palette hex values are rejected by the server.

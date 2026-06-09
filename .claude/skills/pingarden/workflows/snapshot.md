# Snapshot — when to milestone, how to restore

You almost never need to call `snapshot create` explicitly — `canvas write` does it for you with the label `pre-ai-edit-<ISO>`.

Take an EXPLICIT milestone when:

- The user is committing to a strategic direction. Label it descriptively (`"approved-pricing-v1"`).
- You're about to do a destructive bulk write (e.g. wholesale rewrite from a workshop) — the auto-snapshot is fine, but a named one is searchable.

```bash
# Explicit milestone
pingarden snapshot create <canvasId> --label "approved-pricing-v1" --description "Q2 2026 board approval"

# List
pingarden snapshot list <canvasId> --json

# Restore — REPLACE the live canvas
pingarden snapshot restore <canvasId> <sid> --mode replace

# Restore — FORK to a new canvas (keeps original intact)
pingarden snapshot restore <canvasId> <sid> --mode fork
```

When a write fails, the CLI prints the snapshot id + restore command on the error path. Re-read it and surface the restore option to the user.

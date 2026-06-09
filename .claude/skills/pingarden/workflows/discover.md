# Discover — first call in a session

Before doing anything else, figure out what's already there. Ask in this order:

```bash
pingarden doctor --json
pingarden project list --json
pingarden canvas list --json
pingarden template list --json
```

If `doctor` reports the server isn't reachable, ask the user to open the PinGarden Mac app or run `./start.sh` in the repo. Don't try to spawn the server yourself.

If the user has existing canvases that match what they're asking about, **prefer iterate over greenfield** (`workflows/iterate.md`) — overwriting is recoverable via snapshot restore but still surprising.

# Identity & audit

PinGarden v1 has no real authentication. Every CLI request includes the header `X-Display-Name: <name>`, which the server records as `createdBy` / `updatedBy` on every entity.

Resolve order:

1. `--as <name>` flag
2. `PINGARDEN_USER` env var
3. `<os user> (cli)` — default fallback

The `(cli)` suffix on the default makes audit logs distinguish CLI/agent edits from web client edits at a glance. Don't strip it — it's deliberate.

When acting on behalf of a user during a chat session, you can pass `--as "Alex (Claude)"` so the audit trail reads cleanly.

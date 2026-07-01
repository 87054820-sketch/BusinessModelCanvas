# CLI cheatsheet

The commands you'll use most, with the JSON envelope they return.

## Discovery

```bash
pingarden doctor --json
# {"ok":true,"data":{"cliVersion":"...","displayName":"...","server":{"found":true,"url":"...","reachable":true}, "skill":{"installed":true,...}}}

pingarden project list --json
pingarden canvas list --json
pingarden template list --json
```

## Read

```bash
pingarden canvas describe <canvasId> --lang <en|zh> --json
pingarden canvas describe-template <defId> --lang <en|zh> --json
pingarden canvas read <canvasId> --lang <en|zh> --json
```

## Create

```bash
pingarden project create --name "..." --description "..." --json
pingarden canvas create --project <pid> --def <defId> --title "..." --lang <en|zh> --json
pingarden story create --project <pid> --title "..." --file story.md --json
```

## Write & snapshot

```bash
echo '{...}' | pingarden canvas write <canvasId> --dry-run --json   # preview only
echo '{...}' | pingarden canvas write <canvasId> --json              # auto-snapshot, then bulk POST
pingarden snapshot list <canvasId> --json
pingarden snapshot create <canvasId> --label "..." --json
pingarden snapshot restore <canvasId> <sid> --mode replace
pingarden snapshot restore <canvasId> <sid> --mode fork
```

## Resource library (source books / articles / reports)

```bash
pingarden resource list --json                          # resources + type + chapter count
pingarden resource get <slug> --json                    # metadata + reading note + chapter index
pingarden resource chapters <slug> --json               # chapter table of contents
pingarden resource chapter <slug> <chapterSlug> --json  # full bilingual chapter prose
```

Use resources as reference reading, not as cases. For deeper guidance, start from `resource list`, inspect `resource chapters`, then read the minimum relevant chapter.

## Case library (read-only curated cases)

```bash
pingarden case list --json                              # all slugs + companyName + tags + canvas/story counts
pingarden case list --tag <tag> --json                  # filter by tag
pingarden case describe <slug> --lang <en|zh> --json    # zone titles / prompts / colour legend per canvas (no sticky bodies)
pingarden case read <slug> --lang <en|zh> --json        # full canvases (block-grouped stickies) + full story bodies
pingarden case fork <slug> --json                       # deep-copy into a new editable user project
```

Library canvases are read-only. `canvas write` against a library canvasId returns 403. See `workflows/case-library.md` for the read-vs-fork decision and `reference/case-library.md` for kinds, slugs, and the read-only enforcement story.

## Output envelope

Every `--json` invocation returns:

```json
{ "ok": true,  "data": <result> }
{ "ok": false, "error": { "code": "...", "message": "...", "hint": "...", "details": <zod-error?> } }
```

Exit codes:
- `0` — success
- `1` — bad input / not found
- `2` — server error (non-2xx response)
- `3` — connection / setup issue (server unreachable, port file missing)

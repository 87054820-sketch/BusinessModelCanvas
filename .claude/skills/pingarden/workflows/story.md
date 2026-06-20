# Story — narrate canvases

Stories are markdown documents at the project level, optionally embedding canvases. Use stories to:

- Explain WHY a canvas is the way it is.
- Teach a newcomer the market context, strategic move, and operating logic.
- Tie multiple canvases into a coherent narrative with explanatory bridges.

## Quality bar for case-library stories

A case-library story is not a caption. It must include:

1. Context and tension — what market, customer problem, or competitive trap existed before the move.
2. Strategic move — what the company changed, including trade-offs.
3. Canvas reading guide — introduce each embedded canvas and tell readers what to notice.
4. Mechanism — why the model works economically and operationally.
5. Risks and limits — what could break or what the case does not prove.
6. Transfer lesson — how to apply the insight elsewhere.

For Blue Ocean Strategy cases, also explain the red-ocean baseline, noncustomers, ERRC logic, value-curve shape, and BMC consequences. Keep the Strategy Canvas clean: factors, curve classes, and score points only; put rationale and conclusions in the Story, not in long chart stickies.

```markdown
# Coffee Co — March narrative

## Context and tension

Specialty coffee delivery looked crowded because every player promised freshness, origin stories, and café-grade quality. The unresolved job was different: busy office workers wanted reliable weekday coffee without learning barista vocabulary.

## The strategic move

We reduced choice complexity and origin theatre, raised subscription reliability, and created a team-level replenishment ritual.

## Read the BMC first

::canvas[business-model-canvas]{canvasId="<bmc-uuid>"}

The important link is not the subscription sticky by itself; it is how recurring revenue funds predictable roasting batches and lower failed-delivery cost.

## What to test next

The riskiest assumption is office-manager willingness to own coffee replenishment. Validate it before scaling paid acquisition.
```

```bash
pingarden story create \
  --project <projectId> \
  --title "<title>" \
  --file story.md \
  --json
```

The server validates that every `::canvas[...]{canvasId="..."}` directive points to a canvas in the same project. `defId` (the brackets) must match the canvas's actual def.

# Cross-canvas — chain templates

When the user has finished one canvas and the methodology suggests filling a paired one, walk them through. Common chains:

- **BMC → VPC**: pick the most important Customer Segment from BMC and build its Value Proposition Canvas.
- **BMC → BME (Business Model Environment)**: surface the external forces that pressure the model.
- **VPC → Empathy Map**: deep-dive on the customer to back the pains/gains.
- **JTBD → VPC**: jobs / pains / gains feed VPC's customer side.

The `Pairs with` section in each `canvases/<defId>.<lang>.md` lists the canonical chains.

```bash
# 1. Read source canvas to lift content
pingarden canvas read <sourceCanvasId> --json

# 2. See the target template
pingarden canvas describe-template <targetDefId> --json

# 3. Create the target
pingarden canvas create --project <pid> --def <targetDefId> --title "..." --json

# 4. Compose payload that REFERENCES (in text) the source canvas content,
#    then write it
echo '<payload>' | pingarden canvas write <newCanvasId> --json
```

When the link is tight (e.g. one VPC per BMC Customer Segment), prefix the canvas title with the segment name so the user can scan the project page.

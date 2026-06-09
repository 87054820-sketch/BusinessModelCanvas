# PinGarden HTTP API Reference

**Scope**: AI-relevant endpoints for the Claude Skill + CLI channel. All requests should include the `X-Display-Name` header (defaults to "Anonymous"). All responses assume standard Fastify JSON/binary handling.

---

## **Identity & Auth**

### Header: X-Display-Name
- **Usage**: Every request should include `X-Display-Name: <display-name>` (max 64 chars, optional, defaults to "Anonymous").
- **Implementation**: `apps/server/src/http/identity.ts` — no real auth yet; trust the header (internal-team only).
- **AI side-effect**: All canvas/project updates will be stamped with this identity.

---

## **Core HTTP Routes**

### **Project CRUD**

#### GET /projects
- **Method**: GET
- **Path**: `/projects`
- **Request**: none
- **Response**: `Project[]`
- **Schema**:
  ```ts
  interface Project {
    id: string;           // uuid
    name: string;         // 1–200 chars
    description?: string; // 0–2000 chars
    createdAt: string;    // ISO
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  }
  ```
- **File**: `apps/server/src/http/projects.ts:19`

#### GET /projects/:id
- **Method**: GET
- **Path**: `/projects/:id`
- **Request**: none
- **Response**: `Project | {error: string}` (404 if missing)
- **File**: `apps/server/src/http/projects.ts:21–25`

#### POST /projects
- **Method**: POST
- **Path**: `/projects`
- **Request Body**:
  ```ts
  {
    name: string;           // required, 1–200 chars
    description?: string;   // optional, 0–2000 chars
  }
  ```
- **Response**: `Project` (201)
- **File**: `apps/server/src/http/projects.ts:36–51`

#### PATCH /projects/:id
- **Method**: PATCH
- **Path**: `/projects/:id`
- **Request Body**:
  ```ts
  {
    name?: string;         // optional
    description?: string;  // optional
  }
  ```
- **Response**: `Project` (200) | `{error: string}` (404)
- **File**: `apps/server/src/http/projects.ts:53–65`

#### DELETE /projects/:id
- **Method**: DELETE
- **Path**: `/projects/:id`
- **Request**: none
- **Response**: `{}` (204) — cascades: deletes all canvases and snapshots in the project
- **File**: `apps/server/src/http/projects.ts:67–70`

---

### **Canvas CRUD**

#### GET /canvases
- **Method**: GET
- **Path**: `/canvases?projectId=<optional>`
- **Request**: optional query `projectId` to filter by project
- **Response**: `CanvasMeta[]`
- **Schema**:
  ```ts
  interface CanvasMeta {
    id: string;
    projectId: string;
    defId: string;           // e.g. 'business-model-canvas'
    title: string;
    language: 'en' | 'zh';
    contentDate?: string;    // e.g. '2023-12'
    contentDatePrecision?: 'year' | 'month' | 'day';
    contentDateLabel?: string;
    createdAt: string;       // ISO
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  }
  ```
- **File**: `apps/server/src/http/canvases.ts:38–44`

#### GET /canvases/:id
- **Method**: GET
- **Path**: `/canvases/:id`
- **Request**: none
- **Response**: `CanvasMeta | {error: string}` (404)
- **File**: `apps/server/src/http/canvases.ts:46–50`

#### POST /canvases
- **Method**: POST
- **Path**: `/canvases`
- **Request Body**:
  ```ts
  {
    projectId: string;                    // required, must exist
    defId: string;                        // required, must be known canvas def
    title: string;                        // required, 1–200 chars
    language: 'en' | 'zh';               // required
    contentDate?: string;                 // optional regex: ^\d{4}(-\d{2}){0,2}$
    contentDatePrecision?: 'year' | 'month' | 'day';
    contentDateLabel?: string;            // optional, 0–80 chars
  }
  ```
- **Response**: `CanvasMeta` (201)
- **File**: `apps/server/src/http/canvases.ts:52–84`

#### PATCH /canvases/:id
- **Method**: PATCH
- **Path**: `/canvases/:id`
- **Request Body**: all fields optional (subset of POST body)
- **Response**: `CanvasMeta` (200) | `{error: string}` (404)
- **File**: `apps/server/src/http/canvases.ts:86–98`

#### DELETE /canvases/:id
- **Method**: DELETE
- **Path**: `/canvases/:id`
- **Request**: none
- **Response**: `{}` (204)
- **File**: `apps/server/src/http/canvases.ts:100–103`

---

## **AI-Relevant Endpoints**

### **GET /canvases/:id/ai-context** ⭐
- **Method**: GET
- **Path**: `/canvases/:id/ai-context?lang=en|zh`
- **Request**: optional query `lang` to override canvas language
- **Response**: `AiContext` (structured snapshot for LLM consumption)
- **Schema** (from `@pingarden/shared`):
  ```ts
  interface AiContext {
    canvas: {
      id: string;
      defId: string;
      defName: string;         // localized from manifest
      title: string;
      language: Lang;
      project: {
        id: string;
        name: string;
        description?: string;
      };
    };
    blocks: AiContextBlock[];  // one per zone
    factors?: { id: string; label: string }[];  // xAxisItems
    yAxis?: { label: string; lowLabel?: string; highLabel?: string };
    pinClasses?: { id: string; label: string; color: string; icon: PinIcon }[];
    pins?: { id: string; classId: string; classLabel: string; x: number; y: number; label?: string; body?: string }[];
    valueCurves?: { classId: string; classLabel: string; color: string; points: {x,y}[] }[];
    colorLegend?: Record<string, {label: string; description?: string}>;
    generatedAt: string;       // ISO
  }

  interface AiContextBlock {
    id: string;
    title: string;
    prompt?: string;           // localized guidance for AI
    guidance?: string;         // markdown from knowledge files
    stickies: AiContextSticky[];
  }

  interface AiContextSticky {
    id: string;
    text: string;              // HTML fragment or plain text
    color: string;
    authorName: string;
    createdAt: string;         // ISO
    x: number;
    y: number;
    width?: number;            // optional explicit dimension
    height?: number;
    zoneHistory: ZoneHistoryEntry[];
  }
  ```
- **Purpose**: Read-only; the single seam for an AI to understand canvas state. Empty zones appear with `stickies: []`.
- **File**: `apps/server/src/http/aiContext.ts:49–283`

---

### **POST /canvases/:id/stickies/bulk** (Legacy)
- **Method**: POST
- **Path**: `/canvases/:id/stickies/bulk`
- **Request Body**:
  ```ts
  {
    stickies: [
      {
        zoneId: string;                    // required, must be valid for this canvas
        text: string;                      // required, HTML fragment or plain text
        color?: string;                    // optional, defaults to cream
        x?: number;                        // optional; if missing, auto-placed
        y?: number;
        width?: number;                    // optional, validated bounds
        height?: number;
        authorName?: string;               // optional, defaults to X-Display-Name
      },
      ...
    ]
  }
  ```
- **Response**: `{replaced: number, ids: string[]}` (200)
- **Behavior**: **REPLACE mode** — pre-existing stickies are dropped entirely. Stickies inherit `zoneHistory` from creation metadata.
- **File**: `apps/server/src/http/stickyImport.ts:65–165`

---

### **POST /canvases/:id/objects/bulk** (Preferred)
- **Method**: POST
- **Path**: `/canvases/:id/objects/bulk`
- **Request Body** (all keys optional; only provided keys are replaced):
  ```ts
  {
    stickies?: StickyInput[];
    pinClasses?: PinClassInput[];
    pins?: PinInput[];
    xAxisItems?: XAxisItemInput[];
    colorLegend?: Record<string, ColorLegendEntryInput>;
  }

  // StickyInput
  {
    zoneId: string;
    text: string;
    color?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    authorName?: string;
  }

  // PinClassInput
  {
    id?: string;               // if absent, server generates uuid
    label: string;
    color?: string;            // defaults to DEFAULT_CHART_COLOR
    icon?: 'circle' | 'triangle' | 'square' | 'star' | 'flag';
    authorName?: string;
  }

  // PinInput
  {
    id?: string;
    classId: string;           // required, must reference a class
    x: number;
    y: number;
    label?: string;
    body?: string;
    authorName?: string;
  }

  // XAxisItemInput (chart-canvas only)
  {
    id: string;
    label: {
      en: string;
      zh: string;
    };
  }

  // ColorLegendEntryInput
  {
    label: string;             // 1–60 chars
    description?: string;      // 0–240 chars
  }
  ```
- **Response**: `{ok: true, replaced: {stickies, pinClasses, pins, xAxisItems, colorLegend}}` (200)
- **Behavior**: Per-key replace semantics. Each provided key is fully replaced; other roots untouched. Canvas def must declare permission for each object type (sticky/pin/pinClass default; xAxisItem opt-in).
- **File**: `apps/server/src/http/objectsImport.ts:100–343`

---

### **GET /canvases/:id/state**
- **Method**: GET
- **Path**: `/canvases/:id/state`
- **Request**: none
- **Response**: binary Yjs state (204 if empty) — `application/octet-stream` content-type
- **Purpose**: Fetch the live collaborative document state. Do NOT use from CLI; this is for the web client's real-time sync.
- **Side-effect**: Automatically seeds `xAxisItems` from manifest defaults on first GET if canvas def declares chart factors.
- **File**: `apps/server/src/http/yjsState.ts:32–64`

---

### **PUT /canvases/:id/state**
- **Method**: PUT
- **Path**: `/canvases/:id/state`
- **Request Body**: binary Yjs state (`application/octet-stream`)
- **Response**: `{}` (204)
- **Purpose**: Persist live changes. Used by the web client for every keystroke. CLI should **not** call this directly; use `/objects/bulk` for batch writes instead.
- **File**: `apps/server/src/http/yjsState.ts:66–82`

---

## **Snapshot & Milestone Routes** (M4 features)

### **GET /canvases/:id/snapshots**
- **Method**: GET
- **Path**: `/canvases/:id/snapshots?kind=milestone|autosave`
- **Request**: optional query `kind` (default: `'milestone'`)
- **Response**: `SnapshotMeta[]`
- **Schema**:
  ```ts
  interface SnapshotMeta {
    id: string;
    canvasId: string;
    kind: 'milestone' | 'autosave';
    name: string;              // user-provided label
    description?: string;
    createdAt: string;         // ISO
    createdBy: string;
    stickyCount: number;
  }
  ```
- **File**: `apps/server/src/http/snapshots.ts:31–39`

### **POST /canvases/:id/snapshots**
- **Method**: POST
- **Path**: `/canvases/:id/snapshots`
- **Request Body**:
  ```ts
  {
    name: string;              // 1–120 chars
    description?: string;      // 0–2000 chars
  }
  ```
- **Response**: `SnapshotMeta` (201, with `state` field omitted)
- **Behavior**: Captures the current canvas state as a milestone snapshot.
- **File**: `apps/server/src/http/snapshots.ts:42–65`

### **POST /canvases/:id/snapshots/:sid/restore**
- **Method**: POST
- **Path**: `/canvases/:id/snapshots/:sid/restore`
- **Request Body**:
  ```ts
  {
    mode: 'replace' | 'fork';
  }
  ```
- **Response**: `{canvas: CanvasMeta}` (200 or 201)
- **Behavior**: 
  - `mode='replace'`: restore snapshot into the live canvas, overwriting current state.
  - `mode='fork'`: create a new canvas (copy) from the snapshot, leaving original untouched.
- **File**: `apps/server/src/http/snapshots.ts:68–103`

### **DELETE /canvases/:id/snapshots/:sid**
- **Method**: DELETE
- **Path**: `/canvases/:id/snapshots/:sid`
- **Request**: none
- **Response**: `{}` (204)
- **File**: `apps/server/src/http/snapshots.ts:106–114`

---

## **Canvas Definitions** (Reference Data)

### **GET /canvas-defs**
- **Method**: GET
- **Path**: `/canvas-defs`
- **Response**: List of canvas types available on this server
  ```ts
  [
    { id: string; name: {en, zh}; plugin?: string; related?: string[] },
    ...
  ]
  ```
- **File**: `apps/server/src/http/canvasDefs.ts:26–33`

### **GET /canvas-defs/:id**
- **Method**: GET
- **Path**: `/canvas-defs/:id`
- **Response**: Full canvas definition with i18n and knowledge markdown
- **File**: `apps/server/src/http/canvasDefs.ts:35–47`

---

## **Stories** (Narrative Documents)

### **GET /stories**
- **Method**: GET
- **Path**: `/stories?projectId=<optional>`
- **Response**: `StoryMeta[]`

### **GET /stories/:id**
- **Method**: GET
- **Path**: `/stories/:id`
- **Response**: `Story | {error: string}` (404)

### **POST /stories**
- **Method**: POST
- **Path**: `/stories`
- **Request Body**:
  ```ts
  {
    projectId: string;
    title: string;             // 1–200 chars
    content?: string;          // Markdown + canvas directives; 0–500k
    status?: 'draft' | 'published';
    contentDate?: string;
    contentDatePrecision?: 'year' | 'month' | 'day';
    contentDateLabel?: string;
  }
  ```
- **Response**: `Story` (201)

### **PATCH /stories/:id**
- **Method**: PATCH
- **Path**: `/stories/:id`
- **Request Body**: subset of POST (all optional)
- **Response**: `Story` (200) | `{error: string}` (404)

### **DELETE /stories/:id**
- **Method**: DELETE
- **Path**: `/stories/:id`
- **Response**: `{}` (204)

- **File**: `apps/server/src/http/stories.ts:32–100`

---

## **Utility Routes**

### **GET /health**
- **Method**: GET
- **Path**: `/health`
- **Response**: `{ok: true, desktopInstanceId?: string}`
- **File**: `apps/server/src/server.ts:49–52`

---

## **CanvasStorage Interface** (Backend Abstraction)

The server's HTTP handlers all route through this interface. The CLI need not call it directly, but understanding it helps reason about what each endpoint does:

```ts
export interface CanvasStorage {
  // projects
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(p: Project): Promise<void>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // canvases
  listCanvases(opts?: { projectId?: string }): Promise<CanvasMeta[]>;
  getCanvas(id: string): Promise<CanvasMeta | null>;
  createCanvas(meta: CanvasMeta): Promise<void>;
  updateCanvasMeta(id: string, patch: Partial<CanvasMeta>): Promise<CanvasMeta>;
  deleteCanvas(id: string): Promise<void>;

  // stories
  listStories(opts?: { projectId?: string }): Promise<StoryMeta[]>;
  getStory(id: string): Promise<Story | null>;
  createStory(story: Story): Promise<void>;
  updateStory(id: string, patch: Partial<Story>): Promise<Story>;
  deleteStory(id: string): Promise<void>;

  // binary Yjs state
  saveYDocState(id: string, state: Uint8Array): Promise<void>;
  loadYDocState(id: string): Promise<Uint8Array | null>;

  // snapshots
  createSnapshot(snapshot: Snapshot): Promise<void>;
  listSnapshots(canvasId: string, kind?: SnapshotKind): Promise<SnapshotMeta[]>;
  getSnapshot(canvasId: string, snapshotId: string): Promise<Snapshot | null>;
  deleteSnapshot(canvasId: string, snapshotId: string): Promise<void>;
  pruneAutosaves(canvasId: string, keepN: number): Promise<void>;
}
```

- **File**: `apps/server/src/storage/CanvasStorage.ts:1–52`

---

## **AI CLI Essentials**

**For the AI agent to work with PinGarden from the CLI:**

1. **Read canvas state**: `GET /canvases/:id/ai-context?lang=en` → full structured context
2. **Write stickies/objects**: `POST /canvases/:id/objects/bulk` → batch-replace stickies, pins, etc.
3. **Create/list projects**: `POST /projects`, `GET /projects`
4. **Create canvas from template**: `POST /canvases` with desired `defId` and `projectId`
5. **Snapshot for persistence**: `POST /canvases/:id/snapshots` + `POST /canvases/:id/snapshots/:sid/restore` (fork mode)

**Do NOT call from CLI:**
- `PUT /canvases/:id/state` — this is live-sync only; use `/objects/bulk` instead
- Live WebSocket/Yjs CRDT routes — unnecessary for batch AI workflows

**Always include**: `X-Display-Name: <your-agent-name>` header.


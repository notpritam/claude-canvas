---
name: claude-canvas
description: Use when the user explicitly requests a visualization, diagram, flowchart, architecture sketch, or asks "show me on a canvas" / "draw this" / "visualize" / "/visualize". Renders interactive diagrams on a real React Flow canvas in the user's browser. Not for static markdown diagrams — use Mermaid in your reply for those.
---

# claude-canvas

Render rich, interactive diagrams on a real canvas (React Flow) in the user's browser. The user explicitly invokes this; do not trigger it automatically when explaining something visually — write Mermaid or ASCII inline instead.

## When to use this skill

**Use when** the user says:
- `/visualize <thing>`
- "show this on a canvas"
- "draw it / draw this out"
- "diagram this"
- "open the canvas"
- "render this in claude-canvas"

**Do NOT use when:**
- User just wants a quick mental model in chat → use Mermaid in your reply
- User wants a static doc artifact → write Mermaid into a `.md` file
- User has not explicitly asked for visualization → respond normally

## How to use

There are exactly two things you do:

1. **Write a diagram JSON file** to `data/diagrams/<id>.json` in the skill folder.
2. **Run the bootstrap script** to ensure the server is running and open the browser to that diagram.

### Step 1: Find the skill folder

The skill lives at one of these paths (try in order):
- `~/.claude/skills/claude-canvas/`
- `~/.claude/plugins/cache/notpritam-claude-canvas/<version>/`

Resolve the absolute path once and reuse it. Call this `$CC` below.

### Step 2: Check templates BEFORE generating from scratch

Read `$CC/templates/defaults/index.json` and `$CC/data/templates/index.json` (if it exists). Scan the `description` and `tags` of each entry for a match against the user's request.

If you find a good match:
- Read `$CC/templates/defaults/<slug>.json` (or `$CC/data/templates/<slug>.json` for user templates)
- Substitute `{{placeholders}}` in `template.diagram` with task-specific content
- Set `template_id` on the new diagram to the slug

If no template matches, generate from scratch using the schema below.

### Step 3: Generate the diagram JSON

ID convention: `<topic-slug>-<YYYYMMDD-HHMMSS>` (e.g. `jwt-auth-20260521-143000`). Use the same ID to update an existing diagram (the server overwrites and pushes a live update).

#### Full schema

```json
{
  "id": "string (required, kebab-case)",
  "title": "string (required, human-readable)",
  "description": "string (optional)",
  "schema_version": 1,
  "template_id": "string (optional, slug of source template)",
  "layout_hint": "left-to-right | top-to-bottom (optional)",
  "groups": [
    { "id": "string", "label": "string", "color": "#hex (optional)" }
  ],
  "nodes": [
    {
      "id": "string (unique)",
      "type": "action | data | concept | decision | code | note | actor",
      "label": "string (short, shown as title)",
      "content": "string (optional markdown body)",
      "group": "string (optional group id)",
      "position": { "x": number, "y": number },
      "style": { "color": "#hex (optional)", "icon": "string (optional)" }
    }
  ],
  "edges": [
    {
      "id": "string (unique)",
      "source": "node id",
      "target": "node id",
      "label": "string (optional)",
      "type": "request | data | causes | depends-on | bidirectional",
      "style": { "color": "#hex (optional)", "dashed": boolean (optional) }
    }
  ]
}
```

#### Node type decision rules

| If the thing is… | Use |
|---|---|
| A verb / something that happens | `action` |
| A payload / state / message | `data` |
| An abstract idea / principle | `concept` |
| A branch / yes-no / fork | `decision` |
| A code snippet | `code` (put the code in `content` as a ```fenced block) |
| An annotation / side comment | `note` |
| A service / person / system / database | `actor` |

#### Edge type decision rules

| If A → B represents… | Use |
|---|---|
| A caller invoking B | `request` |
| Data flowing from A to B | `data` |
| A causes B (cause/effect) | `causes` |
| A depends on B (B must exist) | `depends-on` |
| Two-way (chat, sync, etc.) | `bidirectional` |

#### Layout rules

- Default to **left-to-right** flow for sequences. Stagger nodes vertically to avoid overlap.
- Use **groups** for swimlanes (client vs server, frontend vs backend), layers (UI/logic/data), or phases.
- Node spacing: ~160px horizontal between sequential nodes, ~120px vertical between rows.
- Keep node count under 25 per diagram. For larger systems, split into multiple linked diagrams.
- Use `content` (markdown) for explanation — don't cram long text into `label`.

#### Worked example

User: `/visualize how JWT refresh tokens work`

```json
{
  "id": "jwt-refresh-20260521-143000",
  "title": "JWT refresh token flow",
  "description": "Short-lived access tokens + long-lived refresh tokens",
  "schema_version": 1,
  "template_id": "request-response-flow",
  "groups": [
    { "id": "client", "label": "Client", "color": "#3b82f6" },
    { "id": "server", "label": "Auth Server", "color": "#10b981" }
  ],
  "nodes": [
    {
      "id": "login",
      "type": "action",
      "label": "User logs in",
      "group": "client",
      "position": { "x": 40, "y": 60 },
      "content": "POSTs credentials to `/login`."
    },
    {
      "id": "auth",
      "type": "actor",
      "label": "Auth server",
      "group": "server",
      "position": { "x": 380, "y": 60 }
    },
    {
      "id": "tokens",
      "type": "data",
      "label": "Access + refresh tokens",
      "group": "client",
      "position": { "x": 40, "y": 200 },
      "content": "Access token: 15 min TTL\nRefresh token: 30 days TTL, httpOnly cookie"
    },
    {
      "id": "expired",
      "type": "decision",
      "label": "Access token expired?",
      "group": "client",
      "position": { "x": 380, "y": 320 }
    },
    {
      "id": "refresh",
      "type": "action",
      "label": "Use refresh token",
      "group": "client",
      "position": { "x": 380, "y": 460 },
      "content": "POST `/refresh` with the refresh cookie."
    }
  ],
  "edges": [
    { "id": "e1", "source": "login", "target": "auth", "label": "POST /login", "type": "request" },
    { "id": "e2", "source": "auth", "target": "tokens", "label": "200 + tokens", "type": "data" },
    { "id": "e3", "source": "tokens", "target": "expired", "type": "causes", "label": "on each request" },
    { "id": "e4", "source": "expired", "target": "refresh", "label": "yes", "type": "causes" },
    { "id": "e5", "source": "refresh", "target": "auth", "label": "POST /refresh", "type": "request" }
  ]
}
```

### Step 4: Write the JSON and invoke the bootstrap script

```bash
# Write the JSON (use the Write tool — not echo).
# Then:
node "$CC/scripts/ensure-running.mjs" --open "<id>"
```

The script outputs a JSON line like `{"url":"http://127.0.0.1:43123/#/<id>","port":43123,"pid":12345,"new":true}`. If `new: true`, a browser tab was opened. If `new: false`, the existing tab will receive the diagram via SSE — no new tab.

Tell the user the URL in your reply so they can re-open it if they close the tab:

> Opened your diagram at http://127.0.0.1:43123/#/<id>

### Failure modes

| Symptom | What to do |
|---|---|
| `ensure-running.mjs` exits non-zero | Read stderr. Most likely Node < 20 — tell user. |
| Server reports `error` status | Check `data/server.lock` is not corrupted. Delete it manually if so. |
| Browser shows "loading…" forever | `app/dist/` may be missing. Run `cd $CC/app && pnpm install && pnpm build`. |
| Diagram doesn't appear | Confirm the JSON validates — try `node -e "import('./server/schema.mjs').then(({validateDiagram}) => console.log(validateDiagram(JSON.parse(require('fs').readFileSync('data/diagrams/<id>.json','utf8')))))"` |

## Templates: when to save one

After generating a diagram that worked well, ASK the user: "Want me to save this as a template? It'll help me start faster next time you ask for something similar."

If yes, the user opens the canvas and clicks "Save current as template…" in the sidebar. You don't write templates directly — they come from the UI.

## Idempotency

- Same `id` → overwrites the JSON file → server broadcasts `diagram:update` → existing browser tab hot-swaps.
- Use this for iterative refinement: "make node X red" → rewrite the same file with the change.
- New diagrams get new IDs unless the user asks to edit the current one.

## Anti-patterns

- Don't generate a diagram for a one-line answer.
- Don't put more than ~25 nodes on a single diagram — split it.
- Don't use `note` for primary content; it's for side annotations.
- Don't skip the template check — that's where the skill gets better over time.
- Don't omit `position` — without positions, React Flow stacks everything at 0,0.

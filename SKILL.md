---
name: claude-canvas
description: Use when the user explicitly requests a visualization, diagram, flowchart, architecture sketch, or asks "show me on a canvas" / "draw this" / "visualize" / "/visualize". Renders interactive diagrams on a real tldraw canvas in the user's browser. Not for static markdown diagrams — use Mermaid in your reply for those.
---

# claude-canvas

Render rich, interactive diagrams on a real canvas (tldraw) in the user's browser. **This is a collaborative flow editor — you propose the flow, the user refines it.** Users can drag, connect, disconnect, reattach, edit labels in place, add nodes from a palette, and delete anything. Every edit auto-saves.

Your job is to give them a **strong first proposal** so refinement is minimal. The diagram must be unambiguous, complete, and at the right abstraction level. **Don't generate a sloppy diagram and let the user fix it** — that defeats the purpose.

The user explicitly invokes this. Do NOT trigger automatically when explaining something visually — write Mermaid or ASCII inline instead.

## When to use this skill

**Use when** the user says:
- `/visualize <thing>`, "show this on a canvas", "draw it/this out", "diagram this", "open the canvas", "render this in claude-canvas"

**Use a diagram (vs prose) when:**
- The answer involves 3+ interacting entities (prose creates pronoun ambiguity past 3)
- There are conditional branches (decision diamonds beat "if/else" prose)
- The user is debugging a causal chain (causation is directional, edges win)
- The question is about topology, protocol, handshake, lifecycle, or dependency
- The user says "I keep getting confused by..." (cognitive overload signal)

**Do NOT use a diagram when:**
- 1-2 sentences would answer cleanly
- Only 1 entity is involved (no edges possible)
- The content is reference data (table beats diagram for columnar lookup)
- The answer is pure temporal narrative with no branching (prose timeline wins)

---

## The 7-question preflight (do this BEFORE writing any JSON)

Answer these to yourself first. If you can't, the diagram will be wrong.

1. **Audience?** DevOps → container-level. Business → context-level. Student → step-by-step concrete.
2. **The one thing this diagram must make unmistakable?** If you can't state it in one sentence, **the scope is too large — split it**.
3. **What abstraction level?** Pick exactly one C4 level (Context / Container / Component / Code). Do not mix in the same diagram.
4. **How many distinct entities are genuinely involved?** If >12, decompose into 2+ diagrams.
5. **Entry point and exit point?** Every diagram needs exactly one start and at least one terminal.
6. **Which diagram type does this map to?** (table below)
7. **Are there decision branches?** Yes → `decision` nodes required. No → `decision` nodes forbidden.

## Diagram type → structure

| User intent | Diagram | Primary node types | Primary edge types | Flow direction |
|---|---|---|---|---|
| "How does X work?" (process) | Step flow | `actor`, `action`, `data`, `decision` | `request`, `causes` | Top-to-bottom (>5 steps) or L→R |
| "What's the architecture of X?" | C4 Container | `actor`, `concept`, `data` | `request`, `data`, `depends-on` | L→R w/ swimlanes per service |
| "Why does X happen?" (causal) | Causal chain | `action`, `concept`, `decision` | `causes` ONLY | L→R |
| "What are the parts of X?" | Taxonomy tree | `concept`, `data`, `actor` (leaves) | `depends-on` | T→B (general to specific) |
| "Difference between X and Y?" | Side-by-side compare | Same type for analogous concepts | `bidirectional` (shared), `depends-on` (divergent) | L→R, X left, Y right |
| "Lifecycle of X?" | State machine | `concept` (states), `decision` (guards) | `causes` (auto), `request` (triggered) | L→R linear; circular if cyclic |
| "What depends on what?" | DAG | `code`, `actor`, `data` | `depends-on` ONLY | B→T (deps at bottom) |
| "How do A and B interact?" | Sequence | `actor` ONLY (+ `note` for annotations) | `request`, `data` | Actors horizontal, time T→B |

---

## The schema

```json
{
  "id": "string (kebab-case)",
  "title": "string (human-readable)",
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
      "label": "string (≤4 words / 35 chars, self-contained)",
      "content": "string (optional, for anything that doesn't fit in label)",
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
      "label": "string (verb-first, ≤5 words / 40 chars)",
      "type": "request | data | causes | depends-on | bidirectional",
      "style": { "color": "#hex (optional)", "dashed": boolean (optional) }
    }
  ]
}
```

---

## Node type rules — pick the RIGHT one

### `action` — verbs / things that happen
- ✓ "Validate Token", "Send Email", "Encrypt Payload"
- ✗ "Authentication" (process → `concept`), "User" (person → `actor`), "Login Form" (UI → `data`)
- **Disambiguation:** Verb form = `action`. Noun/process form = `concept`. Completable in <1s → `action`. Multi-step → `concept`.

### `data` — payloads / artifacts / state blobs that flow
- ✓ "JWT Token", "Request Payload", "User Record", "Error Response"
- ✗ "Database" (service → `actor`), "Validation" (step → `action`), state in a lifecycle (→ `concept`)
- **Rule:** Data nodes don't initiate. They receive and emit. If your `data` node "causes" something, reclassify it as `action`.

### `concept` — abstract idea / category / named state
- ✓ "Eventual Consistency", "Logged In State", "Rate Limiting", "Microservice"
- ✗ "UserService" at container level (→ `actor`), "Database Write" (→ `action`), "JWT" (artifact → `data`)
- **Rule:** States in a state machine = `concept`. Events/transitions = edge labels, not nodes.

### `decision` — branching point with a condition
- ✓ "Valid credentials?", "Rate limit exceeded?", "Cache hit?"
- ✗ "Choose method" if no actual branching (→ `action`), "Error" (outcome, not branch → `data`)
- **Hard rule:** `decision` MUST have ≥2 outgoing edges labeled with branch conditions ("yes"/"no", etc.). One outgoing edge = error.

### `code` — literal copy-pasteable syntax
- ✓ `def validate_jwt(token):`, `POST /api/v2/auth`, `nginx upstream block`
- ✗ "Function call" as a step (→ `action`), "API" as a system (→ `actor`)
- **Rule:** Only literal syntax. Concepts ABOUT code → `concept` or edge label.

### `note` — annotation / aside
- ✓ "This step only in production", "Deprecated — removal Q3"
- ✗ Anything load-bearing for the flow
- **Test:** If removing the note would cause confusion, it's not a note — it's a missing node or edge label.

### `actor` — human / external system / service / agent (anything with agency)
- ✓ "Browser Client", "Stripe API", "DevOps Engineer", "PostgreSQL"
- ✗ "Auth Module" if internal component (→ `concept`/`code`), "Cache" if passive store (→ `data`)
- **Rule:** Has agency = can initiate. Database is `actor` (responds). JWT is `data` (no agency).

---

## Edge type rules

### `request` — caller asks callee, sync or explicit
- ✓ "Client → Server: GET /user", "Service A → Service B: validate()"
- ✗ Event without response expectation (→ `causes`), payload in transit (→ `data`)
- **Direction:** Initiator → receiver.

### `data` — flows from producer to consumer (no request/response)
- ✓ "Kafka → Consumer: UserCreatedEvent", "Transform → Storage: cleaned_record"
- ✗ Sync API call (→ `request`), causal relationship (→ `causes`)
- **Use for:** async messaging, streaming, pipelines.

### `causes` — A causes B (causal, not request-based)
- ✓ "High CPU → Throttling", "Token Expiry → Forced Logout", "Disk Full → Write Failure"
- ✗ Intentional call (→ `request`)
- **Rule:** No agency required. Models emergent/unintentional relationships.

### `depends-on` — A needs B to exist/function
- ✓ "Service A → Library B", "Component → Config"
- ✗ Runtime call (→ `request`)
- **Direction:** Arrow points FROM dependent TO dependency.

### `bidirectional` — genuinely symmetric (both initiate + receive)
- ✓ "Client ↔ Server: WebSocket", "Peer A ↔ Peer B: P2P sync"
- ✗ Request + its response (use TWO `request` edges with distinct labels)
- **Default to two `request` edges with distinct labels.** Bidirectional is hard to label and often hides imprecision.

---

## Composition rules (numeric limits — these are HARD)

| Rule | Limit |
|---|---|
| Max nodes per diagram | 15 ideal, 20 hard cap. >20 = split. |
| Max sequence participants | 6 |
| Max swimlane lanes | 7 |
| Max in-degree / out-degree per node | 4 |
| Children per decomposition level | 3–7 |
| Node label length | ≤4 words / ≤35 chars |
| Edge label length | ≤5 words / ≤40 chars, must include a verb |
| Group label length | ≤3 words / ≤25 chars |

**Spacing in `position` — be GENEROUS, not cramped (cards are 240×110+; they need room):**

| Context | Horizontal | Vertical |
|---|---|---|
| Min between any two cards | **160px** (gap, not center-to-center) | **140px** (gap) |
| Process/sequence step → next step | 280–320px between centers | 180–220px between centers |
| Tree level → child level | n/a | 240px between centers |
| Tree siblings | 280px between centers (more if labels long) | n/a |
| Group internal padding | 40px from group edge to first child | 60px from group top to first child |
| Group → group gap | 200px | 200px |
| Architecture: actor → primary system | 320px between centers | n/a |
| Architecture: primary → dependencies | 320px between centers | 180–220px vertically staggered |

**Default canvas envelope:** use the 0–1600 horizontal range and 0–1200 vertical range freely. There's no penalty for big diagrams — there IS a penalty for cramped ones. **When in doubt, push further apart.**

**Layout direction by intent:** see Diagram type table above. Use `layout_hint` field to signal intent.

**When to add a group:** 3+ nodes share an actor/owner, OR diagram has 10+ nodes (groups reduce perceived complexity). Don't group decoratively.

**When to use `content` vs `label`:** label = name (≤4 words). content = anything that doesn't fit — longer explanation, URL, code snippet, caveats. Never cram long text into label.

---

## Designed to walk through — make every diagram explainable in 30 seconds

The diagram exists so the user can *show someone else* the answer. That means it has to read like a guided walkthrough, not a wall of boxes. Follow these patterns:

### 1. Number the steps for any process / sequence / causal diagram
Prefix `action` and `decision` labels with `1.`, `2.`, `3.`… so reading order is unambiguous.

✓ "1. User clicks Login"  → "2. POST to /auth"  → "3. Validate Credentials"  → "4. Issue JWT"  
✗ "User clicks Login" → "POST to /auth" → "Validate Credentials" → "Issue JWT"  *(reader has to infer order from layout)*

Skip numbering for: pure architecture topology (no inherent order), pure dependency graphs, comparison diagrams. Always number for: process, sequence, causal chain, lifecycle/state-machine when transitions are linear.

### 2. Use `content` as the one-line explanation of THAT step
Every node that represents a step or actor should have a `content` field with a single sentence explaining what happens here / what this is. Treat it as the speaker note for a slide.

✓ Label: `"3. Validate Credentials"`, Content: `"Hash the password and compare against the stored bcrypt digest."`  
✗ Label: `"3. Validate Credentials"`, no content. *(reader has to guess what "validate" means)*

Length: 1 sentence, ≤120 chars. If you need more, the step is too big — split it.

### 3. Use swimlane groups when 2+ actors share the flow
When a process involves multiple actors (Client + Server, User + System + Database), put each `action` inside a `group` named after the actor that performs it. This makes "who does what" visually obvious without the reader tracing arrows.

```json
"groups": [
  { "id": "client_lane", "label": "Client", "color": "#3b82f6" },
  { "id": "server_lane", "label": "Server", "color": "#10b981" }
],
"nodes": [
  { "id": "n1", "type": "action", "label": "1. Click Login", "group": "client_lane", ... },
  { "id": "n2", "type": "action", "label": "2. Validate", "group": "server_lane", ... }
]
```

Skip swimlanes for single-actor flows (overkill) or when actors have only 1 step each (use `actor` nodes instead).

### 4. Mark the entry point explicitly
The first node should be visually unmistakable as the start. Use one of:
- A `concept` node labeled `"▶ START"` connected to the first real step (cleanest for "where do I begin?")
- Prefix the first action with `"1. "` AND place it at the leftmost/topmost position
- Add `content: "→ Start here"` on the first node

For state machines: the initial state goes in a `concept` node with content `"Initial state"`.

### 5. Mark terminal / success / failure ends
End states should be visually distinct from intermediate steps. Use a `concept` node for terminal states with content like:
- `"✓ Success — user is logged in"` (success path)
- `"✗ Rejection — 401 returned to client"` (failure path)
- `"⊙ Terminal — no further transitions"` (state machine end)

Every diagram needs at least one explicitly-marked terminal. Diagrams that just trail off leave the reader unsure if the flow is complete.

### 6. One concept per node — split steps that do multiple things
If a node label contains "and" / "&" / commas describing actions, split it.

✗ `"Validate token, decode payload, and lookup user"` *(three things in one node)*  
✓ `"3. Validate Token"` → `"4. Decode Payload"` → `"5. Lookup User"`

Multiple small steps read more clearly than one dense step.

### 7. Default to top-to-bottom for processes >5 steps
Long horizontal flows force users to scroll/pan. Vertical flow stays in the readable column. Use horizontal only when there are ≤4 steps OR the diagram has swimlanes (where the time axis must be horizontal to fit lanes vertically).

### 8. Keep parallel paths visually parallel
If two branches happen at the same logical step (e.g., the success path AND failure path from a `decision`), give them the same `y` coordinate (for horizontal flow) or the same `x` (for vertical flow). Visual parallelism signals logical parallelism.

---

## Mandatory pre-call self-check (10 items — verify ALL before invoking the canvas)

If ANY item fails, fix the diagram before running the bootstrap script. **Do not ship a diagram that fails any of these.**

1. **Topic legible from labels alone.** Cover the `content` fields mentally. Can a stranger identify the topic from just node labels and edge labels? If not → fix labels.
2. **Every node earns its place.** Each node is referenced by ≥1 edge OR is entry/exit. (`note` nodes exempt.) Remove orphans.
3. **Exactly one entry point.** Exactly one node with zero incoming edges. 0 or 2+ = ambiguous → add a clear start.
4. **At least one clear exit.** ≥1 node with zero outgoing edges (or marked as terminal). State machines: mark terminal states.
5. **Abstraction level is consistent.** No node radically off-level from the others (e.g., "User clicks Login" must not appear next to "TCP SYN packet"). Off-level node? Remove it OR split into a second diagram.
6. **Every edge direction is semantically correct.** Read each as a sentence: "A [edge-type] B." Does it make sense? Reverse any that don't.
7. **Every edge has a verb-first label.** Exception: `depends-on` where node types make it self-evident.
8. **Every `decision` node has ≥2 outgoing edges**, each with a branch label ("yes"/"no" or named conditions).
9. **Node count within limits.** ≤15 ideally, ≤20 hard. Else split.
10. **The diagram answers the user's actual question.** Re-read the user's verbatim phrasing. Does this diagram answer it, or did you drift to an adjacent question?
11. **Spacing breathes — diagram is NOT cramped.** Cards (240×110+) are separated by ≥160px horizontally and ≥140px vertically. No card overlaps another, no edge label overlaps a card. When in doubt, push positions further apart. Cramped diagrams trigger the "wall of boxes" reaction and fail to communicate.
12. **Sequential diagrams have numbered step labels** (`"1. ..."`, `"2. ..."`, etc.) AND every step node has a one-sentence `content` field explaining what happens there. Architecture/topology diagrams are exempt. If you skipped numbering or content on a process diagram, fix before shipping.

---

## Anti-patterns — these are auto-fails, NEVER ship

1. **Spaghetti edges** — multiple crossings. Fix layout or decompose.
2. **Mixed abstraction levels** — user-story step next to protocol packet. Pick one level; create second diagram if needed.
3. **Unlabeled edges** — arrows mean too many things. Every edge gets a verb-first label.
4. **God node (6+ edges)** — extract to its own sub-diagram, show as actor with link.
5. **Decorative node-type choice** — type must match semantic role from the Node Type Rules section, not aesthetics.
6. **No entry point** — multiple nodes with zero incoming edges leaves reader lost. Single entry only.
7. **Audience mismatch** — code-level diagram for business question, or context-level for engineer asking about internals.
8. **Bidirectional without labels** — `↔` with no label = literally nothing communicated. Use two labeled `request` edges instead.
9. **2-node "architecture diagram"** — under-decomposed. Either expand to ≥4-6 nodes or just use prose.
10. **Multiple organizational principles in one view** — deployment topology + user journey + data model in one diagram = unreadable. One diagram, one principle.
11. **Cramped spacing** — cards within 160px of each other horizontally or 140px vertically. Reads as a "wall of boxes" instead of a flow. Push positions further apart. There is NO downside to a larger diagram; there's huge downside to a cramped one.
12. **Unnumbered process steps with no content** — a sequence of `action` nodes with terse labels and no explanation is a name-dropping exercise, not a diagram. Number them AND add a one-sentence `content` per step.

---

## How to use this skill

### Step 1: Find the skill folder
- `~/.claude/skills/claude-canvas/` (typical install)
- `~/.claude/plugins/cache/notpritam-claude-canvas/<version>/` (plugin install)

Resolve once. Call this `$CC`.

### Step 2: Check templates BEFORE generating

Read `$CC/templates/defaults/index.json` and `$CC/data/templates/index.json` (if it exists). Scan `description` + `tags` for a match.

- Match found → load `$CC/templates/defaults/<slug>.json`, substitute `{{placeholders}}`, set `template_id` on your diagram.
- No match → generate from scratch using the schema + rules above.

### Step 3: Generate the JSON

ID convention: `<topic-slug>-<YYYYMMDD-HHMMSS>` (e.g. `jwt-auth-20260521-143000`). Use the same ID to update an existing diagram (server overwrites, browser hot-swaps).

**Run the 7-question preflight. Build the JSON. Run the 10-item self-check. Fix any failures.**

### Step 4: Write the JSON and invoke the bootstrap

```bash
# Use Write tool, not echo, to write data/diagrams/<id>.json
# Then:
node "$CC/scripts/ensure-running.mjs" --open "<id>"
```

Script outputs JSON like `{"url":"http://127.0.0.1:43123/#/<id>","port":43123,"pid":12345,"new":true}`.
- `new: true` → browser tab opened.
- `new: false` → existing tab updates via SSE (no new tab).

Tell the user the URL so they can re-open if closed:
> Opened your diagram at http://127.0.0.1:43123/#/<id>

---

## Worked examples

### Example: protocol handshake

User: `/visualize TCP handshake`

**Preflight:**
- Audience: developer/student
- One thing: 3 messages establish a connection
- Abstraction: protocol message level
- Entities: 2 (Client, Server)
- Entry: Client SYN; exit: connection established
- Type: "How do A and B interact?" → sequence
- Branches: none

**Anti-checks:**
- ✗ Don't use `action` nodes for SYN/SYN-ACK — they're edge labels on `request` edges
- ✗ Don't show FIN teardown — mixes setup vs teardown abstraction
- ✓ Use `note` nodes for sequence numbers / flag explanations
- ✓ Generous spacing: actors 400px apart, notes 200px between rows

```json
{
  "id": "tcp-handshake-20260521-225000",
  "title": "TCP three-way handshake",
  "schema_version": 1,
  "layout_hint": "top-to-bottom",
  "nodes": [
    { "id": "client", "type": "actor", "label": "Client",
      "content": "Initiates the connection.",
      "position": { "x": 120, "y": 80 } },
    { "id": "server", "type": "actor", "label": "Server",
      "content": "Listens for incoming connections.",
      "position": { "x": 620, "y": 80 } },
    { "id": "n1", "type": "note", "label": "1. SYN sent",
      "content": "Client picks seq=x and sets SYN flag.",
      "position": { "x": 360, "y": 280 } },
    { "id": "n2", "type": "note", "label": "2. SYN-ACK",
      "content": "Server replies with seq=y, ack=x+1.",
      "position": { "x": 360, "y": 480 } },
    { "id": "n3", "type": "note", "label": "3. ACK — connected",
      "content": "Client sends ack=y+1. Bidirectional channel open.",
      "position": { "x": 360, "y": 680 } }
  ],
  "edges": [
    { "id": "e1", "source": "client", "target": "server", "type": "request", "label": "SYN" },
    { "id": "e2", "source": "server", "target": "client", "type": "request", "label": "SYN-ACK" },
    { "id": "e3", "source": "client", "target": "server", "type": "request", "label": "ACK" }
  ]
}
```

### Example: causal debugging

User: `/visualize why our app goes down on deploy`

**Preflight:**
- Audience: incident-response engineers
- One thing: the sequence of causes leading to downtime
- Abstraction: infrastructure/operational events
- Type: "Why does X happen?" → causal chain
- Branches: none

**Anti-checks:**
- ✗ Don't use `request` edges — these are causal, not intentional calls
- ✗ Don't start with the symptom (User reports 504); start with the root cause (Deploy Triggered)
- ✗ Don't add "Should we roll back?" — that's a human decision, separate concern

```json
{
  "id": "deploy-downtime-20260521-230000",
  "title": "Why deploys cause downtime",
  "schema_version": 1,
  "layout_hint": "left-to-right",
  "nodes": [
    { "id": "deploy", "type": "action", "label": "1. Deploy Triggered",
      "content": "CI/CD pipeline kicks off a rolling update.",
      "position": { "x": 80, "y": 320 } },
    { "id": "drain", "type": "action", "label": "2. Old Pods Drain",
      "content": "Kubernetes sends SIGTERM to existing pods.",
      "position": { "x": 440, "y": 320 } },
    { "id": "gap", "type": "concept", "label": "3. Zero Instances",
      "content": "Brief window where no pod is ready to serve requests.",
      "position": { "x": 800, "y": 320 } },
    { "id": "health", "type": "concept", "label": "4. Health Check Fails",
      "content": "/health endpoint returns 503 — no upstream available.",
      "position": { "x": 1160, "y": 320 } },
    { "id": "lb", "type": "actor", "label": "Load Balancer",
      "content": "ALB sees all targets unhealthy.",
      "position": { "x": 1160, "y": 100 } },
    { "id": "err", "type": "data", "label": "5. ✗ 504 Timeout",
      "content": "Client receives gateway timeout — visible outage.",
      "position": { "x": 1520, "y": 320 } }
  ],
  "edges": [
    { "id": "e1", "source": "deploy", "target": "drain", "type": "causes", "label": "triggers" },
    { "id": "e2", "source": "drain", "target": "gap", "type": "causes", "label": "creates" },
    { "id": "e3", "source": "gap", "target": "health", "type": "causes", "label": "causes" },
    { "id": "e4", "source": "health", "target": "lb", "type": "causes", "label": "notifies" },
    { "id": "e5", "source": "lb", "target": "err", "type": "causes", "label": "returns to client" }
  ]
}
```

**Note the conventions in action:** numbered step labels (`1.`, `2.`…); every node has a `content` sentence explaining what's happening; the final node uses `✗` prefix to mark the failure terminus; horizontal spacing is 360px between centers (well above the 280px minimum) so cards don't crowd each other.

---

## Templates: when to save

After generating a diagram that worked well, **ask the user**: "Want me to save this as a template? It'll help me start faster next time you ask for something similar." If yes, they open the canvas and click "Save current as template…" in the sidebar.

## What the user can do once your diagram is on-screen

This is a real editor. The user can:
- **Drag** nodes (auto-saves position)
- **Connect** two nodes by dragging from one card's edge to another → creates an arrow
- **Disconnect / delete** an arrow by selecting it and pressing Delete/Backspace
- **Reattach** an arrow by grabbing its endpoint and dragging to a different card
- **Edit a label** by double-clicking
- **Delete a node** by selecting + Delete — connected arrows go with it

Treat their edits as source of truth. When they say "you got X wrong" or "add a step between Y and Z", read the latest `data/diagrams/<id>.json` to see their current state, then update it preserving their layout choices.

## Idempotency

- Same `id` → overwrites file → server broadcasts `diagram:update` → open tab hot-swaps.
- Use this for iterative refinement: "make node X red" → rewrite same file.
- New diagrams = new IDs unless the user explicitly says to edit the current one.

## Failure modes

| Symptom | What to do |
|---|---|
| `ensure-running.mjs` exits non-zero | Read stderr. Most likely Node < 20 — tell user. |
| Server `status: error` | Check `data/server.lock` not corrupted. Delete and retry. |
| Browser shows "loading…" forever | `app/dist/` missing. Run `cd $CC/app && pnpm install && pnpm build`. |
| Diagram doesn't appear | Validate the JSON: `node -e "import('./server/schema.mjs').then(({validateDiagram}) => console.log(validateDiagram(JSON.parse(require('fs').readFileSync('data/diagrams/<id>.json','utf8')))))"` |

---

## See also

`docs/visualization-research.md` — full research basis for these rules with citations. Refer to it when adding new diagram types or revising decision rules.

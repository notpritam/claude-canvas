# Changelog

## v0.2.0 — 2026-05-21

Big release. The canvas itself got rebuilt twice (ReactFlow → Excalidraw → tldraw) chasing Figma-level smoothness, and the SKILL.md got a comprehensive rewrite grounded in 12+ visualization-research sources so Claude reliably ships diagrams that read clearly the first time.

### Rendering
- **Canvas renderer: tldraw** (HTML5 Canvas, GPU-rendered). Migrated from DOM-based ReactFlow → Excalidraw → tldraw, settling on tldraw for typed-node UX + smoothness. Native inline label editing, native arrow reconnection, native pan/zoom.
- **Custom CardShape**: typed cards (action / data / concept / decision / code / note / actor) with color-coded backgrounds, icon, type chip, label, and optional content body.
- **Forced dark theme** so cards and canvas share color scheme.
- **Bigger cards (240×110)** with more padding and smaller proportional fonts so text doesn't dominate the visual.
- **License caveat**: tldraw shows "Made with tldraw" watermark in production without a commercial license. This is required by tldraw's license; do not remove.

### SKILL.md — research-grounded rules
- **7-question preflight** Claude must answer before writing any JSON (audience, abstraction, intent, etc.)
- **Diagram-type → structure table** mapping 8 user-intent patterns to specific node/edge type choices and layout direction
- **Precise node + edge type rules** with positive AND negative examples, eliminating ambiguity (is a Database `data` or `actor`? It's `actor`, with reasoning.)
- **Hard numeric composition limits**: max 15 nodes, ≤4 edges per node, label ≤4 words, edge label ≤5 words verb-first
- **12-item mandatory self-check** Claude runs before invoking the canvas; any failure = fix before shipping
- **12 anti-patterns** marked as auto-fails (spaghetti edges, mixed abstraction, god nodes, cramped spacing, etc.)
- **8 "designed to walk through" rules** so diagrams are explainable in 30 seconds: numbered steps, `content` as speaker notes, swimlanes for multi-actor flows, explicit ▶ START + ✓ terminals

### Visual conventions
- **Numbered step labels** for any process/sequence/causal/lifecycle diagram
- **Content fields used as one-sentence explanations** per node (treat like a slide speaker note)
- **▶ START / ✓ Success / ✗ Failure markers** to make entry and terminals unmistakable
- **Generous spacing rules** (160–320px between cards) — diagrams now breathe instead of clubbing into walls of boxes

### Examples
- `examples/claude-canvas-architecture.json` — meta-diagram showing how claude-canvas itself works end-to-end (loaded as the showcase example)

### Documentation
- `docs/visualization-research.md` — full research basis (Tufte, C4 model, Sweller, Mermaid community, Simon Brown, Wurman LATCH, etc.) with citations
- `CHANGELOG.md` (this file)
- `scripts/release.sh` — one-command release script for future versions

### Server / infrastructure (unchanged from v0.1)
- Stdlib-only Node HTTP+SSE server, atomic JSON writes, lockfile-based concurrency, 30-min idle auto-exit
- Schema validator, ~43 unit tests passing

---

## v0.1.0 — 2026-05-21

Initial release.

- React Flow canvas (later replaced)
- Stdlib Node server (HTTP + SSE) on random free port
- Atomic JSON persistence to `data/diagrams/`
- Idempotent `ensure-running.mjs` bootstrap, auto-opens browser
- 3 default templates (request-response-flow, sequence-3-actors, architecture-microservices)
- 43 unit tests across schema, lockfile, port, storage, sse, routes
- SKILL.md with node + edge type tables, schema, decision rules, worked example
- README, MIT license, CONTRIBUTING guide

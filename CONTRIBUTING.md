# Contributing to claude-canvas

## Adding a template

Templates ship in `templates/defaults/`. To add one:

1. Create `templates/defaults/<slug>.json` matching the shape:

```json
{
  "slug": "<slug>",
  "name": "Human name",
  "description": "What this template is for",
  "tags": ["tag1", "tag2"],
  "diagram": { ... }
}
```

The `diagram` must validate against `server/schema.mjs`. Use `{{placeholder}}` strings in labels for parts Claude will fill in.

2. Add an entry to `templates/defaults/index.json`.

3. Validate locally:

```bash
node -e "import('./server/schema.mjs').then(async ({validateDiagram}) => { const t = JSON.parse(require('fs').readFileSync('templates/defaults/<slug>.json','utf8')); console.log(validateDiagram(t.diagram)); })"
```

4. Open a PR.

## Adding a node type

Add the type to:
- `server/schema.mjs` — `NODE_TYPES` set
- `app/src/types.ts` — `NodeType` union
- `app/src/theme/nodeTypes.ts` — `NODE_THEME` map (pick an icon + color)
- `SKILL.md` — decision rules table

Then rebuild the app: `cd app && pnpm build`. Commit `app/dist/` along with the source changes.

## Adding an edge type

Same pattern — update `EDGE_TYPES` (server), `EdgeType` union (app), `EDGE_THEME` (app), and `SKILL.md`.

## Running tests

```bash
node --test tests/
```

All server modules are tested with Node's built-in runner. The React app has no automated tests yet — verify visually after `pnpm build`.

## Commit style

Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`. Keep messages short. No co-author trailers.

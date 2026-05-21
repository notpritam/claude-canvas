# claude-canvas

A Claude Code skill that renders interactive diagrams on a real canvas (React Flow) in your browser. You say `/visualize JWT refresh tokens`, a diagram appears, you drag nodes around, save your edits, and Claude learns your preferred layouts for next time.

## Install

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/notpritam/claude-canvas.git ~/.claude/skills/claude-canvas
```

That's it. The skill ships with a pre-built React bundle — no `npm install` required to use it.

**Requirements:** Node 20+ on your machine (Claude Code already needs this).

## Usage

In Claude Code:

```
/visualize how OAuth2 device flow works
```

Claude generates the diagram JSON, spins up a tiny local server on a random free port, and opens your browser. You can:

- Drag nodes around → auto-saves
- Edit labels → auto-saves
- Click "Save current as template" → Claude can reuse the structure next time

## Node types

| Type | For | Visual |
|---|---|---|
| `action` | verbs, things that happen | blue, bolt |
| `data` | payloads, messages, state | amber, database |
| `concept` | abstract ideas | purple, lightbulb |
| `decision` | branches, choices | yellow, branch |
| `code` | code snippets | gray, code |
| `note` | annotations | beige, sticky-note |
| `actor` | services, people, systems | indigo, user |

## Edge types

`request` · `data` · `causes` · `depends-on` · `bidirectional`

## How it works

- **Server:** single Node file (`server.mjs`), stdlib only — no runtime deps.
- **App:** React + Vite + Tailwind + `@xyflow/react`, pre-built into `app/dist/`.
- **Storage:** diagrams in `data/diagrams/` (gitignored), templates split between `templates/defaults/` (shipped) and `data/templates/` (your additions).
- **Server lifecycle:** starts on first `/visualize`, exits after 30 min of no clients.
- **Live updates:** Claude regenerates a diagram with the same ID → server broadcasts via SSE → your open tab hot-swaps.

See [`docs/specs/2026-05-21-canvas-viz-design.md`](docs/specs/2026-05-21-canvas-viz-design.md) for the full design.

## Troubleshooting

**"Browser doesn't open"** — On Linux you need `xdg-open` (usually installed). On macOS/Windows, the built-in commands handle this. Worst case, the bootstrap script prints the URL — open it manually.

**"Port conflict / can't bind"** — The server requests a random free port from the OS, so collisions should be impossible. If it happens, delete `data/server.lock` and try again.

**"Stuck on loading"** — `app/dist/` may be missing. Rebuild:

```bash
cd ~/.claude/skills/claude-canvas/app
pnpm install
pnpm build
```

**"Server won't quit"** — Find the pid in `data/server.lock` and `kill <pid>`.

## Contributing

Templates and node-type extensions are warmly welcomed. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

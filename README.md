# claude-canvas

A Claude Code skill that renders interactive diagrams on a real canvas (tldraw) in your browser. You say `/visualize JWT refresh tokens`, Claude generates a typed-node diagram following research-backed visualization rules, and your browser opens with a buttery-smooth GPU-rendered canvas you can drag, connect, reattach, and edit live.

## Install

Latest stable (tagged release):

```bash
mkdir -p ~/.claude/skills
git clone --branch v0.2.0 https://github.com/notpritam/claude-canvas.git ~/.claude/skills/claude-canvas
```

Or always-latest `main`:

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/notpritam/claude-canvas.git ~/.claude/skills/claude-canvas
```

That's it. The skill ships with a pre-built bundle — no `npm install` required to use it.

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
- **App:** React + Vite + Tailwind + `tldraw` (HTML5 Canvas, GPU-rendered), pre-built into `app/dist/`.
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

## Examples

`examples/claude-canvas-architecture.json` — a meta-diagram showing how claude-canvas itself works end-to-end (Claude → JSON file → server → browser, plus the live-edit loop). Load it into your local canvas to see what a well-formed claude-canvas diagram looks like:

```bash
mkdir -p ~/.claude/skills/claude-canvas/data/diagrams
cp ~/.claude/skills/claude-canvas/examples/claude-canvas-architecture.json \
   ~/.claude/skills/claude-canvas/data/diagrams/
node ~/.claude/skills/claude-canvas/scripts/ensure-running.mjs \
   --open claude-canvas-architecture
```

## Releases

Tagged versions live at https://github.com/notpritam/claude-canvas/releases. Install a specific version with `--branch v<X.Y.Z>` (see Install above). See [CHANGELOG.md](CHANGELOG.md) for what's in each release.

For maintainers: `scripts/release.sh <version>` bumps versions, rebuilds, commits, tags, and pushes. Reminds you to run `gh release create` with notes from the CHANGELOG.

## Contributing

Templates and node-type extensions are warmly welcomed. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is MIT — see [LICENSE](LICENSE).

**Third-party note:** the canvas is rendered by [tldraw](https://tldraw.com), which uses a separate source-available license. tldraw shows a "Made with tldraw" watermark in the bottom-right of the canvas. Per tldraw's license, that watermark cannot be removed without a commercial tldraw license. We accept it as honest attribution to a great library.

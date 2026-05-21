#!/usr/bin/env bash
# Cuts a new release of claude-canvas.
#
# Usage:
#   scripts/release.sh <version>
#
# Example:
#   scripts/release.sh 0.3.0
#
# This script:
#   1. Bumps version in package.json and app/package.json
#   2. Rebuilds app/dist/ with the new version
#   3. Commits the version bump + rebuilt dist
#   4. Tags vX.Y.Z and pushes both the commit and the tag
#   5. Reminds you to run `gh release create vX.Y.Z` with notes from CHANGELOG.md
#
# Make sure CHANGELOG.md is up to date before running this.

set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: $0 <version>" >&2
  echo "example: $0 0.3.0" >&2
  exit 1
fi

# Sanity: must be on main, working tree clean
if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
  echo "error: must be on main branch" >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree has uncommitted changes" >&2
  git status --short >&2
  exit 1
fi

# Sanity: CHANGELOG must already have this version
if ! grep -q "^## v${VERSION}" CHANGELOG.md; then
  echo "error: CHANGELOG.md does not have an entry for v${VERSION}" >&2
  echo "       add one before running this script" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Bumping version to $VERSION"
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); p.version='$VERSION'; fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');"
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('app/package.json','utf8')); p.version='$VERSION'; fs.writeFileSync('app/package.json', JSON.stringify(p,null,2)+'\n');"

echo "==> Rebuilding app/dist"
(cd app && pnpm build)

echo "==> Committing version bump + rebuilt dist"
git add package.json app/package.json app/dist/
git commit -m "chore: release v${VERSION}"

echo "==> Tagging v${VERSION}"
git tag -a "v${VERSION}" -m "v${VERSION}"

echo "==> Pushing main + tag"
git push origin main
git push origin "v${VERSION}"

echo ""
echo "✓ v${VERSION} tagged and pushed."
echo ""
echo "Next step — create the GitHub release with notes from the CHANGELOG:"
echo ""
echo "  awk '/^## v${VERSION}/,/^## v/' CHANGELOG.md | sed '\$d' | gh release create v${VERSION} --title \"v${VERSION}\" --notes-file -"
echo ""

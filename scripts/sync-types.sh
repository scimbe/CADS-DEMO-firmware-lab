#!/usr/bin/env bash
# Keep the shared probe interface types identical in both extensions.
set -euo pipefail
cd "$(dirname "$0")/.."
src=extensions/cads-probe/src/driver/types.ts
dst=extensions/cads-board-bridge/src/types.ts
{ echo '/* types.ts – the probe interface of docs/SPEC.md §3.1. Copy of extensions/cads-probe/src/driver/types.ts (kept in sync by scripts/sync-types.sh). */'; tail -n +2 "$src"; } > "$dst"
echo "synced $dst"

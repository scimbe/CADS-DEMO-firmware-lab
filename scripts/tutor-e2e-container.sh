#!/usr/bin/env bash
# Starts a throwaway code-server container on 127.0.0.1:8086 with the cads-tutor VSIX installed,
# the example course under /opt/cads-tutor/courses/_example and a copy of cads-zero as workspace.
# Usage: scripts/tutor-e2e-container.sh <path-to-cads-zero-checkout> [vsix]
set -euo pipefail
SRC=${1:?path to cads-zero checkout}
HERE=$(cd "$(dirname "$0")/.." && pwd)
VSIX=${2:-$HERE/extensions/cads-tutor/dist/cads-tutor.vsix}
STAGE=$(mktemp -d)
NAME=cads-tutor-e2e
PORT=${PORT:-8086}

mkdir -p "$STAGE/ws/cads-zero" "$STAGE/opt/cads-tutor/courses" "$STAGE/tmp/e2e"
rsync -a --exclude build --exclude .git "$SRC/" "$STAGE/ws/cads-zero/"
mkdir -p "$STAGE/ws/cads-zero/build/itsboard"
cp "$HERE/extensions/cads-tutor/test/fixtures/cads-zero.elf" "$STAGE/ws/cads-zero/build/itsboard/"
# COURSES: space-separated pack dirs (default: the real packs from courses/, else the example pack)
COURSES=${COURSES:-$(ls -d "$HERE"/courses/cads-zero-* 2>/dev/null | tr '\n' ' ')}
[ -n "$COURSES" ] || COURSES="$HERE/extensions/cads-tutor/courses/_example"
for c in $COURSES; do cp -R "$c" "$STAGE/opt/cads-tutor/courses/"; done
cp "$VSIX" "$STAGE/tmp/e2e/cads-tutor.vsix"
cat > "$STAGE/tmp/e2e/settings.json" <<'JSON'
{ "workbench.startupEditor": "none", "security.workspace.trust.enabled": false, "cadsTutor.autoOpen": true,
  "workbench.tips.enabled": false, "update.mode": "none", "telemetry.telemetryLevel": "off" }
JSON

docker rm -f "$NAME" >/dev/null 2>&1 || true
# Files are copied in (docker cp) instead of bind-mounted: Docker Desktop on macOS does not share /private/tmp.
docker create --name "$NAME" -p "127.0.0.1:$PORT:8080" --user root --entrypoint bash codercom/code-server:latest -c \
  'chown -R coder:coder /home/coder/workspace /opt/cads-tutor /tmp/e2e && exec runuser -u coder -- bash -c "mkdir -p ~/.local/share/code-server/User && cp /tmp/e2e/settings.json ~/.local/share/code-server/User/settings.json && code-server --install-extension /tmp/e2e/cads-tutor.vsix && exec /usr/bin/entrypoint.sh --bind-addr 0.0.0.0:8080 --auth none --disable-workspace-trust --disable-telemetry --disable-update-check /home/coder/workspace/cads-zero"' >/dev/null
docker cp "$STAGE/ws/." "$NAME:/home/coder/workspace"
docker cp "$STAGE/opt/." "$NAME:/opt"
docker cp "$STAGE/tmp/." "$NAME:/tmp"
docker start "$NAME" >/dev/null
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/" || true)
  [ "$code" = "302" ] || [ "$code" = "200" ] && { echo "code-server up: http://127.0.0.1:$PORT/?folder=/home/coder/workspace/cads-zero"; exit 0; }
  sleep 1
done
echo "code-server did not come up" >&2; docker logs "$NAME" | tail -20; exit 1

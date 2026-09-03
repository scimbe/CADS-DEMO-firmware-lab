#!/usr/bin/env bash
# Build the CaDS Tutor Lab image (images/tutor-lab) and run it on 127.0.0.1:8089.
#
#   scripts/run-local-tutor-lab.sh              build (cached) + (re)start the container
#   scripts/run-local-tutor-lab.sh --no-cache   full rebuild
#   scripts/run-local-tutor-lab.sh --build-only build, do not start
#   scripts/run-local-tutor-lab.sh --fresh      also drop the workspace volume (re-seed)
#   scripts/run-local-tutor-lab.sh --stop       stop and remove the container (volume stays)
#
# Reads .env (TUTOR_LAB_PASSWORD, TUTOR_LAB_PORT, TUTOR_LLM_*, CADS_TUTOR_TELEMETRY_*)
# if present. Port 8089 by default: 8083-8088 are taken by the other streams'
# containers on the development machine. No secrets are needed for the build.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${CADS_TUTOR_LAB_IMAGE:-cads-tutor-lab:dev}"
CONTAINER="${CADS_TUTOR_LAB_CONTAINER:-tutor-lab-local}"
VOLUME="${CADS_TUTOR_LAB_VOLUME:-tutor-lab-local-workspace}"

NO_CACHE=0 BUILD_ONLY=0 FRESH=0 STOP=0
for arg in "$@"; do
    case "$arg" in
        --no-cache) NO_CACHE=1 ;;
        --build-only) BUILD_ONLY=1 ;;
        --fresh) FRESH=1 ;;
        --stop) STOP=1 ;;
        -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

if [ -f "$REPO_ROOT/.env" ]; then
    set -a; # shellcheck disable=SC1091
    . "$REPO_ROOT/.env"; set +a
fi
PORT="${TUTOR_LAB_PORT:-8089}"

if [ "$STOP" = 1 ]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 && echo "stopped $CONTAINER" || echo "$CONTAINER was not running"
    exit 0
fi

# --- cads-tutor VSIX ----------------------------------------------------------
# dist/*.vsix is gitignored; package it if npm is available and it is missing
# (same as the CI "extensions" job). Tolerant: a failure only prints a warning.
dir="$REPO_ROOT/extensions/cads-tutor"
if [ -f "$dir/package.json" ] && command -v npm >/dev/null 2>&1; then
    if ls "$dir"/dist/*.vsix >/dev/null 2>&1 && [ "${CADS_REPACKAGE:-0}" != 1 ]; then
        echo ">> cads-tutor: dist/*.vsix present (CADS_REPACKAGE=1 to rebuild)"
    else
        echo ">> packaging cads-tutor"
        ( cd "$dir" && npm ci --no-audit --no-fund && npm run package ) \
            || echo "warning: packaging cads-tutor failed - image will be built without it" >&2
    fi
fi
ls "$dir"/dist/*.vsix 2>/dev/null || echo ">> no cads-tutor VSIX - image gets Open VSX extensions only"

# --- build -------------------------------------------------------------------
export DOCKER_BUILDKIT=1
build_args=(-f "$REPO_ROOT/images/tutor-lab/Dockerfile" -t "$IMAGE")
[ "$NO_CACHE" = 1 ] && build_args+=(--no-cache)
[ -n "${RUST_TOOLCHAIN:-}" ] && build_args+=(--build-arg "RUST_TOOLCHAIN=$RUST_TOOLCHAIN")

echo ">> docker build (first build 10-20 min on a small Docker VM: Node, rustup, extensions, seed build)"
start=$(date +%s)
docker build "${build_args[@]}" "$REPO_ROOT"
echo ">> built $IMAGE in $(( $(date +%s) - start )) s, size: $(docker image inspect "$IMAGE" --format '{{.Size}}' | awk '{printf "%.2f GB", $1/1e9}')"

[ "$BUILD_ONLY" = 1 ] && exit 0

# --- run ---------------------------------------------------------------------
: "${TUTOR_LAB_PASSWORD:?set TUTOR_LAB_PASSWORD (in .env or the environment)}"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
if [ "$FRESH" = 1 ]; then
    docker volume rm "$VOLUME" >/dev/null 2>&1 && echo ">> removed volume $VOLUME" || true
fi

docker run -d --name "$CONTAINER" --restart unless-stopped \
    -p "127.0.0.1:${PORT}:8080" \
    -e PASSWORD="$TUTOR_LAB_PASSWORD" \
    -e TUTOR_LLM_BASE_URL="${TUTOR_LLM_BASE_URL:-}" \
    -e TUTOR_LLM_API_KEY="${TUTOR_LLM_API_KEY:-}" \
    -e TUTOR_LLM_MODEL="${TUTOR_LLM_MODEL:-}" \
    -e CADS_TUTOR_TELEMETRY_URL="${CADS_TUTOR_TELEMETRY_URL:-}" \
    -e CADS_TUTOR_TELEMETRY_TOKEN="${CADS_TUTOR_TELEMETRY_TOKEN:-}" \
    -v "$VOLUME:/home/coder/workspace" \
    "$IMAGE" >/dev/null

echo ">> waiting for code-server on 127.0.0.1:${PORT} ..."
for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/healthz" 2>/dev/null; then
        echo ">> ready: http://127.0.0.1:${PORT}  (password: TUTOR_LAB_PASSWORD)"
        docker logs "$CONTAINER" 2>&1 | grep '\[cads-seed\]' || true
        exit 0
    fi
    sleep 2
done
echo "!! code-server did not come up; docker logs $CONTAINER:" >&2
docker logs "$CONTAINER" >&2 || true
exit 1

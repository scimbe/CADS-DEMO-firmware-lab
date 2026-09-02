#!/usr/bin/env bash
# Build the CaDS Firmware Lab image and run it on 127.0.0.1:8084 (see README.md).
#
#   scripts/run-local.sh              build (cached) + (re)start the container
#   scripts/run-local.sh --no-cache   full rebuild
#   scripts/run-local.sh --build-only build, do not start
#   scripts/run-local.sh --fresh      also drop the workspace volume (re-seed cads-zero)
#   scripts/run-local.sh --stop       stop and remove the container (volume stays)
#
# Reads .env (FIRMWARE_LAB_PASSWORD, FIRMWARE_LAB_PORT, TUTOR_LLM_*) if present.
# The private cads-zero repo is cloned inside the build with a BuildKit secret
# taken from `gh auth token` (or $GH_TOKEN); it never lands in the image.
# Mirrors the lab deployment, which is a plain `docker run` (no compose).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${CADS_LAB_IMAGE:-cads-firmware-lab:dev}"
CONTAINER="${CADS_LAB_CONTAINER:-firmware-lab-local}"
VOLUME="${CADS_LAB_VOLUME:-firmware-lab-local-workspace}"

NO_CACHE=0 BUILD_ONLY=0 FRESH=0 STOP=0
for arg in "$@"; do
    case "$arg" in
        --no-cache) NO_CACHE=1 ;;
        --build-only) BUILD_ONLY=1 ;;
        --fresh) FRESH=1 ;;
        --stop) STOP=1 ;;
        -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

if [ -f "$REPO_ROOT/.env" ]; then
    set -a; # shellcheck disable=SC1091
    . "$REPO_ROOT/.env"; set +a
fi
PORT="${FIRMWARE_LAB_PORT:-8084}"

if [ "$STOP" = 1 ]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 && echo "stopped $CONTAINER" || echo "$CONTAINER was not running"
    exit 0
fi

# --- build -------------------------------------------------------------------
if [ -z "${GH_TOKEN:-}" ]; then
    if command -v gh >/dev/null 2>&1 && gh auth token >/dev/null 2>&1; then
        GH_TOKEN="$(gh auth token)"
    else
        echo "warning: no GH_TOKEN and no gh login - the private cads-zero clone will fail" >&2
        GH_TOKEN=""
    fi
fi
export GH_TOKEN DOCKER_BUILDKIT=1

build_args=(--secret id=gh_token,env=GH_TOKEN -t "$IMAGE")
[ "$NO_CACHE" = 1 ] && build_args+=(--no-cache)
[ -n "${CADS_ZERO_REF:-}" ] && build_args+=(--build-arg "CADS_ZERO_REF=$CADS_ZERO_REF")

echo ">> docker build (this takes 15-40 min on a small Docker VM: toolchain download, firmware + host build)"
start=$(date +%s)
docker build "${build_args[@]}" "$REPO_ROOT"
echo ">> built $IMAGE in $(( $(date +%s) - start )) s, size: $(docker image inspect "$IMAGE" --format '{{.Size}}' | awk '{printf "%.2f GB", $1/1e9}')"

[ "$BUILD_ONLY" = 1 ] && exit 0

# --- run ---------------------------------------------------------------------
: "${FIRMWARE_LAB_PASSWORD:?set FIRMWARE_LAB_PASSWORD (in .env or the environment)}"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
if [ "$FRESH" = 1 ]; then
    docker volume rm "$VOLUME" >/dev/null 2>&1 && echo ">> removed volume $VOLUME" || true
fi

docker run -d --name "$CONTAINER" \
    -p "127.0.0.1:${PORT}:8080" \
    -e PASSWORD="$FIRMWARE_LAB_PASSWORD" \
    -e TUTOR_LLM_BASE_URL="${TUTOR_LLM_BASE_URL:-}" \
    -e TUTOR_LLM_API_KEY="${TUTOR_LLM_API_KEY:-}" \
    -e TUTOR_LLM_MODEL="${TUTOR_LLM_MODEL:-}" \
    -v "$VOLUME:/home/coder/workspace" \
    "$IMAGE" >/dev/null

echo ">> waiting for code-server on 127.0.0.1:${PORT} ..."
for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/healthz" 2>/dev/null; then
        echo ">> ready: http://127.0.0.1:${PORT}  (password: FIRMWARE_LAB_PASSWORD)"
        docker logs "$CONTAINER" 2>&1 | grep '\[cads-seed\]' || true
        exit 0
    fi
    sleep 2
done
echo "!! code-server did not come up; docker logs $CONTAINER:" >&2
docker logs "$CONTAINER" >&2 || true
exit 1

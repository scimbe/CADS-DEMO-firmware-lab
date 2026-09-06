#!/usr/bin/env bash
# CaDS Firmware Lab - deploy one image tag on the services host, with a rollback.
#
#   ./deploy.sh                     deploy FIRMWARE_LAB_TAG from .env
#   ./deploy.sh --tag next-1a2b3c4  deploy that tag instead
#   ./deploy.sh --dry-run           say what would happen, change nothing
#   ./deploy.sh --skip-smoke        health check only
#   ./deploy.sh --no-rollback       leave the failed tag for inspection
#   ./deploy.sh --allow-no-llm      deploy without a language model (see below)
#
# WHY `docker run` AND NOT COMPOSE. The language lab got a compose file; this
# host does not, on purpose:
#   - This deployment is documented as compose-free (SPEC.md §1, README.md),
#     and whether `docker compose` even exists here cannot be checked from
#     anywhere but the host. A deploy that is only correct if an unverified
#     prerequisite happens to be installed is the guessing step this is meant
#     to remove.
#   - Nothing is lost: the restart policy, the healthcheck, the labels and the
#     named volume are all `docker run` flags.
#   - The image's CMD carries every flag that matters, `--disable-workspace-trust`
#     included (ADR-006). Appending arguments after the image name replaces it
#     and puts the workbench back into Restricted Mode with every extension off.
#     A `docker run` that ends at the image name cannot make that mistake, and
#     smoke.sh checks the result anyway.
#
# Idempotent the way compose is: the whole intended configuration is hashed
# into a label. A rerun that would produce the identical container touches
# nothing. Anything else - a new tag, a changed password, a different port -
# recreates it.
#
# The rollback target is READ from the running container before anything
# changes. Nothing here infers a "previous" tag from a naming convention.
#
# Disk is checked BEFORE the pull. This host is small, and an image pull that
# fills the disk takes the running lab down with it.

set -uo pipefail
# Every number in here is parsed and printed with a decimal point. In a
# comma locale awk reads "3.75" as 3, which silently under-estimates the
# disk a pull needs by a fifth; df and date get stable output too.
export LC_ALL=C

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Read .env the way docker compose does: a value already in the environment
# wins over the file.
load_env() {
    local file="$1" line key value
    [ -f "$file" ] || return 0
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in ''|'#'*) continue ;; esac
        case "$line" in *=*) ;; *) continue ;; esac
        key="${line%%=*}"; key="${key#export }"; key="${key// /}"
        value="${line#*=}"
        case "$value" in
            \"*\") value="${value#\"}"; value="${value%\"}" ;;
            \'*\') value="${value#\'}"; value="${value%\'}" ;;
        esac
        [ -n "$key" ] || continue
        [ -n "${!key+x}" ] || export "$key=$value"
    done < "$file"
}
load_env "$HERE/.env"

TAG_OVERRIDE=""
DRY_RUN=0; SKIP_SMOKE=0; ROLLBACK=1; ALLOW_MOVING=0; ALLOW_NO_LLM=0; SKIP_DISK=0
HEALTH_TIMEOUT_S="${FIRMWARE_LAB_HEALTH_TIMEOUT_S:-300}"

while [ $# -gt 0 ]; do
    case "$1" in
        --tag) TAG_OVERRIDE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --skip-smoke) SKIP_SMOKE=1; shift ;;
        --no-rollback) ROLLBACK=0; shift ;;
        --allow-moving-tag) ALLOW_MOVING=1; shift ;;
        --allow-no-llm) ALLOW_NO_LLM=1; shift ;;
        --skip-disk-check) SKIP_DISK=1; shift ;;
        -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

say()  { printf '>> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }
gb()   { awk -v b="$1" 'BEGIN{printf "%.2f GB", b/1e9}'; }

REPO="${FIRMWARE_LAB_IMAGE:-ghcr.io/scimbe/cads-firmware-lab}"
CONTAINER="${FIRMWARE_LAB_CONTAINER:-firmware-lab}"
VOLUME="${FIRMWARE_LAB_VOLUME:-firmware-lab-workspace}"
PORT="${FIRMWARE_LAB_PORT:-8083}"
URL="http://127.0.0.1:${PORT}"
TAG="${TAG_OVERRIDE:-${FIRMWARE_LAB_TAG:-}}"
HEADROOM_GB="${FIRMWARE_LAB_DISK_HEADROOM_GB:-1}"

# --- preflight ---------------------------------------------------------------
command -v docker >/dev/null 2>&1 || die "docker is not on PATH"
docker info >/dev/null 2>&1 || die "cannot talk to the docker daemon"
[ -f "$HERE/.env" ] || die "no .env next to this script - cp .env.example .env and fill it in"
[ -n "${FIRMWARE_LAB_PASSWORD:-}" ] || die "FIRMWARE_LAB_PASSWORD is empty in .env - the lab would be open to anyone who reaches the port"
[ -n "$TAG" ] || die "no FIRMWARE_LAB_TAG in .env and no --tag given"
case "$TAG" in
    next|latest|main)
        [ "$ALLOW_MOVING" = 1 ] || die "\"$TAG\" is a moving tag. Deploy an immutable one (next-<shortsha>), otherwise a rollback has nothing to roll back to. --allow-moving-tag overrides."
        warn "deploying the moving tag \"$TAG\" - a later rollback cannot rely on it" ;;
esac
TARGET_REF="${REPO}:${TAG}"

# On this host the tutor is expected to have a real model. Without one it still
# teaches, but every comprehension question falls back to self-assessment and
# the help levels stay empty - and it fails that way quietly.
llm_set=0
for v in "${TUTOR_LLM_BASE_URL:-}" "${TUTOR_LLM_API_KEY:-}" "${TUTOR_LLM_MODEL:-}"; do
    [ -n "$v" ] && llm_set=$((llm_set + 1))
done
if [ "$llm_set" -ne 3 ]; then
    [ "$ALLOW_NO_LLM" = 1 ] || die "only $llm_set of the three TUTOR_LLM_* values are set. This host runs the tutor with a real model; without all three it falls back to self-assessment on every question. Fix .env, or pass --allow-no-llm if that is really what you want."
    warn "deploying without a complete language model configuration (--allow-no-llm)"
else
    case "${TUTOR_LLM_BASE_URL}" in
        https://*) say "language model: ${TUTOR_LLM_MODEL} at ${TUTOR_LLM_BASE_URL}" ;;
        *) die "TUTOR_LLM_BASE_URL is not https:// - LlmClient refuses it in its constructor and the tutor's ask path stays dead. Fix it in .env." ;;
    esac
fi

# --- what runs now (the rollback target is observed, never assumed) ----------
PREV_REF=""; PREV_ID=""; PREV_VOLUME=""; ROLLBACK_REF=""; PREV_HASH=""
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
    PREV_REF="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}')"
    PREV_ID="$(docker inspect "$CONTAINER" --format '{{.Image}}')"
    PREV_STATE="$(docker inspect "$CONTAINER" --format '{{.State.Status}}')"
    PREV_HASH="$(docker inspect "$CONTAINER" --format '{{index .Config.Labels "cads.firmware-lab.config-hash"}}' 2>/dev/null)"
    PREV_VOLUME="$(docker inspect "$CONTAINER" \
        --format '{{range .Mounts}}{{if eq .Destination "/home/coder/workspace"}}{{.Name}}{{end}}{{end}}')"
    say "currently deployed: $PREV_REF ($PREV_STATE), workspace volume ${PREV_VOLUME:-<none>}"
    if [ "$(docker image inspect "$PREV_REF" --format '{{.Id}}' 2>/dev/null)" = "$PREV_ID" ]; then
        ROLLBACK_REF="$PREV_REF"
    else
        ROLLBACK_REF="cads-firmware-lab:rollback-$(printf '%s' "${PREV_ID#sha256:}" | cut -c1-12)"
        say "the previous reference $PREV_REF no longer resolves to the running image; pinning it as $ROLLBACK_REF"
        [ "$DRY_RUN" = 1 ] || docker tag "$PREV_ID" "$ROLLBACK_REF" >/dev/null \
            || warn "could not pin the running image - a rollback would have no target"
    fi
else
    say "no container named $CONTAINER exists: this is a first deployment"
    warn "there is no rollback target. If the new tag fails its checks, the lab stays down until you deploy a known-good tag by hand."
fi

# The workspace volume must not change silently: a different name does not
# raise an error, it just hands the students an empty, freshly seeded checkout
# while their work sits in the volume nobody mounted.
if [ -n "$PREV_VOLUME" ] && [ "$PREV_VOLUME" != "$VOLUME" ]; then
    echo >&2
    echo "error: the running container uses the workspace volume" >&2
    echo "         $PREV_VOLUME" >&2
    echo "       but this configuration would use" >&2
    echo "         $VOLUME" >&2
    echo "       Put the name that is in use into .env and run again:" >&2
    echo >&2
    echo "         FIRMWARE_LAB_VOLUME=$PREV_VOLUME" >&2
    echo >&2
    exit 1
fi
[ -n "$PREV_VOLUME" ] && say "workspace volume unchanged: $PREV_VOLUME"

# --- the intended container, in one place ------------------------------------
# Everything that defines the deployment. The hash of this array is what makes
# a rerun a no-op, so anything that matters must be in it.
build_run_args() {
    RUN_ARGS=(
        --name "$CONTAINER"
        --restart unless-stopped
        -p "127.0.0.1:${PORT}:8080"
        -e "PASSWORD=${FIRMWARE_LAB_PASSWORD}"
        -e "TUTOR_LLM_BASE_URL=${TUTOR_LLM_BASE_URL:-}"
        -e "TUTOR_LLM_API_KEY=${TUTOR_LLM_API_KEY:-}"
        -e "TUTOR_LLM_MODEL=${TUTOR_LLM_MODEL:-}"
        -v "${VOLUME}:/home/coder/workspace"
        --health-cmd "curl -fsS -o /dev/null http://127.0.0.1:8080/healthz"
        --health-interval 30s
        --health-timeout 5s
        --health-start-period 90s
        --health-retries 3
        # The single entry point. Unlike the language lab there is one folder
        # and one track, so there is no per-link course filtering to get wrong;
        # both firmware course packs belong to this folder by design.
        --label "cads.firmware-lab.entry=/?folder=/home/coder/workspace/cads-zero"
    )
    [ -n "${CMAKE_BUILD_PARALLEL_LEVEL:-}" ] && RUN_ARGS+=(-e "CMAKE_BUILD_PARALLEL_LEVEL=${CMAKE_BUILD_PARALLEL_LEVEL}")
    [ -n "${CADS_TUTOR_TELEMETRY_URL:-}" ] && RUN_ARGS+=(-e "CADS_TUTOR_TELEMETRY_URL=${CADS_TUTOR_TELEMETRY_URL}")
    [ -n "${CADS_TUTOR_TELEMETRY_TOKEN:-}" ] && RUN_ARGS+=(-e "CADS_TUTOR_TELEMETRY_TOKEN=${CADS_TUTOR_TELEMETRY_TOKEN}")
}
build_run_args

# The hash covers the arguments and the resolved image id, so a moved tag also
# counts as a change. The password is in there; it is hashed, not stored.
config_hash() {
    local image_id="$1"
    printf '%s\0' "${RUN_ARGS[@]}" "$image_id" | shasum -a 256 2>/dev/null | cut -d' ' -f1 \
        || printf '%s\0' "${RUN_ARGS[@]}" "$image_id" | sha256sum | cut -d' ' -f1
}

# --- disk, before the pull ---------------------------------------------------
# The unpacked size is what fills the disk. Docker reports it differently
# depending on the image store, so take the larger of the two answers, and use
# a local image of the same repository as the estimate when the target is not
# here yet (tags of one image differ by a few percent, not by gigabytes).
image_unpacked_bytes() {
    local ref="$1" a b
    a="$(docker image inspect "$ref" --format '{{.Size}}' 2>/dev/null)" || a=0
    b="$(docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' 2>/dev/null \
        | awk -v r="$ref" '$1==r {print $2 $3}' \
        | awk '{ v=$0; sub(/[A-Za-z]+$/,"",v);
                 if ($0 ~ /GB$/) print v*1e9; else if ($0 ~ /MB$/) print v*1e6;
                 else if ($0 ~ /kB$/) print v*1e3; else print v }')" || b=0
    [ -n "$a" ] || a=0; [ -n "$b" ] || b=0
    awk -v a="$a" -v b="$b" 'BEGIN{print (a>b)?a:b}'
}

# Free bytes on the filesystem that holds docker's images. Two ways, because
# the data directory is only a local path when the daemon runs on this machine:
#   1. df on DockerRootDir - the case on the services host, and the direct answer.
#   2. df inside a throwaway container. A container's writable layer sits on the
#      very filesystem we are asking about, so `df /` in one is the same number.
#      This is what makes the check work against a daemon in a VM (Colima,
#      Docker Desktop) instead of silently skipping it there.
# Prints the free bytes and how they were measured, or nothing on failure.
free_bytes_on_docker_root() {
    local root avail img
    root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)"
    if [ -n "$root" ] && [ -d "$root" ]; then
        avail="$(df -kP "$root" 2>/dev/null | awk 'NR==2 {print $4 * 1024}')"
        if [ -n "$avail" ] && [ "$avail" -gt 0 ] 2>/dev/null; then
            printf '%s %s\n' "$avail" "df on $root"
            return 0
        fi
    fi
    # Any locally present image will do; prefer one of this lab's.
    img="$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep "^${REPO}:" | head -1)"
    [ -n "$img" ] || img="$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -v '<none>' | head -1)"
    [ -n "$img" ] || return 1
    avail="$(docker run --rm --entrypoint df "$img" -kP / 2>/dev/null | awk 'NR==2 {print $4 * 1024}')"
    [ -n "$avail" ] && [ "$avail" -gt 0 ] 2>/dev/null || return 1
    printf '%s %s\n' "$avail" "df inside a container (the daemon is not on this filesystem)"
}

check_disk() {
    local avail how need_unpacked need_download need_total have_local
    read -r avail how <<<"$(free_bytes_on_docker_root)"
    [ -n "${avail:-}" ] || { warn "could not measure the free disk for docker images - NOT skipping silently: rerun with --skip-disk-check if you have checked by hand"; exit 1; }

    if docker image inspect "$TARGET_REF" >/dev/null 2>&1; then
        say "disk: $TARGET_REF is already here, nothing to download (free: $(gb "$avail"))"
        return 0
    fi

    need_unpacked=0
    for ref in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep "^${REPO}:" | head -3); do
        have_local="$(image_unpacked_bytes "$ref")"
        awk -v h="$have_local" -v n="$need_unpacked" 'BEGIN{exit !(h>n)}' && need_unpacked="$have_local"
    done
    if [ "${need_unpacked%.*}" -le 0 ] 2>/dev/null || [ -z "$need_unpacked" ]; then
        # No image of this repository here to measure: the documented size.
        need_unpacked=4000000000
        say "disk: no local image of $REPO to measure, assuming $(gb "$need_unpacked") unpacked (docs/IMAGE-NOTES.md)"
    fi
    # The download is kept on disk beside the unpacked layers while the pull runs.
    need_download="$(awk -v u="$need_unpacked" 'BEGIN{printf "%d", u/3.7}')"
    need_total="$(awk -v u="$need_unpacked" -v d="$need_download" -v h="$HEADROOM_GB" 'BEGIN{printf "%d", u + d + h*1e9}')"

    say "disk ($how): free $(gb "$avail"), needed about $(gb "$need_total") (unpacked $(gb "$need_unpacked") + download $(gb "$need_download") + ${HEADROOM_GB} GB headroom)"
    if awk -v a="$avail" -v n="$need_total" 'BEGIN{exit !(a >= n)}'; then
        return 0
    fi

    echo >&2
    echo "error: not enough free disk to pull $TARGET_REF." >&2
    echo "       free:   $(gb "$avail")" >&2
    echo "       needed: $(gb "$need_total")" >&2
    echo "       Pulling anyway would fill the disk and take the running lab down with it," >&2
    echo "       so nothing was changed." >&2
    echo >&2
    echo "       The estimate is deliberately the full unpacked size. A new tag of this" >&2
    echo "       image shares most of its layers with one already here, so the real need" >&2
    echo "       is smaller - but by how much is not knowable before the pull, and being" >&2
    echo "       wrong in that direction costs the running lab. Free the space instead." >&2
    echo >&2
    echo "       Images of this lab that can be removed (the running one is kept):" >&2
    local listed=0
    while read -r ref size; do
        [ "$ref" = "$PREV_REF" ] && continue
        [ "$ref" = "$TARGET_REF" ] && continue
        echo "         docker image rm $ref     # frees about $size" >&2
        listed=1
    done < <(docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep "^${REPO}:")
    [ "$listed" = 0 ] && echo "         (none besides the running one - free space elsewhere on the host)" >&2
    echo >&2
    echo "       Then run again. --skip-disk-check overrides this, at your own risk." >&2
    echo >&2
    exit 1
}
[ "$SKIP_DISK" = 1 ] || check_disk

say "target: $TARGET_REF"

# --- health ------------------------------------------------------------------
wait_healthy() {
    local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_S )) status health http
    while [ "$(date +%s)" -lt "$deadline" ]; do
        status="$(docker inspect "$CONTAINER" --format '{{.State.Status}}' 2>/dev/null)"
        if [ "$status" = "running" ]; then
            health="$(docker inspect "$CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
            if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
                http="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "$URL/healthz" 2>/dev/null)"
                [ "$http" = "200" ] && return 0
            fi
        fi
        sleep 3
    done
    return 1
}
report_failure() {
    echo >&2
    echo "--- last 40 log lines of $CONTAINER ---" >&2
    docker logs --tail=40 "$CONTAINER" 2>&1 | sed 's/^/    /' >&2
    echo "---" >&2
}

# Replace the running container with one built from RUN_ARGS on $1.
start_ref() {
    local ref="$1" image_id
    image_id="$(docker image inspect "$ref" --format '{{.Id}}' 2>/dev/null)"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    # Nothing after the image name: the image's CMD carries the flags.
    docker run -d "${RUN_ARGS[@]}" \
        --label "cads.firmware-lab.config-hash=$(config_hash "$image_id")" \
        "$ref" >/dev/null
}

# --- deploy ------------------------------------------------------------------
if [ "$DRY_RUN" = 1 ]; then
    say "dry run: would pull $TARGET_REF, recreate $CONTAINER, then check $URL/healthz"
    say "dry run: rollback target would be ${ROLLBACK_REF:-<none>}"
    exit 0
fi

if ! docker image inspect "$TARGET_REF" >/dev/null 2>&1; then
    say "docker pull $TARGET_REF (about 1 GB)"
    docker pull "$TARGET_REF" || die "pull failed - nothing was changed, $([ -n "$PREV_REF" ] && echo "$PREV_REF is still running" || echo "the lab is still down")"
else
    say "$TARGET_REF is already present locally"
fi

TARGET_ID="$(docker image inspect "$TARGET_REF" --format '{{.Id}}')"
WANT_HASH="$(config_hash "$TARGET_ID")"
if [ -n "$PREV_HASH" ] && [ "$PREV_HASH" = "$WANT_HASH" ] && [ "$PREV_STATE" = "running" ]; then
    say "the running container already matches this configuration exactly - not recreating it"
    RECREATED=0
else
    say "starting $CONTAINER on $TARGET_REF"
    start_ref "$TARGET_REF" || die "could not start the container"
    RECREATED=1
fi

DEPLOY_OK=0
say "waiting for the lab to answer on $URL/healthz (up to ${HEALTH_TIMEOUT_S}s)"
if wait_healthy; then
    say "healthy: $URL/healthz answers 200"
    DEPLOY_OK=1
else
    warn "the container did not become healthy within ${HEALTH_TIMEOUT_S}s"
    report_failure
fi

if [ "$DEPLOY_OK" = 1 ] && [ "$SKIP_SMOKE" = 0 ] && [ -x "$HERE/smoke.sh" ]; then
    say "running the smoke test"
    "$HERE/smoke.sh" || { warn "the smoke test failed"; DEPLOY_OK=0; }
fi

if [ "$DEPLOY_OK" = 1 ]; then
    echo
    say "deployed $TARGET_REF on $URL$([ "$RECREATED" = 0 ] && echo " (unchanged)")"
    say "entry point: <host>/?folder=/home/coder/workspace/cads-zero"
    if [ -n "$PREV_REF" ] && [ "$PREV_REF" != "$TARGET_REF" ]; then
        say "when this tag has held for a few days, reclaim the old one:"
        say "    docker image rm $PREV_REF"
    fi
    exit 0
fi

echo >&2
if [ "$ROLLBACK" = 0 ]; then
    warn "--no-rollback: $TARGET_REF is left in place for inspection."
    [ -n "$ROLLBACK_REF" ] && warn "roll back by hand with: ./deploy.sh --tag ${ROLLBACK_REF##*:}"
    exit 1
fi
[ -n "$ROLLBACK_REF" ] || die "$TARGET_REF failed its checks and there is no previous version to return to (nothing was running before). The lab is down; deploy a known-good tag."

say "rolling back to $ROLLBACK_REF"
start_ref "$ROLLBACK_REF" || die "ROLLBACK FAILED to start $ROLLBACK_REF - the lab is down and needs hands"
if wait_healthy; then
    say "rolled back: $ROLLBACK_REF is running and healthy on $URL"
    echo "error: $TARGET_REF was NOT deployed. The lab runs the previous version." >&2
    exit 1
fi
report_failure
die "ROLLBACK FAILED its health check - the lab is down and needs hands"

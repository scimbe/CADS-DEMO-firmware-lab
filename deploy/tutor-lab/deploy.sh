#!/usr/bin/env bash
# CaDS Tutor Lab - deploy one image tag on the lab host, with a rollback.
#
#   ./deploy.sh                    deploy TUTOR_LAB_TAG from .env
#   ./deploy.sh --tag next-1a2b3c4 deploy that tag instead
#   ./deploy.sh --dry-run          say what would happen, change nothing
#   ./deploy.sh --skip-smoke       health check only, no smoke test
#   ./deploy.sh --no-rollback      leave the failed tag running for inspection
#
# The script is idempotent: deploying the tag that already runs pulls nothing
# new, recreates nothing, and still verifies the result.
#
# The rollback target is READ from the running container (its image reference
# and, if that reference has since moved, its image id) before anything
# changes. Nothing here guesses a "previous" tag. With no container running
# there is no rollback target, and the script says so before it starts.
#
# Student work lives in a named volume. The script refuses to start when the
# volume this compose file would use is not the volume the running container
# actually has - that mistake does not throw an error, it just hands the
# students an empty workspace.
#
# Operator runbook: docs/TUTOR-LAB-DEPLOY.md.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$HERE/compose.yml"
# Read .env the way docker compose does: a value already in the environment
# wins over the file, so `TUTOR_LAB_TAG=... ./deploy.sh` and compose agree on
# what is being deployed.
load_env() {
    local file="$1" line key value
    [ -f "$file" ] || return 0
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in ''|'#'*) continue ;; esac
        case "$line" in *=*) ;; *) continue ;; esac
        key="${line%%=*}"; key="${key#export }"; key="${key// /}"
        value="${line#*=}"
        # strip one layer of surrounding quotes, as compose does
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
DRY_RUN=0
SKIP_SMOKE=0
ROLLBACK=1
ALLOW_MOVING=0
HEALTH_TIMEOUT_S="${TUTOR_LAB_HEALTH_TIMEOUT_S:-240}"

while [ $# -gt 0 ]; do
    case "$1" in
        --tag) TAG_OVERRIDE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --skip-smoke) SKIP_SMOKE=1; shift ;;
        --no-rollback) ROLLBACK=0; shift ;;
        --allow-moving-tag) ALLOW_MOVING=1; shift ;;
        -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

say()  { printf '>> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

CONTAINER="${TUTOR_LAB_CONTAINER:-tutor-lab}"
PORT="${TUTOR_LAB_PORT:-8084}"
URL="http://127.0.0.1:${PORT}"
REPO="${TUTOR_LAB_IMAGE:-ghcr.io/scimbe/cads-tutor-lab}"
TAG="${TAG_OVERRIDE:-${TUTOR_LAB_TAG:-}}"

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# --- preflight ---------------------------------------------------------------
command -v docker >/dev/null 2>&1 || die "docker is not on PATH"
docker compose version >/dev/null 2>&1 || die "docker compose (v2) is not available"
[ -f "$COMPOSE_FILE" ] || die "no compose.yml next to this script"
[ -f "$HERE/.env" ] || die "no .env next to this script - cp .env.example .env and fill it in"
[ -n "${TUTOR_LAB_PASSWORD:-}" ] || die "TUTOR_LAB_PASSWORD is empty in .env - the lab would be open to anyone who reaches the port"

if [ -z "$TAG" ]; then
    # Not an error: compose.yml carries a default. Name it, so the log says
    # which image this run deployed.
    TAG="$(TUTOR_LAB_PASSWORD=x compose config 2>/dev/null | sed -n 's#.*image: .*cads-tutor-lab:\(.*\)#\1#p' | head -1)"
    [ -n "$TAG" ] || die "no TUTOR_LAB_TAG in .env and no default in compose.yml"
    say "no TUTOR_LAB_TAG set, using the compose default: $TAG"
fi
case "$TAG" in
    next|latest|main|"")
        if [ "$ALLOW_MOVING" = 0 ]; then
            die "\"$TAG\" is a moving tag. Deploy an immutable one (next-<shortsha>), otherwise a rollback has nothing to roll back to. --allow-moving-tag overrides."
        fi
        warn "deploying the moving tag \"$TAG\" - a later rollback cannot rely on it" ;;
esac
TARGET_REF="${REPO}:${TAG}"

# The language model is not required for the lab to run, but a class without it
# gets a tutor that falls back to self-assessment on every question - worth a
# loud line, not a refusal.
llm_set=0
for v in "${TUTOR_LLM_BASE_URL:-}" "${TUTOR_LLM_API_KEY:-}" "${TUTOR_LLM_MODEL:-}"; do
    [ -n "$v" ] && llm_set=$((llm_set + 1))
done
case "$llm_set" in
    0) warn "no TUTOR_LLM_* set: the tutor runs without a language model, every comprehension question falls back to self-assessment" ;;
    3) case "${TUTOR_LLM_BASE_URL}" in
           https://*) say "language model configured: ${TUTOR_LLM_MODEL} at ${TUTOR_LLM_BASE_URL} (verify with ./llm-check.sh)" ;;
           *) warn "TUTOR_LLM_BASE_URL is not https:// - the client refuses it and the ask path stays dead. Fix it in .env." ;;
       esac ;;
    *) warn "only $llm_set of the three TUTOR_LLM_* values are set - the tutor reports itself unconfigured unless all three are" ;;
esac

# --- what runs now (the rollback target is observed, never assumed) ----------
PREV_REF=""; PREV_ID=""; PREV_VOLUME=""; ROLLBACK_REF=""
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
    PREV_REF="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}')"
    PREV_ID="$(docker inspect "$CONTAINER" --format '{{.Image}}')"
    PREV_VOLUME="$(docker inspect "$CONTAINER" \
        --format '{{range .Mounts}}{{if eq .Destination "/home/coder/workspace"}}{{.Name}}{{end}}{{end}}')"
    PREV_STATE="$(docker inspect "$CONTAINER" --format '{{.State.Status}}')"
    say "currently deployed: $PREV_REF ($PREV_STATE), workspace volume ${PREV_VOLUME:-<none>}"

    # Roll back to the reference that was running, but only while it still
    # resolves to the image that was running. If the tag has moved or gone,
    # pin the image by id under a local rescue tag instead.
    if [ "$(docker image inspect "$PREV_REF" --format '{{.Id}}' 2>/dev/null)" = "$PREV_ID" ]; then
        ROLLBACK_REF="$PREV_REF"
    else
        ROLLBACK_REF="cads-tutor-lab:rollback-${PREV_ID#sha256:}"
        ROLLBACK_REF="${ROLLBACK_REF:0:40}"
        say "the previous reference $PREV_REF no longer resolves to the running image; pinning it as $ROLLBACK_REF"
        [ "$DRY_RUN" = 1 ] || docker tag "$PREV_ID" "$ROLLBACK_REF" >/dev/null \
            || warn "could not pin the running image - a rollback would have no target"
    fi
    if [ "$PREV_REF" = "$TARGET_REF" ]; then
        say "the target tag is already the one running - this run re-verifies it"
    fi
else
    say "no container named $CONTAINER exists: this is a first deployment"
    warn "there is no rollback target. If the new tag fails its checks, the lab stays down until you deploy a known-good tag by hand."
fi

# --- the workspace volume must not change silently ---------------------------
WANT_VOLUME="${TUTOR_LAB_VOLUME:-tutor-lab-workspace}"
if [ -n "$PREV_VOLUME" ] && [ "$PREV_VOLUME" != "$WANT_VOLUME" ]; then
    echo >&2
    echo "error: the running container uses the workspace volume" >&2
    echo "         $PREV_VOLUME" >&2
    echo "       but this compose file would use" >&2
    echo "         $WANT_VOLUME" >&2
    echo "       Starting anyway would give every student an empty, freshly seeded workspace" >&2
    echo "       while their work sits untouched in the old volume. Put the name that is in" >&2
    echo "       use into .env and run again:" >&2
    echo >&2
    echo "         TUTOR_LAB_VOLUME=$PREV_VOLUME" >&2
    echo >&2
    exit 1
fi
[ -n "$PREV_VOLUME" ] && say "workspace volume unchanged: $PREV_VOLUME"

# The compose project the running container belongs to. A different one makes
# compose treat the running container as a stranger and refuse the name.
if [ -n "$PREV_REF" ]; then
    PREV_PROJECT="$(docker inspect "$CONTAINER" \
        --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null)"
    WANT_PROJECT="${TUTOR_LAB_PROJECT:-cads-demo-tutor-lab}"
    if [ -n "$PREV_PROJECT" ] && [ "$PREV_PROJECT" != "$WANT_PROJECT" ]; then
        warn "the running container belongs to compose project \"$PREV_PROJECT\", this file uses \"$WANT_PROJECT\"."
        warn "compose will refuse the container name. Put this in .env and run again:"
        warn "    TUTOR_LAB_PROJECT=$PREV_PROJECT"
    fi
fi

say "target: $TARGET_REF"
if [ "$DRY_RUN" = 1 ]; then
    say "dry run: would pull $TARGET_REF, recreate $CONTAINER, then check ${URL}/healthz"
    say "dry run: rollback target would be ${ROLLBACK_REF:-<none>}"
    exit 0
fi

# --- health gate -------------------------------------------------------------
# Both sides: the container's own healthcheck, and the port as the tunnel sees
# it. A container that is healthy inside but unreachable on 127.0.0.1 is still
# a broken deployment.
wait_healthy() {
    local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_S )) status http
    while [ "$(date +%s)" -lt "$deadline" ]; do
        status="$(docker inspect "$CONTAINER" --format '{{.State.Status}}' 2>/dev/null)"
        if [ "$status" != "running" ]; then
            sleep 2; continue
        fi
        health="$(docker inspect "$CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
        if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
            http="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "$URL/healthz" 2>/dev/null)"
            [ "$http" = "200" ] && return 0
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

# --- deploy ------------------------------------------------------------------
export TUTOR_LAB_TAG="$TAG"
export TUTOR_LAB_IMAGE="$REPO"

say "docker compose pull ($TARGET_REF, about 0.8 GB on a first pull)"
if ! compose pull; then
    die "pull failed - nothing was changed, $([ -n "$PREV_REF" ] && echo "$PREV_REF is still running" || echo "the lab is still down")"
fi

say "docker compose up -d"
if ! compose up -d; then
    warn "compose up failed"
    UP_OK=0
else
    UP_OK=1
fi

DEPLOY_OK=0
if [ "$UP_OK" = 1 ]; then
    say "waiting for the lab to answer on $URL/healthz (up to ${HEALTH_TIMEOUT_S}s)"
    if wait_healthy; then
        say "healthy: $URL/healthz answers 200"
        DEPLOY_OK=1
    else
        warn "the container did not become healthy within ${HEALTH_TIMEOUT_S}s"
        report_failure
    fi
fi

if [ "$DEPLOY_OK" = 1 ] && [ "$SKIP_SMOKE" = 0 ] && [ -x "$HERE/smoke.sh" ]; then
    say "running the smoke test"
    if ! "$HERE/smoke.sh"; then
        warn "the smoke test failed"
        DEPLOY_OK=0
    fi
fi

# --- rollback ----------------------------------------------------------------
if [ "$DEPLOY_OK" = 1 ]; then
    echo
    say "deployed $TARGET_REF on $URL"
    say "entry links (publish these two, not the bare host):"
    docker inspect "$CONTAINER" --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>/dev/null \
        | grep '^cads\.tutor-lab\.entry\.' | sed 's/^cads.tutor-lab.entry./    /; s/=/: <host>/'
    exit 0
fi

echo >&2
if [ "$ROLLBACK" = 0 ]; then
    warn "--no-rollback: $TARGET_REF is left running (or stopped) for inspection."
    [ -n "$ROLLBACK_REF" ] && warn "roll back by hand with: ./deploy.sh --tag ${ROLLBACK_REF##*:}"
    exit 1
fi
if [ -z "$ROLLBACK_REF" ]; then
    die "$TARGET_REF failed its checks and there is no previous version to return to (nothing was running before). The lab is down; deploy a known-good tag."
fi

say "rolling back to $ROLLBACK_REF"
export TUTOR_LAB_IMAGE="${ROLLBACK_REF%:*}"
export TUTOR_LAB_TAG="${ROLLBACK_REF##*:}"
if ! compose up -d; then
    die "ROLLBACK FAILED to start $ROLLBACK_REF - the lab is down and needs hands"
fi
if wait_healthy; then
    say "rolled back: $ROLLBACK_REF is running and healthy on $URL"
    echo "error: $TARGET_REF was NOT deployed. The lab runs the previous version." >&2
    exit 1
fi
report_failure
die "ROLLBACK FAILED its health check - the lab is down and needs hands"

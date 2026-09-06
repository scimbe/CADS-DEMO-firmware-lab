#!/usr/bin/env bash
# CaDS Firmware Lab - smoke test for a deployed lab on the services host.
#
#   ./smoke.sh                    against the container from .env
#   ./smoke.sh --url http://127.0.0.1:8093 --container firmware-lab-local
#   ./smoke.sh --no-llm-call      check the model is configured, do not ask it
#
# What it proves, in the order a student meets it:
#   1. the container runs, is healthy, and still carries the image's own CMD
#      (arguments appended after the image name replace it and put the
#      workbench back into Restricted Mode with every extension off)
#   2. the front page is reachable and asks for the password - through the
#      tunnel as well, when FIRMWARE_LAB_PUBLIC_URL is set, because that is
#      the address a student actually types
#   3. the three CaDS extensions are installed: cads-tutor, cads-probe and
#      cads-board-bridge. The probe and the bridge are what make a board
#      usable; an image with only the tutor looks fine until a student tries
#      to flash
#   4. the tutor tree carries the firmware courses, and they belong to the
#      workspace folder that is actually seeded
#   5. the language model is configured AND answers. On this host the tutor
#      runs with a real model; without one it still teaches, but every
#      comprehension question falls back to self-assessment and the help
#      levels stay empty - quietly, which is how a class finds out.
#
# Exit 0 = every check passed. Every failure is reported, not just the first.

set -uo pipefail
# Every number in here is parsed and printed with a decimal point. In a
# comma locale awk reads "3.75" as 3, which silently under-estimates the
# disk a pull needs by a fifth; df and date get stable output too.
export LC_ALL=C

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

CONTAINER="${FIRMWARE_LAB_CONTAINER:-firmware-lab}"
PORT="${FIRMWARE_LAB_PORT:-8083}"
URL="http://127.0.0.1:${PORT}"
PUBLIC_URL="${FIRMWARE_LAB_PUBLIC_URL:-}"
PASSWORD="${FIRMWARE_LAB_PASSWORD:-}"
LLM_CALL=1
LLM_BUDGET_S="${TUTOR_LLM_BUDGET_S:-20}"

while [ $# -gt 0 ]; do
    case "$1" in
        --url) URL="$2"; shift 2 ;;
        --container) CONTAINER="$2"; shift 2 ;;
        --password) PASSWORD="$2"; shift 2 ;;
        --public-url) PUBLIC_URL="$2"; shift 2 ;;
        --no-llm-call) LLM_CALL=0; shift ;;
        -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

FAILED=0
ok()   { printf 'ok    - %s\n' "$*"; }
bad()  { printf 'FAIL  - %s\n' "$*" >&2; FAILED=$((FAILED + 1)); }
note() { printf 'note  - %s\n' "$*"; }

TMP="$(mktemp -d -t cads-firmware-smoke.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT
COOKIES="$TMP/cookies"
code() { curl -sS --max-time 30 -o /dev/null -w '%{http_code}' "$@" 2>/dev/null; }

echo "== CaDS Firmware Lab smoke test: $URL (container $CONTAINER)"

# --- 1. the container --------------------------------------------------------
state="$(docker inspect "$CONTAINER" --format '{{.State.Status}}' 2>/dev/null)"
if [ "$state" != "running" ]; then
    bad "container $CONTAINER is not running (state: ${state:-absent}) - nothing else can be checked"
    exit 1
fi
image="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}')"
ok "container runs, image $image"

HEALTH_WAIT_S="${FIRMWARE_LAB_HEALTH_WAIT_S:-180}"
health=""
for _ in $(seq 1 "$HEALTH_WAIT_S"); do
    health="$(docker inspect "$CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
    [ "$health" = "starting" ] || break
    sleep 1
done
case "$health" in
    healthy) ok "docker healthcheck: healthy" ;;
    none)    note "container has no healthcheck (started outside deploy.sh?)" ;;
    starting) bad "docker healthcheck still starting after ${HEALTH_WAIT_S}s" ;;
    *)       bad "docker healthcheck: $health" ;;
esac

cmd_container="$(docker inspect "$CONTAINER" --format '{{json .Config.Cmd}}')"
cmd_image="$(docker inspect "$image" --format '{{json .Config.Cmd}}' 2>/dev/null)"
if [ -z "$cmd_image" ]; then
    note "image $image is not present locally, cannot compare CMD"
elif [ "$cmd_container" = "$cmd_image" ]; then
    ok "container runs the image's own CMD (nothing appended after the image name)"
else
    bad "the container's command differs from the image's CMD - arguments were appended after the image name."
    bad "  image:     $cmd_image"
    bad "  container: $cmd_container"
fi
case "$cmd_container" in
    *--disable-workspace-trust*) ok "workspace trust is disabled (no Restricted Mode)" ;;
    *) bad "--disable-workspace-trust is missing from the command line - every extension will be off in Restricted Mode" ;;
esac

# --- 2. reachable, and asking for the password -------------------------------
c="$(code "$URL/healthz")"
[ "$c" = "200" ] && ok "GET /healthz -> 200" || bad "GET /healthz -> ${c:-no answer}"

c="$(code "$URL/")"
redirect="$(curl -sS --max-time 30 -o /dev/null -w '%{redirect_url}' "$URL/" 2>/dev/null)"
case "$c" in
    302) case "$redirect" in
             */login*) ok "GET / -> 302 to the login page (the password is enforced)" ;;
             *) bad "GET / -> 302 to $redirect, expected the login page" ;;
         esac ;;
    200) bad "GET / -> 200 without a login: PASSWORD is not set, the lab is open to anyone who reaches the port" ;;
    *)   bad "GET / -> ${c:-no answer}" ;;
esac

# The tunnel is what a student uses; the loopback port only proves the
# container. Checked when the public address is known.
if [ -n "$PUBLIC_URL" ]; then
    c="$(code "${PUBLIC_URL%/}/healthz")"
    if [ "$c" = "200" ]; then
        ok "the tunnel answers: GET ${PUBLIC_URL%/}/healthz -> 200"
    else
        bad "the tunnel does not answer: GET ${PUBLIC_URL%/}/healthz -> ${c:-no answer} (container is fine, the ct-agent tunnel is not)"
    fi
else
    note "FIRMWARE_LAB_PUBLIC_URL is not set - the tunnel itself was not checked, only the loopback port"
fi

# --- 3. the password, and the entry point ------------------------------------
ENTRY="$(docker inspect "$CONTAINER" \
    --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>/dev/null \
    | sed -n 's/^cads\.firmware-lab\.entry=//p' | head -1)"
[ -n "$ENTRY" ] || { ENTRY="/?folder=/home/coder/workspace/cads-zero"; note "no cads.firmware-lab.entry label, using the documented entry point"; }

if [ -z "$PASSWORD" ]; then
    bad "no password known (FIRMWARE_LAB_PASSWORD in .env or --password) - the lab cannot be checked as a student sees it"
else
    c="$(curl -sS --max-time 30 -c "$COOKIES" -o /dev/null -w '%{http_code}' -X POST \
         --data-urlencode "password=$PASSWORD" --data 'base=.' "$URL/login" 2>/dev/null)"
    if [ "$c" = "302" ] && grep -q 'code-server-session' "$COOKIES" 2>/dev/null; then
        ok "login with the configured password succeeds"
        c="$(code -b "$COOKIES" "$URL$ENTRY")"
        [ "$c" = "200" ] && ok "entry point -> 200 ($ENTRY)" || bad "entry point -> ${c:-no answer} ($ENTRY)"
    else
        bad "login failed (HTTP ${c:-no answer}, no session cookie) - FIRMWARE_LAB_PASSWORD does not match the running container"
    fi
fi

# --- 4. the three CaDS extensions --------------------------------------------
installed="$(docker exec "$CONTAINER" code-server --list-extensions --show-versions 2>/dev/null)"
for ext in cads.cads-tutor cads.cads-probe cads.cads-board-bridge; do
    if printf '%s\n' "$installed" | grep -qi "^$ext@"; then
        ok "CaDS extension installed: $(printf '%s\n' "$installed" | grep -i "^$ext@")"
    else
        bad "CaDS extension MISSING: $ext"
    fi
done
# The firmware toolchain the courses build with. Not CaDS, but a student hits
# these on the first step that compiles or debugs.
for ext in ms-vscode.cmake-tools marus25.cortex-debug llvm-vs-code-extensions.vscode-clangd; do
    printf '%s\n' "$installed" | grep -qi "^$ext@" \
        && ok "toolchain extension installed: $(printf '%s\n' "$installed" | grep -i "^$ext@")" \
        || bad "toolchain extension MISSING: $ext"
done

# --- 5. the firmware courses, and the folder they belong to ------------------
folder="${ENTRY##*folder=}"
read -r count ids <<<"$(docker exec -i "$CONTAINER" python3 - "$folder" <<'PY' 2>/dev/null
import json, os, posixpath, sys
folder = sys.argv[1].rstrip("/")
base = posixpath.basename(folder)
root = "/opt/cads-tutor/courses"
hits = []
for name in sorted(os.listdir(root)) if os.path.isdir(root) else []:
    manifest = os.path.join(root, name, "course.json")
    if not os.path.isfile(manifest):
        continue
    try:
        with open(manifest, encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        continue
    # Same rule as courseMatchesFolder() in extensions/cads-tutor/src/loader.ts.
    project_root = ((data.get("project") or {}).get("root") or "").strip("./").rstrip("/")
    if project_root and project_root != "." and (project_root == base or folder.endswith("/" + project_root)):
        hits.append(data.get("id") or name)
print(len(hits), ",".join(hits))
PY
)"
case "${count:-}" in
    "") bad "could not read the course packs in the container" ;;
    0)  bad "$folder: no course claims this folder - the tutor would show every pack it can find, or none" ;;
    *)  ok "$folder: $count firmware course(s) in the tutor tree ($ids)" ;;
esac
for want in cads-zero-foundations cads-zero-projects; do
    case ",${ids:-}," in
        *",$want,"*) ok "course pack present and bound to the workspace: $want" ;;
        *) bad "course pack missing or not bound to $folder: $want" ;;
    esac
done
if docker exec "$CONTAINER" test -d "$folder" 2>/dev/null; then
    ok "$folder: workspace seeded"
else
    bad "$folder: the workspace folder does not exist - the entry point opens an empty window"
fi

# --- 6. the language model, as the container has it --------------------------
# Read from the running container, not from .env: what matters is what the
# tutor was actually started with.
read -r LLM_BASE LLM_KEY LLM_MODEL <<<"$(docker inspect "$CONTAINER" --format \
    '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | awk -F= '
        $1=="TUTOR_LLM_BASE_URL" {b=$2} $1=="TUTOR_LLM_API_KEY" {k=$2} $1=="TUTOR_LLM_MODEL" {m=$2}
        END {printf "%s %s %s\n", (b==""?"-":b), (k==""?"-":k), (m==""?"-":m)}')"

missing=""
[ "$LLM_BASE" != "-" ]  || missing="$missing TUTOR_LLM_BASE_URL"
[ "$LLM_KEY" != "-" ]   || missing="$missing TUTOR_LLM_API_KEY"
[ "$LLM_MODEL" != "-" ] || missing="$missing TUTOR_LLM_MODEL"
if [ -n "$missing" ]; then
    bad "the tutor runs WITHOUT a language model - not set in the container:$missing"
    bad "  every comprehension question falls back to self-assessment and the help levels stay empty"
else
    ok "language model configured in the container: $LLM_MODEL at $LLM_BASE"
    case "$LLM_BASE" in
        https://*) ok "TUTOR_LLM_BASE_URL is https:// (LlmClient refuses anything else)" ;;
        *) bad "TUTOR_LLM_BASE_URL is \"$LLM_BASE\", not https:// - LlmClient throws in its constructor and the ask path is dead" ;;
    esac

    if [ "$LLM_CALL" = 0 ]; then
        note "--no-llm-call: the endpoint was not asked whether it answers"
    else
        base="${LLM_BASE%/}"
        t0=$(date +%s)
        mc="$(curl -sS --max-time 30 -o "$TMP/models.json" -w '%{http_code}' \
              -H "Authorization: Bearer $LLM_KEY" "$base/models" 2>/dev/null)"
        case "$mc" in
            200)
                if python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
items=d.get("data") if isinstance(d,dict) else d
ids=[m.get("id") if isinstance(m,dict) else m for m in (items or [])]
sys.exit(0 if sys.argv[2] in ids else 1)' "$TMP/models.json" "$LLM_MODEL" 2>/dev/null; then
                    ok "the endpoint offers the configured model \"$LLM_MODEL\""
                else
                    bad "the endpoint answers, but does not offer \"$LLM_MODEL\" - the tutor's questions will error out"
                fi
                printf '{"model":%s,"messages":[{"role":"user","content":"Antworte mit genau einem Wort: OK"}],"max_tokens":16,"temperature":0,"stream":false}' \
                    "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$LLM_MODEL")" > "$TMP/req.json"
                t0=$(date +%s)
                cc="$(curl -sS --max-time 90 -o "$TMP/chat.json" -w '%{http_code} %{time_total}' \
                      -H "Authorization: Bearer $LLM_KEY" -H "Content-Type: application/json" \
                      --data-binary @"$TMP/req.json" "$base/chat/completions" 2>/dev/null)"
                set -- $cc
                if [ "${1:-}" = "200" ]; then
                    answer="$(python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
c=(d.get("choices") or [{}])[0]
print(" ".join(str((c.get("message") or {}).get("content") or c.get("text") or "").split())[:80])' "$TMP/chat.json" 2>/dev/null)"
                    if [ -n "$answer" ]; then
                        ok "the tutor's model answers: \"$answer\" in ${2:-?}s"
                        awk -v t="${2:-0}" -v b="$LLM_BUDGET_S" 'BEGIN{exit !(t>b)}' \
                            && note "${2}s is over the ${LLM_BUDGET_S}s budget - a class will feel that on every hint"
                    else
                        bad "the model answered 200 but with no content"
                    fi
                else
                    bad "POST /chat/completions -> ${1:-no answer}: the tutor's ask path will fail for students"
                fi ;;
            401|403) bad "the endpoint rejects the key the container was started with (HTTP $mc)" ;;
            000|"")  bad "the container's language model endpoint is not reachable from this host ($base)" ;;
            *)       bad "GET $base/models -> $mc" ;;
        esac
    fi
fi

echo
if [ -f "$HERE/../../e2e/image-smoke.mjs" ]; then
    note "the rendered workbench (tutor panel, task list, CaDS: Build, terminal) is checked by:"
    note "  CADS_LAB_URL=$URL CADS_LAB_PASSWORD=... node e2e/image-smoke.mjs"
fi
if [ "$FAILED" -eq 0 ]; then
    echo "PASS: firmware-lab smoke test"
    exit 0
fi
echo "FAIL: $FAILED check(s) failed" >&2
exit 1

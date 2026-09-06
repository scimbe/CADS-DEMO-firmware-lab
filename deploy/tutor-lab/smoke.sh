#!/usr/bin/env bash
# CaDS Tutor Lab - smoke test for a running deployment.
#
#   ./smoke.sh                 against the container from compose.yml / .env
#   ./smoke.sh --url http://127.0.0.1:8094 --container tutor-lab-local
#
# What it proves, in the order a student meets it:
#   1. the container runs, is healthy, and still carries the image's own CMD
#      (an overriding `command:` in compose is what switched every extension
#      off in Restricted Mode the first time round)
#   2. the front page is reachable and asks for the password
#   3. the password works
#   4. both published entry links answer 200 for a logged-in student - the
#      links are read from the container's labels, so this checks what is
#      published rather than a copy of it
#   5. the CaDS extensions are installed
#   6. each entry link shows exactly one course
#
# On (6): the tutor filters its course tree by the opened workspace folder -
# a course is shown when its `project.root` matches the folder (see
# `courseMatchesFolder` in extensions/cads-tutor/src/loader.ts), and when
# nothing matches it falls back to showing ALL courses. So the tree for a link
# holds exactly one course precisely when exactly one pack in the image claims
# that folder, which is what is asserted here, together with the filter being
# present in the installed extension at all. That is a check of the data and
# the code that drive the tree, not of the rendered tree: the rendered tree
# needs a browser and lives in e2e/tutor-lab-smoke.mjs (section 6), which this
# script points at when it is available.
#
# Exit code 0 = every check passed. Every failure is reported, not just the
# first one, so one broken thing does not hide the rest.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

CONTAINER="${TUTOR_LAB_CONTAINER:-tutor-lab}"
PORT="${TUTOR_LAB_PORT:-8084}"
URL="http://127.0.0.1:${PORT}"
PASSWORD="${TUTOR_LAB_PASSWORD:-}"

while [ $# -gt 0 ]; do
    case "$1" in
        --url) URL="$2"; shift 2 ;;
        --container) CONTAINER="$2"; shift 2 ;;
        --password) PASSWORD="$2"; shift 2 ;;
        -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

FAILED=0
ok()   { printf 'ok    - %s\n' "$*"; }
bad()  { printf 'FAIL  - %s\n' "$*" >&2; FAILED=$((FAILED + 1)); }
note() { printf 'note  - %s\n' "$*"; }

COOKIES="$(mktemp -t cads-tutor-lab-smoke.XXXXXX)"
trap 'rm -f "$COOKIES"' EXIT

code() { curl -sS --max-time 30 -o /dev/null -w '%{http_code}' "$@" 2>/dev/null; }

echo "== CaDS Tutor Lab smoke test: $URL (container $CONTAINER)"

# --- 1. the container itself -------------------------------------------------
state="$(docker inspect "$CONTAINER" --format '{{.State.Status}}' 2>/dev/null)"
if [ "$state" != "running" ]; then
    bad "container $CONTAINER is not running (state: ${state:-absent}) - nothing else can be checked"
    exit 1
fi
image="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}')"
ok "container runs, image $image"

# "starting" is the normal state for the first minute after a restart, so wait
# it out rather than reporting a healthy lab as broken.
HEALTH_WAIT_S="${TUTOR_LAB_HEALTH_WAIT_S:-150}"
health=""
for _ in $(seq 1 "$HEALTH_WAIT_S"); do
    health="$(docker inspect "$CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
    [ "$health" = "starting" ] || break
    sleep 1
done
case "$health" in
    healthy) ok "docker healthcheck: healthy" ;;
    none)    note "container has no healthcheck (started outside compose.yml?)" ;;
    starting) bad "docker healthcheck still starting after ${HEALTH_WAIT_S}s" ;;
    *)       bad "docker healthcheck: $health" ;;
esac

# The image's CMD carries the operating flags. compose's `command:` replaces it,
# and the replacement reinstates workspace trust - every extension, the tutor
# included, is then off in Restricted Mode.
cmd_container="$(docker inspect "$CONTAINER" --format '{{json .Config.Cmd}}')"
cmd_image="$(docker inspect "$image" --format '{{json .Config.Cmd}}' 2>/dev/null)"
if [ -z "$cmd_image" ]; then
    note "image $image is not present locally, cannot compare CMD"
elif [ "$cmd_container" = "$cmd_image" ]; then
    ok "container runs the image's own CMD (no overriding command:)"
else
    bad "the container's command differs from the image's CMD - a \`command:\` line is overriding it."
    bad "  image:     $cmd_image"
    bad "  container: $cmd_container"
fi

case "$cmd_container" in
    *--disable-workspace-trust*) ok "workspace trust is disabled (no Restricted Mode)" ;;
    *) bad "--disable-workspace-trust is missing from the command line - extensions will be off in Restricted Mode" ;;
esac

# --- 2. the front page -------------------------------------------------------
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

# --- 3. the password ---------------------------------------------------------
if [ -z "$PASSWORD" ]; then
    bad "no password known (TUTOR_LAB_PASSWORD in .env or --password) - the entry links cannot be checked as a student sees them"
else
    c="$(curl -sS --max-time 30 -c "$COOKIES" -o /dev/null -w '%{http_code}' -X POST \
         --data-urlencode "password=$PASSWORD" --data 'base=.' "$URL/login" 2>/dev/null)"
    if [ "$c" = "302" ] && grep -q 'code-server-session' "$COOKIES" 2>/dev/null; then
        ok "login with the configured password succeeds"
    else
        bad "login failed (HTTP ${c:-no answer}, no session cookie) - TUTOR_LAB_PASSWORD does not match the running container"
    fi
fi

# --- 4. the two entry links --------------------------------------------------
# Read them from the container's labels: the links that are published are the
# ones that must work.
links="$(docker inspect "$CONTAINER" \
    --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>/dev/null \
    | grep '^cads\.tutor-lab\.entry\.' || true)"
if [ -z "$links" ]; then
    bad "the container carries no cads.tutor-lab.entry.* labels - compose.yml is not the one from this directory, so the published links are unknown"
    links=$'cads.tutor-lab.entry.rust=/?folder=/home/coder/workspace/rust-foundations\ncads.tutor-lab.entry.javascript=/?folder=/home/coder/workspace/javascript-foundations'
    note "falling back to the two documented links"
fi

FOLDERS=""
while IFS= read -r line; do
    label="${line%%=*}"; path="${line#*=}"
    track="${label##*.}"
    folder="${path##*folder=}"
    FOLDERS="$FOLDERS $folder"
    if [ -n "$PASSWORD" ]; then
        c="$(code -b "$COOKIES" "$URL$path")"
        [ "$c" = "200" ] && ok "entry link $track -> 200 ($path)" || bad "entry link $track -> ${c:-no answer} ($path)"
    fi
done <<< "$links"

n_links="$(printf '%s\n' $FOLDERS | grep -c . || true)"
[ "$n_links" = "2" ] && ok "two entry links published, one per track" \
                     || bad "expected two entry links, found $n_links"

# --- 5. the extensions -------------------------------------------------------
installed="$(docker exec "$CONTAINER" code-server --list-extensions --show-versions 2>/dev/null)"
for ext in cads.cads-tutor rust-lang.rust-analyzer dbaeumer.vscode-eslint tamasfe.even-better-toml vadimcn.vscode-lldb; do
    if printf '%s\n' "$installed" | grep -qi "^$ext@"; then
        ok "extension installed: $(printf '%s\n' "$installed" | grep -i "^$ext@")"
    else
        bad "extension MISSING: $ext"
    fi
done

# The tutor is only useful with its course packs; an image without them shows
# "No course packs found" and every check below would be vacuous.
packs="$(docker exec "$CONTAINER" bash -lc 'ls /opt/cads-tutor/courses 2>/dev/null' | grep . || true)"
if [ -z "$packs" ]; then
    bad "/opt/cads-tutor/courses is empty - the tutor will report \"No course packs found\""
else
    ok "course packs in the image: $(printf '%s' "$packs" | tr '\n' ' ')"
fi

# --- 6. exactly one course per entry link ------------------------------------
# The filter itself has to be in the installed extension: an older VSIX loads
# every course into every window, and then the count below would be right about
# the packs and wrong about what the student sees.
if docker exec "$CONTAINER" bash -lc \
     'grep -ql showAllCourses ~/.local/share/code-server/extensions/cads.cads-tutor-*/dist/extension.js' 2>/dev/null; then
    ok "the installed cads-tutor filters courses by the opened folder"
else
    bad "the installed cads-tutor has no per-folder course filter (VSIX too old) - every link will show both courses"
fi

for folder in $FOLDERS; do
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
    # Same rule as courseMatchesFolder() in the extension.
    project_root = ((data.get("project") or {}).get("root") or "").strip("./").rstrip("/")
    if project_root and project_root != "." and (project_root == base or folder.endswith("/" + project_root)):
        hits.append(data.get("id") or name)
print(len(hits), ",".join(hits))
PY
)"
    case "${count:-}" in
        1) ok "$folder: exactly one course in the tutor tree ($ids)" ;;
        0) bad "$folder: no course claims this folder - the tutor falls back to showing ALL courses here" ;;
        "") bad "$folder: could not read the course packs in the container" ;;
        *) bad "$folder: $count courses claim this folder ($ids) - the link would show more than its own" ;;
    esac

    if docker exec "$CONTAINER" test -d "$folder" 2>/dev/null; then
        if docker exec "$CONTAINER" test -f "$folder/PLACEHOLDER.md" 2>/dev/null; then
            bad "$folder: the seeded workspace is the PLACEHOLDER, not the real starter"
        else
            ok "$folder: starter workspace present"
        fi
    else
        bad "$folder: the workspace folder does not exist - the link opens an empty window"
    fi
done

# --- summary -----------------------------------------------------------------
echo
if [ -f "$HERE/../../e2e/tutor-lab-smoke.mjs" ]; then
    note "the rendered workbench (course tree, Explorer roots, terminal, test runners) is checked by:"
    note "  CADS_LAB_URL=$URL CADS_LAB_CONTAINER=$CONTAINER CADS_LAB_PASSWORD=... node e2e/tutor-lab-smoke.mjs"
fi
if [ "$FAILED" -eq 0 ]; then
    echo "PASS: tutor-lab smoke test"
    exit 0
fi
echo "FAIL: $FAILED check(s) failed" >&2
exit 1

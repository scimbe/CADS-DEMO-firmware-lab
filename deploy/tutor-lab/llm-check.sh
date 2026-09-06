#!/usr/bin/env bash
# CaDS Tutor Lab - does the configured language model actually carry the tutor?
#
#   ./llm-check.sh                                    values from .env
#   ./llm-check.sh --base https://llm2.../v1 --model local-devstral-small2
#   TUTOR_LLM_API_KEY=sk-... ./llm-check.sh
#
# Four questions, in the order they can go wrong:
#   1. is the base URL https:// - @cads/tutor-platform's LlmClient throws
#      `LlmClient baseUrl must be https://` on anything else, and then the
#      tutor's ask path is dead while everything else looks fine
#   2. does the key open GET /models
#   3. is the model the tutor is configured with actually offered
#   4. does a minimal completion come back, and how long does a student wait
#
# The key is never printed, never written anywhere, and only ever read from the
# environment or .env - which is gitignored.
#
# Exit 0 = the tutor's ask path will work with these values.

set -uo pipefail

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

BASE="${TUTOR_LLM_BASE_URL:-}"
KEY="${TUTOR_LLM_API_KEY:-}"
MODEL="${TUTOR_LLM_MODEL:-}"
# A tutor answer a student waits longer than this for is not a tutor answer.
BUDGET_S="${TUTOR_LLM_BUDGET_S:-20}"
TIMEOUT_S="${TUTOR_LLM_TIMEOUT_S:-90}"

while [ $# -gt 0 ]; do
    case "$1" in
        --base) BASE="$2"; shift 2 ;;
        --key) KEY="$2"; shift 2 ;;
        --model) MODEL="$2"; shift 2 ;;
        --budget) BUDGET_S="$2"; shift 2 ;;
        -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

FAILED=0
ok()   { printf 'ok    - %s\n' "$*"; }
bad()  { printf 'FAIL  - %s\n' "$*" >&2; FAILED=$((FAILED + 1)); }
warn() { printf 'warn  - %s\n' "$*"; }

command -v python3 >/dev/null 2>&1 || { echo "error: python3 is required to read the answers" >&2; exit 2; }

mask() { case "${#1}" in 0) echo "(empty)" ;; *) printf '%s…(%d chars)' "${1:0:6}" "${#1}" ;; esac; }

BASE="${BASE%/}"
echo "== CaDS Tutor Lab - language model check"
echo ">> endpoint: ${BASE:-(unset)}"
echo ">> model:    ${MODEL:-(unset)}"
echo ">> key:      $(mask "$KEY")"
echo

# --- 1. all three, and https -------------------------------------------------
missing=""
[ -n "$BASE" ]  || missing="$missing TUTOR_LLM_BASE_URL"
[ -n "$KEY" ]   || missing="$missing TUTOR_LLM_API_KEY"
[ -n "$MODEL" ] || missing="$missing TUTOR_LLM_MODEL"
if [ -n "$missing" ]; then
    bad "not set:$missing - all three are needed together, or the tutor reports itself unconfigured"
    echo "FAIL: $FAILED check(s) failed" >&2
    exit 1
fi
ok "all three TUTOR_LLM_* values are set"

case "$BASE" in
    https://*) ok "base URL is https://" ;;
    *) bad "base URL is not https:// - LlmClient refuses it in its constructor and the tutor's ask path stays dead"
       echo "FAIL: $FAILED check(s) failed" >&2
       exit 1 ;;
esac

TMP="$(mktemp -d -t cads-llm-check.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT
TIMEFMT='%{http_code} %{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer} %{time_total}'

# --- 2. the key opens the model list -----------------------------------------
read -r code t_dns t_conn t_tls t_first t_total <<<"$(
    curl -sS --max-time "$TIMEOUT_S" -o "$TMP/models.json" -w "$TIMEFMT" \
        -H "Authorization: Bearer $KEY" "$BASE/models" 2>"$TMP/models.err")"

if [ -z "${code:-}" ]; then
    bad "GET $BASE/models did not answer: $(head -1 "$TMP/models.err" 2>/dev/null)"
    echo "FAIL: $FAILED check(s) failed" >&2
    exit 1
fi
case "$code" in
    200) ok "GET /models -> 200 in ${t_total}s (dns ${t_dns}s, tcp ${t_conn}s, tls ${t_tls}s)" ;;
    401|403) bad "GET /models -> $code: the key is rejected by this endpoint"
             echo "FAIL: $FAILED check(s) failed" >&2; exit 1 ;;
    404) bad "GET /models -> 404: $BASE is probably not the API root (it usually ends in /v1)"
         echo "FAIL: $FAILED check(s) failed" >&2; exit 1 ;;
    000) bad "could not reach $BASE: $(head -1 "$TMP/models.err" 2>/dev/null)"
         echo "FAIL: $FAILED check(s) failed" >&2; exit 1 ;;
    *)   bad "GET /models -> $code"; echo "FAIL: $FAILED check(s) failed" >&2; exit 1 ;;
esac

# --- 3. is the configured model offered --------------------------------------
models="$(python3 - "$TMP/models.json" <<'PY'
import json, sys
try:
    with open(sys.argv[1], encoding="utf-8") as fh:
        data = json.load(fh)
except Exception as err:
    print("!parse", err)
    raise SystemExit
items = data.get("data") if isinstance(data, dict) else data
if not isinstance(items, list):
    print("!parse", "no model list in the answer")
    raise SystemExit
for m in items:
    print(m.get("id") if isinstance(m, dict) else m)
PY
)"
case "$models" in
    "!parse"*) bad "could not read the model list (${models#!parse }) - is $BASE an OpenAI-compatible API?" ;;
    "") bad "the endpoint offers no models at all" ;;
    *)
        count="$(printf '%s\n' "$models" | grep -c .)"
        if printf '%s\n' "$models" | grep -qxF "$MODEL"; then
            ok "the configured model \"$MODEL\" is one of the $count offered"
        else
            bad "the configured model \"$MODEL\" is NOT offered. Available: $(printf '%s' "$models" | tr '\n' ' ')"
        fi ;;
esac

# --- 4. one real answer, and how long a student waits ------------------------
cat > "$TMP/req.json" <<JSON
{"model": $(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$MODEL"),
 "messages": [{"role": "user", "content": "Antworte mit genau einem Wort: OK"}],
 "max_tokens": 16, "temperature": 0, "stream": false}
JSON

read -r code t_dns t_conn t_tls t_first t_total <<<"$(
    curl -sS --max-time "$TIMEOUT_S" -o "$TMP/chat.json" -w "$TIMEFMT" \
        -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
        --data-binary @"$TMP/req.json" "$BASE/chat/completions" 2>"$TMP/chat.err")"

if [ "${code:-000}" != "200" ]; then
    bad "POST /chat/completions -> ${code:-no answer}: $(head -c 300 "$TMP/chat.json" 2>/dev/null || head -1 "$TMP/chat.err")"
else
    answer="$(python3 - "$TMP/chat.json" <<'PY'
import json, sys
try:
    with open(sys.argv[1], encoding="utf-8") as fh:
        data = json.load(fh)
    choice = (data.get("choices") or [{}])[0]
    text = (choice.get("message") or {}).get("content") or choice.get("text") or ""
except Exception as err:
    text = ""
    print("!parse", err, file=sys.stderr)
print(" ".join(str(text).split())[:120])
PY
)"
    if [ -n "$answer" ]; then
        ok "POST /chat/completions -> 200 in ${t_total}s, answer: \"$answer\""
    else
        bad "POST /chat/completions -> 200 but the answer carried no content"
    fi
    printf '        tls %ss | first byte %ss | total %ss\n' "$t_tls" "$t_first" "$t_total"
    over="$(python3 -c 'import sys; print(1 if float(sys.argv[1]) > float(sys.argv[2]) else 0)' "$t_total" "$BUDGET_S" 2>/dev/null || echo 0)"
    if [ "$over" = "1" ]; then
        warn "${t_total}s for sixteen tokens is over the ${BUDGET_S}s budget - a class will feel that on every hint"
    fi
fi

echo
if [ "$FAILED" -eq 0 ]; then
    echo "PASS: the tutor's ask path will work with these values"
    exit 0
fi
echo "FAIL: $FAILED check(s) failed" >&2
exit 1

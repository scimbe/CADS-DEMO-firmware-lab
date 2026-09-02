#!/usr/bin/env bash
# Integration test for fl-broker against a REAL local Docker daemon.
#
# Starts the broker on 127.0.0.1:3100 with a throw-away image (default
# codercom/code-server:latest, the CaDS image is still being built), then:
#   1. enter without identity            -> 403
#   2. enter as a@b.c                    -> 302 to /s/<slug>/?folder=...  (container created)
#   3. resolve own slug                  -> 200 + X-FL-Upstream, upstream answers /healthz
#   4. resolve foreign slug              -> 403
#   5. admin list (allow-listed)         -> JSON with the session, status running
#   6. admin stop, enter again           -> container restarted (same volume)
#   7. admin wipe                        -> container + volume gone
# Everything it creates carries the label cads.firmware-lab=1 and is removed at the end.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export FL_IMAGE="${FL_IMAGE:-codercom/code-server:latest}"
export FL_PORT="${FL_PORT:-3100}"
export FL_ADMIN_EMAILS="${FL_ADMIN_EMAILS:-admin@example.test}"
export FL_MEM="${FL_MEM:-1g}"
export FL_CPUS="${FL_CPUS:-1}"
export FL_RESOLVE_CACHE_S=0
LOG="${IT_LOG:-${TMPDIR:-/tmp}/fl-broker-it.log}"
BASE="http://127.0.0.1:${FL_PORT}"
USER1="a@b.c"
USER2="second@example.test"

pass() { printf '  ok   %s\n' "$*"; }
fail() { printf '  FAIL %s\n' "$*" >&2; exit 1; }

cleanup() {
  set +e
  if [[ -n "${BROKER_PID:-}" ]]; then kill "$BROKER_PID" 2>/dev/null; wait "$BROKER_PID" 2>/dev/null; fi
  ids=$(docker ps -aq --filter label=cads.firmware-lab=1)
  [[ -n "$ids" ]] && docker rm -f $ids >/dev/null 2>&1
  vols=$(docker volume ls -q --filter name='^fl-ws-')
  [[ -n "$vols" ]] && docker volume rm $vols >/dev/null 2>&1
  echo "cleanup done (broker log: $LOG)"
}
trap cleanup EXIT

if lsof -nP -iTCP:"$FL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  fail "port $FL_PORT already in use"
fi
docker image inspect "$FL_IMAGE" >/dev/null 2>&1 || docker pull "$FL_IMAGE"

echo "== starting broker (image $FL_IMAGE)"
python3 "$HERE/fl_broker.py" 2>"$LOG" &
BROKER_PID=$!
for _ in $(seq 1 30); do
  curl -sf "$BASE/_broker/healthz" >/dev/null 2>&1 && break
  sleep 0.2
done
curl -sf "$BASE/_broker/healthz" >/dev/null || fail "broker did not start (see $LOG)"
pass "broker healthz"

echo "== 1. enter without identity"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/_broker/enter")
[[ "$code" == "403" ]] || fail "expected 403, got $code"
pass "403 without X-Gate-Email"

echo "== 2. enter as $USER1 (creates container, waits for /healthz)"
hdr=$(curl -s -i -H "X-Gate-Email: $USER1" "$BASE/_broker/enter")
echo "$hdr" | sed 's/^/     /' | head -6
code=$(echo "$hdr" | head -1 | awk '{print $2}')
[[ "$code" == "302" ]] || fail "expected 302, got $code"
loc=$(echo "$hdr" | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}')
slug=$(python3 -c "import hashlib,sys;print(hashlib.sha256(sys.argv[1].lower().encode()).hexdigest()[:12])" "$USER1")
[[ "$loc" == "/s/$slug/?folder=/home/coder/workspace/cads-zero" ]] || fail "unexpected Location: $loc"
pass "302 -> $loc"
docker ps --filter "name=fl-$slug" --format '     container {{.Names}} {{.Status}} {{.Ports}} labels={{.Labels}}'
docker ps -q --filter "name=fl-$slug" --filter status=running | grep -q . || fail "container fl-$slug not running"
docker inspect "fl-$slug" --format '{{json .HostConfig.Memory}} {{json .HostConfig.NanoCpus}} {{json .HostConfig.PidsLimit}}' \
  | sed 's/^/     limits (Memory NanoCpus PidsLimit): /'
docker inspect "fl-$slug" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -q '^TUTOR_LLM_' && echo "     TUTOR_LLM_* injected" || echo "     (no TUTOR_LLM_* in env - none set in this shell)"
docker inspect "fl-$slug" --format '{{json .Config.Labels}}' | grep -q '@' && fail "an e-mail leaked into labels" || pass "no e-mail in labels"

echo "== 3. resolve own slug"
hdr=$(curl -s -i -H "X-Gate-Email: $USER1" "$BASE/_broker/resolve?slug=$slug")
code=$(echo "$hdr" | head -1 | awk '{print $2}')
[[ "$code" == "200" ]] || fail "expected 200, got $code"
up=$(echo "$hdr" | tr -d '\r' | awk 'tolower($1)=="x-fl-upstream:"{print $2}')
[[ -n "$up" ]] || fail "X-FL-Upstream missing"
curl -sf "http://$up/healthz" >/dev/null || fail "upstream $up does not answer /healthz"
pass "200, X-FL-Upstream=$up answers /healthz: $(curl -s "http://$up/healthz")"

echo "== 4. resolve with a foreign identity"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Gate-Email: $USER2" "$BASE/_broker/resolve?slug=$slug")
[[ "$code" == "403" ]] || fail "expected 403, got $code"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/_broker/resolve?slug=$slug")
[[ "$code" == "403" ]] || fail "expected 403 without identity, got $code"
pass "403 for foreign / missing identity"

echo "== 5. admin list"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Gate-Email: $USER1" "$BASE/_broker/admin")
[[ "$code" == "403" ]] || fail "non-admin got $code"
json=$(curl -sf -H "X-Gate-Email: admin@example.test" "$BASE/_broker/admin")
echo "$json" | python3 -c "
import json,sys; d=json.load(sys.stdin); s=[x for x in d['sessions'] if x['slug']=='$slug']
assert s and s[0]['status']=='running' and s[0]['port'], d
assert '@' not in json.dumps(d)
print('     ' + json.dumps(s[0]))"
pass "admin JSON lists the session"

echo "== 6. admin stop, then enter restarts the same container"
curl -sf -X POST -H "X-Gate-Email: admin@example.test" "$BASE/_broker/admin/stop?slug=$slug" >/dev/null
docker ps -q --filter "name=fl-$slug" --filter status=running | grep -q . && fail "still running after stop"
pass "stopped"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Gate-Email: $USER1" "$BASE/_broker/enter")
[[ "$code" == "302" ]] || fail "re-enter expected 302, got $code"
docker ps -q --filter "name=fl-$slug" --filter status=running | grep -q . || fail "not running after re-enter"
[[ $(docker ps -aq --filter label=cads.slug="$slug" | wc -l) -eq 1 ]] || fail "duplicate containers"
pass "re-enter started the existing container"

echo "== 7. admin wipe"
curl -sf -X POST -H "X-Gate-Email: admin@example.test" "$BASE/_broker/admin/wipe?slug=$slug" >/dev/null
docker ps -aq --filter label=cads.slug="$slug" | grep -q . && fail "container survived wipe"
docker volume ls -q --filter name="^fl-ws-$slug\$" | grep -q . && fail "volume survived wipe"
pass "container and volume removed"

echo "== broker log excerpt (no e-mail addresses expected):"
grep -q '@' "$LOG" && fail "e-mail address found in broker log"
tail -n 12 "$LOG" | sed 's/^/     /'
echo "ALL OK"

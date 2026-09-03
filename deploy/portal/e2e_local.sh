#!/usr/bin/env bash
# End-to-end run for the teacher portal against a REAL local portal process.
#
# Starts fl-portal on 127.0.0.1:3200 with a throw-away database, then:
#   1. healthz before any data              -> ok, zero events
#   2. simulator feeds three cohorts        -> everything accepted, nothing rejected
#      and scores the flags against the personas that produced them
#   3. every view for a teacher             -> 200 text/html
#   4. course isolation                     -> foreign course 403, own course 200, admin both 200
#   5. no identity / unknown e-mail         -> 403
#   6. deep dive for a flagged student      -> 200 with reasons, counter-hypotheses and advice
#   7. CSV and JSON export                  -> 200, one row per student
#   8. sign-off round trip                  -> 303, appears in the export with teacher and timestamp
#   9. cross-course sign-off                -> 403, nothing written
#  10. erasure                              -> teacher 403, admin removes every event of one pseudonym
#  11. English UI                           -> 200 and actually English
# Everything it creates lives under one temporary directory and is removed at the end.
#
# Screenshots are NOT taken here (that needs a browser); see README.md.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
PORT="${FL_PORTAL_PORT:-3200}"
BASE="http://127.0.0.1:${PORT}"
TOKEN="${FL_PORTAL_TOKEN:-e2e-token-not-a-secret}"
STUDENTS="${E2E_STUDENTS:-40}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/fl-portal-e2e.XXXXXX")"
TEACHER_A="anna.lehrende@hs.example"
TEACHER_B="bernd.lehrender@hs.example"
ADMIN="admin@hs.example"
COURSE_A="cads-zero-foundations"
COURSE_B="rust-foundations"

pass() { printf '  ok   %s\n' "$*"; }
fail() { printf '  FAIL %s\n' "$*" >&2; exit 1; }
step() { printf '\n%s\n' "$*"; }

cleanup() {
  [[ -n "${PORTAL_PID:-}" ]] && kill "$PORTAL_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# status code of a request as a given identity
code() { curl -sS -o /dev/null -w '%{http_code}' -H "X-Gate-Email: ${1}" "$BASE${2}"; }
# Always buffer: piping curl into `grep -q` would close the pipe on the first match, and
# under `set -o pipefail` curl's resulting write error would fail the check spuriously.
body() { curl -sS -H "X-Gate-Email: ${1}" "$BASE${2}"; }
saveb() { curl -sS -o "$3" -H "X-Gate-Email: ${1}" "$BASE${2}"; }

step "0. configuration"
python3 "$HERE/simulate.py" --offline --students "$STUDENTS" --courses-dir "$REPO/courses" \
  --write-config "$WORK/portal.json" --write-roster "$WORK/roster.json" >"$WORK/gen.log" 2>&1 \
  || { cat "$WORK/gen.log"; fail "simulator could not generate the cohorts"; }
pass "portal.json and roster.json written"

step "1. start and healthz"
FL_PORTAL_DB="$WORK/portal.sqlite3" FL_PORTAL_CONFIG="$WORK/portal.json" \
FL_PORTAL_ROSTER="$WORK/roster.json" FL_PORTAL_TOKEN="$TOKEN" \
FL_PORTAL_COURSES="$REPO/courses" FL_PORTAL_PORT="$PORT" \
python3 "$HERE/portal.py" >"$WORK/portal.log" 2>&1 &
PORTAL_PID=$!
for _ in $(seq 1 40); do curl -sf "$BASE/healthz" >/dev/null 2>&1 && break; sleep 0.25; done
curl -sf "$BASE/healthz" -o "$WORK/health0.json" || { cat "$WORK/portal.log"; fail "portal did not answer"; }
grep -q '"events": 0' "$WORK/health0.json" || { cat "$WORK/portal.log"; fail "portal did not come up empty"; }
pass "portal listening on $BASE with an empty database"

step "2. feed the cohorts and score the flags"
python3 "$HERE/simulate.py" --token "$TOKEN" --url "$BASE" --students "$STUDENTS" \
  --courses-dir "$REPO/courses" --verify-ui --json-out "$WORK/score.json" | sed 's/^/  /' \
  || fail "the simulator missed a target (see the table above)"
python3 - "$WORK/score.json" <<'PY' || fail "score report says not ok"
import json, sys
r = json.load(open(sys.argv[1]))
assert r["ok"], r
PY
pass "all flag targets met, every follow-up pseudonym visible on the anomalies page"

step "3. every view answers for a teacher"
for view in "/portal/" "/portal/questions" "/portal/steps" "/portal/anomalies" \
            "/portal/students" "/portal/board" "/portal/rules"; do
  c="$(code "$TEACHER_A" "$view")"
  [[ "$c" == 200 ]] || fail "$view -> $c"
done
pass "overview, questions, steps, anomalies, students, board, rules"

step "4. course isolation"
[[ "$(code "$TEACHER_A" "/portal/students?c=$COURSE_B")" == 403 ]] || fail "teacher reached a foreign course"
[[ "$(code "$TEACHER_B" "/portal/students?c=$COURSE_B")" == 200 ]] || fail "teacher cannot reach the own course"
[[ "$(code "$ADMIN" "/portal/students?c=$COURSE_A")" == 200 ]] || fail "admin blocked from course A"
[[ "$(code "$ADMIN" "/portal/students?c=$COURSE_B")" == 200 ]] || fail "admin blocked from course B"
pass "teachers see only their own course, admin sees both"

step "5. identity is required"
[[ "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/portal/")" == 403 ]] || fail "no identity was let in"
[[ "$(code "eve.attacker@hs.example" "/portal/")" == 403 ]] || fail "unknown e-mail was let in"
pass "no identity and unknown e-mail both rejected"

step "6. deep dive for a flagged student"
saveb "$TEACHER_A" "/portal/anomalies?c=$COURSE_A" "$WORK/anomalies.html"
SLUG="$(grep -o 's=[a-f0-9]\{12\}' "$WORK/anomalies.html" | head -1 | sed 's/s=//')"
[[ -n "$SLUG" ]] || fail "no flagged student on the anomalies page"
saveb "$TEACHER_A" "/portal/student?c=$COURSE_A&s=$SLUG" "$WORK/deep.html"
for marker in "Empfehlung" "Mastery je Lernziel" "Bloom-Abdeckung" "Zeitstrahl" "Belege" "counter"; do
  grep -q "$marker" "$WORK/deep.html" || fail "deep dive is missing: $marker"
done
if grep -q "Betrug" "$WORK/deep.html"; then fail "the interface calls it cheating"; fi
pass "deep dive for $SLUG has reasons, counter-hypotheses, evidence, mastery, Bloom and advice"

step "7. exports"
saveb "$TEACHER_A" "/portal/board?c=$COURSE_A&export=csv" "$WORK/board.csv"
head -1 "$WORK/board.csv" | grep -E '^course,student,steps_done' >/dev/null || fail "CSV header wrong"
[[ "$(wc -l <"$WORK/board.csv")" -eq $((STUDENTS + 1)) ]] || fail "CSV row count wrong"
saveb "$TEACHER_A" "/portal/board?c=$COURSE_A&export=json" "$WORK/board.json"
python3 -c "
import json; d=json.load(open('$WORK/board.json'))
assert len(d['rows']) == $STUDENTS, len(d['rows'])" || fail "JSON export row count wrong"
pass "CSV and JSON export one row per student"

step "8. sign-off round trip"
SO="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H "X-Gate-Email: $TEACHER_A" \
      --data-urlencode "c=$COURSE_A" --data-urlencode "s=$SLUG" --data-urlencode "status=confirmed" \
      --data-urlencode "note=Im Gespraech geklaert" "$BASE/portal/board/signoff")"
[[ "$SO" == 303 ]] || fail "sign-off -> $SO"
saveb "$TEACHER_A" "/portal/board?c=$COURSE_A&export=csv" "$WORK/board2.csv"
grep -E "^[^,]+,$SLUG,.*confirmed.*$TEACHER_A" "$WORK/board2.csv" >/dev/null \
  || fail "sign-off not in the export"
pass "sign-off stored with teacher and timestamp, visible in the export"

step "9. sign-off for a foreign course is refused"
FO="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H "X-Gate-Email: $TEACHER_B" \
      --data-urlencode "c=$COURSE_A" --data-urlencode "s=$SLUG" --data-urlencode "status=open" \
      "$BASE/portal/board/signoff")"
[[ "$FO" == 403 ]] || fail "foreign sign-off -> $FO"
saveb "$TEACHER_A" "/portal/board?c=$COURSE_A&export=csv" "$WORK/board3.csv"
grep -E "^[^,]+,$SLUG,.*confirmed" "$WORK/board3.csv" >/dev/null \
  || fail "the refused sign-off changed the row"
pass "cross-course sign-off refused and nothing written"

step "10. erasure"
BEFORE="$(curl -sS "$BASE/healthz" | python3 -c 'import json,sys; print(json.load(sys.stdin)["events"])')"
FG="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H "X-Gate-Email: $TEACHER_A" \
      "$BASE/portal/admin/forget?slug=$SLUG")"
[[ "$FG" == 403 ]] || fail "a teacher could erase data ($FG)"
curl -sS -X POST -H "X-Gate-Email: $ADMIN" "$BASE/portal/admin/forget?slug=$SLUG" >"$WORK/forget.json"
python3 -c "
import json; d=json.load(open('$WORK/forget.json'))
assert d['ok'] and d['events'] > 0 and d['signoffs'] == 1, d" || fail "forget returned nothing"
AFTER="$(curl -sS "$BASE/healthz" | python3 -c 'import json,sys; print(json.load(sys.stdin)["events"])')"
[[ "$AFTER" -lt "$BEFORE" ]] || fail "event count did not drop ($BEFORE -> $AFTER)"
saveb "$TEACHER_A" "/portal/students?c=$COURSE_A" "$WORK/students.html"
if grep -q "$SLUG" "$WORK/students.html"; then fail "erased pseudonym still listed"; fi
pass "teacher refused, admin erased $((BEFORE - AFTER)) events and the sign-off"

step "11. English UI"
saveb "$TEACHER_B" "/portal/steps?c=$COURSE_B&lang=en" "$WORK/steps-en.html"
grep -q "Difficult spots" "$WORK/steps-en.html" || fail "?lang=en is not English"
if grep -q "Schwierige Stellen" "$WORK/steps-en.html"; then fail "German text left on the English page"; fi
pass "?lang=en switches the interface"

printf '\nAll checks passed (%s students per course).\n' "$STUDENTS"

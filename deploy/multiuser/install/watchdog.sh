#!/usr/bin/env bash
# Watchdog for the CaDS host processes on machines where systemd is not used
# (pidfile loop, ct-agent style).  Supervises the session broker and, when it is present,
# the teacher portal (SPEC A5).
#
# Keeps exactly one of each alive: every FL_WD_INTERVAL seconds it checks the pid in each
# pidfile and (re)starts the process when it is gone.  Start it once, detached:
#   nohup deploy/multiuser/install/watchdog.sh >/var/log/fl-broker/watchdog.log 2>&1 &
# or from cron:  @reboot /opt/firmware-lab/watchdog.sh
# Stop everything:  watchdog.sh stop
#
# Set FL_WD_SERVICES to pick what is supervised (default "broker portal"); the portal is
# skipped silently when its script is not installed, so an install without the portal
# needs no change here.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BROKER="${FL_BROKER_PY:-$HERE/broker/fl_broker.py}"
PORTAL="${FL_PORTAL_PY:-$(cd "$HERE/../.." && pwd)/deploy/portal/portal.py}"
ENV_FILE="${FL_ENV_FILE:-/opt/firmware-lab/fl-broker.env}"
PORTAL_ENV_FILE="${FL_PORTAL_ENV_FILE:-/opt/firmware-lab/fl-portal.env}"
STATE_DIR="${FL_STATE_DIR:-${XDG_RUNTIME_DIR:-/tmp}/fl-broker}"
WD_PIDFILE="$STATE_DIR/watchdog.pid"
INTERVAL="${FL_WD_INTERVAL:-10}"
SERVICES="${FL_WD_SERVICES:-broker portal}"

mkdir -p "$STATE_DIR"
ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
alive() { [[ -f "$1" ]] && kill -0 "$(cat "$1" 2>/dev/null)" 2>/dev/null; }

pidfile_of() { echo "$STATE_DIR/fl-$1.pid"; }
script_of()  { [[ "$1" == "broker" ]] && echo "$BROKER" || echo "$PORTAL"; }
envfile_of() { [[ "$1" == "broker" ]] && echo "$ENV_FILE" || echo "$PORTAL_ENV_FILE"; }
log_of()     { echo "${FL_LOG_DIR:-$STATE_DIR}/fl-$1.log"; }

if [[ "${1:-}" == "stop" ]]; then
  files=("$WD_PIDFILE")
  for svc in $SERVICES; do files+=("$(pidfile_of "$svc")"); done
  for f in "${files[@]}"; do
    alive "$f" && kill "$(cat "$f")" && echo "$(ts) stopped $(cat "$f") ($f)"
    rm -f "$f"
  done
  exit 0
fi

if alive "$WD_PIDFILE"; then
  echo "$(ts) watchdog already running (pid $(cat "$WD_PIDFILE"))" >&2
  exit 1
fi
echo $$ >"$WD_PIDFILE"
cleanup() {
  for svc in $SERVICES; do
    pf="$(pidfile_of "$svc")"
    alive "$pf" && kill "$(cat "$pf")"
    rm -f "$pf"
  done
  rm -f "$WD_PIDFILE"
  exit 0
}
trap cleanup INT TERM

start_service() {
  local svc="$1" script env_file log
  script="$(script_of "$svc")"
  env_file="$(envfile_of "$svc")"
  log="$(log_of "$svc")"
  # Each service is started in a subshell so one env file never leaks into the other.
  (
    if [[ -f "$env_file" ]]; then
      set -a; . "$env_file"; set +a
    fi
    PYTHONUNBUFFERED=1 exec python3 "$script" >>"$log" 2>&1
  ) &
  echo $! >"$(pidfile_of "$svc")"
  echo "$(ts) started fl-$svc pid $! (log $log)"
}

for svc in $SERVICES; do
  [[ -f "$(script_of "$svc")" ]] || echo "$(ts) fl-$svc not installed at $(script_of "$svc"), skipping"
done

while :; do
  for svc in $SERVICES; do
    [[ -f "$(script_of "$svc")" ]] || continue
    alive "$(pidfile_of "$svc")" || start_service "$svc"
  done
  sleep "$INTERVAL"
done

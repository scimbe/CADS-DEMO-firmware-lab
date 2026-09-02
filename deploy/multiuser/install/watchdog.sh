#!/usr/bin/env bash
# fl-broker watchdog for hosts where systemd is not used (pidfile loop, ct-agent style).
#
# Keeps exactly one broker alive: every FL_WD_INTERVAL seconds it checks the pid in the pidfile
# and (re)starts the broker when the process is gone.  Start it once, detached:
#   nohup deploy/multiuser/install/watchdog.sh >/var/log/fl-broker/watchdog.log 2>&1 &
# or from cron:  @reboot /opt/firmware-lab/watchdog.sh
# Stop everything:  watchdog.sh stop
set -u

BROKER="${FL_BROKER_PY:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/broker/fl_broker.py}"
ENV_FILE="${FL_ENV_FILE:-/opt/firmware-lab/fl-broker.env}"
STATE_DIR="${FL_STATE_DIR:-${XDG_RUNTIME_DIR:-/tmp}/fl-broker}"
PIDFILE="$STATE_DIR/fl-broker.pid"
WD_PIDFILE="$STATE_DIR/watchdog.pid"
LOG="${FL_LOG:-$STATE_DIR/fl-broker.log}"
INTERVAL="${FL_WD_INTERVAL:-10}"

mkdir -p "$STATE_DIR"
ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
alive() { [[ -f "$1" ]] && kill -0 "$(cat "$1" 2>/dev/null)" 2>/dev/null; }

if [[ "${1:-}" == "stop" ]]; then
  for f in "$WD_PIDFILE" "$PIDFILE"; do
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
trap 'alive "$PIDFILE" && kill "$(cat "$PIDFILE")"; rm -f "$PIDFILE" "$WD_PIDFILE"; exit 0' INT TERM

start_broker() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a; . "$ENV_FILE"; set +a
  fi
  PYTHONUNBUFFERED=1 python3 "$BROKER" >>"$LOG" 2>&1 &
  echo $! >"$PIDFILE"
  echo "$(ts) started fl-broker pid $! (log $LOG)"
}

while :; do
  alive "$PIDFILE" || start_broker
  sleep "$INTERVAL"
done

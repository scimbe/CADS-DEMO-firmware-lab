#!/bin/sh
# Stand-in for the portal's /entrypoint.d/15-user-repo.sh, for tests only.
#
# The real script lives in the (private) praktikum-creator repository,
# launcher/entrypoint.d/15-user-repo.sh, and is bind-mounted by the launcher. It
# is deliberately NOT copied here. This file was written for the test and does
# only what the interface between the two repositories promises for the access
# "riisc" (CADS_GIT_MODE=github-device):
#   - github.com gets the credential helpers "cache" and "oauth -device" in the
#     global git config (git-credential-oauth ships in the image);
#   - user.name / user.email go into the workspace repository if unset there.
#   - the launcher runs the script itself through `sh` before the image's start
#     and then writes the marker file /tmp/.cads-user-repo-erledigt holding the
#     start time of PID 1 (field 22 of /proc/1/stat) - also when the script
#     failed. A marker with the start time of THIS start makes exactly one later
#     call do nothing; the marker is used up by that call, so any call after it
#     (by hand in a terminal, for instance) runs again. A marker from an earlier
#     start of the same container (other start time) does not count and is
#     removed. Without /proc/1/stat (macOS) no marker matches: the script runs.
# e2e/entrypoint-smoke.sh takes the real script instead when CADS_USER_REPO_SCRIPT
# points at it.

set -u

MARKER="${CADS_USER_REPO_MARKER:-/tmp/.cads-user-repo-erledigt}"

pid1_start() {
    [ -r /proc/1/stat ] || return 0
    # Everything after the last ") " starts with field 3; field 22 is the 20th.
    sed -n 's/^.*) //p' /proc/1/stat 2>/dev/null | cut -d' ' -f20
}

if [ -f "$MARKER" ]; then
    seen="$(cat "$MARKER" 2>/dev/null)"
    rm -f "$MARKER"
    if [ -n "$seen" ] && [ "$seen" = "$(pid1_start)" ]; then
        echo "[cads-start] 15-user-repo.sh (stand-in) ran in this start already - this call does nothing" >&2
        exit 0
    fi
fi

WS="${CADS_WORKSPACE:-/home/coder/workspace/cads-zero}"

log() { echo "[cads-git] $*"; }

if [ "${CADS_GIT_MODE:-}" = "github-device" ]; then
    if command -v git-credential-oauth >/dev/null 2>&1; then
        key='credential.https://github.com.helper'
        git config --global --unset-all "$key" 2>/dev/null || true
        git config --global --add "$key" ""
        git config --global --add "$key" "cache --timeout=28800"
        git config --global --add "$key" "oauth -device"
        log "GitHub-Anmeldung: Geraetecode (stand-in)"
    else
        log "git-credential-oauth fehlt (stand-in)"
    fi
fi

if git -C "$WS" rev-parse --git-dir >/dev/null 2>&1; then
    [ -n "$(git -C "$WS" config --local --get user.email 2>/dev/null)" ] || [ -z "${CADS_GIT_EMAIL:-}" ] \
        || git -C "$WS" config --local user.email "$CADS_GIT_EMAIL"
    [ -n "$(git -C "$WS" config --local --get user.name 2>/dev/null)" ] || [ -z "${CADS_GIT_NAME:-}" ] \
        || git -C "$WS" config --local user.name "$CADS_GIT_NAME"
fi
exit 0

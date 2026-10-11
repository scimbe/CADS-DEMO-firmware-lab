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
#   - CADS_USER_REPO_ERLEDIGT=1 (announced for the launcher: it will call the
#     script itself through `sh` and then set this variable): exit 0 at once, so
#     that a second call from the image's runner does nothing.
# e2e/entrypoint-smoke.sh takes the real script instead when CADS_USER_REPO_SCRIPT
# points at it.

set -u

[ "${CADS_USER_REPO_ERLEDIGT:-}" = "1" ] && exit 0

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

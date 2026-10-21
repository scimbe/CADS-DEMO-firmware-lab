#!/bin/sh
# CaDS Firmware Lab - keep git logins (user name + access token) in memory for
# the session, so a student types the token for their own GitLab project once
# and not on every fetch and push.
#
# Runs on every container start, before code-server, as the `coder` user (see
# 10-seed-workspace.sh for the contract: this script must ALWAYS exit 0).
#
# What it sets: credential.helper "cache --timeout=$TIMEOUT" in ~/.gitconfig,
# for every host. git-credential-cache keeps what it learns in the memory of a
# per-user daemon (socket under ~/.cache/git/credential, mode 0700); nothing is
# written to a file, and it is gone after the timeout or with the container.
# github.com keeps its own helper list (15-user-repo.sh resets it with an empty
# entry, then cache + oauth -device), so nothing changes there.
#
# Left alone:
#  - when a credential broker socket is mounted ($CADS_GIT_CRED_DIR/broker.sock):
#    git then logs in without a question, and its short-lived token must not be
#    kept beyond its own lifetime by the cache;
#  - when a general credential.helper is already set in ~/.gitconfig (a
#    student's own choice, or this script on an earlier run): no duplicates.
#
# Never touches the repository config (the volume) and never logs a secret -
# there is none here.

set -u

TIMEOUT="${CADS_GIT_CRED_CACHE_TIMEOUT:-28800}"
CRED_DIR="${CADS_GIT_CRED_DIR:-/run/cads-git-cred}"

log() { echo "[cads-git-cache] $*"; }

main() {
    case "$TIMEOUT" in ''|*[!0-9]*) TIMEOUT=28800 ;; esac
    if [ -S "$CRED_DIR/broker.sock" ]; then
        log "Anmelde-Broker vorhanden - kein Zwischenspeicher"
        return 0
    fi
    if [ -n "$(git config --global --get-all credential.helper 2>/dev/null)" ]; then
        log "credential.helper bereits gesetzt - unveraendert"
        return 0
    fi
    git config --global credential.helper "cache --timeout=$TIMEOUT" \
        && log "Zugangsdaten werden ${TIMEOUT} s im Speicher gehalten (credential-cache)"
}

main || log "WARNUNG: unerwarteter Fehler; code-server startet trotzdem"
exit 0

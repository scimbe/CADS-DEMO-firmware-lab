#!/bin/sh
# CaDS Firmware Lab - git identity (user.name / user.email) from the container
# environment, so the first `git commit` or `git merge` works without a manual
# step ("Author identity unknown", "unable to auto-detect email address").
#
# Runs on every container start, before code-server, as the `coder` user (see
# 10-seed-workspace.sh for the contract: this script must ALWAYS exit 0).
#
#   CADS_GIT_NAME   display name of the person (the portal's launcher sets it)
#   CADS_GIT_EMAIL  login e-mail of the person
#
# Where the identity goes:
#  1. Into the REPOSITORY config of the workspace ($CADS_WORKSPACE/.git/config),
#     not --global: only the workspace is on the per-person volume, ~/.gitconfig
#     is gone after every restart.
#  2. Into ~/.gitconfig as well, as the default for a second repository created
#     in this session. It is rewritten from the environment on every start, so
#     nothing depends on it surviving.
#
# Each of the two keys is written only where NOTHING is set yet: an identity a
# student chose stays, in the repository and globally. Unset or empty variables
# change nothing. The values are passed to git as arguments (no eval, no config
# file editing), so spaces, umlauts and quotes need no escaping here.
#
# Order: image/entrypoint/run-entrypoint-d.sh runs /entrypoint.d/* sorted, so
# this script comes after 10-seed-workspace.sh and after the launcher's
# 15-user-repo.sh (bind-mounted by praktikum-creator). It does not depend on
# that: if the workspace is not there yet it runs the seed itself (idempotent).
# 15-user-repo.sh applies the same rule to the repository config; whichever
# runs second finds the keys set and leaves them.
#
# The log says only whether something was set - never the name or the address.

set -u

WS="${CADS_WORKSPACE:-/home/coder/workspace/cads-zero}"
SEED_SCRIPT="${CADS_SEED_SCRIPT:-/entrypoint.d/10-seed-workspace.sh}"
NAME="${CADS_GIT_NAME:-}"
EMAIL="${CADS_GIT_EMAIL:-}"

log() { echo "[cads-git-identity] $*"; }

# A value with a line break or another control character is not an identity
# (and would end up as a broken header in every commit): treat it as not given.
usable() {
    [ -n "$1" ] || return 1
    [ "$(printf '%s' "$1" | LC_ALL=C tr -d '[:cntrl:]')" = "$1" ]
}

changed=0

# set_if_unset <scope: --global | --local> <key> <value>
set_if_unset() {
    scope="$1"; key="$2"; value="$3"
    usable "$value" || return 0
    if [ "$scope" = "--local" ]; then
        [ -z "$(git -C "$WS" config --local --get "$key" 2>/dev/null)" ] || return 0
        git -C "$WS" config --local "$key" "$value" 2>/dev/null && changed=1
    else
        [ -z "$(git config --global --get "$key" 2>/dev/null)" ] || return 0
        git config --global "$key" "$value" 2>/dev/null && changed=1
    fi
    return 0
}

main() {
    if ! usable "$NAME" && ! usable "$EMAIL"; then
        log "git-Identitaet unveraendert (CADS_GIT_NAME/CADS_GIT_EMAIL nicht gesetzt)"
        return 0
    fi

    if ! git -C "$WS" rev-parse --git-dir >/dev/null 2>&1 && [ -f "$SEED_SCRIPT" ]; then
        sh "$SEED_SCRIPT" >/dev/null 2>&1 || true
    fi
    if git -C "$WS" rev-parse --git-dir >/dev/null 2>&1; then
        set_if_unset --local user.name "$NAME"
        set_if_unset --local user.email "$EMAIL"
    else
        log "kein Git-Repository im Workspace - nur die Voreinstellung der Sitzung"
    fi

    set_if_unset --global user.name "$NAME"
    set_if_unset --global user.email "$EMAIL"

    if [ "$changed" = 1 ]; then
        log "git-Identitaet gesetzt"
    else
        log "git-Identitaet unveraendert (bereits vorhanden)"
    fi
}

main || log "WARNUNG: unerwarteter Fehler; code-server startet trotzdem"
exit 0

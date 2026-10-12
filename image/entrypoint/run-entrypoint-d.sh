#!/bin/sh
# CaDS Firmware Lab - run the start scripts in /entrypoint.d, in order, visibly.
#
# The base image's /usr/bin/entrypoint.sh (codercom/code-server) runs
#   find "$ENTRYPOINTD" -type f -executable -print -exec {} \;
# which has three properties that cost a day in the lab:
#   - `-executable` asks access(X_OK). A script bind-mounted from a noexec file
#     system (the portal mounts its 15-user-repo.sh from a tmpfs under /run) is
#     SKIPPED, silently, although its mode is 0755.
#   - `find` does not sort: 20-* ran before 10-*.
#   - a failing script is neither reported nor distinguishable from one that ran.
#
# The image therefore points ENTRYPOINTD at a directory that holds only this
# file (Dockerfile), and this file runs the real scripts. The base entrypoint
# itself is untouched (fixuid, DOCKER_USER, exec code-server stay upstream's).
#
# Rules:
#   - every regular file in $CADS_ENTRYPOINT_DIR (default /entrypoint.d), in
#     byte order of the name: 10-, 15-, 20-, 30-;
#   - executable -> run it; a *.sh that is not executable (noexec mount, missing
#     mode bit) -> run it through the interpreter its first line names (bash if
#     it says bash, else sh); anything else is skipped and named;
#   - one line per script: "entrypoint: <name> ok" or "entrypoint: <name> FEHLER
#     rc=<n>" - names and exit codes only, never content;
#   - a failure never stops the start: code-server comes up, the log says why
#     something is missing. This file always exits 0;
#   - nothing in the directory is passed over without a line: a dangling
#     symlink is a FEHLER, any other entry that is not a regular file (a FIFO,
#     a name that vanished) is "uebersprungen" with the reason.
#
# Runs as the container user (coder), like the scripts did before - no root.

set -u

DIR="${CADS_ENTRYPOINT_DIR:-/entrypoint.d}"

log() { echo "entrypoint: $*"; }

if [ ! -d "$DIR" ]; then
    log "$DIR fehlt - keine Startskripte"
    exit 0
fi

interpreter_of() {
    first="$(head -n 1 "$1" 2>/dev/null | LC_ALL=C tr -d '\000')"
    case "$first" in
        '#!'*bash*) echo bash ;;
        *) echo sh ;;
    esac
}

run_one() {
    path="$1"
    name="${path##*/}"
    if [ -d "$path" ]; then
        # What docker creates when the source of a file bind mount does not exist.
        log "$name FEHLER: ist ein Verzeichnis, keine Datei (Bind-Mount-Quelle fehlt?)"
        return 0
    fi
    if [ -L "$path" ] && [ ! -e "$path" ]; then
        # A bind mount or a link whose target is gone: the script was meant to
        # run and cannot.
        log "$name FEHLER: Verweis ins Leere (Ziel des Symlinks fehlt)"
        return 0
    fi
    if [ ! -f "$path" ]; then
        if [ -e "$path" ]; then
            log "$name uebersprungen (keine regulaere Datei)"
        else
            log "$name uebersprungen (nicht mehr vorhanden)"
        fi
        return 0
    fi
    if [ -x "$path" ]; then
        "$path" </dev/null
        rc=$?
    else
        case "$name" in
            *.sh)
                "$(interpreter_of "$path")" "$path" </dev/null
                rc=$?
                ;;
            *)
                log "$name uebersprungen (nicht ausfuehrbar, kein .sh)"
                return 0
                ;;
        esac
    fi
    if [ "$rc" -eq 0 ]; then
        log "$name ok"
    else
        log "$name FEHLER rc=$rc"
    fi
    return 0
}

# One name per line, sorted bytewise (ls alone sorts by the locale). A name with
# a line break is not a start script anybody wrote on purpose; it falls apart
# into names that do not exist and is reported as "nicht mehr vorhanden".
names="$(ls -1A "$DIR" 2>/dev/null | LC_ALL=C sort)"
if [ -z "$names" ]; then
    log "$DIR ist leer - keine Startskripte"
    exit 0
fi

# The list is split on line breaks only, and with globbing off: a name such as
# "20-*.sh" must not expand against the current directory.
old_ifs="$IFS"
IFS='
'
set -f
for name in $names; do
    IFS="$old_ifs"
    run_one "$DIR/$name"
done
set +f
IFS="$old_ifs"
exit 0

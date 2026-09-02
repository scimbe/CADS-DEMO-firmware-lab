#!/bin/sh
# CaDS Firmware Lab - seed the student workspace (SPEC.md §4).
#
# Runs on every container start, before code-server, as the `coder` user:
# /usr/bin/entrypoint.sh executes every executable in $ENTRYPOINTD via
# `find -exec` under `set -e`, so this script must ALWAYS exit 0 - a failure
# here must degrade to "empty workspace + log line", never to "no IDE".
#
#  1. Copy /opt/cads-seed/cads-zero to $CADS_WORKSPACE unless a .git exists
#     there already (student's work is never overwritten).
#  2. Write the container variants of .vscode/{settings,tasks,launch,extensions}.json
#     and .clangd from /opt/cads-seed/vscode-templates (refreshed every start, so
#     image updates reach existing workspaces). Marked skip-worktree / excluded in
#     git so `git status` stays clean for the student.
#  3. Pick the GDB for cortex-debug: the toolchain's arm-none-eabi-gdb if it
#     actually starts here (it links a specific libpython), else gdb-multiarch.
#  4. Drop a CMake build tree whose cache points at a different source path
#     (would make every CMake invocation fail with "source does not match").

set -u

SEED="${CADS_SEED_DIR:-/opt/cads-seed/cads-zero}"
TEMPLATES="${CADS_TEMPLATES_DIR:-/opt/cads-seed/vscode-templates}"
WS="${CADS_WORKSPACE:-/home/coder/workspace/cads-zero}"
TOOLCHAIN_GDB="${CADS_ARM_TOOLCHAIN_BIN:-/opt/arm-gnu-toolchain/bin}/arm-none-eabi-gdb"
FALLBACK_GDB="/usr/bin/gdb-multiarch"

log() { echo "[cads-seed] $*"; }

# Prints exactly one line (the path) on stdout - it is used via $(...); any
# diagnostics go to stderr so they cannot leak into the sed substitution.
pick_gdb() {
    if [ -x "$TOOLCHAIN_GDB" ] && "$TOOLCHAIN_GDB" --batch -ex 'show version' >/dev/null 2>&1; then
        echo "$TOOLCHAIN_GDB"
    else
        log "toolchain gdb not usable here, cortex-debug will use $FALLBACK_GDB" >&2
        echo "$FALLBACK_GDB"
    fi
}

seed_workspace() {
    if [ -d "$WS/.git" ]; then
        log "workspace $WS exists, keeping it"
        return 0
    fi
    if [ ! -d "$SEED" ]; then
        log "no seed at $SEED - nothing to do"
        return 1
    fi
    mkdir -p "$(dirname "$WS")" || return 1
    log "seeding $WS from $SEED"
    rm -rf "$WS.partial"
    if cp -a "$SEED" "$WS.partial" && mv "$WS.partial" "$WS"; then
        log "seed complete"
    else
        log "seed copy failed"
        rm -rf "$WS.partial"
        return 1
    fi
}

write_templates() {
    [ -d "$TEMPLATES" ] || { log "no templates at $TEMPLATES"; return 0; }
    gdb="$(pick_gdb | head -n 1)"
    toolchain_bin="${CADS_ARM_TOOLCHAIN_BIN:-/opt/arm-gnu-toolchain/bin}"
    mkdir -p "$WS/.vscode" || return 1
    for name in settings tasks launch extensions; do
        [ -f "$TEMPLATES/$name.json" ] || continue
        if sed -e "s#__CADS_GDB_PATH__#$gdb#g" -e "s#__CADS_TOOLCHAIN_BIN__#$toolchain_bin#g" \
                "$TEMPLATES/$name.json" > "$WS/.vscode/$name.json.tmp"; then
            mv "$WS/.vscode/$name.json.tmp" "$WS/.vscode/$name.json"
        else
            log "failed to render $name.json"
            rm -f "$WS/.vscode/$name.json.tmp"
        fi
    done
    if [ -f "$TEMPLATES/clangd.yaml" ]; then
        cp "$TEMPLATES/clangd.yaml" "$WS/.clangd"
    fi
    log "wrote .vscode/{settings,tasks,launch,extensions}.json and .clangd (gdb: $gdb)"

    # Keep the student's `git status` clean: the tracked .vscode files are
    # replaced by container variants, .clangd is new.
    if [ -d "$WS/.git" ] && command -v git >/dev/null 2>&1; then
        (
            cd "$WS" || exit 0
            for f in .vscode/settings.json .vscode/tasks.json .vscode/launch.json .vscode/extensions.json; do
                git ls-files --error-unmatch "$f" >/dev/null 2>&1 && git update-index --skip-worktree "$f" 2>/dev/null
            done
            mkdir -p .git/info
            grep -qx '.clangd' .git/info/exclude 2>/dev/null || echo '.clangd' >> .git/info/exclude
        )
    fi
}

check_build_trees() {
    for dir in "$WS"/build/*; do
        [ -f "$dir/CMakeCache.txt" ] || continue
        home="$(sed -n 's/^CMAKE_HOME_DIRECTORY:INTERNAL=//p' "$dir/CMakeCache.txt" | head -1)"
        if [ -n "$home" ] && [ "$home" != "$WS" ]; then
            log "$dir was configured for $home, not $WS - removing stale build tree"
            rm -rf "$dir"
        fi
    done
}

main() {
    seed_workspace || return 1
    write_templates || return 1
    check_build_trees
    return 0
}

if main; then
    log "ready: $WS"
else
    log "WARNING: workspace seeding incomplete (see messages above); code-server starts anyway"
fi
exit 0

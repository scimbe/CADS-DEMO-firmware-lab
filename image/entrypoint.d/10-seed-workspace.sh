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
#  1a. Refresh TOOLING files (scripts/) in an existing workspace, but only the
#     ones the student has not touched - see refresh_tooling() (PB-08).
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
APPLIED="$WS/.cads-seed-applied"
# Paths inside the workspace that are TOOLING, not exercise material: the student
# is not expected to edit them, and a fix in them reaches an existing workspace
# only if something refreshes it. Keep this list small and boring - everything
# listed here can be overwritten (when untouched), so exercise sources must not
# appear in it.
REFRESH_PATHS="scripts"
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

# PB-08: seed_workspace() deliberately never touches an existing workspace, so
# a fix on the firmware side used to reach only volumes created after it - a
# student who starts in September keeps a September bug for good while the
# course text around them keeps updating. Measured on the services host: the
# workspace sat one week behind the image it was running under.
#
# The fix is neither "always overwrite" (that destroys work) nor "never touch"
# (that is the bug). Only files that are provably untouched are refreshed, and
# "untouched" is decided against what WE last wrote, not against the seed of the
# day: $APPLIED keeps a pristine copy of every file this function installed. A
# file the student has edited since is kept and reported, never overwritten.
#
# Deciding against git HEAD alone would work exactly once - our own copy makes
# the file look modified, and every later update would skip it.
refresh_tooling() {
    [ -d "$WS/.git" ] || return 0
    [ -d "$SEED" ] || return 0
    updated=0
    kept=0
    for rel in $REFRESH_PATHS; do
        [ -d "$SEED/$rel" ] || continue
        find "$SEED/$rel" -type f -print > /tmp/cads-seed-files.$$ 2>/dev/null || continue
        while IFS= read -r src; do
            f="${src#$SEED/}"
            ws="$WS/$f"
            ap="$APPLIED/$f"
            cmp -s "$src" "$ws" && continue          # already current
            if [ ! -e "$ws" ]; then
                : # new file from the seed - safe to add
            elif [ -e "$ap" ]; then
                cmp -s "$ap" "$ws" || { log "keeping your edited $f (not overwritten)"; kept=$((kept + 1)); continue; }
            elif ! git -C "$WS" diff --quiet -- "$f" 2>/dev/null; then
                log "keeping your edited $f (not overwritten)"
                kept=$((kept + 1))
                continue
            fi
            mkdir -p "$(dirname "$ws")" "$(dirname "$ap")" || continue
            if cp -a "$src" "$ws.tmp" && mv "$ws.tmp" "$ws"; then
                cp -a "$src" "$ap" 2>/dev/null || true
                updated=$((updated + 1))
            else
                rm -f "$ws.tmp"
                log "could not refresh $f"
            fi
        done < /tmp/cads-seed-files.$$
        rm -f /tmp/cads-seed-files.$$
    done
    [ "$updated" -gt 0 ] && log "refreshed $updated tooling file(s) from the image"
    [ "$kept" -gt 0 ] && log "$kept tooling file(s) kept because you had changed them"
    return 0
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
            # Everything the container/extensions create inside the workspace
            # that cads-zero's own .gitignore does not cover: the clangd config
            # written above, the tutor's session directory (SPEC §3.3), clangd's
            # index cache. Source Control must show nothing after the seed.
            for pattern in '.clangd' '.cads-tutor/' '.cache/' 'CMakeUserPresets.json' '.cads-seed-applied/'; do
                grep -qxF "$pattern" .git/info/exclude 2>/dev/null || echo "$pattern" >> .git/info/exclude
            done
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
    refresh_tooling
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

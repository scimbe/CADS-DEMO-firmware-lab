#!/bin/sh
# CaDS Tutor Lab - seed the student workspaces (SPEC.md Addendum v1.1 A4).
#
# Runs on every container start, before code-server, as the `coder` user:
# /usr/bin/entrypoint.sh executes every executable in $ENTRYPOINTD via
# `find -exec` under `set -e`, so this script must ALWAYS exit 0 - a failure
# here must degrade to "empty workspace + log line", never to "no IDE".
#
#  1. Copy /opt/cads-seed/<name> to $CADS_WORKSPACE_ROOT/<name> for
#     rust-foundations and javascript-foundations unless the directory exists
#     (the student's work is never overwritten).
#  2. Write <name>/.vscode/settings.json from /opt/cads-seed/vscode-templates
#     when it is missing or still the image-managed variant (marker line), so
#     image updates reach existing workspaces but a student's own file stays.
#     JavaScript: ESLint is switched off unless the workspace has an ESLint
#     config (the extension would otherwise report a missing library).
#  3. Write the multi-root workspace file cads-tutor.code-workspace with both
#     folders if it does not exist (VS Code rewrites it when folders change).

set -u

SEED_ROOT="${CADS_SEED_DIR:-/opt/cads-seed}"
TEMPLATES="${CADS_TEMPLATES_DIR:-/opt/cads-seed/vscode-templates}"
ROOT="${CADS_WORKSPACE_ROOT:-/home/coder/workspace}"
WS_FILE="${CADS_WORKSPACE_FILE:-$ROOT/cads-tutor.code-workspace}"
WORKSPACES="rust-foundations javascript-foundations"
MARKER="cads-tutor-lab: managed by the image"

log() { echo "[cads-seed] $*"; }

seed_one() {
    name="$1"
    ws="$ROOT/$name"
    seed="$SEED_ROOT/$name"
    if [ -d "$ws" ]; then
        log "workspace $ws exists, keeping it"
        return 0
    fi
    if [ ! -d "$seed" ]; then
        log "no seed at $seed - skipping $name"
        return 1
    fi
    log "seeding $ws from $seed"
    rm -rf "$ws.partial"
    if cp -a "$seed" "$ws.partial" && mv "$ws.partial" "$ws"; then
        if [ -f "$ws/PLACEHOLDER.md" ]; then
            log "note: $name is the PLACEHOLDER workspace (workspaces/$name was not in the image build)"
        fi
        log "seed complete: $name"
    else
        log "seed copy failed: $name"
        rm -rf "$ws.partial"
        return 1
    fi
}

has_eslint_config() {
    ws="$1"
    for f in eslint.config.js eslint.config.mjs eslint.config.cjs eslint.config.ts eslint.config.mts eslint.config.cts \
             .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml .eslintrc.yaml; do
        [ -e "$ws/$f" ] && return 0
    done
    [ -f "$ws/package.json" ] && grep -q '"eslintConfig"' "$ws/package.json" 2>/dev/null && return 0
    return 1
}

write_settings() {
    name="$1"
    ws="$ROOT/$name"
    tpl="$TEMPLATES/$name.settings.json"
    [ -d "$ws" ] || return 0
    [ -f "$tpl" ] || { log "no settings template for $name"; return 0; }
    target="$ws/.vscode/settings.json"
    if [ -f "$target" ] && ! grep -qF "$MARKER" "$target"; then
        log "$name/.vscode/settings.json is the student's own - not touched"
        return 0
    fi
    eslint=false
    if has_eslint_config "$ws"; then eslint=true; fi
    mkdir -p "$ws/.vscode" || return 1
    if sed -e "s#__CADS_ESLINT_ENABLE__#$eslint#g" "$tpl" > "$target.tmp"; then
        mv "$target.tmp" "$target"
        log "wrote $name/.vscode/settings.json (eslint: $eslint)"
    else
        rm -f "$target.tmp"
        log "failed to render $name/.vscode/settings.json"
        return 1
    fi
}

write_workspace_file() {
    if [ -f "$WS_FILE" ]; then
        log "workspace file $WS_FILE exists, keeping it"
        return 0
    fi
    tpl="$TEMPLATES/cads-tutor.code-workspace"
    if [ -f "$tpl" ]; then
        cp "$tpl" "$WS_FILE" && log "wrote $WS_FILE" && return 0
    fi
    # Fallback without template: both folders, no settings.
    printf '{\n  "folders": [\n    { "path": "rust-foundations" },\n    { "path": "javascript-foundations" }\n  ],\n  "settings": {}\n}\n' > "$WS_FILE" \
        && log "wrote $WS_FILE (built-in fallback)"
}

main() {
    rc=0
    mkdir -p "$ROOT" || return 1
    for name in $WORKSPACES; do
        seed_one "$name" || rc=1
        write_settings "$name" || rc=1
    done
    write_workspace_file || rc=1
    return $rc
}

if main; then
    log "ready: $WS_FILE"
else
    log "WARNING: workspace seeding incomplete (see messages above); code-server starts anyway"
fi
exit 0

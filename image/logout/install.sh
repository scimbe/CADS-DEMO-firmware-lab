#!/bin/sh
# CaDS Firmware Lab - put the logout page script into a code-server installation.
#
#   install.sh <code-server root> [owner of the config file]
#
# Runs at IMAGE BUILD time (Dockerfile). code-server serves everything below its
# root at <base>/_static/, and the workbench's CSP allows same-origin scripts
# ('self') but no inline ones - hence two files next to the favicon and two
# <script src> tags, not an inline snippet:
#
#   cads-logout-config.js   written again at every container start by
#                           image/entrypoint.d/20-logout-config.sh (CADS_LOGOUT_URL);
#                           must be writable by the user the container runs as
#   cads-logout.js          the page script (see its header)
#
# {{BASE}} is code-server's own placeholder for "relative path back to where
# code-server is mounted" - the same one its favicon uses, so the tags work
# behind a path prefix (/u/<id>/ with stripPrefix) as well as at the root.
#
# Fails loudly when the workbench HTML no longer looks as expected: the base
# image is codercom/code-server:latest, and an image that silently has no
# logout is worse than a build that stops.
set -eu

ROOT="${1:?usage: install.sh <code-server root> [config owner]}"
OWNER="${2:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
MEDIA="$ROOT/src/browser/media"
HTML="$ROOT/lib/vscode/out/vs/code/browser/workbench/workbench.html"
TAGS='<script src="{{BASE}}/_static/src/browser/media/cads-logout-config.js"></script><script src="{{BASE}}/_static/src/browser/media/cads-logout.js"></script>'

[ -d "$MEDIA" ] || { echo "cads-logout: $MEDIA not found" >&2; exit 1; }
[ -f "$HTML" ] || { echo "cads-logout: $HTML not found" >&2; exit 1; }

cp "$HERE/cads-logout.js" "$MEDIA/cads-logout.js"
chmod 0644 "$MEDIA/cads-logout.js"
printf 'window.CADS_LOGOUT_CONFIG = {};\n' > "$MEDIA/cads-logout-config.js"
chmod 0644 "$MEDIA/cads-logout-config.js"
if [ -n "$OWNER" ]; then chown "$OWNER" "$MEDIA/cads-logout-config.js"; fi

if grep -q 'cads-logout.js' "$HTML"; then
    echo "cads-logout: $HTML already patched"
else
    grep -q '{{BASE}}/_static/src/browser/media/' "$HTML" \
        || { echo "cads-logout: $HTML has no {{BASE}}/_static/src/browser/media/ reference any more" >&2; exit 1; }
    [ "$(grep -c '</html>' "$HTML")" = 1 ] \
        || { echo "cads-logout: expected exactly one </html> in $HTML" >&2; exit 1; }
    tmp="$HTML.cads-logout.tmp"
    sed "s#</html>#${TAGS}</html>#" "$HTML" > "$tmp"
    cat "$tmp" > "$HTML"
    rm -f "$tmp"
fi

grep -q 'cads-logout-config.js"></script><script src="{{BASE}}/_static/src/browser/media/cads-logout.js"></script></html>' "$HTML" \
    || { echo "cads-logout: patching $HTML failed" >&2; exit 1; }
echo "cads-logout: installed into $ROOT"

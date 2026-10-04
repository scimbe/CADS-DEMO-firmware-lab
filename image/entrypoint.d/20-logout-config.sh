#!/bin/sh
# CaDS Firmware Lab - tell the logout page script where "logout" is.
#
# Runs on every container start, before code-server, as the `coder` user (see
# 10-seed-workspace.sh for the contract: this script must ALWAYS exit 0).
#
# CADS_LOGOUT_URL  optional. Absolute URL or path the browser tab is sent to on
#                  "Abmelden"; "/x" is relative to the host, not to the path
#                  prefix the lab is served under. Unset/empty: the page script
#                  decides by itself - code-server's own logout when code-server
#                  has a password (--auth password), else "/logout" on the host
#                  (the portal's logout route). See image/logout/cads-logout.js.
#
# The file is rewritten on every start, so removing the variable takes effect too.

set -u

FILE="${CADS_LOGOUT_CONFIG_FILE:-/usr/lib/code-server/src/browser/media/cads-logout-config.js}"

log() { echo "[cads-logout] $*"; }

if [ ! -w "$FILE" ]; then
    log "WARNUNG: $FILE fehlt oder ist nicht schreibbar - CADS_LOGOUT_URL wird ignoriert"
    exit 0
fi

# json.dumps: the value ends up inside a <script>; nothing in it may be able to
# close a string or the script element.
if CADS_LOGOUT_URL="${CADS_LOGOUT_URL:-}" python3 -c '
import json, os, sys
url = os.environ["CADS_LOGOUT_URL"].strip()
config = {"url": url} if url else {}
text = json.dumps(config).replace("<", "\\u003c")
open(sys.argv[1], "w").write("window.CADS_LOGOUT_CONFIG = " + text + ";\n")
' "$FILE"; then
    log "Abmelde-Adresse: ${CADS_LOGOUT_URL:-automatisch (code-server-Logout bei Passwort, sonst /logout)}"
else
    log "WARNUNG: $FILE konnte nicht geschrieben werden"
fi
exit 0

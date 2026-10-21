#!/usr/bin/env bash
# CaDS Firmware Lab - start scripts against the built image (docs/ENTRYPOINT.md).
#
#   e2e/entrypoint-smoke.sh <image ref>
#
# Rebuilds the case measured in the portal: the launcher bind-mounts
# its script from a tmpfs with `noexec` to /entrypoint.d/15-user-repo.sh:ro. The
# base image's `find -executable` skipped it silently, so neither the git
# identity nor the credential helper was ever set.
#
# Checks:
#   - precondition: in the container `test -x` on the mounted script fails
#     (otherwise this test would not be testing the defect);
#   - the mounted script runs anyway, and all scripts run in sorted order
#     (10-, 15-, 20-, 25-, 30-, 35-), each with one "entrypoint: <name> ..." line;
#   - a script that fails on purpose is logged as "FEHLER rc=7" and code-server
#     still starts;
#   - with the portal's variables for the access "riisc" (CADS_GIT_MODE=
#     github-device, CADS_GIT_NAME/EMAIL, GIT_CONFIG_COUNT=0) the credential
#     helper and the identity are set afterwards, 30-git-identity.sh agrees with
#     the mounted script, and a commit works;
#   - /entrypoint.d belongs to root and the container user cannot write to it;
#   - the launcher's own start: a preamble runs the script through `sh`, writes
#     the marker /tmp/.cads-user-repo-erledigt with the start time of PID 1 and
#     then execs the image's entrypoint. The runner's call of the script must do
#     nothing again (the body ran exactly once), use the marker up, and a call by
#     hand afterwards must run again.
#
# The 15-* script is tests/entrypoint/fixtures/15-user-repo-standin.sh; set
# CADS_USER_REPO_SCRIPT to the real launcher/entrypoint.d/15-user-repo.sh of
# praktikum-creator to test with that one (it is private and not copied here).
#
# Needs docker and sudo (mounting a tmpfs). Creates and removes only the
# container and the mount named below.

set -euo pipefail

IMAGE="${1:?usage: entrypoint-smoke.sh <image ref>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_15="${CADS_USER_REPO_SCRIPT:-$HERE/tests/entrypoint/fixtures/15-user-repo-standin.sh}"
CONTAINER=entrypoint-smoke
WS=/home/coder/workspace/cads-zero
NAME='Jürgen "Jay" Müller'
EMAIL='juergen.lab@example.org'

fails=0
ok() { echo "ok - $*"; }
bad() { echo "FAIL - $*"; fails=$((fails + 1)); }

MNT="$(mktemp -d /tmp/entrypoint-smoke.XXXXXX)"
cleanup() {
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    if mountpoint -q "$MNT"; then sudo umount "$MNT"; fi
    rmdir "$MNT" 2>/dev/null || true
}
trap cleanup EXIT
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

# The host side of the portal: scripts with mode 0755 on a noexec tmpfs.
sudo mount -t tmpfs -o noexec,nosuid,nodev,mode=0755 tmpfs "$MNT"
sudo cp "$SCRIPT_15" "$MNT/15-user-repo.sh"
printf '#!/bin/sh\necho "[smoke] dieses Skript scheitert absichtlich"\nexit 7\n' | sudo tee "$MNT/25-smoke-fehler.sh" >/dev/null
sudo chmod 0755 "$MNT/15-user-repo.sh" "$MNT/25-smoke-fehler.sh"

docker run -d --name "$CONTAINER" \
    -v "$MNT/15-user-repo.sh:/entrypoint.d/15-user-repo.sh:ro" \
    -v "$MNT/25-smoke-fehler.sh:/entrypoint.d/25-smoke-fehler.sh:ro" \
    -e CADS_GIT_MODE=github-device \
    -e "CADS_GIT_NAME=$NAME" -e "CADS_GIT_EMAIL=$EMAIL" \
    -e GIT_CONFIG_COUNT=0 -e GIT_CONFIG_KEY_0=credential.helper \
    -e 'GIT_CONFIG_VALUE_0=!f() { h=/run/cads-git-cred/git-credential-broker.py; [ -r "$h" ] || exit 0; exec python3 "$h" "$@"; }; f' \
    "$IMAGE" >/dev/null

started=0
for i in $(seq 1 60); do
    if docker exec "$CONTAINER" curl -fsS -o /dev/null http://127.0.0.1:8080/healthz 2>/dev/null; then started=1; break; fi
    sleep 2
done
logs="$(docker logs "$CONTAINER" 2>&1)"
if [ "$started" = 1 ]; then
    ok "code-server starts although one start script fails"
else
    bad "code-server did not start"; echo "$logs" | tail -30
fi

# ---- precondition: this is the defect ---------------------------------------------------
if docker exec "$CONTAINER" test -x /entrypoint.d/15-user-repo.sh; then
    bad "precondition: the mounted script IS executable in the container - the noexec case is not reproduced"
else
    ok "precondition: test -x on the mounted script fails in the container (noexec), mode $(docker exec "$CONTAINER" stat -c %a /entrypoint.d/15-user-repo.sh)"
fi
docker exec "$CONTAINER" sh -c 'grep " /entrypoint.d/15-user-repo.sh " /proc/mounts' | sed 's/^/     mount: /' || true

# ---- every script ran, in sorted order, visibly ------------------------------------------
want='entrypoint: 10-seed-workspace.sh ok
entrypoint: 15-user-repo.sh ok
entrypoint: 20-logout-config.sh ok
entrypoint: 25-smoke-fehler.sh FEHLER rc=7
entrypoint: 30-git-identity.sh ok
entrypoint: 35-git-credential-cache.sh ok'
got="$(printf '%s\n' "$logs" | grep '^entrypoint: ' || true)"
if [ "$got" = "$want" ]; then
    ok "all six scripts ran in sorted order; the failing one is logged as FEHLER rc=7"
else
    bad "entrypoint lines differ"; echo "--- expected"; echo "$want"; echo "--- got"; echo "$got"
fi
case "$logs" in *"[cads-git]"*) ok "the mounted 15-user-repo.sh produced output ([cads-git] ...)" ;; *) bad "no [cads-git] line: the mounted script did not run" ;; esac
case "$logs" in *"$EMAIL"*) bad "the log contains the e-mail address" ;; *) ok "the log does not contain the e-mail address" ;; esac

# ---- what the mounted script and 30-git-identity.sh were for ------------------------------
helper="$(docker exec "$CONTAINER" git config --global --get-all credential.https://github.com.helper || true)"
case "$helper" in *"oauth -device"*) ok "credential helper for github.com is set (oauth -device)" ;; *) bad "credential helper not set: [$helper]" ;; esac
ident="$(docker exec "$CONTAINER" git -C "$WS" config --local --get user.name)|$(docker exec "$CONTAINER" git -C "$WS" config --local --get user.email)"
if [ "$ident" = "$NAME|$EMAIL" ]; then ok "identity is in the workspace repository"; else bad "identity in the repository: [$ident]"; fi
cache="$(docker exec "$CONTAINER" git config --global --get-all credential.helper || true)"
if [ "$cache" = "cache --timeout=28800" ]; then ok "35-git-credential-cache.sh: logins stay in memory for the session"; else bad "session credential helper: [$cache]"; fi
gident="$(docker exec "$CONTAINER" git config --global --get user.name)|$(docker exec "$CONTAINER" git config --global --get user.email)"
if [ "$gident" = "$NAME|$EMAIL" ]; then ok "30-git-identity.sh added the session default and left the repository values alone"; else bad "global identity: [$gident]"; fi
if docker exec "$CONTAINER" git -C "$WS" commit -q --allow-empty -m "smoke" >/dev/null 2>&1 \
    && [ "$(docker exec "$CONTAINER" git -C "$WS" log -1 --format='%an <%ae>')" = "$NAME <$EMAIL>" ]; then
    ok "git commit works and names the person"
else
    bad "git commit failed or has the wrong author"
fi

# ---- who may put scripts there ---------------------------------------------------------------
owner="$(docker exec "$CONTAINER" stat -c '%U:%G %a' /entrypoint.d)"
if [ "$owner" = "root:root 755" ]; then ok "/entrypoint.d is root:root 755"; else bad "/entrypoint.d is [$owner]"; fi
if docker exec "$CONTAINER" test -w /entrypoint.d; then
    bad "the container user can write to /entrypoint.d"
else
    ok "the container user ($(docker exec "$CONTAINER" id -un)) cannot write to /entrypoint.d"
fi
runner="$(docker exec "$CONTAINER" sh -c 'stat -c "%U %a" "$ENTRYPOINTD" "$ENTRYPOINTD"/* | tr "\n" ";"')"
if [ "$runner" = "root 755;root 755;" ]; then ok "the runner and its directory are root 755"; else bad "runner directory: [$runner]"; fi

# ---- the launcher ran the script itself before the image's start (marker contract) ---------
# Stand-in for the launcher's preamble (behaviour only, not its code): run the
# mounted script through `sh`, write the start time of PID 1 to the marker - also
# when the script failed - and exec the image's own start command. The runner
# then calls the script a second time; that call must do nothing.
docker rm -f "$CONTAINER" >/dev/null
mapfile -t start_cmd < <(docker image inspect -f '{{range .Config.Entrypoint}}{{println .}}{{end}}{{range .Config.Cmd}}{{println .}}{{end}}' "$IMAGE" | sed '/^$/d')
# shellcheck disable=SC2016  # the preamble is expanded inside the container
preamble='sh /entrypoint.d/15-user-repo.sh; echo "[smoke-vorspann] 15-user-repo.sh rc=$?"
sed -n "s/^.*) //p" /proc/1/stat | cut -d" " -f20 > /tmp/.cads-user-repo-erledigt
exec "$@"'
docker run -d --name "$CONTAINER" \
    -v "$MNT/15-user-repo.sh:/entrypoint.d/15-user-repo.sh:ro" \
    -e CADS_GIT_MODE=github-device \
    -e "CADS_GIT_NAME=$NAME" -e "CADS_GIT_EMAIL=$EMAIL" \
    -e GIT_CONFIG_COUNT=0 \
    --entrypoint sh "$IMAGE" -c "$preamble" vorspann "${start_cmd[@]}" >/dev/null
for i in $(seq 1 60); do
    docker exec "$CONTAINER" curl -fsS -o /dev/null http://127.0.0.1:8080/healthz 2>/dev/null && break
    sleep 2
done
logs2="$(docker logs "$CONTAINER" 2>&1)"
want2='entrypoint: 10-seed-workspace.sh ok
entrypoint: 15-user-repo.sh ok
entrypoint: 20-logout-config.sh ok
entrypoint: 30-git-identity.sh ok
entrypoint: 35-git-credential-cache.sh ok'
got2="$(printf '%s\n' "$logs2" | grep '^entrypoint: ' || true)"
if [ "$got2" = "$want2" ]; then
    ok "marker: the runner calls 15-user-repo.sh and logs it as ok"
else
    bad "marker: entrypoint lines differ"; echo "--- expected"; echo "$want2"; echo "--- got"; echo "$got2"
fi
case "$logs2" in *"[smoke-vorspann] 15-user-repo.sh rc=0"*) ok "marker: the preamble ran the script" ;; *) bad "marker: the preamble did not run the script" ;; esac
runs="$(printf '%s\n' "$logs2" | grep -c '^\[cads-git\]' || true)"
if [ "$runs" = 1 ]; then ok "marker: the script body ran exactly once (preamble), not again in the runner"; else bad "marker: [cads-git] lines: $runs (want 1)"; fi
case "$logs2" in *"[cads-start]"*) ok "marker: the runner's call says why it does nothing ([cads-start] ...)" ;; *) bad "marker: no [cads-start] line from the second call" ;; esac
if docker exec "$CONTAINER" test -e /tmp/.cads-user-repo-erledigt; then bad "marker: still there - not used up"; else ok "marker: used up by the runner's call"; fi
helper2="$(docker exec "$CONTAINER" git config --global --get-all credential.https://github.com.helper || true)"
if [ "$helper2" = "$(printf '\ncache --timeout=28800\noauth -device')" ]; then ok "marker: credential helper set once, no duplicate entries"; else bad "marker: helper entries: [$helper2]"; fi
ident2="$(docker exec "$CONTAINER" git -C "$WS" config --local --get user.name)|$(docker exec "$CONTAINER" git -C "$WS" config --local --get user.email)"
if [ "$ident2" = "$NAME|$EMAIL" ]; then ok "marker: identity is set"; else bad "marker: identity [$ident2]"; fi
if docker exec "$CONTAINER" sh /entrypoint.d/15-user-repo.sh 2>&1 | grep -q '^\[cads-git\]'; then
    ok "marker: a later call by hand runs again"
else
    bad "marker: a later call by hand did nothing"
fi
case "$logs2" in *"$EMAIL"*) bad "marker: the log contains the e-mail address" ;; *) ok "marker: the log does not contain the e-mail address" ;; esac

if [ "$fails" -gt 0 ]; then echo "$fails check(s) failed"; echo "--- container log"; echo "$logs" | tail -40; echo "--- second container"; echo "$logs2" | tail -30; exit 1; fi
echo "entrypoint smoke test passed"

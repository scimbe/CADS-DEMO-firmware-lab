#!/usr/bin/env bash
# CaDS Firmware Lab - git identity against the built image (docs/GIT-IDENTITY.md).
#
#   e2e/git-identity-smoke.sh <image ref>
#
# Starts the image the way the portal does as far as git is concerned - the
# per-person volume on /home/coder/workspace, CADS_GIT_NAME / CADS_GIT_EMAIL in
# the environment - and checks, without any manual step in the container:
#
#   A  variables set, fresh volume    `git commit --allow-empty` works, the author
#                                     is the person; a second repository works too;
#                                     the log names neither name nor address
#   B  no variables, fresh volume     nothing is configured, commit fails as before
#   C  volume of A, OTHER variables   the identity of A is still there (it lives on
#                                     the volume) and is not replaced
#   D  student sets an own name,      the own name survives
#      container restarts
#
# Needs docker. Creates and removes only the containers and volumes named below.

set -euo pipefail

IMAGE="${1:?usage: git-identity-smoke.sh <image ref>}"
WS=/home/coder/workspace/cads-zero
NAME='Jürgen "Jay" O'\''Neil-Müller'
EMAIL='juergen.lab@example.org'
C_A=gitid-smoke-a C_B=gitid-smoke-b C_C=gitid-smoke-c
V_1=gitid-smoke-ws-1 V_2=gitid-smoke-ws-2

fails=0
ok() { echo "ok - $*"; }
bad() { echo "FAIL - $*"; fails=$((fails + 1)); }
check() { # name expected actual
    if [ "$2" = "$3" ]; then ok "$1"; else bad "$1: expected [$2], got [$3]"; fi
}

cleanup() {
    docker rm -f "$C_A" "$C_B" "$C_C" >/dev/null 2>&1 || true
    docker volume rm "$V_1" "$V_2" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

# start <container> <volume> [docker run options...]
start() {
    local name="$1" volume="$2"; shift 2
    docker run -d --name "$name" -v "$volume:/home/coder/workspace" "$@" "$IMAGE" >/dev/null
    # /healthz answers once code-server runs - and it starts after /entrypoint.d.
    for i in $(seq 1 60); do
        docker exec "$name" curl -fsS -o /dev/null http://127.0.0.1:8080/healthz 2>/dev/null && return 0
        sleep 2
    done
    echo "::error::$name did not become healthy"; docker logs "$name" 2>&1 | tail -30; exit 1
}
g() { local name="$1"; shift; docker exec "$name" git -C "$WS" "$@"; }

# ---- A: variables set, fresh volume ------------------------------------------------
start "$C_A" "$V_1" -e "CADS_GIT_NAME=$NAME" -e "CADS_GIT_EMAIL=$EMAIL"
if g "$C_A" commit -q --allow-empty -m "smoke: erster Commit" >/dev/null 2>&1; then
    ok "A: git commit --allow-empty works without a manual step"
else
    bad "A: git commit --allow-empty failed: $(g "$C_A" commit --allow-empty -m x 2>&1 | head -3)"
fi
check "A: the commit's author is the person" "$NAME <$EMAIL>" "$(g "$C_A" log -1 --format='%an <%ae>')"
check "A: stored in the repository config (on the volume)" "$NAME|$EMAIL" \
    "$(g "$C_A" config --local --get user.name)|$(g "$C_A" config --local --get user.email)"
if docker exec "$C_A" sh -c 'git init -q /tmp/zweites && git -C /tmp/zweites commit -q --allow-empty -m x' >/dev/null 2>&1; then
    ok "A: a second repository created in the session can commit too"
else
    bad "A: commit in a second repository failed"
fi
logs="$(docker logs "$C_A" 2>&1)"
case "$logs" in *"[cads-git-identity] git-Identitaet gesetzt"*) ok "A: the log says the identity was set" ;; *) bad "A: no '[cads-git-identity] git-Identitaet gesetzt' in the log" ;; esac
case "$logs" in *"$EMAIL"*|*"Jürgen"*) bad "A: the log contains the name or the address" ;; *) ok "A: the log contains neither name nor address" ;; esac

# ---- B: no variables, fresh volume --------------------------------------------------
start "$C_B" "$V_2"
check "B: nothing configured" "|" "$(g "$C_B" config --get user.name || true)|$(g "$C_B" config --get user.email || true)"
if g "$C_B" commit -q --allow-empty -m x >/dev/null 2>&1; then
    bad "B: commit works without an identity - the baseline of this test is gone"
else
    ok "B: without the variables git behaves as before (commit refused)"
fi
case "$(docker logs "$C_B" 2>&1)" in *"[cads-git-identity] git-Identitaet unveraendert"*) ok "B: the log says unchanged" ;; *) bad "B: no 'unveraendert' in the log" ;; esac

# ---- C: the volume of A in a new container, other variables --------------------------
docker rm -f "$C_A" >/dev/null
start "$C_C" "$V_1" -e "CADS_GIT_NAME=Anderer Name" -e "CADS_GIT_EMAIL=anders@example.org"
check "C: after a restart the identity is still in the repository, not replaced" "$NAME|$EMAIL" \
    "$(g "$C_C" config --local --get user.name)|$(g "$C_C" config --local --get user.email)"
if g "$C_C" commit -q --allow-empty -m "smoke: nach Neustart" >/dev/null 2>&1; then
    ok "C: commit works in the new container"
else
    bad "C: commit failed in the new container"
fi

# ---- D: an own name survives a restart -----------------------------------------------
g "$C_C" config --local user.name "Selbst Gewählt"
docker restart "$C_C" >/dev/null
for i in $(seq 1 60); do
    docker exec "$C_C" curl -fsS -o /dev/null http://127.0.0.1:8080/healthz 2>/dev/null && break
    sleep 2
done
check "D: a name the student set is kept" "Selbst Gewählt" "$(g "$C_C" config --local --get user.name)"

if [ "$fails" -gt 0 ]; then echo "$fails check(s) failed"; exit 1; fi
echo "git identity smoke test passed"

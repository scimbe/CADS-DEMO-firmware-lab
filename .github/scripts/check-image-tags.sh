#!/usr/bin/env bash
# trace: AUF-20261011-015
#
# check-image-tags.sh <ref-by-commit> <ref-by-branch> <full-commit>
#
# Run by .github/workflows/image.yml right after the manifest was tagged. Red if
#   - <ref-by-branch> does not point at the same index digest as <ref-by-commit>
#     (two runs of one branch raced and the older one won the moving tag), or
#   - an architecture of <ref-by-commit> does not carry the label
#     org.opencontainers.image.revision=<full-commit>.
# No output from the registry counts as red, never as "nothing to complain about".
set -euo pipefail

by_commit="${1:?usage: check-image-tags.sh <ref-by-commit> <ref-by-branch> <full-commit>}"
by_branch="${2:?usage: check-image-tags.sh <ref-by-commit> <ref-by-branch> <full-commit>}"
want="${3:?usage: check-image-tags.sh <ref-by-commit> <ref-by-branch> <full-commit>}"

fail() { echo "::error::$*"; exit 1; }

[[ "$want" =~ ^[0-9a-f]{40}$ ]] || fail "not a full commit: '$want'"

digest_of() {
  docker buildx imagetools inspect "$1" --format '{{json .Manifest}}' 2>/dev/null \
    | python3 -c 'import json, sys; print(json.load(sys.stdin).get("digest", ""))' 2>/dev/null || true
}

a="$(digest_of "$by_commit")"
b="$(digest_of "$by_branch")"
[[ "$a" =~ ^sha256:[0-9a-f]{64}$ ]] || fail "no index digest for $by_commit (got '$a')"
[[ "$b" =~ ^sha256:[0-9a-f]{64}$ ]] || fail "no index digest for $by_branch (got '$b')"
[ "$a" = "$b" ] || fail "$by_branch points at $b, but this run built $by_commit = $a"
echo "digest: $by_branch = $by_commit = $a"

images="$(docker buildx imagetools inspect "$by_commit" --format '{{json .Image}}' 2>/dev/null || true)"
[ -n "$images" ] || fail "no image config for $by_commit"
IMAGES="$images" python3 - "$want" <<'PY' || fail "org.opencontainers.image.revision is not $want on every architecture of $by_commit"
import json, os, sys
want = sys.argv[1]
try:
    images = json.loads(os.environ["IMAGES"])
except ValueError:
    print("image config is not JSON")
    sys.exit(1)
if not isinstance(images, dict) or not images:
    print("image config is empty")
    sys.exit(1)
if "config" in images:            # single-platform shape
    images = {"single": images}
bad = 0
for plat, img in sorted(images.items()):
    labels = (img or {}).get("config", {}).get("Labels", {}) or {}
    got = labels.get("org.opencontainers.image.revision", "")
    print(f"{plat}: org.opencontainers.image.revision={got}")
    bad += got != want
sys.exit(1 if bad else 0)
PY
echo "revision: $want on all architectures"

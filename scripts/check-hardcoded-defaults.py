#!/usr/bin/env python3
"""Fail if a tracked file hard-codes the board's network defaults.

The single source of the build-time defaults is firmware.conf in cads-zero
(plus the lab overlay image/firmware-lab.conf). Course text, shims, tasks and
e2e scripts must name the key (net.ip, ...) or call
scripts/cads_firmware_conf.py in the workspace, never repeat the value.

Flags the legacy default network (192.168.33.x, "192, 168, 33", "192u << 24",
the hex c0a8210a) and, when image/firmware-lab.conf sets net.ip/net.gateway,
those addresses too. Reasoned exceptions go into ALLOWED.

    python3 scripts/check-hardcoded-defaults.py
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OVERLAY = ROOT / "image" / "firmware-lab.conf"

ALLOWED = {
    "scripts/check-hardcoded-defaults.py": "this check",
    "image/firmware-lab.conf": "the lab overlay is where an address is meant to be set",
}

LEGACY = [
    re.compile(r"192\.168\.33\.\d"),
    re.compile(r"192,\s*168,\s*33\b"),
    re.compile(r"\b192u\s*<<\s*24"),
    re.compile(r"\bc0a8210a\b", re.I),
]


def overlay_patterns():
    pats = []
    if OVERLAY.is_file():
        for line in OVERLAY.read_text().splitlines():
            line = line.split("#", 1)[0].strip()
            m = re.match(r"^net\.(ip|gateway)\s*=\s*(\d+)\.(\d+)\.(\d+)\.(\d+)$", line)
            if m:
                pats.append(re.compile(r"\b" + r"\.".join(m.groups()[1:]).replace(".", r"\.") + r"\b"))
    return pats


def main():
    pats = LEGACY + overlay_patterns()
    files = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True,
                           check=True).stdout.splitlines()
    problems = []
    for rel in files:
        if rel in ALLOWED:
            continue
        p = ROOT / rel
        try:
            text = p.read_text()
        except (UnicodeDecodeError, OSError):
            continue
        for n, line in enumerate(text.splitlines(), 1):
            if any(r.search(line) for r in pats):
                problems.append(f"{rel}:{n}: hard-coded board default: {line.strip()[:100]}")
    if problems:
        print("hard-coded board defaults found (name the key from firmware.conf instead, or add a "
              "reasoned ALLOWED entry):", file=sys.stderr)
        print("\n".join(problems), file=sys.stderr)
        return 1
    print(f"ok: no hard-coded board defaults ({len(files)} tracked files checked)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

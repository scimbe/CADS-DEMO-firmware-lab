"""Shared fixture: run a shim as a real subprocess against the mock bridge."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import unittest
from pathlib import Path

from mock_bridge import MockBridge

REPO_ROOT = Path(__file__).resolve().parents[2]
SHIM_DIR = REPO_ROOT / "image" / "shims"


def free_closed_port() -> int:
    """A port nothing listens on (bound then released) for 'bridge offline' tests."""
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class ShimTestCase(unittest.TestCase):
    shim: str = ""

    def setUp(self) -> None:
        self.bridge = MockBridge().start()
        self.addCleanup(self.bridge.stop)

    def run_shim(self, *args: str, bridge_url: str | None = None, cwd: Path | None = None):
        env = dict(os.environ)
        env["CADS_BRIDGE_URL"] = bridge_url or self.bridge.url
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        return subprocess.run(
            [sys.executable, str(SHIM_DIR / self.shim), *args],
            capture_output=True,
            text=True,
            env=env,
            cwd=str(cwd or REPO_ROOT),
            timeout=30,
        )

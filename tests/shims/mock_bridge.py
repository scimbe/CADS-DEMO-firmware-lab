"""A tiny stand-in for cads-board-bridge's HTTP shim API (SPEC.md §3.2).

Records every request so tests can assert on method, path, headers and body,
and lets a test script the next responses (status code + body).
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer

PROBE_TEXT = """Found 1 stlink programmers
  version:    V2J37S26
  serial:     066FFF565282494867161033
  flash:      2097152 (pagesize: 16384)
  sram:       196608
  chipid:     0x419
  dev-type:   STM32F42x_F43x
"""


@dataclass
class Recorded:
    method: str
    path: str
    headers: dict[str, str]
    body: bytes


@dataclass
class Script:
    """Per-path canned responses; default is 200 with a JSON ok for POSTs."""

    responses: dict[str, tuple[int, bytes, str]] = field(default_factory=dict)

    def set(self, path_prefix: str, status: int, body: bytes, content_type: str = "application/json"):
        self.responses[path_prefix] = (status, body, content_type)

    def lookup(self, path: str):
        for prefix, resp in self.responses.items():
            if path.startswith(prefix):
                return resp
        return None


class MockBridge:
    def __init__(self) -> None:
        self.requests: list[Recorded] = []
        self.script = Script()
        bridge = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_args):  # keep unittest output quiet
                pass

            def _record(self, body: bytes) -> None:
                bridge.requests.append(
                    Recorded(self.command, self.path, {k.lower(): v for k, v in self.headers.items()}, body)
                )

            def _reply(self, default_status: int, default_body: bytes, default_ct: str) -> None:
                scripted = bridge.script.lookup(self.path)
                status, body, ct = scripted if scripted else (default_status, default_body, default_ct)
                self.send_response(status)
                self.send_header("Content-Type", ct)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):
                self._record(b"")
                if self.path.startswith("/probe"):
                    self._reply(200, PROBE_TEXT.encode(), "text/plain")
                elif self.path.startswith("/status"):
                    self._reply(200, b'{"connected":true,"core":"halted","gdbClients":0}', "application/json")
                else:
                    self._reply(404, b'{"ok":false,"error":"not found"}', "application/json")

            def do_POST(self):
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b""
                self._record(body)
                if self.path.startswith("/flash") or self.path.startswith("/reset") or self.path.startswith("/halt"):
                    self._reply(200, b'{"ok":true}', "application/json")
                else:
                    self._reply(404, b'{"ok":false,"error":"not found"}', "application/json")

        self._server = HTTPServer(("127.0.0.1", 0), Handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    @property
    def url(self) -> str:
        host, port = self._server.server_address[:2]
        return f"http://{host}:{port}"

    def start(self) -> "MockBridge":
        self._thread.start()
        return self

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=5)

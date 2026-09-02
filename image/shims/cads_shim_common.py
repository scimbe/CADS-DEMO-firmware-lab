"""Shared HTTP plumbing for the CaDS lab's st-flash / st-info shims.

The real stlink tools talk USB. Inside the lab container there is no USB: the
board sits at the student's own computer and is driven by the cads-probe web
extension in the browser. cads-board-bridge (Node extension host) exposes that
probe as a small HTTP API on 127.0.0.1:3335 (SPEC.md §3.2); these shims turn the
familiar command lines into calls against it, so cads-zero's own scripts and
docs keep working unchanged.

Standard library only - this runs on the image's system python3 with nothing
installed, and it must never grow a dependency.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_BRIDGE_URL = "http://127.0.0.1:3335"
OFFLINE_MESSAGE = (
    "Board-Bridge nicht aktiv – Board im Browser verbinden (CaDS Board Panel)"
)

# SPEC.md §1 / cads-zero docs/SAFETY.md: firmware lives in flash bank 1 only.
FLASH_BASE = 0x08000000
FLASH_LIMIT = 0x08100000  # exclusive


class BridgeOffline(Exception):
    """The bridge's HTTP port is not listening (no board connected in the browser)."""


class BridgeError(Exception):
    """The bridge answered, but with an error."""


def bridge_url() -> str:
    return os.environ.get("CADS_BRIDGE_URL", DEFAULT_BRIDGE_URL).rstrip("/")


def _decode_error_body(body: bytes, fallback: str) -> str:
    text = body.decode("utf-8", "replace").strip()
    if not text:
        return fallback
    try:
        parsed = json.loads(text)
    except ValueError:
        return text
    if isinstance(parsed, dict):
        for key in ("error", "message", "detail"):
            if isinstance(parsed.get(key), str):
                return parsed[key]
    return text


def request(
    method: str,
    path: str,
    body: bytes | None = None,
    content_type: str | None = None,
    timeout: float = 30.0,
) -> bytes:
    """Perform one HTTP call against the bridge and return the response body.

    Raises BridgeOffline when nothing listens on the bridge port and BridgeError
    for any HTTP error status, with the bridge's own message when it sent one.
    """
    url = bridge_url() + path
    req = urllib.request.Request(url, data=body, method=method)
    if content_type:
        req.add_header("Content-Type", content_type)
    req.add_header("User-Agent", "cads-shim/1.0")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (loopback only)
            return resp.read()
    except urllib.error.HTTPError as exc:
        payload = exc.read() if hasattr(exc, "read") else b""
        raise BridgeError(_decode_error_body(payload, f"HTTP {exc.code} {exc.reason}")) from None
    except urllib.error.URLError as exc:
        reason = exc.reason
        if isinstance(reason, (ConnectionRefusedError, ConnectionResetError, OSError)):
            raise BridgeOffline() from None
        raise BridgeOffline() from None
    except (ConnectionRefusedError, ConnectionResetError, TimeoutError):
        raise BridgeOffline() from None


def check_result(body: bytes) -> str | None:
    """Interpret a 2xx body: JSON {ok:false,error} still counts as failure.

    Returns the error string if the bridge reported one, else None.
    """
    text = body.decode("utf-8", "replace").strip()
    if not text:
        return None
    try:
        parsed = json.loads(text)
    except ValueError:
        return None
    if isinstance(parsed, dict) and parsed.get("ok") is False:
        err = parsed.get("error")
        return err if isinstance(err, str) and err else "bridge reported failure"
    return None


def fail(message: str, code: int = 1) -> int:
    print(f"error: {message}", file=sys.stderr)
    return code


def fail_offline() -> int:
    print(OFFLINE_MESSAGE, file=sys.stderr)
    return 1

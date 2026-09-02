#!/usr/bin/env python3
"""Stub for the bunsenbrenner.org gate (LOCAL TESTS ONLY - never deploy).

Mimics the two endpoints Caddy's forward_auth relies on:

    GET /gate/check   200 + X-Gate-Email   when the request carries the cookie
                      302 -> /gate/start   otherwise (forward_auth relays the redirect)
    GET /gate/logout  clears the cookie

plus a tiny login form (``/gate/start`` -> ``/gate/login?email=...``) that sets the
cookie.  Cookies ignore the port, so a cookie set by 127.0.0.1:<stub> is also sent
to 127.0.0.1:3000, where Caddy forwards it to /gate/check.  Stdlib only.
"""
import html
import os
import sys
import urllib.parse
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

COOKIE = "fl_stub_email"


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("stub-gate %s %s\n" % (self.command, self.path))

    def _send(self, status, body=b"", headers=None):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (headers or []):
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _cookie_email(self):
        c = SimpleCookie(self.headers.get("Cookie", ""))
        return c[COOKIE].value if COOKIE in c else ""

    def _public_base(self):
        # Caddy forwards the ORIGINAL Host (the gate's), so the browser-facing address of this
        # stub must be configured, not derived from the request.
        return os.environ.get("STUB_PUBLIC", f"http://127.0.0.1:{os.environ.get('STUB_PORT', '3900')}")

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == "/gate/check":
            email = self._cookie_email()
            if email:
                self._send(200, b"ok", [("X-Gate-Email", email)])
                return
            proto = self.headers.get("X-Forwarded-Proto", "http")
            host = self.headers.get("X-Forwarded-Host", "127.0.0.1:3000")
            uri = self.headers.get("X-Forwarded-Uri", "/")
            rd = urllib.parse.quote(f"{proto}://{host}{uri}", safe="")
            self._send(302, b"", [("Location", f"{self._public_base()}/gate/start?rd={rd}")])
        elif u.path == "/gate/start":
            rd = html.escape((q.get("rd") or [os.environ.get("STUB_RETURN", "http://127.0.0.1:3000/")])[0])
            page = f"""<!doctype html><title>Stub gate</title>
<h1>Stub gate (local test)</h1>
<form action="/gate/login" method="get">
  <input type="hidden" name="rd" value="{rd}">
  <label>E-Mail <input name="email" id="email" autofocus></label>
  <button type="submit" id="login">Sign in</button>
</form>"""
            self._send(200, page.encode())
        elif u.path == "/gate/login":
            email = (q.get("email") or [""])[0].strip()
            rd = (q.get("rd") or ["/"])[0]
            if not email:
                self._send(400, b"email missing")
                return
            self._send(302, b"", [("Set-Cookie", f"{COOKIE}={email}; Path=/; HttpOnly"),
                                  ("Location", rd)])
        elif u.path == "/gate/logout":
            self._send(302, b"", [("Set-Cookie", f"{COOKIE}=; Path=/; Max-Age=0"),
                                  ("Location", f"{self._public_base()}/gate/start")])
        else:
            self._send(404, b"not found")


def main():
    host = os.environ.get("STUB_BIND", "127.0.0.1")
    port = int(os.environ.get("STUB_PORT", "3900"))
    srv = ThreadingHTTPServer((host, port), H)
    srv.daemon_threads = True
    sys.stderr.write(f"stub-gate listening on {host}:{port}\n")
    srv.serve_forever()


if __name__ == "__main__":
    main()

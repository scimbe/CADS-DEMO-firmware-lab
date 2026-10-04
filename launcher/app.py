#!/usr/bin/env python3
"""fl-launcher: session launcher and logout overlay for the Firmware Lab (code-server).

trace: AUF-20261004-003

Why this exists (AUF-20260928-019, INC-20260928-005): the lab image runs code-server with
``--auth none`` behind the Keycloak gate, so the workbench has no logout control at all - a
student can only close the tab, which leaves the container *and* the SSO session alive.  The
desktop image solved this with a visible ``#cads-logout-link``; this module brings the same
control to the code-server lab **without a new image release**.  The launcher is the upstream
Caddy dials for a session: it injects the logout entry into the workbench document and, on
click, walks the chain that already exists at the edge

    forwardAuth identity (X-Gate-Email)
      -> GET|POST /internal/stop                     (this module)
      -> container stop   docker compose -p fl-<slug> stop
      -> profile snapshot tar of the mounted profile dir (after the stop, so code-server
                                                          has flushed its state on SIGTERM)
      -> local session cookies cleared               (revoke)
      -> 302 to the edge oauth2-proxy /oauth2/sign_out?rd=<public url>
      -> login page

Deployment is a one-line change on the gate: point ``FL_BROKER_ADDR`` at this process.  The
launcher speaks the broker's ``/_broker/{healthz,enter,resolve,admin}`` contract and keeps the
broker's slug derivation, container name, volume name and labels, so deploy/multiuser/
Caddyfile.gate is unchanged and a rollback is "point FL_BROKER_ADDR back at fl-broker, or
redeploy the previous FL_IMAGE_TAG" - both tags are reported by /_broker/healthz and
/_broker/admin so an operator can see what is live before and after a swap.

Unlike fl-broker, ``resolve`` answers with the launcher's own per-session port instead of the
container port: the document response has to pass through this process for the overlay to be
injected.  Asset requests are proxied, WebSocket upgrades (the workbench connection) are
spliced byte for byte, so nothing about code-server changes.

Stdlib only (Python >= 3.10).  Every subprocess call is an argument list with a timeout; no
shell.  Logs go to stderr and never contain an e-mail address, only its hash/slug.
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable, Optional

CONTAINER_PREFIX = "fl-"          # same names as fl_broker.py, so `docker ps` stays readable
VOLUME_PREFIX = "fl-ws-"
PROJECT_PREFIX = "fl-"
CONTAINER_PORT = "8080"
COMPOSE_SERVICE = "code-server"

# ----------------------------------------------------------------- logout overlay (the slice)
# The entry a student actually sees.  Same id as the desktop image (#cads-logout-link) so the
# Playwright check and the operator runbook can use one selector for both labs.
LOGOUT_LINK_ID = "cads-logout-link"
LOGOUT_LABEL = "Abmelden"
LOGOUT_PATH = "/internal/stop"
OVERLAY_CSS_PATH = "/internal/logout.css"
OVERLAY_JS_PATH = "/internal/logout.js"
# Workbench session paths the launcher answers itself instead of proxying.
INTERNAL_PATHS = (LOGOUT_PATH, OVERLAY_CSS_PATH, OVERLAY_JS_PATH)

# The workbench document carries a CSP without 'unsafe-inline', so the overlay must not inject
# an inline <style>/<script>.  Both files are served from this process under the session path,
# which 'self' already covers.  The anchor itself is plain markup and works without JavaScript;
# the script only re-attaches it when the workbench re-renders <body>.
OVERLAY_CSS = """\
#cads-logout-link {
  position: fixed;
  top: 2px;
  right: 8px;
  z-index: 2147483647;
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  background: #8b1a1a;
  color: #fff;
  font: 12px/18px system-ui, sans-serif;
  text-decoration: none;
}
#cads-logout-link:hover { background: #a82121; }
"""


def overlay_js(base_path: str) -> str:
    """Re-attach the logout entry if the workbench replaces the document body."""
    base = base_path.rstrip("/")
    return (
        "(function () {\n"
        '  var ID = %s;\n'
        '  var HREF = %s;\n'
        '  var LABEL = %s;\n'
        "  function attach() {\n"
        "    if (document.getElementById(ID)) { return; }\n"
        '    var a = document.createElement("a");\n'
        "    a.id = ID;\n"
        "    a.href = HREF;\n"
        "    a.textContent = LABEL;\n"
        '    a.title = "Sitzung beenden und abmelden";\n'
        '    a.setAttribute("rel", "nofollow");\n'
        "    (document.body || document.documentElement).appendChild(a);\n"
        "  }\n"
        "  attach();\n"
        '  document.addEventListener("DOMContentLoaded", attach);\n'
        "  setInterval(attach, 2000);\n"
        "})();\n"
        % (json.dumps(LOGOUT_LINK_ID), json.dumps(base + LOGOUT_PATH), json.dumps(LOGOUT_LABEL))
    )


def logout_overlay(base_path: str) -> str:
    """Markup appended to the workbench document: stylesheet, the visible entry, re-attach script."""
    base = base_path.rstrip("/")
    return (
        f'<link rel="stylesheet" href="{base}{OVERLAY_CSS_PATH}">'
        f'<a id="{LOGOUT_LINK_ID}" href="{base}{LOGOUT_PATH}"'
        f' title="Sitzung beenden und abmelden" rel="nofollow">{LOGOUT_LABEL}</a>'
        f'<script src="{base}{OVERLAY_JS_PATH}" defer></script>'
    )


def is_html(content_type: str) -> bool:
    return (content_type or "").split(";", 1)[0].strip().lower() == "text/html"


def inject_logout(html: str, snippet: str) -> str:
    """Insert the overlay before the last </body>.  Idempotent - a reload must not stack entries."""
    if LOGOUT_LINK_ID in html:
        return html
    idx = html.lower().rfind("</body>")
    if idx == -1:
        return html + snippet
    return html[:idx] + snippet + html[idx:]


# --------------------------------------------------------------------------------------- utils

def log(event: str, **fields) -> None:
    ts = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    extra = " ".join(f"{k}={v}" for k, v in fields.items())
    sys.stderr.write(f"{ts} fl-launcher {event}{(' ' + extra) if extra else ''}\n")
    sys.stderr.flush()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_hash(email: str) -> str:
    return hashlib.sha256(normalize_email(email).encode("utf-8")).hexdigest()


def slug_for(email: str) -> str:
    """First 12 hex chars of SHA-256(lowercase(email)) - identical to fl_broker.slug_for."""
    return email_hash(email)[:12]


def is_slug(value: str) -> bool:
    return len(value) == 12 and all(c in "0123456789abcdef" for c in value)


def iso(ts: Optional[float]) -> Optional[str]:
    if ts is None:
        return None
    return _dt.datetime.fromtimestamp(ts, _dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class LauncherError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


# -------------------------------------------------------------------------------------- config

class Config:
    def __init__(self, env: Optional[dict] = None):
        e = os.environ if env is None else env
        here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.bind_host = e.get("FL_BIND", "127.0.0.1")
        # 3100 is fl-broker's port on purpose: the launcher replaces it on the services host
        # (one or the other, never both), so FL_BROKER_ADDR in the gate stays as it is.
        self.bind_port = int(e.get("FL_PORT", "3100"))
        self.compose_file = e.get(
            "FL_COMPOSE_FILE", os.path.join(here, "compose", "compose.user.code-server.yml")
        )
        self.image_repo = e.get("FL_IMAGE_REPO", "ghcr.io/scimbe/cads-firmware-lab")
        # Deployable tag and the tag to go back to; both are shown by /healthz and /admin so a
        # rollback is a visible FL_IMAGE_TAG swap plus `compose up -d` per session.
        self.image_tag = e.get("FL_IMAGE_TAG", "next")
        self.rollback_tag = e.get("FL_IMAGE_TAG_ROLLBACK", "")
        self.mem = e.get("FL_MEM", "2g")
        self.cpus = e.get("FL_CPUS", "2")
        self.pids_limit = e.get("FL_PIDS_LIMIT", "2048")
        self.max_sessions = int(e.get("FL_MAX_SESSIONS", "40"))
        self.admin_emails = {
            normalize_email(x) for x in e.get("FL_ADMIN_EMAILS", "").split(",") if x.strip()
        }
        self.upstream_host = e.get("FL_UPSTREAM_HOST", "127.0.0.1")
        self.publish_host = e.get("FL_PUBLISH_HOST", "127.0.0.1")
        self.workspace_dir = e.get("FL_WORKSPACE_DIR", "/home/coder/workspace/cads-zero")
        self.session_path_prefix = e.get("FL_SESSION_PATH_PREFIX", "/s")
        # Per-student code-server profile: bind-mounted into the container by the compose
        # overlay, snapshotted here on logout (Profilsicherung).
        self.profile_root = e.get("FL_PROFILE_DIR", "/var/lib/cads-firmware-lab/profiles")
        self.profile_backup_root = e.get(
            "FL_PROFILE_BACKUP_DIR", "/var/lib/cads-firmware-lab/profile-backups"
        )
        # Edge logout: oauth2-proxy sign_out ends the SSO session for real (INC-20260928-005);
        # closing the tab or dropping our own cookie would not.
        self.public_url = e.get("CT_GATE_PUBLIC_URL", "https://bunsenbrenner.org")
        self.sign_out_url = e.get("FL_SIGN_OUT_URL", self.public_url.rstrip("/") + "/oauth2/sign_out")
        self.after_logout_url = e.get("FL_AFTER_LOGOUT_URL", self.public_url)
        self.session_cookies = [
            c.strip()
            for c in e.get("FL_SESSION_COOKIES", "_oauth2_proxy,_oauth2_proxy_csrf").split(",")
            if c.strip()
        ]
        # No FL_EXTRA_CODE_ARGS equivalent: code-server's flags live in the compose overlay's
        # `command:` now, which is the one place an operator has to look at.
        self.health_timeout_s = float(e.get("FL_HEALTH_TIMEOUT_S", "60"))
        self.docker_timeout_s = float(e.get("FL_DOCKER_TIMEOUT_S", "30"))

    @property
    def image(self) -> str:
        return f"{self.image_repo}:{self.image_tag}"


def sign_out_url(cfg: Config) -> str:
    """Edge sign-out URL with the post-logout landing page as rd=."""
    sep = "&" if "?" in cfg.sign_out_url else "?"
    return f"{cfg.sign_out_url}{sep}rd={urllib.parse.quote(cfg.after_logout_url, safe='')}"


def clear_cookie_headers(cfg: Config) -> list[tuple[str, str]]:
    """Revoke the gate session locally as well, so a cached 302 cannot resurrect it."""
    return [
        ("Set-Cookie", f"{name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
        for name in cfg.session_cookies
    ]


# -------------------------------------------------------------------------------- subprocesses

def run_argv(args: list[str], timeout: float, env: Optional[dict] = None) -> subprocess.CompletedProcess:
    """Run an argument list without a shell.  Raises LauncherError on timeout/missing binary."""
    try:
        return subprocess.run(
            args, capture_output=True, text=True, timeout=timeout, check=False, env=env
        )
    except subprocess.TimeoutExpired:
        raise LauncherError(503, f"{args[0]} did not answer in time")
    except FileNotFoundError:
        raise LauncherError(503, f"{args[0]} not available")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """A 302 from code-server belongs to the browser, not to the proxy."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)


def _unlink(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        pass


def http_health_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


# --------------------------------------------------------------------------------------- state

class Session:
    __slots__ = ("slug", "email_hash", "status", "port", "proxy_port", "last_seen", "verified_at")

    def __init__(self, slug: str, email_hash_: str = ""):
        self.slug = slug
        self.email_hash = email_hash_
        self.status = "missing"            # running | stopped | missing
        self.port: Optional[int] = None    # published code-server port
        self.proxy_port: Optional[int] = None  # launcher listener that carries the overlay
        self.last_seen: float = 0.0
        self.verified_at: float = 0.0

    @property
    def name(self) -> str:
        return CONTAINER_PREFIX + self.slug

    @property
    def project(self) -> str:
        return PROJECT_PREFIX + self.slug

    @property
    def volume(self) -> str:
        return VOLUME_PREFIX + self.slug

    def to_json(self) -> dict:
        return {
            "slug": self.slug,
            "status": self.status,
            "port": self.port,
            "proxyPort": self.proxy_port,
            "lastSeen": iso(self.last_seen) if self.last_seen else None,
        }


class Launcher:
    def __init__(
        self,
        cfg: Config,
        runner: Callable[..., subprocess.CompletedProcess] = run_argv,
        health: Callable[[str], bool] = http_health_ok,
        clock: Callable[[], float] = time.time,
        proxy_factory: Optional[Callable[[str], int]] = None,
    ):
        self.cfg = cfg
        self._run = runner
        self._health = health
        self._clock = clock
        self._proxy_factory = proxy_factory or self._start_session_proxy
        self._lock = threading.Lock()
        self._slug_locks: dict[str, threading.Lock] = {}
        self._proxies: dict[str, ThreadingHTTPServer] = {}
        self.sessions: dict[str, Session] = {}

    # ---- helpers ------------------------------------------------------------

    def _slug_lock(self, slug: str) -> threading.Lock:
        with self._lock:
            lk = self._slug_locks.get(slug)
            if lk is None:
                lk = self._slug_locks[slug] = threading.Lock()
            return lk

    def _session(self, slug: str, email_hash_: str = "") -> Session:
        with self._lock:
            s = self.sessions.get(slug)
            if s is None:
                s = self.sessions[slug] = Session(slug, email_hash_)
            elif email_hash_ and not s.email_hash:
                s.email_hash = email_hash_
            return s

    def running_count(self) -> int:
        with self._lock:
            return sum(1 for s in self.sessions.values() if s.status == "running")

    def base_path(self, slug: str) -> str:
        return f"{self.cfg.session_path_prefix.rstrip('/')}/{slug}"

    def profile_dir(self, slug: str) -> str:
        return os.path.join(self.cfg.profile_root, slug)

    def docker(self, *args: str, timeout: Optional[float] = None,
               env: Optional[dict] = None) -> subprocess.CompletedProcess:
        return self._run(["docker", *args], timeout or self.cfg.docker_timeout_s, env)

    def _docker_ok(self, *args: str, timeout: Optional[float] = None,
                   env: Optional[dict] = None) -> str:
        cp = self.docker(*args, timeout=timeout, env=env)
        if cp.returncode != 0:
            err = (cp.stderr or "").strip().splitlines()
            raise LauncherError(503, f"docker {args[0]} failed: {err[-1] if err else cp.returncode}")
        return cp.stdout

    # ---- compose ------------------------------------------------------------

    def compose_env(self, sess: Session) -> dict:
        """Values the compose overlay interpolates.  No secret is ever put in an argument list."""
        env = dict(os.environ)
        cfg = self.cfg
        env.update({
            "FL_SLUG": sess.slug,
            "FL_EMAIL_HASH": sess.email_hash,
            "FL_IMAGE_REPO": cfg.image_repo,
            "FL_IMAGE_TAG": cfg.image_tag,
            "FL_PUBLISH_HOST": cfg.publish_host,
            "FL_PROFILE_DIR": self.profile_dir(sess.slug),
            "FL_WORKSPACE_DIR": cfg.workspace_dir,
            "FL_MEM": cfg.mem,
            "FL_CPUS": cfg.cpus,
            "FL_PIDS_LIMIT": cfg.pids_limit,
        })
        return env

    def compose_args(self, sess: Session, *rest: str) -> list[str]:
        return ["compose", "--file", self.cfg.compose_file, "--project-name", sess.project, *rest]

    def container_port(self, sess: Session) -> Optional[int]:
        cp = self.docker("port", sess.name, f"{CONTAINER_PORT}/tcp")
        if cp.returncode != 0:
            return None
        for line in cp.stdout.splitlines():
            line = line.strip()
            if not line or "]" in line:          # skip IPv6 lines like [::]:1234
                continue
            _, _, port = line.rpartition(":")
            if port.isdigit():
                return int(port)
        return None

    def is_running(self, sess: Session) -> bool:
        cp = self.docker("inspect", "--format", "{{.State.Running}}", sess.name)
        return cp.returncode == 0 and cp.stdout.strip() == "true"

    # ---- operations ---------------------------------------------------------

    def ensure_session(self, email: str) -> Session:
        """Create/start the caller's container and its overlay listener; returns a live session."""
        slug = slug_for(email)
        sess = self._session(slug, email_hash(email))
        with self._slug_lock(slug):
            now = self._clock()
            if sess.status == "running" and sess.port and sess.proxy_port and self.is_running(sess):
                sess.last_seen = now
                return sess
            if sess.status != "running" and self.running_count() >= self.cfg.max_sessions:
                log("capacity-full", slug=slug, max=self.cfg.max_sessions)
                raise LauncherError(
                    503,
                    f"Labor voll: {self.cfg.max_sessions} aktive Sessions erreicht. "
                    "Bitte spaeter erneut versuchen.",
                )
            os.makedirs(self.profile_dir(slug), exist_ok=True)
            log("up", slug=slug, tag=self.cfg.image_tag)
            self._docker_ok(
                *self.compose_args(sess, "up", "--detach", "--no-build"),
                timeout=self.cfg.docker_timeout_s * 2,
                env=self.compose_env(sess),
            )
            port = self.container_port(sess)
            if not port:
                sess.status = "stopped"
                raise LauncherError(503, "session has no published port")
            sess.port = port
            self.wait_healthy(sess)
            sess.proxy_port = self._proxy_factory(slug)
            sess.status = "running"
            sess.verified_at = sess.last_seen = self._clock()
            log("ready", slug=slug, port=port, proxy=sess.proxy_port)
            return sess

    def wait_healthy(self, sess: Session) -> None:
        url = f"http://{self.cfg.publish_host}:{sess.port}/healthz"
        deadline = self._clock() + self.cfg.health_timeout_s
        while True:
            if self._health(url):
                return
            if self._clock() >= deadline:
                raise LauncherError(503, "session did not become healthy in time")
            time.sleep(0.5)

    def resolve(self, email: str, slug: str) -> Session:
        """forwardAuth check: only the owner of the slug gets the upstream, and gets it started."""
        if not is_slug(slug) or slug_for(email) != slug:
            log("resolve-denied", slug=slug, caller=slug_for(email))
            raise LauncherError(403, "Not your session")
        return self.ensure_session(email)

    def upstream_of(self, sess: Session) -> str:
        """What Caddy dials: this process, so the document passes the overlay injector."""
        return f"{self.cfg.upstream_host}:{sess.proxy_port}"

    def session_upstream(self, slug: str) -> str:
        """What the session proxy dials: the student's code-server container."""
        sess = self._session(slug)
        if not sess.port:
            raise LauncherError(503, "session is not running")
        return f"{self.cfg.publish_host}:{sess.port}"

    def stop_session(self, slug: str) -> None:
        sess = self._session(slug)
        log("stop", slug=slug)
        self._docker_ok(*self.compose_args(sess, "stop", "--timeout", "15"), timeout=45,
                        env=self.compose_env(sess))
        sess.status = "stopped"
        sess.port = None

    def save_profile(self, slug: str) -> Optional[str]:
        """Snapshot the student's code-server profile.  Never fatal: logout must not be blockable."""
        src = self.profile_dir(slug)
        if not os.path.isdir(src):
            log("profile-missing", slug=slug)
            return None
        dest = os.path.join(self.cfg.profile_backup_root, f"{slug}.tar.gz")
        tmp = dest + ".tmp"
        try:
            os.makedirs(self.cfg.profile_backup_root, exist_ok=True)
            cp = self._run(["tar", "-czf", tmp, "-C", src, "."], self.cfg.docker_timeout_s, None)
            if cp.returncode != 0:
                log("profile-save-failed", slug=slug, rc=cp.returncode)
                _unlink(tmp)
                return None
            os.replace(tmp, dest)            # atomic: a crash never leaves a half backup
        except (LauncherError, OSError) as exc:
            log("profile-save-failed", slug=slug, error=type(exc).__name__)
            _unlink(tmp)
            return None
        log("profile-saved", slug=slug)
        return dest

    def logout(self, slug: str) -> str:
        """Stop the container, snapshot the profile, return the URL that ends the SSO session.

        Order matters: the stop comes first so code-server flushes its state on SIGTERM and the
        snapshot is consistent.  Neither step may block the sign-out - a student who cannot reach
        the edge logout would keep a live SSO session (INC-20260928-005).
        """
        with self._slug_lock(slug):
            try:
                self.stop_session(slug)
            except LauncherError as exc:
                log("logout-stop-failed", slug=slug, msg=exc.message)
            self.save_profile(slug)
        self._shutdown_proxy(slug)
        log("logout", slug=slug)
        return sign_out_url(self.cfg)

    def list_sessions(self) -> list[dict]:
        with self._lock:
            sessions = sorted(self.sessions.values(), key=lambda s: s.slug)
        return [s.to_json() for s in sessions]

    # ---- per-session listener ----------------------------------------------

    def _start_session_proxy(self, slug: str) -> int:
        with self._lock:
            srv = self._proxies.get(slug)
        if srv is not None:
            return srv.server_address[1]
        handler = type("BoundSessionHandler", (SessionHandler,), {"launcher": self, "slug": slug})
        srv = ThreadingHTTPServer((self.cfg.publish_host, 0), handler)
        srv.daemon_threads = True
        with self._lock:
            self._proxies[slug] = srv
        threading.Thread(target=srv.serve_forever, name=f"proxy-{slug}", daemon=True).start()
        return srv.server_address[1]

    def _shutdown_proxy(self, slug: str) -> None:
        with self._lock:
            srv = self._proxies.pop(slug, None)
        if srv is None:
            return

        def close() -> None:
            srv.shutdown()          # cannot run inline: logout is handled BY this server
            srv.server_close()

        threading.Thread(target=close, name=f"proxy-stop-{slug}", daemon=True).start()
        sess = self._session(slug)
        sess.proxy_port = None


# ----------------------------------------------------------------------------------- http base

HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
}


class _Base(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "fl-launcher"
    sys_version = ""

    def log_message(self, fmt, *args):      # silenced: we log ourselves, without PII
        return

    def _send(self, status: int, body: bytes = b"", headers: Optional[list] = None,
              content_type: str = "text/plain; charset=utf-8") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (headers or []):
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD" and body:
            self.wfile.write(body)


# --------------------------------------------------------------------------- session proxy http

class SessionHandler(_Base):
    """One listener per session: overlay injection, the logout route, pass-through for the rest."""

    launcher: Launcher
    slug: str

    def _logout(self) -> None:
        location = self.launcher.logout(self.slug)
        log("logout-click", slug=self.slug)
        self._send(302, b"", [("Location", location), *clear_cookie_headers(self.launcher.cfg)])

    def _handle(self) -> None:
        path = urllib.parse.urlsplit(self.path).path
        try:
            if path == LOGOUT_PATH:
                # GET is accepted as well: the entry is a plain link in the workbench document, and
                # the gate authenticates the request - the worst a forged GET can do is log its own
                # owner out.
                self._logout()
                return
            if path == OVERLAY_CSS_PATH:
                self._send(200, OVERLAY_CSS.encode("utf-8"), content_type="text/css; charset=utf-8")
                return
            if path == OVERLAY_JS_PATH:
                body = overlay_js(self.launcher.base_path(self.slug)).encode("utf-8")
                self._send(200, body, content_type="application/javascript; charset=utf-8")
                return
            upstream = self.launcher.session_upstream(self.slug)
            if (self.headers.get("Upgrade") or "").lower() == "websocket":
                self._splice(upstream)
            else:
                self._proxy(upstream)
        except LauncherError as exc:
            self._send(exc.status, exc.message.encode("utf-8"))
        except Exception as exc:  # noqa: BLE001 - never leak a traceback into the workbench
            log("session-error", slug=self.slug, error=type(exc).__name__)
            self._send(502, b"session error")

    def _proxy(self, upstream: str) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP_BY_HOP}
        headers["Host"] = upstream
        # Identity encoding: a gzipped document cannot be injected into.
        headers["Accept-Encoding"] = "identity"
        req = urllib.request.Request(
            f"http://{upstream}{self.path}", data=body, headers=headers, method=self.command
        )
        try:
            resp = _OPENER.open(req, timeout=60)
        except urllib.error.HTTPError as err:
            resp = err
        except OSError:
            self._send(502, b"session not reachable")
            return
        with resp:
            payload = resp.read()
            out = [(k, v) for k, v in resp.headers.items()
                   if k.lower() not in HOP_BY_HOP and k.lower() != "content-length"]
            ctype = resp.headers.get("Content-Type", "")
            if self.command != "HEAD" and is_html(ctype):
                snippet = logout_overlay(self.launcher.base_path(self.slug))
                payload = inject_logout(payload.decode("utf-8", "replace"), snippet).encode("utf-8")
            self.send_response(resp.status)
            for k, v in out:
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)

    def _splice(self, upstream: str) -> None:
        """WebSocket upgrade (the workbench connection): copy bytes both ways, interpret nothing."""
        host, _, port = upstream.rpartition(":")
        try:
            up = socket.create_connection((host, int(port)), timeout=10)
        except OSError:
            self._send(502, b"session not reachable")
            return
        lines = [f"{self.command} {self.path} HTTP/1.1"]
        lines += [f"{k}: {v}" for k, v in self.headers.items() if k.lower() != "host"]
        lines.append(f"Host: {upstream}")
        up.sendall(("\r\n".join(lines) + "\r\n\r\n").encode("latin-1"))
        self.close_connection = True

        def pump(src: socket.socket, dst: socket.socket) -> None:
            try:
                while True:
                    chunk = src.recv(65536)
                    if not chunk:
                        break
                    dst.sendall(chunk)
            except OSError:
                pass
            finally:
                for s in (src, dst):
                    try:
                        s.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass

        t = threading.Thread(target=pump, args=(up, self.connection), daemon=True)
        t.start()
        pump(self.connection, up)
        t.join(timeout=1)
        up.close()

    do_GET = do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = do_OPTIONS = _handle


# -------------------------------------------------------------------------------- control http

class ControlHandler(_Base):
    """The contract Caddyfile.gate already speaks (fl_broker's /_broker/* routes)."""

    launcher: Launcher

    def _identity(self) -> Optional[str]:
        email = normalize_email(self.headers.get("X-Gate-Email", ""))
        return email if email and "@" in email else None

    def _require_identity(self) -> str:
        email = self._identity()
        if not email:
            raise LauncherError(403, "No identity (X-Gate-Email missing)")
        return email

    def _require_admin(self) -> str:
        email = self._require_identity()
        if email not in self.launcher.cfg.admin_emails:
            raise LauncherError(403, "Admin only")
        return email

    def _json(self, status: int, payload: dict) -> None:
        self._send(status, json.dumps(payload, indent=2).encode("utf-8"),
                   content_type="application/json")

    def _route(self, method: str) -> None:
        url = urllib.parse.urlsplit(self.path)
        # /_launcher/* is accepted as an alias so the process can be reached under its own name.
        path = url.path.replace("/_launcher/", "/_broker/", 1)
        qs = urllib.parse.parse_qs(url.query)
        slug = (qs.get("slug") or [""])[0]
        lc = self.launcher
        cfg = lc.cfg
        try:
            if method == "GET" and path == "/_broker/healthz":
                self._json(200, {
                    "ok": True,
                    "running": lc.running_count(),
                    "imageTag": cfg.image_tag,
                    "rollbackTag": cfg.rollback_tag or None,
                    "logoutOverlay": LOGOUT_LINK_ID,
                })
            elif method == "GET" and path == "/_broker/enter":
                sess = lc.ensure_session(self._require_identity())
                loc = (f"{lc.base_path(sess.slug)}/"
                       f"?folder={urllib.parse.quote(cfg.workspace_dir, safe='/')}")
                log("enter", slug=sess.slug)
                self._send(302, b"", [("Location", loc)])
            elif method == "GET" and path == "/_broker/resolve":
                sess = lc.resolve(self._require_identity(), slug)
                self._send(200, b"ok", [
                    ("X-FL-Upstream", lc.upstream_of(sess)),
                    ("X-FL-Port", str(sess.proxy_port)),
                ])
            elif method == "GET" and path == "/_broker/admin":
                self._require_admin()
                self._json(200, {
                    "image": cfg.image,
                    "imageTag": cfg.image_tag,
                    "rollbackTag": cfg.rollback_tag or None,
                    "composeFile": cfg.compose_file,
                    "maxSessions": cfg.max_sessions,
                    "logoutOverlay": LOGOUT_LINK_ID,
                    "sessions": lc.list_sessions(),
                })
            elif method == "POST" and path == "/_broker/admin/stop":
                self._require_admin()
                if not is_slug(slug):
                    raise LauncherError(400, "slug missing or malformed")
                lc.logout(slug)
                log("admin-stop", slug=slug, by=slug_for(self._identity() or ""))
                self._json(200, {"ok": True, "slug": slug})
            else:
                self._send(404, b"Not found")
        except LauncherError as exc:
            log("error", path=path, status=exc.status, msg=exc.message)
            self._send(exc.status, exc.message.encode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            log("internal-error", path=path, error=type(exc).__name__)
            self._send(500, b"internal error")

    def do_GET(self):
        self._route("GET")

    def do_HEAD(self):
        self._route("GET")

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(min(length, 65536))
        self._route("POST")


def make_server(launcher: Launcher, host: str, port: int) -> ThreadingHTTPServer:
    handler = type("BoundControlHandler", (ControlHandler,), {"launcher": launcher})
    srv = ThreadingHTTPServer((host, port), handler)
    srv.daemon_threads = True
    return srv


def main() -> int:
    cfg = Config()
    launcher = Launcher(cfg)
    if not os.path.isfile(cfg.compose_file):
        log("startup-error", msg=f"compose file not found: {cfg.compose_file}")
        return 2
    srv = make_server(launcher, cfg.bind_host, cfg.bind_port)
    log("listening", addr=f"{cfg.bind_host}:{cfg.bind_port}", image=cfg.image,
        rollback_tag=cfg.rollback_tag or "-", logout=LOGOUT_LINK_ID)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

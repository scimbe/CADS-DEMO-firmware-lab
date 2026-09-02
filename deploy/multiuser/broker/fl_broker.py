#!/usr/bin/env python3
"""fl-broker: session broker for the CaDS Firmware Lab multi-user stack.

One code-server container per student, keyed by a slug derived from the
gate-verified identity (``X-Gate-Email``).  The broker is a host process
(no docker.sock in any container), binds loopback only and exposes a small,
closed set of operations:

    GET  /_broker/enter                 ensure session, 302 -> /s/<slug>/
    GET  /_broker/resolve?slug=<slug>   identity <-> slug check, 200 + X-FL-Upstream
    GET  /_broker/healthz
    GET  /_broker/admin                 (FL_ADMIN_EMAILS only) JSON session list
    POST /_broker/admin/stop?slug=      (admin) docker stop
    POST /_broker/admin/wipe?slug=      (admin) stop + rm + volume rm

Caddy does the proxying (forward_auth against /_broker/resolve, then
reverse_proxy to the upstream named in X-FL-Upstream).  See
deploy/multiuser/Caddyfile.gate and docs/MULTIUSER.md.

Stdlib only (Python >= 3.10).  Every docker invocation is an argument list
with a timeout; no shell.  Logs go to stderr and never contain an e-mail
address, only its hash/slug.
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os
import shlex
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable, Optional

LABEL_LAB = "cads.firmware-lab"
LABEL_SLUG = "cads.slug"
LABEL_EMAIL_HASH = "cads.email-hash"
CONTAINER_PREFIX = "fl-"
VOLUME_PREFIX = "fl-ws-"
CONTAINER_PORT = "8080"
HEARTBEAT_PATH = "/home/coder/.local/share/code-server/heartbeat"
# Environment variables that are passed *by name* into every container
# (docker reads the value from the broker's own environment, so the secret
# never appears in an argument list or a label).
PASSTHROUGH_ENV = ("TUTOR_LLM_BASE_URL", "TUTOR_LLM_API_KEY", "TUTOR_LLM_MODEL")


# --------------------------------------------------------------------------- utils

def log(event: str, **fields) -> None:
    ts = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    extra = " ".join(f"{k}={v}" for k, v in fields.items())
    sys.stderr.write(f"{ts} fl-broker {event}{(' ' + extra) if extra else ''}\n")
    sys.stderr.flush()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_hash(email: str) -> str:
    return hashlib.sha256(normalize_email(email).encode("utf-8")).hexdigest()


def slug_for(email: str) -> str:
    """First 12 hex chars of SHA-256(lowercase(email)) - stable, not guessable, no PII."""
    return email_hash(email)[:12]


def is_slug(value: str) -> bool:
    return len(value) == 12 and all(c in "0123456789abcdef" for c in value)


def iso(ts: Optional[float]) -> Optional[str]:
    if ts is None:
        return None
    return _dt.datetime.fromtimestamp(ts, _dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class BrokerError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


# --------------------------------------------------------------------------- config

class Config:
    def __init__(self, env: Optional[dict] = None):
        e = os.environ if env is None else env
        self.bind_host = e.get("FL_BIND", "127.0.0.1")
        self.bind_port = int(e.get("FL_PORT", "3100"))
        self.image = e.get("FL_IMAGE", "cads-firmware-lab:latest")
        self.mem = e.get("FL_MEM", "2g")
        self.cpus = e.get("FL_CPUS", "2")
        self.pids_limit = e.get("FL_PIDS_LIMIT", "2048")
        self.idle_stop_min = float(e.get("FL_IDLE_STOP_MIN", "240"))
        self.max_sessions = int(e.get("FL_MAX_SESSIONS", "40"))
        self.admin_emails = {
            normalize_email(x) for x in e.get("FL_ADMIN_EMAILS", "").split(",") if x.strip()
        }
        # Host part of the address Caddy dials (X-FL-Upstream).  127.0.0.1 when the
        # gate shares the host network (Linux, network_mode: host); host.docker.internal
        # when the gate is a bridged container on Docker Desktop / Colima.
        self.upstream_host = e.get("FL_UPSTREAM_HOST", "127.0.0.1")
        # Address the container port is published on (docker -p <host>:0:8080).
        self.publish_host = e.get("FL_PUBLISH_HOST", "127.0.0.1")
        self.workspace_dir = e.get("FL_WORKSPACE_DIR", "/home/coder/workspace/cads-zero")
        self.extra_code_args = shlex.split(e.get("FL_EXTRA_CODE_ARGS", ""))
        self.health_timeout_s = float(e.get("FL_HEALTH_TIMEOUT_S", "60"))
        self.docker_timeout_s = float(e.get("FL_DOCKER_TIMEOUT_S", "30"))
        self.reaper_interval_s = float(e.get("FL_REAPER_INTERVAL_S", "60"))
        # A resolve hit within this window is answered from memory (no docker call).
        self.resolve_cache_s = float(e.get("FL_RESOLVE_CACHE_S", "10"))
        self.passthrough_env = [k for k in PASSTHROUGH_ENV if e.get(k)]


# --------------------------------------------------------------------------- docker

def run_docker(args: list[str], timeout: float) -> subprocess.CompletedProcess:
    """Run `docker <args>` without a shell.  Raises BrokerError on timeout."""
    try:
        return subprocess.run(
            ["docker", *args], capture_output=True, text=True, timeout=timeout, check=False
        )
    except subprocess.TimeoutExpired:
        raise BrokerError(503, "docker did not answer in time")
    except FileNotFoundError:
        raise BrokerError(503, "docker CLI not available")


def http_health_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


# --------------------------------------------------------------------------- state

class Session:
    __slots__ = ("slug", "email_hash", "status", "port", "last_seen", "verified_at",
                 "image", "image_id", "heartbeat")

    def __init__(self, slug: str, email_hash_: str = ""):
        self.slug = slug
        self.email_hash = email_hash_
        self.status = "missing"          # running | stopped | missing
        self.port: Optional[int] = None
        self.last_seen: float = 0.0
        self.verified_at: float = 0.0    # last time docker confirmed `running`
        self.image: str = ""
        self.image_id: str = ""
        self.heartbeat: Optional[float] = None

    @property
    def name(self) -> str:
        return CONTAINER_PREFIX + self.slug

    @property
    def volume(self) -> str:
        return VOLUME_PREFIX + self.slug

    def to_json(self, current_image_id: str) -> dict:
        return {
            "slug": self.slug,
            "status": self.status,
            "port": self.port,
            "lastSeen": iso(self.last_seen) if self.last_seen else None,
            "heartbeat": iso(self.heartbeat),
            "image": self.image,
            "imageCurrent": bool(self.image_id) and self.image_id == current_image_id,
        }


class Broker:
    def __init__(
        self,
        cfg: Config,
        docker: Callable[[list[str], float], subprocess.CompletedProcess] = run_docker,
        health: Callable[[str], bool] = http_health_ok,
        clock: Callable[[], float] = time.time,
    ):
        self.cfg = cfg
        self._docker = docker
        self._health = health
        self._clock = clock
        self._lock = threading.Lock()
        self._slug_locks: dict[str, threading.Lock] = {}
        self.sessions: dict[str, Session] = {}
        self._stop_event = threading.Event()

    # ---- docker helpers ---------------------------------------------------

    def docker(self, *args: str, timeout: Optional[float] = None) -> subprocess.CompletedProcess:
        return self._docker(list(args), timeout or self.cfg.docker_timeout_s)

    def _docker_ok(self, *args: str, timeout: Optional[float] = None) -> str:
        cp = self.docker(*args, timeout=timeout)
        if cp.returncode != 0:
            err = (cp.stderr or "").strip().splitlines()
            raise BrokerError(503, f"docker {args[0]} failed: {err[-1] if err else cp.returncode}")
        return cp.stdout

    def current_image_id(self) -> str:
        cp = self.docker("image", "inspect", self.cfg.image, "--format", "{{.Id}}")
        return cp.stdout.strip() if cp.returncode == 0 else ""

    def inspect_container(self, name: str) -> Optional[tuple[bool, str, str]]:
        """(running, image_id, image_ref) or None when the container does not exist."""
        cp = self.docker("inspect", "--format", "{{.State.Running}}|{{.Image}}|{{.Config.Image}}", name)
        if cp.returncode != 0:
            return None
        parts = cp.stdout.strip().split("|")
        if len(parts) != 3:
            return None
        return parts[0] == "true", parts[1], parts[2]

    def container_port(self, name: str) -> Optional[int]:
        cp = self.docker("port", name, f"{CONTAINER_PORT}/tcp")
        if cp.returncode != 0:
            return None
        for line in cp.stdout.splitlines():
            line = line.strip()
            if not line or "]" in line:      # skip IPv6 lines like [::]:1234
                continue
            host, _, port = line.rpartition(":")
            if port.isdigit():
                return int(port)
        return None

    def heartbeat_mtime(self, name: str) -> Optional[float]:
        cp = self.docker("exec", name, "stat", "-c", "%Y", HEARTBEAT_PATH, timeout=10)
        if cp.returncode != 0:
            return None
        try:
            return float(cp.stdout.strip())
        except ValueError:
            return None

    def create_args(self, sess: Session) -> list[str]:
        cfg = self.cfg
        args = [
            "run", "-d",
            "--name", sess.name,
            "--label", f"{LABEL_LAB}=1",
            "--label", f"{LABEL_SLUG}={sess.slug}",
            "--label", f"{LABEL_EMAIL_HASH}={sess.email_hash}",
            "-v", f"{sess.volume}:/home/coder/workspace",
            "-p", f"{cfg.publish_host}:0:{CONTAINER_PORT}",
            "--memory", cfg.mem,
            "--cpus", cfg.cpus,
            "--pids-limit", cfg.pids_limit,
        ]
        for key in cfg.passthrough_env:
            args += ["-e", key]            # value taken from our environment, never in argv
        args += [
            cfg.image,
            "--auth", "none",
            "--bind-addr", f"0.0.0.0:{CONTAINER_PORT}",
            "--disable-workspace-trust",
            *cfg.extra_code_args,
            cfg.workspace_dir,
        ]
        return args

    # ---- state ----------------------------------------------------------------

    def _slug_lock(self, slug: str) -> threading.Lock:
        with self._lock:
            lk = self._slug_locks.get(slug)
            if lk is None:
                lk = self._slug_locks[slug] = threading.Lock()
            return lk

    def _get_session(self, slug: str, email_hash_: str = "") -> Session:
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

    def reconcile(self) -> None:
        """Rebuild session table from `docker ps -a --filter label=...`."""
        out = self._docker_ok("ps", "-a", "--filter", f"label={LABEL_LAB}=1", "--format", "json")
        seen: set[str] = set()
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            labels = dict(
                kv.split("=", 1) for kv in (row.get("Labels") or "").split(",") if "=" in kv
            )
            slug = labels.get(LABEL_SLUG, "")
            if not is_slug(slug):
                continue
            seen.add(slug)
            s = self._get_session(slug, labels.get(LABEL_EMAIL_HASH, ""))
            running = (row.get("State") or "").lower() == "running"
            s.image = row.get("Image") or s.image
            now = self._clock()
            if running:
                port = self.container_port(s.name)
                s.status = "running" if port else "stopped"
                s.port = port
                s.verified_at = now
                if not s.last_seen:
                    s.last_seen = now
            else:
                s.status = "stopped"
                s.port = None
        with self._lock:
            for slug in list(self.sessions):
                if slug not in seen:
                    del self.sessions[slug]
        log("reconciled", sessions=len(seen), running=self.running_count())

    # ---- operations ---------------------------------------------------------

    def wait_healthy(self, sess: Session) -> None:
        url = f"http://{self.cfg.publish_host}:{sess.port}/healthz"
        deadline = self._clock() + self.cfg.health_timeout_s
        while True:
            if self._health(url):
                return
            if self._clock() >= deadline:
                raise BrokerError(503, "session did not become healthy in time")
            time.sleep(0.5)

    def ensure_session(self, email: str) -> Session:
        """Create/start the caller's container if needed; returns a running session."""
        slug = slug_for(email)
        sess = self._get_session(slug, email_hash(email))
        with self._slug_lock(slug):
            now = self._clock()
            if sess.status == "running" and sess.port and now - sess.verified_at < self.cfg.resolve_cache_s:
                sess.last_seen = now
                return sess
            state = self.inspect_container(sess.name)
            started = False
            if state is None:
                self._check_capacity(sess)
                log("create", slug=slug)
                self._docker_ok(*self.create_args(sess), timeout=self.cfg.docker_timeout_s * 2)
                started = True
            else:
                running, image_id, image_ref = state
                sess.image_id, sess.image = image_id, image_ref
                if not running:
                    current = self.current_image_id()
                    if current and image_id != current:
                        # Rollout: replace a *stopped* container with the current image.
                        log("replace-old-image", slug=slug)
                        self._docker_ok("rm", "-f", sess.name)
                        self._check_capacity(sess)
                        self._docker_ok(*self.create_args(sess), timeout=self.cfg.docker_timeout_s * 2)
                    else:
                        self._check_capacity(sess)
                        log("start", slug=slug)
                        self._docker_ok("start", sess.name)
                    started = True
            port = self.container_port(sess.name)
            if not port:
                sess.status = "stopped"
                raise BrokerError(503, "session has no published port")
            sess.port = port
            if started:
                st = self.inspect_container(sess.name)
                if st:
                    sess.image_id, sess.image = st[1], st[2]
                self.wait_healthy(sess)
                log("ready", slug=slug, port=port)
            sess.status = "running"
            sess.verified_at = self._clock()
            sess.last_seen = sess.verified_at
            return sess

    def _check_capacity(self, sess: Session) -> None:
        if sess.status != "running" and self.running_count() >= self.cfg.max_sessions:
            log("capacity-full", slug=sess.slug, max=self.cfg.max_sessions)
            raise BrokerError(
                503,
                f"Labor voll: {self.cfg.max_sessions} aktive Sessions erreicht. "
                "Bitte spaeter erneut versuchen.",
            )

    def resolve(self, email: str, slug: str) -> Session:
        if not is_slug(slug) or slug_for(email) != slug:
            log("resolve-denied", slug=slug, caller=slug_for(email))
            raise BrokerError(403, "Not your session")
        return self.ensure_session(email)

    def stop_session(self, slug: str) -> None:
        sess = self._get_session(slug)
        with self._slug_lock(slug):
            log("stop", slug=slug)
            self.docker("stop", "-t", "15", sess.name, timeout=45)
            sess.status = "stopped"
            sess.port = None

    def wipe_session(self, slug: str) -> None:
        sess = self._get_session(slug)
        with self._slug_lock(slug):
            log("wipe", slug=slug)
            self.docker("stop", "-t", "15", sess.name, timeout=45)
            self.docker("rm", "-f", sess.name)
            self.docker("volume", "rm", sess.volume)
            with self._lock:
                self.sessions.pop(slug, None)

    def list_sessions(self) -> list[dict]:
        self.reconcile()
        current = self.current_image_id()
        with self._lock:
            sessions = list(self.sessions.values())
        for s in sessions:
            if s.status == "running":
                s.heartbeat = self.heartbeat_mtime(s.name)
                st = self.inspect_container(s.name)
                if st:
                    s.image_id, s.image = st[1], st[2]
        return [s.to_json(current) for s in sorted(sessions, key=lambda x: x.slug)]

    # ---- reaper -------------------------------------------------------------

    def reap_idle(self) -> list[str]:
        """Stop containers whose last-seen AND heartbeat are both older than the idle limit."""
        limit = self.cfg.idle_stop_min * 60
        now = self._clock()
        stopped = []
        with self._lock:
            candidates = [s for s in self.sessions.values() if s.status == "running"]
        for s in candidates:
            if now - s.last_seen <= limit:
                continue
            hb = self.heartbeat_mtime(s.name)
            s.heartbeat = hb
            if hb is not None and now - hb <= limit:
                continue
            log("reap-idle", slug=s.slug, idle_min=int((now - s.last_seen) / 60))
            self.stop_session(s.slug)
            stopped.append(s.slug)
        return stopped

    def reaper_loop(self) -> None:
        while not self._stop_event.wait(self.cfg.reaper_interval_s):
            try:
                self.reconcile()
                self.reap_idle()
            except Exception as exc:  # noqa: BLE001 - keep the thread alive
                log("reaper-error", error=type(exc).__name__)

    def shutdown(self) -> None:
        self._stop_event.set()


# --------------------------------------------------------------------------- http

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "fl-broker"
    sys_version = ""
    broker: Broker  # set on the server class

    def log_message(self, fmt, *args):  # silence default access log (we log ourselves)
        return

    # helpers
    def _send(self, status: int, body: str = "", headers: Optional[dict] = None,
              content_type: str = "text/plain; charset=utf-8") -> None:
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _identity(self) -> Optional[str]:
        raw = self.headers.get("X-Gate-Email", "")
        email = normalize_email(raw)
        return email if email and "@" in email else None

    def _require_admin(self) -> str:
        email = self._identity()
        if not email or email not in self.broker.cfg.admin_emails:
            raise BrokerError(403, "Admin only")
        return email

    def _route(self, method: str) -> None:
        url = urllib.parse.urlsplit(self.path)
        path = url.path
        qs = urllib.parse.parse_qs(url.query)
        slug = (qs.get("slug") or [""])[0]
        b = self.broker
        try:
            if method == "GET" and path == "/_broker/healthz":
                self._send(200, json.dumps({"ok": True, "running": b.running_count()}),
                           content_type="application/json")
            elif method == "GET" and path == "/_broker/enter":
                email = self._identity()
                if not email:
                    raise BrokerError(403, "No identity (X-Gate-Email missing)")
                sess = b.ensure_session(email)
                loc = f"/s/{sess.slug}/?folder={urllib.parse.quote(b.cfg.workspace_dir, safe='/')}"
                log("enter", slug=sess.slug, port=sess.port)
                self._send(302, "", {"Location": loc})
            elif method == "GET" and path == "/_broker/resolve":
                email = self._identity()
                if not email:
                    raise BrokerError(403, "No identity (X-Gate-Email missing)")
                sess = b.resolve(email, slug)
                self._send(200, "ok", {
                    "X-FL-Upstream": f"{b.cfg.upstream_host}:{sess.port}",
                    "X-FL-Port": str(sess.port),
                })
            elif method == "GET" and path == "/_broker/admin":
                self._require_admin()
                self._send(200, json.dumps({
                    "image": b.cfg.image,
                    "imageId": b.current_image_id(),
                    "maxSessions": b.cfg.max_sessions,
                    "idleStopMin": b.cfg.idle_stop_min,
                    "sessions": b.list_sessions(),
                }, indent=2), content_type="application/json")
            elif method == "POST" and path in ("/_broker/admin/stop", "/_broker/admin/wipe"):
                self._require_admin()
                if not is_slug(slug):
                    raise BrokerError(400, "slug missing or malformed")
                if path.endswith("/stop"):
                    b.stop_session(slug)
                else:
                    b.wipe_session(slug)
                log("admin-" + path.rsplit("/", 1)[1], slug=slug, by=slug_for(self._identity() or ""))
                self._send(200, json.dumps({"ok": True, "slug": slug}), content_type="application/json")
            else:
                self._send(404, "Not found")
        except BrokerError as exc:
            log("error", path=path, status=exc.status, msg=exc.message)
            self._send(exc.status, exc.message)
        except Exception as exc:  # noqa: BLE001
            log("internal-error", path=path, error=type(exc).__name__)
            self._send(500, "internal error")

    def do_GET(self):
        self._route("GET")

    def do_HEAD(self):
        self._route("GET")

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(min(length, 65536))
        self._route("POST")


def make_server(broker: Broker, host: str, port: int) -> ThreadingHTTPServer:
    handler = type("BoundHandler", (Handler,), {"broker": broker})
    srv = ThreadingHTTPServer((host, port), handler)
    srv.daemon_threads = True
    return srv


def main() -> int:
    cfg = Config()
    broker = Broker(cfg)
    try:
        broker.reconcile()
    except BrokerError as exc:
        log("startup-reconcile-failed", msg=exc.message)
    if cfg.idle_stop_min < 3:
        # code-server touches its heartbeat file only about once a minute while a connection is
        # active, so a limit below that granularity would stop sessions that are in use.
        log("warning", msg="FL_IDLE_STOP_MIN below 3 minutes will reap active sessions")
    threading.Thread(target=broker.reaper_loop, name="reaper", daemon=True).start()
    srv = make_server(broker, cfg.bind_host, cfg.bind_port)
    log("listening", addr=f"{cfg.bind_host}:{cfg.bind_port}", image=cfg.image,
        max_sessions=cfg.max_sessions, idle_stop_min=cfg.idle_stop_min,
        upstream_host=cfg.upstream_host, llm_env=",".join(cfg.passthrough_env) or "-")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        broker.shutdown()
        srv.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

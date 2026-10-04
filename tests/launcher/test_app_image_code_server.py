#!/usr/bin/env python3
"""Tests for the code-server session launcher and its logout overlay (launcher/app.py)
plus the per-student compose overlay (compose/compose.user.code-server.yml).

trace: AUF-20261004-003

Run: pytest tests/launcher   (plain unittest.TestCase classes, so `python -m unittest
discover -s tests/launcher` works in the same way - the image CI has no pytest).

What is covered here, and what is not: these tests drive the *server* side of the logout
chain end to end over real sockets - a fake code-server upstream, the real per-session
listener, the real control plane - and assert that the workbench document carries the
visible #cads-logout-link entry, that a click stops the container, snapshots the profile
and lands on the edge sign-out URL, and that the session port is gone afterwards.  That
the entry is also *visible to a human* is the job of the Playwright run (screenshot of
#cads-logout-link); it needs a real image and is not part of this suite.
"""
from __future__ import annotations

import http.client
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from launcher import app  # noqa: E402

COMPOSE_FILE = ROOT / "compose" / "compose.user.code-server.yml"
APP_FILE = ROOT / "launcher" / "app.py"
EMAIL = "Studi@example.org"
SLUG = app.slug_for(EMAIL)


# --------------------------------------------------------------------------------- fake docker

def _done(stdout: str = "", returncode: int = 0, stderr: str = "") -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(args=[], returncode=returncode, stdout=stdout, stderr=stderr)


class FakeRunner:
    """Records every argument list and answers the handful of calls the launcher makes."""

    def __init__(self, container_port: int = 18080):
        self.calls: list[list[str]] = []
        self.envs: list[dict] = []
        self.container_port = container_port
        self.running = False
        self.fail_stop = False
        self.fail_tar = False

    def __call__(self, args, timeout, env=None):
        self.calls.append(list(args))
        self.envs.append(dict(env or {}))
        if args[0] == "tar":
            if self.fail_tar:
                return _done(returncode=1, stderr="tar: no space left on device")
            pathlib.Path(args[2]).write_bytes(b"profile-tarball")
            return _done()
        if args[0] != "docker":
            return _done()
        if args[1] == "compose":
            if "up" in args:
                self.running = True
            elif "stop" in args:
                if self.fail_stop:
                    return _done(returncode=1, stderr="Error response from daemon: no such container")
                self.running = False
            return _done()
        if args[1] == "port":
            return _done(f"127.0.0.1:{self.container_port}\n") if self.running else _done(returncode=1)
        if args[1] == "inspect":
            return _done("true\n" if self.running else "false\n")
        return _done()

    def compose_calls(self, verb: str) -> list[list[str]]:
        return [c for c in self.calls if c[:2] == ["docker", "compose"] and verb in c]

    @property
    def verbs(self) -> list[str]:
        """Sequence of the operations that matter for the logout order (stop, tar, ...)."""
        out = []
        for c in self.calls:
            if c[0] == "tar":
                out.append("tar")
            elif c[:2] == ["docker", "compose"]:
                out.append(next((v for v in ("up", "stop") if v in c), "compose"))
        return out


def make_launcher(tmp: str, runner: FakeRunner, **extra) -> app.Launcher:
    env = {
        "FL_COMPOSE_FILE": str(COMPOSE_FILE),
        "FL_IMAGE_TAG": "next-8a20ec9",
        "FL_IMAGE_TAG_ROLLBACK": "next-9161df0",
        "FL_PROFILE_DIR": os.path.join(tmp, "profiles"),
        "FL_PROFILE_BACKUP_DIR": os.path.join(tmp, "backups"),
        "CT_GATE_PUBLIC_URL": "https://lab.example.org",
        "FL_ADMIN_EMAILS": "tutor@example.org",
        "FL_HEALTH_TIMEOUT_S": "2",
    }
    env.update(extra)
    cfg = app.Config(env)
    return app.Launcher(cfg, runner=runner, health=lambda url: True)


# ------------------------------------------------------------------------------------- overlay

class OverlayMarkupTest(unittest.TestCase):
    def test_entry_is_a_visible_link_with_the_desktop_id(self):
        snippet = app.logout_overlay("/s/" + SLUG)
        self.assertIn('id="cads-logout-link"', snippet)
        self.assertIn(app.LOGOUT_LABEL, snippet)
        self.assertIn(f'href="/s/{SLUG}/internal/stop"', snippet)

    def test_entry_needs_no_inline_style_or_script(self):
        # The workbench CSP has no 'unsafe-inline'; stylesheet and script must be same-origin
        # files served by the launcher, or the entry would never render.
        snippet = app.logout_overlay("/s/" + SLUG)
        self.assertNotIn("<style", snippet)
        self.assertNotIn("style=", snippet)
        self.assertIn(f'<link rel="stylesheet" href="/s/{SLUG}/internal/logout.css">', snippet)
        self.assertIn(f'<script src="/s/{SLUG}/internal/logout.js" defer></script>', snippet)

    def test_css_positions_the_entry_on_top_of_the_workbench(self):
        self.assertIn("#cads-logout-link", app.OVERLAY_CSS)
        self.assertIn("position: fixed", app.OVERLAY_CSS)

    def test_reattach_script_points_at_the_session_stop_route(self):
        js = app.overlay_js("/s/" + SLUG + "/")
        self.assertIn(json.dumps(f"/s/{SLUG}/internal/stop"), js)
        self.assertIn(json.dumps(app.LOGOUT_LINK_ID), js)
        # The workbench re-renders <body>; without the interval the entry disappears.
        self.assertIn("setInterval(attach", js)

    def test_trailing_slash_in_the_base_path_does_not_double_up(self):
        self.assertEqual(app.logout_overlay("/s/x/"), app.logout_overlay("/s/x"))


class InjectionTest(unittest.TestCase):
    SNIPPET = "<a id='cads-logout-link'>x</a>"

    def test_injected_before_the_closing_body_tag(self):
        out = app.inject_logout("<html><body><div id=w></div></body></html>", self.SNIPPET)
        self.assertEqual(out, "<html><body><div id=w></div>" + self.SNIPPET + "</body></html>")

    def test_idempotent(self):
        once = app.inject_logout("<html><body></body></html>", self.SNIPPET)
        self.assertEqual(app.inject_logout(once, self.SNIPPET), once)

    def test_document_without_a_body_tag_still_gets_the_entry(self):
        self.assertIn("cads-logout-link", app.inject_logout("<html>no body</html>", self.SNIPPET))

    def test_last_body_tag_wins(self):
        out = app.inject_logout("<body>a</body><!-- </body> -->".upper(), self.SNIPPET)
        self.assertTrue(out.endswith("</BODY> -->"))

    def test_only_html_responses_are_rewritten(self):
        self.assertTrue(app.is_html("text/html; charset=utf-8"))
        self.assertTrue(app.is_html("TEXT/HTML"))
        self.assertFalse(app.is_html("application/javascript"))
        self.assertFalse(app.is_html(""))


# ------------------------------------------------------------------------------- logout wiring

class SignOutTest(unittest.TestCase):
    def test_sign_out_url_defaults_to_the_edge_oauth2_proxy(self):
        cfg = app.Config({"CT_GATE_PUBLIC_URL": "https://lab.example.org"})
        self.assertEqual(
            app.sign_out_url(cfg),
            "https://lab.example.org/oauth2/sign_out?rd=https%3A%2F%2Flab.example.org",
        )

    def test_existing_query_is_kept(self):
        cfg = app.Config({"FL_SIGN_OUT_URL": "https://e.example/oauth2/sign_out?client=lab",
                          "FL_AFTER_LOGOUT_URL": "https://e.example/"})
        self.assertIn("?client=lab&rd=", app.sign_out_url(cfg))

    def test_local_session_cookies_are_revoked_as_well(self):
        cfg = app.Config({"FL_SESSION_COOKIES": "_oauth2_proxy, _gate"})
        headers = app.clear_cookie_headers(cfg)
        self.assertEqual([h[0] for h in headers], ["Set-Cookie", "Set-Cookie"])
        self.assertTrue(all("Max-Age=0" in v for _, v in headers))
        self.assertIn("_oauth2_proxy=;", headers[0][1])
        self.assertIn("_gate=;", headers[1][1])


class LauncherTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.runner = FakeRunner()
        self.ports = []
        self.lc = make_launcher(self.tmp, self.runner)
        self.lc._proxy_factory = self._fake_proxy

    def _fake_proxy(self, slug):
        self.ports.append(slug)
        return 45678

    def test_session_is_started_from_the_compose_overlay(self):
        sess = self.lc.ensure_session(EMAIL)
        up = self.runner.compose_calls("up")
        self.assertEqual(len(up), 1)
        self.assertEqual(
            up[0],
            ["docker", "compose", "--file", str(COMPOSE_FILE), "--project-name", f"fl-{SLUG}",
             "up", "--detach", "--no-build"],
        )
        self.assertEqual(sess.status, "running")
        self.assertEqual(sess.port, self.runner.container_port)

    def test_compose_env_carries_tag_slug_and_profile_dir(self):
        self.lc.ensure_session(EMAIL)
        env = self.runner.envs[0]
        self.assertEqual(env["FL_SLUG"], SLUG)
        self.assertEqual(env["FL_IMAGE_TAG"], "next-8a20ec9")
        self.assertEqual(env["FL_EMAIL_HASH"], app.email_hash(EMAIL))
        self.assertEqual(env["FL_PROFILE_DIR"], os.path.join(self.tmp, "profiles", SLUG))
        self.assertTrue(os.path.isdir(env["FL_PROFILE_DIR"]))

    def test_gate_is_pointed_at_the_launcher_so_the_overlay_is_in_the_path(self):
        sess = self.lc.ensure_session(EMAIL)
        self.assertEqual(self.lc.upstream_of(sess), "127.0.0.1:45678")
        self.assertEqual(self.lc.session_upstream(SLUG), f"127.0.0.1:{self.runner.container_port}")

    def test_resolve_refuses_a_foreign_or_malformed_slug(self):
        for slug in (app.slug_for("other@example.org"), "nope", ""):
            with self.assertRaises(app.LauncherError) as ctx:
                self.lc.resolve(EMAIL, slug)
            self.assertEqual(ctx.exception.status, 403)
        self.assertEqual(self.runner.compose_calls("up"), [])

    def test_resolve_starts_the_owner_session(self):
        self.assertEqual(self.lc.resolve(EMAIL, SLUG).slug, SLUG)

    def test_logout_stops_the_container_then_saves_the_profile(self):
        self.lc.ensure_session(EMAIL)
        pathlib.Path(self.lc.profile_dir(SLUG), "settings.json").write_text("{}")
        url = self.lc.logout(SLUG)
        self.assertEqual(self.runner.verbs, ["up", "stop", "tar"])
        self.assertEqual(
            self.runner.compose_calls("stop")[0][-3:], ["stop", "--timeout", "15"]
        )
        self.assertEqual(url, "https://lab.example.org/oauth2/sign_out"
                              "?rd=https%3A%2F%2Flab.example.org")
        self.assertEqual(self.lc.sessions[SLUG].status, "stopped")
        self.assertIsNone(self.lc.sessions[SLUG].port)
        self.assertTrue(os.path.isfile(os.path.join(self.tmp, "backups", f"{SLUG}.tar.gz")))

    def test_profile_snapshot_is_atomic(self):
        self.lc.ensure_session(EMAIL)
        pathlib.Path(self.lc.profile_dir(SLUG), "state.vscdb").write_text("x")
        dest = self.lc.save_profile(SLUG)
        self.assertEqual(dest, os.path.join(self.tmp, "backups", f"{SLUG}.tar.gz"))
        self.assertEqual(os.listdir(os.path.join(self.tmp, "backups")), [f"{SLUG}.tar.gz"])

    def test_a_failing_profile_snapshot_does_not_block_the_sign_out(self):
        self.lc.ensure_session(EMAIL)
        pathlib.Path(self.lc.profile_dir(SLUG), "settings.json").write_text("{}")
        self.runner.fail_tar = True
        self.assertIn("/oauth2/sign_out", self.lc.logout(SLUG))
        self.assertIn("stop", self.runner.verbs)
        self.assertFalse(os.path.isfile(os.path.join(self.tmp, "backups", f"{SLUG}.tar.gz")))
        # and no half-written tarball is left behind for the next logout to trip over
        self.assertEqual(os.listdir(os.path.join(self.tmp, "backups")), [])

    def test_a_failing_stop_does_not_block_the_sign_out(self):
        # INC-20260928-005: whatever happens to the container, the SSO session has to end.
        self.lc.ensure_session(EMAIL)
        self.runner.fail_stop = True
        self.assertIn("/oauth2/sign_out", self.lc.logout(SLUG))

    def test_logout_logs_the_slug_and_never_the_address(self):
        self.lc.ensure_session(EMAIL)
        buf, sys.stderr = sys.stderr, _Capture()
        try:
            self.lc.logout(SLUG)
            logged = sys.stderr.text
        finally:
            sys.stderr = buf
        self.assertIn(SLUG, logged)
        self.assertNotIn("studi", logged.lower())

    def test_capacity_limit_is_enforced(self):
        lc = make_launcher(self.tmp, self.runner, FL_MAX_SESSIONS="1")
        lc._proxy_factory = self._fake_proxy
        lc.ensure_session(EMAIL)
        with self.assertRaises(app.LauncherError) as ctx:
            lc.ensure_session("second@example.org")
        self.assertEqual(ctx.exception.status, 503)
        self.assertIn("Labor voll", ctx.exception.message)

    def test_slug_derivation_matches_the_broker(self):
        # fl_broker.slug_for: first 12 hex chars of sha256(lowercase(email)).
        self.assertEqual(SLUG, app.slug_for("  STUDI@example.org "))
        self.assertTrue(app.is_slug(SLUG))


class _Capture:
    def __init__(self):
        self.text = ""

    def write(self, chunk):
        self.text += chunk

    def flush(self):
        pass


# ----------------------------------------------------------------------------- over the socket

class _FakeCodeServer(BaseHTTPRequestHandler):
    """Stands in for code-server: a workbench document, an asset and /healthz."""

    protocol_version = "HTTP/1.0"
    WORKBENCH = ("<!DOCTYPE html><html><head><title>CaDS</title></head>"
                 "<body><div id='workbench'></div></body></html>")

    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        if self.path.startswith("/healthz"):
            body, ctype = b'{"status":"alive"}', "application/json"
        elif self.path.startswith("/redirect"):
            self.send_response(302)
            self.send_header("Location", "/?folder=/home/coder/workspace/cads-zero")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        elif self.path.startswith("/static/"):
            body, ctype = b"console.log(1)", "application/javascript"
        else:
            body, ctype = self.WORKBENCH.encode(), "text/html; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _get(port: int, path: str, headers: dict | None = None, method: str = "GET"):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    try:
        conn.request(method, path, headers=headers or {})
        resp = conn.getresponse()
        return resp.status, dict(resp.getheaders()), resp.read()
    finally:
        conn.close()


class SessionProxyTest(unittest.TestCase):
    """The flow the Playwright run exercises in a browser: enter, see the entry, click it."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.upstream = ThreadingHTTPServer(("127.0.0.1", 0), _FakeCodeServer)
        self.upstream.daemon_threads = True
        threading.Thread(target=self.upstream.serve_forever, daemon=True).start()
        self.addCleanup(self.upstream.server_close)
        self.addCleanup(self.upstream.shutdown)
        self.runner = FakeRunner(container_port=self.upstream.server_address[1])
        self.lc = make_launcher(self.tmp, self.runner)
        self.sess = self.lc.ensure_session(EMAIL)
        self.port = self.sess.proxy_port

    def test_workbench_document_carries_the_logout_entry(self):
        status, headers, body = _get(self.port, "/?folder=/home/coder/workspace/cads-zero")
        text = body.decode()
        self.assertEqual(status, 200)
        self.assertIn('id="cads-logout-link"', text)
        self.assertIn(f'href="/s/{SLUG}/internal/stop"', text)
        self.assertTrue(text.endswith("</body></html>"))
        self.assertEqual(int(headers["Content-Length"]), len(body))

    def test_assets_are_passed_through_untouched(self):
        status, headers, body = _get(self.port, "/static/out/main.js")
        self.assertEqual((status, body), (200, b"console.log(1)"))
        self.assertEqual(headers["Content-Type"], "application/javascript")

    def test_upstream_redirects_reach_the_browser(self):
        # code-server redirects / -> /?folder=...; swallowing it here would hide the folder
        # parameter from the workbench.
        status, headers, _ = _get(self.port, "/redirect")
        self.assertEqual(status, 302)
        self.assertEqual(headers["Location"], "/?folder=/home/coder/workspace/cads-zero")

    def test_overlay_assets_are_served_by_the_launcher(self):
        status, headers, body = _get(self.port, app.OVERLAY_CSS_PATH)
        self.assertEqual(status, 200)
        self.assertIn("text/css", headers["Content-Type"])
        self.assertIn("#cads-logout-link", body.decode())
        status, headers, body = _get(self.port, app.OVERLAY_JS_PATH)
        self.assertEqual(status, 200)
        self.assertIn("javascript", headers["Content-Type"])
        self.assertIn(f"/s/{SLUG}/internal/stop", body.decode())

    def test_click_stops_the_session_and_redirects_to_the_edge_sign_out(self):
        pathlib.Path(self.lc.profile_dir(SLUG), "settings.json").write_text("{}")
        status, headers, _ = _get(self.port, app.LOGOUT_PATH)
        self.assertEqual(status, 302)
        self.assertEqual(headers["Location"],
                         "https://lab.example.org/oauth2/sign_out"
                         "?rd=https%3A%2F%2Flab.example.org")
        self.assertIn("Max-Age=0", headers["Set-Cookie"])
        self.assertEqual(self.runner.verbs, ["up", "stop", "tar"])
        self.assertFalse(self.runner.running)
        self.assertTrue(os.path.isfile(os.path.join(self.tmp, "backups", f"{SLUG}.tar.gz")))

    def test_no_session_port_is_left_open_after_the_logout(self):
        _get(self.port, app.LOGOUT_PATH)
        self.assertIsNone(self.lc.sessions[SLUG].proxy_port)
        deadline = threading.Event()
        for _ in range(50):                      # the listener closes asynchronously
            try:
                with socket.create_connection(("127.0.0.1", self.port), timeout=0.5):
                    pass
            except OSError:
                return
            deadline.wait(0.1)
        self.fail("session listener still accepting connections after logout")

    def test_a_stopped_session_answers_503_instead_of_proxying(self):
        self.lc.stop_session(SLUG)
        status, _, body = _get(self.port, "/")
        self.assertEqual(status, 503)
        self.assertIn(b"not running", body)


class ControlPlaneTest(unittest.TestCase):
    """The /_broker/* contract deploy/multiuser/Caddyfile.gate already speaks."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.runner = FakeRunner()
        self.lc = make_launcher(self.tmp, self.runner)
        self.lc._proxy_factory = lambda slug: 45678
        self.srv = app.make_server(self.lc, "127.0.0.1", 0)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.addCleanup(self.srv.server_close)
        self.addCleanup(self.srv.shutdown)
        self.port = self.srv.server_address[1]

    def test_healthz_reports_the_live_and_the_rollback_tag(self):
        status, _, body = _get(self.port, "/_broker/healthz")
        payload = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(payload["imageTag"], "next-8a20ec9")
        self.assertEqual(payload["rollbackTag"], "next-9161df0")
        self.assertEqual(payload["logoutOverlay"], "cads-logout-link")

    def test_resolve_hands_the_gate_the_launcher_port(self):
        status, headers, _ = _get(self.port, f"/_broker/resolve?slug={SLUG}",
                                  {"X-Gate-Email": EMAIL})
        self.assertEqual(status, 200)
        self.assertEqual(headers["X-FL-Upstream"], "127.0.0.1:45678")

    def test_resolve_without_an_identity_is_forbidden(self):
        status, _, body = _get(self.port, f"/_broker/resolve?slug={SLUG}")
        self.assertEqual(status, 403)
        self.assertIn(b"No identity", body)

    def test_enter_redirects_into_the_session(self):
        status, headers, _ = _get(self.port, "/_broker/enter", {"X-Gate-Email": EMAIL})
        self.assertEqual(status, 302)
        self.assertEqual(headers["Location"],
                         f"/s/{SLUG}/?folder=/home/coder/workspace/cads-zero")

    def test_launcher_alias_path_works_too(self):
        status, _, _ = _get(self.port, "/_launcher/healthz")
        self.assertEqual(status, 200)

    def test_admin_is_restricted_to_the_allow_list(self):
        status, _, _ = _get(self.port, "/_broker/admin", {"X-Gate-Email": EMAIL})
        self.assertEqual(status, 403)
        status, _, body = _get(self.port, "/_broker/admin", {"X-Gate-Email": "tutor@example.org"})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["image"],
                         "ghcr.io/scimbe/cads-firmware-lab:next-8a20ec9")

    def test_admin_stop_runs_the_same_logout_chain(self):
        _get(self.port, "/_broker/enter", {"X-Gate-Email": EMAIL})
        status, _, _ = _get(self.port, f"/_broker/admin/stop?slug={SLUG}",
                            {"X-Gate-Email": "tutor@example.org", "Content-Length": "0"},
                            method="POST")
        self.assertEqual(status, 200)
        self.assertIn("stop", self.runner.verbs)

    def test_broker_internals_are_not_reachable_under_another_name(self):
        status, _, _ = _get(self.port, "/healthz")
        self.assertEqual(status, 404)


# ------------------------------------------------------------------- compose overlay (the image)

class ComposeOverlayTest(unittest.TestCase):
    """The per-session overlay: the lab image, unchanged, plus the mounts the logout needs.

    Asserted on the text because the image CI has no PyYAML; the structural check below runs
    in addition wherever PyYAML happens to be installed.
    """

    @classmethod
    def setUpClass(cls):
        cls.text = COMPOSE_FILE.read_text()

    def test_file_is_where_the_launcher_looks_for_it(self):
        self.assertEqual(pathlib.Path(app.Config({}).compose_file), COMPOSE_FILE)
        self.assertTrue(COMPOSE_FILE.is_file())

    def test_image_is_repo_plus_tag_so_a_rollback_is_a_tag_swap(self):
        self.assertIn("image: ${FL_IMAGE_REPO:-ghcr.io/scimbe/cads-firmware-lab}:"
                      "${FL_IMAGE_TAG:?", self.text)
        settings = [ln for ln in self.text.splitlines() if not ln.lstrip().startswith("#")]
        self.assertFalse([ln for ln in settings if ":latest" in ln])

    def test_service_and_names_match_the_launcher(self):
        self.assertIn(f"  {app.COMPOSE_SERVICE}:", self.text)
        self.assertIn("container_name: fl-${FL_SLUG", self.text)
        self.assertIn(f"name: {app.VOLUME_PREFIX}${{FL_SLUG}}", self.text)

    def test_logout_is_not_undone_by_a_restart_policy(self):
        # A restarting container would come back right after the student signed out.
        self.assertIn('restart: "no"', self.text)

    def test_profile_is_bind_mounted_where_the_snapshot_reads_it(self):
        self.assertIn("- ${FL_PROFILE_DIR:?", self.text)
        self.assertIn(":/home/coder/.local/share/code-server", self.text)
        self.assertIn("- workspace:/home/coder/workspace", self.text)

    def test_session_port_stays_on_loopback(self):
        self.assertIn('- "${FL_PUBLISH_HOST:-127.0.0.1}:0:8080"', self.text)
        self.assertIn(f"--bind-addr\n      - 0.0.0.0:{app.CONTAINER_PORT}", self.text)

    def test_labels_mark_the_overlay_session(self):
        for label in ("cads.firmware-lab:", "cads.slug:", "cads.email-hash:",
                      "cads.image-tag:", "cads.logout: overlay"):
            self.assertIn(label, self.text)

    def test_health_endpoint_is_the_one_the_launcher_polls(self):
        self.assertIn("http://127.0.0.1:8080/healthz", self.text)

    def test_llm_env_is_passed_by_name_only(self):
        for key in ("TUTOR_LLM_BASE_URL", "TUTOR_LLM_API_KEY", "TUTOR_LLM_MODEL"):
            self.assertIn(f"- {key}\n", self.text)
            self.assertNotIn(f"{key}=", self.text)

    def test_structure_parses(self):
        try:
            import yaml
        except ImportError:
            self.skipTest("PyYAML not installed")
        doc = yaml.safe_load(self.text)
        svc = doc["services"][app.COMPOSE_SERVICE]
        self.assertEqual(svc["restart"], "no")
        self.assertEqual(svc["command"][:2], ["--auth", "none"])
        self.assertEqual(doc["volumes"]["workspace"]["name"], "fl-ws-${FL_SLUG}")
        self.assertIn("no-new-privileges:true", svc["security_opt"])


class TraceTest(unittest.TestCase):
    def test_touched_files_carry_the_requirement_id(self):
        for path in (APP_FILE, COMPOSE_FILE, pathlib.Path(__file__)):
            self.assertIn("trace: AUF-20261004-003", path.read_text(), path.name)


if __name__ == "__main__":
    unittest.main()

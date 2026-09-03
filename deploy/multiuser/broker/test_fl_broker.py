#!/usr/bin/env python3
"""Unit tests for fl_broker (no real Docker: subprocess is replaced by FakeDocker).

Run:  python3 -m unittest -v deploy/multiuser/broker/test_fl_broker.py
"""
from __future__ import annotations

import http.client
import json
import os
import subprocess
import sys
import threading
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fl_broker as fb  # noqa: E402

SECRET = "sk-super-secret-value"
TELEMETRY_TOKEN = "tok-portal-secret-value"


class FakeDocker:
    """Simulates the subset of the docker CLI the broker uses, in memory."""

    def __init__(self, image_id="sha256:current"):
        self.image_id = image_id
        self.containers: dict[str, dict] = {}
        self.volumes: set[str] = set()
        self.calls: list[list[str]] = []
        self.next_port = 40000
        self.heartbeats: dict[str, float] = {}
        self.fail_exec = False

    def __call__(self, args: list[str], timeout: float) -> subprocess.CompletedProcess:
        assert isinstance(args, list) and all(isinstance(a, str) for a in args)
        assert timeout and timeout > 0
        self.calls.append(list(args))
        cmd = args[0]
        handler = getattr(self, "cmd_" + cmd.replace("-", "_"), None)
        if handler is None:
            return self._cp(1, "", f"unsupported: {cmd}")
        return handler(args)

    @staticmethod
    def _cp(rc, out="", err=""):
        return subprocess.CompletedProcess(["docker"], rc, out, err)

    # --- docker commands ---
    def cmd_run(self, args):
        name = args[args.index("--name") + 1]
        labels = {}
        i = 0
        while i < len(args):
            if args[i] == "--label":
                k, v = args[i + 1].split("=", 1)
                labels[k] = v
            i += 1
        vol = args[args.index("-v") + 1].split(":")[0]
        self.volumes.add(vol)
        self.next_port += 1
        self.containers[name] = {
            "running": True, "image_id": self.image_id, "image": args[args.index("--pids-limit") + 2]
            if "-e" not in args else args[len(args) - args[::-1].index("-e") + 1],
            "labels": labels, "port": self.next_port, "volume": vol,
        }
        return self._cp(0, "abcdef0123\n")

    def cmd_inspect(self, args):
        name = args[-1]
        c = self.containers.get(name)
        if not c:
            return self._cp(1, "", "Error: No such object: " + name)
        return self._cp(0, f"{'true' if c['running'] else 'false'}|{c['image_id']}|{c['image']}\n")

    def cmd_image(self, args):
        if self.image_id is None:
            return self._cp(1, "", "Error: No such image")
        return self._cp(0, self.image_id + "\n")

    def cmd_port(self, args):
        c = self.containers.get(args[1])
        if not c or not c["running"]:
            return self._cp(1, "", "Error: No public port")
        return self._cp(0, f"127.0.0.1:{c['port']}\n")

    def cmd_start(self, args):
        c = self.containers.get(args[-1])
        if not c:
            return self._cp(1, "", "no such container")
        c["running"] = True
        self.next_port += 1
        c["port"] = self.next_port
        return self._cp(0, args[-1] + "\n")

    def cmd_stop(self, args):
        c = self.containers.get(args[-1])
        if not c:
            return self._cp(1, "", "no such container")
        c["running"] = False
        return self._cp(0, args[-1] + "\n")

    def cmd_rm(self, args):
        return self._cp(0 if self.containers.pop(args[-1], None) else 1)

    def cmd_volume(self, args):
        self.volumes.discard(args[-1])
        return self._cp(0)

    def cmd_exec(self, args):
        name = args[1]
        c = self.containers.get(name)
        if self.fail_exec or not c or not c["running"] or name not in self.heartbeats:
            return self._cp(1, "", "stat: cannot stat")
        return self._cp(0, f"{int(self.heartbeats[name])}\n")

    def cmd_ps(self, args):
        lines = []
        for name, c in self.containers.items():
            lines.append(json.dumps({
                "Names": name, "State": "running" if c["running"] else "exited",
                "Image": c["image"], "ID": "abc",
                "Labels": ",".join(f"{k}={v}" for k, v in c["labels"].items()),
            }))
        return self._cp(0, "\n".join(lines) + "\n")


class Clock:
    def __init__(self, t=1_000_000.0):
        self.t = t

    def __call__(self):
        return self.t


def make_broker(env=None, docker=None, clock=None):
    base = {"FL_IMAGE": "cads-firmware-lab:test", "FL_ADMIN_EMAILS": "Admin@Example.test",
            "TUTOR_LLM_BASE_URL": "https://llm.example/v1", "TUTOR_LLM_API_KEY": SECRET,
            "CADS_TUTOR_TELEMETRY_URL": "http://host.docker.internal:3200",
            "CADS_TUTOR_TELEMETRY_TOKEN": TELEMETRY_TOKEN,
            "FL_RESOLVE_CACHE_S": "0"}
    base.update(env or {})
    cfg = fb.Config(base)
    docker = docker or FakeDocker()
    clock = clock or Clock()
    b = fb.Broker(cfg, docker=docker, health=lambda url: True, clock=clock)
    return b, docker, clock


class SlugTests(unittest.TestCase):
    def test_slug_is_prefix_of_sha256_lowercase(self):
        import hashlib
        h = hashlib.sha256(b"student@example.test").hexdigest()
        self.assertEqual(fb.slug_for("Student@Example.TEST "), h[:12])
        self.assertEqual(fb.email_hash("student@example.test"), h)
        self.assertEqual(len(fb.slug_for("x@y")), 12)
        self.assertTrue(fb.is_slug(fb.slug_for("x@y")))
        self.assertFalse(fb.is_slug("../etc"))
        self.assertFalse(fb.is_slug("ABCDEF012345"))


class CreateTests(unittest.TestCase):
    def test_create_args(self):
        b, d, _ = make_broker()
        sess = b.ensure_session("Student@Example.test")
        run = next(c for c in d.calls if c[0] == "run")
        slug = fb.slug_for("student@example.test")
        self.assertEqual(run[:2], ["run", "-d"])
        self.assertIn(f"fl-{slug}", run)
        self.assertIn("cads.firmware-lab=1", run)
        self.assertIn(f"cads.slug={slug}", run)
        self.assertIn(f"cads.email-hash={fb.email_hash('student@example.test')}", run)
        self.assertIn(f"fl-ws-{slug}:/home/coder/workspace", run)
        self.assertIn("127.0.0.1:0:8080", run)          # loopback publish, ephemeral port
        for flag, val in (("--memory", "2g"), ("--cpus", "2"), ("--pids-limit", "2048")):
            self.assertEqual(run[run.index(flag) + 1], val)
        # env passthrough by NAME only; the secret never appears in argv or labels
        self.assertIn("TUTOR_LLM_API_KEY", run)
        self.assertNotIn(SECRET, " ".join(run))
        self.assertFalse(any("email" in a.lower() and "@" in a for a in run))
        self.assertNotIn("TUTOR_LLM_MODEL", run)           # unset -> not passed
        # the portal's address and token reach the container the same way: by name
        self.assertIn("CADS_TUTOR_TELEMETRY_URL", run)
        self.assertIn("CADS_TUTOR_TELEMETRY_TOKEN", run)
        self.assertNotIn(TELEMETRY_TOKEN, " ".join(run))
        img = run.index("cads-firmware-lab:test")
        self.assertEqual(run[img + 1:], ["--auth", "none", "--bind-addr", "0.0.0.0:8080",
                                         "--disable-workspace-trust", "/home/coder/workspace/cads-zero"])
        self.assertEqual(sess.status, "running")
        self.assertEqual(sess.port, 40001)

    def test_second_enter_reuses_container(self):
        b, d, _ = make_broker()
        b.ensure_session("a@b.c")
        b.ensure_session("a@b.c")
        self.assertEqual(sum(1 for c in d.calls if c[0] == "run"), 1)

    def test_stopped_container_is_started(self):
        b, d, _ = make_broker()
        s = b.ensure_session("a@b.c")
        b.stop_session(s.slug)
        self.assertFalse(d.containers[s.name]["running"])
        s2 = b.ensure_session("a@b.c")
        self.assertTrue(d.containers[s.name]["running"])
        self.assertEqual(s2.status, "running")
        self.assertIn(["start", s.name], d.calls)
        self.assertEqual(sum(1 for c in d.calls if c[0] == "run"), 1)

    def test_stopped_container_with_old_image_is_replaced(self):
        b, d, _ = make_broker()
        s = b.ensure_session("a@b.c")
        b.stop_session(s.slug)
        d.image_id = "sha256:newer"           # image was rebuilt
        b.ensure_session("a@b.c")
        self.assertIn(["rm", "-f", s.name], d.calls)
        self.assertEqual(sum(1 for c in d.calls if c[0] == "run"), 2)
        self.assertEqual(d.containers[s.name]["image_id"], "sha256:newer")
        self.assertIn(s.volume, d.volumes)    # workspace survives the rollout

    def test_running_container_with_old_image_is_left_alone(self):
        b, d, _ = make_broker()
        s = b.ensure_session("a@b.c")
        d.image_id = "sha256:newer"
        b.ensure_session("a@b.c")
        self.assertNotIn(["rm", "-f", s.name], d.calls)

    def test_max_sessions(self):
        b, d, _ = make_broker({"FL_MAX_SESSIONS": "2"})
        b.ensure_session("a@b.c")
        b.ensure_session("d@e.f")
        with self.assertRaises(fb.BrokerError) as cm:
            b.ensure_session("g@h.i")
        self.assertEqual(cm.exception.status, 503)
        self.assertIn("Labor voll", cm.exception.message)
        # an existing (running) session is unaffected by the limit
        b.ensure_session("a@b.c")
        # stopping one frees a slot
        b.stop_session(fb.slug_for("d@e.f"))
        b.ensure_session("g@h.i")

    def test_health_timeout_yields_503(self):
        clock = Clock()
        b, d, _ = make_broker({"FL_HEALTH_TIMEOUT_S": "1"}, clock=clock)
        b._health = lambda url: (clock.__setattr__("t", clock.t + 2) or False)
        with self.assertRaises(fb.BrokerError) as cm:
            b.ensure_session("a@b.c")
        self.assertEqual(cm.exception.status, 503)


class ResolveTests(unittest.TestCase):
    def test_resolve_foreign_slug_403(self):
        b, d, _ = make_broker()
        s = b.ensure_session("a@b.c")
        with self.assertRaises(fb.BrokerError) as cm:
            b.resolve("other@b.c", s.slug)
        self.assertEqual(cm.exception.status, 403)
        with self.assertRaises(fb.BrokerError):
            b.resolve("a@b.c", "../../etc")

    def test_resolve_own_slug_updates_last_seen(self):
        clock = Clock()
        b, d, _ = make_broker(clock=clock)
        s = b.ensure_session("a@b.c")
        clock.t += 100
        s2 = b.resolve("A@B.C", s.slug)
        self.assertIs(s, s2)
        self.assertEqual(s.last_seen, clock.t)

    def test_resolve_cache_avoids_docker(self):
        clock = Clock()
        b, d, _ = make_broker({"FL_RESOLVE_CACHE_S": "10"}, clock=clock)
        s = b.ensure_session("a@b.c")
        n = len(d.calls)
        b.resolve("a@b.c", s.slug)
        self.assertEqual(len(d.calls), n)
        clock.t += 11
        b.resolve("a@b.c", s.slug)
        self.assertGreater(len(d.calls), n)


class ReaperTests(unittest.TestCase):
    def test_reaper_stops_only_when_both_signals_old(self):
        clock = Clock()
        b, d, _ = make_broker({"FL_IDLE_STOP_MIN": "10"}, clock=clock)
        s = b.ensure_session("a@b.c")
        # fresh: nothing happens
        self.assertEqual(b.reap_idle(), [])
        # last-seen old, heartbeat fresh -> keep
        clock.t += 11 * 60
        d.heartbeats[s.name] = clock.t - 60
        self.assertEqual(b.reap_idle(), [])
        self.assertTrue(d.containers[s.name]["running"])
        # both old -> stop
        d.heartbeats[s.name] = clock.t - 11 * 60
        self.assertEqual(b.reap_idle(), [s.slug])
        self.assertFalse(d.containers[s.name]["running"])
        self.assertEqual(s.status, "stopped")

    def test_reaper_treats_heartbeat_error_as_old(self):
        clock = Clock()
        b, d, _ = make_broker({"FL_IDLE_STOP_MIN": "10"}, clock=clock)
        s = b.ensure_session("a@b.c")
        clock.t += 11 * 60
        d.fail_exec = True
        self.assertEqual(b.reap_idle(), [s.slug])

    def test_reaper_ignores_recent_last_seen_without_docker_call(self):
        clock = Clock()
        b, d, _ = make_broker({"FL_IDLE_STOP_MIN": "10"}, clock=clock)
        b.ensure_session("a@b.c")
        n = len(d.calls)
        clock.t += 5 * 60
        b.reap_idle()
        self.assertEqual(len(d.calls), n)


class ReconcileTests(unittest.TestCase):
    def test_state_rebuilt_from_docker_ps(self):
        d = FakeDocker()
        b1, _, _ = make_broker(docker=d)
        s1 = b1.ensure_session("a@b.c")
        s2 = b1.ensure_session("d@e.f")
        b1.stop_session(s2.slug)
        # a fresh broker (restart) only knows what docker tells it
        b2, _, _ = make_broker(docker=d)
        b2.reconcile()
        self.assertEqual(set(b2.sessions), {s1.slug, s2.slug})
        self.assertEqual(b2.sessions[s1.slug].status, "running")
        self.assertEqual(b2.sessions[s1.slug].port, d.containers[s1.name]["port"])
        self.assertEqual(b2.sessions[s2.slug].status, "stopped")
        self.assertEqual(b2.sessions[s1.slug].email_hash, fb.email_hash("a@b.c"))
        self.assertEqual(b2.running_count(), 1)

    def test_wipe_removes_container_and_volume(self):
        b, d, _ = make_broker()
        s = b.ensure_session("a@b.c")
        b.wipe_session(s.slug)
        self.assertNotIn(s.name, d.containers)
        self.assertNotIn(s.volume, d.volumes)
        self.assertNotIn(s.slug, b.sessions)


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.b, self.d, self.clock = make_broker()
        self.srv = fb.make_server(self.b, "127.0.0.1", 0)
        self.port = self.srv.server_address[1]
        self.thread = threading.Thread(target=self.srv.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.srv.shutdown()
        self.srv.server_close()

    def req(self, method, path, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.request(method, path, headers=headers or {})
        resp = conn.getresponse()
        body = resp.read().decode()
        conn.close()
        return resp.status, dict(resp.getheaders()), body

    def test_enter_without_identity_403(self):
        st, _, body = self.req("GET", "/_broker/enter")
        self.assertEqual(st, 403)
        self.assertNotIn("run", [c[0] for c in self.d.calls])

    def test_enter_redirects_to_own_slug(self):
        st, h, _ = self.req("GET", "/_broker/enter", {"X-Gate-Email": "Stu@Example.test"})
        self.assertEqual(st, 302)
        slug = fb.slug_for("stu@example.test")
        self.assertEqual(h["Location"], f"/s/{slug}/?folder=/home/coder/workspace/cads-zero")

    def test_resolve(self):
        self.req("GET", "/_broker/enter", {"X-Gate-Email": "a@b.c"})
        slug = fb.slug_for("a@b.c")
        st, h, _ = self.req("GET", f"/_broker/resolve?slug={slug}", {"X-Gate-Email": "a@b.c"})
        self.assertEqual(st, 200)
        self.assertEqual(h["X-FL-Upstream"], "127.0.0.1:40001")
        self.assertEqual(h["X-FL-Port"], "40001")
        st, h, _ = self.req("GET", f"/_broker/resolve?slug={slug}", {"X-Gate-Email": "x@b.c"})
        self.assertEqual(st, 403)
        self.assertNotIn("X-FL-Upstream", h)
        st, _, _ = self.req("GET", f"/_broker/resolve?slug={slug}")
        self.assertEqual(st, 403)

    def test_resolve_capacity_503(self):
        self.b.cfg.max_sessions = 0
        st, _, body = self.req("GET", "/_broker/enter", {"X-Gate-Email": "a@b.c"})
        self.assertEqual(st, 503)
        self.assertIn("Labor voll", body)

    def test_admin_allowlist(self):
        self.req("GET", "/_broker/enter", {"X-Gate-Email": "a@b.c"})
        st, _, _ = self.req("GET", "/_broker/admin", {"X-Gate-Email": "a@b.c"})
        self.assertEqual(st, 403)
        st, _, body = self.req("GET", "/_broker/admin", {"X-Gate-Email": "admin@example.test"})
        self.assertEqual(st, 200)
        data = json.loads(body)
        self.assertEqual(data["sessions"][0]["slug"], fb.slug_for("a@b.c"))
        self.assertEqual(data["sessions"][0]["status"], "running")
        self.assertNotIn("a@b.c", body)
        slug = data["sessions"][0]["slug"]
        st, _, _ = self.req("POST", f"/_broker/admin/stop?slug={slug}", {"X-Gate-Email": "a@b.c"})
        self.assertEqual(st, 403)
        st, _, _ = self.req("POST", f"/_broker/admin/stop?slug={slug}", {"X-Gate-Email": "admin@example.test"})
        self.assertEqual(st, 200)
        self.assertFalse(self.d.containers[f"fl-{slug}"]["running"])
        st, _, _ = self.req("POST", f"/_broker/admin/wipe?slug={slug}", {"X-Gate-Email": "admin@example.test"})
        self.assertEqual(st, 200)
        self.assertNotIn(f"fl-{slug}", self.d.containers)
        st, _, _ = self.req("POST", "/_broker/admin/wipe?slug=zz", {"X-Gate-Email": "admin@example.test"})
        self.assertEqual(st, 400)

    def test_healthz_and_404(self):
        st, _, body = self.req("GET", "/_broker/healthz")
        self.assertEqual(st, 200)
        self.assertTrue(json.loads(body)["ok"])
        st, _, _ = self.req("GET", "/_broker/nope")
        self.assertEqual(st, 404)


if __name__ == "__main__":
    unittest.main()

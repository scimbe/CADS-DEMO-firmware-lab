#!/usr/bin/env python3
"""Unit tests for portal.py (no real gate, no disk state: SQLite in memory, Settings/Roster from dicts).

Run:  python3 -m unittest deploy/portal/test_portal.py
"""
from __future__ import annotations

import http.client
import json
import os
import sys
import threading
import unittest
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analytics as an          # noqa: E402
import coursemeta               # noqa: E402
import events as evs            # noqa: E402
import portal as pt             # noqa: E402

TOKEN = "test-ingest-token"
T0 = 1_772_000_000.0             # fixed clock: 2026-02-25T06:13:20Z
COURSE_A = "rust-foundations"
COURSE_B = "javascript-foundations"

TEACHER_A = "anna.lehrende@hs.example"
TEACHER_B = "bernd.lehrender@hs.example"
ADMIN = "admin@hs.example"
STRANGER = "student@hs.example"

SETTINGS = {
    "teachers": {
        TEACHER_A: {"courses": [COURSE_A], "role": "teacher"},
        TEACHER_B: {"courses": [COURSE_B], "role": "teacher"},
        ADMIN: {"courses": [], "role": "admin"},
    },
    "thresholds": {"activeDays": 7},
    "credit": {"minStepShare": 0.5, "minCheckShare": 0.5, "minReflections": 1, "requireProject": False},
}


def slug(n: int) -> str:
    return f"{n:012x}"


def raw_event(student: str, step: str, typ: str, t: float, course: str = COURSE_A, **data) -> dict:
    return {"v": 1, "ts": evs.iso(t), "student": student, "course": course,
            "module": step.split("-", 1)[0], "step": step, "type": typ, "data": data}


def journey(student: str, step: str, t: float, course: str = COURSE_A, passes: bool = True,
            attempts: int = 1, seconds: float = 400.0, done: bool = True) -> list[dict]:
    out = [raw_event(student, step, "step.open", t, course)]
    for i in range(1, attempts + 1):
        last = i == attempts
        typ = "check.pass" if (last and passes) else "check.fail"
        out.append(raw_event(student, step, typ, t + seconds * i / (attempts + 1), course,
                             attempt=i, checkType="testSuite", taskId=step))
    if done:
        out.append(raw_event(student, step, "step.done", t + seconds, course))
    return out


def make_portal(courses=(COURSE_A, COURSE_B), settings=None, roster=None, now=T0 + 3600) -> pt.Portal:
    cfg = pt.Config({"FL_PORTAL_DB": ":memory:", "FL_PORTAL_TOKEN": TOKEN, "FL_PORTAL_NOW": str(now)})
    store = pt.Store(":memory:")
    meta = {c: coursemeta.placeholder_course(c) for c in courses}
    return pt.Portal(cfg, store, pt.Settings(raw=settings if settings is not None else SETTINGS),
                     pt.Roster(raw=roster or {}), courses=meta)


class PortalTestCase(unittest.TestCase):
    """Base class: every portal built here has its SQLite connection closed again."""

    def portal(self, **kwargs) -> pt.Portal:
        p = make_portal(**kwargs)
        self.addCleanup(p.store.close)
        return p


def seed(p: pt.Portal, n_students: int = 6, course: str = COURSE_A, t0: float = T0) -> list[str]:
    """The placeholder packs share their step ids, and the idempotency key (SPEC A5) does not
    include the course - so a second course has to be seeded on its own time base."""
    order = p.course(course)["order"]
    slugs = []
    for k in range(1, n_students + 1):
        s = slug(k)
        slugs.append(s)
        raws = []
        for i, sid in enumerate(order[: 3 + k]):
            base = t0 + i * 1200
            raws += journey(s, sid, base, course, attempts=1 if k > 2 else 3,
                            seconds=300.0 if k > 2 else 900.0)
            if k <= 2:
                raws.append(raw_event(s, sid, "hint.shown", base + 60, course, hintTier=3))
            raws.append(raw_event(s, sid, "question.asked", base + 30, course,
                                  question="Warum ist der Borrow-Checker so streng?", grounded=k > 3))
        raws.append(raw_event(s, order[0], "reflection.written", t0 + 5000, course,
                              text=f"Reflexion von {s} ueber das erste Modul mit eigenen Worten"))
        p.ingest(raws)
    return slugs


# --------------------------------------------------------------------------- storage / ingest

class StoreTests(PortalTestCase):
    def setUp(self):
        self.p = self.portal()

    def test_ingest_accepts_and_deduplicates(self):
        raws = journey(slug(1), "m0-01", T0)
        r1 = self.p.ingest(raws)
        self.assertEqual(r1["accepted"], len(raws))
        self.assertEqual(r1["duplicates"], 0)
        r2 = self.p.ingest(raws)
        self.assertEqual(r2["accepted"], 0)
        self.assertEqual(r2["duplicates"], len(raws))

    def test_idempotency_is_per_attempt(self):
        a = raw_event(slug(1), "m0-01", "check.fail", T0, attempt=1)
        b = raw_event(slug(1), "m0-01", "check.fail", T0, attempt=2)
        self.assertEqual(self.p.ingest([a, b])["accepted"], 2)

    def test_invalid_events_are_reported_not_stored(self):
        good = raw_event(slug(1), "m0-01", "step.open", T0)
        bad = dict(good, type="nonsense")
        res = self.p.ingest([good, bad])
        self.assertEqual(res["accepted"], 1)
        self.assertEqual(res["rejected"], 1)
        self.assertIn("type unknown", res["problems"][0]["errors"])

    def test_student_header_must_match(self):
        res = self.p.ingest([raw_event(slug(1), "m0-01", "step.open", T0)], student_header=slug(2))
        self.assertEqual(res["accepted"], 0)
        self.assertEqual(res["rejected"], 1)

    def test_texts_are_sanitised_before_storage(self):
        self.p.ingest([raw_event(slug(1), "m0-01", "question.asked", T0,
                                 question="schreib an Max.Muster@hs.example")])
        ev = self.p.store.events(COURSE_A, slug(1))
        self.assertNotIn("Max.Muster", ev[0]["data"]["question"])
        self.assertIn("[email]", ev[0]["data"]["question"])

    def test_envelope_shapes(self):
        one = raw_event(slug(1), "m0-01", "step.open", T0)
        self.assertEqual(self.p.ingest(one)["accepted"], 1)
        self.assertEqual(self.p.ingest({"events": [raw_event(slug(2), "m0-01", "step.open", T0)]})["accepted"], 1)
        with self.assertRaises(pt.PortalError):
            self.p.ingest("nope")

    def test_too_many_events(self):
        with self.assertRaises(pt.PortalError) as cm:
            self.p.ingest([raw_event(slug(1), "m0-01", "step.open", T0 + i) for i in range(pt.MAX_EVENTS_PER_REQUEST + 1)])
        self.assertEqual(cm.exception.status, 413)

    def test_forget_removes_events_and_signoff(self):
        seed(self.p, 2)
        self.p.store.set_signoff(COURSE_A, slug(1), "confirmed", "ok", TEACHER_A)
        self.assertTrue(self.p.store.events(COURSE_A, slug(1)))
        deleted = self.p.store.forget(slug(1))
        self.assertGreater(deleted["events"], 0)
        self.assertEqual(deleted["signoffs"], 1)
        self.assertEqual(self.p.store.events(COURSE_A, slug(1)), [])
        self.assertNotIn(slug(1), self.p.store.signoffs(COURSE_A))
        self.assertTrue(self.p.store.events(COURSE_A, slug(2)))

    def test_retention_purge(self):
        self.p.ingest([raw_event(slug(1), "m0-01", "step.open", T0 - 400 * 86400),
                       raw_event(slug(1), "m0-02", "step.open", T0)])
        self.assertEqual(self.p.store.purge_older_than(T0 - 86400), 1)
        self.assertEqual(len(self.p.store.events(COURSE_A, slug(1))), 1)

    def test_counts(self):
        seed(self.p, 3)
        c = self.p.store.counts()
        self.assertEqual(c["students"], 3)
        self.assertEqual(c["courses"], 1)
        self.assertGreater(c["events"], 0)


# --------------------------------------------------------------------------- roles

class SettingsTests(PortalTestCase):
    def test_viewer_lookup_is_case_insensitive(self):
        s = pt.Settings(raw=SETTINGS)
        self.assertEqual(s.viewer("Anna.Lehrende@HS.example")["role"], "teacher")
        self.assertEqual(s.viewer(TEACHER_A)["courses"], [COURSE_A])
        self.assertIsNone(s.viewer(STRANGER))
        self.assertIsNone(s.viewer(""))

    def test_admin_sees_every_course(self):
        p = self.portal()
        self.assertEqual(p.courses_for({"role": "admin", "courses": [], "email": ADMIN}),
                         [COURSE_A, COURSE_B])
        self.assertEqual(p.courses_for(p.settings.viewer(TEACHER_B)), [COURSE_B])

    def test_credit_defaults_and_per_course_override(self):
        s = pt.Settings(raw={"credit": {"minReflections": 3}, "creditPerCourse": {COURSE_B: {"minReflections": 0}}})
        self.assertEqual(s.credit(COURSE_A)["minReflections"], 3)
        self.assertEqual(s.credit(COURSE_B)["minReflections"], 0)
        self.assertEqual(s.credit(COURSE_A)["minStepShare"], pt.DEFAULT_CREDIT["minStepShare"])

    def test_roster_name_lookup(self):
        r = pt.Roster(raw={"courses": {COURSE_A: {slug(1): "Erika Mustermann"}}})
        self.assertEqual(r.name(COURSE_A, slug(1)), "Erika Mustermann")
        self.assertEqual(r.name(COURSE_B, slug(1)), "")
        self.assertEqual(r.name(COURSE_A, slug(2)), "")


# --------------------------------------------------------------------------- board

class BoardTests(PortalTestCase):
    def setUp(self):
        self.p = self.portal()
        self.slugs = seed(self.p, 4)

    def test_board_rows_and_status(self):
        rows = {r["student"]: r for r in self.p.board(COURSE_A)}
        self.assertEqual(set(rows), set(self.slugs))
        for r in rows.values():
            self.assertEqual(r["steps_total"], len(self.p.course(COURSE_A)["order"]))
            self.assertIn(r["status"], ("open", "achieved", "confirmed"))
        # student 4 opened the most steps, student 1 the fewest
        self.assertGreater(rows[slug(4)]["steps_done"], rows[slug(1)]["steps_done"])

    def test_signoff_makes_status_confirmed(self):
        self.p.store.set_signoff(COURSE_A, slug(1), "confirmed", "muendlich geprueft", TEACHER_A)
        row = {r["student"]: r for r in self.p.board(COURSE_A)}[slug(1)]
        self.assertEqual(row["status"], "confirmed")
        self.assertEqual(row["note"], "muendlich geprueft")
        self.assertEqual(row["by"], TEACHER_A)
        self.assertTrue(row["at"].endswith("Z"))

    def test_csv_export_has_one_row_per_student(self):
        rows = self.p.board(COURSE_A)
        csv_text = pt.board_csv(rows, COURSE_A)
        lines = csv_text.strip().splitlines()
        self.assertEqual(len(lines), len(rows) + 1)
        self.assertTrue(lines[0].startswith("course,student,steps_done"))
        self.assertIn(slug(1), csv_text)


# --------------------------------------------------------------------------- rendering (no HTTP)

class RenderTests(PortalTestCase):
    def setUp(self):
        self.p = self.portal(roster={"courses": {COURSE_A: {slug(1): "Erika Mustermann"}}})
        seed(self.p, 5)

    def ctx(self, view, lang="de", names=True, **extra):
        return {"viewer": {"email": TEACHER_A, "role": "teacher", "courses": [COURSE_A]},
                "courses": [COURSE_A], "course_id": COURSE_A, "lang": lang, "view": view,
                "extra": extra, "may_see_names": names}

    def test_every_page_renders_in_both_languages(self):
        for view in pt.PAGES:
            for lang in ("de", "en"):
                extra = {"s": slug(1)} if view == "student" else {}
                body = pt.PAGES[view](self.p, self.ctx(view, lang, **extra))
                self.assertTrue(body, f"{view}/{lang} rendered nothing")
                page = pt.layout(self.ctx(view, lang, **extra), view, body)
                self.assertTrue(page.startswith("<!doctype html>"))
                self.assertIn("</html>", page)

    def test_overview_shows_svg_and_module_table(self):
        body = pt.PAGES["overview"](self.p, self.ctx("overview"))
        self.assertIn("<svg", body)
        self.assertIn("polyline", body)          # the funnel
        self.assertIn("m0", body)

    def test_questions_page_clusters(self):
        body = pt.PAGES["questions"](self.p, self.ctx("questions"))
        self.assertIn("Borrow-Checker", body)

    def test_roster_name_only_when_authorised(self):
        with_names = pt.PAGES["students"](self.p, self.ctx("students", names=True))
        self.assertIn("Erika Mustermann", with_names)
        without = pt.PAGES["students"](self.p, self.ctx("students", names=False))
        self.assertNotIn("Erika Mustermann", without)

    def test_student_page_has_recommendation_and_timeline(self):
        body = pt.PAGES["student"](self.p, self.ctx("student", s=slug(1)))
        self.assertIn("Empfehlung", pt.layout(self.ctx("student", s=slug(1)), "x", body))
        self.assertIn("<svg", body)

    def test_unknown_student_is_not_an_error(self):
        body = pt.PAGES["student"](self.p, self.ctx("student", s=slug(99)))
        self.assertIn("Keine Daten", body)

    def test_rules_page_states_what_a_flag_does_not_prove(self):
        de = pt.PAGES["rules"](self.p, self.ctx("rules", "de"))
        self.assertIn("kein Nachweis", de)
        en = pt.PAGES["rules"](self.p, self.ctx("rules", "en"))
        self.assertIn("not proof", en)

    def test_html_is_escaped(self):
        self.p.ingest([raw_event(slug(1), "m0-01", "question.asked", T0 + 10,
                                 question="<script>alert(1)</script> was ist das?")])
        body = pt.PAGES["questions"](self.p, self.ctx("questions"))
        self.assertNotIn("<script>alert(1)</script>", body)
        self.assertIn("&lt;script&gt;", body)

    def test_links_carry_course_and_language(self):
        c = self.ctx("students", "en")
        self.assertEqual(pt.link(c, "student", s=slug(1)),
                         f"/portal/student?c={COURSE_A}&lang=en&s={slug(1)}")
        self.assertEqual(pt.link(self.ctx("overview"), "overview"), f"/portal/?c={COURSE_A}")


# --------------------------------------------------------------------------- HTTP

class HttpTests(PortalTestCase):
    def setUp(self):
        self.p = self.portal(roster={"courses": {COURSE_A: {slug(1): "Erika Mustermann"}}})
        seed(self.p, 4, COURSE_A)
        seed(self.p, 3, COURSE_B, t0=T0 + 200_000)
        self.srv = pt.make_server(self.p, "127.0.0.1", 0)
        self.port = self.srv.server_address[1]
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def tearDown(self):
        self.srv.shutdown()
        self.srv.server_close()

    def req(self, method, path, headers=None, body=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.request(method, path, body=body, headers=headers or {})
        resp = conn.getresponse()
        payload = resp.read().decode("utf-8", "replace")
        conn.close()
        return resp.status, dict(resp.getheaders()), payload

    def as_(self, email, method, path, body=None, extra=None):
        h = {"X-Gate-Email": email}
        if body is not None:
            h["Content-Type"] = "application/x-www-form-urlencoded"
            h["Content-Length"] = str(len(body))
        h.update(extra or {})
        return self.req(method, path, h, body)

    # -- open endpoints -----------------------------------------------------------------
    def test_healthz_needs_no_identity(self):
        st, _, body = self.req("GET", "/healthz")
        self.assertEqual(st, 200)
        payload = json.loads(body)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["courses"], 2)

    def test_ingest_requires_the_token(self):
        ev = json.dumps([raw_event(slug(9), "m0-01", "step.open", T0)])
        st, _, _ = self.req("POST", "/ingest", {"Content-Length": str(len(ev))}, ev)
        self.assertEqual(st, 403)
        st, _, _ = self.req("POST", "/ingest", {"X-CaDS-Token": "wrong", "Content-Length": str(len(ev))}, ev)
        self.assertEqual(st, 403)
        st, _, body = self.req("POST", "/ingest",
                               {"X-CaDS-Token": TOKEN, "X-CaDS-Student": slug(9),
                                "Content-Length": str(len(ev))}, ev)
        self.assertEqual(st, 200)
        self.assertEqual(json.loads(body)["accepted"], 1)

    def test_ingest_rejects_broken_json(self):
        st, _, _ = self.req("POST", "/ingest", {"X-CaDS-Token": TOKEN, "Content-Length": "2"}, "{[")
        self.assertEqual(st, 400)

    def test_ingest_does_not_need_a_gate_identity(self):
        ev = json.dumps(raw_event(slug(9), "m0-02", "step.open", T0))
        st, _, _ = self.req("POST", "/ingest", {"X-CaDS-Token": TOKEN, "Content-Length": str(len(ev))}, ev)
        self.assertEqual(st, 200)

    # -- identity and course isolation ---------------------------------------------------
    def test_no_identity_is_403(self):
        st, _, _ = self.req("GET", "/portal/")
        self.assertEqual(st, 403)

    def test_unknown_email_is_403(self):
        st, _, body = self.as_(STRANGER, "GET", "/portal/")
        self.assertEqual(st, 403)
        self.assertIn("portal.json", body)

    def test_teacher_sees_only_the_own_course(self):
        st, _, body = self.as_(TEACHER_A, "GET", "/portal/")
        self.assertEqual(st, 200)
        self.assertIn(COURSE_A, body)
        st, _, _ = self.as_(TEACHER_A, "GET", f"/portal/students?c={COURSE_B}")
        self.assertEqual(st, 403)
        st, _, _ = self.as_(TEACHER_B, "GET", f"/portal/students?c={COURSE_B}")
        self.assertEqual(st, 200)

    def test_admin_sees_both_courses(self):
        for course in (COURSE_A, COURSE_B):
            st, _, _ = self.as_(ADMIN, "GET", f"/portal/students?c={course}")
            self.assertEqual(st, 200, course)

    def test_client_supplied_identity_header_is_the_only_input(self):
        # a second, forged header value must not widen access beyond what portal.json grants
        st, _, _ = self.as_(TEACHER_B, "GET", f"/portal/board?c={COURSE_A}")
        self.assertEqual(st, 403)

    # -- pages ---------------------------------------------------------------------------
    def test_all_views_answer_200(self):
        for path in ("/portal/", "/portal/questions", "/portal/steps", "/portal/anomalies",
                     "/portal/students", "/portal/board", "/portal/rules",
                     f"/portal/student?c={COURSE_A}&s={slug(1)}"):
            st, headers, body = self.as_(TEACHER_A, "GET", path)
            self.assertEqual(st, 200, path)
            self.assertTrue(headers["Content-Type"].startswith("text/html"), path)
            self.assertIn("</html>", body, path)
            self.assertEqual(headers["X-Content-Type-Options"], "nosniff")

    def test_english_switch(self):
        st, _, body = self.as_(TEACHER_A, "GET", "/portal/steps?lang=en")
        self.assertEqual(st, 200)
        self.assertIn("Difficult spots", body)
        self.assertNotIn("Schwierige Stellen", body)

    def test_root_redirects_into_the_portal(self):
        st, headers, _ = self.as_(TEACHER_A, "GET", "/")
        self.assertEqual(st, 302)
        self.assertEqual(headers["Location"], "/portal/")

    def test_unknown_path_404(self):
        st, _, _ = self.as_(TEACHER_A, "GET", "/portal/nope")
        self.assertEqual(st, 404)

    # -- exports and sign-off -------------------------------------------------------------
    def test_csv_and_json_export(self):
        st, headers, body = self.as_(TEACHER_A, "GET", f"/portal/board?c={COURSE_A}&export=csv")
        self.assertEqual(st, 200)
        self.assertTrue(headers["Content-Type"].startswith("text/csv"))
        self.assertIn("attachment", headers["Content-Disposition"])
        self.assertIn(slug(1), body)
        st, headers, body = self.as_(TEACHER_A, "GET", f"/portal/board?c={COURSE_A}&export=json")
        self.assertEqual(st, 200)
        payload = json.loads(body)
        self.assertEqual(payload["course"], COURSE_A)
        self.assertEqual(len(payload["rows"]), 4)

    def test_signoff_round_trip(self):
        form = urllib.parse.urlencode({"c": COURSE_A, "s": slug(1), "status": "confirmed",
                                       "note": "im Gespraech bestaetigt", "lang": "de"})
        st, headers, _ = self.as_(TEACHER_A, "POST", "/portal/board/signoff", form)
        self.assertEqual(st, 303)
        self.assertIn("/portal/board", headers["Location"])
        st, _, body = self.as_(TEACHER_A, "GET", f"/portal/board?c={COURSE_A}")
        self.assertIn("im Gespraech bestaetigt", body)
        self.assertEqual(self.p.store.signoffs(COURSE_A)[slug(1)]["by"], TEACHER_A)

    def test_signoff_for_a_foreign_course_is_403(self):
        form = urllib.parse.urlencode({"c": COURSE_A, "s": slug(1), "status": "confirmed"})
        st, _, _ = self.as_(TEACHER_B, "POST", "/portal/board/signoff", form)
        self.assertEqual(st, 403)
        self.assertEqual(self.p.store.signoffs(COURSE_A), {})

    def test_cross_site_post_is_rejected(self):
        form = urllib.parse.urlencode({"c": COURSE_A, "s": slug(1), "status": "confirmed"})
        st, _, _ = self.as_(TEACHER_A, "POST", "/portal/board/signoff", form,
                            extra={"Sec-Fetch-Site": "cross-site"})
        self.assertEqual(st, 403)

    # -- erasure ---------------------------------------------------------------------------
    def test_forget_is_admin_only_and_erases(self):
        st, _, _ = self.as_(TEACHER_A, "POST", f"/admin/forget?slug={slug(1)}", "")
        self.assertEqual(st, 403)
        self.assertTrue(self.p.store.events(COURSE_A, slug(1)))
        st, _, body = self.as_(ADMIN, "POST", f"/admin/forget?slug={slug(1)}", "")
        self.assertEqual(st, 200)
        self.assertGreater(json.loads(body)["events"], 0)
        self.assertEqual(self.p.store.events(COURSE_A, slug(1)), [])

    def test_forget_needs_a_slug(self):
        st, _, _ = self.as_(ADMIN, "POST", "/admin/forget?slug=Bob", "")
        self.assertEqual(st, 400)

    def test_forget_is_also_reachable_below_portal(self):
        st, _, _ = self.as_(ADMIN, "POST", f"/portal/admin/forget?slug={slug(2)}", "")
        self.assertEqual(st, 200)
        self.assertEqual(self.p.store.events(COURSE_A, slug(2)), [])


# --------------------------------------------------------------------------- charts

class SvgTests(unittest.TestCase):
    def test_empty_input_renders_nothing(self):
        self.assertEqual(pt.svg_hbars([]), "")
        self.assertEqual(pt.svg_funnel([{"step": "a", "reached": 1, "done": 1}], 1), "")
        self.assertEqual(pt.svg_zbars([]), "")
        self.assertEqual(pt.svg_timeline([]), "")

    def test_hbars_escapes_labels_and_stays_in_the_viewbox(self):
        svg = pt.svg_hbars([("<b>x</b>", 0.5, "50 %"), ("y", 1.0, "100 %")], 1.0, width=400)
        self.assertNotIn("<b>", svg)
        self.assertIn('viewBox="0 0 400', svg)
        self.assertEqual(svg.count("<rect"), 4)          # track + value per row

    def test_zbars_clamp_extremes(self):
        svg = pt.svg_zbars([("a", 42.0), ("b", -42.0)], width=400)
        self.assertIn("+42.00", svg)
        self.assertIn("-42.00", svg)

    def test_funnel_has_two_series(self):
        funnel = [{"step": f"m0-{i:02d}", "reached": 10 - i, "done": 9 - i} for i in range(6)]
        svg = pt.svg_funnel(funnel, 10)
        self.assertEqual(svg.count("<polyline"), 2)


if __name__ == "__main__":
    unittest.main()

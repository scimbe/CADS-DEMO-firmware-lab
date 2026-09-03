#!/usr/bin/env python3
"""Unit tests for analytics.py / events.py / coursemeta.py (pure functions, hand-built fixtures).

Run:  python3 -m unittest -v deploy/portal/test_analytics.py
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analytics as an  # noqa: E402
import coursemeta  # noqa: E402
import events as evs  # noqa: E402

T0 = 1_780_000_000.0  # some epoch in 2026
COURSE = coursemeta.placeholder_course("rust-foundations")  # m0-01 .. m2-04


def ev(student, step, typ, t, **data):
    raw = {"v": 1, "ts": evs.iso(T0 + t), "student": student, "course": "rust-foundations",
           "module": step.split("-")[0] if step else None, "step": step or None, "type": typ, "data": data}
    assert not evs.validate_event(raw), evs.validate_event(raw)
    return evs.normalize_event(raw)


def slug(n: int) -> str:
    return f"{n:012x}"


def journey(student, step, t, first_pass=True, attempts=1, hints=(), seconds=600, typed=400, pasted=50,
            done=True, question=None, grounded=True, reflection=None, verdict=None):
    """A typical run through one step, starting at offset t (seconds)."""
    out = [ev(student, step, "step.open", t)]
    cur = t + 5
    if question:
        out.append(ev(student, step, "question.asked", cur, question=question, grounded=grounded))
        cur += 5
    for tier in hints:
        out.append(ev(student, step, "hint.shown", cur, hintTier=tier))
        cur += 5
    n_fail = 0 if first_pass else max(1, attempts - 1)
    for i in range(n_fail):
        out.append(ev(student, step, "check.run", cur, taskId="t1", attempt=i + 1))
        out.append(ev(student, step, "check.fail", cur + 1, taskId="t1", attempt=i + 1))
        cur += 30
    out.append(ev(student, step, "edit.metrics", cur, typedChars=typed, pastedChars=pasted, pasteEvents=1))
    out.append(ev(student, step, "check.run", t + seconds - 1, taskId="t1", attempt=n_fail + 1))
    out.append(ev(student, step, "check.pass", t + seconds, taskId="t1", attempt=n_fail + 1))
    if verdict:
        out.append(ev(student, step, "question.answered", t + seconds + 1, verdict=verdict, answer="a b c"))
    if reflection:
        out.append(ev(student, step, "reflection.written", t + seconds + 2, text=reflection))
    if done:
        out.append(ev(student, step, "step.done", t + seconds + 3))
    return out


class EventSchemaTests(unittest.TestCase):
    def test_valid_event(self):
        raw = {"v": 1, "ts": "2026-09-03T03:10:00Z", "student": "abcdef012345", "course": "rust-foundations",
               "module": "m1", "step": "m1-02-move", "type": "check.pass", "data": {"attempt": 2}}
        self.assertEqual(evs.validate_event(raw), [])
        n = evs.normalize_event(raw)
        self.assertEqual(n["ts"], "2026-09-03T03:10:00Z")
        self.assertEqual(evs.idempotency_key(n), "abcdef012345|2026-09-03T03:10:00Z|check.pass|m1-02-move|2")

    def test_invalid_events(self):
        base = {"v": 1, "ts": "2026-09-03T03:10:00Z", "student": "abcdef012345", "course": "c", "step": "s",
                "type": "step.open", "data": {}}
        for patch in ({"v": 2}, {"ts": "gestern"}, {"student": "Bob"}, {"type": "x.y"}, {"course": "../x"},
                      {"data": {"attempt": -1}}, {"data": {"hintTier": 4}}, {"data": {"verdict": "maybe"}},
                      {"data": {"grounded": "yes"}}, {"data": []}):
            raw = dict(base, **patch)
            self.assertTrue(evs.validate_event(raw), patch)
        self.assertTrue(evs.validate_event("nope"))
        # session events need no step
        self.assertEqual(evs.validate_event(dict(base, type="session.start", step=None)), [])
        self.assertTrue(evs.validate_event(dict(base, step=None)))

    def test_sanitize(self):
        s = evs.sanitize_text("mail me at Max.Muster@hs.example and see https://u:pw@host/x?a=1 or ?token=abc")
        self.assertNotIn("Max.Muster@", s)
        self.assertNotIn("u:pw@", s)
        self.assertIn("[email]", s)
        self.assertIn("[url]", s)
        self.assertIn("token=[redacted]", s)
        self.assertEqual(len(evs.sanitize_text("x" * 5000)), evs.MAX_TEXT)
        self.assertEqual(evs.sanitize_text(None), "")

    def test_parse_ts(self):
        self.assertEqual(evs.parse_ts("2026-01-01T00:00:00Z"), evs.parse_ts("2026-01-01T01:00:00+01:00"))
        self.assertIsNone(evs.parse_ts("2026-01-01"))
        self.assertIsNone(evs.parse_ts(5))


class CourseMetaTests(unittest.TestCase):
    def test_placeholder(self):
        c = coursemeta.placeholder_course("javascript-foundations")
        self.assertEqual(len(c["order"]),
                         coursemeta.PLACEHOLDER_MODULES * coursemeta.PLACEHOLDER_STEPS_PER_MODULE)
        # the Bloom level advances by module and stops at "evaluate"
        self.assertEqual(c["steps"]["m0-01"]["bloom"], "remember")
        self.assertEqual(c["steps"]["m0-04"]["bloom"], "remember")
        self.assertEqual(c["steps"]["m2-04"]["bloom"], "apply")
        self.assertEqual(c["steps"]["m5-04"]["bloom"], "evaluate")
        self.assertNotIn("create", {m["bloom"] for m in c["steps"].values()})
        self.assertTrue(c["placeholder"])

    def test_real_course_if_present(self):
        root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "courses")
        if not os.path.isdir(os.path.join(root, "cads-zero-foundations")):
            self.skipTest("course pack not checked out")
        c = coursemeta.load_course(root, "cads-zero-foundations")
        self.assertFalse(c["placeholder"])
        self.assertIn("m0-01-welcome", c["order"])
        self.assertEqual(c["steps"]["m0-01-welcome"]["bloom"], "remember")
        self.assertEqual(c["steps"]["m0-01-welcome"]["objectives"], ["firmware-hardware"])
        self.assertEqual(c["steps"]["m2-05-explorer-command"]["bloom"], "create")
        self.assertIn("cz.quality.cleanroom-pr", coursemeta.objectives_of(c))


class TextTests(unittest.TestCase):
    def test_tokens_and_jaccard(self):
        self.assertEqual(an.tokens_of("Warum ist der Borrow-Checker so streng?"), ["borrow", "checker", "streng"])
        self.assertEqual(an.jaccard({"a", "b"}, {"a", "b"}), 1.0)
        self.assertEqual(an.jaccard({"a", "b"}, {"c"}), 0.0)
        self.assertAlmostEqual(an.jaccard({"a", "b", "c"}, {"a", "b", "d"}), 0.5)
        self.assertEqual(an.jaccard(set(), set()), 1.0)

    def test_percentile_nearest_rank(self):
        vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        self.assertEqual(an.percentile(vals, 90), 9)
        self.assertEqual(an.percentile(vals, 10), 1)
        self.assertEqual(an.percentile(vals, 50), 5)
        self.assertEqual(an.percentile([], 50), 0.0)

    def test_zscores(self):
        z = an.zscores({"a": 1.0, "b": 2.0, "c": 3.0})
        self.assertAlmostEqual(z["b"], 0.0)
        self.assertAlmostEqual(z["c"], -z["a"])
        self.assertEqual(an.zscores({"a": 5.0, "b": 5.0}), {"a": 0.0, "b": 0.0})
        self.assertEqual(an.zscores({"a": 5.0}), {"a": 0.0})


class ClusterTests(unittest.TestCase):
    def test_clusters_variants_and_representative(self):
        qs = [
            {"text": "Warum ist der Borrow-Checker so streng?", "student": "a", "step": "m1-02", "grounded": True},
            {"text": "warum ist der borrow checker so streng", "student": "b", "step": "m1-02", "grounded": True},
            {"text": "Wieso ist der Borrow-Checker streng?", "student": "c", "step": "m1-02", "grounded": False},
            {"text": "Warum ist der Borrow-Checker so streng?", "student": "d", "step": "m1-03", "grounded": True},
            {"text": "Wie installiere ich cargo?", "student": "a", "step": "m0-01", "grounded": True},
            {"text": "", "student": "a", "step": "m0-01"},
        ]
        cl = an.cluster_questions(qs, 0.6)
        self.assertEqual(len(cl), 2)
        top = cl[0]
        self.assertEqual(top["count"], 4)
        self.assertEqual(top["representative"], "Warum ist der Borrow-Checker so streng?")
        self.assertEqual(top["students"], 4)
        self.assertEqual(top["top_step"], "m1-02")
        self.assertAlmostEqual(top["ungrounded_rate"], 0.25)
        self.assertEqual(cl[1]["count"], 1)

    def test_cluster_threshold_respected(self):
        qs = [{"text": "a b c d e", "student": "x", "step": "s"}, {"text": "a b c d f", "student": "y", "step": "s"},
              {"text": "a b g h i", "student": "z", "step": "s"}]
        self.assertEqual(len(an.cluster_questions(qs, 0.6)), 2)   # 4/6 = 0.67 merges; 2/8 does not
        self.assertEqual(len(an.cluster_questions(qs, 0.7)), 3)

    def test_deterministic_order(self):
        qs = [{"text": t, "student": s, "step": "s"} for s, t in
              (("a", "x y z"), ("b", "p q r"), ("c", "p q r"), ("d", "x y z"), ("e", "p q r"))]
        a = an.cluster_questions(qs)
        b = an.cluster_questions(list(reversed(qs)))
        self.assertEqual([c["representative"] for c in a], [c["representative"] for c in b])
        self.assertEqual(a[0]["representative"], "p q r")


class StepDifficultyTests(unittest.TestCase):
    def test_step_stats(self):
        e = []
        e += journey(slug(1), "m0-01", 0, first_pass=True, seconds=100)
        e += journey(slug(2), "m0-01", 0, first_pass=False, attempts=3, hints=(1, 3), seconds=300)
        e += [ev(slug(3), "m0-01", "step.open", 0), ev(slug(3), "m0-01", "check.fail", 20, attempt=1)]  # abandoned
        e += journey(slug(1), "m0-02", 1000, seconds=50)
        rows = {r["step"]: r for r in an.step_difficulty(e, COURSE["order"])}
        r = rows["m0-01"]
        self.assertEqual(r["opened"], 3)
        self.assertEqual(r["done"], 2)
        self.assertEqual(r["with_checks"], 3)
        self.assertAlmostEqual(r["first_fail_rate"], 2 / 3)
        self.assertAlmostEqual(r["mean_attempts"], (1 + 3 + 1) / 3)
        self.assertEqual(r["hint_tiers"], {1: 1, 2: 0, 3: 1})
        self.assertEqual(r["median_time_to_pass_s"], 200.0)
        self.assertAlmostEqual(r["abandon_rate"], 1 / 3)
        self.assertEqual(rows["m0-02"]["opened"], 1)
        self.assertEqual(rows["m2-04"]["opened"], 0)
        self.assertGreater(an.difficulty_score(r), an.difficulty_score(rows["m0-02"]))
        self.assertEqual(len(rows), len(COURSE["order"]))


class StudentMetricsTests(unittest.TestCase):
    def test_metrics(self):
        s = slug(7)
        e = [ev(s, "", "session.start", -10)]
        e += journey(s, "m0-01", 0, first_pass=True, seconds=120, question="Was ist ownership?", grounded=False)
        e += journey(s, "m0-02", 1000, first_pass=False, attempts=2, hints=(2, 3, 3), seconds=600)
        e += [ev(s, "m0-03", "step.open", 3000)]
        e += [ev(s, "", "session.end", 3100)]
        m = an.student_metrics(e, COURSE["order"], now=T0 + 3100 + 86400 * 2)[s]
        self.assertEqual(m["steps_opened"], 3)
        self.assertEqual(m["steps_done"], 2)
        self.assertAlmostEqual(m["progress"], 2 / len(COURSE["order"]))
        self.assertEqual(m["steps_with_checks"], 2)
        self.assertEqual(m["first_pass_rate"], 0.5)
        self.assertEqual(m["mean_attempts"], 1.5)
        self.assertEqual(m["hints"], 3)
        self.assertEqual(m["tier3"], 2)
        self.assertEqual(m["tier3_per_step"], 1.0)
        self.assertEqual(m["median_step_time_s"], (123 + 603) / 2)
        self.assertEqual(m["questions"], 1)
        self.assertEqual(m["ungrounded_questions"], 1)
        self.assertEqual(m["abandoned"], 1)
        self.assertAlmostEqual(m["paste_share"], 100 / 900)
        self.assertEqual(m["sessions"], 1)
        self.assertAlmostEqual(m["days_since_active"], 2.0)

    def test_zscore_columns(self):
        e = journey(slug(1), "m0-01", 0, seconds=100) + journey(slug(2), "m0-01", 0, seconds=300) \
            + journey(slug(3), "m0-01", 0, seconds=200)
        m = an.student_metrics(e, COURSE["order"])
        z = an.cohort_zscores(m)
        self.assertGreater(z[slug(2)]["median_step_time_s"], 0)
        self.assertLess(z[slug(1)]["median_step_time_s"], 0)
        self.assertEqual(z[slug(1)]["first_pass_rate"], 0.0)


class CheatIndicatorTests(unittest.TestCase):
    def test_fast_paste_pass(self):
        s = slug(9)
        e = journey(s, "m0-01", 0, seconds=30, typed=20, pasted=900)     # 30 s, 98 % pasted, no fail
        e += journey(s, "m0-02", 100, seconds=30, typed=900, pasted=20)  # fast but typed -> no hit
        e += journey(s, "m0-03", 200, seconds=300, typed=20, pasted=900)  # pasted but slow -> no hit
        e += journey(s, "m0-04", 600, first_pass=False, attempts=2, seconds=40, typed=20, pasted=900)  # failed first
        m = an.student_metrics(e, COURSE["order"])
        hits = an.fast_paste_passes(m, 60, 0.8)
        self.assertEqual([h["step"] for h in hits[s]], ["m0-01"])

    def test_identical_texts(self):
        txt = "Ownership bedeutet dass jeder Wert genau einen Besitzer hat und beim Verlassen des Scopes freigegeben wird"
        e = journey(slug(1), "m0-01", 0, reflection=txt)
        e += journey(slug(2), "m0-01", 500, reflection=txt + " wirklich")
        e += journey(slug(3), "m0-01", 900, reflection="Ich fand den Step schwer aber lehrreich, vor allem den Compiler")
        e += journey(slug(4), "m0-02", 900, reflection=txt)   # other step -> not compared
        e += journey(slug(5), "m0-01", 950, reflection="kurz")  # too short
        e += journey(slug(6), "m0-01", 960, reflection="kurz")
        hits = an.identical_texts(e, 0.9, 8)
        self.assertEqual(set(hits), {slug(1), slug(2)})
        self.assertEqual(hits[slug(2)][0]["other"], slug(1))
        self.assertTrue(hits[slug(2)][0]["later"])
        self.assertFalse(hits[slug(1)][0]["later"])

    def test_outside_session(self):
        s = slug(3)
        e = [ev(s, "", "session.start", 0), ev(s, "m0-01", "step.open", 10), ev(s, "", "session.end", 100),
             ev(s, "m0-01", "check.pass", 150, attempt=1),     # within grace (120 s)
             ev(s, "m0-01", "check.pass", 5000, attempt=2),    # outside
             ev(s, "", "session.start", 9000), ev(s, "m0-01", "step.done", 9010)]
        out = an.outside_session_events(e, 120)
        self.assertEqual(len(out[s]), 1)
        self.assertEqual(out[s][0]["ts"], evs.iso(T0 + 5000))
        # no session events at all -> nothing to say
        self.assertEqual(an.outside_session_events([ev(slug(4), "m0-01", "step.open", 0)]), {})

    def test_prediction_anomaly(self):
        s = slug(5)
        e = [ev(s, "m0-01", "step.open", 0),
             ev(s, "m0-01", "predict.made", 10, taskId="p", prediction="42"),
             ev(s, "m0-01", "check.run", 20, taskId="p", attempt=1),
             ev(s, "m0-01", "predict.made", 30, taskId="p", prediction="hello 7"),
             ev(s, "m0-01", "predict.compared", 31, taskId="p", prediction="hello  7", output="hello 7", verdict="pass")]
        out = an.prediction_anomalies(e)
        self.assertEqual(out[s][0]["step"], "m0-01")
        honest = [ev(slug(6), "m0-01", "step.open", 0),
                  ev(slug(6), "m0-01", "predict.made", 10, taskId="p", prediction="hello 7"),
                  ev(slug(6), "m0-01", "check.run", 20, taskId="p", attempt=1),
                  ev(slug(6), "m0-01", "predict.compared", 31, taskId="p", prediction="hello 7", output="hello 7", verdict="pass")]
        self.assertEqual(an.prediction_anomalies(honest), {})
        flagged = [ev(slug(8), "m0-01", "predict.compared", 31, taskId="p", prediction="x", output="x",
                      editedAfterRun=True)]
        self.assertIn(slug(8), an.prediction_anomalies(flagged))


class FlagTests(unittest.TestCase):
    def cohort(self):
        """10 students: 1 excellent, 6 solid, 2 weak, 1 cheater."""
        e = []
        steps = COURSE["order"][:6]
        for i, sid in enumerate(steps):
            t = i * 2000
            # excellent: always first pass, no hints, plausible times
            e += journey(slug(1), sid, t, first_pass=True, seconds=400)
            for k in range(2, 8):   # solid: mixed
                e += journey(slug(k), sid, t, first_pass=(i + k) % 3 != 0, attempts=2, hints=(1,) if k % 2 else (),
                             seconds=700 + 50 * k)
            for k in (8, 9):        # weak: fails first, tier-3 hints, slow
                e += journey(slug(k), sid, t, first_pass=False, attempts=4, hints=(2, 3, 3), seconds=2500,
                             done=(i < 3))
            # cheater: fast, pasted, no fails
            e += journey(slug(10), sid, t, first_pass=True, seconds=25, typed=10, pasted=800)
        return e

    def test_flags(self):
        e = self.cohort()
        m = an.student_metrics(e, COURSE["order"])
        flags = an.compute_flags(e, m)
        kinds = {s: {f["flag"] for f in fl} for s, fl in flags.items()}
        self.assertIn("excellent", kinds[slug(1)])
        self.assertIn("cheat", kinds[slug(10)])
        self.assertNotIn("excellent", kinds[slug(10)])   # perfect but implausible
        self.assertIn("struggling", kinds[slug(8)])
        self.assertIn("struggling", kinds[slug(9)])
        for k in range(2, 8):
            self.assertEqual(kinds[slug(k)], set(), f"solid {k} flagged: {flags[slug(k)]}")
        reason = flags[slug(10)][0]["reasons"][0]
        self.assertEqual(reason["strength"], "strong")
        self.assertIn("m0-01", reason["text"]["de"])
        self.assertIn("evidence", reason)
        strug = [f for f in flags[slug(8)] if f["flag"] == "struggling"][0]
        self.assertGreaterEqual(len(strug["reasons"]), 2)

    def test_dropped_and_review(self):
        s = slug(2)
        e = [ev(s, "", "session.start", 0)] + journey(s, "m0-01", 10, seconds=300) + [ev(s, "", "session.end", 400)]
        e += [ev(s, "m0-02", "step.open", 10_000), ev(s, "m0-02", "check.fail", 10_010, attempt=1),
              ev(s, "m0-02", "check.fail", 10_020, attempt=2), ev(s, "m0-02", "check.pass", 10_030, attempt=3)]
        m = an.student_metrics(e, COURSE["order"], now=T0 + 10_030 + 20 * 86400)
        flags = an.compute_flags(e, m, now=T0 + 10_030 + 20 * 86400)
        kinds = {f["flag"] for f in flags[s]}
        self.assertIn("dropped", kinds)
        self.assertIn("review", kinds)      # 4 events outside any session, no strong indicator
        self.assertNotIn("cheat", kinds)

    def test_thresholds_override(self):
        e = self.cohort()
        m = an.student_metrics(e, COURSE["order"])
        flags = an.compute_flags(e, m, {"cheat": {"fastPassSeconds": 5}})
        self.assertNotIn("cheat", {f["flag"] for f in flags[slug(10)]})


class MasteryBloomTests(unittest.TestCase):
    def test_mastery(self):
        s = slug(1)
        e = journey(s, "m0-01", 0, first_pass=True, verdict="weak")            # objective rust-foundations.m0
        e += journey(s, "m0-02", 1000, first_pass=False, attempts=3)
        e += [ev(s, "m1-01", "step.open", 3000),
              ev(s, "m1-01", "predict.compared", 3010, verdict="fail", prediction="a", output="b")]
        rows = {r["objective"]: r for r in an.mastery_by_objective(e, COURSE)}
        m0 = rows["rust-foundations.m0"]
        self.assertEqual(m0["evidence"], 3)
        # check part: mean(1.0, 0.7) = 0.85 ; question part: 0.5 ; weights 0.5/0.3 -> (0.425+0.15)/0.8
        self.assertAlmostEqual(m0["mastery"], (0.5 * 0.85 + 0.3 * 0.5) / 0.8, places=3)
        self.assertEqual(rows["rust-foundations.m1"]["mastery"], 0.0)
        self.assertIsNone(rows["rust-foundations.m2"]["mastery"])

    def test_bloom(self):
        s = slug(1)
        e = journey(s, "m0-01", 0) + journey(s, "m5-04", 100)
        rows = {r["level"]: r for r in an.bloom_coverage(e, COURSE)}
        self.assertEqual(rows["remember"]["steps"], coursemeta.PLACEHOLDER_STEPS_PER_MODULE)
        self.assertEqual(rows["remember"]["done"], 1)
        self.assertEqual(rows["evaluate"]["done"], 1)
        self.assertEqual(rows["create"]["steps"], 0)
        self.assertIsNone(rows["create"]["share"])


class OverviewRecommendationTests(unittest.TestCase):
    def test_course_overview_funnel(self):
        e = []
        for k in range(1, 5):
            for i, sid in enumerate(COURSE["order"][: 2 + k * 2]):
                e += journey(slug(k), sid, i * 1000, seconds=300)
        ov = an.course_overview(e, COURSE)
        self.assertEqual(ov["students"], 4)
        self.assertEqual(ov["completed"], 0)
        self.assertEqual(ov["funnel"][0]["reached"], 4)
        self.assertEqual(ov["funnel"][4]["reached"], 3)
        self.assertEqual(ov["biggest_drop"]["drop"], 1)
        self.assertEqual(ov["modules"][0]["done_all"], 4)
        self.assertEqual(ov["stops_at"][0][1], 1)
        self.assertEqual(ov["active"], 4)

    def test_recommendation_rules(self):
        e = journey(slug(1), "m0-01", 0)
        m = an.student_metrics(e, COURSE["order"])[slug(1)]
        self.assertIn("Kein Handlungsbedarf", an.recommendation(m, [], COURSE, "de")[0])
        self.assertIn("No action", an.recommendation(m, [], COURSE, "en")[0])
        rec = an.recommendation(m, [{"flag": "cheat"}, {"flag": "struggling"}, {"flag": "dropped"}], COURSE, "de")
        self.assertTrue(any("Gespräch" in r for r in rec))
        self.assertTrue(any("Sprechstunde" in r for r in rec))
        self.assertTrue(any("inaktiv" in r for r in rec))

    def test_timeline(self):
        e = journey(slug(1), "m0-01", 0, hints=(2,), question="Was ist das?")
        rows = an.timeline(e)
        self.assertEqual(rows[0]["type"], "step.open")
        self.assertIn("Tier 2", [r["detail"] for r in rows])
        self.assertEqual([r["t"] for r in rows], sorted(r["t"] for r in rows))


if __name__ == "__main__":
    unittest.main()

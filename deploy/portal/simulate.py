#!/usr/bin/env python3
"""Synthetic cohorts for the teacher portal, plus a scored check of the A5 flags.

Generates event streams for three courses and five personas, feeds them through
``POST /ingest`` and then scores the flags that analytics.py derives from the
result against the personas that produced it:

    excellent   -> flag "excellent"
    solid       -> no flag
    weak        -> flag "struggling"
    dropping    -> flag "dropped"
    cheating    -> flag "cheat"

Usage::

    python3 deploy/portal/simulate.py --token <FL_PORTAL_TOKEN>          # feed a running portal
    python3 deploy/portal/simulate.py --offline                          # generate and score only
    python3 deploy/portal/simulate.py --write-config /tmp/portal.json    # emit matching roles

Everything is seeded (``--seed``), so the same invocation always produces the same
cohort, the same flags and the same precision/recall numbers.  Exit code 1 when a
target is missed, so this doubles as a regression test for the rules.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import analytics as an          # noqa: E402
import coursemeta               # noqa: E402
import events as evs            # noqa: E402

COURSES = ("cads-zero-foundations", "rust-foundations", "javascript-foundations")
TEACHERS = {
    "cads-zero-foundations": "anna.lehrende@hs.example",
    "rust-foundations": "bernd.lehrender@hs.example",
    "javascript-foundations": "carla.lehrende@hs.example",
}
ADMIN = "admin@hs.example"

# persona -> share of the cohort.  "excellent" stays at the top decile because the rule
# itself is a percentile rule: a larger excellent group could not all be in the top 10 %.
PERSONA_MIX = (("excellent", 0.10), ("solid", 0.45), ("weak", 0.20),
               ("dropping", 0.15), ("cheating", 0.10))
EXPECTED_FLAG = {"excellent": "excellent", "solid": None, "weak": "struggling",
                 "dropping": "dropped", "cheating": "cheat"}
SCORED_FLAGS = ("excellent", "struggling", "dropped", "cheat")
TARGETS = {"cheat": {"precision": 0.8, "recall": 0.7},
           "excellent": {"precision": 0.7, "recall": 0.7},
           "struggling": {"precision": 0.7, "recall": 0.7},
           "dropped": {"precision": 0.7, "recall": 0.7}}

# Per persona: first-attempt pass probability, hints per step, tier-3 share of those hints,
# seconds per step, question probability per step.
PROFILE = {
    "excellent": {"pass1": (0.90, 1.00), "hints": (0.0, 0.15), "tier3": 0.0,
                  "secs": (300, 700), "q": 0.12, "paste": (0.05, 0.25)},
    "solid":     {"pass1": (0.48, 0.72), "hints": (0.35, 1.00), "tier3": 0.10,
                  "secs": (420, 1500), "q": 0.30, "paste": (0.05, 0.35)},
    "weak":      {"pass1": (0.10, 0.35), "hints": (1.20, 2.40), "tier3": 0.45,
                  "secs": (1500, 3600), "q": 0.55, "paste": (0.10, 0.40)},
    "dropping":  {"pass1": (0.45, 0.70), "hints": (0.30, 0.90), "tier3": 0.10,
                  "secs": (500, 1600), "q": 0.30, "paste": (0.05, 0.35)},
    "cheating":  {"pass1": (0.45, 0.70), "hints": (0.0, 0.20), "tier3": 0.0,
                  "secs": (400, 1200), "q": 0.15, "paste": (0.05, 0.30)},
}

QUESTION_POOL = {
    "cads-zero-foundations": [
        ["Warum blinkt die LED nicht?", "wieso blinkt meine LED nicht", "LED blinkt nicht, warum?"],
        ["Was macht der Linker-Skript genau?", "wozu ist das Linker Skript da", "Linker Skript - was macht das?"],
        ["Wie flashe ich das Board neu?", "wie flashe ich die firmware neu", "Board neu flashen - wie?"],
        ["Warum schlaegt der Build fehl?", "wieso schlaegt mein build fehl", "Build schlaegt fehl - warum?"],
        ["Was bedeutet dieser HardFault?", "was heisst HardFault genau", "HardFault - was bedeutet das?"],
    ],
    "rust-foundations": [
        ["Warum ist der Borrow-Checker so streng?", "wieso ist der borrow checker so streng",
         "Borrow-Checker - warum so streng?"],
        ["Wann brauche ich clone?", "wann muss ich clone benutzen", "clone - wann brauche ich das?"],
        ["Was ist der Unterschied zwischen String und str?", "unterschied String und str",
         "String vs str - was ist der Unterschied?"],
        ["Warum kompiliert mein match nicht?", "wieso kompiliert das match nicht"],
        ["Wie funktioniert Result und das Fragezeichen?", "wie funktioniert das Fragezeichen bei Result"],
    ],
    "javascript-foundations": [
        ["Warum ist mein await undefined?", "wieso ist das await undefined", "await liefert undefined - warum?"],
        ["Was macht this hier genau?", "was ist this in dieser funktion", "this - was macht das hier?"],
        ["Wann nehme ich map statt forEach?", "map oder forEach - wann was", "wann map und wann forEach"],
        ["Warum ist meine Promise nie fertig?", "wieso wird die Promise nie fertig"],
        ["Was ist der Unterschied zwischen let und const?", "unterschied let und const"],
    ],
}

REFLECTION_SENTENCES = [
    "Ich habe verstanden wie der Ablauf zusammenhaengt",
    "Am schwersten war die Fehlersuche im Detail",
    "Der Hinweis auf die Reihenfolge hat mir geholfen",
    "Ich wuerde beim naechsten Mal frueher testen",
    "Die Aufgabe war klarer als erwartet",
    "Mir fehlt noch Sicherheit bei den Begriffen",
    "Das Beispiel im Material war entscheidend",
    "Ich habe zweimal von vorne angefangen",
    "Die Ausgabe zu lesen war der Schluessel",
    "Ich brauche mehr Uebung mit den Werkzeugen",
    "Der Zusammenhang zum vorherigen Modul wurde deutlich",
    "Ohne den zweiten Versuch haette ich es nicht geschafft",
    "Ich notiere mir die Schritte fuer spaeter",
    "Die Doku hat die offene Frage beantwortet",
]
# A stolen reflection: the cheating pair submits exactly this text.
COPIED_REFLECTION = ("Das Modul war insgesamt gut machbar und die Aufgaben bauten sauber aufeinander auf "
                     "sodass am Ende alles zusammenpasste")

DAY = 86400.0


def slug_for(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()[:12]


class Cohort:
    """One course's synthetic students, with the persona that produced each of them."""

    def __init__(self, course: dict, n: int, rng: random.Random, now: float):
        self.course = course
        self.now = now
        self.rng = rng
        self.students: list[dict] = []
        personas: list[str] = []
        for name, share in PERSONA_MIX:
            personas += [name] * max(1, round(n * share))
        personas = personas[:n] if len(personas) >= n else personas + ["solid"] * (n - len(personas))
        rng.shuffle(personas)
        short = course["id"].split("-")[0][:4]
        for i, persona in enumerate(personas):
            email = f"s{i:03d}.{short}@stud.hs.example"
            self.students.append({"email": email, "slug": slug_for(email), "persona": persona,
                                  "index": i})

    # ---------------------------------------------------------------- helpers
    def _reflection(self, st: dict) -> str:
        """Unique per student: four distinct marker tokens keep the Jaccard well below 0.9."""
        rng = self.rng
        picked = rng.sample(REFLECTION_SENTENCES, 4)
        markers = " ".join(f"notiz{rng.randrange(16 ** 4):04x}" for _ in range(4))
        return ". ".join(picked) + ". " + markers

    def _question(self, course_id: str) -> str:
        variants = self.rng.choice(QUESTION_POOL[course_id])
        return self.rng.choice(variants)

    # ---------------------------------------------------------------- generation
    def events(self) -> list[dict]:
        out: list[dict] = []
        cheaters = [s for s in self.students if s["persona"] == "cheating"]
        copy_pair = {s["slug"] for s in cheaters[:2]}
        pred_faker = cheaters[2]["slug"] if len(cheaters) > 2 else (cheaters[0]["slug"] if cheaters else "")
        for st in self.students:
            out += self._student_events(st, copy_pair, pred_faker)
        out.sort(key=lambda e: (e["ts"], e["student"]))
        return out

    def _student_events(self, st: dict, copy_pair: set, pred_faker: str) -> list[dict]:
        rng = self.rng
        course = self.course
        cid = course["id"]
        persona = st["persona"]
        prof = PROFILE[persona]
        order = course["order"]
        slug = st["slug"]
        out: list[dict] = []
        # A student's ability is a property of the student, not of the step: draw it once and
        # let the individual steps vary around it.  Redrawing per step would give every member
        # of a persona the same expected rate and a much wider spread than a real cohort has.
        ability = rng.uniform(*prof["pass1"])
        hint_rate = rng.uniform(*prof["hints"])
        paste_rate = rng.uniform(*prof["paste"])

        def ev(step: str, typ: str, t: float, **data) -> dict:
            module = course["steps"].get(step, {}).get("module", step.split("-", 1)[0] if step else "")
            payload = {k: v for k, v in data.items() if v is not None}
            e = {"v": 1, "ts": evs.iso(t), "student": slug, "course": cid, "type": typ, "data": payload}
            if step:
                e["step"] = step
                e["module"] = module
            return e

        # How far the student gets, and when they were last seen.
        if persona == "dropping":
            n_steps = max(3, int(len(order) * rng.uniform(0.15, 0.40)))
            last_gap = rng.uniform(18.0, 40.0)              # days of silence before "now"
        elif persona == "excellent":
            n_steps = int(len(order) * rng.uniform(0.85, 1.0))
            last_gap = rng.uniform(0.2, 3.0)
        elif persona == "weak":
            n_steps = max(4, int(len(order) * rng.uniform(0.35, 0.65)))
            last_gap = rng.uniform(0.2, 4.0)
        else:
            n_steps = max(4, int(len(order) * rng.uniform(0.55, 0.95)))
            last_gap = rng.uniform(0.2, 6.0)
        steps = order[:n_steps]
        span_days = rng.uniform(20.0, 40.0)
        start = self.now - (last_gap + span_days) * DAY
        end = self.now - last_gap * DAY
        # cheaters cheat on a minority of steps: the ones they could not do themselves
        cheat_steps = set(rng.sample(steps, min(len(steps), rng.randint(3, 5)))) if persona == "cheating" else set()

        t = start
        step_gap = (end - start) / max(1, len(steps))
        modules_seen: set[str] = set()
        for idx, sid in enumerate(steps):
            t = start + idx * step_gap + rng.uniform(0, step_gap * 0.3)
            cheated = sid in cheat_steps
            last_of_all = idx == len(steps) - 1
            abandons = persona == "dropping" and last_of_all
            meta = course["steps"].get(sid, {})
            bloom = meta.get("bloom") or "apply"

            if cheated:
                secs = rng.uniform(22.0, 52.0)
                typed, pasted = rng.randint(15, 60), rng.randint(700, 1600)
                hints, tier3s, first_pass = 0, 0, True
            else:
                secs = rng.uniform(*prof["secs"])
                share = min(0.6, max(0.0, rng.gauss(paste_rate, 0.06)))
                total = rng.randint(700, 2600)
                pasted = int(total * share)
                typed = total - pasted
                hints = max(0, min(4, int(rng.gauss(hint_rate, 0.4) + 0.5)))
                tier3s = sum(1 for _ in range(hints) if rng.random() < prof["tier3"])
                first_pass = rng.random() < ability

            out.append(ev("", "session.start", t - 45, sessionId=f"{slug}-{idx}"))
            out.append(ev(sid, "step.open", t, bloom=bloom))
            for h in range(hints):
                tier = 3 if h < tier3s else rng.choice([1, 1, 2])
                out.append(ev(sid, "hint.shown", t + secs * (0.2 + 0.1 * h), hintTier=tier, taskId=sid))
            if rng.random() < prof["q"]:
                out.append(ev(sid, "question.asked", t + secs * 0.35, question=self._question(cid),
                              grounded=rng.random() > (0.35 if persona == "weak" else 0.15), citations=rng.randint(0, 4)))
            if rng.random() < 0.25:
                out.append(ev(sid, "question.answered", t + secs * 0.45, bloom=bloom,
                              verdict=_verdict(rng, persona)))
            # predictions: honest students commit before the run, the faker afterwards
            if rng.random() < 0.3 or (slug == pred_faker and cheated):
                output = f"error[E0382]: borrow of moved value at {sid}"
                if slug == pred_faker and cheated:
                    out.append(ev(sid, "check.run", t + secs * 0.5, taskId=sid, checkType="command"))
                    out.append(ev(sid, "predict.made", t + secs * 0.6, taskId=sid, prediction=output))
                    out.append(ev(sid, "predict.compared", t + secs * 0.65, taskId=sid, prediction=output,
                                  output=output, verdict="pass"))
                else:
                    guess = output if rng.random() < 0.35 else f"kein Fehler, Ausgabe von {sid}"
                    out.append(ev(sid, "predict.made", t + secs * 0.15, taskId=sid, prediction=guess))
                    out.append(ev(sid, "check.run", t + secs * 0.5, taskId=sid, checkType="command"))
                    out.append(ev(sid, "predict.compared", t + secs * 0.55, taskId=sid, prediction=guess,
                                  output=output, verdict="pass" if guess == output else "fail"))
            out.append(ev(sid, "edit.metrics", t + secs * 0.8, typedChars=typed, pastedChars=pasted,
                          pasteEvents=1 + pasted // 400, taskId=sid))
            if abandons:
                out.append(ev(sid, "check.fail", t + secs * 0.9, attempt=1, checkType="testSuite", taskId=sid,
                              outputExcerpt="assertion failed"))
                out.append(ev("", "session.end", t + secs))
                break
            attempts = 1 if first_pass else rng.randint(2, 5 if persona == "weak" else 3)
            for a in range(1, attempts + 1):
                passed = a == attempts
                out.append(ev(sid, "check.run", t + secs * (0.55 + 0.08 * a), attempt=a, checkType="testSuite",
                              taskId=sid))
                out.append(ev(sid, "check.pass" if passed else "check.fail",
                              t + secs * (0.6 + 0.08 * a), attempt=a, checkType="testSuite", taskId=sid,
                              outputExcerpt=None if passed else "assertion failed: expected 3, got 5"))
            out.append(ev(sid, "step.done", t + secs, bloom=bloom))
            out.append(ev("", "session.end", t + secs + 30))

            mod = meta.get("module") or sid.split("-", 1)[0]
            if mod not in modules_seen and idx > 0 and rng.random() < 0.7:
                modules_seen.add(mod)
                text = COPIED_REFLECTION if slug in copy_pair else self._reflection(st)
                out.append(ev(sid, "reflection.written", t + secs + 120, text=text))
            if rng.random() < 0.4:
                out.append(ev(sid, "recall.answered", t + secs + 60, bloom=bloom, verdict=_verdict(rng, persona)))

        # cheaters also work outside any recorded session
        if persona == "cheating" and steps:
            for k in range(4):
                out.append(ev(steps[min(k, len(steps) - 1)], "question.asked", end + (k + 1) * 700,
                              question=self._question(cid), grounded=False))
        return out


def _verdict(rng: random.Random, persona: str) -> str:
    if persona in ("excellent",):
        return rng.choice(["pass", "pass", "pass", "weak"])
    if persona == "weak":
        return rng.choice(["fail", "fail", "weak", "pass"])
    return rng.choice(["pass", "pass", "weak", "fail"])


# --------------------------------------------------------------------------- scoring

def score(truth: dict[str, str], flags: dict[str, list[dict]]) -> dict[str, dict]:
    """Precision/recall per flag against the personas that generated the data."""
    out = {}
    for flag in SCORED_FLAGS:
        expected = {s for s, persona in truth.items() if EXPECTED_FLAG[persona] == flag}
        got = {s for s, fl in flags.items() if any(f["flag"] == flag for f in fl)}
        tp = len(expected & got)
        fp = len(got - expected)
        fn = len(expected - got)
        precision = tp / (tp + fp) if (tp + fp) else 1.0
        recall = tp / (tp + fn) if (tp + fn) else 1.0
        out[flag] = {"support": len(expected), "flagged": len(got), "tp": tp, "fp": fp, "fn": fn,
                     "precision": round(precision, 3), "recall": round(recall, 3),
                     "false_positives": sorted(f"{s}:{truth[s]}" for s in (got - expected)),
                     "false_negatives": sorted(s for s in (expected - got))}
    return out


# --------------------------------------------------------------------------- HTTP

def post_events(url: str, token: str, batch: list[dict], student: str) -> dict:
    body = json.dumps({"events": batch}).encode("utf-8")
    req = urllib.request.Request(url.rstrip("/") + "/ingest", data=body, method="POST", headers={
        "Content-Type": "application/json", "X-CaDS-Token": token, "X-CaDS-Student": student})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def feed(url: str, token: str, events: list[dict], batch_size: int = 100) -> dict:
    by_student: dict[str, list[dict]] = {}
    for e in events:
        by_student.setdefault(e["student"], []).append(e)
    totals = {"accepted": 0, "duplicates": 0, "rejected": 0, "requests": 0}
    for student, mine in by_student.items():
        for i in range(0, len(mine), batch_size):
            res = post_events(url, token, mine[i:i + batch_size], student)
            totals["requests"] += 1
            for k in ("accepted", "duplicates", "rejected"):
                totals[k] += res.get(k, 0)
            if res.get("problems"):
                print(f"  ! rejected sample: {json.dumps(res['problems'][0])}", file=sys.stderr)
    return totals


def fetch(url: str, path: str, email: str) -> tuple[int, str]:
    req = urllib.request.Request(url.rstrip("/") + path, headers={"X-Gate-Email": email})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")


def write_config(path: str, thresholds: dict | None = None) -> None:
    cfg = {
        "teachers": {**{email: {"courses": [course], "role": "teacher"}
                        for course, email in TEACHERS.items()},
                     ADMIN: {"courses": [], "role": "admin"}},
        "credit": {"minStepShare": 0.6, "minCheckShare": 0.7, "minReflections": 1, "requireProject": False},
    }
    if thresholds:
        cfg["thresholds"] = thresholds
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def write_roster(path: str, cohorts: dict) -> None:
    """A plausible roster so the deep dive can be shown with names during a demo."""
    first = ["Alex", "Bea", "Chris", "Dana", "Emil", "Fina", "Gero", "Hanna", "Ilja", "Jana",
             "Kai", "Lena", "Milo", "Nora", "Ole", "Pia", "Quin", "Rike", "Sami", "Tessa"]
    last = ["Adler", "Bauer", "Cordes", "Dorn", "Engel", "Falk", "Gruber", "Haas", "Imhof", "Jung",
            "Kern", "Lind", "Moser", "Nowak", "Ohlsen", "Peters", "Quandt", "Rauch", "Stein", "Thiel"]
    out = {"courses": {}}
    for course_id, cohort in cohorts.items():
        out["courses"][course_id] = {
            s["slug"]: f"{first[i % len(first)]} {last[(i * 7 + 3) % len(last)]}"
            for i, s in enumerate(cohort.students)}
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


# --------------------------------------------------------------------------- main

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Synthetic cohorts for the CaDS teacher portal")
    ap.add_argument("--url", default="http://127.0.0.1:3200")
    ap.add_argument("--token", default=os.environ.get("FL_PORTAL_TOKEN", ""))
    ap.add_argument("--students", type=int, default=40, help="students per course")
    ap.add_argument("--seed", type=int, default=20260903)
    ap.add_argument("--courses-dir", default="courses")
    ap.add_argument("--courses", nargs="*", default=list(COURSES))
    ap.add_argument("--offline", action="store_true", help="generate and score without a portal")
    ap.add_argument("--write-config", default="", help="write a matching portal.json here")
    ap.add_argument("--write-roster", default="", help="write a matching roster.json here")
    ap.add_argument("--json-out", default="", help="write the score report here")
    ap.add_argument("--verify-ui", action="store_true", help="check the flags show up on the pages")
    args = ap.parse_args(argv)

    now = time.time()
    rng = random.Random(args.seed)
    cohorts: dict[str, Cohort] = {}
    all_events: dict[str, list[dict]] = {}
    for cid in args.courses:
        course = coursemeta.load_course(args.courses_dir, cid)
        cohort = Cohort(course, args.students, random.Random(rng.randrange(1 << 30)), now)
        cohorts[cid] = cohort
        all_events[cid] = cohort.events()
        kind = "placeholder" if course["placeholder"] else "course.json"
        print(f"{cid}: {len(cohort.students)} students, {len(course['order'])} steps ({kind}), "
              f"{len(all_events[cid])} events")

    if args.write_config:
        write_config(args.write_config)
        print(f"portal.json -> {args.write_config}")
    if args.write_roster:
        write_roster(args.write_roster, cohorts)
        print(f"roster.json -> {args.write_roster}")

    if not args.offline:
        if not args.token:
            print("error: --token (or FL_PORTAL_TOKEN) is required unless --offline", file=sys.stderr)
            return 2
        for cid, evlist in all_events.items():
            totals = feed(args.url, args.token, evlist)
            print(f"{cid}: fed {totals['accepted']} accepted, {totals['duplicates']} duplicate, "
                  f"{totals['rejected']} rejected in {totals['requests']} requests")
            if totals["rejected"]:
                print("error: the portal rejected events", file=sys.stderr)
                return 1
        status, body = fetch(args.url, "/healthz", "")
        print(f"healthz: {body.strip()}")

    report: dict = {"seed": args.seed, "students_per_course": args.students, "courses": {}}
    ok = True
    for cid, evlist in all_events.items():
        course = cohorts[cid].course
        normalized = [evs.normalize_event(e) for e in evlist]
        metrics = an.student_metrics(normalized, course["order"], now)
        flags = an.compute_flags(normalized, metrics, None, now)
        truth = {s["slug"]: s["persona"] for s in cohorts[cid].students}
        result = score(truth, flags)
        report["courses"][cid] = result
        print(f"\n{cid}")
        print(f"  {'flag':<12}{'support':>8}{'flagged':>9}{'TP':>4}{'FP':>4}{'FN':>4}"
              f"{'precision':>11}{'recall':>8}")
        for flag in SCORED_FLAGS:
            r = result[flag]
            target = TARGETS[flag]
            good = r["precision"] >= target["precision"] and r["recall"] >= target["recall"]
            ok = ok and good
            print(f"  {flag:<12}{r['support']:>8}{r['flagged']:>9}{r['tp']:>4}{r['fp']:>4}{r['fn']:>4}"
                  f"{r['precision']:>11.2f}{r['recall']:>8.2f}   {'ok' if good else 'MISSED'}")
            if r["false_positives"]:
                print(f"      false positives: {', '.join(r['false_positives'][:6])}")

    if args.verify_ui and not args.offline:
        for cid in all_events:
            email = TEACHERS.get(cid, ADMIN)
            status, body = fetch(args.url, f"/portal/anomalies?c={cid}", email)
            cheats = {s for s, fl in an.compute_flags(
                [evs.normalize_event(e) for e in all_events[cid]],
                an.student_metrics([evs.normalize_event(e) for e in all_events[cid]],
                                   cohorts[cid].course["order"], now), None, now).items()
                if any(f["flag"] == "cheat" for f in fl)}
            missing = [s for s in cheats if s not in body]
            print(f"  ui {cid}: status {status}, {len(cheats)} cheat slugs expected, "
                  f"{len(missing)} missing on the anomalies page")
            if status != 200 or missing:
                ok = False

    report["ok"] = ok
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, sort_keys=True)
            fh.write("\n")
        print(f"\nreport -> {args.json_out}")
    print("\nAll targets met." if ok else "\nAt least one target was missed.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

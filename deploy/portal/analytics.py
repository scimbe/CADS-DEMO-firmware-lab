#!/usr/bin/env python3
"""Deterministic analytics over normalised telemetry events (SPEC A5).

Every function takes plain lists/dicts and returns plain dicts, so the portal
can render them and the tests can assert on them without a database.  Nothing
here is probabilistic; the same events always produce the same output.  The
rules and thresholds are documented in RULES.md - keep both in sync.

Input event shape (see events.normalize_event)::

    {"t": <epoch>, "ts": "...Z", "student": "<slug>", "course": "...", "module": "m1",
     "step": "m1-02-move", "type": "check.pass", "data": {...}}
"""
from __future__ import annotations

import math
import re
import statistics
from collections import Counter, defaultdict
from typing import Iterable, Optional

BLOOM_LEVELS = ("remember", "understand", "apply", "analyze", "evaluate", "create")

DEFAULT_THRESHOLDS: dict = {
    "questionJaccard": 0.6,          # cluster membership (token Jaccard)
    "activeDays": 7,                 # "active" = any event within this many days
    "dropped": {"inactiveDays": 14, "minStepsOpened": 1},
    # Criterion-referenced first (RULES.md section 3): a flag has to mean something against the
    # learning objective, not against whoever else happens to be in the cohort.  The percentile
    # is kept only as a supplementary, explicitly labelled note.
    "excellent": {
        "firstPassFloor": 0.85,      # absolute first-attempt pass rate
        "maxHintsPerStep": 0.35,     # absolute: at most one hint per three steps
        "minMedianStepSeconds": 90,  # plausible working time
        "minStepsWithChecks": 5,     # enough checks that the rate is not a coin toss
        "percentileNote": 90,        # norm-referenced, shown as a note only
    },
    "struggling": {
        "firstPassFloor": 0.4,       # absolute
        "tier3PerStep": 0.25,        # deepest hint tier per step with checks
        "stuckSteps": 2,             # steps with >= 3 attempts and still no pass
        "abandonRate": 0.3,
        "abandonMin": 2,
        "minIndicators": 2,
        "minStepsWithChecks": 5,
        "percentileNote": 10,        # norm-referenced, shown as a note only
        "timeZNote": 1.0,            # norm-referenced, shown as a note only
    },
    # Integrity signals.  Nothing here is called cheating and nothing here decides anything;
    # the strongest of them earns a question, never a verdict.  See RULES.md section 5.3.
    "integrity": {
        "fastPassSeconds": 60,
        "pasteShare": 0.8,
        "textJaccard": 0.9,          # pair similarity ...
        "textMargin": 0.25,          # ... and how far it must exceed the step's own text
        "textMinTokens": 8,
        "textTypes": ["reflection.written"],   # only answers that require own wording
        "outsideSessionMin": 3,
        "outsideSessionGraceSeconds": 120,
        "weakForFollowup": 2,        # this many weak signals together warrant a question
    },
    "mastery": {"weights": {"check": 0.5, "question": 0.3, "predict": 0.2}},
}


_STOP = frozenset("""
a an the and or of to in on for is are was be with by at from as it this that i my me we you your
der die das und oder ein eine einer eines einem einen ist sind war wird werden mit von zu im in am an auf für
ich du er sie es wir ihr mich mir dich dir sich nicht kein keine nur auch noch so wie was wo wann warum wieso
den dem des dass ob bei aus nach über unter vor hat haben hab habe kann können muss soll wenn dann aber
do does did how why what when where which who can could should would will not no yes ok please bitte
""".split())
_TOKEN_RE = re.compile(r"[a-z0-9äöüß_]+")


# --------------------------------------------------------------------------- helpers

def deep_merge(base: dict, override: Optional[dict]) -> dict:
    out = {k: (dict(v) if isinstance(v, dict) else v) for k, v in base.items()}
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def normalize_text(text: str) -> str:
    return " ".join(tokens_of(text))


def tokens_of(text: str) -> list[str]:
    toks = _TOKEN_RE.findall((text or "").lower().replace("ß", "ss"))
    return [t for t in toks if t not in _STOP]


def jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def percentile(values: list[float], p: float) -> float:
    """Nearest-rank percentile (deterministic, no interpolation)."""
    if not values:
        return 0.0
    vs = sorted(values)
    k = max(1, math.ceil(p / 100.0 * len(vs)))
    return vs[min(len(vs), k) - 1]


def median(values: list[float]) -> float:
    return float(statistics.median(values)) if values else 0.0


def mean(values: list[float]) -> float:
    return float(sum(values) / len(values)) if values else 0.0


def zscores(values: dict[str, float]) -> dict[str, float]:
    """Per-key z-score over all keys (population std); std == 0 -> all zeros."""
    if len(values) < 2:
        return {k: 0.0 for k in values}
    vs = list(values.values())
    mu = mean(vs)
    sd = math.sqrt(sum((v - mu) ** 2 for v in vs) / len(vs))
    if sd < 1e-12:
        return {k: 0.0 for k in values}
    return {k: (v - mu) / sd for k, v in values.items()}


def _by_student_step(events: list[dict]) -> dict[str, dict[str, list[dict]]]:
    out: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for ev in events:
        if ev.get("step"):
            out[ev["student"]][ev["step"]].append(ev)
    for stu in out.values():
        for lst in stu.values():
            lst.sort(key=lambda e: (e["t"], e["type"]))
    return out


def _sorted(events: list[dict]) -> list[dict]:
    return sorted(events, key=lambda e: (e["t"], e["student"], e["type"]))


# --------------------------------------------------------------------------- per (student, step)

def step_record(evs: list[dict], now: Optional[float] = None) -> dict:
    """Facts about one student on one step (events already sorted by time)."""
    opened = next((e["t"] for e in evs if e["type"] == "step.open"), None)
    done = next((e["t"] for e in evs if e["type"] == "step.done"), None)
    checks = [e for e in evs if e["type"] in ("check.pass", "check.fail")]
    first_outcome = checks[0]["type"] if checks else None
    first_pass_t = next((e["t"] for e in checks if e["type"] == "check.pass"), None)
    attempts_to_pass = 0
    for e in checks:
        attempts_to_pass += 1
        if e["type"] == "check.pass":
            break
    hints = [e["data"].get("hintTier") or 0 for e in evs if e["type"] == "hint.shown"]
    # Which help was already on screen when the check passed?  A tier-2/3 hint in this course
    # contains the solution line, so a paste after it is system-conform (RULES.md 5.3).
    tier_before = 0
    for e in evs:
        if e["type"] == "hint.shown" and (first_pass_t is None or e["t"] <= first_pass_t):
            tier_before = max(tier_before, int(e["data"].get("hintTier") or 0))
    typed = sum(int(e["data"].get("typedChars") or 0) for e in evs if e["type"] == "edit.metrics")
    pasted = sum(int(e["data"].get("pastedChars") or 0) for e in evs if e["type"] == "edit.metrics")
    paste_events = sum(int(e["data"].get("pasteEvents") or 0) for e in evs if e["type"] == "edit.metrics")
    questions = [e for e in evs if e["type"] == "question.asked"]
    end_t = done if done is not None else (first_pass_t if first_pass_t is not None else None)
    time_s = (end_t - opened) if (opened is not None and end_t is not None and end_t >= opened) else None
    last_t = evs[-1]["t"] if evs else None
    return {
        "opened": opened, "done": done, "last_t": last_t,
        "n_checks": len(checks),
        "first_outcome": first_outcome,            # "check.pass" | "check.fail" | None
        "first_fail": first_outcome == "check.fail",
        "passed": first_pass_t is not None,
        "attempts_to_pass": attempts_to_pass if first_pass_t is not None else len(checks),
        "fails_before_pass": max(0, attempts_to_pass - 1) if first_pass_t is not None else len(checks),
        "time_to_pass_s": (first_pass_t - opened) if (opened is not None and first_pass_t is not None
                                                     and first_pass_t >= opened) else None,
        "time_s": time_s,
        "hints": hints, "tier3": sum(1 for h in hints if h == 3),
        "hint_tier_before_pass": tier_before,
        # stuck: worked at it repeatedly and still did not get through
        "stuck": len(checks) >= 3 and first_pass_t is None,
        "typed": typed, "pasted": pasted, "paste_events": paste_events,
        "paste_share": (pasted / (typed + pasted)) if (typed + pasted) > 0 else None,
        "questions": len(questions),
        "ungrounded": sum(1 for q in questions if q["data"].get("grounded") is False),
        "abandoned": opened is not None and done is None,
    }


# --------------------------------------------------------------------------- questions

def cluster_questions(questions: list[dict], threshold: float = 0.6) -> list[dict]:
    """Greedy, order-independent clustering of asked questions.

    ``questions``: dicts with text, student, step (+ optional grounded).  Items are first
    grouped by normalised text (exact), then groups are merged into clusters (most frequent
    group first) when token-Jaccard to the cluster representative >= threshold.
    Representative = the most frequent original wording.
    """
    groups: dict[str, dict] = {}
    for q in questions:
        text = (q.get("text") or "").strip()
        if not text:
            continue
        norm = normalize_text(text)
        if not norm:
            continue
        g = groups.setdefault(norm, {"norm": norm, "tokens": set(norm.split()), "items": [],
                                     "wordings": Counter()})
        g["items"].append(q)
        g["wordings"][text] += 1
    ordered = sorted(groups.values(), key=lambda g: (-len(g["items"]), g["norm"]))
    clusters: list[dict] = []
    for g in ordered:
        target = None
        best = threshold
        for c in clusters:
            sim = jaccard(g["tokens"], c["tokens"])
            if sim >= best:
                target, best = c, sim
        if target is None:
            target = {"tokens": set(g["tokens"]), "items": [], "wordings": Counter()}
            clusters.append(target)
        target["items"].extend(g["items"])
        target["wordings"].update(g["wordings"])
    out = []
    for c in clusters:
        items = c["items"]
        rep, _ = sorted(c["wordings"].items(), key=lambda kv: (-kv[1], kv[0]))[0]
        steps = Counter(i.get("step") or "" for i in items)
        ungrounded = sum(1 for i in items if i.get("grounded") is False)
        out.append({
            "representative": rep,
            "count": len(items),
            "students": len({i.get("student") for i in items}),
            "steps": dict(steps.most_common()),
            "top_step": steps.most_common(1)[0][0] if steps else "",
            "ungrounded": ungrounded,
            "ungrounded_rate": ungrounded / len(items) if items else 0.0,
            "variants": [w for w, _ in sorted(c["wordings"].items(), key=lambda kv: (-kv[1], kv[0]))[:5]],
        })
    out.sort(key=lambda c: (-c["count"], c["representative"]))
    return out


def question_overview(events: list[dict], threshold: float = 0.6) -> dict:
    qs = [{"text": e["data"].get("question") or "", "student": e["student"], "step": e["step"],
           "grounded": e["data"].get("grounded")} for e in events if e["type"] == "question.asked"]
    clusters = cluster_questions(qs, threshold)
    per_step = Counter(q["step"] for q in qs)
    ungrounded = sum(1 for q in qs if q["grounded"] is False)
    return {
        "total": len(qs),
        "students": len({q["student"] for q in qs}),
        "ungrounded": ungrounded,
        "ungrounded_rate": ungrounded / len(qs) if qs else 0.0,
        "clusters": clusters,
        "per_step": per_step.most_common(),
    }


# --------------------------------------------------------------------------- steps

def step_difficulty(events: list[dict], step_order: list[str]) -> list[dict]:
    """Per step: first-attempt fail rate, mean attempts, hint tiers, median time to pass, abandon rate."""
    bss = _by_student_step(events)
    per_step: dict[str, list[dict]] = defaultdict(list)
    for stu, steps in bss.items():
        for sid, evs in steps.items():
            per_step[sid].append(step_record(evs))
    order = list(step_order) + sorted(s for s in per_step if s not in step_order)
    out = []
    for sid in order:
        recs = per_step.get(sid, [])
        opened = [r for r in recs if r["opened"] is not None]
        with_checks = [r for r in recs if r["n_checks"] > 0]
        passed = [r for r in recs if r["passed"]]
        tiers = Counter()
        for r in recs:
            for h in r["hints"]:
                tiers[h] += 1
        times = [r["time_to_pass_s"] for r in passed if r["time_to_pass_s"] is not None]
        out.append({
            "step": sid,
            "students": len(recs),
            "opened": len(opened),
            "done": sum(1 for r in recs if r["done"] is not None),
            "with_checks": len(with_checks),
            "first_fail_rate": (sum(1 for r in with_checks if r["first_fail"]) / len(with_checks)) if with_checks else 0.0,
            "mean_attempts": mean([r["attempts_to_pass"] for r in with_checks]) if with_checks else 0.0,
            "hint_tiers": {1: tiers.get(1, 0), 2: tiers.get(2, 0), 3: tiers.get(3, 0)},
            "hints_per_student": (sum(tiers.values()) / len(opened)) if opened else 0.0,
            "median_time_to_pass_s": median(times),
            "abandon_rate": (sum(1 for r in opened if r["abandoned"]) / len(opened)) if opened else 0.0,
            "questions": sum(r["questions"] for r in recs),
        })
    return out


def difficulty_score(row: dict) -> float:
    """0..1 composite used to sort "difficult spots" (documented in RULES.md)."""
    attempts = min(1.0, max(0.0, (row["mean_attempts"] - 1) / 4.0))
    tiers = row["hint_tiers"]
    total = sum(tiers.values())
    tier3 = (tiers.get(3, 0) / total) if total else 0.0
    return round(0.4 * row["first_fail_rate"] + 0.2 * attempts + 0.2 * tier3 + 0.2 * row["abandon_rate"], 4)


# --------------------------------------------------------------------------- students

def student_metrics(events: list[dict], step_order: list[str], now: Optional[float] = None) -> dict[str, dict]:
    """Per student (one course): the numbers everything else is built from."""
    evs = _sorted(events)
    if now is None:
        now = evs[-1]["t"] if evs else 0.0
    bss = _by_student_step(evs)
    by_student: dict[str, list[dict]] = defaultdict(list)
    for e in evs:
        by_student[e["student"]].append(e)
    total_steps = len(step_order) or 1
    out: dict[str, dict] = {}
    for stu, mine in by_student.items():
        recs = {sid: step_record(sevs) for sid, sevs in bss.get(stu, {}).items()}
        opened = [r for r in recs.values() if r["opened"] is not None]
        done = [r for r in recs.values() if r["done"] is not None]
        with_checks = [r for r in recs.values() if r["n_checks"] > 0]
        first_pass = [r for r in with_checks if r["first_outcome"] == "check.pass"]
        hints = [h for r in recs.values() for h in r["hints"]]
        times = [r["time_s"] for r in recs.values() if r["time_s"] is not None]
        questions = [e for e in mine if e["type"] == "question.asked"]
        typed = sum(r["typed"] for r in recs.values())
        pasted = sum(r["pasted"] for r in recs.values())
        predictions = [e for e in mine if e["type"] == "predict.compared"]
        sessions = [e for e in mine if e["type"] == "session.start"]
        last_t = mine[-1]["t"]
        first_t = mine[0]["t"]
        answered = [e for e in mine if e["type"] in ("question.answered", "recall.answered")]
        verdicts = Counter((e["data"].get("verdict") or "n/a") for e in answered)
        out[stu] = {
            "student": stu,
            "events": len(mine),
            "first_t": first_t, "last_t": last_t,
            "days_since_active": (now - last_t) / 86400.0,
            "steps_opened": len(opened),
            "steps_done": len(done),
            "progress": len(done) / total_steps,
            "steps_with_checks": len(with_checks),
            "first_pass_rate": (len(first_pass) / len(with_checks)) if with_checks else 0.0,
            "mean_attempts": mean([r["attempts_to_pass"] for r in with_checks]) if with_checks else 0.0,
            "hints": len(hints),
            "hints_per_step": (len(hints) / len(with_checks)) if with_checks else 0.0,
            "tier3": sum(1 for h in hints if h == 3),
            "tier3_per_step": (sum(1 for h in hints if h == 3) / len(with_checks)) if with_checks else 0.0,
            "median_step_time_s": median(times),
            "total_time_s": sum(times),
            "questions": len(questions),
            "question_rate": (len(questions) / len(opened)) if opened else 0.0,
            "ungrounded_questions": sum(1 for q in questions if q["data"].get("grounded") is False),
            "abandoned": sum(1 for r in opened if r["abandoned"]),
            "stuck_steps": sum(1 for r in recs.values() if r["stuck"]),
            "abandon_rate": (sum(1 for r in opened if r["abandoned"]) / len(opened)) if opened else 0.0,
            "typed": typed, "pasted": pasted,
            "paste_share": (pasted / (typed + pasted)) if (typed + pasted) > 0 else 0.0,
            "predictions": len(predictions),
            "predictions_correct": sum(1 for p in predictions if p["data"].get("verdict") == "pass"),
            "answers": len(answered),
            "answers_pass": verdicts.get("pass", 0),
            "answers_weak": verdicts.get("weak", 0),
            "answers_fail": verdicts.get("fail", 0),
            "reflections": sum(1 for e in mine if e["type"] == "reflection.written"),
            "sessions": len(sessions),
            "steps": recs,
        }
    return out


Z_METRICS = ("first_pass_rate", "mean_attempts", "hints_per_step", "median_step_time_s", "question_rate")


def cohort_zscores(metrics: dict[str, dict]) -> dict[str, dict[str, float]]:
    z: dict[str, dict[str, float]] = {s: {} for s in metrics}
    for key in Z_METRICS:
        col = zscores({s: float(m[key]) for s, m in metrics.items()})
        for s, v in col.items():
            z[s][key] = round(v, 3)
    return z


# --------------------------------------------------------------------------- integrity signals

def _text_items(events: list[dict]) -> list[dict]:
    items = []
    for e in events:
        if e["type"] in ("reflection.written", "question.answered", "recall.answered"):
            text = e["data"].get("text") or e["data"].get("answer") or e["data"].get("reflection") or ""
            toks = tokens_of(text)
            if toks:
                items.append({"student": e["student"], "step": e["step"], "type": e["type"],
                              "tokens": set(toks), "n": len(toks), "t": e["t"], "text": text})
    return items


def identical_texts(events: list[dict], course: Optional[dict] = None, threshold: float = 0.9,
                    min_tokens: int = 8, margin: float = 0.25,
                    types: Optional[Iterable[str]] = None) -> dict[str, list[dict]]:
    """Pairs of students whose free text is far more alike than the step's own wording.

    A plain similarity threshold is useless here: the model answer sits in the step file
    (``rubric:``) and the deepest hint states it outright, so two conscientious students
    quoting the same source look identical without either copying from the other.  What is
    actually informative is the *excess*: how far the pair's similarity rises above the
    similarity each of them has to the material.  Only answers that ask for own wording are
    considered (``types``), and the step's reference text is the baseline.
    """
    allowed = set(types) if types is not None else {"reflection.written"}
    items = [i for i in _text_items(events) if i["n"] >= min_tokens and i["type"] in allowed]
    baseline: dict[str, set] = {}
    if course:
        for it in items:
            sid = it["step"]
            if sid not in baseline:
                import coursemeta as _cm
                baseline[sid] = set(tokens_of(_cm.reference_text(course, sid)))
    hits: dict[str, list[dict]] = defaultdict(list)
    by_step: dict[tuple, list[dict]] = defaultdict(list)
    for it in items:
        by_step[(it["step"], it["type"])].append(it)
    for key, lst in by_step.items():
        lst.sort(key=lambda i: (i["t"], i["student"]))
        ref = baseline.get(key[0], set())
        for a_i in range(len(lst)):
            for b_i in range(a_i + 1, len(lst)):
                a, b = lst[a_i], lst[b_i]
                if a["student"] == b["student"]:
                    continue
                sim = jaccard(a["tokens"], b["tokens"])
                if sim < threshold:
                    continue
                base = max(jaccard(a["tokens"], ref), jaccard(b["tokens"], ref)) if ref else 0.0
                if sim - base < margin:
                    continue          # no more alike than the material they both read
                for me, other in ((a, b), (b, a)):
                    hits[me["student"]].append({
                        "step": me["step"], "type": me["type"], "other": other["student"],
                        "similarity": round(sim, 3), "baseline": round(base, 3),
                        "excess": round(sim - base, 3), "later": me["t"] > other["t"],
                    })
    return dict(hits)


def outside_session_events(events: list[dict], grace_s: float = 120.0) -> dict[str, list[dict]]:
    """Events per student that fall outside every [session.start, session.end] window."""
    by_student: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        by_student[e["student"]].append(e)
    out: dict[str, list[dict]] = {}
    for stu, mine in by_student.items():
        mine = sorted(mine, key=lambda e: e["t"])
        windows: list[list[float]] = []
        for e in mine:
            if e["type"] == "session.start":
                windows.append([e["t"], math.inf])
            elif e["type"] == "session.end" and windows and windows[-1][1] == math.inf:
                windows[-1][1] = e["t"]
        if not windows:
            continue  # extension without session events: nothing to say
        outside = []
        for e in mine:
            if e["type"] in ("session.start", "session.end"):
                continue
            if not any(w[0] - grace_s <= e["t"] <= w[1] + grace_s for w in windows):
                outside.append({"ts": e["ts"], "type": e["type"], "step": e["step"]})
        if outside:
            out[stu] = outside
    return out


def prediction_anomalies(events: list[dict]) -> dict[str, list[dict]]:
    """predict.compared where the prediction equals the output exactly AND was edited after the run."""
    bss = _by_student_step(events)
    out: dict[str, list[dict]] = defaultdict(list)
    for stu, steps in bss.items():
        for sid, evs in steps.items():
            runs = [e["t"] for e in evs if e["type"] in ("check.run", "check.pass", "check.fail")]
            for e in evs:
                if e["type"] != "predict.compared":
                    continue
                d = e["data"]
                pred = " ".join((d.get("prediction") or "").split())
                outp = " ".join((d.get("output") or "").split())
                exact = bool(pred) and pred == outp
                edited = bool(d.get("editedAfterRun"))
                if not edited:
                    made = [x["t"] for x in evs if x["type"] == "predict.made"
                            and x["data"].get("taskId") == d.get("taskId")]
                    edited = bool(made and runs and max(made) > min(runs))
                if exact and edited:
                    out[stu].append({"step": sid, "taskId": d.get("taskId"), "ts": e["ts"]})
    return dict(out)


def fast_paste_passes(metrics: dict[str, dict], course: Optional[dict] = None,
                      fast_s: float = 60.0, paste_share: float = 0.8) -> dict[str, list[dict]]:
    """Fast first-try passes with a high paste share - a WEAK signal, never a strong one.

    The tutor itself hands out code: the deepest hint tier contains the solution line and the
    step file carries the rubric.  Pasting after that is exactly what the system asks for, so a
    paste share only says anything where no tier-2 or tier-3 hint had been shown and the step's
    material does not state the answer.  Even then it counts only together with something else.
    """
    solution_steps: set = set()
    if course:
        import coursemeta as _cm
        solution_steps = {sid for sid in course.get("steps", {}) if _cm.solution_in_material(course, sid)}
    out: dict[str, list[dict]] = defaultdict(list)
    for stu, m in metrics.items():
        for sid, r in m["steps"].items():
            if not (r["passed"] and r["fails_before_pass"] == 0 and r["time_to_pass_s"] is not None
                    and r["time_to_pass_s"] < fast_s and r["paste_share"] is not None
                    and r["paste_share"] > paste_share):
                continue
            if r["hint_tier_before_pass"] >= 2:
                continue          # the hint contained the solution; copying it is system-conform
            if sid in solution_steps:
                continue          # the step text states the answer
            out[stu].append({"step": sid, "seconds": round(r["time_to_pass_s"], 1),
                             "paste_share": round(r["paste_share"], 3),
                             "hint_tier_before": r["hint_tier_before_pass"]})
    return dict(out)


# --------------------------------------------------------------------------- flags

def _fmt(v, nd=2):
    return f"{v:.{nd}f}" if isinstance(v, float) else str(v)


def compute_flags(events: list[dict], metrics: dict[str, dict], thresholds: Optional[dict] = None,
                  now: Optional[float] = None, course: Optional[dict] = None) -> dict[str, list[dict]]:
    """Flags per student: excellent | struggling | followup | notice | dropped.

    Two rules govern everything here (RULES.md sections 0 and 3):

    * No flag asserts cheating.  The strongest integrity signal earns the label "an anomaly
      that warrants a question", and every reason carries the counter-hypothesis that explains
      it innocently, so the teacher sees both readings at once.
    * Flags are criterion-referenced.  They compare a person against the learning objective,
      not against the cohort.  Percentiles and z-scores still appear, but only as supplementary
      notes marked ``norm``, and they never decide whether a flag is raised.

    Each flag: {"flag", "label": {de,en}, "reasons": [...], "notes": [...]}, where a reason is
    {"text": {de,en}, "counter": {de,en}, "evidence": {...}, "strength": "strong"|"weak"}.
    """
    th = deep_merge(DEFAULT_THRESHOLDS, thresholds)
    if now is None:
        now = max((e["t"] for e in events), default=0.0)
    z = cohort_zscores(metrics)
    rates = [m["first_pass_rate"] for m in metrics.values() if m["steps_with_checks"] > 0]
    ig = th["integrity"]
    fast = fast_paste_passes(metrics, course, ig["fastPassSeconds"], ig["pasteShare"])
    ident = identical_texts(events, course, ig["textJaccard"], ig["textMinTokens"],
                            ig["textMargin"], ig["textTypes"])
    outside = outside_session_events(events, ig["outsideSessionGraceSeconds"])
    preds = prediction_anomalies(events)
    flags: dict[str, list[dict]] = {}
    for stu, m in sorted(metrics.items()):
        mine: list[dict] = []
        # ---- integrity signals ---------------------------------------------------------------
        reasons: list[dict] = []
        for hit in ident.get(stu, []):
            reasons.append({"strength": "strong", "evidence": hit, "text": {
                "de": f"Step {hit['step']}: {hit['type']} zu {hit['similarity']:.0%} identisch mit {hit['other']}, "
                      f"und damit {hit['excess']:.0%} über der Ähnlichkeit zum Steptext selbst ({hit['baseline']:.0%})"
                      f"{' (später abgegeben)' if hit['later'] else ' (früher abgegeben)'}",
                "en": f"Step {hit['step']}: {hit['type']} {hit['similarity']:.0%} identical to {hit['other']}, "
                      f"{hit['excess']:.0%} above the similarity to the step's own text ({hit['baseline']:.0%})"
                      f"{' (submitted later)' if hit['later'] else ' (submitted earlier)'}"}, "counter": {
                "de": "Kann auch bedeuten: erlaubte Zusammenarbeit, gemeinsame Formulierung nach einer Lerngruppe, "
                      "oder eine Aufgabe, die kaum andere Formulierungen zulässt.",
                "en": "May also mean: permitted collaboration, wording agreed in a study group, or a task that "
                      "admits hardly any other phrasing."}})
        for hit in preds.get(stu, []):
            reasons.append({"strength": "strong", "evidence": hit, "text": {
                "de": f"Step {hit['step']}: Vorhersage entspricht exakt der Ausgabe und wurde erst nach der Ausführung geschrieben",
                "en": f"Step {hit['step']}: prediction equals the output exactly and was written only after the run"},
                "counter": {
                "de": "Kann auch bedeuten: die Vorhersage wurde nach dem Lauf nachgetragen, weil sie vorher vergessen "
                      "wurde - der Editor erzwingt die Reihenfolge nicht.",
                "en": "May also mean: the prediction was filled in afterwards because it had been forgotten - the "
                      "editor does not enforce the order."}})
        for hit in fast.get(stu, []):
            reasons.append({"strength": "weak", "evidence": hit, "text": {
                "de": f"Step {hit['step']}: Check beim ersten Versuch nach {hit['seconds']} s bestanden, "
                      f"Paste-Anteil {hit['paste_share']:.0%}, ohne vorher gezeigten Hinweis der Stufe 2 oder 3",
                "en": f"Step {hit['step']}: check passed first try after {hit['seconds']} s with "
                      f"{hit['paste_share']:.0%} pasted, with no tier-2 or tier-3 hint shown beforehand"},
                "counter": {
                "de": "Kann auch bedeuten: Codegerüst aus dem Kursmaterial übernommen (das der Kurs ausdrücklich "
                      "anbietet), Vorwissen aus Beruf oder früherem Studium, oder eine Lösung, die in einem anderen "
                      "Editor entstanden ist.",
                "en": "May also mean: a scaffold taken from the course material (which the course offers on purpose), "
                      "prior knowledge from work or earlier study, or a solution written in another editor."}})
        outs = outside.get(stu, [])
        if len(outs) >= ig["outsideSessionMin"]:
            reasons.append({"strength": "weak", "evidence": {"count": len(outs), "sample": outs[:5]}, "text": {
                "de": f"{len(outs)} Ereignisse außerhalb einer Session (z. B. {outs[0]['type']} {outs[0]['ts']})",
                "en": f"{len(outs)} events outside any session (e.g. {outs[0]['type']} {outs[0]['ts']})"},
                "counter": {
                "de": "Kann auch bedeuten: abgestürzte Sitzung, fehlendes session.end, Arbeit über einen Neustart hinweg.",
                "en": "May also mean: a crashed session, a missing session.end, work spanning a restart."}})
        strong = [r for r in reasons if r["strength"] == "strong"]
        weak = [r for r in reasons if r["strength"] == "weak"]
        if strong or len(weak) >= ig["weakForFollowup"]:
            mine.append({"flag": "followup",
                         "label": {"de": "Auffälligkeit, die eine Rückfrage rechtfertigt",
                                   "en": "Anomaly that warrants a follow-up question"},
                         "reasons": reasons, "notes": []})
        elif weak:
            mine.append({"flag": "notice", "label": {"de": "Schwaches Signal, keine Wertung",
                                                     "en": "Weak signal, no judgement"},
                         "reasons": reasons, "notes": []})
        # ---- excellent (criterion-referenced) --------------------------------------------------
        ex = th["excellent"]
        if (m["steps_with_checks"] >= ex["minStepsWithChecks"] and not strong
                and m["first_pass_rate"] >= ex["firstPassFloor"]
                and m["hints_per_step"] <= ex["maxHintsPerStep"]
                and m["median_step_time_s"] >= ex["minMedianStepSeconds"]):
            notes = []
            if rates:
                p = percentile(rates, ex["percentileNote"])
                notes.append({"kind": "norm", "text": {
                    "de": f"Ergänzend (normbezogen): Erstversuch-Quote der Kohorte im {ex['percentileNote']}. Perzentil "
                          f"liegt bei {p:.0%}.",
                    "en": f"Supplementary (norm-referenced): the cohort's {ex['percentileNote']}th percentile of the "
                          f"first-attempt pass rate is {p:.0%}."}})
            mine.append({"flag": "excellent", "label": {"de": "Kriterien sicher erfüllt", "en": "Criteria met with ease"},
                         "notes": notes, "reasons": [
                {"strength": "strong", "evidence": {"first_pass_rate": m["first_pass_rate"],
                                                    "floor": ex["firstPassFloor"],
                                                    "hints_per_step": m["hints_per_step"],
                                                    "max_hints_per_step": ex["maxHintsPerStep"],
                                                    "median_step_time_s": m["median_step_time_s"]},
                 "text": {"de": f"Erstversuch-Quote {m['first_pass_rate']:.0%} (Kriterium ≥ {ex['firstPassFloor']:.0%}), "
                                f"{m['hints_per_step']:.2f} Hinweise/Step (Kriterium ≤ {ex['maxHintsPerStep']}), "
                                f"mittlere Step-Zeit {m['median_step_time_s'] / 60:.0f} min "
                                f"(plausibel ≥ {ex['minMedianStepSeconds'] / 60:.1f} min)",
                          "en": f"first-attempt pass rate {m['first_pass_rate']:.0%} (criterion ≥ {ex['firstPassFloor']:.0%}), "
                                f"{m['hints_per_step']:.2f} hints/step (criterion ≤ {ex['maxHintsPerStep']}), "
                                f"median step time {m['median_step_time_s'] / 60:.0f} min "
                                f"(plausible ≥ {ex['minMedianStepSeconds'] / 60:.1f} min)"},
                 "counter": {"de": "Sagt nichts über Verstehenstiefe: schnelle, hinweisfreie Checks können auch "
                                   "Vorwissen aus einem früheren Studium abbilden.",
                             "en": "Says nothing about depth of understanding: fast, hint-free checks can also reflect "
                                   "prior knowledge from earlier study."}}]})
        # ---- struggling (criterion-referenced) --------------------------------------------------
        st = th["struggling"]
        ind: list[dict] = []
        notes: list[dict] = []
        if m["steps_with_checks"] >= st["minStepsWithChecks"]:
            if m["first_pass_rate"] <= st["firstPassFloor"]:
                ind.append({"strength": "strong", "evidence": {"first_pass_rate": m["first_pass_rate"],
                                                               "floor": st["firstPassFloor"]},
                            "text": {"de": f"Erstversuch-Quote {m['first_pass_rate']:.0%} (Kriterium ≤ {st['firstPassFloor']:.0%})",
                                     "en": f"first-attempt pass rate {m['first_pass_rate']:.0%} (criterion ≤ {st['firstPassFloor']:.0%})"},
                            "counter": {"de": "Kann auch bedeuten: bewusst experimentierendes Vorgehen, das den Check als "
                                              "Rückmeldung benutzt statt als Prüfung.",
                                        "en": "May also mean: a deliberately exploratory approach that uses the check as "
                                              "feedback rather than as an exam."}})
            if m["tier3_per_step"] >= st["tier3PerStep"]:
                ind.append({"strength": "strong", "evidence": {"tier3": m["tier3"], "tier3_per_step": m["tier3_per_step"]},
                            "text": {"de": f"{m['tier3']} Hinweise der Stufe 3 ({m['tier3_per_step']:.2f} je Step, Kriterium {st['tier3PerStep']})",
                                     "en": f"{m['tier3']} tier-3 hints ({m['tier3_per_step']:.2f} per step, criterion {st['tier3PerStep']})"},
                            "counter": {"de": "Kann auch bedeuten: die Person nutzt die Hinweisleiter bewusst und zügig, "
                                              "statt lange zu raten.",
                                        "en": "May also mean: the person uses the hint ladder deliberately and quickly "
                                              "instead of guessing for a long time."}})
            if m["stuck_steps"] >= st["stuckSteps"]:
                ind.append({"strength": "strong", "evidence": {"stuck_steps": m["stuck_steps"], "criterion": st["stuckSteps"]},
                            "text": {"de": f"{m['stuck_steps']} Steps mit mindestens drei Versuchen und ohne Bestehen "
                                           f"(Kriterium {st['stuckSteps']})",
                                     "en": f"{m['stuck_steps']} steps with at least three attempts and no pass "
                                           f"(criterion {st['stuckSteps']})"},
                            "counter": {"de": "Kann auch bedeuten: defekte Hardware am Arbeitsplatz oder ein Check, der "
                                              "etwas anderes prüft als die Aufgabe verlangt.",
                                        "en": "May also mean: broken hardware at the workplace, or a check that tests "
                                              "something other than what the task asks for."}})
            if m["abandon_rate"] >= st["abandonRate"] and m["abandoned"] >= st["abandonMin"]:
                ind.append({"strength": "strong", "evidence": {"abandoned": m["abandoned"], "abandon_rate": m["abandon_rate"]},
                            "text": {"de": f"{m['abandoned']} Steps geöffnet, aber nicht abgeschlossen ({m['abandon_rate']:.0%})",
                                     "en": f"{m['abandoned']} steps opened but not completed ({m['abandon_rate']:.0%})"},
                            "counter": {"de": "Kann auch bedeuten: die Person arbeitet Steps in eigener Reihenfolge oder "
                                              "kehrt später zurück.",
                                        "en": "May also mean: the person works the steps in their own order or returns later."}})
            tz = z[stu].get("median_step_time_s", 0.0)
            if tz >= st["timeZNote"]:
                notes.append({"kind": "norm", "text": {
                    "de": f"Ergänzend (normbezogen): mittlere Step-Zeit {m['median_step_time_s'] / 60:.0f} min, "
                          f"z = {tz:+.2f} gegen die Kohorte. Zählt nicht als Kriterium.",
                    "en": f"Supplementary (norm-referenced): median step time {m['median_step_time_s'] / 60:.0f} min, "
                          f"z = {tz:+.2f} against the cohort. Not counted as a criterion."}})
            if rates:
                p_low = percentile(rates, st["percentileNote"])
                if m["first_pass_rate"] <= p_low:
                    notes.append({"kind": "norm", "text": {
                        "de": f"Ergänzend (normbezogen): Erstversuch-Quote im untersten {st['percentileNote']} %-Bereich "
                              f"der Kohorte (≤ {p_low:.0%}). Zählt nicht als Kriterium.",
                        "en": f"Supplementary (norm-referenced): first-attempt pass rate in the cohort's bottom "
                              f"{st['percentileNote']} % (≤ {p_low:.0%}). Not counted as a criterion."}})
        if len(ind) >= st["minIndicators"]:
            mine.append({"flag": "struggling", "label": {"de": "Kriterien noch nicht erreicht", "en": "Criteria not yet met"},
                         "reasons": ind, "notes": notes})
        # ---- dropped ----------------------------------------------------------------------------
        dr = th["dropped"]
        if (m["progress"] < 1.0 and m["steps_opened"] >= dr["minStepsOpened"]
                and m["days_since_active"] >= dr["inactiveDays"]):
            mine.append({"flag": "dropped", "label": {"de": "Längere Zeit ohne Aktivität", "en": "Inactive for a while"},
                         "notes": [], "reasons": [
                {"strength": "weak", "evidence": {"days_since_active": m["days_since_active"], "progress": m["progress"]},
                 "text": {"de": f"Seit {m['days_since_active']:.0f} Tagen inaktiv bei {m['progress']:.0%} Fortschritt (Kriterium {dr['inactiveDays']} Tage)",
                          "en": f"inactive for {m['days_since_active']:.0f} days at {m['progress']:.0%} progress (criterion {dr['inactiveDays']} days)"},
                 "counter": {"de": "Kann auch bedeuten: Krankheit, Praktikum, Prüfungsphase in anderen Fächern, oder "
                                   "Arbeit offline ohne Telemetrie.",
                             "en": "May also mean: illness, an internship, exams in other subjects, or working offline "
                                   "without telemetry."}}]})
        flags[stu] = mine
    return flags


# --------------------------------------------------------------------------- mastery & bloom

def _attempt_score(attempts: int) -> float:
    return max(0.4, 1.0 - 0.15 * (attempts - 1))


_VERDICT = {"pass": 1.0, "weak": 0.5, "fail": 0.0}


def mastery_by_objective(student_events: list[dict], course: dict, weights: Optional[dict] = None) -> list[dict]:
    """Weighted mastery 0..1 per objective from check.pass/fail, question.answered, predict.compared."""
    w = deep_merge(DEFAULT_THRESHOLDS["mastery"]["weights"], weights)
    bss = _by_student_step(student_events)
    per_obj: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"check": [], "question": [], "predict": []})
    for stu, steps in bss.items():
        for sid, evs in steps.items():
            meta = course["steps"].get(sid)
            objs = meta["objectives"] if meta else [f"?{sid}"]
            rec = step_record(evs)
            scores = {"check": [], "question": [], "predict": []}
            if rec["n_checks"]:
                scores["check"].append(_attempt_score(rec["attempts_to_pass"]) if rec["passed"] else 0.1)
            for e in evs:
                if e["type"] in ("question.answered", "recall.answered") and e["data"].get("verdict") in _VERDICT:
                    scores["question"].append(_VERDICT[e["data"]["verdict"]])
                if e["type"] == "predict.compared" and e["data"].get("verdict") in _VERDICT:
                    scores["predict"].append(_VERDICT[e["data"]["verdict"]])
            for o in objs:
                for k, v in scores.items():
                    per_obj[o][k].extend(v)
    out = []
    order = []
    for sid in course["order"]:
        for o in course["steps"][sid]["objectives"]:
            if o not in order:
                order.append(o)
    for o in order + sorted(set(per_obj) - set(order)):
        parts = per_obj.get(o)
        if not parts:
            out.append({"objective": o, "mastery": None, "evidence": 0, "parts": {}})
            continue
        num = den = 0.0
        parts_out = {}
        n = 0
        for k, vals in parts.items():
            if vals:
                avg = mean(vals)
                parts_out[k] = round(avg, 3)
                num += w[k] * avg
                den += w[k]
                n += len(vals)
        out.append({"objective": o, "mastery": round(num / den, 3) if den else None, "evidence": n, "parts": parts_out})
    return out


def bloom_coverage(student_events: list[dict], course: dict) -> list[dict]:
    """Per Bloom level: steps in the course, steps done, checks passed, events tagged with that level."""
    done_steps = {e["step"] for e in student_events if e["type"] == "step.done"}
    passed_steps = {e["step"] for e in student_events if e["type"] == "check.pass"}
    tagged = Counter((e["data"].get("bloom") or "") for e in student_events)
    out = []
    for lvl in BLOOM_LEVELS:
        steps = [sid for sid in course["order"] if course["steps"][sid]["bloom"] == lvl]
        out.append({"level": lvl, "steps": len(steps),
                    "done": sum(1 for s in steps if s in done_steps),
                    "passed": sum(1 for s in steps if s in passed_steps),
                    "share": (sum(1 for s in steps if s in done_steps) / len(steps)) if steps else None,
                    "events": tagged.get(lvl, 0)})
    return out


# --------------------------------------------------------------------------- recommendation

def recommendation(m: dict, flags: list[dict], course: dict, lang: str = "de") -> list[str]:
    """Rule-based advice for the teacher (no LLM).  Returns a list of sentences."""
    fl = {f["flag"] for f in flags}
    de = lang == "de"
    out: list[str] = []
    hardest = sorted(((r["attempts_to_pass"], sid) for sid, r in m["steps"].items() if r["n_checks"] > 1),
                     reverse=True)[:2]
    if "followup" in fl:
        out.append("Offen nachfragen und die Belege gemeinsam durchgehen, mit der Gegenhypothese im Blick. Ein Flag ist "
                   "ein Muster in Ereignisdaten, kein Nachweis, und darf allein keine Bewertung tragen (siehe Regeln)."
                   if de else "Ask openly and go through the evidence together, keeping the counter-hypothesis in view. "
                              "A flag is a pattern in event data, not proof, and must never carry an assessment on its "
                              "own (see rules).")
    if "notice" in fl:
        out.append("Schwaches Signal: zur Kenntnis nehmen, nichts unternehmen, solange nichts anderes hinzukommt."
                   if de else "Weak signal: note it, take no action unless something else comes along.")
    if "struggling" in fl:
        steps = ", ".join(sid for _, sid in hardest) or "-"
        out.append(f"Sprechstunde anbieten; die Steps {steps} gezielt besprechen (meiste Versuche)."
                   if de else f"Offer office hours; walk through steps {steps} (most attempts).")
        if m["tier3_per_step"] >= 0.25:
            out.append("Viele Tier-3-Hinweise: Grundlagen des Moduls wiederholen, bevor es weitergeht."
                       if de else "Many tier-3 hints: revisit the module's fundamentals before moving on.")
    if "dropped" in fl:
        out.append(f"Seit {m['days_since_active']:.0f} Tagen inaktiv: Kontakt aufnehmen und nach Hindernissen fragen."
                   if de else f"Inactive for {m['days_since_active']:.0f} days: reach out and ask about obstacles.")
    if "excellent" in fl:
        out.append("Kriterien sicher erfüllt: Zusatzaufgaben oder das Capstone-Projekt früher anbieten; als Tutor*in einbinden."
                   if de else "Excellent trajectory: offer extension tasks or the capstone early; consider a peer-tutor role.")
    if m["questions"] and m["ungrounded_questions"] / m["questions"] >= 0.5 and m["questions"] >= 3:
        out.append("Über die Hälfte der Fragen war nicht durch das Kursmaterial gedeckt: Material an diesen Stellen ergänzen."
                   if de else "Over half of the questions were not covered by the course material: extend the material there.")
    if m["predictions"] >= 3 and m["predictions_correct"] / m["predictions"] < 0.5:
        out.append("Vorhersagen liegen meist daneben: Modellbildung (Was passiert, bevor ich es ausführe?) explizit üben."
                   if de else "Predictions are mostly wrong: practise building a mental model before running code.")
    if m["reflections"] == 0 and m["steps_done"] >= 4:
        out.append("Keine Reflexion geschrieben: beim nächsten Modulabschluss nachfragen."
                   if de else "No reflection written: follow up at the next module boundary.")
    if not out:
        out.append("Kein Handlungsbedarf erkennbar; Verlauf im Rahmen der Kohorte."
                   if de else "No action needed; trajectory within the cohort's range.")
    return out


# --------------------------------------------------------------------------- course overview

def course_overview(events: list[dict], course: dict, now: Optional[float] = None,
                    thresholds: Optional[dict] = None) -> dict:
    th = deep_merge(DEFAULT_THRESHOLDS, thresholds)
    if now is None:
        now = max((e["t"] for e in events), default=0.0)
    metrics = student_metrics(events, course["order"], now)
    students = list(metrics)
    active = [s for s in students if metrics[s]["days_since_active"] <= th["activeDays"]]
    completed = [s for s in students if metrics[s]["steps_done"] >= len(course["order"]) and course["order"]]
    modules = []
    for mod in course["modules"]:
        sids = mod["steps"]
        if not sids or not students:
            modules.append({"id": mod["id"], "title": mod["title"], "steps": len(sids), "progress": 0.0,
                            "done_all": 0, "started": 0})
            continue
        shares = []
        done_all = started = 0
        for s in students:
            recs = metrics[s]["steps"]
            d = sum(1 for sid in sids if sid in recs and recs[sid]["done"] is not None)
            o = sum(1 for sid in sids if sid in recs and recs[sid]["opened"] is not None)
            shares.append(d / len(sids))
            done_all += d == len(sids)
            started += o > 0
        modules.append({"id": mod["id"], "title": mod["title"], "steps": len(sids), "progress": mean(shares),
                        "done_all": done_all, "started": started})
    # funnel: how many students reached (opened) / completed each step, in course order
    funnel = []
    for sid in course["order"]:
        reached = sum(1 for s in students if sid in metrics[s]["steps"] and metrics[s]["steps"][sid]["opened"] is not None)
        done = sum(1 for s in students if sid in metrics[s]["steps"] and metrics[s]["steps"][sid]["done"] is not None)
        funnel.append({"step": sid, "reached": reached, "done": done})
    # where the cohort stops: last completed step of every student who has not finished
    last_step = Counter()
    for s in students:
        if s in completed:
            continue
        done_idx = [course["order"].index(sid) for sid, r in metrics[s]["steps"].items()
                    if r["done"] is not None and sid in course["order"]]
        last_step[course["order"][max(done_idx)] if done_idx else "(none)"] += 1
    biggest_drop = None
    for i in range(1, len(funnel)):
        drop = funnel[i - 1]["reached"] - funnel[i]["reached"]
        if biggest_drop is None or drop > biggest_drop["drop"]:
            biggest_drop = {"from": funnel[i - 1]["step"], "to": funnel[i]["step"], "drop": drop}
    return {
        "course": course["id"],
        "students": len(students),
        "active": len(active),
        "completed": len(completed),
        "completion_rate": (len(completed) / len(students)) if students else 0.0,
        "mean_progress": mean([metrics[s]["progress"] for s in students]),
        "modules": modules,
        "funnel": funnel,
        "stops_at": last_step.most_common(5),
        "biggest_drop": biggest_drop,
        "events": len(events),
        "last_event": max((e["ts"] for e in events), default=None),
    }


def timeline(student_events: list[dict]) -> list[dict]:
    """Compact chronological list for the deep-dive page (one row per event)."""
    rows = []
    for e in sorted(student_events, key=lambda x: (x["t"], x["type"])):
        d = e["data"]
        detail = ""
        if e["type"] in ("check.pass", "check.fail", "check.run"):
            detail = f"{d.get('taskId') or ''} #{d.get('attempt') or '-'} {d.get('checkType') or ''}".strip()
        elif e["type"] == "hint.shown":
            detail = f"Tier {d.get('hintTier')}"
        elif e["type"] == "question.asked":
            detail = (d.get("question") or "")[:120] + ("" if d.get("grounded") is not False else " (ungrounded)")
        elif e["type"] in ("question.answered", "recall.answered", "predict.compared"):
            detail = f"{d.get('verdict') or ''}".strip()
        elif e["type"] == "edit.metrics":
            detail = f"typed {d.get('typedChars') or 0} / pasted {d.get('pastedChars') or 0}"
        elif e["type"] == "reflection.written":
            detail = (d.get("text") or "")[:120]
        elif e["type"] == "predict.made":
            detail = (d.get("prediction") or "")[:80]
        rows.append({"ts": e["ts"], "t": e["t"], "type": e["type"], "step": e["step"], "detail": detail})
    return rows

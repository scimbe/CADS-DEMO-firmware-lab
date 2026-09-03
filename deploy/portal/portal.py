#!/usr/bin/env python3
"""fl-portal: telemetry sink and teacher portal for the CaDS Firmware Lab (SPEC A5).

A host process next to the broker (deploy/multiuser/broker/fl_broker.py), same shape:
stdlib only, loopback bind, identity from the Keycloak gate's ``X-Gate-Email`` header,
never trusting anything the browser sends about who it is.

    POST /ingest                    telemetry from the tutor extension (token, idempotent)
    GET  /healthz                   liveness + counters
    GET  /portal/                   course overview (server-rendered HTML)
    GET  /portal/questions          clustered questions
    GET  /portal/steps              difficult spots
    GET  /portal/anomalies          z-scores and flags
    GET  /portal/students           student list -> /portal/student  (deep dive)
    GET  /portal/board              credit board, CSV/JSON export, teacher sign-off
    GET  /portal/rules              the effective thresholds and what they mean
    POST /admin/forget?slug=        erase every trace of one pseudonym (admin only)

Students appear only as their slug (sha256(lower(email))[:12], the broker's identifier).
Clear names exist solely in an optional roster.json a teacher maintains, and are shown
only to people authorised for that very course.  Question and reflection texts are
sanitised (e-mail addresses, credential URLs) before they are stored.

All numbers come from analytics.py, which is pure and unit-tested; this module only
stores events and renders HTML.  See RULES.md for the rules and README.md for operation.
"""
from __future__ import annotations

import csv
import datetime as _dt
import hashlib
import hmac
import html
import io
import json
import os
import sqlite3
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import analytics as an          # noqa: E402
import coursemeta               # noqa: E402
import events as evs            # noqa: E402

MAX_BODY = 1 << 20              # 1 MiB per ingest request
MAX_EVENTS_PER_REQUEST = 500
VIEWS = ("overview", "questions", "steps", "anomalies", "students", "student", "board", "rules")


def log(event: str, **fields) -> None:
    ts = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    extra = " ".join(f"{k}={v}" for k, v in fields.items())
    sys.stderr.write(f"{ts} fl-portal {event}{(' ' + extra) if extra else ''}\n")
    sys.stderr.flush()


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def slug_for(email: str) -> str:
    return hashlib.sha256(normalize_email(email).encode("utf-8")).hexdigest()[:12]


class PortalError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


# --------------------------------------------------------------------------- configuration

class Config:
    def __init__(self, env: Optional[dict] = None):
        e = os.environ if env is None else env
        self.bind_host = e.get("FL_PORTAL_BIND", "127.0.0.1")
        self.bind_port = int(e.get("FL_PORTAL_PORT", "3200"))
        self.db_path = e.get("FL_PORTAL_DB", "/var/lib/cads/portal.sqlite3")
        self.config_path = e.get("FL_PORTAL_CONFIG", "/etc/cads/portal.json")
        self.roster_path = e.get("FL_PORTAL_ROSTER", "")
        self.courses_dir = e.get("FL_PORTAL_COURSES", "courses")
        self.token = e.get("FL_PORTAL_TOKEN", "")
        # Local development only: pretend the gate verified this identity.  Never set in production.
        self.dev_email = normalize_email(e.get("FL_PORTAL_DEV_EMAIL", ""))
        self.retention_days = float(e.get("FL_PORTAL_RETENTION_DAYS", "180"))
        self.purge_interval_s = float(e.get("FL_PORTAL_PURGE_INTERVAL_S", "3600"))
        # Fixed clock for tests and screenshots; empty = real time.
        self.now_override = float(e["FL_PORTAL_NOW"]) if e.get("FL_PORTAL_NOW") else None

    def now(self) -> float:
        return self.now_override if self.now_override is not None else time.time()


DEFAULT_CREDIT = {
    "minStepShare": 0.8,        # share of the course's steps completed
    "minCheckShare": 0.8,       # share of the steps with checks passed
    "minReflections": 2,        # written reflections
    "requireProject": True,     # last step of the last module counts as the project
}


class Settings:
    """portal.json: teacher roles, threshold overrides, credit criteria."""

    def __init__(self, path: str = "", raw: Optional[dict] = None):
        self.path = path
        self.raw: dict = raw if raw is not None else {}
        self.mtime: Optional[float] = None
        if raw is None and path:
            self.reload()

    def reload(self) -> None:
        if not self.path:
            return                     # injected settings (tests, defaults): nothing to watch
        try:
            st = os.stat(self.path)
        except OSError:
            self.raw, self.mtime = {}, None
            return
        if self.mtime == st.st_mtime:
            return
        try:
            with open(self.path, encoding="utf-8") as fh:
                loaded = json.load(fh)
            self.raw = loaded if isinstance(loaded, dict) else {}
            self.mtime = st.st_mtime
        except (OSError, ValueError) as exc:
            log("config-error", path=self.path, error=type(exc).__name__)

    @property
    def teachers(self) -> dict:
        t = self.raw.get("teachers")
        return t if isinstance(t, dict) else {}

    @property
    def thresholds(self) -> dict:
        t = self.raw.get("thresholds")
        return t if isinstance(t, dict) else {}

    def credit(self, course_id: str) -> dict:
        base = an.deep_merge(DEFAULT_CREDIT, self.raw.get("credit") if isinstance(self.raw.get("credit"), dict) else None)
        per = (self.raw.get("creditPerCourse") or {}).get(course_id)
        return an.deep_merge(base, per if isinstance(per, dict) else None)

    def viewer(self, email: str) -> Optional[dict]:
        """Gate-verified e-mail -> {"email", "role", "courses"}; None when not a teacher."""
        email = normalize_email(email)
        if not email:
            return None
        entry = None
        for key, value in self.teachers.items():
            if normalize_email(key) == email and isinstance(value, dict):
                entry = value
                break
        if entry is None:
            return None
        role = entry.get("role") if entry.get("role") in ("teacher", "admin") else "teacher"
        courses = [c for c in (entry.get("courses") or []) if isinstance(c, str)]
        return {"email": email, "role": role, "courses": courses}


class Roster:
    """Optional slug -> clear name mapping, per course.  Never sent to anyone else."""

    def __init__(self, path: str = "", raw: Optional[dict] = None):
        self.path = path
        self.raw: dict = raw or {}
        self.mtime: Optional[float] = None
        if raw is None and path:
            self.reload()

    def reload(self) -> None:
        if not self.path:
            return
        try:
            st = os.stat(self.path)
        except OSError:
            self.raw, self.mtime = {}, None
            return
        if self.mtime == st.st_mtime:
            return
        try:
            with open(self.path, encoding="utf-8") as fh:
                loaded = json.load(fh)
            self.raw = loaded if isinstance(loaded, dict) else {}
            self.mtime = st.st_mtime
        except (OSError, ValueError) as exc:
            log("roster-error", error=type(exc).__name__)

    def name(self, course_id: str, slug: str) -> str:
        courses = self.raw.get("courses")
        if isinstance(courses, dict):
            per = courses.get(course_id)
            if isinstance(per, dict) and isinstance(per.get(slug), str):
                return per[slug]
        flat = self.raw.get("students")
        if isinstance(flat, dict) and isinstance(flat.get(slug), str):
            return flat[slug]
        return ""


# --------------------------------------------------------------------------- storage

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
  key      TEXT PRIMARY KEY,
  student  TEXT NOT NULL,
  course   TEXT NOT NULL,
  module   TEXT NOT NULL DEFAULT '',
  step     TEXT NOT NULL DEFAULT '',
  type     TEXT NOT NULL,
  ts       TEXT NOT NULL,
  t        REAL NOT NULL,
  data     TEXT NOT NULL,
  received REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS events_course_t   ON events(course, t);
CREATE INDEX IF NOT EXISTS events_student    ON events(course, student, t);
CREATE TABLE IF NOT EXISTS signoff (
  course  TEXT NOT NULL,
  student TEXT NOT NULL,
  status  TEXT NOT NULL,
  note    TEXT NOT NULL DEFAULT '',
  by      TEXT NOT NULL DEFAULT '',
  at      TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (course, student)
);
"""


class Store:
    def __init__(self, path: str):
        self.path = path
        if path != ":memory:":
            parent = os.path.dirname(os.path.abspath(path))
            if parent:
                os.makedirs(parent, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.executescript(SCHEMA)
            self._conn.commit()
        self.generation = 0          # bumped on every write; the analytics cache keys on it

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    # -- ingest ------------------------------------------------------------------------
    def insert(self, normalized: list[dict]) -> tuple[int, int]:
        """Returns (accepted, duplicates).  Idempotent over events.idempotency_key."""
        rows = [(evs.idempotency_key(n), n["student"], n["course"], n["module"], n["step"],
                 n["type"], n["ts"], n["t"], json.dumps(n["data"], sort_keys=True), time.time())
                for n in normalized]
        if not rows:
            return 0, 0
        with self._lock:
            before = self._conn.total_changes
            self._conn.executemany(
                "INSERT OR IGNORE INTO events (key, student, course, module, step, type, ts, t, data, received)"
                " VALUES (?,?,?,?,?,?,?,?,?,?)", rows)
            self._conn.commit()
            accepted = self._conn.total_changes - before
            self.generation += 1
        return accepted, len(rows) - accepted

    # -- reads -------------------------------------------------------------------------
    def _rows_to_events(self, rows) -> list[dict]:
        out = []
        for r in rows:
            try:
                data = json.loads(r["data"])
            except ValueError:
                data = {}
            out.append({"v": evs.SCHEMA_VERSION, "ts": r["ts"], "t": r["t"], "student": r["student"],
                        "course": r["course"], "module": r["module"], "step": r["step"],
                        "type": r["type"], "data": data})
        return out

    def events(self, course: str, student: str = "") -> list[dict]:
        with self._lock:
            if student:
                cur = self._conn.execute(
                    "SELECT * FROM events WHERE course=? AND student=? ORDER BY t, type", (course, student))
            else:
                cur = self._conn.execute("SELECT * FROM events WHERE course=? ORDER BY t, type", (course,))
            return self._rows_to_events(cur.fetchall())

    def courses(self) -> list[str]:
        with self._lock:
            return [r[0] for r in self._conn.execute(
                "SELECT course, COUNT(*) c FROM events GROUP BY course ORDER BY course").fetchall()]

    def counts(self) -> dict:
        with self._lock:
            row = self._conn.execute(
                "SELECT COUNT(*) n, COUNT(DISTINCT student) s, COUNT(DISTINCT course) c, MAX(t) last"
                " FROM events").fetchone()
        return {"events": row["n"], "students": row["s"], "courses": row["c"],
                "lastEvent": evs.iso(row["last"]) if row["last"] else None}

    # -- sign-off ----------------------------------------------------------------------
    def signoffs(self, course: str) -> dict[str, dict]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM signoff WHERE course=?", (course,)).fetchall()
        return {r["student"]: {"status": r["status"], "note": r["note"], "by": r["by"], "at": r["at"]}
                for r in rows}

    def set_signoff(self, course: str, student: str, status: str, note: str, by: str) -> None:
        at = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with self._lock:
            self._conn.execute(
                "INSERT INTO signoff (course, student, status, note, by, at) VALUES (?,?,?,?,?,?)"
                " ON CONFLICT(course, student) DO UPDATE SET status=excluded.status, note=excluded.note,"
                " by=excluded.by, at=excluded.at", (course, student, status, note, by, at))
            self._conn.commit()
            self.generation += 1

    # -- erasure / retention -----------------------------------------------------------
    def forget(self, slug: str) -> dict:
        with self._lock:
            n = self._conn.execute("DELETE FROM events WHERE student=?", (slug,)).rowcount
            s = self._conn.execute("DELETE FROM signoff WHERE student=?", (slug,)).rowcount
            self._conn.commit()
            self.generation += 1
        return {"events": n, "signoffs": s}

    def purge_older_than(self, cutoff_t: float) -> int:
        with self._lock:
            n = self._conn.execute("DELETE FROM events WHERE t < ?", (cutoff_t,)).rowcount
            self._conn.commit()
            if n:
                self.generation += 1
        return n


# --------------------------------------------------------------------------- analytics cache

class Portal:
    """Ties configuration, storage and analytics together (no HTTP here)."""

    def __init__(self, cfg: Config, store: Store, settings: Settings, roster: Roster,
                 courses: Optional[dict] = None):
        self.cfg = cfg
        self.store = store
        self.settings = settings
        self.roster = roster
        self._courses = courses if courses is not None else coursemeta.load_all(cfg.courses_dir)
        self._cache: dict[tuple, Any] = {}
        self._cache_lock = threading.Lock()

    # -- courses -----------------------------------------------------------------------
    def course(self, course_id: str) -> dict:
        c = self._courses.get(course_id)
        if c is None:
            c = coursemeta.placeholder_course(course_id)
            self._courses[course_id] = c
        return c

    def all_course_ids(self) -> list[str]:
        seen = list(self._courses)
        for cid in self.store.courses():
            if cid not in seen:
                seen.append(cid)
        return seen

    def courses_for(self, viewer: dict) -> list[str]:
        if viewer["role"] == "admin":
            return self.all_course_ids()
        return [c for c in viewer["courses"] if c]

    # -- cached analysis ---------------------------------------------------------------
    def analysis(self, course_id: str) -> dict:
        key = (course_id, self.store.generation, self.settings.mtime, round(self.cfg.now() / 60.0))
        with self._cache_lock:
            hit = self._cache.get(key)
        if hit is not None:
            return hit
        course = self.course(course_id)
        events = self.store.events(course_id)
        now = self.cfg.now()
        th = an.deep_merge(an.DEFAULT_THRESHOLDS, self.settings.thresholds)
        metrics = an.student_metrics(events, course["order"], now)
        result = {
            "course": course,
            "events": events,
            "now": now,
            "thresholds": th,
            "metrics": metrics,
            "flags": an.compute_flags(events, metrics, self.settings.thresholds, now),
            "zscores": an.cohort_zscores(metrics),
            "overview": an.course_overview(events, course, now, self.settings.thresholds),
            "questions": an.question_overview(events, th["questionJaccard"]),
            "difficulty": an.step_difficulty(events, course["order"]),
        }
        with self._cache_lock:
            self._cache = {key: result}          # only the newest generation is worth keeping
        return result

    # -- credit board ------------------------------------------------------------------
    def board(self, course_id: str) -> list[dict]:
        a = self.analysis(course_id)
        course, metrics = a["course"], a["metrics"]
        crit = self.settings.credit(course_id)
        signoffs = self.store.signoffs(course_id)
        order = course["order"]
        project_step = order[-1] if order else ""
        rows = []
        for slug in sorted(metrics):
            m = metrics[slug]
            recs = m["steps"]
            checks_total = sum(1 for r in recs.values() if r["n_checks"] > 0)
            checks_passed = sum(1 for r in recs.values() if r["passed"])
            step_share = (m["steps_done"] / len(order)) if order else 0.0
            check_share = (checks_passed / checks_total) if checks_total else 0.0
            project_done = bool(project_step and project_step in recs and recs[project_step]["done"] is not None)
            met = {
                "steps": step_share >= crit["minStepShare"],
                "checks": check_share >= crit["minCheckShare"],
                "reflections": m["reflections"] >= crit["minReflections"],
                "project": project_done or not crit["requireProject"],
            }
            achieved = all(met.values())
            so = signoffs.get(slug, {})
            status = "confirmed" if so.get("status") == "confirmed" else ("achieved" if achieved else "open")
            rows.append({
                "student": slug, "steps_done": m["steps_done"], "steps_total": len(order),
                "step_share": step_share, "checks_passed": checks_passed, "checks_total": checks_total,
                "check_share": check_share, "reflections": m["reflections"], "project": project_done,
                "project_step": project_step, "criteria": met, "achieved": achieved, "status": status,
                "note": so.get("note", ""), "by": so.get("by", ""), "at": so.get("at", ""),
                "progress": m["progress"],
            })
        return rows

    # -- ingest ------------------------------------------------------------------------
    def ingest(self, payload: Any, student_header: str = "") -> dict:
        if isinstance(payload, dict) and isinstance(payload.get("events"), list):
            raw_events = payload["events"]
        elif isinstance(payload, list):
            raw_events = payload
        elif isinstance(payload, dict):
            raw_events = [payload]
        else:
            raise PortalError(400, "body must be an event, a list of events or {\"events\": [...]}")
        if len(raw_events) > MAX_EVENTS_PER_REQUEST:
            raise PortalError(413, f"at most {MAX_EVENTS_PER_REQUEST} events per request")
        good: list[dict] = []
        rejected: list[dict] = []
        for i, raw in enumerate(raw_events):
            problems = evs.validate_event(raw)
            if not problems and student_header and raw.get("student") != student_header:
                problems = ["student does not match X-CaDS-Student"]
            if problems:
                rejected.append({"index": i, "errors": problems})
                continue
            good.append(evs.normalize_event(raw))
        accepted, duplicates = self.store.insert(good)
        return {"ok": True, "accepted": accepted, "duplicates": duplicates,
                "rejected": len(rejected), "problems": rejected[:10]}


# --------------------------------------------------------------------------- i18n

TEXT = {
    "title": ("Lehrenden-Portal", "Teacher portal"),
    "overview": ("Kursübersicht", "Course overview"),
    "questions": ("Fragen", "Questions"),
    "steps": ("Schwierige Stellen", "Difficult spots"),
    "anomalies": ("Auffälligkeiten", "Anomalies"),
    "students": ("Studierende", "Students"),
    "student": ("Tiefenanalyse", "Deep dive"),
    "board": ("Nachweise", "Credits"),
    "rules": ("Regeln", "Rules"),
    "course": ("Kurs", "Course"),
    "active": ("Aktiv", "Active"),
    "completed": ("Abgeschlossen", "Completed"),
    "completion": ("Abschlussquote", "Completion rate"),
    "progress": ("Fortschritt", "Progress"),
    "module": ("Modul", "Module"),
    "step": ("Step", "Step"),
    "students_n": ("Studierende", "Students"),
    "events": ("Ereignisse", "Events"),
    "last_event": ("Letztes Ereignis", "Last event"),
    "mean_progress": ("Mittlerer Fortschritt", "Mean progress"),
    "started": ("Begonnen", "Started"),
    "done_all": ("Alle Steps fertig", "All steps done"),
    "funnel": ("Verlauf durch den Kurs (erreicht / abgeschlossen)", "Path through the course (reached / completed)"),
    "stops_at": ("Wo die Kohorte stehen bleibt", "Where the cohort stops"),
    "biggest_drop": ("Größter Abbruch", "Biggest drop"),
    "no_data": ("Keine Daten für diesen Kurs.", "No data for this course."),
    "cluster": ("Frage (Cluster)", "Question (cluster)"),
    "count": ("Anzahl", "Count"),
    "asked_by": ("Studierende", "Students"),
    "top_step": ("Häufigster Step", "Most common step"),
    "ungrounded": ("nicht durch Material gedeckt", "not covered by material"),
    "ungrounded_rate": ("Ungrounded-Quote", "Ungrounded rate"),
    "variants": ("Varianten", "Variants"),
    "questions_total": ("Fragen gesamt", "Questions total"),
    "steps_most_questions": ("Steps mit den meisten Fragen", "Steps with the most questions"),
    "difficulty": ("Schwierigkeit", "Difficulty"),
    "first_fail": ("Fehlschlag 1. Versuch", "First-attempt fail"),
    "mean_attempts": ("Ø Versuche", "Mean attempts"),
    "hint_tiers": ("Hinweise T1/T2/T3", "Hints T1/T2/T3"),
    "median_time": ("Median Zeit bis bestanden", "Median time to pass"),
    "abandon": ("Abbruchquote", "Abandon rate"),
    "flags": ("Flags", "Flags"),
    "reason": ("Begründung", "Reason"),
    "evidence": ("Belege", "Evidence"),
    "first_pass_rate": ("Erstversuch-Quote", "First-attempt pass rate"),
    "hints_per_step": ("Hinweise/Step", "Hints/step"),
    "median_step_time": ("Median Step-Zeit", "Median step time"),
    "question_rate": ("Fragen/Step", "Questions/step"),
    "zscore_note": ("z-Werte je Studierendem gegen die Kohorte (0 = Mittelwert, ±1 = eine Standardabweichung).",
                    "z-scores per student against the cohort (0 = mean, ±1 = one standard deviation)."),
    "last_active": ("Zuletzt aktiv", "Last active"),
    "timeline": ("Zeitstrahl", "Timeline"),
    "mastery": ("Mastery je Lernziel", "Mastery per objective"),
    "bloom": ("Bloom-Abdeckung", "Bloom coverage"),
    "recommendation": ("Empfehlung", "Recommendation"),
    "objective": ("Lernziel", "Objective"),
    "level": ("Stufe", "Level"),
    "share": ("Anteil", "Share"),
    "evidence_n": ("Belege", "Evidence"),
    "edit_metrics": ("Editier-Metriken", "Edit metrics"),
    "typed": ("getippt", "typed"),
    "pasted": ("eingefügt", "pasted"),
    "paste_share": ("Paste-Anteil", "Paste share"),
    "predictions": ("Vorhersagen", "Predictions"),
    "reflections": ("Reflexionen", "Reflections"),
    "hints": ("Hinweise", "Hints"),
    "status": ("Status", "Status"),
    "open": ("offen", "open"),
    "achieved": ("erreicht", "achieved"),
    "confirmed": ("bestätigt", "confirmed"),
    "note": ("Notiz", "Note"),
    "signoff": ("Bestätigen", "Confirm"),
    "revoke": ("Bestätigung zurücknehmen", "Withdraw confirmation"),
    "signed_by": ("Bestätigt von", "Confirmed by"),
    "export": ("Export", "Export"),
    "criteria": ("Kriterien", "Criteria"),
    "project": ("Projekt", "Project"),
    "checks": ("Checks", "Checks"),
    "threshold": ("Schwellwert", "Threshold"),
    "value": ("Wert", "Value"),
    "meaning": ("Bedeutung", "Meaning"),
    "no_students": ("Keine Studierenden mit Daten.", "No students with data."),
    "back": ("Zurück", "Back"),
    "name": ("Name", "Name"),
    "detail": ("Detail", "Detail"),
    "time": ("Zeit", "Time"),
    "type": ("Typ", "Type"),
    "of": ("von", "of"),
    "forbidden": ("Kein Zugriff auf diesen Kurs.", "No access to this course."),
    "showing": ("Angezeigt", "Showing"),
    "all_events": ("Alle Ereignisse anzeigen", "Show all events"),
}


def t(key: str, lang: str) -> str:
    pair = TEXT.get(key)
    if not pair:
        return key
    return pair[1] if lang == "en" else pair[0]


# --------------------------------------------------------------------------- HTML helpers

def esc(value: Any) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def pct(x: Optional[float], nd: int = 0) -> str:
    return "–" if x is None else f"{x * 100:.{nd}f} %"


def num(x: Optional[float], nd: int = 2) -> str:
    if x is None:
        return "–"
    if nd == 0:
        return f"{x:.0f}"
    return f"{x:.{nd}f}"


def dur(seconds: Optional[float]) -> str:
    if not seconds:
        return "–"
    s = int(seconds)
    if s < 90:
        return f"{s} s"
    if s < 5400:
        return f"{s / 60:.0f} min"
    return f"{s / 3600:.1f} h"


CSS = """
:root{--bg:#f7f7f5;--fg:#1b1b1a;--muted:#6b6b66;--line:#dcdcd6;--card:#fff;--accent:#2f5d8a;
--good:#2e7d4f;--warn:#b56a12;--bad:#a8321f;--chip:#eceae4;}
@media (prefers-color-scheme:dark){:root{--bg:#16171a;--fg:#e9e9e6;--muted:#9b9b95;--line:#2e3036;
--card:#1e2025;--accent:#7fb0dc;--good:#69c08c;--warn:#e0a24a;--bad:#e0806f;--chip:#282b31;}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",
Roboto,Helvetica,Arial,sans-serif;}
header.top{background:var(--card);border-bottom:1px solid var(--line);padding:.6rem 1rem;
display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;position:sticky;top:0;z-index:5}
header.top h1{font-size:1rem;margin:0;font-weight:650;letter-spacing:.01em}
nav a{color:var(--fg);text-decoration:none;padding:.25rem .55rem;border-radius:6px;font-size:.9rem}
nav a:hover{background:var(--chip)}
nav a.active{background:var(--accent);color:#fff}
.spacer{flex:1}
.who{font-size:.8rem;color:var(--muted)}
main{padding:1rem;max-width:1180px;margin:0 auto}
h2{font-size:1.05rem;margin:1.4rem 0 .5rem}
h2:first-child{margin-top:0}
p.hint{color:var(--muted);font-size:.86rem;margin:.3rem 0 .8rem}
.cards{display:flex;flex-wrap:wrap;gap:.6rem;margin:.6rem 0 1rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.6rem .8rem;min-width:8.5rem}
.card .k{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.card .v{font-size:1.35rem;font-weight:640;margin-top:.15rem}
table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);
border-radius:10px;overflow:hidden;font-size:.9rem}
th,td{text-align:left;padding:.42rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--chip);font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em}
tr:last-child td{border-bottom:none}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.wrap{overflow-x:auto}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em}
pre{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:.7rem;overflow-x:auto}
.badge{display:inline-block;padding:.08rem .45rem;border-radius:999px;font-size:.76rem;font-weight:600;
border:1px solid transparent;white-space:nowrap}
.badge.excellent{background:rgba(46,125,79,.14);color:var(--good);border-color:var(--good)}
.badge.struggling{background:rgba(181,106,18,.14);color:var(--warn);border-color:var(--warn)}
.badge.cheat{background:rgba(168,50,31,.14);color:var(--bad);border-color:var(--bad)}
.badge.review{background:var(--chip);color:var(--muted);border-color:var(--line)}
.badge.dropped{background:var(--chip);color:var(--muted);border-color:var(--line)}
.badge.confirmed{background:rgba(46,125,79,.14);color:var(--good);border-color:var(--good)}
.badge.achieved{background:rgba(47,93,138,.14);color:var(--accent);border-color:var(--accent)}
.badge.open{background:var(--chip);color:var(--muted);border-color:var(--line)}
svg.chart{display:block;background:var(--card);border:1px solid var(--line);border-radius:10px;
max-width:100%;height:auto;margin:.4rem 0}
svg text{fill:var(--fg);font:11px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
svg text.mut{fill:var(--muted)}
a{color:var(--accent)}
form.inline{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;margin:0}
input[type=text],select,textarea{background:var(--bg);color:var(--fg);border:1px solid var(--line);
border-radius:6px;padding:.25rem .4rem;font:inherit;font-size:.85rem}
button{background:var(--accent);color:#fff;border:0;border-radius:6px;padding:.28rem .7rem;font:inherit;
font-size:.85rem;cursor:pointer}
button.ghost{background:var(--chip);color:var(--fg)}
ul.reasons{margin:.2rem 0;padding-left:1.1rem}
ul.reasons li{margin:.15rem 0}
details summary{cursor:pointer;color:var(--muted);font-size:.82rem}
.evidence{font-size:.78rem;color:var(--muted)}
.note{background:var(--chip);border-left:3px solid var(--accent);padding:.5rem .7rem;border-radius:0 8px 8px 0;
margin:.6rem 0;font-size:.88rem}
"""


def layout(ctx: dict, title: str, body: str) -> str:
    lang = ctx["lang"]
    nav = []
    for view, label in (("overview", "overview"), ("questions", "questions"), ("steps", "steps"),
                        ("anomalies", "anomalies"), ("students", "students"), ("board", "board"),
                        ("rules", "rules")):
        cls = " class=\"active\"" if ctx["view"] in (view, "student" if view == "students" else "") else ""
        nav.append(f'<a href="{esc(link(ctx, view))}"{cls}>{esc(t(label, lang))}</a>')
    picker = ""
    if len(ctx["courses"]) > 1:
        opts = "".join(
            f'<option value="{esc(c)}"{" selected" if c == ctx["course_id"] else ""}>{esc(c)}</option>'
            for c in ctx["courses"])
        picker = (f'<form class="inline" method="get" action="{esc(view_path(ctx["view"]))}">'
                  f'<input type="hidden" name="lang" value="{esc(lang)}">'
                  f'<select name="c" onchange="this.form.submit()">{opts}</select>'
                  f'<noscript><button>{esc(t("course", lang))}</button></noscript></form>')
    other = "en" if lang == "de" else "de"
    role = ctx["viewer"]["role"]
    return (
        "<!doctype html>\n"
        f'<html lang="{lang}"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="robots" content="noindex,nofollow">'
        f"<title>{esc(title)} · {esc(t('title', lang))}</title><style>{CSS}</style></head><body>"
        f'<header class="top"><h1>{esc(t("title", lang))}</h1><nav>{"".join(nav)}</nav>'
        f'{picker}<span class="spacer"></span>'
        f'<span class="who">{esc(ctx["viewer"]["email"])} · {esc(role)}</span>'
        f'<a href="{esc(link(ctx, ctx["view"], lang=other, **ctx.get("extra", {})))}">{other.upper()}</a>'
        f"</header><main>{body}</main></body></html>"
    )


def view_path(view: str) -> str:
    if view == "overview":
        return "/portal/"
    return f"/portal/{view}"


def link(ctx: dict, view: str, **params) -> str:
    q = {"c": params.pop("c", ctx.get("course_id") or "")}
    lang = params.pop("lang", ctx["lang"])
    if lang != "de":
        q["lang"] = lang
    q.update({k: v for k, v in params.items() if v not in (None, "")})
    q = {k: v for k, v in q.items() if v not in (None, "")}
    qs = urllib.parse.urlencode(q)
    return view_path(view) + (f"?{qs}" if qs else "")


def cards(items: list[tuple[str, str]]) -> str:
    return ('<div class="cards">'
            + "".join(f'<div class="card"><div class="k">{esc(k)}</div><div class="v">{v}</div></div>'
                      for k, v in items)
            + "</div>")


def table(headers: list[str], rows: list[list[str]], numeric: Optional[set] = None) -> str:
    numeric = numeric or set()
    th = "".join(f'<th class="{"n" if i in numeric else ""}">{esc(h)}</th>' for i, h in enumerate(headers))
    body = []
    for r in rows:
        tds = "".join(f'<td class="{"n" if i in numeric else ""}">{c}</td>' for i, c in enumerate(r))
        body.append(f"<tr>{tds}</tr>")
    return f'<div class="wrap"><table><thead><tr>{th}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


def badge(kind: str, label: str) -> str:
    return f'<span class="badge {esc(kind)}">{esc(label)}</span>'


# --------------------------------------------------------------------------- inline SVG charts

def _clip(text: str, n: int) -> str:
    """Shorten a chart label; the table under every chart still carries the full text."""
    return text if len(text) <= n else text[:n - 1] + "\u2026"


def svg_hbars(rows: list[tuple[str, float, str]], vmax: Optional[float] = None,
              width: int = 900, label_w: int = 250, color: str = "var(--accent)",
              title: str = "") -> str:
    """rows = [(label, value, value_text)]; horizontal bars, deterministic geometry."""
    if not rows:
        return ""
    bar_h, gap, pad_t, pad_b = 18, 6, 14, 10
    height = pad_t + pad_b + len(rows) * (bar_h + gap)
    vmax = vmax if vmax else max((abs(v) for _, v, _ in rows), default=1.0)
    vmax = vmax or 1.0
    plot_w = width - label_w - 78
    parts = [f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" width="{width}" height="{height}">']
    if title:
        parts.append(f"<title>{esc(title)}</title>")
    for i, (label, value, vtext) in enumerate(rows):
        y = pad_t + i * (bar_h + gap)
        w = max(1.0, plot_w * (abs(value) / vmax)) if vmax else 1.0
        parts.append(f'<text x="8" y="{y + 13}" class="mut">{esc(_clip(label, 38))}</text>')
        parts.append(f'<rect x="{label_w}" y="{y}" width="{plot_w}" height="{bar_h}" rx="3" '
                     f'fill="var(--chip)"/>')
        parts.append(f'<rect x="{label_w}" y="{y}" width="{w:.1f}" height="{bar_h}" rx="3" fill="{color}"/>')
        parts.append(f'<text x="{label_w + plot_w + 8}" y="{y + 13}">{esc(vtext)}</text>')
    parts.append("</svg>")
    return "".join(parts)


def svg_stacked(rows: list[tuple[str, list[float], str]], colors: list[str], width: int = 900,
                label_w: int = 250, title: str = "") -> str:
    if not rows:
        return ""
    bar_h, gap, pad_t, pad_b = 18, 6, 14, 10
    height = pad_t + pad_b + len(rows) * (bar_h + gap)
    vmax = max((sum(vals) for _, vals, _ in rows), default=1.0) or 1.0
    plot_w = width - label_w - 78
    parts = [f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" width="{width}" height="{height}">']
    if title:
        parts.append(f"<title>{esc(title)}</title>")
    for i, (label, vals, vtext) in enumerate(rows):
        y = pad_t + i * (bar_h + gap)
        x = float(label_w)
        parts.append(f'<text x="8" y="{y + 13}" class="mut">{esc(_clip(label, 38))}</text>')
        parts.append(f'<rect x="{label_w}" y="{y}" width="{plot_w}" height="{bar_h}" rx="3" fill="var(--chip)"/>')
        for v, col in zip(vals, colors):
            w = plot_w * (v / vmax)
            if w > 0.4:
                parts.append(f'<rect x="{x:.1f}" y="{y}" width="{w:.1f}" height="{bar_h}" fill="{col}"/>')
            x += w
        parts.append(f'<text x="{label_w + plot_w + 8}" y="{y + 13}">{esc(vtext)}</text>')
    parts.append("</svg>")
    return "".join(parts)


def svg_funnel(funnel: list[dict], total: int, width: int = 900, height: int = 230, title: str = "") -> str:
    """Two series over the course order: how many students reached and completed each step.

    The x axis is labelled by module, not by step: at 41 steps the individual names are
    unreadable, and where the cohort thins out is a question about modules anyway.  The
    table under the chart carries the exact per-step numbers.
    """
    if len(funnel) < 2:
        return ""
    pad_l, pad_r, pad_t, pad_b = 40, 14, 26, 34
    plot_w, plot_h = width - pad_l - pad_r, height - pad_t - pad_b
    vmax = max(total, max((f["reached"] for f in funnel), default=1), 1)
    n = len(funnel)

    def xy(i: int, v: int) -> tuple[float, float]:
        return pad_l + (plot_w * i / (n - 1)), pad_t + plot_h - (plot_h * v / vmax)

    parts = [f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" width="{width}" height="{height}">']
    if title:
        parts.append(f"<title>{esc(title)}</title>")
    for frac in (0, 0.5, 1.0):
        y = pad_t + plot_h - plot_h * frac
        parts.append(f'<line x1="{pad_l}" y1="{y:.1f}" x2="{width - pad_r}" y2="{y:.1f}" '
                     f'stroke="var(--line)" stroke-width="1"/>')
        parts.append(f'<text x="6" y="{y + 4:.1f}" class="mut">{vmax * frac:.0f}</text>')
    # module boundaries
    seen: set = set()
    for i, f in enumerate(funnel):
        mod = (f["step"].split("-", 1)[0] or "?")
        if mod in seen:
            continue
        seen.add(mod)
        x, _ = xy(i, 0)
        parts.append(f'<line x1="{x:.1f}" y1="{pad_t}" x2="{x:.1f}" y2="{pad_t + plot_h}" '
                     f'stroke="var(--line)" stroke-dasharray="2 3"/>')
        parts.append(f'<text x="{x + 3:.1f}" y="{height - pad_b + 16}" class="mut">{esc(mod)}</text>')
    for key, col, dash in (("reached", "var(--accent)", ""), ("done", "var(--good)", ' stroke-dasharray="4 3"')):
        pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in (xy(i, f[key]) for i, f in enumerate(funnel)))
        parts.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2"{dash}/>')
    parts.append(f'<text x="{width - pad_r}" y="{pad_t - 10}" text-anchor="end">'
                 f'<tspan fill="var(--accent)">\u25cf</tspan> reached  '
                 f'<tspan fill="var(--good)">\u25cf</tspan> done</text>')
    parts.append("</svg>")
    return "".join(parts)


def svg_zbars(rows: list[tuple[str, float]], width: int = 900, label_w: int = 150, title: str = "") -> str:
    """Diverging bars around zero for z-scores (clamped to ±3)."""
    if not rows:
        return ""
    bar_h, gap, pad_t, pad_b = 16, 5, 16, 22
    height = pad_t + pad_b + len(rows) * (bar_h + gap)
    plot_w = width - label_w - 70
    mid = label_w + plot_w / 2
    parts = [f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" width="{width}" height="{height}">']
    if title:
        parts.append(f"<title>{esc(title)}</title>")
    parts.append(f'<line x1="{mid:.1f}" y1="{pad_t - 4}" x2="{mid:.1f}" y2="{height - pad_b + 2}" '
                 f'stroke="var(--line)"/>')
    for i, (label, z) in enumerate(rows):
        y = pad_t + i * (bar_h + gap)
        zc = max(-3.0, min(3.0, z))
        w = abs(zc) / 3.0 * (plot_w / 2)
        x = mid if zc >= 0 else mid - w
        col = "var(--warn)" if zc >= 0 else "var(--accent)"
        parts.append(f'<text x="8" y="{y + 12}" class="mut">{esc(_clip(label, 26))}</text>')
        parts.append(f'<rect x="{x:.1f}" y="{y}" width="{max(1.0, w):.1f}" height="{bar_h}" rx="2" fill="{col}"/>')
        parts.append(f'<text x="{label_w + plot_w + 8}" y="{y + 12}">{z:+.2f}</text>')
    parts.append(f'<text x="{label_w}" y="{height - 6}" class="mut">-3</text>'
                 f'<text x="{mid:.1f}" y="{height - 6}" class="mut" text-anchor="middle">0</text>'
                 f'<text x="{label_w + plot_w:.1f}" y="{height - 6}" class="mut" text-anchor="end">+3</text>')
    parts.append("</svg>")
    return "".join(parts)


def svg_timeline(rows: list[dict], width: int = 900, height: int = 92, title: str = "") -> str:
    """One tick per event across the student's active span, coloured by event family."""
    if not rows:
        return ""
    t0, t1 = rows[0]["t"], rows[-1]["t"]
    span = max(1.0, t1 - t0)
    pad_l, pad_r, top = 10, 10, 26
    plot_w = width - pad_l - pad_r
    fam = {"check.pass": ("var(--good)", 0), "check.fail": ("var(--bad)", 0), "check.run": ("var(--muted)", 0),
           "hint.shown": ("var(--warn)", 1), "question.asked": ("var(--accent)", 2),
           "step.done": ("var(--good)", 3), "step.open": ("var(--line)", 3)}
    parts = [f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" width="{width}" height="{height}">']
    if title:
        parts.append(f"<title>{esc(title)}</title>")
    labels = ["checks", "hints", "questions", "steps"]
    for i, lab in enumerate(labels):
        y = top + i * 15
        parts.append(f'<line x1="{pad_l}" y1="{y}" x2="{width - pad_r}" y2="{y}" stroke="var(--line)"/>')
        parts.append(f'<text x="{pad_l}" y="{y - 3}" class="mut">{esc(lab)}</text>')
    for r in rows:
        entry = fam.get(r["type"])
        if not entry:
            continue
        col, lane = entry
        x = pad_l + plot_w * ((r["t"] - t0) / span)
        y = top + lane * 15
        parts.append(f'<rect x="{x:.1f}" y="{y - 5}" width="2.4" height="10" fill="{col}"/>')
    parts.append(f'<text x="{pad_l}" y="{height - 4}" class="mut">{esc(rows[0]["ts"])}</text>'
                 f'<text x="{width - pad_r}" y="{height - 4}" class="mut" text-anchor="end">'
                 f'{esc(rows[-1]["ts"])}</text>')
    parts.append("</svg>")
    return "".join(parts)


# --------------------------------------------------------------------------- pages

def flag_badges(flags: list[dict], lang: str) -> str:
    return " ".join(badge(f["flag"], f["label"]["en" if lang == "en" else "de"]) for f in flags) or "–"


def reasons_html(flags: list[dict], lang: str) -> str:
    out = []
    for f in flags:
        items = []
        for r in f["reasons"]:
            ev = esc(json.dumps(r["evidence"], sort_keys=True, ensure_ascii=False))
            items.append(f'<li>{esc(r["text"]["en" if lang == "en" else "de"])}'
                         f'<details><summary>{esc(t("evidence", lang))}</summary>'
                         f'<div class="evidence"><code>{ev}</code></div></details></li>')
        out.append(f'{badge(f["flag"], f["label"]["en" if lang == "en" else "de"])}'
                   f'<ul class="reasons">{"".join(items)}</ul>')
    return "".join(out) or "–"


def page_overview(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    a = p.analysis(ctx["course_id"])
    o = a["overview"]
    if not o["students"]:
        return f'<p class="hint">{esc(t("no_data", lang))}</p>'
    course = a["course"]
    body = [cards([
        (t("students_n", lang), f'{o["students"]}'),
        (t("active", lang), f'{o["active"]}'),
        (t("completed", lang), f'{o["completed"]}'),
        (t("completion", lang), pct(o["completion_rate"])),
        (t("mean_progress", lang), pct(o["mean_progress"])),
        (t("events", lang), f'{o["events"]}'),
    ])]
    if course.get("placeholder"):
        body.append(f'<div class="note">{esc("Platzhalter-Kursstruktur (course.json fehlt noch)." if lang == "de" else "Placeholder course structure (course.json not present yet).")}</div>')
    body.append(f"<h2>{esc(t('module', lang))}</h2>")
    rows = [(f'{m["id"]} · {coursemeta._title(m["title"], lang)}', m["progress"], pct(m["progress"]))
            for m in o["modules"]]
    body.append(svg_hbars(rows, 1.0, title=t("progress", lang)))
    body.append(table(
        [t("module", lang), t("step", lang), t("progress", lang), t("started", lang), t("done_all", lang)],
        [[esc(f'{m["id"]} · {coursemeta._title(m["title"], lang)}'), str(m["steps"]), pct(m["progress"]),
          str(m["started"]), str(m["done_all"])] for m in o["modules"]],
        numeric={1, 2, 3, 4}))
    body.append(f"<h2>{esc(t('funnel', lang))}</h2>")
    body.append(svg_funnel(o["funnel"], o["students"], title=t("funnel", lang)))
    if o["biggest_drop"] and o["biggest_drop"]["drop"] > 0:
        d = o["biggest_drop"]
        body.append(f'<p class="hint">{esc(t("biggest_drop", lang))}: <code>{esc(d["from"])}</code> → '
                    f'<code>{esc(d["to"])}</code> (−{d["drop"]})</p>')
    body.append(f"<h2>{esc(t('stops_at', lang))}</h2>")
    body.append(table([t("step", lang), t("students_n", lang)],
                      [[f'<code>{esc(s)}</code>', str(n)] for s, n in o["stops_at"]] or [["–", "0"]],
                      numeric={1}))
    if o["last_event"]:
        body.append(f'<p class="hint">{esc(t("last_event", lang))}: {esc(o["last_event"])}</p>')
    return "".join(body)


def page_questions(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    a = p.analysis(ctx["course_id"])
    q = a["questions"]
    if not q["total"]:
        return f'<p class="hint">{esc(t("no_data", lang))}</p>'
    body = [cards([
        (t("questions_total", lang), str(q["total"])),
        (t("students_n", lang), str(q["students"])),
        (t("ungrounded_rate", lang), pct(q["ungrounded_rate"])),
    ])]
    body.append(f'<p class="hint">'
                f'{esc("Cluster: normalisierter Text + Token-Jaccard ≥ " if lang == "de" else "Clusters: normalised text + token Jaccard ≥ ")}'
                f'{a["thresholds"]["questionJaccard"]}.</p>')
    top = q["clusters"][:20]
    body.append(svg_hbars([(c["representative"], float(c["count"]), str(c["count"])) for c in top],
                          title=t("cluster", lang)))
    rows = []
    for c in top:
        variants = "; ".join(c["variants"][1:4])
        rep = (f'{esc(c["representative"])}'
               + (f'<details><summary>{esc(t("variants", lang))}</summary>'
                  f'<div class="evidence">{esc(variants)}</div></details>' if variants else ""))
        rows.append([rep, str(c["count"]), str(c["students"]), f'<code>{esc(c["top_step"])}</code>',
                     pct(c["ungrounded_rate"])])
    body.append(table([t("cluster", lang), t("count", lang), t("asked_by", lang), t("top_step", lang),
                       t("ungrounded_rate", lang)], rows, numeric={1, 2, 4}))
    body.append(f"<h2>{esc(t('steps_most_questions', lang))}</h2>")
    per = q["per_step"][:15]
    body.append(table([t("step", lang), t("count", lang)],
                      [[f'<code>{esc(s)}</code>', str(n)] for s, n in per] or [["–", "0"]], numeric={1}))
    return "".join(body)


def page_steps(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    a = p.analysis(ctx["course_id"])
    rows = [r for r in a["difficulty"] if r["students"] > 0]
    if not rows:
        return f'<p class="hint">{esc(t("no_data", lang))}</p>'
    scored = sorted(rows, key=lambda r: (-an.difficulty_score(r), r["step"]))
    body = [f'<p class="hint">'
            f'{esc("Sortiert nach Schwierigkeits-Score (0,4·Fehlschlag 1. Versuch + 0,2·Versuche + 0,2·Tier-3-Anteil + 0,2·Abbruch); Definition siehe Regeln." if lang == "de" else "Sorted by difficulty score (0.4·first-attempt fail + 0.2·attempts + 0.2·tier-3 share + 0.2·abandon); see rules.")}'
            f"</p>"]
    body.append(svg_hbars([(r["step"], an.difficulty_score(r), num(an.difficulty_score(r), 2))
                           for r in scored[:20]], 1.0, color="var(--bad)", title=t("difficulty", lang)))
    body.append(f"<h2>{esc(t('hint_tiers', lang))}</h2>")
    body.append(svg_stacked(
        [(r["step"], [float(r["hint_tiers"][1]), float(r["hint_tiers"][2]), float(r["hint_tiers"][3])],
          f'{r["hint_tiers"][1]}/{r["hint_tiers"][2]}/{r["hint_tiers"][3]}') for r in scored[:20]],
        ["var(--accent)", "var(--warn)", "var(--bad)"], title=t("hint_tiers", lang)))
    trows = []
    for r in scored:
        trows.append([
            f'<code>{esc(r["step"])}</code>', num(an.difficulty_score(r), 2), str(r["opened"]),
            pct(r["first_fail_rate"]), num(r["mean_attempts"], 2),
            f'{r["hint_tiers"][1]}/{r["hint_tiers"][2]}/{r["hint_tiers"][3]}',
            dur(r["median_time_to_pass_s"]), pct(r["abandon_rate"]), str(r["questions"]),
        ])
    body.append(table([t("step", lang), t("difficulty", lang), t("started", lang), t("first_fail", lang),
                       t("mean_attempts", lang), t("hint_tiers", lang), t("median_time", lang),
                       t("abandon", lang), t("questions", lang)], trows, numeric={1, 2, 3, 4, 6, 7, 8}))
    return "".join(body)


def page_anomalies(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    a = p.analysis(ctx["course_id"])
    metrics, flags, z = a["metrics"], a["flags"], a["zscores"]
    if not metrics:
        return f'<p class="hint">{esc(t("no_students", lang))}</p>'
    order = {"cheat": 0, "struggling": 1, "review": 2, "dropped": 3, "excellent": 4}
    flagged = [s for s in metrics if flags.get(s)]
    flagged.sort(key=lambda s: (min(order.get(f["flag"], 9) for f in flags[s]), s))
    counts = {}
    for s in metrics:
        for f in flags.get(s, []):
            counts[f["flag"]] = counts.get(f["flag"], 0) + 1
    body = [cards([(k, str(v)) for k, v in sorted(counts.items())] or [(t("flags", lang), "0")])]
    body.append(f'<p class="hint">{esc(t("zscore_note", lang))}</p>')
    body.append(f"<h2>{esc(t('median_step_time', lang))} (z)</h2>")
    body.append(svg_zbars([(s, z[s].get("median_step_time_s", 0.0))
                           for s in sorted(metrics, key=lambda x: -z[x].get("median_step_time_s", 0.0))[:20]],
                          title="z median_step_time_s"))
    body.append(f"<h2>{esc(t('first_pass_rate', lang))} (z)</h2>")
    body.append(svg_zbars([(s, z[s].get("first_pass_rate", 0.0))
                           for s in sorted(metrics, key=lambda x: -z[x].get("first_pass_rate", 0.0))[:20]],
                          title="z first_pass_rate"))
    rows = []
    for s in flagged:
        m = metrics[s]
        rows.append([
            f'<a href="{esc(link(ctx, "student", s=s))}"><code>{esc(s)}</code></a>',
            reasons_html(flags[s], lang),
            pct(m["first_pass_rate"]), num(m["hints_per_step"], 2), dur(m["median_step_time_s"]),
            pct(m["paste_share"]),
        ])
    body.append(table([t("students", lang), t("reason", lang), t("first_pass_rate", lang),
                       t("hints_per_step", lang), t("median_step_time", lang), t("paste_share", lang)],
                      rows or [["–", "–", "–", "–", "–", "–"]], numeric={2, 3, 4, 5}))
    return "".join(body)


def page_students(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    a = p.analysis(ctx["course_id"])
    metrics, flags = a["metrics"], a["flags"]
    if not metrics:
        return f'<p class="hint">{esc(t("no_students", lang))}</p>'
    rows = []
    for s in sorted(metrics, key=lambda x: (-metrics[x]["progress"], x)):
        m = metrics[s]
        name = p.roster.name(ctx["course_id"], s) if ctx["may_see_names"] else ""
        label = f'<a href="{esc(link(ctx, "student", s=s))}"><code>{esc(s)}</code></a>'
        if name:
            label += f' <span class="evidence">{esc(name)}</span>'
        rows.append([label, flag_badges(flags.get(s, []), lang), pct(m["progress"]),
                     f'{m["steps_done"]}/{len(a["course"]["order"])}', pct(m["first_pass_rate"]),
                     num(m["hints_per_step"], 2), str(m["questions"]),
                     dur(m["median_step_time_s"]), f'{m["days_since_active"]:.1f} d'])
    return table([t("students", lang), t("flags", lang), t("progress", lang), t("step", lang),
                  t("first_pass_rate", lang), t("hints_per_step", lang), t("questions", lang),
                  t("median_step_time", lang), t("last_active", lang)], rows,
                 numeric={2, 3, 4, 5, 6, 7, 8})


def page_student(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    slug = ctx["extra"].get("s", "")
    a = p.analysis(ctx["course_id"])
    metrics = a["metrics"]
    if slug not in metrics:
        return f'<p class="hint">{esc(t("no_data", lang))}</p>'
    m = metrics[slug]
    course = a["course"]
    flags = a["flags"].get(slug, [])
    ev = p.store.events(ctx["course_id"], slug)
    name = p.roster.name(ctx["course_id"], slug) if ctx["may_see_names"] else ""
    head = f'<h2><code>{esc(slug)}</code>' + (f' <span class="evidence">{esc(name)}</span>' if name else "") + "</h2>"
    body = [head, cards([
        (t("progress", lang), pct(m["progress"])),
        (t("first_pass_rate", lang), pct(m["first_pass_rate"])),
        (t("hints_per_step", lang), num(m["hints_per_step"], 2)),
        (t("median_step_time", lang), dur(m["median_step_time_s"])),
        (t("questions", lang), str(m["questions"])),
        (t("reflections", lang), str(m["reflections"])),
        (t("paste_share", lang), pct(m["paste_share"])),
        (t("last_active", lang), f'{m["days_since_active"]:.1f} d'),
    ])]
    if flags:
        body.append(f"<h2>{esc(t('flags', lang))}</h2>")
        body.append(reasons_html(flags, lang))
    body.append(f"<h2>{esc(t('recommendation', lang))}</h2>")
    recs = an.recommendation(m, flags, course, lang)
    body.append("<ul class=\"reasons\">" + "".join(f"<li>{esc(r)}</li>" for r in recs) + "</ul>")
    body.append(f"<h2>{esc(t('mastery', lang))}</h2>")
    mast = [r for r in an.mastery_by_objective(ev, course) if r["evidence"] or r["mastery"] is not None]
    if mast:
        body.append(svg_hbars([(r["objective"], r["mastery"] or 0.0, pct(r["mastery"])) for r in mast], 1.0,
                              color="var(--good)", title=t("mastery", lang)))
        body.append(table([t("objective", lang), t("mastery", lang), t("evidence_n", lang), "check/question/predict"],
                          [[esc(r["objective"]), pct(r["mastery"]), str(r["evidence"]),
                            esc(json.dumps(r["parts"], sort_keys=True))] for r in mast], numeric={1, 2}))
    body.append(f"<h2>{esc(t('bloom', lang))}</h2>")
    bloom = an.bloom_coverage(ev, course)
    body.append(svg_hbars([(b["level"], b["share"] or 0.0,
                            f'{b["done"]}/{b["steps"]}') for b in bloom if b["steps"]], 1.0,
                          color="var(--accent)", title=t("bloom", lang)))
    body.append(f"<h2>{esc(t('edit_metrics', lang))}</h2>")
    body.append(cards([
        (t("typed", lang), f'{m["typed"]}'), (t("pasted", lang), f'{m["pasted"]}'),
        (t("paste_share", lang), pct(m["paste_share"])),
        (t("predictions", lang), f'{m["predictions_correct"]}/{m["predictions"]}'),
        ("answers pass/weak/fail", f'{m["answers_pass"]}/{m["answers_weak"]}/{m["answers_fail"]}'),
        (t("hints", lang), f'{m["hints"]} (T3 {m["tier3"]})'),
    ]))
    body.append(f"<h2>{esc(t('timeline', lang))}</h2>")
    rows = an.timeline(ev)
    body.append(svg_timeline(rows, title=t("timeline", lang)))
    show_all = ctx["extra"].get("all") == "1"
    shown = rows if show_all else rows[-120:]
    body.append(f'<p class="hint">{esc(t("showing", lang))}: {len(shown)} {esc(t("of", lang))} {len(rows)}'
                + ("" if show_all else
                   f' · <a href="{esc(link(ctx, "student", s=slug, all="1"))}">{esc(t("all_events", lang))}</a>')
                + "</p>")
    body.append(table([t("time", lang), t("type", lang), t("step", lang), t("detail", lang)],
                      [[esc(r["ts"]), f'<code>{esc(r["type"])}</code>', f'<code>{esc(r["step"])}</code>',
                        esc(r["detail"])] for r in shown]))
    return "".join(body)


def page_board(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    rows = p.board(ctx["course_id"])
    crit = p.settings.credit(ctx["course_id"])
    if not rows:
        return f'<p class="hint">{esc(t("no_students", lang))}</p>'
    counts = {"open": 0, "achieved": 0, "confirmed": 0}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    body = [cards([(t(k, lang), str(v)) for k, v in counts.items()])]
    crit_words = ", ".join(
        [f"Steps ≥ {crit['minStepShare']:.0%}" if lang == "de" else f"steps ≥ {crit['minStepShare']:.0%}",
         f"Checks ≥ {crit['minCheckShare']:.0%}",
         (f"Reflexionen ≥ {crit['minReflections']}" if lang == "de"
          else f"reflections ≥ {crit['minReflections']}")]
        + ([("Projekt" if lang == "de" else "project")] if crit["requireProject"] else []))
    body.append(f'<p class="hint">{esc(t("criteria", lang))}: {esc(crit_words)}'
                f' · <a href="{esc(link(ctx, "board", export="csv"))}">CSV</a>'
                f' · <a href="{esc(link(ctx, "board", export="json"))}">JSON</a></p>')
    trows = []
    for r in rows:
        s = r["student"]
        name = p.roster.name(ctx["course_id"], s) if ctx["may_see_names"] else ""
        label = f'<a href="{esc(link(ctx, "student", s=s))}"><code>{esc(s)}</code></a>'
        if name:
            label += f' <span class="evidence">{esc(name)}</span>'
        crits = " ".join(("✓" if v else "·") + k[:1].upper() for k, v in r["criteria"].items())
        target = "open" if r["status"] == "confirmed" else "confirmed"
        button_label = t("revoke", lang) if r["status"] == "confirmed" else t("signoff", lang)
        form = (f'<form class="inline" method="post" action="/portal/board/signoff">'
                f'<input type="hidden" name="c" value="{esc(ctx["course_id"])}">'
                f'<input type="hidden" name="s" value="{esc(s)}">'
                f'<input type="hidden" name="lang" value="{esc(lang)}">'
                f'<input type="hidden" name="status" value="{esc(target)}">'
                f'<input type="text" name="note" value="{esc(r["note"])}" placeholder="{esc(t("note", lang))}" '
                f'size="18">'
                f'<button class="{"ghost" if r["status"] == "confirmed" else ""}">{esc(button_label)}</button>'
                f"</form>")
        signed = f'{esc(r["by"])}<br><span class="evidence">{esc(r["at"])}</span>' if r["at"] else "–"
        trows.append([label, badge(r["status"], t(r["status"], lang)),
                      f'{r["steps_done"]}/{r["steps_total"]}', f'{r["checks_passed"]}/{r["checks_total"]}',
                      str(r["reflections"]), "✓" if r["project"] else "·",
                      f'<code>{esc(crits)}</code>', signed, form])
    body.append(table([t("students", lang), t("status", lang), t("step", lang), t("checks", lang),
                       t("reflections", lang), t("project", lang), t("criteria", lang),
                       t("signed_by", lang), t("signoff", lang)], trows, numeric={2, 3, 4}))
    return "".join(body)


RULE_ROWS = [
    ("questionJaccard", ("Fragen-Cluster: zwei Fragen landen im selben Cluster, wenn ihre Token-Mengen (ohne Stoppwörter) mindestens so ähnlich sind.",
                         "Question clusters: two questions join the same cluster when their token sets (stop words removed) are at least this similar.")),
    ("activeDays", ("„Aktiv“ = irgendein Ereignis innerhalb dieser Anzahl Tage.",
                    "‚Active‘ = any event within this many days.")),
    ("dropped", ("Abgebrochen? = so viele Tage ohne Ereignis bei unvollständigem Kurs.",
                 "Dropped? = this many days without an event while the course is incomplete.")),
    ("excellent", ("Sehr gut = Erstversuch-Quote im oberen Perzentil UND Hinweisnutzung höchstens im Median UND plausible (nicht zu kurze) mittlere Step-Zeit.",
                   "Excellent = first-attempt pass rate in the top percentile AND hint usage at most median AND a plausible (not too short) median step time.")),
    ("struggling", ("Tut sich schwer = mindestens so viele der Indikatoren (niedrige Erstversuch-Quote, viele Tier-3-Hinweise, lange Zeiten, Abbrüche).",
                    "Struggling = at least this many indicators (low first-attempt pass rate, many tier-3 hints, long times, abandoned steps).")),
    ("cheat", ("Betrugsverdacht = Check ohne vorherigen Fehlschlag unter der Zeitgrenze bei hohem Paste-Anteil, ODER identische Freitexte zwischen Studierenden, ODER Vorhersage exakt gleich der Ausgabe und nachträglich geändert. Ereignisse außerhalb einer Session sind nur ein schwaches Indiz.",
               "Suspected cheating = a check passed with no prior failure below the time limit with a high paste share, OR identical free text between students, OR a prediction exactly equal to the output and edited afterwards. Events outside a session are a weak indication only.")),
    ("mastery", ("Gewichte für Mastery je Lernziel aus Checks, beantworteten Fragen und Vorhersagen.",
                 "Weights for mastery per objective from checks, answered questions and predictions.")),
]


def page_rules(p: Portal, ctx: dict) -> str:
    lang = ctx["lang"]
    th = an.deep_merge(an.DEFAULT_THRESHOLDS, p.settings.thresholds)
    crit = p.settings.credit(ctx["course_id"])
    warn = ("Ein Flag ist ein Hinweis auf ein Muster in den Ereignisdaten – kein Nachweis. "
            "Es beweist weder eine Täuschung noch mangelnde Leistung: Paste-Anteile entstehen auch durch "
            "legitimes Kopieren aus dem Kursmaterial, kurze Zeiten durch Vorwissen, lange Zeiten durch Pausen "
            "am offenen Editor. Vor jeder Konsequenz gehört das Gespräch mit der studierenden Person."
            if lang == "de" else
            "A flag points at a pattern in the event data – it is not proof. It establishes neither cheating "
            "nor a lack of ability: paste shares also come from legitimately copying course material, short times "
            "from prior knowledge, long times from breaks with the editor open. Talk to the student before any "
            "consequence follows.")
    body = [f'<div class="note"><strong>{esc("Was ein Flag NICHT beweist" if lang == "de" else "What a flag does NOT prove")}:</strong> {esc(warn)}</div>']
    rows = []
    for key, texts in RULE_ROWS:
        rows.append([f"<code>{esc(key)}</code>",
                     f'<code>{esc(json.dumps(th.get(key), sort_keys=True, ensure_ascii=False))}</code>',
                     esc(texts[1 if lang == "en" else 0])])
    body.append(table([t("threshold", lang), t("value", lang), t("meaning", lang)], rows))
    body.append(f"<h2>{esc(t('board', lang))}</h2>")
    body.append(table([t("threshold", lang), t("value", lang)],
                      [[f"<code>{esc(k)}</code>", f"<code>{esc(json.dumps(v))}</code>"] for k, v in crit.items()]))
    body.append(f"<h2>{esc(t('difficulty', lang))}</h2>")
    body.append(f'<p class="hint">{esc("Schwierigkeits-Score = 0,4·Fehlschlagquote beim ersten Versuch + 0,2·(mittlere Versuche−1)/4 + 0,2·Tier-3-Anteil + 0,2·Abbruchquote." if lang == "de" else "Difficulty score = 0.4·first-attempt fail rate + 0.2·(mean attempts−1)/4 + 0.2·tier-3 share + 0.2·abandon rate.")}</p>')
    body.append(f"<h2>portal.json</h2><pre>{esc(json.dumps({'thresholds': th, 'credit': crit}, indent=2, ensure_ascii=False, sort_keys=True))}</pre>")
    return "".join(body)


PAGES = {"overview": page_overview, "questions": page_questions, "steps": page_steps,
         "anomalies": page_anomalies, "students": page_students, "student": page_student,
         "board": page_board, "rules": page_rules}


# --------------------------------------------------------------------------- exports

def board_csv(rows: list[dict], course_id: str) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["course", "student", "steps_done", "steps_total", "step_share", "checks_passed",
                "checks_total", "reflections", "project", "achieved", "status", "note", "signed_by", "signed_at"])
    for r in rows:
        w.writerow([course_id, r["student"], r["steps_done"], r["steps_total"], f'{r["step_share"]:.4f}',
                    r["checks_passed"], r["checks_total"], r["reflections"], int(r["project"]),
                    int(r["achieved"]), r["status"], r["note"], r["by"], r["at"]])
    return buf.getvalue()


# --------------------------------------------------------------------------- HTTP

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "fl-portal"
    sys_version = ""
    portal: Portal

    def log_message(self, fmt, *args):
        return

    # -- plumbing ----------------------------------------------------------------------
    def _send(self, status: int, body: str = "", content_type: str = "text/plain; charset=utf-8",
              headers: Optional[dict] = None) -> None:
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy",
                         "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _json(self, status: int, payload: dict) -> None:
        self._send(status, json.dumps(payload, sort_keys=True), "application/json; charset=utf-8")

    def _identity(self) -> str:
        email = normalize_email(self.headers.get("X-Gate-Email", ""))
        if email and "@" in email:
            return email
        return self.portal.cfg.dev_email

    def _viewer(self) -> dict:
        self.portal.settings.reload()
        self.portal.roster.reload()
        email = self._identity()
        if not email:
            raise PortalError(403, "No identity from gate.")
        viewer = self.portal.settings.viewer(email)
        if viewer is None:
            raise PortalError(403, "Not a teacher in portal.json.")
        return viewer

    def _same_origin(self) -> None:
        """Reject cross-site form posts (the gate has no CSRF token of its own)."""
        site = self.headers.get("Sec-Fetch-Site")
        if site and site not in ("same-origin", "none"):
            raise PortalError(403, "cross-site request rejected")
        origin = self.headers.get("Origin")
        if origin:
            host = self.headers.get("Host") or ""
            if urllib.parse.urlsplit(origin).netloc != host:
                raise PortalError(403, "cross-origin request rejected")

    def _body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            raise PortalError(413, "body too large")
        return self.rfile.read(length) if length else b""

    # -- context -----------------------------------------------------------------------
    def _context(self, view: str, qs: dict) -> dict:
        viewer = self._viewer()
        p = self.portal
        allowed = p.courses_for(viewer)
        if not allowed:
            raise PortalError(403, "No course assigned in portal.json.")
        course_id = (qs.get("c") or [""])[0] or allowed[0]
        if course_id not in allowed:
            raise PortalError(403, "No access to this course.")
        lang = "en" if (qs.get("lang") or ["de"])[0] == "en" else "de"
        extra = {}
        for key in ("s", "all", "export"):
            if qs.get(key):
                extra[key] = qs[key][0]
        may_see_names = viewer["role"] == "admin" or course_id in viewer["courses"]
        return {"viewer": viewer, "courses": allowed, "course_id": course_id, "lang": lang,
                "view": view, "extra": extra, "may_see_names": may_see_names}

    # -- routing -----------------------------------------------------------------------
    def _route(self, method: str) -> None:
        url = urllib.parse.urlsplit(self.path)
        path = url.path
        qs = urllib.parse.parse_qs(url.query)
        p = self.portal
        try:
            if method == "GET" and path == "/healthz":
                counts = p.store.counts()
                self._json(200, {"ok": True, **counts, "courses_configured": len(p.all_course_ids())})
                return
            if method == "POST" and path == "/ingest":
                self._ingest()
                return
            if method == "POST" and path in ("/admin/forget", "/portal/admin/forget"):
                self._forget(qs)
                return
            if method == "POST" and path == "/portal/board/signoff":
                self._signoff()
                return
            if method == "GET" and path in ("/", "/portal", "/portal/"):
                if path != "/portal/":
                    self._send(302, "", headers={"Location": "/portal/"})
                    return
                self._page("overview", qs)
                return
            if method == "GET" and path.startswith("/portal/"):
                view = path[len("/portal/"):].strip("/")
                if view in PAGES and view != "overview":
                    self._page(view, qs)
                    return
            self._send(404, "Not found")
        except PortalError as exc:
            log("error", path=path, status=exc.status, msg=exc.message)
            self._send(exc.status, exc.message)
        except Exception as exc:                                   # noqa: BLE001
            log("internal-error", path=path, error=type(exc).__name__, detail=str(exc)[:200])
            self._send(500, "internal error")

    def _page(self, view: str, qs: dict) -> None:
        ctx = self._context(view, qs)
        p = self.portal
        if view == "board" and ctx["extra"].get("export"):
            rows = p.board(ctx["course_id"])
            if ctx["extra"]["export"] == "csv":
                self._send(200, board_csv(rows, ctx["course_id"]), "text/csv; charset=utf-8",
                           {"Content-Disposition": f'attachment; filename="credits-{ctx["course_id"]}.csv"'})
            else:
                self._json(200, {"course": ctx["course_id"], "generated":
                                 _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                                 "rows": rows})
            return
        body = PAGES[view](p, ctx)
        title = t(view, ctx["lang"])
        self._send(200, layout(ctx, title, body), "text/html; charset=utf-8")

    def _ingest(self) -> None:
        p = self.portal
        if not p.cfg.token:
            raise PortalError(503, "ingest disabled: FL_PORTAL_TOKEN is not set")
        supplied = self.headers.get("X-CaDS-Token", "")
        if not hmac.compare_digest(supplied, p.cfg.token):
            log("ingest-denied", reason="token")
            raise PortalError(403, "bad token")
        raw = self._body()
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise PortalError(400, "body is not JSON")
        student = self.headers.get("X-CaDS-Student", "").strip()
        if student and not evs.is_slug(student):
            raise PortalError(400, "X-CaDS-Student is not a slug")
        result = p.ingest(payload, student)
        if result["rejected"]:
            log("ingest-rejected", n=result["rejected"], accepted=result["accepted"])
        self._json(200, result)

    def _forget(self, qs: dict) -> None:
        viewer = self._viewer()
        if viewer["role"] != "admin":
            raise PortalError(403, "Admin only")
        self._same_origin()
        slug = (qs.get("slug") or [""])[0]
        if not evs.is_slug(slug):
            raise PortalError(400, "slug missing or malformed")
        deleted = self.portal.store.forget(slug)
        log("forget", slug=slug, by=slug_for(viewer["email"]), **deleted)
        self._json(200, {"ok": True, "slug": slug, **deleted})

    def _signoff(self) -> None:
        self._same_origin()
        form = urllib.parse.parse_qs(self._body().decode("utf-8", "replace"))
        qs = {k: v for k, v in form.items()}
        ctx = self._context("board", qs)
        slug = (form.get("s") or [""])[0]
        if not evs.is_slug(slug):
            raise PortalError(400, "student slug missing or malformed")
        status = (form.get("status") or ["confirmed"])[0]
        if status not in ("confirmed", "open"):
            raise PortalError(400, "status must be confirmed or open")
        note = evs.sanitize_text((form.get("note") or [""])[0])[:500]
        self.portal.store.set_signoff(ctx["course_id"], slug, status, note, ctx["viewer"]["email"])
        log("signoff", course=ctx["course_id"], slug=slug, status=status,
            by=slug_for(ctx["viewer"]["email"]))
        self._send(303, "", headers={"Location": link(ctx, "board")})

    def do_GET(self):
        self._route("GET")

    def do_HEAD(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")


def make_server(portal: Portal, host: str, port: int) -> ThreadingHTTPServer:
    handler = type("BoundHandler", (Handler,), {"portal": portal})
    srv = ThreadingHTTPServer((host, port), handler)
    srv.daemon_threads = True
    return srv


def purge_loop(portal: Portal) -> None:
    cfg = portal.cfg
    while True:
        time.sleep(cfg.purge_interval_s)
        if cfg.retention_days <= 0:
            continue
        try:
            n = portal.store.purge_older_than(cfg.now() - cfg.retention_days * 86400.0)
            if n:
                log("purged", events=n, retention_days=cfg.retention_days)
        except Exception as exc:                                   # noqa: BLE001
            log("purge-error", error=type(exc).__name__)


def main() -> int:
    cfg = Config()
    store = Store(cfg.db_path)
    settings = Settings(cfg.config_path)
    roster = Roster(cfg.roster_path) if cfg.roster_path else Roster(raw={})
    portal = Portal(cfg, store, settings, roster)
    if not cfg.token:
        log("warning", msg="FL_PORTAL_TOKEN unset - /ingest refuses every request")
    if cfg.dev_email:
        log("warning", msg="FL_PORTAL_DEV_EMAIL set - identity is NOT verified by the gate")
    threading.Thread(target=purge_loop, args=(portal,), name="purge", daemon=True).start()
    srv = make_server(portal, cfg.bind_host, cfg.bind_port)
    log("listening", addr=f"{cfg.bind_host}:{cfg.bind_port}", db=cfg.db_path,
        teachers=len(settings.teachers), courses=len(portal.all_course_ids()),
        retention_days=cfg.retention_days)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
        store.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

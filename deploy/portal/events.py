#!/usr/bin/env python3
"""Telemetry event schema (SPEC A5, ``v: 1``): validation, sanitisation, normalisation.

One event is a JSON object::

    {"v": 1, "ts": "2026-09-03T03:10:00Z", "student": "<slug>", "course": "rust-foundations",
     "module": "m1", "step": "m1-02-move", "type": "check.pass", "data": {...}}

Everything here is pure (no I/O) so both the portal's ingest path and the
simulator/tests share exactly one definition of "valid event".
"""
from __future__ import annotations

import datetime as _dt
import re
from typing import Any, Optional

SCHEMA_VERSION = 1

EVENT_TYPES = frozenset({
    "step.open", "step.done",
    "check.run", "check.pass", "check.fail",
    "hint.shown",
    "question.asked", "question.answered",
    "predict.made", "predict.compared",
    "recall.answered", "reflection.written",
    "edit.metrics",
    "session.start", "session.end",
})

# data fields the portal stores in dedicated columns (everything else stays in the raw JSON)
INT_FIELDS = ("attempt", "hintTier", "durationMs", "citations", "typedChars", "pastedChars", "pasteEvents")
STR_FIELDS = ("taskId", "checkType", "bloom", "verdict", "question", "outputExcerpt", "prediction", "output",
              "answer", "text", "sessionId")
TEXT_FIELDS = ("question", "answer", "text", "prediction", "output", "outputExcerpt", "reflection")
MAX_TEXT = 2000

_SLUG_RE = re.compile(r"^[a-f0-9]{12}$")
_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_CRED_URL_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9+.-]*://[^/\s:@]+:[^/\s@]+@[^\s]+")
_TOKEN_QUERY_RE = re.compile(r"([?&](?:token|key|api_key|apikey|password|pass|secret)=)[^&\s]+", re.I)


def is_slug(value: Any) -> bool:
    return isinstance(value, str) and bool(_SLUG_RE.match(value))


def is_ident(value: Any) -> bool:
    return isinstance(value, str) and bool(_ID_RE.match(value))


def parse_ts(value: Any) -> Optional[float]:
    """ISO-8601 (``Z`` or offset) -> epoch seconds; None when unparsable."""
    if not isinstance(value, str) or len(value) < 19:
        return None
    s = value.strip()
    if s.endswith("Z") or s.endswith("z"):
        s = s[:-1] + "+00:00"
    try:
        d = _dt.datetime.fromisoformat(s)
    except ValueError:
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=_dt.timezone.utc)
    return d.timestamp()


def iso(t: float) -> str:
    return _dt.datetime.fromtimestamp(t, _dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sanitize_text(text: Any) -> str:
    """Strip e-mail addresses and credential-bearing URLs; cap the length."""
    if not isinstance(text, str):
        return ""
    s = _CRED_URL_RE.sub("[url]", text)
    s = _TOKEN_QUERY_RE.sub(r"\1[redacted]", s)
    s = _EMAIL_RE.sub("[email]", s)
    s = s.replace("\r\n", "\n")
    if len(s) > MAX_TEXT:
        s = s[:MAX_TEXT]
    return s


def validate_event(raw: Any) -> list[str]:
    """Return a list of problems (empty == valid).  Unknown data keys are tolerated."""
    errs: list[str] = []
    if not isinstance(raw, dict):
        return ["event is not an object"]
    if raw.get("v") != SCHEMA_VERSION:
        errs.append("v must be 1")
    if parse_ts(raw.get("ts")) is None:
        errs.append("ts missing or not ISO-8601")
    if not is_slug(raw.get("student")):
        errs.append("student must be a 12-hex slug")
    if not is_ident(raw.get("course")):
        errs.append("course missing or malformed")
    typ = raw.get("type")
    if typ not in EVENT_TYPES:
        errs.append("type unknown")
    if typ not in ("session.start", "session.end"):
        if not is_ident(raw.get("step")):
            errs.append("step missing or malformed")
        if raw.get("module") is not None and not is_ident(raw.get("module")):
            errs.append("module malformed")
    data = raw.get("data", {})
    if data is None:
        data = {}
    if not isinstance(data, dict):
        errs.append("data must be an object")
        return errs
    for k in INT_FIELDS:
        v = data.get(k)
        if v is not None and (isinstance(v, bool) or not isinstance(v, int) or v < 0):
            errs.append(f"data.{k} must be a non-negative integer")
    if data.get("hintTier") not in (None, 1, 2, 3):
        errs.append("data.hintTier must be 1..3")
    if data.get("verdict") not in (None, "pass", "weak", "fail"):
        errs.append("data.verdict must be pass|weak|fail")
    if data.get("grounded") is not None and not isinstance(data.get("grounded"), bool):
        errs.append("data.grounded must be boolean")
    return errs


def normalize_event(raw: dict) -> dict:
    """Valid raw event -> internal form used by analytics (texts sanitised, ts parsed)."""
    data = dict(raw.get("data") or {})
    for k in TEXT_FIELDS:
        if k in data:
            data[k] = sanitize_text(data[k])
    t = parse_ts(raw["ts"])
    step = raw.get("step") or ""
    module = raw.get("module") or (step.split("-", 1)[0] if step else "")
    return {
        "v": SCHEMA_VERSION,
        "ts": iso(t),
        "ts_raw": str(raw["ts"]).strip(),
        "t": t,
        "student": raw["student"],
        "course": raw["course"],
        "module": module,
        "step": step,
        "type": raw["type"],
        "data": data,
    }


def idempotency_key(ev: dict) -> str:
    """SPEC A5: idempotency over (student, ts, type, step, attempt)."""
    attempt = (ev.get("data") or {}).get("attempt")
    ts = ev.get("ts_raw") or ev["ts"]
    return "|".join([ev["student"], ts, ev["type"], ev.get("step") or "", "" if attempt is None else str(attempt)])

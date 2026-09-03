#!/usr/bin/env python3
"""Course metadata for the portal: module/step order, Bloom level and objectives per step.

Loaded from ``courses/<id>/course.json`` plus the YAML front matter of
``courses/<id>/steps/<step>.de.md`` (only the three scalar keys we need are parsed;
no YAML library).  Courses without a pack on disk (rust-foundations,
javascript-foundations until their packs land) get placeholder steps
``m0-01 .. m5-04`` so that analytics and the simulator work end to end.
"""
from __future__ import annotations

import json
import os
import re
from typing import Optional

BLOOM_LEVELS = ("remember", "understand", "apply", "analyze", "evaluate", "create")
KNOWN_COURSES = ("cads-zero-foundations", "rust-foundations", "javascript-foundations")

_FM_KEY = re.compile(r"^(id|bloom|objectives|estimatedMinutes|scaffold):\s*(.*)$")
# The model answer lives in the step file itself (`rubric:` inside a task's check), and the
# last socratic hint of a three-tier ladder states the solution outright.  Both are needed to
# judge a text-similarity or paste-share signal fairly - see RULES.md, sections 5.3 and 9.
_RUBRIC_RE = re.compile(r"rubric:\s*\"([^\"]{4,})\"")
_HINTS_RE = re.compile(r"hints:\s*\[(.*?)\]\s*\}", re.S)
_HINT_ITEM_RE = re.compile(r"\{\s*en:")


def _parse_front_matter(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    out: dict = {}
    for line in text[3:end].splitlines():
        m = _FM_KEY.match(line.strip())
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if key == "objectives":
            val = [x.strip().strip("'\"") for x in val.strip("[]").split(",") if x.strip()]
        elif key == "estimatedMinutes":
            val = int(val) if val.isdigit() else None
        out[key] = val
    return out


def _split_front_matter(text: str) -> tuple[str, str]:
    """(front matter, body).  Both empty parts are fine; no YAML library is involved."""
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end < 0:
        return "", text
    return text[3:end], text[end + 4:]


def _solution_exposure(front: str) -> tuple[list[str], int]:
    """Model answers stated in the step file, and the deepest hint tier it offers."""
    rubrics = [m.group(1) for m in _RUBRIC_RE.finditer(front)]
    tiers = 0
    for block in _HINTS_RE.finditer(front):
        tiers = max(tiers, len(_HINT_ITEM_RE.findall(block.group(1))))
    return rubrics, tiers


def _title(value, lang="de") -> str:
    if isinstance(value, dict):
        return value.get(lang) or value.get("de") or value.get("en") or ""
    return str(value or "")


# A stand-in for the step's own wording.  It matters: without a reference text the similarity
# rule has no baseline to subtract, and two students quoting the same source cannot be told
# apart from two students copying each other (see analytics.identical_texts).
PLACEHOLDER_REFERENCE = (
    "In diesem Schritt {step} des Moduls {module} geht es darum den Ablauf zu verstehen "
    "die Werkzeuge richtig einzusetzen und das Ergebnis anschliessend zu pruefen. "
    "Wichtig ist die Reihenfolge der Schritte und die Bedeutung der Ausgabe. "
    "Wer die Meldung liest erkennt woran es liegt und kann gezielt nachbessern."
)

PLACEHOLDER_MODULES = 6
PLACEHOLDER_STEPS_PER_MODULE = 4


def placeholder_course(course_id: str) -> dict:
    """A stand-in pack of ``m0-01 .. m5-04``.

    The size matters: cohort statistics (percentile flags, first-attempt pass rates) need
    enough checks per student to mean anything, and a six-module foundations course is what
    the real packs look like.  The Bloom level advances by module and stops at "evaluate";
    "create" belongs to a capstone project, which a placeholder does not have.
    """
    modules = []
    steps: dict = {}
    order: list[str] = []
    for mi in range(PLACEHOLDER_MODULES):
        mid = f"m{mi}"
        sids = []
        for si in range(1, PLACEHOLDER_STEPS_PER_MODULE + 1):
            sid = f"{mid}-{si:02d}"
            bloom = BLOOM_LEVELS[min(len(BLOOM_LEVELS) - 2, mi)]
            steps[sid] = {"id": sid, "module": mid, "bloom": bloom,
                          "objectives": [f"{course_id}.{mid}"], "title": {"de": sid, "en": sid},
                          "estimatedMinutes": 15, "hint_tiers": 3, "solution_in_material": True,
                          "reference_text": PLACEHOLDER_REFERENCE.format(step=sid, module=mid)}
            sids.append(sid)
            order.append(sid)
        modules.append({"id": mid, "title": {"de": f"Modul {mi}", "en": f"Module {mi}"}, "steps": sids})
    return {"id": course_id, "title": {"de": course_id, "en": course_id}, "modules": modules,
            "steps": steps, "order": order, "placeholder": True}


def load_course(courses_dir: str, course_id: str) -> dict:
    path = os.path.join(courses_dir, course_id, "course.json")
    if not os.path.isfile(path):
        return placeholder_course(course_id)
    with open(path, encoding="utf-8") as fh:
        cj = json.load(fh)
    steps: dict = {}
    order: list[str] = []
    modules = []
    for m in cj.get("modules", []):
        mid = m.get("id", "")
        sids = []
        for sid in m.get("steps", []):
            meta = {"id": sid, "module": mid, "bloom": "apply", "objectives": [], "title": {"de": sid, "en": sid},
                    "estimatedMinutes": None, "reference_text": "", "hint_tiers": 0,
                    "solution_in_material": False}
            reference: list[str] = []
            for lang in ("de", "en"):
                sp = os.path.join(courses_dir, course_id, "steps", f"{sid}.{lang}.md")
                if os.path.isfile(sp):
                    with open(sp, encoding="utf-8") as fh:
                        raw = fh.read()
                    front, body = _split_front_matter(raw)
                    rubrics, tiers = _solution_exposure(front)
                    reference += rubrics
                    reference.append(body)
                    meta["hint_tiers"] = max(meta["hint_tiers"], tiers)
                    if rubrics or tiers >= 3:
                        meta["solution_in_material"] = True
                    fm = _parse_front_matter(raw[:8192])
                    if lang == "de" or not meta["objectives"]:
                        if fm.get("bloom") in BLOOM_LEVELS:
                            meta["bloom"] = fm["bloom"]
                        if fm.get("objectives"):
                            meta["objectives"] = fm["objectives"]
                        if fm.get("estimatedMinutes"):
                            meta["estimatedMinutes"] = fm["estimatedMinutes"]
                    fm_title = None
                    with open(sp, encoding="utf-8") as fh:
                        for line in fh:
                            if line.startswith("title:"):
                                fm_title = line[6:].strip().strip("'\"")
                                break
                            if line.startswith("---") and fm_title is not None:
                                break
                    if fm_title:
                        meta["title"][lang] = fm_title
            meta["reference_text"] = "\n".join(reference)
            steps[sid] = meta
            sids.append(sid)
            order.append(sid)
        modules.append({"id": mid, "title": m.get("title") or {"de": mid, "en": mid}, "steps": sids,
                        "reflection": bool(m.get("reflection"))})
    return {"id": cj.get("id", course_id), "title": cj.get("title") or {"de": course_id, "en": course_id},
            "modules": modules, "steps": steps, "order": order, "placeholder": False}


def load_all(courses_dir: str, ids=KNOWN_COURSES) -> dict[str, dict]:
    found = list(ids)
    if os.path.isdir(courses_dir):
        for name in sorted(os.listdir(courses_dir)):
            if name not in found and os.path.isfile(os.path.join(courses_dir, name, "course.json")):
                found.append(name)
    return {cid: load_course(courses_dir, cid) for cid in found}


def objectives_of(course: dict) -> list[str]:
    seen: list[str] = []
    for sid in course["order"]:
        for o in course["steps"][sid]["objectives"]:
            if o not in seen:
                seen.append(o)
    return seen


def reference_text(course: dict, step_id: str) -> str:
    """Everything the step itself already says: model answers plus the step body.

    Used as the baseline for judging how similar two students' free texts really are.
    Two people quoting the same rubric are not two people copying from each other.
    """
    meta = course["steps"].get(step_id) or {}
    return meta.get("reference_text") or ""


def solution_in_material(course: dict, step_id: str) -> bool:
    """True when the step states the answer: a rubric in the file, or a third hint tier.

    Where this holds, copying is system-conform behaviour and says nothing about honesty.
    """
    meta = course["steps"].get(step_id) or {}
    return bool(meta.get("solution_in_material"))


def step_title(course: dict, step_id: str, lang: str = "de") -> str:
    meta = course["steps"].get(step_id)
    if not meta:
        return step_id
    return _title(meta.get("title"), lang) or step_id

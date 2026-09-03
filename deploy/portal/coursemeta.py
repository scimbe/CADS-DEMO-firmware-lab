#!/usr/bin/env python3
"""Course metadata for the portal: module/step order, Bloom level and objectives per step.

Loaded from ``courses/<id>/course.json`` plus the YAML front matter of
``courses/<id>/steps/<step>.de.md`` (only the three scalar keys we need are parsed;
no YAML library).  Courses without a pack on disk (rust-foundations,
javascript-foundations until their packs land) get placeholder steps
``m0-01 .. m2-04`` so that analytics and the simulator work end to end.
"""
from __future__ import annotations

import json
import os
import re
from typing import Optional

BLOOM_LEVELS = ("remember", "understand", "apply", "analyze", "evaluate", "create")
KNOWN_COURSES = ("cads-zero-foundations", "rust-foundations", "javascript-foundations")

_FM_KEY = re.compile(r"^(id|bloom|objectives|estimatedMinutes|scaffold):\s*(.*)$")


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


def _title(value, lang="de") -> str:
    if isinstance(value, dict):
        return value.get(lang) or value.get("de") or value.get("en") or ""
    return str(value or "")


def placeholder_course(course_id: str) -> dict:
    modules = []
    steps: dict = {}
    order: list[str] = []
    for mi in range(3):
        mid = f"m{mi}"
        sids = []
        for si in range(1, 5):
            sid = f"{mid}-{si:02d}"
            bloom = BLOOM_LEVELS[min(len(BLOOM_LEVELS) - 2, mi * 2 + (si - 1) // 2)]
            steps[sid] = {"id": sid, "module": mid, "bloom": bloom,
                          "objectives": [f"{course_id}.{mid}"], "title": {"de": sid, "en": sid},
                          "estimatedMinutes": 15}
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
                    "estimatedMinutes": None}
            for lang in ("de", "en"):
                sp = os.path.join(courses_dir, course_id, "steps", f"{sid}.{lang}.md")
                if os.path.isfile(sp):
                    with open(sp, encoding="utf-8") as fh:
                        fm = _parse_front_matter(fh.read(8192))
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


def step_title(course: dict, step_id: str, lang: str = "de") -> str:
    meta = course["steps"].get(step_id)
    if not meta:
        return step_id
    return _title(meta.get("title"), lang) or step_id

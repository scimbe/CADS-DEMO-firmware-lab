#!/usr/bin/env python3
"""R11a.7 / R11a.7a: does every learning objective come back a module later?

This is the measurement, written to be imported rather than copied. The
validator is meant to call `coverage()`; the CLI at the bottom exists so a
course author can run the same numbers by hand and get the same verdict.

THE MEASUREMENT, IN THE WORDS OF THE RULE
-----------------------------------------
R11a.7  Every objective has at least one retrieval in a LATER module.
R11a.7a A pointer that cannot speak is not coverage.

Three decisions turn that into arithmetic, and all three are load-bearing:

1. A step S recalls a step T when T is named in S's `recallFrom`. S then
   recalls every objective T teaches.
2. It counts only when S's module comes strictly after T's module in the order
   course.json lists them. A recall inside the same module is repetition, not
   spaced retrieval, and is not counted.
3. It counts only when T actually owns a `question` task. The recall card is
   built from the question tasks of a completed step, so a pointer at a step
   without one renders nothing while looking, in the data, exactly like
   coverage. Those pointers are reported separately as `silent`.

An objective is covered when at least one of the steps that teach it is
recalled this way. Teaching an objective in several steps does not raise the
bar: one later retrieval of any of them is a retrieval of the objective.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------
It does not read the step body, so it cannot tell whether the recalling step
mentions the pointer in prose (R11a.7a's second half). That stays a reading
job. It also does not judge whether a question is a good recall question.

USE
---
    from recall_coverage import coverage
    result = coverage(manifest, front_matter_by_step_id)

`manifest` is the parsed course.json. `front_matter_by_step_id` maps a step id
to its parsed English front matter; only `objectives`, `recallFrom` and `tasks`
are read, so any parser that produces those works.

    python3 scripts/recall_coverage.py courses/javascript-foundations
"""
from __future__ import annotations

import json
import os
import sys


class Result:
    """Outcome of one pack's measurement.

    covered / gaps  objective id -> list of (recalling step, recalled step)
    silent          (step, named target) pointers that can never render a card
    unknown         (step, named target) pointers at a step that does not exist
    """

    def __init__(self):
        self.covered: dict[str, list[tuple[str, str]]] = {}
        self.gaps: dict[str, list[str]] = {}
        self.silent: list[tuple[str, str]] = []
        self.unknown: list[tuple[str, str]] = []

    @property
    def ok(self) -> bool:
        return not self.gaps and not self.silent and not self.unknown

    def summary(self) -> str:
        total = len(self.covered) + len(self.gaps)
        return (f"objectives {total} | with a later recall {len(self.covered)} | "
                f"gaps {len(self.gaps)} | silent pointers {len(self.silent)} | "
                f"unknown pointers {len(self.unknown)}")


def _has_question(fm) -> bool:
    for t in (fm or {}).get("tasks") or []:
        if isinstance(t, dict) and isinstance(t.get("check"), dict) and t["check"].get("type") == "question":
            return True
    return False


def coverage(manifest, fronts) -> Result:
    """Measure R11a.7 over one course pack. Pure: no file access, no printing."""
    module_of, module_rank = {}, {}
    for rank, mod in enumerate(manifest.get("modules") or []):
        module_rank[mod["id"]] = rank
        for sid in mod.get("steps") or []:
            module_of[sid] = mod["id"]

    res = Result()
    teaches: dict[str, list[str]] = {}
    for sid, fm in fronts.items():
        for obj in (fm or {}).get("objectives") or []:
            teaches.setdefault(obj, []).append(sid)

    # step -> the steps it validly recalls (later module, target can speak)
    recalls: dict[str, list[str]] = {}
    for sid, fm in fronts.items():
        for target in (fm or {}).get("recallFrom") or []:
            if target not in fronts or target not in module_of:
                res.unknown.append((sid, target))
                continue
            if not _has_question(fronts[target]):
                res.silent.append((sid, target))
                continue
            if sid not in module_of:
                continue
            if module_rank[module_of[sid]] > module_rank[module_of[target]]:
                recalls.setdefault(sid, []).append(target)

    for obj, sources in sorted(teaches.items()):
        hits = [(sid, target) for sid, targets in sorted(recalls.items())
                for target in targets if target in sources]
        if hits:
            res.covered[obj] = hits
        else:
            res.gaps[obj] = sorted(sources)
    return res


def _load_pack(pack_dir):
    """CLI helper: read course.json and the English front matter of every step."""
    here = os.path.dirname(os.path.abspath(__file__))
    import importlib.util
    spec = importlib.util.spec_from_file_location("v", os.path.join(here, "validate-courses.py"))
    V = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(V)
    manifest = json.load(open(os.path.join(pack_dir, "course.json"), encoding="utf-8"))
    fronts = {}
    for mod in manifest.get("modules") or []:
        for sid in mod.get("steps") or []:
            path = os.path.join(pack_dir, "steps", f"{sid}.en.md")
            if os.path.exists(path):
                fronts[sid] = V.load_step(path)[0]
    return manifest, fronts


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(f"usage: {os.path.basename(sys.argv[0])} <course-pack-dir>")
    res = coverage(*_load_pack(sys.argv[1]))
    for obj, hits in sorted(res.covered.items()):
        print(f"OK  {obj:58} {', '.join(f'{s}<-{t}' for s, t in hits)}")
    for obj, sources in sorted(res.gaps.items()):
        print(f"GAP {obj:58} taught in {', '.join(sources)}, recalled nowhere later")
    for step, target in res.silent:
        print(f"SILENT  {step} -> {target}: target has no question task, the card never renders")
    for step, target in res.unknown:
        print(f"UNKNOWN {step} -> {target}: no such step")
    print()
    print(res.summary())
    sys.exit(0 if res.ok else 1)

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

4. An objective taught only in the LAST module is `terminal`, not a gap
   (R11a.7c). Nothing follows the last module, so there is nowhere to recall it
   from; a report that calls that a gap accuses a pack for being what it is -
   cads-zero-projects is six of six.

5. R11a.7a's second half - does the recalling body actually mention the step it
   points at? - is checked when bodies are supplied. Left unchecked it is the
   kind of gap that keeps a number green while nothing happens for the student:
   the pointer sits in the data and the reference never appears on screen.

   WHAT COUNTS AS NAMING IT, exactly, because two people counted this pack
   differently before it was written down. Three forms count, and no others:

     a. the step id in the prose        `m3-01-structs`
     b. the recalled step's `title`     "Structs: values that belong together"
     c. its module label                M3, taken from the id before the first
                                        dash and matched as a whole word

   Form (c) is the one that decides the number, and it decides it by a lot.
   Requiring (a) or (b) alone would fail a course that writes "the rule from M1"
   and means exactly that - a metric working against good prose rather than for
   it. Measured over the packs, unnamed pointers with (c) against without it:

     cads-zero-foundations   10  ->  50
     javascript-foundations  26  ->  30
     rust-foundations         0  ->  11

   Most of that difference is honest module references, which is why the form
   stays. Anything looser than these three - a bare topic word, a coincidental
   token - would pass on an accident, so the list does not grow without a
   finding behind it.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------
It does not judge whether a question is a good recall question. Whether a prompt
survives without the file in front of the reader is SPEC A9.2a's `recallPrompt`,
and that is a reading job.

USE
---
    from recall_coverage import coverage
    result = coverage(manifest, front_matter_by_step_id)
    result = coverage(manifest, fronts, body_by_step_id)   # also checks R11a.7a

`manifest` is the parsed course.json. `front_matter_by_step_id` maps a step id
to its parsed English front matter; only `objectives`, `recallFrom` and `tasks`
are read, so any parser that produces those works.

    python3 scripts/recall_coverage.py courses/javascript-foundations
"""
from __future__ import annotations

import json
import os
import re
import sys


class Result:
    """Outcome of one pack's measurement.

    covered / gaps  objective id -> list of (recalling step, recalled step)
    terminal        objective id -> the steps that teach it, all in the last
                    module, so R11a.7 cannot be met and this is not a gap
    silent          (step, named target) pointers that can never render a card
    unknown         (step, named target) pointers at a step that does not exist
    unnamed         (step, named target) pointers the recalling body never names
    """

    def __init__(self):
        self.covered: dict[str, list[tuple[str, str]]] = {}
        self.gaps: dict[str, list[str]] = {}
        self.terminal: dict[str, list[str]] = {}
        self.silent: list[tuple[str, str]] = []
        self.unknown: list[tuple[str, str]] = []
        self.unnamed: list[tuple[str, str]] = []

    @property
    def ok(self) -> bool:
        return not self.gaps and not self.silent and not self.unknown and not self.unnamed

    def summary(self) -> str:
        total = len(self.covered) + len(self.gaps) + len(self.terminal)
        return (f"objectives {total} | with a later recall {len(self.covered)} | "
                f"gaps {len(self.gaps)} | terminal {len(self.terminal)} | "
                f"silent pointers {len(self.silent)} | unknown pointers {len(self.unknown)} | "
                f"unnamed pointers {len(self.unnamed)}")


def _has_question(fm) -> bool:
    for t in (fm or {}).get("tasks") or []:
        if isinstance(t, dict) and isinstance(t.get("check"), dict) and t["check"].get("type") == "question":
            return True
    return False


def _names(body: str, target: str, fm) -> bool:
    """R11a.7a, second half: does this body name the step it recalls?

    The three forms that count are listed in the module docstring: the step id,
    the recalled step's title, or its module label as a whole word. Do not
    tighten this to the id alone without re-reading that passage - the module
    label is the form that carries "the rule from M1", and dropping it turns the
    measurement against the prose it is supposed to protect.
    """
    if not body:
        return True                          # nothing to judge, do not accuse
    if target in body:
        return True
    title = str((fm or {}).get("title") or "")
    if title and title in body:
        return True
    label = target.split("-", 1)[0].upper()  # m3-01-structs -> M3
    return bool(re.search(rf"\b{re.escape(label)}\b", body))


def coverage(manifest, fronts, bodies=None) -> Result:
    """Measure R11a.7 over one course pack. Pure: no file access, no printing.

    `bodies` is optional and maps a step id to its rendered body text. Given it,
    the second half of R11a.7a is checked as well: a pointer the recalling body
    never names is reported in `unnamed`. Without it that list stays empty and
    every other number is unchanged, so existing callers keep their behaviour.
    """
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
            if bodies is not None and not _names(bodies.get(sid, ""), target, fronts[target]):
                res.unnamed.append((sid, target))
            if module_rank[module_of[sid]] > module_rank[module_of[target]]:
                recalls.setdefault(sid, []).append(target)

    last_rank = len(module_rank) - 1
    for obj, sources in sorted(teaches.items()):
        hits = [(sid, target) for sid, targets in sorted(recalls.items())
                for target in targets if target in sources]
        if hits:
            res.covered[obj] = hits
        elif all(module_rank.get(module_of.get(s), -1) == last_rank for s in sources):
            # R11a.7c: nothing follows the last module, so this is not a gap.
            res.terminal[obj] = sorted(sources)
        else:
            res.gaps[obj] = sorted(sources)
    return res


def _load_pack(pack_dir):
    """CLI helper: course.json plus the English front matter and body of every step."""
    here = os.path.dirname(os.path.abspath(__file__))
    import importlib.util
    spec = importlib.util.spec_from_file_location("v", os.path.join(here, "validate-courses.py"))
    V = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(V)
    manifest = json.load(open(os.path.join(pack_dir, "course.json"), encoding="utf-8"))
    fronts, bodies = {}, {}
    for mod in manifest.get("modules") or []:
        for sid in mod.get("steps") or []:
            path = os.path.join(pack_dir, "steps", f"{sid}.en.md")
            if os.path.exists(path):
                # load_step returns (front matter, body, parse error)
                fronts[sid], bodies[sid] = V.load_step(path)[:2]
    return manifest, fronts, bodies


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(f"usage: {os.path.basename(sys.argv[0])} <course-pack-dir>")
    manifest, fronts, bodies = _load_pack(sys.argv[1])
    res = coverage(manifest, fronts, bodies)
    for obj, hits in sorted(res.covered.items()):
        print(f"OK  {obj:58} {', '.join(f'{s}<-{t}' for s, t in hits)}")
    for obj, sources in sorted(res.gaps.items()):
        print(f"GAP {obj:58} taught in {', '.join(sources)}, recalled nowhere later")
    for obj, sources in sorted(res.terminal.items()):
        print(f"END {obj:58} taught only in the last module ({', '.join(sources)}) - R11a.7c, not a gap")
    for step, target in res.silent:
        print(f"SILENT  {step} -> {target}: target has no question task, the card never renders")
    for step, target in res.unknown:
        print(f"UNKNOWN {step} -> {target}: no such step")
    for step, target in res.unnamed:
        print(f"UNNAMED {step} -> {target}: the body never names the step it recalls (R11a.7a)")
    print()
    print(res.summary())
    sys.exit(0 if res.ok else 1)

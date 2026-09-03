#!/usr/bin/env python3
"""CaDS Firmware Tutor - course pack validator.

Checks the course packs under courses/ against the SPEC (docs/SPEC.md, sec. 3.3
"Kurs-Pack-Format") and against the real firmware repository, so a broken link,
a mistyped path, an invented symbol, or a missing translation fails here on a
laptop rather than in front of a student.

What it checks, per the task brief:
  1. Schema: every step has the required front-matter fields, of the right
     shape, and every task carries a check of a known type.
  2. Cross references: every `requires:` and every `step:` link points at a
     step that actually exists in the same course.
  3. Repository paths: every `file:`/`doc:` link, every `sources:` entry, and
     every check that names a file (fileMatches/fileNotMatches/debugStop) points
     at a path that exists in the firmware repo passed as PROJECT_ROOT.
  4. Symbols: every `symbolInElf` check names a symbol that `nm` finds in the
     built ELF, UNLESS the step declares it under `creates:` (a symbol the
     student is meant to add - it does not exist yet, by design).
  5. Bilingual: every step has both a .de.md and a .en.md file.
  6. Bloom: every step's `bloom:` is one of the six allowed levels.
  7. Addendum v1.1: `command`/`testSuite`/`predict` checks (fields, `predict.then`
     recursively), `scaffold`, `recallFrom` targets, `misconceptions[].pattern`
     compiles, `socratic` triggers (`test:<name>:failed`, `output:<regex>`), and
     `modules[].reflection.prompts` in course.json.
  8. `--solutions DIR`: every top-level `testSuite`/`command` check is executed
     twice in a scratch copy of PROJECT_ROOT - without the solution it must FAIL,
     with DIR overlaid it must PASS. DIR may mirror the project root directly, or
     hold one directory per step id (SPEC v1.1 A4), in which case every step
     directory is overlaid. A check that is meant to pass on the untouched seed -
     a toolchain probe such as `node --version` - declares `seedMustFail: false`.
     Skipped with a note when the toolchain binary the command runs (leading
     `VAR=value` assignments skipped) is not installed.
     A check that legitimately passes on the seed opts out with
     `seedMustFail: false`.

PyYAML is used when present; otherwise a self-contained parser for the
front-matter subset these packs use takes over, so the validator runs on a
bare Python 3 (stdlib only).

Usage:
    scripts/validate-courses.py PROJECT_ROOT [--courses-dir DIR] [--elf PATH] [--nm PATH]
                                [--solutions DIR] [--only COURSE]

PROJECT_ROOT is the checkout of the firmware (github.com/scimbe/cads-zero) or,
for the Rust/JavaScript tracks, the seed workspace (workspaces/<track>/).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile

# --- front-matter parsing ---------------------------------------------------

try:
    import yaml  # type: ignore

    def parse_front_matter(text: str) -> dict:
        return yaml.safe_load(text) or {}

    PARSER = "PyYAML"
except ImportError:
    PARSER = "builtin"

    def _parse_flow(s: str, i: int):
        """Parse a JSON-ish YAML flow scalar/collection starting at s[i].

        Returns (value, next_index). Handles {maps}, [lists], "quoted"
        strings and bare scalars. Bare scalars run until a , ] } or end.
        """
        n = len(s)
        while i < n and s[i] in " \t":
            i += 1
        if i >= n:
            return "", i
        c = s[i]
        if c == "{":
            i += 1
            obj = {}
            while True:
                while i < n and s[i] in " \t,":
                    i += 1
                if i < n and s[i] == "}":
                    return obj, i + 1
                if i >= n:
                    # Unterminated flow map (usually an unbalanced quote in the
                    # front matter). Return what we have instead of spinning.
                    return obj, i
                key, i = _parse_flow_scalar(s, i, stop=":")
                while i < n and s[i] in " \t":
                    i += 1
                if i < n and s[i] == ":":
                    i += 1
                val, i = _parse_flow(s, i)
                obj[str(key).strip()] = val
            # unreachable
        if c == "[":
            i += 1
            arr = []
            while True:
                while i < n and s[i] in " \t,":
                    i += 1
                if i < n and s[i] == "]":
                    return arr, i + 1
                if i >= n:
                    return arr, i
                before = i
                val, i = _parse_flow(s, i)
                arr.append(val)
                if i == before:
                    return arr, i
        return _parse_flow_scalar(s, i, stop=",]}")

    def _parse_flow_scalar(s: str, i: int, stop: str):
        n = len(s)
        while i < n and s[i] in " \t":
            i += 1
        if i < n and s[i] in "\"'":
            quote = s[i]
            i += 1
            buf = []
            while i < n and s[i] != quote:
                if s[i] == "\\" and i + 1 < n:
                    buf.append(s[i + 1])
                    i += 2
                    continue
                buf.append(s[i])
                i += 1
            return "".join(buf), i + 1
        buf = []
        while i < n and s[i] not in stop:
            buf.append(s[i])
            i += 1
        # Bare flow scalars get the same typing as bare block scalars, so that
        # `{ expectExitCode: 0 }` and a block `expectExitCode: 0` both yield the
        # int PyYAML would yield. Without this the two parsers disagree and
        # type-checking rules (expectExitCode, minPass, timeoutMs) fire spuriously.
        return _strip_scalar("".join(buf)), i

    def _strip_scalar(v: str):
        v = v.strip()
        if len(v) >= 2 and v[0] in "\"'" and v[-1] == v[0]:
            return v[1:-1]
        if re.fullmatch(r"-?\d+", v):
            return int(v)
        if re.fullmatch(r"-?\d+\.\d+", v):
            return float(v)
        if v in ("true", "false"):
            return v == "true"
        if v in ("null", "~", ""):
            return None if v != "" else ""
        return v

    def _indent(line: str) -> int:
        return len(line) - len(line.lstrip(" "))

    def _parse_block(lines, idx, indent):
        """Parse a block mapping or sequence at the given indent.

        Returns (value, next_idx).
        """
        # Skip blank / comment lines handled by caller.
        # Decide sequence vs mapping by first significant line.
        while idx < len(lines) and (not lines[idx].strip() or lines[idx].lstrip().startswith("#")):
            idx += 1
        if idx >= len(lines):
            return None, idx
        if lines[idx].lstrip().startswith("- "):
            return _parse_seq(lines, idx, indent)
        return _parse_map(lines, idx, indent)

    def _parse_map(lines, idx, indent):
        obj = {}
        while idx < len(lines):
            line = lines[idx]
            if not line.strip() or line.lstrip().startswith("#"):
                idx += 1
                continue
            cur = _indent(line)
            if cur < indent:
                break
            if cur > indent:
                # unexpected deeper line; stop
                break
            stripped = line.strip()
            if stripped.startswith("- "):
                break
            m = re.match(r"^([^:]+):(.*)$", stripped)
            if not m:
                idx += 1
                continue
            key = m.group(1).strip()
            rest = m.group(2).strip()
            if rest == "":
                # Nested block. The child's indent is DISCOVERED from its first
                # significant line, not assumed to be indent + 1: a block map
                # under `check:` is normally indented by two, and assuming one
                # made _parse_map bail out immediately and yield {} - so every
                # block-style check parsed as type None. A sequence may also sit
                # at the key's own indent, which is legal YAML.
                j = idx + 1
                while j < len(lines) and (not lines[j].strip() or lines[j].lstrip().startswith("#")):
                    j += 1
                if j < len(lines):
                    child = _indent(lines[j])
                    is_seq = lines[j].lstrip().startswith("- ")
                    if child > indent or (is_seq and child == indent):
                        val, idx = _parse_block(lines, idx + 1, child)
                        obj[key] = val
                        continue
                # A key with nothing under it is an explicit null, as in PyYAML.
                obj[key] = None
                idx += 1
                continue
            elif rest[0] in "[{":
                val, _ = _parse_flow(rest, 0)
                obj[key] = val
                idx += 1
            else:
                obj[key] = _strip_scalar(rest)
                idx += 1
        return obj, idx

    def _parse_seq(lines, idx, indent):
        arr = []
        while idx < len(lines):
            line = lines[idx]
            if not line.strip() or line.lstrip().startswith("#"):
                idx += 1
                continue
            cur = _indent(line)
            if cur < indent:
                break
            stripped = line.strip()
            if not stripped.startswith("- "):
                break
            item = stripped[2:].strip()
            if item and item[0] in "[{":
                val, _ = _parse_flow(item, 0)
                arr.append(val)
                idx += 1
            elif ":" in item:
                # inline mapping start: treat the "- key: val" line as the
                # first entry of a mapping whose remaining keys are indented
                # under the dash (indent + 2).
                child_indent = cur + 2
                synthetic = [" " * child_indent + item]
                j = idx + 1
                while j < len(lines):
                    l2 = lines[j]
                    if not l2.strip() or l2.lstrip().startswith("#"):
                        j += 1
                        continue
                    if _indent(l2) < child_indent:
                        break
                    if _indent(l2) == cur and l2.strip().startswith("- "):
                        break
                    synthetic.append(l2)
                    j += 1
                val, _ = _parse_map(synthetic, 0, child_indent)
                arr.append(val)
                idx = j
            else:
                arr.append(_strip_scalar(item))
                idx += 1
        return arr, idx

    def parse_front_matter(text: str) -> dict:
        lines = text.split("\n")
        val, _ = _parse_block(lines, 0, 0)
        return val or {}


# --- validation -------------------------------------------------------------

ALLOWED_BLOOM = {"remember", "understand", "apply", "analyze", "evaluate", "create"}
CHECK_TYPES = {
    "board", "task", "build", "fileMatches", "fileNotMatches", "symbolInElf",
    "flash", "serialExpect", "debugStop", "question", "manual", "all", "any",
    "command", "testSuite", "predict",
}
REQUIRED_FIELDS = ["id", "title", "bloom", "objectives", "requires", "estimatedMinutes", "tasks"]
SCAFFOLD_LEVELS = {"worked", "faded", "independent"}
TEST_RUNNERS = {"cargo", "node-test", "tap", "custom"}
TRIGGER_RE = re.compile(r"^(\*|task:[^:\s]+:(failed|stuck)|question:[^:\s]+:weak|event:[a-z-]+|test:.+:failed|output:.+)$", re.S)
DEFAULT_PROBE_TIMEOUT_MS = 120000

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.steps = 0
        self.checks = 0

    def error(self, where, msg):
        self.errors.append(f"{where}: {msg}")

    def warn(self, where, msg):
        self.warnings.append(f"{where}: {msg}")


def load_step(path):
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    m = FM_RE.match(text)
    if not m:
        return None, None
    fm = parse_front_matter(m.group(1))
    body = text[m.end():]
    return fm, body


def repo_path_exists(root, rel):
    rel = str(rel).split("#")[0].strip()
    if not rel:
        return False
    return os.path.exists(os.path.join(root, rel))


def collect_symbols(nm, elf):
    if not os.path.exists(elf):
        return None
    try:
        out = subprocess.run([nm, elf], capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    syms = set()
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 3:
            syms.add(parts[-1])
        elif len(parts) == 2 and parts[0] in ("U", "w", "T", "t"):
            syms.add(parts[-1])
    return syms


def iter_check_paths(check):
    """Yield ('file'|'doc'|'symbol'|'elf', value) referenced by a check tree."""
    if not isinstance(check, dict):
        return
    t = check.get("type")
    if t in ("fileMatches", "fileNotMatches") and check.get("file"):
        yield ("file", check["file"])
    if t == "debugStop" and check.get("file"):
        yield ("file", check["file"])
    if t == "symbolInElf":
        if check.get("elf"):
            yield ("elf", check["elf"])
        if check.get("symbol"):
            yield ("symbol", check["symbol"])
    if t == "predict" and isinstance(check.get("then"), dict):
        yield from iter_check_paths(check["then"])
    # Composite checks. The runtime (extensions/cads-tutor/src/schema.ts) puts
    # sub-checks under "checks:"; "all:"/"any:" is accepted as an alias so an
    # older pack still validates. Without the "checks" key nothing inside a
    # composite was ever checked - that is how three project steps came to name
    # symbols that are in no ELF and in no creates: list.
    for key in ("checks", "all", "any"):
        sub = check.get(key)
        if isinstance(sub, list):
            for c in sub:
                yield from iter_check_paths(c)


def _is_localized(v):
    if isinstance(v, str):
        return v.strip() != ""
    if isinstance(v, dict):
        return any(isinstance(v.get(k), str) and v[k].strip() for k in ("de", "en"))
    return False


def _compile(pattern, where, what, report, flags=""):
    """Python `re` is close enough to JS RegExp for the patterns packs use; a
    compile failure here is a real error, a success is a strong hint."""
    try:
        re.compile(str(pattern))
    except re.error as exc:
        report.error(where, f"{what} /{pattern}/ does not compile: {exc}")
        return False
    return True


def _relative_cwd_ok(cwd):
    if not isinstance(cwd, str):
        return False
    if cwd.startswith("/") or cwd.startswith("\\"):
        return False
    return ".." not in re.split(r"[\\/]", cwd)


def validate_check(check, where, task_id, report, depth=0):
    """Schema of one check (Addendum v1.1 types included), recursing into
    all/any/predict.then. Returns the check type or None."""
    if not isinstance(check, dict):
        report.error(where, f"task '{task_id}' check is not a map")
        return None
    ctype = check.get("type")
    label = f"task '{task_id}'" + (" (nested)" if depth else "")
    if ctype not in CHECK_TYPES:
        report.error(where, f"{label} check type '{ctype}' unknown")
        return None
    if ctype in ("fileMatches", "fileNotMatches", "serialExpect"):
        if not check.get("pattern"):
            report.error(where, f"{label}: {ctype} needs 'pattern'")
        else:
            _compile(check["pattern"], where, f"{label} pattern", report)
    if ctype == "command":
        if not isinstance(check.get("command"), str) or not check["command"].strip():
            report.error(where, f"{label}: command needs a non-empty 'command'")
        if "cwd" in check and not _relative_cwd_ok(check["cwd"]):
            report.error(where, f"{label}: cwd '{check.get('cwd')}' must be relative and inside the project root")
        for key in ("expectStdout", "expectStderr"):
            if key in check and check[key] not in (None, ""):
                _compile(check[key], where, f"{label} {key}", report)
        if "expectExitCode" in check and not isinstance(check["expectExitCode"], int):
            report.error(where, f"{label}: expectExitCode must be an integer")
        if "seedMustFail" in check and not isinstance(check["seedMustFail"], bool):
            report.error(where, f"{label}: seedMustFail must be true/false")
    elif ctype == "testSuite":
        runner = check.get("runner")
        if runner not in TEST_RUNNERS:
            report.error(where, f"{label}: testSuite runner '{runner}' not in {sorted(TEST_RUNNERS)}")
        if runner in ("tap", "custom") and not check.get("command"):
            report.error(where, f"{label}: testSuite runner '{runner}' needs 'command'")
        if "cwd" in check and not _relative_cwd_ok(check["cwd"]):
            report.error(where, f"{label}: cwd '{check.get('cwd')}' must be relative and inside the project root")
        for key in ("expectPass", "expectFail"):
            v = check.get(key, [])
            if v is None:
                v = []
            if not isinstance(v, list) or not all(isinstance(x, str) and x for x in v):
                report.error(where, f"{label}: {key} must be a list of test names")
        both = set(check.get("expectPass") or []) & set(check.get("expectFail") or [])
        if both:
            report.error(where, f"{label}: {sorted(both)} listed in both expectPass and expectFail")
        if "minPass" in check and (not isinstance(check["minPass"], int) or check["minPass"] < 0):
            report.error(where, f"{label}: minPass must be a non-negative integer")
        if not (check.get("expectPass") or check.get("expectFail") or check.get("minPass")):
            report.warn(where, f"{label}: testSuite without expectPass/minPass/expectFail passes whenever no test fails")
    elif ctype == "predict":
        if not _is_localized(check.get("prompt")):
            report.error(where, f"{label}: predict needs 'prompt' ({{de, en}} or string)")
        then = check.get("then")
        if not isinstance(then, dict):
            report.error(where, f"{label}: predict needs 'then' (the check that runs after the prediction)")
        else:
            sub = validate_check(then, where, task_id, report, depth + 1)
            if sub == "predict":
                report.error(where, f"{label}: predict.then cannot be another predict")
            elif sub in ("question", "manual"):
                report.error(where, f"{label}: predict.then cannot be '{sub}'")
        if "bloom" in check and check["bloom"] not in ALLOWED_BLOOM:
            report.error(where, f"{label}: predict bloom '{check.get('bloom')}' not in {sorted(ALLOWED_BLOOM)}")
    elif ctype == "question":
        if not _is_localized(check.get("prompt")):
            report.error(where, f"{label}: question needs 'prompt'")
        if not check.get("rubric"):
            report.error(where, f"{label}: question needs 'rubric'")
    elif ctype in ("all", "any"):
        subs = check.get("checks")
        if not isinstance(subs, list) or not subs:
            report.error(where, f"{label}: {ctype} needs a non-empty 'checks' list")
        else:
            for c in subs:
                validate_check(c, where, task_id, report, depth + 1)
    return ctype


def _check_types(check):
    """All check types in a check tree (for trigger plausibility)."""
    out = set()
    if not isinstance(check, dict):
        return out
    out.add(check.get("type"))
    for c in check.get("checks") or []:
        out |= _check_types(c)
    if isinstance(check.get("then"), dict):
        out |= _check_types(check["then"])
    return out


def _hints_ok(entry, where, what, report):
    hints = entry.get("hints")
    if not isinstance(hints, list) or not hints:
        report.error(where, f"{what} needs a non-empty 'hints' list (1-3 tiers)")
        return
    if len(hints) > 3:
        report.warn(where, f"{what} has {len(hints)} hints; only 3 tiers are used")
    for h in hints:
        if not _is_localized(h):
            report.error(where, f"{what}: every hint must be a string or {{de, en}}")
    if not _is_localized(entry.get("question")):
        report.error(where, f"{what} needs a 'question' ({{de, en}} or string)")


def load_manifest(course_dir, report):
    course_json = os.path.join(course_dir, "course.json")
    name = os.path.basename(course_dir)
    try:
        with open(course_json, encoding="utf-8") as fh:
            manifest = json.load(fh)
    except (OSError, ValueError) as exc:
        report.error(name, f"course.json unreadable: {exc}")
        return {}
    modules = manifest.get("modules")
    if not isinstance(modules, list) or not modules:
        report.error(name, "course.json: modules must be a non-empty list")
        return manifest
    for i, mod in enumerate(modules):
        if not isinstance(mod, dict):
            report.error(name, f"course.json: modules[{i}] is not an object")
            continue
        refl = mod.get("reflection")
        if refl is None:
            continue
        where = f"{name}/course.json modules[{i}].reflection"
        prompts = refl.get("prompts") if isinstance(refl, dict) else None
        if not isinstance(prompts, list) or not prompts:
            report.error(where, "needs a non-empty 'prompts' list")
            continue
        if len(prompts) > 3:
            report.warn(where, f"{len(prompts)} prompts; the reflection card is meant for 1-3")
        for k, pr in enumerate(prompts):
            if not _is_localized(pr):
                report.error(where, f"prompts[{k}] must be a string or {{de, en}}")
    return manifest


def validate_course(course_dir, root, symbols, report, probes=None):
    steps_dir = os.path.join(course_dir, "steps")
    course_json = os.path.join(course_dir, "course.json")
    name = os.path.basename(course_dir)
    if not os.path.exists(course_json):
        report.error(name, "missing course.json")
        manifest = {}
    else:
        manifest = load_manifest(course_dir, report)
    if not os.path.isdir(steps_dir):
        report.error(name, "missing steps/ directory")
        return
    listed_steps = set()
    for mod in manifest.get("modules") or []:
        if isinstance(mod, dict):
            listed_steps |= {s for s in (mod.get("steps") or []) if isinstance(s, str)}

    # Gather step ids from filenames.
    en_ids, de_ids = set(), set()
    for fn in os.listdir(steps_dir):
        if fn.endswith(".en.md"):
            en_ids.add(fn[:-len(".en.md")])
        elif fn.endswith(".de.md"):
            de_ids.add(fn[:-len(".de.md")])
    all_ids = en_ids | de_ids

    for sid in sorted(all_ids):
        where = f"{name}/{sid}"
        if sid not in en_ids:
            report.error(where, "missing English step (.en.md)")
        if sid not in de_ids:
            report.error(where, "missing German step (.de.md)")

    # Steps that own a `question` task (valid recallFrom targets).
    recall_sources = set()
    for sid in sorted(en_ids):
        fm, _ = load_step(os.path.join(steps_dir, f"{sid}.en.md"))
        for task in (fm or {}).get("tasks") or []:
            if isinstance(task, dict) and isinstance(task.get("check"), dict) and task["check"].get("type") == "question":
                recall_sources.add(sid)

    # Validate each language file.
    for sid in sorted(all_ids):
        for lang in ("en", "de"):
            fpath = os.path.join(steps_dir, f"{sid}.{lang}.md")
            if not os.path.exists(fpath):
                continue
            where = f"{name}/{sid}.{lang}"
            fm, body = load_step(fpath)
            if fm is None:
                report.error(where, "no YAML front matter")
                continue
            report.steps += 1

            for field in REQUIRED_FIELDS:
                if field not in fm or fm[field] in (None, ""):
                    report.error(where, f"missing required field '{field}'")

            if fm.get("id") != sid:
                report.error(where, f"front-matter id '{fm.get('id')}' != filename '{sid}'")

            bloom = fm.get("bloom")
            if bloom not in ALLOWED_BLOOM:
                report.error(where, f"bloom '{bloom}' not in {sorted(ALLOWED_BLOOM)}")

            # requires -> existing steps
            for req in fm.get("requires") or []:
                if req not in all_ids:
                    report.error(where, f"requires unknown step '{req}'")

            # links
            n_cross = 0
            for link in fm.get("links") or []:
                if not isinstance(link, dict):
                    continue
                if "step" in link:
                    n_cross += 1
                    if link["step"] not in all_ids:
                        report.error(where, f"link -> unknown step '{link['step']}'")
                if "file" in link:
                    n_cross += 1
                    if not repo_path_exists(root, link["file"]):
                        report.error(where, f"file link -> missing path '{link['file']}'")
                if "doc" in link:
                    n_cross += 1
                    if not repo_path_exists(root, link["doc"]):
                        report.error(where, f"doc link -> missing path '{link['doc']}'")
            if n_cross < 2:
                report.warn(where, f"fewer than 2 cross references ({n_cross})")

            # sources
            srcs = fm.get("sources") or []
            if not srcs:
                report.warn(where, "no sources listed")
            for src in srcs:
                if not repo_path_exists(root, src):
                    report.error(where, f"sources -> missing path '{src}'")

            creates = set(fm.get("creates") or [])

            # Addendum v1.1 step fields
            scaffold = fm.get("scaffold")
            if scaffold is not None and scaffold not in SCAFFOLD_LEVELS:
                report.error(where, f"scaffold '{scaffold}' not in {sorted(SCAFFOLD_LEVELS)}")
            recall = fm.get("recallFrom") or []
            if not isinstance(recall, list):
                report.error(where, "recallFrom must be a list of step ids")
                recall = []
            for r in recall:
                if r == sid:
                    report.error(where, "recallFrom must not name the step itself")
                elif r not in all_ids:
                    report.error(where, f"recallFrom -> unknown step '{r}'")
                elif r not in recall_sources:
                    report.warn(where, f"recallFrom '{r}' has no question task; the recall card will never show")
            misconceptions = fm.get("misconceptions") or []
            if not isinstance(misconceptions, list):
                report.error(where, "misconceptions must be a list")
                misconceptions = []
            for k, mc in enumerate(misconceptions):
                what = f"misconceptions[{k}]"
                if not isinstance(mc, dict):
                    report.error(where, f"{what} is not a map")
                    continue
                if not mc.get("pattern"):
                    report.error(where, f"{what} needs 'pattern'")
                else:
                    _compile(mc["pattern"], where, f"{what} pattern", report)
                _hints_ok(mc, where, what, report)

            # tasks
            tasks = fm.get("tasks") or []
            if not (1 <= len(tasks) <= 3):
                report.warn(where, f"expected 1-3 tasks, found {len(tasks)}")
            step_check_types = set()
            task_ids = set()
            for task in tasks:
                if not isinstance(task, dict):
                    report.error(where, f"malformed task entry: {task!r}")
                    continue
                check = task.get("check")
                if not isinstance(check, dict):
                    report.error(where, f"task '{task.get('id')}' has no check map")
                    continue
                report.checks += 1
                task_ids.add(task.get("id"))
                ctype = validate_check(check, where, task.get("id"), report)
                step_check_types |= _check_types(check)
                if probes is not None and lang == "en" and ctype in ("command", "testSuite"):
                    probes.append((f"{name}/{sid}", task.get("id"), check))
                for kind, value in iter_check_paths(check):
                    if kind == "file":
                        if not repo_path_exists(root, value):
                            report.error(where, f"check file -> missing path '{value}'")
                    elif kind == "elf":
                        # ELF path is a build artifact; presence checked via symbols.
                        pass
                    elif kind == "symbol":
                        if symbols is None:
                            report.warn(where, f"cannot check symbol '{value}' (no ELF/nm)")
                        elif value not in symbols and value not in creates:
                            report.error(
                                where,
                                f"symbolInElf '{value}' not in ELF and not declared under creates:",
                            )

            # socratic triggers (classic + Addendum: test:<name>:failed, output:<regex>)
            for k, entry in enumerate(fm.get("socratic") or []):
                what = f"socratic[{k}]"
                if not isinstance(entry, dict):
                    report.error(where, f"{what} is not a map")
                    continue
                trig = entry.get("trigger")
                if not isinstance(trig, str) or not TRIGGER_RE.match(trig):
                    report.error(where, f"{what} trigger '{trig}' unknown (task:<id>:failed|stuck, question:<id>:weak, test:<name>:failed, output:<regex>, event:<name>, *)")
                else:
                    m = re.match(r"^(task|question):([^:]+):", trig)
                    if m and m.group(2) not in task_ids:
                        report.warn(where, f"{what} trigger '{trig}' references unknown task '{m.group(2)}'")
                    if trig.startswith("output:"):
                        _compile(trig[len("output:"):], where, f"{what} output trigger", report)
                        if not (step_check_types & {"command", "testSuite"}):
                            report.warn(where, f"{what} '{trig}' needs a command/testSuite task to ever fire")
                    if trig.startswith("test:") and "testSuite" not in step_check_types:
                        report.warn(where, f"{what} '{trig}' needs a testSuite task to ever fire")
                _hints_ok(entry, where, what, report)
            if misconceptions and not (step_check_types & {"command", "testSuite"}):
                report.warn(where, "misconceptions declared but no command/testSuite task produces output to match")
            if lang == "en" and listed_steps and sid not in listed_steps:
                report.warn(where, "step file is not listed in any module of course.json")

    # Only enforce full checks once (avoid double-counting de/en): dedupe handled
    # by iterating both, which is intentional - both files must be schema-valid.


# --- solution probes (--solutions) -----------------------------------------

_TAP_RE = re.compile(r"^\s*(not ok|ok)\b\s*(\d+)?\s*-?\s*(.*?)\s*(#.*)?$")
_CARGO_RE = re.compile(r"^test (\S+) \.\.\. (ok|FAILED|ignored)")


def _parse_tests(output, runner):
    """Twin of extensions/cads-tutor/src/checks/testParsers.ts. Returns a list of
    {name, path, status, leaf} so this validator and the runtime reach the same
    verdict on the same output - an author must not see a check pass here and
    fail in the tutor. Keep the two in step when either changes."""
    out = []
    if runner == "cargo":
        # libtest prints one flat line per test; every case is a leaf.
        for line in output.splitlines():
            m = _CARGO_RE.match(line.strip())
            if m:
                status = {"ok": "passed", "FAILED": "failed"}.get(m.group(2), "skipped")
                out.append({"name": m.group(1), "path": m.group(1), "status": status, "leaf": True})
        return out
    stack = []  # frames: [indent, name, child_count]
    for line in output.splitlines():
        indent = len(line) - len(line.lstrip(" "))
        st = line.strip()
        sm = re.match(r"^#\s*Subtest:\s*(.*)$", st)
        if sm:
            while stack and stack[-1][0] >= indent:
                stack.pop()
            if stack:
                stack[-1][2] += 1
            stack.append([indent, sm.group(1).strip(), 0])
            continue
        if not st.startswith(("ok", "not ok")):
            continue
        m = _TAP_RE.match(st)
        if not m:
            continue
        while stack and stack[-1][0] > indent:
            stack.pop()
        frame = stack.pop() if stack and stack[-1][0] == indent else None
        rest = m.group(3) or ""
        directive = (m.group(4) or "").lower()
        name = rest.strip() or (frame[1] if frame else "")
        if "skip" in directive or "todo" in directive:
            status = "skipped"
        else:
            status = "passed" if m.group(1) == "ok" else "failed"
        out.append({
            "name": name,
            "path": " > ".join([f[1] for f in stack] + [name]),
            "status": status,
            "leaf": (frame[2] if frame else 0) == 0,
        })
    return out


def _index_tests(tests):
    """Addressable by leaf name and by full path; a failure beats an earlier
    same-named pass, so expectPass stays honest when a name repeats."""
    idx = {}
    for t in tests:
        for key in (t["name"], t["path"]):
            if not key:
                continue
            prev = idx.get(key)
            if prev is None or (prev["status"] == "passed" and t["status"] != "passed"):
                idx[key] = t
    return idx


def _suite_command(check):
    runner = check.get("runner")
    if check.get("command"):
        return check["command"]
    if runner == "cargo":
        return "cargo test"
    if runner == "node-test":
        return "node --test --test-reporter=tap"
    return None


def _suite_passed(check, code, output):
    """Mirror of evaluateSuite() in testParsers.ts: every expectPass test passed,
    every expectFail test failed, and at least minPass LEAF tests passed. Parents
    are excluded from the count so a nesting suite is not double-counted."""
    tests = _parse_tests(output, check.get("runner"))
    idx = _index_tests(tests)
    leaves = [t for t in tests if t["leaf"]]
    n_pass = sum(1 for t in leaves if t["status"] == "passed")
    problems = []
    for name in check.get("expectPass") or []:
        t = idx.get(name)
        if t is None:
            problems.append(f"expected test '{name}' to pass, but no test of that name ran")
        elif t["status"] != "passed":
            problems.append(f"expected test '{name}' to pass, but it {'failed' if t['status'] == 'failed' else 'was skipped'}")
    for name in check.get("expectFail") or []:
        t = idx.get(name)
        if t is None:
            problems.append(f"expected test '{name}' to fail, but no test of that name ran")
        elif t["status"] == "passed":
            problems.append(f"expected test '{name}' to fail, but it passed")
    min_pass = check.get("minPass")
    if isinstance(min_pass, int) and n_pass < min_pass:
        problems.append(f"only {n_pass} of the required {min_pass} tests passed")
    if not (check.get("expectPass") or check.get("expectFail") or min_pass):
        if not tests:
            return False, "no test results could be parsed from the output"
        failed = [t for t in leaves if t["status"] == "failed"]
        if failed:
            return False, f"{len(failed)} test(s) failed: " + ", ".join(t["path"] or t["name"] for t in failed[:5])
    if problems:
        return False, "; ".join(problems)
    return True, f"{n_pass} test(s) passed"


def _command_passed(check, code, out, err):
    expect = check.get("expectExitCode", 0)
    # A front-matter parser that hands back "0" instead of 0 must not turn into
    # a mismatch that reads "exit code 0 (expected 0)".
    if isinstance(expect, str) and re.fullmatch(r"-?\d+", expect.strip()):
        expect = int(expect)
    if code != expect:
        return False, f"exit code {code} (expected {expect})"
    for key, text in (("expectStdout", out), ("expectStderr", err)):
        pat = check.get(key)
        if pat and not re.search(str(pat), text, re.M):
            return False, f"{key} /{pat}/ not found"
    return True, f"exit code {code}"


_ENV_ASSIGN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")


def _leading_binary(command):
    """The program a shell command actually runs, so a missing toolchain is
    reported by name. Leading `VAR=value` assignments and a leading `env` are
    skipped; anything with shell metacharacters before the first word is given
    up on (returns None -> no skip, just run it)."""
    try:
        words = shlex.split(command)
    except ValueError:
        return None
    while words and (_ENV_ASSIGN_RE.match(words[0]) or words[0] == "env"):
        words.pop(0)
    if not words:
        return None
    first = words[0]
    if any(ch in first for ch in "|&;<>()$`"):
        return None
    return first


def _run_probe(check, root):
    """Runs a command/testSuite check in `root`; returns (passed, message, skipped)."""
    ctype = check.get("type")
    command = check.get("command") if ctype == "command" else _suite_command(check)
    if not command:
        return False, "no command", True
    binary = _leading_binary(command)
    if binary and "/" not in binary and shutil.which(binary) is None:
        return False, f"toolchain binary '{binary}' not installed - probe skipped", True
    cwd = os.path.normpath(os.path.join(root, check.get("cwd") or "."))
    timeout = (check.get("timeoutMs") or DEFAULT_PROBE_TIMEOUT_MS) / 1000
    try:
        proc = subprocess.run(["/bin/sh", "-c", command], cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return False, f"timeout after {timeout:.0f} s", False
    except OSError as exc:
        return False, f"cannot run: {exc}", False
    if ctype == "command":
        ok, msg = _command_passed(check, proc.returncode, proc.stdout, proc.stderr)
    else:
        ok, msg = _suite_passed(check, proc.returncode, proc.stdout + "\n" + proc.stderr)
    return ok, msg, False


def _copy_tree(src, dst):
    shutil.copytree(src, dst, symlinks=True, ignore=shutil.ignore_patterns(".git", "node_modules", "target"), dirs_exist_ok=True)


def _overlay_solutions(solutions_dir, dst, step_ids):
    """Lay the reference solutions over a copy of the seed workspace.

    Two layouts are in use and both are valid. A solutions directory may mirror
    the project root directly (solutions/src/... over <root>/src/...), or it may
    be split into one directory per step (SPEC v1.1 A4: solutions/<step-id>/src/...),
    which is what the rust-foundations and javascript-foundations workspaces ship
    so that a single step's solution can be inspected on its own. Anything that is
    not a step directory - a README, for instance - is left alone.

    Returns the number of per-step directories applied (0 for the flat layout).
    """
    entries = sorted(e for e in os.listdir(solutions_dir) if not e.startswith("."))
    per_step = [e for e in entries if e in step_ids and os.path.isdir(os.path.join(solutions_dir, e))]
    if not per_step:
        _copy_tree(solutions_dir, dst)
        return 0
    for entry in per_step:
        _copy_tree(os.path.join(solutions_dir, entry), dst)
    return len(per_step)


def run_solution_probes(probes, root, solutions_dir, report):
    """Seed copy must fail each check, seed+solutions copy must pass it."""
    if not probes:
        print("solutions: no command/testSuite checks to probe")
        return
    if not os.path.isdir(solutions_dir):
        report.error("solutions", f"'{solutions_dir}' is not a directory")
        return
    tmp = tempfile.mkdtemp(prefix="cads-validate-")
    seed = os.path.join(tmp, "seed")
    solved = os.path.join(tmp, "solved")
    _copy_tree(root, seed)
    _copy_tree(root, solved)
    step_ids = {where.rsplit("/", 1)[-1] for where, _, _ in probes}
    n_step_dirs = _overlay_solutions(solutions_dir, solved, step_ids)
    if n_step_dirs:
        print(f"solutions: {n_step_dirs} per-step solution director{'y' if n_step_dirs == 1 else 'ies'} applied")
    n_ok = n_skip = 0
    try:
        for where, task_id, check in probes:
            label = f"{where} task '{task_id}' [{check.get('type')}]"
            ok, msg, skipped = _run_probe(check, solved)
            if skipped:
                report.warn(where, f"task '{task_id}': {msg}")
                n_skip += 1
                continue
            if not ok:
                report.error(where, f"task '{task_id}' FAILS with the reference solution: {msg}")
                continue
            if check.get("seedMustFail", True):
                ok2, msg2, _ = _run_probe(check, seed)
                if ok2:
                    report.error(where, f"task '{task_id}' PASSES on the seed workspace without a solution ({msg2}) - a check that always passes is worthless (set seedMustFail: false if intended)")
                    continue
            n_ok += 1
            print(f"probe ok   {label}: solution passes ({msg})" + ("" if check.get("seedMustFail", True) else "; seed probe skipped (seedMustFail: false)"))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"solutions: {len(probes)} probe(s), {n_ok} ok, {n_skip} skipped, {len(probes) - n_ok - n_skip} failed")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project_root", help="Checkout of the cads-zero firmware repo (or the seed workspace of a track)")
    ap.add_argument("--courses-dir", default=None, help="Directory holding the course packs")
    ap.add_argument("--elf", default=None, help="Path to cads-zero.elf")
    ap.add_argument("--nm", default=None, help="Path to arm-none-eabi-nm")
    ap.add_argument("--solutions", default=None, help="Reference-solution directory (mirrors PROJECT_ROOT); runs command/testSuite checks with and without it")
    ap.add_argument("--only", default=None, help="Validate only the course pack directory with this name")
    args = ap.parse_args()

    root = os.path.abspath(args.project_root)
    if not os.path.isdir(root):
        print(f"error: project root '{root}' is not a directory", file=sys.stderr)
        return 2

    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(here)
    courses_dir = args.courses_dir or os.path.join(repo, "courses")
    elf = args.elf or os.path.join(root, "build", "itsboard", "cads-zero.elf")
    nm = args.nm or "arm-none-eabi-nm"

    symbols = collect_symbols(nm, elf)
    report = Report()

    print(f"validate-courses  (front-matter parser: {PARSER})")
    print(f"  project root : {root}")
    print(f"  courses dir  : {courses_dir}")
    print(f"  elf          : {elf} {'[loaded]' if symbols is not None else '[unavailable]'}")
    if symbols is not None:
        print(f"  symbols read : {len(symbols)}")
    print()

    course_dirs = sorted(
        os.path.join(courses_dir, d)
        for d in os.listdir(courses_dir)
        if os.path.isdir(os.path.join(courses_dir, d)) and os.path.exists(os.path.join(courses_dir, d, "course.json"))
        and (args.only is None or d == args.only)
    )
    if args.only and not course_dirs:
        print(f"error: no course pack named '{args.only}' under {courses_dir}", file=sys.stderr)
        return 2
    probes = [] if args.solutions else None
    for cdir in course_dirs:
        validate_course(cdir, root, symbols, report, probes)
    if args.solutions:
        run_solution_probes(probes, root, os.path.abspath(args.solutions), report)

    for w in report.warnings:
        print(f"WARN  {w}")
    for e in report.errors:
        print(f"ERROR {e}")

    print()
    print(f"courses: {len(course_dirs)}  step-files: {report.steps}  checks: {report.checks}")
    print(f"warnings: {len(report.warnings)}  errors: {len(report.errors)}")
    if report.errors:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())

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

PyYAML is used when present; otherwise a self-contained parser for the
front-matter subset these packs use takes over, so the validator runs on a
bare Python 3 (stdlib only).

Usage:
    scripts/validate-courses.py PROJECT_ROOT [--courses-dir DIR] [--elf PATH] [--nm PATH]

PROJECT_ROOT is the checkout of the firmware (github.com/scimbe/cads-zero).
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys

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
        return "".join(buf).strip(), i

    def _strip_scalar(v: str):
        v = v.strip()
        if len(v) >= 2 and v[0] in "\"'" and v[-1] == v[0]:
            return v[1:-1]
        if re.fullmatch(r"-?\d+", v):
            return int(v)
        if v in ("true", "false"):
            return v == "true"
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
                # nested block
                val, idx = _parse_block(lines, idx + 1, indent + 1)
                obj[key] = val
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


def validate_course(course_dir, root, symbols, report):
    steps_dir = os.path.join(course_dir, "steps")
    course_json = os.path.join(course_dir, "course.json")
    name = os.path.basename(course_dir)
    if not os.path.exists(course_json):
        report.error(name, "missing course.json")
    if not os.path.isdir(steps_dir):
        report.error(name, "missing steps/ directory")
        return

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

            # tasks
            tasks = fm.get("tasks") or []
            if not (1 <= len(tasks) <= 3):
                report.warn(where, f"expected 1-3 tasks, found {len(tasks)}")
            for task in tasks:
                if not isinstance(task, dict):
                    report.error(where, f"malformed task entry: {task!r}")
                    continue
                check = task.get("check")
                if not isinstance(check, dict):
                    report.error(where, f"task '{task.get('id')}' has no check map")
                    continue
                report.checks += 1
                ctype = check.get("type")
                if ctype not in CHECK_TYPES:
                    report.error(where, f"task '{task.get('id')}' check type '{ctype}' unknown")
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

    # Only enforce full checks once (avoid double-counting de/en): dedupe handled
    # by iterating both, which is intentional - both files must be schema-valid.


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project_root", help="Checkout of the cads-zero firmware repo")
    ap.add_argument("--courses-dir", default=None, help="Directory holding the course packs")
    ap.add_argument("--elf", default=None, help="Path to cads-zero.elf")
    ap.add_argument("--nm", default=None, help="Path to arm-none-eabi-nm")
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
    )
    for cdir in course_dirs:
        validate_course(cdir, root, symbols, report)

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

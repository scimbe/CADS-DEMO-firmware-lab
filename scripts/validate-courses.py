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
  8. SPEC A9.1: every operating instruction sits in a `::: do` block with
     exactly one action, an `expect:` and a `recover:` line, and names a task,
     command or palette entry that really exists (in a check of the course, in
     `.vscode/tasks.json`, or in the palette list of the shipped extensions).
     Rule 4 - a call to action outside such a block - is a warning until the
     course packs have been converted.
 10. Language: a front-matter field kept as a plain string (`rubric`, `title`,
     a task's `title`/`description`) carries the language of its own file, and
     nothing structural can notice when it does not. A function-word probe finds
     a field written entirely in the wrong language and stays silent on short or
     jargon-heavy text. A warning until the two language packs are converted;
     `--language-errors` (or LANGUAGE_MISMATCH_IS_ERROR) makes it an error.
 11. `--solutions DIR`: every `testSuite`/`command` check is executed twice in a
     scratch copy of PROJECT_ROOT - without the solution it must FAIL, with DIR
     overlaid it must PASS. Checks nested in `predict.then`, `all` or `any` are
     probed too, and the composite's own semantics decide the verdict (`all`
     needs every child, `any` needs one; the seed side is the mirror of that). DIR may mirror the project root directly, or
     hold one directory per step id (SPEC v1.1 A4), in which case every step
     directory is overlaid. A check that is meant to pass on the untouched seed -
     a toolchain probe such as `node --version` - declares `seedMustFail: false`.
     Skipped with a note when the toolchain binary the command runs (leading
     `VAR=value` assignments skipped) is not installed.
     A check that legitimately passes on the seed opts out with
     `seedMustFail: false`.

Front matter is parsed by the extension's own parser (via Node and
scripts/read-front-matter.mjs), never by a second implementation: the validator
must refuse exactly what the runtime refuses. That needs Node 22.18+ and one
`npm ci` in extensions/cads-tutor; without it the run stops rather than guess.

Usage:
    scripts/validate-courses.py PROJECT_ROOT [--courses-dir DIR] [--elf PATH] [--nm PATH]
                                [--solutions DIR] [--only COURSE]

PROJECT_ROOT is the default project directory. Each pack that declares
`project.root` in its course.json is resolved against THAT directory instead,
looked up next to PROJECT_ROOT and inside the repo, so one run without --only
checks the firmware, Rust and JavaScript packs each against its own project.
A pack without `project.root` uses PROJECT_ROOT unchanged.
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
# There is no parser here. Two parsers meant two truths, and both cracks cost us
# real time: a step titled `CaDS: RAM budget` without quotes was invalid YAML to
# the runtime - which dropped the file and with it the whole course - while this
# script reported PASS; and a misconception pattern like "a\s*b" is not a legal
# double-quoted YAML scalar at all, which a hand-rolled parser happily accepts as
# a literal backslash-s. So the front matter is read by the extension's own
# parseFrontMatter, through scripts/read-front-matter.mjs, and whatever the
# runtime would refuse to load is refused here too, with the runtime's wording.

FRONT_MATTER_HELPER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "read-front-matter.mjs"
)
PARSER = "extensions/cads-tutor/src/frontmatter.ts (via node)"

# Per absolute path: ("ok", front matter, body) or ("error", message, None).
_FM_CACHE = {}
_FM_LOADED_DIRS = set()


class FrontMatterUnavailable(RuntimeError):
    """The helper could not run at all - a validator that cannot parse the way
    the runtime parses would only be guessing, so the run stops instead."""


def _run_front_matter_helper(paths):
    try:
        proc = subprocess.run(
            ["node", FRONT_MATTER_HELPER],
            input=json.dumps(paths),
            capture_output=True,
            text=True,
            timeout=300,
        )
    except FileNotFoundError as err:
        raise FrontMatterUnavailable(
            "node is not on PATH. The validator reads front matter with the "
            "extension's own parser; install Node 22.18 or newer."
        ) from err
    except subprocess.TimeoutExpired as err:
        raise FrontMatterUnavailable("reading front matter timed out") from err
    if proc.returncode != 0:
        raise FrontMatterUnavailable((proc.stderr or "").strip() or f"node exited with {proc.returncode}")
    try:
        return json.loads(proc.stdout)
    except ValueError as err:
        raise FrontMatterUnavailable(f"unreadable helper output: {err}") from err


def preload_front_matter(paths):
    """Parses a whole directory of step files in one node call."""
    todo = [p for p in paths if os.path.abspath(p) not in _FM_CACHE]
    if not todo:
        return
    for entry in _run_front_matter_helper([os.path.abspath(p) for p in todo]):
        key = os.path.abspath(entry["file"])
        if entry.get("ok"):
            _FM_CACHE[key] = ("ok", entry.get("data"), entry.get("body", ""))
        else:
            _FM_CACHE[key] = ("error", entry.get("error", "unknown parse failure"), None)


def load_step(path):
    """(front matter, body, error). `error` is set exactly when the runtime
    would refuse the file; front matter is None when there is none at all."""
    key = os.path.abspath(path)
    if key not in _FM_CACHE:
        preload_front_matter([path])
    kind, a, b = _FM_CACHE[key]
    if kind == "error":
        return None, None, a
    if a is None:
        return None, b, None
    return a, b, None



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

# --- runtime cross-check ----------------------------------------------------
# A pack may legally use a check type from SPEC addendum v1.1 that the shipped
# runtime has not implemented yet - but today that is not a soft gap: schema.ts
# fails the check, loader.ts skips the file, and the student silently gets a
# SHORTER COURSE with no error anywhere. That cost a whole day once. So read the
# runtime's own list and warn per check, rather than keeping a second list here
# that would drift. Warning, not error: the gap belongs to the runtime, and the
# warnings disappear by themselves once it catches up.
RUNTIME_TYPES_TS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "extensions", "cads-tutor", "src", "types.ts",
)
_RUNTIME_TYPES = None


def runtime_check_types(path=RUNTIME_TYPES_TS):
    """Parse CHECK_TYPES out of the runtime's types.ts. None if unreadable."""
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError:
        return None
    m = re.search(r"CHECK_TYPES\s*:\s*readonly\s+CheckType\[\]\s*=\s*\[(.*?)\]", text, re.DOTALL)
    if not m:
        return None
    return set(re.findall(r'"([A-Za-z]+)"', m.group(1))) or None


# --- SPEC A9.1: the `::: do` instruction block -------------------------------
# Bedienanweisungen als Fließtext werden gelesen, gekürzt und falsch abgetippt.
# Drei Kurse sind daran gescheitert: eine Paletteneingabe ohne führendes ">", ein
# Kommando im falschen Ordner, ein Taskname, den es nur im Text gab. Der Block
# macht jede der drei Fehlerklassen maschinell entscheidbar.

DO_OPEN_RE = re.compile(r"^:::[ \t]+do(?:[ \t]+(.*))?$")
DO_CLOSE_RE = re.compile(r"^:::[ \t]*$")
DO_ATTR_RE = re.compile(r'([a-zA-Z]+)[ \t]*=[ \t]*(?:"([^"]*)"|(\S+))')
DO_MARK_RE = re.compile(r"^>[ \t]*(expect|recover):[ \t]*(.*)$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
DO_ACTION_KEYS = ("task", "command", "palette", "file", "keys")
DO_MODIFIER_KEYS = ("cwd", "line")

# Palette entries VS Code itself provides. A course may legitimately send a
# student to one of these; everything else has to come from the packs or the
# extensions, so an invented route is an error rather than a matter of taste.
BUILTIN_PALETTE = {
    "> Tasks: Run Task",
    "> Tasks: Rerun Last Task",
    "> Tasks: Terminate Task",
    "> Tasks: Configure Task",
    "> Terminal: Create New Terminal",
    "> View: Toggle Terminal",
    "> View: Toggle Panel",
    "> File: Open File...",
    "> File: Save",
    "> Developer: Reload Window",
    "> Preferences: Open Settings (UI)",
    "> Debug: Start Debugging",
}

# Rule 4 fires on a call to action outside a block. Verbs only, in both course
# languages; the route name has to be present too, so "Öffne die Datei" alone is
# not flagged - only "Öffne ... CaDS: Build".
CALL_TO_ACTION_RE = re.compile(
    r"\b(f[üu]hre|[öo]ffne|dr[üu]cke|starte|tippe|klicke|w[äa]hle|klappe|gib|wechsle|"
    r"run|open|press|start|type|click|select|choose|enter|switch)\b",
    re.IGNORECASE,
)


def parse_do_attributes(attr_text):
    """Reads a `::: do` opening line. Returns (attrs, problems)."""
    problems = []
    attrs = {}
    for m in DO_ATTR_RE.finditer(attr_text.strip()):
        key = m.group(1)
        value = m.group(2) if m.group(2) is not None else m.group(3)
        if key in attrs:
            problems.append(f'attribute "{key}" given twice')
        attrs[key] = value
    for key in attrs:
        if key not in DO_ACTION_KEYS and key not in DO_MODIFIER_KEYS:
            problems.append(f'unknown attribute "{key}"')
    present = [k for k in DO_ACTION_KEYS if k in attrs]
    if not present:
        problems.append(f"no action attribute; one of {', '.join(DO_ACTION_KEYS)} is required")
    elif len(present) > 1:
        problems.append(f"{' and '.join(present)} in one block; A9.1 allows one action per block")
    if "cwd" in attrs and "command" not in attrs:
        problems.append("cwd= only applies to command=")
    if "line" in attrs and "file" not in attrs:
        problems.append("line= only applies to file=")
    for key in present:
        if not attrs[key].strip():
            problems.append(f"{key}= is empty")
    if "palette" in attrs and not attrs["palette"].startswith(">"):
        problems.append(
            f'palette "{attrs["palette"]}" must carry the leading ">"; without it the palette '
            "searches file names and answers \"no matching results\""
        )
    if "cwd" in attrs and (attrs["cwd"].startswith("/") or ".." in attrs["cwd"].split("/")):
        problems.append(f'cwd "{attrs["cwd"]}" must stay inside the project')
    if "line" in attrs and not (attrs["line"].isdigit() and int(attrs["line"]) >= 1):
        problems.append(f'line "{attrs["line"]}" is not a positive line number')
    return attrs, problems


def parse_do_blocks(body):
    """Every `::: do` block in a step body, and the lines that lie outside them.

    Returns (blocks, outside_lines). A block is a dict with attrs, problems,
    instruction, expect, recover and the 1-based line number of its opening.
    Fenced code is treated as outside-but-inert: it is dropped from
    outside_lines, so a code sample never trips rule 4.
    """
    blocks = []
    outside = []
    lines = body.replace("\r\n", "\n").split("\n")
    i = 0
    in_fence = False
    while i < len(lines):
        line = lines[i]
        if FENCE_RE.match(line):
            in_fence = not in_fence
            i += 1
            continue
        if in_fence:
            i += 1
            continue
        m = DO_OPEN_RE.match(line.strip())
        if not m:
            outside.append((i + 1, line))
            i += 1
            continue
        attrs, problems = parse_do_attributes(m.group(1) or "")
        body_lines = []
        j = i + 1
        closed = False
        while j < len(lines):
            if DO_CLOSE_RE.match(lines[j].strip()):
                closed = True
                break
            body_lines.append(lines[j])
            j += 1
        if not closed:
            problems.append("block is not closed by `:::`")
        instruction, expect, recover = [], [], []
        sink = None
        for raw in body_lines:
            stripped = raw.strip()
            marked = DO_MARK_RE.match(stripped)
            if marked:
                sink = expect if marked.group(1) == "expect" else recover
                if sink:
                    problems.append(f'"{marked.group(1)}:" given twice')
                sink.append(marked.group(2))
                continue
            if stripped.startswith(">") and sink is not None:
                sink.append(stripped[1:].strip())
                continue
            sink = None
            instruction.append(raw)
        blocks.append({
            "line": i + 1,
            "attrs": attrs,
            "problems": problems,
            "instruction": "\n".join(instruction).strip(),
            "expect": " ".join(expect).strip(),
            "recover": " ".join(recover).strip(),
        })
        i = j + 1 if closed else j
    return blocks, outside


def _words(text):
    return [w for w in re.findall(r"[\w]+", text.lower()) if len(w) > 2]


def _same_sentence(a, b):
    """True when recover: only repeats expect: instead of saying what to do."""
    na, nb = " ".join(_words(a)), " ".join(_words(b))
    if not na or not nb:
        return False
    if na == nb:
        return True
    sa, sb = set(na.split()), set(nb.split())
    return len(sa & sb) / max(1, min(len(sa), len(sb))) >= 0.9


def palette_entries(repo):
    """Palette entries the shipped extensions contribute, as the student sees them."""
    entries = set(BUILTIN_PALETTE)
    ext_dir = os.path.join(repo, "extensions")
    if not os.path.isdir(ext_dir):
        return entries
    for ext in sorted(os.listdir(ext_dir)):
        pkg = os.path.join(ext_dir, ext, "package.json")
        if not os.path.exists(pkg):
            continue
        try:
            with open(pkg, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue
        nls = {}
        for nls_name in ("package.nls.json", "package.nls.de.json"):
            path = os.path.join(ext_dir, ext, nls_name)
            if os.path.exists(path):
                try:
                    with open(path, encoding="utf-8") as fh:
                        nls.setdefault(nls_name, json.load(fh))
                except (OSError, ValueError):
                    pass
        for cmd in (data.get("contributes") or {}).get("commands") or []:
            title = cmd.get("title")
            category = cmd.get("category")
            titles = []
            m = re.fullmatch(r"%(.+)%", title or "")
            if m:
                titles = [d[m.group(1)] for d in nls.values() if m.group(1) in d]
            elif title:
                titles = [title]
            for t in titles:
                entries.add(f"> {t}")
                if category:
                    entries.add(f"> {category}: {t}")
    return entries


def tasks_json_labels(root):
    """Task labels from a project's .vscode/tasks.json (JSONC: comments stripped)."""
    path = os.path.join(root, ".vscode", "tasks.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError:
        return None
    text = re.sub(r"^\s*//.*$", "", text, flags=re.M)
    try:
        data = json.loads(text)
    except ValueError:
        return None
    return {t.get("label") for t in (data.get("tasks") or []) if isinstance(t, dict) and t.get("label")}


def collect_routes(check, tasks, commands):
    """Task labels and shell commands a check actually performs."""
    ctype = check.get("type")
    if ctype in ("task", "build") and check.get("label"):
        tasks.add(check["label"])
    if ctype == "command" and check.get("command"):
        commands.add(check["command"])
    if ctype == "testSuite":
        cmd = _suite_command(check)
        if cmd:
            commands.add(cmd)
    if ctype in ("all", "any"):
        for sub in check.get("checks") or []:
            if isinstance(sub, dict):
                collect_routes(sub, tasks, commands)
    if ctype == "predict" and isinstance(check.get("then"), dict):
        collect_routes(check["then"], tasks, commands)


def validate_do_blocks(where, body, root, known, report):
    """The four A9.1 rules. Rule 4 is a warning until the packs are converted."""
    blocks, outside = parse_do_blocks(body)
    report.do_blocks += len(blocks)
    for block in blocks:
        at = f"{where}:{block['line']}"
        for problem in block["problems"]:
            report.error(at, f"::: do - {problem}")
        if not block["instruction"]:
            report.error(at, "::: do - no instruction; the block needs one imperative sentence")
        # Rule 2: both lines are mandatory, and recover: has to say something new.
        if not block["expect"]:
            report.error(at, "::: do - no `> expect:` line; a route without an expected result cannot be checked by the student")
        if not block["recover"]:
            report.error(at, "::: do - no `> recover:` line; say what to do when the expected result does not appear")
        if block["expect"] and block["recover"] and _same_sentence(block["expect"], block["recover"]):
            report.error(at, "::: do - `recover:` only repeats `expect:` instead of naming a way back")

        # Rule 3: a route nothing defines is an error, not a matter of style (A8.3).
        attrs = block["attrs"]
        if "task" in attrs and attrs["task"] and attrs["task"] not in known["tasks"]:
            report.error(at, f'::: do - task "{attrs["task"]}" is in no check of this course and in no .vscode/tasks.json')
        if "command" in attrs and attrs["command"] and attrs["command"] not in known["commands"]:
            report.error(at, f'::: do - command "{attrs["command"]}" is run by no check of this course')
        if "palette" in attrs and attrs["palette"] and attrs["palette"] not in known["palette"]:
            report.error(at, f'::: do - palette entry "{attrs["palette"]}" is contributed by no extension of this repository')
        if "file" in attrs and attrs["file"] and not repo_path_exists(root, attrs["file"]):
            report.error(at, f'::: do - file "{attrs["file"]}" does not exist under the project root')

    # Rule 4: outside a block, no call to action that names a route. Warning for
    # now: it fires on every course written before A9.1, and turning it into an
    # error would block the very commits that fix it.
    named = sorted(known["tasks"] | known["commands"] | {e[2:] for e in known["palette"]}, key=len, reverse=True)
    for line_no, line in outside:
        if not CALL_TO_ACTION_RE.search(line):
            continue
        hit = next((n for n in named if n and n in line), None)
        if hit:
            report.warn(f"{where}:{line_no}", f'operating instruction outside a `::: do` block names "{hit}" (A9.1 rule 4)')


# --- language probe ---------------------------------------------------------
# `rubric` is a plain string, not a Localized map, so no structural check could
# ever notice that all 30 Rust and all 40 JavaScript rubrics in the .de.md files
# were English. That is not cosmetic: without a language model - our normal mode
# today - the tutor shows the rubric as the student's self-check, so German
# students were handed an English marking guide.
#
# A function-word probe is enough. It only has to catch "written entirely in the
# wrong language", and it must stay quiet on short or jargon-heavy text rather
# than guess: a false accusation here costs more than a missed one, because it
# trains authors to ignore the validator. Both word lists therefore hold only
# words that belong to one language alone - "in", "an", "man", "war", "hat",
# "die", "so", "also" and "am" are all common in both and are left out.

# Flip to True once courses/rust-foundations and courses/javascript-foundations
# carry German rubrics in their .de.md files; until then this would break every
# other stream's run. `--language-errors` enforces it per run in the meantime.
LANGUAGE_MISMATCH_IS_ERROR = False

DE_MARKERS = set("""
der das den dem des ein eine einen einem einer und oder nicht ist sind wird werden wurde wurden
hast haben du dich dir sich mit für fuer auf aus bei nach von vom zum zur dass wenn dann noch schon
auch nur wie wo welche welcher welches diese dieser dieses im um als aber sondern kein keine keinen
sie wir ihn ihnen seine ihre über ueber unter zwischen ohne durch gegen jede jeder jedes alle allen
etwas nichts mehr weniger zuerst danach deshalb damit weil steht stehen sagt nennt zeigt liest
schreibt gibt macht muss soll kann können koennen darf sein ihrer eines
""".split())

EN_MARKERS = set("""
the and or not is are were you your yours its with for from that if then this these those what
which where how does done have had will would should could must there their they them she our but
because than more less first after before each every some any nothing something into about when
while both other another same such only also just still very much many few most least
""".split())

LANG_WORD_RE = re.compile(r"[A-Za-zÄÖÜäöüß]+")
LANG_MIN_WORDS = 12       # below this a text carries no reliable signal
LANG_MIN_MARKERS = 4      # jargon-heavy text with few function words stays unjudged
LANG_WRONG_RATIO = 3      # the wrong language has to dominate, not merely appear


def language_mismatch(text, expected):
    """The language actually written, when it is plainly not `expected`; else None."""
    words = [w.lower() for w in LANG_WORD_RE.findall(text)]
    if len(words) < LANG_MIN_WORDS:
        return None
    de = sum(1 for w in words if w in DE_MARKERS)
    en = sum(1 for w in words if w in EN_MARKERS)
    if de + en < LANG_MIN_MARKERS:
        return None
    right, wrong = (de, en) if expected == "de" else (en, de)
    if wrong >= LANG_MIN_MARKERS and wrong >= LANG_WRONG_RATIO * max(right, 1):
        return "en" if expected == "de" else "de"
    return None


def free_text_fields(fm):
    """Front-matter fields kept as a plain string, so they carry the file's own
    language rather than a de/en pair. Localized maps are checked structurally
    elsewhere and are not the problem here."""
    if isinstance(fm.get("title"), str):
        yield "title", fm["title"]
    for task in fm.get("tasks") or []:
        if not isinstance(task, dict):
            continue
        tid = task.get("id")
        for key in ("title", "description"):
            if isinstance(task.get(key), str):
                yield f"tasks[{tid}].{key}", task[key]
        check = task.get("check")
        if isinstance(check, dict) and isinstance(check.get("rubric"), str):
            yield f"tasks[{tid}].rubric", check["rubric"]


def validate_language(where, fm, lang, report, as_error):
    for name, text in free_text_fields(fm):
        other = language_mismatch(text, lang)
        if other is None:
            continue
        msg = (
            f"{name} is written in {other}, but this is the .{lang} step file. "
            "Without a language model the tutor shows the rubric to the student as a self-check, "
            "so it has to be in the language of the course."
        )
        (report.error if as_error else report.warn)(where, msg)


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.steps = 0
        self.checks = 0
        self.do_blocks = 0

    def error(self, where, msg):
        self.errors.append(f"{where}: {msg}")

    def warn(self, where, msg):
        self.warnings.append(f"{where}: {msg}")


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
    if _RUNTIME_TYPES is not None and ctype not in _RUNTIME_TYPES:
        report.warn(
            where,
            f"{label} uses check type '{ctype}', which "
            f"extensions/cads-tutor/src/types.ts does not list - the runtime "
            f"will DROP this whole step until it implements the type",
        )
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



def resolve_project_root(course_dir, default_root, repo):
    """The directory a pack's `file`/`doc`/`elf` paths are relative to.

    Several packs with different projects now live in one repo (firmware, Rust,
    JavaScript). Resolving them all against one directory made every path of one
    pack a spurious error in another's project, so a single run without --only
    could not be trusted. Each pack is therefore resolved against the directory
    named in its own course.json `project.root`, searched next to the given root
    and inside the repo. The argument stays the fallback, so a pack without its
    own setting behaves exactly as before.

    Returns (root, note) where note explains the choice for the log.
    """
    course_json = os.path.join(course_dir, "course.json")
    declared = None
    try:
        with open(course_json, encoding="utf-8") as fh:
            declared = (json.load(fh).get("project") or {}).get("root")
    except (OSError, ValueError):
        return default_root, "course.json unreadable; using the given root"
    if not declared or declared == ".":
        return default_root, "no project.root; using the given root"
    declared = declared.strip("/")
    # The given root may already BE that project (the usual firmware invocation).
    if os.path.basename(os.path.normpath(default_root)) == declared:
        return default_root, f"project.root '{declared}' is the given root"
    # Searched next to the given root, inside the pack's OWN repo (the parent of
    # its courses directory, so any repo layout works, not just this one), and
    # inside the validator's repo.
    pack_repo = os.path.dirname(os.path.dirname(os.path.normpath(course_dir)))
    for candidate in (
        os.path.join(default_root, declared),
        os.path.join(pack_repo, declared),
        os.path.join(pack_repo, "workspaces", declared),
        os.path.join(repo, declared),
        os.path.join(repo, "workspaces", declared),
        os.path.join(os.path.dirname(os.path.normpath(default_root)), declared),
    ):
        if os.path.isdir(candidate):
            return os.path.abspath(candidate), f"project.root '{declared}'"
    return default_root, f"project.root '{declared}' not found; falling back to the given root"


def validate_course(course_dir, root, symbols, report, probes=None, language_errors=False):
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

    # Steps that own a `question` task (valid recallFrom targets), and - for
    # A9.1 rule 3 - every route the course itself defines. Both languages are
    # read: a `::: do` block may name a route that only the German variant's
    # checks declare, and that route is just as real.
    recall_sources = set()
    known_tasks, known_commands = set(), set()
    # One node call for the whole directory rather than one per file.
    preload_front_matter([
        os.path.join(steps_dir, f"{sid}.{lang}.md")
        for sid in sorted(all_ids)
        for lang in ("en", "de")
        if os.path.exists(os.path.join(steps_dir, f"{sid}.{lang}.md"))
    ])
    for sid in sorted(all_ids):
        for lang in ("en", "de"):
            fpath = os.path.join(steps_dir, f"{sid}.{lang}.md")
            if not os.path.exists(fpath):
                continue
            fm, _, _ = load_step(fpath)
            for task in (fm or {}).get("tasks") or []:
                if not isinstance(task, dict) or not isinstance(task.get("check"), dict):
                    continue
                if lang == "en" and task["check"].get("type") == "question":
                    recall_sources.add(sid)
                collect_routes(task["check"], known_tasks, known_commands)
    from_tasks_json = tasks_json_labels(root)
    if from_tasks_json is None:
        report.warn(name, "no .vscode/tasks.json under the project root; `::: do task=` is checked against the course's own checks only")
    else:
        known_tasks |= from_tasks_json
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    known = {"tasks": known_tasks, "commands": known_commands, "palette": palette_entries(repo_dir)}

    # Validate each language file.
    for sid in sorted(all_ids):
        for lang in ("en", "de"):
            fpath = os.path.join(steps_dir, f"{sid}.{lang}.md")
            if not os.path.exists(fpath):
                continue
            where = f"{name}/{sid}.{lang}"
            fm, body, parse_error = load_step(fpath)
            if parse_error:
                # The runtime would drop this file, and with it every step that
                # depends on it - so it is an error here, in the runtime's own
                # words, rather than a PASS that lasts until someone opens VS Code.
                report.error(where, parse_error)
                continue
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
                if probes is not None and lang == "en" and probe_leaves(check):
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
            # A9.1: instruction blocks, and the call to action that escaped one.
            validate_do_blocks(where, body, root, known, report)
            # A plain-string field carries the language of its own file, and
            # nothing structural can notice when it does not.
            validate_language(where, fm, lang, report, language_errors)

            if lang == "en" and listed_steps and sid not in listed_steps:
                report.warn(where, "step file is not listed in any module of course.json")

    # Only enforce full checks once (avoid double-counting de/en): dedupe handled
    # by iterating both, which is intentional - both files must be schema-valid.


# --- solution probes (--solutions) -----------------------------------------

_TAP_RE = re.compile(r"^\s*(not ok|ok)\b\s*(\d+)?\s*-?\s*(.*?)\s*(#.*)?$")
# A #[should_panic] test prints "test <name> - should panic ... ok"; without the
# optional group the line is dropped and expectPass reports the test as missing.
_CARGO_RE = re.compile(r"^test\s+(\S+)(?:\s+-\s+should\s+panic)?\s+\.\.\.\s+(ok|FAILED|ignored)\b")


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
                out.append({"name": m.group(1), "path": m.group(1), "status": status, "leaf": True, "file": False})
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
            # node --test reports a whole test FILE as failed when it cannot be
            # loaded; its named tests then never run.
            "file": bool(re.search(r"[\\/]", name) and re.search(r"\.(?:test\.)?[cm]?[jt]s$", name)),
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
    leaves = [t for t in tests if t["leaf"] and not t.get("file")]
    n_pass = sum(1 for t in leaves if t["status"] == "passed")
    problems = []
    broken = [t["name"] for t in tests if t.get("file") and t["status"] == "failed"]
    for name in check.get("expectPass") or []:
        t = idx.get(name)
        if t is None:
            if broken:
                problems.append(
                    f"expected test '{name}' to pass, but it never ran: "
                    + ", ".join(broken[:3])
                    + " could not be loaded (check the error above - a syntax error or a missing export stops the whole file)"
                )
            else:
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


# The negative probe used to look at the top level of a check only, so a check
# that moved into `predict.then` or into an `all` silently stopped being probed -
# which is how a pack went from 38 probes to 37 the day a confirmation task
# became a prediction. Across the four packs, 45 checks were invisible that way.
#
# Descending is not simply "probe every leaf": `all` passes only if every child
# passes, `any` if one does, and the seed side is the mirror of that. So the
# leaves are run and the composite verdict is folded back up the tree, and the
# paths below (`two-mut/then`, `substance/all[1]`) say which leaf was run.


def probe_leaves(check, path=""):
    """Every runnable command/testSuite in a check tree, with its path."""
    ctype = check.get("type")
    if ctype in ("command", "testSuite"):
        return [(path, check)]
    if ctype == "predict" and isinstance(check.get("then"), dict):
        return probe_leaves(check["then"], f"{path}/then" if path else "then")
    if ctype in ("all", "any"):
        out = []
        for i, sub in enumerate(check.get("checks") or []):
            if isinstance(sub, dict):
                child = f"{ctype}[{i}]"
                out += probe_leaves(sub, f"{path}/{child}" if path else child)
        return out
    return []


def fold_probe(check, results, path=""):
    """Composite verdict from the leaf results: True, False, or None when the
    tree holds something this script cannot run (a fileMatches inside an `all`,
    a skipped toolchain) and the outcome therefore is not decidable."""
    ctype = check.get("type")
    if ctype in ("command", "testSuite"):
        return results.get(path)
    if ctype == "predict" and isinstance(check.get("then"), dict):
        return fold_probe(check["then"], results, f"{path}/then" if path else "then")
    if ctype in ("all", "any"):
        values = []
        for i, sub in enumerate(check.get("checks") or []):
            if not isinstance(sub, dict):
                continue
            child = f"{ctype}[{i}]"
            values.append(fold_probe(sub, results, f"{path}/{child}" if path else child))
        if not values:
            return None
        if ctype == "all":
            # One failing child sinks the whole thing, whatever the rest does.
            if any(v is False for v in values):
                return False
            return None if any(v is None for v in values) else True
        if any(v is True for v in values):
            return True
        return None if any(v is None for v in values) else False
    # question, manual, fileMatches, board … - nothing this script can run.
    return None


def _probe_label(task_id, path):
    return f"{task_id}/{path}" if path else task_id


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
    n_ok = n_skip = n_leaves = 0
    try:
        for where, task_id, check in probes:
            leaves = probe_leaves(check)
            n_leaves += len(leaves)
            seed_must_fail = check.get("seedMustFail", True)

            # Run every leaf against the solved copy first; a leaf whose
            # toolchain is missing stays unknown rather than counting as failed.
            solved_results, messages, skipped_msgs = {}, {}, []
            for path, leaf in leaves:
                ok, msg, skipped = _run_probe(leaf, solved)
                solved_results[path] = None if skipped else ok
                messages[path] = msg
                if skipped:
                    skipped_msgs.append(f"{_probe_label(task_id, path)}: {msg}")

            verdict = fold_probe(check, solved_results)
            if verdict is None:
                for msg in skipped_msgs or [f"{_probe_label(task_id, '')}: nothing in this check can be probed"]:
                    report.warn(where, msg)
                n_skip += 1
                continue
            if verdict is False:
                failed = ", ".join(
                    f"{_probe_label(task_id, path)} [{leaf.get('type')}]: {messages[path]}"
                    for path, leaf in leaves
                    if solved_results.get(path) is False
                )
                report.error(where, f"task '{task_id}' FAILS with the reference solution: {failed}")
                continue

            if seed_must_fail:
                seed_results = {}
                for path, leaf in leaves:
                    if leaf.get("seedMustFail") is False or solved_results.get(path) is None:
                        seed_results[path] = None
                        continue
                    ok2, msg2, skipped2 = _run_probe(leaf, seed)
                    seed_results[path] = None if skipped2 else ok2
                    messages[path] = msg2
                seed_verdict = fold_probe(check, seed_results)
                if seed_verdict is True:
                    passing = ", ".join(
                        f"{_probe_label(task_id, path)} [{leaf.get('type')}]: {messages[path]}"
                        for path, leaf in leaves
                        if seed_results.get(path) is True
                    )
                    report.error(
                        where,
                        f"task '{task_id}' PASSES on the seed workspace without a solution "
                        f"({passing}) - a check that always passes is worthless "
                        "(set seedMustFail: false if intended)",
                    )
                    continue

            n_ok += 1
            paths = ", ".join(_probe_label(task_id, path) for path, _ in leaves)
            print(
                f"probe ok   {where} [{check.get('type')}] {paths}: solution passes"
                + ("" if seed_must_fail else "; seed probe skipped (seedMustFail: false)")
            )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(
        f"solutions: {len(probes)} probe(s) over {n_leaves} check(s), "
        f"{n_ok} ok, {n_skip} skipped, {len(probes) - n_ok - n_skip} failed"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project_root", help="Default project directory; a pack with its own project.root is resolved against that instead")
    ap.add_argument("--courses-dir", default=None, help="Directory holding the course packs")
    ap.add_argument("--elf", default=None, help="Path to cads-zero.elf")
    ap.add_argument("--nm", default=None, help="Path to arm-none-eabi-nm")
    ap.add_argument("--solutions", default=None, help="Reference-solution directory (mirrors PROJECT_ROOT); runs command/testSuite checks with and without it")
    ap.add_argument("--only", default=None, help="Validate only the course pack directory with this name")
    ap.add_argument("--no-runtime-check", action="store_true", help="Skip the cross-check of check types against extensions/cads-tutor/src/types.ts")
    ap.add_argument("--language-errors", action="store_true", help="Report a free-text field written in the wrong language as an error rather than a warning")
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
    global _RUNTIME_TYPES
    _RUNTIME_TYPES = None if args.no_runtime_check else runtime_check_types()
    if _RUNTIME_TYPES is None:
        print("  runtime types: [not checked]")
    else:
        print(f"  runtime types: {len(_RUNTIME_TYPES)} from extensions/cads-tutor/src/types.ts")
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
    language_errors = args.language_errors or LANGUAGE_MISMATCH_IS_ERROR
    probes = [] if args.solutions else None
    # Symbols are per project: only the pack whose project root actually holds the
    # ELF gets them, so a `symbolInElf` check is never judged against another
    # project's binary.
    symbol_cache = {root: symbols}
    for cdir in course_dirs:
        croot, note = resolve_project_root(cdir, root, repo)
        print(f"  {os.path.basename(cdir):28} -> {croot}  ({note})")
        if croot not in symbol_cache:
            candidate_elf = os.path.join(croot, "build", "itsboard", "cads-zero.elf")
            symbol_cache[croot] = collect_symbols(nm, candidate_elf) if os.path.exists(candidate_elf) else None
        validate_course(cdir, croot, symbol_cache[croot], report, probes, language_errors)
    print()
    if args.solutions:
        # --solutions applies to a single track, so it uses the root given on the
        # command line rather than a per-pack one.
        run_solution_probes(probes, root, os.path.abspath(args.solutions), report)

    for w in report.warnings:
        print(f"WARN  {w}")
    for e in report.errors:
        print(f"ERROR {e}")

    print()
    print(f"courses: {len(course_dirs)}  step-files: {report.steps}  checks: {report.checks}  do-blocks: {report.do_blocks}")
    print(f"warnings: {len(report.warnings)}  errors: {len(report.errors)}")
    if report.errors:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except FrontMatterUnavailable as err:
        # Falling back to a parser of our own is exactly the bug this replaced:
        # it would answer differently from the tutor and call it PASS.
        print(f"error: cannot read front matter the way the tutor does: {err}", file=sys.stderr)
        sys.exit(2)

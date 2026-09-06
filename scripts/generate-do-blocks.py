#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""Regenerates the operating section of every step in a pack from that step's
own checks - SPEC A9.1 blocks, produced rather than transcribed (A8.3).

WHY A GENERATOR AND NOT A TYPIST
--------------------------------
A9.1 rule 3 says a `task=`, `command=` or `palette=` must occur verbatim in a
check of the course, in tasks.json or in the extension's command list. Typing
those 136 strings by hand makes the rule something a reviewer has to enforce;
taking them from the check makes it hold by construction. The same goes for
`expect:`: it is derived from what the check actually asserts - the test count
from `expectPass`, the exit code, the expected stdout or stderr - so a course
cannot promise an outcome its own check does not require.

THREE THINGS THIS HAD TO LEARN, EACH OF WHICH IT GOT WRONG FIRST
---------------------------------------------------------------
They are written down because they are exactly the mistakes a human makes while
transcribing, and each produced a plausible sentence that was false:

1. `\n` inside an expected stdout must be split off BEFORE the pattern is
   unescaped. Unescape first and the escape collapses into a stray n: the step
   then promises output reading `words: 24nunique: 12n  7  then`, which no
   student will ever see. See `stdout_raw`.
2. A regex must be shown as a regex. `cargo \d+\.\d+\.\d+` rendered as
   literal output claims the check looks for text that it does not - a false
   statement about the course's own check, which R3.4 rates worse than a weak
   check. See `pattern_or_literal`.
3. An expectation containing a backtick needs double-backtick fencing, or the
   inline code ends early and the markdown breaks. It happens with
   `` the type `str` cannot be indexed by `{integer}` ``. See `code`.

A fourth, learned after the fact and not fixable here: instruction blocks cost
words. R1.4's ceiling is measured on prose, and m0-02 would have gone from 915
to 929 German words. Check the count after running this, and move whatever the
new expect/recover lines now carry out of the prose.

USE
---
Run from the repository root. It rewrites both language files of every step in
the pack, replacing everything from the operating heading to the end of file:

    python3 scripts/generate-do-blocks.py            # rust-foundations
    python3 scripts/generate-do-blocks.py <pack>

Only `command=` and `palette=` blocks are generated, because those are what a
check can supply. A pack that drives VS Code tasks needs its `task=` blocks
written by hand against tasks.json. The prose around the blocks - the two
constants below - is pack-specific and is the part to edit when adopting this
for another course.
"""
import importlib.util, io, glob, os, re, sys
spec = importlib.util.spec_from_file_location("v", "scripts/validate-courses.py")
V = importlib.util.module_from_spec(spec); spec.loader.exec_module(V)
PACK = sys.argv[1] if len(sys.argv) > 1 else "rust-foundations"
D = f"courses/{PACK}/steps"
HEAD = {"de": "## So führst du das aus", "en": "## Running it"}

def unregex(s):
    return re.sub(r"\\(.)", r"\1", s or "")

REGEXY = re.compile(r"\\[dws]|[+*?|()\[]")

def code(s):
    """Inline code that survives a backtick inside it."""
    return f"`` {s} ``" if "`" in s else f"`{s}`"

def pattern_or_literal(raw, lang, truncated=False):
    """A check's expectation as the student will read it, as a verb phrase. A
    regex is shown as a regex - printing `cargo d+.d+.d+` as if it were output
    would be a false statement about what the check does (R3.4)."""
    if REGEXY.search(raw or ""):
        return ("passt auf das Muster " + code(raw) if lang == "de"
                else "matches the pattern " + code(raw))
    body = code(unregex(raw))
    if truncated:
        return ("beginnt mit " + body if lang == "de" else "begins with " + body)
    return ("enthält " + body if lang == "de" else "contains " + body)

def stdout_raw(s):
    """(first line of an expected stdout pattern, still escaped; was it cut)."""
    if not s:
        return "", False
    parts = re.split(r"\\n|\n", s)
    return parts[0], len(parts) > 1

def stdout_hint(s):
    """First line of an expected stdout pattern, unescaped. The newline escape is
    split off before the rest is unescaped, or `\n` collapses into a stray n."""
    if not s:
        return ""
    first = re.split(r"\\n|\n", s)[0]
    rest = len(re.split(r"\\n|\n", s)) > 1
    return unregex(first) + (" …" if rest else "")

TERMINAL = {
"de": '''::: do palette="> Terminal: Create New Terminal"
Öffne ein Terminal: **F1** drücken, den Eintrag samt dem vorangestellten `>` tippen, Eingabetaste. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.
> expect: Unten öffnet sich der Bereich mit dem Reiter **Terminal**, und die Eingabeaufforderung endet auf `~/workspace`.
> recover: Steht in der Palette *No matching results*, fehlt das `>` und sie sucht nach einer Datei dieses Namens - tippe es voran und wiederhole die Eingabe. Über das Menü geht es ebenso: **Terminal → Neues Terminal**.
:::''',
"en": '''::: do palette="> Terminal: Create New Terminal"
Open a terminal: press **F1**, type the entry with its leading `>`, press Enter. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.
> expect: The panel opens at the bottom on its **Terminal** tab, and the prompt ends in `~/workspace`.
> recover: If the palette says *No matching results*, the `>` is missing and it is searching for a file of that name - type it in front and repeat. The menu does the same: **Terminal → New Terminal**.
:::'''}

CD = {
"de": '''Das Terminal startet in `~/workspace`, dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle einmal je Terminal in die Crate:

```bash
cd ~/workspace/rust-foundations
```''',
"en": '''The terminal starts in `~/workspace`, the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate once per terminal:

```bash
cd ~/workspace/rust-foundations
```'''}

TAIL = {
"de": '''![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".''',
"en": '''![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".'''}

def block(check, title, lang):
    ctype = check.get("type")
    cmd = check["command"] if ctype == "command" else V._suite_command(check)
    cwd = check.get("cwd") or "."
    if ctype == "testSuite":
        n = check.get("minPass") or len(check.get("expectPass") or [])
        if lang == "de":
            ins = f"Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *{title}*."
            exp = (f"Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung "
                   f"`test result: ok. {n} passed; 0 failed`, sobald alle {n} bestehen. Der erste Lauf braucht ein paar "
                   "Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.")
            rec = ("Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - "
                   "hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet "
                   "die gültigen Namen auf.")
        else:
            ins = f"Run this step's tests. The same command sits behind the **Check** button on the *{title}* task."
            exp = (f"One line per test, `test … ok` or `… FAILED`, then the summary "
                   f"`test result: ok. {n} passed; 0 failed` once all {n} pass. The first run takes a few seconds while the "
                   "crate compiles once; every run after that stays well under a second.")
            rec = ("If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it "
                   "says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.")
    else:
        exit_code = check.get("expectExitCode", 0)
        snippet = "snippets/" in cmd
        if exit_code == 0:
            head, cut = stdout_raw(check.get("expectStdout"))
            out = pattern_or_literal(head, lang, cut) if head else ""
            if lang == "de":
                ins = f"Führe den Befehl der Aufgabe *{title}* aus."
                exp = (f"Der Befehl endet ohne Fehler, und seine Ausgabe {out}." if out else
                       "Der Befehl endet ohne Fehler und ohne Meldung; darunter erscheint die Eingabeaufforderung wieder.")
                rec = ("Bleibt der Cursor stehen, ohne dass die Eingabeaufforderung zurückkommt, läuft er noch - das ist kein "
                       "Hänger. Antwortet cargo mit `could not find Cargo.toml`, fehlt das `cd` von oben.")
            else:
                ins = f"Run the command of the *{title}* task."
                exp = (f"The command ends without an error and its output {out}." if out else
                       "The command ends without an error and without a message; the prompt reappears below it.")
                rec = ("If the cursor sits there and the prompt does not come back, it is still running - that is not a hang. "
                       "If cargo answers `could not find Cargo.toml`, the `cd` above is missing.")
        else:
            err = pattern_or_literal(check.get("expectStderr") or check.get("expectStdout") or "", lang)
            if lang == "de":
                ins = f"Führe den Befehl der Aufgabe *{title}* aus und lies seine Meldung."
                exp = (f"Er **scheitert mit Absicht**: Ende mit Code {exit_code}, und seine Fehlerausgabe {err}. "
                       "Genau das will die Prüfung sehen.")
                rec = ("Kommt gar kein Fehler, ist die Datei unter `snippets/` verändert worden - sie ist die Beobachtung "
                       "und gehört unverändert, geübt wird in `src/`."
                       if snippet else
                       "Endet er stattdessen mit Code 0, hat deine Implementierung den Fehlfall noch nicht als Fehler "
                       "behandelt. Meldet er etwas anderes, vergleiche deinen Text Zeichen für Zeichen mit dem erwarteten.")
            else:
                ins = f"Run the command of the *{title}* task and read its message."
                exp = (f"It **fails on purpose**: it ends with code {exit_code} and its error output {err}. "
                       "That is exactly what the check wants to see.")
                rec = ("If no error comes at all, the file under `snippets/` has been changed - it is the observation and "
                       "belongs unchanged; the practising happens in `src/`."
                       if snippet else
                       "If it ends with code 0 instead, your implementation does not yet treat the failing case as a "
                       "failure. If it reports something else, compare your text with the expected one character by character.")
    return f'::: do command="{cmd}" cwd="{cwd}"\n{ins}\n> expect: {exp}\n> recover: {rec}\n:::'

changed = 0
for f in sorted(glob.glob(f"{D}/*.de.md")) + sorted(glob.glob(f"{D}/*.en.md")):
    lang = f[-5:-3]
    fm, _ = V.load_step(f)
    runnable = []
    for t in fm["tasks"]:
        c = t["check"]
        if c.get("type") in ("command", "testSuite"):
            runnable.append((c, t["title"]))
    if not runnable:
        print("NO RUNNABLE CHECK:", f); continue
    parts = [HEAD[lang], "", TERMINAL[lang], "", CD[lang], ""]
    for c, title in runnable:
        parts += [block(c, title, lang), ""]
    parts += [TAIL[lang], ""]
    new = "\n".join(parts)
    s = io.open(f, encoding="utf-8").read()
    i = s.index("\n" + HEAD[lang])
    io.open(f, "w", encoding="utf-8").write(s[:i + 1] + new)
    changed += 1
print("sections regenerated:", changed)

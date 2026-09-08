#!/usr/bin/env python3
"""Measure a course pack against the measurable rules in docs/PEDAGOGY-RULES.md.

Reports, per question check: prompt length, question marks, the token overlap
between the rubric and the step body (limit 50 percent, 35 for analyze and
evaluate), the overlap between the rubric and its own prompt, the overlap
between hint tier 3 and the rubric (limit 30), whether the rubric names what
does not pass, and whether the task has its own hint ladder. Also counts tasks
of any kind with no ladder.

Run from the repository root:
    python3 scripts/pedagogy-metrics.py [<pack>] [--over] [--raw] [--lang de|en] [--legacy]
    python3 scripts/pedagogy-metrics.py --selftest

<pack> is a directory name under courses/ and defaults to rust-foundations.

--over prints only the rows that break a rule.
--lang picks the language half to measure (default en). Rubrics are plain
strings, not Localized maps, so each language file carries its own; measuring
one half tells you nothing about the other, and both halves need running.
--raw drops the stop list, so every word counts. The absolute numbers rise by
roughly twenty points because function words dominate, but the ranking is the
one to compare across steps when you want a figure that does not depend on
which words the stop list happens to contain.

THE TWO OVERLAP FIGURES ARE NOT THE SAME MEASUREMENT, and one round was spent
measuring past each other because of it. Both are printed on every row:

  `ovl`  rubric against the STEP BODY minus its `::: do` blocks, the R4.2
         figure. It answers: is the
         answer already written in the text the student just read? Limit 50
         percent, 35 for analyze and evaluate. This is the one that flags a
         question which only tests recognition. Its unfiltered form (--raw)
         runs about twenty points higher, because function words dominate;
         use --raw only to rank steps against each other, never against the
         limit.
  `q/r`  rubric against ITS OWN PROMPT. It answers a different question: does
         the rubric merely restate the question instead of naming what makes
         an answer good? A rubric can sit well under the body limit and still
         grade nothing. The course sits under 30 percent throughout; a
         mirrored rubric climbs.

`q/r` is one of four defensible readings of "rubric against question", and the
other three are the reason two streams once disagreed about the same rubrics.
Named, so nobody re-derives them:

  A  share of the QUESTION's content words that appear anywhere in the rubric
  B  share of the RUBRIC's content words that already stand in the question   `q/r`
  C  Jaccard of the two content-word sets                                     `jac`
  D  A, computed with no stop list, so function words count                   `--raw`

B and C are the mirroring measures and both are printed. A and D measure topic
sameness, not mirroring, and they move the WRONG way when a rubric improves: a
rubric that says more about the subject necessarily repeats more of the
question's nouns. Worked example, javascript-foundations: rewriting eight
mirrored rubrics moved B from 23.5 to 17.6 percent at the maximum while A rose
from 44.4 to 50.0. Never gate on A or D. Short prompts make A useless in any
case - these packs carry eight to twelve content words per prompt, so four
shared words already read as 40 percent.

WHAT `ovl` MEASURES, AND THE LIMITS THAT BELONG TO IT
-----------------------------------------------------
Two corrections, from the rust and javascript streams measuring the same rubrics
and disagreeing about them. Both are on; `--legacy` restores the old pair for a
comparison, and nothing else.

  * identifiers out. Everything the body puts in backticks or a code block, plus
    the test names the checks wait for, leaves BOTH sides of the ratio, so `ovl`
    measures shared PROSE. A rubric about `Copy`, `drop` or `Number.isNaN`
    cannot avoid those words - they ARE its subject. What `ovl` therefore does
    not measure, deliberately: shared technical vocabulary. A course is expected
    to name its subject the same way twice. The size of the discount is small -
    identifiers are 19 percent (en) / 14 percent (de) of what an over-limit
    rubric shares with its body; see the decomposition further down.
  * a symmetric stop list. The old list struck the question words in its German
    half and not in its English half, so a pack's two language halves were never
    held to the same standard. EXTRA_STOP adds the question words, determiners
    and conjunctions to both, and the German counts RISE as a result - the German
    half had been the lenient one.

THE LIMIT MOVED WITH THE MEASUREMENT, AND THAT IS THE POINT. Both corrections
change the scale: over all rubrics in this repository the median figure falls by
a factor of 0.851. Holding the old 35/50 against the new quantity would have
loosened R4.2 without saying so - measured, it drops 5 of the 14 javascript
rubrics that reading had established as genuine findings, all of them landing
between 30.0 and 42.1. So the limits are 28/40, the pair at which all 14 are
flagged again; 30/42 keeps 13. A NEW QUANTITY AGAINST AN OLD THRESHOLD IS A
SILENT CHANGE OF RULE: whoever edits one of the two edits both, and
test_regression() below is what notices if they do not.

Counts per pack, old pair against new (the summary line's own counting, with the
R4.2a exceptions taken out):

  pack                       35/50 old rule    28/40 new rule
  cads-zero-foundations  en        47                52
  cads-zero-foundations  de        41                41
  cads-zero-projects     en         3                 4
  cads-zero-projects     de         2                 4
  rust-foundations       en        18                16
  rust-foundations       de        12                11
  javascript-foundations en         0 (+3)            2 (+3)
  javascript-foundations de         0                 6 (+1)

WHAT THE NUMBER CANNOT DO, AND IT IS THE MORE IMPORTANT HALF
------------------------------------------------------------
No token measure can tell a body that STATES the answer from a body that ASKS
the question with the same nouns. The rust stream rewrote m4-01 from "use v[i]
when an out-of-range index would mean a bug" into "which of the two is right
depends on where the index came from and whether being out of range is a bug" -
a statement turned into a question, the same words, and `ovl` measures it
identically before and after. Reading found twelve such bodies in that pack and
the number found none of them.

Use it to sort candidates for reading. Do not use it to judge one: a row over
the limit is worth reading, a row under it is not thereby cleared, and under
roughly 25 content words the shared tokens are worth more than the percentage.

The German columns rise, so this is not a one-way loosening: a symmetric stop
list makes German stricter.

One caveat on `ovl`, learned by using it: a rubric has to name the same types,
traits and error codes the body names, so a residual overlap around 50 percent
is domain vocabulary rather than a leaked answer. Treat a number above roughly
65 percent as a finding and read the two texts before believing anything closer
to the line. The stop list below removes function words only, in both languages.
"""
import importlib.util, os, re, glob, sys

# A9.1 instruction blocks are operating boilerplate, repeated near-verbatim in
# every step, and they share vocabulary with rubrics: file, folder, command,
# output, prompt. Leaving them in the body inflates `ovl` for every step at once
# without any rubric answer having become liftable - measured on
# javascript-foundations, converting its 31 steps moved 5 rubrics over the limit
# on its own. Fenced code is dropped for the same reason, one layer down.
spec=importlib.util.spec_from_file_location("v","scripts/validate-courses.py")
V=importlib.util.module_from_spec(spec); spec.loader.exec_module(V)

# R4.2 exceptions, keyed (pack, step, task). PEDAGOGY-RULES.md R4.2a states when
# one is allowed: a `remember` or `understand` check whose rubric grades the
# naming of artefacts the step itself put on screen. Such a rubric cannot avoid
# the body's words without becoming vague, and a vague rubric is worse in the
# fallback path, where the student reads it as a self-check.
#
# Writing the reason is the price of the entry. An exception without one is a
# silenced finding, and the line below is what makes it reviewable.
EXCEPT_R42 = {
    ("javascript-foundations", "m0-02-first-run", "what-i-see"):
        "bloom remember. Grades whether the student names the artefacts of the run they just "
        "watched - the thrown TODO error, the file and function the stack trace pointed at, and "
        "`fail 0` as the finish condition. Naming them less exactly would accept an answer that "
        "names nothing.",
    ("javascript-foundations", "m0-03-read-a-test", "read-the-diff"):
        "bloom understand. Grades a reading of the diff the step printed. The two sides and the "
        "property name are the artefacts on screen, and the rubric has to name them to be able to "
        "reject 'the number was wrong'.",
    ("javascript-foundations", "m6-04-concurrency", "choose-combinator"):
        "36.4 against 35 on a rubric of 22 content words. Its whole shared vocabulary is eight "
        "tokens - about, combinator, every, only, partial, result, sequential, where - and half "
        "of them are grammar. That is a short-rubric denominator, not a leaked answer: four "
        "rewrites scored between 35.9 and 46.9 and every one was worse as a rubric. SHORT RUBRICS "
        "ARE READ, NOT COUNTED - under roughly 25 content words, look at the shared tokens before "
        "believing the percentage.",
}


def _validate_except_r42():
    """R4.2a, the unambiguous half: an exception needs a real reason. Runs on
    every invocation, not only --selftest, so a bad entry fails the very next
    validation rather than waiting for someone to remember to run the
    self-test. Returns (errors, warnings).

    The bloom half of R4.2a as documented ("only remember/understand may be
    excused") is checked too, but only as a warning: the third entry below
    (m6-04-concurrency/choose-combinator, bloom evaluate) is a real, already
    -measured exception that does not fit that criterion - its argument is
    that the overlap number itself is a short-rubric statistical artifact,
    not that a high-bloom rubric is allowed to restate the body. That is a
    real gap between the documented rule and actual practice, not a bug in
    this check or in the pack - so it is surfaced, not silently hidden and
    not force-broken by a rule that may itself be incomplete.
    """
    errors, warnings = [], []
    for (ex_pack, ex_sid, ex_task), reason in EXCEPT_R42.items():
        where = f"{ex_pack}/{ex_sid}/{ex_task}"
        if not isinstance(reason, str) or not reason.strip():
            errors.append(f"{where}: EXCEPT_R42 entry has no reason (R4.2a)")
            continue
        path = f"courses/{ex_pack}/steps/{ex_sid}.en.md"
        if not os.path.exists(path):
            errors.append(f"{where}: step file not found at {path}")
            continue
        fm = V.load_step(path)[0]
        task = next((t for t in (fm.get("tasks") or []) if t.get("id") == ex_task), None)
        if task is None:
            errors.append(f"{where}: no task '{ex_task}' in {path}")
            continue
        cb = (task.get("check") or {}).get("bloom") or fm.get("bloom")
        if cb not in ("remember", "understand"):
            warnings.append(
                f"{where}: exception at bloom '{cb}' - R4.2a as documented only allows "
                f"remember/understand; this entry's own reason argues a different, "
                f"undocumented exception class (see this function's docstring) - needs a "
                f"human decision (fix the rule text, or fix the entry), not an automatic one"
            )
    return errors, warnings


_r42a_errors, _r42a_warnings = _validate_except_r42()
for _msg in _r42a_warnings:
    print(f"WARN  {_msg}", file=sys.stderr)
if _r42a_errors:
    for _msg in _r42a_errors:
        print(f"ERROR {_msg}", file=sys.stderr)
    sys.exit(1)

STOP=set("""a an the of to in on for and or is are be been was were it its this that these those with as at by from not no if then than so such can could may might must will would should do does did have has had you your yours we our they their them i me my one two three
der die das den dem des ein eine einen einem eines und oder ist sind sein war waren es dies diese dieser dieses mit als bei von aus nicht kein keine wenn dann so auch noch nur schon man du dein deine dir dich wir uns sie ihr ihre ich mich mein meine kann können könnte muss müssen soll sollen wird werden wurde worden hat haben hatte zu im am um vom zum zur auf für dass ob wie was wer wo welche welcher welches""".split())
# --prose only. The stop list above is asymmetric - its German half already
# strikes the question words and its English half does not - so the two language
# halves of a pack were never measured equally strictly. These add the question
# words, the determiners and the conjunctions to BOTH halves.
EXTRA_STOP=set("""what where which who whom whose how when why while whether because since although though however therefore
each both either neither other others own same every any some none all more most many few less least
here there now again also too very quite rather instead without within into onto over under after before between about against during until unless once still yet even ever never always
warum wann weshalb wieso wodurch woran worauf worin wozu wobei weil obwohl denn sondern damit indem während bevor nachdem sobald solange falls
jede jeder jedes beide beides andere anderer anderes anderen dasselbe derselbe dieselbe eigene eigenen eigener
ohne innerhalb außerhalb zwischen gegen über unter nach vor seit bis statt hier dort jetzt wieder ebenfalls sehr ziemlich eher stattdessen immer nie etwa alle alles nichts mehr meiste viele wenige""".split())

def toks(s):
    ws = re.findall(r"[a-zäöüß0-9_]+", (s or "").lower())
    return set(ws) if raw else {w for w in ws if len(w)>2 and w not in STOP}
# argv: an optional pack name, plus flags. --lang consumes the word after it.
_positional, _skip = [], False
for _i, _a in enumerate(sys.argv[1:]):
    if _skip: _skip = False; continue
    if _a == "--lang": _skip = True; continue
    if _a.startswith("--"): continue
    _positional.append(_a)
pack = _positional[0] if _positional else "rust-foundations"
D = f"courses/{pack}/steps"
if not os.path.isdir(D): sys.exit(f"no such pack: {D}")
onlyover = "--over" in sys.argv
raw = "--raw" in sys.argv
# --prose: the two changes proposed after the rust/javascript cross-check.
# OFF by default: they move the scale, so the limit has to move with them,
# and that pair is a decision, not a detail. See the header.
legacy = "--legacy" in sys.argv   # the pre-2026-09 pair, for comparison only
# Calibrated, not guessed: with identifiers out and the stop list symmetric the
# figure drops by a median factor of 0.851 over all 252 rubrics in the repo.
# 28/40 is the pair at which every rubric known to be a genuine finding is
# still flagged - all 14 of them, measured against their pre-rewrite text.
LIM_HI, LIM_LO = (35, 50) if legacy else (28, 40)
if not legacy: STOP = STOP | EXTRA_STOP
lang = sys.argv[sys.argv.index("--lang")+1] if "--lang" in sys.argv else "en"
assert lang in ("de", "en"), "--lang takes de or en"
# R4.4 in both languages: a rubric has to name what it rejects.
REJECTS = re.compile(r"does not pass|not accepted|besteht nicht|nicht akzeptiert", re.I)
if raw: STOP = set()

rows=[]; ladders_missing=0; tasks_total=0
# A9.1 instruction blocks are not exposition: they say how to run something, and
# they never carry the answer to a question. Counting them as body inflated the
# R4.2 figure by four rubrics the day the pack was converted, which would have
# read as a regression that never happened.
DO_BLOCK_RE = re.compile(r"^:::[ \t]+do\b.*?^:::[ \t]*$", re.M | re.S)
# A markdown link TARGET is machinery, not prose: `](step:m3-01-for-and-while)`
# tokenises to "while", and a step that merely points at that step then shares a
# word with any rubric using it. Found the day R11a.7a's cross-references were
# added - one recall sentence pushed m3-02 from 33.3 to 35.7 against a limit of
# 35, on the token "while", contributed by a link target and by nothing anyone
# wrote. Removing targets changes exactly ONE figure in the whole repository,
# that one; all four packs are otherwise unmoved, which is the profile a fix for
# an artefact should have.
LINK_TARGET_RE = re.compile(r"\]\((?:step|file|https?):[^)]*\)")

# The body's IDENTIFIERS - anything it puts in backticks or a code block, plus
# the test names a check waits for - are removed from both sides of `ovl` before
# the ratio is taken, so the figure measures shared PROSE.
#
# Why: a rubric about `Copy`, `drop`, `E0507` or `Number.isNaN` cannot avoid
# those words, they ARE its subject, and a rubric should not be penalised for
# naming its subject the same way its step does.
#
# HOW BIG THE EFFECT ACTUALLY IS. An earlier figure in this comment said 86
# percent (en) and 85 percent (de) of what an over-limit rubric shares with its
# body is an identifier. That number was wrong: it came from an inline-code
# regex without a newline guard, which ran across block boundaries and swallowed
# whole paragraphs of prose as "identifiers" - 5251 tokens where the regex below
# finds 1037. Re-measured over the rust pack's over-limit rubrics, what they
# share decomposes as:
#
#     identifiers    19 % (en)  14 % (de)
#     function words 19 % (en)  17 % (de)   the words EXTRA_STOP adds
#     content prose  62 % (en)  69 % (de)
#
# So this discount is a real correction but a small one, and the claim it was
# once used to support - that the residue is mostly vocabulary - does not hold.
# Most of what an over-limit rubric shares with its body is ordinary prose, which
# is the thing R4.2 is about. Treat a row over the limit as worth reading, not as
# noise.
#
# AND KNOW WHAT NO TOKEN MEASURE CAN SEE: it cannot tell a body that states the
# answer from a body that asks the question using the same nouns. m4-01's body
# was rewritten from "use v[i] when an out-of-range index would mean a bug" into
# "which of the two is right depends on where the index came from and whether
# being out of range is a bug" - a statement turned into a question, same words,
# same overlap. Reading found twelve such bodies in this pack; the number found
# none of them on its own.
#
# What `ovl` therefore does NOT measure any more, deliberately: shared technical
# vocabulary. A course is expected to name its subject the same way twice. What
# it still measures is R4.2's actual question - whether the sentences that carry
# the answer are already in the text the student just read.
IDENT_RE = re.compile(r"`([^`\n]+)`|```[a-z]*\n(.*?)```", re.S)

def identifiers(body, tasks):
    """Every token the body marks as code, plus the test names checks expect."""
    out = set()
    for m in IDENT_RE.finditer(body):
        out |= toks(m.group(1) or m.group(2) or "")
    def walk(check):
        if not isinstance(check, dict): return
        for name in (check.get("expectPass") or []) + (check.get("expectFail") or []):
            out.update(toks(name))
        for sub in check.get("checks") or []: walk(sub)
        if isinstance(check.get("then"), dict): walk(check["then"])
    for task in tasks:
        walk(task.get("check"))
    return out

# --- self-test: the calibration, as a test rather than as a table -----------
# The measurement and its limit belong together. These fourteen rubrics were
# read, judged to state their own answer, and rewritten; their PRE-REWRITE text
# is kept here with the figure it must still produce. If a later change to the
# tokeniser, the stop list, the discount or the limits stops flagging one of
# them, that change has quietly loosened R4.2 and this test says so.
#
# Refresh a value only together with a stated reason. `git log -S` on the rubric
# text finds the commit the wording came from.
REGRESSION = [
    # step, task, lang - the limit is NOT written down here on purpose: it is taken
    # from LIM_HI/LIM_LO through the check's own bloom, so editing the limits is
    # exactly what this test is meant to catch.
    ("m0-04-modules", "named-vs-default", "en"),
    ("m1-01-let-const", "two-errors", "en"),
    ("m1-01-let-const", "two-errors", "de"),
    ("m1-03-coercion-nan", "why-silent", "en"),
    ("m1-03-coercion-nan", "why-silent", "de"),
    ("m3-01-for-and-while", "which-loop", "en"),
    ("m4-01-declare-and-call", "hoisting", "en"),
    ("m4-01-declare-and-call", "hoisting", "de"),
    ("m4-02-parameters", "default-trigger", "en"),
    ("m4-02-parameters", "default-trigger", "de"),
    ("m5-01-objects", "shared-or-copied", "en"),
    ("m5-01-objects", "shared-or-copied", "de"),
    ("m5-02-optional-chaining", "chaining-limits", "en"),
    ("m5-02-optional-chaining", "chaining-limits", "de"),
]
# The rubric text as it stood before the rewrite, keyed step|task|lang. Held here
# rather than read from git so the test runs in a checkout without history.
REGRESSION_RUBRICS = {}


def _selftest():
    """Checks the fourteen against the current measurement. Exit code is the verdict."""
    import json as _json
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pedagogy-regression.json")
    if not os.path.exists(path):
        print(f"self-test: {path} is missing; it holds the pre-rewrite rubric texts")
        return 2
    fixtures = _json.load(open(path, encoding="utf-8"))
    bad = 0
    print(f"{'case':44} {'ovl':>6} {'limit':>6}  verdict")
    for sid, tid, lang in REGRESSION:
        key = f"{sid}|{tid}|{lang}"
        if key not in fixtures:
            print(f"{key:44} {'':6} {'':6}  NO FIXTURE"); bad += 1; continue
        f = f"courses/javascript-foundations/steps/{sid}.{lang}.md"
        fm, body = V.load_step(f)[:2]
        task = next(x for x in fm["tasks"] if x["id"] == tid)
        cb = (task["check"].get("bloom") or fm["bloom"])
        limit = LIM_HI if cb in ("analyze", "evaluate") else LIM_LO
        prose = LINK_TARGET_RE.sub("](-)", DO_BLOCK_RE.sub("", body))
        ids = set() if legacy else identifiers(prose, fm.get("tasks") or [])
        rt = toks(fixtures[key]) - ids
        bt = toks(prose) - ids
        got = len(rt & bt) / len(rt) * 100 if rt else 0
        ok = got > limit
        if not ok: bad += 1
        print(f"{key:44} {got:6.1f} {limit:6}  {'flagged' if ok else 'LOST - the rule just got looser'}")
    print()
    print(f"self-test: {len(REGRESSION) - bad} of {len(REGRESSION)} still flagged"
          f" at limits {LIM_HI}/{LIM_LO}" + ("  (--legacy)" if legacy else ""))
    if bad:
        print("A rubric that was read and judged to state its own answer is no longer a")
        print("finding. Either the change is too coarse, or the limits have to move with")
        print("it - see the header. Do not adjust the expectations to make this pass.")
    return 1 if bad else 0


if "--selftest" in sys.argv:
    sys.exit(_selftest())

for f in sorted(glob.glob(f"{D}/*.{lang}.md")):
    sid=os.path.basename(f)[:-6]; fm,body=V.load_step(f)[:2]   # load_step also returns a parse error
    prose=LINK_TARGET_RE.sub("](-)", DO_BLOCK_RE.sub("", body))
    idents=set() if legacy else identifiers(prose, fm.get("tasks") or [])
    btok=toks(prose) - idents; soc=fm.get("socratic") or []
    trig=set()
    for s0 in soc:
        m=re.match(r"task:([^:]+):", str(s0.get("trigger",""))); 
        if m: trig.add(m.group(1))
    tasks=fm.get("tasks") or []
    tasks_total+=len(tasks); ladders_missing+=sum(1 for t in tasks if t["id"] not in trig)
    for t in tasks:
        c=t.get("check") or {}
        if c.get("type")!="question": continue
        pr=(c.get("prompt") or {}).get(lang,""); ru=c.get("rubric") or ""
        rt=toks(ru) - idents; pt=toks(pr)
        ov=len(rt&btok)/len(rt)*100 if rt else 0
        rt_all=toks(ru)
        qr=len(rt_all&pt)/len(rt_all)*100 if rt_all else 0              # reading B
        jac=len(rt_all&pt)/len(rt_all|pt)*100 if (rt_all|pt) else 0     # reading C
        h3=""
        for s0 in soc:
            if str(s0.get("trigger","")).startswith(f"task:{t['id']}:"):
                hs=s0.get("hints") or []
                if len(hs)>=3: h3=(hs[2] or {}).get(lang,"")
        h3ov=len(toks(h3)&rt_all)/len(rt_all)*100 if rt_all and h3 else 0
        # R4.2: the rubric grades the answer to THIS check, so the check's own
        # bloom sets the limit. The step's level is the fallback for a check
        # that does not carry one, and the two disagree often enough to matter.
        cb = c.get("bloom") or fm["bloom"]
        lim=LIM_HI if cb in ("analyze","evaluate") else LIM_LO
        rows.append((sid,t["id"],cb + ("*" if c.get("bloom") and c["bloom"]!=fm["bloom"] else ""),len(re.findall(r"\S+",pr)),pr.count("?"),round(ov,1),lim,
                     round(h3ov,1), bool(REJECTS.search(ru)), t["id"] in trig,
                     round(qr,1), round(jac,1), (pack,sid,t["id"]) in EXCEPT_R42))
print(f"pack={pack} lang={lang}" + ("  --legacy: pre-2026-09 measurement" if legacy else "") + ("  (--raw: stop list off)" if raw else ""))
print(f"{'step':26} {'task':18} {'bloom*':11} pw q? ovl/lim   q/r   jac  h3ovl notpass ladder")
print("  bloom is the CHECK's level, which sets the limit; * marks a check whose level differs from its step's")
for r in rows:
    over = r[5]>r[6] and not r[12]
    if onlyover and not (over or not r[8] or not r[9]): continue
    verdict = "EXC " if r[12] and r[5]>r[6] else ("OVER" if over else "  ok")
    print(f"{r[0]:26} {r[1]:18} {r[2]:11} {r[3]:3} {r[4]}  {r[5]:5}/{r[6]:2} {verdict} {r[10]:5}% {r[11]:5}% {r[7]:5}% {str(r[8]):5} {str(r[9]):5}")
n=len(rows)
print()
excepted=[r for r in rows if r[12] and r[5]>r[6]]
print(f"questions {n} | overlap over limit {sum(1 for r in rows if r[5]>r[6] and not r[12])} (+{len(excepted)} excepted)"
      f" | hint3 over 30% {sum(1 for r in rows if r[7]>30)}"
      f" | no 'does not pass' {sum(1 for r in rows if not r[8])} | no ladder {sum(1 for r in rows if not r[9])}")
print(f"rubric/body over 60% {sum(1 for r in rows if r[5]>60 and not r[12])} | rubric-from-prompt (B) max {max([r[10] for r in rows], default=0)}"
      f" | jaccard (C) max {max([r[11] for r in rows], default=0)}")
print(f"tasks {tasks_total} | tasks without their own ladder {ladders_missing}")
for r in excepted:
    print(f"  R4.2a exception {r[0]}/{r[1]} at {r[5]}/{r[6]}: {EXCEPT_R42[(pack,r[0],r[1])]}")

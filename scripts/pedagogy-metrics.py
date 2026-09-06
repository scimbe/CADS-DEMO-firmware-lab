#!/usr/bin/env python3
"""Measure a course pack against the measurable rules in docs/PEDAGOGY-RULES.md.

Reports, per question check: prompt length, question marks, the token overlap
between the rubric and the step body (limit 50 percent, 35 for analyze and
evaluate), the overlap between the rubric and its own prompt, the overlap
between hint tier 3 and the rubric (limit 30), whether the rubric names what
does not pass, and whether the task has its own hint ladder. Also counts tasks
of any kind with no ladder.

Run from the repository root:
    python3 scripts/pedagogy-metrics.py [--over] [--raw] [--lang de|en]

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

  `ovl`  rubric against the STEP BODY, the R4.2 figure. It answers: is the
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

One caveat on `ovl`, learned by using it: a rubric has to name the same types,
traits and error codes the body names, so a residual overlap around 50 percent
is domain vocabulary rather than a leaked answer. Treat a number above roughly
65 percent as a finding and read the two texts before believing anything closer
to the line. The stop list below removes function words only, in both languages.
"""
import importlib.util, os, re, glob, sys
spec=importlib.util.spec_from_file_location("v","scripts/validate-courses.py")
V=importlib.util.module_from_spec(spec); spec.loader.exec_module(V)
D="courses/rust-foundations/steps"
STOP=set("""a an the of to in on for and or is are be been was were it its this that these those with as at by from not no if then than so such can could may might must will would should do does did have has had you your yours we our they their them i me my one two three
der die das den dem des ein eine einen einem eines und oder ist sind sein war waren es dies diese dieser dieses mit als bei von aus nicht kein keine wenn dann so auch noch nur schon man du dein deine dir dich wir uns sie ihr ihre ich mich mein meine kann können könnte muss müssen soll sollen wird werden wurde worden hat haben hatte zu im am um vom zum zur auf für dass ob wie was wer wo welche welcher welches""".split())
def toks(s):
    ws = re.findall(r"[a-zäöüß0-9_]+", (s or "").lower())
    return set(ws) if raw else {w for w in ws if len(w)>2 and w not in STOP}
onlyover = "--over" in sys.argv
raw = "--raw" in sys.argv
lang = sys.argv[sys.argv.index("--lang")+1] if "--lang" in sys.argv else "en"
assert lang in ("de", "en"), "--lang takes de or en"
# R4.4 in both languages: a rubric has to name what it rejects.
REJECTS = re.compile(r"does not pass|not accepted|besteht nicht|nicht akzeptiert", re.I)
if raw: STOP = set()
rows=[]; ladders_missing=0; tasks_total=0
for f in sorted(glob.glob(f"{D}/*.{lang}.md")):
    sid=os.path.basename(f)[:-6]; fm,body=V.load_step(f)
    btok=toks(body); soc=fm.get("socratic") or []
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
        rt=toks(ru); ov=len(rt&btok)/len(rt)*100 if rt else 0
        qr=len(rt&toks(pr))/len(rt)*100 if rt else 0
        h3=""
        for s0 in soc:
            if str(s0.get("trigger","")).startswith(f"task:{t['id']}:"):
                hs=s0.get("hints") or []
                if len(hs)>=3: h3=(hs[2] or {}).get(lang,"")
        h3ov=len(toks(h3)&rt)/len(rt)*100 if rt and h3 else 0
        lim=35 if fm["bloom"] in ("analyze","evaluate") else 50
        rows.append((sid,t["id"],fm["bloom"],len(re.findall(r"\S+",pr)),pr.count("?"),round(ov,1),lim,
                     round(h3ov,1), bool(REJECTS.search(ru)), t["id"] in trig,
                     round(qr,1)))
print(f"lang={lang}" + ("  (--raw: stop list off)" if raw else ""))
print(f"{'step':26} {'task':16} {'bloom':10} pw q? ovl/lim   q/r  h3ovl notpass ladder")
for r in rows:
    over = r[5]>r[6]
    if onlyover and not (over or not r[8] or not r[9]): continue
    print(f"{r[0]:26} {r[1]:16} {r[2]:10} {r[3]:3} {r[4]}  {r[5]:5}/{r[6]:2} {'OVER' if over else '  ok'} {r[10]:5}% {r[7]:5}% {str(r[8]):5} {str(r[9]):5}")
n=len(rows)
print()
print(f"questions {n} | overlap over limit {sum(1 for r in rows if r[5]>r[6])} | hint3 over 30% {sum(1 for r in rows if r[7]>30)}"
      f" | no 'does not pass' {sum(1 for r in rows if not r[8])} | no ladder {sum(1 for r in rows if not r[9])}")
print(f"rubric/body over 60% {sum(1 for r in rows if r[5]>60)} | rubric/prompt over 60% {sum(1 for r in rows if r[10]>60)}")
print(f"tasks {tasks_total} | tasks without their own ladder {ladders_missing}")

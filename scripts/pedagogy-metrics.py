#!/usr/bin/env python3
"""Measure a course pack against the measurable rules in docs/PEDAGOGY-RULES.md.

Reports, per question check: prompt length, question marks, the token overlap
between the rubric and the step body (limit 50 percent, 35 for analyze and
evaluate), the overlap between hint tier 3 and the rubric (limit 30), whether
the rubric names what does not pass, and whether the task has its own hint
ladder. Also counts tasks of any kind with no ladder.

Run from the repository root:
    python3 scripts/pedagogy-metrics.py [--over]

--over prints only the rows that break a rule.

One caveat on the overlap figure, learned by using it: a rubric has to name the
same types, traits and error codes the body names, so a residual overlap around
50 percent is domain vocabulary rather than a leaked answer. Treat a number
above roughly 65 percent as a finding and read the two texts before believing
anything closer to the line. The stop list below removes function words only.
"""
import importlib.util, os, re, glob, sys
spec=importlib.util.spec_from_file_location("v","scripts/validate-courses.py")
V=importlib.util.module_from_spec(spec); spec.loader.exec_module(V)
D="courses/rust-foundations/steps"
STOP=set("""a an the of to in on for and or is are be been was were it its this that these those with as at by from not no if then than so such can could may might must will would should do does did have has had you your yours we our they their them i me my one two three
der die das den dem des ein eine einen einem eines und oder ist sind sein war waren es dies diese dieser dieses mit als bei von aus nicht kein keine wenn dann so auch noch nur schon man du dein deine dir dich wir uns sie ihr ihre ich mich mein meine kann können könnte muss müssen soll sollen wird werden wurde worden hat haben hatte zu im am um vom zum zur auf für dass ob wie was wer wo welche welcher welches""".split())
def toks(s): return {w for w in re.findall(r"[a-zäöüß0-9_]+", (s or "").lower()) if len(w)>2 and w not in STOP}
onlyover = "--over" in sys.argv
rows=[]; ladders_missing=0; tasks_total=0
for f in sorted(glob.glob(D+"/*.en.md")):
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
        pr=(c.get("prompt") or {}).get("en",""); ru=c.get("rubric") or ""
        rt=toks(ru); ov=len(rt&btok)/len(rt)*100 if rt else 0
        h3=""
        for s0 in soc:
            if str(s0.get("trigger","")).startswith(f"task:{t['id']}:"):
                hs=s0.get("hints") or []
                if len(hs)>=3: h3=(hs[2] or {}).get("en","")
        h3ov=len(toks(h3)&rt)/len(rt)*100 if rt and h3 else 0
        lim=35 if fm["bloom"] in ("analyze","evaluate") else 50
        rows.append((sid,t["id"],fm["bloom"],len(re.findall(r"\S+",pr)),pr.count("?"),round(ov,1),lim,
                     round(h3ov,1), bool(re.search(r"does not pass|not accepted",ru,re.I)), t["id"] in trig))
print(f"{'step':26} {'task':16} {'bloom':10} pw q? ovl/lim  h3ovl notpass ladder")
for r in rows:
    over = r[5]>r[6]
    if onlyover and not (over or not r[8] or not r[9]): continue
    print(f"{r[0]:26} {r[1]:16} {r[2]:10} {r[3]:3} {r[4]}  {r[5]:5}/{r[6]:2} {'OVER' if over else '  ok'} {r[7]:5}% {str(r[8]):5} {str(r[9]):5}")
n=len(rows)
print()
print(f"questions {n} | overlap over limit {sum(1 for r in rows if r[5]>r[6])} | hint3 over 30% {sum(1 for r in rows if r[7]>30)}"
      f" | no 'does not pass' {sum(1 for r in rows if not r[8])} | no ladder {sum(1 for r in rows if not r[9])}")
print(f"tasks {tasks_total} | tasks without their own ladder {ladders_missing}")

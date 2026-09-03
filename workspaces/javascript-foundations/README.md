# javascript-foundations — starter workspace

The exercise workspace for the CaDS Tutor course `javascript-foundations`.
Plain Node, no dependencies, no build step: everything runs with the `node`
binary that ships in the lab image.

## Requirements

Node 22 or newer. Only features that exist in Node 22 are used: ES modules,
the built-in test runner (`node --test`) and `node:assert/strict`.

## Layout

| Path | What lives there |
|---|---|
| `src/m0` … `src/m7` | the exercises, one file per step, grouped by module |
| `test/<step-id>.test.js` | the checks for that step; every file runs on its own |
| `examples/` | short scripts to predict before running |
| `solutions/<step-id>/` | reference solutions, used to validate the course |
| `package.json` | `"type": "module"`, `npm test` → `node --test test/*.test.js` |

## Running

```bash
node --test test/*.test.js                    # every test in the workspace
node --test test/m1-01-let-const.test.js      # one step
node --test --test-reporter=tap test/m1-01-let-const.test.js   # machine-readable
node examples/m1-typeof.js                    # run an example after predicting
```

A step is done when its own test file is green. Failing tests in later steps
are expected — those exercises are still waiting for you.

Pass `test/*.test.js` rather than running a bare `node --test`. Recent Node
versions widen the default search and would also pick up the reference tests
under `solutions/`, which are not yours to run; Node 22 does not. Naming the
folder gives the same answer on every version.

## Reading a failure

`node --test` prints the assertion, the two values it compared and the line that
compared them. Read that diff before changing code:

```
✖ m0-03 summarize returns count, total and average
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
    {
      average: 4,
      count: 3,
  +   sum: 12
  -   total: 12
    }
```

`+ actual` is what your code produced, `- expected` is what the test wanted.

## Solutions

`solutions/<step-id>/` mirrors the workspace layout, so a solution for
`src/m5/report.js` sits at `solutions/m5-04-transformations/src/m5/report.js`.
They exist so `scripts/validate-courses.py --solutions …` can prove two things
about every step: the checks pass with the reference solution, and they fail
without it. Read them after you have solved a step, not before.

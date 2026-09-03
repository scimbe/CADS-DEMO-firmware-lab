# Screenshots for javascript-foundations

Six screenshots of the real lab, embedded in
[`steps/m0-01-using-the-ide`](../steps/m0-01-using-the-ide.en.md), which is where
every operating move in this course is taught.

| File | The move it shows |
|---|---|
| `ide-terminal-menu.png` | the application menu open on **Terminal**, with **New Terminal** and **Run Task…** |
| `ide-command-palette.png` | **F1**, with `>Terminal: Create New Terminal` typed in |
| `ide-test-failing.png` | a failing run: assertion message, source file, prompt back |
| `ide-edit-unsaved.png` | the edited line and the dot on the tab that means "not saved yet" |
| `ide-test-passing.png` | the same test with `pass 1` and `fail 0` |
| `ide-wrong-folder.png` | `Could not find 'test/…'` because the terminal is one folder too high |

## How they were taken

Headless Chromium against the lab image, at 1440x900, in a throwaway container:

```bash
docker run -d --name cads-js-shots -p 8093:8080 -e PASSWORD=… \
  cads-tutor-lab:dev
# seed the container with the current workspace, then drive
# http://127.0.0.1:8093/?folder=/home/coder/workspace/javascript-foundations
docker rm -f cads-js-shots
```

Every image is the real product: real Node 22.23.2 inside the container, real
test output, no mock-ups and no retouching. Each was checked against the agreed
quality bar - no notification popup, no autocomplete popup, clean status bar, a
real file open in the editor, legible text, and the interface in one language.

## What is still missing, and why

**The tutor panel showing this course.** The image available locally
(`cads-tutor-lab:dev`, and `ghcr.io/scimbe/cads-tutor-lab:next` could not be
pulled) carries `cads-tutor` **0.1.0**, which predates Addendum v1.1. It refuses
every step of this pack with, for example:

```
ERROR …/m0-02-first-run.en.md: tasks[0].check.type: unknown check type "testSuite"
  (known: board, task, build, fileMatches, fileNotMatches, symbolInElf, flash,
   serialExpect, debugStop, question, manual, all, any)
```

so the panel shows "No courses found". Screenshots of the tutor panel, the task
check buttons and the recall card therefore have to wait for an image built from
the merged extension (the v1.1 runtime is stream-tutor2's next commit). Nothing
about the course content blocks them.

**Per-step screenshots.** Deliberately not taken. The operating move is identical
in all 31 steps - the same terminal, the same shape of command, the same summary
block - so 31 near-identical pictures would add noise rather than guidance. The
six above cover every distinct move, and each step names its own command in
writing, in its "Running this step" section. Say the word and they can be
generated per step from the same container.

# CaDS Tutor (`cads.cads-tutor`)

Tutor extension of the CaDS Firmware Lab (SPEC §3.3): course packs as plugins, progress in
`<workspace>/.cads-tutor/session.json`, automatic task checks, Socratic guidance by Bloom level,
proactive check-ins, DE/EN.

## Build

```bash
npm install            # git dependency @cads/tutor-platform is built by its prepare script
npm run typecheck
npm test               # node:test, no VS Code needed
npm run package        # esbuild bundle + vsce package --no-dependencies → dist/cads-tutor.vsix
```

## Where courses come from

1. Extensions with `contributes.cadsTutorCourses: [{ "path": "courses/<dir>" }]`
2. `/opt/cads-tutor/courses/*`, `~/.cads-tutor/courses/*`, `<workspace>/.cads-tutor/courses/*`
3. `cadsTutor.extraCourseDirs` (setting)

Format: see `docs/COURSE-AUTHORING.md` in the repository and the example pack `courses/_example`.

## LLM

Optional. `TUTOR_LLM_BASE_URL` (https), `TUTOR_LLM_API_KEY`, `TUTOR_LLM_MODEL` in the extension
host's environment. Without them the tutor still works: file/task/board checks run, the
"ask the tutor" box reports that the dialog is not configured (and still lists grounded reading
material), `question` checks fall back to manual confirmation.

# Tutor Lab image notes – status, verification, deviations (stream `tutorlab`)

Last updated: 2026-09-03. Companion to `docs/SPEC.md` Addendum v1.1 §A4 (and §A5 for the
telemetry environment); this file records what `images/tutor-lab` actually does, what was
verified and how, and where it deviates from the spec. The firmware image has its own file,
`docs/IMAGE-NOTES.md`.

## Verification log (2026-09-03, local Mac, Docker Desktop VM arm64, 4 CPU / 5.8 GB)

**Image build** (`docker build -f images/tutor-lab/Dockerfile -t cads-tutor-lab:dev .`, arm64,
no secrets):

| Step | Result |
|---|---|
| Debian packages (build-essential, pkg-config, libssl-dev, python3, git, curl, xz-utils) | OK, 624 MB layer |
| Node 22.23.2 official tarball, SHA-256 check | OK (`v22.23.2`, npm 10.9.8, corepack removed) |
| rustup `stable`, profile minimal + rustfmt/clippy/rust-src | OK: `cargo 1.98.0 (797e8a9bc 2026-08-05)`, `rustc 1.98.0 (88d9e12ae 2026-08-18)`, `clippy 0.1.98`, `rustfmt 1.9.0-stable`; `~/.rustup` 577 MB, `~/.cargo` 20 MB |
| Open VSX extensions | `rust-lang.rust-analyzer@0.3.3033` (linux-arm64 platform VSIX, bundled server binary present, 41 MB), `dbaeumer.vscode-eslint@3.0.34` (universal, 948 kB) |
| CodeLLDB 1.12.3 platform VSIX from the GitHub release, SHA-256 check | OK, 163 MB |
| CaDS VSIX (`extensions/cads-tutor/dist/*.vsix`) | 1 found → `cads.cads-tutor@0.1.0` installed (1 MB) |
| Course packs `courses/{rust,javascript}-foundations` | **0 in this checkout** – the rust/javascript streams have not merged yet; the build log says so and `/opt/cads-tutor/courses` is empty (see "Open dependencies") |
| Starter workspaces `workspaces/{rust,javascript}-foundations` | **0 in this checkout** → both seeded from `images/tutor-lab/seed-fallback/` (PLACEHOLDER), 26 MB incl. the warm `target/` |
| Seed build at the runtime path (`cargo build --all-targets && cargo test`, `node --test`) | OK, both green |
| Build time | **`--no-cache` from scratch: 3 min 51 s** (Open VSX extension installs 93 s, image export 59 s, Debian packages 29 s, rustup 21 s, CodeLLDB 11 s, Node 9 s, seed build 2 s); rebuild after a user-settings change 84 s; fully cached rebuild 8 s. The `codercom/code-server:latest` base was already pulled – add ≈1 min on a host that has to fetch it. |
| Image size | **3.33 GB** disk usage (`docker images`), 820 MB content size |

**Container** (`docker run … -p 127.0.0.1:8089:8080 -e PASSWORD=…`, fresh volume):

- entrypoint log: `[cads-seed] seeding … seed complete: rust-foundations … wrote
  rust-foundations/.vscode/settings.json (eslint: false) … wrote
  /home/coder/workspace/cads-tutor.code-workspace … ready`, plus the honest
  `note: … is the PLACEHOLDER workspace` line for each of the two.
- `code-server --list-extensions --show-versions` → `cads.cads-tutor@0.1.0`,
  `dbaeumer.vscode-eslint@3.0.34`, `rust-lang.rust-analyzer@0.3.3033`, `vadimcn.vscode-lldb@1.12.3`.
- `cargo --version` / `node --version` resolve in a login shell and in the integrated terminal
  (the login-shell case needs `/etc/profile.d/cads-rust.sh`, because Debian's `/etc/profile`
  resets `PATH`).
- `/home/coder/workspace` after the first start: `rust-foundations/`,
  `javascript-foundations/`, `cads-tutor.code-workspace` (multi-root, both folders, display
  names *Rust Foundations* / *JavaScript Foundations*).

**Update behaviour on an existing volume** (what the deploy guide promises, tested by editing
the volume and restarting the container):

| Situation | Result |
|---|---|
| Student edited `rust-foundations/src/lib.rs`, added `workspace/NOTES.md` | both kept verbatim, `workspace <path> exists, keeping it` ✔ |
| `.vscode/settings.json` still carries the marker line but is stale | rewritten from the image template, the stale key is gone ✔ |
| Student removed the marker line (took ownership) | `… is the student's own - not touched`, file left alone ✔ |
| `cads-tutor.code-workspace` present | kept, not regenerated ✔ |

So a new image tag refreshes exactly the files the image owns and nothing else.

**Browser** (`e2e/tutor-lab-smoke.mjs`, headless Chromium, own instance, fresh volume) –
full pass, `PASS: tutor-lab smoke test`:

| Check | Result |
|---|---|
| Extensions and PATH | exactly `cads.cads-tutor`, `dbaeumer.vscode-eslint`, `rust-lang.rust-analyzer`, `vadimcn.vscode-lldb`; no `cads-probe` / `cads-board-bridge` / cortex-debug, and none of `st-flash`, `st-info`, `arm-none-eabi-gcc`, `arm-none-eabi-gdb`, `gdb-multiarch`, `openocd` on PATH ✔ (negative test: planting an `st-flash` in the container makes the check fail) |
| Login with the password | redirect to `/?workspace=/home/coder/workspace/cads-tutor.code-workspace` ✔ |
| Title | `cads-tutor (Workspace) — CaDS Tutor Lab` ✔ |
| Restricted Mode | none (the `--disable-workspace-trust` flag is in the image `CMD`) ✔ |
| Explorer | both folders, `["Rust Foundations","JavaScript Foundations"]` ✔ |
| Startup noise | no prompt, no chat side bar, **no notifications 18 s and 30 s after load** ✔ |
| Status bar | `["🎓 Tutor","0 \n 0","0","Layout: U.S."]`, no pending Source Control changes ✔ |
| Tutor | `cads.cads-tutor` installed; with no course pack in the image the tutor reports *"No course packs found. See the CaDS Tutor output channel for details."* – asserted as such, the panel assertions run as soon as a pack ships ✔ |
| Terminal | `cargo 1.98.0`, `node v22.23.2` ✔ |
| `cargo test` in `rust-foundations` | exit 0, **1 s** (budget 60 s), 4 tests in 4 binaries ✔ |
| `node --test` in `javascript-foundations` | exit 0, `# pass 4`, `# fail 0` ✔ |

Screenshots of that run: `e2e/out/tutor-lab/{01-workbench,01b-after-startup,01c-explorer,02-tutor,03-terminal}.png`.
The run was repeated against the `--no-cache` image on a fresh volume and passed identically;
the container sits at **1.13 GiB** with a browser attached, an extension host, rust-analyzer and
a terminal running, so it is far less demanding than the firmware image (which needed a 5.8 GB
Docker VM to stop being OOM-killed).

**Tutor panel with a real course pack.** Because no rust/javascript pack exists yet, the panel
itself was verified once by copying the firmware pack into a running container
(`docker cp courses/cads-zero-foundations …:/opt/cads-tutor/courses/`, container restarted –
a throwaway local check, nothing of it is in the image): the side bar switched to `CADS TUTOR` with the
views *Kurse / Courses* and *Fortschritt / Progress*, the status bar item became
`🎓 Tutor: Welcome to the CaDS firmware lab` and the step opened as an editor tab. So the
mechanism works; only the content is missing.

**amd64 was not built here – its pins were verified instead.** Everything above is an arm64
build on a Mac; labor and the CI amd64 runner are x86-64, and the Dockerfile carries separate
checksums per architecture, which is exactly the kind of thing that is wrong until someone
looks. Checked against upstream on 2026-09-03:

- `node-v22.23.2-linux-x64.tar.xz` → `d60acfe0…03f307`, matches `NODE_SHA256_AMD64` (and the
  arm64 line matches `NODE_SHA256_ARM64`); source is nodejs.org's own `SHASUMS256.txt`.
- `codelldb-linux-x64.vsix` v1.12.3 downloaded and hashed → `1cd7f386…fd1be1`, matches
  `CODELLDB_SHA256_AMD64` (55 571 094 B).
- Open VSX publishes `rust-lang.rust-analyzer` for both `linux-x64` and `linux-arm64`, and the
  linux-x64 VSIX contains `extension/server/rust-analyzer` (41.9 MB) – so the Dockerfile's
  `test -x …/server/rust-analyzer` assertion holds on amd64 too.

The first amd64 image itself is built by CI.

## Image size (target: under 1.5 GB compressed)

| Measure | Value |
|---|---|
| `docker images` (disk usage, arm64) | 3.33 GB |
| content size | 820 MB |
| `docker save cads-tutor-lab:dev \| gzip \| wc -c` | **0.85 GB** ✔ (0.81 GB before the TOML extension; even-better-toml adds 69 MB unpacked, ≈40 MB compressed) |

Largest contributions: code-server base 737 MB, Debian base + packages 156 MB + 261 MB,
build-essential/libssl/python layer 624 MB, CodeLLDB 171 MB, rustup toolchain 577 MB on disk,
rust-analyzer 45 MB, seed workspaces 26 MB. Trims if it ever matters: drop CodeLLDB
(≈-170 MB, costs step-debugging of Rust tests), `rustup component remove rust-src` (≈-60 MB,
costs std completion in rust-analyzer).

For comparison, the firmware image is 0.94 GB compressed, so the two together are ≈1.8 GB of
pull on a host that runs both.

## CI: `.github/workflows/image-tutor-lab.yml`

Same shape as the firmware `image.yml`: an `extension` job packages
`extensions/cads-tutor/dist/*.vsix`, two native `build` jobs (`ubuntu-latest` = amd64,
`ubuntu-24.04-arm` = arm64) push by digest to `ghcr.io/scimbe/cads-tutor-lab`, and a `manifest`
job stitches them into one multi-arch manifest tagged `<branch>-<shortsha>`, `<branch>` and, on
`main`, `latest`. Native builds rather than QEMU because the seed stage really compiles
(`cargo build --all-targets`, `cargo test`, `node --test`).

**No repository secret is needed** – unlike the firmware image there is no private `cads-zero`
clone. Everything the build downloads is public and pinned: the Node tarball by SHA-256, the
CodeLLDB VSIX by version + SHA-256, the Open VSX extensions by id (Open VSX serves the newest
version; pin with `@<version>` if a build ever needs to be reproducible to the extension patch).
`GITHUB_TOKEN` with `packages: write` covers the ghcr.io login. The workflow has not run yet:
this stream commits to `stream-tutorlab`, and the first run happens when the lead merges to
`next`.

## A starter workspace must fail its own tests (2026-09-03)

The first build against the real workspaces (`stream-rust` `ac612c4`,
`stream-js` `458bb1a`, tried locally before they reached `next`) failed, and the reason is
worth writing down because it is a property of teaching content, not a bug in either stream.

A starter workspace is the exercise *before* it is solved:

| | Rust `rust-foundations` | JavaScript `javascript-foundations` |
|---|---|---|
| Exercise bodies | `todo!()` – compiles, panics when run | `throw new Error("TODO: …")` or the bug the step is about |
| `cargo build` (lib + bins) | **succeeds** | n/a |
| Test targets (2026-09-03, final content) | 27, all compile | n/a |
| Whole suite | 2 of 122 tests pass | 8 of 74 tests pass |

Earlier in the day 1 of 18 Rust test targets (`m1-03-copy-types`) did not compile at all – the
step wanted the student to add `#[derive(Copy)]`, so the target failed with E0277 until they
did. The rust stream has since reworked it. Both shapes are legitimate for a starter, so the
image and the smoke test handle either.

Two consequences the image had to absorb:

- **`cargo test` and `node --test` are the wrong build gate.** They were, and they failed the
  image build. A starter that passes its own tests is a course with nothing left to teach. The
  gate is now `cargo build` (lib + bins): a starter whose library does not compile is broken for
  everyone. Everything else – how many test targets compile, how many tests pass, clippy,
  rustfmt, the `node --test` counts – is printed into the build log and never fatal, so a
  regression is visible in CI without blocking the image.
- **Work per test target, not on the whole workspace.** While one target did not compile, a
  bare `cargo test` in the root reported *nothing at all* – the build aborts before any test
  runs, and `--no-fail-fast` does not help (it continues past failing tests, not past a failing
  build). That specific target is fixed, so a bare `cargo test` now prints results, but it still
  stops at the first failing target (3 summaries of 27 today). Either way the useful command is
  a single step's target, which is also exactly what a course `testSuite` check runs, so that is
  what the seed stage and the smoke test do.

The smoke test now asserts what can honestly be asserted: the runner executes, produces a
result summary, and at least one test passes. That separates a broken toolchain (no summary,
nothing passes) from unsolved exercises (summary, mostly red). Measured on the real content:
`cargo test --test m0-02-first-test` 1 passed / 2 failed in 1 s, `node --test` 8 passed /
65 failed of 73 in 2 s.

## `target/` is no longer shipped (2026-09-03)

The image used to carry the Rust `target/` directory so the first `cargo test` would be
incremental. Measured against the real workspace, that trade is bad:

| Measure | Value |
|---|---|
| `cargo build --tests` from cold | 7 s |
| the same with the shipped `target/` | 1 s |
| size of `target/` | 172 MB |

The course has no dependencies at all, so there is nothing expensive to cache: 172 MB for six
seconds, against a smoke-test budget of 60 s. The seed stage still builds at the runtime path –
that is what makes cargo's absolute-path fingerprints reusable – and then deletes `target/`.
`~/.cargo/registry` is still copied (it is empty today) so the mechanism is in place the moment
a course takes its first dependency; re-measure then.

## The language-lab details: what was broken, what was fixed (2026-09-03)

The operator asked for the details a learning environment lives or dies by, checked in the
browser rather than assumed. Everything below is now asserted by `e2e/tutor-lab-smoke.mjs`
(section 5), one screenshot per point in [`docs/evidence/`](evidence/).

### Three real defects, all fixed

**1. `Cargo.toml` opened as "Plain Text".** Neither code-server nor rust-analyzer contributes a
TOML grammar – `rust-analyzer`'s only grammar is `ra_syntax_tree`, and no built-in extension
claims the `.toml` extension. So the very first file of the Rust course, the one the student
edits to add a dependency, had no colours and no structure. Fixed by installing
`tamasfe.even-better-toml` (Open VSX, 0.21.2, 69 MB – two 35 MB server bundles), which also
brings the Cargo schema, so keys are completed and typos underlined. Verified: language
indicator "TOML", 4 token colours
([tutorlab-02-highlight-toml.png](evidence/tutorlab-02-highlight-toml.png)).

**2. JavaScript files had no diagnostics at all – the settings were in a file that cannot apply
them.** `js/ts.implicitProjectConfig.checkJs` has `"scope": "window"`, and VS Code **silently
ignores** window-scoped settings in a folder's `.vscode/settings.json`. It was sitting in
`vscode-templates/javascript-foundations.settings.json`, so the built-in language service was
never asked to check `.js` at all: the starter's deliberate bugs – assignment to a `const`, a
block-scoped variable used before its declaration – produced no squiggle and no Problems entry,
in a course whose first instruction is "run the test and read both error messages".

The same trap applied to the Rust template: `rust-analyzer.*` is window-scoped and `lldb.*`
application-scoped, so those lines had no effect either. They happened to be duplicated in the
image's user settings, so nothing was visibly broken – the template was simply lying about what
it did.

Fixed by moving every window/application-scoped setting into the image's user settings and
cutting the folder templates down to what a folder file can actually apply (resource scope:
`eslint.*`, `javascript.suggest.autoImports`, the `[rust]`/`[javascript]` formatter blocks).
Both templates now say so in a comment. Verified: `counter.js` shows
`Cannot assign to 'count' because it is a constant. ts(2588)` and
`Block-scoped variable 'suffix' used before its declaration. ts(2448)`
([tutorlab-09-javascript-diagnostics.png](evidence/tutorlab-09-javascript-diagnostics.png)).

**3. TypeScript jargon on correct JavaScript.** With `checkJs` working, the implicit project is
`strict` by default, and strict implies `noImplicitAny`, so every untyped parameter of perfectly
good JavaScript was flagged *"Parameter 'text' implicitly has an 'any' type (ts 7006)"* – a
TypeScript concept this course never teaches, sitting in the Problems list next to the real bug
the step is about. Two of the five entries on the first exercise file were this noise. Fixed
with `js/ts.implicitProjectConfig.strict: false` while keeping `strictNullChecks` and
`strictFunctionTypes` on, so "possibly undefined" is still reported. The smoke test now fails
if ts7006 ever comes back.

### Checked and working, no change needed

| Point | Evidence |
|---|---|
| Syntax highlighting `.rs` / `.toml` / `.js` / `.json` / `.md` | language indicator correct and 9 / 4 / 8 / 4 / 7 distinct token colours ([rust](evidence/tutorlab-01-highlight-rust.png), [toml](evidence/tutorlab-02-highlight-toml.png), [javascript](evidence/tutorlab-03-highlight-javascript.png), [json](evidence/tutorlab-04-highlight-json.png), [markdown](evidence/tutorlab-05-highlight-markdown.png)) |
| rust-analyzer starts and reports itself | status bar shows `Roots Scanned: n/15` then `Indexing: n/22`, then the plain `rust-analyzer` item |
| Hover with type information | `rust_foundations::m0::m0_02_first_test pub fn add(a: i32, b: i32) -> i32` plus the doc comment ([screenshot](evidence/tutorlab-06-rust-hover.png)) |
| Completion | `Vec::` offers 12 items (`new()`, `from_raw_parts(…)`, `into_flattened(…)`, …) ([screenshot](evidence/tutorlab-07-rust-completion.png)) |
| Errors and warnings in the Problems view | 8 rows: the rustc `E0277` the m1-03 step is about, plus clippy warnings on the examples ([screenshot](evidence/tutorlab-08-problems-rustc-clippy.png)) |
| Go to definition | jumps within the file, no "no definition found" |
| JavaScript recognised as a module | `"type": "module"`, ESM imports resolve, language indicator "JavaScript" |
| ESLint quiet without a configuration | the workspace has no ESLint config, so the entrypoint writes `eslint.enable: false`; no missing-library complaint |
| rustfmt on save | `pub fn fmt_probe( a:i32,b:i32 )->i32{a+b}` typed in the editor becomes `pub fn fmt_probe(a: i32, b: i32) -> i32 {` on save ([screenshot](evidence/tutorlab-10-rustfmt-on-save.png)) |
| Built-in JavaScript formatter on save | `export function fmtProbe(  a,b ){…}` becomes `export function fmtProbe(a, b) {…}` ([screenshot](evidence/tutorlab-11-jsfmt-on-save.png)) |
| Search finds exercise files | "countWords" → 5 results in 2 files, across both workspaces ([screenshot](evidence/tutorlab-12-search.png)) |
| File icons, line numbers, bracket pairs | per-type icons (`rs-ext-file-icon`, `rust-lang-file-icon`, …), line numbers, 2 bracket-pair colours ([screenshot](evidence/tutorlab-13-icons-and-chrome.png)) |
| No missing-extension warning, no empty welcome page | no notifications at any point in the run, no welcome or get-started tab |

### How long a student waits for rust-analyzer

rust-analyzer activates on workspace load (the workspace has a `Cargo.toml`), scans 15 roots and
indexes 22 crates (core, libc, std). Measured from the workbench being usable, over six runs on
the developer VM (4 CPU, shared with the other streams' containers):

| Situation | Ready after |
|---|---|
| idle machine | 15–20 s |
| four other files opened during indexing | 37 s |
| a `docker build` running at the same time | 79 s |
| already indexed (second file) | 5–6 s |

Editing, highlighting, search and the terminal work immediately; only hover, completion and the
Problems view wait, and the status bar names what it is doing the whole time. **Nothing was
pre-warmed into the image**: rust-analyzer keeps no on-disk index to bake in – its cache priming
is the indexing above, and `target/` (deliberately not shipped, see below) does not shorten it.
The smoke test fails if readiness ever exceeds 120 s.

One ordering lesson is baked into the test: opening a `.rs` file starts that indexing, and a
TextMate grammar requested during it can take a minute to arrive. The highlighting checks
therefore open Markdown, JSON, JavaScript and TOML before Rust, which is also how a student
works – one file at a time, not five in three seconds.

## Resolved: both courses load, full smoke pass (2026-09-03)

For most of the day the image shipped the course packs and the tutor loaded none of them: the
content is written against SPEC Addendum v1.1 and `cads-tutor` still implemented v1, so every
step's first check (`command`, `testSuite`, `predict`) was an unknown type, every step file was
invalid, and both courses were dropped with *"No course packs found"*. That is fixed in the
extension (`CHECK_TYPES` in `extensions/cads-tutor/src/types.ts` now carries the three new
types); the image needed no change for it, only a repackaged VSIX.

`extensions/cads-tutor/dist/*.vsix` is a build artefact and gitignored, so a stale local VSIX
looks exactly like a broken image. `scripts/run-local-tutor-lab.sh` and the CI `extension` job
package it; do that before judging a course problem.

**Full pass, fresh volume, both packs complete** (`rust-foundations` 30 steps, 62 files;
`javascript-foundations` 31 steps, 75 files):

| Check | Result |
|---|---|
| Course packs in the image | both, 62 + 75 files ✔ |
| Reference solutions | **absent** from image, seed and workspace, although `workspaces/*/solutions` exists in the repo (`.dockerignore` plus the seed stage) – asserted, because shipping them would quietly end the exercises ✔ |
| Workspace seeds | both real, 0 placeholders ✔ |
| Tutor side bar | `CADS TUTOR` with *Kurse / Courses* and *Fortschritt / Progress* ✔ |
| Course tree | **both courses listed**, JavaScript – Foundations 0/31 with M0–M6, Rust Foundations below it ([screenshot](evidence/tutorlab-15-tutor-tree-both-courses.png)) ✔ |
| First step opens | window title and editor tab `CaDS Tutor: Operating the interface`, Bloom badge, task list, *Run all checks*, DE/EN toggle ([screenshot](evidence/tutorlab-14-tutor-first-step.png)) ✔ |
| Rust test run | `cargo test --test m0-02-first-test` → 1 passed, 2 failed in 1 s ✔ (whole starter: 27 targets, 2 of 122 tests pass) |
| JavaScript test run | `node --test` → 74 tests, 8 passed, 66 failed in 1 s ✔ |
| Startup noise | no prompt, no chat bar, no notification at 18 s or 30 s ✔ |
| Language-lab details | all green, see the section above ✔ |

Both suites are red by design – the exercises are unsolved. What the check requires is that the
runner starts, prints a summary and gets at least one test through; see the starter-workspace
section below.

Build time for that image: 95 s incremental, 0.85 GB compressed, 3.43 GB unpacked.

## Open dependencies (streams `rust` / `js`)

`courses/rust-foundations`, `courses/javascript-foundations`, `workspaces/rust-foundations` and
`workspaces/javascript-foundations` are built in their own streams and were not on `next` when
this was written. The image is built so that they need **no change here** when they arrive:

- present at build time → copied into `/opt/cads-tutor/courses` and `/opt/cads-seed`;
- absent → the build log says so and `images/tutor-lab/seed-fallback/<name>` is seeded instead,
  carrying a `PLACEHOLDER.md` and announced again at container start.

The placeholders are deliberately real, tiny projects (a `cargo test` with 4 tests, a
`node --test` with 4 tests) so that the toolchains, the warm cache and the smoke test are
exercised honestly rather than skipped.

## Deviations and decisions

- **The warm cache is plumbed but not yet proven at scale.** With the placeholder workspace a
  cold `cargo test` (`target/` deleted) takes 2 s and the warm one 1 s, so the seed build buys
  almost nothing today. It exists for the real `workspaces/rust-foundations`, which will have
  dependencies; the seed stage compiles at the runtime path precisely because cargo fingerprints
  carry absolute paths. Re-measure when the rust stream merges – the smoke test's 60 s budget is
  the guard.
- **`terminal.integrated.cwd` is pinned to `/home/coder/workspace`** (2026-09-03). In a
  multi-root workspace `Terminal: Create New Terminal` does not open a terminal at all – VS Code
  first asks *"Select current working directory for new terminal"* and lists both folders. That
  is a picker in front of every single terminal a student opens, so the image answers it once.
  Both tracks are one `cd` away. The smoke test fails with that prompt named if the setting is
  ever lost.
- **`CADS_TUTOR_TELEMETRY_URL` / `CADS_TUTOR_TELEMETRY_TOKEN` are plumbed but not yet consumed.**
  Compose file, `docker run` line and documentation pass them per SPEC A5, and the multi-user
  broker will set them per container. The VSIX in this image (`cads.cads-tutor@0.1.0`) contains
  no telemetry code at all (`grep -c -i telemetry` → 0); it is being built in the `tutor`/`portal`
  streams. Setting the variables today is therefore harmless and does nothing. Nothing in the
  image needs to change when the new VSIX lands.
- **`TUTOR_LLM_BASE_URL` must be an `https://` URL.** Not a convention – `LlmClient` in
  `@cads/tutor-platform` throws `LlmClient baseUrl must be https:// (got "…")` in its
  constructor. A plain `http://` proxy URL or a bare `host:port` disables the tutor's "ask"
  path; the rest of the tutor keeps working. All three `TUTOR_LLM_*` variables must be set
  together, otherwise the tutor reports itself unconfigured and question checks fall back to
  manual confirmation.
- **No `rust-docs` component** (≈700 MB). The Rust Programming Language is linked from the
  course; `rust-src` is kept because rust-analyzer needs it for std completion and goto.
- **CodeLLDB comes from the GitHub release, not Open VSX.** Open VSX only carries the
  "bootstrap" VSIX, which downloads the ≈55 MB platform package on first activation – a lab
  container must not depend on that at student time. The platform VSIX is pinned by version and
  SHA-256 (checksums computed 2026-09-03 from the release assets; recompute them when bumping,
  the project publishes no checksum file).
- **rustup `stable`, not a pinned version.** The build records the resolved version (1.98.0
  today) in the build log and here. `--build-arg RUST_TOOLCHAIN=1.98.0` pins it when a course
  ever depends on a specific compiler version.
- **ESLint is enabled per workspace only when that workspace has an ESLint config.** Otherwise
  the extension reports a missing library on every JavaScript file. The entrypoint decides this
  per start and writes `eslint.enable` into the workspace settings, so the JavaScript stream can
  add a config later and it switches itself on.
- **The tutor extension is the only CaDS extension in this image.** `cads-probe` and
  `cads-board-bridge` are not installed, and neither are the `st-flash` / `st-info` shims,
  cortex-debug, the ARM toolchain, `gdb-multiarch` or any WebUSB affordance: Rust and
  JavaScript students neither flash a board nor debug through a probe (lead's clarification,
  2026-09-03). Hiding board actions inside a non-hardware course is the tutor runtime's job
  (stream `tutor3`) and needs nothing from the image. The two images share only the base
  image, the settings policy and `cads-tutor`. CodeLLDB stays: it debugs local Rust test
  binaries, which has nothing to do with a debug probe.

## Known limits

- The multi-root workspace file is written once and then owned by VS Code (it rewrites it when
  the student adds or removes folders). A student who deletes it gets it back on the next
  container start; a student who edits it keeps their version.
- `cargo test` is fast only for the tree that was warm at build time. A student who adds a
  dependency pays the download and compile once; the registry cache in the image covers only
  what the seed workspace needed.
- Course packs are read from `/opt/cads-tutor/courses` inside the image, so **adding a course
  means a new image**, not a volume change.

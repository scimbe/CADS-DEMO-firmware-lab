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

**Browser** (`e2e/tutor-lab-smoke.mjs`, headless Chromium, own instance, fresh volume) –
full pass, `PASS: tutor-lab smoke test`:

| Check | Result |
|---|---|
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

**Tutor panel with a real course pack.** Because no rust/javascript pack exists yet, the panel
itself was verified once by copying the firmware pack into a running container
(`docker cp courses/cads-zero-foundations …:/opt/cads-tutor/courses/`, container restarted –
local probe only, nothing of it is in the image): the side bar switched to `CADS TUTOR` with the
views *Kurse / Courses* and *Fortschritt / Progress*, the status bar item became
`🎓 Tutor: Welcome to the CaDS firmware lab` and the step opened as an editor tab. So the
mechanism works; only the content is missing.

## Image size (target: under 1.5 GB compressed)

| Measure | Value |
|---|---|
| `docker images` (disk usage, arm64) | 3.33 GB |
| content size | 820 MB |
| `docker save cads-tutor-lab:dev \| gzip \| wc -c` | **814 318 854 B = 0.81 GB** ✔ |

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
- **No firmware content.** No ARM toolchain, no board bridge, no `cads-zero-*` course packs, no
  probe extensions. The two images share only the base, the settings policy and the
  `cads-tutor` extension.

## Known limits

- The multi-root workspace file is written once and then owned by VS Code (it rewrites it when
  the student adds or removes folders). A student who deletes it gets it back on the next
  container start; a student who edits it keeps their version.
- `cargo test` is fast only for the tree that was warm at build time. A student who adds a
  dependency pays the download and compile once; the registry cache in the image covers only
  what the seed workspace needed.
- Course packs are read from `/opt/cads-tutor/courses` inside the image, so **adding a course
  means a new image**, not a volume change.

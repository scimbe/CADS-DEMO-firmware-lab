# CaDS Tutor Lab image (`ghcr.io/scimbe/cads-tutor-lab`)

The second lab image of this monorepo, for the language tracks **rust-foundations** and
**javascript-foundations** (SPEC.md Addendum v1.1 A4). It replaces the separate
`CADS-DEMO-tutor-lab` repository. The firmware image (`Dockerfile` at the repository root,
`ghcr.io/scimbe/cads-firmware-lab`) is unrelated at runtime; the two share the `cads-tutor`
extension, the user-settings policy and the CI shape.

| | |
|---|---|
| Base | `codercom/code-server:latest` (Debian 13), multi-arch amd64 + arm64 |
| Toolchains | rustup `stable` (profile minimal + rustfmt, clippy, rust-src; no rust-docs), Node 22 (official tarball, SHA-256 checked), build-essential, pkg-config, libssl-dev, python3, git |
| Extensions | `rust-lang.rust-analyzer` (Open VSX, platform VSIX with bundled server), `dbaeumer.vscode-eslint` (Open VSX), `tamasfe.even-better-toml` (Open VSX – nothing else in code-server claims `.toml`, so `Cargo.toml` would open as plain text), `vadimcn.vscode-lldb` (CodeLLDB 1.12.3, platform VSIX from the GitHub release, SHA-256 pinned – Open VSX only has the bootstrap that downloads at runtime), `cads.cads-tutor` (VSIX from `extensions/cads-tutor/dist`) |
| Course packs | `courses/rust-foundations` (30 steps, M0–M7) and `courses/javascript-foundations` (31 steps, M0–M7) → `/opt/cads-tutor/courses/`; the tutor tree lists both and the student picks. The firmware packs are **not** in this image |
| Workspaces | `workspaces/rust-foundations`, `workspaces/javascript-foundations` → `/opt/cads-seed/<name>`, seeded to `/home/coder/workspace/<name>` on first start; `cads-tutor.code-workspace` (multi-root, both folders) is what code-server opens |
| Build gate | the seed stage requires the Rust library and binaries to compile, then records test counts, clippy and rustfmt without failing the build. A starter workspace is the exercise *before* the solution, so its tests are red on purpose. Reference solutions (`workspaces/*/solutions`) are excluded from the image |
| Port | container 8080, host loopback `127.0.0.1:8084` (lab) / `127.0.0.1:8089` (development machine) |
| Env | `PASSWORD` (required), `TUTOR_LLM_BASE_URL` / `TUTOR_LLM_API_KEY` / `TUTOR_LLM_MODEL` (optional, LLM for the tutor; the base URL **must be `https://`**), `CADS_TUTOR_TELEMETRY_URL` / `CADS_TUTOR_TELEMETRY_TOKEN` (optional, SPEC A5 teacher portal; unset = events stay local, and `cads-tutor@0.1.0` does not read them yet) |
| Size | 0.85 GB compressed (`docker save \| gzip`), 3.4 GB unpacked; a from-scratch build takes ≈4 min |

Verification log, sizes and deviations: [docs/TUTOR-LAB-NOTES.md](../../docs/TUTOR-LAB-NOTES.md).

## Layout

```
images/tutor-lab/
├── Dockerfile                    multi-stage: base (packages, Node, Rust) → seed (packs, workspaces, warm build) → final
├── docker-compose.yml            runtime only: password, env, volume, 127.0.0.1:8084
├── entrypoint.d/10-seed-workspaces.sh   seeds both workspaces, writes .vscode/settings.json + the .code-workspace
├── settings/user-settings.json   ~/.local/share/code-server/User/settings.json (trimmed copy of image/settings)
├── vscode-templates/             per-workspace settings templates + cads-tutor.code-workspace
└── seed-fallback/                PLACEHOLDER workspaces, used only when workspaces/<name> is absent at build time
```

Related: `scripts/run-local-tutor-lab.sh` (build + run on 8089), `e2e/tutor-lab-smoke.mjs`
(headless browser smoke test), `.github/workflows/image-tutor-lab.yml` (CI).

## Build locally

The build context is the **repository root** (it needs `courses/`, `workspaces/`,
`extensions/cads-tutor/dist`). No secrets are needed.

```bash
# packages the cads-tutor VSIX if missing, builds, starts on 127.0.0.1:8089
TUTOR_LAB_PASSWORD=secret scripts/run-local-tutor-lab.sh
# only build
scripts/run-local-tutor-lab.sh --build-only
# plain docker
docker build -f images/tutor-lab/Dockerfile -t cads-tutor-lab:dev .
```

Build arguments: `RUST_TOOLCHAIN` (default `stable`; pin a version such as `1.91.0` for a
reproducible image), `NODE_VERSION` + `NODE_SHA256_*`, `CODELLDB_VERSION` + `CODELLDB_SHA256_*`.
When bumping Node or CodeLLDB, update the checksums (`SHASUMS256.txt` on nodejs.org; for CodeLLDB
compute `sha256sum` of the downloaded release asset – the project publishes no checksum file).

If `workspaces/<name>` is missing in the checkout the image seeds the placeholder from
`seed-fallback/` and says so in the build log and at container start
(`[cads-seed] note: ... PLACEHOLDER ...`); the placeholder carries a `PLACEHOLDER.md`. Missing
course packs are reported in the build log and simply absent from `/opt/cads-tutor/courses`.

## Run

```bash
cd images/tutor-lab
printf 'TUTOR_LAB_PASSWORD=%s\n' "$(openssl rand -hex 12)" > .env   # + TUTOR_LLM_*, CADS_TUTOR_TELEMETRY_* if wanted
docker compose up -d          # image: ghcr.io/scimbe/cads-tutor-lab:${TUTOR_LAB_TAG:-next}
open http://127.0.0.1:8084
```

or without compose (this is what the lab deployment does):

```bash
docker run -d --name tutor-lab --restart unless-stopped \
  -p 127.0.0.1:8084:8080 \
  -e PASSWORD=... \
  -e TUTOR_LLM_BASE_URL= -e TUTOR_LLM_API_KEY= -e TUTOR_LLM_MODEL= \
  -e CADS_TUTOR_TELEMETRY_URL= -e CADS_TUTOR_TELEMETRY_TOKEN= \
  -v tutor-lab-workspace:/home/coder/workspace \
  ghcr.io/scimbe/cads-tutor-lab:<tag>
```

The image's `CMD` already carries `--bind-addr 0.0.0.0:8080 --app-name "CaDS Tutor Lab"
--disable-workspace-trust --disable-telemetry --disable-update-check
/home/coder/workspace/cads-tutor.code-workspace`; do not override it.

## Deploy on the lab host (`labor`)

`tutor-lab` runs on **labor** today from its own repository,
`/home/becke/CADS-DEMO-tutor-lab`, which builds a container locally (`build: .`). This image
replaces that build. Nothing about the deployment's shape changes: same container name, same
loopback port `127.0.0.1:8084`, same named volume `tutor-lab-workspace`, same `.env`, same
tunnel. Only where the image comes from changes.

### 1. Pick a tag

From the CI run of `.github/workflows/image-tutor-lab.yml`: `next-<shortsha>` on branch `next`,
`latest` after a merge to `main`. **Deploy an immutable tag** (`next-1a2b3c4`), never a moving
one, so a rollback has something to roll back to.

### 2. Edit the compose file

In `/home/becke/CADS-DEMO-tutor-lab/docker-compose.yml`, replace the local build with the
registry image and **delete the `command:` line**:

```diff
 services:
   tutor-lab:
-    build: .
+    image: ghcr.io/scimbe/cads-tutor-lab:next-1a2b3c4
     container_name: tutor-lab
     restart: unless-stopped
-    command: ["--bind-addr", "0.0.0.0:8080", "--app-name", "CaDS Development System", "--disable-workspace-trust", "."]
```

The `command:` line matters more than the image line. Compose's `command:` **replaces the
image's `CMD`**, and this image's `CMD` is what opens the multi-root workspace and switches the
remaining startup noise off:

```
--bind-addr 0.0.0.0:8080 --app-name "CaDS Tutor Lab" --disable-workspace-trust
--disable-telemetry --disable-update-check /home/coder/workspace/cads-tutor.code-workspace
```

Keeping the old line would open the plain folder `.` instead of `cads-tutor.code-workspace`
(one folder in the Explorer instead of both tracks), label the window *CaDS Development System*
and re-enable the update check. Leave `environment:`, `ports:` and `volumes:` exactly as they
are.

### 3. Pull and start

```bash
cd /home/becke/CADS-DEMO-tutor-lab
docker compose pull
docker compose up -d
docker compose logs --tail=30 tutor-lab | grep '\[cads-seed\]'
```

The pull is ≈0.8 GB. `ghcr.io/scimbe/cads-tutor-lab` is public read, so no `docker login` is
needed. The existing `tutor-lab-workspace` volume is kept: student work is **never** re-seeded
or overwritten, only the image-managed `.vscode/settings.json` files are refreshed (they carry
a marker line; a student's own file is left alone). Note that a volume from the old image
already has the old repository's `rust-exercise/` and `javascript-exercise/` folders in it — the
new seeds (`rust-foundations/`, `javascript-foundations/`) appear next to them. Start from an
empty volume (`docker compose down && docker volume rm tutor-lab-workspace`) if you want only
the new layout; **that deletes student work**, so only on a lab machine nobody is using.

### 4. Environment (`.env`, unchanged)

| Variable | Required | Meaning |
|---|---|---|
| `TUTOR_LAB_PASSWORD` | yes | the shared student login (`PASSWORD` inside the container) |
| `TUTOR_LLM_BASE_URL` | no | LiteLLM proxy for the tutor's "ask" path. **Must start with `https://`** — `@cads/tutor-platform` throws `LlmClient baseUrl must be https://` otherwise and the ask path stays dead while everything else works |
| `TUTOR_LLM_API_KEY` | no | proxy key; all three `TUTOR_LLM_*` must be set together or the tutor reports itself unconfigured |
| `TUTOR_LLM_MODEL` | no | e.g. `local-devstral-small2` |
| `CADS_TUTOR_TELEMETRY_URL` | no | teacher portal ingest endpoint (SPEC A5). Unset = learning events stay in the container |
| `CADS_TUTOR_TELEMETRY_TOKEN` | no | token for that endpoint |

The telemetry pair is plumbed through compose and documented here, but the VSIX in this image
(`cads.cads-tutor@0.1.0`) does not read it yet — that arrives with the portal stream. Setting it
today is harmless and has no effect.

### 5. Verify (about three minutes)

From the shell:

```bash
docker compose logs tutor-lab | grep '\[cads-seed\]'    # ends with "ready: …/cads-tutor.code-workspace"
curl -sI http://127.0.0.1:8084/ | head -1                # HTTP/1.1 302 Found (→ ./login)
docker exec tutor-lab bash -lc 'cargo --version; node --version'
docker exec tutor-lab code-server --list-extensions --show-versions
docker exec tutor-lab bash -lc 'cd ~/workspace/rust-foundations && cargo test --no-fail-fast 2>&1 | tail -5'
docker exec tutor-lab bash -lc 'cd ~/workspace/javascript-foundations && node --test'
docker exec tutor-lab ls /opt/cads-tutor/courses
```

Expected: `cargo 1.98.0` or newer and `node v22.x`; the extension list contains
`cads.cads-tutor`, `rust-lang.rust-analyzer`, `dbaeumer.vscode-eslint`,
`tamasfe.even-better-toml`, `vadimcn.vscode-lldb`; `ls /opt/cads-tutor/courses` shows both packs.

**Both test commands exit non-zero, and that is correct.** A starter workspace is the exercise
before the solution: the Rust exercises are `todo!()`, the JavaScript ones throw or carry the bug
their step is about. On a fresh volume expect 2 of 122 Rust tests and 8 of 74 JavaScript tests to
pass. What must hold is that each runner *starts and prints a summary* in seconds.

`--no-fail-fast` matters: a bare `cargo test` stops at the first failing target and shows a
fraction of the suite, and while any step leaves a target that does not compile it reports
nothing at all. A student checking one step runs that step's target
(`cargo test --test <step>`), which is also what the tutor's `testSuite` check does — but do not
put a step name in a runbook, the course renames them.

In the browser (through the usual tunnel or an SSH port-forward to `127.0.0.1:8084`):

1. Password login works and the window title reads `cads-tutor (Workspace) — CaDS Tutor Lab`.
2. The Explorer shows **both** folders, *Rust Foundations* and *JavaScript Foundations*. One
   folder only means the `command:` line is still in the compose file (step 2).
3. **No "Restricted Mode"** banner, no notification a minute after the workbench loads.
4. The CaDS Tutor icon is in the activity bar. Opening it shows *Kurse / Courses* with **both**
   courses, *JavaScript – Foundations* `0/31` and *Rust Foundations* `0/30`, each with its
   modules M0–M7, and the first step opens as an editor tab (`CaDS Tutor: Operating the
   interface`) with its task list, a *Run all checks* button and a German/English toggle.
   A tutor that says *"No course packs found"* means the image predates the course packs or was
   built with an outdated `cads-tutor` VSIX — take a newer tag.
5. `F1 → Terminal: Create New Terminal` opens a terminal **without** asking for a working
   directory; `cargo --version` and `node --version` answer, and `cd rust-foundations &&
   cargo test` passes.

The whole browser list is also a script (needs a local playwright and Chromium):

```bash
CADS_LAB_URL=http://127.0.0.1:8084 CADS_LAB_CONTAINER=tutor-lab CADS_LAB_PASSWORD=… \
  node e2e/tutor-lab-smoke.mjs
```

### 6. Roll back

Put the previous tag back in `image:` and repeat step 3. The volume is untouched, the port and
the tunnel do not change, so a rollback is a pull and a restart:

```bash
cd /home/becke/CADS-DEMO-tutor-lab
sed -i 's#cads-tutor-lab:.*#cads-tutor-lab:<previous tag>#' docker-compose.yml
docker compose pull && docker compose up -d
```

If the registry is unreachable, the old repository still builds its own image
(`git stash` the compose change, `docker compose up -d --build`) — slower, but it does not
depend on ghcr.io.

### 7. Known limits

- **Course packs live in the image**, at `/opt/cads-tutor/courses`. New course content means a
  new tag, not a volume edit.
- **One shared password**, no per-student isolation. Multi-user operation (Keycloak, one
  container per student) is the firmware lab's broker stack and does not cover tutor-lab yet.
- The image is arm64 + amd64; labor is amd64, so `docker compose pull` picks that automatically.
- Disk: ≈3.3 GB unpacked per image version. Remove the previous tag only after the new one is
  verified: `docker image rm ghcr.io/scimbe/cads-tutor-lab:<old tag>`.
- `--restart unless-stopped` brings the container back after a reboot; the tunnel process for
  this host follows the host's own restore guide.

Operator-facing version of this procedure:
[deploy the tutor-lab image](https://github.com/scimbe/CADS-ops-docs) (`_how-to/deploy-tutor-lab-image.md`).

## What is deliberately not in the image

- **Only the `cads-tutor` extension, no board extensions.** `cads-probe` and
  `cads-board-bridge` are not installed, and neither are the `st-flash` / `st-info` shims,
  cortex-debug, the ARM toolchain or anything WebUSB. Rust and JavaScript students neither
  flash nor debug through a probe. The tutor runtime hides board actions in non-hardware
  courses by itself; the image contributes nothing to that.
- No `cads-zero-*` course packs.
- No `rust-docs` component (≈700 MB) – The Rust Programming Language is linked from the course.
- No global `eslint`: the ESLint extension is enabled per workspace only when that workspace has
  an ESLint configuration (then `npm ci` in the seed build installs it from the lock file).
- No corepack shims (`yarn`/`pnpm` would try to download on first use).
- No per-folder terminal directory: a multi-root workspace otherwise asks *"Select current
  working directory for new terminal"* every single time, so `terminal.integrated.cwd` is
  pinned to `/home/coder/workspace` and both tracks are one `cd` away.

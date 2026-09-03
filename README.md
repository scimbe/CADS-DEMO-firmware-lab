# CaDS Firmware Lab

Browser IDE ([code-server](https://github.com/coder/code-server) 4.135, VS Code 1.135) in which
students build, flash and debug the **CaDS Zero** firmware
([scimbe/cads-zero](https://github.com/scimbe/cads-zero), STM32F429ZI / ITSboard) with the
board plugged into **their own computer**, guided by a course tutor. The container has no USB:
the ST-Link is driven from the browser (WebUSB/WebSerial) and bridged into the container.

- **User documentation** (students, course authors): [CADS-DEMO-firmware-lab-docs](https://github.com/scimbe/CADS-DEMO-firmware-lab-docs)
  (tutorials, how-to, reference, explanation; DE/EN).
- **Developer documentation** (this repository): [`docs/index.md`](docs/index.md) — specification,
  ADRs, per-stream notes.
- **Operator runbooks**: the private ops-docs site.

## Architecture

```
Student's browser                                      Container (code-server, lab/services host)
┌────────────────────────────────────────┐  WebSocket  ┌──────────────────────────────────────────┐
│ VS Code workbench (code-server UI)     │◄───────────►│ Node extension host                       │
│  ├─ web-worker extension host          │executeCommand│  ├─ cads-board-bridge (Node)               │
│  │   └─ cads-probe (web extension)     │ (both ways) │  │   ├─ GDB-RSP server   127.0.0.1:3333     │
│  │       ├─ WebUSB  → ST-Link (SWD)    │             │  │   ├─ serial PTY + TCP 127.0.0.1:3334     │
│  │       └─ WebSerial → VCP console    │             │  │   ├─ HTTP shim API    127.0.0.1:3335     │
│  └─ webviews (tutor step panel)        │             │  │   └─ status bar, flash/reset commands    │
└────────────────────────────────────────┘             │  ├─ cads-tutor (Node)  ← course packs      │
        ▲ USB                                          │  ├─ cortex-debug (servertype external)     │
   ST-Link + ITSboard                                  │  ├─ clangd, cmake-tools, peripheral-viewer │
                                                       │  └─ shims: st-flash, st-info → :3335       │
                                                       │ workspace: /home/coder/workspace/cads-zero │
                                                       └──────────────────────────────────────────┘
```

Three extensions (separate VSIX, one monorepo), all interfaces in [`docs/SPEC.md`](docs/SPEC.md),
decisions in [`docs/ADRS.md`](docs/ADRS.md):

| Extension | Host | Role |
|---|---|---|
| `cads-probe` | web worker in the browser | WebUSB ST-Link driver (TypeScript port of the hardware-verified webstlink driver: halt instead of reset before flash), WebSerial console, reconnect after replug |
| `cads-board-bridge` | Node, container | GDB remote server, serial TCP/PTY, HTTP API for the shims, connect/flash/reset/console commands, status bar, cortex-debug configuration provider, exports API |
| `cads-tutor` | Node, container | course-pack loader, session/progress, step webview, course tree, checks, Socratic hints, "ask the tutor" (tutor-platform grounding), proactive check-ins |

All three extensions are on `next` since the bridge merge (`9161df0`); the image tag
`next-8a20ec9` predates it and contains `cads-tutor` only. The bridge's hardware verification
(flash, F5, stepping, replug, measurements) is recorded in [`docs/BRIDGE-NOTES.md`](docs/BRIDGE-NOTES.md).

## Repository layout

```
Dockerfile, docker-compose.yml, .dockerignore   image (SPEC §4); compose is for local runs only
image/entrypoint.d/10-seed-workspace.sh         workspace seed + .vscode/.clangd templates
image/vscode-templates/                         settings/tasks/launch/extensions.json, clangd.yaml
image/settings/user-settings.json               code-server user settings baked into the image
image/shims/st-flash, st-info                   bridge HTTP shims (+ cads_shim_common.py)
extensions/cads-probe, cads-board-bridge        bridge stream (web + node extension)
extensions/cads-tutor                           tutor extension
courses/cads-zero-foundations, cads-zero-projects   course packs (data only), courses/README.md
deploy/multiuser/                               multi-user stack: fl-broker (host process), Caddy gate, compose, systemd/watchdog
scripts/run-local.sh, validate-courses.py, tutor-e2e-container.sh
tests/shims/                                    unittest suite for the shims
e2e/image-smoke.mjs, e2e/tutor/                 Playwright checks against a running container
docs/                                           SPEC, ADRs, IMAGE-NOTES, TUTOR-NOTES, MULTIUSER, COURSE-AUTHORING
example-firmware/, vscode-extension/, webusb-flash/   history: the previous OpenOCD/USB-passthrough lab (see below)
```

## Build and test per component

### Image

Needs Docker with BuildKit and a GitHub login (`gh auth login`) that can read the private
cads-zero repository; the token is passed as a BuildKit secret and never stored in a layer.

```sh
cp .env.example .env                 # FIRMWARE_LAB_PASSWORD, optional TUTOR_LLM_*
scripts/run-local.sh                 # package VSIX (if npm is present), build, run on http://127.0.0.1:8084
scripts/run-local.sh --fresh         # re-seed the workspace volume
scripts/run-local.sh --stop
```

Manual: `GH_TOKEN=$(gh auth token) docker build --secret id=gh_token,env=GH_TOKEN -t cads-firmware-lab .`
Build args: `CADS_ZERO_REF` (commit to seed), `CADS_SKIP_HOST_BUILD=1`, `CADS_KEEP_HOST_BUILD=1`.
The image build itself is a test: it runs `cmake --preset itsboard`, the host preset and
`ctest -E '^golden_'`; a failing build fails the image. Results, size, timings and every
deviation from the spec: [`docs/IMAGE-NOTES.md`](docs/IMAGE-NOTES.md).

- Shims: `python3 -m unittest discover -s tests/shims -v` (mock HTTP bridge, no Docker).
- Browser smoke test against a running container:
  `CADS_LAB_PASSWORD=… node e2e/image-smoke.mjs` (login, workspace, `CaDS: Build`, `st-info --probe`).

### Extensions

Each of `extensions/*` is a TypeScript strict / Node 22 project with the same scripts:

```sh
npm ci
npm run typecheck
npm test               # node:test, no VS Code needed
npm run package        # esbuild bundle + vsce package --no-dependencies → dist/*.vsix
```

`dist/` and `*.vsix` are git-ignored; `scripts/run-local.sh` and the CI package them before the
image build, so a Docker build from a bare checkout yields "CaDS extensions installed: 0" by
design. Tutor notes and deviations: [`docs/TUTOR-NOTES.md`](docs/TUTOR-NOTES.md); the tutor's
container integration test: `scripts/tutor-e2e-container.sh <cads-zero>` (see `e2e/tutor/README.md`).

### Courses

Course packs are data (`course.json` + Markdown steps with front matter), see
[`docs/COURSE-AUTHORING.md`](docs/COURSE-AUTHORING.md) and [`courses/README.md`](courses/README.md).
Validate before committing:

```sh
scripts/validate-courses.py /path/to/cads-zero --nm /path/to/arm-none-eabi-nm
```

### Multi-user stack

```sh
python3 -m unittest deploy/multiuser/broker/test_fl_broker.py   # broker, simulated Docker
deploy/multiuser/broker/it_local.sh                             # broker against real local Docker
```

Design: [`docs/MULTIUSER.md`](docs/MULTIUSER.md); operation and local end-to-end test with a stub
gate: [`deploy/multiuser/README.md`](deploy/multiuser/README.md).

## CI and registry

`.github/workflows/image.yml` builds amd64 and arm64 natively on every push to `next`/`main`
that touches the image, extensions or courses, packages the VSIX, and pushes a multi-arch
manifest to `ghcr.io/scimbe/cads-firmware-lab` tagged `<branch>-<shortsha>`, `<branch>` and
(`main` only) `latest`. Required repository secret: `CADS_ZERO_TOKEN` (read-only token for
cads-zero, see IMAGE-NOTES). Deploy immutable tags.

## Running the image

The image's `CMD` carries every flag that matters (`--disable-workspace-trust` included, ADR-006),
so a plain `docker run` is correct; do not append arguments after the image name.

```sh
docker run -d --name firmware-lab -p 127.0.0.1:8083:8080 \
  -e PASSWORD=… -e TUTOR_LLM_BASE_URL=… -e TUTOR_LLM_API_KEY=… -e TUTOR_LLM_MODEL=… \
  -v firmware-lab-workspace:/home/coder/workspace ghcr.io/scimbe/cads-firmware-lab:<tag>
```

Add `-e CMAKE_BUILD_PARALLEL_LEVEL=<n>` on small hosts. The workspace volume is seeded on the
first start only and never overwritten by a new image.

## History

`example-firmware/`, `vscode-extension/codereview-tutor.vsix` and `webusb-flash/` belong to the
previous lab (OpenOCD in the container, server-side USB pass-through, a separate WebUSB flash
tab). They are excluded from the build context and not used by the image; server-side USB was
dropped because the board is at the student (ADR-001) and it does not work under Docker
Desktop on macOS anyway. `webusb-flash/vendor/webstlink-src` remains the hardware-verified
driver source that `cads-probe` ports from. Removing the directories is a `next`-branch decision.

## Conventions (SPEC §7)

TypeScript strict, Node 22, `npm test` per extension, small conventional commits
(`feat(bridge): …`), no secrets in the repository, hardware tests only on the bridge stream
(one ST-Link). "Done" means built, tested, verified in the local container with Playwright,
and for hardware paths verified with the real board.

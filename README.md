# CaDS Firmware Lab

Browser IDE ([code-server](https://github.com/coder/code-server), VS Code 1.135) in which
students build, flash and debug the **CaDS Zero** firmware
([scimbe/cads-zero](https://github.com/scimbe/cads-zero), STM32F429ZI / ITSboard) with the
board plugged into **their own computer**. The container has no USB: the ST-Link is driven
from the browser via WebUSB/WebSerial (`cads-probe`), bridged into the container by
`cads-board-bridge` (GDB server 3333, serial 3334, HTTP shim API 3335), with a course-driven
tutor (`cads-tutor`). The binding architecture and all interfaces are in
[`docs/SPEC.md`](docs/SPEC.md).

This README describes the **image and workspace** part (SPEC §4). The three extensions and the
courses are built by their own streams under `extensions/` and `courses/`.

## What the image contains

| Piece | Detail |
|---|---|
| Base | `codercom/code-server:latest` (Debian 13, multi-arch amd64/arm64) |
| Toolchain | ARM GNU Toolchain **13.3.rel1** (official tarball per `TARGETARCH`, SHA-256 verified) in `/opt/arm-gnu-toolchain`, `CADS_ARM_TOOLCHAIN_BIN` set, on `PATH` |
| Build tools | cmake 3.31, ninja, gcc (host preset), python3 + pyserial, clang-format, clangd 19, gdb-multiarch, binutils, socat, git |
| Workspace seed | `/opt/cads-seed/cads-zero`: shallow clone of cads-zero at the pinned commit (`CADS_ZERO_REF`, default `e882fab`) with submodules, **built once during the image build** (`cmake --preset itsboard` → `cads-zero.bin`; `host` preset + `ctest` as a second smoke test). `build/itsboard` incl. `compile_commands.json` ships in the seed. |
| Shims | `/usr/local/bin/st-flash`, `st-info`: Python HTTP clients for the bridge API on `127.0.0.1:3335`. `erase` is refused (lab policy, no mass erase), writes stay inside `0x08000000–0x080FFFFF`. Without a connected board they print `Board-Bridge nicht aktiv – Board im Browser verbinden (CaDS Board Panel)`. |
| Extensions (Open VSX) | cortex-debug, peripheral-viewer, debug-tracker, memory-view, rtos-views, cmake-tools, vscode-clangd, python, plus every `extensions/*/dist/*.vsix` present at build time |
| Settings | User settings (`workbench.startupEditor=none`, workspace trust off, CMake presets, clangd args, `cadsTutor.autoOpen`, …) in the image; workspace `.vscode/{settings,tasks,launch,extensions}.json` + `.clangd` written by the entrypoint |
| CMD | `--bind-addr 0.0.0.0:8080 --app-name "CaDS Firmware Lab" --disable-workspace-trust --disable-telemetry --disable-update-check /home/coder/workspace/cads-zero` – complete, so a plain `docker run` is correct |

**Not** in the image: OpenOCD, st-util, `/dev/bus/usb`, device cgroup rules. Server-side USB is
architecturally wrong here (the board is at the student) and does not work under Docker Desktop
on macOS anyway.

### Start-up: `image/entrypoint.d/10-seed-workspace.sh`

code-server's entrypoint runs every executable in `/entrypoint.d` before starting the server.
The seed script copies `/opt/cads-seed/cads-zero` to `/home/coder/workspace/cads-zero` if no
`.git` exists there (student work is never overwritten), then writes the container variants of
`.vscode/*.json` and `.clangd` (refreshed on every start, marked `skip-worktree` so `git status`
stays clean), picks the GDB for cortex-debug (toolchain `arm-none-eabi-gdb` if it runs, else
`gdb-multiarch`), and removes a CMake build tree whose cache points at a different source path.
It always exits 0.

### Tasks and debug configuration in the workspace

| Task | Command |
|---|---|
| `CaDS: Build` (default build) | `cmake --preset itsboard && cmake --build build/itsboard` |
| `CaDS: Flash` | `st-flash write build/itsboard/cads-zero.bin 0x08000000 && st-flash reset` |
| `CaDS: Build + Flash` | both, in sequence |
| `CaDS: Host tests` (default test) | `cmake --preset host && cmake --build build/host && ctest --test-dir build/host -E '^golden_'` (headless SDL2) |
| `CaDS: Golden images (informativ)` | the two golden-image tests, expected to differ by SDL rounding in the container (see notes) |
| `CaDS: RAM budget` | `python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf` |

`launch.json`: **Debug CaDS Zero (Board im Browser)** – cortex-debug, `servertype: external`,
`gdbTarget: 127.0.0.1:3333`, SVD `targets/itsboard/STM32F429.svd`, `preLaunchTask: CaDS: Build + Flash`,
`overrideLaunchCommands: ["monitor reset halt"]`, `runToEntryPoint: main`; plus an attach variant.

## Building and running locally

Requires Docker with BuildKit and a GitHub login (`gh auth login`) that can read the private
cads-zero repo. The token is passed as a build secret and never stored in the image.

```sh
cp .env.example .env          # set FIRMWARE_LAB_PASSWORD
scripts/run-local.sh          # build + run on http://127.0.0.1:8084
scripts/run-local.sh --fresh  # re-seed the workspace volume
scripts/run-local.sh --stop
```

Or with compose: `GH_TOKEN=$(gh auth token) docker compose build && docker compose up -d`.

Manual build: `GH_TOKEN=$(gh auth token) docker build --secret id=gh_token,env=GH_TOKEN -t cads-firmware-lab .`
Build args: `CADS_ZERO_REF` (commit to seed), `CADS_SKIP_HOST_BUILD=1`, `CADS_KEEP_HOST_BUILD=1`.

The build takes a while (toolchain download ≈150 MB, firmware and host builds); on the 2-CPU
Docker Desktop VM used for development it is 20–40 minutes, on the lab host a few minutes.

CI: `.github/workflows/image.yml` builds amd64 and arm64 natively and pushes a multi-arch
manifest to `ghcr.io/scimbe/cads-firmware-lab` (`<branch>-<shortsha>`, `<branch>`, `latest` on
`main`). It needs the repository secret `CADS_ZERO_TOKEN` (see `docs/IMAGE-NOTES.md`).

Lab deployment (`docker run`, no compose, port `127.0.0.1:8083`; add
`-e CMAKE_BUILD_PARALLEL_LEVEL=<n>` on small hosts):

```sh
docker run -d --name firmware-lab -p 127.0.0.1:8083:8080 \
  -e PASSWORD=... -e TUTOR_LLM_BASE_URL=... -e TUTOR_LLM_API_KEY=... -e TUTOR_LLM_MODEL=... \
  -v firmware-lab-workspace:/home/coder/workspace cads-firmware-lab
```

## Tests

- Shims: `python3 -m unittest discover -s tests/shims -v` (mock HTTP bridge, no Docker).
- Image: the firmware build and host `ctest` run inside `docker build`; a failing build fails the image.
- Browser: see `docs/IMAGE-NOTES.md` for the Playwright checks done against the local container.

## Status and known gaps

See [`docs/IMAGE-NOTES.md`](docs/IMAGE-NOTES.md) for verification results, image size, build
times, and every deviation from the spec. Legacy directories from the previous OpenOCD-based
lab (`example-firmware/`, `vscode-extension/codereview-tutor.vsix`) are not used by the image
anymore; `webusb-flash/vendor/webstlink-src` is the hardware-verified driver source the
`cads-probe` stream ports from.

## Repository layout (SPEC §7)

```
Dockerfile, docker-compose.yml, .dockerignore
image/entrypoint.d/10-seed-workspace.sh   workspace seed + .vscode/.clangd templates
image/vscode-templates/                   settings/tasks/launch/extensions.json, clangd.yaml
image/settings/user-settings.json         code-server user settings
image/shims/st-flash, st-info             bridge HTTP shims (+ cads_shim_common.py)
tests/shims/                              unittest suite for the shims
scripts/run-local.sh                      build + run on 127.0.0.1:8084
extensions/                               cads-probe, cads-board-bridge, cads-tutor (other streams)
courses/                                  course packs (other stream)
docs/SPEC.md, docs/IMAGE-NOTES.md
```

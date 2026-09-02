# Image notes – status, verification, deviations (stream `image`)

Last updated: 2026-09-02. Companion to `docs/SPEC.md` §4; this file records what the image
actually does, what was verified and how, and where it deviates from the spec.

## Verification log (2026-09-02, local Mac, Docker Desktop VM arm64, 2 CPU / 2 GB)

**Image build** (`docker build --secret id=gh_token,env=GH_TOKEN`, arm64):

| Step | Result |
|---|---|
| ARM GNU 13.3.rel1 aarch64 tarball, SHA-256 check | OK (`arm-none-eabi-gcc (Arm GNU Toolchain 13.3.Rel1 (Build arm-13.24)) 13.3.1 20240614`) |
| cads-zero clone at `e882fab`, 6 submodules, shallow | OK, 187 MB incl. `.git` |
| `cmake --preset itsboard && cmake --build build/itsboard` | OK, `cads-zero.bin` 327 076 B, `cads-zero.elf` 2.6 MB, `compile_commands.json` present |
| `scripts/check_ram_budget.py build/itsboard/cads-zero.elf` | `PASS: 928 B of margin, budget is 256 B` |
| `cmake --preset host && cmake --build build/host && ctest` (headless SDL2) | 35/37 pass; `golden_splash`, `golden_boot_desktop` fail on SDL rounding (see below) |
| Open VSX extensions | cortex-debug 1.13.0-pre6, peripheral-viewer 1.6.3, debug-tracker 0.0.15, memory-view 0.0.29, rtos-views 0.0.16, cmake-tools 1.23.52, vscode-clangd 0.6.0, python 2026.4.0 (+debugpy, python-envs) |
| CaDS VSIX (`extensions/*/dist/*.vsix`) | 0 found at build time (other streams not merged yet) – build succeeds without them by design |
| Image size | **3.76 GB** uncompressed (`docker images`), 1.07 GB compressed content; toolchain pruned 930 → 377 MB |
| Build time | first full build ≈ 15 min (apt 89 s, toolchain download 65 s, clone 34 s, firmware 47 s, host build+tests ≈ 4 min, extensions ≈ 3 min, plus image export); rebuild with cached apt/toolchain ≈ 3 min |

**Container** (`docker run … -p 127.0.0.1:8084:8080 -e PASSWORD=…`, fresh volume):

- entrypoint log: `[cads-seed] seeding … seed complete … wrote .vscode/{settings,tasks,launch,extensions}.json and .clangd (gdb: /usr/bin/gdb-multiarch) … ready`
- `git status` in the seeded workspace is clean (skip-worktree on the four `.vscode` files, `.clangd` excluded, lwip `ignore=dirty`); `CMAKE_HOME_DIRECTORY` in the seeded cache equals the workspace path.
- `PATH` in a non-login and a login shell starts with `/usr/local/bin:/opt/arm-gnu-toolchain/bin`; `which st-flash st-info arm-none-eabi-gdb arm-none-eabi-gcc clangd` → `/usr/local/bin/st-flash`, `/usr/local/bin/st-info`, `/usr/local/bin/arm-none-eabi-gdb` (→ gdb-multiarch 16.3), `/opt/arm-gnu-toolchain/bin/arm-none-eabi-gcc`, `/usr/bin/clangd`.
- `st-info --probe` → `Board-Bridge nicht aktiv – Board im Browser verbinden (CaDS Board Panel)`, exit 1.
  `st-flash erase` → `error: erase is not permitted by CaDS lab policy (no mass erase, docs/SAFETY.md)`, exit 1.
  `st-flash write build/itsboard/cads-zero.bin 0x08000000` without bridge → same German hint, exit 1.
- Shim unit tests: `python3 -m unittest discover -s tests/shims` → 24 tests OK (mock HTTP bridge).

**Browser** (`e2e/image-smoke.mjs`, headless Chromium, own instance):

- Login with the password → redirect to `/?folder=/home/coder/workspace/cads-zero`. ✔
- Title `cads-zero — CaDS Firmware Lab`, no "Restricted Mode", Explorer shows the cads-zero tree, no notifications after a clean load; CMake Tools status bar present (shows "No Configure Preset Selected" until the student picks `itsboard`). ✔
- `Tasks: Run Task` lists exactly `CaDS: Build`, `CaDS: Flash`, `CaDS: Host tests`, `CaDS: RAM budget`, `CaDS: Build + Flash`. ✔
- `CaDS: Build` started from the task picker: `ok - CaDS: Build produced cads-zero.bin (327076 bytes) in 14 s` (binary deleted and `targets/itsboard/main.c` touched beforehand, so the task really compiled and linked). ✔ (one successful run while the VM had memory, see below)
- Terminal check `st-info --probe` inside the integrated terminal: **not completed in the browser on this machine**. The 2 GB Docker VM is shared with other streams' code-server containers (`cads-lab-8085` ≈430 MB, `cads-tutor-e2e` ≈610–675 MB, the old `firmware-lab` on 8083 ≈520 MB until it was stopped); whenever this container passes ≈370–850 MB (extension host + clangd + ninja) the VM's OOM killer terminates it (docker events: `oom`, `die exit=137`; 9 restarts over the session). Retrying blindly risks the OOM killer picking another stream's container instead, so the run was stopped. The same check passes via `docker exec` (see above). Repeat with `node e2e/image-smoke.mjs` on the lab host or when the VM has ≈500 MB free.

## Deviations from SPEC §4 and decisions

- **Toolchain GDB does not run on Debian 13 → `gdb-multiarch` is used.** Verified in the
  built base image (arm64): `arm-none-eabi-gdb` from 13.3.rel1 needs `libncurses.so.5` /
  `libtinfo.so.5`, which Debian 13 no longer ships; symlinking the ncurses 6 libraries fails on
  versioned symbols (`NCURSES_5.x not found`). The x86_64 build additionally needs
  `libpython3.8`. The spec's fallback applies: `launch.json`/settings point cortex-debug at
  `/usr/bin/gdb-multiarch` (Debian 16.3, ARM targets built in), chosen at container start by
  the seed script (it re-checks the toolchain gdb, so an image on a distro that has ncurses 5
  would pick it automatically). In addition `/usr/local/bin/arm-none-eabi-gdb` is a wrapper
  that execs the working gdb, so cads-zero's docs/scripts keep working by name. The rest of
  the toolchain (gcc, binutils, objcopy, nm, size) is unaffected – cortex-debug's
  `armToolchainPath` still points at `/opt/arm-gnu-toolchain/bin`.
- **Golden-image tests excluded from the image smoke test.** `ctest` in the host build
  passes 35/37; `golden_splash` and `golden_boot_desktop` differ by +1 on anti-aliased edge
  pixels (18866 and 14273 of 153600), which cads-zero's own ROADMAP (2026-09-01) root-caused
  to SDL's RGB565→24bpp conversion rounding differently per SDL build – the goldens were
  regenerated with the maintainer's SDL, Debian's SDL2 2.32 rounds differently. The image
  build runs `ctest -E '^golden_'` as the gate and the golden tests informationally. The
  workspace task `CaDS: Host tests` runs the full suite, so students *will* see these two
  failures. **Open for the courses stream / cads-zero maintainer:** either regenerate the
  goldens inside the container (`update_golden` target) and commit them upstream, or teach
  M8 (Qualität) to expect and explain the difference.

- **clangd binary installed from Debian (`clangd` 19).** The spec lists only the
  `llvm-vs-code-extensions.vscode-clangd` extension; without a binary it would try to download
  one at runtime, which must not be a dependency of the lab. `clangd.path=/usr/bin/clangd` is set.
- **`build-essential` and `pkg-config` added** – the `host` preset needs a native compiler and
  SDL2 is found via pkg-config on Debian.
- **Workspace `.vscode/extensions.json` is replaced too** (not listed in the spec): cads-zero's
  own file recommends `ms-vscode.cpptools` (not on Open VSX) and un-recommends clangd, which in
  the container is the IntelliSense engine. All four `.vscode/*.json` files are marked
  `skip-worktree` so the student's `git status` stays clean; `.clangd` is added to
  `.git/info/exclude`.
- **Seed is built at the runtime path** (`/home/coder/workspace/cads-zero`) in a separate build
  stage and then copied to `/opt/cads-seed/cads-zero`. CMake caches and `compile_commands.json`
  contain absolute paths; building at `/opt/cads-seed` would leave a cache that refuses to
  configure after the copy. The entrypoint also removes a build tree whose cached source path
  differs from the workspace path, as a safety net.
- **`build/host` is removed from the seed by default** (`CADS_KEEP_HOST_BUILD=1` keeps it). The
  host test run still happens during the image build; `build/itsboard` (incl. object files and
  `compile_commands.json`) is kept.
- **Seed branch**: the pinned commit is checked out on a local branch `cads-lab` (detached HEAD
  confuses students; nothing else depends on the name).
- **Multi-arch**: the Dockerfile handles `amd64` and `arm64`; only `arm64` was built here (the
  development Docker VM is aarch64). The `amd64` path differs only in the toolchain tarball
  name and checksum, both taken from the official `.sha256asc` files on developer.arm.com.
- **st-info field flags** (`--serial`, `--chipid`, `--flash`, `--sram`, `--descr`, `--pagesize`)
  are implemented on top of `GET /probe` by parsing the st-info-format text, so the bridge only
  needs to implement `/probe` as specified.
- **Legacy content** (`example-firmware/`, `vscode-extension/codereview-tutor.vsix`,
  `webusb-flash/`) is left in the repo but excluded from the build context via `.dockerignore`.
  Removing it is a repo-level decision for the `next` branch, not this stream's.

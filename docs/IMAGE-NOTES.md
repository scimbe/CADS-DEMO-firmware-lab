# Image notes – status, verification, deviations (stream `image`)

Last updated: 2026-09-02. Companion to `docs/SPEC.md` §4; this file records what the image
actually does, what was verified and how, and where it deviates from the spec.

## Verification log

_(filled in below as the local build and the browser checks complete)_

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

# firmware-lab

A browser-based IDE for hardware/firmware work: [code-server](https://github.com/coder/code-server)
(VS Code, served over HTTP) plus OpenOCD and the `arm-none-eabi` toolchain, with an ST-Link USB
debug probe passed through to the container — program and debug real boards entirely from a
browser tab, no local toolchain install.

It also ships the [codereview](https://github.com/scimbe/CADS-DEMO-codereview) VS Code extension
in a repurposed **tutor mode**: instead of reviewing pull requests, it walks through the bundled
example firmware as a guided lesson with two hands-on exercises, logging every step viewed and
every exercise attempt to `tutor-session.log`. The IDE is fully usable for free-form coding
alongside the tutor — it's not a locked-down teaching mode.

Each lesson step also has an optional **"Ask about this step"** panel backed by a real LLM
(`LITELLM_BASE_URL`/`LITELLM_API_KEY`/`LITELLM_DEFAULT_MODEL` in `.env` — see `.env.example`).
Fully optional: leave `.env` absent and the rest of the tutor works exactly the same, the Ask
panel just reports itself unconfigured. **`LITELLM_BASE_URL` must be `https://`, not `http://`** —
see the comment in `.env.example` for why (it silently 401s instead of failing loudly at startup).

## Status (2026-08-30)

Verified with real hardware by Maintainer `cads zero` (Nucleo-F429ZI + onboard ST-Link/V2-1):
- Container builds clean, code-server serves and password-authenticates.
- Both extensions (cortex-debug, the codereview tutor mode) install and register correctly for
  the runtime user.
- `example-firmware/`'s register addresses and `linker.ld`'s memory map were cross-checked
  against this board's actual RM0090-derived CMSIS header and confirmed correct (no changes
  needed): `RCC_AHB1ENR`=0x40023830, GPIOB base=0x40020400 (MODER 0x00, ODR 0x14), `GPIOBEN`=bit 1,
  2048K flash, 192K SRAM.

**Known limitation, confirmed real (2026-08-30): USB passthrough does not work under Docker
Desktop for Mac.** `openocd -f openocd.cfg -c "init; exit"` fails with `Error: open failed` —
reproduced as the `coder` user, as root, and even with `--privileged` bypassing
`device_cgroup_rules` entirely, which rules out a permissions/cgroup bug. `/dev/bus/usb` node
timestamps inside the container predate the actual probe connection — Docker Desktop for Mac's
LinuxKit VM does not forward live host USB through that path the way native Linux Docker does.
Host-side `st-info --probe` worked fine throughout, confirming the board/probe/compose logic are
all sound; this is specifically a Docker-Desktop-macOS gap. `device_cgroup_rules` +
`/dev/bus/usb` remains the textbook-correct approach on a **native Linux Docker host** — if you're
on macOS, either run this container on a Linux host/VM instead, or bridge with `usbip` (the
standard macOS workaround; more setup, not yet attempted here).

**Verified workaround for build-in-browser + flash-from-host on macOS** (cads zero, 2026-08-30):
build inside the container as normal, then copy the binary out and flash it with a host-side
toolchain instead of OpenOCD-in-container:

```sh
docker cp firmware-lab:/home/coder/workspace/build/firmware.bin ./firmware.bin
st-flash write ./firmware.bin 0x08000000
```

The `docker cp` step (not a direct host path) is required because `/home/coder/workspace` is a
named Docker volume, not a bind mount — there's no host-side path to reach into directly.
Confirmed working end to end: a live GDB attach after flashing showed real execution in the
example firmware's `delay()` loop, not stuck at reset. This sidesteps the USB-passthrough gap
entirely (the host's own `st-link`/`st-flash` tools talk to the probe directly), at the cost of
needing those tools installed on the host and Docker CLI access to `docker cp` from it.

**A second, generally preferable alternative: `webusb-flash/`, a browser-native flash app.**
Sidesteps the Docker-USB-passthrough gap entirely by not going through the container at all —
your browser talks WebUSB directly to the ST-Link, no host toolchain, no `docker cp`. Built on
[devanlai/webstlink](https://github.com/devanlai/webstlink) (MIT), vendored in
`webusb-flash/vendor/webstlink-src/` with real, hardware-verified fixes (see that directory's
files' own "CADS:" comments for exactly what was fixed and why — chip-reset-vs-halt on `unlock()`
was the deepest one, root-caused by cads zero against a real CaDS Zero board's hardware watchdog).
Open `webusb-flash/index.html` in Chrome/Edge (needs `https://` or `localhost`, not `file://`),
click Connect, pick a built `.bin`, click Flash. Complements the container's OpenOCD path — it
doesn't replace it, since a browser without WebUSB support (or on a locked-down machine) still
needs the container path to work.

## Why code-server, not `linuxserver/docker-vscode`

The operator's original reference point was `linuxserver/docker-vscode`. After a comparative
review: that image streams a full GUI desktop via Selkies (GPL-3.0, heavier, grants passwordless
root to the GUI user) — unnecessary weight and attack surface for a browser-IDE-only use case.
code-server is a thin, MIT-licensed wrapper around real VS Code Server, single process, no GUI
desktop underneath. Eclipse Theia was also considered and ruled out (framework overkill, its own
Open VSX friction). OpenOCD (scriptable, headless) was chosen over STM32CubeProgrammer/CubeIDE
for the same reason — this needs to be driven from a thin browser session, not a desktop GUI tool.

## Running

```sh
export FIRMWARE_LAB_PASSWORD=choose-a-real-password
docker compose up -d --build
```

Then visit `http://127.0.0.1:8083` (or the tunneled hostname once deployed) and log in with
`FIRMWARE_LAB_PASSWORD`. Password auth only — there is no TLS termination in this container by
design, same as every other origin in this system: it's reached through a ct-agent tunnel that
terminates TLS at the edge, never a directly exposed host port.

### Using a different board

The bundled example targets a Nucleo-F429ZI (onboard ST-Link/V2-1, no external probe needed);
`openocd.cfg`'s `target/stm32f4x.cfg` also covers other F4 boards (e.g. an F401RE) unchanged,
since chip ID is auto-detected. For a non-F4 board, edit `example-firmware/openocd.cfg` (swap the
`target/*.cfg` include) and adjust `linker.ld`'s memory sizes and `main.c`'s register
addresses/LED pin for your MCU family.

### USB passthrough on the host

Docker's `device_cgroup_rules: ["c 189:* rmw"]` plus a bind mount of `/dev/bus/usb` (see
`docker-compose.yml`) is used instead of a pinned `--device=/dev/bus/usb/BBB/DDD` (breaks on
replug/renumbering) or `--privileged` (unnecessary full host access). For non-root USB access to
the probe on the host itself, add a udev rule, e.g. for a standard ST-Link/V2:

```
# /etc/udev/rules.d/49-stlink.rules
ATTRS{idVendor}=="0483", ATTRS{idProduct}=="3748", MODE="660", GROUP="plugdev", TAG+="uaccess"
```

## Building blocks

- `Dockerfile` — code-server + OpenOCD + arm-none-eabi toolchain + cortex-debug + the codereview
  tutor-mode extension.
- `docker-compose.yml` — runtime config: password from env, workspace volume, USB passthrough.
- `example-firmware/` — the bundled STM32F429ZI blink example: `main.c`/`startup.s`/`linker.ld`
  (no vendor SDK dependency), `Makefile`, `openocd.cfg`, and `.vscode/tasks.json`+`launch.json`
  wired for build/flash/debug.
- `vscode-extension/codereview-tutor.vsix` — built from
  [CADS-DEMO-codereview, branch `feature/firmware-tutor-mode`](https://github.com/scimbe/CADS-DEMO-codereview/tree/feature/firmware-tutor-mode).
  Rebuild with `npm run compile && npx @vscode/vsce package --no-dependencies -o vscode-extension/codereview-tutor.vsix`
  from that repo's `vscode-extension/` directory, then copy the output here.
- `webusb-flash/` — the browser-native flash app described above: `index.html` + `app.js` (this
  repo's own code), `vendor/webstlink-src/` (vendored, patched upstream library).

## Manifest / packaging

Not yet packaged — per this project's own process, that step (writing/signing the marketplace
manifest, publishing to the registry) belongs to Tester Main once the source above is functionally
verified, not this repo's own maintainer. See `docs/DEMO-PORTFOLIO.md` in `dev-workspace` for the
overall demo-portfolio tracking.

# Developer documentation – CaDS Firmware Lab

Entry point for everyone who changes the lab itself. Students and course authors use the
[user documentation](https://github.com/scimbe/CADS-DEMO-firmware-lab-docs); operators use the
private ops-docs site. The repository README explains the build per component.

| Document | What it is | Binding? |
|---|---|---|
| [SPEC.md](SPEC.md) | Architecture and interface specification v1: goal, verified facts, system architecture, the three extensions and their commands/ports/exports (§3), image and workspace (§4), courses (§5), multi-user sketch (§6), repository conventions (§7). | **Yes** – interface changes only through this file. |
| [ADRS.md](ADRS.md) | Architecture decision records: ADR-001 hardware access in the web-worker extension host, ADR-002 GDB-RSP server in the bridge + cortex-debug `external`, ADR-003 cads-zero as workspace with ARM GNU 13.3.rel1, ADR-004 courses as plugins, ADR-005 multi-user with path routing and a host-process broker, ADR-006 operating flags in the image CMD. | Yes |
| [MULTIUSER.md](MULTIUSER.md) | Multi-user design v1: one hostname, `/s/<slug>/` routing, Keycloak gate, broker as host process, idle reaper, open points with the tunnel side. Implementation in `deploy/multiuser/` ([README](../deploy/multiuser/README.md)). | Design |
| [COURSE-AUTHORING.md](COURSE-AUTHORING.md) | Course pack format v1 for authors: directory layout, `course.json`, step front matter, check types, grounding and objectives. Packs: [courses/README.md](../courses/README.md). | Format contract |
| [IMAGE-NOTES.md](IMAGE-NOTES.md) | Image stream: verification log (build, container, browser), image size, CI, every deviation from SPEC §4 with reason (gdb-multiarch, configureOnOpen off, golden tests, clangd binary, seed path). | Notes |
| [TUTOR-LAB-NOTES.md](TUTOR-LAB-NOTES.md) | Tutor-lab stream: the second image (`images/tutor-lab`, `ghcr.io/scimbe/cads-tutor-lab`) for the Rust/JavaScript tracks – verification log, size against the 1.5 GB target, cross-architecture pin checks, CI, and the deviations (terminal cwd, telemetry variables not yet read, the https requirement). | Notes |
| [TUTOR-NOTES.md](TUTOR-NOTES.md) | Tutor stream: deviations from SPEC §3.3 (webview panel, sqlite feature detection, ELF parser fallback, check-in policy), known limits, container integration test. | Notes |
| [BRIDGE-NOTES.md](BRIDGE-NOTES.md) | Bridge stream: B0 feasibility (web extension in the worker, USB/serial reachable), B1 driver port, B2 RSP server/HTTP shim, B3 hardware verification with real Chrome and the ITSboard (flash, F5, step, replug, measurements), WebSerial chooser limitation, ST-Link wedge recovery. Evidence in [evidence/](evidence/). | Notes |

## Streams and where their code lives

| Stream | Code | Tests |
|---|---|---|
| image | `Dockerfile`, `image/`, `tests/shims`, `e2e/image-smoke.mjs`, `.github/workflows/image.yml` | image build (firmware + host ctest), shim unittest, browser smoke test |
| tutorlab | `images/tutor-lab/`, `e2e/tutor-lab-smoke.mjs`, `scripts/run-local-tutor-lab.sh`, `.github/workflows/image-tutor-lab.yml` | image build (cargo build/test and node --test in the seed), browser smoke test |
| bridge | `extensions/cads-probe`, `extensions/cads-board-bridge` | node:test against a simulated ST-Link/STM32F429; RSP against real `gdb-multiarch`; hardware run (BRIDGE-NOTES B3) |
| tutor | `extensions/cads-tutor` | node:test; `scripts/tutor-e2e-container.sh` + `e2e/tutor/` |
| courses | `courses/*` | `scripts/validate-courses.py` |
| multiuser | `deploy/multiuser/` | `broker/test_fl_broker.py`, `broker/it_local.sh`, stub-gate end-to-end |
| docs | user docs repository, ops-docs, this directory | Jekyll build + link check in the docs repository |

## History

The previous lab (example firmware, OpenOCD in the container, server-side USB pass-through, a
separate WebUSB flash tab) is kept under `example-firmware/`, `vscode-extension/` and
`webusb-flash/` for reference only; it is excluded from the build context. Its driver source
`webusb-flash/vendor/webstlink-src` is what `cads-probe` ports from.

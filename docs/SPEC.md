# CaDS Firmware Tutor – Architektur- und Schnittstellenspezifikation (v1, 2026-09-02)

Verbindlich für alle Arbeitsstränge. Änderungen an Schnittstellen nur über diese Datei.

## 0. Ziel

Browser-IDE (code-server 4.135 / VS Code 1.135) auf https://firmware-lab-34a13a96.bunsenbrenner.org, in der
Studierende die Firmware **CaDS Zero** (https://github.com/scimbe/cads-zero, STM32F429ZI / ITSboard) bauen,
**flashen, debuggen (Breakpoints, Stepping, Register, SVD) und die serielle Konsole nutzen** – mit dem Board am
**eigenen Rechner der Studierenden** (WebUSB/WebSerial im Browser), so wie Entwickler es aus einer Desktop-IDE
kennen (Build-Task, F5, Debug-Toolbar, Terminal). Dazu ein vollständiges, erweiterbares Tutor-Programm
(Kurse als Plugins, Bloom-Taxonomie, sokratische Begleitung, proaktive Hinweise).

## 1. Verifizierte Fakten (Grundlage der Architektur)

- code-server 4.135.0 (Code 1.135.0, commit de89acbc…). Login = Passwort (`$PASSWORD`), kein OIDC im Container.
- Der **Web-Worker-Extension-Host** läuft in einem iframe mit `allow="usb; serial; hid; …"`. Im Worker sind
  `navigator.usb`, `navigator.serial`, `navigator.hid` definiert (empirisch, 2026-09-02, lokaler Container).
- Die Workbench-Kommandos `workbench.experimental.requestUsbDevice`, `…requestSerialPort`, `…requestHidDevice`
  existieren in diesem Build. Sie öffnen den nativen Chooser (User-Gesture im Hauptfenster); danach liefert
  `navigator.usb.getDevices()` / `navigator.serial.getPorts()` im Worker das freigegebene Gerät.
- Webview-iframes sind same-origin (`allow-same-origin`), `usb`/`serial` sind dort per Default-Allowlist `self`
  ebenfalls nutzbar – **Fallback**, falls Web-Extensions in code-server nicht im Worker laufen.
- Server-seitiges USB-Passthrough ist architektonisch falsch (Board hängt beim Studierenden) und funktioniert
  unter Docker Desktop macOS ohnehin nicht. Wird entfernt.
- Deployment heute: Services-Host, `docker run` (kein Compose!), Port 127.0.0.1:8083, ct-agent-Tunnel
  (Browser-Plane, SNI-Passthrough). **Bug:** der `docker run` setzt `--disable-workspace-trust` nicht →
  Restricted Mode → alle Extensions aus, Student ist verloren. Fix: Flags in den Image-CMD, nicht ins Compose.
- Labor-Host "cads-lambda": Ubuntu x86_64, 36 CPU, 125 GB RAM, Docker 29.7. Ein Container, kein Pool.
- Hardware hier am Mac: ST-Link V2-1 (VID 0x0483 PID 0x374B, Serial 066FFF565282494867161033),
  VCP `/dev/cu.usbmodem1303` (Konsole, 115200). `/dev/cu.usbmodemABC1234567892` ignorieren.
- cads-zero: CMake ≥3.21 + Ninja, `cmake/arm-none-eabi-gcc.cmake`, Presets `itsboard` und `host`, Toolchain
  ARM GNU 13.3.1 (`CADS_ARM_TOOLCHAIN_BIN` oder PATH), Artefakte `build/itsboard/cads-zero.{elf,bin,hex}`,
  SVD `targets/itsboard/STM32F429.svd`, Flash nur 0x08000000–0x080FFFFF, **nie Mass-Erase** (docs/SAFETY.md).
  Skripte erwarten `st-flash`/`st-info` und einen seriellen Port (`scripts/cads_serial.py`).
- LLM: `TUTOR_LLM_BASE_URL=https://llm-34a13a96.bunsenbrenner.org/v1`, Modell `local-devstral-small2`
  (Key in `.env`, nie committen). `@cads/tutor-platform` v0.12 (Grounding/BM25, Bloom, CurriculumGraph,
  Mastery, LearningEvents/SQLite, `TutorSession.ask()/checkIn()`), Content-Pack `firmware` (155 Chunks).

## 2. Systemarchitektur

```
Browser des Studierenden                                  Container (code-server, Labor/Services)
┌───────────────────────────────────────┐   WebSocket   ┌──────────────────────────────────────────┐
│ VS Code Workbench (code-server UI)    │◄─────────────►│ Node-Extension-Host                       │
│  ├─ Web-Worker-Extension-Host         │  executeCommand│  ├─ cads-board-bridge (Node)               │
│  │   └─ cads-probe (Web-Extension)    │  (beide Richt.)│  │   ├─ GDB-RSP-Server 127.0.0.1:3333      │
│  │       ├─ WebUSB  → ST-Link (SWD)   │               │  │   ├─ Serial-PTY + TCP 127.0.0.1:3334     │
│  │       └─ WebSerial → VCP Konsole   │               │  │   ├─ HTTP-Shim-API 127.0.0.1:3335        │
│  └─ Webviews (Tutor-Step, Board-Panel)│               │  │   └─ Statusbar, Flash/Reset-Commands     │
└───────────────────────────────────────┘               │  ├─ cads-tutor (Node)  ← Kurs-Plugins       │
        ▲ USB                                           │  ├─ cortex-debug (servertype external)      │
   ST-Link + ITSboard                                   │  ├─ clangd, cmake-tools, peripheral-viewer  │
                                                        │  └─ Shims: st-flash, st-info → 3335         │
                                                        │ Workspace: /home/coder/workspace/cads-zero  │
                                                        └──────────────────────────────────────────┘
```

Drei Extensions (getrennte VSIX, ein Monorepo):

| Extension | Host | Aufgabe |
|---|---|---|
| `cads-probe` | Web-Worker (browser-Entry, kein main) | WebUSB-ST-Link-Treiber (Port von webstlink: stlinkv2/stm32fs, inkl. der hardware-verifizierten CADS-Fixes: **halt statt reset** vor Flash), WebSerial-VCP, Geräte-Reconnect via `getDevices()`, Polling des Core-Zustands |
| `cads-board-bridge` | Node (Container) | GDB-Remote-Server (RSP) über die Probe; Serial-PTY/TCP; HTTP-API für die `st-flash`/`st-info`-Shims; Commands Connect/Flash/Reset/Console; DebugConfigurationProvider für cortex-debug; Statusleiste; Exports-API für den Tutor |
| `cads-tutor` | Node (Container) | Kurs-Plugin-Loader, Session/Fortschritt, Step-Webview, Kurs-Tree, Checks, sokratischer Dialog (tutor-platform), proaktives Check-in bei Save/Build/Flash/Debug, Onboarding beim Start |

Kommunikation zwischen Hosts ausschließlich über `vscode.commands.executeCommand` (funktioniert host-übergreifend).

### 2.1 Fallback, falls Web-Extensions nicht im Worker laufen
`cads-board-bridge` öffnet eine `WebviewView` "CaDS Board" (`retainContextWhenHidden: true`) mit demselben
Treiber-Code; RPC über `postMessage`. Der Treiber-Code (`extensions/cads-probe/src/driver/**`) ist deshalb
**frei von VS-Code-API** und in beiden Umgebungen lauffähig. Entscheidung fällt in Meilenstein B0.

## 3. Schnittstellen

### 3.1 cads-probe (Web) – Commands
Alle Commands liefern JSON-serialisierbare Werte; Binärdaten als base64-Strings.

- `cads.probe.requestDevices({usb:true, serial:true})` → `ProbeStatus`. Ruft intern
  `workbench.experimental.requestUsbDevice({filters:[{vendorId:0x0483}]})` bzw. `…requestSerialPort({filters:[{usbVendorId:0x0483}]})`.
- `cads.probe.getStatus()` → `ProbeStatus`
- `cads.probe.op(request: ProbeOp)` → `ProbeResult` (ein Request; Bridge darf `ops:[...]` als Batch schicken:
  `{batch:[ProbeOp,...]}` → `{results:[ProbeResult,...]}`; Abbruch beim ersten Fehler).

```ts
type ProbeStatus = {
  usb: 'absent'|'connected'|'error'; serial: 'absent'|'open'|'error';
  stlink?: { version: string; serial?: string; targetVoltage?: number };
  target?: { coreId: number; chipId: number; devName?: string; flashSize?: number; sramSize?: number };
  core?: 'halted'|'running'|'reset'|'unknown'; lastError?: string;
};
type ProbeOp =
  | {op:'halt'} | {op:'run'} | {op:'step'} | {op:'resetHalt'} | {op:'resetRun'}
  | {op:'getState'}                                   // → {state:'halted'|'running', reason?: 'breakpoint'|'step'|'watchpoint'|'halt'|'fault'}
  | {op:'readMem', addr:number, len:number}           // → {data: base64}
  | {op:'writeMem', addr:number, data:string}         // base64
  | {op:'readRegs'}                                   // → {regs:number[]} r0-r15, xpsr, (msp, psp, primask, basepri, faultmask, control) = 23 Werte
  | {op:'writeReg', index:number, value:number}
  | {op:'setBreakpoint', addr:number}                 // FPB (Flash) oder SW-BKPT (RAM), Treiber entscheidet
  | {op:'clearBreakpoint', addr:number}
  | {op:'setWatchpoint', addr:number, len:number, kind:'read'|'write'|'access'}
  | {op:'clearWatchpoint', addr:number}
  | {op:'flash', addr:number, data:string, verify:boolean}   // erase+program+verify; Fortschritt per Event
  | {op:'serialOpen', baud:number} | {op:'serialWrite', data:string} | {op:'serialClose'};
type ProbeResult = { ok:true, [k:string]:any } | { ok:false, error:string, code?:'NO_DEVICE'|'USB_IO'|'TARGET_FAULT'|'UNSUPPORTED' };
```

Events Web → Node: `cads.bridge.event(ev: ProbeEvent)`; die Bridge registriert dieses Command.
```ts
type ProbeEvent =
  | {type:'usb-connect'|'usb-disconnect', status:ProbeStatus}
  | {type:'serial-open'|'serial-close'} | {type:'serial-data', data:string /*base64*/}
  | {type:'halted', reason:string, pc:number}          // vom Poller (≤100 ms) während 'running'
  | {type:'flash-progress', done:number, total:number, phase:'erase'|'program'|'verify'}
  | {type:'log', level:'info'|'warn'|'error', message:string};
```
Treiber-Anforderungen: Halt-statt-Reset vor Flash (IWDG!), Operationen serialisiert (Mutex), Timeouts auf jeder
USB-Transaktion, Reconnect nach Replug ohne erneuten Chooser, keine Mass-Erase-Operation im Code, Flash nur
innerhalb 0x08000000–0x080FFFFF (Bridge prüft zusätzlich).

### 3.2 cads-board-bridge (Node) – Commands, Ports, Exports
Commands: `cads.board.connect`, `cads.board.disconnect`, `cads.board.flash(path?)` (Default
`build/itsboard/cads-zero.bin` @0x08000000; ELF erlaubt → objcopy), `cads.board.reset`, `cads.board.halt`,
`cads.board.openConsole` (Terminal "CaDS Board Console"), `cads.board.status()` → `BoardStatus`,
`cads.board.showPanel`.
Ports (nur 127.0.0.1): **3333** GDB-RSP (cortex-debug `servertype:"external"`, `gdbTarget:"127.0.0.1:3333"`),
**3334** Serial-TCP (raw), **3335** HTTP-Shim-API:
- `GET /status` → `BoardStatus`; `POST /flash?addr=0x08000000` (Body: Binärdaten) → 200/4xx; `POST /reset`;
  `POST /halt`; `GET /probe` (st-info-Format).
Shims im Image (auf PATH vor allem anderen): `st-flash` (unterstützt `write <file> <addr>`, `reset`,
`--serial` wird ignoriert; `erase` → Fehler "not permitted"), `st-info --probe`. Zusätzlich
`socat pty,raw,echo=0,link=/home/coder/board-console tcp:127.0.0.1:3334` als Hintergrundprozess des Bridge, damit
`scripts/board_cmd.py --port /home/coder/board-console` und `CADS_CONSOLE_PORT` unverändert funktionieren.
RSP-Server: Pakete `?`, `g`, `G`, `p`, `P`, `m`, `M`, `X`, `c`, `s`, `vCont?`, `vCont;c/s`, `Z0/Z1/Z2/Z3/Z4`,
`z*`, `k`, `D`, `qSupported`, `qAttached`, `qXfer:features:read` (target.xml Cortex-M4F mit FPU-Registern
optional), `qXfer:memory-map:read` (Flash 0x08000000 2 MB Sektoren, RAM 0x20000000 192K, CCM 0x10000000 64K),
`vFlashErase/vFlashWrite/vFlashDone` (→ probe.flash), `qRcmd` (`reset`, `reset halt`, `halt`), Ctrl-C (0x03)
→ halt, Stop-Reply `T05` mit `thread:1`, `qC`, `qfThreadInfo`, No-Ack-Mode. Memory-Read-Cache während 'halted',
Invalidierung bei run/step/write. Alle Probe-Aufrufe serialisiert; Fehler → `E01`-Antwort + Statusleiste.
DebugConfigurationProvider (type `cortex-debug`): liefert "Debug CaDS Zero (Board im Browser)" mit
`executable: ${workspaceFolder}/build/itsboard/cads-zero.elf`, `servertype: external`, `gdbTarget: 127.0.0.1:3333`,
`gdbPath: arm-none-eabi-gdb` (oder gdb-multiarch), `svdFile`, `preLaunchTask: "CaDS: Build + Flash"`,
`overrideLaunchCommands: ["monitor reset halt"]`, `runToEntryPoint: main`.
Exports (`vscode.extensions.getExtension('cads.cads-board-bridge').exports`):
```ts
interface BoardBridgeApi {
  getStatus(): BoardStatus;                              // {connected, serialOpen, core, lastFlash?:{file,addr,ok,at}, gdbClients:number}
  onDidChangeStatus(cb:(s:BoardStatus)=>void): Disposable;
  onSerialLine(cb:(line:string)=>void): Disposable;      // dekodiert, zeilenweise
  onEvent(cb:(e:{type:'flash-done'|'flash-failed'|'reset'|'debug-stop'|'debug-start'|'debug-end', detail?:any})=>void): Disposable;
  flash(file?:string): Promise<{ok:boolean; error?:string}>;
  sendSerial(text:string): Promise<void>;
  waitForSerial(pattern:RegExp, timeoutMs:number): Promise<string|null>;
}
```

### 3.3 cads-tutor (Node) – Kurs-Plugins, Commands, Session
**Kurs-Plugin-Quellen** (alle werden vereinigt, id-Kollision → Warnung, erste gewinnt):
1. Extensions mit `contributes.cadsTutorCourses: [{ "path": "courses/<dir>" }]` (echte Plugins, per VSIX installierbar),
2. Verzeichnisse `/opt/cads-tutor/courses/*` (Image), `~/.cads-tutor/courses/*` (Nutzer), `<workspace>/.cads-tutor/courses/*` (Projekt).
Commands: `cads.tutor.open`, `cads.tutor.gotoStep(courseId, stepId)`, `cads.tutor.runChecks(stepId?)`,
`cads.tutor.ask(question?)`, `cads.tutor.reloadCourses`, `cads.tutor.resetProgress`, `cads.tutor.setLanguage(de|en)`.
Views (Activity-Bar-Container "CaDS Tutor"): `cadsTutor.courses` (Tree: Kurs → Modul → Step, Status-Icons),
`cadsTutor.step` (Webview: Step-Inhalt, Aufgaben mit Check-Buttons + Live-Status, "Frag den Tutor"-Dialog mit
Bloom-Stufe und Hinweis-Tier, Links), `cadsTutor.progress` (Mastery je Objective).
Session: `<workspace>/.cads-tutor/session.json` (aktueller Kurs/Step, Task-Status, Antworten, Zeitstempel) +
LearningEvents via tutor-platform (`~/.cads-tutor/events.sqlite`). Onboarding: bei Aktivierung ohne Session →
Tutor-View öffnen, ersten Step zeigen, Statusbar "🎓 Tutor: <Step>"; `workbench.startupEditor=none`.
Proaktiv: `onDidSaveTextDocument` → `TutorSession.checkIn()` (debounced, nur Dateien des aktuellen Steps);
Bridge-Events `flash-failed`, `debug-stop`, Serial-Fehlermuster (`HardFault`, `configASSERT`, `RESULT: FAIL`) →
kontextbezogener Hinweis (sokratisch: Frage statt Lösung, Eskalation Tier 1→3 bei wiederholtem Fehlschlag).

**Kurs-Pack-Format (v1)** – Verzeichnis:
```
<course>/course.json
<course>/steps/<stepId>.en.md, <stepId>.de.md      (Front Matter YAML; de optional, Fallback en)
<course>/assets/**                                  (Bilder, Diagramme)
<course>/sources/**  (optional: Markdown-Referenzen für Grounding; sonst tutor-platform Pack "firmware")
```
```jsonc
// course.json
{ "id": "cads-zero-foundations", "version": "1.0.0", "schema": 1,
  "title": {"de": "…", "en": "…"}, "description": {"de": "…", "en": "…"},
  "project": { "root": "cads-zero", "repo": "https://github.com/scimbe/cads-zero" },
  "prerequisites": [],                       // andere Kurs-IDs
  "grounding": { "pack": "firmware", "threshold": 5.0 },
  "modules": [ { "id": "m0", "title": {"de":"…","en":"…"}, "steps": ["m0-01-welcome", "m0-02-connect"] } ] }
```
```yaml
# steps/m0-02-connect.en.md  (Front Matter)
---
id: m0-02-connect
title: Connect the board
bloom: apply                       # remember|understand|apply|analyze|evaluate|create
objectives: [cz.tooling.connect]   # IDs in content-packs/curriculum.json (tutor-platform); dürfen neu sein, dann im Pack unter curriculum.json ergänzen
requires: [m0-01-welcome]
estimatedMinutes: 10
links:
  - { step: m0-03-build }                    # Querverweis auf Step
  - { file: "scripts/cads_env.sh", line: 30 }
  - { doc: "docs/how-to/flash.md" }          # Datei im Projekt-Root
  - { url: "https://…", title: "…" }
tasks:
  - id: connected
    title: Board connected
    check: { type: board, state: connected }
  - id: build
    title: Firmware builds
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: edit
    title: Change the splash text
    check: { type: fileMatches, file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }
  - id: symbol
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_app_hello_main" }
  - id: flashed
    check: { type: flash, since: stepStart }
  - id: tap
    check: { type: serialExpect, send: "t\n", pattern: "RESULT: PASS", timeoutMs: 60000 }
  - id: bp
    check: { type: debugStop, file: "apps/bringup/explorer_app_demo.c", line: 120 }
  - id: reflect
    check: { type: question, prompt: {en: "Why …?", de: "Warum …?"}, rubric: "Mentions clock gating and RCC_AHB1ENR", bloom: analyze }
  - id: seen
    check: { type: manual }
socratic:
  - { trigger: "task:build:failed", question: {en: "…", de: "…"}, hints: [ {en:"…",de:"…"}, {…}, {…} ] }
---
Body: Markdown (GFM), Bilder relativ zu assets/, Code-Blöcke mit Sprachangabe. Links auf Steps: [Text](step:m0-03-build),
auf Dateien: [Text](file:core/hal/cads_hal.h#L42), auf Docs: [Text](doc:docs/HARDWARE.md).
```
Check-Typen (Bridge liefert board/flash/serialExpect/debugStop; Rest lokal): `board`, `task`, `build`
(= task mit Preset), `fileMatches`, `fileNotMatches`, `symbolInElf` (nm), `flash`, `serialExpect`,
`debugStop`, `question` (LLM-Rubrik, grounded; ohne LLM → manual), `manual`, `all`/`any` (Komposition).

## 4. Image und Workspace

- Basis `codercom/code-server:latest` (multi-arch). Installiert: ARM GNU Toolchain **13.3.rel1** (Tarball je
  `TARGETARCH`, unter `/opt/arm-gnu-toolchain`, `CADS_ARM_TOOLCHAIN_BIN` gesetzt), `cmake` (≥3.21, Debian
  bookworm 3.25 ok), `ninja-build`, `python3` + `pyserial`, `socat`, `git`, `clang-format`, `libsdl2-dev`
  (Host-Sim/Tests), `gdb-multiarch` (Fallback wenn Toolchain-gdb Python-abhängig fehlschlägt). **Kein OpenOCD,
  kein `/dev/bus/usb`.**
- Extensions (Open VSX): `marus25.cortex-debug`, `mcu-debug.peripheral-viewer`, `mcu-debug.debug-tracker-vscode`,
  `mcu-debug.memory-view`, `mcu-debug.rtos-views`, `ms-vscode.cmake-tools`, `llvm-vs-code-extensions.vscode-clangd`,
  `ms-python.python` (optional), plus die drei CaDS-VSIX aus `extensions/*/dist/*.vsix`.
- Workspace-Seed `/opt/cads-seed/cads-zero` (Clone mit Submodulen, pinned Commit, `--depth 1` + Submodules
  shallow), `entrypoint.d/10-seed-workspace.sh`: kopiert Seed nach `/home/coder/workspace/cads-zero`, falls dort
  kein `.git` liegt; legt `.vscode/{settings,tasks,launch}.json` (Container-Variante: `CaDS: Build`,
  `CaDS: Build + Flash`, `CaDS: Host tests`, `CaDS: Flash`) und `.clangd` (CompileFlags → build/itsboard) an.
  Ein vorkonfigurierter Build (`cmake --preset itsboard`) läuft im Image-Build als Test; `compile_commands.json`
  liegt danach vor.
- CMD im Image: `--bind-addr 0.0.0.0:8080 --app-name "CaDS Firmware Lab" --disable-workspace-trust
  --disable-telemetry --disable-update-check /home/coder/workspace/cads-zero` (damit `docker run` ohne Compose
  korrekt ist). User-Settings im Image (`~/.local/share/code-server/User/settings.json`): `workbench.startupEditor:
  none`, `security.workspace.trust.enabled:false`, `cmake.useCMakePresets: always`, `cmake.configureOnOpen: true`,
  `cadsTutor.autoOpen: true`, `editor.formatOnSave: true`, `clangd.arguments: ["--compile-commands-dir=build/itsboard"]`.
- Env: `TUTOR_LLM_BASE_URL/API_KEY/MODEL`, `PASSWORD`. Loopback-Port 8080 → Host 127.0.0.1:8083.

## 5. Kurse (Content, DE + EN, Bloom-Stufen, verlinkt)

`courses/cads-zero-foundations` (Pflicht, ~10 h): M0 Orientierung (IDE, Board verbinden, Build, Flash, Konsole,
Explorer-Kommandos) · M1 Firmware-Architektur (core/gui/services/apps/targets, HAL-Grenze, Sim vs. Board) ·
M2 Memory-mapped I/O & GPIO am ITSboard (LEDs, Taster, Adapter-Bänke, SAFETY-Pins) · M3 Debugging als Handwerk
(Breakpoints, Stepping, Register/SVD, Fault-Forensik `E`, Stack-Guard) · M4 FreeRTOS (Tasks, Stacks in CCM,
RAM-Budget-Skript, Mutex/SPI-Bus-Lektion) · M5 Display & GUI (4-bpp-Canvas, Dirty-Rects, eigene App im Menü) ·
M6 Storage & Konfiguration (littlefs, config-file, cads_config.py) · M7 Netzwerk (lwIP, statische IP, UDP-Hello,
DHCP-Stack-Lektion, Recon-Tools) · M8 Qualität (Unit-Tests, Golden Images, ctest im Container, Clean-Room, PR).
Jeder Step: Lernziel + Bloom-Stufe, Vorwissen-Links, 1–3 Aufgaben mit automatischen Checks, eine sokratische
Frage, Querverweise (step:/file:/doc:). Zweiter Kurs `courses/cads-zero-projects` (Wahl, Bloom create):
Projektaufgaben (eigene App, Netzwerk-Tool, Treiber) mit Rubriken. Alle Fakten aus cads-zero/docs, keine
erfundenen Register/Adressen; Zahlen aus docs/reference/measurements.md.

## 6. Multi-User (Entwurf, Abstimmung mit Labor/Tunnel)

Einstiegspunkt (Services): Login via Keycloak (`auth.bunsenbrenner.org`, Realm ct-demo) → Session-Broker
(kleiner Dienst) → pro Student ein Container `firmware-lab-<sub>` auf Labor (Docker API über ct-agent-A2A-Kanal),
eigenes Volume, eigenes `PASSWORD`/Token, Idle-Reaper. Routing: ein ct-agent-Tunnel je Container
(`fl-<sub>.bunsenbrenner.org`) **oder** ein Pfad-Router vor einem Tunnel (`/s/<sub>/` → code-server unterstützt
`--base-path`? nein → Hostname-Variante bevorzugen). Details in docs/MULTIUSER.md (eigener Strang).

## 7. Repository, Branch, Konventionen

- Monorepo: `scimbe/CADS-DEMO-firmware-lab`, Branch `next` (Clone: `~/Documents/git/CADS-DEMO-firmware-lab`).
  Layout: `Dockerfile`, `docker-compose.yml`, `image/` (entrypoint.d, settings, shims, vscode-templates),
  `extensions/cads-probe`, `extensions/cads-board-bridge`, `extensions/cads-tutor`, `courses/*`, `e2e/`
  (Playwright), `docs/` (dieses Dokument als Kopie + ADRs), `scripts/` (build-all, package-vsix, run-local).
- TypeScript strict, Node 22, `npm test` je Extension (node:test), esbuild-Bundles (`dist/`), VSIX via
  `@vscode/vsce package --no-dependencies` (Bundle enthält deps). Keine Secrets im Repo.
- Commits klein, konventionell (`feat(bridge): …`), Co-Authored-By-Trailer gemäß Session-Vorgabe.
- Hardware-Tests nur durch den Bridge-Strang (ein ST-Link!). SWD-Operationen mit Timeouts, nie `kill -9` auf
  laufende Flash-Vorgänge, `diskutil unmountDisk` für `NOD_F429ZI` nach Replug (siehe cads-zero/CLAUDE.md).
- "Fertig" heißt: gebaut, getestet, im lokalen Container (127.0.0.1:8083) mit Playwright verifiziert; für
  Hardware-Pfade zusätzlich mit echtem Board verifiziert.

---

# Addendum v1.1 (2026-09-03) – Lehraspekte und sprachunabhängige Tracks (Rust, JavaScript)

Gilt zusätzlich zu §3.3. Motivation: Erkenntnisse aus dem Firmware-Kurs (Lernziel zuerst, automatische Checks statt
`manual`, autorisierte Hinweis-Tiers je wahrscheinlicher Fehlerursache, Bloom-Progression, Querverweise) werden zur
Runtime-Funktion; dazu kommen Vorhersage-Aufgaben, Wiederholung, Fehlkonzept-Trigger und Modul-Reflexion.
Hardware-Checks bleiben unverändert; alles Neue ist sprachunabhängig.

## A1 Neue Check-Typen
```yaml
- id: build
  check: { type: command, cwd: ".", command: "cargo build", expectExitCode: 0, expectStdout: "regex?", expectStderr: "regex?", timeoutMs: 120000 }
- id: tests
  check: { type: testSuite, cwd: ".", runner: cargo | node-test | tap | custom, command: "optional override",
           expectPass: ["ch04::moves_string"], minPass: 3, expectFail: [] }
- id: guess
  check: { type: predict, prompt: {en: "…", de: "…"}, then: { type: command, command: "cargo run --bin ch04_move" },
           rubric: "optional LLM rubric comparing prediction and output", bloom: evaluate }
```
- `command`: läuft mit `/bin/sh -c` im Projekt-Root (`cwd` relativ dazu), Umgebung des Containers, Ausgabe wird
  gespeichert (`result.output`, max. 64 KB) und steht Triggern zur Verfügung. Ein `command`-Check ist bestanden, wenn
  Exit-Code und (falls gesetzt) die Regexe passen.
- `testSuite`: Runner `cargo` = `cargo test -- --format terse`-kompatibles Parsing (`test <name> ... ok|FAILED`),
  `node-test` = `node --test` (TAP-Ausgabe `ok N - name` / `not ok`), `tap` = generisches TAP, `custom` = `command`
  plus TAP-Parsing. Bestanden, wenn alle `expectPass` ok sind (und `minPass` erreicht, und alle `expectFail` fehlschlagen).
  Ergebnis enthält die Liste der Tests mit Status, damit Trigger (`test:<name>:failed`) feuern können.
- `predict`: Studierende schreiben zuerst eine Vorhersage (Textfeld, mindestens 10 Zeichen), erst dann wird `then`
  ausgeführt; das Panel zeigt Vorhersage und tatsächliche Ausgabe nebeneinander und stellt eine Reflexionsfrage
  (mit LLM: Rubrik-Vergleich; ohne LLM: Selbstbestätigung). Bestanden, wenn `then` besteht und eine Vorhersage vorliegt.
  Aufzeichnung als LearningEvent mit Bloom-Stufe (Default `evaluate`).

## A2 Neue Step-Felder (Front Matter)
```yaml
scaffold: worked | faded | independent   # Badge + Hinweis im Panel: worked = vollständig vorgemacht,
                                         # faded = Lücken, independent = eigenständig. Default independent.
recallFrom: [m1-02-borrowing]            # Wiederholung: beim Öffnen des Steps stellt das Panel EINE question-Aufgabe
                                         # aus einem der genannten (erledigten) Steps als kurze Abfrage ("Wiederholung"),
                                         # nicht blockierend, Antwort wird als LearningEvent (remember/understand) gespeichert.
misconceptions:                          # Fehlkonzept-Trigger auf Check-Ausgaben (Regex auf output/stderr aller Checks des Steps)
  - pattern: "error\\[E0382\\]"
    question: { en: "…", de: "…" }
    hints: [ {en,de}, {en,de}, {en,de} ]
```
`socratic`-Trigger werden erweitert: `task:<id>:failed|stuck`, `question:<id>:weak`, `test:<name>:failed`,
`output:<regex>` (äquivalent zu `misconceptions`, die Kurzform bleibt bevorzugt).

## A3 Modul-Reflexion und Fortschritt
`course.json` → `modules[].reflection: { prompts: [ {en, de}, … ] }`. Beim Abschluss des letzten Steps eines Moduls zeigt
das Panel eine Reflexionskarte (1–3 Prompts, Freitext, optional LLM-Feedback nach Bloom `evaluate`), speichert die
Antworten in der Session und als LearningEvents. Die Fortschrittsansicht zeigt je Modul: Steps erledigt, Checks
bestanden beim ersten Versuch vs. mit Hinweisen, Vorhersagen korrekt/abweichend, Reflexion vorhanden.

## A4 Kurse und Workspaces für Rust und JavaScript
- Packs: `courses/rust-foundations` (The Rust Programming Language, Kapitel 3–10, Objectives `rust-*` der Plattform
  wiederverwenden), `courses/javascript-foundations` (MDN JavaScript Guide, Objectives `javascript-*`). Struktur wie
  §3.3; `project.root` zeigt auf den jeweiligen Starter-Workspace.
- Starter-Workspaces im Monorepo: `workspaces/rust-foundations/` (Cargo-Projekt, je Step ein Modul/Übung mit Tests,
  `cargo test --test <step>` isoliert lauffähig) und `workspaces/javascript-foundations/` (`node --test`, je Step eine
  Datei `exercises/<step>.test.js`). Jede Übung hat eine Referenzlösung unter `solutions/` (nicht im Seed-Workspace,
  nur zur Validierung), und `scripts/validate-courses.py` prüft mit `--solutions`, dass alle `testSuite`/`command`-Checks
  mit der Referenzlösung bestehen und ohne Lösung fehlschlagen (Negativprobe – ein Check, der immer besteht, ist wertlos).
- Bloom-Progression wie im Firmware-Kurs; `scaffold` beginnt je Modul mit `worked`, dann `faded`, dann `independent`.
  Jeder Step ≥1 automatischer Check; `predict` mindestens einmal je Modul; `misconceptions` für die typischen
  Compiler-/Laufzeitfehler (Rust: E0382, E0499, E0502, E0106, E0308; JavaScript: TypeError undefined, ReferenceError,
  NaN, `==`-Fallen, `this`-Verlust, async ohne await).
- Image `ghcr.io/scimbe/cads-tutor-lab` (`images/tutor-lab/Dockerfile`): code-server + rustup stable (rustfmt, clippy,
  rust-analyzer) + Node 22 + Extensions (rust-lang.rust-analyzer, dbaeumer.vscode-eslint) + cads-tutor-VSIX + beide Packs
  + beide Workspaces (Seed nach `/home/coder/workspace/<name>`), dieselben User-Settings/CMD-Flags wie firmware-lab,
  `cadsTutor.autoOpen` öffnet den zuerst passenden Kurs zum geöffneten Workspace; Multi-Root-Workspace-Datei
  `/home/coder/workspace/cads-tutor.code-workspace` mit beiden Ordnern; Kurswahl über den Tutor-Tree.

## A5 Telemetrie und Lehrenden-Portal (2026-09-03)

**Zweck:** Lehrende sehen anonymisiert, wie Kurse funktionieren (meistgestellte Fragen, schwerste Steps, Auffälligkeiten,
sehr gute/sehr schwache Verläufe, Betrugsindikatoren), erhalten je Studierendem eine tiefe, pseudonyme Analyse und ein
Organisations-Board für Leistungsnachweise. Multi-Kurs, Multi-Lehrende.

**Pseudonymisierung:** Studierenden-ID = `slug` (sha256(lower(email))[:12], wie im Broker). Klarnamen liegen nur in einer
optionalen, vom Lehrenden gepflegten Zuordnungstabelle im Portal (Datei `roster.json`, nie in Events). Fragetexte werden vor
dem Versand von E-Mail-Adressen/URLs mit Zugangsdaten bereinigt.

**Event-Schema (JSON, append-only, ein Ereignis pro Zeile):**
```json
{ "v": 1, "ts": "2026-09-03T03:10:00Z", "student": "<slug>", "course": "rust-foundations", "module": "m1", "step": "m1-02-move",
  "type": "step.open | step.done | check.run | check.pass | check.fail | hint.shown | question.asked | question.answered | predict.made | predict.compared | recall.answered | reflection.written | edit.metrics | session.start | session.end",
  "data": { "taskId": "…", "checkType": "testSuite", "attempt": 2, "hintTier": 1, "durationMs": 1234, "bloom": "apply",
            "question": "bereinigter Text", "grounded": true, "citations": 3, "verdict": "pass|weak|fail",
            "typedChars": 120, "pastedChars": 900, "pasteEvents": 2, "outputExcerpt": "error[E0382] …" } }
```
Die Extension schreibt alle Events lokal (`~/.cads-tutor/events.jsonl`, zusätzlich zur SQLite) und sendet sie – wenn
`CADS_TUTOR_TELEMETRY_URL` gesetzt ist – gebündelt (max. 100 Events / 10 s) per `POST <url>/ingest` mit Header
`X-CaDS-Student: <slug>` und `X-CaDS-Token: <CADS_TUTOR_TELEMETRY_TOKEN>` (Container-Env, vom Broker je Container gesetzt).
`edit.metrics` wird je Step beim Speichern aggregiert (getippte vs. eingefügte Zeichen aus `onDidChangeTextDocument`,
Einfügungen > 200 Zeichen zählen als Paste). Ausfall des Portals darf die Extension nie stören (Queue auf Platte, Retry).

**Portal (`deploy/portal/`, Python 3 Stdlib + SQLite, Host-Prozess wie der Broker, 127.0.0.1:3200):**
- `POST /ingest` (Token-Prüfung, Idempotenz über `(student, ts, type, step, attempt)`), `GET /healthz`.
- Web-UI (server-seitig gerendert, kein Framework, Diagramme als Inline-SVG) hinter dem Keycloak-Gate: `X-Gate-Email` →
  Rolle aus `portal.json` (`teachers: { "<email>": { courses: [...], role: "teacher|admin" } }`); Lehrende sehen nur ihre Kurse.
- Ansichten: **Kursübersicht** (Aktive, Fortschritt je Modul, Abschlussquote), **Fragen** (meistgestellte Fragen geclustert
  nach normalisiertem Text + Token-Jaccard ≥ 0.6, ungrounded-Quote, Steps mit den meisten Fragen), **Schwierige Stellen**
  (je Step: Fehlschlagquote beim ersten Versuch, mittlere Versuche, Hinweis-Tier-Verteilung, Zeit bis Bestehen, Abbruchquote),
  **Auffälligkeiten** (z-Scores je Studierendem über Zeit/Step, Versuche, Hinweisnutzung, Fragenrate; Flags: „sehr gut“
  (obere 10 % bei Erstversuch-Quote und geringer Hinweisnutzung, plausible Zeiten), „tut sich schwer“ (untere 10 %, viele
  Tier-3-Hinweise, lange Zeiten, Abbrüche), „Betrugsverdacht“ (Check besteht ohne vorherigen Fehlschlag bei < 60 s Step-Zeit
  UND Paste-Anteil > 80 %; identische Freitextantworten/Reflexionen zwischen Studierenden (Jaccard ≥ 0.9); Vorhersagen,
  die exakt der Ausgabe entsprechen und nach der Ausführung geändert wurden; Aktivität außerhalb der Session)),
  **Studierende** (Liste mit Flags) → **Tiefenanalyse** (Zeitstrahl, Mastery je Objective, Bloom-Abdeckung, Fragen,
  Hinweise, Vorhersagen, Reflexionen, Editier-Metriken, Empfehlung an den Lehrenden), **Organisations-Board**
  (Leistungsnachweise: je Studierendem × Kurs Steps/Checks/Reflexionen/Projekt, Status „offen/erreicht/bestätigt“,
  Lehrenden-Sign-off mit Zeitstempel, Export CSV/JSON, Notizfeld), **Regeln** (Schwellwerte in `portal.json`, dokumentiert).
- Alle Berechnungen deterministisch und testbar (Python-Modul `analytics.py` mit Unit-Tests).
- **Simulator** `deploy/portal/simulate.py`: erzeugt synthetische Kohorten (N Studierende, Personas: exzellent, solide,
  schwach, abbrechend, betrügend; je Kurs, mehrere Lehrende) als Event-Ströme mit realistischen Verteilungen und speist sie
  per `/ingest` ein; Assertions, dass die Flags die Personas wiederfinden (Precision/Recall werden ausgegeben).

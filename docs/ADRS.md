# Architekturentscheidungen (ADRs) – CaDS Firmware Tutor

## ADR-001 – Hardwarezugriff im Web-Worker-Extension-Host, nicht in einer Webview (2026-09-02, angenommen)
Kontext: Boards hängen am Rechner der Studierenden; server-seitiges USB-Passthrough ist damit prinzipiell falsch.
Empirisch verifiziert (code-server 4.135, lokaler Container): der Web-Worker-Extension-Host läuft in einem iframe mit
`allow="usb; serial; hid"`, `navigator.usb/serial/hid` sind im Worker definiert, die Workbench-Kommandos
`workbench.experimental.requestUsbDevice/requestSerialPort/requestHidDevice` existieren.
Entscheidung: `cads-probe` als Web-Extension (browser-Entry) hält WebUSB/WebSerial; `cads-board-bridge` (Node) im
Container spricht sie über `executeCommand` an. Webview nur als Fallback (§2.1 SPEC).
Konsequenzen: Kein Chooser-Problem in Webviews, Lebensdauer = Fenster, RPC-Latenz Browser↔Container pro Probe-Op
(durch Batching und Read-Cache gemindert).

## ADR-002 – Debugging über einen GDB-RSP-Server in der Bridge + cortex-debug `external` (2026-09-02, angenommen)
Alternativen: (a) eigener Debug-Adapter (DAP) über die Probe – vollständige Neuentwicklung, kein SVD/Peripheral-View,
(b) OpenOCD/st-util im Container – braucht USB am Server (verworfen), (c) RSP-Server in der Bridge, cortex-debug als
unveränderter Client. Entscheidung: (c). Konsequenz: F5, Breakpoints, Stepping, Register/SVD, Memory-View und RTOS-Views
funktionieren wie auf dem Desktop; Flash via `vFlash*`/`load` und über `st-flash`-Shim.

## ADR-003 – cads-zero ist der Workspace; Toolchain ARM GNU 13.3.rel1 im Image (2026-09-02, angenommen)
Parität mit der Maintainer-Umgebung (vcpkg 13.3.1); Debian-Paket (12.2) verworfen wegen Abweichungen. Seed wird beim
ersten Start in das Workspace-Volume kopiert (pro Student eigenes Volume).

## ADR-004 – Kurse als Plugins (Kurs-Packs), Runtime in `cads-tutor` (2026-09-02, angenommen)
Kurse sind Daten (course.json + Markdown mit Front Matter), geladen aus Extensions (`contributes.cadsTutorCourses`),
Image-, Nutzer- und Workspace-Verzeichnissen. Die Runtime bleibt kursunabhängig; Grounding/Bloom/Mastery liefert
`@cads/tutor-platform`. Konsequenz: neue Kurse ohne Code-Änderung, in eigenen Repos/VSIX.

## ADR-005 – Multi-User: ein Hostname, Pfad-Routing, Broker als Host-Prozess (2026-09-02, angenommen)
Kein Wildcard-DNS, Hostnamen sind teuer (Tunnel+Cert je Name) → `/s/<slug>/`. Keycloak-Gate am Origin (forward_auth
`/gate/check`), Proxying durch Caddy mit dynamischem Upstream, Broker ohne docker.sock-Mount (Entscheidung mit Labor).
Details: docs/MULTIUSER.md.

## ADR-006 – Image-CMD trägt die Betriebsflags (2026-09-02, angenommen)
`--disable-workspace-trust` u. a. gehören in den Image-CMD, nicht in Compose/Startskripte: der Restricted-Mode-Bug
entstand, weil der produktive `docker run` die Compose-Flags nicht kannte.

# Bridge-Strang – Arbeitsnotizen (cads-probe / cads-board-bridge)

Ergänzend zu `docs/SPEC.md` (§2, §3.1, §3.2). Hier stehen die empirischen Befunde, Messwerte und
Abweichungen von der Spezifikation mit Begründung.

## B0 – Machbarkeit (2026-09-02)

Testaufbau: `codercom/code-server:latest` (4.135.0, Code 1.135.0) auf `127.0.0.1:8085`, `--auth none`,
`--disable-workspace-trust`, beide VSIX per `code-server --install-extension`.

| Frage | Befund |
|---|---|
| Läuft eine Web-Extension (nur `browser`-Entry) in code-server im Web-Worker-Extension-Host? | **Ja.** `cads.probe.ping` liefert `worker: "function"` (`importScripts` vorhanden), `location: blob:http://127.0.0.1:8085/…`; der Host-iframe ist `…/webWorkerExtensionHostIframe.html?vscodeWebWorkerExtHostId=…` (same-origin). |
| Sind `navigator.usb` / `navigator.serial` / `navigator.hid` im Worker definiert? | **Ja**, alle drei `"object"` (Chromium 1228 headless, Google Chrome headed). |
| Erreicht die Node-Extension die Web-Extension per `executeCommand`? | **Ja.** `cads.bridge.ping` → `cads.probe.ping`: Round-Trip 16–18 ms (Node v24.18.1 im Container). |
| Existiert `workbench.experimental.requestUsbDevice` / `…requestSerialPort`? | Ja (kein „command not found“). Der Aufruf blockiert, bis der native Chooser bedient ist – in Playwright/Chromium-headless erscheint kein bedienbarer Dialog, der Promise bleibt hängen (>12 s, kein Toast). |
| Chooser-freie Freigabe (Automatisierung/B3) | **WebUSB: funktioniert per Chrome-Policy** `WebUsbAllowDevicesForUrls` (siehe unten): `navigator.usb.getDevices()` liefert im Hauptfenster `STM32 STLink`, VID 0x0483 / PID 0x374B, Serial `066FFF565282494867161033`, ohne Chooser. |
| Chooser-Automatisierung per CDP `DeviceAccess` | **Nicht reproduzierbar**: weder in Chrome headed noch in Chromium-headless-shell (dort sofort `NotFoundError: No device selected`) noch in Chrome `--headless=new` (Timeout) hat `DeviceAccess.deviceRequestPrompted` gefeuert. Nicht weiter verfolgt, da die Policy-Route für USB trägt. |

**Entscheidung:** Architektur wie Spec §2 (Treiber im Web-Worker-Extension-Host). Der Webview-Fallback (§2.1)
wird nicht benötigt. Der Treiber bleibt trotzdem frei von VS-Code-/DOM-Abhängigkeiten.

### Chrome-Policies auf macOS (Automatisierung)

`defaults write com.google.Chrome …` landet auf macOS auf der Ebene **„Aktueller Nutzer / Empfohlen“**
(chrome://policy). Die Werte müssen typisiert sein (Integer, nicht String) – daher als XML-Plist schreiben:

```bash
defaults write com.google.Chrome WebUsbAllowDevicesForUrls '<array><dict><key>devices</key><array><dict><key>vendor_id</key><integer>1155</integer><key>product_id</key><integer>14155</integer></dict></array><key>urls</key><array><string>http://127.0.0.1:8085</string></array></dict></array>'
defaults write com.google.Chrome SerialAllowUsbDevicesForUrls '<array><dict><key>devices</key><array><dict><key>vendor_id</key><integer>1155</integer><key>product_id</key><integer>14155</integer></dict></array><key>urls</key><array><string>http://127.0.0.1:8085</string></array></dict></array>'
```

- `WebUsbAllowDevicesForUrls`: Status **Gültig** auf Ebene „Empfohlen“ – und wirksam (getDevices liefert den ST-Link).
- `SerialAllowUsbDevicesForUrls`: Status **Fehler – „Richtlinienebene wird nicht unterstützt“**. Diese Policy
  akzeptiert nur die Ebene „Obligatorisch“, die auf macOS nur über `/Library/Managed Preferences/…` (root/MDM)
  erreichbar ist. **Folge:** Der WebSerial-Pfad lässt sich ohne Operator (sudo oder einmaliger manueller Chooser-Klick
  in einem persistenten Chrome-Profil) nicht chooser-frei automatisieren. Der WebUSB-Pfad (Flash, Debug) schon.

Rücknahme: `defaults delete com.google.Chrome WebUsbAllowDevicesForUrls SerialAllowUsbDevicesForUrls`.

### Betriebsnotizen
- Docker Desktop hat hier nur ~1.9 GiB VM-RAM: zwei parallele Browser-Sitzungen gegen denselben code-server
  haben den Container per OOM beendet (`OOMKilled=true`). Tests deshalb sequenziell fahren.
- Ausgangszustand der Hardware: `st-info --probe` meldete `chipid 0x000` (Target nicht ansprechbar, ST-Link selbst ok);
  `st-info --probe --connect-under-reset` hat den Zustand aufgelöst (0x419, STM32F42x_F43x). NOD_F429ZI war gemountet
  → `diskutil unmount force /Volumes/NOD_F429ZI`. Board bootet danach normal (Selbsttest 10/10 PASS, Explorer-Prompt).

Screenshot: `docs/evidence/b0-chrome-8085.png` (Google Chrome, Ping-Toast nach `cads.bridge.ping`).

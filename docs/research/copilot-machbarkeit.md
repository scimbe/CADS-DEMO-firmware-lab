# GitHub Copilot in der Tutor-Umgebung: Machbarkeitsprüfung mit Belegen

**Stand:** 2026-09-06 · **Zweig:** `stream-copilot` (aus `origin/next`, 615bc78)
**Auftrag:** Können Studierende ihr eigenes Copilot-Konto in unserer Umgebung nutzen, und kann das
Tutor-Plugin — nach dem Vorbild von [vscode-lm-proxy](https://github.com/ryonakae/vscode-lm-proxy) —
zwischen llm2/Labor und Copilot umschalten? Zusatzauftrag: die Einrichtung muss für Studierende
trivial sein.

Jede Aussage trägt einen Messwert, eine Protokollzeile oder eine Quelle. Was ich nicht prüfen konnte,
steht in [§10](#10-was-ich-nicht-prüfen-konnte) — nicht als Vermutung im Fließtext.

---

## 1 — Die fünf Befunde, die die Lage bestimmen

**B-I. Weg C existiert nicht mehr.** GitHub Models ist zum 2026-07-30 abgeschaltet. Gemessen,
unangemeldet:

```
POST https://models.github.ai/inference/chat/completions
  → http=410  time=0.353 s
  {"error":{"code":"github_models_retirement_brownout",
            "message":"GitHub Models is temporarily unavailable as part of a scheduled retirement brownout."}}
POST https://models.inference.ai.azure.com/chat/completions
  → http=000  time=0.023 s   (Host löst nicht mehr auf — kein Fehlerkörper)
```

> **Abweichung zur Messung des Strang-Leiters:** Für `models.inference.ai.azure.com` wurde mir
> „derselbe Fehlerkörper" gemeldet. Bei mir liefert dieser Host **gar keine Antwort**; der Name löst
> nicht mehr auf. Nur `models.github.ai` antwortet mit 410 und dem Brownout-Körper. Ich führe beides
> so auf, wie es hier gemessen ist.

GitHub Changelog vom 2026-07-30, wörtlich: *„GitHub Models is now retired. The playground, model
catalog, inference API, and bring your own key (BYOK) are no longer available to any customer."* Als
Ersatz nennt GitHub *„Microsoft Foundry offers a broad model catalog"* und *„GitHub Copilot gives you
access to a range of models"*. Die Dokumentationsseite sagt dasselbe: *„As of July 30, 2026, GitHub
Models has been fully retired."*

**B-II. `vscode-lm-proxy` ist in unserem Aufbau nicht verwendbar — ohne Änderung am fremden Code.**
Zwei Befunde aus dem Quelltext (v1.0.5, `git clone --depth 1`), beide mit einer Messung unterlegt
([§4.4](#44-warum-vscode-lm-proxy-so-nicht-geht)):

- Die einzige Abhängigkeit ist `express@4.21.2`. Es gibt **kein** `cors`-Paket und **keinen einzigen**
  `Access-Control-*`-Header im gesamten Quellbaum; die drei `setHeader`-Aufrufe betreffen nur SSE
  (`Content-Type: text/event-stream`, `Cache-Control`, `Connection`). Gemessen: ohne diese Header
  scheitert der Preflight, und der eigentliche Aufruf **erreicht den Server nie**.
- `manager.ts:40` ruft `app.listen(port, …)` **ohne Host-Argument**. Express bindet damit auf
  `0.0.0.0`, also auf alle Schnittstellen — nicht auf Loopback. Der Copilot-Zugang der studierenden
  Person wäre im ganzen WLAN erreichbar, ohne jede Authentifizierung.

**B-V. Weg B ist von einem öffentlichen Ursprung aus standardmäßig gesperrt.** Das war die letzte
offene Messung; sie fällt gegen Weg B aus. Aus einer echten öffentlichen https-Seite blockiert Chrome
152 den Zugriff auf `http://127.0.0.1:4000` — im Hauptfenster **und** im Worker:

```
Access to fetch at 'http://127.0.0.1:4000/v1/chat/completions' from origin
'https://…​.trycloudflare.com' has been blocked by CORS policy:
Permission was denied for this request to access the `loopback` address space.
```

Es ist **nicht** endgültig: Chrome kennt dafür eine Berechtigung namens `local-network-access`, deren
Vorgabe in einem echten Chrome `prompt` ist. Wird sie erteilt, läuft der Worker-Aufruf in 1 ms durch.
Weg B kostet damit einen **fünften Einrichtungsschritt** — eine Berechtigungsabfrage, die die
studierende Person auch ablehnen kann. Messprotokoll: [§4.6](#46-der-öffentliche-ursprung-die-entscheidende-messung).

**B-III. Die Umschalt-Mechanik selbst ist ein Standardweg, kein Trick.** In code-server 4.135 darf eine
beliebige Drittanbieter-Erweiterung einen eigenen Modell-Anbieter registrieren — ohne Proposed-API,
ohne Signatur — und eine *fremde* Erweiterung findet und ruft dessen Modelle
([§3.3](#33-ein-eigener-anbieter-lässt-sich-registrieren), [§3.4](#34-eine-fremde-erweiterung-sieht-diese-modelle)).

**B-IV. Für Weg B braucht es kein Geheimnis — und das ist gut so, denn SecretStorage liegt im
Browser.** Gemessen ([§6](#6-wo-die-persönliche-konfiguration-liegen-darf)): der SecretStorage von
code-server folgt dem **Browserprofil**, nicht dem Container und nicht dem Nutzer-Volume. Der Entwurf
in [§5](#5-die-einrichtung-aus-sicht-der-studierenden) kommt deshalb ohne Schlüssel und ohne
Eingabefeld aus.

---

## 2 — Messumgebung

Bild `cads-firmware-lab:dev` (unser Bild, `next`), Container `copilot-probe`, `--memory 1500m`, Port
`127.0.0.1:8087`, Docker = Colima (VM 5.9 GiB, 4 CPU). Browser: Playwright-Chromium **149.0.7827.55**
(headless shell 1228) vom Mac aus — dieselbe Topologie wie bei Studierenden (Browser lokal, code-server
im Container).

```
code-server --version → 4.135.0 de89acbcdce9d9b870008a270c9f6466993d91f4 with Code 1.135.0
```

Vier Wegwerf-Erweiterungen (reines JS, kein Build), direkt in
`~/.local/share/code-server/extensions/` abgelegt und in `extensions.json` eingetragen:
`cads-lm-probe` (Node, API-Oberfläche + eigener Anbieter), `cads-webfetch` (Web-Worker, `fetch` auf
den lokalen Server), `cads-cases` (Node, Fehlerfälle), `cads-secret-probe` (Node, SecretStorage).
Dazu ein selbstgebauter Mini-Server, der die OpenAI-Antwortform nachbildet und auf vier Ports vier
Verhaltensweisen zeigt — **ohne Copilot**, wie beauftragt.

Für den https-Fall steht Caddy mit interner CA vor code-server (Ursprung `https://lab.local:8443`,
`isSecureContext: true`), damit gemischte Inhalte real geprüft werden und nicht angenommen.

---

## 3 — Messprotokoll 1: Was kann code-server wirklich?

### 3.1 Der `vscode.lm`-Namensraum existiert vollständig

```json
"hasLmNamespace": "object",
"lmKeys": {
  "selectChatModels": "function",       "onDidChangeChatModels": "function",
  "registerLanguageModelChatProvider": "function",
  "isModelProxyAvailable": "boolean",   "getModelProxy": "function",
  "registerLanguageModelProxyProvider": "function",
  "embeddingModels": "object",          "computeEmbeddings": "function",
  "registerTool": "function",           "invokeTool": "function",  "tools": "object",
  "registerMcpServerDefinitionProvider": "function", "startMcpGateway": "function"
},
"env": { "appName": "CaDS Firmware Lab", "uiKind": 2, "appHost": "server-distro" }
```

`registerChatModelProvider` (der alte Name) existiert **nicht**; gültig ist
`registerLanguageModelChatProvider`. 32 eingebaute `lm.tools` sind registriert.

### 3.2 Ohne Copilot-Anmeldung: leere Listen — wie erwartet

```json
"selectChatModels_all":     { "count": 0, "models": [] },
"selectChatModels_copilot": { "count": 0, "models": [] }
```

Kein Fehler, keine Ausnahme — schlicht leer. Die Annahme aus der Ausgangslage ist bestätigt.

### 3.3 Ein eigener Anbieter lässt sich registrieren

Zwei Bedingungen, beide aus dem entbündelten Workbench-Code von 1.135 gelesen und dann gemessen:

1. Der Hersteller muss im Manifest deklariert sein. Erweiterungspunkt `languageModelChatProviders`,
   Pflichtfelder `vendor` und `displayName`, Aktivierungsereignis
   `onLanguageModelChatProvider:${vendor}`. Fehlt die Deklaration:
   `Chat model provider uses UNKNOWN vendor cads.`
2. Die Anbieter-Methode heißt **`provideLanguageModelChatInformation`** (nicht
   `prepareLanguageModelChat`). Mit dem falschen Namen registriert der Anbieter fehlerfrei, liefert
   aber nie ein Modell — ein stiller Fehlschlag.

Mit beidem korrekt:

```json
"selfProviders": [ { "vendor": "cads", "displayName": "CaDS Labor (llm2)" } ],
"register": "OK",
"prepareCalled": { "options": "{\"silent\":true}" },
"selectVendorCads": { "count": 1,
  "models": [ { "id": "cads-echo-1", "name": "CaDS Echo (Labor)", "maxInputTokens": 8000 } ] },
"sendRequest": { "text": "echo: 1 message(s) received", "roundTripMs": 17 }
```

**Kein Proposed-API, keine Signatur, keine Allowlist.** 17–150 ms (erster Aufruf 150 ms, danach 17 ms).

### 3.4 Eine fremde Erweiterung sieht diese Modelle

Zweite Wegwerf-Erweiterung, die selbst **keinen** Hersteller deklariert und nur konsumiert — genau die
Form „Copilot registriert, unser Tutor konsumiert":

```json
{ "all": ["cads/cads-echo-1"], "foreignCount": 1,
  "sendRequest": { "text": "echo: 1 message(s) received", "ms": 9 },
  "copilotCount": 0 }
```

Finden **und** aufrufen: 9 ms. `copilotCount: 0` allein deshalb, weil niemand angemeldet ist.

### 3.5 Die eingebaute Chat-Oberfläche ist an die Copilot-Anmeldung gebunden — das API nicht

Unser Bild setzt `"chat.disableAIFeatures": true` (`image/settings/user-settings.json:49`). Damit zeigt
„Chat: Focus on Chat View" den Anmeldedialog *„Sign in to use GitHub Copilot"*
(`docs/evidence/copilot-a1-signin-dialog.png`). Auf `false` gesetzt, öffnet der Chat **ohne** Anmeldung
(`docs/evidence/copilot-a2-chat-ohne-anmeldung.png`) — sein Modellwähler bietet in derselben Sitzung
aber **nur** `Sign in to use Copilot…` an, obwohl unser Anbieter zu diesem Zeitpunkt registriert und
über das API auffindbar war (Probe 18:33:27 Z, Wähler 18:34 Z,
`docs/evidence/copilot-a3-modellwaehler.png`).

**Folge für uns:** unerheblich. Der Tutor hat seine eigene Ansicht und ruft das API direkt.

---

## 4 — Weg B: Copilot auf dem Rechner der Studierenden

Bauform: lokales VS Code der studierenden Person mit ihrem eigenen Copilot, dazu eine Erweiterung, die
einen OpenAI-kompatiblen Server auf `localhost:4000` öffnet; unser Tutor spricht ihn über die
bestehende Browser-Brücke an (Node-Erweiterung im Container → `executeCommand` → Web-Extension im
Browser → `fetch`).

### 4.1 Darf eine https-Seite auf `http://127.0.0.1:4000` zugreifen?

**Aus einem privaten Ursprung ja — aber nur aus dem Web-Worker, nicht aus dem Hauptfenster.** Für den
produktiven, *öffentlichen* Ursprung gilt eine zusätzliche Sperre: [§4.6](#46-der-öffentliche-ursprung-die-entscheidende-messung).
Die folgenden Messungen liefen gegen `https://lab.local:8443` (privater Adressraum). Zwei gegenläufige Ergebnisse aus
derselben Sitzung, beide über die https-Seite `https://lab.local:8443`:

**Hauptfenster: blockiert.** Nicht durch gemischte Inhalte, sondern durch die CSP von code-server:

```
PAGE_FETCH: {"error":"Failed to fetch","name":"TypeError","ms":1}
Console: Connecting to 'http://127.0.0.1:4000/v1/models' violates the following Content Security
         Policy directive: "connect-src 'self' ws: wss: https:". The action has been blocked.
```

**Web-Worker-Extension-Host: geht.** Derselbe Aufruf, dieselbe Seite:

```json
{ "pageOrigin": "https://lab.local:8443",
  "workerUrl": "blob:https://lab.local:8443/7390e491-96d3-4b03-9438-4e7431e2",
  "status": 200, "ms": 11 }
```

Der Worker-Host läuft in `webWorkerExtensionHostIframe.html` und erbt die `connect-src`-Regel des
Workbench-Dokuments nicht. Dass eine https-Seite `http://127.0.0.1` erreichen darf, ist kein Zufall:
Loopback gilt als *potentially trustworthy origin* und fällt nicht unter Mixed-Content-Blocking.

### 4.2 Was kostet der Umweg über `executeCommand`?

Fünf Aufrufe hintereinander, ganze Kette Node→Node:

| Aufruf | im Worker | ganze Kette | über https |
|---|---|---|---|
| 1 (kalt, mit Preflight) | 7 ms | 14 ms | 11 / 25 ms |
| 2 | 2 ms | 6 ms | 2 / 13 ms |
| 3 | 2 ms | 10 ms | – |
| 4 | 1 ms | 6 ms | – |
| 5 | 1 ms | 7 ms | – |

**Die Brücke kostet 4–12 ms.** Zum Vergleich die B0-Referenz aus `BRIDGE-NOTES.md`: reiner
`executeCommand`-Round-Trip Node↔Worker 16–23 ms — wir liegen darunter, weil hier keine
USB-Serialisierung dazwischenliegt. Gegenüber einer LLM-Antwortzeit von Sekunden ist der Umweg
**nicht messbar teuer**.

Nutzlastgröße über die Brücke:

| Anfragekörper | Ergebnis | ganze Kette |
|---|---|---|
| 8 kB | 200 | 34 ms |
| 64 kB | 200 | 34 ms |
| 256 kB | 200 | 27 ms |

Geerdete Tutor-Prompts liegen weit darunter.

### 4.3 CORS und Preflight

Der Worker sendet `Origin: https://lab.local:8443` bzw. `http://127.0.0.1:8087`. Weil unser Aufruf
`content-type: application/json` trägt, ist er **nie** ein einfacher Request: das Protokoll des
Mini-Servers zeigt vor **jedem** POST auf einem neuen Pfad einen OPTIONS-Preflight:

```
4000 OPTIONS /v1/chat/completions        origin= http://127.0.0.1:8087
4000 POST    /v1/chat/completions        origin= http://127.0.0.1:8087
4000 OPTIONS /v1/frisch-1788721829959    origin= http://127.0.0.1:8087
4000 POST    /v1/frisch-1788721829959    origin= http://127.0.0.1:8087
```

Mit `Access-Control-Max-Age: 600` entfällt der Preflight für 10 Minuten je Pfad — das erklärt die
121 ms des ersten und die 1–3 ms der folgenden Aufrufe.

### 4.4 Warum `vscode-lm-proxy` so nicht geht

Der entscheidende Beleg ist die Protokollzeile des Servers, der **keine** CORS-Header setzt (Port 4001):

```
4001 OPTIONS /v1/chat/completions        origin= http://127.0.0.1:8087
                                          ← kein POST. Der Aufruf endet am Preflight.
```

Der Browser meldet der Erweiterung nur `TypeError: Failed to fetch` (nach 1 ms). **Die Anfrage erreicht
den Server nie** — der Prompt wird nicht einmal übertragen. Da `vscode-lm-proxy` 1.0.5 nachweislich
keinen einzigen `Access-Control-*`-Header setzt (B-II), ist es aus unserem Browser heraus **nicht
benutzbar**. Dazu kommt die Bindung auf `0.0.0.0` statt Loopback.

**Konsequenz für die Bauentscheidung:** Weg B braucht entweder einen Fork von `vscode-lm-proxy` (fremder
Code, den wir dann pflegen) oder — der Vorschlag in [§5](#5-die-einrichtung-aus-sicht-der-studierenden)
— eine **eigene, sehr kleine** Erweiterung für das lokale VS Code. Der Nutzen des Fremdprojekts wäre
ohnehin gering: es kann Anthropic-, Claude-Code- und Streaming-Formen, von denen wir keine brauchen
(unser `LlmClient` ist nicht streamend, siehe §8).

### 4.5 Fehlerfälle: was sieht die Studierende?

Vollständige Matrix, alles gemessen:

| Fall | Ergebnis im Worker | Zeit | ganze Kette |
|---|---|---|---|
| gesund (4000) | `status 200`, JSON geparst | 121 ms (kalt) | 135 ms |
| **kein CORS-Header** (4001) | `TypeError: Failed to fetch` | 1 ms | 8 ms |
| **Server läuft nicht** (4004) | `TypeError: Failed to fetch` | 2 ms | 6 ms |
| **falscher Port** (9999) | `TypeError: Failed to fetch` | 0 ms | 4 ms |
| antwortet nie, 5 s Frist | `Error: cads-timeout` | 5006 ms | 5013 ms |
| antwortet nie, 20 s Frist | `Error: cads-timeout` | 20004 ms | 20015 ms |
| falsche Antwortform (4003) | `status 200`, `content-type: text/html`, `Unexpected token '<'` | 3 ms | 8 ms |
| Brückenbefehl fehlt | `command 'cads.webfetch.…' not found` | – | 28 ms |

Daraus drei harte Konsequenzen für den Entwurf:

**(1) „Failed to fetch" ist mehrdeutig.** Drei völlig verschiedene Ursachen — kein CORS, Server läuft
nicht, falscher Port — liefern denselben Text in 0–2 ms. Der Browser verbirgt den Unterschied
absichtlich. Eine Fehlermeldung, die nur diesen Text weiterreicht, ist für die Studierende wertlos.

**(2) Es gibt einen Ausweg, und er ist gemessen.** Ein `fetch(url, { mode: 'no-cors' })` liefert eine
*opaque* Antwort, sobald überhaupt jemand auf dem Port antwortet — auch ohne CORS-Header:

| Sonde | Ergebnis | Zeit |
|---|---|---|
| 4000 (gesund) | `ok: true, type: "opaque"` | 5 ms |
| 4001 (ohne CORS) | `ok: true, type: "opaque"` | 2 ms |
| 4004 (läuft nicht) | `ok: false, Failed to fetch` | 1 ms |
| 9999 (falscher Port) | `ok: false, Failed to fetch` | 0 ms |

Damit lassen sich „da läuft nichts" und „da läuft etwas, aber es lässt uns nicht" **sauber
unterscheiden** — in unter 5 ms. Das ist der Baustein, der eine brauchbare Selbstprüfung möglich macht.

**(3) Eine eigene Frist ist Pflicht.** Ein Server, der die Verbindung annimmt und nie antwortet, lässt
`fetch` **nicht von selbst** scheitern: 20 s ohne Reaktion, und es lief nur deshalb aus, weil ich
abgebrochen habe. Ohne `AbortController` hinge der Tutor unbegrenzt.

---

### 4.6 Der öffentliche Ursprung: die entscheidende Messung

Alle bisherigen Weg-B-Messungen liefen von einem **privaten** Ursprung. Produktiv ist der Ursprung
**öffentlich** (Cloudflare-Tunnel), und das ist der Fall, den Chrome anders behandelt.

**Aufbau.** Nicht gegen die Laborinstanz — dort wäre ein Passwort nötig gewesen, und an einer laufenden
Instanz wollte ich nichts messen. Stattdessen: eine **Wegwerf-Testseite** (statisches HTML, kein
code-server) auf `127.0.0.1:8099`, per `cloudflared tunnel --url` unter einer zufälligen
`*.trycloudflare.com`-Adresse öffentlich gemacht, dazu der Mini-Server auf 4000. Die Seite prüft vier
Dinge: CORS-POST und `no-cors`-Sonde, je einmal aus dem Hauptfenster und einmal aus einem
**`blob:`-Worker** — derselben Bauform wie der Web-Extension-Host von code-server. Browser: echtes
**Google Chrome 152.0.7977.76**, frisches Profil. Danach abgebaut; exponiert war nur die Testseite.

**Ergebnis, Vorgabe (nichts erteilt):** alle vier Aufrufe scheitern, in 1–15 ms.

```
main_cors:    { error: "Failed to fetch", name: "TypeError", ms: 15 }
main_opaque:  { ok: false, error: "Failed to fetch", ms: 10 }
worker.cors:  { error: "Failed to fetch", name: "TypeError", ms: 5 }
worker.opaque:{ ok: false, error: "Failed to fetch", ms: 1 }
```

Die Konsole nennt den Grund unmissverständlich:

```
Access to fetch at 'http://127.0.0.1:4000/v1/chat/completions' from origin
'https://…​.trycloudflare.com' has been blocked by CORS policy:
Permission was denied for this request to access the `loopback` address space.
```

**Der Worker hilft hier nicht.** Gegen die CSP von code-server war er der Ausweg (§4.1); gegen Local
Network Access ist er es nicht — die Sperre hängt am Adressraum des Dokuments, nicht am
Ausführungskontext.

**Ergebnis mit erteilter Berechtigung.** Chrome kennt die Berechtigung **`local-network-access`**.
Nach `grantPermissions(['local-network-access'])` meldet `navigator.permissions.query` `granted`, und
derselbe Worker-Aufruf läuft durch:

```json
"worker": { "cors":   { "status": 200, "body": "{\"id\":\"chatcmpl-probe\",…", "ms": 1 },
            "opaque": { "ok": true, "type": "opaque", "ms": 5 } }
```

**Was eine echte Studierende erlebt.** In einem sichtbaren Chrome mit frischem Profil ist die Vorgabe:

```
DEFAULT permission state in a real, headed Chrome: prompt
```

Also **kein** stiller Fehlschlag, sondern eine Abfrage — sie wird gefragt, ob die Seite auf Geräte im
lokalen Netzwerk zugreifen darf. Solange sie nicht antwortet, **hängt der Aufruf**: im selben Lauf kam
innerhalb von 45 s kein Ergebnis zurück. (Im Kopflos-Betrieb wird ohne Abfrage abgelehnt; deshalb die
Fehlschläge oben.)

**Folgen für den Entwurf:**

1. Die Anleitung braucht einen **fünften Schritt**: die Berechtigung erteilen. Er lässt sich nicht
   wegautomatisieren — eine Seite kann sich keine Berechtigung selbst geben.
2. Die Abfrage kommt beim **ersten** Zugriffsversuch, also mitten in der Einrichtung. Der Tutor muss
   sie ankündigen, sonst klickt die Hälfte reflexhaft „Blockieren" — und danach ist der Zustand
   `denied`, ohne erneute Abfrage.
3. Die Frist aus §5.3 muss den **unbeantworteten** Fall abdecken, nicht nur den toten Server: 45 s ohne
   Antwort sahen von innen aus wie ein hängender Server.
4. Für **Weg A** entfällt das vollständig — dort verlässt keine Anfrage den Container.

**Nachbau in einer Minute** (der Operator kann das gegen die echte Laborinstanz wiederholen; das ist die
einzige Variante, die auch die CSP von code-server mitprüft):

```bash
# 1) Mini-Server auf 4000, der jeden Ursprung zulässt
node -e 'require("http").createServer((q,r)=>{r.setHeader("Access-Control-Allow-Origin",q.headers.origin||"*");
r.setHeader("Access-Control-Allow-Headers","content-type");r.writeHead(q.method==="OPTIONS"?204:200);
r.end(q.method==="OPTIONS"?"":JSON.stringify({ok:true}))}).listen(4000,"127.0.0.1")'
```

```js
// 2) Im Labor (https://firmware-lab-…) die Entwicklerkonsole öffnen und einfügen:
(async () => {
  console.log('Berechtigung:', (await navigator.permissions.query({name:'local-network-access'})).state);
  try { const r = await fetch('http://127.0.0.1:4000/', {method:'POST',
        headers:{'content-type':'application/json'}, body:'{}'});
        console.log('ERFOLG', r.status, await r.text()); }
  catch (e) { console.log('FEHLGESCHLAGEN', e.message); }
})();
```

Zu sehen sein muss: `Berechtigung: prompt`, dann eine Abfrage von Chrome, und nach „Zulassen"
`ERFOLG 200 {"ok":true}`. Kommt stattdessen `FEHLGESCHLAGEN Failed to fetch` mit der Konsolenzeile
`… access the 'loopback' address space`, wurde abgelehnt.


## 5 — Die Einrichtung aus Sicht der Studierenden

Vorgabe: höchstens fünf Schritte, eine Seite. Der Entwurf hält **fünf** — vier davon dadurch, dass er
nichts zu konfigurieren lässt, und einen, den ich nicht wegbekomme: die Browser-Berechtigung aus
[§4.6](#46-der-öffentliche-ursprung-die-entscheidende-messung). Damit ist die Vorgabe genau erfüllt,
aber ohne Reserve — jede weitere Anforderung an Weg B sprengt sie.

### 5.1 Die Entwurfsentscheidung, die alles andere trägt: kein Geheimnis

Die Brücke braucht **keinen Schlüssel**. Sie reicht Anfragen an das Copilot weiter, bei dem die
studierende Person in ihrem eigenen VS Code bereits angemeldet ist. Es gibt also nichts einzugeben,
nichts zu speichern, nichts zu verlieren. Damit entfallen zugleich alle Probleme aus
[§6](#6-wo-die-persönliche-konfiguration-liegen-darf).

Der Port ist auf **4000** festgenagelt (kein Eingabefeld). Zwei Sicherungen ersetzen den Schlüssel,
beide durch die Messungen in §4 gedeckt:

- **Bindung auf `127.0.0.1`**, nicht `0.0.0.0` (der Fehler von `vscode-lm-proxy`, B-II). Damit ist die
  Brücke aus dem Netz — Campus-WLAN, Café — nicht erreichbar.
- **`Access-Control-Allow-Origin` nur für unseren Labor-Ursprung**, nicht `*`. Den `Origin`-Header
  setzt der Browser; eine fremde Webseite kann ihn nicht fälschen. Ohne diese Einschränkung könnte
  jede beliebige Seite, die die Studierende offen hat, ihr Copilot-Kontingent verbrauchen.

### 5.2 Die Anleitung (Entwurf)

> **Copilot im Labor verwenden**
> Du brauchst: VS Code auf deinem Rechner und ein GitHub-Copilot-Konto.
>
> 1. **Erweiterung installieren.** Lade `cads-copilot-bruecke.vsix` [hier] herunter und ziehe die
>    Datei in dein VS Code. (Oder: `code --install-extension cads-copilot-bruecke.vsix`)
> 2. **VS Code offen lassen.** Unten rechts steht jetzt **„CaDS-Brücke: an"**. Steht dort „aus",
>    klicke darauf.
> 3. **Im Labor:** im Tutor auf **„Copilot verwenden"** klicken.
> 4. **Chrome fragt einmal**, ob diese Seite auf Geräte in deinem lokalen Netzwerk zugreifen darf.
>    Klicke **„Zulassen"** — gemeint ist damit nur dein eigener Rechner. Klickst du „Blockieren",
>    fragt Chrome nicht noch einmal; dann hilft nur das Schloss-Symbol links in der Adressleiste.
> 5. **Fertig.** Der Tutor prüft die Verbindung selbst und sagt dir, wenn etwas fehlt.
>
> Beim nächsten Mal entfallen die Schritte 1, 3 und 4: die Erweiterung startet mit VS Code, das Labor
> merkt sich deine Wahl, und Chrome merkt sich die Berechtigung. Du lässt einfach VS Code offen.
>
> **Solange VS Code zu ist, antwortet der Tutor mit dem Labor-Modell weiter** — du verlierst nichts,
> es wird nur nicht das stärkere Modell.

Fünf Schritte, kein Eingabefeld, keine Portnummer, kein Schlüssel, kein Konto anzulegen. Schritt 4 ist
der einzige, der sich nicht wegkonstruieren lässt: eine Seite kann sich keine Berechtigung selbst
erteilen. Er ist zugleich der gefährlichste — wer reflexhaft „Blockieren" klickt, landet in einem
Zustand, den Chrome nicht mehr von selbst erfragt. **Der Tutor muss die Abfrage deshalb ankündigen,
bevor er sie auslöst.**

### 5.3 Was der Tutor bei welchem Fehlgriff sagt

Jede Meldung stammt aus einem gemessenen Zustand aus §4.5 und nennt genau **eine** Handlung.

| gemessener Zustand | Meldung im Tutor |
|---|---|
| Sonde `opaque`, Aufruf `200`, JSON ok | „Copilot ist verbunden." (Statusleiste, keine Meldung) |
| Sonde scheitert (`Failed to fetch`, <5 ms) | „Auf deinem Rechner läuft die Brücke nicht. Öffne VS Code — unten rechts muss **CaDS-Brücke: an** stehen." |
| Sonde `opaque`, Aufruf `Failed to fetch` | „Die Brücke läuft, lässt diese Seite aber nicht zu. Bitte aktualisiere die Erweiterung auf die aktuelle Fassung." |
| Aufruf `200`, aber kein `choices[0]` | „Auf Port 4000 antwortet ein anderes Programm. Beende es oder ändere seinen Port." |
| eigene Frist gerissen | „Die Brücke antwortet nicht. Starte VS Code neu." |
| `command … not found` | „Diese Seite ist nicht vollständig geladen. Bitte lade sie neu (F5)." |
| Berechtigung `denied` (§4.6) | „Der Zugriff auf deinen Rechner ist für diese Seite blockiert. Klicke links in der Adressleiste auf das Schloss und erlaube **Lokales Netzwerk**." |
| Berechtigung `prompt`, keine Antwort | „Bitte beantworte die Frage von Chrome oben im Fenster." (nach 3 s einblenden, nicht in die Frist laufen lassen) |
| Copilot im lokalen VS Code nicht angemeldet | Weiterreichen, was die Brücke meldet: „Melde dich in VS Code bei Copilot an." |

Zwei Fristen, beide aus den Messungen abgeleitet: **3 s für die Selbstprüfung** (die Sonde braucht
0–5 ms, jede Antwort darüber ist ein Problem) und **60 s für einen Tutor-Aufruf** (LLM-Antwortzeit).
Wichtig: Die Selbstprüfung darf den Zustand `prompt` **nicht** als Fehler behandeln — dort wartet der
Aufruf auf einen Menschen, nicht auf einen Server (§4.6, 45 s ohne Ergebnis). `navigator.permissions.query`
liefert den Zustand ohne Nebenwirkung und gehört deshalb **vor** die Sonde.

### 5.4 Verhalten, das nicht verhandelbar ist

- **Rückfall ist immer llm2.** Jeder Fehler in der Kette — und §4.5 zeigt, dass es sechs verschiedene
  gibt — führt zum Labor-Modell, nicht zu einer Fehlermeldung statt einer Antwort. Copilot ist die
  freiwillige Aufwertung, nie die Voraussetzung.
- **Die Selbstprüfung läuft still im Hintergrund**, nicht nur auf Knopfdruck: sie kostet 5 ms. Die
  Statusleiste zeigt den Zustand, damit die Studierende nicht erst aus einer gescheiterten Antwort
  lernt, dass VS Code zu ist.
- **Kein Schritt verlangt ein Terminal.** Die Zeile `code --install-extension …` steht als Alternative
  da, nicht als Weg.

### 5.5 Was das für den Bau bedeutet — bewusst abweichend vom Auftrag

Der Auftrag nannte `vscode-lm-proxy`. Nach B-II und §4.4 empfehle ich stattdessen eine **eigene
Erweiterung für das lokale VS Code**, ~150 Zeilen: ein `http.createServer` auf `127.0.0.1:4000`, ein
Pfad (`POST /v1/chat/completions`), CORS nur für unseren Ursprung, Weiterreichen an
`vscode.lm.selectChatModels({vendor:'copilot'})`. Kein Streaming (unser `LlmClient` braucht keins),
kein Anthropic-Format, keine Modellauswahl.

Das ist **weniger** Arbeit als ein Fork von `vscode-lm-proxy` und vermeidet, dass wir fremden Code mit
einem Sicherheitsmangel (Bindung auf `0.0.0.0`) an Studierende ausliefern. Es ist zugleich eine
Abweichung vom Auftrag, die eine Entscheidung braucht — deshalb steht sie hier und nicht im Kleingedruckten.

---

## 6 — Wo die persönliche Konfiguration liegen darf

Der Auftrag setzt: *„Ein persönlicher Endpunkt oder Schlüssel gehört in die SecretStorage der
Erweiterung im Container der Studierenden."* **Die erste Hälfte stimmt, die zweite nicht.** Gemessen
mit einer Wegwerf-Erweiterung, die einen Wert ablegt und beim nächsten Start zu lesen versucht:

| | gleiches Browserprofil | anderes Browserprofil |
|---|---|---|
| Container **neu gestartet** | **überlebt** (`PROBE-VALUE-42 (survived)`) | – |
| Container läuft weiter | **überlebt** | **weg** (`(undefined)`) |

Im `localStorage` der Seite liegt der Schlüssel `secrets.provider`. **SecretStorage folgt in code-server
dem Browser, nicht dem Container.** Der Wert überlebt einen Neustart des Containers, aber nicht den
Wechsel des Browsers, des Rechners oder ein privates Fenster.

Dazu kommt ein zweiter Befund aus `docker inspect`: der Container hat **genau einen** Mount —

```
volume /var/lib/docker/volumes/firmware-lab-copilot-ws/_data -> /home/coder/workspace
```

Alles unter `/home/coder/.local/share/code-server/` — also auch `User/settings.json`, das unser
`Dockerfile` dorthin legt — liegt **außerhalb** des Nutzer-Volumes. Im Mehrbenutzerbetrieb überlebt es
den Idle-Reaper (der Container wird nur gestoppt, `MULTIUSER.md`), aber **nicht den Rollout**, bei dem
Container mit altem Image ersetzt werden.

**Folgen:**

1. Für den Entwurf aus §5 ist beides **egal**: es gibt kein Geheimnis, und der einzige gespeicherte
   Wert ist ein Schalter, dessen Verlust einen Klick kostet.
2. Sollte je ein persönlicher Schlüssel nötig werden (etwa für einen eigenen Endpunkt statt Copilot),
   ist SecretStorage **nicht** ausreichend — er müsste zusammen mit einem Volume-Mount für
   `/home/coder/.local/share/code-server/User` gedacht werden. Das ist eine Änderung am
   Mehrbenutzer-Broker, nicht am Tutor.
3. Unabhängig von Copilot: dass jede studierende Einstellung beim nächsten Image-Rollout verschwindet,
   ist vermutlich ohnehin ungewollt. **Das gehört an den Multiuser-Strang gemeldet.**

---

## 7 — Weg A (Rückfall): Copilot im Container

Wie beauftragt ohne Bauversuch — nur Machbarkeit und Rechtsfrage.

**Technisch: näher als erwartet.** `codercom/code-server:latest`, aus dem unser `Dockerfile` (Zeile 18)
baut, liefert bereits `/usr/lib/code-server/lib/vscode/extensions/copilot/`:

```
{"name":"copilot-chat","displayName":"GitHub Copilot","version":"0.63.0",
 "publisher":"GitHub","license":"SEE LICENSE IN LICENSE.txt","engines":{"vscode":"^1.135.0"}}
```

`LICENSE.txt` ist die **MIT-Lizenz**. Grund: `microsoft/vscode-copilot-chat` wurde am 2026-05-20
archiviert, die Entwicklung ist nach `microsoft/vscode` gewandert. **Open VSX, Marktplatz-Verbot und
VSIX-Weiterverteilung (Issues #6426/#6427) sind damit gegenstandslos** — wir laden nichts herunter und
verteilen nichts weiter, was nicht schon im Basisbild wäre.

Der Anmeldefluss läuft. Nach „Continue with GitHub" zeigt die Oberfläche:

```
Your Code: ####-####
To finish authenticating, navigate to GitHub and paste in the above one-time code.
```

Das ist der **GitHub-Device-Code-Fluss** — derjenige, der in einer Browser-IDE überhaupt funktioniert.
Ich habe dort abgebrochen: kein Konto, keine fremden Zugangsdaten. (Der Einmal-Code ist maskiert, war
an kein Konto gebunden und ist abgelaufen.)

Dafür, dass es durchläuft, spricht die **Versionsgleichheit** (`copilot-chat 0.63.0`, `engines
^1.135.0`, Code 1.135.0). Genau daran scheitern die Berichte aus der code-server-Gemeinde: dort wurde
eine *fremde* VSIX in einen älteren code-server gelegt → „API proposals not found (chatDebug,
chatHooks)", „No default agent registered"
([Discussion #7714](https://github.com/coder/code-server/discussions/7714)); mit passenden Versionen
wurde erfolgreich angemeldet ([Issue #7698](https://github.com/coder/code-server/issues/7698)).

Bemerkenswert nebenbei: die eingebaute Erweiterung deklariert elf Hersteller, darunter `copilot` und
**`customendpoint` („Custom Endpoint", mit eigenem Schlüssel)** — sie könnte also selbst auf llm2
zeigen. Ob das ohne Copilot-Abonnement freigeschaltet ist, konnte ich ohne Konto nicht prüfen.

**Offene Rechtsfrage (unverändert, eine Frage):** *„Wir betreiben eine browserbasierte Lehrumgebung auf
Basis von code-server (VS Code OSS 1.135) mit der darin enthaltenen, MIT-lizenzierten
GitHub-Copilot-Erweiterung. Studierende melden sich mit ihrem eigenen Copilot-Konto per Device-Flow an.
Ist dieser Zugriff aus einem VS-Code-OSS-Build gestattet?"* Dazu die Datenschutzfrage: der Prompt
enthält Code der studierenden Person und geht an GitHub.

---

## 8 — Der Umschalter im Tutor

Unabhängig davon, welcher Weg gewinnt. Der Tutor kapselt das Modell hinter genau einer Schnittstelle:

```ts
// extensions/cads-tutor/src/platform.ts:91
llmClient?: { complete(prompt: string): Promise<string> };
```

`LlmClient` (aus `@cads/tutor-platform`, `dist/llm.js:13`) erzwingt `https://` — wörtlich:
`LlmClient baseUrl must be https:// (got "…")` —, ruft `POST ${baseUrl}/chat/completions` mit
`Bearer`-Schlüssel und ist **nicht streamend**. Der Umschalter ist damit ein zweiter
`complete()`-Adapter, plus eine Auswahl je Studierender, die es heute nicht gibt: `readLlmConfig` liest
global aus der Umgebung (`platform.ts:41`).

Der https-Zwang ist der Grund, warum Weg B **nicht** durch `LlmClient` laufen kann: `http://127.0.0.1:4000`
würde im Konstruktor abgewiesen. Der Weg-B-Adapter geht über die Browser-Brücke, nicht über `fetch` im
Container — das ist ohnehin die einzige Variante, die funktioniert (§4.1).

---

## 9 — Nutzungsbedingungen

Fundstellen, keine Rechtsberatung.

**Was gilt.** Die *GitHub Copilot Product Specific Terms* (Fassung Oktober 2024) tragen den Hinweis:
*„These terms have been deprecated effective 5 March 2026. New subscriptions and renewals that occur on
5 March 2026 and later are not governed by this document…"* Maßgeblich sind die **GitHub Generative AI
Services Terms, Fassung März 2026**
([Textfassung](https://github.com/customer-terms/github-generative-ai-services-terms),
[PDF vom 2026-03-05](https://assets.ctfassets.net/8aevphvgewt8/5M04RGwkRts1Pj4vUIWGlp/0bd045a49674bcfe2fa0b9b692998e71/GitHub_Generative_AI_Services_Terms_-_2026_03_05_-_FINAL.pdf)).

**Was dort steht.**

- §2 Eigentum: *„GitHub does not own Inputs or Outputs. You retain any ownership you already have in
  your Inputs."*
- §5.A Nutzungsbeschränkungen: *„Your use of Generative AI Services is subject to the Acceptable Use
  Policies, the AI Code of Conduct, and the Required Mitigations."*
- §8.A Drittprodukte: *„GitHub may make products available to you through our services … that were not
  created by us or by Microsoft. If you install or use any of these third-party products, you do so at
  your own risk."*

**Was dort *nicht* steht.** Ich habe **keine** Klausel gefunden, die den Zugriff auf einen bestimmten
Client beschränkt, das Weiterreichen über einen Proxy untersagt oder programmatischen Zugriff verbietet
— weder in den Generative AI Services Terms noch in den *Acceptable Use Policies*. Letztere regeln
Scraping (*„Scraping does not refer to the collection of information through our API"*),
Massenautomatisierung (*„using our servers for any form of excessive automated bulk activity"*) und
unbefugten Zugriff.

**Wie das zu lesen ist.** Das Fehlen eines ausdrücklichen Verbots ist keine Erlaubnis; §5.A verweist auf
*Required Mitigations* und *AI Code of Conduct*, die ich nicht vollständig ausgewertet habe. Praktisch
wirkt die Schranke ohnehin technisch: der Copilot-Endpunkt verlangt `Editor-Version`,
`Editor-Plugin-Version` und `Copilot-Integration-Id` und antwortet sonst mit HTTP 400
([litellm#13256](https://github.com/BerriAI/litellm/issues/13256)).

**Der Unterschied zwischen den beiden Wegen ist hier scharf:**

- **Weg A** täuscht nichts vor — die offizielle Erweiterung setzt die Header selbst. Strittig ist allein,
  ob der OSS-Build ein zulässiger Client ist.
- **Weg B** täuscht ebenfalls nichts vor — die Anfrage stellt das echte VS Code der studierenden Person
  mit der offiziellen Erweiterung. Aber Weg B **reicht die Antwort an einen anderen Client weiter**, und
  genau das ist die Bauform, zu der die Bedingungen schweigen. Es ist der Punkt, den nur GitHub
  verbindlich beantworten kann.

Dass Weg B jetzt Hauptweg ist, macht diese Frage **dringlicher**, nicht kleiner: bei Weg A hätte GitHub
nur den Editor zu bewerten, bei Weg B die Weitergabe.

---

## 10 — Vergleich, Vorschlag, offene Punkte

| | **Weg B** — Brücke zum lokalen VS Code | **Weg A** — Copilot im Container | **Weg C** — GitHub Models |
|---|---|---|---|
| **Technisch machbar** | **Ja, aber mit Berechtigungsabfrage.** Kette trägt (4–12 ms, bis 256 kB); vom **öffentlichen** Ursprung jedoch erst nach Erteilen von `local-network-access` — Vorgabe `prompt`, ablehnbar (§4.6). | **Ja, bereits im Bild.** Erweiterung eingebaut, versionsgleich, Device-Flow läuft bis zur Kontogrenze. Keine Browser-Sperre, weil nichts den Container verlässt. | **Nein.** HTTP 410, abgeschaltet 2026-07-30. |
| **Rechtlich** | Schwächer: die Antwort wird an einen anderen Client weitergereicht. Kein ausdrückliches Verbot gefunden, aber genau die Bauform, zu der die Terms schweigen. | Sauberer: eigenes Konto, offizieller Client, kein geteilter Zugang. Eine offene Frage (OSS-Build). | – |
| **Aufwand** | **Mittel.** Eigene lokale Erweiterung (~150 Zeilen), Web-Extension-Endpunkt, Adapter im Tutor, Selbstprüfung, Anleitung. `vscode-lm-proxy` ist **nicht** verwendbar. | **Klein.** `chat.disableAIFeatures` differenzieren, Adapter über `vscode.lm`. | – |
| **Zumutung für Studierende** | Lokales VS Code muss **offen bleiben**. Fünf Schritte, davon einer eine Berechtigungsabfrage, die bei „Blockieren" nicht wiederkommt. | Nichts zu installieren, nichts offen zu halten; Anmeldung im Browser per Gerätecode. | – |
| **Dauerhaftigkeit** | Hängt an einer Browser-Regel, die sich zuungunsten von Loopback-Zugriffen entwickelt (§4.6). | Hängt an einer Vertragsfrage, nicht an einer Browser-Regel. | – |
| **Was noch fehlt** | Entscheidung eigene Erweiterung statt Fork. Verhalten bei Copilot-Ratenbegrenzung. | Copilot-Testkonto. Antwort von GitHub. Datenschutz. | – |

### Vorschlag

**Weg A zuerst, Weg B als Rückfall** — die Richtungsentscheidung des Strang-Leiters wird durch §4.6
bestätigt, und zwar deutlicher, als ich erwartet hatte.

Das Risiko, das ich zuletzt als „nicht ausgeräumt" markiert hatte, ist **kein Risiko mehr, sondern ein
gemessener Zustand**: Vom öffentlichen Ursprung ist der Zugriff auf `127.0.0.1` bereits heute
gesperrt und nur über eine Berechtigung zu öffnen, die die studierende Person erteilen muss und mit
einem Fehlklick dauerhaft verschließt. Das trifft Weg B an drei Stellen zugleich: es kostet den
fünften Schritt, es erzeugt den unangenehmsten Fehlerzustand (`denied`, ohne erneute Abfrage), und es
macht die Bauform von einer Browser-Regel abhängig, die sich erkennbar **gegen** Loopback-Zugriffe
entwickelt. Weg A berührt davon nichts, weil dort keine Anfrage den Container verlässt.

Zwei Dinge bleiben unabhängig von der Richtung stehen:

1. **`vscode-lm-proxy` fällt weg** (B-II, §4.4) — falls Weg B doch gebaut wird, dann mit einer eigenen,
   sehr kleinen Erweiterung, nicht mit dem Fremdprojekt und nicht mit einem Fork.
2. **Die Frage an GitHub ist jetzt der Engpass** (§9). Weg A hängt allein an ihr; alles Technische ist
   entweder gemessen oder braucht nur ein Testkonto. Solange sie offen ist, kommen wir nicht voran —
   und Weg B ist keine Umgehung dieser Frage, sondern stellt eine schwierigere (die Weitergabe der
   Antwort an einen anderen Client).

**Nicht gebaut.** Keine Zeile am Umschalter, wie beauftragt.

---

## 11 — Was ich nicht prüfen konnte

1. ~~Local Network Access von einem öffentlichen Ursprung.~~ **Erledigt**, siehe §4.6: gemessen mit
   echtem Chrome 152 gegen einen echten öffentlichen Ursprung. Ergebnis: standardmäßig gesperrt,
   Berechtigung `local-network-access` mit Vorgabe `prompt`, nach Erteilen 1 ms.
   **Rest-Unsicherheit:** Meine Testseite war statisches HTML, nicht code-server; die CSP von
   code-server war also nicht mit im Spiel. Da die CSP im Worker ohnehin nicht greift (§4.1) und die
   LNA-Sperre unabhängig davon wirkt, erwarte ich keinen Unterschied — geprüft ist es nicht. Das
   Rezept am Ende von §4.6 schließt diese Lücke in einer Minute an der echten Instanz.
2. **Ob die Copilot-Anmeldung im OSS-Build durchläuft** (Weg A) — bis zum Gerätecode gekommen, danach
   offen. Braucht ein Testkonto.
3. **Ob `selectChatModels({vendor:'copilot'})` nach Anmeldung Modelle liefert.** Mechanismus bewiesen
   (§3.4), Deklaration `{"vendor":"copilot"}` im Manifest vorhanden — gemessen ist es nicht.
4. **Ob BYOK/`customendpoint` ohne Abonnement freigeschaltet ist.**
5. **Warum der eingebaute Modellwähler unseren registrierten Anbieter nicht listet** (§3.5).
6. **`Required Mitigations` und `AI Code of Conduct`**, auf die §5.A der Terms verweist.
7. **Verhalten des echten Copilot bei Ratenbegrenzung** — mein Mini-Server kennt kein 429. Die
   Fehlerbehandlung in §5.3 deckt das noch nicht ab.
8. **Ob die Berechtigung `local-network-access` je Ursprung dauerhaft ist** — sie überlebte den
   Neuaufbau der Seite im selben Profil, aber ich habe sie nicht über Browserneustarts hinweg geprüft.
   Für die Zusage „beim nächsten Mal entfällt Schritt 4" in §5.2 wäre das nachzuholen.

### Messumgebung und Hygiene

Container `copilot-probe` und `copilot-caddy`, das Netz `copilot-probe-net`, das Testvolume
`firmware-lab-copilot-ws`, die Mini-Server auf 4000–4009 und 8099, der Wegwerf-Tunnel und die
Browserprofile sind **entfernt**; geprüft mit `docker ps -a`, `docker volume ls`, `lsof` und einem
Abruf der Tunnel-Adresse (530 = fort). Der Tunnel war rund fünf Minuten offen und hat **nur die
statische Testseite** exponiert, nie code-server. An der Laborinstanz wurde nichts verändert und nichts
gemessen. Keine Zugangsdaten verwendet, keine VSIX aus dem Microsoft-Marktplatz geladen, nichts ins
Repository geschrieben außer diesem Bericht, dem Abschnitt in `docs/MULTIUSER.md` und drei
Bildschirmfotos in `docs/evidence/`.

**Beinahe-Fehler, dokumentiert:** Beim Abräumen habe ich `pkill -9 -f cloudflared` benutzt. Auf diesem
Rechner läuft ein **produktiver** cloudflared-Tunnel (der ct-agent-Tunnel, zu dem Zeitpunkt seit 2:41 h);
das Muster hätte ihn getroffen. Er hat überlebt (PID und Laufzeit unverändert, Laborinstanz weiter
`http=200`), aber das war Glück, nicht Sorgfalt. Wer hier aufräumt: den Prozess über seine PID beenden,
nie über den Binärnamen. Nebenbei sichtbar geworden: das Tunnel-Token dieses Prozesses steht in der
Prozessliste und ist damit für jeden lesbar, der auf dem Rechner `ps` ausführen darf.

Nachbau: Die Wegwerf-Erweiterungen sind bewusst nicht im Repository — sie sind in §3–§4 vollständig
beschrieben. Drei Fallstricke: die Anbieter-Methode heißt `provideLanguageModelChatInformation`; eine
Änderung an `contributes.languageModelChatProviders` wird erst nach dem **zweiten** Containerneustart
wirksam (der erste meldet noch `UNKNOWN vendor`); und Colima kann eine Datei aus `/private/tmp` nicht
als Bind-Mount reichen — der Caddyfile-Weg führt über `docker cp` in einen erst später gestarteten
Container.

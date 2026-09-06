# GitHub Copilot in der Tutor-Umgebung: Machbarkeitsprüfung mit Belegen

**Stand:** 2026-09-06 · **Zweig:** `stream-copilot` (aus `origin/next`, 615bc78)
**Auftrag:** Können Studierende ihr eigenes Copilot-Konto in unserer Umgebung nutzen, und kann das
Tutor-Plugin — nach dem Vorbild von [vscode-lm-proxy](https://github.com/ryonakae/vscode-lm-proxy) —
zwischen llm2/Labor und Copilot umschalten? Zusatzauftrag: die Einrichtung muss für Studierende
trivial sein.

Jede Aussage trägt einen Messwert, eine Protokollzeile oder eine Quelle. Was ich nicht prüfen konnte,
steht in [§10](#10-was-ich-nicht-prüfen-konnte) — nicht als Vermutung im Fließtext.

---

## 1 — Die vier Befunde, die die Lage bestimmen

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

## 4 — Weg B (Hauptweg): Copilot auf dem Rechner der Studierenden

Bauform: lokales VS Code der studierenden Person mit ihrem eigenen Copilot, dazu eine Erweiterung, die
einen OpenAI-kompatiblen Server auf `localhost:4000` öffnet; unser Tutor spricht ihn über die
bestehende Browser-Brücke an (Node-Erweiterung im Container → `executeCommand` → Web-Extension im
Browser → `fetch`).

### 4.1 Darf eine https-Seite auf `http://127.0.0.1:4000` zugreifen?

**Ja — aber nur aus dem Web-Worker, nicht aus dem Hauptfenster.** Zwei gegenläufige Ergebnisse aus
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

## 5 — Die Einrichtung aus Sicht der Studierenden

Vorgabe: höchstens fünf Schritte, eine Seite. Der Entwurf hält vier — und zwar dadurch, dass er
**nichts zu konfigurieren** lässt.

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
> 4. **Fertig.** Der Tutor prüft die Verbindung selbst und sagt dir, wenn etwas fehlt.
>
> Beim nächsten Mal entfallen die Schritte 1 und 3: die Erweiterung startet mit VS Code, und das Labor
> merkt sich deine Wahl. Du lässt einfach VS Code offen.
>
> **Solange VS Code zu ist, antwortet der Tutor mit dem Labor-Modell weiter** — du verlierst nichts,
> es wird nur nicht das stärkere Modell.

Vier Schritte, kein Eingabefeld, keine Portnummer, kein Schlüssel, kein Konto anzulegen.

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
| Copilot im lokalen VS Code nicht angemeldet | Weiterreichen, was die Brücke meldet: „Melde dich in VS Code bei Copilot an." |

Zwei Fristen, beide aus den Messungen abgeleitet: **3 s für die Selbstprüfung** (die Sonde braucht
0–5 ms, jede Antwort darüber ist ein Problem) und **60 s für einen Tutor-Aufruf** (LLM-Antwortzeit).

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
| **Technisch machbar** | **Ja, gemessen.** Kette trägt über den Web-Worker: 4–12 ms, bis 256 kB, auch von https. Aus dem Hauptfenster blockiert die CSP. Fehlerfälle vollständig charakterisiert. | **Ja, bereits im Bild.** Erweiterung eingebaut, versionsgleich, Device-Flow läuft bis zur Kontogrenze. | **Nein.** HTTP 410, abgeschaltet 2026-07-30. |
| **Rechtlich** | Schwächer: die Antwort wird an einen anderen Client weitergereicht. Kein ausdrückliches Verbot gefunden, aber genau die Bauform, zu der die Terms schweigen. | Sauberer: eigenes Konto, offizieller Client, kein geteilter Zugang. Eine offene Frage (OSS-Build). | – |
| **Aufwand** | **Mittel.** Eigene lokale Erweiterung (~150 Zeilen), Web-Extension-Endpunkt, Adapter im Tutor, Selbstprüfung, Anleitung. `vscode-lm-proxy` ist **nicht** verwendbar. | **Klein.** `chat.disableAIFeatures` differenzieren, Adapter über `vscode.lm`. | – |
| **Zumutung für Studierende** | Lokales VS Code muss offen sein. Vier Einrichtungsschritte, kein Schlüssel. | Nichts zu installieren; Anmeldung im Browser per Gerätecode. | – |
| **Was noch fehlt** | Beweis, dass Chrome von einem **öffentlichen** Ursprung auf 127.0.0.1 zugreifen darf (Local Network Access). Entscheidung eigene Erweiterung statt Fork. | Copilot-Testkonto. Antwort von GitHub. Datenschutz. | – |

### Vorschlag

**Weg B ist baubar und die Kette ist gemessen** — ich widerspreche der Richtungsentscheidung nicht. Zwei
Dinge muss der Operator aber wissen, bevor gebaut wird, weil sie den Auftrag verändern:

1. **`vscode-lm-proxy` fällt weg** (B-II, §4.4). Der Baustein, auf dem der Vorschlag ruhte, funktioniert
   in unserem Aufbau nicht und hat zusätzlich einen Sicherheitsmangel. Entweder wir schreiben die
   ~150 Zeilen selbst (empfohlen) oder wir pflegen einen Fork.
2. **Ein Risiko ist nicht ausgeräumt** (§10, Punkt 4 unten): Local Network Access. Wenn Chrome den
   Zugriff von unserem öffentlichen Tunnel-Ursprung auf `127.0.0.1` künftig hinter eine
   Berechtigungsabfrage stellt, kippt die gesamte Bauform — bei Weg A nicht.

Meine Empfehlung bleibt deshalb: **die Frage an GitHub jetzt stellen** (§9). Fällt sie zugunsten des
OSS-Builds aus, ist Weg A billiger, robuster und für Studierende zumutbarer — er verlangt kein zweites
offenes Programm. Weg B ist die richtige Wahl, wenn die Antwort ausbleibt oder negativ ist.

**Nicht gebaut.** Keine Zeile am Umschalter, wie beauftragt.

---

## 11 — Was ich nicht prüfen konnte

1. **Local Network Access von einem öffentlichen Ursprung.** Mein https-Test lief von einem *privaten*
   Ursprung (`lab.local` → 192.168.50.201) auf Loopback und war nicht blockiert. Produktiv ist der
   Ursprung **öffentlich** (Cloudflare-Tunnel) — der strengste Fall. Headless-Chromium behandelt
   Berechtigungsabfragen zudem anders als ein echtes Chrome. **Nicht bewiesen.** Nur mit echtem Tunnel
   und echtem Chrome zu klären; das ist die eine Messung, die Weg B noch fehlt.
2. **Ob die Copilot-Anmeldung im OSS-Build durchläuft** (Weg A) — bis zum Gerätecode gekommen, danach
   offen. Braucht ein Testkonto.
3. **Ob `selectChatModels({vendor:'copilot'})` nach Anmeldung Modelle liefert.** Mechanismus bewiesen
   (§3.4), Deklaration `{"vendor":"copilot"}` im Manifest vorhanden — gemessen ist es nicht.
4. **Ob BYOK/`customendpoint` ohne Abonnement freigeschaltet ist.**
5. **Warum der eingebaute Modellwähler unseren registrierten Anbieter nicht listet** (§3.5).
6. **`Required Mitigations` und `AI Code of Conduct`**, auf die §5.A der Terms verweist.
7. **Verhalten des echten Copilot bei Ratenbegrenzung** — mein Mini-Server kennt kein 429. Die
   Fehlerbehandlung in §5.3 deckt das noch nicht ab.

### Messumgebung und Hygiene

Container `copilot-probe` und `copilot-caddy`, das Netz `copilot-probe-net`, das Testvolume
`firmware-lab-copilot-ws`, die Mini-Server auf 4000–4009 und die Browserprofile sind **entfernt**;
geprüft mit `docker ps -a`, `docker volume ls` und `lsof`. Keine Zugangsdaten verwendet, keine VSIX aus
dem Microsoft-Marktplatz geladen, nichts ins Repository geschrieben außer diesem Bericht und drei
Bildschirmfotos in `docs/evidence/`.

Nachbau: Die Wegwerf-Erweiterungen sind bewusst nicht im Repository — sie sind in §3–§4 vollständig
beschrieben. Drei Fallstricke: die Anbieter-Methode heißt `provideLanguageModelChatInformation`; eine
Änderung an `contributes.languageModelChatProviders` wird erst nach dem **zweiten** Containerneustart
wirksam (der erste meldet noch `UNKNOWN vendor`); und Colima kann eine Datei aus `/private/tmp` nicht
als Bind-Mount reichen — der Caddyfile-Weg führt über `docker cp` in einen erst später gestarteten
Container.

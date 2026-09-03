---
id: m4-03-mutex-spi-bus
title: Prioritäten, Präemption und der SPI-Mutex
bloom: analyze
objectives: [cz.rtos.mutex]
requires: [m4-02-ram-budget]
estimatedMinutes: 20
scaffold: independent
recallFrom: [m3-05-spi-mutex]
links:
  - { step: m4-04-iwdg-watchdog }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/reference/hal.md" }
  - { file: "targets/itsboard/hal/hal_spi.c", line: 38 }
  - { file: "apps/bringup/tasks.c", line: 208 }
  - { file: "modules/kernel/include/cads/kernel/kernel.h", line: 44 }
  - { file: "lib/FreeRTOS-Kernel/queue.c", line: 1795 }
sources: [targets/itsboard/hal/hal_spi.c, targets/itsboard/hal/hal_spi.h, apps/bringup/tasks.c, modules/kernel/include/cads/kernel/kernel.h, modules/kernel/src/FreeRTOSConfig.h, lib/FreeRTOS-Kernel/queue.c, docs/explanation/pa7-conflict.md]
tasks:
  - id: inversion-name
    title: Benenne das Phänomen
    check: { type: question, prompt: { en: "The console task holds the SPI bus, the higher-priority input task blocks on it, the middle ui task keeps computing. What is this called?", de: "Die console-Task hält den SPI-Bus, die höher priorisierte input-Task blockiert darauf, die mittlere ui-Task rechnet weiter. Wie heißt das Phänomen?" }, rubric: "Prioritätsinversion (priority inversion). Die Antwort muss den Begriff nennen und die Rollen richtig zuordnen: console hält die Ressource, input wartet darauf, ui verzögert beide, ohne selbst beteiligt zu sein - die dringendste Task wartet also faktisch auf die zweitunwichtigste. Wer nur „Deadlock“ oder „Starvation“ sagt, beschreibt etwas anderes: hier wird niemand blockiert, der nicht irgendwann fertig würde, und der Bus wird auch freigegeben.", bloom: analyze }
  - id: inheritance-condition
    title: Nenne die Bedingung für die Gegenmaßnahme
    check: { type: question, prompt: { en: "Which property must cads_spi_mutex have for FreeRTOS to end that inversion by itself?", de: "Welche Eigenschaft muss cads_spi_mutex haben, damit FreeRTOS diese Inversion von selbst beendet?" }, rubric: "Es muss ein Mutex sein, keine zählende Semaphore. Nur für einen Mutex vermerkt FreeRTOS einen Besitzer und schaltet damit die Prioritätsvererbung frei: xQueueSemaphoreTake ruft xTaskPriorityInherit auf den eingetragenen Halter auf, hebt ihn für die Dauer der Blockade auf die Priorität des Wartenden und nimmt das beim Give zurück. Zusätzlich muss configUSE_MUTEXES eingeschaltet sein. Eine Antwort, die stattdessen „rekursiv“ als die entscheidende Eigenschaft nennt, verwechselt zwei Dinge: rekursiv erlaubt verschachtelte Claims derselben Task, und die rekursive Variante ist ebenfalls ein Mutex - die Vererbung hängt aber am Mutex-Charakter, nicht an der Rekursion.", bloom: analyze }
  - id: find-inheritance
    title: Belege die Vererbung im Kernel-Quelltext
    check: { type: command, cwd: ".", command: "grep -n 'xTaskPriorityInherit' lib/FreeRTOS-Kernel/queue.c", expectExitCode: 0 }
socratic:
  - { trigger: "question:inversion-name:weak", question: { en: "Which of the three tasks is the most urgent, and which one is actually making progress while it waits?", de: "Welche der drei Tasks ist die dringendste, und welche kommt tatsächlich voran, während jene wartet?" }, hints: [ { en: "Sort the three by priority first - the answer is a word about that ordering being turned upside down.", de: "Sortiere die drei zuerst nach Priorität - die Antwort ist ein Wort über genau diese Ordnung, die auf den Kopf gestellt wird." }, { en: "The priority each task is created with is in apps/bringup/tasks.c, in the three cads_thread_start calls; the numbers behind the names are in modules/kernel/include/cads/kernel/kernel.h.", de: "Mit welcher Priorität jede Task angelegt wird, steht in apps/bringup/tasks.c in den drei cads_thread_start-Aufrufen; die Zahlen hinter den Namen stehen in modules/kernel/include/cads/kernel/kernel.h." }, { en: "The middle task never touches the bus at all - it simply outranks the holder, and that alone is enough to stall the most urgent one.", de: "Die mittlere Task fasst den Bus gar nicht an - sie steht nur über dem Halter, und das allein genügt, um die dringendste auszubremsen." } ] }
  - { trigger: "question:inheritance-condition:weak", question: { en: "Which kind of synchronisation object records who currently holds it, and which kind only counts?", de: "Welche Art von Synchronisationsobjekt merkt sich, wer es gerade hält, und welche zählt nur?" }, hints: [ { en: "A remedy that raises the holder needs to know who the holder is - which objects can even answer that question?", de: "Eine Gegenmaßnahme, die den Halter anhebt, muss wissen, wer der Halter ist - welche Objekte können diese Frage überhaupt beantworten?" }, { en: "Open lib/FreeRTOS-Kernel/queue.c and look at what prvInitialiseMutex sets, then at the condition guarding the inheritance call further down.", de: "Öffne lib/FreeRTOS-Kernel/queue.c und sieh dir an, was prvInitialiseMutex setzt, und dann an die Bedingung, die weiter unten den Vererbungsaufruf schützt." }, { en: "Both the plain and the recursive creator route through the same initialiser, so both end up with the same queue type - that is the property the condition tests.", de: "Sowohl der einfache als auch der rekursive Erzeuger laufen durch denselben Initialisierer, beide bekommen also denselben Queue-Typ - genau diese Eigenschaft prüft die Bedingung." } ] }
  - { trigger: "task:find-inheritance:failed", question: { en: "Is the search running from the firmware's top-level directory, and is the vendored kernel where you expect it?", de: "Läuft die Suche aus dem obersten Verzeichnis der Firmware, und liegt der mitgelieferte Kernel dort, wo du ihn erwartest?" }, hints: [ { en: "A grep with no hit exits non-zero - is that the pattern's fault or the path's?", de: "Ein grep ohne Treffer endet mit einem Fehlercode - liegt das am Muster oder am Pfad?" }, { en: "List lib/ and find the directory the FreeRTOS sources are vendored into, then look for queue.c inside it.", de: "Liste lib/ auf und finde das Verzeichnis, in das die FreeRTOS-Quellen eingebettet sind, und suche darin queue.c." }, { en: "The symbol is spelled in FreeRTOS's own naming convention, with the return-type prefix in front and no underscore anywhere.", de: "Das Symbol ist in der Namenskonvention von FreeRTOS geschrieben, mit dem Rückgabetyp-Präfix davor und ohne jeden Unterstrich." } ] }
---
## Lernziel

Analysiere die Scheduler-Seite des geteilten SPI-Busses: welche Prioritäten die drei Tasks tragen, wie Präemption sie ordnet, wie daraus eine Prioritätsinversion entsteht und was FreeRTOS dagegen tut.

## Wiederholung in einem Satz

Die Pin-Seite dieser Geschichte hast du in **M3-05** analysiert: `SPI1_MOSI` und `ETH_RMII_CRS_DV` sind derselbe Pin, `claim_bus`/`release_bus` klammern jeden Blit, und ein bedingungsloser Mutex-Take vor dem Scheduler ließ den Boot abstürzen. Hier geht es um die andere Hälfte: was der **Scheduler** mit diesem Lock macht.

## Drei Tasks, drei Prioritäten

FreeRTOS ist in dieser Firmware **präemptiv** (`configUSE_PREEMPTION 1`) mit acht Prioritätsstufen (`configMAX_PRIORITIES 8`). Präemptiv heißt: wird eine Task lauffähig, die eine höhere Priorität hat als die gerade laufende, unterbricht der Scheduler die laufende sofort — nicht erst am nächsten Yield, nicht erst am nächsten Tick. Die laufbereite Task mit der höchsten Priorität läuft, immer.

`modules/kernel/include/cads/kernel/kernel.h` benennt vier Stufen, und `apps/bringup/tasks.c` verteilt sie:

| Task | Priorität | Warum (Kopfkommentar von `tasks.c`) |
|---|---|---|
| `input` | `CadsPriorityHigh` (5) | tastet Knöpfe und Touch mit 100 Hz ab; eine zu spät gelesene Eingabe *fühlt* sich wie ein Fehler an, auch wenn nichts verloren geht |
| `ui` | `CadsPriorityNormal` (3) | besitzt das Display; ein Flush blockiert bis zu 448 ms, die längste Einzeloperation im System, und alles andere muss das aushalten |
| `console` | `CadsPriorityLow` (1) | Diagnosekanal; darf nichts Echtes verzögern |

Die Reihenfolge ist bewusst gewählt: die kürzeste und zeitkritischste Arbeit oben, die längste in der Mitte, die verzichtbare unten.

## Wo das mit dem Bus kollidiert

Alle drei fassen denselben SPI-Bus an. `ui` flusht das Display, `input` liest den Touch-Controller, `console` treibt Explorer-Befehle, die zeichnen. Der Kommentar `THE MISSING LOCK` am Anfang von `targets/itsboard/hal/hal_spi.c` hält den Fehler fest, der daraus entstand, bevor ein Lock existierte: eine Touch-Lesung hing in `while(!(SR & RXNE))`, während `CR1` den Display-Teiler zeigte — eine andere Task hatte SPI1 mitten im Transfer umkonfiguriert. Die Korrektur legte einen echten **rekursiven FreeRTOS-Mutex** (`cads_spi_mutex`, angelegt mit `xSemaphoreCreateRecursiveMutexStatic`, genommen mit `xSemaphoreTakeRecursive`) in claim/release. *Rekursiv* deshalb, weil sich Claims verschachteln: ein Treiber, der mehrere Transfers unter einem Lock braucht, nimmt den Bus einmal und darf nicht gegen sich selbst verklemmen.

Ein Lock löst das Verzahnungsproblem — und schafft ein zweites, das es ohne Lock gar nicht geben kann.

## Prioritätsinversion

Denk die drei Prioritäten mit dem Mutex zusammen:

1. `console` (niedrig) läuft, nimmt den Bus für einen Explorer-Befehl.
2. `input` (hoch) wird lauffähig, will den Touch-Controller lesen, nimmt den Mutex — er ist belegt, also **blockiert** `input`.
3. `ui` (mittel) wird lauffähig. Sie fasst den Bus gar nicht an, steht aber über `console`, also verdrängt sie `console`.

Ergebnis: die dringendste Task des Systems wartet auf die unwichtigste, und die *mittlere* bestimmt, wie lange. Das heißt **Prioritätsinversion**, und das Unangenehme daran ist, dass die Wartezeit nicht durch die Länge der kritischen Sektion begrenzt ist, sondern durch die Laufzeit einer völlig unbeteiligten Task. Auf diesem Board ist die mittlere Task ausgerechnet die mit dem 448-ms-Flush.

## Was FreeRTOS dagegen hat

Die klassische Gegenmaßnahme ist **Prioritätsvererbung**: solange eine höher priorisierte Task auf einem Mutex blockiert, wird sein Halter vorübergehend auf deren Priorität angehoben, kann also nicht mehr von der mittleren Task verdrängt werden; beim Freigeben fällt er zurück.

FreeRTOS baut das ein, aber nur für Objekte, denen es einen **Besitzer** zuordnet. Der Weg ist in `lib/FreeRTOS-Kernel/queue.c` nachlesbar und besteht aus zwei Stellen:

- `prvInitialiseMutex()` vermerkt für ein neu angelegtes Mutex einen Halter-Zeiger und markiert das Objekt als Mutex-Typ. Sowohl der einfache als auch der **rekursive** Erzeuger laufen durch diesen Initialisierer.
- `xQueueSemaphoreTake()` prüft beim Blockieren genau diese Markierung und ruft dann `xTaskPriorityInherit()` auf den eingetragenen Halter; das Gegenstück beim Freigeben ist `xTaskPriorityDisinherit()`.

`configUSE_MUTEXES` und `configUSE_RECURSIVE_MUTEXES` sind in `modules/kernel/src/FreeRTOSConfig.h` beide auf 1, der Mechanismus ist hier also übersetzt und aktiv. Ob er greift, hängt an einer Eigenschaft des Objekts — welcher, ist deine zweite Aufgabe, und der dritte Check lässt dich die Aufrufstelle selbst finden.

Zwei Grenzen bleiben, auch wenn alles richtig konfiguriert ist. Erstens ist die Vererbung eine *Notbremse*, keine Auslegung: sie begrenzt den Schaden, macht eine zu lange kritische Sektion aber nicht kurz. Zweitens greift sie nur dort, wo ein Mutex im Spiel ist — der Boot nimmt bewusst gar kein Lock (M3-05), und in dieser Phase gibt es auch nichts zu vererben, weil es nur einen Ausführungsfaden gibt.

## Deine Aufgabe

Lies die drei `cads_thread_start`-Aufrufe am Ende von `apps/bringup/tasks.c` und die Prioritätsstufen in `modules/kernel/include/cads/kernel/kernel.h`. Benenne dann das Phänomen aus dem Szenario oben und die Eigenschaft, an der die Gegenmaßnahme hängt. Der dritte Check belegt sie im Kernel-Quelltext. Der nächste Step wendet sich dem zu, was passiert, wenn gar nichts mehr läuft: dem Watchdog.

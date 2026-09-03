---
id: m4-03-mutex-spi-bus
title: Priorities, pre-emption and the SPI mutex
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
    title: Bound the waiting time
    check: { type: question, prompt: { en: "console holds the SPI bus and input, at the highest priority, blocks on it. All three tasks in apps/bringup/tasks.c take that same mutex - the ui task's body is a canvas flush. Given that, what bounds how long input waits, and what would have to change for that bound to disappear?", de: "console hält den SPI-Bus, und input blockiert als höchstpriorisierte Task darauf. Alle drei Tasks in apps/bringup/tasks.c nehmen denselben Mutex - der Rumpf der ui-Task ist ein Canvas-Flush. Wodurch ist damit begrenzt, wie lange input wartet, und was müsste sich ändern, damit diese Schranke wegfällt?" }, rubric: "input's wait is bounded by the length of console's critical section - by the one explorer blit console holds the bus for. The reason has to be named: apps/bringup/tasks.c creates exactly these three tasks, and all three take the same mutex. The body of cads_ui_task() is a call to cads_canvas_flush() whenever the canvas is dirty, and that claims the SPI bus - so ui blocks on the mutex as well rather than pre-empting console. There is no uninvolved middle-priority task on this board. Second part: the bound would disappear the moment there was one - an additional task at CadsPriorityNormal that never touches the bus and only computes could pre-empt console, and input's wait would then be bounded not by the critical section but by that foreign task's run time. That is the textbook case of priority inversion and the reason priority inheritance exists. Passing off the ui task as that uninvolved middle task means its body was not read, and does not pass.", bloom: analyze }
  - id: inheritance-condition
    title: State the condition the remedy depends on
    check: { type: question, prompt: { en: "Which property must cads_spi_mutex have for FreeRTOS to end that inversion by itself?", de: "Welche Eigenschaft muss cads_spi_mutex haben, damit FreeRTOS diese Inversion von selbst beendet?" }, rubric: "It must be a mutex, not a counting semaphore. Only for a mutex does FreeRTOS record an owner, and that is what unlocks priority inheritance: xQueueSemaphoreTake calls xTaskPriorityInherit on the recorded holder, lifts it to the waiter's priority for the duration of the block, and undoes that on the give. configUSE_MUTEXES must also be on. An answer naming „recursive“ as the decisive property confuses two things: recursive allows nested claims from the same task, and the recursive variant is a mutex as well - but the inheritance hangs on being a mutex, not on the recursion.", bloom: analyze }
  - id: find-inheritance
    title: Evidence the inheritance in the kernel source
    check: { type: command, cwd: ".", command: "grep -n 'xTaskPriorityInherit' lib/FreeRTOS-Kernel/queue.c", expectExitCode: 0 }
socratic:
  - { trigger: "question:inversion-name:weak", question: { en: "While input is blocked on the mutex, which task is actually allowed to run - and is there any task on this board that could pre-empt the holder?", de: "Während input auf dem Mutex blockiert: welche Task darf tatsächlich laufen - und gibt es auf diesem Board überhaupt eine Task, die den Halter verdrängen könnte?" }, hints: [ { en: "Read the body of cads_ui_task() in apps/bringup/tasks.c before you assume it is uninvolved: what does it call when the canvas is dirty?", de: "Lies den Rumpf von cads_ui_task() in apps/bringup/tasks.c, bevor du sie für unbeteiligt hältst: was ruft sie auf, wenn das Canvas schmutzig ist?" }, { en: "A task that takes the same mutex cannot pre-empt the task holding it - it blocks instead. Count how many of the three take it.", de: "Eine Task, die denselben Mutex nimmt, kann den Halter nicht verdrängen - sie blockiert stattdessen. Zähl nach, wie viele der drei ihn nehmen." }, { en: "The question asks for a bound and for what would remove it, so end with the task that does not exist here yet and what it would do.", de: "Gefragt sind eine Schranke und das, was sie beseitigen würde - schließe also mit der Task, die es hier noch nicht gibt, und dem, was sie täte." } ] }
  - { trigger: "question:inheritance-condition:weak", question: { en: "Which kind of synchronisation object records who currently holds it, and which kind only counts?", de: "Welche Art von Synchronisationsobjekt merkt sich, wer es gerade hält, und welche zählt nur?" }, hints: [ { en: "A remedy that raises the holder needs to know who the holder is - which objects can even answer that question?", de: "Eine Gegenmaßnahme, die den Halter anhebt, muss wissen, wer der Halter ist - welche Objekte können diese Frage überhaupt beantworten?" }, { en: "Open lib/FreeRTOS-Kernel/queue.c and look at what prvInitialiseMutex sets, then at the condition guarding the inheritance call further down.", de: "Öffne lib/FreeRTOS-Kernel/queue.c und sieh dir an, was prvInitialiseMutex setzt, und dann an die Bedingung, die weiter unten den Vererbungsaufruf schützt." }, { en: "Both the plain and the recursive creator route through the same initialiser, so both end up with the same queue type - that is the property the condition tests.", de: "Sowohl der einfache als auch der rekursive Erzeuger laufen durch denselben Initialisierer, beide bekommen also denselben Queue-Typ - genau diese Eigenschaft prüft die Bedingung." } ] }
  - { trigger: "task:find-inheritance:failed", question: { en: "Is the search running from the firmware's top-level directory, and is the vendored kernel where you expect it?", de: "Läuft die Suche aus dem obersten Verzeichnis der Firmware, und liegt der mitgelieferte Kernel dort, wo du ihn erwartest?" }, hints: [ { en: "A grep with no hit exits non-zero - is that the pattern's fault or the path's?", de: "Ein grep ohne Treffer endet mit einem Fehlercode - liegt das am Muster oder am Pfad?" }, { en: "List lib/ and find the directory the FreeRTOS sources are vendored into, then look for queue.c inside it.", de: "Liste lib/ auf und finde das Verzeichnis, in das die FreeRTOS-Quellen eingebettet sind, und suche darin queue.c." }, { en: "The symbol is spelled in FreeRTOS's own naming convention, with the return-type prefix in front and no underscore anywhere.", de: "Das Symbol ist in der Namenskonvention von FreeRTOS geschrieben, mit dem Rückgabetyp-Präfix davor und ohne jeden Unterstrich." } ] }
---
## Learning goal

Analyse the scheduler side of the shared SPI bus: which priorities the three tasks carry, how pre-emption orders them, how a priority inversion arises from that, and what FreeRTOS does about it.

## Recall, in one sentence

You analysed the pin side of this story in **M3-05**: `SPI1_MOSI` and `ETH_RMII_CRS_DV` are the same pin, `claim_bus`/`release_bus` bracket every blit, and an unconditional mutex take before the scheduler crashed the boot. This step is the other half: what the **scheduler** does with that lock.

## Three tasks, three priorities

FreeRTOS is **pre-emptive** in this firmware (`configUSE_PREEMPTION 1`) with eight priority levels (`configMAX_PRIORITIES 8`). Pre-emptive means: the moment a task becomes runnable that has a higher priority than the running one, the scheduler interrupts the running task at once — not at the next yield, not at the next tick. The highest-priority runnable task runs, always.

`modules/kernel/include/cads/kernel/kernel.h` names four levels, and `apps/bringup/tasks.c` hands them out:

| Task | Priority | Why (`tasks.c` header comment) |
|---|---|---|
| `input` | `CadsPriorityHigh` (5) | samples buttons and touch at 100 Hz; an input read late *feels* like a bug even when nothing is lost |
| `ui` | `CadsPriorityNormal` (3) | owns the display; a flush blocks for up to 448 ms, the longest single operation in the system, and everything else has to tolerate it |
| `console` | `CadsPriorityLow` (1) | diagnostic channel; must never delay anything real |

The ordering is deliberate: the shortest and most time-critical work on top, the longest in the middle, the dispensable one at the bottom.

## Where that collides with the bus

All three touch the same SPI bus. `ui` flushes the display, `input` reads the touch controller, `console` drives explorer commands that draw. The `THE MISSING LOCK` comment at the top of `targets/itsboard/hal/hal_spi.c` records the bug this produced before a lock existed: a touch read hung in `while(!(SR & RXNE))` with `CR1` showing the display divider — another task had reconfigured SPI1 mid-transfer. The fix put a genuine **recursive FreeRTOS mutex** (`cads_spi_mutex`, created with `xSemaphoreCreateRecursiveMutexStatic`, taken with `xSemaphoreTakeRecursive`) inside claim/release. *Recursive* because claims nest: a driver that needs several transfers under one lock takes the bus once and must not deadlock against itself.

A lock solves the interleaving problem — and creates a second one that cannot exist without a lock.

## Priority inversion

Put the three priorities and the mutex together:

1. `console` (low) is running and takes the bus for an explorer command.
2. `input` (high) becomes runnable, wants to read the touch controller, takes the mutex — it is held, so `input` **blocks**.
3. `ui` (middle) becomes runnable, finds the canvas dirty, calls `cads_canvas_flush()` — and thereby claims the same bus. It blocks too.

The result: the most urgent task in the system waits on the least important one. That is **priority inversion**.

On this board, though, it stays **bounded**, and the reason is in the body of the `ui` task. Read it — `cads_ui_task()` in `apps/bringup/tasks.c` is nine lines: flush the canvas if it is dirty, otherwise sleep. So it is not a task that leaves the bus alone; it is the task that holds it longest. That means there is no uninvolved middle task here that could pre-empt `console` while `input` waits: anything wanting to pre-empt the holder would have to not need the mutex — and all three need it. `input`'s wait is therefore bounded by the length of `console`'s critical section, not by some foreign task's run time.

That bound is the point, and it is a consequence of the short task list, not a property of the pattern. The textbook case — an uninvolved middle-priority task that pre-empts the holder for arbitrarily long and thereby decouples the most urgent task's wait from the critical section — is why priority inheritance exists at all. A fourth task at `CadsPriorityNormal` that only computes and never touches the bus would produce it here immediately. That is the first task of this step.

## What FreeRTOS does about it

The classic remedy is **priority inheritance**: while a higher-priority task is blocked on a mutex, its holder is temporarily raised to the waiter's priority, so a middle task can no longer pre-empt it; on release the holder drops back.

FreeRTOS does this here too: the moment `input` blocks, the kernel raises `console` to `CadsPriorityHigh` for the duration. On *this* board it changes nothing about the ordering — there was nobody around who could have pre-empted `console` anyway. It is the guarantee that holds as soon as somebody arrives.

FreeRTOS implements this, but only for objects it assigns an **owner** to. The path is readable in `lib/FreeRTOS-Kernel/queue.c` and consists of two places:

- `prvInitialiseMutex()` records a holder pointer for a newly created mutex and marks the object as being of mutex type. Both the plain and the **recursive** creator route through this initialiser.
- `xQueueSemaphoreTake()` tests exactly that marking when it blocks, and then calls `xTaskPriorityInherit()` on the recorded holder; the counterpart on release is `xTaskPriorityDisinherit()`.

`configUSE_MUTEXES` and `configUSE_RECURSIVE_MUTEXES` are both 1 in `modules/kernel/src/FreeRTOSConfig.h`, so the mechanism is compiled in and live here. Whether it engages depends on one property of the object — which one is your second task, and the third check has you find the call site yourself.

Two limits remain even when everything is configured correctly. First, inheritance is an *emergency brake*, not a design: it bounds the damage but does not make an over-long critical section short. Second, it only applies where a mutex is in play — boot deliberately takes no lock at all (M3-05), and in that phase there is nothing to inherit anyway, because there is only one thread of execution.

## Your task

Read the three `cads_thread_start` calls at the end of `apps/bringup/tasks.c`, the body of `cads_ui_task()` above them, and the priority levels in `modules/kernel/include/cads/kernel/kernel.h`. Then argue what bounds `input`'s wait on this board and what would remove that bound, and name the property the remedy depends on. The third check evidences it in the kernel source. The next step turns to what happens when nothing runs at all: the watchdog.

**Where you do this:**
- Open a file: `Ctrl`/`Cmd`+`P`.
- Open a terminal: menu *Terminal → New Terminal*.
- Open the board console: `F1`, then *CaDS Board: Konsole öffnen*.
- Build: menu *Terminal → Run Build Task…*.

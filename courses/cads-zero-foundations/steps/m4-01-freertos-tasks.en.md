---
id: m4-01-freertos-tasks
title: FreeRTOS without a heap
bloom: apply
objectives: [cz.rtos.tasks]
requires: [m3-05-spi-mutex]
estimatedMinutes: 15
links:
  - { step: m4-02-ram-budget }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "modules/kernel/src/FreeRTOSConfig.h", line: 53 }
  - { file: "apps/bringup/tasks.c", line: 72 }
  - { doc: "docs/ROADMAP.md" }
sources: [modules/kernel/src/FreeRTOSConfig.h, apps/bringup/tasks.c, modules/kernel/src/kernel.c, docs/reference/memory-map.md]
tasks:
  - id: stack-report
    title: Read the per-task stack high-water marks
    check: { type: manual }
  - id: why-static
    title: Explain the allocation and placement choices
    check: { type: question, prompt: { en: "CaDS Zero builds FreeRTOS with static allocation only and places every task stack in CCM. Why no kernel heap at all, why CCM rather than SRAM for the stacks, and what does that choice cost?", de: "CaDS Zero baut FreeRTOS ausschließlich mit statischer Allokation und legt jeden Task-Stack ins CCM. Warum gar kein Kernel-Heap, warum CCM statt SRAM für die Stacks, und was kostet diese Entscheidung?" }, rubric: "States configSUPPORT_DYNAMIC_ALLOCATION=0 so every task/queue/mutex is caller-allocated and the RAM cost is visible at link time; CCM cannot be reached by DMA so it is worthless for buffers but ideal for CPU-only stacks, leaving all 192 KB of DMA-capable SRAM for framebuffer/lwIP; the cost is that stack sizes are fixed compile-time constants in tasks.c and must be sized from evidence.", bloom: analyze }
socratic:
  - { trigger: "question:why-static:weak", question: { en: "Which memory region can a DMA controller on this part never read, and what does that make it good for?", de: "Welchen Speicherbereich kann ein DMA-Controller dieses Chips nie lesen, und wofür ist er dadurch gut?" }, hints: [ { en: "docs/reference/memory-map.md: CCM at 0x10000000 is invisible to every DMA controller.", de: "docs/reference/memory-map.md: CCM bei 0x10000000 ist für jeden DMA-Controller unsichtbar." }, { en: "A task stack is touched only by the CPU, so it can live where DMA buffers cannot.", de: "Einen Task-Stack berührt nur die CPU, er darf also dort liegen, wo DMA-Puffer nicht liegen dürfen." }, { en: "tasks.c: CADS_CCM_SECTION on cads_ui_stack/cads_input_stack/cads_console_stack; FreeRTOSConfig.h line 54 disables dynamic allocation.", de: "tasks.c: CADS_CCM_SECTION an cads_ui_stack/cads_input_stack/cads_console_stack; FreeRTOSConfig.h Zeile 54 schaltet dynamische Allokation ab." } ] }
---
## Learning goal

Understand how CaDS Zero runs FreeRTOS with no kernel heap and task stacks in CCM, and read the live stack report from the board.

## Static allocation only

`modules/kernel/src/FreeRTOSConfig.h` sets `configSUPPORT_STATIC_ALLOCATION 1` and `configSUPPORT_DYNAMIC_ALLOCATION 0`. There is no `pvPortMalloc` and no kernel heap anywhere: every task, queue, mutex and timer is **caller-allocated**. The kernel wrappers in `modules/kernel` (`cads_thread`, `cads_mutex`, `cads_queue`, `cads_timer`, `cads_event`) follow the same convention — the caller owns the storage. Even the idle and timer service tasks get their memory from `vApplicationGetIdleTaskMemory()` / `vApplicationGetTimerTaskMemory()` in `modules/kernel/src/kernel.c`.

Why so strict? Because on this board the SRAM heap *is* the safety margin (`docs/reference/memory-map.md`). A kernel that allocates at run time would spend memory the linker cannot see; a kernel that allocates nothing makes the whole RAM cost visible at link time, where the 48 KB assertion catches it.

## Where the stacks live

`apps/bringup/tasks.c` defines the three application tasks and their stacks, in words:

```c
#define CADS_UI_STACK      512
#define CADS_INPUT_STACK   1024
#define CADS_CONSOLE_STACK 1024

CADS_CCM_SECTION __attribute__((aligned(8))) static uint32_t cads_ui_stack[CADS_UI_STACK];
CADS_CCM_SECTION ... cads_input_stack[CADS_INPUT_STACK];
CADS_CCM_SECTION ... cads_console_stack[CADS_CONSOLE_STACK];
```

`CADS_CCM_SECTION` (from `core/cads_hal.h`) puts them in the linker's `.ccm` output section at `0x10000000`. CCM is invisible to every DMA controller on the STM32F429, which makes it useless for a framebuffer but perfect for a stack: only the CPU ever touches it. The 4 KB main stack (MSP) sits at the top of CCM too (`__cads_main_stack_size = 4K` in the linker script). Result: all 192 KB of DMA-capable SRAM stays free for the framebuffer, staging buffers and lwIP, and CCM — 64 KB, of which the stacks use a few KB — costs nothing scarce.

## Two hooks that keep watch

`configUSE_IDLE_HOOK 1` and `configCHECK_FOR_STACK_OVERFLOW 2` are both on. `vApplicationIdleHook()` in `tasks.c` polls stack-guard sentinels (the canary technique you met in M3); `vApplicationStackOverflowHook()` in `kernel.c` panics instead of continuing, because a task that has run off its stack has already overwritten whatever came next.

## Reading the live numbers

The explorer's `k` command (`cads_tasks_report()` in `tasks.c`) prints each task's stack high-water mark, the task count and the input counters. At the M2 hardware gate the marks converged at ui 224 B, input 132 B, console 372 B — tiny against the budgets, which is exactly why the two later overflows (M4-05) were surprising and why the numbers are worth reading every time.

## Your task

Return the board to the console prompt if needed, run `k`, and note each task's high-water mark. Then answer the question on why the kernel allocates nothing and why the stacks live in CCM.

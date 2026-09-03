---
id: p1-widget-app
title: "Project: your own app with a widget"
bloom: create
objectives: [cz.gui.app]
requires: []
estimatedMinutes: 120
links:
  - { file: "apps/about/cads_about.c" }
  - { file: "apps/menu/cads_menu_app.c" }
  - { doc: "docs/reference/canvas.md" }
sources: [apps/about/cads_about.c, apps/menu/cads_menu_app.c, gui/canvas.h]
tasks:
  - id: app-builds
    title: The app is registered, wired into the menu, and builds
    check: { type: all, checks: [ { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_app_init" }, { type: fileMatches, file: "apps/menu/cads_menu_app.c", pattern: "cads_project_app_init" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the design
    check: { type: question, prompt: { en: "Describe your app's one job, the single widget it draws, and how it keeps its damage small. Why does it never draw outside a view's area, and how does a touch on the soft-key strip reach it as a key press?", de: "Beschreibe die eine Aufgabe deiner App, das eine Widget, das sie zeichnet, und wie sie ihren Schaden klein hält. Warum zeichnet sie nie außerhalb der Fläche einer View, und wie erreicht ein Tipp auf die Softkey-Leiste sie als Tastendruck?" }, rubric: "Names a single clear purpose; identifies one widget and its damage rectangle; explains that drawing is confined to cads_view_area()/dirty_rect and that soft-key touches are routed to key events by the framework so button and touch produce one event stream.", bloom: create }
socratic:
  - { trigger: "task:app-builds:failed", question: { en: "The build cannot see your init, or the menu never calls it. Did you both link the app's library and register it the way apps/about is?", de: "Der Build sieht deine Init nicht, oder das Menü ruft sie nie. Hast du sowohl die Bibliothek der App gelinkt als auch sie so registriert wie apps/about?" }, hints: [ { en: "Model the whole shape on apps/about: a view, softkeys, and a cads_view_dispatcher_add() with a unique view id.", de: "Baue die ganze Form nach apps/about nach: eine View, Softkeys und ein cads_view_dispatcher_add() mit einer eindeutigen View-ID." }, { en: "cads_menu_app.c must #include your header, call cads_project_app_init(dispatcher), and add a cads_menu_item_t row pointing at your view id.", de: "cads_menu_app.c muss deinen Header einbinden, cads_project_app_init(dispatcher) aufrufen und eine cads_menu_item_t-Zeile ergänzen, die auf deine View-ID zeigt." }, { en: "Give the app its own CMake library and link it from apps/menu/CMakeLists.txt, exactly as cads_app_about is linked.", de: "Gib der App eine eigene CMake-Bibliothek und linke sie aus apps/menu/CMakeLists.txt, genau wie cads_app_about gelinkt wird." } ] }
---
## Goal

Add a genuinely new application to CaDS Zero: your own view, one widget, wired into the menu and reachable on the real panel.

## What you build on

This project assumes the Foundations module M5, especially the step where you added your own menu app (m5-03-own-app) and the view/dispatcher model (m5-02-view-dispatcher). Re-read `apps/about/cads_about.c` — it is the smallest complete app in the tree and your best template.

## Requirements

- Create a new app under `apps/<name>/` with its own CMake library, modelled on `apps/about`.
- Expose an init function named exactly **`cads_project_app_init(cads_view_dispatcher_t*)`** that builds a `cads_view_t`, sets a title and soft-keys, and registers a unique view id with `cads_view_dispatcher_add()`.
- Draw **one widget** of your choosing (a gauge, a list, a small readout) using the canvas API, and keep your damage to the rectangle that actually changed — never repaint the whole screen. See `docs/reference/canvas.md`.
- Wire it into the launcher: `#include` your header in `apps/menu/cads_menu_app.c`, call `cads_project_app_init(dispatcher)` alongside the other `cads_*_init` calls, add a `cads_menu_item_t` row pointing at your view id, and link your library from `apps/menu/CMakeLists.txt`.
- Respect the both-targets rule: nothing above the HAL may become board-only, so your app must also build for the host.

## Acceptance

The first check confirms the ELF now contains `cads_project_app_init`, that `apps/menu/cads_menu_app.c` references it, and that the board image builds clean. The second is a design defence: you explain the app's single job, its widget, its damage discipline, and how touch and buttons deliver one event stream.

## Deliver

A small, focused app — one screen that does one thing well — plus a short note on the design choices you made and would defend in review.

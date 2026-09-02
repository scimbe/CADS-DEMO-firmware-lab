---
id: p3-config-option
title: "Project: a configuration option"
bloom: create
objectives: [cz.storage.profiles]
requires: []
estimatedMinutes: 90
links:
  - { file: "scripts/check_profile.py" }
  - { doc: "docs/reference/config-file.md" }
  - { doc: "docs/how-to/configure.md" }
sources: [modules/config/src/cads_config.c, modules/config/include/cads/config/config.h, docs/reference/config-file.md]
tasks:
  - id: option-builds
    title: The new option parses and the image builds
    check: { type: all, checks: [ { type: fileMatches, file: "modules/config/src/cads_config.c", pattern: "project.option" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the option
    check: { type: question, prompt: { en: "Why does runtime configuration live in /config.txt while feature selection lives in a build profile — what failure does keeping them apart prevent? What does your key default to, and what happens to a running board when its value is malformed?", de: "Warum lebt Laufzeitkonfiguration in /config.txt, während Feature-Auswahl in einem Build-Profil lebt — welchen Fehler verhindert die Trennung? Worauf steht dein Schlüssel als Standard, und was passiert mit einem laufenden Board bei einem fehlerhaften Wert?" }, rubric: "Explains the blast-radius argument (a field edit cannot remove the network stack; a build cannot need a running board), states a sensible default, and notes that an unrecognised or malformed value is skipped so the key keeps its default rather than corrupting state.", bloom: create }
socratic:
  - { trigger: "task:option-builds:failed", question: { en: "Your key does not parse. Did you add it in both the struct and the parser, and give it a default?", de: "Dein Schlüssel wird nicht geparst. Hast du ihn in Struktur und Parser ergänzt und ihm einen Standard gegeben?" }, hints: [ { en: "modules/config/include/cads/config/config.h holds the config struct; add your field there.", de: "modules/config/include/cads/config/config.h hält die Konfig-Struktur; ergänze dort dein Feld." }, { en: "modules/config/src/cads_config.c parses keys with key_is(...) and sets a default in the defaults path; add a 'project.option' branch and a default.", de: "modules/config/src/cads_config.c parst Schlüssel mit key_is(...) und setzt einen Standard im Defaults-Pfad; ergänze einen Zweig 'project.option' und einen Standard." }, { en: "Serialise it too if it should survive a round trip, matching the append_kv_* calls already there.", de: "Serialisiere ihn auch, wenn er eine Rundreise überleben soll, passend zu den vorhandenen append_kv_*-Aufrufen." } ] }
---
## Goal

Add a real, persisted configuration option to CaDS Zero — a `/config.txt` key that a running board reads, applies, and degrades from safely when it is wrong.

## What you build on

This project assumes the Foundations steps on the config file (m6-02-config-file) and build profiles (m6-04-build-profiles). The complete format reference is `docs/reference/config-file.md`; the task walkthrough is `docs/how-to/configure.md`.

## Requirements

- Choose a genuinely useful runtime setting and add a key named **`project.option`** (rename it in your own copy if you prefer, but keep that token so the acceptance check can find it).
- Add the field to the config struct in `modules/config/include/cads/config/config.h`, parse it in `modules/config/src/cads_config.c` (follow the existing `key_is(...)` branches), and give it a sensible built-in default so a board with no config file still boots.
- Serialise it alongside the other keys if it should survive a `pull`/`push` round trip.
- Make a malformed value harmless: an unrecognised key is skipped and a bad value keeps the previous one — never a struct full of zeros.
- Keep it out of the build profile: profiles select which apps compile in and are read by CMake at configure time; your option is runtime state read by the firmware at boot. `scripts/check_profile.py` is the tool for the profile side, for contrast.

## Acceptance

The first check confirms `modules/config/src/cads_config.c` now handles `project.option` and that the image builds. The second defends the two-files design, your default, and the failure behaviour of a malformed value.

## Deliver

One new config key that does something worth setting, with a default and safe degradation, plus a note on why it belongs in `/config.txt` rather than a profile.

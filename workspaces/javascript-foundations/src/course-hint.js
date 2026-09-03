// Course scaffolding - not an exercise, and nothing here is for you to change.
//
// Every exercise file only EXPORTS things. Running one directly therefore does
// nothing at all: no output, and an exit code that says success. That is a dead
// end for anyone who has not met module-scoped code before, so each exercise
// imports this file, which turns the silence into a sentence.
//
// It speaks only when Node was asked to run a file under src/. When a test
// imports the exercise, the entry point is the test file and this stays quiet.

import { readFileSync } from "node:fs";
import { basename, sep } from "node:path";

const entry = process.argv[1] ?? "";
const ranFromSrc = entry.includes(`${sep}src${sep}`) || entry.startsWith(`src${sep}`);

if (ranFromSrc) {
  let step = "<step-id>";
  try {
    const firstLine = readFileSync(entry, "utf8").split("\n", 1)[0];
    const found = firstLine.match(/m\d-\d\d-[a-z0-9-]+/);
    if (found) step = found[0];
  } catch {
    // entry unreadable - fall back to the placeholder above
  }

  process.stderr.write(
    [
      "",
      `${basename(entry)} is an exercise, not a program.`,
      "",
      "It only exports functions for a test to call, so running it directly",
      "produces no output - which is easy to mistake for success.",
      "",
      "What checks your work is the test for this step:",
      "",
      `    node --test test/${step}.test.js`,
      "",
      "Run it from the javascript-foundations folder. `ls test/` lists every step.",
      "",
    ].join("\n"),
  );
  process.exitCode = 1;
}

"use strict";
// Feature-detection shim for `node:sqlite` (used by @cads/tutor-platform's LearningEventStore).
// esbuild aliases the bare `node:sqlite` import to this file so the bundle never hard-requires
// a module that older Extension-Host Node builds lack. When node:sqlite is missing, the shim
// exports a DatabaseSync whose constructor throws a recognisable error; the extension catches
// that at store construction time and falls back to a JSON event log (see src/events.ts).
let real = null;
try {
  real = require("node:sqlite");
} catch (_err) {
  real = null;
}
const SQLITE_UNAVAILABLE = "node:sqlite is not available in this Node runtime";
class UnavailableDatabaseSync {
  constructor() {
    const err = new Error(SQLITE_UNAVAILABLE);
    err.code = "ERR_NODE_SQLITE_UNAVAILABLE";
    throw err;
  }
}
module.exports = real ?? { DatabaseSync: UnavailableDatabaseSync, StatementSync: class {} };
module.exports.__sqliteAvailable = real !== null;

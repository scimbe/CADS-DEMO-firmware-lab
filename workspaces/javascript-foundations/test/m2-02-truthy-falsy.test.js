import { test } from "node:test";
import assert from "node:assert/strict";
import { withDefaults } from "../src/m2/settings.js";

test("m2-02 withDefaults fills in missing properties", () => {
  assert.deepEqual(withDefaults({}), { port: 8080, label: "untitled", verbose: true });
  assert.deepEqual(withDefaults({ port: 3000 }), { port: 3000, label: "untitled", verbose: true });
});

test("m2-02 withDefaults keeps falsy values the caller passed on purpose", () => {
  assert.deepEqual(withDefaults({ port: 0, label: "", verbose: false }), { port: 0, label: "", verbose: false });
});

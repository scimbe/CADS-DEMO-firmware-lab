import { test } from "node:test";
import assert from "node:assert/strict";
import { readSettings, listEntries } from "../src/m5/config.js";

test("m5-01 readSettings copies the fields", () => {
  const raw = { host: "localhost", port: 3000, tags: ["a"] };
  assert.deepEqual(readSettings(raw), { host: "localhost", port: 3000, tags: ["a"] });
});

test("m5-01 readSettings copies the tags instead of sharing them", () => {
  const raw = { host: "h", port: 1, tags: ["a"] };
  const settings = readSettings(raw);
  settings.tags.push("b");
  assert.deepEqual(raw.tags, ["a"]);
});

test("m5-01 listEntries renders key=value in insertion order", () => {
  assert.deepEqual(listEntries({ b: 2, a: 1 }), ["b=2", "a=1"]);
  assert.deepEqual(listEntries({}), []);
});

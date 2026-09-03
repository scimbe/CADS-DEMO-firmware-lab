import { test } from "node:test";
import assert from "node:assert/strict";
import { serverPort, adminEmail } from "../src/m5/lookup-deep.js";

test("m5-02 serverPort reads the configured port", () => {
  assert.equal(serverPort({ server: { port: 3000 } }), 3000);
});

test("m5-02 serverPort defaults when a level is missing", () => {
  assert.equal(serverPort({}), 8080);
  assert.equal(serverPort({ server: {} }), 8080);
});

test("m5-02 serverPort keeps a port of 0", () => {
  assert.equal(serverPort({ server: { port: 0 } }), 0);
});

test("m5-02 adminEmail returns null instead of throwing", () => {
  assert.equal(adminEmail({ users: { admin: { email: "a@b.c" } } }), "a@b.c");
  assert.equal(adminEmail({ users: {} }), null);
  assert.equal(adminEmail({}), null);
});

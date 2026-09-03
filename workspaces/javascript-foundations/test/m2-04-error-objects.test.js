import { test } from "node:test";
import assert from "node:assert/strict";
import * as mod from "../src/m2/validation.js";

test("m2-04 ValidationError is an Error with name, message and field", () => {
  const { ValidationError } = mod;
  assert.equal(typeof ValidationError, "function", "ValidationError must be exported");
  const err = new ValidationError("age out of range", "age");
  assert.ok(err instanceof Error);
  assert.ok(err instanceof ValidationError);
  assert.equal(err.name, "ValidationError");
  assert.equal(err.message, "age out of range");
  assert.equal(err.field, "age");
});

test("m2-04 validateUser throws ValidationError naming the bad field", () => {
  const { validateUser, ValidationError } = mod;
  assert.deepEqual(validateUser({ name: "Ada", age: 36 }), { name: "Ada", age: 36 });
  assert.throws(() => validateUser({ name: "", age: 36 }), (err) => err instanceof ValidationError && err.field === "name");
  assert.throws(() => validateUser({ name: "Ada", age: 200 }), (err) => err instanceof ValidationError && err.field === "age");
  assert.throws(() => validateUser({ name: "Ada", age: "36" }), (err) => err instanceof ValidationError && err.field === "age");
});

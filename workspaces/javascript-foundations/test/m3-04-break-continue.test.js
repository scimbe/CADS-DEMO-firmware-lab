import { test } from "node:test";
import assert from "node:assert/strict";
import { stripComments, findInGrid } from "../src/m3/search.js";

test("m3-04 stripComments drops empty and commented lines", () => {
  assert.deepEqual(stripComments(["a", "", "# note", "b"]), ["a", "b"]);
  assert.deepEqual(stripComments(["# only a comment"]), []);
});

test("m3-04 findInGrid reports the first hit row by row", () => {
  const grid = [
    ["a", "b"],
    ["c", "b"],
  ];
  assert.deepEqual(findInGrid(grid, "b"), { row: 0, col: 1 });
  assert.deepEqual(findInGrid(grid, "c"), { row: 1, col: 0 });
  assert.equal(findInGrid(grid, "z"), null);
});

test("m3-04 findInGrid leaves both loops at the first hit", () => {
  let visits = 0;
  const grid = [
    ["x", "hit"],
    ["y", "z"],
  ];
  const counting = grid.map((row) =>
    new Proxy(row, {
      get(target, prop) {
        if (typeof prop === "string" && /^\d+$/.test(prop)) visits += 1;
        return Reflect.get(target, prop);
      },
    }),
  );
  findInGrid(counting, "hit");
  assert.equal(visits, 2);
});

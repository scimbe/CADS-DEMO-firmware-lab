// m3-04-break-continue (reference solution)
export function stripComments(lines) {
  const out = [];
  for (const line of lines) {
    if (line === "") continue;
    if (line.startsWith("#")) continue;
    out.push(line);
  }
  return out;
}

export function findInGrid(grid, target) {
  let found = null;
  outer: for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === target) {
        found = { row, col };
        break outer;
      }
    }
  }
  return found;
}

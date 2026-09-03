// m6-02-async-await
// readRecord(id) resolves with { id, name } after a tick; unknown ids resolve
// with null. It is given and correct - do not change it.
//
// nameOf(id)        -> the record's name, or "unknown" when there is no record
// namesOf(ids)      -> one name per id, in the same order
// Both forget to await, so they hand back Promises instead of strings and the
// assertion prints "+ Promise {".

import "../course-hint.js"; // prints guidance if this file is run directly

const RECORDS = new Map([
  [1, { id: 1, name: "Ada" }],
  [2, { id: 2, name: "Grace" }],
]);

export function readRecord(id) {
  return Promise.resolve(RECORDS.get(id) ?? null);
}

export async function nameOf(id) {
  const record = readRecord(id);
  return record ? record.name : "unknown";
}

export async function namesOf(ids) {
  return ids.map((id) => nameOf(id));
}

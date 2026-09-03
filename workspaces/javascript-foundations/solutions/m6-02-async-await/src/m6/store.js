// m6-02-async-await (reference solution)
const RECORDS = new Map([
  [1, { id: 1, name: "Ada" }],
  [2, { id: 2, name: "Grace" }],
]);

export function readRecord(id) {
  return Promise.resolve(RECORDS.get(id) ?? null);
}

export async function nameOf(id) {
  const record = await readRecord(id);
  return record ? record.name : "unknown";
}

export async function namesOf(ids) {
  return Promise.all(ids.map((id) => nameOf(id)));
}

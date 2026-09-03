// m5-01-objects
// readSettings(raw) builds a settings object from a raw one:
//   { host, port, tags }  - host and port copied, tags copied as a NEW array.
// listEntries(obj) -> ["key=value", ...] for the object's own properties,
//   in insertion order.
// The version below hands back the caller's array, so changing the result
// changes the input too. The test catches that.

export function readSettings(raw) {
  return {
    host: raw.host,
    port: raw.port,
    tags: raw.tags,
  };
}

export function listEntries(obj) {
  throw new Error("TODO: build key=value strings from the own properties");
}

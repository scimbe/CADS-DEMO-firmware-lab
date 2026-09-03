// m5-01-objects (reference solution)
export function readSettings(raw) {
  return {
    host: raw.host,
    port: raw.port,
    tags: [...raw.tags],
  };
}

export function listEntries(obj) {
  return Object.entries(obj).map(([key, value]) => `${key}=${value}`);
}

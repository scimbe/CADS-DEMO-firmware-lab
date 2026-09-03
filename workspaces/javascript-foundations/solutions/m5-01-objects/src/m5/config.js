// m5-01-objects (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
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

// m5-02-optional-chaining (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function serverPort(cfg) {
  return cfg?.server?.port ?? 8080;
}

export function adminEmail(cfg) {
  return cfg?.users?.admin?.email ?? null;
}

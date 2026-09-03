// m5-02-optional-chaining (reference solution)
export function serverPort(cfg) {
  return cfg?.server?.port ?? 8080;
}

export function adminEmail(cfg) {
  return cfg?.users?.admin?.email ?? null;
}

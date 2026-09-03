// m5-02-optional-chaining
// serverPort(cfg)  -> cfg.server.port, or 8080 when server or port is missing.
//                     A port of 0 is a real value and must survive.
// adminEmail(cfg)  -> cfg.users.admin.email, or null when any level is missing.
// Both reach through levels that may not exist. Run the test and read the
// TypeError: Cannot read properties of undefined (reading 'port').

export function serverPort(cfg) {
  return cfg.server.port || 8080;
}

export function adminEmail(cfg) {
  return cfg.users.admin.email;
}

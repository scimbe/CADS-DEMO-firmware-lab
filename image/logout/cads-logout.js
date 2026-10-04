// CaDS Firmware Lab - logout, page side.
//
// Loaded by the code-server workbench document (image/logout/install.sh adds the
// <script> tag at image build time). It is the only piece that can send the
// browser TAB somewhere: VS Code extensions run in an extension host (a web
// worker or a server process) without a DOM, and `vscode.env.openExternal`
// only opens a second tab next to the still-open workbench.
//
// Two jobs:
//  1. Answer the cads-logout extension (status bar "Abmelden", command
//     "CaDS: Abmelden"): on {type:'logout'} over the BroadcastChannel
//     'cads-logout', acknowledge and navigate. Saving files and releasing the
//     board happened in the extension before it asked.
//  2. Fallback: if the extension's status bar entry never shows up (extension
//     missing or disabled), show an own "Abmelden" button, so the image never
//     ends up without a way out.
//
// Where "logout" is (first match wins):
//  a. CADS_LOGOUT_URL of the container (image/entrypoint.d/20-logout-config.sh
//     writes it to cads-logout-config.js) - absolute URL, or a path; "/x" is
//     relative to the HOST, not to the path prefix the lab is served under.
//  b. code-server's own logout endpoint. code-server announces it in the page
//     only when it runs with --auth password (interim instance), and it is
//     relative to wherever code-server is mounted.
//  c. "/logout" on the host: the portal's logout route (praktikum-creator:
//     oauth2-proxy sign_out -> Keycloak end-session), same as the desktop
//     image's #cads-logout-link. This is the forwardAuth case, --auth none.
(function () {
  'use strict';

  var CHANNEL_NAME = 'cads-logout';
  var DEFAULT_URL = '/logout';
  // DOM id VS Code gives the status bar entry of extension cads.cads-logout.
  var STATUSBAR_ITEM_ID = 'cads.cads-logout.abmelden';
  var FALLBACK_BUTTON_ID = 'cads-logout-fallback';
  var FALLBACK_AFTER_MS = 20000;
  var FALLBACK_RECHECK_MS = 5000;

  // Only http(s) targets: the value comes from the container environment, but a
  // "javascript:" URL must never reach location.assign.
  function safeUrl(candidate, href) {
    if (typeof candidate !== 'string' || candidate.trim() === '') return null;
    var url;
    try {
      url = new URL(candidate.trim(), href);
    } catch (e) {
      return null;
    }
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  }

  function resolveLogoutUrl(configured, logoutEndpoint, href) {
    return safeUrl(configured, href) || safeUrl(logoutEndpoint, href) || safeUrl(DEFAULT_URL, href);
  }

  // code-server puts the workbench configuration into a <meta data-settings>.
  function logoutEndpointOf(settingsJson) {
    try {
      var product = JSON.parse(settingsJson).productConfiguration;
      return product && typeof product.logoutEndpoint === 'string' ? product.logoutEndpoint : null;
    } catch (e) {
      return null;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      resolveLogoutUrl: resolveLogoutUrl,
      logoutEndpointOf: logoutEndpointOf,
      CHANNEL_NAME: CHANNEL_NAME,
      STATUSBAR_ITEM_ID: STATUSBAR_ITEM_ID,
      FALLBACK_BUTTON_ID: FALLBACK_BUTTON_ID,
    };
    return;
  }

  function logoutUrl() {
    var config = window.CADS_LOGOUT_CONFIG || {};
    var meta = document.getElementById('vscode-workbench-web-configuration');
    var endpoint = meta ? logoutEndpointOf(meta.getAttribute('data-settings')) : null;
    return resolveLogoutUrl(config.url, endpoint, window.location.href);
  }

  function leave() {
    var url = logoutUrl();
    window.location.assign(url);
    return url;
  }

  if (typeof BroadcastChannel === 'function') {
    var channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'logout') return;
      channel.postMessage({ type: 'ack', url: logoutUrl() });
      leave();
    });
  }

  function showFallbackButton() {
    if (document.getElementById(FALLBACK_BUTTON_ID) || !document.body) return;
    var button = document.createElement('button');
    button.id = FALLBACK_BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Abmelden';
    button.title = 'Vom Firmware-Labor abmelden';
    button.style.cssText =
      'position:fixed;right:12px;bottom:30px;z-index:2147483000;padding:4px 12px;' +
      'font:12px/18px system-ui,sans-serif;color:#fff;background:#0e639c;' +
      'border:1px solid rgba(255,255,255,.4);border-radius:3px;cursor:pointer;';
    button.addEventListener('click', function () {
      var sure = window.confirm(
        'Vom Firmware-Labor abmelden?\n\nBitte vorher alle Dateien speichern. Die Verbindung zum Board wird getrennt.'
      );
      if (sure) leave();
    });
    document.body.appendChild(button);
  }

  function syncFallbackButton() {
    var button = document.getElementById(FALLBACK_BUTTON_ID);
    if (document.getElementById(STATUSBAR_ITEM_ID)) {
      if (button) button.remove();
    } else {
      showFallbackButton();
    }
  }

  setTimeout(function () {
    syncFallbackButton();
    setInterval(syncFallbackButton, FALLBACK_RECHECK_MS);
  }, FALLBACK_AFTER_MS);
})();

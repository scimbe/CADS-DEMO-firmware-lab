// Logout: page script, installer and entrypoint config (docs/LOGOUT.md).
//
// Run: node --test tests/logout/*.test.mjs      (needs node, sh, python3; no docker, no image)
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGE_SCRIPT = join(ROOT, 'image/logout/cads-logout.js');
const INSTALL = join(ROOT, 'image/logout/install.sh');
const ENTRYPOINT = join(ROOT, 'image/entrypoint.d/20-logout-config.sh');
const page = createRequire(import.meta.url)(PAGE_SCRIPT);

function tmp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cads-logout-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// ---- where "logout" is -------------------------------------------------------------------

test('portal mode (--auth none behind /u/<id>/): /logout on the HOST, not below the prefix', () => {
  const href = 'https://rn-praktikum.example.org/u/abc123/?folder=/home/coder/workspace/cads-zero';
  assert.equal(page.resolveLogoutUrl(undefined, null, href), 'https://rn-praktikum.example.org/logout');
});

test('password mode: code-server announces its logout endpoint, relative to its mount point', () => {
  assert.equal(page.resolveLogoutUrl(undefined, './logout', 'http://127.0.0.1:8084/?folder=/x'), 'http://127.0.0.1:8084/logout');
  assert.equal(page.resolveLogoutUrl('', './logout', 'https://lab.example/fw/?folder=/x'), 'https://lab.example/fw/logout');
});

test('CADS_LOGOUT_URL wins over both, as a host path or as an absolute URL', () => {
  const href = 'https://lab.example/u/abc/?folder=/x';
  assert.equal(page.resolveLogoutUrl('/oauth2/sign_out', './logout', href), 'https://lab.example/oauth2/sign_out');
  assert.equal(page.resolveLogoutUrl('https://sso.example/end', null, href), 'https://sso.example/end');
});

test('a configured value that is not an http(s) target is ignored', () => {
  const href = 'https://lab.example/u/abc/';
  assert.equal(page.resolveLogoutUrl('javascript:alert(1)', null, href), 'https://lab.example/logout');
  assert.equal(page.resolveLogoutUrl('data:text/html,x', './logout', href), 'https://lab.example/u/abc/logout');
  assert.equal(page.resolveLogoutUrl(42, null, href), 'https://lab.example/logout');
});

test('logoutEndpointOf reads code-server\'s workbench configuration and survives garbage', () => {
  assert.equal(page.logoutEndpointOf(JSON.stringify({ productConfiguration: { logoutEndpoint: './logout' } })), './logout');
  assert.equal(page.logoutEndpointOf(JSON.stringify({ productConfiguration: {} })), null);
  assert.equal(page.logoutEndpointOf('not json'), null);
  assert.equal(page.logoutEndpointOf(null), null);
});

// ---- the page script as the browser gets it ------------------------------------------------

function fakeBrowser({ href, settings, config }) {
  const listeners = [];
  const posted = [];
  const timers = [];
  const elements = new Map();
  const assigned = [];
  const body = { appendChild: (el) => elements.set(el.id, el) };
  const document = {
    body,
    getElementById: (id) =>
      id === 'vscode-workbench-web-configuration' && settings !== undefined
        ? { getAttribute: () => settings }
        : elements.get(id) ?? null,
    createElement: () => {
      const el = { style: {}, handlers: {}, addEventListener: (type, fn) => (el.handlers[type] = fn), remove: () => elements.delete(el.id) };
      return el;
    },
  };
  const window = {
    CADS_LOGOUT_CONFIG: config,
    location: { href, assign: (url) => assigned.push(url) },
    confirm: () => true,
  };
  class BroadcastChannel {
    addEventListener(_type, fn) {
      listeners.push(fn);
    }
    postMessage(message) {
      posted.push(message);
    }
  }
  const sandbox = {
    window,
    document,
    BroadcastChannel,
    URL,
    JSON,
    setTimeout: (fn) => timers.push(fn),
    setInterval: () => 0,
  };
  vm.runInNewContext(readFileSync(PAGE_SCRIPT, 'utf8'), sandbox);
  return { listeners, posted, timers, elements, assigned };
}

test('the page script is valid JavaScript on its own (it is shipped as a file, not bundled)', () => {
  new Function(readFileSync(PAGE_SCRIPT, 'utf8'));
});

test('a {type:"logout"} request is acknowledged and the tab leaves for the portal logout', () => {
  const b = fakeBrowser({ href: 'https://lab.example/u/abc/?folder=/x', settings: JSON.stringify({ productConfiguration: {} }) });
  b.listeners[0]({ data: { type: 'logout' } });
  assert.deepEqual(JSON.parse(JSON.stringify(b.posted)), [{ type: 'ack', url: 'https://lab.example/logout' }]);
  assert.deepEqual(b.assigned, ['https://lab.example/logout']);
});

test('other messages on the channel do not log anybody out', () => {
  const b = fakeBrowser({ href: 'https://lab.example/', settings: '{}' });
  b.listeners[0]({ data: { type: 'ack', url: 'x' } });
  b.listeners[0]({ data: null });
  assert.deepEqual(b.assigned, []);
});

test('container config beats the endpoint code-server announces', () => {
  const b = fakeBrowser({
    href: 'http://127.0.0.1:8084/',
    settings: JSON.stringify({ productConfiguration: { logoutEndpoint: './logout' } }),
    config: { url: '/sso/logout' },
  });
  b.listeners[0]({ data: { type: 'logout' } });
  assert.deepEqual(b.assigned, ['http://127.0.0.1:8084/sso/logout']);
});

test('fallback button: appears only while the status bar entry is missing, and logs out', () => {
  const b = fakeBrowser({ href: 'http://127.0.0.1:8084/', settings: '{}' });
  assert.equal(b.elements.size, 0, 'nothing before the grace period');
  b.timers[0]();
  const button = b.elements.get(page.FALLBACK_BUTTON_ID);
  assert.equal(button.textContent, 'Abmelden');
  button.handlers.click();
  assert.deepEqual(b.assigned, ['http://127.0.0.1:8084/logout']);
});

test('the names shared with the extension match its sources', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'extensions/cads-logout/package.json'), 'utf8'));
  const ext = readFileSync(join(ROOT, 'extensions/cads-logout/src/extension.ts'), 'utf8');
  const channel = readFileSync(join(ROOT, 'extensions/cads-logout/src/channel.ts'), 'utf8');
  const itemId = /createStatusBarItem\('([^']+)'/.exec(ext)[1];
  assert.equal(page.STATUSBAR_ITEM_ID, `${pkg.publisher}.${pkg.name}.${itemId}`);
  assert.equal(/CHANNEL_NAME = '([^']+)'/.exec(channel)[1], page.CHANNEL_NAME);
});

// ---- install.sh ------------------------------------------------------------------------------

const WORKBENCH_HTML = `<!DOCTYPE html>
<html>
	<head>
		<link rel="icon" href="{{BASE}}/_static/src/browser/media/favicon.ico" />
	</head>
	<body aria-label=""></body>
	<script type="module" src="{{WORKBENCH_WEB_BASE_URL}}/out/vs/code/browser/workbench/workbench.js"></script>
</html>
`;

function fakeCodeServer(t, html = WORKBENCH_HTML) {
  const root = tmp(t);
  const htmlPath = join(root, 'lib/vscode/out/vs/code/browser/workbench/workbench.html');
  mkdirSync(dirname(htmlPath), { recursive: true });
  mkdirSync(join(root, 'src/browser/media'), { recursive: true });
  writeFileSync(htmlPath, html);
  return { root, htmlPath };
}

test('install.sh adds both scripts (config first) through {{BASE}} and is idempotent', (t) => {
  const { root, htmlPath } = fakeCodeServer(t);
  execFileSync('sh', [INSTALL, root]);
  const once = readFileSync(htmlPath, 'utf8');
  execFileSync('sh', [INSTALL, root]);
  assert.equal(readFileSync(htmlPath, 'utf8'), once);
  assert.equal(once.split('cads-logout.js').length - 1, 1);
  assert.ok(once.indexOf('cads-logout-config.js') < once.indexOf('cads-logout.js"'));
  assert.ok(once.includes('<script src="{{BASE}}/_static/src/browser/media/cads-logout.js"></script></html>'));
  assert.ok(!once.includes('<script>'), 'no inline script: the CSP would drop it');
  assert.equal(readFileSync(join(root, 'src/browser/media/cads-logout.js'), 'utf8'), readFileSync(PAGE_SCRIPT, 'utf8'));
  assert.equal(readFileSync(join(root, 'src/browser/media/cads-logout-config.js'), 'utf8'), 'window.CADS_LOGOUT_CONFIG = {};\n');
});

test('install.sh stops the build when the workbench HTML changed shape', (t) => {
  const noBase = fakeCodeServer(t, WORKBENCH_HTML.replace('{{BASE}}/_static/src/browser/media/', '/static/'));
  assert.notEqual(spawnSync('sh', [INSTALL, noBase.root]).status, 0);
  const noRoot = tmp(t);
  assert.notEqual(spawnSync('sh', [INSTALL, noRoot]).status, 0);
});

// ---- entrypoint.d/20-logout-config.sh ----------------------------------------------------------

function runEntrypoint(file, url) {
  const env = { ...process.env, CADS_LOGOUT_CONFIG_FILE: file };
  delete env.CADS_LOGOUT_URL;
  if (url !== undefined) env.CADS_LOGOUT_URL = url;
  return spawnSync('sh', [ENTRYPOINT], { env, encoding: 'utf8' });
}
function evalConfig(file) {
  const window = {};
  vm.runInNewContext(readFileSync(file, 'utf8'), { window });
  return JSON.parse(JSON.stringify(window.CADS_LOGOUT_CONFIG));
}

test('entrypoint writes CADS_LOGOUT_URL into the config, and clears it again when unset', (t) => {
  const file = join(tmp(t), 'cads-logout-config.js');
  writeFileSync(file, 'window.CADS_LOGOUT_CONFIG = {};\n');
  assert.equal(runEntrypoint(file, ' https://sso.example/logout?rd=/ ').status, 0);
  assert.deepEqual(evalConfig(file), { url: 'https://sso.example/logout?rd=/' });
  assert.equal(runEntrypoint(file, undefined).status, 0);
  assert.deepEqual(evalConfig(file), {});
});

test('entrypoint: a hostile value stays data and cannot close the script element', (t) => {
  const file = join(tmp(t), 'cads-logout-config.js');
  writeFileSync(file, 'window.CADS_LOGOUT_CONFIG = {};\n');
  const evil = '"};</script><script>alert(1)//\\';
  assert.equal(runEntrypoint(file, evil).status, 0);
  assert.ok(!readFileSync(file, 'utf8').includes('</script>'));
  assert.deepEqual(evalConfig(file), { url: evil });
});

test('entrypoint never fails the container start: a missing config file is only a warning', (t) => {
  const result = runEntrypoint(join(tmp(t), 'missing.js'), '/logout');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /WARNUNG/);
});

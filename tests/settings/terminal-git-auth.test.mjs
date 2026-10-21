// git login prompts in the integrated terminal (image/settings/user-settings.json,
// "git.terminalAuthentication").
//
// Run: node --test tests/settings/*.test.mjs   (needs node, git; no docker, no network)
//
// Defect: `git fetch origin` on an HTTPS remote that needs a login printed
// nothing and never returned. The Git extension had set GIT_ASKPASS for the
// terminal, so git asked for the user name in a small input box at the top of
// the window instead of in the terminal. The stand-in below plays that input
// box (an askpass program that never answers); a local server plays the
// GitLab that wants a login.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETTINGS = join(ROOT, 'image/settings/user-settings.json');

/** JSON with // comments (the settings file), comments outside strings removed. */
function readJsonc(path) {
  const src = readFileSync(path, 'utf8');
  let out = '';
  for (let i = 0, inStr = false; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      out += c;
      if (c === '\\') out += src[++i];
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
      out += c;
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
    } else {
      out += c;
    }
  }
  return JSON.parse(out);
}

/** An HTTPS-remote stand-in on 127.0.0.1 that answers every request with "login required". */
async function loginRequired(t) {
  const server = createServer((req, res) => {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="GitLab"' });
    res.end('HTTP Basic: Access denied\n');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}/gruppe/fork.git`;
}

/** git ls-remote in a clean environment; resolves with exit code (null = killed), output and duration. */
function lsRemote(t, url, extraEnv, killAfterMs) {
  const dir = mkdtempSync(join(tmpdir(), 'cads-askpass-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // The input box nobody sees: asks, never answers.
  const askpass = join(dir, 'askpass.sh');
  writeFileSync(askpass, '#!/bin/sh\nexec sleep 3600\n');
  chmodSync(askpass, 0o755);
  const env = {
    PATH: process.env.PATH,
    HOME: dir,
    // No helper of the machine running the test (keychain, store, cache).
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(dir, 'gitconfig'),
    ...extraEnv,
  };
  for (const [k, v] of Object.entries(env)) if (v === '@askpass') env[k] = askpass;
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn('git', ['ls-remote', url], { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, killAfterMs);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, ms: Date.now() - t0 }); });
  });
}

test('the image switches the terminal askpass of the Git extension off', () => {
  const s = readJsonc(SETTINGS);
  assert.equal(s['git.terminalAuthentication'], false);
  // The Source Control view keeps its prompt: only the terminal changes.
  assert.notEqual(s['git.useIntegratedAskPass'], false);
});

test('before: with the terminal askpass, git waits silently for an answer that never comes', async (t) => {
  const url = await loginRequired(t);
  const r = await lsRemote(t, url, { GIT_ASKPASS: '@askpass' }, 3000);
  assert.equal(r.code, null, `git should still wait, got exit ${r.code}: ${r.out}`);
  assert.equal(r.out.trim(), '', 'nothing in the terminal - the defect as reported');
});

test('after: without it, git asks in the terminal (here: no terminal, so a clear error at once)', async (t) => {
  const url = await loginRequired(t);
  const r = await lsRemote(t, url, { GIT_TERMINAL_PROMPT: '0' }, 20000);
  assert.notEqual(r.code, null, 'git must not hang');
  assert.notEqual(r.code, 0);
  assert.match(r.out, /could not read Username for 'http:\/\/127\.0\.0\.1:\d+'/);
  assert.ok(r.ms < 10000, `took ${r.ms} ms`);
});

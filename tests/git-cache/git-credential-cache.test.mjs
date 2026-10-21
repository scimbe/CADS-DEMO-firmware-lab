// git logins kept in memory for the session (image/entrypoint.d/35-git-credential-cache.sh).
//
// Run: node --test tests/git-cache/*.test.mjs   (needs node, sh, git; no docker, no network)
//
// Without it, git asks for user name and access token of the student's own
// GitLab project on every fetch and push.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'image/entrypoint.d/35-git-credential-cache.sh');
const TOKEN = 'glpat-test-0000000000';

function box(t) {
  // Short path: the cache daemon's unix socket lives under $HOME.
  const dir = mkdtempSync(join(tmpdir(), 'cc-'));
  const home = join(dir, 'h');
  mkdirSync(home);
  const credDir = join(dir, 'cred');
  mkdirSync(credDir);
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    XDG_CACHE_HOME: join(home, '.cache'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(home, '.gitconfig'),
    CADS_GIT_CRED_DIR: credDir,
  };
  const git = (args, input) => spawnSync('git', args, { env, input, encoding: 'utf8' });
  t.after(() => {
    git(['credential-cache', 'exit']);
    rmSync(dir, { recursive: true, force: true });
  });
  const run = (vars = {}) => spawnSync('sh', [SCRIPT], { env: { ...env, ...vars }, encoding: 'utf8' });
  const helpers = () => git(['config', '--global', '--get-all', 'credential.helper']).stdout.trim().split('\n').filter(Boolean);
  return { dir, home, credDir, env, git, run, helpers };
}

test('sets the in-memory cache as the session helper', (t) => {
  const b = box(t);
  const r = b.run();
  assert.equal(r.status, 0);
  assert.deepEqual(b.helpers(), ['cache --timeout=28800']);
  assert.match(r.stdout, /\[cads-git-cache\] .*credential-cache/);
});

test('a second start adds nothing; a helper the student chose stays', (t) => {
  const b = box(t);
  b.run();
  b.run();
  assert.deepEqual(b.helpers(), ['cache --timeout=28800']);

  const c = box(t);
  c.git(['config', '--global', 'credential.helper', 'cache --timeout=600']);
  const r = c.run();
  assert.equal(r.status, 0);
  assert.deepEqual(c.helpers(), ['cache --timeout=600']);
});

test('a bad timeout falls back to the default', (t) => {
  const b = box(t);
  b.run({ CADS_GIT_CRED_CACHE_TIMEOUT: '8h; rm -rf /' });
  assert.deepEqual(b.helpers(), ['cache --timeout=28800']);
});

test('with a credential broker socket nothing is cached', async (t) => {
  const b = box(t);
  const server = createServer();
  await new Promise((resolve) => server.listen(join(b.credDir, 'broker.sock'), resolve));
  t.after(() => server.close());
  const r = b.run();
  assert.equal(r.status, 0);
  assert.deepEqual(b.helpers(), []);
  assert.match(r.stdout, /Broker/);
});

test('after one login git answers from memory, and no file holds the token', (t) => {
  const b = box(t);
  b.run();
  // An askpass that fails: any question after the first login is an error.
  const askpass = join(b.dir, 'askpass.sh');
  writeFileSync(askpass, '#!/bin/sh\necho asked >&2\nexit 1\n');
  chmodSync(askpass, 0o755);
  const req = 'protocol=https\nhost=gitlab.example.org\npath=stud/cads-zero-firmware.git\n\n';
  // The first, successful login: git stores what worked ("approve").
  const ok = b.git(['credential', 'approve'], `${req.trimEnd()}\nusername=stud\npassword=${TOKEN}\n\n`);
  assert.equal(ok.status, 0, ok.stderr);
  // Later fetches and pushes ask the helpers first.
  const env = { ...b.env, GIT_ASKPASS: askpass, GIT_TERMINAL_PROMPT: '0' };
  const r = spawnSync('git', ['credential', 'fill'], { env, input: req, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^username=stud$/m);
  assert.match(r.stdout, new RegExp(`^password=${TOKEN}$`, 'm'));
  assert.doesNotMatch(r.stderr, /asked/);
  // Nothing on disk carries it (the cache socket is not a regular file).
  const files = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(d, e.name)) : e.isFile() ? [join(d, e.name)] : []);
  for (const f of files(b.home)) assert.ok(!readFileSync(f, 'utf8').includes(TOKEN), `token found in ${f}`);
});

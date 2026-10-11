// The start-script runner (image/entrypoint/run-entrypoint-d.sh, docs/ENTRYPOINT.md).
//
// Run: node --test tests/entrypoint/*.test.mjs   (needs node, sh, bash, git; no docker)
//
// A file without the executable bit stands in for a script on a noexec mount:
// in both cases access(X_OK) - `test -x`, `find -executable` - says no. The real
// noexec bind mount is covered by e2e/entrypoint-smoke.sh against the image.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUNNER = join(ROOT, 'image/entrypoint/run-entrypoint-d.sh');
const STANDIN = join(ROOT, 'tests/entrypoint/fixtures/15-user-repo-standin.sh');
const IDENTITY = join(ROOT, 'image/entrypoint.d/30-git-identity.sh');

function box(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cads-entry-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const d = join(dir, 'entrypoint.d');
  mkdirSync(d);
  const trace = join(dir, 'trace');
  const add = (name, body, mode = 0o755) => {
    writeFileSync(join(d, name), body);
    chmodSync(join(d, name), mode);
  };
  const run = (env = {}, opts = {}) =>
    spawnSync('sh', [RUNNER], {
      env: { PATH: process.env.PATH, HOME: dir, CADS_ENTRYPOINT_DIR: d, TRACE: trace, ...env },
      encoding: 'utf8',
      ...opts,
    });
  const traced = () => {
    try {
      return readFileSync(trace, 'utf8').trim().split('\n');
    } catch {
      return [];
    }
  };
  return { dir, d, add, run, traced };
}
const lines = (r) => r.stdout.split('\n').filter((l) => l.startsWith('entrypoint: '));
const mark = (name) => `#!/bin/sh\necho ${name} >> "$TRACE"\n`;

test('runs the scripts in sorted order, whatever order they were created in', (t) => {
  const b = box(t);
  for (const name of ['30-c.sh', '10-a.sh', '20-b.sh', '15-ab.sh']) b.add(name, mark(name));
  const r = b.run();
  assert.equal(r.status, 0);
  assert.deepEqual(b.traced(), ['10-a.sh', '15-ab.sh', '20-b.sh', '30-c.sh']);
  assert.deepEqual(lines(r), ['10-a.sh', '15-ab.sh', '20-b.sh', '30-c.sh'].map((n) => `entrypoint: ${n} ok`));
});

test('a *.sh that is not executable (noexec mount) is run, not silently skipped', (t) => {
  const b = box(t);
  b.add('10-a.sh', mark('10-a.sh'));
  b.add('15-mounted.sh', mark('15-mounted.sh'), 0o644);
  assert.notEqual(spawnSync('test', ['-x', join(b.d, '15-mounted.sh')]).status, 0, 'precondition: test -x says no');
  const r = b.run();
  assert.deepEqual(b.traced(), ['10-a.sh', '15-mounted.sh']);
  assert.ok(lines(r).includes('entrypoint: 15-mounted.sh ok'));
});

test('the interpreter follows the first line: a bash script is not run by sh', (t) => {
  const b = box(t);
  b.add('15-bash.sh', '#!/usr/bin/env bash\nset -euo pipefail\nx=(a b)\n[[ ${#x[@]} == 2 ]] && echo bash >> "$TRACE"\n', 0o644);
  b.add('16-sh.sh', '#!/bin/sh\necho sh >> "$TRACE"\n', 0o644);
  const r = b.run();
  assert.deepEqual(b.traced(), ['bash', 'sh']);
  assert.deepEqual(lines(r), ['entrypoint: 15-bash.sh ok', 'entrypoint: 16-sh.sh ok']);
});

test('a failing script is named with its exit code and does not stop the others or the start', (t) => {
  const b = box(t);
  b.add('10-a.sh', mark('10-a.sh'));
  b.add('20-kaputt.sh', '#!/bin/sh\necho "geheimer Inhalt"\nexit 7\n');
  b.add('25-kaputt-noexec.sh', '#!/bin/sh\nexit 3\n', 0o644);
  b.add('30-c.sh', mark('30-c.sh'));
  const r = b.run();
  assert.equal(r.status, 0, 'the runner itself never fails: code-server must start');
  assert.deepEqual(b.traced(), ['10-a.sh', '30-c.sh']);
  assert.deepEqual(lines(r), [
    'entrypoint: 10-a.sh ok',
    'entrypoint: 20-kaputt.sh FEHLER rc=7',
    'entrypoint: 25-kaputt-noexec.sh FEHLER rc=3',
    'entrypoint: 30-c.sh ok',
  ]);
});

test('the runner\'s own lines carry names and exit codes only', (t) => {
  const b = box(t);
  b.add('10-a.sh', '#!/bin/sh\nexit 1\n');
  const r = b.run({ CADS_GIT_EMAIL: 'geheim@example.org', CADS_GIT_NAME: 'Geheimer Name' });
  for (const line of lines(r)) assert.match(line, /^entrypoint: [\w.-]+ (ok|FEHLER rc=\d+)$/);
});

test('a directory where a script should be (missing bind-mount source) is reported', (t) => {
  const b = box(t);
  mkdirSync(join(b.d, '15-user-repo.sh'));
  b.add('30-c.sh', mark('30-c.sh'));
  const r = b.run();
  assert.equal(r.status, 0);
  assert.match(r.stdout, /entrypoint: 15-user-repo\.sh FEHLER: ist ein Verzeichnis/);
  assert.deepEqual(b.traced(), ['30-c.sh']);
});

test('executable files without .sh still run (as before); other non-executables are skipped and named', (t) => {
  const b = box(t);
  b.add('10-tool', mark('10-tool'));
  b.add('README.txt', 'kein Skript\n', 0o644);
  const r = b.run();
  assert.deepEqual(b.traced(), ['10-tool']);
  assert.ok(lines(r).includes('entrypoint: README.txt uebersprungen (nicht ausfuehrbar, kein .sh)'));
});

test('scripts do not inherit the runner\'s stdin and cannot eat the list of scripts', (t) => {
  const b = box(t);
  b.add('10-reads.sh', '#!/bin/sh\ncat >/dev/null\necho 10 >> "$TRACE"\n');
  b.add('20-after.sh', mark('20'));
  const r = b.run({}, { input: 'x\n', timeout: 20000 });
  assert.equal(r.status, 0);
  assert.deepEqual(b.traced(), ['10', '20']);
});

test('a missing or empty directory is not an error', (t) => {
  const b = box(t);
  assert.equal(b.run().status, 0);
  assert.equal(b.run({ CADS_ENTRYPOINT_DIR: join(b.dir, 'gibt-es-nicht') }).status, 0);
});

test('names with spaces work', (t) => {
  const b = box(t);
  b.add('15 mit leerzeichen.sh', mark('spaced'), 0o644);
  b.run();
  assert.deepEqual(b.traced(), ['spaced']);
});

// ---- the case from the lab: a mounted 15-* next to the image's 30-git-identity.sh ------------

function lab(t, extra = {}) {
  const b = box(t);
  const home = join(b.dir, 'home');
  const ws = join(b.dir, 'ws');
  const bin = join(b.dir, 'bin');
  mkdirSync(home);
  mkdirSync(bin);
  writeFileSync(join(bin, 'git-credential-oauth'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(bin, 'git-credential-oauth'), 0o755);
  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: home,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(home, '.gitconfig'),
    CADS_WORKSPACE: ws,
    CADS_SEED_SCRIPT: join(b.dir, 'no-seed.sh'),
    // what the launcher sets for the access "riisc"
    CADS_GIT_MODE: 'github-device',
    CADS_GIT_NAME: 'Jürgen "Jay" Müller',
    CADS_GIT_EMAIL: 'juergen@example.org',
    GIT_CONFIG_COUNT: '0',
    GIT_CONFIG_KEY_0: 'credential.helper',
    GIT_CONFIG_VALUE_0: '!f() { exit 0; }; f',
    ...extra,
  };
  execFileSync('git', ['init', '-q', ws], { env });
  copyFileSync(STANDIN, join(b.d, '15-user-repo.sh'));
  chmodSync(join(b.d, '15-user-repo.sh'), 0o644);
  copyFileSync(IDENTITY, join(b.d, '30-git-identity.sh'));
  chmodSync(join(b.d, '30-git-identity.sh'), 0o755);

  const r = b.run(env);
  const git = (...args) => spawnSync('git', args, { cwd: ws, env, encoding: 'utf8' }).stdout.trim();
  const helpers = () =>
    spawnSync('git', ['config', '--global', '--get-all', 'credential.https://github.com.helper'], { env, encoding: 'utf8' }).stdout;
  return { r, git, helpers };
}

test('mounted 15-* (noexec) and 30-git-identity.sh together: helper and identity are set, in order', (t) => {
  const { r, git, helpers } = lab(t);
  assert.deepEqual(lines(r), ['entrypoint: 15-user-repo.sh ok', 'entrypoint: 30-git-identity.sh ok']);
  // the leading empty entry resets helpers inherited from other config levels
  assert.equal(helpers(), '\ncache --timeout=28800\noauth -device\n');
  assert.equal(git('config', '--local', '--get', 'user.name'), 'Jürgen "Jay" Müller');
  assert.equal(git('config', '--local', '--get', 'user.email'), 'juergen@example.org');
  assert.equal(git('config', '--global', '--get', 'user.name'), 'Jürgen "Jay" Müller');
  assert.ok(!r.stdout.includes('juergen@'), 'no address in the log');
});

// Announced for the launcher: it will run 15-user-repo.sh itself (through `sh`)
// and then set CADS_USER_REPO_ERLEDIGT=1; the script then returns at once. The
// runner may call it a second time - that call must not do the work again.
test('CADS_USER_REPO_ERLEDIGT=1: the runner still calls 15-*, but the script does nothing a second time', (t) => {
  const { r, git, helpers } = lab(t, { CADS_USER_REPO_ERLEDIGT: '1' });
  assert.deepEqual(lines(r), ['entrypoint: 15-user-repo.sh ok', 'entrypoint: 30-git-identity.sh ok']);
  assert.ok(!r.stdout.includes('[cads-git]'), 'no second run of the script body');
  assert.equal(helpers(), '', 'the helper is the launcher\'s business in this case - not set here');
  // the image's own step is independent of the launcher's script
  assert.equal(git('config', '--local', '--get', 'user.name'), 'Jürgen "Jay" Müller');
  assert.equal(git('config', '--local', '--get', 'user.email'), 'juergen@example.org');
});

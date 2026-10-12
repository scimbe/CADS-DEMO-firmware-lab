// The start-script runner (image/entrypoint/run-entrypoint-d.sh, docs/ENTRYPOINT.md).
//
// Run: node --test tests/entrypoint/*.test.mjs   (needs node, sh, bash, git; no docker)
//
// A file without the executable bit stands in for a script on a noexec mount:
// in both cases access(X_OK) - `test -x`, `find -executable` - says no. The real
// noexec bind mount is covered by e2e/entrypoint-smoke.sh against the image.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  const run = (env = {}, opts = {}, runner = RUNNER) =>
    spawnSync('sh', [runner], {
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

// A mutant is a copy of the runner with one safeguard removed. Each test below
// runs the mutant as well: if the mutant passed too, the test would not guard
// anything.
function mutant(t, from, to) {
  const src = readFileSync(RUNNER, 'utf8');
  assert.ok(src.includes(from), `mutation target not found: ${from}`);
  const dir = mkdtempSync(join(tmpdir(), 'cads-mutant-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'run-entrypoint-d.sh');
  writeFileSync(file, src.split(from).join(to));
  return file;
}

test('scripts get no stdin: what is piped into the runner never reaches a script', (t) => {
  const b = box(t);
  b.add('10-reads.sh', '#!/bin/sh\n{ echo "stdin=[$(cat)]"; } >> "$TRACE"\n');
  b.add('20-after.sh', mark('20'));
  const r = b.run({}, { input: 'GEHEIM-AUF-STDIN\n', timeout: 20000 });
  assert.equal(r.status, 0);
  assert.deepEqual(b.traced(), ['stdin=[]', '20']);
  // without "</dev/null" the script reads the runner's stdin
  b.add('10-reads.sh', '#!/bin/sh\n{ echo "stdin=[$(cat)]"; } >> "$TRACE"\n');
  rmSync(join(b.dir, 'trace'), { force: true });
  b.run({}, { input: 'GEHEIM-AUF-STDIN\n', timeout: 20000 }, mutant(t, ' </dev/null', ''));
  assert.deepEqual(b.traced(), ['stdin=[GEHEIM-AUF-STDIN]', '20'], 'mutant must differ, else this test guards nothing');
});

test('sorting is bytewise, not by the locale ls uses', (t) => {
  const b = box(t);
  const names = ['10_c.sh', '10-a.sh', '10-B.sh', '10-1.sh'];
  for (const name of names) b.add(name, mark(name));
  const bytewise = [...names].sort((x, y) => (Buffer.compare(Buffer.from(x), Buffer.from(y))));
  const env = { LC_ALL: 'en_US.UTF-8' };
  const r = b.run(env);
  assert.deepEqual(b.traced(), bytewise);
  assert.deepEqual(lines(r), bytewise.map((n) => `entrypoint: ${n} ok`));
  // Mutant without the explicit sort: it differs only where ls sorts by locale.
  const lsOrder = spawnSync('ls', ['-1A', b.d], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' }).stdout.trim().split('\n');
  if (JSON.stringify(lsOrder) === JSON.stringify(bytewise)) {
    t.diagnostic('ls sorts bytewise in en_US.UTF-8 here (e.g. macOS or locale missing) - mutant check skipped');
    return;
  }
  rmSync(join(b.dir, 'trace'), { force: true });
  b.run(env, {}, mutant(t, ' | LC_ALL=C sort', ''));
  assert.notDeepEqual(b.traced(), bytewise, 'mutant without sort must differ, else this test guards nothing');
});

test('the last script failing is still reported, and the runner still exits 0', (t) => {
  const b = box(t);
  b.add('10-a.sh', mark('10-a.sh'));
  b.add('90-letztes.sh', '#!/bin/sh\nexit 5\n');
  const r = b.run();
  assert.equal(r.status, 0);
  assert.deepEqual(lines(r), ['entrypoint: 10-a.sh ok', 'entrypoint: 90-letztes.sh FEHLER rc=5']);
});

test('a name with glob characters runs as itself and does not expand in the working directory', (t) => {
  const b = box(t);
  const cwd = join(b.dir, 'cwd');
  mkdirSync(cwd);
  writeFileSync(join(cwd, '20-fremd.sh'), 'kein Startskript\n');
  b.add('20-*.sh', mark('stern'));
  const r = b.run({}, { cwd });
  assert.deepEqual(b.traced(), ['stern']);
  assert.deepEqual(lines(r), ['entrypoint: 20-*.sh ok']);
  rmSync(join(b.dir, 'trace'), { force: true });
  const m = b.run({}, { cwd }, mutant(t, '\nset -f\n', '\n'));
  assert.notDeepEqual(lines(m), ['entrypoint: 20-*.sh ok'], 'mutant without set -f must differ');
});

test('a dangling symlink is reported as FEHLER, not skipped silently', (t) => {
  const b = box(t);
  symlinkSync(join(b.dir, 'gibt-es-nicht.sh'), join(b.d, '15-user-repo.sh'));
  b.add('30-c.sh', mark('30-c.sh'));
  const r = b.run();
  assert.equal(r.status, 0);
  assert.deepEqual(lines(r), ['entrypoint: 15-user-repo.sh FEHLER: Verweis ins Leere (Ziel des Symlinks fehlt)', 'entrypoint: 30-c.sh ok']);
  assert.deepEqual(b.traced(), ['30-c.sh']);
});

test('an entry that is not a regular file gets its own line (guard case)', (t) => {
  const b = box(t);
  const fifo = join(b.d, '12-fifo.sh');
  if (spawnSync('mkfifo', [fifo]).status !== 0) return t.skip('mkfifo not available');
  b.add('30-c.sh', mark('30-c.sh'));
  const r = b.run({}, { timeout: 20000 });
  assert.equal(r.status, 0, 'the runner must not block on the FIFO');
  assert.deepEqual(lines(r), ['entrypoint: 12-fifo.sh uebersprungen (keine regulaere Datei)', 'entrypoint: 30-c.sh ok']);
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

function lab(t, extra = {}, prepare = () => {}) {
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

  prepare(b);
  const r = b.run(env);
  const git = (...args) => spawnSync('git', args, { cwd: ws, env, encoding: 'utf8' }).stdout.trim();
  const helpers = () =>
    spawnSync('git', ['config', '--global', '--get-all', 'credential.https://github.com.helper'], { env, encoding: 'utf8' }).stdout;
  return { r, git, helpers, b, env, ws };
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

// The launcher runs 15-user-repo.sh itself (through `sh`) before the image's
// start and then writes /tmp/.cads-user-repo-erledigt with the start time of
// PID 1 - also when the script failed. The runner calls the script again; with
// a marker of THIS start that one call does nothing and uses the marker up.
// The start time comes from /proc/1/stat, which macOS does not have: the tests
// that need a matching marker are skipped there, the others run everywhere.
function pid1Start() {
  try {
    return readFileSync('/proc/1/stat', 'utf8').split(') ').pop().split(' ')[19];
  } catch {
    return null;
  }
}
const NO_PROC = pid1Start() === null && 'no /proc/1/stat on this system (macOS): no marker can match';

function withMarker(t, content) {
  const marker = join(mkdtempSync(join(tmpdir(), 'cads-marker-')), '.cads-user-repo-erledigt');
  t.after(() => rmSync(dirname(marker), { recursive: true, force: true }));
  return { marker, prepare: () => writeFileSync(marker, `${content}\n`) };
}

test('marker of this start: the runner still calls 15-*, the script does nothing and uses the marker up', { skip: NO_PROC }, (t) => {
  const { marker, prepare } = withMarker(t, pid1Start());
  const { r, git, helpers } = lab(t, { CADS_USER_REPO_MARKER: marker }, prepare);
  assert.deepEqual(lines(r), ['entrypoint: 15-user-repo.sh ok', 'entrypoint: 30-git-identity.sh ok']);
  assert.ok(!r.stdout.includes('[cads-git]'), 'no second run of the script body');
  assert.match(r.stderr, /\[cads-start\] .* this call does nothing/);
  assert.equal(helpers(), '', 'the helper is the launcher\'s business in this case - not set here');
  assert.ok(!existsSync(marker), 'the marker is used up');
  // the image's own step is independent of the launcher's script
  assert.equal(git('config', '--local', '--get', 'user.name'), 'Jürgen "Jay" Müller');
  assert.equal(git('config', '--local', '--get', 'user.email'), 'juergen@example.org');
});

test('after the marker is used up, the next call (by hand in a terminal) runs again', { skip: NO_PROC }, (t) => {
  const { marker, prepare } = withMarker(t, pid1Start());
  const { b, env, helpers } = lab(t, { CADS_USER_REPO_MARKER: marker }, prepare);
  assert.equal(helpers(), '');
  const again = spawnSync('sh', [join(b.d, '15-user-repo.sh')], { env: { ...env, CADS_USER_REPO_MARKER: marker }, encoding: 'utf8' });
  assert.equal(again.status, 0);
  assert.match(again.stdout, /\[cads-git\]/);
  assert.equal(helpers(), '\ncache --timeout=28800\noauth -device\n');
});

test('a marker of an earlier start (other start time) does not count and is removed', (t) => {
  const { marker, prepare } = withMarker(t, 'start-von-frueher');
  const { r, helpers } = lab(t, { CADS_USER_REPO_MARKER: marker }, prepare);
  assert.deepEqual(lines(r), ['entrypoint: 15-user-repo.sh ok', 'entrypoint: 30-git-identity.sh ok']);
  assert.match(r.stdout, /\[cads-git\]/, 'the script body ran');
  assert.equal(helpers(), '\ncache --timeout=28800\noauth -device\n');
  assert.ok(!existsSync(marker));
});

test('an empty marker does not count either', (t) => {
  const { marker, prepare } = withMarker(t, '');
  const { r } = lab(t, { CADS_USER_REPO_MARKER: marker }, prepare);
  assert.match(r.stdout, /\[cads-git\]/);
  assert.ok(!existsSync(marker));
});

// git identity from the container environment (image/entrypoint.d/30-git-identity.sh).
//
// Run: node --test tests/git-identity/*.test.mjs   (needs node, sh, git; no docker, no image)
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'image/entrypoint.d/30-git-identity.sh');

/** A fake container: its own HOME (so --global is a file of the test) and a workspace. */
function box(t, { repo = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cads-gitid-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const home = join(dir, 'home');
  const ws = join(dir, 'workspace', 'cads-zero');
  mkdirSync(home, { recursive: true });
  mkdirSync(ws, { recursive: true });
  // No identity from the machine running the test: no global/system config, no env.
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    CADS_WORKSPACE: ws,
    CADS_SEED_SCRIPT: join(dir, 'no-seed.sh'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(home, '.gitconfig'),
    // The lab container cannot guess an identity (that is the defect). A
    // developer machine or CI runner often can, from the account and host
    // name - switch the guessing off so the tests see what the container sees.
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'user.useConfigOnly',
    GIT_CONFIG_VALUE_0: 'true',
  };
  const git = (args, cwd = ws) => spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  if (repo) execFileSync('git', ['init', '-q', ws], { env });
  const run = (vars = {}) => spawnSync('sh', [SCRIPT], { env: { ...env, ...vars }, encoding: 'utf8' });
  const get = (scope, key, cwd = ws) => git(['config', scope, '--get', key], cwd).stdout.replace(/\n$/, '');
  return { dir, home, ws, env, git, run, get };
}

test('sets name and e-mail in the repository config and as the session default', (t) => {
  const b = box(t);
  const r = b.run({ CADS_GIT_NAME: 'Ada Lovelace', CADS_GIT_EMAIL: 'ada@example.org' });
  assert.equal(r.status, 0);
  assert.equal(b.get('--local', 'user.name'), 'Ada Lovelace');
  assert.equal(b.get('--local', 'user.email'), 'ada@example.org');
  assert.equal(b.get('--global', 'user.name'), 'Ada Lovelace');
  assert.equal(b.get('--global', 'user.email'), 'ada@example.org');
  assert.match(r.stdout, /git-Identitaet gesetzt/);
});

test('the commit that used to fail with "Author identity unknown" now works', (t) => {
  const b = box(t);
  assert.notEqual(b.git(['commit', '--allow-empty', '-m', 'vorher']).status, 0, 'without an identity git refuses');
  b.run({ CADS_GIT_NAME: 'Ada Lovelace', CADS_GIT_EMAIL: 'ada@example.org' });
  assert.equal(b.git(['commit', '--allow-empty', '-m', 'nachher']).status, 0);
  assert.equal(b.git(['log', '-1', '--format=%an <%ae>']).stdout.trim(), 'Ada Lovelace <ada@example.org>');
});

test('quoting: spaces, umlauts, quotes, backslash, shell and config metacharacters arrive unchanged', (t) => {
  for (const name of [
    'Jürgen Müller-Lüdenscheidt',
    'Ada "Countess" O\'Neil',
    'a\\b $HOME `id` $(id) ; rm -rf / # [section] = x',
    '  Rand  ',
  ]) {
    const b = box(t);
    assert.equal(b.run({ CADS_GIT_NAME: name, CADS_GIT_EMAIL: 'jürgen+lab@example.org' }).status, 0);
    assert.equal(b.get('--local', 'user.name'), name);
    assert.equal(b.get('--local', 'user.email'), 'jürgen+lab@example.org');
    assert.equal(b.git(['commit', '--allow-empty', '-m', 'x']).status, 0);
  }
});

test('an identity the student set in the repository is never overwritten', (t) => {
  const b = box(t);
  b.git(['config', '--local', 'user.name', 'Selbst Gewählt']);
  b.git(['config', '--local', 'user.email', 'selbst@example.org']);
  const r = b.run({ CADS_GIT_NAME: 'Portal Name', CADS_GIT_EMAIL: 'portal@example.org' });
  assert.equal(b.get('--local', 'user.name'), 'Selbst Gewählt');
  assert.equal(b.get('--local', 'user.email'), 'selbst@example.org');
  assert.equal(r.status, 0);
});

test('each key on its own: a name that is set stays, the missing e-mail is added', (t) => {
  const b = box(t);
  b.git(['config', '--local', 'user.name', 'Selbst Gewählt']);
  b.run({ CADS_GIT_NAME: 'Portal Name', CADS_GIT_EMAIL: 'portal@example.org' });
  assert.equal(b.get('--local', 'user.name'), 'Selbst Gewählt');
  assert.equal(b.get('--local', 'user.email'), 'portal@example.org');
});

test('a global identity the student set is not overwritten either', (t) => {
  const b = box(t);
  b.git(['config', '--global', 'user.name', 'Global Selbst']);
  b.run({ CADS_GIT_NAME: 'Portal Name', CADS_GIT_EMAIL: 'portal@example.org' });
  assert.equal(b.get('--global', 'user.name'), 'Global Selbst');
  assert.equal(b.get('--global', 'user.email'), 'portal@example.org');
});

test('a second start with other values changes nothing (the volume keeps the first identity)', (t) => {
  const b = box(t);
  b.run({ CADS_GIT_NAME: 'Erster Start', CADS_GIT_EMAIL: 'eins@example.org' });
  rmSync(join(b.home, '.gitconfig'), { force: true }); // ~/.gitconfig does not survive a restart
  const r = b.run({ CADS_GIT_NAME: 'Zweiter Start', CADS_GIT_EMAIL: 'zwei@example.org' });
  assert.equal(b.get('--local', 'user.name'), 'Erster Start');
  assert.equal(b.get('--local', 'user.email'), 'eins@example.org');
  assert.equal(r.status, 0);
});

test('unset or empty variables: nothing is written, no error', (t) => {
  for (const vars of [{}, { CADS_GIT_NAME: '', CADS_GIT_EMAIL: '' }]) {
    const b = box(t);
    const r = b.run(vars);
    assert.equal(r.status, 0);
    assert.equal(b.get('--local', 'user.name'), '');
    assert.equal(b.get('--local', 'user.email'), '');
    assert.equal(b.get('--global', 'user.name'), '');
    assert.equal(b.get('--global', 'user.email'), '');
    assert.match(r.stdout, /unveraendert/);
    assert.notEqual(b.git(['commit', '--allow-empty', '-m', 'x']).status, 0, 'behaviour without variables is as before');
  }
});

test('only one of the two given: that one is set, the other stays unset', (t) => {
  const b = box(t);
  b.run({ CADS_GIT_EMAIL: 'nur@example.org' });
  assert.equal(b.get('--local', 'user.email'), 'nur@example.org');
  assert.equal(b.get('--local', 'user.name'), '');
});

test('a value with a line break is not an identity and is ignored', (t) => {
  const b = box(t);
  const r = b.run({ CADS_GIT_NAME: 'Zeile eins\n[core]\n\teditor = rm', CADS_GIT_EMAIL: 'ok@example.org' });
  assert.equal(r.status, 0);
  assert.equal(b.get('--local', 'user.name'), '');
  assert.equal(b.get('--local', 'user.email'), 'ok@example.org');
  assert.equal(b.get('--local', 'core.editor'), '');
});

test('the log never contains the name or the address', (t) => {
  const b = box(t);
  const r = b.run({ CADS_GIT_NAME: 'Geheimer Name', CADS_GIT_EMAIL: 'geheim@example.org' });
  const again = b.run({ CADS_GIT_NAME: 'Geheimer Name', CADS_GIT_EMAIL: 'geheim@example.org' });
  for (const out of [r.stdout + r.stderr, again.stdout + again.stderr]) {
    assert.ok(!out.includes('Geheimer'), out);
    assert.ok(!out.includes('geheim@'), out);
  }
  assert.match(again.stdout, /unveraendert \(bereits vorhanden\)/);
});

test('workspace without a repository: no error, the session default is still set', (t) => {
  const b = box(t, { repo: false });
  const r = b.run({ CADS_GIT_NAME: 'Ada Lovelace', CADS_GIT_EMAIL: 'ada@example.org' });
  assert.equal(r.status, 0);
  assert.equal(b.get('--global', 'user.name', b.dir), 'Ada Lovelace');
  // a second repository created in this session can commit
  const second = join(b.dir, 'zweites');
  execFileSync('git', ['init', '-q', second], { env: b.env });
  assert.equal(b.git(['commit', '--allow-empty', '-m', 'x'], second).status, 0);
});

test('the entrypoint order is not guaranteed: an unseeded workspace is seeded first', (t) => {
  const b = box(t, { repo: false });
  rmSync(b.ws, { recursive: true });
  const seed = join(b.dir, 'seed.sh');
  writeFileSync(seed, `#!/bin/sh\ngit init -q "${b.ws}"\n`);
  const r = b.run({ CADS_SEED_SCRIPT: seed, CADS_GIT_NAME: 'Ada Lovelace', CADS_GIT_EMAIL: 'ada@example.org' });
  assert.equal(r.status, 0);
  assert.equal(b.get('--local', 'user.name'), 'Ada Lovelace');
});

test('never fails the container start, even when nothing can be written', (t) => {
  const b = box(t);
  const r = b.run({ HOME: '/nonexistent/home', GIT_CONFIG_GLOBAL: '/nonexistent/home/.gitconfig', CADS_WORKSPACE: '/nonexistent/ws', CADS_GIT_NAME: 'A', CADS_GIT_EMAIL: 'a@example.org' });
  assert.equal(r.status, 0);
});

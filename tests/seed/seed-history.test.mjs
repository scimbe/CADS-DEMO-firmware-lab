// The workspace seed carries the full history of the firmware (Dockerfile,
// stage "seed", first RUN).
//
// Run: node --test tests/seed/*.test.mjs   (needs node, sh, git; no docker, no network)
//
// Defect: the seed was fetched with --depth 1. Students push praktikum/start
// from that workspace into their own GitLab project, which refuses it:
// "! [remote rejected] praktikum/start -> praktikum/start (shallow update not
// allowed)". The test runs the seed's RUN text itself (all three ways to name
// the ref) against a local repository with history, and pushes the result
// into an empty bare repository that, like GitLab, does not take shallow updates.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCKERFILE = readFileSync(join(ROOT, 'Dockerfile'), 'utf8');

/** The shell text of the seed stage's clone step, as the image runs it. */
function seedRun() {
  const stage = DOCKERFILE.slice(DOCKERFILE.indexOf('FROM base AS seed'));
  const m = stage.match(/^RUN (set -eu; \\\n[\s\S]*?du -sh \. \.git)$/m);
  assert.ok(m, 'clone step of the seed stage not found in the Dockerfile');
  return m[1];
}

function git(cwd, args, env) {
  return execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
}

/** A template repository with a few commits on praktikum/start, and a workspace dir. */
function box(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cads-seed-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const env = {
    PATH: process.env.PATH,
    HOME: dir,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(dir, 'gitconfig'),
    GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.org',
    GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.org',
  };
  const tpl = join(dir, 'vorlage');
  mkdirSync(tpl);
  git(tpl, ['init', '-q', '-b', 'praktikum/start'], env);
  for (let i = 1; i <= 5; i++) git(tpl, ['commit', '-q', '--allow-empty', '-m', `c${i}`], env);
  const ws = join(dir, 'workspace');
  mkdirSync(ws);
  return { dir, env, tpl, ws, head: git(tpl, ['rev-parse', 'HEAD'], env) };
}

function runSeed(b, args) {
  const script = seedRun().replaceAll('/home/coder/workspace', b.ws);
  // file:// so that a --depth would really cut the history (a plain path does not).
  const env = { ...b.env, CADS_ZERO_REPO: `file://${b.tpl}`, CADS_SEED_COMMIT: '', ...args };
  const r = spawnSync('sh', ['-c', script], { cwd: b.ws, env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return join(b.ws, 'cads-zero');
}

function pushable(b, repo, branch) {
  const bare = join(b.dir, 'projekt.git');
  git(b.dir, ['init', '-q', '--bare', bare], b.env);
  return spawnSync('git', ['push', `file://${bare}`, `${branch}:refs/heads/praktikum/start`],
    { cwd: repo, env: b.env, encoding: 'utf8' });
}

for (const [name, args, branch] of [
  ['branch name', { CADS_ZERO_REF: 'praktikum/start' }, 'praktikum/start'],
  ['branch resolved by CI (CADS_SEED_COMMIT)', { CADS_ZERO_REF: 'praktikum/start', CADS_SEED_COMMIT: '@head' }, 'praktikum/start'],
  ['40-hex commit', { CADS_ZERO_REF: '@head' }, 'cads-seed'],
]) {
  test(`seed from a ${name} has the full history and can be pushed`, (t) => {
    const b = box(t);
    for (const k of Object.keys(args)) if (args[k] === '@head') args[k] = b.head;
    const repo = runSeed(b, args);
    assert.equal(git(repo, ['rev-parse', '--is-shallow-repository'], b.env), 'false');
    assert.equal(git(repo, ['rev-list', '--count', 'HEAD'], b.env), '5');
    const p = pushable(b, repo, branch);
    assert.equal(p.status, 0, p.stderr);
    assert.doesNotMatch(p.stderr, /shallow update not allowed/);
  });
}

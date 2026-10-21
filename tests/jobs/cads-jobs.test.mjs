// cads-jobs (image/bin/cads-jobs): parallel build jobs from the container's CPU
// quota instead of the host's core count, and its use in the lab's build tasks.
//
// Run: node --test tests/jobs/*.test.mjs   (needs node, sh; no docker, no cgroup)
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'image/bin/cads-jobs');
const TASKS = join(ROOT, 'image/vscode-templates/tasks.json');

// Runs the script with fake cgroup files. `files` maps v2/quota/period to their
// content; a key that is missing means "file does not exist".
function jobs(t, files, nproc = '40') {
  const dir = mkdtempSync(join(tmpdir(), 'cads-jobs-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = (k) => join(dir, k);
  for (const [k, v] of Object.entries(files)) writeFileSync(path(k), v);
  const r = spawnSync('sh', [SCRIPT], {
    env: { PATH: process.env.PATH, CADS_JOBS_CPU_MAX: path('v2'), CADS_JOBS_V1_QUOTA: path('quota'), CADS_JOBS_V1_PERIOD: path('period'), CADS_JOBS_NPROC: nproc },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^\d+\n$/, 'exactly one number');
  return Number(r.stdout);
}

for (const [content, want] of [
  ['300000 100000\n', 3],
  ['150000 100000\n', 2],
  ['50000 100000\n', 1],
  ['100000 100000\n', 1],
  ['max 100000\n', 40],
  ['', 40],
  ['kaputt\n', 40],
  ['-1 100000\n', 40],
  ['100000 0\n', 40],
  ['100000\n', 40],
  ['* *\n', 40],
]) {
  test(`cgroup v2 cpu.max ${JSON.stringify(content)} -> ${want}`, (t) => {
    assert.equal(jobs(t, { v2: content }), want);
  });
}

test('never more jobs than nproc, even with a larger quota', (t) => {
  assert.equal(jobs(t, { v2: '800000 100000\n' }, '4'), 4);
});

test('no cgroup file at all -> nproc', (t) => {
  assert.equal(jobs(t, {}, '7'), 7);
});

test('cgroup v1 as fallback: cfs_quota_us / cfs_period_us, -1 means no limit', (t) => {
  assert.equal(jobs(t, { quota: '250000\n', period: '100000\n' }), 3);
  assert.equal(jobs(t, { quota: '-1\n', period: '100000\n' }), 40);
});

test('cgroup v2 wins over v1 when both are there', (t) => {
  assert.equal(jobs(t, { v2: '200000 100000\n', quota: '600000\n', period: '100000\n' }), 2);
});

test('a glob in cpu.max does not expand against the working directory', (t) => {
  assert.equal(jobs(t, { v2: '* 100000\n' }), 40);
});

test('--selbsttest passes', () => {
  const r = spawnSync('sh', [SCRIPT, '--selbsttest'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /selbsttest ok/);
});

test('the real cgroup of this machine gives a usable number (or nproc where there is none)', () => {
  const r = spawnSync('sh', [SCRIPT], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.ok(Number(r.stdout) >= 1, r.stdout);
});

// ---- the lab's build tasks use it -----------------------------------------------------------

function tasks() {
  // tasks.json is JSONC: drop whole-line // comments, then parse.
  const text = readFileSync(TASKS, 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  return JSON.parse(text).tasks;
}

test('every cmake --build in the lab tasks takes its -j from cads-jobs', () => {
  const builds = tasks().filter((x) => /cmake --build/.test(x.command || ''));
  assert.ok(builds.length >= 6, `build tasks found: ${builds.length}`);
  for (const x of builds) {
    const calls = x.command.match(/cmake --build [^&;]*/g);
    for (const c of calls) assert.match(c, /^cmake --build build\/(itsboard|host) -j "\$\(cads-jobs\)"\s*$/, `${x.label}: ${c}`);
  }
});

test('the build task says in one sentence where the job count comes from', () => {
  const build = tasks().find((x) => x.label === 'CaDS: Build');
  assert.match(build.detail, /cads-jobs/);
  assert.match(build.detail, /Container/);
});

test('the image installs cads-jobs on the PATH', () => {
  const dockerfile = readFileSync(join(ROOT, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY --chmod=0755 image\/bin\/cads-jobs \/usr\/local\/bin\//);
});

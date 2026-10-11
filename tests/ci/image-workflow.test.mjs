// trace: AUF-20261011-015
// The image workflow and its tag check (.github/workflows/image.yml,
// .github/scripts/check-image-tags.sh).
//
// Run: node --test tests/ci/*.test.mjs   (needs node, bash, python3; no docker, no network)
//
// Two runs of one branch must not race for the moving tag, the image must say
// which commit built it, and the run must go red when <branch> does not point
// at what it just built. `docker` is a stand-in that answers from files.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW = join(ROOT, '.github/workflows/image.yml');
const CHECK = join(ROOT, '.github/scripts/check-image-tags.sh');
const workflow = () => readFileSync(WORKFLOW, 'utf8');
// The text of one job: from its "  name:" line to the next job or the end.
function job(name) {
  const m = workflow().match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z-]*:\\n|(?![\\s\\S]))`, 'm'));
  assert.ok(m, `job ${name} not found in image.yml`);
  return m[1];
}

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const D1 = 'sha256:' + '1'.repeat(64);
const D2 = 'sha256:' + '2'.repeat(64);
const BY_COMMIT = 'ghcr.io/example/lab:next-0123456';
const BY_BRANCH = 'ghcr.io/example/lab:next';
const labelled = (rev) => ({ config: { Labels: rev === null ? {} : { 'org.opencontainers.image.revision': rev } } });
const both = (amd, arm = amd) => JSON.stringify({ 'linux/amd64': labelled(amd), 'linux/arm64': labelled(arm) });

// A registry made of files: <dir>/<ref with / and : as _>.manifest|.image.
// A missing file is a failing `docker`, an empty file is a silent one.
function registry(t, files) {
  const dir = mkdtempSync(join(tmpdir(), 'cads-tags-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(
    join(bin, 'docker'),
    '#!/bin/sh\n' +
      '[ "$1 $2 $3 $5" = "buildx imagetools inspect --format" ] || { echo "unexpected: $*" >&2; exit 64; }\n' +
      'case "$6" in *Manifest*) kind=manifest ;; *Image*) kind=image ;; *) exit 64 ;; esac\n' +
      'f="$REGISTRY/$(printf %s "$4" | tr "/:" "__").$kind"\n' +
      '[ -f "$f" ] || { echo "ERROR: $4: not found" >&2; exit 1; }\n' +
      'cat "$f"\n',
  );
  chmodSync(join(bin, 'docker'), 0o755);
  for (const [ref, kinds] of Object.entries(files)) {
    for (const [kind, body] of Object.entries(kinds)) {
      writeFileSync(join(dir, ref.replace(/[/:]/g, '_') + '.' + kind), body);
    }
  }
  return (args = [BY_COMMIT, BY_BRANCH, COMMIT]) =>
    spawnSync('bash', [CHECK, ...args], {
      env: { PATH: `${bin}:${process.env.PATH}`, REGISTRY: dir },
      encoding: 'utf8',
    });
}
const manifest = (digest) => JSON.stringify({ mediaType: 'application/vnd.oci.image.index.v1+json', digest, size: 1 });
const good = () => ({
  [BY_COMMIT]: { manifest: manifest(D1), image: both(COMMIT) },
  [BY_BRANCH]: { manifest: manifest(D1), image: both(COMMIT) },
});

test('image.yml: runs of one ref queue up instead of racing, and none is cancelled', () => {
  assert.match(workflow(), /^concurrency:\n  group: image-\$\{\{ github\.ref \}\}\n  cancel-in-progress: false\n/m);
});

test('image.yml: every architecture is built with the full commit as revision label', () => {
  assert.match(job('build'), /^          labels: \|\n            org\.opencontainers\.image\.revision=\$\{\{ github\.sha \}\}\n/m);
});

test('image.yml: the manifest job checks the tags right after creating them', () => {
  const text = job('manifest');
  const create = text.indexOf('- name: Create manifest and tags');
  const check = text.indexOf('.github/scripts/check-image-tags.sh "$IMAGE:$branch-${GITHUB_SHA::7}" "$IMAGE:$branch" "$GITHUB_SHA"');
  assert.ok(create > 0, 'step "Create manifest and tags" is gone');
  assert.ok(check > create, 'check-image-tags.sh is not called after the manifest step');
  assert.ok(text.indexOf('- uses: actions/checkout@v4') > 0 && text.indexOf('- uses: actions/checkout@v4') < check, 'the script is not checked out before it is called');
  assert.doesNotMatch(text.slice(check - 400, check), /continue-on-error|\|\| true/);
});

test('image.yml: this test runs in the workflow and a change to it or the script triggers it', () => {
  assert.match(job('logout-unit'), /run: node --test tests\/ci\/\*\.test\.mjs\n/);
  const paths = workflow().match(/^    paths:\n((?:      - .*\n)+)/m)[1];
  assert.match(paths, /^      - \.github\/scripts\/\*\*\n/m);
  assert.match(paths, /^      - tests\/ci\/\*\*\n/m);
});

test('check: the script is executable, the workflow calls it by path', () => {
  assert.ok(statSync(CHECK).mode & 0o111, 'check-image-tags.sh has no executable bit');
});

test('check: green when the branch tag points at this build and the label is the commit', (t) => {
  const r = registry(t, good())();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`digest: ${BY_BRANCH} = ${BY_COMMIT} = ${D1}`));
  assert.match(r.stdout, new RegExp(`revision: ${COMMIT} on all architectures`));
});

test('check: red when the branch tag points at another digest, and it names both', (t) => {
  const files = good();
  files[BY_BRANCH].manifest = manifest(D2);
  const r = registry(t, files)();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /::error::/);
  assert.ok(r.stdout.includes(D1) && r.stdout.includes(D2), r.stdout);
});

test('check: red when the registry says nothing about the branch tag', (t) => {
  const files = good();
  files[BY_BRANCH].manifest = '';
  const r = registry(t, files)();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`::error::no index digest for ${BY_BRANCH}`));
});

test('check: red when the branch tag does not exist', (t) => {
  const files = good();
  delete files[BY_BRANCH];
  const r = registry(t, files)();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`::error::no index digest for ${BY_BRANCH}`));
});

test('check: red when both tags answer without a digest', (t) => {
  const files = good();
  files[BY_COMMIT].manifest = '{}';
  files[BY_BRANCH].manifest = '{}';
  const r = registry(t, files)();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`::error::no index digest for ${BY_COMMIT}`));
});

test('check: red when one architecture lacks the revision label', (t) => {
  const files = good();
  files[BY_COMMIT].image = both(COMMIT, null);
  const r = registry(t, files)();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /linux\/arm64: org\.opencontainers\.image\.revision=\n/);
  assert.match(r.stdout, /::error::org\.opencontainers\.image\.revision is not/);
});

test('check: red when the label is only the short commit', (t) => {
  const files = good();
  files[BY_COMMIT].image = both(COMMIT.slice(0, 7));
  const r = registry(t, files)();
  assert.equal(r.status, 1, r.stdout + r.stderr);
});

test('check: red when the image config is empty or missing', (t) => {
  for (const image of ['', '{}', undefined]) {
    const files = good();
    if (image === undefined) delete files[BY_COMMIT].image;
    else files[BY_COMMIT].image = image;
    const r = registry(t, files)();
    assert.equal(r.status, 1, `image=${JSON.stringify(image)}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /::error::/);
  }
});

test('check: red when it is not given a full commit', (t) => {
  const r = registry(t, good())([BY_COMMIT, BY_BRANCH, COMMIT.slice(0, 7)]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /::error::not a full commit/);
});

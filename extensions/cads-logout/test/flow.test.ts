import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHANNEL_NAME, requestNavigation } from '../src/channel';
import { runLogout, TEXT, type BoardState, type LogoutDeps } from '../src/flow';

interface Script {
  answers?: boolean[];
  dirty?: string[];
  board?: BoardState;
  page?: string | null;
}

function harness(script: Script): { deps: LogoutDeps; calls: string[]; errors: string[] } {
  const calls: string[] = [];
  const errors: string[] = [];
  const answers = [...(script.answers ?? [true])];
  const deps: LogoutDeps = {
    confirm: async (message) => {
      calls.push(`confirm:${message}`);
      return answers.shift() ?? false;
    },
    saveAll: async () => {
      calls.push('saveAll');
      return true;
    },
    dirtyNames: () => script.dirty ?? [],
    releaseBoard: async () => {
      calls.push('release');
      return script.board ?? 'released';
    },
    navigate: async () => {
      calls.push('navigate');
      return script.page === undefined ? '/logout' : script.page;
    },
    error: (message) => errors.push(message),
  };
  return { deps, calls, errors };
}

test('saves, releases the board, then navigates - in that order', async () => {
  const h = harness({});
  assert.equal(await runLogout(h.deps), 'navigating');
  assert.deepEqual(h.calls, [`confirm:${TEXT.confirm}`, 'saveAll', 'release', 'navigate']);
});

test('a declined confirmation touches nothing', async () => {
  const h = harness({ answers: [false] });
  assert.equal(await runLogout(h.deps), 'cancelled');
  assert.deepEqual(h.calls, [`confirm:${TEXT.confirm}`]);
});

test('files that stay dirty need a second confirmation; declining keeps board and session', async () => {
  const h = harness({ answers: [true, false], dirty: ['Untitled-1'] });
  assert.equal(await runLogout(h.deps), 'cancelled');
  assert.ok(!h.calls.includes('release'));
  assert.ok(!h.calls.includes('navigate'));
  assert.ok(h.calls.some((c) => c.includes('Untitled-1')));
});

test('files that stay dirty: "trotzdem abmelden" goes on', async () => {
  const h = harness({ answers: [true, true], dirty: ['a.c', 'b.c'] });
  assert.equal(await runLogout(h.deps), 'navigating');
  assert.ok(h.calls.some((c) => c.includes('2 Dateien')));
});

test('a busy board (flash running) asks before aborting it', async () => {
  const declined = harness({ answers: [true, false], board: 'busy' });
  assert.equal(await runLogout(declined.deps), 'cancelled');
  assert.ok(!declined.calls.includes('navigate'));

  const accepted = harness({ answers: [true, true], board: 'busy' });
  assert.equal(await runLogout(accepted.deps), 'navigating');
});

test('no board extension is not an obstacle', async () => {
  const h = harness({ board: 'absent' });
  assert.equal(await runLogout(h.deps), 'navigating');
});

test('a page that does not answer is reported, not swallowed', async () => {
  const h = harness({ page: null });
  assert.equal(await runLogout(h.deps), 'failed');
  assert.deepEqual(h.errors, [TEXT.noPage]);
});

test('requestNavigation resolves with the URL the page acknowledges', async () => {
  const ext = new BroadcastChannel(CHANNEL_NAME);
  const page = new BroadcastChannel(CHANNEL_NAME);
  page.addEventListener('message', (event) => {
    if (((event as MessageEvent).data as { type?: string }).type === 'logout') page.postMessage({ type: 'ack', url: 'https://lab.example/logout' });
  });
  try {
    assert.equal(await requestNavigation(ext, 2000), 'https://lab.example/logout');
  } finally {
    ext.close();
    page.close();
  }
});

test('requestNavigation gives up with null when no page listens', async () => {
  const ext = new BroadcastChannel(CHANNEL_NAME);
  try {
    assert.equal(await requestNavigation(ext, 50), null);
  } finally {
    ext.close();
  }
});

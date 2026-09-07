/* messages.test.ts – every "board not available" case must name a cause AND a next step. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { boardMessage, boardMessageLine, boardStatusBarText, shimMessage, ESCALATION_DE, ESCALATION_EN } from '../src/messages';
import type { BoardStatus } from '../src/board';
import type { BlockReason } from '../src/types';

const ALL: BlockReason[] = ['other-tab', 'other-app', 'gone', 'denied', 'target-unresponsive', 'unknown'];

describe('board messages', () => {
  for (const reason of ALL) {
    it(`${reason} says what is wrong and what to do, in both languages`, () => {
      for (const lang of ['de', 'en']) {
        const m = boardMessage(reason, lang);
        assert.ok(m.title.length > 10, `${reason}/${lang}: title too short`);
        assert.ok(m.action.length > 10, `${reason}/${lang}: no next step`);
        // No raw DOMException wording should leak into what a student reads.
        assert.doesNotMatch(m.title + m.action, /NetworkError|DOMException|claimInterface/);
      }
    });
  }

  it('falls back to the generic message for an unknown reason', () => {
    assert.deepEqual(boardMessage(undefined, 'de'), boardMessage('unknown', 'de'));
    assert.deepEqual(boardMessage(undefined, 'en'), boardMessage('unknown', 'en'));
  });

  it('picks English only for English locales', () => {
    assert.match(boardMessage('other-tab', 'en-GB').title, /another tab/i);
    assert.match(boardMessage('other-tab', 'de').title, /anderen Tab/);
    assert.match(boardMessage('other-tab', 'fr').title, /anderen Tab/, 'the lab default is German');
  });

  it('names the other tab and the other program as different problems', () => {
    assert.notEqual(boardMessage('other-tab', 'de').title, boardMessage('other-app', 'de').title);
    assert.match(boardMessage('other-app', 'de').action, /st-flash|CubeProgrammer/);
    assert.match(boardMessage('other-tab', 'de').action, /Tab/);
  });

  it('the last escalation step is the same advice in both languages', () => {
    assert.match(ESCALATION_DE, /Tabs des Labors|USB-Kabel/);
    assert.match(ESCALATION_EN, /lab tab|USB cable/);
    assert.equal(boardMessage('unknown', 'de').action, ESCALATION_DE);
    assert.equal(boardMessage('unknown', 'en').action, ESCALATION_EN);
  });

  it('gives the shims both languages, and nothing at all when the board is fine', () => {
    assert.equal(shimMessage('other-tab', true), '');
    const text = shimMessage('other-app', false);
    assert.match(text, /anderes Programm/);
    assert.match(text, /Another program/);
    assert.equal(text.split('\n').length, 2);
  });

  it('boardMessageLine is one line, for the status bar', () => {
    for (const reason of ALL) {
      const line = boardMessageLine(reason, 'de');
      assert.doesNotMatch(line, /\n/);
      assert.ok(line.length > 20);
    }
  });
});

describe('PB-01: a flash success stays in the status item, not a six-second toast', () => {
  const base: BoardStatus = { connected: true, serialOpen: false, core: 'halted', gdbClients: 0 };

  it("puts the exact text four course steps' expect: lines look for into the status item's own text", () => {
    const s: BoardStatus = { ...base, lastFlash: { file: 'cads-zero.bin', addr: 0x08000000, ok: true, at: '2026-09-07T20:00:00.000Z', bytes: 327088, ms: 15973 } };
    assert.match(boardStatusBarText(s).text, /Flash ok: 327088 Bytes in 15973 ms/);
  });

  it('carries no expiry - the same status computed later still shows it, there is no timer involved', () => {
    const s: BoardStatus = { ...base, lastFlash: { file: 'x.bin', addr: 0, ok: true, at: '2026-09-07T20:00:00.000Z', bytes: 100, ms: 5 } };
    assert.equal(boardStatusBarText(s).text, boardStatusBarText(s).text, 'pure function of status, not of a clock');
    assert.match(boardStatusBarText(s).text, /Flash ok/);
  });

  it('shows nothing extra when the last flash failed', () => {
    const s: BoardStatus = { ...base, lastFlash: { file: 'x.bin', addr: 0, ok: false, at: '2026-09-07T20:00:00.000Z', error: 'verify failed' } };
    assert.doesNotMatch(boardStatusBarText(s).text, /Flash ok/);
  });

  it('shows nothing extra before any flash has happened', () => {
    assert.doesNotMatch(boardStatusBarText(base).text, /Flash/);
  });

  it('still reports disconnected plainly, flash or not', () => {
    const s: BoardStatus = { ...base, connected: false, lastFlash: { file: 'x.bin', addr: 0, ok: true, at: '2026-09-07T20:00:00.000Z', bytes: 1, ms: 1 } };
    assert.match(boardStatusBarText(s).text, /getrennt/);
    assert.doesNotMatch(boardStatusBarText(s).text, /Flash ok/);
  });
});

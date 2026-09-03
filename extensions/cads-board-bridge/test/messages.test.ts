/* messages.test.ts – every "board not available" case must name a cause AND a next step. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { boardMessage, boardMessageLine, shimMessage, ESCALATION_DE, ESCALATION_EN } from '../src/messages';
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { checksPass, decide, denverDay } from './promote-live.mjs';
const main = 'a'.repeat(40), live = 'b'.repeat(40);
const good = { id: 1, name: 'ci', head_sha: main, app: { slug: 'github-actions' },
  status: 'completed', conclusion: 'success' };
test('Denver calendar dates honor midnight and DST', () => {
  assert.equal(denverDay(new Date('2026-10-12T05:59:59Z')), '2026-10-11');
  assert.equal(denverDay(new Date('2026-10-12T06:00:00Z')), '2026-10-12');
  assert.equal(denverDay(new Date('2026-12-12T06:59:59Z')), '2026-12-11');
});
test('requires successful latest exact-head trusted checks', () => {
  assert.equal(checksPass([good], ['ci'], main), true);
  for (const change of [{ conclusion: 'failure' }, { conclusion: 'skipped' },
    { status: 'in_progress' }, { head_sha: live }, { app: { slug: 'other' } }])
    assert.equal(checksPass([{ ...good, ...change }], ['ci'], main), false);
  assert.equal(checksPass([], ['ci'], main), false);
  assert.equal(checksPass([good, { ...good, id: 2, conclusion: 'failure' }], ['ci'], main), false);
  assert.equal(checksPass([good], ['ci', 'missing'], main), false);
});
test('one checked fast-forward daily; reruns and unchanged heads skip', () => {
  const state = { main, live, ancestor: true, green: true, alreadyToday: false };
  assert.equal(decide(state), 'promote');
  assert.equal(decide({ ...state, alreadyToday: true }), 'skip');
  assert.equal(decide({ ...state, live: main }), 'skip');
  assert.throws(() => decide({ ...state, ancestor: false }), /rewrite/);
  assert.throws(() => decide({ ...state, green: false }), /checks/);
  assert.throws(() => decide({ ...state, main: 'main' }), /identity/);
});

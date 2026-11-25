import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addItem, cleanEvents, itemsOn, moveItem, removeItem, toggleItem } from '../web/js/calendar.js';
import { addDays, dayKey } from '../web/js/util.js';

test('plans are added, sorted by time, ticked, moved and removed', () => {
  const state = { events: {} };
  const day = '2026-11-25';
  const late = addItem(state, day, 'Call mum', '18:30', 'family');
  const free = addItem(state, day, 'Buy plants');
  const early = addItem(state, day, 'Gym', '07:15', 'move');
  assert.equal(addItem(state, day, '   '), null, 'empty plans are ignored');
  assert.deepEqual(itemsOn(state, day).map((i) => i.text), ['Gym', 'Call mum', 'Buy plants']);
  assert.equal(toggleItem(state, day, late.id).done, true);
  moveItem(state, day, late.id, addDays(day, 1));
  assert.deepEqual(itemsOn(state, '2026-11-26').map((i) => [i.text, i.done]), [['Call mum', false]], 'a moved plan starts fresh');
  removeItem(state, day, early.id);
  removeItem(state, day, free.id);
  assert.equal(state.events[day], undefined, 'an empty day is dropped');
});

test('saved plans are cleaned so damaged data cannot break the page', () => {
  const clean = cleanEvents({ '2026-11-25': [{ text: 'ok', time: '9:00', tone: 'pink' }, { text: '' }, 'x', null], 'not a day': [{ text: 'no' }], '2026-11-26': 'nope' });
  assert.deepEqual(Object.keys(clean), ['2026-11-25']);
  assert.equal(clean['2026-11-25'].length, 1);
  assert.equal(clean['2026-11-25'][0].time, '', 'a malformed time is dropped');
  assert.equal(clean['2026-11-25'][0].tone, '', 'an unknown colour is dropped');
  assert.deepEqual(cleanEvents([1, 2]), {});
});

test('days roll over months and years', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dayKey(new Date(2026, 1, 3)), '2026-02-03');
});

test('a removed or moved plan can be put back where it was', async () => {
  const { restoreItem, updateItem, moveTarget } = await import('../web/js/calendar.js');
  const state = { events: {} };
  const day = '2026-11-25';
  const a = addItem(state, day, 'A');
  const b = addItem(state, day, 'B');
  addItem(state, day, 'C');
  const removed = removeItem(state, day, b.id);
  assert.equal(removed.index, 1);
  restoreItem(state, day, removed.item, removed.index);
  assert.deepEqual(state.events[day].map((i) => i.text), ['A', 'B', 'C']);
  assert.equal(updateItem(state, day, a.id, '  Call the bank ', '10:00').text, 'Call the bank');
  assert.equal(updateItem(state, day, a.id, '   ', ''), null, 'an edit cannot empty a plan');
  assert.equal(moveTarget('2026-11-18', '2026-11-25'), '2026-11-25', 'a past plan moves to today');
  assert.equal(moveTarget('2026-11-25', '2026-11-25'), '2026-11-26');
  assert.equal(moveTarget('2026-11-30', '2026-11-25'), '2026-12-01');
});

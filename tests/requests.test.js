import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trusted, REQUEST_MARKER } from '../scripts/requests.mjs';
import { requestIssue } from '../web/js/github.js';

test('only requests posted by the owner with the marker are trusted', () => {
  const mine = requestIssue('A calm weekly plan\nwith tick boxes', 'iPhone');
  const issues = [
    { number: 3, author: { login: 'eman2XR' }, body: mine.body, createdAt: '2026-11-24T10:00:00Z' },
    { number: 4, author: { login: 'someone-else' }, body: mine.body, createdAt: '2026-11-24T10:00:00Z' },
    { number: 5, author: { login: 'eman2XR' }, body: 'no marker here', createdAt: '2026-11-24T10:00:00Z' },
  ];
  const got = trusted(issues);
  assert.equal(got.length, 1);
  assert.equal(got[0].number, 3);
  assert.equal(got[0].text, 'A calm weekly plan\nwith tick boxes');
  assert.equal(got[0].device, 'iPhone');
  assert.ok(mine.title.startsWith('Request: A calm weekly plan'));
  assert.ok(mine.body.includes(REQUEST_MARKER));
});

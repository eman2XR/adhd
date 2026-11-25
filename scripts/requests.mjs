// What the friend has asked for. Saves new notification sign-ups first (push.mjs inbox), then lists open requests.
//
//   node scripts/requests.mjs            open requests, oldest first, or "wait" when there are none
//   node scripts/requests.mjs --json     the same as JSON
//   node scripts/requests.mjs decline N --note "why"   close a request that will not be built, with a reply
//
// Only issues posted by the owner's account (the token in the friend's personal link) with the request marker count.
// Anyone else's issue is ignored and left alone.

import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO = 'eman2XR/adhd';
export const OWNER = 'eman2XR';
export const REQUEST_MARKER = '<!-- adhd-request -->';
const ROOT = fileURLToPath(new URL('..', import.meta.url));

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// Picks the trusted requests out of a list of issues from `gh issue list --json number,title,body,author,createdAt`.
export function trusted(issues) {
  return issues
    .filter((i) => i.author?.login === OWNER && (i.body || '').includes(REQUEST_MARKER))
    .map((i) => {
      const [text, rest = ''] = i.body.split(REQUEST_MARKER);
      let meta = {};
      try {
        meta = JSON.parse(rest.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || '{}');
      } catch {}
      return { number: i.number, text: text.trim(), device: meta.device || null, at: meta.at || i.createdAt };
    })
    .sort((a, b) => a.number - b.number);
}

export function openRequests() {
  return trusted(JSON.parse(gh(['issue', 'list', '-R', REPO, '--state', 'open', '--label', 'request', '--limit', '50', '--json', 'number,title,body,author,createdAt'])));
}

function main() {
  const [cmd, n] = process.argv.slice(2);
  if (cmd === 'decline') {
    const i = process.argv.indexOf('--note');
    const note = i > 0 ? process.argv[i + 1] : 'This one could not be built.';
    gh(['issue', 'close', String(n), '-R', REPO, '--reason', 'not planned', '--comment', note]);
    console.log(`closed #${n} as not planned`);
    return;
  }
  spawnSync(process.execPath, [`${ROOT}scripts/push.mjs`, 'inbox'], { stdio: 'inherit' });
  const open = openRequests();
  if (cmd === '--json') return console.log(JSON.stringify(open, null, 1));
  if (!open.length) return console.log('wait: no open requests');
  console.log(`${open.length} open request(s):\n`);
  for (const r of open) console.log(`#${r.number} (${r.device || 'device'}, ${r.at})\n${r.text}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error(`error: ${err.stderr || err.message}`);
    process.exit(1);
  }
}

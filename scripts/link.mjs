// Turns the friend's GitHub token into their personal link and copies it to the clipboard, without printing the token.
//
//   node scripts/link.mjs          then paste the token when asked (input is hidden)
//
// Make the token at https://github.com/settings/personal-access-tokens/new: Repository access, Only select
// repositories, eman2XR/adhd; Permissions, Issues, Read and write; an expiry you are happy with.

import { execFileSync } from 'node:child_process';
import readline from 'node:readline';

const REPO = 'eman2XR/adhd';
const SITE = 'https://eman2xr.github.io/adhd/';

function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(prompt)) process.stdout.write(s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

const token = process.stdin.isTTY ? await askHidden('GitHub token: ') : (await new Promise((r) => { let d = ''; process.stdin.on('data', (c) => (d += c)); process.stdin.on('end', () => r(d.trim())); }));
if (!token) {
  console.error('no token given');
  process.exit(1);
}
const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
if (!res.ok) {
  console.error(`GitHub did not accept the token (${res.status}); check it was made for ${REPO}`);
  process.exit(1);
}
execFileSync('pbcopy', { input: `${SITE}#key=${encodeURIComponent(token)}` });
console.log('The personal link is on the clipboard. Send it to your friend; anyone with it can post requests.');

// After a change is committed and pushed to main: waits until GitHub Pages serves that commit, then closes the
// requests it answers (if any; a request can also arrive outside the page) and sends the notification.
//
//   node scripts/ship.mjs [--done 3,4] --title "Your page is live" --body "Weekly plan with tick boxes" [--note "reply on the issue"]

import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO } from './requests.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://eman2xr.github.io/adhd/';

const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim();
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const title = arg('title');
  const done = (arg('done') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!title) throw new Error('usage: ship.mjs [--done N[,N]] --title T --body B [--note N]');
  if (git('status', '--porcelain')) throw new Error('uncommitted changes: commit and push first');
  git('fetch', '-q', 'origin', 'main');
  const sha = git('rev-parse', 'HEAD');
  if (git('rev-parse', 'origin/main') !== sha) throw new Error('HEAD is not on origin/main: push first');
  const short = sha.slice(0, 7);

  // The deploy workflow run for this commit.
  let run;
  for (let i = 0; i < 30 && !run; i += 1) {
    const runs = JSON.parse(gh('run', 'list', '-R', REPO, '--workflow', 'pages.yml', '--commit', sha, '--json', 'databaseId,status', '--limit', '1'));
    run = runs[0];
    if (!run) await sleep(5000);
  }
  if (!run) throw new Error(`no deploy run found for ${short}`);
  console.log(`waiting for deploy run ${run.databaseId}`);
  const watch = spawnSync('gh', ['run', 'watch', String(run.databaseId), '-R', REPO, '--exit-status', '--interval', '10'], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (watch.status !== 0) throw new Error(`deploy run ${run.databaseId} failed: gh run view ${run.databaseId} -R ${REPO} --log-failed`);

  // deploy-pages only succeeds once Pages serves the new files. When the site is reachable from here, also confirm the
  // served sw.js carries this commit (the build stamps it); some networks block github.io, so that check is optional.
  let live = null;
  for (let i = 0; i < 20 && live !== true; i += 1) {
    try {
      const res = await fetch(`${SITE}sw.js?v=${Date.now()}`, { cache: 'no-store' });
      live = res.ok && (await res.text()).includes(short);
    } catch {
      break;
    }
    if (!live) await sleep(6000);
  }
  if (live === false) throw new Error(`${SITE} does not serve ${short} yet; run ship.mjs again in a few minutes`);
  console.log(live ? `${SITE} serves ${short}` : `deployed ${short} (site not reachable from here to double-check)`);

  const note = arg('note') || `Live now: ${SITE}`;
  for (const n of done) {
    gh('issue', 'close', n, '-R', REPO, '--reason', 'completed', '--comment', `${note}\n\n(commit ${short})`);
    console.log(`closed #${n}`);
  }
  spawnSync(process.execPath, [`${ROOT}scripts/push.mjs`, 'send', '--title', title, '--body', arg('body') || '', '--url', './', '--tag', 'update'], { stdio: 'inherit' });
}

const proxied = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxied && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  process.exit(r.status ?? 1);
} else {
  main().catch((err) => {
    console.error(`error: ${err.message}`);
    process.exit(1);
  });
}

// Checks that keep the request box, notifications and offline cache working whatever the page becomes. Run before every push.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WEB = fileURLToPath(new URL('../web/', import.meta.url));
const problems = [];
const html = readFileSync(`${WEB}index.html`, 'utf8');
const sw = readFileSync(`${WEB}sw.js`, 'utf8');

if (!html.includes('<script type="module" src="js/ask.js"></script>')) problems.push('index.html must load js/ask.js (the request box)');
if (!/id="site"/.test(html)) problems.push('index.html must keep <main id="site">');
if (!html.includes('href="ask.css"')) problems.push('index.html must load ask.css');
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) problems.push('no inline scripts (the Content-Security-Policy blocks them)');
if (/<style[\s>]/i.test(html) || /\sstyle="/i.test(html)) problems.push('no inline styles (the Content-Security-Policy blocks them)');
const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
if (!/connect-src[^;]*https:\/\/api\.github\.com/.test(csp)) problems.push('the Content-Security-Policy must allow https://api.github.com');
if (!/script-src 'self'(;|$)/.test(csp)) problems.push("script-src must stay 'self'");

for (const marker of ["addEventListener('push'", "addEventListener('notificationclick'", '__BUILD__']) {
  if (!sw.includes(marker)) problems.push(`sw.js lost ${marker}`);
}
const shell = [...(sw.match(/const SHELL_FILES = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
for (const f of shell) if (f !== './' && !existsSync(`${WEB}${f}`)) problems.push(`sw.js SHELL_FILES lists ${f}, which does not exist`);

function walk(dir) {
  return readdirSync(dir).flatMap((n) => (statSync(`${dir}${n}`).isDirectory() ? walk(`${dir}${n}/`) : [`${dir}${n}`]));
}
const appFiles = walk(WEB).map((f) => f.slice(WEB.length)).filter((f) => /\.(js|css|html|json|webmanifest)$/.test(f) && f !== 'sw.js');
for (const f of appFiles) if (!shell.includes(f)) problems.push(`${f} is missing from SHELL_FILES in sw.js`);

const pushKeys = JSON.parse(readFileSync(`${WEB}push.json`, 'utf8'));
if (!pushKeys.vapid || !pushKeys.inbox || Object.keys(pushKeys).some((k) => !['vapid', 'inbox'].includes(k))) problems.push('push.json must hold only the two public keys');

if (problems.length) {
  console.error(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log(`site ok (${shell.length} cached files)`);

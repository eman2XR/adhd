// Talks to the repository: posts requests and notification sign-ups as issues, and reads back the status of requests.
// Posting needs the token from the personal link (#key=...); reading works without it because the repository is public.

export const REPO = 'eman2XR/adhd';
export const OWNER = 'eman2XR';
export const REQUEST_MARKER = '<!-- adhd-request -->';
const API = 'https://api.github.com';
const TOKEN_KEY = 'adhd.token';
const OUTBOX_KEY = 'adhd.outbox';

function headers(token) {
  const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Picks the token up from the link. The link stays as it is, so adding the page to the Home Screen keeps it there too
// (the Home Screen app on iPhone has its own storage).
export function token() {
  const m = location.hash.match(/(?:^#|&)key=([^&]+)/);
  if (m) write(TOKEN_KEY, decodeURIComponent(m[1]));
  return read(TOKEN_KEY, null);
}

// Saves the key from a pasted personal link (or the bare key). Returns true when one was found.
export function saveLink(text) {
  const m = String(text).trim().match(/key=([^&\s]+)/) || String(text).trim().match(/^(github_pat_[A-Za-z0-9_]+)$/);
  if (!m) return false;
  write(TOKEN_KEY, decodeURIComponent(m[1]));
  return true;
}

export function requestIssue(text, device) {
  const at = new Date().toISOString();
  const first = text.trim().split('\n')[0].slice(0, 70);
  const body = `${text.trim()}\n\n${REQUEST_MARKER}\n\`\`\`json\n${JSON.stringify({ kind: 'request', device, at }, null, 1)}\n\`\`\`\n`;
  return { title: `Request: ${first}`, body, labels: ['request'] };
}

export function queue(issue) {
  const box = read(OUTBOX_KEY, []);
  box.push({ id: `item-${Date.now().toString(36)}`, ...issue });
  write(OUTBOX_KEY, box);
}

export function pending() {
  return read(OUTBOX_KEY, []);
}

// Sends everything waiting in the outbox. Returns { sent, left, error }.
export async function flush() {
  const t = token();
  const box = read(OUTBOX_KEY, []);
  if (!box.length) return { sent: 0, left: 0 };
  if (!t) return { sent: 0, left: box.length, error: 'no-token' };
  const left = [];
  let sent = 0;
  let error;
  for (const item of box) {
    if (error) {
      left.push(item);
      continue;
    }
    try {
      const res = await fetch(`${API}/repos/${REPO}/issues`, {
        method: 'POST',
        headers: { ...headers(t), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, body: item.body, labels: item.labels }),
      });
      if (res.ok) sent += 1;
      else {
        error = res.status === 401 || res.status === 403 ? 'bad-token' : `GitHub answered ${res.status}`;
        left.push(item);
      }
    } catch {
      error = 'offline';
      left.push(item);
    }
  }
  write(OUTBOX_KEY, left);
  return { sent, left: left.length, error };
}

// The latest requests posted with the owner's token, newest first: { number, text, state, closedAt }.
export async function requests() {
  const res = await fetch(`${API}/repos/${REPO}/issues?labels=request&state=all&per_page=20`, { headers: headers(null), cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const issues = await res.json();
  return issues
    .filter((i) => i.user?.login === OWNER && (i.body || '').includes(REQUEST_MARKER))
    .map((i) => ({
      number: i.number,
      text: (i.body || '').split(REQUEST_MARKER)[0].trim(),
      state: i.state === 'closed' ? (i.state_reason === 'not_planned' ? 'declined' : 'live') : 'working',
      closedAt: i.closed_at,
    }));
}

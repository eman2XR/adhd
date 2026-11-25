// Notifications for the site. Subscribes this device to Web Push and returns the subscription, sealed with the inbox
// key from push.json, as a GitHub issue for the loop on the owner's Mac to read (scripts/push.mjs inbox).

export const PUSH_MARKER = '<!-- adhd-push -->';
const INBOX_INFO = 'adhd inbox v1';

const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

// Encrypts data so that only the private inbox key on the owner's Mac can open it: ECDH, HKDF, then AES-256-GCM.
export async function seal(data, inboxPublic, subtle = crypto.subtle) {
  const inboxKey = await subtle.importKey('raw', unb64u(inboxPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'ECDH', public: inboxKey }, pair.privateKey, 256);
  const hkdf = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(INBOX_INFO) }, hkdf, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return { epk: b64u(await subtle.exportKey('raw', pair.publicKey)), salt: b64u(salt), iv: b64u(iv), ct: b64u(ct) };
}

// 'ok' when this browser can subscribe; 'homescreen' on iPhone and iPad outside the Home Screen app; 'none' otherwise.
export function pushSupport() {
  const apple = /iPhone|iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ok';
  return apple ? 'homescreen' : 'none';
}

let publicKeys = null;
export async function loadPushKeys() {
  if (!publicKeys) publicKeys = await (await fetch('push.json', { cache: 'no-store' })).json();
  return publicKeys;
}

export async function currentSubscription() {
  if (pushSupport() !== 'ok') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

function sameKey(a, b) {
  if (!a || a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a);
  return x.every((v, i) => v === b[i]);
}

// Call straight from a tap: asks for permission, subscribes, and returns the issue to post.
export async function enablePush(device) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission };
  const keys = await loadPushKeys();
  const vapid = unb64u(keys.vapid);
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options?.applicationServerKey, vapid)) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapid });
  const at = new Date().toISOString();
  const request = { kind: 'push', device, at, sealed: await seal(sub.toJSON(), keys.inbox) };
  const body = `This device would like a notification when the page is updated. The subscription is sealed.

${PUSH_MARKER}
\`\`\`json
${JSON.stringify(request, null, 1)}
\`\`\`
`;
  return { ok: true, issue: { title: `Notifications for ${device}`, body, labels: ['push'] } };
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (sub) await sub.unsubscribe();
}

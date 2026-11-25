// The request box: an empty page asks what it should become; once the page has content, a small button opens the same
// box so more changes can be asked for. Also shows the status of earlier requests and turns notifications on.

import { flush, pending, queue, requestIssue, requests, saveLink, token } from './github.js';
import { currentSubscription, enablePush, pushSupport } from './push.js';

const NOTIFY_KEY = 'adhd.notify';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

function device() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return 'iPad';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Android/.test(ua)) return 'Android';
  return 'browser';
}

const STATE_TEXT = { working: 'Working on it', live: 'Live', declined: 'Not done' };

function errorText(error) {
  if (error === 'no-token') return 'This page needs your personal link to send anything. Open the link you were sent, then try again.';
  if (error === 'bad-token') return 'Your personal link has stopped working. Ask for a new one; your message is saved here until then.';
  if (error === 'offline') return 'No connection. Your message is saved and will be sent next time the page is open online.';
  return `Could not send yet (${error}). Your message is saved and will be sent next time.`;
}

function panel({ inPage }) {
  const status = el('p', { class: 'ask-status', role: 'status', 'aria-live': 'polite' });
  const field = el('textarea', {
    class: 'ask-field',
    rows: inPage ? 7 : 5,
    placeholder: inPage
      ? 'For example: a calm page with my weekly plan, big tick boxes, and a timer that turns green when I take a break.'
      : 'What should change?',
    'aria-label': 'What you want on the page and how it should behave',
  });
  const send = el('button', { class: 'button button--primary', type: 'submit' }, 'Send');
  const history = el('ul', { class: 'ask-history' });
  const notify = el('div', { class: 'ask-notify' });

  const form = el(
    'form',
    {
      class: 'ask-form',
      onsubmit: async (e) => {
        e.preventDefault();
        const text = field.value.trim();
        if (!text) {
          field.focus();
          return;
        }
        send.disabled = true;
        queue(requestIssue(text, device()));
        field.value = '';
        status.textContent = 'Sending...';
        const r = await flush();
        send.disabled = false;
        status.textContent = r.error ? errorText(r.error) : 'Sent. It is usually built within a few hours.';
        if (!r.error) renderNotify(notify, { nudge: true });
        loadHistory(history);
      },
    },
    field,
    el('div', { class: 'ask-actions' }, send),
    status,
  );

  const linkBox = el('div', { class: 'ask-link' });
  if (!token()) {
    const input = el('input', { class: 'ask-field', type: 'url', placeholder: 'Paste the link you were sent', 'aria-label': 'Your personal link', autocomplete: 'off' });
    const save = el('button', {
      class: 'button',
      type: 'button',
      onclick: () => {
        if (saveLink(input.value)) {
          linkBox.replaceChildren();
          status.textContent = 'Link saved. You can send your message now.';
          flush();
        } else status.textContent = 'That does not look like your personal link.';
      },
    }, 'Save link');
    const reveal = el('button', {
      class: 'ask-quiet',
      type: 'button',
      onclick: () => {
        linkBox.replaceChildren(input, el('div', { class: 'ask-actions' }, save));
        input.focus();
      },
    }, 'I have a link');
    linkBox.append(reveal);
  }
  if (pending().length) status.textContent = `${pending().length} message(s) waiting to be sent.`;

  renderNotify(notify);
  loadHistory(history);

  return el(
    'section',
    { class: inPage ? 'ask ask--page' : 'ask' },
    inPage ? el('h1', { class: 'ask-title' }, 'What should this page be?') : el('h2', { class: 'ask-title' }, 'Change something'),
    el(
      'p',
      { class: 'ask-lead' },
      inPage
        ? 'This page is empty and it is yours. Write what you want on it and how it should behave, in your own words. It gets built for you, and you get a notification when it is live.'
        : 'Describe what to add, remove or change. You get a notification when it is live.',
    ),
    form,
    linkBox,
    notify,
    history,
  );
}

async function renderNotify(box, { nudge = false } = {}) {
  box.replaceChildren();
  box.classList.toggle('ask-notify--nudge', nudge);
  const support = pushSupport();
  if (support === 'homescreen') {
    box.append(
      el('p', { class: 'ask-notify-title' }, 'Get a notification when it is live'),
      el(
        'ol',
        { class: 'ask-steps' },
        el('li', {}, 'Tap the Share button at the bottom of Safari.'),
        el('li', {}, 'Choose Add to Home Screen, then Add.'),
        el('li', {}, 'Open the page from your Home Screen and tap Notify me.'),
      ),
    );
    return;
  }
  if (support !== 'ok') return;
  const sub = await currentSubscription();
  if (sub && localStorage.getItem(NOTIFY_KEY) === 'on') {
    if (!nudge) box.append(el('p', { class: 'ask-hint' }, 'Notifications are on for this device.'));
    else box.append(el('p', { class: 'ask-hint' }, 'You will get a notification when it is live.'));
    return;
  }
  if (nudge) box.append(el('p', { class: 'ask-notify-title' }, 'Want a notification when it is live?'));
  const button = el(
    'button',
    {
      class: 'button',
      type: 'button',
      onclick: async () => {
        button.disabled = true;
        try {
          const r = await enablePush(device());
          if (!r.ok) {
            box.replaceChildren(el('p', { class: 'ask-hint' }, 'Notifications were not allowed. You can turn them on in Settings for this site, then tap again.'));
            return;
          }
          queue(r.issue);
          const sent = await flush();
          localStorage.setItem(NOTIFY_KEY, 'on');
          box.replaceChildren(
            el('p', { class: 'ask-hint' }, sent.error ? errorText(sent.error) : 'Done. A first notification arrives within a few hours to show it works.'),
          );
        } catch (err) {
          button.disabled = false;
          box.append(el('p', { class: 'ask-hint' }, `Could not turn notifications on (${err.message}).`));
        }
      },
    },
    nudge ? 'Notify me' : 'Notify me when it is live',
  );
  box.append(button);
}

async function loadHistory(list) {
  try {
    const items = await requests();
    list.replaceChildren(
      ...items.slice(0, 6).map((r) =>
        el(
          'li',
          { class: `ask-item ask-item--${r.state}` },
          el('span', { class: 'ask-badge' }, STATE_TEXT[r.state]),
          el('span', { class: 'ask-text' }, r.text.length > 140 ? `${r.text.slice(0, 140)}...` : r.text),
        ),
      ),
    );
  } catch {
    list.replaceChildren();
  }
}

function mount() {
  token();
  const site = document.getElementById('site');
  const empty = !site || site.hasAttribute('data-empty');
  if (empty) {
    document.body.classList.add('is-empty');
    (site || document.body).append(panel({ inPage: true }));
  } else {
    const dialog = el('dialog', { class: 'ask-dialog', 'aria-label': 'Change something' });
    const close = el('button', { class: 'button ask-close', type: 'button', onclick: () => dialog.close() }, 'Close');
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    const open = el(
      'button',
      {
        class: 'ask-fab',
        type: 'button',
        onclick: () => {
          dialog.replaceChildren(close, panel({ inPage: false }));
          dialog.showModal();
        },
      },
      'Change something',
    );
    document.body.append(open, dialog);
  }
  flush();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // A new deploy installs a new worker; reload once onto it, but not on the very first visit.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'open') location.href = e.data.url;
  });
}

mount();

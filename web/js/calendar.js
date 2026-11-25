// The calendar: plans on days, a month to look across, and today's plans on the Today tab. Plans stay on this device.

import { addDays, dayKey, el, fromKey } from './util.js';
import { arrowArt, calendarArt, checkArt, ringArt } from './art.js';

const TONES = ['', 'learn', 'focus', 'move', 'family', 'network'];
const MAX_DOTS = 3;

// What the calendar is showing and what is half-typed, kept in memory only, so the app always opens on today.
const view = {
  month: null,
  selected: null,
  tone: '',
  draft: '',
  time: '',
  showTime: false,
  todayDraft: '',
  editing: null,
  status: '',
  undo: null,
  focus: null,
};

// One live region for messages, kept across re-renders so VoiceOver reads each new one.
let live = null;
function liveRegion() {
  if (!live) live = el('p', { class: 'day-status', role: 'status', 'aria-live': 'polite' });
  return live;
}

// Plans: state.events = { 'YYYY-MM-DD': [{ id, text, time: 'HH:MM' or '', tone, done }] }.
export function cleanEvents(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [day, list] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(list)) continue;
    const items = list
      .filter((e) => e && typeof e === 'object' && typeof e.text === 'string' && e.text.trim())
      .map((e) => ({
        id: typeof e.id === 'string' && e.id ? e.id : Math.random().toString(36).slice(2, 10),
        text: e.text.trim().slice(0, 200),
        time: typeof e.time === 'string' && /^\d{2}:\d{2}$/.test(e.time) ? e.time : '',
        tone: TONES.includes(e.tone) ? e.tone : '',
        done: e.done === true,
      }));
    if (items.length) out[day] = items;
  }
  return out;
}

// Timed plans first, by time; plans without a time after them, in the order they were added.
export function itemsOn(state, day) {
  return [...(state.events[day] || [])].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}

const cleanTime = (time) => (/^\d{2}:\d{2}$/.test(time || '') ? time : '');

export function addItem(state, day, text, time = '', tone = '') {
  const item = { id: Math.random().toString(36).slice(2, 10), text: String(text).trim().slice(0, 200), time: cleanTime(time), tone: TONES.includes(tone) ? tone : '', done: false };
  if (!item.text) return null;
  state.events[day] = [...(state.events[day] || []), item];
  return item;
}

export function updateItem(state, day, id, text, time) {
  const item = (state.events[day] || []).find((e) => e.id === id);
  const words = String(text).trim().slice(0, 200);
  if (!item || !words) return null;
  item.text = words;
  item.time = cleanTime(time);
  return item;
}

export function toggleItem(state, day, id) {
  const item = (state.events[day] || []).find((e) => e.id === id);
  if (item) item.done = !item.done;
  return item;
}

// Removes a plan and returns where it was, so it can be put back.
export function removeItem(state, day, id) {
  const list = state.events[day] || [];
  const index = list.findIndex((e) => e.id === id);
  if (index < 0) return null;
  const [item] = list.splice(index, 1);
  if (!list.length) delete state.events[day];
  return { item, index };
}

export function restoreItem(state, day, item, index) {
  const list = [...(state.events[day] || [])];
  list.splice(Math.min(index, list.length), 0, item);
  state.events[day] = list;
}

// Where "move" sends a plan: past plans come to today, others go to the next day.
export function moveTarget(day, today = dayKey()) {
  return day < today ? today : addDays(day, 1);
}

export function moveItem(state, day, id, to) {
  const removed = removeItem(state, day, id);
  if (!removed) return null;
  state.events[to] = [...(state.events[to] || []), { ...removed.item, done: false }];
  return removed;
}

function timeText(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// The first day of the week where the friend lives: Sunday (0) or Monday (1).
function firstWeekday() {
  try {
    const locale = new Intl.Locale(navigator.language);
    const info = locale.getWeekInfo ? locale.getWeekInfo() : locale.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch {}
  return /^(en-US|en-CA|ja|ko|zh|he|pt-BR)/.test(navigator.language) ? 0 : 1;
}

function longDay(day) {
  return fromKey(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function relative(day) {
  const today = dayKey();
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  if (day === addDays(today, -1)) return 'Yesterday';
  return '';
}

function moveLabel(day) {
  const today = dayKey();
  if (day < today) return 'Move to today';
  if (day === today) return 'Move to tomorrow';
  return 'Move to the next day';
}

function say(text, undo = null) {
  view.status = text;
  view.undo = undo;
}

function itemRow(ctx, day, item, { actions }) {
  const check = el(
    'button',
    {
      class: `check check--item${item.done ? ' is-done' : ''}`,
      type: 'button',
      'aria-pressed': item.done ? 'true' : 'false',
      'aria-label': item.done ? `Undo: ${item.text}` : `Mark done: ${item.text}`,
      onclick: (e) => {
        if (ctx.rolledOver()) return;
        const it = toggleItem(ctx.state, day, item.id);
        ctx.save();
        if (it?.done) ctx.celebrate(e.currentTarget);
        say(it?.done ? 'Done. Nice.' : '');
        view.focus = `[data-item="${item.id}"] .check`;
        ctx.refresh();
      },
    },
    checkArt(),
  );
  const row = el('li', { class: `item tone--${item.tone || 'none'}${item.done ? ' is-done' : ''}`, 'data-item': item.id });

  if (actions && view.editing === item.id) {
    const words = el('input', { class: 'g-input edit-text', type: 'text', maxlength: '200', 'aria-label': 'Plan', value: item.text });
    const time = el('input', { class: 'g-input add-time', type: 'time', 'aria-label': 'Time', value: item.time });
    row.append(
      el(
        'form',
        {
          class: 'item-edit',
          onsubmit: (e) => {
            e.preventDefault();
            if (ctx.rolledOver()) return;
            if (!updateItem(ctx.state, day, item.id, words.value, time.value)) return words.focus();
            ctx.save();
            view.editing = null;
            say('Saved.');
            view.focus = `[data-item="${item.id}"] .check`;
            ctx.refresh();
          },
        },
        words,
        el('label', { class: 'add-time-label' }, el('span', {}, 'Time (optional)'), time),
        el(
          'div',
          { class: 'item-edit-actions' },
          el(
            'button',
            {
              class: 'g-button g-button--quiet g-button--small item-remove',
              type: 'button',
              'aria-label': `Remove ${item.text}`,
              onclick: () => {
                if (ctx.rolledOver()) return;
                const removed = removeItem(ctx.state, day, item.id);
                ctx.save();
                view.editing = null;
                say('Removed.', removed && { kind: 'remove', day, item: removed.item, index: removed.index });
                view.focus = '.undo';
                ctx.refresh();
              },
            },
            'Remove',
          ),
          el('button', { class: 'g-button g-button--quiet g-button--small', type: 'button', onclick: () => { view.editing = null; ctx.refresh(); } }, 'Cancel'),
          el('button', { class: 'g-button g-button--primary g-button--small', type: 'submit' }, 'Save'),
        ),
      ),
    );
    view.focus = view.focus || `[data-item="${item.id}"] .edit-text`;
    return row;
  }

  row.append(el('div', { class: 'item-main' }, check, el('div', { class: 'item-text' }, item.time ? el('span', { class: 'item-time' }, timeText(item.time)) : null, el('span', { class: 'item-words' }, el('span', {}, item.text)))));
  if (actions) {
    row.append(
      el(
        'div',
        { class: 'item-actions' },
        item.done
          ? null
          : el(
              'button',
              {
                class: 'g-button g-button--quiet g-button--small',
                type: 'button',
                onclick: () => {
                  if (ctx.rolledOver()) return;
                  const to = moveTarget(day);
                  const moved = moveItem(ctx.state, day, item.id, to);
                  ctx.save();
                  const where = relative(to) ? relative(to).toLowerCase() : longDay(to);
                  say(`Moved to ${where}. No rush.`, moved && { kind: 'move', day, to, item: moved.item, index: moved.index });
                  view.focus = '.undo';
                  ctx.refresh();
                },
              },
              moveLabel(day),
            ),
        el('button', { class: 'g-button g-button--quiet g-button--small', type: 'button', 'aria-label': `Edit ${item.text}`, onclick: () => { view.editing = item.id; ctx.refresh(); } }, 'Edit'),
      ),
    );
  }
  return row;
}

function undoButton(ctx) {
  const u = view.undo;
  if (!u) return null;
  return el(
    'button',
    {
      class: 'g-button g-button--small undo',
      type: 'button',
      onclick: () => {
        if (u.kind === 'move') removeItem(ctx.state, u.to, u.item.id);
        restoreItem(ctx.state, u.day, u.item, u.index);
        ctx.save();
        say('Put back.');
        view.focus = `[data-item="${u.item.id}"] .check`;
        ctx.refresh();
      },
    },
    'Undo',
  );
}

// Today's plans, shown on the Today tab, with a quick way to add one.
export function planCard(ctx) {
  const today = dayKey();
  const list = itemsOn(ctx.state, today);
  const open = list.filter((i) => !i.done).length;
  const input = el('input', { class: 'g-input today-add', type: 'text', placeholder: 'Add something to today', 'aria-label': 'Add something to today', maxlength: '200', enterkeyhint: 'done', value: view.todayDraft });
  input.addEventListener('input', () => {
    view.todayDraft = input.value;
  });
  return el(
    'section',
    { class: 'plan', 'aria-label': 'On your calendar today' },
    el(
      'header',
      { class: 'plan-head' },
      el('div', { class: 'plan-art' }, calendarArt()),
      el('div', {}, el('h2', { class: 'plan-title' }, 'On your calendar today'), el('p', { class: 'plan-sub' }, list.length ? (open ? `${open} still to do` : 'All done for today') : 'Nothing planned. That is okay too.')),
    ),
    list.length ? el('ul', { class: 'items' }, list.map((item) => itemRow(ctx, today, item, { actions: false }))) : null,
    el(
      'form',
      {
        class: 'add-main add-main--today',
        onsubmit: (e) => {
          e.preventDefault();
          if (ctx.rolledOver()) return;
          if (!addItem(ctx.state, dayKey(), input.value)) return input.focus();
          ctx.save();
          view.todayDraft = '';
          ctx.refresh();
          document.querySelector('.today-add')?.focus();
        },
      },
      input,
      el('button', { class: 'g-button g-button--primary', type: 'submit' }, 'Add'),
    ),
    el('div', { class: 'plan-actions' }, el('button', { class: 'g-button g-button--quiet', type: 'button', onclick: () => ctx.openCalendar(today) }, 'Open calendar')),
  );
}

export function openOn(day) {
  view.selected = day;
  view.month = day.slice(0, 7);
  view.editing = null;
  view.undo = null;
  view.status = '';
}

function monthTitle(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthGrid(ctx) {
  const [y, m] = view.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const start = firstWeekday();
  const lead = (first.getDay() - start + 7) % 7;
  const today = dayKey();
  // 1 November 2026 is a Sunday, so 1 + n is the weekday n.
  const names = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 1 + ((start + i) % 7)));

  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(el('span', { class: 'cal-blank', 'aria-hidden': 'true' }));
  for (let d = 1; d <= days; d += 1) {
    const key = `${view.month}-${String(d).padStart(2, '0')}`;
    const items = ctx.state.events[key] || [];
    const grew = Object.keys(ctx.state.done[key] || {}).length > 0;
    const isToday = key === today;
    const label = [longDay(key), isToday ? 'today' : '', items.length ? `${items.length} plan${items.length > 1 ? 's' : ''}` : 'no plans', grew ? 'you grew this day' : ''].filter(Boolean).join(', ');
    cells.push(
      el(
        'button',
        {
          class: `cal-day${isToday ? ' is-today' : ''}${key === view.selected ? ' is-selected' : ''}${key < today ? ' is-past' : ''}`,
          type: 'button',
          'aria-label': label,
          'aria-pressed': key === view.selected ? 'true' : 'false',
          onclick: () => {
            if (ctx.rolledOver()) return;
            view.selected = key;
            view.editing = null;
            say('');
            ctx.refresh();
            document.querySelector('.day-card')?.scrollIntoView({ block: 'nearest' });
          },
        },
        isToday ? el('span', { class: 'cal-ring' }, ringArt()) : null,
        el('span', { class: 'cal-num' }, String(d)),
        el(
          'span',
          { class: 'cal-marks', 'aria-hidden': 'true' },
          items.slice(0, MAX_DOTS).map((it) => el('span', { class: `cal-dot tone--${it.tone || 'none'}${it.done ? ' is-done' : ''}` })),
          items.length > MAX_DOTS ? el('span', { class: 'cal-more' }, '+') : null,
          grew ? el('span', { class: 'cal-leaf' }) : null,
        ),
      ),
    );
  }

  const isThisMonth = view.month === today.slice(0, 7);
  const go = (n) => () => {
    if (ctx.rolledOver()) return;
    view.month = shiftMonth(view.month, n);
    say('');
    ctx.refresh();
  };
  return el(
    'section',
    { class: 'month', 'aria-label': monthTitle(view.month) },
    el(
      'div',
      { class: 'month-head' },
      el('button', { class: 'g-button g-button--quiet month-nav', type: 'button', 'aria-label': 'Previous month', onclick: go(-1) }, arrowArt('left')),
      el('h2', { class: 'month-title' }, monthTitle(view.month)),
      el('button', { class: 'g-button g-button--quiet month-nav', type: 'button', 'aria-label': 'Next month', onclick: go(1) }, arrowArt('right')),
    ),
    el('div', { class: 'cal-grid' }, names.map((d) => el('span', { class: 'cal-wd', 'aria-hidden': 'true' }, d.toLocaleDateString(undefined, { weekday: 'narrow' }))), cells),
    el(
      'div',
      { class: 'month-foot' },
      el('p', { class: 'month-key' }, el('span', { class: 'cal-dot tone--none' }), ' plans', el('span', { class: 'cal-leaf' }), ' you grew that day'),
      isThisMonth ? null : el('button', { class: 'g-button g-button--quiet g-button--small', type: 'button', onclick: () => { openOn(today); ctx.refresh(); } }, 'Back to today'),
    ),
  );
}

function addForm(ctx, day) {
  const text = el('input', { class: 'g-input add-text', type: 'text', placeholder: 'Add something to this day', 'aria-label': `Add a plan for ${longDay(day)}`, maxlength: '200', enterkeyhint: 'done', value: view.draft });
  text.addEventListener('input', () => {
    view.draft = text.value;
  });
  const time = view.showTime ? el('input', { class: 'g-input add-time', type: 'time', 'aria-label': 'Time', value: view.time }) : null;
  time?.addEventListener('input', () => {
    view.time = time.value;
  });
  const chips = el(
    'div',
    { class: 'chips', role: 'group', 'aria-label': 'Colour' },
    TONES.map((tone) =>
      el(
        'button',
        {
          class: `chip tone--${tone || 'none'}${view.tone === tone ? ' is-on' : ''}`,
          type: 'button',
          'aria-pressed': view.tone === tone ? 'true' : 'false',
          'aria-label': tone ? ctx.areaName(tone) : 'No colour',
          onclick: (e) => {
            view.tone = tone;
            e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => {
              const on = c === e.currentTarget;
              c.classList.toggle('is-on', on);
              c.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
          },
        },
        el('span', { class: 'chip-dot' }),
      ),
    ),
  );
  const timeControls = view.showTime
    ? el(
        'div',
        { class: 'add-time-wrap' },
        el('label', { class: 'add-time-label' }, el('span', {}, 'Time'), time),
        el('button', { class: 'g-button g-button--quiet g-button--small', type: 'button', onclick: () => { view.showTime = false; view.time = ''; ctx.refresh(); } }, 'No time'),
      )
    : el('button', { class: 'g-button g-button--quiet g-button--small add-time-show', type: 'button', onclick: () => { view.showTime = true; view.focus = '.add-time'; ctx.refresh(); } }, '+ Add a time');
  return el(
    'form',
    {
      class: 'add',
      onsubmit: (e) => {
        e.preventDefault();
        if (ctx.rolledOver()) return;
        if (!addItem(ctx.state, day, text.value, view.showTime ? view.time : '', view.tone)) return text.focus();
        ctx.save();
        view.draft = '';
        view.time = '';
        view.showTime = false;
        say('Added.');
        ctx.refresh();
        document.querySelector('.add-text')?.focus();
      },
    },
    el('div', { class: 'add-main' }, text, el('button', { class: 'g-button g-button--primary', type: 'submit' }, 'Add')),
    el('div', { class: 'add-options' }, timeControls, chips),
  );
}

function dayCard(ctx) {
  const day = view.selected;
  const list = itemsOn(ctx.state, day);
  const rel = relative(day);
  return el(
    'section',
    { class: 'day-card' },
    el('h2', { class: 'day-title' }, rel ? el('span', { class: 'day-rel' }, rel) : null, longDay(day)),
    addForm(ctx, day),
    el('div', { class: 'day-status-row' }, liveRegion(), undoButton(ctx)),
    list.length ? el('ul', { class: 'items items--day' }, list.map((item) => itemRow(ctx, day, item, { actions: true }))) : el('p', { class: 'day-empty' }, day < dayKey() ? 'Nothing was planned for this day.' : 'Nothing planned yet. Add one small thing, or leave it free.'),
  );
}

export function calendarView(ctx) {
  if (!view.selected) openOn(dayKey());
  return [monthGrid(ctx), dayCard(ctx)];
}

// Runs after the page is on screen: shows the latest message and puts focus back where it belongs.
export function afterRender() {
  const msg = view.status;
  view.status = '';
  if (live) {
    live.textContent = '';
    if (msg) setTimeout(() => { live.textContent = msg; }, 40);
  }
  if (view.focus) {
    const target = view.focus;
    view.focus = null;
    requestAnimationFrame(() => document.querySelector(target)?.focus({ preventScroll: true }));
  }
}

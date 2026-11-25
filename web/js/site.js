// Grow a little every day: one tiny step in each area of life the friend wants to grow in, a "just one thing" mode
// for heavy days, a five-minute start timer, a week of progress, and a line about today. Everything stays on this device.

import { areaArt, arrowArt, calendarArt, calendarMiniArt, checkArt, clockArt, heartArt, installDefs, planeArt, plant, sproutArt, squiggleArt, starArt } from './art.js';
import { afterRender, calendarView, cleanEvents, openOn, planCard } from './calendar.js';
import { dayKey, el, reducedMotion } from './util.js';

const AREAS = [
  {
    id: 'learn',
    name: 'Learn',
    why: 'Learn something new',
    ideas: ['Read 5 pages of a book', 'Watch one short talk or lesson', 'Write down one thing you learned today', 'Look up one thing you have been curious about'],
  },
  {
    id: 'focus',
    name: 'Get things done',
    why: 'Be more productive',
    ideas: ['Pick the one task that matters most today', 'Do the smallest annoying task first', 'Clear your desk for 5 minutes', 'Write tomorrow\'s first step before you stop'],
  },
  {
    id: 'move',
    name: 'Move',
    why: 'Do more sports',
    ideas: ['Go for a 10-minute walk', 'Do 20 squats', 'Stretch for 5 minutes', 'Take the stairs every time today'],
  },
  {
    id: 'family',
    name: 'Family',
    why: 'Spend more time with family',
    ideas: ['Call or text someone in your family', 'Eat one meal together, phones away', 'Ask someone how their day really was', 'Plan one small thing to do together this week'],
  },
  {
    id: 'network',
    name: 'Network',
    why: 'Build a better network for work',
    ideas: ['Message one work contact you have not talked to in a while', 'Thank a colleague for something specific', 'Write down one person to have coffee with this month', 'Share one useful thing with someone at work'],
  },
];

const KEY = 'site.grow.v1';
const TIMER_SECONDS = 5 * 60;

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

// Reads saved data, keeping only well-formed parts, so old or damaged data never stops the page from showing.
function load() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {}
  if (!isObj(data)) data = {};
  const obj = (v) => (isObj(v) ? v : {});
  const own = {};
  for (const [k, v] of Object.entries(obj(data.own))) if (Array.isArray(v)) own[k] = v.filter((x) => typeof x === 'string' && x.trim());
  const done = {};
  for (const [k, v] of Object.entries(obj(data.done))) if (isObj(v)) done[k] = v;
  const picked = {};
  for (const [k, v] of Object.entries(obj(data.picked))) if (isObj(v)) picked[k] = v;
  const notes = {};
  for (const [k, v] of Object.entries(obj(data.notes))) if (typeof v === 'string') notes[k] = v;
  const timer = isObj(data.timer) && typeof data.timer.end === 'number' ? data.timer : null;
  const events = cleanEvents(data.events);
  const tab = data.tab === 'calendar' ? 'calendar' : 'today';
  return { done, own, picked, notes, timer, events, tab };
}

let state = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function lastDays(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) out.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
  return out;
}

function ideasFor(area) {
  return [...area.ideas, ...(state.own[area.id] || [])];
}

// The day's step for an area: picked once and kept all day, changed only by "Another idea" or if that idea is removed.
function stepFor(area, today = dayKey()) {
  const ideas = ideasFor(area);
  const kept = state.picked[today]?.[area.id];
  if (kept && ideas.includes(kept)) return kept;
  let seed = 0;
  for (const ch of `${today}:${area.id}`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return pick(area, ideas[seed % ideas.length], today);
}

function pick(area, text, today = dayKey()) {
  state.picked[today] = { ...(state.picked[today] || {}), [area.id]: text };
  save();
  return text;
}

function anotherIdea(area) {
  const ideas = ideasFor(area);
  const i = ideas.indexOf(stepFor(area));
  pick(area, ideas[(i + 1) % ideas.length]);
}

function doneToday(areaId, today = dayKey()) {
  return Boolean(state.done[today]?.[areaId]);
}

function toggleDone(areaId) {
  const today = dayKey();
  const day = { ...(state.done[today] || {}) };
  if (day[areaId]) delete day[areaId];
  else day[areaId] = stepFor(AREAS.find((a) => a.id === areaId));
  state.done[today] = day;
  save();
  return Boolean(day[areaId]);
}

function thisWeek(areaId) {
  return lastDays(7).filter((d) => state.done[dayKey(d)]?.[areaId]).length;
}

function celebrate(anchor) {
  if (reducedMotion()) return;
  const rect = anchor.getBoundingClientRect();
  const layer = el('div', { class: 'burst', 'aria-hidden': 'true' });
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;
  const colors = ['var(--w-learn)', 'var(--w-focus)', 'var(--w-move)', 'var(--w-family)', 'var(--w-network)', 'var(--w-sun)'];
  for (let i = 0; i < 16; i += 1) {
    const leaf = el('span', { class: 'burst-leaf' });
    const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
    const dist = 46 + Math.random() * 34;
    leaf.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    leaf.style.setProperty('--dy', `${Math.sin(angle) * dist + 24}px`);
    leaf.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`);
    leaf.style.setProperty('--r2', `${Math.round(Math.random() * 360 + 180)}deg`);
    leaf.style.background = colors[i % colors.length];
    layer.append(leaf);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1200);
}

const CHEERS = ['Nice. A new leaf.', 'Done. Small steps add up.', 'Look at you grow.', 'One more step forward.', 'That is how growth happens.'];

// The area ticked off last, so only its tick and leaf animate.
let fresh = null;

function greeting(hour = new Date().getHours()) {
  if (hour < 5) return 'Hello, night owl';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// A single five-minute timer, shown at the top while it runs. It survives a reload and chimes when it ends.
const timer = { end: state.timer?.end || 0, label: state.timer?.label || '', handle: 0 };

function saveTimer() {
  state.timer = timer.end ? { end: timer.end, label: timer.label } : null;
  save();
}

let audio = null;
function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audio) audio = new AC();
  if (audio.state === 'suspended') audio.resume();
}

function chime() {
  if (!audio) return;
  const t = audio.currentTime;
  [660, 880, 1320].forEach((f, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, t + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.5);
    osc.connect(gain).connect(audio.destination);
    osc.start(t + i * 0.18);
    osc.stop(t + i * 0.18 + 0.55);
  });
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

function announce(text) {
  const hint = document.querySelector('.lead-hint');
  if (hint) hint.textContent = text;
}

function renderTimer(bar) {
  clearInterval(timer.handle);
  document.body.classList.toggle('has-timer', Boolean(timer.end));
  if (!timer.end) {
    bar.replaceChildren();
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const time = el('span', { class: 'timer-time' });
  const label = el('span', { class: 'timer-label' });
  const stop = el('button', { class: 'g-button g-button--quiet', type: 'button', onclick: () => { timer.end = 0; saveTimer(); renderTimer(bar); } }, 'Stop');
  bar.replaceChildren(el('span', { class: 'timer-icon' }, clockArt()), el('div', { class: 'timer-text' }, label, time), stop);
  const wasRunning = timer.end > Date.now();
  const tick = () => {
    const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
    time.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    label.textContent = left ? `Just start: ${timer.label}` : 'Five minutes done. Keep going if it feels good, or tick it off.';
    bar.classList.toggle('is-finished', !left);
    if (!left) {
      clearInterval(timer.handle);
      if (wasRunning) {
        chime();
        announce('Five minutes done. You started, and that was the hard part.');
      }
    }
  };
  tick();
  timer.handle = setInterval(tick, 1000);
}

function startTimer(text, bar) {
  unlockAudio();
  timer.end = Date.now() + TIMER_SECONDS * 1000;
  timer.label = text;
  saveTimer();
  renderTimer(bar);
  window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function areaCard(area, refresh, timerBar) {
  const today = dayKey();
  const done = doneToday(area.id);
  const step = done ? state.done[today][area.id] : stepFor(area);
  const week7 = thisWeek(area.id);

  const check = el(
    'button',
    {
      class: `check${done ? ' is-done' : ''}${done && fresh === area.id ? ' is-new' : ''}`,
      type: 'button',
      'aria-pressed': done ? 'true' : 'false',
      'aria-label': done ? `Undo: ${step}` : `Mark done: ${step}`,
      onclick: (e) => {
        if (rolledOver()) return;
        const nowDone = toggleDone(area.id);
        fresh = nowDone ? area.id : null;
        if (nowDone) {
          celebrate(e.currentTarget);
          refresh(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
        } else refresh();
      },
    },
    checkArt(),
  );

  const actions = done
    ? null
    : el(
        'div',
        { class: 'card-actions' },
        el('button', { class: 'g-button', type: 'button', onclick: () => startTimer(step, timerBar) }, 'Start 5 min'),
        el(
          'button',
          {
            class: 'g-button g-button--quiet',
            type: 'button',
            onclick: () => {
              if (rolledOver()) return;
              anotherIdea(area);
              refresh();
            },
          },
          'Another idea',
        ),
      );

  const own = state.own[area.id] || [];
  const input = el('input', { class: 'g-input', type: 'text', placeholder: 'A small step of your own', 'aria-label': `Add your own idea for ${area.name}`, maxlength: '120' });
  const ideas = el(
    'details',
    { class: 'ideas' },
    el('summary', {}, 'Your ideas'),
    own.length
      ? el(
          'ul',
          { class: 'ideas-list' },
          own.map((idea, i) =>
            el(
              'li',
              {},
              el('span', {}, idea),
              el(
                'button',
                {
                  class: 'g-button g-button--quiet',
                  type: 'button',
                  'aria-label': `Remove ${idea}`,
                  onclick: () => {
                    state.own[area.id] = own.filter((_, j) => j !== i);
                    save();
                    refresh(null, area.id);
                  },
                },
                'Remove',
              ),
            ),
          ),
        )
      : el('p', { class: 'ideas-empty' }, 'Add small steps that fit your life. They join the ideas for this area.'),
    el(
      'form',
      {
        class: 'ideas-add',
        onsubmit: (e) => {
          e.preventDefault();
          const text = input.value.trim();
          if (!text) return;
          state.own[area.id] = [...own, text];
          save();
          refresh(null, area.id);
          document.querySelector(`[data-area="${area.id}"] .ideas-add input`)?.focus();
        },
      },
      input,
      el('button', { class: 'g-button', type: 'submit' }, 'Add'),
    ),
  );

  const week = el(
    'ol',
    { class: 'week', 'aria-label': `${area.name}, last 7 days` },
    lastDays(7).map((d) => {
      const hit = state.done[dayKey(d)]?.[area.id];
      return el('li', { class: `week-dot${hit ? ' is-hit' : ''}${dayKey(d) === today ? ' is-today' : ''}`, title: d.toLocaleDateString(undefined, { weekday: 'long' }) }, el('span', { class: 'sr' }, `${d.toLocaleDateString(undefined, { weekday: 'short' })}: ${hit ? 'done' : 'not done'}`));
    }),
  );

  return el(
    'article',
    { class: `card card--${area.id}${done ? ' is-done' : ''}`, 'data-area': area.id },
    el(
      'header',
      { class: 'card-head' },
      el('div', { class: 'card-art' }, areaArt(area.id)),
      el('div', {}, el('h2', { class: 'card-title' }, area.name), el('p', { class: 'card-why' }, area.why), week),
    ),
    el('div', { class: 'card-step' }, check, el('p', { class: 'step-text' }, el('span', {}, step))),
    actions,
    week7 > 1 ? el('p', { class: 'card-streak' }, `${week7} days this week`) : null,
    ideas,
  );
}

function tabBar() {
  const tab = (id, label, art) =>
    el(
      'button',
      {
        class: `tab${state.tab === id ? ' is-on' : ''}`,
        type: 'button',
        role: 'tab',
        'aria-selected': state.tab === id ? 'true' : 'false',
        onclick: () => {
          if (state.tab === id) return;
          state.tab = id;
          save();
          render();
          showTabs();
        },
      },
      art,
      el('span', {}, label),
    );
  return el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Views' }, tab('today', 'Today', sproutArt()), tab('calendar', 'Calendar', calendarMiniArt()));
}

// Brings the tabs into view after switching, below the sticky timer when it is running.
function showTabs() {
  const tabs = document.querySelector('.tabs');
  const bar = document.querySelector('.timer:not([hidden])');
  const clear = bar ? bar.getBoundingClientRect().bottom : 0;
  if (tabs && tabs.getBoundingClientRect().top < clear) tabs.scrollIntoView({ block: 'start' });
}

// What the calendar needs from the page.
function calendarContext() {
  return {
    state,
    save,
    refresh: () => render(),
    celebrate,
    rolledOver,
    areaName: (id) => AREAS.find((a) => a.id === id)?.name || id,
    openCalendar: (day) => {
      openOn(day);
      state.tab = 'calendar';
      save();
      render();
      showTabs();
    },
  };
}

function todayPage(message, timerBar, ctx) {
  const root = document.getElementById('site');
  const today = dayKey();
  const count = AREAS.filter((a) => doneToday(a.id)).length;
  const on = Object.fromEntries(AREAS.map((a) => [a.id, doneToday(a.id)]));

  const left = AREAS.filter((a) => !doneToday(a.id));
  const justOne = el(
    'button',
    {
      class: 'g-button g-button--primary',
      type: 'button',
      disabled: !left.length,
      onclick: () => {
        if (rolledOver()) return;
        const one = left[Math.floor(Math.random() * left.length)];
        const card = root.querySelector(`[data-area="${one.id}"]`);
        root.querySelectorAll('.card').forEach((c) => c.classList.toggle('is-dim', c !== card));
        card.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
        hint.textContent = `Just this one: ${stepFor(one)}. Everything else can wait.`;
        clear.hidden = false;
      },
    },
    'Just one thing',
  );
  const clear = el('button', { class: 'g-button g-button--quiet', type: 'button', hidden: true, onclick: () => render() }, 'Show all');
  const hint = el('p', { class: 'lead-hint', role: 'status', 'aria-live': 'polite' }, message || (count === AREAS.length ? 'All five leaves today. The whole plant is green. What a day.' : count ? `${count} of ${AREAS.length} leaves today. Every step counts.` : 'Pick any one tiny step below. Each one you finish grows a leaf.'));

  const note = el('textarea', { class: 'g-input note-field', rows: 2, placeholder: 'One thing I am proud of today...', 'aria-label': 'One thing you are proud of today' });
  note.value = state.notes[today] || '';
  note.addEventListener('input', () => {
    const day = dayKey();
    if (note.value.trim()) state.notes[day] = note.value;
    else delete state.notes[day];
    save();
  });
  const past = Object.keys(state.notes)
    .filter((k) => k !== today)
    .sort()
    .reverse()
    .slice(0, 5);

  const dateText = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return [
    el(
      'header',
      { class: 'top' },
      el(
        'div',
        { class: 'top-text' },
        el('p', { class: 'top-greet' }, greeting()),
        el('p', { class: 'top-date' }, dateText),
        el('h1', { class: 'top-title' }, 'Grow a little', el('br'), 'every day'),
        el('span', { class: 'top-squiggle' }, squiggleArt()),
      ),
      el('div', { class: 'top-plant' }, plant(on, fresh)),
      hint,
      el('div', { class: 'top-actions' }, justOne, clear),
    ),
    planCard(ctx),
    el('section', { class: 'cards', 'aria-label': 'Today\'s steps' }, AREAS.map((a) => areaCard(a, render, timerBar))),
    el(
      'section',
      { class: 'note' },
      el('h2', { class: 'note-title' }, el('span', { class: 'note-star' }, starArt()), 'Today, I am proud of'),
      note,
      past.length
        ? el(
            'ul',
            { class: 'note-past' },
            past.map((k) => el('li', {}, el('span', { class: 'note-day' }, new Date(`${k}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })), el('span', {}, state.notes[k]))),
          )
        : null,
    ),
  ];
}

function calendarPage(ctx) {
  return [
    el(
      'header',
      { class: 'cal-top' },
      el('div', {}, el('h1', { class: 'cal-top-title' }, 'Plan your days'), el('p', { class: 'cal-top-sub' }, 'Small plans are best. Moving one is always fine.')),
      el('div', { class: 'cal-top-art' }, calendarArt()),
    ),
    ...calendarView(ctx),
  ];
}

function render(message, openIdeas) {
  const root = document.getElementById('site');
  const timerBar = root.querySelector('.timer') || el('div', { class: 'timer', role: 'timer', hidden: true });
  const ctx = calendarContext();
  const page = state.tab === 'calendar' ? calendarPage(ctx) : todayPage(message, timerBar, ctx);
  root.replaceChildren(
    timerBar,
    tabBar(),
    ...page,
    el('footer', { class: 'foot' }, el('span', {}, 'Made with care, just for you'), el('span', { class: 'foot-heart' }, heartArt())),
  );
  fresh = null;
  if (openIdeas) root.querySelector(`[data-area="${openIdeas}"] details`)?.setAttribute('open', '');
  if (timer.end) renderTimer(timerBar);
  afterRender();
}

// A new day starts fresh after midnight: checked before every tap, when the app comes back, and once a minute.
let shownDay = dayKey();
function rolledOver() {
  if (dayKey() === shownDay) return false;
  shownDay = dayKey();
  state = load();
  openOn(shownDay);
  render('A new day. Pick any one tiny step.');
  return true;
}
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && rolledOver());
window.addEventListener('pageshow', rolledOver);
window.addEventListener('focus', rolledOver);
setInterval(rolledOver, 60 * 1000);

// The request button (ask.js) sits above the page; draw it into the same notebook: a paper plane and a pencil arrow.
document.addEventListener('ask:ready', () => {
  const open = document.querySelector('.ask-open');
  if (!open || open.querySelector('.ask-open-icon')) return;
  open.prepend(el('span', { class: 'ask-open-icon' }, planeArt()));
  open.querySelector('.ask-open-arrow')?.replaceChildren(arrowArt('right'));
});

installDefs();
render();

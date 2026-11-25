// Grow a little every day: one tiny step in each area of life the friend wants to grow in, a "just one thing" mode
// for heavy days, a five-minute start timer, a week of progress, and a line about today. Everything stays on this device.

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
  return { done, own, picked, notes, timer };
}

let state = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function dayKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lastDays(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) out.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
  return out;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c);
  return node;
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

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function celebrate(anchor) {
  if (reducedMotion()) return;
  const rect = anchor.getBoundingClientRect();
  const layer = el('div', { class: 'burst', 'aria-hidden': 'true' });
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;
  const colors = ['var(--g-learn)', 'var(--g-focus)', 'var(--g-move)', 'var(--g-family)', 'var(--g-network)'];
  for (let i = 0; i < 14; i += 1) {
    const dot = el('span', { class: 'burst-dot' });
    const angle = (Math.PI * 2 * i) / 14;
    const dist = 40 + Math.random() * 30;
    dot.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    dot.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    dot.style.background = colors[i % colors.length];
    layer.append(dot);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 900);
}

const CHEERS = ['Nice. That counts.', 'Done. Small steps add up.', 'Look at you go.', 'One more step forward.', 'That is how growth happens.'];

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
  if (!timer.end) {
    bar.replaceChildren();
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const time = el('span', { class: 'timer-time' });
  const label = el('span', { class: 'timer-label' });
  const stop = el('button', { class: 'g-button g-button--quiet', type: 'button', onclick: () => { timer.end = 0; saveTimer(); renderTimer(bar); } }, 'Stop');
  bar.replaceChildren(el('div', { class: 'timer-text' }, label, time), stop);
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
      class: `check${done ? ' is-done' : ''}`,
      type: 'button',
      'aria-pressed': done ? 'true' : 'false',
      'aria-label': done ? `Undo: ${step}` : `Mark done: ${step}`,
      onclick: (e) => {
        if (rolledOver()) return;
        const nowDone = toggleDone(area.id);
        if (nowDone) {
          celebrate(e.currentTarget);
          refresh(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
        } else refresh();
      },
    },
    el('span', { class: 'check-mark', 'aria-hidden': 'true' }),
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
      return el('li', { class: `week-dot${hit ? ' is-hit' : ''}`, title: d.toLocaleDateString(undefined, { weekday: 'long' }) }, el('span', { class: 'sr' }, `${d.toLocaleDateString(undefined, { weekday: 'short' })}: ${hit ? 'done' : 'not done'}`));
    }),
  );

  return el(
    'article',
    { class: `card card--${area.id}${done ? ' is-done' : ''}`, 'data-area': area.id },
    el(
      'header',
      { class: 'card-head' },
      el('div', {}, el('h2', { class: 'card-title' }, area.name), el('p', { class: 'card-why' }, area.why)),
      week,
    ),
    el('div', { class: 'card-step' }, check, el('p', { class: 'step-text' }, step)),
    actions,
    week7 > 1 ? el('p', { class: 'card-streak' }, `${week7} days this week`) : null,
    ideas,
  );
}

function render(message, openIdeas) {
  const root = document.getElementById('site');
  const today = dayKey();
  const count = AREAS.filter((a) => doneToday(a.id)).length;

  const timerBar = root.querySelector('.timer') || el('div', { class: 'timer', role: 'timer', hidden: true });

  const progress = el(
    'div',
    { class: 'progress', role: 'img', 'aria-label': `${count} of ${AREAS.length} areas done today` },
    AREAS.map((a) => el('span', { class: `progress-seg progress-seg--${a.id}${doneToday(a.id) ? ' is-on' : ''}` })),
  );

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
  const hint = el('p', { class: 'lead-hint', role: 'status', 'aria-live': 'polite' }, message || (count === AREAS.length ? 'Every area today. That is a great day.' : count ? `${count} of ${AREAS.length} today. Every step counts.` : 'Pick any one tiny step below. One is a win; more is a bonus.'));

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

  root.replaceChildren(
    timerBar,
    el(
      'header',
      { class: 'top' },
      el('p', { class: 'top-date' }, dateText),
      el('h1', { class: 'top-title' }, 'Grow a little every day'),
      progress,
      hint,
      el('div', { class: 'top-actions' }, justOne, clear),
    ),
    el('section', { class: 'cards', 'aria-label': 'Today\'s steps' }, AREAS.map((a) => areaCard(a, render, timerBar))),
    el(
      'section',
      { class: 'note' },
      el('h2', { class: 'note-title' }, 'Today, I am proud of'),
      note,
      past.length
        ? el(
            'ul',
            { class: 'note-past' },
            past.map((k) => el('li', {}, el('span', { class: 'note-day' }, new Date(`${k}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })), el('span', {}, state.notes[k]))),
          )
        : null,
    ),
  );
  if (openIdeas) root.querySelector(`[data-area="${openIdeas}"] details`)?.setAttribute('open', '');
  if (timer.end) renderTimer(timerBar);
}

// A new day starts fresh after midnight: checked before every tap, when the app comes back, and once a minute.
let shownDay = dayKey();
function rolledOver() {
  if (dayKey() === shownDay) return false;
  shownDay = dayKey();
  state = load();
  render('A new day. Pick any one tiny step.');
  return true;
}
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && rolledOver());
window.addEventListener('pageshow', rolledOver);
window.addEventListener('focus', rolledOver);
setInterval(rolledOver, 60 * 1000);

render();

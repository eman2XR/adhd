// Hand-drawn illustrations for Grow: ink lines with a little wobble and loose watercolour washes behind them, drawn in
// code so they follow the page's colours in light and dark mode. All original.

const NS = 'http://www.w3.org/2000/svg';

function n(tag, attrs = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, v);
  for (const c of children.flat()) if (c) node.append(c);
  return node;
}

// One set of filters for every drawing: a slight wobble for ink, and a rougher, softer edge for washes.
export function installDefs() {
  if (document.getElementById('g-defs')) return;
  const region = { filterUnits: 'userSpaceOnUse', x: '-60', y: '-60', width: '320', height: '320' };
  document.body.append(
    n(
      'svg',
      { id: 'g-defs', class: 'g-defs', width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' },
      n(
        'defs',
        {},
        n(
          'filter',
          { id: 'g-ink', ...region },
          n('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.045', numOctaves: '2', seed: '4', result: 'noise' }),
          n('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: '2.4', xChannelSelector: 'R', yChannelSelector: 'G' }),
        ),
        n(
          'filter',
          { id: 'g-wash', ...region },
          n('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.055', numOctaves: '3', seed: '11', result: 'noise' }),
          n('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: '9', xChannelSelector: 'R', yChannelSelector: 'G', result: 'moved' }),
          n('feGaussianBlur', { in: 'moved', stdDeviation: '0.7' }),
        ),
      ),
    ),
  );
}

function svg(viewBox, label, cls, ...layers) {
  const attrs = { viewBox, class: `art ${cls || ''}`.trim(), focusable: 'false' };
  if (label) Object.assign(attrs, { role: 'img', 'aria-label': label });
  else attrs['aria-hidden'] = 'true';
  return n('svg', attrs, ...layers);
}

// Ink lines, each drawn twice: the second pass a little offset and lighter, like a pen going over it again.
function ink(paths, cls) {
  const list = paths.map((p) => (typeof p === 'string' ? { d: p } : p));
  const draw = (p) => n('path', { d: p.d, class: p.cls || null });
  return n(
    'g',
    { class: `ink ${cls || ''}`.trim(), filter: 'url(#g-ink)' },
    list.map(draw),
    n('g', { class: 'ink-echo', transform: 'translate(0.7 -0.5)' }, list.filter((p) => !(p.cls || '').includes('fill')).map(draw)),
  );
}

const wash = (d, cls) => n('path', { d, class: `wash ${cls || ''}`.trim(), filter: 'url(#g-wash)' });
const paper = (d) => n('path', { d, class: 'paper' });
const dot = (cx, cy, r) => ({ d: `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`, cls: 'fill' });

const ART = {
  learn: () =>
    svg(
      '0 0 100 80',
      null,
      'art--area',
      wash('M6 26 C 20 12, 46 12, 54 22 C 66 12, 88 12, 95 24 C 97 40, 95 56, 91 68 C 76 64, 62 66, 50 74 C 38 66, 22 64, 7 68 C 4 54, 4 40, 6 26 Z'),
      wash('M69 60 L71 79 L75 74 L79 79 L79 60 Z', 'wash--deep'),
      ink([
        'M50 24 C 40 17, 25 16, 12 19 L12 63 C 25 60, 40 61, 50 67',
        'M50 24 C 60 17, 75 16, 88 19 L88 63 C 75 60, 60 61, 50 67',
        'M50 24 L50 67',
        'M9 23 L9 66 C 25 63, 40 64, 50 71 C 60 64, 75 63, 91 66 L91 23',
        'M19 29 C 27 27, 35 27, 43 30',
        'M19 37 C 27 35, 35 35, 43 38',
        'M19 45 C 25 43, 31 43, 37 45',
        'M57 30 C 65 27, 73 27, 81 29',
        'M57 38 C 65 35, 73 35, 81 37',
        'M57 46 C 63 44, 69 44, 75 45',
        'M70 63 L70 77 L74 73 L78 77 L78 62',
        'M27 3 L27 12 M22.5 7.5 L31.5 7.5',
        'M74 2 L74 9 M70.5 5.5 L77.5 5.5',
      ]),
    ),

  focus: () =>
    svg(
      '0 0 100 80',
      null,
      'art--area',
      wash('M15 10 C 40 3, 64 6, 80 10 C 83 30, 81 52, 78 75 C 56 79, 34 77, 13 73 C 11 51, 11 30, 15 10 Z'),
      ink([
        'M22 8 L74 10 L72 72 L20 70 Z',
        'M29 20 L37 20 L37 28 L29 28 Z',
        'M29 36 L37 36 L37 44 L29 44 Z',
        'M29 52 L37 52 L37 60 L29 60 Z',
        'M30 23 L33 27 L41 15',
        'M30 39 L33 43 L41 31',
        'M43 25 C 50 24, 57 24, 64 25',
        'M43 41 C 49 40, 55 40, 61 41',
        'M43 57 C 48 56, 53 56, 57 57',
      ]),
      paper('M62 70 L64.7 60.5 L84.5 36.6 L87.7 32.8 L93.9 38 L90.7 41.8 L70.9 65.7 Z'),
      wash('M64 61 L85 35 L92 41 L71 67 Z', 'wash--sun'),
      ink(['M62 70 L64.7 60.5 L70.9 65.7 Z', 'M64.7 60.5 L84.5 36.6 L90.7 41.8 L70.9 65.7', 'M84.5 36.6 L87.7 32.8 L93.9 38 L90.7 41.8', { d: 'M62 70 L63.3 65.8 L65.8 67.9 Z', cls: 'fill' }]),
    ),

  move: () =>
    svg(
      '0 0 100 70',
      null,
      'art--area',
      wash('M10 26 C 28 14, 50 22, 66 31 C 82 35, 97 42, 95 55 C 80 66, 40 67, 11 63 C 5 50, 5 38, 10 26 Z'),
      paper('M12 50 L92 50 C 94 55, 91 60, 85 60 L20 60 C 14 60, 11 56, 12 50 Z'),
      ink([
        'M15 50 C 14 40, 16 31, 20 23 C 26 26, 32 26, 38 21 L46 29 C 56 34, 70 36, 82 40 C 90 43, 92 47, 91 50',
        'M12 50 L92 50 C 94 55, 91 60, 85 60 L20 60 C 14 60, 11 56, 12 50 Z',
        'M15 55 L90 55',
        'M38 21 C 40 15, 46 13, 50 17 L47 30',
        'M41 27 L48 24',
        'M46 32 L53 29',
        'M51 36 L58 33',
        'M20 23 C 17 18, 21 14, 25 17',
        'M25 44 C 37 38, 51 40, 63 45',
        'M1 30 L9 30',
        'M0 38 L7 38',
        'M3 46 L9 46',
      ]),
    ),

  family: () =>
    svg(
      '0 0 100 80',
      null,
      'art--area',
      wash('M14 38 C 28 26, 40 16, 50 10 C 62 18, 74 28, 88 38 C 84 50, 82 64, 80 76 C 60 78, 40 78, 20 76 C 20 62, 18 50, 14 38 Z'),
      wash('M70 7 C 70 1, 78 1, 77 7 C 76 11, 71 13, 70 15 C 68 13, 63 11, 63 7 C 63 1, 70 1, 70 7 Z', 'wash--deep'),
      ink([
        'M11 39 L50 10 L89 39',
        'M21 32 L21 73 L79 73 L79 32',
        'M7 74 C 30 72, 70 72, 93 74',
        'M43 73 L43 54 C 43 47, 57 47, 57 54 L57 73',
        dot(54, 63, 1.4),
        'M27 44 L38 44 L38 55 L27 55 Z',
        'M32.5 44 L32.5 55 M27 49.5 L38 49.5',
        'M63 44 L73 44 L73 55 L63 55 Z',
        'M68 44 L68 55 M63 49.5 L73 49.5',
        'M66 26 L66 15 L74 15 L74 32',
        'M70 6 C 70 2.5, 75.5 2, 75.5 6 C 75.5 9.5, 70 12, 70 13.5 C 70 12, 64.5 9.5, 64.5 6 C 64.5 2, 70 2.5, 70 6 Z',
      ]),
    ),

  network: () =>
    svg(
      '0 0 100 80',
      null,
      'art--area',
      wash('M8 12 C 8 4, 16 3, 24 3 L56 4 C 64 5, 66 10, 66 18 L65 34 C 64 42, 58 43, 50 43 L28 43 L16 54 L19 42 C 11 41, 7 36, 7 30 Z'),
      ink([
        'M10 14 C 10 8, 14 6, 20 6 L54 6 C 60 6, 63 9, 63 15 L63 32 C 63 38, 60 40, 54 40 L30 40 L19 50 L21 40 C 14 40, 10 37, 10 32 Z',
        dot(27, 23, 2.6),
        dot(37, 23, 2.6),
        dot(47, 23, 2.6),
      ]),
      paper('M40 47 C 40 41, 44 39, 50 39 L82 39 C 88 39, 91 42, 91 48 L91 62 C 91 68, 88 70, 82 70 L80 70 L83 79 L72 70 L50 70 C 44 70, 40 67, 40 62 Z'),
      wash('M43 44 C 44 38, 50 37, 56 37 L84 38 C 92 39, 94 44, 93 52 L92 64 C 91 70, 86 72, 80 72 L74 72 L84 80 L68 72 L52 72 C 44 72, 41 68, 41 62 Z', 'wash--sun'),
      ink([
        'M40 47 C 40 41, 44 39, 50 39 L82 39 C 88 39, 91 42, 91 48 L91 62 C 91 68, 88 70, 82 70 L80 70 L83 79 L72 70 L50 70 C 44 70, 40 67, 40 62 Z',
        dot(59, 51, 1.8),
        dot(72, 51, 1.8),
        'M57 57 C 61 62.5, 70 62.5, 74 57',
      ]),
    ),
};

export const areaArt = (id) => ART[id]();

// The plant in the header: one leaf for each area, coloured in when that area's step is done today.
const LEAVES = [
  { id: 'learn', d: 'M79 96 C 70 86, 58 82, 48 86 C 54 96, 68 100, 79 96 Z', rib: 'M78 95 C 68 91, 60 89, 52 87', wash: 'M80 97 C 70 84, 56 79, 45 85 C 52 99, 68 104, 81 98 Z' },
  { id: 'focus', d: 'M81 84 C 90 74, 102 70, 113 74 C 107 84, 93 88, 81 84 Z', rib: 'M82 83 C 92 79, 100 77, 110 75', wash: 'M80 85 C 90 71, 104 67, 116 73 C 109 87, 93 91, 79 86 Z' },
  { id: 'move', d: 'M79 70 C 71 60, 61 55, 51 58 C 56 68, 68 73, 79 70 Z', rib: 'M78 69 C 70 65, 62 61, 54 59', wash: 'M80 71 C 71 57, 59 52, 48 57 C 54 71, 68 76, 81 72 Z' },
  { id: 'family', d: 'M81 56 C 89 47, 99 43, 109 46 C 104 56, 92 60, 81 56 Z', rib: 'M82 55 C 90 51, 98 49, 106 47', wash: 'M80 57 C 89 44, 101 40, 112 45 C 106 59, 92 63, 79 58 Z' },
  { id: 'network', d: 'M80 36 C 72 30, 68 20, 70 10 C 80 14, 86 26, 80 36 Z', rib: 'M79 34 C 76 26, 74 20, 71 13', wash: 'M81 38 C 71 31, 65 19, 68 7 C 81 11, 89 26, 81 38 Z' },
];

export function plant(on = {}, fresh = null) {
  const count = LEAVES.filter((l) => on[l.id]).length;
  const all = count === LEAVES.length;
  return svg(
    '0 0 160 160',
    `A small plant with ${count} of ${LEAVES.length} leaves coloured in today`,
    `art--plant${all ? ' is-all' : ''}`,
    wash('M146 27 C 146 37, 138 43, 130 42 C 121 41, 117 34, 118 26 C 120 17, 127 14, 134 14 C 142 15, 147 21, 146 27 Z', 'wash--sun sun'),
    wash('M47 111 C 70 105, 96 107, 117 111 L109 151 C 90 159, 70 158, 56 153 Z', 'wash--pot'),
    LEAVES.map((l) => n('g', { class: `leaf leaf--${l.id}${on[l.id] ? ' is-on' : ''}${fresh === l.id ? ' is-new' : ''}` }, wash(l.wash, `wash--${l.id}`))),
    ink([
      'M80 108 C 77 92, 84 80, 80 64 C 77 54, 82 46, 80 34',
      ...LEAVES.flatMap((l) => [l.d, l.rib]),
      'M46 110 C 66 107, 94 107, 114 110 L112 122 C 92 124, 68 124, 48 122 Z',
      'M51 122 L58 152 C 72 155, 88 155, 102 152 L109 122',
      'M62 130 L64 141',
      'M143 28 C 143 35, 137 40, 131 39 C 124 38, 120 33, 121 27 C 122 20, 127 17, 133 17 C 139 18, 143 22, 142.5 29',
      'M132 6 L132 11',
      'M149 12 L145.5 15.5',
      'M155 29 L150 29',
      'M149 45 L145.5 41.5',
      'M115 12 L118.5 15.5',
      'M24 156 C 56 154, 104 154, 138 156',
      'M33 156 L31 150 M37 156 L38 150',
      'M124 156 L123 151 M128 156 L130 150',
    ]),
    n('g', { class: 'sparkles' }, ink(['M30 40 L30 50 M25 45 L35 45', 'M130 70 L130 78 M126 74 L134 74', 'M26 96 L26 103 M22.5 99.5 L29.5 99.5', 'M140 100 L140 106 M137 103 L143 103'])),
  );
}

// The round tick button: a pencil circle that fills with colour, and a tick that draws itself.
export function checkArt() {
  return svg(
    '0 0 44 44',
    null,
    'art--check',
    wash('M22 7 C 31 6, 37 13, 37 22 C 37 31, 31 37, 22 37 C 13 37, 7 31, 7 22 C 7 14, 13 8, 22 7 Z', 'check-fill'),
    ink(['M23 5 C 33 5, 39 12, 39 22 C 39 32, 32 39, 22 39 C 12 39, 5 32, 5 22 C 5 13, 11 6, 20 5.5 C 22 5.3, 25 5.6, 27 6.4', { d: 'M13 23 L19.5 29.5 L32 14', cls: 'tick' }]),
  );
}

export function clockArt() {
  return svg(
    '0 0 40 40',
    null,
    'art--small',
    ink(['M20 9 C 27 9, 32 14, 32 21 C 32 28, 27 33, 20 33 C 13 33, 8 28, 8 21 C 8 14, 13 9, 21 9.5', 'M16 5 L24 5 M20 5 L20 9', 'M20 21 L20 14 M20 21 L25 24', 'M30 9 L32.5 11.5'], 'ink--current'),
  );
}

export function starArt() {
  return svg(
    '0 0 60 60',
    null,
    'art--star',
    wash('M30 7 L37.5 22 L54 24 L42 35.5 L45.5 52 L30 44 L14.5 52 L18 35.5 L6 24 L22.5 22 Z', 'wash--sun'),
    ink(['M30 12 L35.3 24.7 L49 25.8 L38.6 34.8 L41.8 48.2 L30 41 L18.2 48.2 L21.4 34.8 L11 25.8 L24.7 24.7 Z', 'M52 6 L48 11', 'M57 17 L51 18', 'M7 8 L11 13']),
  );
}

export function planeArt() {
  return svg(
    '0 0 90 56',
    null,
    'art--plane',
    wash('M4 25 L84 3 L58 50 L38 34 Z', 'wash--learn'),
    ink(['M6 24 L82 5 L56 46 L40 32 Z', 'M82 5 L40 32 L38 46 L47 37', { d: 'M3 47 C 11 53, 22 51, 30 43', cls: 'dash' }]),
  );
}

export function heartArt() {
  return svg(
    '0 0 24 22',
    null,
    'art--heart',
    wash('M12 5 C 12 -1, 23 -1, 22 7 C 21 13, 14 16, 12 20 C 10 16, 3 13, 2 7 C 1 -1, 12 -1, 12 5 Z', 'wash--family'),
    ink(['M12 6 C 12 2, 20 1.5, 20 7 C 20 12, 13.5 15, 12 18.5 C 10.5 15, 4 12, 4 7 C 4 1.5, 12 2, 12 6 Z']),
  );
}

export function squiggleArt() {
  return svg('0 0 220 14', null, 'art--squiggle', ink(['M3 9 C 30 3, 52 12, 80 7 C 108 2, 130 12, 160 7 C 180 4, 198 6, 217 8']));
}

// A spiral-bound calendar page with a heart, a tick and a circled day.
export function calendarArt() {
  return svg(
    '0 0 120 100',
    null,
    'art--calendar',
    wash('M8 22 C 40 13, 82 13, 113 19 C 115 46, 114 72, 111 99 C 78 102, 42 101, 7 99 C 4 72, 5 46, 8 22 Z', 'wash--learn'),
    paper('M14 18 L105 16 L107 93 L12 95 Z'),
    wash('M12 16 C 44 12, 80 12, 108 15 L108 36 C 78 34, 44 34, 12 37 Z', 'wash--family'),
    wash('M86 75 C 92 71, 101 74, 102 82 C 102 89, 95 92, 89 90 C 84 88, 83 79, 86 75 Z', 'wash--sun'),
    wash('M71.5 42 C 71.5 38, 78 37.5, 77.5 43 C 77 47, 72.5 49.5, 71.5 52 C 70.5 49.5, 66 47, 65.5 43 C 65 37.5, 71.5 38, 71.5 42 Z', 'wash--family-deep'),
    ink([
      'M14 18 L105 16 L107 93 L12 95 Z',
      'M13.5 35 C 44 33.5, 78 33.5, 105.8 33',
      'M30 24 L30 11 C 30 6, 36 6, 36 11 L36 16',
      'M50 23.5 L50 10.5 C 50 5.5, 56 5.5, 56 10.5 L56 15.5',
      'M70 23 L70 10 C 70 5, 76 5, 76 10 L76 15',
      'M90 22.5 L90 9.5 C 90 4.5, 96 4.5, 96 9.5 L96 14.5',
      'M15 54 C 45 53, 78 53, 106 52.5',
      'M15 74 C 45 73, 78 73, 106.5 72.5',
      'M37 35 L36.5 94',
      'M60 34 L60 94',
      'M83 34 L84 93',
      'M20 86 L24 90 L31 80',
      'M71.5 43 C 71.5 40, 76 39.5, 76 43 C 76 46, 71.5 48, 71.5 50 C 71.5 48, 67 46, 67 43 C 67 39.5, 71.5 40, 71.5 43 Z',
      'M94 77 C 99 77, 101 81, 100 84 C 99 88, 95 89, 92 88 C 88 87, 87 83, 88 80 C 89 77, 92 76, 96 77',
      'M43 45 L53 45 M43 49 L50 49',
    ]),
  );
}

export function arrowArt(direction) {
  return svg('0 0 24 24', null, 'art--arrow', ink([direction === 'left' ? 'M15 5 C 12 8, 10 10, 8 12 C 10 14, 12 16, 15 19' : 'M9 5 C 12 8, 14 10, 16 12 C 14 14, 12 16, 9 19']));
}

// A loose pencil ring for circling today on the month.
export function ringArt() {
  return svg('0 0 40 40', null, 'art--ring', ink(['M21 4 C 30 4.5, 36 11, 36 20 C 36 29.5, 29 36, 20 36 C 10.5 36, 4 29, 4.5 19.5 C 5 11, 11 4.5, 19 4.2 C 21.5 4, 24 4.6, 26 5.6']));
}

export function sproutArt() {
  return svg('0 0 24 24', null, 'art--tab', ink(['M12 21 L12 12', 'M12 14.5 C 8.5 14.5, 5.5 12, 5 7.5 C 9 7.5, 12 10, 12 14.5', 'M12 12 C 12 8, 14.5 5, 19 4.5 C 19 9, 16 12, 12 12'], 'ink--current'));
}

export function calendarMiniArt() {
  return svg('0 0 24 24', null, 'art--tab', ink(['M4 7 L20 6.5 L20.5 20 L4 20.5 Z', 'M4 11 L20.2 10.6', 'M8.5 4 L8.5 8.5', 'M15.5 3.8 L15.5 8.3', 'M8 15 L10 15 M14 15 L16 15'], 'ink--current'));
}

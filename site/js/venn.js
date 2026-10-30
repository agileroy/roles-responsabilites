// Diagramme de Venn en SVG : trois cercles (Product Owner, Scrum Master, Developers), leurs intersections,
// le centre « Scrum Team », et une zone « Piège » à part. Une région se choisit au toucher, au clic ou au clavier.

import { REGIONS, REGION_LABELS } from './game-core.js?v=__VERSION__';

const NS = 'http://www.w3.org/2000/svg';
const R = 170;
const CIRCLES = { po: [225, 235], sm: [415, 235], dev: [320, 395] };
const TRAP = { x: 20, y: 596, width: 600, height: 104 };

/** Cercles qui composent chaque région, et ceux qu'elle exclut. */
const REGION_SHAPES = {
  po: { in: ['po'], out: ['sm', 'dev'] },
  sm: { in: ['sm'], out: ['po', 'dev'] },
  dev: { in: ['dev'], out: ['po', 'sm'] },
  'po-sm': { in: ['po', 'sm'], out: ['dev'] },
  'po-dev': { in: ['po', 'dev'], out: ['sm'] },
  'sm-dev': { in: ['sm', 'dev'], out: ['po'] },
  team: { in: ['po', 'sm', 'dev'], out: [] },
};

/** Point d'ancrage des libellés (point le plus éloigné des bords de chaque région). */
const LABELS = {
  po: { x: 159, y: 190, lines: ['Product', 'Owner'], size: 29 },
  sm: { x: 481, y: 190, lines: ['Scrum', 'Master'], size: 29 },
  dev: { x: 320, y: 482, lines: ['Developers'], size: 29 },
  'po-sm': { x: 320, y: 168, lines: ['PO + SM'], size: 21 },
  'po-dev': { x: 218, y: 350, lines: ['PO + Dev'], size: 21 },
  'sm-dev': { x: 422, y: 350, lines: ['SM + Dev'], size: 21 },
  team: { x: 320, y: 289, lines: ['Scrum', 'Team'], size: 22 },
  trap: { x: 320, y: 646, lines: ['Piège', 'n\'existe pas dans Scrum'], size: 28 },
};

function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.appendChild(node);
  return node;
}

/** Région sous un point du repère SVG, ou null. */
export function regionAt(x, y) {
  if (x >= TRAP.x && x <= TRAP.x + TRAP.width && y >= TRAP.y && y <= TRAP.y + TRAP.height) return 'trap';
  const inside = Object.entries(CIRCLES).filter(([, [cx, cy]]) => Math.hypot(x - cx, y - cy) <= R).map(([id]) => id);
  if (!inside.length) return null;
  if (inside.length === 3) return 'team';
  return REGIONS.find((region) => {
    const shape = REGION_SHAPES[region];
    return shape && shape.in.length === inside.length && shape.in.every((id) => inside.includes(id));
  }) ?? null;
}

let instance = 0;

/**
 * Crée le diagramme dans `container`. `onSelect(region)` est appelé quand l'utilisateur choisit une région
 * (seulement si `setInteractive(true)`). `update(state)` met en évidence : selection, chosen, correct, verdict.
 */
export function createVenn(container, { onSelect = () => {} } = {}) {
  instance += 1;
  const id = (name) => `venn${instance}-${name}`;
  const svg = el('svg', {
    viewBox: '0 52 640 660', class: 'venn', role: 'group', 'aria-label': 'Diagramme des responsabilités',
  });
  const defs = el('defs', {}, svg);
  for (const [name, [cx, cy]] of Object.entries(CIRCLES)) {
    el('circle', { cx, cy, r: R }, el('clipPath', { id: id(`clip-${name}`) }, defs));
  }
  for (const [region, shape] of Object.entries(REGION_SHAPES)) {
    if (!shape.out.length) continue;
    const mask = el('mask', { id: id(`mask-${region}`), maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 640, height: 712 }, defs);
    el('rect', { x: 0, y: 0, width: 640, height: 712, fill: 'white' }, mask);
    for (const out of shape.out) {
      const [cx, cy] = CIRCLES[out];
      el('circle', { cx, cy, r: R, fill: 'black' }, mask);
    }
  }

  const nodes = {};
  const regionsLayer = el('g', { class: 'venn-regions' }, svg);
  for (const [region, shape] of Object.entries(REGION_SHAPES)) {
    const group = el('g', {
      class: `venn-region region-${region}`, 'data-region': region, tabindex: '-1', role: 'button',
      'aria-label': REGION_LABELS[region],
    }, regionsLayer);
    let target = group;
    for (const name of shape.in) target = el('g', { 'clip-path': `url(#${id(`clip-${name}`)})` }, target);
    const attrs = { x: 0, y: 0, width: 640, height: 596, class: 'venn-fill' };
    if (shape.out.length) attrs.mask = `url(#${id(`mask-${region}`)})`;
    el('rect', attrs, target);
    nodes[region] = group;
  }
  const trap = el('g', {
    class: 'venn-region region-trap', 'data-region': 'trap', tabindex: '-1', role: 'button', 'aria-label': REGION_LABELS.trap,
  }, regionsLayer);
  el('rect', { ...TRAP, rx: 22, class: 'venn-fill venn-trap' }, trap);
  nodes.trap = trap;

  const outlines = el('g', { class: 'venn-outlines', 'aria-hidden': 'true' }, svg);
  for (const [name, [cx, cy]] of Object.entries(CIRCLES)) el('circle', { cx, cy, r: R, class: `venn-circle circle-${name}` }, outlines);

  const labels = el('g', { class: 'venn-labels', 'aria-hidden': 'true' }, svg);
  for (const [region, label] of Object.entries(LABELS)) {
    const text = el('text', {
      x: label.x, y: label.y - ((label.lines.length - 1) * label.size * 0.55), 'font-size': label.size,
      class: `venn-label label-${region}`, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
    }, labels);
    label.lines.forEach((line, index) => {
      const span = el('tspan', { x: label.x, dy: index ? label.size * 1.1 : 0 }, text);
      span.textContent = line;
      if (region === 'trap' && index === 1) span.setAttribute('class', 'venn-sublabel');
    });
  }
  container.replaceChildren(svg);

  let interactive = false;

  function pointToRegion(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return regionAt(point.x, point.y);
  }

  svg.addEventListener('click', (event) => {
    if (!interactive) return;
    const region = pointToRegion(event);
    if (region) onSelect(region);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!interactive || event.pointerType !== 'mouse') return;
    const region = pointToRegion(event);
    for (const [name, node] of Object.entries(nodes)) node.classList.toggle('is-hover', name === region);
  });
  svg.addEventListener('pointerleave', () => {
    for (const node of Object.values(nodes)) node.classList.remove('is-hover');
  });
  svg.addEventListener('keydown', (event) => {
    const region = event.target?.dataset?.region;
    if (!interactive || !region || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onSelect(region);
  });

  return {
    element: svg,
    setInteractive(value) {
      interactive = value;
      svg.classList.toggle('is-interactive', value);
      for (const node of Object.values(nodes)) {
        node.setAttribute('tabindex', value ? '0' : '-1');
        if (!value) node.classList.remove('is-hover');
      }
    },
    /** state : { selection, chosen, correct, verdict } (régions ou null). */
    update({ selection = null, chosen = null, correct = null, verdict = null } = {}) {
      for (const [region, node] of Object.entries(nodes)) {
        node.classList.toggle('is-selected', region === selection && !correct);
        node.classList.toggle('is-correct', region === correct);
        node.classList.toggle('is-chosen', region === chosen && region !== correct);
        node.classList.toggle('is-partial', region === chosen && region !== correct && verdict === 'partial');
        node.setAttribute('aria-pressed', String(region === selection));
      }
    },
  };
}

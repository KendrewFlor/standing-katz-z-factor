// ---- The Z gauge: an analog dial for the readout module ----
// Pure helpers (tested in tests/js/gauge.test.mjs) plus a small SVG renderer.
// The dial runs from Z = 0.2 (needle at -120 degrees) to Z = 1.2 (+120 degrees).
const Gauge = (() => {
  const ZMIN = 0.2, ZMAX = 1.2, SWEEP = 120;
  const valid = z => typeof z === 'number' && isFinite(z);

  function zToAngle(z) {
    const c = Math.min(ZMAX, Math.max(ZMIN, z));
    const deg = -SWEEP + 2 * SWEEP * (c - ZMIN) / (ZMAX - ZMIN);
    return Math.round(deg * 1e6) / 1e6 + 0;   // drop float noise and -0 (0.7 must read exactly 0 degrees)
  }

  function gaugeState(z) {
    if (!valid(z)) return { angle: -SWEEP, offScale: null, valid: false, text: '—' };
    return {
      angle: zToAngle(z),
      offScale: z > ZMAX ? 'high' : z < ZMIN ? 'low' : null,
      valid: true,
      text: z.toFixed(4),
    };
  }

  function summary({ ppr, tpr, z, method, label = 'Operating point' }) {
    const zText = valid(z) ? 'Z ' + z.toFixed(3) : 'Z not available';
    return `${label}: Ppr ${ppr.toFixed(2)}, Tpr ${tpr.toFixed(2)}, ${zText} (${method}).`;
  }

  // Live-region writer: the first call writes at once, then at most one write
  // per waitMs; a trailing write always delivers the latest text.
  function makeAnnouncer(el, waitMs = 1000, now = () => Date.now(), schedule = setTimeout) {
    let last = -Infinity, pending = null, timer = false;
    const flush = () => { timer = false; if (pending !== null) { el.textContent = pending; pending = null; last = now(); } };
    return text => {
      const t = now();
      if (!timer && t - last >= waitMs) { el.textContent = text; last = t; return; }
      pending = text;
      if (!timer) { timer = true; schedule(flush, Math.max(0, last + waitMs - t)); }
    };
  }

  // ---- SVG renderer ----
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 100, CY = 104, R = 82;
  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const polar = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };

  function mount(container) {
    container.setAttribute('role', 'meter');
    container.setAttribute('aria-label', 'Z-factor gauge');
    container.setAttribute('aria-valuemin', String(ZMIN));
    container.setAttribute('aria-valuemax', String(ZMAX));
    const svg = el('svg', { viewBox: '0 0 200 150', class: 'gauge-svg', 'aria-hidden': 'true', focusable: 'false' }, container);
    const [x0, y0] = polar(-SWEEP, R), [x1, y1] = polar(SWEEP, R);
    el('path', { d: `M${x0} ${y0} A${R} ${R} 0 1 1 ${x1} ${y1}`, class: 'g-arc' }, svg);
    // ideal-gas band at Z = 1
    const [i0x, i0y] = polar(zToAngle(0.99), R), [i1x, i1y] = polar(zToAngle(1.01), R);
    el('path', { d: `M${i0x} ${i0y} A${R} ${R} 0 0 1 ${i1x} ${i1y}`, class: 'g-ideal' }, svg);
    for (let i = 0; i <= 50; i++) {
      const z = ZMIN + i * 0.02, major = i % 5 === 0, a = zToAngle(z);
      const [ax, ay] = polar(a, R - 2), [bx, by] = polar(a, R - (major ? 13 : 7));
      el('line', { x1: ax, y1: ay, x2: bx, y2: by, class: major ? 'g-tick g-major' : 'g-tick' }, svg);
      if (major && i % 10 === 0) {
        const [tx, ty] = polar(a, R - 25);
        el('text', { x: tx, y: ty, class: 'g-num' }, svg).textContent = z.toFixed(1);
      }
    }
    el('text', { x: CX, y: CY + 30, class: 'g-unit' }, svg).textContent = 'Z';
    const off = el('text', { x: CX, y: CY + 44, class: 'g-off' }, svg);
    const needle = el('g', { class: 'g-needle' }, svg);
    el('path', { d: `M${CX - 3.5} ${CY} L${CX} ${CY - R + 10} L${CX + 3.5} ${CY} Z`, class: 'g-needle-body' }, needle);
    el('circle', { cx: CX, cy: CY, r: 7, class: 'g-hub' }, svg);

    function set(z, opts = {}) {
      const s = gaugeState(z);
      container.classList.toggle('g-animate', !!opts.animate);
      needle.style.transform = `rotate(${s.angle}deg)`;
      off.textContent = s.offScale === 'high' ? '▲ off scale' : s.offScale === 'low' ? '▼ off scale' : '';
      container.classList.toggle('g-invalid', !s.valid);
      if (s.valid) {
        container.setAttribute('aria-valuenow', String(Math.min(ZMAX, Math.max(ZMIN, z))));
        container.setAttribute('aria-valuetext', s.offScale ? `${s.text}, ${s.offScale === 'high' ? 'above' : 'below'} the dial` : s.text);
      } else {
        container.removeAttribute('aria-valuenow');
        container.setAttribute('aria-valuetext', 'not available');
      }
      return s;
    }
    function hide(hidden) {
      container.classList.toggle('hidden-reading', !!hidden);
      if (hidden) container.setAttribute('aria-valuetext', 'hidden during practice');
    }
    set(NaN);
    return { set, hide };
  }

  return { zToAngle, gaugeState, summary, makeAnnouncer, mount, ZMIN, ZMAX };
})();

if (typeof module !== 'undefined') module.exports = Gauge;

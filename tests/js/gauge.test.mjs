// The Z gauge's pure helpers (js/gauge.js): needle angle, off-scale handling,
// the screen-reader summary and the throttled live-region announcer.
//   node --test tests/js/gauge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const sandbox = { Math, Number, isFinite, Object, String };
vm.createContext(sandbox);
vm.runInContext(readFileSync(fileURLToPath(new URL('js/gauge.js', root)), 'utf8') + '\nthis.G = Gauge;', sandbox);
const G = sandbox.G;
const pick = s => ({ angle: s.angle, offScale: s.offScale, valid: s.valid, text: s.text });

test('needle angle: 0.2 → −120°, 1.2 → +120°, 0.7 → 0°', () => {
  assert.equal(G.zToAngle(0.2), -120);
  assert.equal(G.zToAngle(1.2), 120);
  assert.equal(G.zToAngle(0.7), 0);
  assert.ok(Math.abs(G.zToAngle(0.8887) - 45.288) < 1e-9);
});

test('values beyond the dial pin to the stop and are flagged, but keep their true reading', () => {
  assert.deepEqual(pick(G.gaugeState(1.87)), { angle: 120, offScale: 'high', valid: true, text: '1.8700' });
  assert.deepEqual(pick(G.gaugeState(0.15)), { angle: -120, offScale: 'low', valid: true, text: '0.1500' });
  assert.deepEqual(pick(G.gaugeState(0.88869)), { angle: G.zToAngle(0.88869), offScale: null, valid: true, text: '0.8887' });
});

test('an invalid Z parks the needle and shows a dash instead of throwing', () => {
  for (const z of [NaN, undefined, Infinity, -Infinity, null]) {
    assert.deepEqual(pick(G.gaugeState(z)), { angle: -120, offScale: null, valid: false, text: '—' });
  }
});

test('screen-reader summary of the operating point', () => {
  assert.equal(G.summary({ ppr: 4.4771, tpr: 1.752, z: 0.88869, method: 'DAK' }), 'Operating point: Ppr 4.48, Tpr 1.75, Z 0.889 (DAK).');
  assert.equal(G.summary({ ppr: 4.4771, tpr: 1.752, z: NaN, method: 'DAK' }), 'Operating point: Ppr 4.48, Tpr 1.75, Z not available (DAK).');
});

test('summary can name what is being read (practice answers are not the operating point)', () => {
  assert.equal(G.summary({ ppr: 20.9, tpr: 1.6, z: 1.84967, method: 'DAK', label: 'Practice answer' }), 'Practice answer: Ppr 20.90, Tpr 1.60, Z 1.850 (DAK).');
});

test('announcer writes at most once per second and always delivers the latest text', () => {
  let t = 0; const queue = []; const el = { textContent: '' }; const writes = [];
  const fakeEl = { set textContent(v) { writes.push([t, v]); el.textContent = v; }, get textContent() { return el.textContent; } };
  const announce = G.makeAnnouncer(fakeEl, 1000, () => t, (fn, ms) => queue.push([t + ms, fn]));
  const runUntil = until => { queue.sort((a, b) => a[0] - b[0]); while (queue.length && queue[0][0] <= until) { const [at, fn] = queue.shift(); t = at; fn(); } t = until; };
  announce('a');           // t=0: written at once
  runUntil(100); announce('b');
  runUntil(300); announce('c');
  runUntil(2500);
  assert.deepEqual(writes, [[0, 'a'], [1000, 'c']]);
  announce('d');           // more than a second since the last write: immediate again
  assert.deepEqual(writes.at(-1), [2500, 'd']);
});

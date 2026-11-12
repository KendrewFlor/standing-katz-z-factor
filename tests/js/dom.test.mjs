// The page markup must keep every element the scripts look up, plus the
// redesign's new hooks, and must stay compatible with the strict CSP.
//   node --test tests/js/dom.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const read = p => readFileSync(fileURLToPath(new URL(p, root)), 'utf8');
const html = read('index.html');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const REQUIRED_NEW_IDS = ['skipLink', 'gauge', 'zLive', 'srSummary'];

test('every element id the scripts use exists in index.html', () => {
  const used = new Set();
  for (const f of ['js/app.js', 'js/explorer.js', 'js/sound.js']) {
    const src = read(f);
    for (const m of src.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)) used.add(m[1]);
    for (const m of src.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)) used.add(m[1]);
  }
  assert.ok(used.size > 50, `expected to find the app's ids, found ${used.size}`);
  const missing = [...used].filter(id => !ids.has(id));
  assert.deepEqual(missing, []);
});

test('the redesign hooks are present', () => {
  assert.deepEqual(REQUIRED_NEW_IDS.filter(id => !ids.has(id)), []);
});

test('no inline styles or inline scripts (the CSP blocks them)', () => {
  assert.ok(!/\sstyle="/.test(html), 'inline style attribute found');
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) assert.match(m[1], /\ssrc="/, 'inline <script> found');
});

test('ids are unique', () => {
  const all = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(all.filter((x, i) => all.indexOf(x) !== i), []);
});

test('the model plate labels the fixed Tpr span as the chart isotherms, not a method range', () => {
  // Each method has its own valid range (shown in the method table); the plate's fixed
  // 1.05–3.0 is the span of the drawn isotherms, so it must not be labelled "Range".
  const plate = html.match(/<table class="modelplate"[\s\S]*?<\/table>/)[0];
  assert.doesNotMatch(plate, /<th>Range<\/th>/);
  assert.match(plate, /<th>Isotherms<\/th><td>T<sub>pr<\/sub> 1\.05–3\.0<\/td>/);
});

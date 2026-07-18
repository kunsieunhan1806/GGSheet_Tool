const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const js = fs.readFileSync(path.resolve(__dirname, '..', 'JavaScript.html'), 'utf8');

test('client exposes accessible panel switching and save busy state', () => {
  assert.match(js, /function switchPanel\(panelName\)/);
  assert.match(js, /setAttribute\('aria-current',\s*active\s*\?\s*'page'\s*:\s*'false'\)/);
  assert.match(js, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(js, /function setSaving\(isSaving\)/);
  assert.match(js, /saveButton\.disabled\s*=\s*isSaving/);
  assert.match(js, /setAttribute\('aria-busy'/);
  assert.match(js, /overlay\.setAttribute\('aria-hidden',\s*show\s*\?\s*'false'\s*:\s*'true'\)/);
});

test('client preserves server calls and avoids dynamic innerHTML assignment', () => {
  for (const call of ['getCycleData', 'addCycleEntry', 'deleteCycleEntry']) {
    assert.ok(js.includes(`.${call}(`), `${call} call is missing`);
  }
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
});

test('view mode persistence remains intact', () => {
  assert.match(js, /localStorage\.getItem\('cycleViewMode'\)/);
  assert.match(js, /localStorage\.setItem\('cycleViewMode',\s*mode\)/);
});

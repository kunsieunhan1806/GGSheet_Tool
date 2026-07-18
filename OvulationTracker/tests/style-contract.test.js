const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.resolve(__dirname, '..', 'Stylesheet.html'), 'utf8');

test('CSS defines the compact dashboard visual primitives', () => {
  for (const selector of ['.app-layout', '.today-card', '.milestone-grid', '.analysis-details', '.mobile-nav']) {
    assert.ok(css.includes(selector), `${selector} is missing`);
  }
  assert.match(css, /--surface:/);
  assert.match(css, /--text-primary:/);
  assert.match(css, /--shadow-card:/);
});

test('CSS supports desktop, dark mode, reduced motion, and keyboard focus', () => {
  assert.match(css, /@media\s*\(min-width:\s*768px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*2fr\)\s+minmax\(280px,\s*1fr\)/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

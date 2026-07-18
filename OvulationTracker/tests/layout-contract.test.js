const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'Index.html'), 'utf8');

test('dashboard exposes the approved content hierarchy', () => {
  assert.match(html, /id="today-card"/);
  assert.match(html, /id="key-milestones"/);
  assert.match(html, /id="mini-cal"/);
  assert.match(html, /<details[^>]+id="analysis-details"/);
  assert.match(html, /<summary>[^<]*Xem phân tích chi tiết[^<]*<\/summary>/);
  assert.match(html, /id="cycle-chart"/);
});

test('form and history remain separate accessible panels', () => {
  assert.match(html, /id="panel-form"[^>]+data-panel="form"/);
  assert.match(html, /id="panel-history"[^>]+data-panel="history"/);
  assert.match(html, /id="form-msg"[^>]+aria-live="polite"/);
  assert.match(html, /id="history-list"/);
});

test('mobile navigation has three labelled destinations', () => {
  assert.match(html, /class="mobile-nav"/);
  for (const panel of ['forecast', 'form', 'history']) {
    assert.match(html, new RegExp(`data-tab="${panel}"`));
  }
  assert.match(html, /aria-label="Điều hướng chính"/);
});

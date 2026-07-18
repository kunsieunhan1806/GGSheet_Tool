const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const builder = path.join(__dirname, 'build-preview.js');
const preview = path.join(os.tmpdir(), 'ovulation-dashboard-preview', 'index.html');

test('preview builder preserves dollar-sign selectors in client JavaScript', () => {
  execFileSync(process.execPath, [builder], { cwd: root });
  const html = fs.readFileSync(preview, 'utf8');
  assert.match(html, /const \$\$ = selector => document\.querySelectorAll\(selector\)/);
  assert.doesNotMatch(html, /const \$ = selector => document\.querySelector\(selector\);\s+const \$ =/);
});

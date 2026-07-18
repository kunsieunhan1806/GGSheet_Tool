const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sources = ['Index.html', 'Stylesheet.html', 'JavaScript.html', 'Code.gs'];
const mojibake = /(?:Ã.|Ä.|Æ.|â€|ðŸ|Â.|á»|áº)/u;

test('all source files contain clean UTF-8 text', () => {
  for (const file of sources) {
    assert.doesNotMatch(read(file), mojibake, `${file} still contains mojibake`);
  }
});

test('Apps Script template names match filenames exactly', () => {
  const index = read('Index.html');
  const code = read('Code.gs');
  assert.match(index, /include\('Stylesheet'\)/);
  assert.match(index, /include\('JavaScript'\)/);
  assert.match(code, /createTemplateFromFile\('Index'\)/);
  assert.doesNotMatch(code, /createTemplateFromFile\('index'\)/);
});

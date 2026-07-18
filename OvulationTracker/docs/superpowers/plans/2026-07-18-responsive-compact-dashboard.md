# Responsive Compact Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the OvulationTracker interface as the approved compact dashboard while preserving all forecast calculations and Google Sheets data behavior.

**Architecture:** Keep the existing four-file Google Apps Script structure. `Index.html` owns semantic structure, `Stylesheet.html` owns the responsive visual system, `JavaScript.html` owns client state and rendering, and `Code.gs` continues to own sheet access and forecasts. Add dependency-free Node contract tests around encoding, template names, DOM structure, CSS breakpoints, and client safety.

**Tech Stack:** Google Apps Script, HTML5, CSS3, vanilla JavaScript, Node.js 22 built-in `node:test`.

## Global Constraints

- Preserve the current forecast formulas, sheet schema, server function names, and `{ records, forecast }` response contract.
- Modify only `OvulationTracker/Index.html`, `OvulationTracker/Stylesheet.html`, `OvulationTracker/JavaScript.html`, and UI-related strings/template casing in `OvulationTracker/Code.gs`.
- Do not add third-party libraries, frameworks, APIs, or new medical features.
- Support mobile at approximately 390 px, the 900×700 Google Sheets dialog, and wider desktop browsers.
- Keep detailed forecast confidence, statistics, and chart available inside a native `<details>` element that is closed by default.
- Keep automatic dark mode and honor `prefers-reduced-motion`.
- All four source files must contain valid UTF-8 Vietnamese with no mojibake.
- Stage and commit only OvulationTracker files; preserve existing modifications in `Analyzer/Code.gs` and `Analyzer/JavaScript.html`.

---

## File Structure

- Create `OvulationTracker/tests/encoding-template.test.js`: validates UTF-8 source text and exact Google Apps Script template/include casing.
- Create `OvulationTracker/tests/layout-contract.test.js`: validates the approved semantic dashboard structure and mobile navigation.
- Create `OvulationTracker/tests/style-contract.test.js`: validates responsive, accessibility, dark-mode, and reduced-motion CSS contracts.
- Create `OvulationTracker/tests/client-contract.test.js`: validates navigation, busy state, safe dynamic rendering, and preserved Apps Script calls.
- Modify `OvulationTracker/Index.html`: semantic dashboard, compact cards, native details, form/history rail, and mobile navigation.
- Modify `OvulationTracker/Stylesheet.html`: design tokens, responsive grid, card hierarchy, mobile navigation, dark mode, focus, and motion handling.
- Modify `OvulationTracker/JavaScript.html`: selectors and renderers for the new markup, accessible navigation, disabled submit state, and DOM-safe dynamic content.
- Modify `OvulationTracker/Code.gs`: UTF-8 repair and exact template/include names only; calculations remain unchanged.

---

### Task 1: Protect UTF-8 and Template Loading

**Files:**
- Create: `OvulationTracker/tests/encoding-template.test.js`
- Modify: `OvulationTracker/Index.html`
- Modify: `OvulationTracker/Stylesheet.html`
- Modify: `OvulationTracker/JavaScript.html`
- Modify: `OvulationTracker/Code.gs`

**Interfaces:**
- Consumes: the four existing source files and their current filenames.
- Produces: valid UTF-8 text plus exact `Index`, `Stylesheet`, and `JavaScript` template references used by later tasks.

- [ ] **Step 1: Write the failing UTF-8 and template test**

Create `tests/encoding-template.test.js`:

```js
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
```

- [ ] **Step 2: Run the test and verify the current source fails**

Run: `node --test tests/encoding-template.test.js`

Expected: FAIL for mojibake and lowercase/mismatched template references.

- [ ] **Step 3: Repair the four files and template casing**

Perform a single Windows-1252-to-UTF-8 recovery pass on the four mojibake source files with PowerShell, writing UTF-8 without BOM:

```powershell
$cp1252 = [Text.Encoding]::GetEncoding(1252)
$utf8 = New-Object Text.UTF8Encoding($false)
'Index.html','Stylesheet.html','JavaScript.html','Code.gs' | ForEach-Object {
  $path = (Resolve-Path $_).Path
  $text = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  $fixed = [Text.Encoding]::UTF8.GetString($cp1252.GetBytes($text))
  [IO.File]::WriteAllText($path, $fixed, $utf8)
}
```

Then make these exact source edits:

```html
<?!= include('Stylesheet'); ?>
<?!= include('JavaScript'); ?>
```

```js
HtmlService.createTemplateFromFile('Index')
```

- [ ] **Step 4: Run the UTF-8 and template test**

Run: `node --test tests/encoding-template.test.js`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Commit the encoding safety net**

```powershell
git add -- tests/encoding-template.test.js Index.html Stylesheet.html JavaScript.html Code.gs
git commit -m "fix: restore ovulation tracker utf8 templates"
```

---

### Task 2: Build the Semantic Dashboard Structure

**Files:**
- Create: `OvulationTracker/tests/layout-contract.test.js`
- Modify: `OvulationTracker/Index.html`

**Interfaces:**
- Consumes: the existing forecast element IDs used by `JavaScript.html`.
- Produces: `#today-card`, `#key-milestones`, `#mini-cal`, `#analysis-details`, `#panel-form`, `#panel-history`, and `.mobile-nav` for client rendering and CSS.

- [ ] **Step 1: Write the failing layout contract**

Create `tests/layout-contract.test.js`:

```js
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
```

- [ ] **Step 2: Run the layout test and verify it fails**

Run: `node --test tests/layout-contract.test.js`

Expected: FAIL because the approved dashboard elements do not exist yet.

- [ ] **Step 3: Rebuild `Index.html` around the approved hierarchy**

Use this exact top-level structure while retaining every forecast/calendar/history ID consumed by the client:

```html
<div class="app-shell">
  <header class="app-header">
    <a class="brand" href="#panel-forecast" aria-label="Về trang dự báo">
      <span class="brand-mark" aria-hidden="true">✿</span>
      <span><strong>Chu kỳ của tôi</strong><small>Theo dõi nhẹ nhàng mỗi ngày</small></span>
    </a>
    <button class="icon-button" id="btn-refresh" type="button" aria-label="Làm mới dữ liệu" title="Làm mới dữ liệu">↻</button>
  </header>
  <main class="app-layout">
    <section class="dashboard panel" id="panel-forecast" data-panel="forecast">
      <div class="mode-switch" id="mode-switch" role="group" aria-label="Chế độ theo dõi">
        <button class="mode-btn active" type="button" data-mode="track">Theo dõi</button>
        <button class="mode-btn" type="button" data-mode="ttc">Thụ thai</button>
      </div>
      <div id="forecast-empty" class="empty-state hidden">
        <span class="empty-state-icon" aria-hidden="true">✦</span>
        <h2>Chưa có dữ liệu chu kỳ</h2>
        <p>Hãy thêm kỳ kinh đầu tiên để bắt đầu dự báo.</p>
        <button class="btn btn-primary" type="button" data-go-to="form">Thêm kỳ kinh</button>
      </div>
      <div id="forecast-body" class="dashboard-flow hidden">
        <article class="today-card" id="today-card">
          <div class="today-card-copy">
            <p class="eyebrow" id="mode-card-label">Trạng thái hôm nay</p>
            <h1 id="mode-main">—</h1>
            <p id="mode-support">—</p>
          </div>
          <div class="today-card-chips">
            <span id="mode-chip-a">—</span><span id="mode-chip-b">—</span>
          </div>
        </article>
        <div id="irregular-warning" class="warning-banner hidden" role="status">
          <span class="warning-icon" aria-hidden="true">!</span>
          <div><strong>Chu kỳ có dao động</strong><p>Chênh lệch giữa chu kỳ ngắn nhất và dài nhất là <b id="warn-spread">—</b> ngày.</p></div>
        </div>
        <section class="milestone-grid" id="key-milestones" aria-label="Các mốc dự báo quan trọng">
          <article class="milestone-card period-card">
            <p class="eyebrow">Kỳ kinh tiếp theo</p>
            <div class="date-range"><span><small>Sớm</small><b id="f-next-min">—</b></span><span class="likely"><small>Khả năng cao</small><b id="f-next-likely">—</b><em id="f-next-count"></em></span><span><small>Muộn</small><b id="f-next-max">—</b></span></div>
          </article>
          <article class="milestone-card ovulation-card">
            <p class="eyebrow">Rụng trứng</p>
            <div class="date-range"><span><small>Sớm</small><b id="f-ov-min">—</b></span><span class="likely"><small>Khả năng cao</small><b id="f-ov-likely">—</b><em id="f-ov-count"></em></span><span><small>Muộn</small><b id="f-ov-max">—</b></span></div>
          </article>
          <article class="milestone-card fertile-card">
            <p class="eyebrow">Cửa sổ thụ thai</p>
            <dl class="fertile-list"><div><dt>Khả năng cao</dt><dd id="f-fertile-likely">—</dd></div><div><dt>Cao điểm</dt><dd id="f-fertile-peak">—</dd></div><div><dt>Toàn dải</dt><dd id="f-fertile-full">—</dd></div></dl>
            <p class="fertile-status" id="f-fertile-count"></p>
          </article>
        </section>
        <section id="mini-cal" class="calendar-card hidden" aria-labelledby="cal-title">
          <div class="calendar-header"><button class="icon-button" id="cal-prev" type="button" aria-label="Tháng trước">‹</button><h2 id="cal-title">—</h2><button class="icon-button" id="cal-next" type="button" aria-label="Tháng sau">›</button></div>
          <div class="mini-cal-grid" id="cal-grid"></div>
          <div class="legend" aria-label="Chú thích lịch"><span><i class="dot dot-period"></i>Hành kinh</span><span><i class="dot dot-period-pred"></i>Dự đoán</span><span><i class="dot dot-ov"></i>Rụng trứng</span><span><i class="dot dot-fertile"></i>Thụ thai</span></div>
        </section>
        <details class="analysis-details" id="analysis-details">
          <summary>Xem phân tích chi tiết</summary>
          <div class="analysis-content">
            <div class="confidence-pill" id="f-confidence">Độ tin cậy: —</div>
            <div class="cycle-stats"><div class="stat"><span id="f-cycle-min">—</span><small>Ngắn nhất</small></div><div class="stat stat-highlight"><span id="f-cycle-median">—</span><small>Trung vị</small></div><div class="stat"><span id="f-cycle-max">—</span><small>Dài nhất</small></div></div>
            <p id="f-sample-note">Dựa trên <b id="f-samples">0</b> chu kỳ đã ghi nhận</p>
            <p class="smart-note hidden" id="smart-forecast-note"></p>
            <div class="cycle-chart" id="cycle-chart"></div>
            <p class="chart-empty hidden" id="cycle-chart-empty">Cần ít nhất hai kỳ kinh để hiển thị biểu đồ.</p>
          </div>
        </details>
      </div>
    </section>
    <aside class="side-rail">
      <section class="panel form-card" id="panel-form" data-panel="form">
        <div class="section-heading"><p class="eyebrow">Cập nhật dữ liệu</p><h2>Thêm kỳ kinh mới</h2></div>
        <form id="entry-form" autocomplete="off"><label class="field"><span>Ngày bắt đầu <em>*</em></span><input type="date" name="start" required></label><label class="field"><span>Ngày kết thúc</span><input type="date" name="end"></label><label class="field"><span>Ghi chú</span><textarea name="notes" rows="3" placeholder="Tâm trạng, triệu chứng…"></textarea></label><div class="actions"><button type="submit" class="btn btn-primary" id="btn-save">Lưu kỳ kinh</button><button type="reset" class="btn btn-secondary">Xóa form</button></div></form>
        <div id="form-msg" class="msg hidden" aria-live="polite"></div>
      </section>
      <section class="panel history-card" id="panel-history" data-panel="history">
        <div class="section-heading"><p class="eyebrow">Dữ liệu đã ghi</p><h2>Lịch sử chu kỳ</h2></div>
        <div id="history-empty" class="empty-state hidden"><p>Chưa có dữ liệu nào.</p></div>
        <div class="history-list" id="history-list"></div>
      </section>
    </aside>
  </main>
  <footer class="app-footer"><small>Dự báo chỉ mang tính tham khảo, không thay thế tư vấn y khoa.</small></footer>
  <nav class="mobile-nav" aria-label="Điều hướng chính"><button class="active" type="button" data-tab="forecast" aria-current="page"><span aria-hidden="true">⌂</span>Dự báo</button><button type="button" data-tab="form" aria-current="false"><span aria-hidden="true">＋</span>Nhập mới</button><button type="button" data-tab="history" aria-current="false"><span aria-hidden="true">◷</span>Lịch sử</button></nav>
  <div class="overlay hidden" id="overlay" aria-hidden="true"><div class="spinner" role="status" aria-label="Đang tải"></div></div>
</div>
```

Keep the three min/likely/max values inside the period and ovulation milestone cards. Move confidence, min/median/max, smart note, and cycle chart inside `#analysis-details`. Place the legend inside the calendar card. Add `aria-live="polite"` to `#form-msg`, `aria-label` to icon buttons, and descriptive text plus icons to mobile navigation buttons.

- [ ] **Step 4: Run the layout and encoding tests**

Run: `node --test tests/encoding-template.test.js tests/layout-contract.test.js`

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit the semantic layout**

```powershell
git add -- tests/layout-contract.test.js Index.html
git commit -m "feat: structure compact cycle dashboard"
```

---

### Task 3: Implement the Responsive Visual System

**Files:**
- Create: `OvulationTracker/tests/style-contract.test.js`
- Modify: `OvulationTracker/Stylesheet.html`

**Interfaces:**
- Consumes: the semantic classes and IDs produced by Task 2.
- Produces: desktop two-column layout, mobile panel navigation layout, compact card styling, dark mode, visible focus, and reduced motion.

- [ ] **Step 1: Write the failing CSS contract**

Create `tests/style-contract.test.js`:

```js
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
```

- [ ] **Step 2: Run the CSS test and verify it fails**

Run: `node --test tests/style-contract.test.js`

Expected: FAIL because the new dashboard selectors and motion contract are missing.

- [ ] **Step 3: Replace the visual system in `Stylesheet.html`**

Define the core tokens exactly once:

```css
:root {
  --brand-50: #fff7fa;
  --brand-100: #fde8f0;
  --brand-500: #d94d83;
  --brand-600: #b93d6e;
  --ovulation: #8b6dd4;
  --fertile: #39a99e;
  --warning: #d98b2b;
  --canvas: #f8f5f7;
  --surface: #ffffff;
  --surface-soft: #fcf8fa;
  --text-primary: #342d32;
  --text-secondary: #745f6a;
  --border: #eadfe4;
  --shadow-card: 0 12px 32px rgba(72, 43, 58, .08);
  --radius-lg: 20px;
  --radius-md: 14px;
}
```

Implement `.today-card` as the only strong brand-gradient surface. Style `.milestone-grid` with consistent cards and semantic accents. Style `.analysis-details > summary` as a 44 px control. On mobile, reserve bottom padding for `.mobile-nav`; on desktop use:

```css
@media (min-width: 768px) {
  .app-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    gap: 24px;
    align-items: start;
  }
  .mobile-nav { display: none; }
  .panel.hidden { display: block !important; }
}
```

Add compact rules below 480 px for the three-date range and history metadata. Add full dark-mode token overrides. Add `:focus-visible` outlines and remove transitions/animations inside `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Run all current contract tests**

Run: `node --test tests/encoding-template.test.js tests/layout-contract.test.js tests/style-contract.test.js`

Expected: 7 tests pass, 0 fail.

- [ ] **Step 5: Commit the responsive styling**

```powershell
git add -- tests/style-contract.test.js Stylesheet.html
git commit -m "feat: style responsive compact dashboard"
```

---

### Task 4: Update Client Rendering and Accessible Interaction

**Files:**
- Create: `OvulationTracker/tests/client-contract.test.js`
- Modify: `OvulationTracker/JavaScript.html`

**Interfaces:**
- Consumes: `.mobile-nav [data-tab]`, panels with `[data-panel]`, `#btn-save`, and all retained forecast IDs.
- Produces: `switchPanel(panelName)`, `setSaving(isSaving)`, DOM-safe forecast/history rendering, and unchanged `google.script.run` calls.

- [ ] **Step 1: Write the failing client behavior contract**

Create `tests/client-contract.test.js`:

```js
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
```

- [ ] **Step 2: Run the client test and verify it fails**

Run: `node --test tests/client-contract.test.js`

Expected: FAIL because panel switching, busy state, and safe rendering have not been updated.

- [ ] **Step 3: Implement panel switching and busy state**

Add these exact client helpers:

```js
function switchPanel(panelName) {
  $$('.mobile-nav [data-tab]').forEach(button => {
    const active = button.dataset.tab === panelName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  $$('.panel[data-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.panel !== panelName);
  });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

function setSaving(isSaving) {
  const saveButton = $('#btn-save');
  saveButton.disabled = isSaving;
  saveButton.setAttribute('aria-busy', isSaving ? 'true' : 'false');
  saveButton.textContent = isSaving ? 'Đang lưu…' : 'Lưu kỳ kinh';
}
```

Bind `.mobile-nav [data-tab]` to `switchPanel`. Call `setSaving(true)` immediately before `addCycleEntry`, and call `setSaving(false)` in both success and failure paths. Keep `applyData` responsible for closing the global overlay.

Update `showOverlay(show)` so the visible state is also exposed to assistive technology:

```js
function showOverlay(show) {
  const overlay = $('#overlay');
  overlay.classList.toggle('hidden', !show);
  overlay.setAttribute('aria-hidden', show ? 'false' : 'true');
}
```

- [ ] **Step 4: Replace all dynamic `innerHTML` writes with DOM APIs**

Use a helper for labelled history metadata:

```js
function appendMetaItem(container, label, value) {
  const item = document.createElement('span');
  const strong = document.createElement('strong');
  item.append(document.createTextNode(label + ' '));
  strong.textContent = value;
  item.appendChild(strong);
  container.appendChild(item);
}
```

Use `replaceChildren()` plus `createElement`, `createTextNode`, and `textContent` for the fertile status, sample note, chart reset, and history metadata. Retain all date calculation and forecast selection logic unchanged.

- [ ] **Step 5: Run every Node contract test**

Run: `node --test tests/*.test.js`

Expected: 10 tests pass, 0 fail.

- [ ] **Step 6: Commit the client behavior**

```powershell
git add -- tests/client-contract.test.js JavaScript.html
git commit -m "feat: update dashboard interactions"
```

---

### Task 5: Integration and Visual Verification

**Files:**
- Create: `OvulationTracker/tests/build-preview.js`
- Modify if verification finds a defect: `OvulationTracker/Index.html`
- Modify if verification finds a defect: `OvulationTracker/Stylesheet.html`
- Modify if verification finds a defect: `OvulationTracker/JavaScript.html`
- Modify if verification finds a defect: `OvulationTracker/Code.gs`

**Interfaces:**
- Consumes: all source and contract tests from Tasks 1–4.
- Produces: a verified responsive UI with no syntax, contract, encoding, accessibility, or overflow defects.

- [ ] **Step 1: Run the complete automated verification**

Run:

```powershell
node --test tests/*.test.js
git diff --check
rg -n "Ã.|Ä.|Æ.|â€|ðŸ|Â.|á»|áº" Index.html Stylesheet.html JavaScript.html Code.gs
```

Expected: all tests pass, `git diff --check` prints nothing, and `rg` returns no matches.

- [ ] **Step 2: Parse the client JavaScript and Apps Script as JavaScript**

Run:

```powershell
$client = (Get-Content -Raw JavaScript.html) -replace '^\s*<script>','' -replace '</script>\s*$',''
$client | node --check -
Get-Content -Raw Code.gs | node --check -
```

Expected: both commands exit 0 without syntax errors.

- [ ] **Step 3: Perform browser visual QA with a stubbed `google.script.run` response**

Create `tests/build-preview.js` so the real source files can be previewed without Apps Script:

```js
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, '.superpowers', 'preview');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const sampleData = {
  records: [
    { rowIndex: 4, start: '2026-06-30', end: '2026-07-04', periodDays: 5, cycleDays: 28, ovulation: '2026-07-14', notes: 'Năng lượng ổn định' },
    { rowIndex: 3, start: '2026-06-02', end: '2026-06-06', periodDays: 5, cycleDays: 28, ovulation: '2026-06-16', notes: '' },
    { rowIndex: 2, start: '2026-05-05', end: '2026-05-09', periodDays: 5, cycleDays: 28, ovulation: '2026-05-19', notes: '' }
  ],
  forecast: {
    cycleSamples: 5,
    rawCycleCount: 6,
    outlierCount: 1,
    isIrregular: false,
    minCycle: 27,
    likelyCycle: 28,
    maxCycle: 30,
    spread: 3,
    confidence: 'high',
    confidenceLabel: 'Ổn định',
    confidenceNote: 'Dữ liệu chu kỳ tương đối ổn định; dự báo vẫn chỉ là ước lượng.',
    lastStart: '2026-06-30',
    nextPeriodEarliest: '2026-07-27',
    nextPeriodLikely: '2026-07-28',
    nextPeriodLatest: '2026-07-30',
    ovulationEarliest: '2026-07-13',
    ovulationLikely: '2026-07-14',
    ovulationLatest: '2026-07-18',
    fertileStart: '2026-07-08',
    fertileEnd: '2026-07-19',
    fertileLikelyStart: '2026-07-09',
    fertileLikelyEnd: '2026-07-15',
    fertilePeakStart: '2026-07-13',
    fertilePeakEnd: '2026-07-14',
    cycleSeries: [
      { from: '2026-01-14', to: '2026-02-11', days: 28, isOutlier: false },
      { from: '2026-02-11', to: '2026-03-10', days: 27, isOutlier: false },
      { from: '2026-03-10', to: '2026-04-09', days: 30, isOutlier: false },
      { from: '2026-04-09', to: '2026-05-05', days: 26, isOutlier: true },
      { from: '2026-05-05', to: '2026-06-02', days: 28, isOutlier: false },
      { from: '2026-06-02', to: '2026-06-30', days: 28, isOutlier: false }
    ]
  }
};

const stub = `<script>
const previewData = ${JSON.stringify(sampleData)};
const runner = {
  success: null,
  failure: null,
  withSuccessHandler(handler) { this.success = handler; return this; },
  withFailureHandler(handler) { this.failure = handler; return this; },
  getCycleData() { queueMicrotask(() => this.success(previewData)); return this; },
  addCycleEntry() { queueMicrotask(() => this.success(previewData)); return this; },
  deleteCycleEntry() { queueMicrotask(() => this.success(previewData)); return this; }
};
window.google = { script: { run: runner } };
</script>`;

let html = read('Index.html');
html = html.replace("<?!= include('Stylesheet'); ?>", read('Stylesheet.html'));
html = html.replace("<?!= include('JavaScript'); ?>", stub + read('JavaScript.html'));
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
console.log(path.join(outputDir, 'index.html'));
```

Run `node tests/build-preview.js`, serve the project with a local HTTP server, open `.superpowers/preview/index.html` in the in-app browser, and inspect at:

- 390×844: bottom navigation visible, one panel at a time, no horizontal overflow.
- 900×700: two-column grid, Dashboard approximately two thirds wide, form/history rail visible.
- 1440×900: centered content, readable line lengths, no stretched cards.
- Dark color scheme: readable text, inputs, semantic colors, and focus rings.

Expected: the main status and next milestone appear above the fold; details are closed; all mobile tap targets are at least 44 px; calendar, date ranges, form, and history do not clip.

- [ ] **Step 4: Fix each observed defect with a focused regression assertion**

For any defect, first add a matching assertion to the most relevant contract test, run it to see FAIL, make the smallest source change, then rerun `node --test tests/*.test.js` to see PASS. Do not change forecast calculations.

- [ ] **Step 5: Run final verification and commit integration fixes**

Run:

```powershell
node --test tests/*.test.js
git diff --check
git status --short
```

Expected: 10 or more tests pass, whitespace check is clean, only intended OvulationTracker implementation/test files plus pre-existing Analyzer changes remain.

Commit only if Task 5 changed tracked implementation files:

```powershell
git add -- Index.html Stylesheet.html JavaScript.html Code.gs tests
git commit -m "fix: polish responsive dashboard integration"
```

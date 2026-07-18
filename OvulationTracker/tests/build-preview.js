const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(os.tmpdir(), 'ovulation-dashboard-preview');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const sampleData = {
  records: [
    { rowIndex: 8, start: '2026-06-30', end: '2026-07-04', periodDays: 5, cycleDays: 28, ovulation: '2026-07-14', notes: 'Năng lượng ổn định' },
    { rowIndex: 7, start: '2026-06-02', end: '2026-06-06', periodDays: 5, cycleDays: 28, ovulation: '2026-06-16', notes: '' },
    { rowIndex: 6, start: '2026-05-05', end: '2026-05-09', periodDays: 5, cycleDays: 28, ovulation: '2026-05-19', notes: 'Đau bụng nhẹ ngày đầu' },
    { rowIndex: 5, start: '2026-04-09', end: '2026-04-13', periodDays: 5, cycleDays: 26, ovulation: '2026-04-21', notes: '' },
    { rowIndex: 4, start: '2026-03-10', end: '2026-03-14', periodDays: 5, cycleDays: 30, ovulation: '2026-03-26', notes: '' },
    { rowIndex: 3, start: '2026-02-11', end: '2026-02-15', periodDays: 5, cycleDays: 27, ovulation: '2026-02-24', notes: '' },
    { rowIndex: 2, start: '2026-01-14', end: '2026-01-18', periodDays: 5, cycleDays: 28, ovulation: '2026-01-28', notes: '' }
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
html = html.replace("<?!= include('Stylesheet'); ?>", () => read('Stylesheet.html'));
html = html.replace("<?!= include('JavaScript'); ?>", () => stub + read('JavaScript.html'));
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
console.log(path.join(outputDir, 'index.html'));

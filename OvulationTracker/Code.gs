/**
 * THEO DÕI CHU KỲ KINH NGUYỆT - DỰ ĐOÁN RỤNG TRỨNG & THỤ THAI
 *
 * Cấu trúc bảng tính (Sheet "ChuKy"):
 *  A: Ngày bắt đầu hành kinh
 *  B: Ngày kết thúc hành kinh
 *  C: Số ngày hành kinh         (tự tính = B - A + 1)
 *  D: Chu kỳ (ngày)             (tự suy ra từ khoảng cách giữa các kỳ; có thể chỉnh tay từng dòng)
 *  E: Ngày dự đoán kinh tiếp theo
 *  F: Ngày rụng trứng dự đoán
 *  G: Cửa sổ thụ thai - bắt đầu
 *  H: Cửa sổ thụ thai - kết thúc
 *  I: Ghi chú
 */

const SHEET_NAME = 'ChuKy';
const HEADERS = [
  'Ngày bắt đầu hành kinh',
  'Ngày kết thúc hành kinh',
  'Số ngày hành kinh',
  'Chu kỳ (ngày)',
  'Ngày dự đoán kinh tiếp theo',
  'Ngày rụng trứng dự đoán',
  'Cửa sổ thụ thai - bắt đầu',
  'Cửa sổ thụ thai - kết thúc',
  'Ghi chú'
];
const DEFAULT_CYCLE = 28;
const LUTEAL_PHASE_LIKELY = 14; // mốc thường dùng: rụng trứng khoảng 14 ngày trước kỳ kinh kế tiếp
const LUTEAL_PHASE_MIN = 12;    // dùng cho dải dự đoán rộng hơn
const LUTEAL_PHASE_MAX = 14;
const FERTILE_BEFORE = 5; // 5 ngày trước rụng trứng
const FERTILE_AFTER = 1;  // 1 ngày sau rụng trứng

// Phạm vi chu kỳ hợp lệ - mở rộng để hỗ trợ chu kỳ không đều (oligomenorrhea).
// Chu kỳ thông thường 21-35 ngày; bệnh lý/không đều có thể tới 90+ ngày.
const CYCLE_MIN = 20;
const CYCLE_MAX = 120;

// Ngưỡng coi là "chu kỳ không đều": chênh lệch max - min > 14 ngày
const IRREGULAR_THRESHOLD = 14;

/* =========================================================================
 * WEB APP ENTRY POINT
 * ========================================================================= */

/**
 * Trả về trang HTML khi truy cập web app.
 * Triển khai: Apps Script editor → Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone (hoặc tùy)
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Theo dõi chu kỳ — Rụng trứng & Thụ thai')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Cho phép index.html include CSS/JS từ file HTML khác.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* =========================================================================
 * HÀM ĐƯỢC GỌI TỪ CLIENT (google.script.run)
 * ========================================================================= */

/**
 * Lấy toàn bộ lịch sử chu kỳ + dự báo tổng hợp.
 * Trả về object { records: [...], forecast: {...} }
 */
function getCycleData() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  const records = [];

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    values.forEach((row, idx) => {
      if (!(row[0] instanceof Date)) return;
      records.push({
        rowIndex: idx + 2,
        start: toIso(row[0]),
        end: row[1] instanceof Date ? toIso(row[1]) : '',
        periodDays: row[2] || '',
        cycleDays: row[3] || DEFAULT_CYCLE,
        nextPeriod: row[4] instanceof Date ? toIso(row[4]) : '',
        ovulation: row[5] instanceof Date ? toIso(row[5]) : '',
        fertileStart: row[6] instanceof Date ? toIso(row[6]) : '',
        fertileEnd: row[7] instanceof Date ? toIso(row[7]) : '',
        notes: row[8] || ''
      });
    });
  }

  const recordsAsc = records.slice().sort(function (a, b) {
    return parseIso(a.start) - parseIso(b.start);
  });

  return {
    records: recordsAsc.slice().reverse(), // mới nhất ở đầu
    forecast: buildForecast(recordsAsc)
  };
}

/**
 * Thêm một chu kỳ mới từ form web.
 * payload = { start, end, notes }
 *
 * KHÔNG nhận `cycle` từ client — chu kỳ được tự động suy ra:
 *   - Dòng MỚI (dòng cuối): cycle = median các cycle thực tế đã ghi → dùng làm dự đoán
 *   - Dòng TRƯỚC: cycle THỰC TẾ = (start_mới - start_trước) → ghi đè vào cột D
 */
function addCycleEntry(payload) {
  if (!payload || !payload.start) {
    throw new Error('Thiếu ngày bắt đầu hành kinh.');
  }
  const start = parseIso(payload.start);
  if (!start) throw new Error('Ngày bắt đầu không hợp lệ.');
  const end = payload.end ? parseIso(payload.end) : null;
  if (end && end < start) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');

  const sheet = getOrCreateSheet();

  // Kiểm tra trùng ngày bắt đầu
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const starts = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < starts.length; i++) {
      const d = starts[i][0];
      if (d instanceof Date && sameDate(d, start)) {
        throw new Error('Đã tồn tại bản ghi với ngày bắt đầu ' + toIso(start) + '.');
      }
    }
  }

  const newRow = sheet.getLastRow() + 1;

  sheet.getRange(newRow, 1).setValue(start);
  if (end) sheet.getRange(newRow, 2).setValue(end);
  if (payload.notes) sheet.getRange(newRow, 9).setValue(payload.notes);

  normalizeAndRecalculateSheet(sheet);

  return getCycleData();
}

/**
 * Tính median các cycle thực tế trong sheet (bỏ qua dòng `excludeRow` vì
 * cycle ở dòng đó là dự đoán, không phải thực tế).
 * Trả về DEFAULT_CYCLE nếu chưa có dữ liệu.
 */
function getHistoricalMedianCycle(sheet, excludeRow) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return DEFAULT_CYCLE;

  const starts = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(function (r, idx) { return { row: idx + 2, date: r[0] }; })
    .filter(function (x) { return x.date instanceof Date && x.row !== excludeRow; })
    .sort(function (a, b) { return a.date - b.date; });

  const cycles = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const d = diffDays(starts[i + 1].date, starts[i].date);
    if (d >= CYCLE_MIN && d <= CYCLE_MAX) cycles.push(d);
  }

  if (!cycles.length) return DEFAULT_CYCLE;
  return median(filterCycleOutliers(cycles));
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Xoá một dòng chu kỳ theo rowIndex (đã trả về từ getCycleData).
 */
function deleteCycleEntry(rowIndex) {
  const sheet = getOrCreateSheet();
  if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
    throw new Error('Dòng không hợp lệ.');
  }
  sheet.deleteRow(rowIndex);
  normalizeAndRecalculateSheet(sheet);
  return getCycleData();
}

/* =========================================================================
 * LOGIC TÍNH TOÁN DÙNG CHUNG
 * ========================================================================= */

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    initSheetFormat(sheet);
  } else if (sheet.getLastRow() === 0) {
    initSheetFormat(sheet);
  }
  return sheet;
}

function initSheetFormat(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#ffd1dc')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, HEADERS.length, 160);
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 2).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(2, 5, sheet.getMaxRows() - 1, 4).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(2, 3, sheet.getMaxRows() - 1, 2).setNumberFormat('0');
  sheet.getRange(2, 3, sheet.getMaxRows() - 1, 1).setBackground('#f3f3f3');
  sheet.getRange(2, 5, sheet.getMaxRows() - 1, 4).setBackground('#e8f0fe');
}

/**
 * Tính toán các giá trị cho một dòng cụ thể.
 */
function computeRow(sheet, row) {
  const start = sheet.getRange(row, 1).getValue();
  const end = sheet.getRange(row, 2).getValue();
  let cycle = sheet.getRange(row, 4).getValue();

  if (!(start instanceof Date)) {
    sheet.getRange(row, 3, 1, 6).clearContent();
    return;
  }

  if (end instanceof Date) {
    const days = diffDays(end, start) + 1;
    sheet.getRange(row, 3).setValue(days > 0 ? days : '');
  } else {
    sheet.getRange(row, 3).clearContent();
  }

  if (!cycle || cycle < CYCLE_MIN || cycle > CYCLE_MAX) {
    // Cycle trống/không hợp lệ → suy ra từ lịch sử (median các cycle thực tế)
    cycle = getHistoricalMedianCycle(sheet, row);
    sheet.getRange(row, 4).setValue(cycle);
  }

  const nextPeriod = addDays(start, cycle);
  const ovulation = addDays(nextPeriod, -LUTEAL_PHASE_LIKELY);
  const fertileStart = addDays(ovulation, -FERTILE_BEFORE);
  const fertileEnd = addDays(ovulation, FERTILE_AFTER);

  sheet.getRange(row, 5).setValue(nextPeriod);
  sheet.getRange(row, 6).setValue(ovulation);
  sheet.getRange(row, 7).setValue(fertileStart);
  sheet.getRange(row, 8).setValue(fertileEnd);
}

function normalizeAndRecalculateSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  sortDataRowsByStartDate(sheet);
  recalculateSheetRows(sheet);
}

function sortDataRowsByStartDate(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return;
  sheet.getRange(2, 1, lastRow - 1, HEADERS.length)
    .sort([{ column: 1, ascending: true }]);
}

function recalculateSheetRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const starts = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(function (r) { return r[0]; });

  for (let i = 0; i < starts.length; i++) {
    const row = i + 2;
    const start = starts[i];
    const nextStart = starts[i + 1];
    let cycle = null;

    if (start instanceof Date && nextStart instanceof Date) {
      const actual = diffDays(nextStart, start);
      if (actual >= CYCLE_MIN && actual <= CYCLE_MAX) cycle = actual;
    }

    if (!cycle) cycle = getHistoricalMedianCycle(sheet, row);
    sheet.getRange(row, 4).setValue(cycle);
    computeRow(sheet, row);
  }
}

/**
 * Tính dự báo tổng hợp dựa trên các record (đã sắp xếp tăng dần theo ngày).
 *
 * Trả về dự báo dạng KHOẢNG (range) — phù hợp cả chu kỳ đều và không đều:
 *   - earliest:  dùng cycle ngắn nhất từng ghi nhận
 *   - likely:    dùng MEDIAN (ít bị outlier kéo lệch hơn mean)
 *   - latest:    dùng cycle dài nhất từng ghi nhận
 *
 * Cho cửa sổ thụ thai:
 *   fertileStart = ovulationEarliest - 5
 *   fertileEnd   = ovulationLatest   + 1
 * (gộp toàn bộ khoảng có thể thụ thai khi rụng trứng dao động)
 */
function buildForecast(recordsAsc) {
  if (!recordsAsc.length) return null;

  // Thu thập toàn bộ cycle (khoảng cách giữa hai kỳ liên tiếp)
  const cycleEntries = [];
  for (let i = 0; i < recordsAsc.length - 1; i++) {
    const s1 = parseIso(recordsAsc[i].start);
    const s2 = parseIso(recordsAsc[i + 1].start);
    if (s1 && s2) {
      const d = diffDays(s2, s1);
      if (d >= CYCLE_MIN && d <= CYCLE_MAX) {
        cycleEntries.push({
          from: recordsAsc[i].start,
          to: recordsAsc[i + 1].start,
          days: d
        });
      }
    }
  }
  const cycleStats = analyzeCycleEntries(cycleEntries);
  const cycles = cycleStats.usableCycles;

  const last = recordsAsc[recordsAsc.length - 1];
  const lastStart = parseIso(last.start);
  if (!lastStart) return null;

  // Nếu chưa có cycle nào — dùng mặc định, không có range
  if (!cycles.length) {
    const fallback = last.cycleDays || DEFAULT_CYCLE;
    return forecastFromCycle(lastStart, fallback, fallback, fallback, 0, false, cycleStats);
  }

  const minCycle = Math.min.apply(null, cycles);
  const maxCycle = Math.max.apply(null, cycles);
  const medianCycle = median(cycles);

  // Cảnh báo chu kỳ không đều
  const isIrregular = (maxCycle - minCycle) > IRREGULAR_THRESHOLD;

  return forecastFromCycle(
    lastStart, minCycle, medianCycle, maxCycle, cycles.length, isIrregular, cycleStats
  );
}

/**
 * Tạo object forecast từ các giá trị cycle min/likely/max.
 */
function forecastFromCycle(lastStart, minC, likelyC, maxC, samples, isIrregular, cycleStats) {
  // Ngày kinh tiếp theo - 3 mốc
  const nextEarliest = addDays(lastStart, minC);
  const nextLikely = addDays(lastStart, likelyC);
  const nextLatest = addDays(lastStart, maxC);

  // Rụng trứng - tính ngược từ ngày kinh. Dải rộng dùng pha hoàng thể 12-14 ngày.
  const ovEarliest = addDays(nextEarliest, -LUTEAL_PHASE_MAX);
  const ovLikely = addDays(nextLikely, -LUTEAL_PHASE_LIKELY);
  const ovLatest = addDays(nextLatest, -LUTEAL_PHASE_MIN);

  // Cửa sổ thụ thai - gộp toàn bộ khoảng có thể
  const fertileStart = addDays(ovEarliest, -FERTILE_BEFORE);
  const fertileEnd = addDays(ovLatest, FERTILE_AFTER);

  // Cửa sổ thụ thai "khả năng cao nhất" - dựa trên median
  const fertileLikelyStart = addDays(ovLikely, -FERTILE_BEFORE);
  const fertileLikelyEnd = addDays(ovLikely, FERTILE_AFTER);
  const fertilePeakStart = addDays(ovLikely, -1);
  const fertilePeakEnd = ovLikely;
  const confidence = buildForecastConfidence(samples, isIrregular, cycleStats);

  const result = {
    cycleSamples: samples,
    isIrregular: isIrregular,
    minCycle: minC,
    likelyCycle: likelyC,
    maxCycle: maxC,
    spread: maxC - minC,
    confidence: confidence.level,
    confidenceLabel: confidence.label,
    confidenceNote: confidence.note,

    lastStart: toIso(lastStart),

    // Range cho kỳ kinh tiếp theo
    nextPeriodEarliest: toIso(nextEarliest),
    nextPeriodLikely: toIso(nextLikely),
    nextPeriodLatest: toIso(nextLatest),

    // Range cho rụng trứng
    ovulationEarliest: toIso(ovEarliest),
    ovulationLikely: toIso(ovLikely),
    ovulationLatest: toIso(ovLatest),

    // Cửa sổ thụ thai (toàn dải)
    fertileStart: toIso(fertileStart),
    fertileEnd: toIso(fertileEnd),

    // Cửa sổ thụ thai khả năng cao nhất (theo median)
    fertileLikelyStart: toIso(fertileLikelyStart),
    fertileLikelyEnd: toIso(fertileLikelyEnd),
    fertilePeakStart: toIso(fertilePeakStart),
    fertilePeakEnd: toIso(fertilePeakEnd),

    // Tương thích ngược với UI cũ
    avgCycle: likelyC,
    nextPeriod: toIso(nextLikely),
    ovulation: toIso(ovLikely)
  };

  if (cycleStats) {
    result.rawCycleCount = cycleStats.rawCycleCount;
    result.outlierCount = cycleStats.outlierCount;
    result.hasOutliers = cycleStats.outlierCount > 0;
    result.rawMinCycle = cycleStats.rawMinCycle;
    result.rawMaxCycle = cycleStats.rawMaxCycle;
    result.outlierLowerBound = cycleStats.lowerBound;
    result.outlierUpperBound = cycleStats.upperBound;
    result.cycleSeries = cycleStats.series;
  } else {
    result.rawCycleCount = samples;
    result.outlierCount = 0;
    result.hasOutliers = false;
    result.rawMinCycle = minC;
    result.rawMaxCycle = maxC;
    result.outlierLowerBound = null;
    result.outlierUpperBound = null;
    result.cycleSeries = [];
  }

  return result;
}

/**
 * Phân tích chu kỳ và đánh dấu outlier bằng IQR.
 * Khi có ít hơn 4 chu kỳ, giữ nguyên toàn bộ dữ liệu để tránh lọc quá tay.
 */
function analyzeCycleEntries(entries) {
  const cycles = entries.map(function (entry) { return entry.days; });
  const bounds = getCycleOutlierBounds(cycles);
  let usableEntries = entries;

  if (bounds) {
    usableEntries = entries.filter(function (entry) {
      return entry.days >= bounds.lower && entry.days <= bounds.upper;
    });

    if (!usableEntries.length) usableEntries = entries;
  }

  const usableSet = {};
  usableEntries.forEach(function (entry) {
    usableSet[entry.from + '|' + entry.to + '|' + entry.days] = true;
  });

  return {
    rawCycleCount: cycles.length,
    usableCycles: usableEntries.map(function (entry) { return entry.days; }),
    outlierCount: cycles.length - usableEntries.length,
    rawMinCycle: cycles.length ? Math.min.apply(null, cycles) : null,
    rawMaxCycle: cycles.length ? Math.max.apply(null, cycles) : null,
    lowerBound: bounds ? Math.round(bounds.lower) : null,
    upperBound: bounds ? Math.round(bounds.upper) : null,
    series: entries.map(function (entry) {
      const key = entry.from + '|' + entry.to + '|' + entry.days;
      return {
        from: entry.from,
        to: entry.to,
        days: entry.days,
        isOutlier: !usableSet[key]
      };
    })
  };
}

function buildForecastConfidence(samples, isIrregular, cycleStats) {
  const outliers = cycleStats ? cycleStats.outlierCount : 0;

  if (samples < 2) {
    return {
      level: 'low',
      label: 'Thấp',
      note: 'Dữ liệu còn ít, dự báo đang dựa nhiều vào chu kỳ mặc định hoặc rất ít chu kỳ thực tế.'
    };
  }

  if (isIrregular || outliers > 0 || samples < 4) {
    return {
      level: 'medium',
      label: 'Trung bình',
      note: 'Dự báo dùng được để tham khảo, nhưng nên kết hợp dấu hiệu cơ thể hoặc que LH nếu cần chính xác hơn.'
    };
  }

  return {
    level: 'high',
    label: 'Ổn định',
    note: 'Dữ liệu chu kỳ tương đối ổn định; dự báo lịch có độ tin cậy tốt hơn nhưng vẫn chỉ là ước lượng.'
  };
}

function filterCycleOutliers(cycles) {
  const bounds = getCycleOutlierBounds(cycles);
  if (!bounds) return cycles.slice();

  const filtered = cycles.filter(function (cycle) {
    return cycle >= bounds.lower && cycle <= bounds.upper;
  });

  return filtered.length ? filtered : cycles.slice();
}

function getCycleOutlierBounds(cycles) {
  if (!cycles || cycles.length < 4) return null;

  const sorted = cycles.slice().sort(function (a, b) { return a - b; });
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  return {
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr
  };
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next === undefined) return sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

/**
 * Median của một mảng số. Làm tròn xuống số nguyên.
 */
function median(arr) {
  const sorted = arr.slice().sort(function (a, b) { return a - b; });
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/* =========================================================================
 * MENU TRONG GOOGLE SHEET
 * ========================================================================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Theo dõi chu kỳ')
    .addItem('Khởi tạo bảng', 'setupSheet')
    .addItem('Tính lại toàn bộ', 'recalculateAll')
    .addItem('Dự báo chu kỳ kế tiếp', 'forecastNext')
    .addSeparator()
    .addItem('Mở giao diện web (dialog)', 'openWebDialog')
    .addItem('Hướng dẫn', 'showHelp')
    .addToUi();
}

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.clear();
  initSheetFormat(sheet);
  sheet.getRange('D2').setValue(DEFAULT_CYCLE);
  SpreadsheetApp.getUi().alert('Đã khởi tạo sheet "' + SHEET_NAME + '". Hãy nhập Ngày bắt đầu (cột A) và Ngày kết thúc (cột B).');
}

function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  const row = e.range.getRow();
  if (row < 2) return;
  const col = e.range.getColumn();
  if (col !== 1 && col !== 2 && col !== 4) return;
  if (col === 4) {
    computeRow(sheet, row);
    return;
  }
  normalizeAndRecalculateSheet(sheet);
}

function updateNextCycleStart(sheet, row) {
  const lastRow = sheet.getLastRow();
  if (row >= lastRow) return;
  const thisStart = sheet.getRange(row, 1).getValue();
  const nextStart = sheet.getRange(row + 1, 1).getValue();
  if (thisStart instanceof Date && nextStart instanceof Date) {
    const actualCycle = diffDays(nextStart, thisStart);
    if (actualCycle >= CYCLE_MIN && actualCycle <= CYCLE_MAX) {
      sheet.getRange(row, 4).setValue(actualCycle);
      computeRow(sheet, row);
    }
  }
}

function recalculateAll() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Chưa có sheet "' + SHEET_NAME + '". Hãy chạy "Khởi tạo bảng" trước.');
    return;
  }
  const lastRow = sheet.getLastRow();
  normalizeAndRecalculateSheet(sheet);
  SpreadsheetApp.getUi().alert('Đã tính lại ' + Math.max(0, lastRow - 1) + ' dòng.');
}

function forecastNext() {
  const data = getCycleData();
  if (!data.forecast) {
    SpreadsheetApp.getUi().alert('Chưa có dữ liệu hợp lệ để dự báo.');
    return;
  }
  const f = data.forecast;
  let msg =
    'Chu kỳ: min ' + f.minCycle + ' / median ' + f.likelyCycle + ' / max ' + f.maxCycle + ' ngày' +
    ' (' + f.cycleSamples + ' chu kỳ ghi nhận)\n\n' +
    'Độ tin cậy dự báo: ' + f.confidenceLabel + '\n' +
    f.confidenceNote + '\n\n' +
    'Kỳ kinh gần nhất: ' + formatDateVN(f.lastStart) + '\n\n' +
    '── KỲ KINH TIẾP THEO ──\n' +
    '  Sớm nhất:     ' + formatDateVN(f.nextPeriodEarliest) + '\n' +
    '  Khả năng cao: ' + formatDateVN(f.nextPeriodLikely) + '\n' +
    '  Muộn nhất:    ' + formatDateVN(f.nextPeriodLatest) + '\n\n' +
    '── RỤNG TRỨNG ──\n' +
    '  Sớm nhất:     ' + formatDateVN(f.ovulationEarliest) + '\n' +
    '  Khả năng cao: ' + formatDateVN(f.ovulationLikely) + '\n' +
    '  Muộn nhất:    ' + formatDateVN(f.ovulationLatest) + '\n\n' +
    '── CỬA SỔ THỤ THAI ──\n' +
    '  Toàn dải dự đoán: ' + formatDateVN(f.fertileStart) + ' → ' + formatDateVN(f.fertileEnd) + '\n' +
    '  Dải trung tâm:    ' + formatDateVN(f.fertileLikelyStart) + ' → ' + formatDateVN(f.fertileLikelyEnd) + '\n' +
    '  Cao điểm:         ' + formatDateVN(f.fertilePeakStart) + ' → ' + formatDateVN(f.fertilePeakEnd);

  if (f.outlierCount) {
    msg += '\n\nDự báo thông minh: đã bỏ qua ' + f.outlierCount +
      ' chu kỳ bất thường trên tổng ' + f.rawCycleCount + ' chu kỳ ghi nhận.';
  }

  if (f.isIrregular) {
    msg += '\n\n⚠ CHU KỲ KHÔNG ĐỀU (chênh ' + f.spread + ' ngày).\n' +
      'Dự đoán có sai số lớn. Khuyến nghị dùng que thử rụng trứng (LH)\n' +
      'và tham khảo bác sĩ sản phụ khoa.';
  }

  SpreadsheetApp.getUi().alert('Dự báo', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Mở giao diện web ngay trong Google Sheet như một dialog.
 */
function openWebDialog() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setWidth(900)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Theo dõi chu kỳ');
}

function showHelp() {
  const msg =
    'CÁCH SỬ DỤNG:\n\n' +
    '1. Menu "Theo dõi chu kỳ" → "Khởi tạo bảng" (chạy 1 lần đầu).\n' +
    '2. Nhập trực tiếp trong sheet HOẶC dùng giao diện web (Deploy → Web app).\n' +
    '3. Hệ thống tự tính:\n' +
    '   - Số ngày hành kinh\n' +
    '   - Ngày dự đoán kinh tiếp theo = ngày bắt đầu + chu kỳ\n' +
    '   - Ngày rụng trứng = ước lượng khoảng 12-14 ngày trước kỳ kinh tiếp theo\n' +
    '   - Cửa sổ thụ thai = 5 ngày trước → 1 ngày sau rụng trứng\n\n' +
    'LƯU Ý: Đây chỉ là dự đoán toán học, không thay thế tư vấn y khoa.';
  SpreadsheetApp.getUi().alert('Hướng dẫn', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* =========================================================================
 * HELPERS
 * ========================================================================= */

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(later, earlier) {
  return Math.round((dateOnly(later) - dateOnly(earlier)) / 86400000);
}

function dateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function toIso(date) {
  if (!(date instanceof Date)) return '';
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}

function parseIso(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateVN(iso) {
  const d = parseIso(iso);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + d.getFullYear();
}

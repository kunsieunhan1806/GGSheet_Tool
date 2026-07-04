/**
 * PHÂN TÍCH & GỢI Ý SỐ XỔ SỐ VIETLOTT
 *
 * Hỗ trợ 2 loại vé:
 *   - Mega 6/45  : kết quả gồm 6 số      (từ 01 đến 45)
 *   - Power 6/55 : kết quả gồm 7 số      (từ 01 đến 55)
 *                  = 6 số chính + 1 số đặc biệt
 *
 * Cấu trúc bảng tính (Sheet "KetQua"):
 *  A: Ngày quay
 *  B: Loại vé        ("6/45" hoặc "6/55")
 *  C–H: Số 1 … Số 6  (6 số chính)
 *  I: Số ĐB          (số đặc biệt — chỉ dùng cho Power 6/55)
 *  J: Ghi chú
 *
 * Cấu trúc bảng tính (Sheet "BoDaSoSanh"):
 *  A: Ngày tạo (timestamp)
 *  B: Loại vé
 *  C: Phương pháp (hot/cold/balanced/random)
 *  D: Bộ số (JSON array of arrays)
 *  E: Ngày kết quả so sánh (ISO, để trống nếu chưa có)
 *  F: Kết quả thực tế (JSON array, để trống nếu chưa có)
 *  G: Số trùng tốt nhất (số nguyên, để trống nếu chưa so sánh)
 *  H: Chi tiết trùng (JSON: [{set:[...], matched:[...], count:n}])
 *  I: Jackpot (JSON: {j1:amount, j2:amount} — nhập tay, chỉ khi trúng jackpot)
 *  J: Giải thưởng (JSON: [{setIdx, label, prize}] — tính tự động khi so sánh)
 *
 * ⚠ LƯU Ý QUAN TRỌNG:
 *  Kết quả xổ số là NGẪU NHIÊN và ĐỘC LẬP — mỗi lần quay không phụ thuộc
 *  vào các lần trước. Không thuật toán nào có thể dự đoán đúng số trúng.
 *  Công cụ này chỉ THỐNG KÊ tần suất và GỢI Ý bộ số mang tính giải trí.
 */

const SHEET_NAME     = 'KetQua';
const COMPARE_SHEET  = 'BoDaSoSanh';

const HEADERS = [
  'Ngày quay', 'Loại vé',
  'Số 1', 'Số 2', 'Số 3', 'Số 4', 'Số 5', 'Số 6',
  'Số ĐB', 'Ghi chú'
];

const COMPARE_HEADERS = [
  'Ngày tạo', 'Loại vé', 'Phương pháp', 'Bộ số (JSON)',
  'Ngày KQ so sánh', 'Kết quả thực (JSON)',
  'Số trùng tốt nhất', 'Chi tiết trùng (JSON)',
  'Jackpot (JSON)',      // I: { j1:amount, j2:amount } — nhập tay khi trúng
  'Giải thưởng (JSON)'  // J: [{prize, label, setIdx}] — tính tự động
];

// Giá vé và bảng giải thưởng
const TICKET_PRICE = 10300;   // đồng / bộ

// Bảng giải thưởng cố định (theo số chính trùng)
const PRIZE_TABLE = {
  '6/55': { 3: 50000, 4: 500000, 5: 40000000 },
  '6/45': { 3: 30000, 4: 300000, 5: 10000000 }
};

// Cấu hình từng loại vé
// pick = số người chơi chọn (gợi ý); main = số chính trong kết quả
const TYPES = {
  '6/45': { label: 'Mega 6/45',  max: 45, hasSpecial: false, main: 6, pick: 6 },
  '6/55': { label: 'Power 6/55', max: 55, hasSpecial: true,  main: 6, pick: 6 }
};
const DEFAULT_TYPE      = '6/45';
const MAIN              = 6;   // giữ cho backward compat, dùng cfg.main khi cần
const PICK              = 6;   // giữ cho backward compat
const SET_COUNT_DEFAULT = 4;
const SET_COUNT_MAX     = 50;

/* =========================================================================
 * WEB APP ENTRY POINT
 * ========================================================================= */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Phân tích số Vietlott — 6/45 · 6/55')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* =========================================================================
 * HÀM GỌI TỪ CLIENT (google.script.run)
 * ========================================================================= */

/**
 * Lấy toàn bộ kết quả + thống kê cho một loại vé.
 */
function getData(ticketType) {
  ticketType = normalizeType(ticketType);
  const cfg = TYPES[ticketType];
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  const all = [];

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    values.forEach(function (row, idx) {
      if (!(row[0] instanceof Date)) return;
      const type = normalizeType(row[1]);
      if (type !== ticketType) return;

      const mainCount = cfg.main || 6;
      const numbers = [];
      for (let c = 2; c <= 1 + mainCount; c++) {
        const v = parseInt(row[c], 10);
        if (!isNaN(v)) numbers.push(v);
      }
      const sp = parseInt(row[8], 10);   // cột I = số ĐB / số phụ
      all.push({
        rowIndex: idx + 2,
        date: toIso(row[0]),
        type: type,
        numbers: numbers,
        special: (cfg.hasSpecial && !isNaN(sp)) ? sp : null,
        session: row[9] || ''
      });
    });
  }

  const asc = all.slice().sort(function (a, b) {
    return parseIso(a.date) - parseIso(b.date);
  });

  const statsByWindow = buildStatsWindows(asc, cfg);

  return {
    ticketType : ticketType,
    label      : cfg.label,
    max        : cfg.max,
    hasSpecial : cfg.hasSpecial,
    main       : cfg.main || 6,
    pick       : cfg.pick || 6,
    results    : asc.slice().reverse(),
    stats      : statsByWindow.all,
    statsByWindow: statsByWindow
  };
}

/**
 * Thêm một kỳ quay mới. Sau khi lưu, tự động so sánh với các bộ số đã tạo
 * cùng ngày + cùng loại vé còn chưa được so sánh.
 */
function addResult(payload) {
  if (!payload) throw new Error('Không có dữ liệu.');
  const type = normalizeType(payload.type);
  const cfg  = TYPES[type];
  const mainCount = cfg.main || 6;

  const date = parseIso(payload.date);
  if (!date) throw new Error('Ngày quay không hợp lệ.');

  const nums = sanitizeNumbers(payload.numbers, cfg.max, mainCount);
  let special = null;
  if (cfg.hasSpecial) {
    const spMax = cfg.max;
    special = sanitizeSpecial(payload.special, spMax, nums);
  }

  const notes = String(payload.notes || '');

  const sheet   = getOrCreateSheet();
  const lastRow = sheet.getLastRow();

  // Chống trùng: cùng ngày + cùng loại vé
  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (!(rows[i][0] instanceof Date)) continue;
      if (!sameDate(rows[i][0], date)) continue;
      if (normalizeType(rows[i][1]) !== type) continue;
      throw new Error('Đã có kết quả ' + cfg.label + ' cho ngày ' + toVN(date) + '.');
    }
  }

  // Pad nums lên 6 phần tử cho đúng cột C–H
  const numsPadded = nums.slice();
  while (numsPadded.length < 6) numsPadded.push('');

  const newRow = sheet.getLastRow() + 1;
  const rowData = [date, type]
    .concat(numsPadded)
    .concat([special === null ? '' : special])
    .concat([notes]);
  sheet.getRange(newRow, 1, 1, HEADERS.length).setValues([rowData]);

  // Auto-match: cập nhật so sánh cho các bộ gợi ý cùng ngày
  autoMatchForDate(date, type, nums, special);

  return getData(type);
}

/**
 * Xoá một kỳ quay theo rowIndex.
 */
function deleteResult(rowIndex, ticketType) {
  const sheet = getOrCreateSheet();
  if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
    throw new Error('Dòng không hợp lệ.');
  }
  sheet.deleteRow(rowIndex);
  return getData(ticketType);
}

/**
 * Tạo bộ số gợi ý.
 *
 * Lưu ý: thuật toán chỉ tối ưu cách chọn để bộ số cân bằng và đa dạng hơn.
 * Nó không dự đoán được kết quả quay thưởng.
 */
function generateNumbers(ticketType, method, count) {
  ticketType = normalizeType(ticketType);
  method = normalizeMethod(method);
  const cfg = TYPES[ticketType];
  const setCount = clampInt(count, 1, SET_COUNT_MAX, SET_COUNT_DEFAULT);
  const draws = getHistoricalResults(ticketType);
  const stats = computeStats(draws, cfg.max, cfg.main || 6);
  const model = buildNumberModel(stats);
  const historicalKeys = buildHistoricalSetLookup(draws);
  const sets = buildOptimizedPortfolio(model, cfg, method, setCount, historicalKeys);

  return {
    ticketType: ticketType,
    label: cfg.label,
    method: method,
    max: cfg.max,
    pick: cfg.pick || 6,
    totalDraws: stats.totalDraws,
    sets: sets,
    specials: []
  };
}

/**
 * Lưu các bộ số đã copy để sau này so sánh với kết quả thực tế.
 */
function saveGeneratedSets(payload) {
  if (!payload) throw new Error('Không có dữ liệu bộ số.');
  const type = normalizeType(payload.ticketType || payload.type);
  const cfg = TYPES[type];
  const method = normalizeMethod(payload.method);
  const drawDate = parseIso(payload.drawDate);
  if (!drawDate) throw new Error('Ngày quay dự kiến không hợp lệ.');

  const rawSets = Array.isArray(payload.sets) ? payload.sets : [];
  if (!rawSets.length) throw new Error('Chưa có bộ số để lưu.');
  const sets = rawSets.map(function (set) {
    return sanitizeNumbers(set, cfg.max, cfg.pick || 6);
  });

  const sheet = getOrCreateCompareSheet();
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, COMPARE_HEADERS.length).setValues([[
    new Date(),
    type,
    method,
    JSON.stringify(sets),
    toIso(drawDate),
    '',
    '',
    '',
    '',
    ''
  ]]);

  const actual = findActualResult(drawDate, type);
  if (actual) {
    writeComparisonResult(sheet, row, type, actual.numbers, actual.special);
  }

  return getComparisonData(type);
}

/**
 * Lấy dữ liệu so sánh cho tab thống kê.
 */
function getComparisonData(ticketType) {
  ticketType = normalizeType(ticketType);
  const rows = readCompareRows(ticketType);
  return {
    rows: rows,
    methodStats: computeMethodStats(rows)
  };
}

/**
 * Lấy dữ liệu tài chính tổng hợp từ các lần chơi đã lưu.
 */
function getFinanceData() {
  const rows = readCompareRows(null);
  const emptyBreakdown = function () {
    return { cost: 0, prize: 0, net: 0, plays: 0 };
  };
  const byType = { '6/45': emptyBreakdown(), '6/55': emptyBreakdown() };
  const byMethod = {
    hot: emptyBreakdown(),
    cold: emptyBreakdown(),
    balanced: emptyBreakdown(),
    random: emptyBreakdown()
  };

  let totalCost = 0;
  let totalPrize = 0;
  let pendingCost = 0;
  const sessions = [];
  const pending = [];

  rows.forEach(function (row) {
    const numSets = row.sets.length;
    const cost = numSets * TICKET_PRICE;
    const prize = sumPrizes(row.prizes, row.jackpot);
    const hasResult = row.bestMatch !== null && !!row.actual;
    const session = {
      rowIndex: row.rowIndex,
      type: row.type,
      method: row.method,
      drawDate: row.drawDate || row.createdAt,
      numSets: numSets,
      totalCost: cost,
      totalPrize: hasResult ? prize : 0,
      net: hasResult ? prize - cost : -cost,
      hasResult: hasResult,
      prizes: row.prizes || [],
      jackpot: row.jackpot || {}
    };

    totalCost += cost;
    if (hasResult) {
      totalPrize += prize;
      sessions.push(session);
    } else {
      pendingCost += cost;
      pending.push(session);
    }

    if (!byType[row.type]) byType[row.type] = emptyBreakdown();
    byType[row.type].cost += cost;
    byType[row.type].prize += hasResult ? prize : 0;
    byType[row.type].net += hasResult ? prize - cost : -cost;
    byType[row.type].plays += 1;

    if (!byMethod[row.method]) byMethod[row.method] = emptyBreakdown();
    byMethod[row.method].cost += cost;
    byMethod[row.method].prize += hasResult ? prize : 0;
    byMethod[row.method].net += hasResult ? prize - cost : -cost;
    byMethod[row.method].plays += 1;
  });

  sessions.sort(compareByDrawDateDesc);
  pending.sort(compareByDrawDateDesc);

  return {
    ticketPrice: TICKET_PRICE,
    totalCost: totalCost,
    totalPrize: totalPrize,
    pendingCost: pendingCost,
    net: totalPrize - totalCost,
    sessions: sessions,
    pending: pending,
    byType: byType,
    byMethod: byMethod
  };
}

/**
 * Lưu tiền jackpot nhập tay rồi tính lại tài chính.
 */
function saveJackpot(payload) {
  if (!payload) throw new Error('Không có dữ liệu jackpot.');
  const rowIndex = parseInt(payload.rowIndex, 10);
  const sheet = getOrCreateCompareSheet();
  if (isNaN(rowIndex) || rowIndex < 2 || rowIndex > sheet.getLastRow()) {
    throw new Error('Dòng jackpot không hợp lệ.');
  }

  const jackpot = {
    j1: moneyToNumber(payload.j1),
    j2: moneyToNumber(payload.j2)
  };
  sheet.getRange(rowIndex, 9).setValue(JSON.stringify(jackpot));

  const type = normalizeType(sheet.getRange(rowIndex, 2).getValue());
  const actual = parseJsonSafe(sheet.getRange(rowIndex, 6).getValue(), null);
  const actualSpecial = findActualSpecialByIso(sheet.getRange(rowIndex, 5).getValue(), type);
  if (Array.isArray(actual)) {
    writeComparisonResult(sheet, rowIndex, type, actual, actualSpecial, jackpot);
  }

  return getFinanceData();
}

/* =========================================================================
 * THUẬT TOÁN GỢI Ý SỐ
 * ========================================================================= */

function buildNumberModel(stats) {
  const numbers = stats.numbers || [];
  const maxFreq = numbers.reduce(function (m, it) { return Math.max(m, it.freq); }, 0) || 1;
  const maxGap = numbers.reduce(function (m, it) { return Math.max(m, it.gap); }, 0) || 1;
  const expectedFreq = stats.totalDraws ? (stats.totalDraws * stats.main / stats.max) : 0;

  return numbers.map(function (it) {
    const freqNorm = it.freq / maxFreq;
    const coldNorm = it.gap / maxGap;
    const underNorm = expectedFreq > 0 ? Math.max(0, expectedFreq - it.freq) / Math.max(1, expectedFreq) : coldNorm;
    const recencyNorm = it.gap === 0 ? 1 : 1 / (1 + it.gap);
    const zScore = Number(it.zScore) || 0;
    const hotSignal = Math.max(0, Math.min(1, zScore / 3));
    const coldSignal = Math.max(0, Math.min(1, -zScore / 3));
    const balancedScore = 0.45 * freqNorm + 0.35 * coldNorm + 0.20 * underNorm;
    return {
      n: it.n,
      freq: it.freq,
      gap: it.gap,
      zScore: zScore,
      freqNorm: freqNorm,
      coldNorm: coldNorm,
      underNorm: underNorm,
      recencyNorm: recencyNorm,
      hotWeight: 0.35 + 0.45 * hotSignal + 0.15 * freqNorm + 0.05 * recencyNorm,
      coldWeight: 0.35 + 0.45 * coldSignal + 0.15 * coldNorm + 0.05 * underNorm,
      balancedWeight: 0.15 + balancedScore,
      randomWeight: 1
    };
  });
}

function buildOptimizedPortfolio(model, cfg, method, count, historicalKeys) {
  const selected = [];
  const seen = {};
  const byNumber = {};
  model.forEach(function (it) { byNumber[it.n] = it; });
  historicalKeys = historicalKeys || {};
  const triesPerSet = method === 'random' ? 250 : 650;
  const maxOverlap = count <= 8 ? 1 : 2;

  for (let i = 0; i < count; i++) {
    let best = null;
    let bestScore = -Infinity;

    for (let t = 0; t < triesPerSet; t++) {
      const candidate = makeCandidateSet(model, cfg.pick || 6, method);
      const key = candidate.join('-');
      if (seen[key]) continue;
      if (historicalKeys[key]) continue;
      if (hasExcessiveOverlap(candidate, selected, maxOverlap)) continue;

      const score = scoreCandidate(candidate, byNumber, cfg, method, selected);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    if (!best) {
      best = makeConstrainedRandomSet(cfg.max, cfg.pick || 6, seen, historicalKeys, selected, maxOverlap);
    }
    selected.push(best);
    seen[best.join('-')] = true;
  }

  return selected;
}

function makeCandidateSet(model, pick, method) {
  const pool = model.slice();
  const chosen = [];
  const weightKey = method + 'Weight';

  while (chosen.length < pick && pool.length) {
    const idx = weightedIndex(pool, weightKey);
    chosen.push(pool[idx].n);
    pool.splice(idx, 1);
  }

  return chosen.sort(numberAsc);
}

function weightedIndex(items, key) {
  let total = 0;
  const weights = items.map(function (it) {
    const weight = Math.max(0.001, Number(it[key]) || 1);
    total += weight;
    return weight;
  });
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function scoreCandidate(set, byNumber, cfg, method, selected) {
  const methodScore = average(set.map(function (n) {
    const it = byNumber[n];
    return it ? it[method + 'Weight'] || it.balancedWeight : 0.5;
  }));

  const balanceScore = scoreEvenOdd(set)
    + scoreLowHigh(set, cfg.max)
    + scoreSumBand(set, cfg.max, cfg.pick || 6)
    + scoreSpread(set, cfg.max)
    + scoreDecades(set);

  const shapePenalty = penaltyConsecutive(set)
    + penaltyTooClustered(set)
    + penaltyPopularPatterns(set, cfg.max);
  const overlapSoftPenalty = selected.reduce(function (sum, oldSet) {
    return sum + countOverlap(set, oldSet) * 0.03;
  }, 0);

  const randomNoise = Math.random() * 0.04;
  return methodScore * 1.4 + balanceScore - shapePenalty - overlapSoftPenalty + randomNoise;
}

function scoreEvenOdd(set) {
  const evens = set.filter(function (n) { return n % 2 === 0; }).length;
  const diff = Math.abs(evens - set.length / 2);
  return Math.max(0, 1 - diff / 3) * 0.35;
}

function scoreLowHigh(set, max) {
  const mid = Math.ceil(max / 2);
  const lows = set.filter(function (n) { return n <= mid; }).length;
  const diff = Math.abs(lows - set.length / 2);
  return Math.max(0, 1 - diff / 3) * 0.30;
}

function scoreSumBand(set, max, pick) {
  const sum = set.reduce(function (s, n) { return s + n; }, 0);
  const expected = pick * (max + 1) / 2;
  const variance = pick * (max * max - 1) / 12 * (max - pick) / (max - 1);
  const z2 = variance > 0 ? Math.pow(sum - expected, 2) / variance : 0;
  return Math.exp(-z2 / 2) * 0.35;
}

function scoreSpread(set, max) {
  const spread = set[set.length - 1] - set[0];
  const target = max * 0.58;
  const tolerance = max * 0.38;
  return Math.max(0, 1 - Math.abs(spread - target) / tolerance) * 0.25;
}

function scoreDecades(set) {
  const buckets = {};
  set.forEach(function (n) { buckets[Math.floor((n - 1) / 10)] = true; });
  return Math.min(1, Object.keys(buckets).length / 4) * 0.22;
}

function penaltyConsecutive(set) {
  let penalty = 0;
  let run = 1;
  for (let i = 1; i < set.length; i++) {
    if (set[i] === set[i - 1] + 1) {
      run += 1;
      if (run >= 3) penalty += 0.18;
    } else {
      run = 1;
    }
  }
  return penalty;
}

function penaltyTooClustered(set) {
  const buckets = {};
  set.forEach(function (n) {
    const key = Math.floor((n - 1) / 10);
    buckets[key] = (buckets[key] || 0) + 1;
  });
  return Object.keys(buckets).reduce(function (sum, key) {
    return sum + Math.max(0, buckets[key] - 3) * 0.16;
  }, 0);
}

function penaltyPopularPatterns(set, max) {
  const buckets = {};
  set.forEach(function (n) {
    const key = Math.floor((n - 1) / 10);
    buckets[key] = (buckets[key] || 0) + 1;
  });

  let penalty = 0;
  const birthdayCount = set.filter(function (n) { return n <= 31; }).length;
  if (birthdayCount === set.length) penalty += 0.42;
  else if (birthdayCount >= set.length - 1) penalty += 0.18;

  const bucketCounts = Object.keys(buckets).map(function (key) { return buckets[key]; });
  const maxBucket = bucketCounts.reduce(function (m, n) { return Math.max(m, n); }, 0);
  if (bucketCounts.length === 1) penalty += 0.55;
  else if (bucketCounts.length === 2) penalty += 0.22;
  if (maxBucket >= set.length - 1) penalty += 0.25;

  if (isArithmeticProgression(set)) penalty += 0.48;
  if (countSymmetricPairs(set, max) >= 3) penalty += 0.30;

  return penalty;
}

function isArithmeticProgression(set) {
  if (set.length < 3) return false;
  const diff = set[1] - set[0];
  if (diff <= 0) return false;
  for (let i = 2; i < set.length; i++) {
    if (set[i] - set[i - 1] !== diff) return false;
  }
  return true;
}

function countSymmetricPairs(set, max) {
  const seen = {};
  let pairs = 0;
  set.forEach(function (n) { seen[n] = true; });
  set.forEach(function (n) {
    const mirror = max + 1 - n;
    if (mirror !== n && seen[mirror] && n < mirror) pairs += 1;
  });
  return pairs;
}

function hasExcessiveOverlap(candidate, selected, maxOverlap) {
  for (let i = 0; i < selected.length; i++) {
    if (countOverlap(candidate, selected[i]) > maxOverlap) return true;
  }
  return false;
}

function makeConstrainedRandomSet(max, pick, seen, historicalKeys, selected, maxOverlap) {
  for (let round = 0; round < 3; round++) {
    const allowedOverlap = maxOverlap + round;
    for (let t = 0; t < 1000; t++) {
      const candidate = makeUniqueRandomSet(max, pick);
      const key = candidate.join('-');
      if (seen[key] || historicalKeys[key]) continue;
      if (hasExcessiveOverlap(candidate, selected, allowedOverlap)) continue;
      return candidate;
    }
  }

  for (let t = 0; t < 1000; t++) {
    const candidate = makeUniqueRandomSet(max, pick);
    const key = candidate.join('-');
    if (!seen[key] && !historicalKeys[key]) return candidate;
  }

  return makeUniqueRandomSet(max, pick);
}

function makeUniqueRandomSet(max, pick) {
  const pool = [];
  for (let n = 1; n <= max; n++) pool.push(n);
  const out = [];
  while (out.length < pick && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out.sort(numberAsc);
}

/* =========================================================================
 * SO SÁNH & TÀI CHÍNH
 * ========================================================================= */

function autoMatchForDate(date, type, numbers, special) {
  const sheet = getOrCreateCompareSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rows = sheet.getRange(2, 1, lastRow - 1, COMPARE_HEADERS.length).getValues();
  rows.forEach(function (row, idx) {
    const rowIndex = idx + 2;
    if (normalizeType(row[1]) !== type) return;
    if (!sameDate(parseIso(row[4]), date)) return;
    writeComparisonResult(sheet, rowIndex, type, numbers, special);
  });
}

function writeComparisonResult(sheet, rowIndex, type, actualNumbers, actualSpecial, jackpotOverride) {
  const sets = parseJsonSafe(sheet.getRange(rowIndex, 4).getValue(), []);
  const jackpot = jackpotOverride || parseJsonSafe(sheet.getRange(rowIndex, 9).getValue(), {});
  const details = buildMatchDetails(sets, actualNumbers);
  const best = details.reduce(function (m, it) { return Math.max(m, it.count); }, 0);
  const prizes = calculatePrizes(type, details, actualSpecial, jackpot);

  sheet.getRange(rowIndex, 6, 1, 5).setValues([[
    JSON.stringify(actualNumbers.slice().sort(numberAsc)),
    best,
    JSON.stringify(details),
    JSON.stringify(jackpot || {}),
    JSON.stringify(prizes)
  ]]);
}

function buildMatchDetails(sets, actualNumbers) {
  const actualSet = {};
  actualNumbers.forEach(function (n) { actualSet[Number(n)] = true; });
  return sets.map(function (set) {
    const sorted = set.map(Number).sort(numberAsc);
    const matched = sorted.filter(function (n) { return !!actualSet[n]; });
    return {
      set: sorted,
      matched: matched,
      count: matched.length
    };
  });
}

function calculatePrizes(type, details, actualSpecial, jackpot) {
  type = normalizeType(type);
  const fixed = PRIZE_TABLE[type] || {};
  const prizes = [];
  const special = actualSpecial === null || actualSpecial === '' || actualSpecial === undefined
    ? null
    : Number(actualSpecial);

  details.forEach(function (detail, idx) {
    const count = detail.count;
    const hasSpecial = special !== null && detail.set.map(Number).indexOf(special) >= 0;

    if (type === '6/55') {
      if (count === 6) {
        prizes.push({ setIdx: idx, label: 'jackpot1', prize: Number(jackpot && jackpot.j1) || 0, needInput: true });
      } else if (count === 5 && hasSpecial) {
        prizes.push({ setIdx: idx, label: 'jackpot2', prize: Number(jackpot && jackpot.j2) || 0 });
      } else if (fixed[count]) {
        prizes.push({ setIdx: idx, label: prizeLabelForCount(count), prize: fixed[count] });
      }
      return;
    }

    if (count === 6) {
      prizes.push({ setIdx: idx, label: 'jackpot', prize: Number(jackpot && jackpot.j1) || 0, needInput: true });
    } else if (fixed[count]) {
      prizes.push({ setIdx: idx, label: prizeLabelForCount(count), prize: fixed[count] });
    }
  });

  return prizes;
}

function prizeLabelForCount(count) {
  if (count === 5) return 'prize1';
  if (count === 4) return 'prize2';
  if (count === 3) return 'prize3';
  return 'prizeKK';
}

function sumPrizes(prizes, jackpot) {
  jackpot = jackpot || {};
  return (prizes || []).reduce(function (sum, prize) {
    if (prize.label === 'jackpot1' || prize.label === 'jackpot') {
      return sum + (Number(jackpot.j1) || Number(prize.prize) || 0);
    }
    if (prize.label === 'jackpot2') {
      return sum + (Number(jackpot.j2) || Number(prize.prize) || 0);
    }
    return sum + (Number(prize.prize) || 0);
  }, 0);
}

function computeMethodStats(rows) {
  const methods = ['hot', 'cold', 'balanced', 'random'];
  const stats = {};
  methods.forEach(function (method) {
    stats[method] = { plays: 0, avgBestMatch: null, avgPerSet: null, hitRate: null, dist: {} };
    for (let i = 0; i <= 6; i++) stats[method].dist[i] = 0;
  });

  rows.forEach(function (row) {
    if (row.bestMatch === null || !row.actual) return;
    if (!stats[row.method]) stats[row.method] = { plays: 0, avgBestMatch: null, avgPerSet: null, hitRate: null, dist: {} };
    const s = stats[row.method];
    const best = Number(row.bestMatch) || 0;
    s.plays += 1;
    s._sum = (s._sum || 0) + best;
    s._hits = (s._hits || 0) + (best > 0 ? 1 : 0);
    s.dist[best] = (s.dist[best] || 0) + 1;

    (row.details || []).forEach(function (detail) {
      s._setMatchSum = (s._setMatchSum || 0) + (Number(detail.count) || 0);
      s._setCount = (s._setCount || 0) + 1;
    });
  });

  Object.keys(stats).forEach(function (method) {
    const s = stats[method];
    if (s.plays > 0) {
      s.avgBestMatch = s._sum / s.plays;
      s.hitRate = Math.round((s._hits / s.plays) * 1000) / 10;
    }
    if (s._setCount > 0) {
      s.avgPerSet = s._setMatchSum / s._setCount;
    }
    delete s._sum;
    delete s._hits;
    delete s._setMatchSum;
    delete s._setCount;
  });

  return stats;
}

/* =========================================================================
 * ĐỌC/GHI SHEET
 * ========================================================================= */

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeader(sheet, HEADERS);
  return sheet;
}

function getOrCreateCompareSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COMPARE_SHEET);
  if (!sheet) sheet = ss.insertSheet(COMPARE_SHEET);
  ensureHeader(sheet, COMPARE_HEADERS);
  return sheet;
}

function ensureHeader(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const missing = headers.some(function (h, i) { return current[i] !== h; });
  if (missing) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function getHistoricalResults(ticketType) {
  const type = normalizeType(ticketType);
  const cfg = TYPES[type];
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  const out = [];
  if (lastRow < 2) return out;

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  rows.forEach(function (row, idx) {
    if (!(row[0] instanceof Date)) return;
    if (normalizeType(row[1]) !== type) return;
    const numbers = [];
    for (let c = 2; c <= 1 + (cfg.main || 6); c++) {
      const n = parseInt(row[c], 10);
      if (!isNaN(n)) numbers.push(n);
    }
    const sp = parseInt(row[8], 10);
    out.push({
      rowIndex: idx + 2,
      date: toIso(row[0]),
      type: type,
      numbers: numbers.sort(numberAsc),
      special: cfg.hasSpecial && !isNaN(sp) ? sp : null,
      session: row[9] || ''
    });
  });

  out.sort(function (a, b) { return parseIso(a.date) - parseIso(b.date); });
  return out;
}

function readCompareRows(ticketType) {
  const typeFilter = ticketType ? normalizeType(ticketType) : null;
  const sheet = getOrCreateCompareSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, COMPARE_HEADERS.length).getValues();
  const rows = [];
  values.forEach(function (row, idx) {
    const type = normalizeType(row[1]);
    if (typeFilter && type !== typeFilter) return;
    const sets = parseJsonSafe(row[3], []);
    const actual = parseJsonSafe(row[5], null);
    const details = parseJsonSafe(row[7], []);
    const jackpot = parseJsonSafe(row[8], {});
    const prizes = parseJsonSafe(row[9], []);
    rows.push({
      rowIndex: idx + 2,
      createdAt: toIso(row[0]),
      type: type,
      method: normalizeMethod(row[2]),
      sets: Array.isArray(sets) ? sets : [],
      drawDate: normalizeIsoLike(row[4]),
      actual: Array.isArray(actual) ? actual : null,
      bestMatch: row[6] === '' || row[6] === null ? null : Number(row[6]),
      details: Array.isArray(details) ? details : [],
      jackpot: jackpot || {},
      prizes: Array.isArray(prizes) ? prizes : []
    });
  });

  rows.sort(compareByDrawDateDesc);
  return rows;
}

function findActualResult(date, type) {
  const rows = getHistoricalResults(type);
  for (let i = 0; i < rows.length; i++) {
    if (sameDate(parseIso(rows[i].date), date)) return rows[i];
  }
  return null;
}

function findActualSpecialByIso(iso, type) {
  const date = parseIso(iso);
  if (!date) return null;
  const actual = findActualResult(date, type);
  return actual ? actual.special : null;
}

function buildHistoricalSetLookup(draws) {
  const lookup = {};
  (draws || []).forEach(function (draw) {
    const key = (draw.numbers || []).map(Number).sort(numberAsc).join('-');
    if (key) lookup[key] = true;
  });
  return lookup;
}

/* =========================================================================
 * THỐNG KÊ & VALIDATION
 * ========================================================================= */

function buildStatsWindows(ascResults, cfg) {
  const max = cfg.max;
  const mainCount = cfg.main || 6;
  const out = {
    all: computeStats(ascResults, max, mainCount),
    50: computeStats(ascResults.slice(Math.max(0, ascResults.length - 50)), max, mainCount),
    20: computeStats(ascResults.slice(Math.max(0, ascResults.length - 20)), max, mainCount)
  };
  out.all.windowKey = 'all';
  out['50'].windowKey = '50';
  out['20'].windowKey = '20';
  return out;
}

function computeStats(ascResults, max, mainCount) {
  mainCount = mainCount || 6;
  const freq = {};
  const lastSeen = {};
  for (let n = 1; n <= max; n++) {
    freq[n] = 0;
    lastSeen[n] = -1;
  }

  ascResults.forEach(function (draw, idx) {
    (draw.numbers || []).slice(0, mainCount).forEach(function (n) {
      n = Number(n);
      if (n >= 1 && n <= max) {
        freq[n] += 1;
        lastSeen[n] = idx;
      }
    });
  });

  const totalDraws = ascResults.length;
  const probability = mainCount / max;
  const expectedFreq = totalDraws * probability;
  const sdFreq = Math.sqrt(totalDraws * probability * (1 - probability));
  const numbers = [];
  for (let n = 1; n <= max; n++) {
    const seenAt = lastSeen[n];
    const gap = seenAt < 0 ? totalDraws : Math.max(0, totalDraws - 1 - seenAt);
    const zScoreRaw = sdFreq > 0 ? (freq[n] - expectedFreq) / sdFreq : 0;
    const zScore = Math.round(zScoreRaw * 100) / 100;
    numbers.push({
      n: n,
      freq: freq[n],
      pct: totalDraws ? Math.round((freq[n] / totalDraws) * 1000) / 10 : 0,
      gap: gap,
      lastSeen: seenAt,
      expected: Math.round(expectedFreq * 100) / 100,
      sd: Math.round(sdFreq * 100) / 100,
      zScore: zScore,
      significant: Math.abs(zScoreRaw) > 2,
      signal: zScoreRaw > 2 ? 'hot' : (zScoreRaw < -2 ? 'cold' : 'neutral')
    });
  }

  const hot = numbers.slice().sort(function (a, b) {
    return (b.zScore - a.zScore) || (b.freq - a.freq) || (a.gap - b.gap) || (a.n - b.n);
  }).slice(0, mainCount);
  const cold = numbers.slice().sort(function (a, b) {
    return (a.zScore - b.zScore) || (a.freq - b.freq) || (b.gap - a.gap) || (a.n - b.n);
  }).slice(0, mainCount);

  return {
    totalDraws: totalDraws,
    max: max,
    main: mainCount,
    probability: probability,
    expectedFreq: Math.round(expectedFreq * 100) / 100,
    sdFreq: Math.round(sdFreq * 100) / 100,
    numbers: numbers,
    hot: hot,
    cold: cold
  };
}

function sanitizeNumbers(values, max, count) {
  if (!Array.isArray(values)) throw new Error('Danh sách số không hợp lệ.');
  count = count || 6;
  const nums = values.map(function (v) {
    return parseInt(v, 10);
  }).filter(function (n) {
    return !isNaN(n);
  });

  if (nums.length !== count) throw new Error('Cần nhập đúng ' + count + ' số.');

  const seen = {};
  nums.forEach(function (n) {
    if (n < 1 || n > max) throw new Error('Số phải nằm trong khoảng 1–' + max + '.');
    if (seen[n]) throw new Error('Các số chính không được trùng nhau.');
    seen[n] = true;
  });

  return nums.sort(numberAsc);
}

function sanitizeSpecial(value, max, mainNumbers) {
  const n = parseInt(value, 10);
  if (isNaN(n)) throw new Error('Cần nhập số đặc biệt.');
  if (n < 1 || n > max) throw new Error('Số đặc biệt phải nằm trong khoảng 1–' + max + '.');
  if (mainNumbers.indexOf(n) >= 0) throw new Error('Số đặc biệt không được trùng số chính.');
  return n;
}

function normalizeType(type) {
  const raw = String(type || '').trim();
  if (TYPES[raw]) return raw;
  if (raw.indexOf('55') >= 0 || raw === '655') return '6/55';
  if (raw.indexOf('45') >= 0 || raw === '645') return '6/45';
  return DEFAULT_TYPE;
}

function normalizeMethod(method) {
  method = String(method || '').trim().toLowerCase();
  return ['hot', 'cold', 'balanced', 'random'].indexOf(method) >= 0 ? method : 'balanced';
}

/* =========================================================================
 * DATE / JSON / SỐ HỌC
 * ========================================================================= */

function parseIso(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIso(value) {
  const date = parseIso(value);
  if (!date) return '';
  return date.getFullYear() + '-'
    + String(date.getMonth() + 1).padStart(2, '0') + '-'
    + String(date.getDate()).padStart(2, '0');
}

function normalizeIsoLike(value) {
  return toIso(value) || String(value || '').slice(0, 10);
}

function toVN(value) {
  const date = parseIso(value);
  if (!date) return '';
  return String(date.getDate()).padStart(2, '0') + '/'
    + String(date.getMonth() + 1).padStart(2, '0') + '/'
    + date.getFullYear();
}

function sameDate(a, b) {
  const da = parseIso(a);
  const db = parseIso(b);
  return !!da && !!db
    && da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function parseJsonSafe(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function moneyToNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

function clampInt(value, min, max, fallback) {
  let n = parseInt(value, 10);
  if (isNaN(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce(function (s, n) { return s + n; }, 0) / values.length;
}

function countOverlap(a, b) {
  const seen = {};
  a.forEach(function (n) { seen[n] = true; });
  return b.reduce(function (sum, n) { return sum + (seen[n] ? 1 : 0); }, 0);
}

function numberAsc(a, b) {
  return Number(a) - Number(b);
}

function compareByDrawDateDesc(a, b) {
  const da = parseIso(a.drawDate || a.createdAt);
  const db = parseIso(b.drawDate || b.createdAt);
  return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
}

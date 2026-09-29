(function (global) {
  "use strict";

  const VERSION = "5.0.0";
  const MS = 86400000;
  const EPS = 1e-9;
  const LIMITS = { minYear: 1900, maxYear: 2100, maxMoney: 1e12, maxRate: 1000 };
  const FREQUENCIES = ["annual", "quarterly", "monthly"];
  const ROUNDINGS = ["total", "perSegment", "none"];
  const DURATIONS = ["dates", "manual", "none"];
  const DISTRIBUTIONS = ["equal", "days", "shares"];
  const ROUNDING_UNITS = [0.01, 0.1, 0.5, 1, 5, 10, 100];

  function toNum(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    if (v === null || v === undefined || typeof v === "boolean") return NaN;
    const s = String(v)
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x660))
      .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x6F0))
      .replace(/\u066B/g, ".")
      .replace(/[\u066C\u060C,\s\u200E\u200F\u061C\u00A0]/g, "")
      .replace(/%$/, "");
    if (s === "" || s === "-" || s === ".") return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  function isBlank(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function decimalsOf(step) {
    if (!step || step >= 1) return 0;
    return Math.min(10, Math.ceil(-Math.log10(step) - EPS));
  }
  function fix(v, d) { return Number((Number(v) || 0).toFixed(d === undefined ? 10 : d)); }

  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInMonth(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function daysInYear(y) { return isLeap(y) ? 366 : 365; }
  function dayNumber(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / MS); }
  function ymd(n) {
    const z = n + 719468;
    const era = Math.floor(z / 146097);
    const doe = z - era * 146097;
    const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    const mp = Math.floor((5 * doy + 2) / 153);
    const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    const m = mp < 10 ? mp + 3 : mp - 9;
    return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
  }
  function yearOf(n) { return ymd(n).y; }
  function toISO(n) { if (n === null || n === undefined) return ""; const p = ymd(n); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; }
  function weekday(n) { return (((n % 7) + 7) % 7 + 4) % 7; }
  function parseISO(s) {
    if (typeof s !== "string") return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < LIMITS.minYear || y > LIMITS.maxYear || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return dayNumber(y, mo, d);
  }
  function monthIndex(y, m) { const t = y * 12 + (m - 1); return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 + 1 }; }
  function monthStart(y, m) { const p = monthIndex(y, m); return dayNumber(p.y, p.m, 1); }
  function monthEnd(y, m) { const p = monthIndex(y, m); return dayNumber(p.y, p.m, daysInMonth(p.y, p.m)); }
  function monthsTouched(a, b) { const A = ymd(a), B = ymd(b); return (B.y - A.y) * 12 + B.m - A.m + 1; }
  function isMonthEnd(n) { const p = ymd(n); return p.d === daysInMonth(p.y, p.m); }
  function days30E(a, b) {
    const A = ymd(a), B = ymd(b);
    const d1 = Math.min(A.d, 30);
    const d2 = isMonthEnd(b) ? 30 : Math.min(B.d, 30);
    return Math.max(0, (B.y - A.y) * 360 + (B.m - A.m) * 30 + (d2 - d1) + 1);
  }

  function makeCalendar(weekend, holidays) {
    const wk = new Set((Array.isArray(weekend) ? weekend : []).map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6));
    const fixed = new Set();
    const repeating = [];
    (Array.isArray(holidays) ? holidays : []).forEach(h => {
      const n = parseISO(h && h.date);
      if (n === null) return;
      if (h.repeats) { const p = ymd(n); repeating.push([p.m, p.d]); } else fixed.add(n);
    });
    const years = new Map();
    let last = null;
    function tableFor(n) {
      if (last && n >= last.start && n < last.start + last.len) return last;
      last = table(yearOf(n));
      return last;
    }
    function table(y) {
      let t = years.get(y);
      if (t) return t;
      const start = dayNumber(y, 1, 1);
      const len = daysInYear(y);
      const rep = new Set();
      repeating.forEach(([m, d]) => { if (d <= daysInMonth(y, m)) rep.add(dayNumber(y, m, d)); });
      const cum = new Int32Array(len + 1);
      for (let i = 0; i < len; i++) {
        const n = start + i;
        const work = !wk.has(weekday(n)) && !fixed.has(n) && !rep.has(n);
        cum[i + 1] = cum[i] + (work ? 1 : 0);
      }
      t = { start, len, cum };
      years.set(y, t);
      return t;
    }
    function isWorking(n) { const t = tableFor(n); const i = n - t.start; return t.cum[i + 1] - t.cum[i] === 1; }
    function isHoliday(n) {
      if (fixed.has(n)) return true;
      const p = ymd(n);
      return repeating.some(([m, d]) => m === p.m && d === p.d);
    }
    function count(a, b) {
      if (a === null || b === null || a === undefined || b === undefined || a > b) return 0;
      let total = 0, cur = a;
      while (cur <= b) {
        const t = tableFor(cur);
        const yEnd = t.start + t.len - 1;
        const e = Math.min(b, yEnd);
        total += t.cum[e - t.start + 1] - t.cum[cur - t.start];
        cur = e + 1;
      }
      return total;
    }
    function next(n) { let c = n; for (let i = 0; i < 400 && !isWorking(c); i++) c++; return c; }
    function prev(n) { let c = n; for (let i = 0; i < 400 && !isWorking(c); i++) c--; return c; }
    return { isWorking, isHoliday, count, next, prev, weekend: wk, noWorkingDays: wk.size >= 7 };
  }

  const identityWindow = (s, e) => [s, e];
  const monthFactor = (a, b) => monthsTouched(a, b) / 12;
  const CONVENTIONS = {
    commercial15: {
      unit: "months",
      window(s, e) {
        const S = ymd(s), E = ymd(e);
        const ws = S.d > 15 ? monthStart(S.y, S.m + 1) : monthStart(S.y, S.m);
        const we = E.d >= 15 ? monthEnd(E.y, E.m) : monthEnd(E.y, E.m - 1);
        return [ws, we];
      },
      factor: monthFactor
    },
    nextWorkingMonth: {
      unit: "months",
      window(s, e, cal) {
        const S = ymd(s), E = ymd(e);
        const bs = S.d === 1 ? s : monthStart(S.y, S.m + 1);
        const be = E.d === daysInMonth(E.y, E.m) ? e : monthEnd(E.y, E.m - 1);
        return [cal.next(bs), cal.prev(be)];
      },
      factor: monthFactor
    },
    inclusiveMonths: { unit: "months", window: identityWindow, factor: monthFactor },
    actualActual: { unit: "days", window: identityWindow, factor: (a, b) => (b - a + 1) / daysInYear(yearOf(a)) },
    actual365: { unit: "days", window: identityWindow, factor: (a, b) => (b - a + 1) / 365 },
    actual360: { unit: "days", window: identityWindow, factor: (a, b) => (b - a + 1) / 360 },
    thirty360: { unit: "days", window: identityWindow, factor: (a, b) => days30E(a, b) / 360, count: days30E }
  };

  function yearSegments(ws, we, conv) {
    const out = [];
    if (ws === null || we === null || ws > we) return out;
    let cur = ws;
    while (cur <= we) {
      const y = yearOf(cur);
      const e = Math.min(we, dayNumber(y, 12, 31));
      out.push({ year: y, from: cur, to: e, days: conv.count ? conv.count(cur, e) : e - cur + 1, months: monthsTouched(cur, e), factor: conv.factor(cur, e), manual: false });
      cur = e + 1;
    }
    return out;
  }

  function splitPeriods(seg, frequency, conv) {
    if (frequency === "annual") return [{ from: seg.from, to: seg.to, factor: seg.factor }];
    const chunk = frequency === "quarterly" ? 3 : 1;
    const out = [];
    let cur = seg.from;
    while (cur <= seg.to) {
      const p = ymd(cur);
      let e = monthEnd(p.y, p.m + chunk - 1);
      if (e > seg.to) e = seg.to;
      out.push({ from: cur, to: e, factor: conv.factor(cur, e) });
      cur = e + 1;
    }
    return out.length ? out : [{ from: seg.from, to: seg.to, factor: seg.factor }];
  }

  function manualPeriods(seg, frequency) {
    if (frequency === "annual") return [{ from: null, to: null, factor: seg.factor }];
    const chunk = frequency === "quarterly" ? 3 : 1;
    const out = [];
    let remaining = seg.months;
    while (remaining > EPS) {
      const take = Math.min(chunk, remaining);
      out.push({ from: null, to: null, factor: take / 12 });
      remaining -= take;
    }
    return out.length ? out : [{ from: null, to: null, factor: seg.factor }];
  }

  function manualSegments(list) {
    const rows = (Array.isArray(list) ? list : []).filter(r => r && (!isBlank(r.year) || !isBlank(r.months)));
    const seen = new Set();
    const segs = [];
    for (const r of rows) {
      const y = toNum(r.year), m = toNum(r.months);
      if (!Number.isInteger(y) || y < LIMITS.minYear || y > LIMITS.maxYear) return { ok: false, segs: [], reason: "year" };
      if (!(m > 0) || m > 12) return { ok: false, segs: [], reason: "months" };
      if (seen.has(y)) return { ok: false, segs: [], reason: "duplicate" };
      seen.add(y);
      segs.push({ year: y, from: null, to: null, days: 0, months: m, factor: m / 12, manual: true });
    }
    segs.sort((a, b) => a.year - b.year);
    return { ok: true, segs };
  }

  function roundTo(v, unit) {
    const n = Number(v) || 0;
    if (!unit || unit <= 0) return n;
    const s = n < 0 ? -1 : 1;
    const q = Math.round(Math.abs(n) / unit + EPS);
    return fix(s * q * unit, decimalsOf(unit));
  }

  function allocate(total, weights, step) {
    const w = weights.map(x => { const n = Number(x); return Number.isFinite(n) && n > 0 ? n : 0; });
    const W = w.reduce((a, b) => a + b, 0);
    if (W <= 0) return w.map(() => 0);
    if (!step) return w.map(x => total * x / W);
    const units = Math.round(total / step);
    const exact = w.map(x => units * x / W);
    const floors = exact.map(v => Math.floor(v + EPS));
    let rem = units - floors.reduce((a, b) => a + b, 0);
    const order = exact.map((v, i) => ({ i, r: v - Math.floor(v + EPS) })).filter(o => w[o.i] > 0).sort((a, b) => b.r - a.r || a.i - b.i);
    let k = 0;
    while (rem > 0 && order.length) { floors[order[k % order.length].i]++; rem--; k++; }
    while (rem < 0 && order.length) { floors[order[order.length - 1 - (k % order.length)].i]--; rem++; k++; }
    const d = decimalsOf(step);
    return floors.map(v => fix(v * step, d));
  }

  function allocateSigned(total, weights, step) {
    const sgn = total < 0 ? -1 : 1;
    const nums = weights.map(v => (Number.isFinite(Number(v)) ? Number(v) : 0));
    const mixed = nums.some(v => v * sgn < 0) && nums.some(v => v * sgn > 0);
    if (!mixed) {
      let w = nums.map(v => (v * sgn > 0 ? Math.abs(v) : 0));
      if (!w.some(x => x > 0)) w = nums.map(v => Math.abs(v));
      if (!w.some(x => x > 0)) w = nums.map(() => 1);
      return allocate(Math.abs(total), w, step).map(v => (v === 0 ? 0 : v * sgn));
    }
    const S = nums.reduce((a, b) => a + b, 0);
    const scale = Math.abs(S) > EPS ? total / S : 1;
    const scaled = nums.map(v => v * scale);
    if (!step) return scaled;
    const units = Math.round(total / step);
    const exact = scaled.map(v => v / step);
    const floors = exact.map(v => Math.floor(v + EPS));
    let rem = units - floors.reduce((a, b) => a + b, 0);
    const order = exact.map((v, i) => ({ i, r: v - Math.floor(v + EPS) })).sort((a, b) => b.r - a.r || a.i - b.i);
    let k = 0;
    while (rem > 0) { floors[order[k % order.length].i]++; rem--; k++; }
    while (rem < 0) { floors[order[order.length - 1 - (k % order.length)].i]--; rem++; k++; }
    const d = decimalsOf(step);
    return floors.map(v => fix(v * step, d));
  }

  function accrue(principal, segs, ctx, presence) {
    let running = principal;
    const rows = [];
    for (const seg of segs) {
      const open = running;
      let raw = 0, eff = 0, present = false;
      for (const per of seg.periods) {
        const f = presence ? presence(seg, per) : per.factor;
        if (!(f > 0)) continue;
        present = true;
        eff += f;
        const r = running * seg.appliedRate / 100 * f;
        raw += r;
        if (ctx.compounding) running += r;
      }
      let value = raw;
      if (ctx.rounding === "perSegment") {
        value = roundTo(raw, ctx.unit);
        if (ctx.compounding) running += value - raw;
      }
      rows.push({
        year: seg.year, from: seg.from, to: seg.to, days: seg.days, months: seg.months, manual: !!seg.manual,
        factor: presence ? eff : seg.factor, periods: seg.periods.length,
        annualRate: seg.annualRate, extraRate: seg.extraRate, appliedRate: seg.appliedRate,
        open, raw, value, present
      });
    }
    const rawTotal = rows.reduce((a, r) => a + r.raw, 0);
    let total;
    if (ctx.rounding === "perSegment") total = fix(rows.reduce((a, r) => a + r.value, 0));
    else if (ctx.rounding === "total") {
      total = roundTo(rawTotal, ctx.unit);
      const al = allocateSigned(total, rows.map(r => r.raw), ctx.unit);
      rows.forEach((r, i) => { r.value = al[i]; });
    } else total = rawTotal;
    rows.forEach(r => { r.close = ctx.compounding ? r.open + (ctx.rounding === "perSegment" ? r.value : r.raw) : r.open + r.value; });
    return { rows, total, rawTotal };
  }

  function normalizeSettings(s) {
    s = s || {};
    const unit = Number(s.roundingUnit);
    const extra = toNum(s.extraRate);
    return {
      convention: CONVENTIONS[s.convention] ? s.convention : "commercial15",
      frequency: FREQUENCIES.includes(s.frequency) ? s.frequency : "annual",
      presenceBasis: s.presenceBasis === "calendar" ? "calendar" : "working",
      distribution: DISTRIBUTIONS.includes(s.distribution) ? s.distribution : "equal",
      investmentMode: s.investmentMode === "perPeriod" ? "perPeriod" : "blended",
      roundingUnit: ROUNDING_UNITS.includes(unit) ? unit : 1,
      extraRate: Number.isFinite(extra) ? clamp(extra, -LIMITS.maxRate, LIMITS.maxRate) : 0,
      weekend: [...new Set((Array.isArray(s.weekend) ? s.weekend : []).map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b),
      holidays: (Array.isArray(s.holidays) ? s.holidays : []).filter(h => h && parseISO(h.date) !== null).map(h => ({ date: h.date, repeats: !!h.repeats }))
    };
  }

  function personWindow(p, s, e) {
    if (s === null || e === null || s === undefined || e === undefined) return null;
    const j = parseISO(p.join), l = parseISO(p.leave);
    if (j !== null && l !== null && j > l) return null;
    const a = Math.max(j === null ? s : j, s);
    const b = Math.min(l === null ? e : l, e);
    return a <= b ? [a, b] : null;
  }
  function overrideFor(p, caseId) {
    const o = p.overrides && p.overrides[caseId];
    return o && typeof o === "object" ? o : null;
  }
  function manualYearDays(o) {
    const out = { any: false, sum: 0, byYear: {} };
    if (!o || !o.years || typeof o.years !== "object") return out;
    Object.keys(o.years).forEach(y => {
      const v = o.years[y];
      if (isBlank(v)) return;
      const n = toNum(v);
      if (!Number.isFinite(n) || n < 0) return;
      out.any = true;
      out.sum += n;
      out.byYear[y] = n;
    });
    return out;
  }
  function manualReference(seg, env) {
    const full = env.S.presenceBasis === "calendar" ? daysInYear(seg.year) : env.cal.count(dayNumber(seg.year, 1, 1), dayNumber(seg.year, 12, 31));
    return full * (seg.months / 12);
  }

  function personWeight(p, r, env) {
    const S = env.S;
    if (S.distribution === "equal") return { weight: 1, source: "equal" };
    if (S.distribution === "shares") {
      if (isBlank(p.share)) return { weight: 1, source: "share" };
      const v = toNum(p.share);
      return { weight: Number.isFinite(v) && v > 0 ? v : 0, source: "share" };
    }
    const o = overrideFor(p, r.id);
    if (r.duration === "manual") {
      const ys = manualYearDays(o);
      if (ys.any) return { weight: ys.sum, source: "manualYears" };
    }
    if (o && !isBlank(o.days)) {
      const v = toNum(o.days);
      return { weight: Number.isFinite(v) && v > 0 ? v : 0, source: "manual" };
    }
    if (r.duration !== "dates" || r.start === null) return { weight: 0, source: "missing" };
    const w = personWindow(p, r.start, r.end);
    return { weight: w ? env.measure(w[0], w[1]) : 0, source: "dates", window: w };
  }

  function presenceFor(p, r, env) {
    if (r.duration === "manual") {
      const ys = manualYearDays(overrideFor(p, r.id));
      return (seg, per) => {
        const d = ys.byYear[seg.year];
        if (!(d > 0)) return 0;
        const ref = manualReference(seg, env);
        if (ref <= 0) return 0;
        return per.factor * Math.min(1, d / ref);
      };
    }
    const w = personWindow(p, r.start, r.end);
    if (!w) return () => 0;
    return (seg, per) => {
      const a = Math.max(w[0], per.from), b = Math.min(w[1], per.to);
      if (a > b) return 0;
      if (a === per.from && b === per.to) return per.factor;
      const tot = per.measure === undefined ? (per.measure = env.measure(per.from, per.to)) : per.measure;
      if (tot <= 0) return 0;
      return per.factor * Math.min(1, env.measure(a, b) / tot);
    };
  }

  function coverageGaps(r, env) {
    if (r.duration !== "dates" || r.start === null) return [];
    const ranges = env.people.map(p => personWindow(p, r.start, r.end)).filter(Boolean).sort((a, b) => a[0] - b[0]);
    const gaps = [];
    let cur = r.start;
    for (const [a, b] of ranges) {
      if (a > cur) gaps.push([cur, a - 1]);
      if (b + 1 > cur) cur = b + 1;
    }
    if (cur <= r.end) gaps.push([cur, r.end]);
    return gaps.map(([a, b]) => { const m = env.measure(a, b); return { from: a, to: b, days: b - a + 1, measured: m, impact: m > 0 }; });
  }

  function computeCase(c, index, env) {
    const { S, conv, cal } = env;
    const id = String(c && c.id ? c.id : "case-" + index);
    const name = String((c && c.name) || "").trim();
    const head = { id, index, name };
    const fail = (issue, params) => ({ ...head, excluded: true, issue, params: params || {} });
    if (!c || typeof c !== "object") return fail("noShortage");
    const rounding = ROUNDINGS.includes(c.rounding) ? c.rounding : "total";
    let shortage = toNum(c.shortage);
    if (!(shortage > 0)) return fail("noShortage");
    if (shortage > LIMITS.maxMoney) return fail("amountTooLarge");
    if (rounding !== "none") shortage = roundTo(shortage, 0.01);
    const duration = DURATIONS.includes(c.duration) ? c.duration : "dates";
    const inc = c.include || {}, on = c.investOn || {};
    const incShortage = inc.shortage !== false, incExpenses = !!inc.expenses;
    if (!incShortage && !incExpenses) return fail("noComponents");
    const invest = duration !== "none" && inc.investment !== false;
    let expenseRate = toNum(c.expenseRate);
    if (!Number.isFinite(expenseRate)) expenseRate = 0;
    expenseRate = clamp(expenseRate, 0, LIMITS.maxRate);
    let expense = shortage * expenseRate / 100;
    if (rounding !== "none") expense = roundTo(expense, 0.01);
    const onShortage = incShortage && on.shortage !== false;
    const onExpenses = incExpenses && on.expenses !== false;
    const base = fix((incShortage ? shortage : 0) + (incExpenses ? expense : 0));
    const principal = fix((onShortage ? shortage : 0) + (onExpenses ? expense : 0));
    if (invest && principal <= 0) return fail("noInvestmentBasis");
    const fixed = c.rateSource === "fixed";
    const fixedRate = toNum(c.fixedRate);
    if (invest && fixed && !Number.isFinite(fixedRate)) return fail("invalidFixedRate");
    if (invest && fixed && Math.abs(fixedRate) > LIMITS.maxRate) return fail("invalidFixedRate");
    const needDates = duration === "dates" && (invest || (S.distribution === "days" && env.people.length > 0));
    let start = null, end = null, windowStart = null, windowEnd = null, segs = [];
    if (duration === "dates") {
      const s = parseISO(c.start), e = parseISO(c.end);
      const badText = (!isBlank(c.start) && s === null) || (!isBlank(c.end) && e === null);
      if (badText) return fail("invalidDate");
      if (s !== null && e !== null && s > e) return fail("endBeforeStart");
      if (s === null || e === null) {
        if (needDates) return fail("missingDates");
      } else {
        start = s; end = e;
        const w = conv.window(s, e, cal);
        windowStart = w[0]; windowEnd = w[1];
        segs = yearSegments(w[0], w[1], conv);
        if (!segs.length && invest) return fail("accrualCollapsed");
      }
    } else if (duration === "manual") {
      const m = manualSegments(c.manualYears);
      if (!m.ok) return fail("invalidManualYears", { reason: m.reason });
      if (!m.segs.length && invest) return fail("invalidManualYears", { reason: "empty" });
      segs = m.segs;
    }
    const frequency = FREQUENCIES.includes(c.frequency) ? c.frequency : S.frequency;
    const tableId = fixed ? null : (c.rateTable && env.tables[c.rateTable] ? c.rateTable : env.defaultTable);
    const table = (tableId && env.tables[tableId]) || {};
    const addsExtra = fixed ? !!c.fixedRateAddsExtra : true;
    const missingYears = [];
    segs.forEach(seg => {
      let annual;
      if (fixed) annual = fixedRate;
      else {
        const r = toNum(table[seg.year]);
        if (Number.isFinite(r)) annual = r;
        else { annual = 0; missingYears.push(seg.year); }
      }
      seg.annualRate = annual;
      seg.extraRate = addsExtra ? S.extraRate : 0;
      seg.appliedRate = annual + seg.extraRate;
      seg.periods = seg.manual ? manualPeriods(seg, frequency) : splitPeriods(seg, frequency, conv);
    });
    const ctx = { compounding: c.compounding !== false, rounding, unit: S.roundingUnit };
    const acc = invest && segs.length ? accrue(principal, segs, ctx, null) : { rows: [], total: 0, rawTotal: 0 };
    const ack = (Array.isArray(c.acknowledgedYears) ? c.acknowledgedYears : []).map(Number);
    const unresolvedYears = invest ? missingYears.filter(y => !ack.includes(y)) : [];
    return {
      ...head, excluded: false,
      shortage, expenseRate, expense, base, principal,
      incShortage, incExpenses, invest, onShortage, onExpenses,
      rounding, compounding: ctx.compounding, frequency, duration,
      rateSource: fixed ? "fixed" : "table", rateTable: tableId, fixedRate: fixed ? fixedRate : null, addsExtra,
      start, end, windowStart, windowEnd,
      segments: acc.rows, returnValue: acc.total, rawReturn: acc.rawTotal, caseLevelReturn: acc.total,
      due: fix(base + acc.total),
      missingYears: invest ? missingYears : [], unresolvedYears, blocked: unresolvedYears.length > 0,
      personAuthoritative: false, gaps: [], unallocated: 0, weightTotal: 0,
      _segs: segs, _ctx: ctx
    };
  }

  function distribute(r, env) {
    const { S, people } = env;
    const out = { rows: [], details: [], unallocated: 0, weightTotal: 0, perPeriod: false };
    if (!people.length) { out.unallocated = r.due; return out; }
    const ws = people.map(p => personWeight(p, r, env));
    const weights = ws.map(w => w.weight);
    const W = weights.reduce((a, b) => a + b, 0);
    out.weightTotal = W;
    const mkRow = (p, i, extra) => ({
      caseId: r.id, personId: p.id, personName: String(p.name).trim(),
      weight: weights[i], ratio: W > 0 ? weights[i] / W : 0, source: ws[i].source,
      principal: 0, base: 0, returnValue: 0, amount: 0,
      clamped: false, noOverlap: false, ...extra
    });
    if (W <= 0) {
      people.forEach((p, i) => out.rows.push(mkRow(p, i, {})));
      out.unallocated = r.due;
      return out;
    }
    const exact = r.rounding === "none";
    const cents = exact ? null : 0.01;
    const unit = exact ? null : S.roundingUnit;
    const perPeriod = S.distribution === "days" && S.investmentMode === "perPeriod" && r.invest && r.segments.length > 0;
    out.perPeriod = perPeriod;
    const principals = r.invest ? allocate(r.principal, weights, cents) : weights.map(() => 0);
    const bases = allocate(r.base, weights, cents);
    let returns, calcs = null;
    if (perPeriod) {
      calcs = people.map((p, i) => accrue(principals[i], r._segs, r._ctx, presenceFor(p, r, env)));
      returns = calcs.map(c => c.total);
    } else {
      returns = allocateSigned(r.returnValue, weights, unit);
    }
    people.forEach((p, i) => {
      const j = parseISO(p.join), l = parseISO(p.leave);
      const clamped = S.distribution === "days" && r.duration === "dates" && r.start !== null && ((j !== null && j < r.start) || (l !== null && l > r.end));
      const amount = exact ? bases[i] + returns[i] : fix(bases[i] + returns[i], 2);
      const noOverlap = !!(perPeriod && weights[i] > 0 && !calcs[i].rows.some(s => s.present));
      out.rows.push(mkRow(p, i, { principal: principals[i], base: bases[i], returnValue: returns[i], amount, clamped, noOverlap }));
      if (weights[i] <= 0 || !r.segments.length) return;
      if (perPeriod) {
        calcs[i].rows.forEach(s => out.details.push({ caseId: r.id, personId: p.id, year: s.year, from: s.from, to: s.to, manual: s.manual, open: s.open, rate: s.appliedRate, factor: s.factor, value: s.value, present: s.present }));
      } else {
        const ratio = weights[i] / W;
        const split = allocateSigned(returns[i], r.segments.map(s => s.value), unit);
        r.segments.forEach((s, k) => out.details.push({ caseId: r.id, personId: p.id, year: s.year, from: s.from, to: s.to, manual: s.manual, open: exact ? s.open * ratio : fix(s.open * ratio, 2), rate: s.appliedRate, factor: s.factor, value: split[k], present: true }));
      }
    });
    if (perPeriod) {
      const total = fix(returns.reduce((a, b) => a + b, 0));
      r.segments = r.segments.map((s, k) => {
        let open = 0, raw = 0, value = 0, close = 0;
        calcs.forEach(c => { const x = c.rows[k]; if (!x) return; open += x.open; raw += x.raw; value += x.value; close += x.close; });
        return { ...s, open, raw, value: fix(value), close };
      });
      r.returnValue = total;
      r.due = fix(r.base + total);
      r.personAuthoritative = true;
    }
    const distributed = out.rows.reduce((a, x) => a + x.amount, 0);
    const u = fix(r.due - distributed, 6);
    out.unallocated = Math.abs(u) < 0.005 ? 0 : fix(u, 2);
    return out;
  }

  function compute(input) {
    input = input || {};
    const S = normalizeSettings(input.settings);
    const cal = makeCalendar(S.weekend, S.holidays);
    const conv = CONVENTIONS[S.convention];
    const tables = input.rateTables && typeof input.rateTables === "object" ? input.rateTables : {};
    const defaultTable = input.defaultRateTable && tables[input.defaultRateTable] ? input.defaultRateTable : Object.keys(tables)[0] || null;
    const allPeople = (Array.isArray(input.people) ? input.people : []).filter(p => p && typeof p === "object");
    const people = allPeople.filter(p => String(p.name || "").trim());
    const env = {
      S, cal, conv, tables, defaultTable, people,
      measure: (a, b) => (a > b ? 0 : S.presenceBasis === "calendar" ? b - a + 1 : cal.count(a, b))
    };
    const issues = [];
    const cases = [], excluded = [];
    (Array.isArray(input.cases) ? input.cases : []).forEach((c, i) => {
      const r = computeCase(c, i, env);
      if (r.excluded) {
        excluded.push(r);
        const blank = r.issue === "noShortage" && isBlank(c && c.shortage);
        r.blank = blank;
        issues.push({ code: "case." + r.issue, severity: blank ? "info" : "error", caseId: r.id, params: { ...r.params } });
      }
      else cases.push(r);
    });
    const rows = [], details = [];
    cases.forEach(r => {
      const d = distribute(r, env);
      rows.push(...d.rows);
      details.push(...d.details);
      r.unallocated = d.unallocated;
      r.weightTotal = d.weightTotal;
      r.perPeriod = d.perPeriod;
      if (S.distribution === "days") r.gaps = coverageGaps(r, env);
      if (r.missingYears.length) issues.push({ code: "case.missingRates", severity: r.blocked ? "error" : "info", caseId: r.id, params: { years: r.missingYears, unresolved: r.unresolvedYears }, blocking: r.blocked });
      if (people.length && d.weightTotal <= 0) {
        const code = S.distribution === "days" && r.duration !== "dates" ? "case.needsManualWeights" : "case.noWeight";
        issues.push({ code, severity: "warning", caseId: r.id, params: { amount: r.due } });
      } else if (people.length && r.unallocated !== 0) {
        issues.push({ code: "case.unallocated", severity: "warning", caseId: r.id, params: { amount: r.unallocated } });
      }
      if (r.gaps.length) {
        const impact = r.gaps.some(g => g.impact);
        issues.push({ code: impact ? "case.coverageGap" : "case.coverageGapNoImpact", severity: impact ? "warning" : "info", caseId: r.id, params: { gaps: r.gaps } });
      }
      if (d.perPeriod && r.duration === "manual") {
        const years = r.segments.map(s => s.year).filter(y => !people.some(p => manualYearDays(overrideFor(p, r.id)).byYear[y] > 0));
        if (years.length) issues.push({ code: "case.manualYearNoDays", severity: "warning", caseId: r.id, params: { years } });
      }
      if (S.distribution === "days" && r.duration === "manual") {
        r._segs.forEach(seg => {
          const ref = manualReference(seg, env);
          people.forEach(p => {
            const v = manualYearDays(overrideFor(p, r.id)).byYear[seg.year];
            if (v > ref + EPS) issues.push({ code: "person.manualDaysExceed", severity: "info", caseId: r.id, personId: p.id, params: { year: seg.year, value: v, max: Math.floor(ref) } });
          });
        });
      }
    });
    if (cases.length && !people.length) issues.push({ code: "global.noPeople", severity: "info", params: {} });
    if (S.weekend.length >= 7) issues.push({ code: "global.noWorkingDays", severity: "error", params: {} });
    allPeople.forEach(p => {
      const named = String(p.name || "").trim();
      const j = parseISO(p.join), l = parseISO(p.leave);
      if (!named && (!isBlank(p.join) || !isBlank(p.leave))) issues.push({ code: "person.unnamed", severity: "warning", personId: p.id, params: {} });
      if (named && j !== null && l !== null && j > l) issues.push({ code: "person.invalidRange", severity: "warning", personId: p.id, params: { name: named } });
      if (named && ((!isBlank(p.join) && j === null) || (!isBlank(p.leave) && l === null))) issues.push({ code: "person.invalidDate", severity: "warning", personId: p.id, params: { name: named } });
    });
    const summaryMap = new Map();
    people.forEach(p => summaryMap.set(p.id, { personId: p.id, personName: String(p.name).trim(), weight: 0, principal: 0, base: 0, returnValue: 0, amount: 0, cases: 0 }));
    rows.forEach(x => {
      const t = summaryMap.get(x.personId);
      if (!t) return;
      t.weight += x.weight; t.principal += x.principal; t.base += x.base; t.returnValue += x.returnValue; t.amount += x.amount;
      if (x.amount !== 0) t.cases++;
    });
    const summary = [...summaryMap.values()].map(s => ({ ...s, principal: fix(s.principal, 6), base: fix(s.base, 6), returnValue: fix(s.returnValue, 6), amount: fix(s.amount, 6) }));
    if (S.distribution === "days" && cases.length) {
      summary.forEach(s => { if (s.weight <= 0) issues.push({ code: "person.zero", severity: "warning", personId: s.personId, params: { name: s.personName } }); });
    }
    const sum = f => fix(cases.reduce((a, c) => a + f(c), 0), 6);
    const totals = {
      cases: cases.length, excluded: excluded.length, people: people.length,
      shortage: sum(c => (c.incShortage ? c.shortage : 0)),
      expenses: sum(c => (c.incExpenses ? c.expense : 0)),
      rawShortage: sum(c => c.shortage),
      rawExpenses: sum(c => c.expense),
      base: sum(c => c.base),
      principal: sum(c => (c.invest ? c.principal : 0)),
      returnValue: sum(c => c.returnValue),
      due: sum(c => c.due),
      distributed: fix(rows.reduce((a, x) => a + x.amount, 0), 6),
      unallocated: sum(c => c.unallocated)
    };
    const missingYears = [...new Set(cases.flatMap(c => c.missingYears))].sort((a, b) => a - b);
    const unresolvedYears = [...new Set(cases.flatMap(c => c.unresolvedYears))].sort((a, b) => a - b);
    cases.forEach(c => { delete c._ctx; Object.defineProperty(c, "_segs", { value: c._segs, enumerable: false }); });
    return { version: VERSION, settings: S, defaultRateTable: defaultTable, cases, excluded, rows, details, people: summary, totals, issues, missingYears, unresolvedYears, blocked: cases.some(c => c.blocked) };
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  function canonical(v) {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === "object") { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = canonical(v[k]); }); return o; }
    return v;
  }
  function hash(v) { return fnv1a(JSON.stringify(canonical(v))); }

  global.ROIEngine = {
    VERSION, LIMITS, FREQUENCIES, ROUNDINGS, DURATIONS, DISTRIBUTIONS, ROUNDING_UNITS,
    CONVENTION_IDS: Object.keys(CONVENTIONS),
    conventions: CONVENTIONS,
    compute, normalizeSettings, makeCalendar, yearSegments, splitPeriods, manualSegments, accrue,
    allocate, allocateSigned, roundTo, toNum, isBlank, parseISO, toISO, ymd, dayNumber, weekday,
    daysInYear, daysInMonth, isLeap, monthsTouched, days30E, personWindow, hash, fnv1a, canonical
  };
})(typeof window !== "undefined" ? window : globalThis);

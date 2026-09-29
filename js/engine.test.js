(function (global) {
  "use strict";
  const E = global.ROIEngine;
  const T = [];
  const test = (group, name, fn) => T.push({ group, name, fn });
  const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.005 : eps);
  const RATES = { 2017: 15.25, 2018: 16.25, 2019: 17.25, 2020: 12.75, 2021: 8.75, 2022: 8.75, 2023: 16.75, 2024: 19.75, 2025: 27.75, 2026: 20.5 };

  function run(o) {
    return E.compute({
      settings: Object.assign({ convention: "actualActual", frequency: "annual", distribution: "days", investmentMode: "blended", roundingUnit: 1, extraRate: 0, weekend: [5, 6], holidays: [] }, o.settings || {}),
      rateTables: { t: o.rates || RATES }, defaultRateTable: "t",
      cases: o.cases || [], people: o.people || []
    });
  }
  function kase(o) {
    return Object.assign({ id: "c1", name: "Case", shortage: 100000, expenseRate: 0, start: "2020-01-01", end: "2022-12-31", duration: "dates", include: { shortage: true, expenses: false, investment: true }, investOn: { shortage: true, expenses: true }, rounding: "total", compounding: true, rateSource: "table" }, o || {});
  }
  const P = (id, name, join, leave, extra) => Object.assign({ id, name, join, leave }, extra || {});
  const seg = (s, e, conv, weekend) => {
    const cal = E.makeCalendar(weekend || [5, 6], []);
    const c = E.conventions[conv];
    const w = c.window(E.parseISO(s), E.parseISO(e), cal);
    return E.yearSegments(w[0], w[1], c);
  };

  test("Golden", "locked figures from the previous engine are reproduced exactly", () => {
    const r = run({
      settings: { holidays: [{ date: "2020-01-01", repeats: true }, { date: "2021-07-23", repeats: false }] },
      rates: { 2019: 17.25, 2020: 12.75, 2021: 8.75, 2022: 8.75, 2023: 16.75 },
      cases: [
        kase({ id: "c1", shortage: 250000, start: "2019-03-01", end: "2022-05-15" }),
        kase({ id: "c2", shortage: 80000, duration: "manual", rounding: "perSegment", compounding: false, manualYears: [{ year: 2020, months: 6 }, { year: 2021, months: 12 }, { year: 2022, months: 3 }] }),
        kase({ id: "c3", shortage: 50000, duration: "none", rounding: "none", compounding: false, include: { shortage: true, expenses: false, investment: false } })
      ],
      people: [P("p1", "P1", "2019-01-01", "2022-12-31"), P("p2", "P2", "2019-06-01", "2021-01-01"), P("p3", "P3", "2020-03-15", "2022-05-15"), P("p4", "P4", "2021-01-01", "2023-01-01"), P("p5", "P5", "2018-01-01", "2019-12-31")]
    });
    const by = Object.fromEntries(r.cases.map(c => [c.id, c]));
    const ok = by.c1 && by.c1.due === 362225 && by.c1.returnValue === 112225 && by.c2 && by.c2.due === 93850 && by.c3 && by.c3.due === 50000 && r.totals.due === 506075;
    return [ok, `c1=${by.c1 && by.c1.due} c2=${by.c2 && by.c2.due} c3=${by.c3 && by.c3.due} total=${r.totals.due}`];
  });

  test("Conventions", "commercial15: start 1–15 keeps month, 16+ drops it", () => {
    const a = seg("2020-01-15", "2020-01-31", "commercial15"), b = seg("2020-01-16", "2020-02-29", "commercial15");
    return [E.toISO(a[0].from) === "2020-01-01" && E.toISO(b[0].from) === "2020-02-01", `${E.toISO(a[0].from)} ${E.toISO(b[0].from)}`];
  });
  test("Conventions", "commercial15: end 15+ keeps month, 1–14 drops it", () => {
    const a = seg("2020-01-01", "2020-03-14", "commercial15"), b = seg("2020-01-01", "2020-03-15", "commercial15");
    return [E.toISO(a.at(-1).to) === "2020-02-29" && E.toISO(b.at(-1).to) === "2020-03-31", `${E.toISO(a.at(-1).to)} ${E.toISO(b.at(-1).to)}`];
  });
  test("Conventions", "commercial15 collapses a short range and the case is excluded, not zeroed", () => {
    const r = run({ settings: { convention: "commercial15" }, cases: [kase({ start: "2023-03-20", end: "2023-04-10" })] });
    return [r.cases.length === 0 && r.excluded[0].issue === "accrualCollapsed", r.excluded.map(x => x.issue).join()];
  });
  test("Conventions", "nextWorkingMonth lands on working days", () => {
    const s = seg("2020-01-01", "2020-01-31", "nextWorkingMonth");
    const ok = s.length === 1 && ![5, 6].includes(E.weekday(s[0].from)) && ![5, 6].includes(E.weekday(s[0].to));
    return [ok, `${E.toISO(s[0].from)} → ${E.toISO(s[0].to)}`];
  });
  test("Conventions", "inclusiveMonths gives Feb and Jan the same 1/12 factor", () => {
    const f = seg("2021-02-01", "2021-02-28", "inclusiveMonths")[0].factor, j = seg("2021-01-01", "2021-01-31", "inclusiveMonths")[0].factor;
    return [near(f, 1 / 12, 1e-12) && near(j, 1 / 12, 1e-12), `${f} ${j}`];
  });
  test("Conventions", "actual/actual full leap year = 366 days, factor 1", () => {
    const s = seg("2024-01-01", "2024-12-31", "actualActual");
    return [s[0].days === 366 && near(s[0].factor, 1, 1e-12), `${s[0].days} ${s[0].factor}`];
  });
  test("Conventions", "actual/365 leap year factor = 366/365", () => {
    const s = seg("2024-01-01", "2024-12-31", "actual365");
    return [near(s[0].factor, 366 / 365, 1e-12), `${s[0].factor}`];
  });
  test("Conventions", "actual/360 factor = days/360", () => {
    const s = seg("2023-01-01", "2023-06-30", "actual360");
    return [near(s[0].factor, 181 / 360, 1e-12), `${s[0].factor}`];
  });
  test("Conventions", "30E/360 full year = 360 days, factor exactly 1, Feb included", () => {
    const a = seg("2023-01-01", "2023-12-31", "thirty360"), b = seg("2024-02-01", "2024-02-29", "thirty360");
    return [a[0].days === 360 && near(a[0].factor, 1, 1e-12) && b[0].days === 30, `${a[0].days} ${b[0].days}`];
  });
  test("Conventions", "every convention yields segments that tile the window with no gaps", () => {
    const bad = [];
    E.CONVENTION_IDS.forEach(id => {
      const s = seg("2019-04-11", "2023-08-23", id);
      for (let i = 1; i < s.length; i++) if (s[i].from !== s[i - 1].to + 1) bad.push(id);
      if (s.some(x => E.ymd(x.from).y !== E.ymd(x.to).y)) bad.push(id + "-year");
    });
    return [!bad.length, bad.join() || `${E.CONVENTION_IDS.length} conventions`];
  });

  test("Calendar", "prefix-sum working days equal brute force across 6 years with holidays", () => {
    const hol = [{ date: "2020-01-07", repeats: true }, { date: "2021-05-01", repeats: false }, { date: "2020-02-29", repeats: true }];
    const cal = E.makeCalendar([5, 6], hol);
    const a = E.parseISO("2019-03-17"), b = E.parseISO("2025-11-02");
    let brute = 0;
    for (let n = a; n <= b; n++) {
      const p = E.ymd(n), wd = E.weekday(n);
      const h = (p.m === 1 && p.d === 7) || (p.m === 2 && p.d === 29) || E.toISO(n) === "2021-05-01";
      if (wd !== 5 && wd !== 6 && !h) brute++;
    }
    const fast = cal.count(a, b);
    return [fast === brute, `fast=${fast} brute=${brute}`];
  });
  test("Calendar", "weekday() matches JS Date for 3000 random days", () => {
    let bad = 0;
    for (let i = 0; i < 3000; i++) {
      const n = E.dayNumber(1950, 1, 1) + Math.floor(Math.abs(Math.sin(i * 12.9898)) * 50000);
      if (new Date(n * 86400000).getUTCDay() !== E.weekday(n)) bad++;
    }
    return [bad === 0, `${bad} mismatches`];
  });
  test("Calendar", "all-weekend calendar gives zero working days without throwing", () => {
    const cal = E.makeCalendar([0, 1, 2, 3, 4, 5, 6], []);
    const r = run({ settings: { weekend: [0, 1, 2, 3, 4, 5, 6] }, cases: [kase()], people: [P("p", "A", "2020-01-01", "2020-06-30")] });
    return [cal.count(E.parseISO("2020-01-01"), E.parseISO("2020-12-31")) === 0 && r.issues.some(i => i.code === "global.noWorkingDays"), "ok"];
  });
  test("Calendar", "DST boundaries never shift day arithmetic", () => {
    const a = E.parseISO("2026-03-29"), b = E.parseISO("2026-03-30"), c = E.parseISO("2026-10-25"), d = E.parseISO("2026-10-26");
    return [b - a === 1 && d - c === 1, "ok"];
  });
  test("Calendar", "leap rules: 2100 not leap, 2000 and 2024 leap", () => [E.daysInYear(2100) === 365 && E.daysInYear(2000) === 366 && E.daysInYear(2024) === 366, "ok"]);
  test("Calendar", "repeating Feb 29 holiday is skipped in non-leap years", () => {
    const cal = E.makeCalendar([], [{ date: "2024-02-29", repeats: true }]);
    return [cal.count(E.parseISO("2023-01-01"), E.parseISO("2023-12-31")) === 365 && cal.count(E.parseISO("2024-01-01"), E.parseISO("2024-12-31")) === 365, "ok"];
  });

  test("Allocation", "largest remainder sums exactly and is deterministic", () => {
    const bad = [];
    for (let i = 0; i < 400; i++) {
      const total = Math.round(Math.abs(Math.sin(i) * 1e7)) / 100;
      const w = Array.from({ length: 1 + (i % 9) }, (_, k) => Math.abs(Math.sin(i * 7 + k)) * 1000);
      const a = E.allocate(total, w, 0.01), b = E.allocate(total, w, 0.01);
      const s = a.reduce((x, y) => x + y, 0);
      if (!near(s, total, 1e-6) || JSON.stringify(a) !== JSON.stringify(b)) bad.push(i);
    }
    return [!bad.length, bad.length ? `fail ${bad[0]}` : "400 splits exact"];
  });
  test("Allocation", "zero-weight parts never receive a leftover unit", () => {
    const a = E.allocate(10, [1, 0, 1, 0, 1], 1);
    return [a[1] === 0 && a[3] === 0 && a.reduce((x, y) => x + y) === 10, JSON.stringify(a)];
  });
  test("Allocation", "negative totals split symmetrically", () => {
    const a = E.allocateSigned(-100, [-30, -30, -40], 1);
    return [a.reduce((x, y) => x + y) === -100 && a.every(v => v <= 0), JSON.stringify(a)];
  });
  test("Allocation", "rounding units 0.01 to 100 respected", () => {
    const bad = E.ROUNDING_UNITS.filter(u => { const v = E.roundTo(1234.5678, u); return !near(v / u, Math.round(v / u), 1e-6); });
    return [!bad.length, bad.join() || "all units"];
  });

  test("Interest", "simple interest = P·r·n", () => {
    const r = run({ rates: { 2020: 10, 2021: 10, 2022: 10 }, cases: [kase({ rounding: "none", compounding: false })] });
    return [near(r.cases[0].returnValue, 30000, 1e-6), `${r.cases[0].returnValue}`];
  });
  test("Interest", "compound interest = P·((1+r)^n − 1)", () => {
    const r = run({ rates: { 2020: 10, 2021: 10, 2022: 10 }, settings: { convention: "inclusiveMonths" }, cases: [kase({ rounding: "none" })] });
    return [near(r.cases[0].returnValue, 100000 * (1.1 ** 3 - 1), 1e-6), `${r.cases[0].returnValue}`];
  });
  test("Interest", "monthly compounding beats annual for a positive rate", () => {
    const a = run({ rates: { 2020: 12 }, cases: [kase({ rounding: "none", end: "2020-12-31" })] }).cases[0].returnValue;
    const m = run({ rates: { 2020: 12 }, cases: [kase({ rounding: "none", end: "2020-12-31", frequency: "monthly" })] }).cases[0].returnValue;
    return [m > a, `annual=${a.toFixed(2)} monthly=${m.toFixed(2)}`];
  });
  test("Interest", "12 monthly periods rebuild the year exactly when simple", () => {
    const r = run({ rates: { 2020: 12 }, settings: { convention: "inclusiveMonths", frequency: "monthly" }, cases: [kase({ rounding: "none", compounding: false, end: "2020-12-31" })] });
    return [near(r.cases[0].returnValue, 12000, 1e-6), `${r.cases[0].returnValue}`];
  });
  test("Interest", "extra rate stacks on table rates; fixed rate only stacks when asked", () => {
    const base = { settings: { extraRate: 2, convention: "inclusiveMonths" }, rates: { 2020: 10 } };
    const a = run({ ...base, cases: [kase({ end: "2020-12-31", rounding: "none" })] }).cases[0].segments[0].appliedRate;
    const b = run({ ...base, cases: [kase({ end: "2020-12-31", rounding: "none", rateSource: "fixed", fixedRate: 5 })] }).cases[0].segments[0].appliedRate;
    const c = run({ ...base, cases: [kase({ end: "2020-12-31", rounding: "none", rateSource: "fixed", fixedRate: 5, fixedRateAddsExtra: true })] }).cases[0].segments[0].appliedRate;
    return [a === 12 && b === 5 && c === 7, `${a} ${b} ${c}`];
  });
  test("Interest", "missing rate years are flagged, block until acknowledged, then resolve", () => {
    const a = run({ rates: { 2020: 10 }, cases: [kase()] });
    const b = run({ rates: { 2020: 10 }, cases: [kase({ acknowledgedYears: [2021, 2022] })] });
    return [a.blocked && a.unresolvedYears.join() === "2021,2022" && !b.blocked && b.missingYears.length === 2, `${a.unresolvedYears} / ${b.unresolvedYears}`];
  });
  test("Interest", "negative rates reduce the amount due and still reconcile", () => {
    const r = run({ rates: { 2020: -5, 2021: -5, 2022: -5 }, cases: [kase()], people: [P("a", "A", "2020-01-01", "2021-12-31"), P("b", "B", "2021-01-01", "2022-12-31")] });
    const s = r.rows.reduce((x, y) => x + y.amount, 0);
    return [r.cases[0].returnValue < 0 && near(s, r.cases[0].due), `ret=${r.cases[0].returnValue} sum=${s} due=${r.cases[0].due}`];
  });

  test("Reconciliation", "segment values always sum to the case return", () => {
    const bad = [];
    E.ROUNDINGS.forEach(rounding => E.CONVENTION_IDS.forEach(convention => {
      const r = run({ settings: { convention }, cases: [kase({ rounding, shortage: 294837.19, start: "2019-04-11", end: "2022-08-23" })] });
      const c = r.cases[0];
      if (!c) { bad.push(`${convention}/${rounding}: excluded`); return; }
      const s = c.segments.reduce((a, x) => a + x.value, 0);
      if (!near(s, c.returnValue, 1e-6)) bad.push(`${convention}/${rounding}`);
    }));
    return [!bad.length, bad.join() || "all combinations"];
  });
  test("Reconciliation", "people always sum to case due across every mode", () => {
    const bad = [];
    E.DISTRIBUTIONS.forEach(distribution => ["blended", "perPeriod"].forEach(investmentMode => E.ROUNDINGS.forEach(rounding => {
      const r = run({ settings: { distribution, investmentMode }, rates: { 2020: 12.75, 2021: 8.75, 2022: 8.75 }, cases: [kase({ rounding, shortage: 137345.5 })], people: [P("a", "Ahmed", "2020-01-01", "2021-06-15", { share: 2 }), P("b", "Mona", "2020-06-01", "2022-12-31", { share: 1 }), P("c", "Sara", "2021-01-01", "2022-03-01", { share: 1.5 })] });
      const c = r.cases[0];
      const s = r.rows.reduce((a, x) => a + x.amount, 0);
      if (!near(s, c.due) || c.unallocated !== 0) bad.push(`${distribution}/${investmentMode}/${rounding}: sum=${s} due=${c.due}`);
    })));
    return [!bad.length, bad.join("; ") || "18 combinations reconcile"];
  });
  test("Reconciliation", "per-person detail rows sum to each person's return", () => {
    const bad = [];
    ["blended", "perPeriod"].forEach(investmentMode => E.ROUNDINGS.forEach(rounding => {
      const r = run({ settings: { investmentMode }, cases: [kase({ rounding, shortage: 91234.56 })], people: [P("a", "A", "2020-02-01", "2021-06-15"), P("b", "B", "2020-06-01", "2022-10-31")] });
      r.rows.forEach(row => {
        const s = r.details.filter(d => d.personId === row.personId).reduce((a, d) => a + d.value, 0);
        if (!near(s, row.returnValue, 1e-6)) bad.push(`${investmentMode}/${rounding}/${row.personId}`);
      });
    }));
    return [!bad.length, bad.join() || "detail = row"];
  });
  test("Reconciliation", "no eligible people leaves the whole due unallocated", () => {
    const r = run({ cases: [kase()] });
    return [r.cases[0].unallocated === r.cases[0].due, `${r.cases[0].unallocated}`];
  });
  test("Reconciliation", "people outside the period leave the due unallocated and warn", () => {
    const r = run({ cases: [kase({ end: "2020-06-30" })], people: [P("a", "A", "2021-01-01", "2021-06-01")] });
    return [r.cases[0].unallocated === r.cases[0].due && r.issues.some(i => i.code === "case.noWeight"), `${r.cases[0].unallocated}`];
  });
  test("Reconciliation", "perPeriod equals blended when one person covers the whole period", () => {
    const a = run({ settings: { investmentMode: "blended" }, rates: { 2020: 10, 2021: 10, 2022: 10 }, cases: [kase({ rounding: "none", shortage: 250000 })], people: [P("a", "A", "2020-01-01", "2022-12-31")] });
    const b = run({ settings: { investmentMode: "perPeriod" }, rates: { 2020: 10, 2021: 10, 2022: 10 }, cases: [kase({ rounding: "none", shortage: 250000 })], people: [P("a", "A", "2020-01-01", "2022-12-31")] });
    return [near(a.rows[0].amount, b.rows[0].amount, 1e-6) && b.cases[0].personAuthoritative, `${a.rows[0].amount} ${b.rows[0].amount}`];
  });
  test("Reconciliation", "perPeriod manual years with full-year days equals blended", () => {
    const cal = E.makeCalendar([5, 6], []);
    const full = y => cal.count(E.dayNumber(y, 1, 1), E.dayNumber(y, 12, 31));
    const mk = investmentMode => run({ settings: { investmentMode }, rates: { 2020: 10, 2021: 10, 2022: 10 }, cases: [kase({ rounding: "none", shortage: 250000, duration: "manual", manualYears: [{ year: 2020, months: 12 }, { year: 2021, months: 12 }, { year: 2022, months: 12 }] })], people: [P("a", "A", "", "", { overrides: { c1: { years: { 2020: full(2020), 2021: full(2021), 2022: full(2022) } } } })] });
    const a = mk("blended").rows[0].amount, b = mk("perPeriod").rows[0].amount;
    return [near(a, b, 1e-6) && near(a, 332750, 1e-6), `${a} ${b}`];
  });
  test("Reconciliation", "grand totals equal the sum of people", () => {
    const r = run({ cases: [kase(), kase({ id: "c2", shortage: 5555.55, start: "2021-03-03", end: "2022-02-02" })], people: [P("a", "A", "2020-01-01", "2021-12-31"), P("b", "B", "", "")] });
    const s = r.people.reduce((a, p) => a + p.amount, 0);
    return [near(s, r.totals.due) && near(r.totals.distributed, r.totals.due), `${s} ${r.totals.due}`];
  });

  test("Distribution", "shares mode splits by share weights", () => {
    const r = run({ settings: { distribution: "shares" }, cases: [kase({ include: { shortage: true, investment: false } })], people: [P("a", "A", "", "", { share: 3 }), P("b", "B", "", "", { share: 1 })] });
    return [r.rows[0].amount === 75000 && r.rows[1].amount === 25000, `${r.rows[0].amount} ${r.rows[1].amount}`];
  });
  test("Distribution", "equal mode ignores dates entirely", () => {
    const r = run({ settings: { distribution: "equal" }, cases: [kase({ include: { shortage: true, investment: false } })], people: [P("a", "A", "2030-01-01", "2030-02-01"), P("b", "B", "", "")] });
    return [r.rows[0].amount === 50000 && r.rows[1].amount === 50000, `${r.rows[0].amount}`];
  });
  test("Distribution", "manual day override beats dates", () => {
    const r = run({ cases: [kase({ include: { shortage: true, investment: false } })], people: [P("a", "A", "2020-01-01", "2022-12-31", { overrides: { c1: { days: 10 } } }), P("b", "B", "2020-01-01", "2022-12-31", { overrides: { c1: { days: 30 } } })] });
    return [r.rows[0].amount === 25000 && r.rows[1].source === "manual", `${r.rows[0].amount}`];
  });
  test("Distribution", "no-schedule case splits by manual weights and reports when missing", () => {
    const a = run({ cases: [kase({ duration: "none" })], people: [P("a", "A", "", "")] });
    const b = run({ cases: [kase({ duration: "none" })], people: [P("a", "A", "", "", { overrides: { c1: { days: 5 } } })] });
    return [a.issues.some(i => i.code === "case.needsManualWeights") && b.rows[0].amount === 100000, "ok"];
  });
  test("Distribution", "calendar presence basis counts every day present", () => {
    const r = run({ settings: { presenceBasis: "calendar" }, cases: [kase({ include: { shortage: true, investment: false } })], people: [P("a", "A", "2020-01-01", "2020-01-31")] });
    return [r.rows[0].weight === 31, `${r.rows[0].weight}`];
  });
  test("Distribution", "coverage gaps are exact and flagged by impact", () => {
    const r = run({ cases: [kase({ start: "2026-03-01", end: "2026-03-15" })], people: [P("a", "A", "2026-03-01", "2026-03-07"), P("b", "B", "2026-03-09", "2026-03-15")] });
    const g = r.cases[0].gaps;
    return [g.length === 1 && g[0].days === 1 && E.toISO(g[0].from) === "2026-03-08", JSON.stringify(g.map(x => E.toISO(x.from)))];
  });
  test("Distribution", "unnamed people are excluded and reported", () => {
    const r = run({ cases: [kase()], people: [P("a", "", "2020-01-01", ""), P("b", "B", "", "")] });
    return [r.rows.length === 1 && r.issues.some(i => i.code === "person.unnamed"), `${r.rows.length}`];
  });

  test("Validation", "every invalid input is excluded with a precise reason", () => {
    const cases = [
      ["noShortage", kase({ shortage: "" })],
      ["noShortage", kase({ shortage: -5 })],
      ["amountTooLarge", kase({ shortage: 2e12 })],
      ["noComponents", kase({ include: { shortage: false, expenses: false, investment: true } })],
      ["invalidDate", kase({ start: "2020-02-30" })],
      ["endBeforeStart", kase({ start: "2022-01-01", end: "2020-01-01" })],
      ["missingDates", kase({ end: "" })],
      ["invalidFixedRate", kase({ rateSource: "fixed", fixedRate: "abc" })],
      ["noInvestmentBasis", kase({ investOn: { shortage: false, expenses: false } })],
      ["invalidManualYears", kase({ duration: "manual", manualYears: [{ year: 2020, months: 13 }] })],
      ["invalidManualYears", kase({ duration: "manual", manualYears: [{ year: 2020, months: 3 }, { year: 2020, months: 3 }] })],
      ["invalidManualYears", kase({ duration: "manual", manualYears: [] })]
    ];
    const bad = cases.filter(([issue, c]) => { const r = run({ cases: [c] }); return !(r.excluded[0] && r.excluded[0].issue === issue); }).map(([i]) => i);
    return [!bad.length, bad.join() || `${cases.length} reasons`];
  });
  test("Validation", "Arabic-Indic digits and thousands separators parse", () => {
    return [E.toNum("١٢٣٬٤٥٦٫٥") === 123456.5 && E.toNum("1,234.5") === 1234.5 && Number.isNaN(E.toNum("")), "ok"];
  });
  test("Validation", "no-investment case with no dates still counts its base", () => {
    const r = run({ settings: { distribution: "equal" }, cases: [kase({ start: "", end: "", include: { shortage: true, expenses: true, investment: false }, expenseRate: 10 })] });
    return [r.cases[0] && r.cases[0].due === 110000, `${r.cases[0] && r.cases[0].due}`];
  });

  test("Property", "600 random scenarios reconcile at every level", () => {
    const fails = [];
    for (let i = 0; i < 600; i++) {
      const rnd = k => { const x = Math.sin(i * 97.13 + k * 13.7) * 10000; return x - Math.floor(x); };
      const pick = (arr, k) => arr[Math.floor(rnd(k) * arr.length)];
      const y1 = 2017 + Math.floor(rnd(1) * 8), y2 = y1 + Math.floor(rnd(2) * 4);
      const people = Array.from({ length: 1 + Math.floor(rnd(3) * 5) }, (_, p) => {
        const a = y1 + Math.floor(rnd(10 + p) * (y2 - y1 + 1)), b = a + Math.floor(rnd(20 + p) * (y2 - a + 1));
        return P("p" + p, "Person " + p, `${a}-0${1 + Math.floor(rnd(30 + p) * 9)}-1${Math.floor(rnd(31 + p) * 9)}`, `${b}-0${1 + Math.floor(rnd(40 + p) * 9)}-2${Math.floor(rnd(41 + p) * 8)}`, { share: 1 + Math.floor(rnd(50 + p) * 4) });
      });
      const r = run({
        settings: { convention: pick(E.CONVENTION_IDS, 4), distribution: pick(E.DISTRIBUTIONS, 5), investmentMode: pick(["blended", "perPeriod"], 6), frequency: pick(E.FREQUENCIES, 7), roundingUnit: pick(E.ROUNDING_UNITS, 8), extraRate: pick([0, 2, -1], 9) },
        cases: [kase({ shortage: Math.round(rnd(11) * 9e7) / 100 + 1000, rounding: pick(E.ROUNDINGS, 12), compounding: rnd(13) > 0.4, expenseRate: pick([0, 10, 12.5], 14), include: { shortage: true, expenses: rnd(15) > 0.5, investment: true }, start: `${y1}-01-1${Math.floor(rnd(16) * 9)}`, end: `${y2}-11-2${Math.floor(rnd(17) * 8)}` })],
        people
      });
      const c = r.cases[0];
      if (!c) continue;
      const seg = c.segments.reduce((a, s) => a + s.value, 0);
      if (!near(seg, c.returnValue, 1e-5)) { fails.push(`#${i} segments`); continue; }
      const sum = r.rows.reduce((a, x) => a + x.amount, 0);
      if (c.weightTotal > 0 && !near(sum, c.due)) fails.push(`#${i} people sum=${sum} due=${c.due}`);
      if (c.weightTotal <= 0 && !near(c.unallocated, c.due)) fails.push(`#${i} unallocated`);
    }
    return [!fails.length, fails.length ? `${fails.length} fail · ${fails[0]}` : "600 scenarios"];
  });
  test("Performance", "200 cases × 300 people over 8 years compute under 1.5s", () => {
    const people = Array.from({ length: 300 }, (_, i) => P("p" + i, "P" + i, `20${17 + (i % 6)}-0${1 + (i % 9)}-15`, `20${22 + (i % 4)}-0${1 + (i % 9)}-20`));
    const cases = Array.from({ length: 200 }, (_, i) => kase({ id: "c" + i, shortage: 1000 + i * 37, start: `20${17 + (i % 5)}-02-10`, end: `20${23 + (i % 3)}-10-20` }));
    const t0 = performance.now();
    const r = run({ settings: { investmentMode: "perPeriod", frequency: "monthly" }, cases, people });
    const ms = performance.now() - t0;
    return [ms < 1500 && r.cases.length === 200, `${ms.toFixed(0)} ms`];
  });

  function runAll() {
    return T.map(t => {
      try { const [pass, detail] = t.fn(); return { group: t.group, name: t.name, pass: !!pass, detail: String(detail || "") }; }
      catch (e) { return { group: t.group, name: t.name, pass: false, detail: "threw " + (e && e.stack || e) }; }
    });
  }
  global.ROIEngineTests = { run: runAll, count: () => T.length };
})(typeof window !== "undefined" ? window : globalThis);

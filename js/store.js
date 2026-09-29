(function (global) {
  "use strict";
  const E = global.ROIEngine;
  const KEY = "roi-calc-v5";
  const LEGACY_KEY = "investment-return-pro";
  const SOURCES_CACHE_KEY = "roi-calc-sources-cache";
  const DEFAULT_SOURCES_URL = "data/sources.json";
  const HISTORY_LIMIT = 120;

  const FALLBACK_SOURCES = {
    schema: 1, version: "builtin", updated: "",
    rateTables: [{ id: "default", name: { ar: "جدول الأسعار المعتمد", en: "Official rate table" }, rates: { 2017: 15.25, 2018: 16.25, 2019: 17.25, 2020: 12.75, 2021: 8.75, 2022: 8.75, 2023: 16.75, 2024: 19.75, 2025: 27.75, 2026: 20.5 } }],
    calendars: [],
    defaults: { convention: "commercial15", frequency: "annual", presenceBasis: "working", distribution: "equal", investmentMode: "blended", roundingUnit: 1, extraRateEnabled: true, extraRate: 2, expenseRate: 10, weekend: [5, 6], currency: "", defaultRateTable: "default" },
    links: { lite: "https://roi-calc-express.vercel.app/" }
  };

  const uid = () => (global.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const str = v => (v === null || v === undefined ? "" : String(v));
  const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  const arr = v => (Array.isArray(v) ? v : []);
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);

  let sources = clone(FALLBACK_SOURCES);
  let sourcesMeta = { origin: "builtin", checkedAt: 0, error: "" };

  function sourceDefaults() {
    const d = Object.assign({}, FALLBACK_SOURCES.defaults, obj(sources.defaults));
    return d;
  }

  function blankCase(s) {
    const st = s || state;
    const exp = st && st.settings ? st.settings.defaultExpenseRate : sourceDefaults().expenseRate;
    return {
      id: uid(), name: "", notes: "", shortage: "", expenseRate: exp === undefined ? 10 : exp, start: "", end: "",
      duration: "dates", manualYears: [],
      include: { shortage: true, expenses: true, investment: true }, investOn: { shortage: true, expenses: true },
      rounding: "total", compounding: true, frequency: null,
      rateSource: "table", rateTable: null, fixedRate: "", fixedRateAddsExtra: false,
      acknowledgedYears: []
    };
  }
  function blankPerson() { return { id: uid(), name: "", join: "", leave: "", share: "", overrides: {} }; }
  function blankMeta() { return { title: "", entity: "", ref: "", preparedBy: "", period: "" }; }
  function blankWorkspace(name) { return { id: uid(), name: name || "", updated: Date.now(), cases: [blankCase()], people: [blankPerson()], meta: blankMeta() }; }

  function defaultSettings() {
    const d = sourceDefaults();
    return {
      convention: oneOf(d.convention, E.CONVENTION_IDS, "commercial15"),
      frequency: oneOf(d.frequency, E.FREQUENCIES, "annual"),
      presenceBasis: d.presenceBasis === "calendar" ? "calendar" : "working",
      distribution: oneOf(d.distribution, E.DISTRIBUTIONS, "equal"),
      investmentMode: d.investmentMode === "perPeriod" ? "perPeriod" : "blended",
      roundingUnit: E.ROUNDING_UNITS.includes(Number(d.roundingUnit)) ? Number(d.roundingUnit) : 1,
      extraRateEnabled: d.extraRateEnabled !== false,
      extraRate: Number.isFinite(Number(d.extraRate)) ? Number(d.extraRate) : 2,
      defaultExpenseRate: Number.isFinite(Number(d.expenseRate)) ? Number(d.expenseRate) : 10,
      weekend: arr(d.weekend).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6),
      holidays: [],
      defaultRateTable: d.defaultRateTable || "default"
    };
  }
  function defaultPrefs() {
    let dark = false;
    try { dark = matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
    const navLang = (global.navigator && navigator.language || "ar").toLowerCase();
    return { lang: navLang.startsWith("en") ? "en" : "ar", theme: "system", numerals: "latn", currency: sourceDefaults().currency || "", decimals: 2, systemDark: dark };
  }
  function defaultUI() { return { view: "cases", reportTab: "ledger", filter: "", peopleFilter: "", settingsSection: "general", collapsed: {}, openBreakdown: {}, showDatedWeights: false, toolsOpen: false, peopleLimit: 150 }; }

  function defaultState() {
    const ws = blankWorkspace("");
    return { schema: 2, prefs: defaultPrefs(), settings: defaultSettings(), rateOverrides: {}, localTables: [], sourcesUrl: "", workspaces: [ws], activeWorkspace: ws.id, ui: defaultUI(), migratedAt: 0 };
  }

  function sanitizeCase(c) {
    const b = blankCase();
    c = obj(c);
    const inc = obj(c.include), on = obj(c.investOn);
    return {
      id: str(c.id) || uid(), name: str(c.name).slice(0, 200), notes: str(c.notes).slice(0, 2000),
      shortage: str(c.shortage), expenseRate: c.expenseRate === undefined ? b.expenseRate : str(c.expenseRate),
      start: E.parseISO(c.start) !== null ? c.start : "", end: E.parseISO(c.end) !== null ? c.end : "",
      duration: oneOf(c.duration, E.DURATIONS, "dates"),
      manualYears: arr(c.manualYears).filter(r => r && typeof r === "object").map(r => ({ id: str(r.id) || uid(), year: str(r.year), months: str(r.months) })),
      include: { shortage: inc.shortage !== false, expenses: inc.expenses === undefined ? true : !!inc.expenses, investment: inc.investment !== false },
      investOn: { shortage: on.shortage !== false, expenses: on.expenses !== false },
      rounding: oneOf(c.rounding, E.ROUNDINGS, "total"), compounding: c.compounding !== false,
      frequency: E.FREQUENCIES.includes(c.frequency) ? c.frequency : null,
      rateSource: c.rateSource === "fixed" ? "fixed" : "table", rateTable: c.rateTable ? str(c.rateTable) : null,
      fixedRate: str(c.fixedRate), fixedRateAddsExtra: !!c.fixedRateAddsExtra,
      acknowledgedYears: [...new Set(arr(c.acknowledgedYears).map(Number).filter(Number.isInteger))]
    };
  }
  function sanitizePerson(p) {
    p = obj(p);
    const overrides = {};
    Object.entries(obj(p.overrides)).forEach(([cid, o]) => {
      o = obj(o);
      const years = {};
      Object.entries(obj(o.years)).forEach(([y, v]) => { if (!E.isBlank(v)) years[y] = str(v); });
      const days = E.isBlank(o.days) ? "" : str(o.days);
      if (days !== "" || Object.keys(years).length) overrides[cid] = { days, years };
    });
    return { id: str(p.id) || uid(), name: str(p.name).slice(0, 200), join: E.parseISO(p.join) !== null ? p.join : "", leave: E.parseISO(p.leave) !== null ? p.leave : "", share: str(p.share), overrides };
  }
  function sanitizeWorkspace(w) {
    w = obj(w);
    const cases = arr(w.cases).map(sanitizeCase);
    const people = arr(w.people).map(sanitizePerson);
    const meta = Object.assign(blankMeta(), obj(w.meta));
    Object.keys(meta).forEach(k => { meta[k] = str(meta[k]).slice(0, 300); });
    return { id: str(w.id) || uid(), name: str(w.name).slice(0, 120), updated: Number(w.updated) || Date.now(), cases: cases.length ? cases : [blankCase()], people: people.length ? people : [blankPerson()], meta };
  }
  function sanitizeSettings(s) {
    const d = defaultSettings();
    s = obj(s);
    const wk = [...new Set(arr(s.weekend === undefined ? d.weekend : s.weekend).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].slice(0, 6).sort((a, b) => a - b);
    const extra = E.toNum(s.extraRate);
    const exp = E.toNum(s.defaultExpenseRate);
    return {
      convention: oneOf(s.convention, E.CONVENTION_IDS, d.convention),
      frequency: oneOf(s.frequency, E.FREQUENCIES, d.frequency),
      presenceBasis: s.presenceBasis === "calendar" ? "calendar" : s.presenceBasis === "working" ? "working" : d.presenceBasis,
      distribution: oneOf(s.distribution, E.DISTRIBUTIONS, d.distribution),
      investmentMode: s.investmentMode === "perPeriod" ? "perPeriod" : s.investmentMode === "blended" ? "blended" : d.investmentMode,
      roundingUnit: E.ROUNDING_UNITS.includes(Number(s.roundingUnit)) ? Number(s.roundingUnit) : d.roundingUnit,
      extraRateEnabled: s.extraRateEnabled === undefined ? d.extraRateEnabled : !!s.extraRateEnabled,
      extraRate: Number.isFinite(extra) ? Math.max(-E.LIMITS.maxRate, Math.min(E.LIMITS.maxRate, extra)) : d.extraRate,
      defaultExpenseRate: Number.isFinite(exp) ? Math.max(0, Math.min(E.LIMITS.maxRate, exp)) : d.defaultExpenseRate,
      weekend: wk,
      holidays: arr(s.holidays).filter(h => h && E.parseISO(h.date) !== null).map(h => ({ id: str(h.id) || uid(), name: str(h.name).slice(0, 120), date: h.date, repeats: !!h.repeats })),
      defaultRateTable: str(s.defaultRateTable) || d.defaultRateTable
    };
  }
  function sanitizeState(raw) {
    const d = defaultState();
    raw = obj(raw);
    const prefs = Object.assign(d.prefs, obj(raw.prefs));
    prefs.lang = prefs.lang === "en" ? "en" : "ar";
    prefs.theme = oneOf(prefs.theme, ["light", "dark", "system"], "system");
    prefs.numerals = prefs.numerals === "arab" ? "arab" : "latn";
    prefs.currency = str(prefs.currency).slice(0, 12);
    prefs.decimals = [0, 2, 3].includes(Number(prefs.decimals)) ? Number(prefs.decimals) : 2;
    const workspaces = arr(raw.workspaces).map(sanitizeWorkspace);
    const ws = workspaces.length ? workspaces : d.workspaces;
    const active = ws.some(w => w.id === raw.activeWorkspace) ? raw.activeWorkspace : ws[0].id;
    const rateOverrides = {};
    Object.entries(obj(raw.rateOverrides)).forEach(([tid, o]) => {
      o = obj(o);
      const set = {};
      Object.entries(obj(o.set)).forEach(([y, v]) => { const n = E.toNum(v); if (/^\d{4}$/.test(y) && Number.isFinite(n)) set[y] = n; });
      const removed = [...new Set(arr(o.removed).map(String).filter(y => /^\d{4}$/.test(y)))];
      if (Object.keys(set).length || removed.length) rateOverrides[tid] = { set, removed };
    });
    const localTables = arr(raw.localTables).filter(x => x && x.id).map(x => {
      const rates = {};
      Object.entries(obj(x.rates)).forEach(([y, v]) => { const n = E.toNum(v); if (/^\d{4}$/.test(y) && Number.isFinite(n)) rates[y] = n; });
      return { id: str(x.id), name: str(x.name).slice(0, 80) || "Custom", rates };
    });
    const ui = Object.assign(defaultUI(), obj(raw.ui));
    ui.view = oneOf(ui.view, ["cases", "people", "report", "reference"], "cases");
    ui.reportTab = oneOf(ui.reportTab, ["ledger", "people", "detail", "explain", "issues"], "ledger");
    ui.collapsed = obj(ui.collapsed); ui.openBreakdown = obj(ui.openBreakdown);
    ui.filter = ""; ui.peopleFilter = ""; ui.peopleLimit = 150;
    return { schema: 2, prefs, settings: sanitizeSettings(raw.settings), rateOverrides, localTables, sourcesUrl: str(raw.sourcesUrl).slice(0, 500), workspaces: ws, activeWorkspace: active, ui, migratedAt: Number(raw.migratedAt) || 0 };
  }

  function migrateLegacy(old) {
    old = obj(old);
    const s = defaultState();
    s.prefs.lang = old.lang === "en" ? "en" : "ar";
    s.prefs.theme = old.theme === "dark" ? "dark" : old.theme === "light" ? "light" : "system";
    s.prefs.numerals = old.numerals === "arab" ? "arab" : "latn";
    s.prefs.currency = str(old.currency).slice(0, 12);
    const st = s.settings;
    const accrual = oneOf(old.accrual, ["commercial15", "actualActual", "inclusiveMonths", "nextWorkingMonth"], "commercial15");
    st.convention = accrual;
    st.presenceBasis = accrual === "actualActual" && old.actualActualPersonBasis === "calendarDays" ? "calendar" : "working";
    st.frequency = oneOf(old.rateFrequency, E.FREQUENCIES, "annual");
    st.distribution = old.distribution === "expanded" ? "days" : "equal";
    st.investmentMode = old.investmentMode === "perPeriod" ? "perPeriod" : "blended";
    st.extraRateEnabled = old.extraRateEnabled !== false;
    if (Number.isFinite(Number(old.extraRate))) st.extraRate = Number(old.extraRate);
    if (Array.isArray(old.weekend)) st.weekend = [...new Set(old.weekend.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].slice(0, 6);
    st.holidays = arr(old.holidays).filter(h => h && E.parseISO(h.date) !== null).map(h => ({ id: uid(), name: str(h.name), date: h.date, repeats: !!h.repeatsAnnually }));
    const official = obj((sources.rateTables.find(t => t.id === "default") || sources.rateTables[0] || {}).rates);
    const tid = (sources.rateTables.find(t => t.id === "default") || sources.rateTables[0] || { id: "default" }).id;
    const set = {}, removed = [];
    Object.entries(obj(old.rates)).forEach(([y, v]) => {
      if (v === "" || v === null) return;
      const n = Number(v);
      if (!Number.isFinite(n) || !/^\d{4}$/.test(y)) return;
      if (official[y] === undefined || Number(official[y]) !== n) set[y] = n;
    });
    arr(old.deletedDefaultRateYears).forEach(y => { if (!(String(y) in set)) removed.push(String(y)); });
    if (Object.keys(set).length || removed.length) s.rateOverrides[tid] = { set, removed };
    const idMap = new Map();
    const cases = arr(old.cases).filter(c => c && typeof c === "object").map(c => {
      let inc = { shortage: c.includeShortage, expenses: c.includeExpenses, investment: c.includeInvestment };
      if (c.includeShortage === undefined) {
        const scope = c.scope || "both";
        inc = { shortage: scope !== "expenses", expenses: scope !== "shortage", investment: c.applyReturn !== false };
      }
      let on = { shortage: c.investmentOnShortage, expenses: c.investmentOnExpenses };
      if (c.investmentOnShortage === undefined) on = c.appliesTo === "shortageOnly" ? { shortage: true, expenses: false } : { shortage: inc.shortage !== false, expenses: inc.expenses !== false };
      const nc = sanitizeCase({
        id: c.id, name: c.name, notes: c.notes, shortage: str(c.shortageValue).replace(/,/g, ""), expenseRate: c.expensesRate === undefined ? 10 : c.expensesRate,
        start: c.startDate, end: c.endDate, duration: oneOf(c.durationMode, ["dates", "manual", "none"], "dates"),
        manualYears: arr(c.manualSegments).map(m => ({ year: m && m.year, months: m && m.months })),
        include: { shortage: inc.shortage !== false, expenses: !!inc.expenses, investment: inc.investment !== false },
        investOn: { shortage: on.shortage !== false, expenses: on.expenses !== false },
        rounding: c.rounding, compounding: c.compounding !== false, frequency: c.rateFrequency,
        rateSource: c.useCustomRate ? "fixed" : "table", fixedRate: c.customRate, fixedRateAddsExtra: c.customRateIncludeExtra === undefined ? true : !!c.customRateIncludeExtra,
        acknowledgedYears: c.acknowledgedMissingYears
      });
      idMap.set(str(c.id), nc.id);
      return nc;
    });
    const people = arr(old.people).filter(p => p && typeof p === "object").map(p => {
      const overrides = {};
      Object.entries(obj(p.manualDays)).forEach(([cid, v]) => { if (!E.isBlank(v)) (overrides[idMap.get(cid) || cid] = overrides[idMap.get(cid) || cid] || { days: "", years: {} }).days = str(v); });
      Object.entries(obj(p.manualSegmentDays)).forEach(([cid, ys]) => {
        const k = idMap.get(cid) || cid;
        overrides[k] = overrides[k] || { days: "", years: {} };
        Object.entries(obj(ys)).forEach(([y, v]) => { if (!E.isBlank(v)) overrides[k].years[y] = str(v); });
      });
      return sanitizePerson({ id: p.id, name: p.name, join: p.joinDate, leave: p.leaveDate, overrides });
    });
    const meta = obj(old.reportMeta);
    const ws = sanitizeWorkspace({ name: "", cases, people, meta: { title: meta.title, entity: meta.entity, ref: meta.refNumber, preparedBy: meta.preparedBy, period: meta.period } });
    s.workspaces = [ws];
    s.activeWorkspace = ws.id;
    s.ui.view = oneOf(old.view === "references" ? "reference" : old.view, ["cases", "people", "report", "reference"], "cases");
    s.migratedAt = Date.now();
    return s;
  }

  function loadSourcesCache() {
    try {
      const c = JSON.parse(localStorage.getItem(SOURCES_CACHE_KEY) || "null");
      if (c && c.data && validSources(c.data)) { sources = normalizeSources(c.data); sourcesMeta = { origin: "cache", checkedAt: c.at || 0, error: "" }; }
    } catch (e) {}
  }
  function validSources(d) { return d && typeof d === "object" && Array.isArray(d.rateTables); }
  function normalizeSources(d) {
    const out = { schema: d.schema || 1, version: str(d.version), updated: str(d.updated), notes: str(d.notes), rateTables: [], calendars: [], defaults: Object.assign({}, FALLBACK_SOURCES.defaults, obj(d.defaults)), links: Object.assign({}, FALLBACK_SOURCES.links, obj(d.links)) };
    const seen = new Set();
    arr(d.rateTables).forEach(t => {
      if (!t || !t.id || seen.has(String(t.id))) return;
      seen.add(String(t.id));
      const rates = {};
      Object.entries(obj(t.rates)).forEach(([y, v]) => { const n = E.toNum(v); if (/^\d{4}$/.test(y) && Number.isFinite(n)) rates[y] = n; });
      out.rateTables.push({ id: String(t.id), name: t.name, description: t.description, source: str(t.source), rates });
    });
    arr(d.calendars).forEach(c => {
      if (!c || !c.id) return;
      out.calendars.push({ id: String(c.id), name: c.name, weekend: arr(c.weekend).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6), holidays: arr(c.holidays).filter(h => h && E.parseISO(h.date) !== null).map(h => ({ name: h.name, date: h.date, repeats: !!h.repeats })) });
    });
    if (!out.rateTables.length) out.rateTables = clone(FALLBACK_SOURCES.rateTables);
    return out;
  }
  async function fetchSources(url) {
    const target = url || state.sourcesUrl || DEFAULT_SOURCES_URL;
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 8000);
    try {
      const res = await fetch(target, { cache: "no-cache", signal: ctrl ? ctrl.signal : undefined });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!validSources(data)) throw new Error("format");
      const prevVersion = sources.version;
      sources = normalizeSources(data);
      sourcesMeta = { origin: "network", checkedAt: Date.now(), error: "" };
      try { localStorage.setItem(SOURCES_CACHE_KEY, JSON.stringify({ at: Date.now(), url: target, data })); } catch (e) {}
      return { ok: true, changed: prevVersion !== sources.version, version: sources.version };
    } catch (e) {
      sourcesMeta = Object.assign({}, sourcesMeta, { error: e && e.name === "AbortError" ? "timeout" : String(e && e.message || e), checkedAt: Date.now() });
      return { ok: false, error: sourcesMeta.error };
    } finally { clearTimeout(timer); }
  }

  function localizedName(n, lang) {
    if (!n) return "";
    if (typeof n === "string") return n;
    return n[lang] || n.en || n.ar || "";
  }
  function allTables(lang) {
    const list = [];
    sources.rateTables.forEach(t => {
      const o = state.rateOverrides[t.id] || { set: {}, removed: [] };
      const rates = {};
      Object.entries(t.rates).forEach(([y, v]) => { if (!o.removed.includes(y)) rates[y] = v; });
      Object.entries(o.set).forEach(([y, v]) => { rates[y] = v; });
      list.push({ id: t.id, name: localizedName(t.name, lang) || t.id, description: localizedName(t.description, lang), official: t.rates, overrides: o, rates, local: false, source: t.source });
    });
    state.localTables.forEach(t => list.push({ id: t.id, name: t.name, description: "", official: {}, overrides: { set: {}, removed: [] }, rates: Object.assign({}, t.rates), local: true }));
    return list;
  }
  function defaultTableId() {
    const ids = allTables().map(t => t.id);
    return ids.includes(state.settings.defaultRateTable) ? state.settings.defaultRateTable : ids[0] || null;
  }
  function ws() { return state.workspaces.find(w => w.id === state.activeWorkspace) || state.workspaces[0]; }

  function engineInput() {
    const tables = {};
    allTables().forEach(t => { tables[t.id] = t.rates; });
    const S = state.settings;
    const w = ws();
    return {
      settings: { convention: S.convention, frequency: S.frequency, presenceBasis: S.presenceBasis, distribution: S.distribution, investmentMode: S.investmentMode, roundingUnit: S.roundingUnit, extraRate: S.extraRateEnabled ? S.extraRate : 0, weekend: S.weekend, holidays: S.holidays },
      rateTables: tables, defaultRateTable: defaultTableId(), cases: w.cases, people: w.people
    };
  }

  let version = 0;
  let memo = { v: -1, r: null };
  function result() {
    if (memo.v === version) return memo.r;
    const input = engineInput();
    const r = E.compute(input);
    r.hash = E.hash({ s: input.settings, t: input.rateTables, d: input.defaultRateTable });
    memo = { v: version, r };
    return r;
  }

  let state = null;
  let past = [], future = [];
  let lastTag = null, lastTagAt = 0;
  let saveTimer = null, lastSavedAt = 0, saveError = "";
  const listeners = new Set();

  function historySnapshot() { return JSON.stringify({ settings: state.settings, rateOverrides: state.rateOverrides, localTables: state.localTables, workspaces: state.workspaces, activeWorkspace: state.activeWorkspace }); }
  function restoreSnapshot(snap) {
    const s = JSON.parse(snap);
    state.settings = s.settings; state.rateOverrides = s.rateOverrides; state.localTables = s.localTables; state.workspaces = s.workspaces; state.activeWorkspace = s.activeWorkspace;
  }

  function commit(fn, opts) {
    opts = opts || {};
    const now = Date.now();
    const coalesce = opts.tag && opts.tag === lastTag && now - lastTagAt < 1200;
    const before = opts.history === false || coalesce ? null : historySnapshot();
    const out = fn(state);
    if (before) { past.push(before); if (past.length > HISTORY_LIMIT) past.shift(); future = []; }
    lastTag = opts.tag || null; lastTagAt = now;
    if (opts.data !== false) { version++; const w = ws(); if (w) w.updated = now; }
    scheduleSave(opts.immediate);
    emit(opts);
    return out;
  }
  function ui(fn) { fn(state.ui); scheduleSave(); emit({ ui: true }); }
  function prefs(fn) { fn(state.prefs); version++; scheduleSave(); emit({ prefs: true }); }
  function undo() {
    if (!past.length) return false;
    future.push(historySnapshot());
    restoreSnapshot(past.pop());
    lastTag = null; version++; scheduleSave(); emit({ history: true });
    return true;
  }
  function redo() {
    if (!future.length) return false;
    past.push(historySnapshot());
    restoreSnapshot(future.pop());
    lastTag = null; version++; scheduleSave(); emit({ history: true });
    return true;
  }
  function breakCoalesce() { lastTag = null; }

  function scheduleSave(now) {
    clearTimeout(saveTimer);
    if (now) saveNow(); else saveTimer = setTimeout(saveNow, 400);
  }
  let suspended = false;
  function saveNow() {
    clearTimeout(saveTimer);
    if (suspended || !state) return true;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      lastSavedAt = Date.now(); saveError = "";
      emit({ saved: true, silent: true });
      return true;
    } catch (e) {
      saveError = e && e.name === "QuotaExceededError" ? "quota" : "failed";
      emit({ saveError, silent: true });
      return false;
    }
  }
  function emit(info) { listeners.forEach(fn => { try { fn(info || {}); } catch (e) { console.error(e); } }); }

  function load() {
    loadSourcesCache();
    let raw = null, migrated = false, corrupt = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try { state = sanitizeState(JSON.parse(raw)); }
      catch (e) { corrupt = raw; }
    }
    if (!state) {
      let legacy = null;
      try { legacy = localStorage.getItem(LEGACY_KEY); } catch (e) {}
      if (legacy) {
        try { state = sanitizeState(migrateLegacy(JSON.parse(legacy))); migrated = true; }
        catch (e) { corrupt = corrupt || legacy; }
      }
    }
    if (corrupt) { try { localStorage.setItem(KEY + "-backup-" + Date.now(), corrupt); } catch (e) {} }
    if (!state) state = defaultState();
    if (migrated) saveNow();
    return { migrated, corrupt: !!corrupt };
  }

  function exportPayload() {
    return { app: "roi-calculator", schema: 2, engine: E.VERSION, exportedAt: new Date().toISOString(), sourcesVersion: sources.version, settings: state.settings, rateOverrides: state.rateOverrides, localTables: state.localTables, workspace: ws(), prefs: { currency: state.prefs.currency } };
  }
  function importPayload(data) {
    data = obj(data);
    let w, settings = null, rateOverrides = null, localTables = null;
    if (data.app === "roi-calculator" && data.workspace) {
      w = sanitizeWorkspace(data.workspace);
      settings = data.settings ? sanitizeSettings(data.settings) : null;
      rateOverrides = data.rateOverrides ? sanitizeState({ rateOverrides: data.rateOverrides }).rateOverrides : null;
      localTables = data.localTables ? sanitizeState({ localTables: data.localTables }).localTables : null;
    } else if (data.schema === 2 && Array.isArray(data.workspaces)) {
      const s = sanitizeState(data);
      w = s.workspaces.find(x => x.id === s.activeWorkspace) || s.workspaces[0];
      settings = s.settings; rateOverrides = s.rateOverrides; localTables = s.localTables;
    } else if (Array.isArray(data.cases) || data.__app === "investment-return-pro" || data.rates || data.accrual) {
      const s = sanitizeState(migrateLegacy(data));
      w = s.workspaces[0];
      if (data.accrual || data.distribution || data.weekend || data.holidays) settings = s.settings;
      if (data.rates) rateOverrides = s.rateOverrides;
    } else throw new Error("format");
    w.id = uid();
    if (!w.name) w.name = data.workspace && data.workspace.name || "";
    commit(st => {
      if (settings) st.settings = settings;
      if (rateOverrides) Object.assign(st.rateOverrides, rateOverrides);
      if (localTables) localTables.forEach(t => { if (!st.localTables.some(x => x.id === t.id)) st.localTables.push(t); });
      st.workspaces.push(w);
      st.activeWorkspace = w.id;
    });
    return w;
  }

  function storageUsage() {
    let n = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += (k.length + (localStorage.getItem(k) || "").length) * 2; } } catch (e) {}
    return n;
  }

  global.Store = {
    KEY, LEGACY_KEY, DEFAULT_SOURCES_URL,
    load, commit, ui, prefs, undo, redo, breakCoalesce, saveNow,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    get state() { return state; },
    get sources() { return sources; },
    get sourcesMeta() { return sourcesMeta; },
    get version() { return version; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    get lastSavedAt() { return lastSavedAt; },
    get saveError() { return saveError; },
    suspend() { suspended = true; clearTimeout(saveTimer); },
    ws, result, engineInput, allTables, defaultTableId, localizedName, fetchSources,
    blankCase, blankPerson, blankWorkspace, defaultSettings, sanitizeCase, sanitizePerson,
    migrateLegacy, sanitizeState, exportPayload, importPayload, storageUsage, uid, clone,
    invalidate() { version++; }
  };
})(typeof window !== "undefined" ? window : globalThis);

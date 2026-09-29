(function (global) {
  "use strict";
  const E = global.ROIEngine, I = global.I18N, U = global.UI, St = global.Store, V = global.Views, P = global.Panels;
  const { esc, ICON } = U;
  const t = (k, p) => I.t(k, p);
  const root = document.getElementById("app");
  let settingsDlg = null, issuesDlg = null, paletteDlg = null;
  let raf = 0, tweenVals = new Map(), installEvt = null;
  const A = {};

  function applyChrome() {
    const s = St.state;
    I.set(s.prefs.lang);
    U.setPrefs({ lang: s.prefs.lang, numerals: s.prefs.numerals, currency: s.prefs.currency, decimals: s.prefs.decimals });
    const html = document.documentElement;
    const dir = s.prefs.lang === "ar" ? "rtl" : "ltr";
    if (html.dir !== dir) html.dir = dir;
    if (html.lang !== s.prefs.lang) html.lang = s.prefs.lang;
    const theme = V.resolvedTheme();
    if (html.dataset.theme !== theme) html.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#141413" : "#faf9f5";
    const title = t("app.title");
    if (document.title !== title) document.title = title;
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(render); }
  function render() {
    raf = 0;
    applyChrome();
    const r = St.result();
    const view = St.state.ui.view;
    const body = view === "people" ? V.people(r) : view === "report" ? V.report(r) : view === "reference" ? V.reference(r) : V.cases(r);
    U.morph(root, V.topbar(r) + `<main id="main" data-key="main">${body}</main>`);
    if (settingsDlg) U.morph(settingsDlg, P.settingsHTML());
    if (issuesDlg) { const b = issuesDlg.querySelector("#issuesBody"); if (b) U.morph(issuesDlg, P.issuesHTML(r)); }
    after();
  }
  function after() {
    placePill(document.getElementById("mainNav"), '[aria-selected="true"]');
    placePill(document.getElementById("reportTabs"), '[aria-selected="true"]');
    syncInstall();
    root.querySelectorAll("[data-tween]").forEach(el => {
      const k = el.dataset.tween, to = Number(el.dataset.val);
      const from = tweenVals.get(k);
      tweenVals.set(k, to);
      if (from === undefined || Math.abs(from - to) < 0.005 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const kpi = el.closest(".kpi");
      if (kpi) { kpi.classList.remove("bump"); void kpi.offsetWidth; kpi.classList.add("bump"); }
      const start = performance.now();
      const step = now => {
        if (!el.isConnected || Number(el.dataset.val) !== to) return;
        const p = Math.min(1, (now - start) / 480);
        el.textContent = U.money(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  function placePill(rail, sel) {
    if (!rail) return;
    const pill = rail.querySelector(".navPill"), act = rail.querySelector(sel);
    if (!pill || !act) return;
    const rr = rail.getBoundingClientRect(), ar = act.getBoundingClientRect();
    const x = ar.left - rr.left + rail.scrollLeft;
    const first = !pill.classList.contains("on");
    if (first) pill.style.transition = "none";
    pill.style.width = ar.width + "px";
    pill.style.transform = `translateX(${x}px)`;
    if (first) { void pill.offsetWidth; pill.style.transition = ""; pill.classList.add("on"); }
  }

  function getPath(o, path) { return path.split(".").reduce((a, k) => (a ? a[k] : undefined), o); }
  function setPath(o, path, v) { const ks = path.split("."); const last = ks.pop(); const tgt = ks.reduce((a, k) => (a[k] = a[k] || {}), o); tgt[last] = v; }
  function readValue(el) {
    const ty = el.dataset.t;
    if (ty === "bool") return el.checked;
    if (ty === "money") return el.value.replace(/[,٬\s]/g, "");
    if (ty === "date") { const iso = U.parseDateInput(el.value); return iso === null ? el.value.trim() : iso; }
    return el.value;
  }
  function findCase(id) { return St.ws().cases.find(c => c.id === id); }
  function findPerson(id) { return St.ws().people.find(p => p.id === id); }

  function bind(el) {
    const b = el.dataset.b, k = el.dataset.k, id = el.dataset.id;
    const v = readValue(el);
    const tag = `${b}:${id || ""}:${k || ""}:${el.dataset.y || ""}:${el.dataset.row || ""}:${el.dataset.cid || ""}`;
    if (el.dataset.t === "date") el.classList.toggle("bad", v !== "" && E.parseISO(v) === null);
    switch (b) {
      case "case": St.commit(() => {
        const c = findCase(id); if (!c) return;
        let val = v;
        if (k === "rateTable" || k === "frequency") val = v || null;
        setPath(c, k, val);
      }, { tag }); break;
      case "my": St.commit(() => { const c = findCase(id); const m = c && c.manualYears.find(x => x.id === el.dataset.row); if (m) m[k] = v; }, { tag }); break;
      case "person": St.commit(() => { const p = findPerson(id); if (p) p[k] = v; }, { tag }); break;
      case "ovr": St.commit(() => {
        const p = findPerson(el.dataset.pid); if (!p) return;
        const cid = el.dataset.cid;
        const o = p.overrides[cid] || (p.overrides[cid] = { days: "", years: {} });
        if (el.dataset.y) { if (E.isBlank(v)) delete o.years[el.dataset.y]; else o.years[el.dataset.y] = v; }
        else o.days = E.isBlank(v) ? "" : v;
        if (!o.days && !Object.keys(o.years).length) delete p.overrides[cid];
      }, { tag }); break;
      case "meta": St.commit(() => { St.ws().meta[k] = v; }, { tag }); break;
      case "ui": St.ui(u => { u[k] = v; if (k === "peopleFilter") u.peopleLimit = 150; }); break;
      case "pref": St.prefs(p => {
        if (k === "numerals") p.numerals = v ? "arab" : "latn";
        else if (k === "decimals") p.decimals = Number(v);
        else p[k] = String(v).slice(0, 12);
      }); break;
      case "set": {
        let val = v;
        if (["extraRate", "defaultExpenseRate"].includes(k)) { val = E.toNum(v); if (!Number.isFinite(val)) return; }
        if (k === "roundingUnit") val = Number(v);
        St.commit(s => { s.settings[k] = val; }, { tag });
        break;
      }
      case "rate": {
        const n = E.toNum(v);
        if (!Number.isFinite(n)) { el.classList.toggle("bad", !E.isBlank(v)); return; }
        el.classList.remove("bad");
        setRate(el.dataset.table, el.dataset.y, n, tag);
        if (el.hasAttribute("data-pending")) P.pendingYears = P.pendingYears.filter(y => String(y) !== el.dataset.y);
        break;
      }
      case "tableName": St.commit(s => { const tb = s.localTables.find(x => x.id === el.dataset.table); if (tb) tb.name = v.slice(0, 80) || tb.name; }, { tag }); break;
      case "hol": {
        if (k === "date" && E.parseISO(v) === null) return;
        St.commit(s => { const h = s.settings.holidays.find(x => x.id === id); if (h) h[k] = k === "name" ? v.slice(0, 120) : v; }, { tag });
        break;
      }
    }
  }
  function setRate(tableId, y, n, tag) {
    St.commit(s => {
      const lt = s.localTables.find(x => x.id === tableId);
      if (lt) { lt.rates[y] = n; return; }
      const official = (St.sources.rateTables.find(x => x.id === tableId) || { rates: {} }).rates;
      const o = s.rateOverrides[tableId] || (s.rateOverrides[tableId] = { set: {}, removed: [] });
      if (official[y] !== undefined && Number(official[y]) === n) delete o.set[y]; else o.set[y] = n;
      o.removed = o.removed.filter(x => x !== y);
      if (!Object.keys(o.set).length && !o.removed.length) delete s.rateOverrides[tableId];
    }, { tag });
  }

  function undoableToast(msg) {
    const v = St.version;
    U.toast(msg, { action: t("act.undo"), onAction: () => { if (St.version === v && St.undo()) U.toast(t("toast.undone")); else U.toast(t("toast.nothingUndo")); } });
  }
  function setView(v) { St.ui(u => { u.view = v; }); window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" }); }
  function focusLater(sel) { requestAnimationFrame(() => requestAnimationFrame(() => { const el = document.querySelector(sel); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "center", behavior: "smooth" }); } })); }

  A.view = el => setView(el.dataset.view);
  A.undo = () => { if (!St.undo()) U.toast(t("toast.nothingUndo")); };
  A.redo = () => { St.redo(); };
  A.theme = () => {
    const go = () => St.prefs(p => { p.theme = V.resolvedTheme() === "dark" ? "light" : "dark"; });
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(() => { go(); render(); }); else go();
  };
  A.lang = () => St.prefs(p => { p.lang = p.lang === "ar" ? "en" : "ar"; });
  A.setPref = el => St.prefs(p => { p[el.dataset.k] = el.dataset.v; if (el.dataset.k === "lang" && el.dataset.v !== "ar") p.numerals = "latn"; });
  A.setSetting = el => {
    const k = el.dataset.k, v = el.dataset.v;
    if (St.state.settings[k] === v) return;
    St.commit(s => { s.settings[k] = v; });
  };

  A.addCase = () => {
    const c = St.commit(() => { const c = St.blankCase(); St.ws().cases.push(c); return c; });
    if (St.state.ui.view !== "cases") setView("cases");
    focusLater(`#case-${CSS.escape(c.id)} .caseName`);
  };
  A.toggleCase = el => St.ui(u => { u.collapsed[el.dataset.id] = !u.collapsed[el.dataset.id]; if (!u.collapsed[el.dataset.id]) delete u.collapsed[el.dataset.id]; });
  A.toggleAll = () => { const cs = St.ws().cases; const all = cs.every(c => St.state.ui.collapsed[c.id]); St.ui(u => { u.collapsed = {}; if (!all) cs.forEach(c => { u.collapsed[c.id] = true; }); }); };
  A.toggleBreakdown = el => St.ui(u => { u.openBreakdown[el.dataset.id] = !u.openBreakdown[el.dataset.id]; });
  A.caseSet = el => {
    const k = el.dataset.k; let v = el.dataset.v;
    if (k === "compounding") v = v === "true";
    St.commit(() => { const c = findCase(el.dataset.id); if (c) c[k] = v; if (c && k === "duration" && v === "manual" && !c.manualYears.length) { const y = new Date().getFullYear(); c.manualYears.push({ id: St.uid(), year: String(y - 1), months: "12" }); } });
  };
  A.caseToggle = el => St.commit(() => { const c = findCase(el.dataset.id); if (c) setPath(c, el.dataset.k, !getPath(c, el.dataset.k)); });
  A.addManualYear = el => {
    const row = St.commit(() => {
      const c = findCase(el.dataset.id); if (!c) return null;
      const ys = c.manualYears.map(m => Number(m.year)).filter(Number.isFinite);
      const m = { id: St.uid(), year: String(ys.length ? Math.max(...ys) + 1 : new Date().getFullYear()), months: "12" };
      c.manualYears.push(m); return m;
    });
    if (row) focusLater(`[data-row="${CSS.escape(row.id)}"][data-k="months"]`);
  };
  A.removeManualYear = el => St.commit(() => { const c = findCase(el.dataset.id); if (c) c.manualYears = c.manualYears.filter(m => m.id !== el.dataset.row); });
  A.caseMenu = el => {
    const id = el.dataset.id, cs = St.ws().cases, i = cs.findIndex(c => c.id === id);
    U.menu(el, [
      { label: t("act.duplicate"), icon: "copy", run: () => dupCase(id) },
      { label: t("case.moveUp"), icon: "up", disabled: i <= 0, run: () => moveCase(id, -1) },
      { label: t("case.moveDown"), icon: "down", disabled: i >= cs.length - 1, run: () => moveCase(id, 1) },
      { label: t("case.applyLogic"), icon: "applyAll", disabled: cs.length < 2, run: () => A.applyLogic({ dataset: { id } }) },
      "-",
      { label: t("act.remove"), icon: "trash", danger: true, run: () => removeCase(id) }
    ], { alignEnd: true });
  };
  function dupCase(id) {
    const n = St.commit(() => {
      const cs = St.ws().cases, i = cs.findIndex(c => c.id === id);
      const c = St.clone(cs[i]);
      c.id = St.uid(); c.name = `${V.caseLabel(cs[i], i)} ${t("case.copySuffix")}`;
      c.manualYears.forEach(m => { m.id = St.uid(); });
      cs.splice(i + 1, 0, c);
      St.ws().people.forEach(p => { if (p.overrides[id]) p.overrides[c.id] = St.clone(p.overrides[id]); });
      return c;
    });
    focusLater(`#case-${CSS.escape(n.id)} .caseName`);
  }
  function moveCase(id, d) { St.commit(() => { const cs = St.ws().cases, i = cs.findIndex(c => c.id === id), j = i + d; if (j < 0 || j >= cs.length) return; [cs[i], cs[j]] = [cs[j], cs[i]]; }); }
  function removeCase(id) {
    St.commit(() => { const w = St.ws(); w.cases = w.cases.filter(c => c.id !== id); if (!w.cases.length) w.cases.push(St.blankCase()); });
    undoableToast(t("case.deleted"));
  }
  A.applyLogic = async el => {
    if (!(await U.confirm(t("case.applyLogicConfirm")))) return;
    St.commit(() => {
      const src = findCase(el.dataset.id);
      St.ws().cases.forEach(c => { if (c.id === src.id) return; ["rounding", "compounding", "frequency", "rateSource", "rateTable", "fixedRate", "fixedRateAddsExtra"].forEach(k => { c[k] = St.clone(src[k]); }); });
    });
    undoableToast(t("case.applied"));
  };
  A.clearWorkspace = async () => {
    if (!(await U.confirm(t("case.clearConfirm"), { danger: true }))) return;
    St.commit(() => { const w = St.ws(); w.cases = [St.blankCase()]; w.people = [St.blankPerson()]; });
    V.selected.clear();
    undoableToast(t("case.cleared"));
  };

  A.addPerson = () => {
    const p = St.commit(() => {
      const ps = St.ws().people;
      const last = ps[ps.length - 1];
      const np = St.blankPerson();
      const first = St.ws().cases.find(c => c.duration === "dates");
      np.join = (last && last.join) || (first && first.start) || "";
      np.leave = (last && last.leave) || (first && first.end) || "";
      if (ps.length === 1 && !ps[0].name.trim() && !ps[0].join && !ps[0].leave) { ps[0].join = np.join; ps[0].leave = np.leave; return ps[0]; }
      ps.push(np); return np;
    });
    if (St.state.ui.view !== "people") setView("people");
    St.ui(u => { u.peopleFilter = ""; const idx = St.ws().people.indexOf(p); if (idx >= u.peopleLimit) u.peopleLimit = idx + 50; });
    focusLater(`#person-${CSS.escape(p.id)} [data-k="name"]`);
  };
  A.removePerson = el => {
    const id = el.dataset.id;
    const name = (findPerson(id) || {}).name || "";
    St.commit(() => { const w = St.ws(); w.people = w.people.filter(p => p.id !== id); if (!w.people.length) w.people.push(St.blankPerson()); });
    V.selected.delete(id);
    undoableToast(t("people.deleted", { n: name || U.numText(1, 0) }));
  };
  A.dupPerson = el => {
    const n = St.commit(() => {
      const ps = St.ws().people, i = ps.findIndex(p => p.id === el.dataset.id);
      const c = St.clone(ps[i]); c.id = St.uid(); c.name = c.name ? uniqueName(c.name, c.id) : "";
      ps.splice(i + 1, 0, c); return c;
    });
    focusLater(`#person-${CSS.escape(n.id)} [data-k="name"]`);
  };
  A.personSameAsCase = el => {
    const c = St.ws().cases.find(x => x.duration === "dates" && (x.start || x.end));
    if (!c) return;
    St.commit(() => { const p = findPerson(el.dataset.id); if (p) { p.join = c.start; p.leave = c.end; } });
  };
  A.selPerson = el => { el.checked ? V.selected.add(el.dataset.id) : V.selected.delete(el.dataset.id); schedule(); };
  A.selAll = el => {
    const q = St.state.ui.peopleFilter.trim().toLowerCase();
    const list = St.ws().people.filter(p => !q || p.name.toLowerCase().includes(q)).slice(0, St.state.ui.peopleLimit);
    list.forEach(p => (el.checked ? V.selected.add(p.id) : V.selected.delete(p.id)));
    schedule();
  };
  A.clearSel = () => { V.selected.clear(); schedule(); };
  A.deleteSelected = async () => {
    const n = V.selected.size; if (!n) return;
    if (!(await U.confirm(t("people.confirmDelete", { n: U.numText(n, 0) }), { danger: true }))) return;
    const ids = new Set(V.selected);
    St.commit(() => { const w = St.ws(); w.people = w.people.filter(p => !ids.has(p.id)); if (!w.people.length) w.people.push(St.blankPerson()); });
    V.selected.clear();
    undoableToast(t("people.deleted", { n: U.numText(n, 0) }));
  };
  A.morePeople = () => St.ui(u => { u.peopleLimit += 300; });
  A.toggleTools = () => St.ui(u => { u.toolsOpen = !u.toolsOpen; });
  A.peopleMenu = el => {
    const dated = St.ws().cases.some(c => c.duration === "dates" && (c.start || c.end));
    U.menu(el, [
      { label: t("people.fillDates"), icon: "calendar", disabled: !dated, run: () => fillDates(false) },
      { label: t("people.fillDatesAll"), icon: "calendar", disabled: !dated, run: () => fillDates(true) },
      "-",
      { label: t("people.upload"), icon: "upload", run: () => A.uploadPeople() },
      { label: t("people.template"), icon: "file", run: () => A.peopleTemplate() },
      "-",
      { label: t("people.deleteAll"), icon: "trash", danger: true, run: () => deleteAllPeople() }
    ], { alignEnd: true });
  };
  A.fillDates = el => fillDates(el.dataset.all === "1");
  function fillDates(all) {
    const c = St.ws().cases.find(x => x.duration === "dates" && (x.start || x.end));
    if (!c) return;
    let n = 0;
    St.commit(() => St.ws().people.forEach(p => {
      let ch = false;
      if (c.start && (all || !p.join)) { p.join = c.start; ch = true; }
      if (c.end && (all || !p.leave)) { p.leave = c.end; ch = true; }
      if (ch) n++;
    }));
    undoableToast(t("people.filled", { n: U.numText(n, 0) }));
  }
  async function deleteAllPeople() {
    const n = St.ws().people.filter(p => p.name.trim() || p.join || p.leave).length;
    if (!n) return;
    if (!(await U.confirm(t("people.confirmDelete", { n: U.numText(n, 0) }), { danger: true }))) return;
    St.commit(() => { St.ws().people = [St.blankPerson()]; });
    V.selected.clear();
    undoableToast(t("people.deleted", { n: U.numText(n, 0) }));
  }
  function uniqueName(name, selfId) {
    const base = String(name).trim(); if (!base) return name;
    const taken = new Set(St.ws().people.filter(p => p.id !== selfId).map(p => p.name.trim().toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    const stem = base.replace(/\s*\(\d+\)$/, "");
    let i = 2; while (taken.has(`${stem} (${i})`.toLowerCase())) i++;
    return `${stem} (${i})`;
  }
  function addPeopleRows(rows) {
    const clean = rows.filter(r => r && String(r[0] || "").trim());
    if (!clean.length) { U.toast(t("people.importNone")); return 0; }
    if (/^(name|الاسم|اسم|person|الشخص)/i.test(String(clean[0][0]).trim()) || (clean[0].length > 1 && clean[0][1] && !U.flexDate(clean[0][1]) && /[a-z\u0600-\u06ff]/i.test(String(clean[0][1])))) clean.shift();
    let n = 0;
    St.commit(() => {
      const ps = St.ws().people;
      if (ps.length === 1 && !ps[0].name.trim() && !ps[0].join && !ps[0].leave) ps.pop();
      clean.forEach(r => {
        const p = St.blankPerson();
        p.name = String(r[0]).trim().slice(0, 200);
        p.name = uniqueName(p.name, p.id);
        p.join = U.flexDate(r[1]) || ""; p.leave = U.flexDate(r[2]) || "";
        if (r[3] !== undefined && r[3] !== "" && Number.isFinite(E.toNum(r[3]))) p.share = String(E.toNum(r[3]));
        ps.push(p); n++;
      });
      if (!ps.length) ps.push(St.blankPerson());
    });
    undoableToast(t("people.imported", { n: U.numText(n, 0) }));
    return n;
  }
  A.pastePeople = () => { const ta = document.getElementById("pasteArea"); if (!ta || !ta.value.trim()) return; if (addPeopleRows(U.parseDelimited(ta.value))) ta.value = ""; };
  A.bulkAdd = () => {
    const n = Math.max(0, Math.min(500, Math.round(E.toNum((document.getElementById("bulkCount") || {}).value) || 0)));
    if (!n) { const el = document.getElementById("bulkCount"); el && el.classList.add("shake"); setTimeout(() => el && el.classList.remove("shake"), 300); return; }
    const prefix = ((document.getElementById("bulkPrefix") || {}).value || "").trim();
    let maxN = 0;
    if (prefix) { const re = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+(\\d+)$"); St.ws().people.forEach(p => { const m = re.exec(p.name.trim()); if (m) maxN = Math.max(maxN, +m[1]); }); }
    const last = St.ws().people[St.ws().people.length - 1] || {};
    addPeopleRows(Array.from({ length: n }, (_, i) => [prefix ? `${prefix} ${maxN + i + 1}` : `${t("pal.person")} ${St.ws().people.length + i + 1}`, last.join || "", last.leave || ""]));
  };
  A.uploadPeople = async () => {
    const f = await U.pickFile(".xlsx,.xls,.csv,.txt,.tsv");
    if (!f) return;
    try {
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        U.toast(t("toast.xlsxLoading"));
        const X = await U.loadXLSX();
        const wb = X.read(await U.readFile(f, true), { type: "array", cellDates: true });
        const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
        addPeopleRows(rows);
      } else addPeopleRows(U.parseDelimited(await U.readFile(f)));
    } catch (e) { U.toast(e && e.message === "xlsx" ? t("toast.xlsxFail") : t("data.importFail")); }
  };
  A.peopleTemplate = () => {
    const h = [t("people.name"), t("people.join"), t("people.leave"), t("people.share")];
    const body = [h, [I.lang === "ar" ? "أحمد محمد" : "Ahmed Mohamed", "2025-09-25", "2026-06-26", "1"], [I.lang === "ar" ? "سارة علي" : "Sara Ali", "", "", ""]].map(r => r.map(U.csvCell).join(",")).join("\r\n");
    U.download(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }), "people-template.csv");
  };

  A.reportTab = el => St.ui(u => { u.reportTab = el.dataset.tab; });
  A.copyTable = async () => {
    let text;
    const tab = St.state.ui.reportTab;
    if (tab === "explain" || tab === "issues") text = (document.getElementById("reportBody") || {}).innerText || "";
    else {
      const tb = V.buildTables(St.result())[tab];
      const rows = V.filterRows(tb, St.state.ui.filter.trim().toLowerCase());
      text = [tb.head].concat(rows.map(r => r.cells.map(V.cellText))).concat(tb.foot ? [tb.foot.map(V.cellText)] : []).map(r => r.join("\t")).join("\n");
    }
    U.toast(t((await U.copyText(text)) ? "toast.copied" : "toast.copyFail"));
  };
  A.exportMenu = el => U.menu(el, [
    { label: t("exp.xlsx"), icon: "sheet", run: exportXLSX },
    { label: t("exp.csv"), icon: "file", run: exportCSV },
    { label: t("exp.print"), icon: "print", run: printReport },
    { label: t("exp.md"), icon: "md", run: copyMarkdown },
    "-",
    { label: t("exp.json"), icon: "code", run: exportJSON }
  ], { alignEnd: true });

  function stamp() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function fileBase() { const w = St.ws(); return (w.meta.title || w.name || t("app.title")).replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80); }
  function rawCell(c) { if (c.v === "") return ""; if (c.f === "t") return c.v; return Number(c.v); }
  function auditRows(r) {
    const S = St.state.settings;
    const rows = [[t("report.generated"), new Date().toISOString()], [t("report.engine"), E.VERSION], [t("report.sources"), St.sources.version || ""], [t("report.hash"), r.hash], [], [t("sec.calc")],
      [t("set.convention"), t("conv." + S.convention)], [t("set.frequency"), t("freq." + S.frequency)], [t("set.roundingUnit"), S.roundingUnit], [t("set.extra"), S.extraRateEnabled ? S.extraRate : 0],
      [t("set.distribution"), t("dist." + S.distribution)], [t("invmode.title"), t("invmode." + S.investmentMode)], [t("basis.title"), t("basis." + S.presenceBasis)],
      [t("cal.weekend"), S.weekend.map(d => I.weekdays()[d]).join(", ")], [t("cal.holidays"), S.holidays.map(h => `${h.name || ""} ${h.date}${h.repeats ? " ↻" : ""}`).join(" · ")], [], [t("ref.rates") + " — " + V.tableName(St.defaultTableId())]];
    const def = St.allTables(I.lang).find(x => x.id === St.defaultTableId());
    if (def) Object.keys(def.rates).sort().forEach(y => rows.push([Number(y), def.rates[y]]));
    rows.push([], [t("col.case"), t("dur." + "dates"), t("case.rounding"), t("case.compounding"), t("case.frequency"), t("case.rateSource"), t("case.notes")]);
    St.ws().cases.forEach((c, i) => rows.push([V.caseLabel(c, i), t("dur." + c.duration), t("round." + c.rounding), t(c.compounding ? "cmp.compound" : "cmp.simple"), t("freq." + (c.frequency || S.frequency)), c.rateSource === "fixed" ? `${t("rate.fixed")} ${c.fixedRate}%` : V.tableName(c.rateTable || St.defaultTableId()), c.notes]));
    const m = St.ws().meta;
    rows.unshift([t("report.titlePh"), m.title || t("report.defaultTitle")], [t("meta.entity"), m.entity], [t("meta.ref"), m.ref], [t("meta.preparedBy"), m.preparedBy], [t("meta.period"), m.period], []);
    return rows;
  }
  async function exportXLSX() {
    const r = St.result();
    let X;
    try { if (!global.XLSX) U.toast(t("toast.xlsxLoading")); X = await U.loadXLSX(); } catch (e) { U.toast(t("toast.xlsxFail"), { action: t("exp.csv"), onAction: exportCSV }); return; }
    try {
      const tbs = V.buildTables(r);
      const wb = X.utils.book_new();
      if (I.lang === "ar") wb.Workbook = { Views: [{ RTL: true }] };
      const used = new Set();
      const add = (name, aoa, widths) => {
        let n = String(name).replace(/[\[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet"; let k = 2;
        while (used.has(n.toLowerCase())) n = n.slice(0, 28) + " " + k++;
        used.add(n.toLowerCase());
        const ws = X.utils.aoa_to_sheet(aoa);
        ws["!cols"] = (widths || aoa[0] || []).map((_, i) => ({ wch: Math.min(48, Math.max(10, ...aoa.slice(0, 200).map(row => String(row[i] === undefined ? "" : row[i]).length + 2))) }));
        X.utils.book_append_sheet(wb, ws, n);
      };
      ["ledger", "people", "detail"].forEach(k => { const tb = tbs[k]; add(tb.title, [tb.head].concat(tb.rows.map(rw => rw.cells.map(rawCell))).concat(tb.foot ? [tb.foot.map(rawCell)] : [])); });
      if (r.excluded.length) add(tbs.excluded.title, [tbs.excluded.head].concat(tbs.excluded.rows.map(rw => rw.cells.map(rawCell))));
      if (r.issues.length) add(tbs.issues.title, [tbs.issues.head].concat(tbs.issues.rows.map(rw => rw.cells.map(rawCell))));
      add(t("report.hash"), auditRows(r), [0, 0, 0, 0, 0, 0, 0]);
      X.writeFile(wb, `${fileBase()}-${stamp()}.xlsx`);
      U.toast(r.blocked ? t("report.draft") : t("toast.exported"));
    } catch (e) { console.error(e); U.toast(t("toast.exportFail")); }
  }
  function exportCSV() {
    const tab = ["ledger", "people", "detail"].includes(St.state.ui.reportTab) ? St.state.ui.reportTab : "ledger";
    const tb = V.buildTables(St.result())[tab];
    const rows = [tb.head].concat(tb.rows.map(rw => rw.cells.map(rawCell))).concat(tb.foot ? [tb.foot.map(rawCell)] : []);
    U.download(new Blob(["\ufeff" + rows.map(r => r.map(U.csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `${fileBase()}-${tab}-${stamp()}.csv`);
    U.toast(t("toast.exported"));
  }
  function exportJSON() {
    U.download(new Blob([JSON.stringify(St.exportPayload(), null, 2)], { type: "application/json" }), `${fileBase()}-${stamp()}.json`);
    U.toast(t("toast.exported"));
  }
  async function copyMarkdown() {
    const tbs = V.buildTables(St.result());
    const md = ["ledger", "people"].map(k => {
      const tb = tbs[k];
      const rows = [tb.head].concat(tb.rows.map(r => r.cells.map(V.cellText))).concat(tb.foot ? [tb.foot.map(V.cellText)] : []);
      return `### ${tb.title}\n\n` + rows.map((r, i) => "| " + r.map(c => String(c).replace(/\|/g, "\\|")).join(" | ") + " |" + (i === 0 ? "\n|" + r.map(() => " --- |").join("") : "")).join("\n");
    }).join("\n\n");
    U.toast(t((await U.copyText(`# ${St.ws().meta.title || t("report.defaultTitle")}\n\n${md}`)) ? "toast.copied" : "toast.copyFail"));
  }
  function printReport() {
    if (St.state.ui.view !== "report") St.ui(u => { u.view = "report"; });
    V.printing = true; render();
    setTimeout(() => window.print(), 60);
  }
  window.addEventListener("afterprint", () => { if (V.printing) { V.printing = false; schedule(); } });
  A.copyReference = async () => U.toast(t((await U.copyText((document.getElementById("refBody") || {}).innerText || "")) ? "toast.copied" : "toast.copyFail"));
  A.refJump = (el, e) => { e.preventDefault(); const tgt = document.getElementById(el.dataset.target); tgt && tgt.scrollIntoView({ behavior: "smooth", block: "start" }); };

  A.addMissingRates = el => { P.pendingYears = el.dataset.years.split(",").map(Number).filter(Number.isFinite); P.rateTable = St.defaultTableId(); openSettings("rates"); };
  A.ackRates = el => {
    const ys = el.dataset.years.split(",").map(Number).filter(Number.isFinite);
    St.commit(() => { const c = findCase(el.dataset.id); if (c) c.acknowledgedYears = [...new Set(c.acknowledgedYears.concat(ys))]; });
  };
  A.goIssue = el => {
    if (issuesDlg) issuesDlg.closeDialog();
    if (el.dataset.case) {
      St.ui(u => { u.view = "cases"; delete u.collapsed[el.dataset.case]; });
      requestAnimationFrame(() => requestAnimationFrame(() => { const c = document.getElementById("case-" + el.dataset.case); if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash"); } }));
    } else if (el.dataset.person) {
      St.ui(u => { u.view = "people"; u.peopleFilter = ""; u.peopleLimit = Math.max(u.peopleLimit, St.ws().people.length); });
      focusLater(`#person-${CSS.escape(el.dataset.person)} [data-k="name"]`);
    }
  };

  A.pickDate = el => {
    const input = el.parentElement.querySelector("input");
    const S = St.state.settings;
    U.datePicker(el, U.parseDateInput(input.value) || "", iso => {
      input.value = iso ? U.isoToInput(iso) : "";
      bind(input);
      St.breakCoalesce();
      input.focus({ preventScroll: true });
    }, E.makeCalendar(S.weekend, S.holidays));
  };

  function openSettings(sec) {
    if (sec) St.ui(u => { u.settingsSection = sec; });
    if (settingsDlg) { schedule(); return; }
    settingsDlg = U.openDialog("settingsDlg", P.settingsHTML(), { onClose: () => { settingsDlg = null; P.pendingYears = []; } });
    requestAnimationFrame(() => { const f = settingsDlg && settingsDlg.querySelector('.setNav[aria-current="true"]'); f && f.focus({ preventScroll: true }); });
  }
  A.openSettings = el => openSettings(el && el.dataset && el.dataset.sec);
  A.closeDialog = el => { const d = el.closest("dialog"); d && d.closeDialog && d.closeDialog(); };
  A.setSection = el => { St.ui(u => { u.settingsSection = el.dataset.sec; }); const m = document.getElementById("setMain"); m && (m.scrollTop = 0); };
  A.issues = () => {
    if (issuesDlg) return;
    issuesDlg = U.openDialog("", P.issuesHTML(St.result()), { onClose: () => { issuesDlg = null; } });
  };
  A.pickTable = el => { P.rateTable = el.value; schedule(); };
  A.makeDefaultTable = el => St.commit(s => { s.settings.defaultRateTable = el.dataset.table; });
  A.resetTable = async el => { if (!(await U.confirm(t("rates.resetConfirm"), { danger: true }))) return; St.commit(s => { delete s.rateOverrides[el.dataset.table]; }); undoableToast(t("rates.reset")); };
  A.newTable = async () => {
    const name = await U.confirm(t("rates.tableName"), { prompt: t("rates.newTableName") });
    if (!name) return;
    const src = St.allTables(I.lang).find(x => x.id === (P.rateTable || St.defaultTableId()));
    const id = "local-" + St.uid().slice(0, 8);
    St.commit(s => { s.localTables.push({ id, name, rates: Object.assign({}, src ? src.rates : {}) }); });
    P.rateTable = id; schedule();
  };
  A.deleteTable = async el => {
    if (!(await U.confirm(t("rates.deleteConfirm"), { danger: true }))) return;
    const id = el.dataset.table;
    St.commit(s => { s.localTables = s.localTables.filter(x => x.id !== id); if (s.settings.defaultRateTable === id) s.settings.defaultRateTable = (St.sources.rateTables[0] || {}).id || "default"; s.workspaces.forEach(w => w.cases.forEach(c => { if (c.rateTable === id) c.rateTable = null; })); });
    P.rateTable = null;
    undoableToast(t("rates.deleteTable"));
  };
  A.rateRemove = el => St.commit(s => {
    const id = el.dataset.table, y = el.dataset.y;
    const lt = s.localTables.find(x => x.id === id);
    if (lt) { delete lt.rates[y]; return; }
    const official = (St.sources.rateTables.find(x => x.id === id) || { rates: {} }).rates;
    const o = s.rateOverrides[id] || (s.rateOverrides[id] = { set: {}, removed: [] });
    delete o.set[y];
    if (official[y] !== undefined && !o.removed.includes(y)) o.removed.push(y);
    if (!Object.keys(o.set).length && !o.removed.length) delete s.rateOverrides[id];
  });
  A.rateRestore = el => St.commit(s => {
    const o = s.rateOverrides[el.dataset.table]; if (!o) return;
    delete o.set[el.dataset.y]; o.removed = o.removed.filter(x => x !== el.dataset.y);
    if (!Object.keys(o.set).length && !o.removed.length) delete s.rateOverrides[el.dataset.table];
  });
  A.addRate = el => {
    const yEl = document.getElementById("newRateYear"), vEl = document.getElementById("newRateValue");
    const y = Math.round(E.toNum(yEl.value || yEl.placeholder)), v = E.toNum(vEl.value);
    if (!(y >= E.LIMITS.minYear && y <= E.LIMITS.maxYear)) { yEl.classList.add("shake", "bad"); setTimeout(() => yEl.classList.remove("shake"), 300); yEl.focus(); return; }
    if (!Number.isFinite(v)) { vEl.classList.add("shake", "bad"); setTimeout(() => vEl.classList.remove("shake"), 300); vEl.focus(); return; }
    setRate((el && el.dataset && el.dataset.table) || P.rateTable || St.defaultTableId(), String(y), v);
    St.breakCoalesce();
    yEl.value = ""; vEl.value = ""; yEl.classList.remove("bad"); vEl.classList.remove("bad");
    requestAnimationFrame(() => { const n = document.getElementById("newRateYear"); n && n.focus(); });
  };
  A.pasteRates = el => {
    const ta = document.getElementById("ratesPaste"); if (!ta) return;
    const rows = U.parseDelimited(ta.value.replace(/[ ]{2,}/g, "\t")).map(r => (r.length === 1 ? r[0].split(/\s+/) : r));
    let n = 0;
    St.breakCoalesce();
    rows.forEach(r => { const y = Math.round(E.toNum(r[0])), v = E.toNum(r[1]); if (y >= E.LIMITS.minYear && y <= E.LIMITS.maxYear && Number.isFinite(v)) { setRate(el.dataset.table, String(y), v, "paste"); n++; } });
    St.breakCoalesce();
    ta.value = "";
    U.toast(t("rates.pasteDone", { n: U.numText(n, 0) }));
  };
  A.toggleWeekend = el => {
    const d = +el.dataset.d, wk = St.state.settings.weekend;
    if (!wk.includes(d) && wk.length >= 6) { U.toast(t("cal.lastDay")); el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 300); return; }
    St.commit(s => { s.settings.weekend = wk.includes(d) ? wk.filter(x => x !== d) : wk.concat(d).sort((a, b) => a - b); });
  };
  A.addHoliday = () => {
    const h = { id: St.uid(), name: "", date: `${new Date().getFullYear()}-01-01`, repeats: false };
    St.commit(s => { s.settings.holidays.push(h); });
    requestAnimationFrame(() => { const el = document.querySelector(`[data-b="hol"][data-id="${CSS.escape(h.id)}"][data-k="name"]`); el && el.focus(); });
  };
  A.removeHoliday = el => St.commit(s => { s.settings.holidays = s.settings.holidays.filter(h => h.id !== el.dataset.id); });
  A.clearHolidays = async () => { if (!(await U.confirm(t("cal.clearHolidays") + "?", { danger: true }))) return; St.commit(s => { s.settings.holidays = []; }); undoableToast(t("cal.clearHolidays")); };
  A.pasteHolidays = () => {
    const ta = document.getElementById("holPaste"); if (!ta) return;
    const rows = U.parseDelimited(ta.value);
    const add = [];
    rows.forEach(r => {
      let name = r[0], date = U.flexDate(r[1]);
      if (!date && U.flexDate(r[0])) { date = U.flexDate(r[0]); name = r[1] || ""; }
      if (!date) return;
      add.push({ id: St.uid(), name: String(name || "").slice(0, 120), date, repeats: r.slice(2).some(x => /^(repeat|yearly|annual|تكرار|سنوي|نعم|yes|1|true)$/i.test(String(x).trim())) });
    });
    St.commit(s => { const keys = new Set(s.settings.holidays.map(h => h.date + h.repeats)); add.forEach(h => { if (!keys.has(h.date + h.repeats)) s.settings.holidays.push(h); }); });
    ta.value = "";
    U.toast(t("cal.pasteDone", { n: U.numText(add.length, 0) }));
  };
  A.applyCal = el => {
    const c = St.sources.calendars.find(x => x.id === el.dataset.id); if (!c) return;
    const replace = el.dataset.mode === "replace";
    St.commit(s => {
      if (c.weekend.length && c.weekend.length < 7) s.settings.weekend = c.weekend.slice();
      const list = replace ? [] : s.settings.holidays.slice();
      const keys = new Set(list.map(h => h.date.slice(5) + h.repeats));
      c.holidays.forEach(h => { const k = h.date.slice(5) + h.repeats; if (!keys.has(k)) { list.push({ id: St.uid(), name: St.localizedName(h.name, I.lang), date: h.date, repeats: h.repeats }); keys.add(k); } });
      s.settings.holidays = list;
    });
    undoableToast(t("cal.presetDone", { name: St.localizedName(c.name, I.lang) }));
  };
  A.reloadSources = async () => {
    const el = document.getElementById("srcUrl");
    const url = el ? el.value.trim() : St.state.sourcesUrl;
    St.commit(s => { s.sourcesUrl = url; }, { history: false });
    const res = await St.fetchSources(url);
    St.invalidate(); schedule();
    U.toast(res.ok ? t("src.reloaded") + (res.version ? ` · ${res.version}` : "") : t("src.failed", { e: res.error }));
  };
  A.resetSourcesUrl = () => { const el = document.getElementById("srcUrl"); if (el) el.value = ""; A.reloadSources(); };

  A.newWorkspace = () => { St.commit(s => { const w = St.blankWorkspace(""); s.workspaces.push(w); s.activeWorkspace = w.id; }); V.selected.clear(); U.toast(t("ws.switched", { name: V.wsName(St.ws()) })); };
  A.switchWs = el => { St.commit(s => { s.activeWorkspace = el.dataset.id; }, { history: false }); V.selected.clear(); U.toast(t("ws.switched", { name: V.wsName(St.ws()) })); };
  A.renameWs = async el => {
    const w = St.state.workspaces.find(x => x.id === el.dataset.id); if (!w) return;
    const n = await U.confirm(t("ws.renamePrompt"), { prompt: V.wsName(w) });
    if (n) St.commit(() => { w.name = n; });
  };
  A.dupWs = el => St.commit(s => {
    const w = s.workspaces.find(x => x.id === el.dataset.id); if (!w) return;
    const c = St.clone(w); c.id = St.uid(); c.name = `${V.wsName(w)} ${t("case.copySuffix")}`; c.updated = Date.now();
    s.workspaces.splice(s.workspaces.indexOf(w) + 1, 0, c);
  });
  A.deleteWs = async el => {
    const w = St.state.workspaces.find(x => x.id === el.dataset.id); if (!w) return;
    if (!(await U.confirm(t("ws.deleteConfirm", { name: V.wsName(w) }), { danger: true }))) return;
    St.commit(s => { s.workspaces = s.workspaces.filter(x => x.id !== w.id); if (s.activeWorkspace === w.id) s.activeWorkspace = s.workspaces[0].id; });
    undoableToast(t("act.remove"));
  };
  A.exportJSON = exportJSON;
  A.importJSON = async () => {
    const f = await U.pickFile(".json,application/json");
    if (!f) return;
    try { const w = St.importPayload(JSON.parse(await U.readFile(f))); V.selected.clear(); undoableToast(t("data.imported", { name: V.wsName(w) })); }
    catch (e) { U.confirm(t("data.importFail"), { alert: true }); }
  };
  A.resetSettings = async () => {
    if (!(await U.confirm(t("data.resetConfirm"), { danger: true }))) return;
    St.commit(s => { s.settings = St.defaultSettings(); });
    undoableToast(t("data.resetDone"));
  };
  A.install = async () => {
    if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; syncInstall(); return; }
    U.confirm(t("install.ios"), { alert: true });
  };
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function standalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; }
  function syncInstall() { const b = document.getElementById("installBtn"); if (b) b.hidden = standalone() || !(installEvt || isIOS()); }

  function openPalette() {
    if (paletteDlg) return;
    let active = 0, items = [];
    paletteDlg = U.openDialog("paletteDlg", `<div class="sheet paletteSheet" role="dialog" aria-modal="true" aria-label="${esc(t("act.palette"))}"><input class="paletteInput" id="palInput" placeholder="${esc(t("pal.placeholder"))}" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="palList"><div class="paletteList" id="palList" role="listbox"></div></div>`, { onClose: () => { paletteDlg = null; } });
    const input = paletteDlg.querySelector("#palInput"), list = paletteDlg.querySelector("#palList");
    const draw = () => { const r = P.paletteList(input.value, active); items = r.items; list.innerHTML = r.html; const a = list.querySelector(".active"); a && a.scrollIntoView({ block: "nearest" }); };
    const run = i => { const it = items[i]; if (!it) return; const dlg = paletteDlg; dlg.closeDialog(); setTimeout(() => runCommand(it.run), 170); };
    input.addEventListener("input", () => { active = 0; draw(); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { active = Math.min(items.length - 1, active + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter") { e.preventDefault(); run(active); }
    });
    list.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) run(+b.dataset.i); });
    draw();
    requestAnimationFrame(() => input.focus());
  }
  A.palette = openPalette;
  function runCommand(cmd) {
    const [k, v] = cmd.split(":");
    if (k === "view") return setView(v);
    if (k === "sec") return openSettings(v);
    if (k === "case") return A.goIssue({ dataset: { case: v } });
    if (k === "person") return A.goIssue({ dataset: { person: v } });
    if (k === "xlsx") return exportXLSX();
    if (k === "print") return printReport();
    if (k === "tests") return window.open("tests.html", "_blank", "noopener");
    if (A[k]) A[k]({ dataset: {} });
  }

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-a]");
    if (!el || el.disabled) return;
    if (el.tagName === "SELECT") return;
    const fn = A[el.dataset.a];
    if (fn) fn(el, e);
  });
  document.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset && el.dataset.b && el.type !== "checkbox" && el.tagName !== "SELECT") bind(el);
  });
  document.addEventListener("change", e => {
    const el = e.target;
    if (!el.dataset) return;
    if (el.dataset.b && (el.type === "checkbox" || el.tagName === "SELECT")) { bind(el); St.breakCoalesce(); }
    else if (el.tagName === "SELECT" && el.dataset.a && A[el.dataset.a]) A[el.dataset.a](el, e);
  });
  document.addEventListener("focusout", e => {
    const el = e.target;
    if (!el.dataset || !el.dataset.b) return;
    St.breakCoalesce();
    if (el.dataset.b === "person" && el.dataset.k === "name") {
      const p = findPerson(el.dataset.id);
      if (p && p.name.trim()) { const u = uniqueName(p.name, p.id); if (u !== p.name.trim() || u !== p.name) { const dup = u !== p.name.trim(); St.commit(() => { p.name = u; }, { history: false }); if (dup) U.toast(t("people.dup")); } }
    }
    if (el.dataset.t === "date" && E.parseISO(readValue(el)) !== null) el.value = U.isoToInput(readValue(el));
    if (el.dataset.t === "money") el.value = U.formatMoneyInput(el.value);
    schedule();
  });
  document.addEventListener("focusin", e => {
    const el = e.target;
    if (el.dataset && el.dataset.t === "money") { const raw = el.value.replace(/,/g, ""); if (raw !== el.value) el.value = raw; }
  });

  function typing(el) { return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }
  document.addEventListener("keydown", e => {
    const mod = e.ctrlKey || e.metaKey;
    const tgt = e.target;
    if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
    if (mod && e.key === ",") { e.preventDefault(); openSettings(); return; }
    if (mod && !e.altKey && (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "y")) {
      if (typing(tgt) && tgt.type !== "checkbox") return;
      e.preventDefault();
      if (e.key.toLowerCase() === "y" || e.shiftKey) { if (St.redo()) U.toast(t("toast.redone")); } else if (St.undo()) U.toast(t("toast.undone")); else U.toast(t("toast.nothingUndo"));
      return;
    }
    if (tgt.dataset && tgt.dataset.t === "date" && e.altKey && e.key === "ArrowDown") { e.preventDefault(); const b = tgt.parentElement.querySelector(".dateBtn"); b && A.pickDate(b); return; }
    if (e.key === "Enter" && !e.shiftKey && tgt.matches && (tgt.matches("[data-enter]") || tgt.matches("[data-enter-act]"))) {
      e.preventDefault();
      if (tgt.dataset.enterAct) { A[tgt.dataset.enterAct](); return; }
      const scope = tgt.closest("dialog") || document;
      const all = [...scope.querySelectorAll("[data-enter]:not(:disabled)")].filter(x => x.offsetParent !== null);
      const i = all.indexOf(tgt);
      if (tgt.closest(".peopleTable") && tgt.hasAttribute("data-row-enter")) {
        const tr = tgt.closest("tr");
        const rest = all.slice(i + 1).find(x => x.closest("tr") !== tr);
        if (rest) { rest.focus(); rest.select && rest.select(); } else A.addPerson();
        return;
      }
      const nx = all[i + 1];
      if (nx) { nx.focus(); nx.select && nx.select(); } else tgt.blur();
      return;
    }
    if (typing(tgt) || mod || e.altKey || document.querySelector("dialog[open]") || U.pop) return;
    const views = { 1: "cases", 2: "people", 3: "report", 4: "reference" };
    if (views[e.key]) { setView(views[e.key]); return; }
    if (e.key === "n" || e.key === "N") { e.preventDefault(); A.addCase(); return; }
    if (e.key === "/") { const s = document.querySelector('#main input[type="search"]'); if (s) { e.preventDefault(); s.focus(); } }
  });
  document.addEventListener("keydown", e => {
    const tab = e.target.closest && e.target.closest('[role="tab"]');
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
    let i = tabs.indexOf(tab);
    const fwd = (e.key === "ArrowRight") !== (document.dir === "rtl");
    i = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (fwd ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault(); tabs[i].focus(); tabs[i].click();
  });

  window.addEventListener("resize", () => after());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => after());
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      placePill(document.getElementById("mainNav"), '[aria-selected="true"]');
      placePill(document.getElementById("reportTabs"), '[aria-selected="true"]');
    });
    const watch = () => { ro.disconnect(); ["mainNav", "reportTabs"].forEach(id => { const el = document.getElementById(id); if (el) ro.observe(el); }); };
    St.subscribe(() => requestAnimationFrame(watch));
    requestAnimationFrame(watch);
  }
  setInterval(() => { const el = document.getElementById("saveState"); if (el) { const chip = el.querySelector(".wsChip"); U.morph(el, V.saveStateHTML() + (chip ? chip.outerHTML : "")); } }, 30000);
  window.addEventListener("pagehide", () => St.saveNow());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") St.saveNow(); });
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => St.prefs(p => { p.systemDark = e.matches; })); } catch (e) {}
  let crossTab = false;
  window.addEventListener("storage", async e => {
    if (e.key !== St.KEY || e.newValue === null || crossTab) return;
    crossTab = true;
    const ok = await U.confirm(t("crossTab"), { ok: t("act.reload"), cancel: t("act.cancel") });
    crossTab = false;
    if (ok) { St.suspend(); location.reload(); } else St.saveNow();
  });
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; syncInstall(); });
  window.addEventListener("appinstalled", () => { installEvt = null; syncInstall(); });

  function registerSW() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register("sw.js").then(reg => {
      const notify = w => w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) U.toast(t("update.ready"), { action: t("update.reload"), duration: 20000, onAction: () => { St.saveNow(); location.reload(); } }); });
      if (reg.installing) notify(reg.installing);
      reg.addEventListener("updatefound", () => reg.installing && notify(reg.installing));
      setInterval(() => reg.update().catch(() => {}), 3600000);
    }).catch(() => {});
  }

  function bootError(err) {
    console.error(err);
    let raw = "";
    try { raw = localStorage.getItem(St.KEY) || localStorage.getItem(St.LEGACY_KEY) || ""; } catch (e) {}
    const ar = (document.documentElement.lang || "ar") === "ar";
    root.innerHTML = `<div class="card" style="max-width:520px;margin:12vh auto;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center"><div class="confirmIcon danger">${ICON.warn}</div><h2>${ar ? "تعذّر تشغيل التطبيق" : "The app couldn't start"}</h2><p class="hint">${ar ? "بياناتك محفوظة. يمكنك تنزيلها ثم إعادة الضبط." : "Your data is safe. Download it, then reset."}</p><pre class="formula" style="max-height:140px;overflow:auto;text-align:start;width:100%">${esc(String(err && err.stack || err)).slice(0, 1200)}</pre><div class="row"><button class="softBtn" id="bootDl">${ICON.download}${ar ? "تنزيل البيانات" : "Download data"}</button><button class="dangerBtn" id="bootReset">${ar ? "إعادة الضبط" : "Reset"}</button></div></div>`;
    document.getElementById("bootDl").onclick = () => U.download(new Blob([raw || "{}"], { type: "application/json" }), "roi-calculator-backup.json");
    document.getElementById("bootReset").onclick = () => { try { if (raw) localStorage.setItem(St.KEY + "-backup-" + Date.now(), raw); localStorage.removeItem(St.KEY); } catch (e) {} location.reload(); };
  }

  try {
    const info = St.load();
    St.subscribe(info => {
      if (info.saved || info.saveError) {
        const el = document.getElementById("saveState");
        if (el) { const chip = el.querySelector(".wsChip"); U.morph(el, V.saveStateHTML() + (chip ? chip.outerHTML : "")); }
        if (info.saveError === "quota" && !bootError.quotaShown) { bootError.quotaShown = true; U.toast(t("save.quota"), { action: "JSON", duration: 15000, onAction: exportJSON }); }
        if (info.silent) return;
      }
      schedule();
    });
    render();
    if (info.migrated) U.toast(t("data.migrated"));
    const hadCache = St.sourcesMeta.origin === "cache";
    const prevVersion = St.sources.version;
    St.fetchSources().then(res => {
      if (res.ok && res.changed) { St.invalidate(); schedule(); if (hadCache && prevVersion !== "builtin") U.toast(t("src.newVersion", { v: res.version })); }
      else if (!res.ok) schedule();
    });
    registerSW();
    const q = new URLSearchParams(location.search);
    if (q.get("selftest") === "1" || q.get("tests") === "1") location.replace("tests.html");
    if (q.get("view")) St.ui(u => { if (["cases", "people", "report", "reference"].includes(q.get("view"))) u.view = q.get("view"); });
    global.App = { render, A, openSettings, runCommand };
  } catch (err) { bootError(err); }
})(window);

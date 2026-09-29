(function (global) {
  "use strict";
  const E = global.ROIEngine, I = global.I18N, U = global.UI, St = global.Store;
  const { esc, ICON } = U;
  const t = (k, p) => I.t(k, p);

  const V = {};
  V.selected = new Set();
  V.printing = false;

  function caseLabel(c, i) { return String(c && c.name || "").trim() || `${t("case.label")} ${U.numText(i + 1, 0)}`; }
  V.caseLabel = caseLabel;
  function caseIndex(id) { return St.ws().cases.findIndex(c => c.id === id); }
  function caseNameById(id) { const i = caseIndex(id); return i < 0 ? "" : caseLabel(St.ws().cases[i], i); }
  function personNameById(id) { const p = St.ws().people.find(x => x.id === id); return p ? String(p.name).trim() : ""; }
  function convName(id) { return t("conv." + id); }
  function unitOf() { return E.conventions[St.state.settings.convention].unit; }
  function tableName(id) { const tb = St.allTables(I.lang).find(x => x.id === id); return tb ? tb.name : id || "—"; }
  V.tableName = tableName;

  function durationText(segs, unit) {
    if (!segs.length) return "—";
    if (segs[0].manual || unit === "months") return `${U.num(segs.reduce((a, s) => a + s.months, 0))} ${t("unit.months")}`;
    return `${U.num(segs.reduce((a, s) => a + s.days, 0), 0)} ${t("unit.days")}`;
  }
  function segDuration(s, unit) {
    if (s.manual || unit === "months") return `${U.num(s.months)} ${t("unit.months")}`;
    return `${U.num(s.days, 0)} ${t("unit.days")}`;
  }
  function segPeriod(s) { return s.manual ? `${U.numText(s.year, 0).replace(/[,٬]/g, "")} · ${U.num(s.months)} ${t("unit.months")}` : U.range(s.from, s.to); }
  function caseWindow(c) {
    if (c.duration === "manual") return c.segments.map(s => `${s.year}: ${U.num(s.months)}`).join(" · ") || "—";
    if (c.duration === "none") return t("dur.none");
    if (c.windowStart === null) return "—";
    return U.range(c.windowStart, c.windowEnd);
  }
  V.caseWindow = caseWindow;

  function issueText(is) {
    const p = Object.assign({}, is.params || {});
    const code = is.code;
    if (code === "case.missingRates") {
      if (!p.unresolved.length) return t("issue.case.missingRatesAck", { years: p.years.join("، ") });
      return t("issue.case.missingRates", { years: p.unresolved.join(I.lang === "ar" ? "، " : ", ") });
    }
    if (p.years) p.years = p.years.join(I.lang === "ar" ? "، " : ", ");
    if (p.amount !== undefined) p.amount = U.money(p.amount);
    if (p.gaps) p.ranges = p.gaps.map(g => `${U.range(g.from, g.to)}${g.impact ? ` (${U.num(g.measured, 0)} ${t("unit.days")})` : ""}`).join(" · ");
    if (code === "case.accrualCollapsed") p.conv = convName(St.state.settings.convention);
    if (is.personId && !p.name) p.name = personNameById(is.personId) || "—";
    if (p.value !== undefined) p.value = U.num(p.value);
    if (p.max !== undefined) p.max = U.num(p.max, 0);
    return t("issue." + code, p);
  }
  V.issueText = issueText;
  function issueIcon(sev) { return sev === "error" ? ICON.error : sev === "warning" ? ICON.warn : ICON.info; }
  V.issueIcon = issueIcon;
  function issueActions(is) {
    let h = "";
    if (is.code === "case.missingRates" && is.params.unresolved.length) {
      h += `<button type="button" class="ghostBtn accent" data-a="addMissingRates" data-years="${is.params.unresolved.join(",")}">${ICON.plus}${esc(t("issue.addRates"))}</button>`;
      h += `<button type="button" class="ghostBtn" data-a="ackRates" data-id="${esc(is.caseId)}" data-years="${is.params.unresolved.join(",")}">${ICON.ok}${esc(t("issue.ack"))}</button>`;
    }
    return h;
  }
  V.issueActions = issueActions;
  function noticeHTML(is, extra) {
    const cls = is.severity === "error" ? "bad" : is.severity === "info" ? "info" : "";
    const acts = issueActions(is) + (extra || "");
    return `<div class="notice ${cls}">${issueIcon(is.severity)}<div class="grow">${esc(issueText(is))}${acts ? `<div class="notice-actions">${acts}</div>` : ""}</div></div>`;
  }

  function seg(name, value, options, attrs) {
    return `<div class="seg ${attrs && attrs.sm ? "sm" : ""}" role="group" aria-label="${esc(name)}">${options.map(o => `<button type="button" aria-pressed="${o.v === value}" ${o.a}>${esc(o.l)}</button>`).join("")}</div>`;
  }
  function select(bindAttrs, value, options, cls) {
    return `<select class="input ${cls || ""}" ${bindAttrs}>${options.map(o => `<option value="${esc(o.v)}"${String(o.v) === String(value) ? " selected" : ""}>${esc(o.l)}</option>`).join("")}</select>`;
  }
  function sw(checked, attrs, label) {
    return `<label class="switch"><input type="checkbox" role="switch"${checked ? " checked" : ""} ${attrs}><span class="track"><span class="thumb"></span></span>${label ? `<span class="switchLabel">${esc(label)}</span>` : ""}</label>`;
  }
  function chip(on, label, attrs, sm, disabled) {
    return `<button type="button" class="chip ${sm ? "sm" : ""}" aria-pressed="${!!on}" ${attrs}${disabled ? " disabled" : ""}><span class="tick">${ICON.check}</span>${esc(label)}</button>`;
  }
  function dateInput(bind, value, sm, extra) {
    const valid = E.parseISO(value) !== null;
    const shown = valid ? U.isoToInput(value) : String(value || "");
    const bad = !valid && String(value || "").trim() !== "";
    return `<div class="dateWrap ${sm ? "sm" : ""}"><input class="${sm ? "cellInput" : "input"}${bad ? " bad" : ""}" inputmode="numeric" autocomplete="off" placeholder="${esc(t("date.ph"))}" value="${esc(shown)}" ${bind} data-t="date" ${extra || ""}><button type="button" class="dateBtn" data-a="pickDate" tabindex="-1" aria-label="${esc(t("date.pick"))}">${ICON.calendar}</button></div>`;
  }
  V.helpers = { seg, select, sw, chip, dateInput };

  V.topbar = function (r) {
    const s = St.state, w = St.ws();
    const errs = r.issues.filter(i => i.severity !== "info").length;
    const counts = { cases: w.cases.length, people: r.totals.people };
    const views = [["cases", "nav.cases"], ["people", "nav.people"], ["report", "nav.report"], ["reference", "nav.reference"]];
    const theme = V.resolvedTheme();
    const multi = s.workspaces.length > 1;
    return `<header class="topbar" data-key="topbar">
      <div class="brand">
        <div class="brandMark">${ICON.logo}</div>
        <div class="brandText">
          <h1>${esc(t("app.title"))}</h1>
          <div class="saveState" id="saveState">${V.saveStateHTML()}${multi ? `<button type="button" class="wsChip hideXs" data-a="openSettings" data-sec="data" title="${esc(t("ws.title"))}">${esc(V.wsName(w))}</button>` : ""}</div>
        </div>
      </div>
      <nav class="nav" role="tablist" aria-label="${esc(t("app.title"))}" id="mainNav">
        <span class="navPill" aria-hidden="true" data-morph-skip></span>
        ${views.map(([v, k]) => `<button type="button" class="navBtn" role="tab" id="tab-${v}" aria-selected="${s.ui.view === v}" tabindex="${s.ui.view === v ? 0 : -1}" data-a="view" data-view="${v}">${esc(t(k))}${counts[v] !== undefined ? `<span class="navCount">${U.numText(counts[v], 0)}</span>` : ""}${v === "report" && r.blocked ? `<span class="dot" title="${esc(t("case.status.draft"))}"></span>` : ""}</button>`).join("")}
      </nav>
      <div class="actions">
        <button type="button" class="iconBtn hideXs" data-a="undo" title="${esc(t("act.undo"))} (Ctrl+Z)" aria-label="${esc(t("act.undo"))}"${St.canUndo ? "" : " disabled"}>${ICON.undo}</button>
        <button type="button" class="iconBtn hideXs" data-a="redo" title="${esc(t("act.redo"))} (Ctrl+Shift+Z)" aria-label="${esc(t("act.redo"))}"${St.canRedo ? "" : " disabled"}>${ICON.redo}</button>
        <span class="sep hideXs"></span>
        <button type="button" class="iconBtn hideXs" data-a="palette" title="${esc(t("act.palette"))} (Ctrl+K)" aria-label="${esc(t("act.palette"))}">${ICON.search}</button>
        <button type="button" class="iconBtn" data-a="issues" title="${esc(t("act.issues"))}" aria-label="${esc(t("act.issues"))}">${ICON.bell}${r.issues.length ? `<span class="badge ${errs ? "" : "info"}">${r.issues.length > 99 ? "99+" : U.numText(r.issues.length, 0)}</span>` : ""}</button>
        <button type="button" class="iconBtn" data-a="theme" title="${esc(t("theme.toggle"))}" aria-label="${esc(t("theme.toggle"))}">${theme === "dark" ? ICON.sun : ICON.moon}</button>
        <button type="button" class="softBtn" data-a="lang" aria-label="${esc(t("pal.lang"))}" style="padding:8px 12px">${esc(t("lang.other"))}</button>
        <button type="button" class="iconBtn" data-a="install" id="installBtn" hidden title="${esc(t("act.install"))}" aria-label="${esc(t("act.install"))}">${ICON.install}</button>
        <button type="button" class="iconBtn" data-a="openSettings" title="${esc(t("act.settings"))}" aria-label="${esc(t("act.settings"))}">${ICON.settings}</button>
      </div>
    </header>`;
  };
  V.wsName = w => (w.name || t("ws.defaultName", { n: U.numText(St.state.workspaces.indexOf(w) + 1, 0) }));
  V.saveStateHTML = function () {
    if (St.saveError) return `<span class="saveState err">${ICON.warn}<span>${esc(t("save.failed"))}</span></span>`;
    const at = St.lastSavedAt || Date.now();
    const diff = Date.now() - at;
    const rel = diff < 60000 ? t("save.justNow") : diff < 3600000 ? t("save.minAgo", { n: U.numText(Math.floor(diff / 60000), 0) }) : t("save.hrAgo", { n: U.numText(Math.floor(diff / 3600000), 0) });
    return `${ICON.check}<span>${esc(t("save.saved"))}<span class="long"> · ${esc(rel)}</span></span>`;
  };
  V.resolvedTheme = function () { const th = St.state.prefs.theme; return th === "system" ? (St.state.prefs.systemDark ? "dark" : "light") : th; };

  V.kpis = function (r) {
    const T = r.totals;
    if (!r.cases.length) return `<div class="kpiEmpty" data-key="kpis">${ICON.info}<span>${esc(t("kpi.empty"))}</span></div>`;
    const avg = T.principal > 0 ? T.returnValue / T.principal * 100 : 0;
    return `<section class="kpis" data-key="kpis" aria-label="${esc(t("kpi.due"))}">
      <div class="kpi"><span class="kpiLabel">${esc(t("kpi.shortage"))}</span><span class="kpiValue money" data-tween="shortage" data-val="${T.shortage}">${esc(U.money(T.shortage))}</span><span class="kpiSub">${esc(t("kpi.cases", { n: U.numText(T.cases, 0) }))}${T.excluded ? ` · ${esc(t("kpi.excluded", { n: U.numText(T.excluded, 0) }))}` : ""}</span></div>
      <div class="kpi"><span class="kpiLabel">${esc(t("kpi.expenses"))}</span><span class="kpiValue money" data-tween="expenses" data-val="${T.expenses}">${esc(U.money(T.expenses))}</span><span class="kpiSub">${Math.abs(T.rawExpenses - T.expenses) > 0.004 ? esc(t("kpi.raw", { v: U.money(T.rawExpenses) })) : "&nbsp;"}</span></div>
      <div class="kpi accent"><span class="kpiLabel">${esc(t("kpi.return"))}</span><span class="kpiValue money" data-tween="return" data-val="${T.returnValue}">${esc(U.money(T.returnValue))}</span><span class="kpiSub">${T.principal > 0 ? esc(t("kpi.avgRate", { v: U.pct(Math.round(avg * 100) / 100) })) : "&nbsp;"}</span></div>
      <div class="kpi"><span class="kpiLabel">${esc(t("kpi.due"))}</span><span class="kpiValue money" data-tween="due" data-val="${T.due}">${esc(U.money(T.due))}</span><span class="kpiSub">${T.people ? esc(t("kpi.people", { n: U.numText(T.people, 0) })) : "&nbsp;"}</span></div>
    </section>`;
  };

  V.cases = function (r) {
    const w = St.ws();
    const byId = new Map(r.cases.map(c => [c.id, c]));
    const exById = new Map(r.excluded.map(c => [c.id, c]));
    const allCollapsed = w.cases.every(c => St.state.ui.collapsed[c.id]);
    return `<div class="view" data-key="v-cases">
      ${V.kpis(r)}
      <section class="card" data-key="cases-card" aria-labelledby="casesTitle">
        <div class="cardHead">
          <div class="cardTitle"><div class="counter">${U.numText(w.cases.length, 0)}</div><div><h2 id="casesTitle">${esc(t("cases.title"))}</h2><p>${esc(t("cases.hint"))}</p></div></div>
          <div class="toolbar">
            ${w.cases.length > 1 ? `<button type="button" class="ghostBtn" data-a="toggleAll">${ICON.chevDown}${esc(t(allCollapsed ? "act.expandAll" : "act.collapseAll"))}</button>` : ""}
            <button type="button" class="ghostBtn hideXs" data-a="openSettings" data-sec="rates">${ICON.percent}${esc(t("cases.manageRates"))}</button>
            <button type="button" class="dangerBtn hideXs" data-a="clearWorkspace">${esc(t("cases.clear"))}</button>
            <button type="button" class="primaryBtn" data-a="addCase">${ICON.plus}${esc(t("cases.add"))}</button>
          </div>
        </div>
        <div class="caseList">${w.cases.map((c, i) => caseCard(c, i, byId.get(c.id), exById.get(c.id), r)).join("")}</div>
      </section>
      <button type="button" class="primaryBtn fab" data-a="addCase" aria-label="${esc(t("cases.add"))}">${ICON.plus}</button>
    </div>`;
  };

  function caseCard(c, i, res, ex, r) {
    const S = St.state.settings;
    const collapsed = !!St.state.ui.collapsed[c.id];
    const empty = E.isBlank(c.shortage) && !c.start && !c.end;
    let status;
    if (res) status = res.blocked ? `<span class="pill warn dotted">${esc(t("case.status.draft"))}</span>` : `<span class="pill ok dotted">${esc(t("case.status.ok"))}</span>`;
    else if (empty) status = `<span class="pill dotted">${esc(t("case.status.empty"))}</span>`;
    else status = `<span class="pill bad dotted" title="${esc(issueText({ code: "case." + ex.issue, params: ex.params || {} }))}">${esc(t("case.status.excluded"))}</span>`;
    const id = esc(c.id);
    const B = k => `data-b="case" data-id="${id}" data-k="${k}"`;
    const invest = c.duration !== "none" && c.include.investment !== false;
    const caseIssues = r.issues.filter(x => x.caseId === c.id);
    const tables = St.allTables(I.lang);
    const inheritedFreq = t("freq.inherit", { v: t("freq." + S.frequency) });
    const extraTxt = U.pct(S.extraRateEnabled ? S.extraRate : 0);
    const showBreak = !!St.state.ui.openBreakdown[c.id];
    const durBody = c.duration === "dates" ? `
        <label class="field"><span class="lbl">${esc(t("case.start"))}</span>${dateInput(B("start"), c.start)}</label>
        <label class="field"><span class="lbl">${esc(t("case.end"))}</span>${dateInput(B("end"), c.end)}</label>` : "";
    const manualBox = c.duration === "manual" ? `
      <div class="manualBox">
        <div class="row between"><div><strong style="font-size:13px">${esc(t("case.manualYears"))}</strong><p class="hint">${esc(t("case.manualHint"))}</p></div><button type="button" class="softBtn" data-a="addManualYear" data-id="${id}">${ICON.plus}${esc(t("case.addYear"))}</button></div>
        ${c.manualYears.length ? `<div class="manualRow head"><span>${esc(t("case.year"))}</span><span>${esc(t("case.months"))}</span><span></span></div>` : ""}
        ${c.manualYears.map(m => `<div class="manualRow" data-key="my-${esc(m.id)}">
          <input class="input sm num" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="${esc(t("case.year"))}" value="${esc(m.year)}" data-b="my" data-id="${id}" data-row="${esc(m.id)}" data-k="year" data-enter>
          <input class="input sm num" inputmode="decimal" autocomplete="off" placeholder="1–12" value="${esc(m.months)}" data-b="my" data-id="${id}" data-row="${esc(m.id)}" data-k="months" data-enter>
          <button type="button" class="iconBtn sm danger" data-a="removeManualYear" data-id="${id}" data-row="${esc(m.id)}" aria-label="${esc(t("act.remove"))}">${ICON.close}</button></div>`).join("")}
      </div>` : c.duration === "none" ? `<div class="notice info">${ICON.info}<span>${esc(t("case.none." + S.distribution))}</span></div>` : "";
    const options = invest ? `
      <div class="block">
        <div class="blockHead"><span class="blockLabel">${esc(t("case.options"))}</span>${St.ws().cases.length > 1 ? `<button type="button" class="ghostBtn" data-a="applyLogic" data-id="${id}">${ICON.applyAll}${esc(t("case.applyLogic"))}</button>` : ""}</div>
        <div class="optGrid">
          <div class="field"><span class="lbl">${esc(t("case.rateSource"))}</span>${seg(t("case.rateSource"), c.rateSource, [{ v: "table", l: t("rate.table"), a: `data-a="caseSet" data-id="${id}" data-k="rateSource" data-v="table"` }, { v: "fixed", l: t("rate.fixed"), a: `data-a="caseSet" data-id="${id}" data-k="rateSource" data-v="fixed"` }])}</div>
          ${c.rateSource === "fixed"
            ? `<label class="field"><span class="lbl">${esc(t("case.fixedRate"))}</span><div class="inputWrap"><input class="input num${!E.isBlank(c.fixedRate) && !Number.isFinite(E.toNum(c.fixedRate)) ? " bad" : ""}" inputmode="decimal" autocomplete="off" value="${esc(c.fixedRate)}" ${B("fixedRate")} data-t="num" data-enter><span class="suffix">%</span></div></label>`
            : `<label class="field"><span class="lbl">${esc(t("rate.table"))}</span>${select(B("rateTable") + ' data-t="select"', c.rateTable && tables.some(x => x.id === c.rateTable) ? c.rateTable : "", [{ v: "", l: `${tableName(St.defaultTableId())} ★` }].concat(tables.filter(x => x.id !== St.defaultTableId()).map(x => ({ v: x.id, l: x.name }))))}</label>`}
          <label class="field"><span class="lbl">${esc(t("case.rounding"))}</span>${select(B("rounding") + ' data-t="select"', c.rounding, E.ROUNDINGS.map(v => ({ v, l: t("round." + v) })))}</label>
          <label class="field"><span class="lbl">${esc(t("case.frequency"))}</span>${select(B("frequency") + ' data-t="select"', c.frequency || "", [{ v: "", l: inheritedFreq }].concat(E.FREQUENCIES.map(v => ({ v, l: t("freq." + v) }))))}</label>
        </div>
        <div class="row between">
          ${seg(t("case.compounding"), c.compounding ? "c" : "s", [{ v: "c", l: t("cmp.compound"), a: `data-a="caseSet" data-id="${id}" data-k="compounding" data-v="true"` }, { v: "s", l: t("cmp.simple"), a: `data-a="caseSet" data-id="${id}" data-k="compounding" data-v="false"` }], { sm: true })}
          ${c.rateSource === "fixed" && S.extraRateEnabled && S.extraRate ? sw(c.fixedRateAddsExtra, `data-b="case" data-id="${id}" data-k="fixedRateAddsExtra" data-t="bool"`, t("case.fixedAddsExtra", { v: extraTxt })) : ""}
        </div>
      </div>` : "";
    let summary = "";
    if (res) {
      const unit = unitOf();
      summary = `<div class="summaryStrip">
        <div><span>${esc(t("m.base"))}</span><strong class="money">${esc(U.money(res.base))}</strong></div>
        ${res.invest ? `<div><span>${esc(t("m.principal"))}</span><strong class="money">${esc(U.money(res.principal))}</strong></div>` : ""}
        ${res.invest ? `<div class="wide"><span>${esc(t("m.period"))} · ${esc(durationText(res.segments, unit))}</span><strong class="num" style="font-size:12.5px">${esc(caseWindow(res))}</strong></div>` : ""}
        ${res.invest ? `<div class="hl"><span>${esc(t("m.return"))}</span><strong class="money">${esc(U.money(res.returnValue))}</strong></div>` : ""}
        <div class="hl"><span>${esc(t("m.due"))}</span><strong class="money">${esc(U.money(res.due))}</strong></div>
      </div>`;
      if (res.invest && res.segments.length) {
        summary += `<div><button type="button" class="linkBtn" data-a="toggleBreakdown" data-id="${id}" aria-expanded="${showBreak}">${ICON.chevDown}${esc(t("case.breakdown"))}</button></div>`;
        if (showBreak) summary += `<div class="breakdown"><table><thead><tr><th>${esc(t("col.year"))}</th><th>${esc(t("col.period"))}</th><th class="n">${esc(t("col.opening"))}</th><th class="n">${esc(t("col.applied"))}</th><th class="n">${esc(t("col.duration"))}</th><th class="n">${esc(t("col.factor"))}</th><th class="n">${esc(t("col.return"))}</th></tr></thead><tbody>${res.segments.map(s => `<tr><td class="num">${s.year}</td><td>${esc(segPeriod(s))}</td><td class="n">${esc(U.money(s.open))}</td><td class="n">${esc(U.pct(s.appliedRate))}${s.periods > 1 ? ` <span class="faint">×${s.periods}</span>` : ""}</td><td class="n">${esc(segDuration(s, unit))}</td><td class="n">${esc(U.num(s.factor, 6))}</td><td class="n strong">${esc(U.money(s.value))}</td></tr>`).join("")}</tbody></table></div>`;
      }
    }
    return `<article class="caseCard ${collapsed ? "collapsed" : ""}" data-key="case-${id}" id="case-${id}" data-case="${id}">
      <div class="caseHead">
        <span class="caseNo">${U.numText(i + 1, 0)}</span>
        <input class="caseName" value="${esc(c.name)}" placeholder="${esc(caseLabel(c, i))}" aria-label="${esc(t("case.namePh"))}" ${B("name")} data-t="text" data-enter>
        <div class="caseGlance">${status}${res ? `<span class="money" title="${esc(t("m.due"))}">${esc(U.money(res.due))}</span>` : ""}</div>
        <div class="caseTools">
          <button type="button" class="iconBtn sm" data-a="caseMenu" data-id="${id}" aria-label="${esc(t("act.more"))}" aria-haspopup="menu">${ICON.more}</button>
          <button type="button" class="iconBtn sm" data-a="toggleCase" data-id="${id}" aria-expanded="${!collapsed}" aria-controls="cb-${id}" aria-label="${esc(t(collapsed ? "act.expand" : "act.collapse"))}"><span class="chev">${ICON.chevDown}</span></button>
        </div>
      </div>
      <div class="caseBody" id="cb-${id}"${collapsed ? " inert" : ""}><div class="caseInner"><div class="caseContent">
        <div class="field"><span class="lbl">${esc(t("case.duration"))}</span>${seg(t("case.duration"), c.duration, E.DURATIONS.map(v => ({ v, l: t("dur." + v), a: `data-a="caseSet" data-id="${id}" data-k="duration" data-v="${v}"` })))}</div>
        <div class="grid g4">
          <label class="field"><span class="lbl">${esc(t("case.shortage"))}</span><div class="inputWrap"><input class="input num${!E.isBlank(c.shortage) && !(E.toNum(c.shortage) > 0) ? " bad" : ""}" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(U.formatMoneyInput(c.shortage))}" ${B("shortage")} data-t="money" data-enter>${St.state.prefs.currency ? `<span class="suffix">${esc(St.state.prefs.currency)}</span>` : ""}</div></label>
          <label class="field"><span class="lbl">${esc(t("case.expenseRate"))}</span><div class="inputWrap"><input class="input num" inputmode="decimal" autocomplete="off" value="${esc(c.expenseRate)}" ${B("expenseRate")} data-t="num" data-enter${c.include.expenses ? "" : " disabled"}><span class="suffix">%</span></div></label>
          ${durBody}
        </div>
        ${manualBox}
        <div class="block">
          <span class="blockLabel">${esc(t("case.components"))}</span>
          <div class="row between">
            <div class="chips">${chip(c.include.shortage, t("comp.shortage"), `data-a="caseToggle" data-id="${id}" data-k="include.shortage"`)}${chip(c.include.expenses, t("comp.expenses"), `data-a="caseToggle" data-id="${id}" data-k="include.expenses"`)}</div>
            ${c.duration === "none" ? "" : sw(c.include.investment !== false, `data-b="case" data-id="${id}" data-k="include.investment" data-t="bool"`, t("case.invest"))}
          </div>
          ${c.duration === "none" ? "" : `<div class="collapse ${invest ? "open" : ""}"><div><div class="subRow"><span class="blockLabel">${esc(t("case.investOn"))}</span>${chip(c.include.shortage && c.investOn.shortage, t("comp.shortage"), `data-a="caseToggle" data-id="${id}" data-k="investOn.shortage"`, true, !c.include.shortage)}${chip(c.include.expenses && c.investOn.expenses, t("comp.expenses"), `data-a="caseToggle" data-id="${id}" data-k="investOn.expenses"`, true, !c.include.expenses)}</div></div></div>`}
        </div>
        ${options}
        <label class="field"><span class="lbl">${esc(t("case.notes"))}</span><input class="input" value="${esc(c.notes)}" placeholder="${esc(t("case.notesPh"))}" ${B("notes")} data-t="text"></label>
        ${caseIssues.length ? `<div class="notices">${caseIssues.map(x => noticeHTML(x)).join("")}</div>` : ""}
        ${summary}
      </div></div></div>
    </article>`;
  }

  V.people = function (r) {
    const s = St.state, S = s.settings, w = St.ws();
    const q = s.ui.peopleFilter.trim().toLowerCase();
    const list = q ? w.people.filter(p => String(p.name).toLowerCase().includes(q)) : w.people;
    const shown = list.slice(0, s.ui.peopleLimit);
    const sum = new Map(r.people.map(p => [p.personId, p]));
    const maxAmt = Math.max(0, ...r.people.map(p => Math.abs(p.amount)));
    const issuesByPerson = new Map();
    r.issues.forEach(i => { if (i.personId && !issuesByPerson.has(i.personId)) issuesByPerson.set(i.personId, i); });
    [...V.selected].forEach(id => { if (!w.people.some(p => p.id === id)) V.selected.delete(id); });
    const selCount = V.selected.size;
    const allSel = shown.length > 0 && shown.every(p => V.selected.has(p.id));
    const someSel = !allSel && shown.some(p => V.selected.has(p.id));
    const days = S.distribution === "days", shares = S.distribution === "shares";
    const firstDated = w.cases.find(c => c.duration === "dates" && (c.start || c.end));
    const rows = shown.map(p => {
      const st = sum.get(p.id);
      const iss = issuesByPerson.get(p.id);
      const idx = w.people.indexOf(p);
      const jBad = !E.isBlank(p.join) && E.parseISO(p.join) === null;
      const lBad = !E.isBlank(p.leave) && E.parseISO(p.leave) === null;
      const P = k => `data-b="person" data-id="${esc(p.id)}" data-k="${k}"`;
      return `<tr data-key="p-${esc(p.id)}" id="person-${esc(p.id)}" class="${V.selected.has(p.id) ? "selected" : ""}${iss && iss.severity !== "info" ? " warnRow" : ""}">
        <td class="sel"><input type="checkbox" class="check" aria-label="${esc(t("act.open"))}"${V.selected.has(p.id) ? " checked" : ""} data-a="selPerson" data-id="${esc(p.id)}"></td>
        <td class="idx">${U.numText(idx + 1, 0)}</td>
        <td><input class="cellInput" value="${esc(p.name)}" placeholder="${esc(t("people.namePh"))}" aria-label="${esc(t("people.name"))}" ${P("name")} data-t="text" data-enter data-row-enter>${iss ? `<span class="personWarn">${esc(issueText(iss))}</span>` : ""}</td>
        <td>${dateInput(P("join"), p.join, true, `aria-label="${esc(t("people.join"))}" data-enter`)}</td>
        <td>${dateInput(P("leave"), p.leave, true, `aria-label="${esc(t("people.leave"))}" data-enter data-row-enter`)}</td>
        ${shares ? `<td><input class="cellInput short num" inputmode="decimal" placeholder="1" value="${esc(p.share)}" aria-label="${esc(t("people.share"))}" ${P("share")} data-t="num" data-enter data-row-enter></td>` : ""}
        ${days ? `<td class="n muted">${st ? esc(U.num(st.weight, 0)) : "—"}</td>` : ""}
        <td class="n">${st ? `<span class="money strong">${esc(U.money(st.amount))}</span><span class="bar"><i style="width:${maxAmt > 0 ? Math.round(Math.abs(st.amount) / maxAmt * 100) : 0}%"></i></span>` : `<span class="faint">—</span>`}</td>
        <td class="acts">
          ${firstDated ? `<button type="button" class="iconBtn sm hideXs" data-a="personSameAsCase" data-id="${esc(p.id)}" title="${esc(t("people.sameAsCase"))}" aria-label="${esc(t("people.sameAsCase"))}">${ICON.calendar}</button>` : ""}
          <button type="button" class="iconBtn sm hideXs" data-a="dupPerson" data-id="${esc(p.id)}" title="${esc(t("act.duplicate"))}" aria-label="${esc(t("act.duplicate"))}">${ICON.copy}</button>
          <button type="button" class="iconBtn sm danger" data-a="removePerson" data-id="${esc(p.id)}" title="${esc(t("act.remove"))}" aria-label="${esc(t("act.remove"))}">${ICON.close}</button>
        </td></tr>`;
    }).join("");
    const colCount = 6 + (shares ? 1 : 0) + (days ? 1 : 0) + 1;
    const toolsOpen = s.ui.toolsOpen;
    const distHint = t("dist.hint." + S.distribution);
    return `<div class="view" data-key="v-people">
      <section class="card distCard" data-key="dist-card">
        <div class="distGrid">
          <div class="field"><span class="lbl">${esc(t("dist.title"))}</span>${seg(t("dist.title"), S.distribution, E.DISTRIBUTIONS.map(v => ({ v, l: t("dist." + v), a: `data-a="setSetting" data-k="distribution" data-v="${v}"` })))}<p class="hint">${esc(distHint)}</p></div>
          ${days ? `<div class="grid" style="gap:14px">
            <div class="field"><span class="lbl">${esc(t("invmode.title"))}</span>${seg(t("invmode.title"), S.investmentMode, [{ v: "blended", l: t("invmode.blended"), a: `data-a="setSetting" data-k="investmentMode" data-v="blended"` }, { v: "perPeriod", l: t("invmode.perPeriod"), a: `data-a="setSetting" data-k="investmentMode" data-v="perPeriod"` }], { sm: true })}</div>
            <div class="field"><span class="lbl">${esc(t("basis.title"))}</span>${seg(t("basis.title"), S.presenceBasis, [{ v: "working", l: t("basis.working"), a: `data-a="setSetting" data-k="presenceBasis" data-v="working"` }, { v: "calendar", l: t("basis.calendar"), a: `data-a="setSetting" data-k="presenceBasis" data-v="calendar"` }], { sm: true })}</div>
            <p class="hint">${esc(t("invmode.hint"))}</p>
          </div>` : ""}
        </div>
      </section>
      <section class="card" data-key="people-card" aria-labelledby="peopleTitle">
        <div class="cardHead">
          <div class="cardTitle"><div class="counter">${U.numText(w.people.length, 0)}</div><div><h2 id="peopleTitle">${esc(t("people.title"))}</h2><p>${esc(t("people.hint"))}</p></div></div>
          <div class="toolbar">
            <div class="searchWrap">${ICON.search}<input class="input" type="search" placeholder="${esc(t("people.search"))}" value="${esc(s.ui.peopleFilter)}" data-b="ui" data-k="peopleFilter" aria-label="${esc(t("people.search"))}"></div>
            <button type="button" class="iconBtn" data-a="peopleMenu" aria-label="${esc(t("act.more"))}" aria-haspopup="menu">${ICON.more}</button>
            <button type="button" class="primaryBtn" data-a="addPerson">${ICON.plus}${esc(t("people.add"))}</button>
          </div>
        </div>
        ${selCount ? `<div class="notice info" style="margin-bottom:12px;align-items:center">${ICON.users}<span class="grow">${esc(t("people.selected", { n: U.numText(selCount, 0) }))}</span><button type="button" class="ghostBtn" data-a="clearSel">${esc(t("act.cancel"))}</button><button type="button" class="ghostBtn danger" data-a="deleteSelected">${ICON.trash}${esc(t("people.deleteSelected"))}</button></div>` : ""}
        <div class="tools ${toolsOpen ? "open" : ""}" style="margin-bottom:14px">
          <button type="button" class="toolsHead" data-a="toggleTools" aria-expanded="${toolsOpen}">${ICON.sliders}<span>${esc(t("people.tools"))}</span><span class="chev">${ICON.chevDown}</span></button>
          ${toolsOpen ? `<div class="toolsBody">
            <div class="toolBox"><h4>${esc(t("people.bulkAdd"))}</h4><div class="grid g2"><input class="input sm num" id="bulkCount" inputmode="numeric" placeholder="${esc(t("people.bulkCount"))}" aria-label="${esc(t("people.bulkCount"))}"><input class="input sm" id="bulkPrefix" placeholder="${esc(t("people.bulkPrefixPh"))}" aria-label="${esc(t("people.bulkPrefix"))}"></div><button type="button" class="softBtn" data-a="bulkAdd">${ICON.plus}${esc(t("people.bulkAdd"))}</button></div>
            <div class="toolBox"><h4>${esc(t("people.paste"))}</h4><textarea class="input" id="pasteArea" rows="3" placeholder="${esc(t("people.pastePh"))}" aria-label="${esc(t("people.paste"))}"></textarea><p class="hint">${esc(t("people.pasteHint"))}</p><button type="button" class="softBtn" data-a="pastePeople">${ICON.download}${esc(t("act.import"))}</button></div>
            <div class="toolBox"><h4>${esc(t("people.upload"))}</h4><p class="hint">${esc(t("people.pasteHint"))}</p><div class="row"><button type="button" class="softBtn" data-a="uploadPeople">${ICON.upload}${esc(t("people.upload"))}</button><button type="button" class="ghostBtn" data-a="peopleTemplate">${ICON.file}${esc(t("people.template"))}</button></div>${firstDated ? `<button type="button" class="ghostBtn accent" data-a="fillDates" data-all="0">${ICON.calendar}${esc(t("people.fillDates"))}</button>` : ""}</div>
          </div>` : ""}
        </div>
        <div class="tableShell">
          <table class="peopleTable">
            <thead><tr>
              <th class="sel"><input type="checkbox" class="check" aria-label="${esc(t("people.selected", { n: "" }))}"${allSel ? " checked" : ""}${someSel ? " data-indeterminate" : ""} data-a="selAll"></th>
              <th class="idx">#</th><th>${esc(t("people.name"))}</th><th>${esc(t("people.join"))}</th><th>${esc(t("people.leave"))}</th>
              ${shares ? `<th>${esc(t("people.share"))}</th>` : ""}${days ? `<th class="n">${esc(t("people.days"))}</th>` : ""}<th class="n">${esc(t("people.amount"))}</th><th class="acts"></th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="${colCount}"><div class="emptyState">${ICON.users}<span>${esc(t(q ? "people.noMatch" : "people.empty"))}</span></div></td></tr>`}</tbody>
            ${r.people.length ? `<tfoot><tr><td></td><td></td><td>${esc(t("people.count", { n: U.numText(r.totals.people, 0) }))}</td><td></td><td></td>${shares ? "<td></td>" : ""}${days ? `<td class="n">${esc(U.num(r.people.reduce((a, p) => a + p.weight, 0), 0))}</td>` : ""}<td class="n money">${esc(U.money(r.totals.distributed))}</td><td></td></tr></tfoot>` : ""}
          </table>
        </div>
        ${list.length > shown.length ? `<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="softBtn" data-a="morePeople">${esc(t("people.showMore", { n: U.numText(list.length - shown.length, 0) }))}</button></div>` : ""}
        ${r.totals.unallocated ? `<div class="notice" style="margin-top:12px">${ICON.warn}<span>${esc(t("misc.unallocated"))}: <span class="money strong">${esc(U.money(r.totals.unallocated))}</span></span></div>` : ""}
      </section>
      ${days ? weightsCard(r) : ""}
    </div>`;
  };

  function weightsCard(r) {
    const s = St.state, w = St.ws();
    const perPeriod = s.settings.investmentMode === "perPeriod";
    const valid = new Map(r.cases.map(c => [c.id, c]));
    const cols = [];
    w.cases.forEach((c, i) => {
      const dated = c.duration === "dates";
      if (dated && !s.ui.showDatedWeights) return;
      const res = valid.get(c.id);
      if (c.duration === "manual" && perPeriod && res && res.segments.length) res.segments.forEach(sg => cols.push({ c, i, year: sg.year }));
      else cols.push({ c, i, year: null, res });
    });
    const people = w.people.filter(p => String(p.name).trim());
    const rowsByCase = new Map();
    r.rows.forEach(x => rowsByCase.set(x.caseId + "|" + x.personId, x));
    const body = !cols.length ? `<p class="hint">${esc(t("weights.none"))}</p>` : !people.length ? `<p class="hint">${esc(t("issue.global.noPeople"))}</p>` : `<div class="tableShell"><table class="weightsTable">
      <thead><tr><th>${esc(t("col.person"))}</th>${cols.map(col => `<th class="n">${esc(caseLabel(col.c, col.i))}<small>${col.year ? esc(String(col.year)) : esc(t("dur." + col.c.duration))}</small></th>`).join("")}</tr></thead>
      <tbody>${people.map(p => `<tr data-key="w-${esc(p.id)}"><td>${esc(p.name)}</td>${cols.map(col => {
        const o = p.overrides[col.c.id] || { days: "", years: {} };
        if (col.year) return `<td><input class="cellInput num" inputmode="decimal" placeholder="0" value="${esc(o.years[col.year] || "")}" data-b="ovr" data-pid="${esc(p.id)}" data-cid="${esc(col.c.id)}" data-y="${col.year}" data-t="num" data-enter aria-label="${esc(p.name)} ${col.year}"></td>`;
        const row = rowsByCase.get(col.c.id + "|" + p.id);
        const auto = row && row.source === "dates" ? U.num(row.weight, 0) : "";
        return `<td><input class="cellInput num" inputmode="decimal" placeholder="${esc(auto ? `${t("weights.auto")} ${auto}` : "0")}" value="${esc(o.days)}" data-b="ovr" data-pid="${esc(p.id)}" data-cid="${esc(col.c.id)}" data-t="num" data-enter aria-label="${esc(p.name)} ${esc(caseLabel(col.c, col.i))}"></td>`;
      }).join("")}</tr>`).join("")}</tbody></table></div>`;
    return `<section class="card" data-key="weights-card">
      <div class="cardHead"><div class="cardTitle"><div class="counter">${ICON.sliders}</div><div><h2>${esc(t("weights.title"))}</h2><p>${esc(t("weights.hint"))}</p></div></div>${sw(s.ui.showDatedWeights, 'data-b="ui" data-k="showDatedWeights" data-t="bool"', t("weights.showDated"))}</div>
      ${body}
    </section>`;
  }

  const C = { m: v => ({ v, f: "m" }), n: (v, d) => ({ v, f: "n", d }), p: v => ({ v, f: "p" }), t: v => ({ v: v === null || v === undefined ? "" : String(v), f: "t" }), e: () => ({ v: "", f: "t" }) };
  V.C = C;
  V.buildTables = function (r) {
    const unit = unitOf();
    const S = St.state.settings;
    const out = {};
    const logic = c => [c.invest ? (c.compounding ? t("cmp.compound") : t("cmp.simple")) : t("ex.noReturn").split(":")[0], c.invest ? t("freq." + c.frequency) : "", c.invest ? t("round." + c.rounding) : "", c.invest ? (c.rateSource === "fixed" ? `${t("rate.fixed")} ${U.pct(c.fixedRate)}` : tableName(c.rateTable)) : "", c.personAuthoritative ? t("invmode.perPeriod") : ""].filter(Boolean).join(" · ");
    const L = { key: "ledger", title: t("tab.ledger"), head: [t("col.case"), t("col.year"), t("col.period"), t("col.base"), t("col.opening"), t("col.rate"), t("col.extra"), t("col.applied"), t("col.duration"), t("col.factor"), t("col.return"), t("col.due"), t("col.logic")], num: [3, 4, 5, 6, 7, 9, 10, 11], rows: [], foot: null };
    r.cases.forEach(c => {
      const name = caseLabel(St.ws().cases[c.index], c.index);
      const g = c.id;
      L.rows.push({ g, cls: "sub", cells: [C.t(name), C.e(), C.t(caseWindow(c)), C.m(c.base), c.invest ? C.m(c.principal) : C.e(), C.e(), C.e(), C.e(), C.t(c.invest ? durationText(c.segments, unit) : ""), C.e(), C.m(c.returnValue), C.m(c.due), C.t(logic(c))] });
      c.segments.forEach(s => L.rows.push({ g, cls: "child", cells: [C.t(name), C.n(s.year, 0), C.t(segPeriod(s)), C.e(), C.m(s.open), C.p(s.annualRate), C.p(s.extraRate), C.p(s.appliedRate), C.t(segDuration(s, unit)), C.n(s.factor, 6), C.m(s.value), C.e(), C.t(s.periods > 1 ? `${s.periods} × ${t("freq." + c.frequency)}` : "")] }));
    });
    L.foot = [C.t(t("col.total")), C.e(), C.e(), C.m(r.totals.base), C.m(r.totals.principal), C.e(), C.e(), C.e(), C.e(), C.e(), C.m(r.totals.returnValue), C.m(r.totals.due), C.e()];
    out.ledger = L;
    const eq = S.distribution === "equal";
    const Pt = { key: "people", title: t("tab.people"), head: [t("col.person")].concat(eq ? [] : [S.distribution === "shares" ? t("people.share") : t("col.weight")]).concat([t("col.cases"), t("col.principal"), t("col.baseShare"), t("col.return"), t("col.due")]), rows: [], foot: null };
    const off = eq ? 0 : 1;
    Pt.num = [1, 2, 3, 4, 5].map(x => x + off).concat(eq ? [] : [1]);
    r.people.forEach(p => Pt.rows.push({ g: p.personId, cells: [C.t(p.personName)].concat(eq ? [] : [C.n(p.weight, 2)]).concat([C.n(p.cases, 0), C.m(p.principal), C.m(p.base), C.m(p.returnValue), C.m(p.amount)]) }));
    if (r.totals.unallocated) Pt.rows.push({ g: "_u", cls: "warnRow", cells: [C.t(t("misc.unallocated"))].concat(eq ? [] : [C.e()]).concat([C.e(), C.e(), C.e(), C.e(), C.m(r.totals.unallocated)]) });
    Pt.foot = [C.t(t("col.total"))].concat(eq ? [] : [C.n(r.people.reduce((a, p) => a + p.weight, 0), 2)]).concat([C.e(), C.m(r.people.reduce((a, p) => a + p.principal, 0)), C.m(r.people.reduce((a, p) => a + p.base, 0)), C.m(r.people.reduce((a, p) => a + p.returnValue, 0)), C.m(r.totals.due)]);
    out.people = Pt;
    const Dt = { key: "detail", title: t("tab.detail"), head: [t("col.person"), t("col.case"), t("col.weight"), t("col.ratio"), t("col.year"), t("col.period"), t("col.opening"), t("col.applied"), t("col.factor"), t("col.return"), t("col.due")], num: [2, 3, 4, 6, 7, 8, 9, 10], rows: [] };
    const detByKey = new Map();
    r.details.forEach(d => { const k = d.caseId + "|" + d.personId; if (!detByKey.has(k)) detByKey.set(k, []); detByKey.get(k).push(d); });
    r.people.forEach(p => {
      r.rows.filter(x => x.personId === p.personId && (x.amount !== 0 || x.weight > 0)).forEach(x => {
        const c = r.cases.find(cc => cc.id === x.caseId);
        const cname = caseLabel(St.ws().cases[c.index], c.index);
        Dt.rows.push({ g: p.personId, cls: "sub", cells: [C.t(p.personName), C.t(cname), eq ? C.e() : C.n(x.weight, 2), C.p(Math.round(x.ratio * 1e6) / 1e4), C.e(), C.t(caseWindow(c)), C.m(x.principal), C.e(), C.e(), C.m(x.returnValue), C.m(x.amount)] });
        (detByKey.get(x.caseId + "|" + p.personId) || []).forEach(d => Dt.rows.push({ g: p.personId, cls: "child" + (d.present ? "" : " muteRow"), cells: [C.t(p.personName), C.t(cname), C.e(), C.e(), C.n(d.year, 0), C.t(d.manual ? String(d.year) : U.range(d.from, d.to)), C.m(d.open), C.p(d.rate), C.n(d.factor, 6), C.m(d.value), C.e()] }));
      });
    });
    out.detail = Dt;
    out.excluded = { key: "excluded", title: t("report.excluded"), head: [t("col.case"), t("col.reason"), t("col.notes")], num: [], rows: r.excluded.map(x => ({ g: x.id, cells: [C.t(caseLabel(St.ws().cases[x.index], x.index)), C.t(issueText({ code: "case." + x.issue, params: x.params || {} })), C.t(St.ws().cases[x.index] && St.ws().cases[x.index].notes || "")] })) };
    out.issues = { key: "issues", title: t("tab.issues"), head: [t("col.case"), t("col.person"), t("issues.title")], num: [], rows: r.issues.map((x, k) => ({ g: "i" + k, cells: [C.t(x.caseId ? caseNameById(x.caseId) : ""), C.t(x.personId ? personNameById(x.personId) : ""), C.t(issueText(x))] })) };
    return out;
  };

  function cellHTML(c) {
    if (c.f === "m") return c.v === "" ? "" : esc(U.money(c.v));
    if (c.f === "n") return esc(c.d === 0 ? String(c.v) : U.num(c.v, c.d));
    if (c.f === "p") return esc(U.pct(c.v));
    return esc(c.v);
  }
  V.cellText = c => (c.f === "t" ? c.v : c.v === "" ? "" : c.f === "m" ? U.money(c.v) : c.f === "p" ? U.pct(c.v) : c.d === 0 ? String(c.v) : U.num(c.v, c.d));
  function filterRows(tb, q) {
    if (!q) return tb.rows;
    const groups = new Map();
    tb.rows.forEach(rw => { const txt = rw.cells.map(V.cellText).join(" ").toLowerCase(); if (txt.includes(q)) groups.set(rw.g, true); });
    return tb.rows.filter(rw => groups.has(rw.g));
  }
  V.filterRows = filterRows;
  function tableHTML(tb, q, opts) {
    const rows = filterRows(tb, q);
    const numCols = new Set(tb.num || []);
    if (!tb.rows.length) return `<div class="emptyState">${ICON.report}<span>${esc(t("report.empty"))}</span></div>`;
    if (!rows.length) return `<div class="emptyState">${ICON.search}<span>${esc(t("pal.empty"))}</span></div>`;
    const limit = opts && opts.limit ? opts.limit : Infinity;
    return `<div class="tableShell"><table><thead><tr>${tb.head.map((h, i) => `<th class="${numCols.has(i) ? "n" : ""}">${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.slice(0, limit).map((rw, k) => `<tr data-key="r${k}" class="${rw.cls || ""}">${rw.cells.map((c, i) => `<td class="${numCols.has(i) ? "n" : ""}${c.f === "m" && rw.cls === "sub" ? " strong" : ""}">${i === 0 && rw.cls && rw.cls.includes("child") ? "" : cellHTML(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      ${tb.foot && !q ? `<tfoot><tr>${tb.foot.map((c, i) => `<td class="${numCols.has(i) ? "n" : ""}">${cellHTML(c)}</td>`).join("")}</tr></tfoot>` : ""}</table></div>`;
  }
  V.tableHTML = tableHTML;

  function explainHTML(r) {
    const S = St.state.settings;
    const unit = unitOf();
    const w = St.ws();
    if (!r.cases.length) return `<div class="emptyState">${ICON.book}<span>${esc(t("report.empty"))}</span></div>`;
    const q = St.state.ui.filter.trim().toLowerCase();
    const items = r.cases.filter(c => !q || caseLabel(w.cases[c.index], c.index).toLowerCase().includes(q)).map(c => {
      const parts = [];
      if (c.incShortage) parts.push(`${t("comp.shortage")} ${U.money(c.shortage)}`);
      if (c.incExpenses) parts.push(`${t("comp.expenses")} ${U.pct(c.expenseRate)} = ${U.money(c.expense)}`);
      const pparts = [];
      if (c.onShortage) pparts.push(t("comp.shortage"));
      if (c.onExpenses) pparts.push(t("comp.expenses"));
      const lines = [`<li>${esc(t("ex.basis", { parts: parts.join(t("misc.plus")), v: U.money(c.base) }))}</li>`];
      if (c.invest) {
        lines.push(`<li>${esc(t("ex.principal", { parts: pparts.join(t("misc.plus")), v: U.money(c.principal) }))}</li>`);
        if (c.duration === "dates") lines.push(`<li>${esc(t("ex.window", { conv: convName(S.convention), p: caseWindow(c) }))}</li>`);
        lines.push(`<li>${esc(c.rateSource === "fixed" ? t("ex.rateFixed", { v: U.pct(c.fixedRate) }) : t("ex.rateTable", { name: tableName(c.rateTable) }))}${c.segments[0] && c.segments[0].extraRate ? " " + esc(t("ex.extra", { v: U.pct(c.segments[0].extraRate) })) : ""} · ${esc(t(c.compounding ? "ex.compound" : "ex.simple"))} · ${esc(t("freq." + c.frequency))}</li>`);
        c.segments.forEach(s => lines.push(`<li><strong class="num">${s.year}</strong> · ${esc(segPeriod(s))} (${esc(segDuration(s, unit))}) — ${U.moneyH(s.open)} × ${U.pctH(s.appliedRate)} × ${U.numH(s.factor, 6)}${s.periods > 1 ? ` <span class="faint">(${s.periods} ${esc(t("freq." + c.frequency))})</span>` : ""} = ${U.moneyH(s.value)}</li>`));
      } else lines.push(`<li>${esc(t("ex.noReturn"))}</li>`);
      const W = c.weightTotal;
      const dist = !r.totals.people ? t("issue.global.noPeople") : S.distribution === "equal" ? t("ex.dist.equal", { n: U.numText(r.totals.people, 0) }) : S.distribution === "shares" ? t("ex.dist.shares", { w: U.num(W) }) : t("ex.dist.days", { w: U.num(W, 0) });
      return `<article class="explainCase" data-key="ex-${esc(c.id)}"><h3><span class="caseNo">${U.numText(c.index + 1, 0)}</span>${esc(caseLabel(w.cases[c.index], c.index))}</h3>
        <ul class="explainList">${lines.join("")}</ul>
        <p class="explainNote">${esc(t("ex.result", { r: U.money(c.returnValue), d: U.money(c.due) }))} · ${esc(dist)}${c.personAuthoritative ? " " + esc(t("ex.perPeriod")) : ""}</p></article>`;
    }).join("");
    return `<div class="grid" style="gap:14px">${items}</div>`;
  }

  function reconHTML(r) {
    if (!r.cases.length) return "";
    const w = St.ws();
    if (!r.totals.people) return `<div class="notice info">${ICON.info}<span>${esc(t("recon.noPeople"))}</span></div>`;
    const bad = r.cases.filter(c => c.unallocated !== 0);
    if (!bad.length) return `<div class="reconRow ok"><span class="rn">${ICON.ok} ${esc(t("recon.all"))}</span><span class="rf money">${esc(U.money(r.totals.distributed))} = ${esc(U.money(r.totals.due))}</span></div>`;
    return `<div class="recon">${r.cases.map(c => `<div class="reconRow ${c.unallocated ? "bad" : "ok"}"><span class="rn">${c.unallocated ? ICON.warn : ICON.ok} ${esc(caseLabel(w.cases[c.index], c.index))}</span><span class="rf">${esc(c.unallocated ? t("recon.diff", { v: U.money(c.unallocated) }) : t("recon.ok"))} · <span class="money">${esc(U.money(c.due))}</span></span></div>`).join("")}</div>`;
  }

  function issuesListHTML(r, compact) {
    if (!r.issues.length) return `<div class="emptyState">${ICON.ok}<span>${esc(t("issues.empty"))}</span></div>`;
    const groups = { error: [], warning: [], info: [] };
    r.issues.forEach(x => groups[x.severity].push(x));
    return Object.keys(groups).filter(k => groups[k].length).map(k => `${compact ? "" : `<div class="issueGroup">${esc(t("sev." + k))} · ${U.numText(groups[k].length, 0)}</div>`}${groups[k].map((x, n) => {
      const ctx = x.caseId ? caseNameById(x.caseId) : x.personId ? personNameById(x.personId) : "";
      return `<div class="issueItem ${x.severity}" data-key="is-${k}-${n}">${issueIcon(x.severity)}<div class="issueText">${ctx ? `<b>${esc(ctx)}</b>` : ""}${esc(issueText(x))}</div><div class="issueActs">${issueActions(x)}${x.caseId || x.personId ? `<button type="button" class="ghostBtn" data-a="goIssue" data-case="${esc(x.caseId || "")}" data-person="${esc(x.personId || "")}">${esc(t("issue.go"))}</button>` : ""}</div></div>`;
    }).join("")}`).join("");
  }
  V.issuesListHTML = issuesListHTML;

  V.report = function (r) {
    const s = St.state, w = St.ws(), m = w.meta;
    const tab = s.ui.reportTab;
    const tbs = V.buildTables(r);
    const q = s.ui.filter.trim().toLowerCase();
    const tabs = [["ledger", "tab.ledger"], ["people", "tab.people"], ["detail", "tab.detail"], ["explain", "tab.explain"], ["issues", "tab.issues"]];
    const now = Date.now();
    let body;
    if (tab === "explain") body = explainHTML(r);
    else if (tab === "issues") body = `<div class="grid" style="gap:4px">${issuesListHTML(r, false)}</div>`;
    else body = tableHTML(tbs[tab], q, { limit: 3000 });
    const MF = (k, lk, pk) => `<div class="metaField"><label for="meta-${k}">${esc(t(lk))}</label><input id="meta-${k}" value="${esc(m[k])}" placeholder="${esc(t(pk))}" data-b="meta" data-k="${k}"></div>`;
    const printAll = V.printing ? ["ledger", "people", "detail"].map(k => `<section class="printSection"><h3>${esc(tbs[k].title)}</h3>${tableHTML(tbs[k], "", {})}</section>`).join("") + (r.excluded.length ? `<section class="printSection"><h3>${esc(tbs.excluded.title)}</h3>${tableHTML(tbs.excluded, "", {})}</section>` : "") + `<section class="printSection"><h3>${esc(t("tab.explain"))}</h3>${explainHTML(r)}</section>` : "";
    return `<div class="view" data-key="v-report">
      <section class="card report" data-key="report-card">
        <div class="letterhead">
          <div class="lhMain"><div class="lhMark">${ICON.logo}</div><div style="flex:1;min-width:0"><input class="titleInput" value="${esc(m.title)}" placeholder="${esc(t("report.defaultTitle"))}" aria-label="${esc(t("report.titlePh"))}" data-b="meta" data-k="title"><p class="hint">${esc(t("app.tagline"))}</p></div></div>
          <div class="lhMeta">${esc(t("report.generated"))}: <span class="num">${esc(U.dateTimeText(now))}</span><br>${esc(t("report.hash"))}: <span class="num">${esc(r.hash)}</span><br>${esc(t("report.engine"))} <span class="num">${esc(r.version)}</span> · ${esc(t("report.sources"))} <span class="num">${esc(St.sources.version || "—")}</span></div>
        </div>
        <div class="metaGrid">${MF("entity", "meta.entity", "meta.entityPh")}${MF("ref", "meta.ref", "meta.refPh")}${MF("preparedBy", "meta.preparedBy", "meta.preparedByPh")}${MF("period", "meta.period", "meta.periodPh")}</div>
        <div class="divider"></div>
        <div class="grid" style="gap:12px">
          ${V.kpis(r)}
          ${r.blocked ? `<div class="notice">${ICON.warn}<div class="grow">${esc(t("report.draft"))}<div class="notice-actions">${issueActions({ code: "case.missingRates", caseId: "", params: { unresolved: r.unresolvedYears, years: r.missingYears } }).replace(/<button[^>]*data-a="ackRates"[\s\S]*?<\/button>/, "")}</div></div></div>` : ""}
          ${r.excluded.length ? `<div class="notice bad">${ICON.error}<div class="grow"><strong>${esc(t("report.excluded"))}:</strong> ${r.excluded.map(x => esc(`${caseLabel(w.cases[x.index], x.index)} — ${issueText({ code: "case." + x.issue, params: x.params || {} })}`)).join(" · ")}</div></div>` : ""}
          <div class="reportBar noPrint">
            <div class="tabs" role="tablist" id="reportTabs"><span class="navPill" aria-hidden="true" data-morph-skip></span>${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-a="reportTab" data-tab="${k}">${esc(t(l))}${k === "issues" && r.issues.length ? `<span class="navCount">${U.numText(r.issues.length, 0)}</span>` : ""}</button>`).join("")}</div>
            <div class="toolbar">
              ${tab !== "issues" ? `<div class="searchWrap">${ICON.search}<input class="input" type="search" placeholder="${esc(t("report.search"))}" value="${esc(s.ui.filter)}" data-b="ui" data-k="filter" aria-label="${esc(t("report.search"))}"></div>` : ""}
              <button type="button" class="iconBtn" data-a="copyTable" title="${esc(t("report.copy"))}" aria-label="${esc(t("report.copy"))}">${ICON.copy}</button>
              <button type="button" class="primaryBtn" data-a="exportMenu" aria-haspopup="menu">${ICON.download}${esc(t("act.export"))}</button>
            </div>
          </div>
          <div id="reportBody" class="noPrint">${body}</div>
          ${printAll ? `<div class="printOnly">${printAll}</div>` : ""}
          ${reconHTML(r)}
        </div>
        <div class="printFoot">${esc(t("app.title"))} · ${esc(t("report.hash"))} ${esc(r.hash)} · ${esc(t("report.engine"))} ${esc(r.version)} · ${esc(U.dateTimeText(now))}</div>
      </section>
    </div>`;
  };

  V.reference = function (r) {
    const S = St.state.settings;
    const sections = [["ref-current", "ref.current"], ["ref-formulas", "ref.formulas"], ["ref-conv", "ref.conventions"], ["ref-dist", "ref.distribution"], ["ref-round", "ref.rounding"], ["ref-guar", "ref.guarantees"], ["ref-edge", "ref.edge"], ["ref-example", "ref.example"], ["ref-rates", "ref.rates"], ["ref-keys", "ref.shortcuts"]];
    const def = St.allTables(I.lang).find(x => x.id === St.defaultTableId());
    const c = r.cases.find(x => x.invest && x.segments.length) || r.cases[0];
    const unit = unitOf();
    const years = def ? Object.keys(def.rates).sort() : [];
    const kb = (keys, label) => `<span>${keys.map(k => `<span class="kbd">${esc(k)}</span>`).join(" ")}</span><span>${esc(t(label))}</span>`;
    return `<div class="view" data-key="v-reference">
      <section class="card" data-key="ref-card">
        <div class="cardHead"><div class="cardTitle"><div class="counter">${ICON.book}</div><div><h2>${esc(t("ref.title"))}</h2><p>${esc(t("ref.hint"))}</p></div></div><div class="toolbar"><button type="button" class="softBtn" data-a="copyReference">${ICON.copy}${esc(t("ref.copy"))}</button></div></div>
        <div class="refGrid">
          <nav class="refToc" aria-label="${esc(t("ref.title"))}">${sections.map(([id, k]) => `<a href="#${id}" data-a="refJump" data-target="${id}">${esc(t(k))}</a>`).join("")}</nav>
          <div id="refBody">
            <section class="refSection" id="ref-current"><h3>${esc(t("ref.current"))}</h3><dl class="defList">
              <dt>${esc(t("set.convention"))}</dt><dd>${esc(convName(S.convention))}</dd>
              <dt>${esc(t("set.frequency"))}</dt><dd>${esc(t("freq." + S.frequency))}</dd>
              <dt>${esc(t("set.roundingUnit"))}</dt><dd class="num">${esc(t("unit." + S.roundingUnit))}</dd>
              <dt>${esc(t("set.extra"))}</dt><dd class="num">${esc(S.extraRateEnabled ? U.pct(S.extraRate) : t("misc.off"))}</dd>
              <dt>${esc(t("set.distribution"))}</dt><dd>${esc(t("dist." + S.distribution))}${S.distribution === "days" ? ` · ${esc(t("invmode." + S.investmentMode))} · ${esc(t("basis." + S.presenceBasis))}` : ""}</dd>
              <dt>${esc(t("cal.weekend"))}</dt><dd>${esc(S.weekend.map(d => I.weekdays()[d]).join(I.lang === "ar" ? "، " : ", ") || "—")}</dd>
              <dt>${esc(t("cal.holidays"))}</dt><dd class="num">${U.numText(S.holidays.length, 0)}</dd>
              <dt>${esc(t("rates.default"))}</dt><dd>${esc(tableName(St.defaultTableId()))}</dd>
              <dt>${esc(t("report.hash"))}</dt><dd class="num">${esc(r.hash)}</dd>
            </dl></section>
            <section class="refSection" id="ref-formulas"><h3>${esc(t("ref.formulas"))}</h3><pre class="formula">${["f.base", "f.principal", "f.factor", "f.return", "f.compound", "f.due", "f.share"].map(k => esc(t(k))).join("\n")}</pre></section>
            <section class="refSection" id="ref-conv"><h3>${esc(t("ref.conventions"))}</h3>${E.CONVENTION_IDS.map(id => `<div class="convCard ${id === S.convention ? "current" : ""}"><strong>${esc(convName(id))}${id === S.convention ? `<span class="pill accent">${esc(t("ws.current"))}</span>` : ""}</strong><p>${esc(t("conv." + id + ".hint"))}</p></div>`).join("")}</section>
            <section class="refSection" id="ref-dist"><h3>${esc(t("ref.distribution"))}</h3>${E.DISTRIBUTIONS.map(d => `<div class="convCard ${d === S.distribution ? "current" : ""}"><strong>${esc(t("dist." + d))}</strong><p>${esc(t("dist.hint." + d))}</p></div>`).join("")}<p class="hint">${esc(t("invmode.hint"))}</p><p class="hint">${esc(t("basis.hint"))}</p></section>
            <section class="refSection" id="ref-round"><h3>${esc(t("ref.rounding"))}</h3><p class="hint" style="font-size:13px">${esc(t("ref.rounding.body"))}</p></section>
            <section class="refSection" id="ref-guar"><h3>${esc(t("ref.guarantees"))}</h3><p class="hint" style="font-size:13px">${esc(t("ref.guarantees.body"))}</p><div><a class="ghostBtn accent" href="tests.html" target="_blank" rel="noopener">${ICON.flask}${esc(t("pal.tests"))}</a></div></section>
            <section class="refSection" id="ref-edge"><h3>${esc(t("ref.edge"))}</h3><ul class="explainList">${[1, 2, 3, 4, 5].map(n => `<li>${esc(t("ref.edge." + n))}</li>`).join("")}</ul></section>
            <section class="refSection" id="ref-example"><h3>${esc(t("ref.example"))}</h3>${c ? `<ul class="explainList"><li><strong>${esc(caseLabel(St.ws().cases[c.index], c.index))}</strong> · ${esc(t("m.base"))} ${U.moneyH(c.base)} · ${esc(t("m.principal"))} ${U.moneyH(c.principal)}</li>${c.segments.map(s => `<li><strong class="num">${s.year}</strong> (${esc(segDuration(s, unit))}): ${U.moneyH(s.open)} × ${U.pctH(s.appliedRate)} × ${U.numH(s.factor, 6)} = ${U.moneyH(s.value)}</li>`).join("")}<li>${esc(t("ex.result", { r: U.money(c.returnValue), d: U.money(c.due) }))}</li></ul>` : `<p class="hint">${esc(t("ref.exampleEmpty"))}</p>`}</section>
            <section class="refSection" id="ref-rates"><h3>${esc(t("ref.rates"))} · ${esc(def ? def.name : "")}</h3><div class="tableShell" style="max-height:none"><table><thead><tr><th>${esc(t("rates.year"))}</th><th class="n">${esc(t("rates.rate"))}</th><th class="n">${esc(t("col.applied"))}</th></tr></thead><tbody>${years.map(y => `<tr><td class="num">${y}</td><td class="n">${esc(U.pct(def.rates[y]))}</td><td class="n">${esc(U.pct(def.rates[y] + (S.extraRateEnabled ? S.extraRate : 0)))}</td></tr>`).join("")}</tbody></table></div></section>
            <section class="refSection" id="ref-keys"><h3>${esc(t("ref.shortcuts"))}</h3><div class="kbdList">${kb(["Ctrl", "K"], "kb.palette")}${kb(["1", "2", "3", "4"], "kb.views")}${kb(["Ctrl", "Z"], "kb.undo")}${kb(["N"], "kb.newCase")}${kb(["Enter"], "kb.enter")}</div></section>
          </div>
        </div>
      </section>
    </div>`;
  };

  global.Views = V;
})(window);

(function (global) {
  "use strict";
  const E = global.ROIEngine, I = global.I18N, U = global.UI, St = global.Store, V = global.Views;
  const { esc, ICON } = U;
  const t = (k, p) => I.t(k, p);
  const { seg, select, sw, dateInput } = V.helpers;
  const P = {};
  P.pendingYears = [];
  P.rateTable = null;

  const SECTIONS = [["general", "globe"], ["calc", "sliders"], ["rates", "percent"], ["calendar", "calendar"], ["sources", "cloud"], ["data", "database"]];

  P.settingsHTML = function () {
    const sec = St.state.ui.settingsSection;
    return `<div class="sheet settingsSheet" role="dialog" aria-modal="true" aria-labelledby="setTitle">
      <button type="button" class="closeFloat" data-a="closeDialog" aria-label="${esc(t("act.close"))}">${ICON.close}</button>
      <nav class="setSide" aria-label="${esc(t("settings.title"))}"><h2 id="setTitle">${esc(t("settings.title"))}</h2>
        ${SECTIONS.map(([k, ic]) => `<button type="button" class="setNav" data-a="setSection" data-sec="${k}" aria-current="${k === sec}">${ICON[ic]}<span>${esc(t("sec." + k))}</span></button>`).join("")}
      </nav>
      <div class="setMain" id="setMain" data-key="sec-${sec}">${P["sec_" + sec]()}</div>
    </div>`;
  };
  const row = (title, hint, ctl, stack) => `<div class="setRow${stack ? " stack" : ""}"><div class="setText"><strong>${esc(title)}</strong>${hint ? `<p>${esc(hint)}</p>` : ""}</div><div class="setCtl">${ctl}</div></div>`;
  const head = k => `<h3>${esc(t("sec." + k))}</h3><p class="hint">${esc(t("sec." + k + ".hint"))}</p>`;

  P.sec_general = function () {
    const p = St.state.prefs;
    return `${head("general")}<div class="setBlock">
      ${row(t("set.language"), "", seg(t("set.language"), p.lang, [{ v: "ar", l: "العربية", a: 'data-a="setPref" data-k="lang" data-v="ar"' }, { v: "en", l: "English", a: 'data-a="setPref" data-k="lang" data-v="en"' }], { sm: true }))}
      ${row(t("set.theme"), "", seg(t("set.theme"), p.theme, ["light", "dark", "system"].map(v => ({ v, l: t("theme." + v), a: `data-a="setPref" data-k="theme" data-v="${v}"` })), { sm: true }))}
      ${row(t("set.numerals"), t("set.numeralsHint"), sw(p.numerals === "arab", 'data-b="pref" data-k="numerals" data-t="bool"' + (p.lang === "ar" ? "" : " disabled")))}
      ${row(t("set.currency"), "", `<input class="input sm" style="width:140px" maxlength="12" value="${esc(p.currency)}" placeholder="${esc(t("set.currencyPh"))}" data-b="pref" data-k="currency" data-t="text">`)}
      ${row(t("set.decimals"), "", select('data-b="pref" data-k="decimals" data-t="select"', p.decimals, [0, 2, 3].map(v => ({ v, l: U.numText(1234.5678, v, v) }))), false)}
    </div>`;
  };

  P.sec_calc = function () {
    const S = St.state.settings;
    return `${head("calc")}
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("set.convention"))}</span></div>
        <div class="convGrid" role="radiogroup" aria-label="${esc(t("set.convention"))}">${E.CONVENTION_IDS.map(id => `<button type="button" class="convOpt" role="radio" aria-checked="${S.convention === id}" data-a="setSetting" data-k="convention" data-v="${id}"><strong>${esc(t("conv." + id))}</strong><span>${esc(t("conv." + id + ".hint"))}</span></button>`).join("")}</div>
      </div>
      <div class="setBlock">
        ${row(t("set.frequency"), t("set.frequencyHint"), seg(t("set.frequency"), S.frequency, E.FREQUENCIES.map(v => ({ v, l: t("freq." + v), a: `data-a="setSetting" data-k="frequency" data-v="${v}"` })), { sm: true }))}
        ${row(t("set.roundingUnit"), t("set.roundingUnitHint"), select('data-b="set" data-k="roundingUnit" data-t="select"', S.roundingUnit, E.ROUNDING_UNITS.map(v => ({ v, l: t("unit." + v) }))))}
        ${row(t("set.extra"), t("set.extraHint"), `${sw(S.extraRateEnabled, 'data-b="set" data-k="extraRateEnabled" data-t="bool"')}<div class="inputWrap" style="width:120px"><input class="input sm num" inputmode="decimal" value="${esc(S.extraRate)}" data-b="set" data-k="extraRate" data-t="num"${S.extraRateEnabled ? "" : " disabled"}><span class="suffix">%</span></div>`)}
        ${row(t("set.defaultExpense"), "", `<div class="inputWrap" style="width:120px"><input class="input sm num" inputmode="decimal" value="${esc(S.defaultExpenseRate)}" data-b="set" data-k="defaultExpenseRate" data-t="num"><span class="suffix">%</span></div>`)}
      </div>
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("set.distribution"))}</span></div>
        ${row(t("dist.title"), t("dist.hint." + S.distribution), seg(t("dist.title"), S.distribution, E.DISTRIBUTIONS.map(v => ({ v, l: t("dist." + v), a: `data-a="setSetting" data-k="distribution" data-v="${v}"` })), { sm: true }), true)}
        ${S.distribution === "days" ? row(t("invmode.title"), t("invmode.hint"), seg(t("invmode.title"), S.investmentMode, [{ v: "blended", l: t("invmode.blended"), a: 'data-a="setSetting" data-k="investmentMode" data-v="blended"' }, { v: "perPeriod", l: t("invmode.perPeriod"), a: 'data-a="setSetting" data-k="investmentMode" data-v="perPeriod"' }], { sm: true }), true) + row(t("basis.title"), t("basis.hint"), seg(t("basis.title"), S.presenceBasis, [{ v: "working", l: t("basis.working"), a: 'data-a="setSetting" data-k="presenceBasis" data-v="working"' }, { v: "calendar", l: t("basis.calendar"), a: 'data-a="setSetting" data-k="presenceBasis" data-v="calendar"' }], { sm: true })) : ""}
      </div>`;
  };

  P.sec_rates = function () {
    const tables = St.allTables(I.lang);
    const defId = St.defaultTableId();
    if (!P.rateTable || !tables.some(x => x.id === P.rateTable)) P.rateTable = defId;
    const tb = tables.find(x => x.id === P.rateTable) || tables[0];
    const S = St.state.settings;
    const extra = S.extraRateEnabled ? S.extraRate : 0;
    const years = new Set(Object.keys(tb.rates));
    if (!tb.local) Object.keys(tb.official).forEach(y => years.add(y));
    const pending = P.pendingYears.filter(y => !years.has(String(y)));
    const sorted = [...years].sort();
    const edits = tb.local ? 0 : Object.keys(tb.overrides.set).length + tb.overrides.removed.length;
    const rows = sorted.map(y => {
      const removed = !tb.local && tb.overrides.removed.includes(y) && !(y in tb.overrides.set);
      const off = tb.official[y];
      const cur = tb.rates[y];
      let origin;
      if (tb.local) origin = `<span class="pill">${esc(t("rates.custom"))}</span>`;
      else if (removed) origin = `<span class="pill bad">${esc(t("rates.removedOfficial"))}</span>`;
      else if (off === undefined) origin = `<span class="pill accent">${esc(t("rates.added"))}</span>`;
      else if (y in tb.overrides.set) origin = `<span class="pill warn" title="${esc(t("rates.official"))}: ${esc(U.pct(off))}">${esc(t("rates.local"))}</span>`;
      else origin = `<span class="pill ok">${esc(t("rates.official"))}</span>`;
      const canRestore = !tb.local && off !== undefined && (removed || y in tb.overrides.set);
      return `<div class="listRow ratesCols" data-key="ry-${y}">
        <span class="num strong">${y}</span>
        ${removed ? `<span class="faint num">${esc(U.pct(off))}</span>` : `<div class="inputWrap"><input class="input sm num" inputmode="decimal" value="${esc(cur)}" data-b="rate" data-table="${esc(tb.id)}" data-y="${y}" data-t="num" aria-label="${y}"><span class="suffix">%</span></div>`}
        <span>${origin}${!removed && extra ? ` <span class="faint num" title="${esc(t("col.applied"))}">→ ${esc(U.pct(cur + extra))}</span>` : ""}</span>
        ${canRestore ? `<button type="button" class="iconBtn sm" data-a="rateRestore" data-table="${esc(tb.id)}" data-y="${y}" title="${esc(t("rates.restore"))}" aria-label="${esc(t("rates.restore"))}">${ICON.restore}</button>` : removed ? "<span></span>" : `<button type="button" class="iconBtn sm danger" data-a="rateRemove" data-table="${esc(tb.id)}" data-y="${y}" aria-label="${esc(t("act.remove"))}">${ICON.close}</button>`}
      </div>`;
    }).join("");
    const pend = pending.map(y => `<div class="listRow ratesCols" data-key="rp-${y}" style="background:var(--warning-soft)"><span class="num strong">${y}</span><div class="inputWrap"><input class="input sm num" inputmode="decimal" placeholder="?" data-b="rate" data-table="${esc(tb.id)}" data-y="${y}" data-t="num" data-pending aria-label="${y}"><span class="suffix">%</span></div><span class="pill warn">${esc(t("case.status.draft"))}</span><span></span></div>`).join("");
    const maxY = sorted.length ? Math.max(...sorted.map(Number)) : new Date().getFullYear() - 1;
    return `${head("rates")}
      <div class="setBlock">
        <div class="setBlockHead"><span class="setBlockLabel">${esc(t("rates.table"))}</span><div class="toolbar"><button type="button" class="ghostBtn" data-a="newTable">${ICON.plus}${esc(t("rates.newTable"))}</button></div></div>
        <div class="row" style="margin-bottom:12px">
          ${select('data-a="pickTable" data-t="select" style="max-width:320px"', tb.id, tables.map(x => ({ v: x.id, l: `${x.name}${x.id === defId ? " ★" : ""}` })))}
          ${tb.id === defId ? `<span class="pill accent">${ICON.star}${esc(t("rates.default"))}</span>` : `<button type="button" class="ghostBtn accent" data-a="makeDefaultTable" data-table="${esc(tb.id)}">${ICON.star}${esc(t("rates.makeDefault"))}</button>`}
          ${edits ? `<span class="pill warn">${esc(t("rates.edits", { n: U.numText(edits, 0) }))}</span><button type="button" class="ghostBtn" data-a="resetTable" data-table="${esc(tb.id)}">${ICON.restore}${esc(t("rates.reset"))}</button>` : ""}
          ${tb.local ? `<input class="input sm" style="max-width:220px" value="${esc(tb.name)}" data-b="tableName" data-table="${esc(tb.id)}" data-t="text" aria-label="${esc(t("rates.tableName"))}"><button type="button" class="ghostBtn danger" data-a="deleteTable" data-table="${esc(tb.id)}">${ICON.trash}${esc(t("rates.deleteTable"))}</button>` : ""}
        </div>
        ${tb.description ? `<p class="hint" style="margin-bottom:10px">${esc(tb.description)}</p>` : ""}
        <div class="listTable"><div class="listHead ratesCols"><span>${esc(t("rates.year"))}</span><span>${esc(t("rates.rate"))}</span><span>${esc(t("rates.origin"))}</span><span></span></div>
          <div class="listScroll">${pend}${rows || `<div class="listEmpty">${esc(t("rates.empty"))}</div>`}</div>
          <div class="listRow ratesCols" style="background:var(--surface-soft)"><input class="input sm num" id="newRateYear" inputmode="numeric" maxlength="4" placeholder="${maxY + 1}" aria-label="${esc(t("rates.year"))}"><div class="inputWrap"><input class="input sm num" id="newRateValue" inputmode="decimal" placeholder="0.00" aria-label="${esc(t("rates.rate"))}" data-enter-act="addRate"><span class="suffix">%</span></div><button type="button" class="softBtn" data-a="addRate" data-table="${esc(tb.id)}">${ICON.plus}${esc(t("rates.addYear"))}</button><span></span></div>
        </div>
      </div>
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("rates.paste"))}</span></div>
        <textarea class="input" id="ratesPaste" rows="3" placeholder="2024\t19.75\n2025\t27.75"></textarea>
        <div class="row between" style="margin-top:8px"><p class="hint">${esc(t("rates.pasteHint"))}</p><button type="button" class="softBtn" data-a="pasteRates" data-table="${esc(tb.id)}">${ICON.download}${esc(t("act.apply"))}</button></div>
      </div>`;
  };

  P.sec_calendar = function () {
    const S = St.state.settings;
    const wd = I.weekdays();
    const y = new Date().getFullYear();
    const cal = E.makeCalendar(S.weekend, S.holidays);
    const n = cal.count(E.dayNumber(y, 1, 1), E.dayNumber(y, 12, 31));
    const hol = S.holidays.slice().sort((a, b) => a.date.slice(5).localeCompare(b.date.slice(5)));
    const cals = St.sources.calendars;
    return `${head("calendar")}
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("cal.weekend"))}</span><span class="pill num">${esc(t("cal.yearStats", { y, n: U.numText(n, 0), d: U.numText(E.daysInYear(y), 0) }))}</span></div>
        <div class="days" role="group" aria-label="${esc(t("cal.weekend"))}">${wd.map((d, i) => `<button type="button" class="dayBtn" aria-pressed="${S.weekend.includes(i)}" data-a="toggleWeekend" data-d="${i}">${esc(d)}</button>`).join("")}</div>
        <p class="hint" style="margin-top:8px">${esc(t("cal.weekendHint"))}</p>
      </div>
      ${cals.length ? `<div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("cal.preset"))}</span></div><div class="listTable">${cals.map(c => `<div class="listRow" style="grid-template-columns:minmax(0,1fr) auto auto"><div><strong style="font-size:13px">${esc(St.localizedName(c.name, I.lang))}</strong><p class="hint">${esc(c.weekend.map(d => wd[d]).join(I.lang === "ar" ? "، " : ", "))} · ${U.numText(c.holidays.length, 0)} ${esc(t("cal.holidays"))}</p></div><button type="button" class="ghostBtn accent" data-a="applyCal" data-id="${esc(c.id)}" data-mode="merge">${esc(t("cal.presetApply"))}</button><button type="button" class="ghostBtn" data-a="applyCal" data-id="${esc(c.id)}" data-mode="replace">${esc(t("cal.presetReplace"))}</button></div>`).join("")}</div></div>` : ""}
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("cal.holidays"))} · ${U.numText(S.holidays.length, 0)}</span><div class="toolbar">${S.holidays.length ? `<button type="button" class="ghostBtn danger" data-a="clearHolidays">${ICON.trash}${esc(t("cal.clearHolidays"))}</button>` : ""}<button type="button" class="softBtn" data-a="addHoliday">${ICON.plus}${esc(t("cal.addHoliday"))}</button></div></div>
        <div class="listTable"><div class="listHead holCols"><span>${esc(t("cal.holidayName"))}</span><span>${esc(t("cal.date"))}</span><span class="hideSm">${esc(t("cal.repeats"))}</span><span></span></div>
          <div class="listScroll">${hol.length ? hol.map(h => `<div class="listRow holCols" data-key="h-${esc(h.id)}"><input class="input sm" value="${esc(h.name)}" placeholder="${esc(t("cal.holidayName"))}" data-b="hol" data-id="${esc(h.id)}" data-k="name" data-t="text"><div>${dateInput(`data-b="hol" data-id="${esc(h.id)}" data-k="date"`, h.date, false, 'style="min-height:36px"')}</div><span class="hideSm">${sw(h.repeats, `data-b="hol" data-id="${esc(h.id)}" data-k="repeats" data-t="bool" aria-label="${esc(t("cal.repeats"))}"`)}</span><button type="button" class="iconBtn sm danger" data-a="removeHoliday" data-id="${esc(h.id)}" aria-label="${esc(t("act.remove"))}">${ICON.close}</button></div>`).join("") : `<div class="listEmpty">${esc(t("cal.empty"))}</div>`}</div>
        </div>
      </div>
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("cal.paste"))}</span></div>
        <textarea class="input" id="holPaste" rows="3" placeholder="${esc(I.lang === "ar" ? "عيد العمال\t2026-05-01\tتكرار" : "Labour Day\t2026-05-01\trepeat")}"></textarea>
        <div class="row between" style="margin-top:8px"><p class="hint">${esc(t("cal.pasteHint"))}</p><button type="button" class="softBtn" data-a="pasteHolidays">${ICON.download}${esc(t("act.import"))}</button></div>
      </div>`;
  };

  P.sec_sources = function () {
    const m = St.sourcesMeta, src = St.sources;
    const origin = m.origin === "network" ? `<span class="pill ok dotted">${esc(t("src.network"))}</span>` : m.origin === "cache" ? `<span class="pill warn dotted">${esc(t("src.cache"))}</span>` : `<span class="pill bad dotted">${esc(t("src.builtin"))}</span>`;
    return `${head("sources")}
      <div class="setBlock"><div class="srcStatus">
        <div><span>${esc(t("src.status"))}</span><strong>${origin}</strong></div>
        <div><span>${esc(t("src.version"))}</span><strong class="num">${esc(src.version || "—")}</strong></div>
        <div><span>${esc(t("src.updated"))}</span><strong class="num">${esc(src.updated || "—")}</strong></div>
        <div><span>${esc(t("src.checked"))}</span><strong class="num">${esc(U.dateTimeText(m.checkedAt))}</strong></div>
      </div>
      <p class="hint" style="margin-top:10px">${esc(t("src.contents", { t: U.numText(src.rateTables.length, 0), c: U.numText(src.calendars.length, 0) }))}${src.notes ? " · " + esc(src.notes) : ""}</p>
      ${m.error ? `<div class="notice bad" style="margin-top:10px">${ICON.warn}<span>${esc(t("src.failed", { e: m.error }))}</span></div>` : ""}
      </div>
      <div class="setBlock">
        ${row(t("src.url"), t("src.urlHint"), `<input class="input sm" style="min-width:260px" value="${esc(St.state.sourcesUrl)}" placeholder="${esc(St.DEFAULT_SOURCES_URL)}" id="srcUrl" dir="ltr">`, true)}
        <div class="row"><button type="button" class="primaryBtn" data-a="reloadSources">${ICON.refresh}${esc(t("src.reload"))}</button>${St.state.sourcesUrl ? `<button type="button" class="ghostBtn" data-a="resetSourcesUrl">${esc(t("src.resetUrl"))}</button>` : ""}<a class="ghostBtn" href="${esc(St.state.sourcesUrl || St.DEFAULT_SOURCES_URL)}" target="_blank" rel="noopener">${ICON.external}JSON</a></div>
      </div>
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("src.format"))}</span></div><pre class="formula" dir="ltr">${esc(t("src.formatHint"))}</pre></div>`;
  };

  P.sec_data = function () {
    const s = St.state;
    const kb = Math.round(St.storageUsage() / 1024);
    return `${head("data")}
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("ws.title"))}</span><button type="button" class="softBtn" data-a="newWorkspace">${ICON.plus}${esc(t("ws.new"))}</button></div>
        <p class="hint" style="margin-bottom:10px">${esc(t("ws.hint"))}</p>
        <div class="listTable">${s.workspaces.map(w => {
          const cur = w.id === s.activeWorkspace;
          return `<div class="listRow wsCols" data-key="ws-${esc(w.id)}"><div><strong style="font-size:13px">${esc(V.wsName(w))}</strong> ${cur ? `<span class="pill accent">${esc(t("ws.current"))}</span>` : ""}<p class="hint">${esc(t("ws.summary", { c: U.numText(w.cases.length, 0), p: U.numText(w.people.filter(p => p.name.trim()).length, 0) }))} · ${esc(U.dateTimeText(w.updated))}</p></div>
            <div class="row" style="gap:2px">${cur ? "" : `<button type="button" class="ghostBtn accent" data-a="switchWs" data-id="${esc(w.id)}">${esc(t("act.open"))}</button>`}<button type="button" class="iconBtn sm" data-a="renameWs" data-id="${esc(w.id)}" aria-label="${esc(t("act.rename"))}">${ICON.edit}</button><button type="button" class="iconBtn sm" data-a="dupWs" data-id="${esc(w.id)}" aria-label="${esc(t("act.duplicate"))}">${ICON.copy}</button>${s.workspaces.length > 1 ? `<button type="button" class="iconBtn sm danger" data-a="deleteWs" data-id="${esc(w.id)}" aria-label="${esc(t("act.remove"))}">${ICON.trash}</button>` : ""}</div></div>`;
        }).join("")}</div>
      </div>
      <div class="setBlock"><div class="setBlockHead"><span class="setBlockLabel">${esc(t("data.backup"))}</span></div>
        ${row(t("data.export"), "", `<button type="button" class="softBtn" data-a="exportJSON">${ICON.download}JSON</button>`)}
        ${row(t("data.import"), t("data.importHint"), `<button type="button" class="softBtn" data-a="importJSON">${ICON.upload}${esc(t("act.import"))}</button>`)}
        ${row(t("data.reset"), t("data.resetHint"), `<button type="button" class="dangerBtn" data-a="resetSettings">${ICON.restore}${esc(t("data.reset"))}</button>`)}
      </div>
      <p class="hint">${esc(t("data.storage", { v: U.numText(kb, 0) + " KB" }))} · ${esc(t("report.engine"))} ${esc(E.VERSION)} · <a href="tests.html" target="_blank" rel="noopener">${esc(t("pal.tests"))}</a></p>`;
  };

  P.issuesHTML = function (r) {
    return `<div class="sheet issuesSheet" role="dialog" aria-modal="true" aria-labelledby="issTitle">
      <button type="button" class="closeFloat" data-a="closeDialog" aria-label="${esc(t("act.close"))}">${ICON.close}</button>
      <div class="issuesHead"><div class="counter">${ICON.bell}</div><div><h3 id="issTitle">${esc(t("issues.title"))}</h3><p class="hint">${esc(t("issues.count", { n: U.numText(r.issues.length, 0) }))}</p></div></div>
      <div class="issuesBody" id="issuesBody">${V.issuesListHTML(r, false)}</div></div>`;
  };

  P.commands = function () {
    const r = St.result();
    const w = St.ws();
    const list = [
      { k: "goCases", l: t("pal.goCases"), i: "layers", h: "1", run: "view:cases" },
      { k: "goPeople", l: t("pal.goPeople"), i: "users", h: "2", run: "view:people" },
      { k: "goReport", l: t("pal.goReport"), i: "report", h: "3", run: "view:report" },
      { k: "goRef", l: t("pal.goReference"), i: "book", h: "4", run: "view:reference" },
      { k: "addCase", l: t("pal.addCase"), i: "plus", h: "N", run: "addCase" },
      { k: "addPerson", l: t("pal.addPerson"), i: "plus", run: "addPerson" },
      { k: "issues", l: t("pal.issues"), i: "bell", run: "issues" },
      { k: "xlsx", l: t("pal.exportXlsx"), i: "sheet", run: "xlsx" },
      { k: "print", l: t("pal.print"), i: "print", run: "print" },
      { k: "backup", l: t("pal.backup"), i: "download", run: "exportJSON" },
      { k: "settings", l: t("pal.settings"), i: "settings", h: ",", run: "openSettings" },
      { k: "theme", l: t("pal.theme"), i: "moon", run: "theme" },
      { k: "lang", l: t("pal.lang"), i: "globe", run: "lang" },
      { k: "tests", l: t("pal.tests"), i: "flask", run: "tests" }
    ];
    ["general", "calc", "rates", "calendar", "sources", "data"].forEach(sec => list.push({ k: "sec-" + sec, l: `${t("settings.title")} › ${t("sec." + sec)}`, i: "settings", run: "sec:" + sec }));
    w.cases.forEach((c, i) => { const res = r.cases.find(x => x.id === c.id); list.push({ k: "c" + c.id, l: V.caseLabel(c, i), sub: res ? U.money(res.due) : t("case.status.excluded"), kind: t("pal.case"), i: "layers", run: "case:" + c.id }); });
    w.people.filter(p => p.name.trim()).forEach(p => { const s = r.people.find(x => x.personId === p.id); list.push({ k: "p" + p.id, l: p.name, sub: s ? U.money(s.amount) : "", kind: t("pal.person"), i: "users", run: "person:" + p.id }); });
    return list;
  };
  P.paletteList = function (q, active) {
    const norm = s => String(s).toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
    const nq = norm(q.trim());
    const items = P.commands().filter(c => !nq || norm(c.l + " " + (c.kind || "")).includes(nq)).slice(0, 60);
    return { items, html: items.length ? items.map((c, i) => `<button type="button" class="palItem ${i === active ? "active" : ""}" data-i="${i}" role="option" aria-selected="${i === active}">${ICON[c.i] || ""}<span class="grow">${esc(c.l)}${c.sub ? ` <span class="faint money">· ${esc(c.sub)}</span>` : ""}</span>${c.kind ? `<span class="kind">${esc(c.kind)}</span>` : c.h ? `<span class="kbd">${esc(c.h)}</span>` : ""}</button>`).join("") : `<div class="listEmpty">${esc(t("pal.empty"))}</div>` };
  };

  global.Panels = P;
})(window);

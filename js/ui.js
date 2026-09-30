(function (global) {
  "use strict";
  const E = global.ROIEngine;
  const I = global.I18N;

  const esc = v => String(v === null || v === undefined ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const attr = (name, on) => (on ? ` ${name}` : "");

  const S = (d, w) => `<svg viewBox="0 0 24 24" width="${w || 16}" height="${w || 16}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    logo: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><circle cx="6.2" cy="17.8" r="1.9" fill="#fff"/><path d="M6.2 17.8C8.3 16.6 8.1 14.4 9.9 13C12.1 11.3 12.4 9.4 14.5 7.8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><polygon points="18.7,3.5 17.3,8.4 14.2,5.6" fill="#fff"/></svg>`,
    plus: S('<path d="M12 5v14M5 12h14"/>', 15),
    trash: S('<path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M6 7l1 13.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/>', 15),
    copy: S('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V5.8A1.8 1.8 0 0 0 13.7 4H5.8A1.8 1.8 0 0 0 4 5.8v7.9a1.8 1.8 0 0 0 1.8 1.8h2.7"/>', 15),
    close: S('<path d="M6 6l12 12M18 6L6 18"/>', 15),
    check: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>`,
    ok: S('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>', 14),
    warn: S('<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 9.5v5"/><circle cx="12" cy="17.3" r=".9" fill="currentColor" stroke="none"/>', 15),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>', 15),
    error: S('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none"/>', 15),
    bell: S('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>', 17),
    sun: S('<circle cx="12" cy="12" r="4.1"/><path d="M12 2.6v2.3M12 19.1v2.3M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.6 12h2.3M19.1 12h2.3M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"/>', 17),
    moon: S('<path d="M20 14.1A8.4 8.4 0 1 1 9.9 4a7 7 0 0 0 10.1 10.1Z"/>', 17),
    settings: S('<path d="M4 7h7M15 7h5M4 12h11M19 12h1M4 17h1M9 17h11"/><circle cx="13" cy="7" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="17" r="2"/>', 17),
    search: S('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', 16),
    command: S('<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>', 16),
    undo: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 16),
    redo: S('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>', 16),
    calendar: S('<rect x="3.5" y="5" width="17" height="15" rx="2.4"/><path d="M8 3v4M16 3v4M3.5 10h17"/>', 15),
    chevDown: S('<path d="M6 9l6 6 6-6"/>', 14),
    chevLeft: S('<path d="M15 6l-6 6 6 6"/>', 15),
    chevRight: S('<path d="M9 6l6 6-6 6"/>', 15),
    more: S('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>', 17),
    up: S('<path d="M12 19V5M6 11l6-6 6 6"/>', 15),
    down: S('<path d="M12 5v14M6 13l6 6 6-6"/>', 15),
    applyAll: S('<rect x="3.5" y="3.5" width="11" height="11" rx="2.6"/><path d="M9.3 20.5h8.9a2.3 2.3 0 0 0 2.3-2.3V9.3"/>', 15),
    download: S('<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/>', 16),
    upload: S('<path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8"/><path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/>', 16),
    print: S('<path d="M6.5 8.5V4.3a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V8.5"/><rect x="4" y="8.5" width="16" height="7.5" rx="1.8"/><rect x="6.5" y="14" width="11" height="6.7" rx="1"/>', 16),
    sheet: S('<rect x="4" y="3.5" width="16" height="17" rx="2.2"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/>', 16),
    file: S('<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5"/>', 16),
    code: S('<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>', 16),
    users: S('<circle cx="9" cy="8.5" r="3.3"/><path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.9c1.6.6 2.7 2.2 3 4.6"/>', 16),
    layers: S('<path d="M12 3.5 3 8l9 4.5L21 8z"/><path d="m3 12.5 9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>', 16),
    report: S('<path d="M5 20.5V4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v16.5"/><path d="M8.5 15.5v-3M12 15.5v-6M15.5 15.5v-4.5"/>', 16),
    book: S('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>', 16),
    percent: S('<path d="M19 5 5 19"/><circle cx="7.3" cy="7.3" r="2.3"/><circle cx="16.7" cy="16.7" r="2.3"/>', 16),
    globe: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.3 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.3-3.4-8.5s1-6.1 3.4-8.5z"/>', 16),
    database: S('<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>', 16),
    cloud: S('<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.5A3.8 3.8 0 0 1 17.5 18.5z"/>', 16),
    refresh: S('<path d="M20 11a8 8 0 0 0-14.3-4.7L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.7L20 16"/><path d="M20 20.5V16h-4.5"/>', 16),
    sliders: S('<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="1.8" fill="currentColor"/><circle cx="16" cy="12" r="1.8" fill="currentColor"/><circle cx="10" cy="18" r="1.8" fill="currentColor"/>', 16),
    edit: S('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>', 15),
    star: S('<path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>', 15),
    restore: S('<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>', 15),
    external: S('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', 14),
    flask: S('<path d="M9.5 3.5h5M10.5 3.5v6L5 19a1.3 1.3 0 0 0 1.1 2h11.8a1.3 1.3 0 0 0 1.1-2l-5.5-9.5v-6"/><path d="M7.5 15h9"/>', 16),
    md: S('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M6.5 15V9l2.5 3 2.5-3v6M15.5 9v6M13.5 13l2 2 2-2"/>', 16),
    grip: S('<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>', 15),
    install: S('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 8v6.5M9.5 12l2.5 2.5 2.5-2.5"/>', 17)
  };

  let fmtCache = new Map();
  let prefs = { lang: "ar", numerals: "latn", currency: "", decimals: 2 };
  function setPrefs(p) { prefs = Object.assign({}, prefs, p); fmtCache = new Map(); }
  function nf(min, max) {
    const nu = prefs.lang === "ar" && prefs.numerals === "arab" ? "arab" : "latn";
    const key = `${prefs.lang}|${nu}|${min}|${max}`;
    let f = fmtCache.get(key);
    if (!f) { f = new Intl.NumberFormat(prefs.lang === "ar" ? "ar-EG" : "en-US", { minimumFractionDigits: min, maximumFractionDigits: max, numberingSystem: nu }); fmtCache.set(key, f); }
    return f;
  }
  function numText(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    const x = Math.abs(n) < 1e-9 ? 0 : n;
    return nf(min, max === undefined ? min : max).format(x);
  }
  const cur = () => (prefs.currency ? " " + prefs.currency : "");
  function money(v, d) { const k = d === undefined ? prefs.decimals : d; return numText(v, k, k) + cur(); }
  function moneyH(v, d) { return `<span class="money">${esc(money(v, d))}</span>`; }
  function num(v, max) { return numText(v, 0, max === undefined ? 2 : max); }
  function numH(v, max) { return `<span class="num">${esc(num(v, max))}</span>`; }
  function pct(v) { return numText(v, 0, 4) + "%"; }
  function pctH(v) { return `<span class="num">${esc(pct(v))}</span>`; }
  function dateText(n, style) {
    if (n === null || n === undefined) return "—";
    const nu = prefs.lang === "ar" && prefs.numerals === "arab" ? "arab" : "latn";
    const key = `d|${prefs.lang}|${nu}|${style || ""}`;
    let f = fmtCache.get(key);
    if (!f) {
      f = new Intl.DateTimeFormat(prefs.lang === "ar" ? "ar-EG" : "en-GB", style === "long" ? { year: "numeric", month: "long", day: "numeric", timeZone: "UTC", numberingSystem: nu } : { year: "numeric", month: "short", day: "numeric", timeZone: "UTC", numberingSystem: nu });
      fmtCache.set(key, f);
    }
    return f.format(new Date(n * 86400000));
  }
  function range(a, b) { return a === null || a === undefined ? "—" : `${dateText(a)} — ${dateText(b)}`; }
  function dateTimeText(ms) {
    if (!ms) return "—";
    const nu = prefs.lang === "ar" && prefs.numerals === "arab" ? "arab" : "latn";
    return new Intl.DateTimeFormat(prefs.lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short", numberingSystem: nu }).format(new Date(ms));
  }
  function isoToInput(iso) {
    const n = E.parseISO(iso);
    if (n === null) return "";
    const p = E.ymd(n);
    return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
  }
  function parseDateInput(text) {
    const s = String(text || "")
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x660))
      .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x6F0))
      .replace(/[\u200E\u200F\u061C]/g, "").trim();
    if (!s) return "";
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
    let y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else {
      m = /^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2}|\d{4})$/.exec(s);
      if (!m) {
        m = /^(\d{2})(\d{2})(\d{4})$/.exec(s);
        if (!m) return null;
      }
      d = +m[1]; mo = +m[2]; y = +m[3];
      if (y < 100) y += y < 70 ? 2000 : 1900;
    }
    const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return E.parseISO(iso) === null ? null : iso;
  }
  function excelSerialToISO(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 200000) return "";
    return E.toISO(E.dayNumber(1899, 12, 30) + Math.round(n));
  }
  function flexDate(v) {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "number") return excelSerialToISO(v);
    if (v instanceof Date && !isNaN(v)) return E.toISO(E.dayNumber(v.getFullYear(), v.getMonth() + 1, v.getDate()));
    const s = String(v).trim();
    if (/^\d{5}(\.\d+)?$/.test(s)) return excelSerialToISO(s);
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    if (iso) return E.parseISO(iso[1]) !== null ? iso[1] : "";
    return parseDateInput(s) || "";
  }
  function formatMoneyInput(raw) {
    const s = String(raw === null || raw === undefined ? "" : raw).replace(/,/g, "").trim();
    if (!s) return "";
    const n = E.toNum(s);
    if (!Number.isFinite(n)) return s;
    const [i, f] = s.replace(/^-/, "").split(".");
    const intPart = Number(i || 0).toLocaleString("en-US");
    return (n < 0 ? "-" : "") + intPart + (f !== undefined ? "." + f : "");
  }

  function morph(from, html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    morphChildren(from, tpl.content);
  }
  function keyOf(n) { return n.nodeType === 1 ? n.getAttribute("data-key") : null; }
  function same(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType !== 1) return true;
    return a.tagName === b.tagName && keyOf(a) === keyOf(b) && (a.type || "") === (b.type || "");
  }
  function morphChildren(parent, next) {
    const oldKids = Array.from(parent.childNodes);
    const keyed = new Map();
    oldKids.forEach(n => { const k = keyOf(n); if (k) keyed.set(k, n); });
    let cursor = parent.firstChild;
    const newKids = Array.from(next.childNodes);
    for (const nn of newKids) {
      const k = keyOf(nn);
      let match = null;
      if (k) {
        match = keyed.get(k) || null;
        if (match && !same(match, nn)) match = null;
      } else {
        let probe = cursor;
        while (probe && keyOf(probe)) probe = probe.nextSibling;
        if (probe && same(probe, nn)) match = probe;
      }
      if (match) {
        if (k) keyed.delete(k);
        if (match !== cursor) parent.insertBefore(match, cursor);
        else cursor = cursor.nextSibling;
        morphNode(match, nn);
      } else {
        parent.insertBefore(nn, cursor);
      }
    }
    while (cursor) {
      const nx = cursor.nextSibling;
      if (!(cursor.nodeType === 1 && cursor.hasAttribute("data-persist"))) parent.removeChild(cursor);
      cursor = nx;
    }
  }
  function morphNode(a, b) {
    if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    if (b.hasAttribute && b.hasAttribute("data-morph-skip") && a.hasAttribute("data-morph-skip")) return;
    const focused = a === document.activeElement;
    const ba = b.attributes;
    for (let i = a.attributes.length - 1; i >= 0; i--) {
      const n = a.attributes[i].name;
      if (!b.hasAttribute(n)) { if (!(focused && n === "value")) a.removeAttribute(n); }
    }
    for (let i = 0; i < ba.length; i++) {
      const { name, value } = ba[i];
      if (name === "value" && focused) continue;
      if (a.getAttribute(name) !== value) a.setAttribute(name, value);
    }
    const tag = a.tagName;
    if (tag === "INPUT") {
      if (a.type === "checkbox" || a.type === "radio") {
        const c = b.hasAttribute("checked");
        if (a.checked !== c) a.checked = c;
        const ind = b.hasAttribute("data-indeterminate");
        if (a.indeterminate !== ind) a.indeterminate = ind;
      } else if (!focused) {
        const v = b.getAttribute("value") || "";
        if (a.value !== v) a.value = v;
      }
      return;
    }
    if (tag === "TEXTAREA") {
      if (!focused) { const v = b.textContent; if (a.value !== v) a.value = v; }
      return;
    }
    morphChildren(a, b);
    if (tag === "SELECT" && !focused) {
      const sel = b.querySelector("option[selected]");
      const v = sel ? sel.value : (b.querySelector("option") || {}).value;
      if (v !== undefined && a.value !== v) a.value = v;
    }
  }

  let toastHost = null;
  const TOAST_ICON = { error: "error", success: "ok", info: "info", warn: "warn" };
  function toast(msg, opts) {
    opts = opts || {};
    if (!toastHost) { toastHost = document.createElement("div"); toastHost.className = "toastHost"; toastHost.setAttribute("data-persist", ""); toastHost.setAttribute("role", "status"); toastHost.setAttribute("aria-live", "polite"); }
    const dialogs = document.querySelectorAll("dialog[open]:not(.closing)");
    const host = dialogs.length ? dialogs[dialogs.length - 1] : document.body;
    if (toastHost.parentNode !== host) host.appendChild(toastHost);
    while (toastHost.children.length >= 3) toastHost.firstChild.remove();
    const el = document.createElement("div");
    const dur = opts.duration || (opts.action ? 8000 : 2600);
    const tone = TOAST_ICON[opts.tone] ? opts.tone : "";
    el.className = "toast" + (opts.action ? "" : " plain") + (tone ? " tone-" + tone : "");
    el.innerHTML = `${tone ? `<span class="toastIcon">${ICON[TOAST_ICON[tone]]}</span>` : ""}<span class="toastMsg">${esc(msg)}</span>${opts.action ? `<button type="button">${esc(opts.action)}</button><i class="timer" style="animation-duration:${dur}ms"></i>` : ""}`;
    let closed = false;
    const close = () => { if (closed) return; closed = true; el.classList.add("out"); setTimeout(() => el.remove(), 220); };
    if (opts.action) el.querySelector("button").onclick = () => { close(); opts.onAction && opts.onAction(); };
    toastHost.appendChild(el);
    const timer = setTimeout(close, dur);
    el.addEventListener("mouseenter", () => clearTimeout(timer), { once: true });
    el.addEventListener("mouseleave", () => setTimeout(close, 1500), { once: true });
    return close;
  }

  function openDialog(cls, html, opts) {
    opts = opts || {};
    const dlg = document.createElement("dialog");
    dlg.className = cls || "";
    dlg.innerHTML = html;
    document.body.appendChild(dlg);
    const prevFocus = document.activeElement;
    let done = false;
    const close = value => {
      if (done) return;
      done = true;
      dlg.classList.add("closing");
      setTimeout(() => { try { dlg.close(); } catch (e) {} dlg.remove(); if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus({ preventScroll: true }); opts.onClose && opts.onClose(value); }, 160);
    };
    dlg.addEventListener("cancel", e => { e.preventDefault(); close(undefined); });
    dlg.addEventListener("mousedown", e => { if (e.target === dlg) dlg._down = true; });
    dlg.addEventListener("click", e => { if (e.target === dlg && dlg._down) close(undefined); dlg._down = false; });
    dlg.showModal();
    dlg.closeDialog = close;
    return dlg;
  }

  const TONE_ICON = { danger: "trash", warn: "warn", info: "info", error: "error", edit: "edit", success: "ok" };
  function confirm(message, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const input = opts.prompt !== undefined;
      const tone = TONE_ICON[opts.tone] ? opts.tone : opts.danger ? "danger" : input ? "edit" : opts.alert ? "info" : "warn";
      const title = opts.title || "";
      const okCls = tone === "danger" ? "dangerSolidBtn" : "primaryBtn";
      const okLabel = opts.ok || (opts.alert ? I.t("act.ok") : I.t("act.confirm"));
      const dlg = openDialog("confirmDlg", `<div class="sheet confirmSheet" role="${input ? "dialog" : "alertdialog"}" aria-modal="true" aria-labelledby="dlgTitle"${message ? ' aria-describedby="dlgMsg"' : ""}>
        <div class="confirmIcon tone-${tone}">${ICON[TONE_ICON[tone]]}</div>
        <h3 class="confirmTitle" id="dlgTitle">${esc(title || message)}</h3>
        ${title && message ? `<p class="confirmMsg" id="dlgMsg">${esc(message)}</p>` : ""}
        ${input ? `<label class="field confirmField"><span class="lbl">${esc(opts.label || "")}</span><input class="input" id="dlgPrompt" value="${esc(opts.prompt)}" maxlength="${opts.maxlength || 120}" autocomplete="off"></label>` : ""}
        <div class="confirmActions">
          ${opts.alert ? "" : `<button type="button" class="softBtn" data-r="0">${esc(opts.cancel || I.t("act.cancel"))}</button>`}
          <button type="button" class="${okCls}" data-r="1">${esc(okLabel)}</button>
        </div></div>`, { onClose: v => resolve(v) });
      const field = dlg.querySelector("#dlgPrompt");
      const okBtn = dlg.querySelector('[data-r="1"]');
      const sync = () => { if (field) okBtn.disabled = !field.value.trim(); };
      const submit = () => {
        if (field && !field.value.trim()) { field.classList.add("shake", "bad"); setTimeout(() => field.classList.remove("shake"), 300); field.focus(); return; }
        dlg.closeDialog(field ? field.value.trim() : true);
      };
      dlg.addEventListener("click", e => {
        const b = e.target.closest("[data-r]");
        if (!b || b.disabled) return;
        if (b.dataset.r === "1") submit(); else dlg.closeDialog(undefined);
      });
      if (field) {
        sync();
        field.addEventListener("input", () => { field.classList.remove("bad"); sync(); });
        field.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
        requestAnimationFrame(() => { field.focus(); field.select(); });
      } else requestAnimationFrame(() => dlg.querySelector(tone === "danger" ? '[data-r="0"]' : '[data-r="1"]').focus());
    }).then(v => (v === undefined ? (opts.prompt !== undefined ? null : false) : v));
  }

  let pop = null;
  function closePop() {
    if (!pop) return;
    const p = pop; pop = null;
    p.el.remove();
    document.removeEventListener("pointerdown", p.outside, true);
    document.removeEventListener("keydown", p.key, true);
    window.removeEventListener("resize", p.reposition);
    window.removeEventListener("scroll", p.reposition, true);
    if (p.anchor && p.anchor.isConnected && p.restore !== false) p.anchor.focus({ preventScroll: true });
    p.onClose && p.onClose();
  }
  function openPop(anchor, html, opts) {
    closePop();
    opts = opts || {};
    const el = document.createElement("div");
    el.className = "pop " + (opts.cls || "");
    el.setAttribute("data-persist", "");
    el.innerHTML = html;
    if (opts.minWidth) el.style.minWidth = Math.round(opts.minWidth) + "px";
    (anchor.closest("dialog") || document.body).appendChild(el);
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight;
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const rtl = document.dir === "rtl";
      let x = rtl ? r.right - w : r.left;
      if (opts.alignEnd) x = rtl ? r.left : r.right - w;
      x = Math.max(8, Math.min(vw - w - 8, x));
      let y = r.bottom + 6;
      if (y + h > vh - 8 && r.top - h - 6 > 8) y = r.top - h - 6;
      y = Math.max(8, Math.min(vh - h - 8, y));
      el.style.left = x + "px"; el.style.top = y + "px";
    };
    place();
    const outside = e => { if (!el.contains(e.target) && !anchor.contains(e.target)) { pop.restore = false; closePop(); } };
    const key = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePop(); return; }
      if (e.key === "Tab" && el.classList.contains("menu")) { pop.restore = true; closePop(); e.preventDefault(); return; }
      if (opts.onKey) opts.onKey(e);
      if (el.classList.contains("menu") && ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        const items = [...el.querySelectorAll(".menuItem:not(:disabled)")];
        if (!items.length) return;
        const i = items.indexOf(document.activeElement);
        const n = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[n].focus(); items[n].scrollIntoView({ block: "nearest" }); e.preventDefault();
      }
    };
    const reposition = () => { if (!anchor.isConnected) closePop(); else place(); };
    setTimeout(() => document.addEventListener("pointerdown", outside, true), 0);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    pop = { el, anchor, outside, key, reposition, onClose: opts.onClose, place };
    return el;
  }

  function menu(anchor, items, opts) {
    const html = items.map((it, i) => it === "-" ? `<div class="menuSep"></div>` : `<button type="button" class="menuItem ${it.danger ? "danger" : ""}" data-i="${i}" ${it.disabled ? "disabled" : ""} role="menuitem">${it.icon ? ICON[it.icon] || "" : ""}<span>${esc(it.label)}</span></button>`).join("");
    const el = openPop(anchor, html, Object.assign({ cls: "menu" }, opts || {}));
    el.setAttribute("role", "menu");
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-i]");
      if (!b) return;
      const it = items[+b.dataset.i];
      pop && (pop.restore = !it.keepFocus && true);
      closePop();
      it.run && it.run();
    });
    const first = el.querySelector(".menuItem:not(:disabled)");
    first && first.focus({ preventScroll: true });
    return el;
  }

  function listbox(anchor, options, value, onPick, onClose) {
    const html = options.map((o, i) => `<button type="button" class="menuItem optItem" role="option" data-i="${i}" aria-selected="${String(o.v) === String(value)}"><span class="optCheck">${ICON.check}</span><span class="optLabel">${esc(o.l)}</span></button>`).join("");
    let buf = "", bufAt = 0;
    const el = openPop(anchor, html, {
      cls: "menu listbox", minWidth: anchor.getBoundingClientRect().width, onClose,
      onKey: e => {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        const now = Date.now(); buf = now - bufAt > 700 ? e.key.toLowerCase() : buf + e.key.toLowerCase(); bufAt = now;
        const hit = [...el.querySelectorAll(".optItem")].find(b => b.textContent.trim().toLowerCase().startsWith(buf));
        if (hit) { hit.focus(); hit.scrollIntoView({ block: "nearest" }); }
      }
    });
    el.setAttribute("role", "listbox");
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-i]");
      if (!b) return;
      const o = options[+b.dataset.i];
      if (pop) pop.restore = true;
      closePop();
      onPick(String(o.v));
    });
    const sel = el.querySelector('[aria-selected="true"]') || el.querySelector(".optItem");
    if (sel) { sel.focus({ preventScroll: true }); sel.scrollIntoView({ block: "nearest" }); }
    return el;
  }

  function datePicker(anchor, iso, onPick, calendar) {
    const today = (() => { const d = new Date(); return E.dayNumber(d.getFullYear(), d.getMonth() + 1, d.getDate()); })();
    const selN = E.parseISO(iso);
    const base = E.ymd(selN !== null ? selN : today);
    let vy = base.y, vm = base.m, mode = "days";
    let focusN = selN !== null ? selN : today;
    const selP = selN !== null ? E.ymd(selN) : null;
    const todayP = E.ymd(today);
    const yText = y => numText(y, 0).replace(/[,٬]/g, "");
    const clampY = y => Math.max(E.LIMITS.minYear, Math.min(E.LIMITS.maxYear, y));
    const el = openPop(anchor, "", { cls: "dp", onKey: e => {
      if (mode !== "days") return;
      const moves = { ArrowLeft: document.dir === "rtl" ? 1 : -1, ArrowRight: document.dir === "rtl" ? -1 : 1, ArrowUp: -7, ArrowDown: 7 };
      if (moves[e.key] !== undefined && el.contains(document.activeElement) && document.activeElement.classList.contains("dpDay")) {
        e.preventDefault();
        focusN += moves[e.key];
        const p = E.ymd(focusN); vy = p.y; vm = p.m; draw(true);
      } else if (e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault(); shift(e.key === "PageUp" ? -1 : 1);
      }
    } });
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", I.t("date.pick"));
    const refocus = () => { focusN = E.dayNumber(vy, vm, Math.min(E.ymd(focusN).d, E.daysInMonth(vy, vm))); };
    const shift = d => {
      if (mode === "months") { vy = clampY(vy + d); draw(true); return; }
      if (mode === "years") { vy = clampY(vy + d * 12); draw(true); return; }
      const t = vy * 12 + vm - 1 + d; const ny = Math.floor(t / 12);
      if (ny < E.LIMITS.minYear || ny > E.LIMITS.maxYear) return;
      vy = ny; vm = t % 12 + 1; refocus(); draw(true);
    };
    function draw(focus) {
      const months = I.months();
      let title, body, prev = I.t("date.prev"), next = I.t("date.next");
      if (mode === "days") {
        const first = E.dayNumber(vy, vm, 1);
        const start = first - E.weekday(first);
        let cells = "";
        for (let i = 0; i < 42; i++) {
          const n = start + i, p = E.ymd(n);
          const cls = ["dpDay"];
          if (p.m !== vm) cls.push("out");
          if (n === today) cls.push("today");
          if (n === selN) cls.push("sel");
          if (calendar && !calendar.isWorking(n)) cls.push(calendar.isHoliday(n) ? "hol" : "off");
          cells += `<button type="button" class="${cls.join(" ")}" data-n="${n}" tabindex="${n === focusN ? 0 : -1}" aria-label="${esc(dateText(n, "long"))}"${n === selN ? ' aria-pressed="true"' : ""}>${esc(numText(p.d, 0))}</button>`;
        }
        title = `${months[vm - 1]} ${yText(vy)}`;
        body = `<div class="dpGrid">${I.weekdaysShort().map(w => `<span class="dpWd">${esc(w)}</span>`).join("")}${cells}</div>`;
      } else if (mode === "months") {
        title = yText(vy);
        body = `<div class="dpPick">${months.map((m, i) => {
          const cls = ["dpCell"];
          if (i + 1 === vm) cls.push("cur");
          if (selP && selP.y === vy && selP.m === i + 1) cls.push("sel");
          if (todayP.y === vy && todayP.m === i + 1) cls.push("today");
          return `<button type="button" class="${cls.join(" ")}" data-month="${i + 1}">${esc(m)}</button>`;
        }).join("")}</div>`;
      } else {
        const start = vy - (((vy % 12) + 12) % 12);
        title = `${yText(start)} – ${yText(start + 11)}`;
        let cells = "";
        for (let y = start; y < start + 12; y++) {
          const cls = ["dpCell"];
          if (y === vy) cls.push("cur");
          if (selP && selP.y === y) cls.push("sel");
          if (todayP.y === y) cls.push("today");
          const off = y < E.LIMITS.minYear || y > E.LIMITS.maxYear;
          cells += `<button type="button" class="${cls.join(" ")}" data-year="${y}"${off ? " disabled" : ""}>${esc(yText(y))}</button>`;
        }
        body = `<div class="dpPick">${cells}</div>`;
      }
      el.innerHTML = `<div class="dpHead">
          <button type="button" class="dpNav" data-nav="-1" aria-label="${esc(prev)}">${ICON.chevLeft}</button>
          <button type="button" class="dpTitleBtn" data-mode aria-label="${esc(I.t(mode === "days" ? "date.pickMonth" : "date.pickYear"))}"${mode === "years" ? " disabled" : ""}><span class="num">${esc(title)}</span>${mode === "years" ? "" : ICON.chevDown}</button>
          <button type="button" class="dpNav" data-nav="1" aria-label="${esc(next)}">${ICON.chevRight}</button>
        </div>
        ${body}
        <div class="dpFoot"><button type="button" class="ghostBtn" data-clear>${esc(I.t("date.clear"))}</button><button type="button" class="ghostBtn accent" data-today>${esc(I.t("date.today"))}</button></div>`;
      if (pop) pop.place();
      if (focus) {
        const b = mode === "days" ? el.querySelector(`[data-n="${focusN}"]`) : el.querySelector(".dpCell.cur") || el.querySelector(".dpCell");
        b && b.focus({ preventScroll: true });
      }
    }
    draw(true);
    el.addEventListener("click", e => {
      const nav = e.target.closest("[data-nav]");
      if (nav) { shift(+nav.dataset.nav); return; }
      if (e.target.closest("[data-mode]")) { mode = mode === "days" ? "months" : "years"; draw(true); return; }
      const mo = e.target.closest("[data-month]");
      if (mo) { vm = +mo.dataset.month; mode = "days"; refocus(); draw(true); return; }
      const yr = e.target.closest("[data-year]");
      if (yr) { vy = clampY(+yr.dataset.year); mode = "months"; draw(true); return; }
      const d = e.target.closest("[data-n]");
      if (d) { onPick(E.toISO(+d.dataset.n)); closePop(); return; }
      if (e.target.closest("[data-today]")) { onPick(E.toISO(today)); closePop(); return; }
      if (e.target.closest("[data-clear]")) { onPick(""); closePop(); }
    });
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = String(name).replace(/[\\/:*?"<>|]+/g, "-"); a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
  }
  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  let xlsxPromise = null;
  function loadXLSX() {
    if (global.XLSX) return Promise.resolve(global.XLSX);
    return xlsxPromise || (xlsxPromise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = () => res(global.XLSX);
      s.onerror = () => { xlsxPromise = null; s.remove(); rej(new Error("xlsx")); };
      document.head.appendChild(s);
    }));
  }
  function readFile(file, asBinary) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      asBinary ? r.readAsArrayBuffer(file) : r.readAsText(file);
    });
  }
  function pickFile(accept) {
    return new Promise(res => {
      const i = document.createElement("input");
      i.type = "file"; i.accept = accept || ""; i.style.display = "none";
      i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); };
      document.body.appendChild(i); i.click();
    });
  }
  function csvCell(v) { const s = String(v === null || v === undefined ? "" : v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
  function parseDelimited(text) {
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim());
    if (!lines.length) return [];
    const tab = lines.some(l => l.includes("\t"));
    const semi = !tab && lines.every(l => l.includes(";")) && !lines.some(l => l.includes(","));
    const d = tab ? "\t" : semi ? ";" : ",";
    return lines.map(line => {
      const out = []; let cell = "", q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (q) { if (c === '"') { if (line[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
        else if (c === '"' && cell === "") q = true;
        else if (c === d) { out.push(cell.trim()); cell = ""; }
        else cell += c;
      }
      out.push(cell.trim());
      return out;
    });
  }

  global.UI = { esc, attr, ICON, setPrefs, money, moneyH, num, numH, pct, pctH, numText, dateText, dateTimeText, range, isoToInput, parseDateInput, flexDate, formatMoneyInput, morph, toast, openDialog, confirm, openPop, closePop, menu, listbox, datePicker, download, copyText, loadXLSX, readFile, pickFile, csvCell, parseDelimited, get pop() { return pop; } };
})(window);

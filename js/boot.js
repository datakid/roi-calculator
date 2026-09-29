(function () {
  try {
    var d = document.documentElement;
    var raw = localStorage.getItem("roi-calc-v5");
    var s = raw ? JSON.parse(raw) : null;
    var p = s && s.prefs;
    if (!p) {
      var old = JSON.parse(localStorage.getItem("investment-return-pro") || "null");
      if (old) p = { lang: old.lang, theme: old.theme };
    }
    var sys = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = p && (p.theme === "dark" || p.theme === "light") ? p.theme : (sys ? "dark" : "light");
    d.setAttribute("data-theme", theme);
    var lang = p && p.lang ? p.lang : ((navigator.language || "ar").toLowerCase().indexOf("en") === 0 ? "en" : "ar");
    if (lang === "en") { d.lang = "en"; d.dir = "ltr"; }
  } catch (e) {}
})();

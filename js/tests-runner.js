(function () {
  const results = window.ROIEngineTests.run();
  const passed = results.filter(r => r.pass).length;
  const summary = document.getElementById("summary");
  summary.textContent = `${passed} / ${results.length} passed · engine ${window.ROIEngine.VERSION}`;
  summary.className = "summary " + (passed === results.length ? "ok" : "bad");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  document.getElementById("rows").innerHTML = results.map(r => `<tr><td>${esc(r.group)}</td><td>${esc(r.name)}</td><td class="${r.pass ? "pass" : "fail"}">${r.pass ? "PASS" : "FAIL"}</td><td class="detail">${esc(r.detail)}</td></tr>`).join("");
  console.log(`[engine] ${passed}/${results.length} passed`);
  results.filter(r => !r.pass).forEach(r => console.error(`[engine] FAIL ${r.group} — ${r.name}: ${r.detail}`));
})();

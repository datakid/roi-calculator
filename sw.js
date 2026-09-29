const CACHE_VERSION = "roi-calc-v5.0.0";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const SHELL = [
  "./", "./index.html", "./tests.html", "./manifest.webmanifest", "./icon.svg",
  "./images/icon-256.jpg", "./images/icon-maskable.jpg",
  "./css/app.css",
  "./js/boot.js", "./js/engine.js", "./js/i18n.js", "./js/store.js", "./js/ui.js", "./js/views.js", "./js/panels.js", "./js/app.js",
  "./js/engine.test.js", "./js/tests-runner.js",
  "./data/sources.json"
];
const OPTIONAL = ["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"];
const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];
const NETWORK_FIRST = ["/index.html", "/data/sources.json"];
const TIMEOUT_MS = 3500;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL.map(u => shell.add(new Request(u, { cache: "reload" })).catch(() => {})));
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.all(OPTIONAL.map(u => runtime.add(new Request(u, { mode: "cors", credentials: "omit" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) {} }
    await self.clients.claim();
  })());
});

const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

async function networkFirst(request, key, preload) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const pre = preload ? await preload : null;
    const res = pre || await Promise.race([fetch(request, { cache: "no-cache" }), timeout(TIMEOUT_MS)]);
    if (res && res.ok) cache.put(key || request, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(key || request, { ignoreSearch: true })) || (await cache.match("./index.html")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  const net = fetch(request).then(res => { if (res && res.ok) cache.put(request, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") { event.respondWith(networkFirst(request, "./index.html", event.preloadResponse)); return; }
  if (CDN_HOSTS.includes(url.hostname)) { event.respondWith(cacheFirst(request)); return; }
  if (url.origin !== self.location.origin || url.pathname.includes("/tables/")) return;
  if (NETWORK_FIRST.some(p => url.pathname.endsWith(p))) { event.respondWith(networkFirst(request)); return; }
  event.respondWith(staleWhileRevalidate(request));
});

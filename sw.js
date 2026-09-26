/* ROI Calculator — offline service worker.
   Bump CACHE_VERSION on every release that changes sw.js behaviour.
   index.html itself is always fetched network-first, so app updates reach
   users on their next online visit without touching this file. */
const CACHE_VERSION = "roi-calc-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
// Warmed at install so Excel import/export works offline even if never used online.
const OPTIONAL = ["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"];
const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];
const NAV_TIMEOUT_MS = 3500;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL);
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.all(OPTIONAL.map((url) =>
      runtime.add(new Request(url, { mode: "cors", credentials: "omit" })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function handleNavigation(event) {
  const shell = await caches.open(SHELL_CACHE);
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const response = preload || await Promise.race([fetch(event.request), timeout(NAV_TIMEOUT_MS)]);
    const path = new URL(event.request.url).pathname;
    if (response && response.ok && (path.endsWith("/") || path.endsWith("/index.html"))) {
      shell.put("./index.html", response.clone());
    }
    return response;
  } catch (e) {
    return (await shell.match("./index.html")) || (await shell.match("./")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => hit);
  return hit || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
  } else if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  } else if (url.origin === self.location.origin && !url.pathname.includes("/tables/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

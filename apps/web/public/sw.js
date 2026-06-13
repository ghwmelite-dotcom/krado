/* Krado service worker — app-shell precache + offline dashboard.
 * - install: precache the shell ("/app/")
 * - GET /api/dashboard: stale-while-revalidate (instant paint, fresh next tick)
 * - other GET /api/*: network-first, cache fallback
 * - non-GET: never intercepted
 */

const SHELL_CACHE = "krado-shell-v1";
const API_CACHE = "krado-api-v1";
const SHELL_URLS = ["/app/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Dashboard: stale-while-revalidate — the offline-first home screen.
  if (url.pathname === "/api/dashboard") {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? refresh;
      }),
    );
    return;
  }

  // Other API GETs: network-first, fall back to the last good response.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch (err) {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw err;
        }
      }),
    );
    return;
  }

  // App shell + static assets: network falling back to cache; navigations
  // always resolve to the cached shell when offline.
  if (url.pathname.startsWith("/app/") || request.mode === "navigate") {
    const shellKey = request.mode === "navigate" ? "/app/" : request;
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(shellKey, response.clone());
          return response;
        } catch (err) {
          const cached = await cache.match(shellKey);
          if (cached) return cached;
          throw err;
        }
      }),
    );
  }
});

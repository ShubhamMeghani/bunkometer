// Bunk-o-Meter service worker (SPEC R47): caches the app shell so the app opens offline.
// Pages: network first, cached copy when offline. Build assets: cache first (they are content-hashed).
// Server actions, auth and API calls are never cached.
const PAGES = "bunkometer-pages-v1";
const ASSETS = "bunkometer-assets-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, ASSETS]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate" || req.headers.get("RSC") === "1") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && res.type === "basic") cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req);
          if (hit) return hit;
          return new Response(
            '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui;background:#0b0d12;color:#eef1f6;padding:24px"><h1>You\'re offline</h1><p>Open Bunk-o-Meter once while online so it can work offline.</p></body>',
            { headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});

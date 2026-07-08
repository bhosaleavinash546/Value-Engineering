/* VAVEhub service worker — offline shell + narration audio cache.
   Strategy: network-first for pages (always fresh after deploys),
   stale-while-revalidate for same-origin assets, cache-first for
   narration MP3s (large, immutable per generation). */
const VERSION = "vh-v1";
const AUDIO_CACHE = "vh-audio-v1";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION && k !== AUDIO_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // narration audio: cache-first (immutable until regenerated)
  if (url.pathname.includes("/audio/") && url.pathname.endsWith(".mp3")) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok && (res.status === 200 || res.status === 206)) {
          if (res.status === 200) cache.put(e.request, res.clone());
        }
        return res;
      })
    );
    return;
  }

  // pages: network-first with offline fallback to cache
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // static assets: stale-while-revalidate
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(e.request);
      const refresh = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});

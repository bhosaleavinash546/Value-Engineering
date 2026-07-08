/* VAVEhub service worker — offline shell + narration cache.
   Strategy:
     • pages (HTML/navigation)         → network-first, cache fallback
     • narration audio + timings/script → network-first, cache fallback
       (MUST stay in lock-step with the page: a cache-first audio file
        would drift out of sync the moment narration is regenerated —
        old audio played against new text. Network-first revalidates
        cheaply via ETag and always matches the current timings.)
     • other same-origin assets (css/js/img) → stale-while-revalidate
   Bump VERSION / AUDIO_CACHE to purge previously cached responses. */
const VERSION = "vh-v2";
const AUDIO_CACHE = "vh-audio-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION && k !== AUDIO_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* network-first: fresh when online, cached copy when offline.
   Only full (200) responses are cached — range (206) replies for audio
   seeking are passed straight through to the media element. */
function networkFirst(request, cacheName) {
  return fetch(request)
    .then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(cacheName).then((c) => c.put(request, copy));
      }
      return res;
    })
    .catch(() => caches.match(request));
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // narration audio + its timing/script sidecars — keep in lock-step
  if (url.pathname.includes("/audio/") && (url.pathname.endsWith(".mp3") || url.pathname.endsWith(".json"))) {
    e.respondWith(networkFirst(e.request, AUDIO_CACHE));
    return;
  }

  // pages: network-first with offline fallback to cache
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    e.respondWith(networkFirst(e.request, VERSION));
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

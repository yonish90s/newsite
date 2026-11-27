// Service Worker מהיר ובטוח:
// - דפי HTML, ניווט, API ונתוני Firebase תמיד מגיעים ישירות מהרשת (כל עדכון באתר מופיע מיד).
// - קבצים סטטיים עם גרסה (?v=...), תמונות דוגמה (/rent/) וספריות קבועות (Firebase SDK, פונטים) נשמרים במטמון המקומי לטעינה מיידית, ומתחלפים אוטומטית כשהגרסה (?v=) מתעדכנת.
const CACHE_NAME = 'bw-fast-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheableStatic(url, req) {
  if (req.method !== 'GET' || req.mode === 'navigate') return false;
  if (url.origin === self.location.origin) {
    if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.startsWith('/api/')) return false;
    if (url.pathname.startsWith('/rent/')) return true;
    return /\.(?:js|css|png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname) && url.searchParams.has('v');
  }
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/10.12.0/')) return true;
  if (url.hostname === 'fonts.gstatic.com') return true;
  if ((url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com') && /\.(?:js|css)$/i.test(url.pathname)) return true;
  return false;
}

self.addEventListener('fetch', e => {
  let url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (!isCacheableStatic(url, e.request)) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
          if (url.origin === self.location.origin && url.searchParams.has('v')) {
            cache.keys().then(keys => {
              keys.forEach(k => {
                try {
                  const ku = new URL(k.url);
                  if (ku.origin === url.origin && ku.pathname === url.pathname && ku.href !== url.href) cache.delete(k);
                } catch (err) {}
              });
            }).catch(() => {});
          }
          cache.put(e.request, res.clone()).catch(() => {});
        }
        return res;
      } catch (err) {
        return cached || Response.error();
      }
    })
  );
});

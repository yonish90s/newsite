// Service worker מינימלי: מאפשר "התקנה" של האתר כאפליקציה. לא שומר כלום במטמון — כל בקשה הולכת לרשת כרגיל.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

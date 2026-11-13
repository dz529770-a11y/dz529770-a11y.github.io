// SIZ Tracker — service worker
// 1) офлайн-кеш приложения (PWA)
// 2) periodicSync — проверка сроков при закрытом сайте (Chrome/Android)
// 3) push — "разбудить по расписанию" от push-сервера (опционально)
// 4) notificationclick — открыть приложение

/* global SizDB, SizCore */
importScripts('js/db.js');
importScripts('js/core.js');

const CACHE = 'siz-tracker-v1';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'js/app.js',
  'js/core.js',
  'js/db.js',
  'js/i18n.js',
  'manifest.webmanifest',
  'privacy.html',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first для файлов приложения, network fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match('index.html'));
    })
  );
});

// ---- Общая проверка сроков: читает данные из IndexedDB ----
async function runCheck(dedupByDay) {
  const all = await SizDB.readAll();
  const today = SizCore.todayString();
  if (dedupByDay && all.last_check_date === today) return { notified: false, reason: 'already' };

  const alerts = SizCore.computeAlerts(all.items || [], {
    submittedIds: all.submitted_ids || [],
    postponedItems: all.postponed_items || {},
    warningDays: all.warning_days || 5,
    force: false
  });

  // отмечаем день проверки всегда (как в Android-воркере)
  const db = await openRawDb();
  await rawSet(db, 'last_check_date', today);

  if (!alerts.length) return { notified: false, reason: 'no-alerts' };

  const lang = all.language || 'ru';
  const { title, subtitle, body } = SizCore.buildNotification(alerts, lang);
  await self.registration.showNotification(title, {
    body: body || subtitle,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'siz-alert',
    renotify: true,
    vibrate: all.long_notification ? [0, 500, 200, 500, 200, 500] : [0, 300, 200, 300],
    requireInteraction: !!all.long_notification,
    data: { url: './?alerts=1' }
  });
  return { notified: true, count: alerts.length };
}

// Прямая запись в IDB без кеша db.js (readAll уже открывает БД)
function openRawDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('siz_tracker_db', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('kv'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function rawSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Periodic Background Sync (Chrome/Android, установленное PWA) ----
self.addEventListener('periodicsync', e => {
  if (e.tag === 'siz-daily-check') {
    e.waitUntil(runCheck(true).catch(() => ({ notified: false })));
  }
});

// ---- Web Push: сервер шлёт пустой "ping", всё вычисляется локально ----
self.addEventListener('push', e => {
  e.waitUntil(runCheck(false).catch(() => ({ notified: false })));
});

// ---- Клик по уведомлению: открыть/сфокусировать приложение ----
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.startsWith(self.registration.scope)) {
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

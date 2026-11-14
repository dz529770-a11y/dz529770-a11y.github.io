// Хранилище данных: IndexedDB (ключ-значение) + кеш в памяти.
// Аналог SizRepository (SharedPreferences) — выбран IDB, т.к. service worker
// не имеет доступа к localStorage, а читать данные должен и SW (push/periodicSync).
(function (root) {
  'use strict';

  const DB_NAME = 'siz_tracker_db';
  const DB_VERSION = 1;
  const STORE = 'kv';

  const DEFAULTS = {
    items: [],            // [{id,name,number,testDate,isSubmitted,postponedUntil}]
    submitted_ids: [],
    postponed_items: {},  // {id: timestamp}
    original_dates: {},   // {id: 'dd.mm.yyyy'}
    last_check_date: '',
    check_hour: 8,
    check_minute: 0,
    warning_days: 5,
    ringtone: 'default',  // 'default' | 'siren' | 'beep'
    long_notification: true,
    language: '',         // '' = авто (из браузера)
    backup_enabled: false,
    backup_code: ''       // код восстановления облачной копии
  };

  let cache = null;
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function idbGetAll(db) {
    return new Promise((resolve, reject) => {
      const out = {};
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) { out[cur.key] = cur.value; cur.continue(); }
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
    });
  }

  function idbSet(db, key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function idbClear(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // Загрузить все ключи в память (вызывать при старте)
  async function load() {
    const db = await openDb();
    const all = await idbGetAll(db);
    cache = Object.assign({}, DEFAULTS, all);
    return cache;
  }

  function get(key) {
    if (!cache) throw new Error('SizDB not loaded');
    return cache[key];
  }

  async function set(key, value) {
    if (!cache) await load();
    cache[key] = value;
    const db = await openDb();
    await idbSet(db, key, value);
  }

  async function clearAll() {
    cache = Object.assign({}, DEFAULTS);
    const db = await openDb();
    await idbClear(db);
  }

  // ---- Удобные геттеры/сеттеры (совместимы с ключами Android-приложения) ----
  const api = {
    load, get, set, clearAll,
    DEFAULTS,
    // для прямого чтения из SW без кеша
    async readAll() {
      const db = await openDb();
      const all = await idbGetAll(db);
      return Object.assign({}, DEFAULTS, all);
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SizDB = api;
})(typeof self !== 'undefined' ? self : this);

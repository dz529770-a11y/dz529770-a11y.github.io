// SizBackup — зашифрованная облачная копия на push-сервере (Cloudflare Worker).
// Код восстановления — единственный секрет (генерируется или задаётся пользователем):
//   auth   = SHA-256('siz-auth:' + код)  — предъявляется серверу как пропуск
//   id     = SHA-256(auth)              — адрес ячейки в KV
//   encKey = PBKDF2(код, 'siz-enc-v1')   — AES-GCM-256, серверу недоступен
// Сервер хранит только шифроблок; сам код никуда не отправляется.
(function (root) {
  'use strict';

  const te = new TextEncoder();
  const td = new TextDecoder();
  // Алфавит без неоднозначных символов (0/O, 1/I/L)
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function genCode() {
    const rnd = crypto.getRandomValues(new Uint8Array(16));
    let s = '';
    for (let i = 0; i < 16; i++) s += ALPHABET[rnd[i] % ALPHABET.length];
    return s.replace(/(.{4})(?=.)/g, '$1-'); // XXXX-XXXX-XXXX-XXXX
  }

  function normalize(code) {
    return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function isValidCode(code) {
    return normalize(code).length >= 8;
  }
  // Красивый вид XXXX-XXXX-… для показа пользователю
  function group(code) {
    return normalize(code).replace(/(.{4})(?=.)/g, '$1-');
  }

  async function sha256hex(s) {
    const h = await crypto.subtle.digest('SHA-256', te.encode(s));
    let out = '';
    for (const b of new Uint8Array(h)) out += b.toString(16).padStart(2, '0');
    return out;
  }

  async function derive(code) {
    const auth = await sha256hex('siz-auth:' + normalize(code));
    const id = await sha256hex(auth);
    return { auth, id };
  }

  async function encKey(code) {
    const base = await crypto.subtle.importKey(
      'raw', te.encode(normalize(code)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: te.encode('siz-enc-v1'), iterations: 100000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  function toB64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(s);
  }
  function fromB64(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function encryptText(code, text) {
    const key = await encKey(code);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(text));
    const out = new Uint8Array(iv.length + ct.byteLength);
    out.set(iv);
    out.set(new Uint8Array(ct), iv.length);
    return toB64(out);
  }

  async function decryptText(code, b64s) {
    const raw = fromB64(b64s);
    const key = await encKey(code);
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
    return td.decode(pt);
  }

  // POST /backup/<id>  (keepalive — для выгрузки при закрытии страницы)
  async function upload(baseUrl, code, plainText, keepalive) {
    const { auth, id } = await derive(code);
    const data = await encryptText(code, plainText);
    const resp = await fetch(baseUrl + '/backup/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Backup-Auth': auth },
      body: JSON.stringify({ data, updatedAt: Date.now() }),
      keepalive: !!keepalive
    });
    return resp.ok;
  }

  // GET /backup/<id> -> расшифрованный текст дампа или null
  async function download(baseUrl, code) {
    const { auth, id } = await derive(code);
    const resp = await fetch(baseUrl + '/backup/' + id, {
      headers: { 'X-Backup-Auth': auth }
    });
    if (!resp.ok) return null;
    const j = await resp.json();
    if (!j || !j.data) return null;
    return decryptText(code, j.data);
  }

  async function remove(baseUrl, code) {
    try {
      const { auth, id } = await derive(code);
      await fetch(baseUrl + '/backup/' + id, {
        method: 'DELETE', headers: { 'X-Backup-Auth': auth }
      });
    } catch (e) {}
  }

  const api = { genCode, normalize, isValidCode, group, sha256: sha256hex, encryptText, decryptText, upload, download, remove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SizBackup = api;
})(typeof self !== 'undefined' ? self : this);

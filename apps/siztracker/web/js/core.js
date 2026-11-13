// Ядро логики SIZ Tracker — общее для страницы (app.js) и service worker (sw.js)
// Порт Kotlin: DateUtils, SizViewModel, SizReminderReceiver
/* global SIZ_t */
(function (root) {
  'use strict';

  // ---------- Даты (порт DateUtils.kt) ----------

  function parseDate(dateStr) {
    if (!dateStr || !String(dateStr).trim()) return null;
    const clean = String(dateStr).trim().replace(/[\/-]/g, '.');
    const parts = clean.split('.');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parts[2];
    if (year.length === 2) year = 2000 + parseInt(year, 10);
    else year = parseInt(year, 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  }

  // Сколько дней осталось до даты (отрицательное = просрочено), null если дата невалидна
  function getDaysLeft(dateStr, now) {
    const target = parseDate(dateStr);
    if (!target) return null;
    const today = now ? new Date(now) : new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  function todayString(now) {
    const d = now ? new Date(now) : new Date();
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  // Timestamp завтрашнего дня 8:00 (отложить напоминание)
  function tomorrowTimestamp() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.getTime();
  }

  function formatTimestamp(ts) {
    return todayString(ts);
  }

  // Валидация даты ДД.ММ.ГГГГ (порт isValidDate)
  function isValidDate(dateStr) {
    if (!dateStr || !String(dateStr).trim()) return false;
    const clean = String(dateStr).trim().replace(/[\/-]/g, '.');
    const parts = clean.split('.');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const ys = parts[2];
    let year;
    if (ys.length === 2) year = 2000 + parseInt(ys, 10);
    else if (ys.length === 4) year = parseInt(ys, 10);
    else return false;
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const dim = [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (day < 1 || day > dim) return false;
    return parseDate(dateStr) !== null;
  }

  // Автоформат ввода даты: цифры -> ДД.ММ.ГГГГ (порт formatDateInput)
  function formatDateInput(input) {
    const digits = String(input).replace(/\D/g, '');
    let s = '';
    if (digits.length > 0) s += digits.slice(0, 2);
    if (digits.length >= 3) s += '.' + digits.slice(2, 4);
    if (digits.length >= 5) s += '.' + digits.slice(4, 8);
    return s;
  }

  // ---------- Статусы (порт SizStatus/ViewModel.calculateStatus) ----------
  // kind: 'nodate' | 'submitted' | 'overdue' | 'critical' | 'warning' | 'ok'
  // Цвета бейджей: красный overdue/critical, оранжевый warning(3-5), зеленый ok(>5), синий submitted, серый nodate
  function calcStatus(isSubmitted, daysLeft) {
    if (isSubmitted) return { kind: 'submitted', color: '#3b82f6' };
    if (daysLeft == null) return { kind: 'nodate', color: '#6b7280' };
    if (daysLeft < 0) return { kind: 'overdue', color: '#ef4444', days: daysLeft };
    if (daysLeft <= 2) return { kind: 'critical', color: '#ef4444', days: daysLeft };
    if (daysLeft <= 5) return { kind: 'warning', color: '#f97316', days: daysLeft };
    return { kind: 'ok', color: '#22c55e', days: daysLeft };
  }

  // ---------- Алерты ----------
  // force=false -> пропускать отложенные (фоновая проверка)
  // force=true  -> показывать отложенные тоже (как forceCheckAlerts в Android)
  function computeAlerts(items, opts) {
    const submitted = new Set(opts.submittedIds || []);
    const postponed = opts.postponedItems || {};
    const warningDays = Math.max(1, opts.warningDays || 5);
    const now = Date.now();
    const alerts = [];
    for (const item of items) {
      if (submitted.has(item.id)) continue;
      const until = postponed[item.id] || postponed[String(item.id)] || 0;
      const isPostponed = until > now;
      if (isPostponed && !opts.force) continue;
      const daysLeft = getDaysLeft(item.testDate);
      if (daysLeft != null && daysLeft <= warningDays) {
        alerts.push({ item, daysLeft, isOverdue: daysLeft < 0, isPostponed });
      }
    }
    // Сортировка: просроченные и ближайшие первыми
    alerts.sort((a, b) => a.daysLeft - b.daysLeft);
    return alerts;
  }

  // Ближайший момент, когда появится следующий алерт (для push-сервера).
  // Учитывает warningDays и отложенные. null -> нечего напоминать.
  function nextDueTs(items, opts) {
    const submitted = new Set(opts.submittedIds || []);
    const postponed = opts.postponedItems || {};
    const warningDays = Math.max(1, opts.warningDays || 5);
    const now = Date.now();
    let best = null;
    for (const item of items) {
      if (submitted.has(item.id)) continue;
      const t = parseDate(item.testDate);
      if (!t) continue;
      t.setHours(0, 0, 0, 0);
      let alertStart = t.getTime() - warningDays * 86400000;
      const until = postponed[item.id] || postponed[String(item.id)] || 0;
      if (until > alertStart) alertStart = until;
      if (alertStart <= now) { best = 0; break; } // уже есть алерт
      if (best == null || alertStart < best) best = alertStart;
    }
    return best;
  }

  // Тексты push/системных уведомлений (в Android захардкожены в Kotlin-коде)
  const NOTIF_STRINGS = {
    ru: {
      notif_title_one: 'Истекает срок СИЗ!',
      notif_title_many: 'Истекает срок %1$s СИЗ!',
      notif_overdue: 'ПРОСРОЧЕНО',
      notif_today: 'СЕГОДНЯ',
      notif_one_day: '1 день',
      notif_days: '%1$s дн.',
      notif_left: 'осталось %1$s дн.',
      notif_and_more: 'и еще %1$s СИЗ'
    },
    en: {
      notif_title_one: 'PPE deadline expiring!',
      notif_title_many: '%1$s PPE deadlines expiring!',
      notif_overdue: 'OVERDUE',
      notif_today: 'TODAY',
      notif_one_day: '1 day',
      notif_days: '%1$s d.',
      notif_left: '%1$s days left',
      notif_and_more: 'and %1$s more'
    },
    be: {
      notif_title_one: 'Канчаецца тэрмін СЗА!',
      notif_title_many: 'Канчаецца тэрмін %1$s СЗА!',
      notif_overdue: 'ПРАТЭРМІНАВАНА',
      notif_today: 'СЁННЯ',
      notif_one_day: '1 дзень',
      notif_days: '%1$s дн.',
      notif_left: 'засталося %1$s дн.',
      notif_and_more: 'і яшчэ %1$s СЗА'
    },
    uk: {
      notif_title_one: 'Закінчується термін ЗІЗ!',
      notif_title_many: 'Закінчується термін %1$s ЗІЗ!',
      notif_overdue: 'ПРОСТРОЧЕНО',
      notif_today: 'СЬОГОДНІ',
      notif_one_day: '1 день',
      notif_days: '%1$s дн.',
      notif_left: 'залишилось %1$s дн.',
      notif_and_more: 'і ще %1$s ЗІЗ'
    }
  };

  function notifT(lang, key) {
    const pack = NOTIF_STRINGS[lang] || NOTIF_STRINGS.en;
    let s = pack[key] || NOTIF_STRINGS.en[key] || key;
    const args = Array.prototype.slice.call(arguments, 2);
    let i = 0;
    return s.replace(/%(\d+)\$[sd]|%[sd]/g, function (m, num) {
      const idx = num ? (parseInt(num, 10) - 1) : (i++);
      return args[idx] !== undefined ? String(args[idx]) : m;
    });
  }

  // Текст уведомления (порт SizCheckWorker.showLongNotification)
  function buildNotification(alerts, lang) {
    const t = notifT.bind(null, lang);
    const n = alerts.length;
    const title = n === 1 ? t('notif_title_one') : t('notif_title_many', n);
    const bodyLines = alerts.map(a => {
      const d = a.daysLeft;
      const st = d < 0 ? t('notif_overdue') : d === 0 ? t('notif_today') : d === 1 ? t('notif_one_day') : t('notif_days', d);
      return `• ${a.item.name}: ${st}`;
    });
    const first = alerts[0];
    const subtitle = n === 1
      ? `${first.item.name} — ${t('notif_left', first.daysLeft)}`
      : `${first.item.name} ${t('notif_and_more', n - 1)}`;
    return { title, subtitle, body: bodyLines.join('\n') };
  }

  // Статистика (порт updateStatistics)
  function calcStats(listItems) {
    let attention = 0, submitted = 0;
    for (const li of listItems) {
      if (li.isSubmitted) submitted++;
      else {
        const st = calcStatus(false, li.daysLeft).kind;
        if (st === 'critical' || st === 'warning' || st === 'overdue') attention++;
      }
    }
    return { total: listItems.length, attention, submitted };
  }

  const SizCore = {
    parseDate, getDaysLeft, todayString, tomorrowTimestamp, formatTimestamp,
    isValidDate, formatDateInput, calcStatus, computeAlerts, nextDueTs,
    buildNotification, calcStats
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SizCore;
  else root.SizCore = SizCore;
})(typeof self !== 'undefined' ? self : this);

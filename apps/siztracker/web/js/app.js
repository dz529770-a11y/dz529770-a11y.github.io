// SIZ Tracker — веб-версия (PWA)
// Порт MainActivity + AlertActivity + ViewModel + Repository
/* global SIZ_I18N, SIZ_t, SizCore, SizDB, SizBackup */
(function () {
  'use strict';

  // ===================== КОНФИГ =====================
  // URL сервиса Web Push (push-server/worker.js). Пусто = push отключён,
  // уведомления при закрытом сайте работают через Periodic Background Sync.
  const PUSH_SERVER_URL = 'https://siz-push.dz529770.workers.dev';
  // Публичный VAPID-ключ (base64url) — генерируется вместе с приватным (см. push-server/README.md)
  const PUSH_PUBLIC_KEY = 'BHgr8Y1ZvApiBa4aiJfaRdRX5nvJhLIGNTTSshgeTgvPbbR4hotEWH_ehAZvv_giYRTgE2oKAR3ljhpOzzff_3Q';
  // Telegram-бот для дублирования напоминаний (заводится через @BotFather)
  const TG_BOT = 'siztracker_bot';

  // Доп. строки, которых нет в Android strings.xml
  const EXTRA = {
    ru: {
      sound_siren: 'Сирена', sound_beep: 'Сигнал', sound_default: 'По умолчанию',
      notif_perm: 'Уведомления', notif_granted: 'Разрешены', notif_denied: 'Запрещены',
      notif_default: 'Не запрошены', notif_unsupported: 'Не поддерживаются браузером',
      install_app: 'Установить приложение',
      exit_note: 'Приложение закрыто. Вкладку можно закрыть.',
      enable_notif_hint: 'Чтобы получать напоминания при закрытом сайте — разрешите уведомления',
      import_btn: 'Импортировать', test_done: 'Тестовое уведомление отправлено',
      postponed_toast: 'Напоминание отложено до завтра',
      check_scheduled: 'Проверка будет выполняться в %1$s:%2$s',
      warn_set: 'Предупреждения за %1$s дн. до испытания',
      day_1: '%1$s день', day_24: '%1$s дня', day_5: '%1$s дней',
      ios_hint: 'На iPhone: установите приложение на экран «Домой» (Поделиться → На экран «Домой»), иначе уведомления не работают',
      backup_title: 'Облачная копия', backup_on: 'Включена', backup_off: 'Выключена',
      backup_desc: 'Зашифрованная копия реестра на сервере уведомлений. Сервер видит только шифр — восстановление возможно по коду восстановления.',
      backup_enable: 'Включить', backup_disable: 'Отключить', backup_show_code: 'Показать код',
      backup_restore: 'Восстановить из облака', backup_restore_code: 'Восстановить по коду',
      backup_code_title: 'Код восстановления',
      backup_code_msg: 'Запишите код и храните отдельно от устройства — без него копию не восстановить:',
      backup_enter_code: 'Введите код восстановления',
      backup_copy: 'Копировать', copied: 'Скопировано',
      backup_uploaded: 'Копия сохранена в облаке', backup_failed: 'Не удалось сохранить копию в облаке',
      backup_not_found: 'Копия не найдена или код неверный', backup_invalid_code: 'Неверный формат кода',
      backup_disabled: 'Облачная копия отключена', backup_restoring: 'Восстановление из облака…',
      backup_confirm_disable: 'Отключить облачную копию? Копия на сервере будет удалена.',
      backup_custom: 'Задать свой код',
      backup_enter_new: 'Придумайте код: минимум 8 символов — буквы и цифры. Это пароль к копии: кто его знает, тот её и читает.',
      backup_too_short: 'Минимум 8 символов (буквы и цифры)',
      tg_desc: 'Дублирует напоминания в Telegram через бота — доходит, даже если браузерные уведомления не сработали. Сообщение обезличенное: детали только в приложении.',
      tg_connect: 'Подключить Telegram', tg_disconnect: 'Отключить',
      tg_connected: 'Telegram подключён', tg_disconnected: 'Telegram отключён',
      tg_link_title: 'Подключение Telegram',
      tg_link_msg: 'Откройте бота и нажмите Start — либо отправьте ему этот код:',
      tg_open_bot: 'Открыть бота', tg_checking: 'Ждём подключения…',
      tg_need_notif: 'Сначала разрешите уведомления', tg_failed: 'Ошибка связи с сервером',
      tg_status_on: 'Подключён', tg_status_off: 'Не подключён'
    },
    en: {
      sound_siren: 'Siren', sound_beep: 'Beep', sound_default: 'Default',
      notif_perm: 'Notifications', notif_granted: 'Granted', notif_denied: 'Denied',
      notif_default: 'Not requested', notif_unsupported: 'Not supported by browser',
      install_app: 'Install app',
      exit_note: 'App closed. You can close this tab.',
      enable_notif_hint: 'To get reminders while the site is closed — allow notifications',
      import_btn: 'Import', test_done: 'Test notification sent',
      postponed_toast: 'Reminder postponed to tomorrow',
      check_scheduled: 'Check will run at %1$s:%2$s',
      warn_set: 'Warnings %1$s days before test',
      day_1: '%1$s day', day_24: '%1$s days', day_5: '%1$s days',
      ios_hint: 'On iPhone: install the app to Home Screen (Share → Add to Home Screen), otherwise notifications will not work',
      backup_title: 'Cloud backup', backup_on: 'On', backup_off: 'Off',
      backup_desc: 'Encrypted copy of the registry on the notification server. The server only sees ciphertext — restoring requires your recovery code.',
      backup_enable: 'Enable', backup_disable: 'Disable', backup_show_code: 'Show code',
      backup_restore: 'Restore from cloud', backup_restore_code: 'Restore by code',
      backup_code_title: 'Recovery code',
      backup_code_msg: 'Write this code down and keep it separately — the backup cannot be restored without it:',
      backup_enter_code: 'Enter recovery code',
      backup_copy: 'Copy', copied: 'Copied',
      backup_uploaded: 'Backup saved to cloud', backup_failed: 'Failed to save backup to cloud',
      backup_not_found: 'Backup not found or wrong code', backup_invalid_code: 'Invalid code format',
      backup_disabled: 'Cloud backup disabled', backup_restoring: 'Restoring from cloud…',
      backup_confirm_disable: 'Disable cloud backup? The server copy will be deleted.',
      backup_custom: 'Set own code',
      backup_enter_new: 'Create a code: minimum 8 characters — letters and digits. It works like a password: anyone who knows it can read the backup.',
      backup_too_short: 'Minimum 8 characters (letters and digits)',
      tg_desc: 'Duplicates reminders to Telegram via a bot — arrives even if browser notifications fail. The message is anonymous: details stay in the app.',
      tg_connect: 'Connect Telegram', tg_disconnect: 'Disconnect',
      tg_connected: 'Telegram connected', tg_disconnected: 'Telegram disconnected',
      tg_link_title: 'Connect Telegram',
      tg_link_msg: 'Open the bot and press Start — or send it this code:',
      tg_open_bot: 'Open bot', tg_checking: 'Waiting for connection…',
      tg_need_notif: 'Allow notifications first', tg_failed: 'Server connection error',
      tg_status_on: 'Connected', tg_status_off: 'Not connected'
    }
  };

  function t(key) {
    const args = Array.prototype.slice.call(arguments, 1);
    const pack = EXTRA[state.lang] || EXTRA.en;
    if (pack[key] !== undefined) {
      let s = pack[key], i = 0;
      return s.replace(/%(\d+)\$[sd]|%[sd]/g, (m, n) => {
        const idx = n ? +n - 1 : i++;
        return args[idx] !== undefined ? String(args[idx]) : m;
      });
    }
    return SIZ_t.apply(null, [state.lang, key].concat(args));
  }

  // ===================== СОСТОЯНИЕ =====================
  const state = {
    items: [],
    submittedIds: new Set(),
    postponed: {},
    originalDates: {},
    lastCheck: '',
    checkHour: 8,
    checkMinute: 0,
    warningDays: 5,
    ringtone: 'default',
    longNotification: true,
    lang: 'ru',
    filter: '',
    alerts: [],
    alertIndex: 0,
    soundOn: true,
    backupCode: '',
    backupOn: false,
    tgLinked: false
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ===================== ДАННЫЕ =====================
  async function loadState() {
    await SizDB.load();
    state.items = SizDB.get('items') || [];
    state.submittedIds = new Set(SizDB.get('submitted_ids') || []);
    state.postponed = SizDB.get('postponed_items') || {};
    state.originalDates = SizDB.get('original_dates') || {};
    state.lastCheck = SizDB.get('last_check_date') || '';
    state.checkHour = SizDB.get('check_hour');
    state.checkMinute = SizDB.get('check_minute');
    state.warningDays = SizDB.get('warning_days');
    state.ringtone = SizDB.get('ringtone') || 'default';
    state.longNotification = SizDB.get('long_notification');
    const savedLang = SizDB.get('language');
    state.lang = savedLang || detectLang();
    state.backupCode = SizDB.get('backup_code') || '';
    state.backupOn = !!SizDB.get('backup_enabled') && !!state.backupCode;
    state.tgLinked = !!SizDB.get('tg_linked');
  }

  // Авто-бэкап: любая запись в БД планирует выгрузку копии в облако (дебаунс 10 с)
  const _dbSet = SizDB.set.bind(SizDB);
  SizDB.set = (k, v) => _dbSet(k, v).then(r => { scheduleBackupUpload(); return r; });

  function detectLang() {
    const nav = (navigator.language || 'ru').toLowerCase().slice(0, 2);
    const map = { in: 'id', iw: 'he', nb: 'no', nn: 'no' };
    const code = map[nav] || nav;
    return SIZ_I18N.LANGS.some(l => l[0] === code) ? code : 'ru';
  }

  const saveItems = () => SizDB.set('items', state.items);
  const saveSubmitted = () => SizDB.set('submitted_ids', [...state.submittedIds]);
  const savePostponed = () => SizDB.set('postponed_items', state.postponed);
  const saveOriginalDates = () => SizDB.set('original_dates', state.originalDates);

  async function mutate(fn) {
    await fn();
    renderAll();
    syncPush();
  }

  // ===================== РЕНДЕР =====================
  function applyLang() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = ['ar', 'ur', 'fa', 'ps', 'he'].includes(state.lang) ? 'rtl' : 'ltr';
    $('appTitle').textContent = t('app_name_full');
    $('appSubtitle').textContent = t('app_subtitle');
    $('btnAdd').textContent = t('add');
    $('btnExit').textContent = t('edit');
    $('btnCheck').textContent = t('check');
    $('searchInput').placeholder = t('search_hint');
    $('empty').textContent = t('empty_list');
    renderAll();
  }

  function listItems() {
    let collator;
    try { collator = new Intl.Collator(state.lang); } catch (e) { collator = new Intl.Collator(); }
    return state.items
      .slice()
      .sort((a, b) => collator.compare(a.name.toLowerCase(), b.name.toLowerCase()))
      .map(it => {
        const daysLeft = SizCore.getDaysLeft(it.testDate);
        const isSubmitted = state.submittedIds.has(it.id);
        return { item: it, daysLeft, isSubmitted, status: SizCore.calcStatus(isSubmitted, daysLeft) };
      });
  }

  function renderAll() {
    const all = listItems();
    const st = SizCore.calcStats(all);
    $('stats').textContent = t('statistics_format', st.total, st.attention, st.submitted);

    const q = state.filter.trim().toLowerCase();
    const items = q ? all.filter(li => li.item.name.toLowerCase().includes(q) || li.item.number.toLowerCase().includes(q)) : all;

    $('empty').classList.toggle('hidden', items.length > 0);
    const ul = $('list');
    ul.innerHTML = '';
    for (const li of items) ul.appendChild(renderCard(li));
  }

  function renderCard(li) {
    const { item, status, isSubmitted } = li;
    const el = document.createElement('li');
    el.className = 'siz-card' + (isSubmitted ? ' submitted' : '');

    let badge, label;
    switch (status.kind) {
      case 'overdue': badge = '✗'; label = t('days_overdue_label'); break;
      case 'nodate': badge = '—'; label = ''; break;
      case 'submitted': badge = '✓'; label = ''; break;
      default: badge = String(status.days); label = t('days_left_label');
    }

    el.innerHTML =
      `<img class="item-icon" src="icons/icon-192.png" alt="">` +
      `<div class="siz-main">` +
      `<div class="siz-name">${esc(item.name)}</div>` +
      `<div class="siz-sub">` +
      `<div class="siz-meta"><div class="siz-number">${item.number ? '№' + esc(item.number) : '—'}</div>` +
      `<div class="siz-date">${item.testDate ? esc(item.testDate) : '—'}</div></div>` +
      (label ? `<span class="days-label">${label}</span>` : '') +
      `<span class="days-badge" style="background:${status.color}">${badge}</span>` +
      (isSubmitted ? `<span class="siz-status">${esc(t('status_submitted'))} ✓</span>` : '') +
      `</div></div>`;

    el.addEventListener('click', () => { if (!el.__lpFired) showEditDialog(item); });
    attachLongPress(el, () => showContextMenu(item, el));
    return el;
  }

  // ===================== ДОЛГОЕ НАЖАТИЕ =====================
  // el.__lpFired подавляет обычный click сразу после long-press
  function attachLongPress(el, fn) {
    let timer = null;
    const fire = e => {
      clearTimeout(timer);
      el.__lpFired = true;
      fn(e);
      setTimeout(() => { el.__lpFired = false; }, 60);
    };
    el.addEventListener('touchstart', () => { timer = setTimeout(() => { el.__lpFired = true; fn(); setTimeout(() => { el.__lpFired = false; }, 60); }, 550); }, { passive: true });
    el.addEventListener('touchend', () => clearTimeout(timer));
    el.addEventListener('touchmove', () => clearTimeout(timer));
    el.addEventListener('mousedown', () => { timer = setTimeout(() => fire(), 550); });
    el.addEventListener('mouseup', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => clearTimeout(timer));
    el.addEventListener('contextmenu', e => { e.preventDefault(); fire(e); });
  }

  // ===================== ВСПЛЫВАЮЩИЕ МЕНЮ =====================
  function openPopup(root, items, anchor) {
    root.innerHTML = '';
    for (const it of items) {
      const mi = document.createElement('div');
      mi.className = 'mi' + (it.danger ? ' danger' : '');
      mi.innerHTML = (it.icon ? `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="${it.icon}"/></svg>` : '') + `<span>${esc(it.label)}</span>`;
      mi.addEventListener('click', e => { e.stopPropagation(); closePopups(); it.action(); });
      root.appendChild(mi);
    }
    root.classList.remove('hidden');
    // позиционирование
    const r = anchor.getBoundingClientRect();
    root.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      const pw = root.offsetWidth, ph = root.offsetHeight;
      let x = Math.min(Math.max(8, r.right - pw), innerWidth - pw - 8);
      let y = r.bottom + 4;
      if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 4);
      root.style.left = x + 'px'; root.style.top = y + 'px';
      root.style.visibility = '';
    });
  }

  function closePopups() {
    $('menuPopup').classList.add('hidden');
    $('contextMenu').classList.add('hidden');
  }

  const ICONS = {
    search: 'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z',
    refresh: 'M17.65 6.35A8 8 0 1 0 19.73 14h-2.08a6 6 0 1 1-1.41-6.24L13 11h7V4z',
    settings: 'M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.05 7.05 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54a7.05 7.05 0 0 0 1.62-.94l2.39.96c.19.12.47.02.61-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z',
    help: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17h-2v-2h2zm2.07-7.75-.9.92A3.6 3.6 0 0 0 13 15h-2v-.5a4.4 4.4 0 0 1 1.17-3.04l1.24-1.26a2 2 0 1 0-3.24-2.35A2 2 0 0 0 10 9H8a4 4 0 1 1 7.07 2.75z',
    export: 'M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z',
    import: 'M9 16h6v-6h4l-7-7-7 7h4zM5 18v2h14v-2z',
    exit: 'M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z',
    edit: 'M3 17.25V21h3.75L17.81 8.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z',
    delete: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zm3.46-7.12 1.41-1.42L12 11.59l1.12-1.13 1.42 1.42L13.41 13l1.13 1.12-1.42 1.42L12 14.41l-1.12 1.13-1.42-1.42L10.59 13zM15.5 4l-1-1h-5l-1 1H5v2h14V4z',
    check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    alarm: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-4.5-5.8V4.5a1.5 1.5 0 0 0-3 0v.7A6 6 0 0 0 6 11v5l-2 2v1h16v-1z',
    bell: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-4.5-5.8V4.5a1.5 1.5 0 0 0-3 0v.7A6 6 0 0 0 6 11v5l-2 2v1h16v-1z',
    music: 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3z',
    lang: 'M11.99 2A10 10 0 1 0 22 12 10 10 0 0 0 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04A14.09 14.09 0 0 1 13.91 8h-3.82A14.09 14.09 0 0 1 12 4.04zM4.26 14a8.15 8.15 0 0 1 0-4h2.95a16.5 16.5 0 0 0 0 4zm.74 2h2.95a15.65 15.65 0 0 0 1.38 3.56A8.03 8.03 0 0 1 5 16zm2.95-2H4.26a8.15 8.15 0 0 1 0-4h3.69a16.5 16.5 0 0 0 0 4zm.63 6.56A15.65 15.65 0 0 0 7.2 16h2.95zm4.91-10.52A14.09 14.09 0 0 1 12 4.04zM12 19.96A14.09 14.09 0 0 1 10.09 16h3.82A14.09 14.09 0 0 1 12 19.96zM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4zm.25 5.56A15.65 15.65 0 0 0 16.05 16h2.95a8.03 8.03 0 0 1-4.41 3.56zM16.79 14a16.5 16.5 0 0 0 0-4h2.95a8.15 8.15 0 0 1 0 4z',
    install: 'M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z',
    cloud: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
    send: 'M2.01 21 23 12 2.01 3 2 10l15 2-15 2z',
    notif: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-4.5-5.8V4.5a1.5 1.5 0 0 0-3 0v.7A6 6 0 0 0 6 11v5l-2 2v1h16v-1z',
    privacy: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z'
  };

  function showMainMenu() {
    const items = [
      { icon: ICONS.refresh, label: t('action_refresh'), action: () => { renderAll(); toast(t('action_refresh')); } },
      { icon: ICONS.settings, label: t('action_settings'), action: showSettings },
      { icon: ICONS.help, label: t('action_help'), action: showHelp },
      { icon: ICONS.export, label: t('action_export_db'), action: exportData },
      { icon: ICONS.import, label: t('action_import_db'), action: () => $('importFile').click() },
    ];
    if (window.deferredInstallPrompt) {
      items.push({ icon: ICONS.install, label: t('install_app'), action: () => { window.deferredInstallPrompt.prompt(); window.deferredInstallPrompt = null; } });
    }
    items.push({ icon: ICONS.exit, label: t('action_exit'), action: exitApp, danger: true });
    openPopup($('menuPopup'), items, $('btnMenu'));
  }

  function showContextMenu(item, anchor) {
    const isSubmitted = state.submittedIds.has(item.id);
    const items = [
      { icon: ICONS.edit, label: t('action_edit'), action: () => showEditDialog(item) },
      ...(!isSubmitted ? [{ icon: ICONS.check, label: t('action_mark_submitted'), action: () => markSubmitted(item.id) }] : []),
      { icon: ICONS.alarm, label: t('action_postpone'), action: () => postpone(item.id) },
      { icon: ICONS.delete, label: t('delete'), action: () => confirmDelete(item), danger: true }
    ];
    openPopup($('contextMenu'), items, anchor);
  }

  // ===================== МОДАЛЬНЫЕ ОКНА =====================
  function openModal(build, opts) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    const modal = document.createElement('div');
    modal.className = 'modal';
    back.appendChild(modal);
    if (!(opts && opts.noCloseOnBack)) {
      back.addEventListener('click', e => { if (e.target === back) closeModal(back); });
    }
    build(modal, () => closeModal(back));
    $('modalRoot').appendChild(back);
    return back;
  }
  function closeModal(back) { back.remove(); }

  function infoDialog(title, msg) {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(title)}</h2><div class="msg">${msg}</div>` +
        `<button class="btn btn-blue" style="width:100%">OK</button>`;
      m.querySelector('.btn').addEventListener('click', close);
    });
  }

  function confirmDialog(title, msg, okText, onOk, danger) {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(title)}</h2><div class="msg">${esc(msg)}</div>` +
        `<div class="btn-row-modal"><button class="btn btn-outline" data-a="cancel">${esc(t('cancel'))}</button>` +
        `<button class="btn ${danger ? 'btn-red' : 'btn-green'}" data-a="ok">${esc(okText)}</button></div>`;
      m.querySelector('[data-a=cancel]').addEventListener('click', close);
      m.querySelector('[data-a=ok]').addEventListener('click', () => { close(); onOk(); });
    });
  }

  function choiceDialog(title, options, selIdx, onSel) {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(title)}</h2><div class="choice-list"></div>` +
        `<button class="btn btn-outline" style="width:100%;margin-top:10px">${esc(t('cancel'))}</button>`;
      const list = m.querySelector('.choice-list');
      options.forEach((o, i) => {
        const c = document.createElement('div');
        c.className = 'choice-item' + (i === selIdx ? ' sel' : '');
        c.innerHTML = `<span class="radio"></span>` + (o.flag ? `<span class="flag">${o.flag}</span>` : '') + `<span>${esc(o.label)}</span>`;
        c.addEventListener('click', () => { close(); onSel(i); });
        list.appendChild(c);
      });
      m.querySelector('.btn').addEventListener('click', close);
    });
  }

  // ===================== ДОБАВИТЬ / РЕДАКТИРОВАТЬ =====================
  function showEditDialog(item) {
    openModal((m, close) => {
      const isEdit = !!item;
      m.innerHTML =
        `<h2>${esc(t(isEdit ? 'edit_siz_title' : 'add_siz_title'))}</h2>` +
        `<div class="field-label">${esc(t('label_name'))}</div>` +
        `<input id="fName" class="field-input" placeholder="${esc(t('hint_name'))}" value="${isEdit ? esc(item.name) : ''}">` +
        `<div class="field-label">${esc(t('label_number'))}</div>` +
        `<input id="fNumber" class="field-input" placeholder="${esc(t('hint_number'))}" value="${isEdit ? esc(item.number) : ''}">` +
        `<div class="field-label">${esc(t('label_date'))}</div>` +
        `<input id="fDate" class="field-input" inputmode="numeric" maxlength="10" placeholder="${esc(t('hint_date'))}" value="${isEdit ? esc(item.testDate) : ''}">` +
        `<div class="field-hint">${esc(t('date_hint'))}</div>` +
        `<div class="field-error hidden" id="fErr"></div>` +
        `<div class="btn-row-modal">` +
        `<button class="btn btn-outline" data-a="cancel">${esc(t('cancel'))}</button>` +
        `<button class="btn btn-blue" data-a="save">${esc(t(isEdit ? 'save' : 'add'))}</button></div>`;

      const fDate = m.querySelector('#fDate');
      fDate.addEventListener('input', () => {
        const pos = fDate.selectionStart;
        const v = SizCore.formatDateInput(fDate.value);
        if (v !== fDate.value) { fDate.value = v; fDate.setSelectionRange(v.length, v.length); }
      });

      m.querySelector('[data-a=cancel]').addEventListener('click', close);
      m.querySelector('[data-a=save]').addEventListener('click', () => {
        const name = m.querySelector('#fName').value.trim();
        const number = m.querySelector('#fNumber').value.trim();
        const date = fDate.value.trim();
        const err = m.querySelector('#fErr');
        if (!name) { err.textContent = t('error_name_required'); err.classList.remove('hidden'); return; }
        if (date && !SizCore.isValidDate(date)) { err.textContent = t('error_invalid_date'); err.classList.remove('hidden'); fDate.classList.add('error'); return; }
        close();
        if (isEdit) updateItem(item, name, number, date); else addItem(name, number, date);
      });
      setTimeout(() => m.querySelector(isEdit ? '#fDate' : '#fName').focus(), 50);
    });
  }

  function addItem(name, number, date) {
    const it = { id: Date.now() + Math.floor(Math.random() * 999999), name, number, testDate: date };
    state.items.push(it);
    if (date) { state.originalDates[it.id] = date; saveOriginalDates(); }
    mutate(saveItems);
  }

  function updateItem(item, name, number, date) {
    const idx = state.items.findIndex(i => i.id === item.id);
    if (idx < 0) return;
    const updated = Object.assign({}, state.items[idx], { name, number });
    if (date !== updated.testDate) {
      state.submittedIds.delete(item.id); saveSubmitted();
      delete state.postponed[item.id]; savePostponed();
      state.originalDates[item.id] = date; saveOriginalDates();
      updated.testDate = date; updated.isSubmitted = false; updated.postponedUntil = 0;
    }
    state.items[idx] = updated;
    mutate(saveItems);
  }

  function confirmDelete(item) {
    confirmDialog(t('delete_title'), t('delete_message', item.name), t('delete'),
      () => mutate(async () => {
        state.items = state.items.filter(i => i.id !== item.id);
        state.submittedIds.delete(item.id);
        delete state.postponed[item.id];
        await Promise.all([saveItems(), saveSubmitted(), savePostponed()]);
      }), true);
  }

  function markSubmitted(id) {
    mutate(async () => {
      state.submittedIds.add(id);
      delete state.postponed[id];
      await Promise.all([saveSubmitted(), savePostponed()]);
    });
  }

  function postpone(id) {
    mutate(async () => {
      state.postponed[id] = SizCore.tomorrowTimestamp();
      await savePostponed();
      toast(t('postponed_toast'));
    });
  }

  // ===================== АЛЕРТЫ / ЭКРАН ОПОВЕЩЕНИЯ =====================
  function computeAlerts(force) {
    return SizCore.computeAlerts(state.items, {
      submittedIds: state.submittedIds,
      postponedItems: state.postponed,
      warningDays: state.warningDays,
      force
    });
  }

  function checkNow() {
    const alerts = computeAlerts(true);
    if (!alerts.length) {
      infoDialog(t('no_alerts_title'), esc(t('no_alerts_message')));
    } else {
      showAlertScreen(alerts);
    }
  }

  function showAlertScreen(alerts) {
    state.alerts = alerts;
    state.alertIndex = 0;
    $('alertScreen').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderAlertItem();
    startAlarm();
  }

  function hideAlertScreen() {
    $('alertScreen').classList.add('hidden');
    document.body.style.overflow = '';
    stopAlarm();
  }

  function renderAlertItem() {
    if (state.alertIndex >= state.alerts.length) { hideAlertScreen(); renderAll(); syncPush(); return; }
    const a = state.alerts[state.alertIndex];
    const d = a.daysLeft;
    $('alertSubtitle').textContent = t(d < 0 ? 'alert_subtitle_overdue' : 'alert_subtitle_expiring');
    $('alertName').textContent = a.item.name;
    $('alertNumber').textContent = t('alert_siz_number', a.item.number || '—');
    let daysText;
    if (d === 0) daysText = t('alert_days_left', t('due_today'));
    else if (d === 1) daysText = t('alert_days_left', t('due_tomorrow'));
    else if (d < 0) daysText = Math.abs(d) === 1 ? t('overdue_yesterday') : t('overdue_days', Math.abs(d));
    else daysText = t('alert_days_left', t('due_days_left', d));
    $('alertDays').textContent = daysText;
    $('alertProgress').textContent = t('alert_object_count', state.alertIndex + 1, state.alerts.length);
    $('btnSubmitted').textContent = t('alert_btn_submitted');
    $('btnNotSubmitted').textContent = t('alert_btn_not_submitted');
    $('alertNote').textContent = t('alert_cannot_close');
  }

  function alertNext() { state.alertIndex++; renderAlertItem(); }

  // ===================== ЗВУК (WebAudio) =====================
  let audioCtx = null, alarmNodes = null;
  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // kind: 'default'|'siren'|'beep' -> {freq pattern} зацикленный сигнал ~durationMs
  function playAlarm(durationMs, kind) {
    stopAlarm();
    try {
      const ctx = getCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      kind = kind || state.ringtone || 'default';

      if (kind === 'siren') {
        osc.type = 'sawtooth'; osc.frequency.value = 800;
        lfo.type = 'sine'; lfo.frequency.value = 1.6; lfoGain.gain.value = 350;
      } else if (kind === 'beep') {
        osc.type = 'square'; osc.frequency.value = 1050;
        lfo.type = 'square'; lfo.frequency.value = 2.4; lfoGain.gain.value = 1049;
      } else { // default: двухтональный сигнал
        osc.type = 'triangle'; osc.frequency.value = 880;
        lfo.type = 'square'; lfo.frequency.value = 2.0; lfoGain.gain.value = 220;
      }
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      osc.connect(gain);
      osc.start(); lfo.start();
      const timer = setTimeout(stopAlarm, durationMs);
      alarmNodes = { osc, lfo, gain, timer };
    } catch (e) { /* звук недоступен до жеста пользователя */ }
  }

  function stopAlarm() {
    if (!alarmNodes) return;
    clearTimeout(alarmNodes.timer);
    try { alarmNodes.osc.stop(); alarmNodes.lfo.stop(); alarmNodes.gain.disconnect(); } catch (e) {}
    alarmNodes = null;
  }

  function startAlarm() {
    // Вибрация 4.5с (паттерн как в Android)
    try { navigator.vibrate && navigator.vibrate([0, 500, 200, 500, 200, 500, 200, 500, 200, 500, 200, 500]); } catch (e) {}
    if (state.soundOn) playAlarm(4500);
    setTimeout(() => { try { navigator.vibrate && navigator.vibrate(0); } catch (e) {} }, 4600);
  }

  // ===================== УВЕДОМЛЕНИЯ =====================
  function notifPermissionState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // granted|denied|default
  }

  async function ensureNotifPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try { return (await Notification.requestPermission()) === 'granted'; } catch (e) { return false; }
  }

  async function showSystemNotification(alerts) {
    if (!alerts.length) return false;
    if (!(await ensureNotifPermission())) return false;
    const { title, body, subtitle } = SizCore.buildNotification(alerts, state.lang);
    const opts = {
      body: body || subtitle,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'siz-alert',
      renotify: true,
      vibrate: [0, 500, 200, 500, 200, 500],
      requireInteraction: state.longNotification,
      data: { url: './' }
    };
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) { await reg.showNotification(title, opts); return true; }
    } catch (e) {}
    try { new Notification(title, opts); return true; } catch (e) { return false; }
  }

  // Periodic Background Sync — проверка при закрытом сайте (Chrome/Android, установленное PWA)
  async function registerPeriodicSync() {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ('periodicSync' in reg) {
        const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (st.state === 'granted') {
          await reg.periodicSync.register('siz-daily-check', { minInterval: 12 * 60 * 60 * 1000 });
        }
      }
    } catch (e) {}
  }

  // Синхронизация подписки с push-сервером (реестр на сервер НЕ отправляется —
  // только подписка, время проверки и метка nextDueTs)
  async function syncPush() {
    if (!PUSH_SERVER_URL || !PUSH_PUBLIC_KEY) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!('pushManager' in reg)) return;
      if (Notification.permission !== 'granted') return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY)
      });
      const j = sub.toJSON();
      await fetch(PUSH_SERVER_URL + '/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: j.endpoint,
          keys: j.keys,
          checkHour: state.checkHour,
          checkMinute: state.checkMinute,
          tzOffset: new Date().getTimezoneOffset(),
          lang: state.lang,
          appUrl: location.origin + location.pathname,
          nextDueTs: SizCore.nextDueTs(state.items, {
            submittedIds: state.submittedIds, postponedItems: state.postponed, warningDays: state.warningDays
          })
        })
      });
      // Обновить локальный флаг привязки Telegram
      fetchTgStatus(j.endpoint).then(async l => {
        if (l !== null && l !== state.tgLinked) {
          state.tgLinked = l;
          await SizDB.set('tg_linked', l);
        }
      }).catch(() => {});
    } catch (e) {}
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  // ===================== НАСТРОЙКИ =====================
  function daysWord(n) {
    // склонение для ru/be/uk, для остальных — нейтральная форма
    if (['ru', 'be', 'uk'].includes(state.lang)) {
      const m = n % 10, h = n % 100;
      if (m === 1 && h !== 11) return t('day_1', n);
      if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return t('day_24', n);
    }
    return t('day_5', n);
  }

  function showSettings() {
    openModal((m, close) => {
      const perm = notifPermissionState();
      const permText = t(perm === 'granted' ? 'notif_granted' : perm === 'denied' ? 'notif_denied' : perm === 'unsupported' ? 'notif_unsupported' : 'notif_default');
      const ringtoneName = state.ringtone === 'default' ? t('default_ringtone') : t(state.ringtone === 'siren' ? 'sound_siren' : 'sound_beep');
      const langName = (SIZ_I18N.LANGS.find(l => l[0] === state.lang) || [0, state.lang])[1];

      m.innerHTML = `<h2>${esc(t('settings_title'))}</h2>` +
        setRow('sTime', ICONS.alarm, t('check_time_title'), `${String(state.checkHour).padStart(2, '0')}:${String(state.checkMinute).padStart(2, '0')}`) + div() +
        setRow('sNotifType', ICONS.bell, t('notification_type_title'), t(state.longNotification ? 'notification_type_long' : 'notification_type_short')) + div() +
        setRow('sWarn', ICONS.settings, t('warning_days_title'), daysWord(state.warningDays)) + div() +
        setRow('sBackup', ICONS.cloud, t('backup_title'), state.backupOn ? t('backup_on') : t('backup_off')) + div() +
        setRow('sTg', ICONS.send, 'Telegram', state.tgLinked ? t('tg_status_on') : t('tg_status_off')) + div() +
        setRow('sRing', ICONS.music, t('ringtone_title'), ringtoneName) + div() +
        setRow('sLang', ICONS.lang, t('language_title'), langName) + div() +
        setRow('sPerm', ICONS.notif, t('notif_perm'), permText) + div() +
        setRow('sTest', ICONS.notif, t('test_notification'), '', 'green') +
        setRow('sClear', ICONS.delete, t('clear_all_data'), '', 'red') + div() +
        setRow('sPriv', ICONS.privacy, t('action_privacy_policy'), '') +
        `<button class="btn btn-blue" style="width:100%;margin-top:10px">${esc(t('close'))}</button>`;

      m.querySelector('[data-r=sTime]').addEventListener('click', () => { close(); showTimePicker(); });
      m.querySelector('[data-r=sNotifType]').addEventListener('click', () => {
        close();
        choiceDialog(t('notification_type_title'),
          [{ label: t('notification_type_short') }, { label: t('notification_type_long') }],
          state.longNotification ? 1 : 0,
          async i => { state.longNotification = i === 1; await SizDB.set('long_notification', state.longNotification); });
      });
      m.querySelector('[data-r=sWarn]').addEventListener('click', () => { close(); showWarningDays(); });
      m.querySelector('[data-r=sBackup]').addEventListener('click', () => { close(); showBackup(); });
      m.querySelector('[data-r=sTg]').addEventListener('click', () => { close(); showTelegram(); });
      m.querySelector('[data-r=sRing]').addEventListener('click', () => { close(); showRingtone(); });
      m.querySelector('[data-r=sLang]').addEventListener('click', () => { close(); showLanguage(); });
      m.querySelector('[data-r=sPerm]').addEventListener('click', async () => {
        close();
        if (notifPermissionState() === 'denied') {
          infoDialog(t('notif_perm'), esc(t('enable_notif_hint')));
          return;
        }
        const ok = await ensureNotifPermission();
        if (ok) { await registerPeriodicSync(); syncPush(); }
        showSettings();
      });
      m.querySelector('[data-r=sTest]').addEventListener('click', async () => {
        close();
        const ok = await showSystemNotification([
          { item: { id: 0, name: 'Тестовое СИЗ', number: '0' }, daysLeft: 5 }
        ]);
        playAlarm(2000);
        try { navigator.vibrate && navigator.vibrate([0, 300, 200, 300]); } catch (e) {}
        toast(ok ? t('test_done') : t('enable_notif_hint'));
      });
      m.querySelector('[data-r=sClear]').addEventListener('click', () => {
        close();
        confirmDialog(t('clear_data_title'), t('clear_data_message'), t('clear'), async () => {
          await SizDB.clearAll();
          await loadState();
          applyLang();
          toast(t('data_cleared'));
        }, true);
      });
      m.querySelector('[data-r=sPriv]').addEventListener('click', () => {
        openModal(mm => {
          mm.innerHTML = `<h2>${esc(t('privacy_policy_title'))}</h2>` +
            `<iframe src="privacy.html" style="width:100%;height:50vh;border:none"></iframe>` +
            `<button class="btn btn-blue" style="width:100%;margin-top:10px">${esc(t('close'))}</button>`;
          mm.querySelector('.btn').addEventListener('click', () => mm.parentElement.remove());
        });
      });
      m.querySelector('.btn-blue').addEventListener('click', close);
    });
  }

  function setRow(id, icon, title, value, cls) {
    return `<div class="set-row" data-r="${id}">` +
      `<svg class="set-icon ${cls === 'red' ? 'red' : cls === 'green' ? 'green' : ''}" viewBox="0 0 24 24"><path fill="currentColor" d="${icon}"/></svg>` +
      `<div class="set-text"><div class="set-title ${cls === 'red' ? 'red' : ''}">${esc(title)}</div>` +
      (value ? `<div class="set-value">${esc(value)}</div>` : '') + `</div>` +
      `<svg class="set-icon" viewBox="0 0 24 24" style="color:var(--text2)"><path fill="currentColor" d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></div>`;
  }
  const div = () => `<div class="set-divider"></div>`;

  function showTimePicker() {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(t('select_check_time'))}</h2>` +
        `<input type="time" id="fTime" class="field-input" style="font-size:24px;text-align:center" value="${String(state.checkHour).padStart(2, '0')}:${String(state.checkMinute).padStart(2, '0')}">` +
        `<div class="btn-row-modal"><button class="btn btn-outline" data-a="cancel">${esc(t('cancel'))}</button>` +
        `<button class="btn btn-blue" data-a="ok">${esc(t('save'))}</button></div>`;
      m.querySelector('[data-a=cancel]').addEventListener('click', close);
      m.querySelector('[data-a=ok]').addEventListener('click', async () => {
        const v = m.querySelector('#fTime').value;
        if (v) {
          const [h, mi] = v.split(':').map(Number);
          state.checkHour = h; state.checkMinute = mi;
          state.postponed = {};
          await Promise.all([SizDB.set('check_hour', h), SizDB.set('check_minute', mi), SizDB.set('last_check_date', ''), savePostponed()]);
          toast(t('check_scheduled', String(h).padStart(2, '0'), String(mi).padStart(2, '0')));
          syncPush();
        }
        close();
      });
    });
  }

  function showWarningDays() {
    const vals = [1, 2, 3, 5, 7, 10, 14, 30];
    choiceDialog(t('warning_days_title'),
      vals.map(v => ({ label: daysWord(v) })),
      Math.max(0, vals.indexOf(state.warningDays)),
      async i => {
        state.warningDays = vals[i];
        await SizDB.set('warning_days', vals[i]);
        toast(t('warn_set', vals[i]));
        renderAll(); syncPush();
      });
  }

  function showRingtone() {
    const opts = [
      { label: t('default_ringtone'), v: 'default' },
      { label: t('sound_siren'), v: 'siren' },
      { label: t('sound_beep'), v: 'beep' }
    ];
    choiceDialog(t('ringtone_title'), opts,
      Math.max(0, opts.findIndex(o => o.v === state.ringtone)),
      async i => {
        state.ringtone = opts[i].v;
        await SizDB.set('ringtone', state.ringtone);
        playAlarm(1800, state.ringtone);
      });
  }

  function showLanguage() {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(t('language_title'))}</h2>` +
        `<input class="field-input" id="langSearch" placeholder="${esc(t('search_language'))}" style="font-size:16px;padding:10px">` +
        `<div class="choice-list" style="max-height:50vh;overflow-y:auto"></div>` +
        `<button class="btn btn-outline" style="width:100%;margin-top:10px">${esc(t('cancel'))}</button>`;
      const list = m.querySelector('.choice-list');
      const sorted = SIZ_I18N.LANGS.slice().sort((a, b) => a[1].localeCompare(b[1]));
      const build = q => {
        list.innerHTML = '';
        for (const [code, name, flag] of sorted) {
          if (q && !name.toLowerCase().includes(q)) continue;
          const c = document.createElement('div');
          c.className = 'choice-item' + (code === state.lang ? ' sel' : '');
          c.innerHTML = `<span class="radio"></span><span class="flag">${flag}</span><span>${esc(name)}</span>`;
          c.addEventListener('click', async () => {
            state.lang = code;
            await SizDB.set('language', code);
            close(); applyLang();
          });
          list.appendChild(c);
        }
      };
      build('');
      m.querySelector('#langSearch').addEventListener('input', e => build(e.target.value.trim().toLowerCase()));
      m.querySelector('.btn').addEventListener('click', close);
    });
  }

  function showHelp() {
    openModal((m, close) => {
      let html = String(t('help_message'))
        .replace(/<big>/g, '<span class="h">').replace(/<\/big>/g, '</span>')
        .replace(/<font\s+color="([^"]+)">/g, '<span style="color:$1">').replace(/<\/font>/g, '</span>')
        .replace(/\s*\n\s*/g, '<br>');
      m.innerHTML = `<h2>${esc(t('help_title'))}</h2><div class="help-body">${html}</div>` +
        `<button class="btn btn-blue" style="width:100%;margin-top:12px">OK</button>`;
      m.querySelector('.btn').addEventListener('click', close);
    });
  }

  // ===================== ЭКСПОРТ / ИМПОРТ =====================
  function buildExportData() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
      appInfo: { name: t('app_name'), version: '2.0-web' },
      settings: {
        warningDays: state.warningDays,
        checkHour: state.checkHour,
        checkMinute: state.checkMinute,
        ringtoneUri: state.ringtone,
        submittedIds: [...state.submittedIds],
        postponedItems: state.postponed,
        originalDates: state.originalDates
      },
      items: state.items.map(i => ({
        id: i.id, name: i.name, number: i.number,
        testDate: i.testDate, isSubmitted: !!i.isSubmitted, postponedUntil: i.postponedUntil || 0
      }))
    };
  }

  function exportData() {
    const data = buildExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${t('app_name')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(t('export_success', a.download));
  }

  function parseLegacyTxt(text) {
    const items = [];
    let validHeader = false;
    const settings = {};
    const submitted = new Set(), postponed = {}, origDates = {};
    const unesc = s => s.replace(/\\n/g, '\n').replace(/\\\|/g, '|');
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith('#')) {
        if (/SIZ Tracker Database Export|Format: ID\|Name\|Number\|TestDate/.test(line)) validHeader = true;
        else if (line.includes('WARNING_DAYS=')) settings.warningDays = parseInt(line.split('=')[1]) || undefined;
        else if (line.includes('CHECK_TIME=')) {
          const p = line.split('=')[1].trim().split(':');
          settings.checkHour = parseInt(p[0]); settings.checkMinute = parseInt(p[1]);
        }
        else if (line.includes('SUBMITTED_IDS=')) line.split('=')[1].trim().split(',').forEach(x => { const v = parseFloat(x); if (!isNaN(v)) submitted.add(v); });
        else if (line.includes('POSTPONED_ITEMS=')) line.split('=')[1].trim().split(',').forEach(x => { const p = x.split('='); const id = parseFloat(p[0]), ts = parseFloat(p[1]); if (!isNaN(id) && !isNaN(ts)) postponed[id] = ts; });
        else if (line.includes('ORIGINAL_DATES=')) line.split('=')[1].trim().split(',').forEach(x => { const i = x.indexOf('='); if (i > 0) origDates[x.slice(0, i)] = unesc(x.slice(i + 1)); });
        continue;
      }
      if (!line.trim()) continue;
      const p = line.split('|');
      if (p.length >= 4) {
        const id = parseFloat(p[0]) || Date.now();
        const testDate = p[3];
        if (!SizCore.isValidDate(testDate)) continue;
        items.push({
          id, name: unesc(p[1]), number: unesc(p[2]), testDate,
          isSubmitted: p[4] === 'true', postponedUntil: parseFloat(p[5]) || 0
        });
      }
    }
    if (!items.length && !validHeader) return null;
    return { items, settings: { ...settings, submittedIds: [...submitted], postponedItems: postponed, originalDates: origDates } };
  }

  function parseImport(text) {
    try {
      const j = JSON.parse(text);
      if (j && Array.isArray(j.items)) {
        return {
          items: j.items.map(i => ({
            id: Number(i.id) || Date.now(), name: String(i.name || ''), number: String(i.number || ''),
            testDate: String(i.testDate || ''), isSubmitted: !!i.isSubmitted, postponedUntil: Number(i.postponedUntil) || 0
          })),
          settings: j.settings ? {
            warningDays: j.settings.warningDays,
            checkHour: j.settings.checkHour,
            checkMinute: j.settings.checkMinute,
            ringtone: j.settings.ringtoneUri,
            submittedIds: j.settings.submittedIds || [],
            postponedItems: j.settings.postponedItems || {},
            originalDates: j.settings.originalDates || {}
          } : null
        };
      }
    } catch (e) {}
    return parseLegacyTxt(text);
  }

  // Применить распарсенные данные (импорт файла и восстановление из облака)
  async function applyData(data) {
    state.items = data.items;
    await saveItems();
    const s = data.settings;
    if (s) {
      if (s.warningDays != null && !isNaN(s.warningDays)) { state.warningDays = s.warningDays; await SizDB.set('warning_days', s.warningDays); }
      if (s.checkHour != null && s.checkMinute != null && !isNaN(s.checkHour)) {
        state.checkHour = s.checkHour; state.checkMinute = s.checkMinute;
        await Promise.all([SizDB.set('check_hour', s.checkHour), SizDB.set('check_minute', s.checkMinute)]);
      }
      if (s.ringtone && ['default', 'siren', 'beep'].includes(s.ringtone)) { state.ringtone = s.ringtone; await SizDB.set('ringtone', s.ringtone); }
      if (s.submittedIds) { state.submittedIds = new Set(s.submittedIds.map(Number)); await saveSubmitted(); }
      if (s.postponedItems) { state.postponed = s.postponedItems; await savePostponed(); }
      if (s.originalDates) { state.originalDates = s.originalDates; await saveOriginalDates(); }
    }
    renderAll(); syncPush();
  }

  async function doImport(file) {
    const text = await file.text();
    const data = parseImport(text);
    if (!data || !data.items.length) {
      toast(t('import_invalid_format'));
      return;
    }
    const total = data.items.length;
    confirmDialog(t('import_confirm_title'), t('import_confirm_message', total), t('import_btn'), async () => {
      await applyData(data);
      toast(t('import_success', total));
    });
  }

  // ===================== ОБЛАЧНАЯ КОПИЯ =====================
  let backupTimer = null;
  function scheduleBackupUpload() {
    if (!state.backupOn || !PUSH_SERVER_URL) return;
    clearTimeout(backupTimer);
    backupTimer = setTimeout(() => { backupTimer = null; uploadBackup(true); }, 10000);
  }
  async function uploadBackup(keepalive) {
    try {
      await SizBackup.upload(PUSH_SERVER_URL, state.backupCode, JSON.stringify(buildExportData()), keepalive);
    } catch (e) {}
  }

  function showBackup() {
    openModal((m, close) => {
      const rows = state.backupOn
        ? `<button class="btn btn-outline" style="width:100%;margin-top:8px" data-a="code">${esc(t('backup_show_code'))}</button>` +
          `<button class="btn btn-outline" style="width:100%;margin-top:8px" data-a="restore">${esc(t('backup_restore'))}</button>` +
          `<button class="btn btn-red" style="width:100%;margin-top:8px" data-a="off">${esc(t('backup_disable'))}</button>`
        : `<button class="btn btn-blue" style="width:100%;margin-top:8px" data-a="on">${esc(t('backup_enable'))}</button>` +
          `<button class="btn btn-outline" style="width:100%;margin-top:8px" data-a="custom">${esc(t('backup_custom'))}</button>` +
          `<button class="btn btn-outline" style="width:100%;margin-top:8px" data-a="restore">${esc(t('backup_restore_code'))}</button>`;
      m.innerHTML = `<h2>${esc(t('backup_title'))}</h2><div class="msg">${esc(t('backup_desc'))}</div>` + rows +
        `<button class="btn btn-outline" style="width:100%;margin-top:8px" data-a="close">${esc(t('close'))}</button>`;
      const on = (a, fn) => {
        const b = m.querySelector(`[data-a=${a}]`);
        if (b) b.addEventListener('click', () => { close(); fn(); });
      };
      on('on', () => enableBackup());
      on('custom', showCustomCodePrompt);
      on('off', () => confirmDialog(t('backup_title'), t('backup_confirm_disable'), t('backup_disable'), disableBackup, true));
      on('restore', () => state.backupOn ? restoreFromCloud(state.backupCode) : showRestorePrompt());
      on('code', () => showCodeDialog(state.backupCode));
      on('close', () => {});
    });
  }

  function showCodeDialog(code) {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(t('backup_code_title'))}</h2>` +
        `<div class="msg">${esc(t('backup_code_msg'))}</div>` +
        `<div class="backup-code">${esc(code)}</div>` +
        `<button class="btn btn-outline" style="width:100%;margin-top:8px" data-a="copy">${esc(t('backup_copy'))}</button>` +
        `<button class="btn btn-blue" style="width:100%;margin-top:8px" data-a="ok">OK</button>`;
      m.querySelector('[data-a=copy]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(code); toast(t('copied')); } catch (e) {}
      });
      m.querySelector('[data-a=ok]').addEventListener('click', close);
    });
  }

  async function enableBackup(code) {
    if (!PUSH_SERVER_URL) { toast(t('backup_failed')); return; }
    const c = code || SizBackup.genCode();
    state.backupCode = c;
    state.backupOn = true;
    await Promise.all([SizDB.set('backup_code', c), SizDB.set('backup_enabled', true)]);
    showCodeDialog(c);
    try {
      const ok = await SizBackup.upload(PUSH_SERVER_URL, code, JSON.stringify(buildExportData()));
      toast(ok ? t('backup_uploaded') : t('backup_failed'));
    } catch (e) { toast(t('backup_failed')); }
  }

  async function disableBackup() {
    const code = state.backupCode;
    state.backupOn = false;
    state.backupCode = '';
    await Promise.all([SizDB.set('backup_enabled', false), SizDB.set('backup_code', '')]);
    if (code && PUSH_SERVER_URL) SizBackup.remove(PUSH_SERVER_URL, code);
    toast(t('backup_disabled'));
  }

  function showCustomCodePrompt() {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(t('backup_custom'))}</h2>` +
        `<div class="msg">${esc(t('backup_enter_new'))}</div>` +
        `<input id="fCode" class="field-input" style="text-transform:uppercase">` +
        `<div class="btn-row-modal"><button class="btn btn-outline" data-a="cancel">${esc(t('cancel'))}</button>` +
        `<button class="btn btn-blue" data-a="ok">${esc(t('backup_enable'))}</button></div>`;
      m.querySelector('[data-a=cancel]').addEventListener('click', close);
      m.querySelector('[data-a=ok]').addEventListener('click', () => {
        const norm = SizBackup.normalize(m.querySelector('#fCode').value);
        if (norm.length < 8) { toast(t('backup_too_short')); return; }
        close();
        enableBackup(SizBackup.group(norm));
      });
      setTimeout(() => m.querySelector('#fCode').focus(), 50);
    });
  }

  function showRestorePrompt() {
    openModal((m, close) => {
      m.innerHTML = `<h2>${esc(t('backup_restore_code'))}</h2>` +
        `<input id="fCode" class="field-input" style="text-transform:uppercase" placeholder="${esc(t('backup_enter_code'))}">` +
        `<div class="btn-row-modal"><button class="btn btn-outline" data-a="cancel">${esc(t('cancel'))}</button>` +
        `<button class="btn btn-blue" data-a="ok">${esc(t('backup_restore'))}</button></div>`;
      m.querySelector('[data-a=cancel]').addEventListener('click', close);
      m.querySelector('[data-a=ok]').addEventListener('click', () => {
        const code = m.querySelector('#fCode').value;
        close();
        restoreFromCloud(code);
      });
      setTimeout(() => m.querySelector('#fCode').focus(), 50);
    });
  }

  async function restoreFromCloud(code) {
    if (!PUSH_SERVER_URL) { toast(t('backup_failed')); return; }
    const norm = SizBackup.normalize(code);
    if (!SizBackup.isValidCode(norm)) { toast(t('backup_invalid_code')); return; }
    toast(t('backup_restoring'));
    let data = null;
    try {
      const text = await SizBackup.download(PUSH_SERVER_URL, norm);
      data = text ? parseImport(text) : null;
    } catch (e) { data = null; }
    if (!data || !data.items.length) { toast(t('backup_not_found')); return; }
    const apply = async () => {
      await applyData(data);
      if (state.backupCode !== norm) {
        state.backupCode = norm;
        await SizDB.set('backup_code', norm);
      }
      if (!state.backupOn) {
        state.backupOn = true;
        await SizDB.set('backup_enabled', true);
      }
      toast(t('import_success', data.items.length));
    };
    if (state.items.length) {
      confirmDialog(t('import_confirm_title'), t('import_confirm_message', data.items.length), t('import_btn'), apply);
    } else {
      await apply();
    }
  }

  // ===================== TELEGRAM =====================
  async function getPushEndpoint() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return sub ? sub.endpoint : null;
    } catch (e) { return null; }
  }

  async function fetchTgStatus(endpoint) {
    const r = await fetch(PUSH_SERVER_URL + '/tgstatus?endpoint=' + encodeURIComponent(endpoint));
    if (!r.ok) return null;
    const j = await r.json();
    return !!(j && j.linked);
  }

  function showTelegram() {
    openModal(async (m, close) => {
      const body = `<div class="msg">${esc(t('tg_checking'))}</div>`;
      m.innerHTML = `<h2>Telegram</h2><div class="msg">${esc(t('tg_desc'))}</div><div id="tgBox">${body}</div>` +
        `<button class="btn btn-outline" style="width:100%;margin-top:8px" data-a="close">${esc(t('close'))}</button>`;
      m.querySelector('[data-a=close]').addEventListener('click', () => { clearInterval(pollTimer); close(); });

      const box = m.querySelector('#tgBox');
      const endpoint = await getPushEndpoint();
      let linked = false;
      if (endpoint && PUSH_SERVER_URL) {
        try { linked = (await fetchTgStatus(endpoint)) === true; } catch (e) {}
      }
      state.tgLinked = linked;
      SizDB.set('tg_linked', linked);

      if (linked) {
        box.innerHTML = `<button class="btn btn-red" style="width:100%;margin-top:8px" data-a="un">${esc(t('tg_disconnect'))}</button>`;
        box.querySelector('[data-a=un]').addEventListener('click', async () => {
          try { await fetch(PUSH_SERVER_URL + '/untg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) }); } catch (e) {}
          state.tgLinked = false;
          await SizDB.set('tg_linked', false);
          clearInterval(pollTimer);
          close();
          toast(t('tg_disconnected'));
        });
        return;
      }

      const needsPerm = notifPermissionState() !== 'granted';
      box.innerHTML =
        (needsPerm ? `<div class="msg">${esc(t('tg_need_notif'))}</div>` : '') +
        `<button class="btn btn-blue" style="width:100%;margin-top:8px" data-a="go">${esc(t(needsPerm ? 'notif_perm' : 'tg_connect'))}</button>`;
      box.querySelector('[data-a=go]').addEventListener('click', async () => {
        if (needsPerm) {
          const ok = await ensureNotifPermission();
          if (ok) { await registerPeriodicSync(); await syncPush(); }
          close();
          if (ok) showTelegram();
          else toast(t('tg_need_notif'));
          return;
        }
        const ep = await getPushEndpoint() || (await syncPush(), await getPushEndpoint());
        if (!ep) { toast(t('tg_failed')); return; }
        const code = SizBackup.genCode().replace(/-/g, '').slice(0, 12);
        const pairHash = await SizBackup.sha256('siz-tg:' + code);
        try {
          const r = await fetch(PUSH_SERVER_URL + '/tgpair', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: ep, pairHash })
          });
          if (!r.ok) throw new Error();
        } catch (e) { toast(t('tg_failed')); return; }
        const link = `https://t.me/${TG_BOT}?start=${code}`;
        box.innerHTML = `<div class="msg">${esc(t('tg_link_msg'))}</div>` +
          `<div class="backup-code">${esc(SizBackup.group(code))}</div>` +
          `<a href="${esc(link)}" target="_blank" rel="noopener" class="btn btn-blue" style="width:100%;margin-top:8px;display:block;text-align:center;text-decoration:none;line-height:44px">${esc(t('tg_open_bot'))}</a>` +
          `<div class="msg" style="margin-top:8px">${esc(t('tg_checking'))}</div>`;
        clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
          try {
            if (await fetchTgStatus(ep)) {
              clearInterval(pollTimer);
              state.tgLinked = true;
              await SizDB.set('tg_linked', true);
              close();
              toast(t('tg_connected'));
            }
          } catch (e) {}
        }, 4000);
      });
    });
  }
  let pollTimer = null;

  // ===================== ВЫХОД =====================
  function exitApp() {
    window.close();
    infoDialog(t('action_exit'), esc(t('exit_note')));
  }

  // ===================== ТОСТ =====================
  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  // ===================== PWA =====================
  function registerSW() {
    if ('serviceWorker' in navigator) {
      // Новая версия SW установилась и взяла управление -> один раз перезагружаем,
      // чтобы страница сразу получила свежие файлы
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
      navigator.serviceWorker.register('sw.js').then(() => registerPeriodicSync()).catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
    });
    if (/(iphone|ipad|ipod)/i.test(navigator.userAgent) && !window.navigator.standalone) {
      setTimeout(() => infoDialog('SIZ Tracker', esc(t('ios_hint'))), 1500);
    }
  }

  // ===================== РАСПИСАНИЕ В ОТКРЫТОМ ПРИЛОЖЕНИИ =====================
  let schedTimer = null;
  function scheduleInAppCheck() {
    clearTimeout(schedTimer);
    const now = new Date();
    const next = new Date();
    next.setHours(state.checkHour, state.checkMinute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    schedTimer = setTimeout(() => {
      const alerts = computeAlerts(false);
      if (alerts.length) {
        if (state.longNotification) showAlertScreen(alerts);
        else showSystemNotification(alerts);
      }
      SizDB.set('last_check_date', SizCore.todayString());
      scheduleInAppCheck();
    }, next - now);
  }

  // ===================== ПРИВЯЗКА СОБЫТИЙ =====================
  function bind() {
    $('btnAdd').addEventListener('click', () => showEditDialog(null));
    $('btnExit').addEventListener('click', exitApp);
    $('btnCheck').addEventListener('click', () => { if (!$('btnCheck').__lpFired) checkNow(); });
    attachLongPress($('btnCheck'), showTimePicker);

    $('btnMenu').addEventListener('click', e => { e.stopPropagation(); $('menuPopup').classList.contains('hidden') ? showMainMenu() : closePopups(); });
    $('btnSearch').addEventListener('click', () => {
      const w = $('searchWrap');
      w.classList.toggle('hidden');
      if (w.classList.contains('hidden')) { $('searchInput').value = ''; state.filter = ''; renderAll(); }
      else $('searchInput').focus();
    });
    $('searchInput').addEventListener('input', e => { state.filter = e.target.value; renderAll(); });

    document.addEventListener('click', closePopups);
    document.addEventListener('touchstart', e => {
      if (!e.target.closest('.popup')) closePopups();
    }, { passive: true });

    $('btnSubmitted').addEventListener('click', () => {
      const a = state.alerts[state.alertIndex];
      state.submittedIds.add(a.item.id);
      delete state.postponed[a.item.id];
      Promise.all([saveSubmitted(), savePostponed()]).then(alertNext);
    });
    $('btnNotSubmitted').addEventListener('click', () => {
      const a = state.alerts[state.alertIndex];
      state.postponed[a.item.id] = SizCore.tomorrowTimestamp();
      savePostponed().then(alertNext);
    });
    $('alertSoundBtn').addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      $('alertSoundBtn').style.opacity = state.soundOn ? '1' : '.4';
      if (state.soundOn) playAlarm(4500); else stopAlarm();
    });

    $('importFile').addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) doImport(f);
      e.target.value = '';
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderAll();
    });

    // Дослать отложенную выгрузку бэкапа при закрытии страницы
    window.addEventListener('pagehide', () => {
      if (backupTimer) { clearTimeout(backupTimer); backupTimer = null; uploadBackup(true); }
    });
  }

  // ===================== СТАРТ =====================
  async function init() {
    await loadState();
    // Просим persistent-хранилище, чтобы браузер не выгружал данные при нехватке места
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    // Авто-восстановление: база пуста, но облачная копия включена -> тянем дамп
    if (!state.items.length && state.backupOn && PUSH_SERVER_URL) {
      try {
        const text = await SizBackup.download(PUSH_SERVER_URL, state.backupCode);
        const d = text ? parseImport(text) : null;
        if (d && d.items.length) await applyData(d);
      } catch (e) {}
    }
    applyLang();
    bind();
    registerSW();
    scheduleInAppCheck();
    // Автопроверка при запуске (как checkInitialAlerts в Android)
    const alerts = computeAlerts(true);
    if (alerts.length) showAlertScreen(alerts);
    syncPush();
  }

  init();
})();

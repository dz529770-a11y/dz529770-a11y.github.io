---
title: "SonarRelay"
slug: sonarrelay
order: 4
platform: "Приложение для Android"
tagline: "Просмотр экрана и управление совместимым эхолотом Lowrance по Wi‑Fi."
description: "RTSP-трансляция экрана эхолота, кнопки управления, сенсорное управление, сведения об устройстве и снимки экрана."
icon: /assets/images/apps/sonarrelay/logo.png
image: /assets/images/apps/sonarrelay/screenshot-01.png
min_android: "Android 7.0+"
version: "1.0"
status_label: "Доступно в RuStore"
theme_color: "#1479d1"
rustore_url: "https://www.rustore.ru/catalog/app/com.zalen1978.sonarrelay"
stats:
  - value: "RTSP"
    label: "трансляция экрана"
  - value: "Wi‑Fi"
    label: "связь с эхолотом"
  - value: "5"
    label: "кнопок управления"
  - value: "TCP"
    label: "команды и ping"
support_summary: "Трансляция экрана и управление эхолотом"
---

## Экран эхолота — рядом

SonarRelay подключается к совместимому MDF-эхолоту по Wi‑Fi и показывает его экран на Android-устройстве. RTSP-поток передаётся через локальную сеть, а команды управления отправляются по TCP.

<div class="feature-grid">
  <section><span class="feature-icon material-symbols-rounded" aria-hidden="true">videocam</span><h3>Просмотр видео</h3><p>Смотрите RTSP-поток экрана эхолота в полноэкранном режиме.</p></section>
  <section><span class="feature-icon material-symbols-rounded" aria-hidden="true">gamepad</span><h3>Кнопки и сенсор</h3><p>Используйте PAGE, ZOOM+, ZOOM-, WayP и Power, а также имитацию мыши касанием.</p></section>
  <section><span class="feature-icon material-symbols-rounded" aria-hidden="true">wifi</span><h3>Локальное подключение</h3><p>Укажите IP-адрес эхолота в настройках и проверьте связь встроенным ping.</p></section>
  <section><span class="feature-icon material-symbols-rounded" aria-hidden="true">photo_camera</span><h3>Снимки экрана</h3><p>Сохраняйте важные кадры видеопотока прямо на устройстве.</p></section>
</div>

<div class="showcase-grid">
  <figure class="showcase"><img src="{{ '/assets/images/apps/sonarrelay/screenshot-01.png' | relative_url }}" alt="Экран трансляции эхолота SonarRelay" width="941" height="1672" loading="lazy"></figure>
  <figure class="showcase"><img src="{{ '/assets/images/apps/sonarrelay/screenshot-02.png' | relative_url }}" alt="Управление эхолотом в SonarRelay" width="941" height="1672" loading="lazy"></figure>
  <figure class="showcase"><img src="{{ '/assets/images/apps/sonarrelay/screenshot-03.png' | relative_url }}" alt="Настройки сетевого подключения SonarRelay" width="941" height="1672" loading="lazy"></figure>
</div>

Для работы нужен совместимый эхолот с поддержкой screen mirroring и подключение к одной Wi‑Fi-сети. Приложение распространяется «как есть» и не заменяет штатные средства навигации и безопасности.

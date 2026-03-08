/* ═══════════════════════════════════════════════════════
   স্মার্ট মিরর — Frontend Application
   WebSocket client, DOM renderer, reconnect logic
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Bangla Helpers ───────────────────────────────────

  var BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  var BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  var BANGLA_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  function toBangla(val) {
    return String(val).replace(/[0-9]/g, function (d) {
      return BANGLA_DIGITS[Number(d)];
    });
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatBanglaTime(dateStr) {
    var d = new Date(dateStr);
    return toBangla(pad2(d.getHours())) + ':' + toBangla(pad2(d.getMinutes()));
  }

  // ── DOM References ───────────────────────────────────

  var $ = function (id) { return document.getElementById(id); };

  var $splash = $('splash');
  var $mirror = $('mirror');
  var $disconnected = $('disconnected-banner');
  var $clock = $('clock');
  var $date = $('date');
  var $locationText = $('location-text');
  var $weatherSection = $('weather-section');
  var $weatherLabel = $('weather-label');
  var $weatherTemp = $('weather-temp');
  var $weatherCondition = $('weather-condition');
  var $weatherFeels = $('weather-feels');
  var $weatherHumidity = $('weather-humidity');
  var $weatherWind = $('weather-wind');
  var $weatherPrecip = $('weather-precip');
  var $weatherStale = $('weather-stale');
  var $calendarSection = $('calendar-section');
  var $calendarLabel = $('calendar-label');
  var $calendarEvents = $('calendar-events');
  var $calendarEmpty = $('calendar-empty');
  var $calendarStale = $('calendar-stale');
  var $briefingSection = $('briefing-section');
  var $briefingText = $('briefing-text');
  var $briefingStale = $('briefing-stale');
  var $feedStatus = $('feed-status');
  var $tickerSource = $('ticker-source');
  var $tickerHeadline = $('ticker-headline');
  var $newsStale = $('news-stale');
  var $demoSwitcher = $('demo-switcher');

  // ── State ────────────────────────────────────────────

  var currentState = null;
  var splashDismissed = false;
  var currentHeadlineIndex = 0;
  var tickerInterval = null;
  var ws = null;
  var reconnectDelay = 1000;
  var reconnectTimeout = null;
  var disconnectTimer = null;
  var isDisconnected = false;
  var isDemo = false;

  // ── Clock ────────────────────────────────────────────

  function updateClock() {
    var now = new Date();
    var h = pad2(now.getHours());
    var m = pad2(now.getMinutes());
    var s = pad2(now.getSeconds());
    $clock.textContent = toBangla(h) + ':' + toBangla(m) + ':' + toBangla(s);
  }

  function updateDate() {
    var now = new Date();
    var dayName = BANGLA_DAYS[now.getDay()];
    var day = toBangla(pad2(now.getDate()));
    var month = BANGLA_MONTHS[now.getMonth()];
    var year = toBangla(now.getFullYear());
    $date.textContent = dayName + ', ' + day + ' ' + month + ' ' + year;
  }

  setInterval(updateClock, 1000);
  updateClock();
  updateDate();
  setInterval(updateDate, 60000);

  // ── WebSocket ────────────────────────────────────────

  function connect() {
    // Don't connect in demo mode
    if (isDemo) return;

    try {
      var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + window.location.host);
    } catch (e) {
      activateDemo();
      return;
    }

    ws.onopen = function () {
      reconnectDelay = 1000;
      clearDisconnected();
    };

    ws.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'state_update' && msg.data) {
          handleStateUpdate(msg.data);
        }
      } catch (e) {
        // Ignore malformed messages
      }
    };

    ws.onclose = function () {
      if (!isDemo) {
        scheduleReconnect();
        startDisconnectTimer();
      }
    };

    ws.onerror = function () {
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
      // If we can't connect at all, go demo
      if (!splashDismissed && !isDemo) {
        activateDemo();
      }
    };
  }

  function scheduleReconnect() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(function () {
      connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  }

  function startDisconnectTimer() {
    if (disconnectTimer) return;
    disconnectTimer = setTimeout(function () {
      showDisconnected();
    }, 10000);
  }

  function showDisconnected() {
    isDisconnected = true;
    $disconnected.classList.remove('hidden');
  }

  function clearDisconnected() {
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
    if (isDisconnected) {
      isDisconnected = false;
      $disconnected.classList.add('hidden');
    }
  }

  // ── State Handler ────────────────────────────────────

  function handleStateUpdate(state) {
    currentState = state;

    if (!splashDismissed && state.startupComplete) {
      dismissSplash();
    }

    applyMode(state.mode);
    renderLocation(state.location);
    renderWeather(state);
    renderCalendar(state);
    renderBriefing(state);
    renderNews(state);
    renderFeedStatus(state);
  }

  function dismissSplash() {
    splashDismissed = true;
    $splash.classList.add('fade-out');
    $mirror.classList.remove('hidden');
    setTimeout(function () {
      $splash.style.display = 'none';
    }, 900);
  }

  // ── Mode ─────────────────────────────────────────────

  var currentMode = null;

  function applyMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    document.body.className = 'mode-' + mode;

    // Update demo switcher active state
    if (isDemo) {
      var buttons = $demoSwitcher.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle('active', buttons[i].dataset.mode === mode);
      }
    }
  }

  // ── Location ─────────────────────────────────────────

  function renderLocation(loc) {
    if (!loc || !loc.city) {
      $locationText.textContent = '';
      return;
    }
    $locationText.textContent = loc.city;
  }

  // ── Weather ──────────────────────────────────────────

  function renderWeather(state) {
    var mode = state.mode;
    var weather = state.weather;

    if (mode === 'night' || !weather) {
      $weatherSection.classList.add('hidden-section');
      return;
    }
    $weatherSection.classList.remove('hidden-section');

    if (mode === 'evening' && weather.tomorrow) {
      $weatherLabel.textContent = 'আগামীকালের আবহাওয়া';
      $weatherTemp.textContent = toBangla(weather.tomorrow.tempMax) + '°/' + toBangla(weather.tomorrow.tempMin) + '°';
      $weatherCondition.textContent = weather.tomorrow.condition || '—';
      $weatherFeels.textContent = '—';
      $weatherHumidity.textContent = '—';
      $weatherWind.textContent = '—';
      $weatherPrecip.textContent = toBangla(weather.tomorrow.precipitationChance) + '%';
    } else if (weather.current) {
      $weatherLabel.textContent = 'আবহাওয়া';
      $weatherTemp.textContent = toBangla(weather.current.temperature) + '°';
      $weatherCondition.textContent = weather.current.condition || '—';
      $weatherFeels.textContent = toBangla(weather.current.feelsLike) + '°সে';
      $weatherHumidity.textContent = toBangla(weather.current.humidity) + '%';
      $weatherWind.textContent = toBangla(weather.current.windSpeed) + ' কিমি/ঘ';
      $weatherPrecip.textContent = toBangla(weather.current.precipitationChance) + '%';
    }

    renderStaleIndicator($weatherStale, weather);
  }

  // ── Calendar ─────────────────────────────────────────

  function renderCalendar(state) {
    var mode = state.mode;
    var calendar = state.calendar;

    if (mode === 'night' || !calendar) {
      $calendarSection.classList.add('hidden-section');
      return;
    }
    $calendarSection.classList.remove('hidden-section');

    $calendarLabel.textContent = mode === 'evening' ? 'আগামীকালের সূচি' : 'আজকের সূচি';

    var events = calendar.events || [];

    if (events.length === 0) {
      $calendarEvents.innerHTML = '';
      $calendarEmpty.style.display = 'flex';
    } else {
      $calendarEmpty.style.display = 'none';
      var html = '';
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        html += '<li class="event-item">' +
          '<span class="event-time">' + formatBanglaTime(ev.startTime) + '</span>' +
          '<span class="event-title">' + escapeHtml(ev.title) + '</span>' +
          '</li>';
      }
      $calendarEvents.innerHTML = html;
    }

    renderStaleIndicator($calendarStale, calendar);
  }

  // ── Briefing ─────────────────────────────────────────

  function renderBriefing(state) {
    var mode = state.mode;
    var briefing = state.briefing;

    if ((mode !== 'morning' && mode !== 'evening') || !briefing || !briefing.text) {
      $briefingSection.classList.add('hidden');
      return;
    }

    $briefingSection.classList.remove('hidden');
    $briefingText.textContent = briefing.text;
    renderStaleIndicator($briefingStale, briefing);
  }

  // ── News Ticker ──────────────────────────────────────

  function renderNews(state) {
    var news = state.news;
    if (!news || !news.headlines || news.headlines.length === 0) {
      $tickerSource.textContent = '';
      $tickerHeadline.textContent = 'সংবাদ পাওয়া যাচ্ছে না';
      return;
    }

    if (tickerInterval && currentState) {
      renderStaleIndicator($newsStale, news);
      return;
    }

    startTicker(news.headlines);
    renderStaleIndicator($newsStale, news);
  }

  function startTicker(headlines) {
    if (tickerInterval) clearInterval(tickerInterval);
    currentHeadlineIndex = 0;
    showHeadline(headlines, currentHeadlineIndex);

    tickerInterval = setInterval(function () {
      $tickerHeadline.classList.add('fade-out');
      $tickerSource.classList.add('fade-out');

      setTimeout(function () {
        currentHeadlineIndex = (currentHeadlineIndex + 1) % headlines.length;

        if (currentState && currentState.news && currentState.news.headlines) {
          var h = currentState.news.headlines;
          if (currentHeadlineIndex >= h.length) currentHeadlineIndex = 0;
          showHeadline(h, currentHeadlineIndex);
        }

        $tickerHeadline.classList.remove('fade-out');
        $tickerSource.classList.remove('fade-out');
      }, 500);
    }, 10000);
  }

  function showHeadline(headlines, index) {
    var item = headlines[index];
    if (!item) return;
    $tickerSource.textContent = item.source || '';
    $tickerHeadline.textContent = item.title || '—';
  }

  // ── Feed Status ──────────────────────────────────────

  function renderFeedStatus(state) {
    if (!state.news || !state.news.feedStatus) {
      $feedStatus.innerHTML = '';
      return;
    }

    var html = '';
    var feeds = state.news.feedStatus;
    for (var i = 0; i < feeds.length; i++) {
      if (feeds[i].status === 'error') {
        html += '<span class="feed-error">' + escapeHtml(feeds[i].source) + ' অনুপলব্ধ</span>';
      }
    }
    $feedStatus.innerHTML = html;
  }

  // ── Stale Indicator ──────────────────────────────────

  function renderStaleIndicator($el, data) {
    if (!data || data.status !== 'stale' || !data.updatedAt) {
      $el.classList.add('hidden');
      return;
    }

    var time = formatBanglaTime(data.updatedAt);
    $el.textContent = 'সর্বশেষ আপডেট: ' + time;
    $el.classList.remove('hidden');
  }

  // ── Utilities ────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Demo Mode ────────────────────────────────────────

  function getDemoState(mode) {
    var now = new Date().toISOString();
    var today = new Date();

    var makeTime = function (h, m) {
      var d = new Date(today);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };

    return {
      mode: mode,
      startupComplete: true,
      timestamp: now,
      location: {
        lat: 23.8103,
        lon: 90.4125,
        city: 'ঢাকা',
        status: 'ok',
        updatedAt: now
      },
      weather: {
        current: {
          temperature: 29,
          feelsLike: 33,
          humidity: 72,
          windSpeed: 14,
          precipitationChance: 35,
          condition: 'আংশিক মেঘলা',
          weatherCode: 2
        },
        tomorrow: {
          tempMax: 31,
          tempMin: 23,
          condition: 'বৃষ্টি',
          precipitationChance: 75,
          weatherCode: 63
        },
        status: 'ok',
        updatedAt: now
      },
      news: {
        headlines: [
          { title: 'বাংলাদেশের অর্থনীতিতে নতুন গতি, রপ্তানি আয়ে রেকর্ড', source: 'প্রথম আলো', link: '#', pubDate: now },
          { title: 'ঢাকায় মেট্রোরেলের নতুন রুটের কাজ শুরু হচ্ছে আগামী মাসে', source: 'BBC বাংলা', link: '#', pubDate: now },
          { title: 'জাতীয় ক্রিকেট দলের সিরিজ জয়, উদযাপনে মাতলো দেশ', source: 'কালের কণ্ঠ', link: '#', pubDate: now },
          { title: 'প্রযুক্তি খাতে বিনিয়োগ বাড়ছে, তরুণদের কর্মসংস্থানে আশার আলো', source: 'যুগান্তর', link: '#', pubDate: now },
          { title: 'আগামীকাল থেকে সারাদেশে ভারী বৃষ্টির পূর্বাভাস', source: 'প্রথম আলো', link: '#', pubDate: now }
        ],
        feedStatus: [
          { source: 'প্রথম আলো', status: 'ok' },
          { source: 'BBC বাংলা', status: 'ok' },
          { source: 'কালের কণ্ঠ', status: 'error', error: 'timeout' },
          { source: 'যুগান্তর', status: 'ok' }
        ],
        status: 'ok',
        updatedAt: now
      },
      calendar: {
        events: [
          { title: 'টিম স্ট্যান্ডআপ', startTime: makeTime(9, 0) },
          { title: 'প্রজেক্ট রিভিউ', startTime: makeTime(11, 0) },
          { title: 'লাঞ্চ মিটিং — রহিম ভাই', startTime: makeTime(13, 0) },
          { title: 'কোড রিভিউ সেশন', startTime: makeTime(15, 30) },
          { title: 'ইভনিং চা', startTime: makeTime(17, 0) }
        ],
        status: 'ok',
        updatedAt: now
      },
      briefing: {
        text: 'আজ আকাশ আংশিক মেঘলা থাকবে, সর্বোচ্চ তাপমাত্রা ২৯°সে। সকাল ৯টায় টিম স্ট্যান্ডআপ এবং ১১টায় প্রজেক্ট রিভিউ আছে। রপ্তানি আয়ে নতুন রেকর্ড গড়েছে বাংলাদেশ।',
        type: mode === 'evening' ? 'evening' : 'morning',
        status: 'ok',
        updatedAt: now
      }
    };
  }

  function activateDemo() {
    isDemo = true;

    // Stop reconnect attempts
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }

    // Determine mode from current hour
    var hour = new Date().getHours();
    var mode;
    if (hour >= 6 && hour < 12) mode = 'morning';
    else if (hour >= 12 && hour < 16) mode = 'afternoon';
    else if (hour >= 16 && hour < 21) mode = 'evening';
    else mode = 'night';

    // Show demo switcher
    $demoSwitcher.classList.remove('hidden');

    // Bind demo switcher buttons
    var buttons = $demoSwitcher.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        var m = this.dataset.mode;
        // Reset ticker so it re-initializes
        if (tickerInterval) {
          clearInterval(tickerInterval);
          tickerInterval = null;
        }
        handleStateUpdate(getDemoState(m));
      });
    }

    // Load demo state after splash delay
    setTimeout(function () {
      handleStateUpdate(getDemoState(mode));
    }, 1500);
  }

  // ── Init ─────────────────────────────────────────────

  // Try WebSocket first; fall back to demo if no server
  if (window.location.protocol === 'file:') {
    // Opened directly as a file — go straight to demo
    activateDemo();
  } else {
    connect();
    // If WebSocket doesn't connect within 3 seconds, go demo
    setTimeout(function () {
      if (!splashDismissed && !isDemo) {
        activateDemo();
      }
    }, 3000);
  }

})();

# Technical Specification: স্মার্ট মিরর (Smart Mirror)

## 1. Overview

A passive Bangla-language smart mirror dashboard for Raspberry Pi Zero 2 W. A Node.js backend fetches weather, news, calendar events, and AI-generated briefings from free APIs, then pushes a unified state object to a single-page frontend via WebSocket. The frontend renders four time-based display modes on a dark background optimized for mirror reflection. No user interaction. Zero API cost.

**Target environment:** Raspberry Pi Zero 2 W running Chromium in kiosk mode
**Runtime:** Node.js (no build step, no bundler, no transpilation)
**Network:** Server binds to `0.0.0.0:3000`, accessible from local network
**Language:** All UI text in Bangla

---

## 2. Architecture

### 2.1 System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Raspberry Pi Zero 2 W                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Node.js Backend (Express)             │    │
│  │                                                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │    │
│  │  │ location │  │ weather  │  │    news      │  │    │
│  │  │ service  │  │ service  │  │   service    │  │    │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │    │
│  │       │              │               │          │    │
│  │  ┌────┴─────┐  ┌────┴─────────┐     │          │    │
│  │  │ ip-api   │  │  Open-Meteo  │     │          │    │
│  │  └──────────┘  └──────────────┘     │          │    │
│  │                                      │          │    │
│  │  ┌──────────┐  ┌──────────────┐     │          │    │
│  │  │ calendar │  │ ai-briefing  │  ┌──┴───────┐  │    │
│  │  │ service  │  │   service    │  │ RSS feeds│  │    │
│  │  └────┬─────┘  └──────┬───────┘  └──────────┘  │    │
│  │       │               │                         │    │
│  │  ┌────┴─────┐  ┌─────┴──────┐                  │    │
│  │  │ Google   │  │  Gemini    │                  │    │
│  │  │ Calendar │  │  1.5 Flash │                  │    │
│  │  └──────────┘  └────────────┘                  │    │
│  │                                                  │    │
│  │  ┌────────────┐  ┌────────────┐                 │    │
│  │  │ scheduler  │  │  logger    │                 │    │
│  │  │ (cron)     │  │  (file)    │                 │    │
│  │  └────────────┘  └────────────┘                 │    │
│  │                                                  │    │
│  │           ┌──────────────┐                      │    │
│  │           │  WebSocket   │                      │    │
│  │           │   Server     │                      │    │
│  │           └──────┬───────┘                      │    │
│  └──────────────────┼──────────────────────────────┘    │
│                     │                                    │
│  ┌──────────────────┼──────────────────────────────┐    │
│  │   Chromium Kiosk  │  (Frontend)                  │    │
│  │           ┌───────┴──────┐                       │    │
│  │           │  WebSocket   │                       │    │
│  │           │   Client     │                       │    │
│  │           └──────┬───────┘                       │    │
│  │                  │                               │    │
│  │           ┌──────┴───────┐                       │    │
│  │           │  DOM Renderer│                       │    │
│  │           │  (app.js)    │                       │    │
│  │           └──────────────┘                       │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Component Inventory

| Component | Responsibility | Technology | Inputs | Outputs | Dependencies |
|---|---|---|---|---|---|
| `server/index.js` | Express + WebSocket server setup, startup orchestration | Node.js, Express, ws | HTTP requests, service data | WebSocket messages, static files | All services, scheduler, logger |
| `server/scheduler.js` | Cron-based scheduling of data fetches | node-cron | Config time settings | Triggers service fetches | All services, logger |
| `server/logger.js` | File-based logging with 1-day rotation | Node.js fs | Log messages | Log files in `logs/` | None |
| `server/services/location.js` | Auto-detect geographic coordinates | Node.js fetch | None (uses server IP) | `{ lat, lon, city }` | ip-api.com |
| `server/services/weather.js` | Fetch current + forecast weather | Node.js fetch | `{ lat, lon }` | Weather data object | Open-Meteo, location service |
| `server/services/news.js` | Fetch + parse RSS feeds | rss-parser | RSS URLs from config | Array of headlines | RSS feed endpoints |
| `server/services/calendar.js` | Fetch Google Calendar events, auto-refresh tokens | googleapis | OAuth tokens from `.env` | Array of events | Google Calendar API |
| `server/services/ai-briefing.js` | Generate Bangla briefing text | Node.js fetch | Weather + news + calendar data | Bangla briefing string | Google Gemini API |
| `public/js/app.js` | WebSocket client, DOM rendering, mode theming | Vanilla JS | WebSocket state messages | DOM updates | None |
| `public/css/style.css` | Layout, theming, animations | CSS | None | Visual styling | Noto Sans Bengali font |
| `public/index.html` | Page structure, splash screen | HTML | None | DOM skeleton | style.css, app.js |
| `config/config.json` | Centralized configuration | JSON | None | Config values | None |

### 2.3 Data Flow

**Normal operation (e.g., weather update cycle):**
1. `scheduler.js` fires the weather cron job (every 30 min)
2. Scheduler calls `weather.js.fetch(lat, lon)`
3. `weather.js` sends HTTP GET to Open-Meteo API
4. Response is parsed into the weather data model
5. `index.js` updates the in-memory unified state object
6. `index.js` pushes the full unified state to all connected WebSocket clients
7. `app.js` receives the state, determines current mode (from `state.mode`), and re-renders the DOM

**Startup flow:**
1. `index.js` starts Express server on `0.0.0.0:3000`
2. WebSocket server is attached
3. All services are called in parallel: location → then weather (needs lat/lon), news, calendar, ai-briefing (if morning/evening mode)
4. Each service response (success or error) is tracked
5. Once all have responded, the unified state is assembled with the current mode
6. State is pushed to any connected clients
7. Frontend receives state, dismisses splash screen, renders mode

---

## 3. Component Specifications

### 3.1 Server Entry Point (`server/index.js`)

#### Purpose
Initializes the Express HTTP server, WebSocket server, and orchestrates startup data fetching. Maintains the in-memory unified state and pushes it to all clients on every update.

#### Interface

**HTTP:**
- `GET /` — serves `public/index.html`
- `GET /css/*`, `GET /js/*` — serves static assets

**WebSocket (server → client):**
```json
{
  "type": "state_update",
  "data": { /* UnifiedState object — see section 4.1 */ }
}
```

**WebSocket (client → server):**
No client-to-server messages. Frontend is receive-only.

#### Behavior

1. On start:
   - Create Express app, serve `public/` as static files
   - Create WebSocket server on the same HTTP server
   - Call `location.fetch()` first (other services depend on coordinates)
   - Once location resolves (success or fail), call weather, news, calendar, ai-briefing in parallel
   - Track completion of all fetches via a Promise.allSettled
   - Determine current mode from system clock + config time boundaries
   - Assemble unified state
   - Mark startup as complete
   - Push state to all connected clients

2. On WebSocket connection:
   - Immediately push the current unified state to the new client

3. On service data update (triggered by scheduler):
   - Update the relevant section of the in-memory state
   - Recalculate mode (time may have crossed a boundary)
   - Push full unified state to all connected clients

4. On mode transition (time boundary crossed):
   - Update `state.mode`
   - Push state to all clients (theme change happens on frontend)

#### Error Handling
- If a service fails during fetch, its section in the state retains the last successful data and sets `updatedAt` to the last success time and `status` to `"stale"`
- Server never crashes on a service error — all fetch calls are wrapped in try/catch
- Uncaught exceptions are logged and the process continues

#### Configuration
- `PORT`: from `.env` or default `3000`

---

### 3.2 Scheduler (`server/scheduler.js`)

#### Purpose
Runs cron jobs to periodically refresh data from external services.

#### Interface
```javascript
// Called once from index.js after startup
scheduler.start(services, onDataUpdate)
```

- `services`: object containing all service modules
- `onDataUpdate(source, data)`: callback invoked when a service returns new data

#### Behavior

| Cron Expression | Action |
|---|---|
| `*/15 * * * *` | Fetch news from all RSS sources |
| `*/30 * * * *` | Fetch weather for current location |
| `*/30 * * * *` | Fetch calendar events |
| `0 6 * * *` | Generate morning AI briefing |
| `0 16 * * *` | Generate evening AI briefing |
| `* * * * *` | Check if mode transition is needed (every minute) |

#### Error Handling
- Each cron job wraps its service call in try/catch
- Errors are logged via `logger`
- Failed fetches do not affect other scheduled jobs

---

### 3.3 Logger (`server/logger.js`)

#### Purpose
File-based logging with automatic 1-day rotation.

#### Interface
```javascript
logger.info(message)
logger.error(message)
logger.warn(message)
```

#### Behavior
- Writes to `logs/smart-mirror.log`
- Log format: `[ISO8601 timestamp] [LEVEL] message`
- Example: `[2026-03-08T10:30:00.000Z] [INFO] Weather fetch successful`
- On startup, check if existing log file is from a previous day. If so, delete it and start fresh.
- Only one log file exists at any time (current day)

#### Configuration
- Log directory: `logs/` (created automatically if missing)

---

### 3.4 Location Service (`server/services/location.js`)

#### Purpose
Auto-detect the server's geographic location using its public IP address. Called once at startup.

#### Interface
```javascript
// Returns { lat: number, lon: number, city: string }
async function fetch()
```

#### Behavior
1. Send GET request to `http://ip-api.com/json/?fields=lat,lon,city`
2. Parse response JSON
3. Return `{ lat, lon, city }`

#### Error Handling
- On failure, return default: `{ lat: 23.8103, lon: 90.4125, city: "ঢাকা" }` (Dhaka)
- Log warning with error details

---

### 3.5 Weather Service (`server/services/weather.js`)

#### Purpose
Fetch current conditions and tomorrow's forecast from Open-Meteo.

#### Interface
```javascript
// Returns WeatherData object (see section 4.2)
async function fetch(lat, lon)
```

#### Behavior
1. Send GET request to Open-Meteo API:
   ```
   https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=2
   ```
2. Parse response into WeatherData model
3. Map `weather_code` to Bangla condition strings (see weather code mapping below)

#### Weather Code Mapping (WMO codes → Bangla)
| Code | Bangla |
|---|---|
| 0 | পরিষ্কার আকাশ |
| 1, 2, 3 | আংশিক মেঘলা |
| 45, 48 | কুয়াশা |
| 51, 53, 55 | গুঁড়ি গুঁড়ি বৃষ্টি |
| 61, 63, 65 | বৃষ্টি |
| 71, 73, 75 | তুষারপাত |
| 80, 81, 82 | ঝড়ো বৃষ্টি |
| 95, 96, 99 | বজ্রপাতসহ ঝড় |

#### Error Handling
- On API failure, return `null`. Caller retains previous data and marks as stale.
- Log error with HTTP status and response body.

---

### 3.6 News Service (`server/services/news.js`)

#### Purpose
Fetch and parse Bangla news headlines from multiple RSS feeds.

#### Interface
```javascript
// Returns NewsData object (see section 4.3)
async function fetch(feedUrls)
```

#### Behavior
1. For each RSS URL in `feedUrls`, fetch and parse using `rss-parser`
2. Each feed is fetched independently (Promise.allSettled)
3. Extract from each item: `title`, `link`, `source` (feed name), `pubDate`
4. Merge all items, sort by `pubDate` descending
5. Return the combined list + per-source status

#### Error Handling
- Each feed is independent. If one fails, others continue.
- Failed feeds are returned in `feedStatus` with `{ source: name, status: "error", error: message }`
- Successful feeds return `{ source: name, status: "ok" }`

---

### 3.7 Calendar Service (`server/services/calendar.js`)

#### Purpose
Fetch upcoming Google Calendar events. Auto-refresh OAuth tokens.

#### Interface
```javascript
// Returns CalendarData object (see section 4.4)
async function fetch(dateRange)
// dateRange: "today" | "tomorrow"
```

#### Behavior
1. Use stored access token from `.env` to call Google Calendar API
2. Endpoint: `GET https://www.googleapis.com/calendar/v3/calendars/primary/events`
3. Query params:
   - `timeMin`: start of target day (ISO8601)
   - `timeMax`: end of target day (ISO8601)
   - `singleEvents`: true
   - `orderBy`: startTime
   - `maxResults`: 10
4. Parse response, extract: `title` (summary), `startTime` (start.dateTime)
5. For afternoon mode: filter out events where `startTime` is before current time
6. Return max 5 events

#### Token Auto-Refresh
1. Before each API call, check if access token is expired (track expiry time in memory)
2. If expired, POST to `https://oauth2.googleapis.com/token` with:
   - `client_id`, `client_secret`, `refresh_token` from `.env`
   - `grant_type`: `refresh_token`
3. Update in-memory access token and expiry time
4. Proceed with the calendar API call

#### Error Handling
- On token refresh failure: log error, return `null`, calendar section degrades gracefully
- On API failure: log error, return `null`

---

### 3.8 AI Briefing Service (`server/services/ai-briefing.js`)

#### Purpose
Generate Bangla briefing text using Google Gemini 1.5 Flash.

#### Interface
```javascript
// Returns { text: string } or null on failure
async function fetch(type, weatherData, newsData, calendarData)
// type: "morning" | "evening"
```

#### Behavior

**Morning briefing (6:00 AM):**
1. Compose a Bangla prompt including:
   - Current weather summary (temperature, condition, humidity)
   - Today's calendar events (titles and times)
   - Top 5 news headlines
2. Prompt template:
   ```
   আজকের আবহাওয়া: {weather summary}
   আজকের ক্যালেন্ডার: {event list}
   আজকের শীর্ষ সংবাদ: {headline list}

   উপরের তথ্যের ভিত্তিতে একটি সংক্ষিপ্ত বাংলা সকালের ব্রিফিং লিখুন। ২-৩ বাক্যে।
   ```
3. Send POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}`
4. Extract generated text from response

**Evening briefing (4:00 PM):**
1. Same structure but prompt asks for:
   - Recap of today's top stories
   - Tomorrow's weather preview
   - Tomorrow's calendar events
2. Prompt template:
   ```
   আজকের শীর্ষ সংবাদ: {headline list}
   আগামীকালের আবহাওয়া: {tomorrow forecast}
   আগামীকালের ক্যালেন্ডার: {event list}

   উপরের তথ্যের ভিত্তিতে একটি সংক্ষিপ্ত বাংলা সন্ধ্যার ব্রিফিং লিখুন। ২-৩ বাক্যে।
   ```

#### Error Handling
- On API error (timeout, rate limit, 500): return `null`. Briefing section shows last successful briefing or raw data fallback.
- Log error with status code and response.

---

### 3.9 Frontend — App (`public/js/app.js`)

#### Purpose
WebSocket client, DOM rendering, mode theming, reconnect logic, splash screen management.

#### Interface
- Receives `state_update` messages from server
- No outbound messages

#### Behavior

**Startup:**
1. Display splash screen (centered "স্মার্ট মিরর" branding on dark background)
2. Open WebSocket connection to `ws://{window.location.host}`
3. On first `state_update` received, dismiss splash with a fade-out transition
4. Render the appropriate mode

**On state_update received:**
1. Parse the UnifiedState object
2. Apply mode theme (add CSS class: `mode-morning`, `mode-afternoon`, `mode-evening`, `mode-night`)
3. Update clock and date (clock runs locally every second; date from state)
4. Render weather section (if applicable to current mode)
5. Render calendar section (if applicable to current mode)
6. Render AI briefing section (if applicable and available)
7. Render news ticker
8. Render status indicators (stale data timestamps, failed RSS sources)

**Clock:**
- Runs on a local `setInterval(1000)` — not dependent on WebSocket
- Displays time in Bangla numerals (convert 0-9 to ০-৯)
- Format: `HH:MM:SS` in Bangla

**Date:**
- Updated from state or locally
- Format: `দিন, DD মাস YYYY` in Bangla (e.g., "শনিবার, ০৮ মার্চ ২০২৬")

**News ticker:**
- Display one headline at a time
- Fade transition between headlines
- 10-second interval per headline
- Cycle through all headlines, loop back to start

**WebSocket reconnection:**
1. On disconnect, start reconnect attempts with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
2. Start a 10-second timer on disconnect
3. If still disconnected after 10 seconds, show "সংযোগ বিচ্ছিন্ন" banner at top of screen
4. On successful reconnect, hide banner, reset backoff timer

**Stale data indicators:**
- For each data section (weather, news, calendar, briefing), if `status === "stale"`, show "সর্বশেষ আপডেট: {updatedAt}" below the section in smaller, dimmed text

**Failed RSS indicators:**
- For each feed with `status: "error"` in `newsData.feedStatus`, show source name + "অনুপলব্ধ" in the news section area

#### Bangla Numeral Conversion
```javascript
function toBanglaNum(str) {
  const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  return String(str).replace(/[0-9]/g, d => banglaDigits[d]);
}
```

---

### 3.10 Frontend — Styles (`public/css/style.css`)

#### Purpose
Layout, theming, responsive design, animations.

#### Themes

| Mode | CSS Class | Background | Text Color | Accent |
|---|---|---|---|---|
| Morning | `.mode-morning` | `#1a1a2e` | `#f0e6d3` | `#f4a261` (warm amber) |
| Afternoon | `.mode-afternoon` | `#1a1a2e` | `#e8e8e8` | `#8ecae6` (neutral sky blue) |
| Evening | `.mode-evening` | `#0d1117` | `#c9d1d9` | `#7b68ee` (cool violet) |
| Night | `.mode-night` | `#000000` | `#4a4a4a` | `#2a2a2a` (ultra dim) |

All backgrounds are dark for mirror reflection.

#### Layout Structure
```
┌─────────────────────────────────────┐
│          Clock + Date               │  ← top center
├─────────────────────────────────────┤
│                                     │
│    Weather        Calendar          │  ← middle, side by side
│                                     │
├─────────────────────────────────────┤
│          AI Briefing                │  ← below middle (if applicable)
├─────────────────────────────────────┤
│    [Status indicators if any]       │
├─────────────────────────────────────┤
│    ═══ News Ticker (fade) ═══       │  ← bottom
└─────────────────────────────────────┘
```

#### Responsive Behavior
- Flexbox for main layout, CSS grid for weather/calendar side-by-side
- On narrow screens (< 600px): stack weather and calendar vertically
- Font sizes use `clamp()` for fluid scaling
- No fixed pixel widths on any container

#### Animations
- Splash screen: fade out over 500ms
- News ticker: CSS opacity fade, 500ms transition
- Mode theme: CSS transition on background/color, 1000ms ease
- Disconnected banner: slide down from top

#### Typography
- Font family: `'Noto Sans Bengali', sans-serif`
- Loaded via `<link>` from Google Fonts or local `@font-face`
- Clock: largest text (~8vw)
- Date: medium (~3vw)
- Weather/calendar: standard (~2vw)
- News ticker: medium (~2.5vw)
- Status indicators: small (~1.5vw), dimmed opacity

---

## 4. Data Models

### 4.1 UnifiedState (WebSocket payload)

```json
{
  "mode": "morning | afternoon | evening | night",
  "startupComplete": true,
  "timestamp": "2026-03-08T10:30:00.000Z",
  "location": {
    "lat": 23.8103,
    "lon": 90.4125,
    "city": "ঢাকা",
    "status": "ok | stale | error",
    "updatedAt": "2026-03-08T06:00:00.000Z"
  },
  "weather": {
    "current": {
      "temperature": 28,
      "feelsLike": 31,
      "humidity": 75,
      "windSpeed": 12,
      "precipitationChance": 40,
      "condition": "আংশিক মেঘলা",
      "weatherCode": 2
    },
    "tomorrow": {
      "tempMax": 32,
      "tempMin": 24,
      "condition": "বৃষ্টি",
      "precipitationChance": 80,
      "weatherCode": 63
    },
    "status": "ok | stale | error",
    "updatedAt": "2026-03-08T10:00:00.000Z"
  },
  "news": {
    "headlines": [
      {
        "title": "সংবাদ শিরোনাম এখানে",
        "link": "https://example.com/article",
        "source": "প্রথম আলো",
        "pubDate": "2026-03-08T09:00:00.000Z"
      }
    ],
    "feedStatus": [
      { "source": "প্রথম আলো", "status": "ok" },
      { "source": "BBC বাংলা", "status": "ok" },
      { "source": "কালের কণ্ঠ", "status": "error", "error": "timeout" },
      { "source": "যুগান্তর", "status": "ok" }
    ],
    "status": "ok | stale | error",
    "updatedAt": "2026-03-08T10:15:00.000Z"
  },
  "calendar": {
    "events": [
      {
        "title": "টিম মিটিং",
        "startTime": "2026-03-08T10:00:00+06:00"
      }
    ],
    "status": "ok | stale | error",
    "updatedAt": "2026-03-08T10:00:00.000Z"
  },
  "briefing": {
    "text": "আজ আকাশ আংশিক মেঘলা থাকবে, সর্বোচ্চ তাপমাত্রা ২৮°সে। সকাল ১০টায় টিম মিটিং আছে।",
    "type": "morning | evening",
    "status": "ok | stale | error",
    "updatedAt": "2026-03-08T06:00:00.000Z"
  }
}
```

### 4.2 WeatherData

```json
{
  "current": {
    "temperature": "number — °C",
    "feelsLike": "number — °C apparent temperature",
    "humidity": "number — % relative humidity",
    "windSpeed": "number — km/h",
    "precipitationChance": "number — % probability",
    "condition": "string — Bangla condition text",
    "weatherCode": "number — WMO weather code"
  },
  "tomorrow": {
    "tempMax": "number — °C",
    "tempMin": "number — °C",
    "condition": "string — Bangla condition text",
    "precipitationChance": "number — %",
    "weatherCode": "number — WMO weather code"
  }
}
```

### 4.3 NewsData

```json
{
  "headlines": [
    {
      "title": "string — headline text in Bangla",
      "link": "string — URL to full article",
      "source": "string — feed name in Bangla",
      "pubDate": "string — ISO8601 publication date"
    }
  ],
  "feedStatus": [
    {
      "source": "string — feed name in Bangla",
      "status": "ok | error",
      "error": "string | undefined — error message if status is error"
    }
  ]
}
```

### 4.4 CalendarData

```json
{
  "events": [
    {
      "title": "string — event summary",
      "startTime": "string — ISO8601 datetime with timezone"
    }
  ]
}
```
- Maximum 5 events returned
- For afternoon mode, events with `startTime` before current time are filtered out by the server before sending

---

## 5. Frontend Specification

### 5.1 Views

There is only one page (`index.html`). It has two states:

**Splash State:**
- Full-screen dark background (`#000000`)
- Centered "স্মার্ট মিরর" text in Noto Sans Bengali, large (10vw)
- Subtle fade-in animation on load
- Dismissed when first `state_update` with `startupComplete: true` is received

**Mirror State:**
- Layout as described in section 3.10
- Content varies by `state.mode`:

| Section | Morning | Afternoon | Evening | Night |
|---|---|---|---|---|
| Clock + Date | Yes | Yes | Yes | Yes |
| Current Weather | Yes | Yes | No | No |
| Tomorrow Weather | No | No | Yes | No |
| Today's Calendar | Yes | Yes (filtered) | No | No |
| Tomorrow Calendar | No | No | Yes | No |
| AI Briefing | Yes | No | Yes | No |
| News Ticker | Yes | Yes | Yes | Yes (dim) |

### 5.2 Theming

See section 3.10 for color values.

- Theme transitions use CSS `transition: background-color 1s ease, color 1s ease`
- Mode class is set on `<body>`: `<body class="mode-morning">`
- All colors are defined as CSS custom properties per mode:
  ```css
  .mode-morning {
    --bg-primary: #1a1a2e;
    --text-primary: #f0e6d3;
    --accent: #f4a261;
  }
  ```

### 5.3 Status Indicators

| Indicator | Trigger | Appearance | Position |
|---|---|---|---|
| Stale data | `section.status === "stale"` | "সর্বশেষ আপডেট: HH:MM" in small dimmed text | Below the affected section |
| Failed RSS | `feedStatus[].status === "error"` | "{source} অনুপলব্ধ" in small red-tinted text | In the news section area |
| Disconnected | WebSocket closed > 10 seconds | "সংযোগ বিচ্ছিন্ন" banner, semi-transparent red background | Slides down from top of screen |

---

## 6. External Integrations

### 6.1 Open-Meteo (Weather)

- **Base URL:** `https://api.open-meteo.com/v1/forecast`
- **Auth:** None
- **Rate limit:** Effectively unlimited for this use case
- **Request:**
  ```
  GET /v1/forecast?latitude=23.81&longitude=90.41&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=2
  ```
- **Response:** JSON with `current` and `daily` objects
- **Failure mode:** Return null, weather section shows stale data

### 6.2 ip-api.com (Location)

- **Base URL:** `http://ip-api.com/json/`
- **Auth:** None
- **Rate limit:** 45 requests/minute
- **Request:** `GET /json/?fields=lat,lon,city`
- **Response:** `{ "lat": 23.8103, "lon": 90.4125, "city": "Dhaka" }`
- **Failure mode:** Use Dhaka defaults `{ lat: 23.8103, lon: 90.4125, city: "ঢাকা" }`

### 6.3 Google Gemini 1.5 Flash (AI Briefing)

- **Base URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Auth:** API key as query parameter `?key={GEMINI_API_KEY}`
- **Rate limit:** 1500 requests/day (free tier). This project uses 2/day (6am + 4pm).
- **Request:**
  ```json
  {
    "contents": [{
      "parts": [{ "text": "bangla prompt here" }]
    }]
  }
  ```
- **Response:**
  ```json
  {
    "candidates": [{
      "content": {
        "parts": [{ "text": "generated bangla text" }]
      }
    }]
  }
  ```
- **Failure mode:** Return null, briefing section shows stale data or raw data fallback

### 6.4 Google Calendar API

- **Base URL:** `https://www.googleapis.com/calendar/v3`
- **Auth:** OAuth 2.0 Bearer token (auto-refreshed)
- **Rate limit:** Free tier, effectively unlimited for this use case
- **Request:**
  ```
  GET /calendars/primary/events?timeMin=2026-03-08T00:00:00Z&timeMax=2026-03-08T23:59:59Z&singleEvents=true&orderBy=startTime&maxResults=10
  ```
- **Response:** JSON with `items[]` containing event objects
- **Failure mode:** Return null, calendar section shows stale data

### 6.5 RSS Feeds (News)

- **URLs:** Configured in `config.json`
- **Auth:** None
- **Rate limit:** Per-site, generally generous for 15-min intervals
- **Library:** `rss-parser` npm package
- **Failure mode:** Per-feed independent. Failed feeds are flagged in `feedStatus`. Working feeds continue normally.

---

## 7. Configuration Schema

### 7.1 Environment Variables (.env)

| Variable | Required | Description | Example |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key | `AIzaSy...` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID | `123...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret | `GOCSPX-...` |
| `GOOGLE_REFRESH_TOKEN` | Yes | Google OAuth refresh token | `1//0...` |
| `PORT` | No | Server port (default: 3000) | `3000` |

### 7.2 Config File (`config/config.json`)

```json
{
  "modes": {
    "morning": { "start": "06:00", "end": "12:00" },
    "afternoon": { "start": "12:00", "end": "16:00" },
    "evening": { "start": "16:00", "end": "21:00" },
    "night": { "start": "21:00", "end": "06:00" }
  },
  "schedules": {
    "newsIntervalMinutes": 15,
    "weatherIntervalMinutes": 30,
    "calendarIntervalMinutes": 30,
    "morningBriefingTime": "06:00",
    "eveningBriefingTime": "16:00"
  },
  "news": {
    "feeds": [
      { "name": "প্রথম আলো", "url": "https://www.prothomalo.com/rss" },
      { "name": "BBC বাংলা", "url": "https://feeds.bbci.co.uk/bengali/rss.xml" },
      { "name": "কালের কণ্ঠ", "url": "https://www.kalerkantho.com/rss.xml" },
      { "name": "যুগান্তর", "url": "https://www.jugantor.com/rss.xml" }
    ],
    "tickerIntervalSeconds": 10
  },
  "weather": {
    "units": "celsius",
    "defaultLocation": {
      "lat": 23.8103,
      "lon": 90.4125,
      "city": "ঢাকা"
    }
  },
  "calendar": {
    "maxEvents": 5
  },
  "ui": {
    "splashText": "স্মার্ট মিরর",
    "disconnectIndicatorDelayMs": 10000
  }
}
```

---

## 8. Startup & Initialization Sequence

| Step | Action | Depends On | Failure Behavior |
|---|---|---|---|
| 1 | Start Express server on `0.0.0.0:{PORT}` | — | Fatal: exit process |
| 2 | Attach WebSocket server | Step 1 | Fatal: exit process |
| 3 | Load `config.json` | — | Fatal: exit process |
| 4 | Initialize logger | — | Fatal: exit process |
| 5 | Fetch location | — | Use Dhaka defaults |
| 6 | Fetch weather | Step 5 (needs lat/lon) | Mark weather as error |
| 7 | Fetch news | — | Mark news as error |
| 8 | Fetch calendar | — | Mark calendar as error |
| 9 | Generate AI briefing (if morning/evening) | Steps 6, 7, 8 (needs data) | Mark briefing as error |
| 10 | Determine current mode | Step 3 (needs config) | — |
| 11 | Assemble UnifiedState | Steps 5–10 | — |
| 12 | Set `startupComplete: true` | Step 11 | — |
| 13 | Push state to connected clients | Step 12 | — |
| 14 | Start scheduler | Step 12 | Log error, retry |

**Readiness criteria:** Step 12 complete — all data sources have responded (success or failure) and the unified state is assembled.

**Dependency chain:** Location must resolve before weather. Weather + news + calendar must resolve before AI briefing (if applicable). Everything else is parallel.

---

## 9. Scheduling & Background Jobs

| Job | Cron Expression | Action | Failure Behavior |
|---|---|---|---|
| News fetch | `*/15 * * * *` | Call `news.fetch()` with configured feed URLs | Log error, retain stale data |
| Weather fetch | `*/30 * * * *` | Call `weather.fetch()` with stored lat/lon | Log error, retain stale data |
| Calendar sync | `*/30 * * * *` | Call `calendar.fetch()` for appropriate day | Log error, retain stale data |
| Morning briefing | `0 6 * * *` | Call `ai-briefing.fetch("morning", ...)` | Log error, retain stale data |
| Evening briefing | `0 16 * * *` | Call `ai-briefing.fetch("evening", ...)` | Log error, retain stale data |
| Mode check | `* * * * *` | Compare current time to mode boundaries, update if changed | — |
| Log rotation | `0 0 * * *` | Delete previous day's log file | Log error (to console) |

---

## 10. Error Handling Matrix

| Error Scenario | Detection | Response | User-Facing Effect |
|---|---|---|---|
| Open-Meteo API down | HTTP error or timeout (10s) | Log, retain last data, set `status: "stale"` | Stale weather + "সর্বশেষ আপডেট" timestamp |
| RSS feed unreachable | HTTP error or timeout (10s) per feed | Log, mark feed as error | "{source} অনুপলব্ধ" indicator on display |
| All RSS feeds down | All feeds return error | Log, retain last headlines, set `status: "stale"` | Stale headlines + timestamp |
| Gemini API error | HTTP error, timeout (15s), or rate limit | Log, retain last briefing, set `status: "stale"` | Stale briefing + timestamp; if no prior briefing, show raw data |
| Gemini rate limit (1500/day) | HTTP 429 response | Log, skip briefing | Same as API error |
| Google Calendar token expired | HTTP 401 response | Auto-refresh token, retry once | Transparent if refresh succeeds |
| Google Calendar refresh fails | HTTP error on token refresh | Log, set calendar `status: "stale"` | Stale calendar + timestamp |
| ip-api.com down | HTTP error or timeout (5s) | Use Dhaka defaults | No visible effect (location is internal) |
| WebSocket disconnect | `onclose` event in frontend | Exponential backoff reconnect | After 10s: "সংযোগ বিচ্ছিন্ন" banner |
| Server crash | Process exits | Relies on external process manager (systemd/pm2) | Splash screen on reconnect |
| No internet on boot | All fetches fail | All sources marked as error, startup completes | All sections show error/empty state |
| Config file missing | `fs.readFileSync` throws | Fatal: log and exit process | Mirror doesn't start |
| `.env` missing keys | Undefined check on startup | Log warning, disable affected service | Affected section shows empty |

---

## 11. Logging

**Levels:**
- `INFO` — successful fetches, mode transitions, startup events, WebSocket connections
- `WARN` — degraded states (using defaults, stale data)
- `ERROR` — failed API calls, token refresh failures, unexpected exceptions

**Format:**
```
[2026-03-08T10:30:00.000Z] [INFO] Weather fetch successful — 28°C, আংশিক মেঘলা
[2026-03-08T10:30:05.000Z] [ERROR] RSS fetch failed for কালের কণ্ঠ — ETIMEDOUT
[2026-03-08T12:00:00.000Z] [INFO] Mode transition: morning → afternoon
```

**Rotation:**
- Single log file: `logs/smart-mirror.log`
- At midnight (cron `0 0 * * *`), delete the existing log file and start a new one
- If the `logs/` directory doesn't exist, create it on startup

**Location:** `{project_root}/logs/smart-mirror.log`

---

## 12. Implementation Phases

### Phase 1: Core Infrastructure
**Goal:** Server runs, WebSocket connects, frontend renders a clock.

**Build order:**
1. `package.json` — initialize with dependencies (`express`, `ws`, `node-cron`)
2. `config/config.json` — create with all settings
3. `server/logger.js` — file-based logger with rotation
4. `server/index.js` — Express server + WebSocket server + static file serving
5. `public/index.html` — page skeleton with splash screen
6. `public/css/style.css` — dark theme, layout, splash screen styles, all four mode themes
7. `public/js/app.js` — WebSocket client, clock (Bangla numerals), date display, splash dismiss logic, reconnect with backoff + disconnect indicator

**Acceptance criteria:**
- `node server/index.js` starts without errors
- Browser shows splash screen, then clock + date in Bangla after WebSocket connects
- Clock updates every second
- WebSocket reconnect works after server restart
- Disconnect indicator appears after 10s
- Accessible from another device on local network

### Phase 2: Data Services
**Goal:** Weather, news, calendar, and location data flow from APIs to the frontend.

**Build order:**
1. `server/services/location.js` — ip-api.com fetch + Dhaka fallback
2. `server/services/weather.js` — Open-Meteo fetch + Bangla weather codes
3. `server/services/news.js` — RSS parser + per-feed status tracking (add `rss-parser` dependency)
4. `server/services/calendar.js` — Google Calendar fetch + token auto-refresh (add `googleapis` or raw fetch)
5. `server/scheduler.js` — cron jobs for all services
6. Update `server/index.js` — startup orchestration (location → weather/news/calendar in parallel), unified state assembly, push to clients
7. Update `public/js/app.js` — render weather, calendar events, news ticker (fade, 10s interval)
8. Update `public/css/style.css` — weather/calendar/ticker styling

**Acceptance criteria:**
- Weather displays with temperature, condition, feels-like, humidity, wind speed, precipitation chance
- News ticker cycles headlines with 10s fade
- Calendar shows up to 5 events (title + start time)
- Location auto-detected (or Dhaka default)
- Stale data indicators appear when a service is manually blocked
- Failed RSS source indicator visible when a feed URL is broken

### Phase 3: AI Briefing + Mode Logic
**Goal:** All four modes work with correct content, AI briefings generate at scheduled times.

**Build order:**
1. `server/services/ai-briefing.js` — Gemini API integration with Bangla prompts
2. Update `server/scheduler.js` — add briefing cron jobs + mode check every minute
3. Update `server/index.js` — mode determination logic, include mode in unified state, trigger re-push on mode change
4. Update `public/js/app.js` — mode-based rendering (show/hide sections per mode), theme class switching
5. Update `public/css/style.css` — theme transitions (1s ease)

**Acceptance criteria:**
- Morning mode shows: current weather, today's calendar, news, AI briefing
- Afternoon mode shows: current weather, today's remaining calendar (filtered), news, no briefing
- Evening mode shows: tomorrow's weather, tomorrow's calendar, news, AI briefing
- Night mode shows: clock, date, dim news ticker only
- Theme colors change smoothly on mode transition
- AI briefing displays Bangla text from Gemini
- Briefing falls back to raw data on Gemini API error
- Time boundaries are configurable via config.json

### Phase 4: Polish & Resilience
**Goal:** Production-ready for 24/7 unattended Pi deployment.

**Build order:**
1. Add `.env` validation on startup — log warnings for missing keys, disable affected services
2. Add HTTP request timeouts: weather 10s, news 10s per feed, calendar 10s, Gemini 15s, location 5s
3. Add log rotation cron job (midnight cleanup)
4. Test all graceful degradation paths (kill network, break feeds, revoke tokens)
5. Test startup with partial failures (some services down)
6. Responsive testing across screen sizes
7. Create `.env.example` with placeholder values

**Acceptance criteria:**
- All items in the Verification Plan (REQUIREMENT.md) pass
- Mirror recovers cleanly from network outage
- Mirror recovers from server restart (splash → data load → render)
- Logs rotate correctly — only 1 day retained
- No unhandled promise rejections or crashes in 24-hour test run

---

## 13. File Structure

```
smart-mirror/
├── REQUIREMENT.md              — product requirements
├── SPEC.md                     — this technical specification
├── CLAUDE.md                   — Claude Code project instructions
├── package.json                — dependencies: express, ws, node-cron, rss-parser, dotenv
├── .env                        — secrets (gitignored): GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
├── .env.example                — template with placeholder values
├── .gitignore                  — node_modules/, .env, logs/
├── config/
│   └── config.json             — RSS URLs, time boundaries, schedules, UI settings
├── logs/
│   └── smart-mirror.log        — auto-rotated, 1-day retention
├── server/
│   ├── index.js                — Express + WebSocket server, startup orchestration, state management
│   ├── scheduler.js            — node-cron job definitions and management
│   ├── logger.js               — file logger with daily rotation
│   └── services/
│       ├── location.js         — ip-api.com location detection
│       ├── weather.js          — Open-Meteo current + forecast fetch
│       ├── news.js             — RSS feed parser with per-source health tracking
│       ├── calendar.js         — Google Calendar fetch + OAuth token auto-refresh
│       └── ai-briefing.js      — Gemini 1.5 Flash Bangla briefing generation
└── public/
    ├── index.html              — single page: splash screen + mirror layout
    ├── css/
    │   └── style.css           — responsive layout, four mode themes, animations
    └── js/
        └── app.js              — WebSocket client, DOM renderer, reconnect logic, clock
```

---

## 14. Open Questions

| # | Question | Impact | Owner |
|---|---|---|---|
| 1 | Should the server use `googleapis` npm package or raw HTTP fetch for Calendar API? `googleapis` is heavier but handles auth more robustly. Raw fetch is lighter (better for Pi). | Dependency size on Pi | Developer |
| 2 | Should Noto Sans Bengali be loaded from Google Fonts CDN or bundled locally? CDN requires internet on page load; local adds ~500KB to the repo but works offline. | First-load reliability | Developer |
| 3 | Should a process manager (pm2/systemd) be specified for auto-restart on crash, or is that deployment-specific? | Production reliability | Developer |
| 4 | The "additional Bangla RSS sources to be verified during build" note in requirements — are there specific sources to test? | News coverage | Product owner |
| 5 | For afternoon mode, should calendar events in progress (started but not ended) still be shown, or only future events? | Calendar display accuracy | Product owner |

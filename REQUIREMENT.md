# Project: স্মার্ট মিরর (Smart Mirror)

**Hardware:** Raspberry Pi Zero 2 W
**Language:** All display content in Bangla
**Stack:** Node.js (backend) + HTML/CSS/JS (frontend) + Chromium kiosk mode
**Interaction:** Passive display only — no touch, no voice, no input
**Screen:** Fully responsive — works on any screen size/orientation
**Cost constraint:** Zero extra cost — all APIs must be free
**Network:** Server binds to `0.0.0.0` — accessible from local network (phone/laptop can view the mirror UI)

---

## APIs & Services (All Free)

| Service | Purpose | Cost |
|---|---|---|
| Open-Meteo | Weather data | Free, no API key |
| ip-api.com | Auto-detect location | Free, no API key |
| Google Gemini 1.5 Flash | AI briefing generation in Bangla | Free tier (1500 req/day) |
| Google Calendar API | Fetch upcoming events | Free (OAuth 2.0 setup) |
| RSS Feeds | Bangla news | Free |

---

## News Sources (RSS Feeds)

- **Prothomalo** — https://www.prothomalo.com/rss
- **BBC Bangla** — https://feeds.bbci.co.uk/bengali/rss.xml
- **Kaler Kantho** — https://www.kalerkantho.com/rss.xml
- **Jugantor** — https://www.jugantor.com/rss.xml
- Additional Bangla RSS sources to be verified during build

---

## Display Modes (Context-Aware)

The mirror displays different content based on time of day:

### Morning Mode — 6:00 AM to 12:00 PM
- Clock + Date (always)
- Current weather (temperature, condition, feels-like)
- Today's calendar events
- Top news headlines (ticker)
- **AI Morning Briefing** (Gemini): Synthesized Bangla summary of today's weather + top news + calendar events. e.g., "আজ আকাশ মেঘলা থাকবে, সকাল ১০টায় আপনার মিটিং আছে..."

### Afternoon Mode — 12:00 PM to 4:00 PM
- Clock + Date (always)
- Current weather (temperature, condition, feels-like)
- Today's remaining calendar events
- Top news headlines (ticker)
- **No AI briefing** (conserve Gemini quota for morning/evening)

### Evening Mode — 4:00 PM to 9:00 PM
- Clock + Date (always)
- Tomorrow's weather forecast
- Tomorrow's calendar events
- Top news headlines (ticker)
- **AI Evening Briefing** (Gemini): Bangla recap of the day's top stories + what to expect tomorrow

### Night Mode — 9:00 PM to 6:00 AM
- Clock + Date (always)
- Minimal news ticker (low brightness theme)
- No AI briefing (conserve API calls, reduce screen noise)

---

## Always-On Elements (All Modes)
- **Clock** — live, updates every second, displayed in Bangla
- **Date** — day, month, year in Bangla (Bengali calendar optional stretch goal)
- **News ticker** — rotating Bangla headlines from RSS feeds

---

## Update Schedule

| Content | Frequency |
|---|---|
| Clock | Every 1 second |
| News RSS fetch | Every 15 minutes |
| Weather fetch | Every 30 minutes |
| Calendar sync | Every 30 minutes |
| AI Briefing (Morning) | Once at 6:00 AM |
| AI Briefing (Evening) | Once at 4:00 PM |
| Location detection | Once at startup |

---

## Startup Behavior

1. On boot, display a **splash screen** ("স্মার্ট মিরর" branding)
2. Backend initiates all data fetches in parallel: location, weather, news, calendar, AI briefing (if applicable to current mode)
3. Splash screen remains visible until **all data sources have responded** (success or failure — both count)
4. Once all responses are received, dismiss splash and render the appropriate mode
5. Any data source that failed on startup follows the graceful degradation rules below

---

## Graceful Degradation

**Universal rule:** When any data source fails, the mirror continues to display the **last successfully fetched data** with a visible "সর্বশেষ আপডেট: [timestamp]" (last updated) indicator. This applies to:

- **Weather** — show stale weather data + last updated timestamp
- **News** — show stale headlines + last updated timestamp
- **Calendar** — show stale events + last updated timestamp
- **AI Briefing** — show stale briefing + last updated timestamp. If Gemini returns poor quality or mixed-language Bangla, fall back to displaying **raw data** (weather summary + headlines) instead of the AI-generated text
- **Location** — use last known coordinates; if never detected, use a sensible default (Dhaka)

### RSS Feed Health
- Each RSS source is monitored independently
- If a feed fails, display a **visible indicator on the main display** showing which source is unavailable (e.g., "প্রথম আলো অনুপলব্ধ")
- Working feeds continue to supply headlines normally

---

## WebSocket Reliability

- Frontend auto-reconnects on WebSocket disconnect using **exponential backoff** (1s → 2s → 4s → 8s → max 30s)
- If disconnected for **more than 10 seconds**, display a visible **"সংযোগ বিচ্ছিন্ন" (disconnected) indicator** on screen
- Indicator disappears automatically on successful reconnection
- On reconnect, server pushes the latest data snapshot immediately

---

## Google Calendar Auth

- OAuth 2.0 tokens (access token + refresh token) are generated **during development** on a full machine
- Tokens are stored in `.env` and deployed to the Pi via git pull + manual `.env` setup
- **No runtime OAuth flow on the Pi** — no browser-based consent needed on the device
- Backend **auto-refreshes expired tokens** using the refresh token silently
- If refresh fails (e.g., token revoked), calendar section follows graceful degradation rules

---

## Logging

- Server writes logs to a file (errors + routine events: fetches, mode transitions, reconnects)
- **Log rotation:** keep only the **last 1 day** of logs, delete older automatically
- Log file location: `logs/` directory in project root

---

## Technical Architecture

```
Raspberry Pi Zero 2 W
├── Node.js Backend (Express + WebSocket)
│   ├── services/weather.js       — Open-Meteo API calls
│   ├── services/news.js          — RSS feed fetcher & parser
│   ├── services/calendar.js      — Google Calendar OAuth + auto-refresh
│   ├── services/ai-briefing.js   — Gemini API, generates Bangla briefing
│   ├── services/location.js      — ip-api.com auto-detect
│   ├── scheduler.js              — node-cron scheduled jobs
│   └── logger.js                 — file-based logging with 1-day rotation
└── Chromium Kiosk (Frontend)
    ├── public/index.html          — single page, all modes + splash screen
    ├── public/css/style.css       — responsive layout, mode themes
    └── public/js/app.js           — WebSocket client, DOM updates, reconnect logic
```

**Communication:** Node.js server pushes data to frontend via WebSocket.
Frontend never makes API calls directly — all data flows through the server.

---

## Project File Structure

```
smart-mirror/
├── REQUIREMENT.md
├── CLAUDE.md
├── package.json
├── .env                    (API keys + OAuth tokens — gitignored)
├── config/
│   └── config.json         (RSS URLs, time boundaries, settings)
├── logs/                   (auto-rotated, 1-day retention)
├── server/
│   ├── index.js
│   ├── scheduler.js
│   ├── logger.js
│   └── services/
│       ├── weather.js
│       ├── news.js
│       ├── calendar.js
│       ├── ai-briefing.js
│       └── location.js
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

---

## UI / Design Principles

- **Dark background** — required for mirror effect (only bright content shows through)
- **Bangla font** — Noto Sans Bengali (loaded via Google Fonts or local)
- **Responsive** — CSS flexbox/grid, no fixed pixel sizes
- **Minimal JS** — no React/Vue/Angular; plain DOM manipulation
- **Four themes** — morning (warm tones), afternoon (neutral tones), evening (cool tones), night (dim/minimal)
- **News ticker** — horizontal scrolling strip at bottom, always visible
- **Splash screen** — displayed on boot until all data sources respond
- **Status indicators** — stale data timestamps, disconnected banner, failed RSS source labels

---

## Out of Scope (v1)

- Bengali calendar (বাংলা তারিখ) — stretch goal
- Multiple user profiles
- Offline fallback content (graceful degradation with stale data is in scope; pre-cached offline content is not)
- OTA updates
- Touch or voice interaction
- Remote admin dashboard
- Authentication on the web server (local network trust model)

---

## Setup Requirements (one-time)

1. Install Node.js on Pi Zero 2 W
2. Set up Chromium autostart in kiosk mode pointing to `http://localhost:3000`
3. Create Google Cloud project → enable Calendar API → generate OAuth tokens on dev machine
4. Create Google AI Studio account → get Gemini API key (free)
5. Configure `.env` with: Gemini API key, Google OAuth access token, refresh token, client ID, client secret
6. Clone repo to Pi, set up `.env`, run `node server/index.js`

---

## Verification Plan

- Run `node server/index.js` — confirm server starts, WebSocket connects
- Open `http://localhost:3000` in browser — confirm splash screen appears, then transitions to mirror UI
- Open from another device on the same network — confirm it's accessible
- Manually trigger each mode (morning/afternoon/evening/night) by changing system clock
- Confirm RSS feeds parse and display in ticker
- Confirm failed RSS feed shows source-specific indicator on display
- Confirm weather loads based on auto-detected location
- Confirm Gemini generates Bangla briefing text; verify fallback to raw data on poor output
- Confirm Google Calendar events appear; verify token auto-refresh works
- Kill network → confirm stale data + "last updated" timestamps appear
- Kill WebSocket → confirm reconnect with backoff + disconnected indicator after 10s
- Check `logs/` directory → confirm logs are written and rotated after 1 day
- Test on different screen sizes (portrait + landscape)

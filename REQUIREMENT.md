# Project: স্মার্ট মিরর (Smart Mirror)

**Hardware:** Raspberry Pi Zero 2 W
**Language:** All display content in Bangla
**Stack:** Node.js (backend) + HTML/CSS/JS (frontend) + Chromium kiosk mode
**Interaction:** Passive display only — no touch, no voice, no input
**Screen:** Fully responsive — works on any screen size/orientation
**Cost constraint:** Zero extra cost — all APIs must be free

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

## Technical Architecture

```
Raspberry Pi Zero 2 W
├── Node.js Backend (Express + WebSocket)
│   ├── services/weather.js       — Open-Meteo API calls
│   ├── services/news.js          — RSS feed fetcher & parser
│   ├── services/calendar.js      — Google Calendar OAuth + fetch
│   ├── services/ai-briefing.js   — Gemini API, generates Bangla briefing
│   ├── services/location.js      — ip-api.com auto-detect
│   └── scheduler.js              — node-cron scheduled jobs
└── Chromium Kiosk (Frontend)
    ├── public/index.html          — single page, all modes
    ├── public/css/style.css       — responsive layout, mode themes
    └── public/js/app.js           — WebSocket client, DOM updates
```

**Communication:** Node.js server pushes data to frontend via WebSocket.
Frontend never makes API calls directly — all data flows through the server.

---

## Project File Structure

```
smart-mirror/
├── REQUIREMENT.md
├── package.json
├── .env                    (API keys — gitignored)
├── config/
│   └── config.json         (RSS URLs, time boundaries, settings)
├── server/
│   ├── index.js
│   ├── scheduler.js
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
- **Three themes** — morning (warm tones), evening (cool tones), night (dim/minimal)
- **News ticker** — horizontal scrolling strip at bottom, always visible

---

## Out of Scope (for now)
- Bengali calendar (বাংলা তারিখ) — stretch goal
- Multiple user profiles
- Offline fallback content
- OTA updates
- Touch or voice interaction

---

## Setup Requirements (one-time)
1. Install Node.js on Pi Zero 2 W
2. Set up Chromium autostart in kiosk mode
3. Create Google Cloud project → enable Calendar API → OAuth credentials
4. Create Google AI Studio account → get Gemini API key (free)
5. Configure `.env` with Gemini key + Google OAuth credentials

---

## Verification Plan
- Run `node server/index.js` — confirm server starts, WebSocket connects
- Open `http://localhost:3000` in browser — confirm Bangla UI renders
- Manually trigger each mode (morning/evening/night) by changing system clock
- Confirm RSS feeds parse and display in ticker
- Confirm weather loads based on auto-detected location
- Confirm Gemini generates Bangla briefing text
- Confirm Google Calendar events appear
- Test on different screen sizes (portrait + landscape)

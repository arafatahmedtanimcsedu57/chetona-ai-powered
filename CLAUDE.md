# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

স্মার্ট মিরর (Smart Mirror) — a passive display dashboard for Raspberry Pi Zero 2 W. All UI content is in Bangla. No user interaction (no touch/voice). Zero-cost API constraint.

## Commands

```bash
# Start the server
node server/index.js

# Verify in browser
open http://localhost:3000
```

No build step, no bundler, no transpilation — plain Node.js + static files.

## Architecture

**Communication model:** The Node.js backend fetches all external data and pushes it to the frontend via WebSocket. The frontend (`public/js/app.js`) never calls any API directly.

**Backend** (`server/`):

- `index.js` — Express server + WebSocket server setup
- `scheduler.js` — node-cron jobs (weather every 30min, news every 15min, calendar every 30min, AI briefings once at 6am/4pm, location once at startup)
- `services/weather.js` — Open-Meteo (no API key needed)
- `services/news.js` — RSS feed parser for Bangla news sources (Prothomalo, BBC Bangla, Kaler Kantho, Jugantor)
- `services/calendar.js` — Google Calendar via OAuth 2.0
- `services/ai-briefing.js` — Google Gemini 1.5 Flash; generates Bangla-language briefing text
- `services/location.js` — ip-api.com auto-detect (no API key needed)

**Frontend** (`public/`):

- Single HTML page with three visual themes: morning (warm), evening (cool), night (dim)
- Plain DOM manipulation — no React/Vue/Angular
- Noto Sans Bengali font for all Bangla text
- Dark background required for mirror effect
- Responsive via CSS flexbox/grid — no fixed pixel sizes

**Config:** `config/config.json` holds RSS URLs, time boundaries (morning: 6am–12pm, evening: 4pm–9pm, night: 9pm–6am), and other settings.

**Secrets:** `.env` holds `GEMINI_API_KEY` and Google OAuth credentials (gitignored).

## Display Modes

| Mode    | Hours    | Key content                                                   |
| ------- | -------- | ------------------------------------------------------------- |
| Morning | 6am–12pm | Weather, today's calendar, news ticker, AI morning briefing   |
| Evening | 4pm–9pm  | Tomorrow's weather/calendar, news ticker, AI evening briefing |
| Night   | 9pm–6am  | Clock, date, minimal news ticker only (no AI calls)           |

Clock and news ticker are always visible in all modes.

## APIs Used

| Service                 | Auth      | Rate limit             |
| ----------------------- | --------- | ---------------------- |
| Open-Meteo              | None      | Effectively unlimited  |
| ip-api.com              | None      | 45 req/min             |
| Google Gemini 1.5 Flash | API key   | 1500 req/day free tier |
| Google Calendar         | OAuth 2.0 | Free                   |
| RSS feeds               | None      | Per-site limits        |

## One-Time Setup (Pi deployment)

1. Install Node.js on Pi Zero 2 W
2. Configure Chromium autostart in kiosk mode pointing to `http://localhost:3000`
3. Google Cloud project → enable Calendar API → create OAuth credentials
4. Google AI Studio → get Gemini API key
5. Create `.env` with `GEMINI_API_KEY` and OAuth credentials

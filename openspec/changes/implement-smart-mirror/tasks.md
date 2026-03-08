## 1. Project Setup

- [ ] 1.1 Initialize package.json with dependencies: express, ws, node-cron, rss-parser, dotenv
- [ ] 1.2 Create .env.example with placeholder values for GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, PORT
- [ ] 1.3 Create .gitignore with node_modules/, .env, logs/
- [ ] 1.4 Create config/config.json with mode boundaries, schedule intervals, RSS feed URLs, weather defaults, calendar maxEvents, UI settings
- [ ] 1.5 Download and bundle Noto Sans Bengali font file locally in public/fonts/

## 2. Logger

- [ ] 2.1 Create server/logger.js with INFO, WARN, ERROR levels and format `[ISO8601] [LEVEL] message`
- [ ] 2.2 Implement auto-creation of logs/ directory on startup
- [ ] 2.3 Implement daily log rotation — delete previous day's log at midnight, keep only current day

## 3. Backend Core Server

- [ ] 3.1 Create server/index.js with Express server binding to 0.0.0.0:PORT serving public/ as static files
- [ ] 3.2 Attach WebSocket server (ws) to the HTTP server
- [ ] 3.3 Implement in-memory unified state object matching the UnifiedState schema from SPEC.md section 4.1
- [ ] 3.4 Implement WebSocket broadcast — push full unified state to all connected clients on every data update
- [ ] 3.5 Implement immediate state push to newly connected WebSocket clients
- [ ] 3.6 Implement mode determination logic — compare current time against configurable time boundaries from config.json

## 4. Location Service

- [ ] 4.1 Create server/services/location.js — fetch lat/lon/city from ip-api.com
- [ ] 4.2 Implement Dhaka fallback (lat: 23.8103, lon: 90.4125, city: "ঢাকা") on failure
- [ ] 4.3 Log success/failure of location detection

## 5. Weather Service

- [ ] 5.1 Create server/services/weather.js — fetch current conditions + tomorrow forecast from Open-Meteo API
- [ ] 5.2 Parse API response into WeatherData model (temperature, feelsLike, humidity, windSpeed, precipitationChance, weatherCode for current; tempMax, tempMin, precipitationChance, weatherCode for tomorrow)
- [ ] 5.3 Implement WMO weather code to Bangla condition string mapping (8 code groups)
- [ ] 5.4 Return null on failure for graceful degradation

## 6. News Service

- [ ] 6.1 Create server/services/news.js — fetch all configured RSS feeds using rss-parser with Promise.allSettled
- [ ] 6.2 Extract title, link, source (Bangla name from config), pubDate from each feed item
- [ ] 6.3 Merge headlines from all feeds, sort by pubDate descending
- [ ] 6.4 Implement per-feed health status tracking — return feedStatus array with ok/error per source
- [ ] 6.5 Return null (retain stale data) when all feeds fail

## 7. Calendar Service

- [ ] 7.1 Create server/services/calendar.js — fetch events from Google Calendar API using raw HTTP fetch
- [ ] 7.2 Implement OAuth token auto-refresh using refresh token from .env
- [ ] 7.3 Parse API response — extract title (summary) and startTime, order by startTime, limit to 5 events
- [ ] 7.4 Implement afternoon filtering — filter out events that have already ended when dateRange is "today" and mode is afternoon
- [ ] 7.5 Return null on failure for graceful degradation

## 8. AI Briefing Service

- [ ] 8.1 Create server/services/ai-briefing.js — call Gemini 1.5 Flash generateContent endpoint
- [ ] 8.2 Implement Bangla morning prompt template — include weather summary, calendar events, top 5 headlines, ask for 2-3 sentence briefing
- [ ] 8.3 Implement Bangla evening prompt template — include today's headlines, tomorrow's weather, tomorrow's calendar, ask for 2-3 sentence briefing
- [ ] 8.4 Parse Gemini response — extract text from candidates[0].content.parts[0].text
- [ ] 8.5 Return null on API error for graceful degradation (no quality detection, trust output)

## 9. Scheduler

- [ ] 9.1 Create server/scheduler.js — define cron jobs using node-cron
- [ ] 9.2 Schedule news fetch every 15 minutes (*/15 * * * *)
- [ ] 9.3 Schedule weather fetch every 30 minutes (*/30 * * * *)
- [ ] 9.4 Schedule calendar sync every 30 minutes (*/30 * * * *)
- [ ] 9.5 Schedule morning briefing at 6:00 AM (0 6 * * *)
- [ ] 9.6 Schedule evening briefing at 4:00 PM (0 16 * * *)
- [ ] 9.7 Schedule mode check every minute (* * * * *) — update state.mode on boundary crossing
- [ ] 9.8 Schedule log rotation at midnight (0 0 * * *)
- [ ] 9.9 Wrap each cron job in try/catch for error isolation — one failure does not affect others

## 10. Startup Orchestration

- [ ] 10.1 Implement startup sequence in index.js — load config, init logger, fetch location first
- [ ] 10.2 After location resolves, fetch weather + news + calendar in parallel using Promise.allSettled
- [ ] 10.3 After weather + news + calendar resolve, generate AI briefing if current mode is morning or evening
- [ ] 10.4 Assemble unified state with all results (success or error), determine mode, set startupComplete: true
- [ ] 10.5 Push state to all connected clients and start scheduler
- [ ] 10.6 Validate .env on startup — log warnings for missing keys, disable affected services

## 11. Frontend — HTML Structure

- [ ] 11.1 Create public/index.html — page skeleton with splash screen overlay, clock/date section, weather section, calendar section, briefing section, news ticker, disconnected banner, status indicator areas
- [ ] 11.2 Add @font-face for local Noto Sans Bengali font
- [ ] 11.3 Add script and stylesheet references

## 12. Frontend — Styles

- [ ] 12.1 Create public/css/style.css — base dark layout with CSS flexbox for main structure, CSS grid for weather/calendar side-by-side
- [ ] 12.2 Implement four mode themes using CSS custom properties (--bg-primary, --text-primary, --accent) for morning (warm amber), afternoon (neutral blue), evening (cool violet), night (ultra dim)
- [ ] 12.3 Implement splash screen styles — full-screen, centered text, fade-out animation (500ms)
- [ ] 12.4 Implement news ticker styles — single headline, opacity fade transition (500ms)
- [ ] 12.5 Implement disconnected banner — slide-down from top, semi-transparent red background
- [ ] 12.6 Implement stale data indicator styles — small dimmed text below sections
- [ ] 12.7 Implement failed RSS source indicator styles — small red-tinted text
- [ ] 12.8 Implement responsive breakpoint — stack weather/calendar vertically below 600px
- [ ] 12.9 Implement fluid font sizing with clamp() — clock (~8vw), date (~3vw), content (~2vw), ticker (~2.5vw), status (~1.5vw)
- [ ] 12.10 Implement theme transition — background-color and color transition 1s ease

## 13. Frontend — JavaScript

- [ ] 13.1 Create public/js/app.js — WebSocket client connecting to ws://{window.location.host}
- [ ] 13.2 Implement Bangla numeral conversion function (0-9 → ০-৯)
- [ ] 13.3 Implement live clock with setInterval(1000) using Bangla numerals, format HH:MM:SS
- [ ] 13.4 Implement Bangla date display — day name, DD month name YYYY in Bangla
- [ ] 13.5 Implement splash screen dismiss — fade out on first state_update with startupComplete: true
- [ ] 13.6 Implement mode-based rendering — show/hide weather, calendar, briefing sections based on state.mode
- [ ] 13.7 Implement theme class switching — set body class to mode-{mode} on state update
- [ ] 13.8 Implement weather section renderer — display temperature, condition, feels-like, humidity, wind, precipitation with Bangla numerals
- [ ] 13.9 Implement calendar section renderer — list events with title + start time in Bangla
- [ ] 13.10 Implement AI briefing section renderer — display briefing text when available
- [ ] 13.11 Implement news ticker — cycle headlines every 10s with fade transition, loop on end
- [ ] 13.12 Implement stale data indicators — show "সর্বশেষ আপডেট: HH:MM" when section status is "stale"
- [ ] 13.13 Implement failed RSS source indicators — show "{source} অনুপলব্ধ" for each failed feed
- [ ] 13.14 Implement WebSocket reconnect with exponential backoff (1s → 2s → 4s → 8s → 16s → 30s max), reset on success
- [ ] 13.15 Implement disconnected banner — show "সংযোগ বিচ্ছিন্ন" after 10s of disconnect, hide on reconnect

## 14. Integration Testing

- [ ] 14.1 Verify server starts and WebSocket connects on localhost:3000
- [ ] 14.2 Verify splash screen appears then transitions to mirror UI
- [ ] 14.3 Verify accessible from another device on local network
- [ ] 14.4 Test all four modes by adjusting system clock or config boundaries
- [ ] 14.5 Verify RSS feeds parse and display in ticker with fade transitions
- [ ] 14.6 Verify failed RSS feed shows source-specific indicator on display
- [ ] 14.7 Verify weather loads with auto-detected location, displays all fields
- [ ] 14.8 Verify Gemini generates Bangla briefing text
- [ ] 14.9 Verify Google Calendar events appear with token auto-refresh
- [ ] 14.10 Kill network → verify stale data + "সর্বশেষ আপডেট" timestamps appear
- [ ] 14.11 Kill WebSocket → verify reconnect with backoff + disconnected banner after 10s
- [ ] 14.12 Check logs/ directory → verify logs written and rotated after 1 day
- [ ] 14.13 Test responsive layout on portrait + landscape + narrow screens

## Why

The স্মার্ট মিরর (Smart Mirror) is a passive Bangla-language dashboard for Raspberry Pi Zero 2 W. It needs to be built from scratch — no code exists yet. The mirror displays weather, news, calendar events, and AI-generated briefings on a dark background optimized for mirror reflection, switching between four time-based display modes. All APIs are free-tier, and the system must run 24/7 unattended with graceful degradation.

## What Changes

- Create Node.js backend with Express + WebSocket server
- Implement five data services: location (ip-api.com), weather (Open-Meteo), news (RSS feeds), calendar (Google Calendar OAuth), AI briefing (Gemini 1.5 Flash)
- Implement cron-based scheduler for periodic data fetching
- Implement file-based logger with 1-day rotation
- Create single-page frontend with splash screen, four mode themes, Bangla clock/date, news ticker, and status indicators
- Implement WebSocket client with exponential backoff reconnection
- Create configuration system (config.json + .env)

## Capabilities

### New Capabilities
- `location-detection`: Auto-detect geographic coordinates via ip-api.com with Dhaka fallback
- `weather-service`: Fetch current conditions and tomorrow's forecast from Open-Meteo with Bangla weather code mapping
- `news-service`: Fetch and parse multiple Bangla RSS feeds with per-source health tracking
- `calendar-service`: Fetch Google Calendar events with OAuth token auto-refresh
- `ai-briefing-service`: Generate Bangla morning/evening briefings via Gemini 1.5 Flash
- `scheduler`: Cron-based scheduling for all data fetches and mode transitions
- `websocket-communication`: Unified state push from server to frontend with reconnection logic
- `display-modes`: Four time-based modes (morning/afternoon/evening/night) with mode-specific content and theming
- `frontend-renderer`: Single-page DOM renderer with splash screen, Bangla clock, news ticker, status indicators
- `logging`: File-based logging with daily rotation and 1-day retention
- `startup-orchestration`: Parallel data fetch on boot with splash screen until all sources respond

### Modified Capabilities

(none — greenfield project)

## Impact

- **New files:** ~12 files across server/, public/, config/
- **Dependencies:** express, ws, node-cron, rss-parser, dotenv
- **External APIs:** Open-Meteo, ip-api.com, Google Gemini, Google Calendar, 4 RSS feeds
- **Environment:** Requires .env with Gemini API key and Google OAuth tokens
- **Deployment:** Raspberry Pi Zero 2 W with Chromium kiosk mode

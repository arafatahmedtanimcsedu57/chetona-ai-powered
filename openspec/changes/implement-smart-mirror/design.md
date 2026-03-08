## Context

Greenfield project — no existing code. Building a passive Bangla-language smart mirror dashboard for Raspberry Pi Zero 2 W. The Pi runs Chromium in kiosk mode pointing to a local Node.js server. All external data is fetched server-side and pushed to the frontend via WebSocket. The system must run 24/7 unattended with zero-cost APIs.

Constraints:
- Pi Zero 2 W: 512MB RAM, single-core ARM — must be lightweight
- No build tools, no bundler, no transpilation — plain Node.js + static files
- No user interaction — passive display only
- All APIs must be free tier
- All UI text in Bangla

## Goals / Non-Goals

**Goals:**
- Reliable 24/7 operation with graceful degradation on any service failure
- Clean separation: backend fetches data, frontend only renders
- Minimal memory footprint suitable for Pi Zero 2 W
- Four time-based display modes with smooth theme transitions
- All data flows through a single unified state object via WebSocket

**Non-Goals:**
- Multi-user support or authentication
- Offline-first architecture (stale data with timestamps is sufficient)
- Touch/voice interaction
- Remote administration
- Bengali calendar (stretch goal, not in v1)

## Decisions

### 1. Unified State Push vs. Granular Messages
**Decision:** Server pushes the entire state object on every update.
**Rationale:** The total payload is small (<5KB). A single state object simplifies the frontend to a pure renderer — it receives state and renders, no merging logic needed. On a Pi with localhost WebSocket, bandwidth is not a concern.
**Alternative considered:** Per-source messages (weather_update, news_update). Rejected because it adds state merging complexity on the frontend for negligible bandwidth savings.

### 2. Server-Side Mode Determination
**Decision:** Server determines the active display mode and includes it in the state.
**Rationale:** Single source of truth. Frontend is a dumb renderer. If mode logic needs to change (e.g., configurable time boundaries), it changes in one place. Also enables future override capability.
**Alternative considered:** Client-side mode detection based on local clock. Rejected because it splits logic across client/server and could drift.

### 3. Raw HTTP Fetch vs. googleapis NPM Package for Calendar
**Decision:** Use raw HTTP fetch with manual token refresh.
**Rationale:** The `googleapis` package is ~50MB installed — too heavy for Pi Zero 2 W with 512MB RAM. We only need one endpoint (list events) and one token refresh call. Raw fetch with 4 lines of token refresh logic is sufficient.
**Alternative considered:** googleapis npm package. Rejected due to install size and memory overhead on constrained hardware.

### 4. rss-parser for RSS Feeds
**Decision:** Use the `rss-parser` npm package.
**Rationale:** Lightweight, well-maintained, handles various RSS/Atom formats. Parsing RSS XML manually is error-prone across different feed implementations.
**Alternative considered:** Manual XML parsing with fast-xml-parser. Rejected — rss-parser handles edge cases better.

### 5. Local Noto Sans Bengali Font
**Decision:** Bundle Noto Sans Bengali locally rather than loading from Google Fonts CDN.
**Rationale:** The Pi may have slow/unreliable internet. A CDN font dependency on page load means the mirror could show unstyled text or squares on boot. Local font (~500KB) guarantees Bangla text renders immediately.
**Alternative considered:** Google Fonts CDN. Rejected due to boot reliability concern.

### 6. Simple File Logger vs. Winston/Pino
**Decision:** Custom file logger using Node.js fs module.
**Rationale:** Only needs three levels (INFO, WARN, ERROR), one output (file), and daily rotation (delete previous day). A logging library adds unnecessary dependency weight. The implementation is ~30 lines.
**Alternative considered:** Winston or Pino. Rejected — overkill for the requirements.

### 7. CSS-Only Theme Transitions
**Decision:** Mode theme changes use CSS custom properties on the body class, with CSS transitions for smooth switching.
**Rationale:** No JS animation overhead. CSS handles the color transitions natively. Four theme classes (`mode-morning`, `mode-afternoon`, `mode-evening`, `mode-night`) with CSS variables keep theming declarative and simple.

### 8. News Ticker — Single Headline Fade
**Decision:** Display one headline at a time with a 10-second interval and CSS opacity fade transition.
**Rationale:** Simpler than continuous scroll. Easier to read on a glanced-at mirror. CSS fade is lightweight and smooth.
**Alternative considered:** Continuous CSS marquee scroll. Rejected — harder to read at a glance.

### 9. Startup Orchestration — Location First, Then Parallel
**Decision:** Fetch location first (weather depends on coordinates), then fetch weather, news, calendar, and AI briefing in parallel.
**Rationale:** Weather needs lat/lon from location. AI briefing needs weather + news + calendar data. So the dependency chain is: location → [weather, news, calendar] (parallel) → AI briefing (if applicable). This minimizes startup time while respecting dependencies.

### 10. Gemini Prompt in Bangla
**Decision:** Send prompts to Gemini in Bangla, trust the response as-is.
**Rationale:** Bangla prompts produce Bangla responses naturally. No quality detection or language checking — only fall back on API errors (timeout, HTTP errors, rate limits).

## Risks / Trade-offs

**[Risk] Google OAuth refresh token expires or gets revoked**
→ Mitigation: Calendar section degrades gracefully (shows stale data + timestamp). User must regenerate token on dev machine and redeploy .env. Consider documenting the re-auth steps.

**[Risk] RSS feed URLs change without notice**
→ Mitigation: Per-feed health tracking with on-screen indicators. User sees which source is down. Feed URLs are configurable in config.json — no code change needed to swap.

**[Risk] Pi Zero 2 W memory constraints**
→ Mitigation: No heavy dependencies (no googleapis, no logging frameworks). Unified state object is small. Frontend uses plain DOM manipulation, no framework overhead. Monitor with `process.memoryUsage()` during testing.

**[Risk] ip-api.com rate limit (45/min) on repeated restarts**
→ Mitigation: Location is fetched once at startup only. Even with multiple restarts during development, unlikely to hit the limit. Dhaka fallback ensures weather still works if blocked.

**[Risk] Gemini free tier rate limit (1500/day)**
→ Mitigation: Only 2 calls/day (6am + 4pm). Well within limits. Even with restarts triggering additional calls, budget is safe.

**[Trade-off] No process manager in spec**
→ The spec doesn't mandate pm2 or systemd. If the Node.js process crashes, the mirror goes dark until manual restart. Recommend adding a systemd service file for production Pi deployment, but this is deployment configuration, not application code.

**[Trade-off] No HTTPS**
→ Server runs on local network without TLS. Acceptable for a home mirror with no sensitive data displayed. Calendar event titles are the only semi-private data, transmitted over localhost or LAN only.

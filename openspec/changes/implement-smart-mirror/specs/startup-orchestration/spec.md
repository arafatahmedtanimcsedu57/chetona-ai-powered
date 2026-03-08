## ADDED Requirements

### Requirement: Splash screen on boot
The frontend SHALL display a splash screen with centered "স্মার্ট মিরর" text on a dark background when the page loads. The splash screen SHALL remain visible until the first `state_update` with `startupComplete: true` is received.

#### Scenario: Splash screen visible on load
- **WHEN** the frontend page loads
- **THEN** a full-screen splash screen with "স্মার্ট মিরর" branding is displayed

#### Scenario: Splash screen dismissed on startup complete
- **WHEN** the first WebSocket message with `startupComplete: true` is received
- **THEN** the splash screen fades out over 500ms and the mirror UI is revealed

### Requirement: Parallel data fetching on startup
The backend SHALL fetch location first (weather depends on coordinates), then fetch weather, news, and calendar in parallel. If the current mode requires an AI briefing, it SHALL be generated after weather, news, and calendar have all responded.

#### Scenario: Startup fetch order
- **WHEN** the server starts
- **THEN** location is fetched first, then weather + news + calendar are fetched in parallel, then AI briefing is generated (if applicable)

### Requirement: Wait for all data sources to respond
The backend SHALL NOT set `startupComplete: true` until all data sources have responded (success or failure). Both successful responses and errors count as "responded."

#### Scenario: All sources respond with mixed results
- **WHEN** location succeeds, weather succeeds, news succeeds, calendar fails with an error
- **THEN** `startupComplete` is set to true because all sources have responded (calendar's error counts as a response)

#### Scenario: Slow service delays startup completion
- **WHEN** weather takes 15 seconds to respond while other services respond in 2 seconds
- **THEN** `startupComplete` remains false until the weather response arrives at 15 seconds

### Requirement: Failed services follow degradation rules on startup
Any data source that fails during startup SHALL be marked with `status: "error"` in the unified state. The stale data + "last updated" indicator rules apply from the first render.

#### Scenario: Calendar fails on startup
- **WHEN** calendar service returns an error during startup
- **THEN** `state.calendar.status` is "error", `state.calendar.events` is an empty array, and the calendar section shows the stale data indicator on first render

### Requirement: Express serves static files
The server SHALL serve the `public/` directory as static files via Express. The root route (`/`) SHALL serve `public/index.html`.

#### Scenario: Browser loads the mirror UI
- **WHEN** a browser navigates to `http://{server-ip}:3000`
- **THEN** `public/index.html` is served along with CSS and JS assets

### Requirement: Server binds to all interfaces
The Express server SHALL bind to `0.0.0.0` so the mirror UI is accessible from any device on the local network.

#### Scenario: Access from another device
- **WHEN** a phone on the same WiFi network navigates to `http://{pi-ip}:3000`
- **THEN** the mirror UI loads successfully

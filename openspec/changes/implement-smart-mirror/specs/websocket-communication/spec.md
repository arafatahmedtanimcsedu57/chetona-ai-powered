## ADDED Requirements

### Requirement: Unified state push on every update
The server SHALL push the complete unified state object to all connected WebSocket clients whenever any data source updates. The message format SHALL be `{ type: "state_update", data: UnifiedState }`.

#### Scenario: Weather update triggers full state push
- **WHEN** the weather service returns new data
- **THEN** the server assembles the full unified state and sends it to all connected WebSocket clients

#### Scenario: New client connects
- **WHEN** a new WebSocket client connects to the server
- **THEN** the server immediately pushes the current unified state to that client

### Requirement: No client-to-server messages
The WebSocket communication SHALL be unidirectional — server to client only. The frontend SHALL NOT send any messages to the server.

#### Scenario: Frontend is receive-only
- **WHEN** the WebSocket connection is established
- **THEN** the frontend only listens for messages and never sends data to the server

### Requirement: Frontend auto-reconnect with exponential backoff
The frontend SHALL automatically reconnect on WebSocket disconnect using exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s maximum.

#### Scenario: WebSocket disconnects
- **WHEN** the WebSocket connection closes unexpectedly
- **THEN** the frontend attempts to reconnect after 1 second, then 2 seconds, then 4 seconds, doubling each time up to a maximum of 30 seconds

#### Scenario: Successful reconnect resets backoff
- **WHEN** a reconnection attempt succeeds
- **THEN** the backoff timer resets to 1 second for future disconnects

### Requirement: Disconnected indicator after 10 seconds
The frontend SHALL display a visible "সংযোগ বিচ্ছিন্ন" (disconnected) banner if the WebSocket remains disconnected for more than 10 seconds.

#### Scenario: Disconnected for more than 10 seconds
- **WHEN** the WebSocket has been disconnected for more than 10 seconds
- **THEN** a "সংযোগ বিচ্ছিন্ন" banner slides down from the top of the screen with a semi-transparent red background

#### Scenario: Reconnection hides banner
- **WHEN** the WebSocket reconnects successfully while the disconnected banner is visible
- **THEN** the banner disappears immediately

### Requirement: Server pushes latest state on reconnect
The server SHALL push the full current state snapshot immediately when a client reconnects.

#### Scenario: Client reconnects after outage
- **WHEN** a previously disconnected client reconnects
- **THEN** the server sends the complete current unified state so the frontend is immediately up to date

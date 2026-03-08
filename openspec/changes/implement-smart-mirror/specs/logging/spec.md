## ADDED Requirements

### Requirement: File-based logging with three levels
The system SHALL write logs to a file with three levels: INFO, WARN, and ERROR. Log format SHALL be `[ISO8601 timestamp] [LEVEL] message`.

#### Scenario: Info log entry
- **WHEN** a weather fetch succeeds
- **THEN** the logger writes `[2026-03-08T10:30:00.000Z] [INFO] Weather fetch successful` to the log file

#### Scenario: Error log entry
- **WHEN** an RSS feed fetch fails
- **THEN** the logger writes `[2026-03-08T10:30:00.000Z] [ERROR] RSS fetch failed for কালের কণ্ঠ — ETIMEDOUT` to the log file

### Requirement: Log file location
Logs SHALL be written to `logs/smart-mirror.log` in the project root. The `logs/` directory SHALL be created automatically if it does not exist.

#### Scenario: Logs directory auto-created
- **WHEN** the server starts and no `logs/` directory exists
- **THEN** the system creates the `logs/` directory and begins writing to `logs/smart-mirror.log`

### Requirement: Daily log rotation with 1-day retention
The system SHALL keep only the current day's log file. At midnight (00:00), the existing log file SHALL be deleted and a new one started.

#### Scenario: Midnight rotation
- **WHEN** the system clock reaches 00:00
- **THEN** the existing `logs/smart-mirror.log` is deleted and a new empty log file is started

#### Scenario: Only one day of logs retained
- **WHEN** the server has been running for 3 days
- **THEN** only the current day's log entries exist in `logs/smart-mirror.log`

### Requirement: Log events for key operations
The system SHALL log the following events:
- Successful and failed data fetches (all services)
- Mode transitions
- WebSocket client connections and disconnections
- Startup completion
- Token refresh attempts (success/failure)

#### Scenario: Mode transition logged
- **WHEN** the mode changes from morning to afternoon
- **THEN** the logger writes `[timestamp] [INFO] Mode transition: morning → afternoon`

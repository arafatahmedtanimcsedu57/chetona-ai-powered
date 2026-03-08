## ADDED Requirements

### Requirement: Cron-based data fetch scheduling
The system SHALL use node-cron to schedule periodic data fetches for weather (every 30 min), news (every 15 min), calendar (every 30 min), morning briefing (6:00 AM), and evening briefing (4:00 PM).

#### Scenario: News cron fires every 15 minutes
- **WHEN** 15 minutes have elapsed
- **THEN** the scheduler triggers a news fetch from all configured RSS feeds

#### Scenario: Weather cron fires every 30 minutes
- **WHEN** 30 minutes have elapsed
- **THEN** the scheduler triggers a weather fetch using stored coordinates

#### Scenario: Calendar cron fires every 30 minutes
- **WHEN** 30 minutes have elapsed
- **THEN** the scheduler triggers a calendar event fetch for the appropriate day

#### Scenario: Morning briefing cron fires at 6:00 AM
- **WHEN** the system clock reaches 06:00
- **THEN** the scheduler triggers an AI morning briefing generation

#### Scenario: Evening briefing cron fires at 4:00 PM
- **WHEN** the system clock reaches 16:00
- **THEN** the scheduler triggers an AI evening briefing generation

### Requirement: Mode transition check every minute
The system SHALL check every minute whether the current time has crossed a mode boundary. If a transition is detected, the mode SHALL be updated in the unified state and pushed to all clients.

#### Scenario: Mode boundary crossed
- **WHEN** the current time crosses from morning (before 12:00) to afternoon (12:00)
- **THEN** the system updates `state.mode` to "afternoon" and pushes the updated state to all WebSocket clients

### Requirement: Scheduler error isolation
Each cron job SHALL be independent. A failure in one job SHALL NOT affect other scheduled jobs.

#### Scenario: News fetch fails during cron
- **WHEN** the news RSS fetch throws an error during a scheduled run
- **THEN** the error is logged and the next scheduled weather/calendar fetch still executes normally

### Requirement: Log rotation at midnight
The system SHALL delete the previous day's log file at midnight (00:00) and start a fresh log.

#### Scenario: Midnight log rotation
- **WHEN** the system clock reaches 00:00
- **THEN** the existing log file is deleted and a new log file is created

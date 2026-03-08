## ADDED Requirements

### Requirement: Fetch Google Calendar events
The system SHALL fetch events from the user's primary Google Calendar for a specified date range (today or tomorrow). Events SHALL include title (summary) and start time only.

#### Scenario: Fetch today's events
- **WHEN** calendar service is called with dateRange "today"
- **THEN** the system returns up to 5 events for the current day, each with `{ title, startTime }`, ordered by start time

#### Scenario: Fetch tomorrow's events
- **WHEN** calendar service is called with dateRange "tomorrow"
- **THEN** the system returns up to 5 events for the next day, each with `{ title, startTime }`, ordered by start time

#### Scenario: Calendar fetch failure
- **WHEN** Google Calendar API is unreachable or returns an error
- **THEN** the system returns null, retains last successful calendar data, and marks calendar status as "stale"

### Requirement: Maximum 5 events displayed
The system SHALL return a maximum of 5 calendar events per fetch.

#### Scenario: More than 5 events exist
- **WHEN** the user's calendar has more than 5 events for the target day
- **THEN** only the first 5 events (by start time) are returned

### Requirement: Filter past events in afternoon mode
The system SHALL filter out events that have already ended when serving calendar data for afternoon mode (12:00 PM - 4:00 PM).

#### Scenario: Afternoon event filtering
- **WHEN** the current mode is afternoon and some of today's events have already ended
- **THEN** only future and currently-in-progress events are included in the response (up to 5)

### Requirement: OAuth token auto-refresh
The system SHALL automatically refresh the Google OAuth access token using the stored refresh token when the access token expires.

#### Scenario: Token expired and refresh succeeds
- **WHEN** the access token has expired and a calendar fetch is triggered
- **THEN** the system requests a new access token using the refresh token, updates the in-memory token, and proceeds with the calendar API call transparently

#### Scenario: Token refresh fails
- **WHEN** the refresh token is revoked or the token refresh request fails
- **THEN** the system logs an error and calendar section degrades gracefully (stale data + timestamp)

### Requirement: Calendar credentials from environment
The system SHALL read Google OAuth credentials (client ID, client secret, refresh token) from environment variables. No runtime OAuth browser flow SHALL exist.

#### Scenario: Credentials loaded from .env
- **WHEN** the server starts
- **THEN** GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are read from .env

### Requirement: Calendar fetch schedule
The system SHALL sync calendar events every 30 minutes via cron.

#### Scenario: Periodic calendar sync
- **WHEN** 30 minutes have elapsed since the last fetch
- **THEN** the system fetches calendar events for the appropriate day and updates the unified state

## ADDED Requirements

### Requirement: Fetch headlines from multiple RSS feeds
The system SHALL fetch and parse RSS feeds from all sources configured in config.json. Each feed SHALL be fetched independently using Promise.allSettled.

#### Scenario: All feeds succeed
- **WHEN** all configured RSS feeds respond successfully
- **THEN** the system returns a merged list of headlines sorted by publication date (newest first) with each headline containing `{ title, link, source, pubDate }`

#### Scenario: Partial feed failure
- **WHEN** some RSS feeds fail and others succeed
- **THEN** the system returns headlines from working feeds and marks failed feeds in `feedStatus` with `{ source, status: "error", error: message }`

#### Scenario: All feeds fail
- **WHEN** all RSS feeds are unreachable
- **THEN** the system retains the last successful headlines and marks news status as "stale"

### Requirement: Per-source health tracking
The system SHALL track the health status of each RSS feed independently and include per-source status in the unified state.

#### Scenario: Feed status in state
- **WHEN** news data is assembled into the unified state
- **THEN** `state.news.feedStatus` contains an array of `{ source: string, status: "ok"|"error", error?: string }` for each configured feed

### Requirement: Failed RSS source indicator on display
The system SHALL display a visible indicator on the main display for each RSS source that has failed, showing the source name followed by "অনুপলব্ধ".

#### Scenario: One feed is down
- **WHEN** the Prothomalo RSS feed fails but others work
- **THEN** the display shows "প্রথম আলো অনুপলব্ধ" in the news section area

### Requirement: News fetch schedule
The system SHALL fetch news from all RSS sources every 15 minutes via cron.

#### Scenario: Periodic news refresh
- **WHEN** 15 minutes have elapsed since the last fetch
- **THEN** the system fetches all configured RSS feeds and updates the unified state

### Requirement: Default RSS feed configuration
The system SHALL be configured with four default Bangla news sources: Prothomalo, BBC Bangla, Kaler Kantho, and Jugantor.

#### Scenario: Default feeds in config
- **WHEN** the system starts with the default config.json
- **THEN** four RSS feed URLs are configured with Bangla source names

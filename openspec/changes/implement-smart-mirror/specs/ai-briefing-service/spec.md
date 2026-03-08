## ADDED Requirements

### Requirement: Generate morning briefing in Bangla
The system SHALL generate a morning briefing at 6:00 AM using Google Gemini 1.5 Flash. The prompt SHALL be written in Bangla and include current weather summary, today's calendar events, and top news headlines. The response SHALL be 2-3 sentences.

#### Scenario: Successful morning briefing generation
- **WHEN** the morning briefing cron fires at 6:00 AM and weather, calendar, and news data are available
- **THEN** the system sends a Bangla prompt to Gemini including weather, calendar, and news data, and stores the generated Bangla text in `state.briefing`

#### Scenario: Morning briefing with partial data
- **WHEN** some data sources are unavailable at briefing time (e.g., calendar failed)
- **THEN** the system generates the briefing with whatever data is available, omitting unavailable sections from the prompt

### Requirement: Generate evening briefing in Bangla
The system SHALL generate an evening briefing at 4:00 PM using Google Gemini 1.5 Flash. The prompt SHALL be written in Bangla and include today's top news headlines, tomorrow's weather forecast, and tomorrow's calendar events. The response SHALL be 2-3 sentences.

#### Scenario: Successful evening briefing generation
- **WHEN** the evening briefing cron fires at 4:00 PM and data is available
- **THEN** the system sends a Bangla prompt to Gemini and stores the generated Bangla text in `state.briefing`

### Requirement: Trust Gemini output
The system SHALL trust the Gemini response as-is without quality detection or language validation. Fallback to raw data SHALL only occur on API errors.

#### Scenario: Gemini returns valid response
- **WHEN** Gemini API returns an HTTP 200 with generated text
- **THEN** the system uses the response text directly without validation

#### Scenario: Gemini API error
- **WHEN** Gemini API returns an error (timeout, HTTP 500, rate limit 429)
- **THEN** the system logs the error, retains the last successful briefing, and marks briefing status as "stale"

### Requirement: Gemini API key from environment
The system SHALL read the Gemini API key from the GEMINI_API_KEY environment variable.

#### Scenario: API key loaded
- **WHEN** the server starts
- **THEN** GEMINI_API_KEY is read from .env and used for all Gemini API calls

### Requirement: No AI briefing in afternoon or night mode
The system SHALL NOT generate AI briefings during afternoon (12:00 PM - 4:00 PM) or night (9:00 PM - 6:00 AM) modes to conserve Gemini API quota.

#### Scenario: No briefing generation outside scheduled times
- **WHEN** the system is in afternoon or night mode
- **THEN** no Gemini API calls are made

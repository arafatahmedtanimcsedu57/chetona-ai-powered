## ADDED Requirements

### Requirement: Four time-based display modes
The system SHALL support four display modes: morning (6:00 AM - 12:00 PM), afternoon (12:00 PM - 4:00 PM), evening (4:00 PM - 9:00 PM), and night (9:00 PM - 6:00 AM). Mode boundaries SHALL be configurable in config.json.

#### Scenario: Morning mode active
- **WHEN** the current time is between 6:00 AM and 11:59 AM
- **THEN** the system sets `state.mode` to "morning"

#### Scenario: Afternoon mode active
- **WHEN** the current time is between 12:00 PM and 3:59 PM
- **THEN** the system sets `state.mode` to "afternoon"

#### Scenario: Evening mode active
- **WHEN** the current time is between 4:00 PM and 8:59 PM
- **THEN** the system sets `state.mode` to "evening"

#### Scenario: Night mode active
- **WHEN** the current time is between 9:00 PM and 5:59 AM
- **THEN** the system sets `state.mode` to "night"

### Requirement: Morning mode content
Morning mode SHALL display: clock, date, current weather (temperature, condition, feels-like, humidity, wind speed, precipitation chance), today's calendar events (title + start time, max 5), news ticker, and AI morning briefing.

#### Scenario: Morning mode renders all sections
- **WHEN** the display is in morning mode
- **THEN** clock, date, current weather, today's calendar, news ticker, and AI briefing sections are all visible

### Requirement: Afternoon mode content
Afternoon mode SHALL display: clock, date, current weather, today's remaining calendar events (filtered, max 5), and news ticker. No AI briefing SHALL be shown.

#### Scenario: Afternoon mode renders without briefing
- **WHEN** the display is in afternoon mode
- **THEN** clock, date, current weather, filtered calendar, and news ticker are visible, and the AI briefing section is hidden

### Requirement: Evening mode content
Evening mode SHALL display: clock, date, tomorrow's weather forecast, tomorrow's calendar events (max 5), news ticker, and AI evening briefing.

#### Scenario: Evening mode renders tomorrow's data
- **WHEN** the display is in evening mode
- **THEN** clock, date, tomorrow's weather, tomorrow's calendar, news ticker, and AI briefing sections are visible

### Requirement: Night mode content
Night mode SHALL display: clock, date, and a minimal dimmed news ticker only. Weather, calendar, and AI briefing sections SHALL be hidden.

#### Scenario: Night mode minimal display
- **WHEN** the display is in night mode
- **THEN** only clock, date, and a dimmed news ticker are visible

### Requirement: Four visual themes
Each mode SHALL have a distinct color theme applied via CSS class on the body element. Morning uses warm amber tones, afternoon uses neutral sky blue, evening uses cool violet, night uses ultra-dim tones. All backgrounds SHALL be dark for mirror reflection.

#### Scenario: Theme class applied on mode change
- **WHEN** the mode changes from morning to afternoon
- **THEN** the body CSS class changes from `mode-morning` to `mode-afternoon` with a 1-second ease transition

### Requirement: Configurable time boundaries
Mode time boundaries SHALL be configurable in config.json under `modes` object with `start` and `end` times in "HH:MM" format.

#### Scenario: Custom time boundaries
- **WHEN** config.json sets morning end to "11:00" instead of "12:00"
- **THEN** the system transitions from morning to afternoon at 11:00 AM

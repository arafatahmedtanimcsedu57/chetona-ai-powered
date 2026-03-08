## ADDED Requirements

### Requirement: Live Bangla clock
The frontend SHALL display a live clock that updates every second. All digits SHALL be displayed in Bangla numerals (০-৯). Format: HH:MM:SS.

#### Scenario: Clock displays Bangla numerals
- **WHEN** the current time is 10:30:45
- **THEN** the clock displays "১০:৩০:৪৫"

#### Scenario: Clock updates every second
- **WHEN** 1 second elapses
- **THEN** the clock display updates to reflect the current time

### Requirement: Bangla date display
The frontend SHALL display the current date in Bangla format: "দিনের_নাম, DD মাসের_নাম YYYY" with Bangla numerals.

#### Scenario: Date in Bangla
- **WHEN** the current date is Saturday, March 8, 2026
- **THEN** the date displays "শনিবার, ০৮ মার্চ ২০২৬"

### Requirement: News ticker with fade transition
The frontend SHALL display one news headline at a time with a 10-second interval. Headlines SHALL transition using a CSS opacity fade (500ms). Headlines cycle through all available headlines and loop back to the start.

#### Scenario: Headline transitions
- **WHEN** a headline has been displayed for 10 seconds
- **THEN** it fades out over 500ms and the next headline fades in over 500ms

#### Scenario: Headlines loop
- **WHEN** the last headline in the list has been displayed
- **THEN** the ticker loops back to the first headline

### Requirement: Stale data indicator
For each data section (weather, news, calendar, briefing), if the status is "stale", the frontend SHALL display "সর্বশেষ আপডেট: HH:MM" in small, dimmed text below the affected section.

#### Scenario: Stale weather display
- **WHEN** `state.weather.status` is "stale" and `state.weather.updatedAt` is "2026-03-08T10:00:00.000Z"
- **THEN** text "সর্বশেষ আপডেট: ১০:০০" appears below the weather section in small dimmed text with Bangla numerals

### Requirement: Weather section rendering
The frontend SHALL render weather data showing temperature, condition, feels-like, humidity, wind speed, and precipitation chance. Morning and afternoon modes show current weather. Evening mode shows tomorrow's forecast.

#### Scenario: Current weather in morning mode
- **WHEN** the mode is morning and weather data is available
- **THEN** the weather section displays temperature (°C), condition (Bangla), feels-like, humidity (%), wind speed (km/h), and precipitation chance (%) with all numbers in Bangla numerals

### Requirement: Calendar section rendering
The frontend SHALL render calendar events showing title and start time only. Maximum 5 events displayed.

#### Scenario: Calendar events displayed
- **WHEN** 3 calendar events are available
- **THEN** 3 events are listed with Bangla title and start time in Bangla numerals

### Requirement: AI briefing section rendering
The frontend SHALL render the AI briefing text when available in morning and evening modes. The briefing section SHALL be hidden in afternoon and night modes.

#### Scenario: Briefing displayed in morning mode
- **WHEN** the mode is morning and briefing text is available
- **THEN** the briefing text is displayed in the briefing section

#### Scenario: Briefing hidden in afternoon mode
- **WHEN** the mode is afternoon
- **THEN** the briefing section is not rendered

### Requirement: Dark background for mirror effect
The frontend SHALL always use a dark background color. Bright content on dark background is required for two-way mirror reflection.

#### Scenario: Dark background in all modes
- **WHEN** any mode is active
- **THEN** the page background is a dark color (#000000 to #1a1a2e range)

### Requirement: Responsive layout
The frontend SHALL use CSS flexbox and grid for layout. No fixed pixel widths on containers. Font sizes SHALL use clamp() for fluid scaling. On screens narrower than 600px, weather and calendar sections SHALL stack vertically.

#### Scenario: Narrow screen layout
- **WHEN** the viewport width is less than 600px
- **THEN** weather and calendar sections stack vertically instead of side-by-side

### Requirement: Noto Sans Bengali font
The frontend SHALL use the Noto Sans Bengali font loaded locally via @font-face for all Bangla text.

#### Scenario: Font loads without internet
- **WHEN** the Pi has no internet and the page loads from local server
- **THEN** Bangla text renders correctly using the locally bundled Noto Sans Bengali font

### Requirement: Bangla numeral conversion
All numeric values displayed on the frontend SHALL be converted from Western digits (0-9) to Bangla digits (০-৯).

#### Scenario: Temperature in Bangla numerals
- **WHEN** the temperature is 28
- **THEN** it displays as "২৮"

## ADDED Requirements

### Requirement: Fetch current weather conditions
The system SHALL fetch current weather from Open-Meteo API including temperature (°C), feels-like temperature (°C), relative humidity (%), wind speed (km/h), precipitation probability (%), and weather condition code.

#### Scenario: Successful current weather fetch
- **WHEN** weather service is called with valid lat/lon coordinates
- **THEN** the system returns current weather data with all fields populated and weather code mapped to a Bangla condition string

#### Scenario: Weather fetch failure
- **WHEN** Open-Meteo API is unreachable or returns an error
- **THEN** the system returns null, retains the last successful weather data in state, and marks weather status as "stale"

### Requirement: Fetch tomorrow's forecast
The system SHALL fetch tomorrow's weather forecast including max temperature (°C), min temperature (°C), weather condition code, and precipitation probability (%).

#### Scenario: Tomorrow forecast available in state
- **WHEN** weather data is successfully fetched
- **THEN** `state.weather.tomorrow` contains `{ tempMax, tempMin, condition, precipitationChance, weatherCode }`

### Requirement: Bangla weather code mapping
The system SHALL map WMO weather codes to Bangla condition strings.

#### Scenario: Weather code 0
- **WHEN** weather code is 0
- **THEN** condition string is "পরিষ্কার আকাশ"

#### Scenario: Weather code 1, 2, 3
- **WHEN** weather code is 1, 2, or 3
- **THEN** condition string is "আংশিক মেঘলা"

#### Scenario: Weather code 45, 48
- **WHEN** weather code is 45 or 48
- **THEN** condition string is "কুয়াশা"

#### Scenario: Weather code 51, 53, 55
- **WHEN** weather code is 51, 53, or 55
- **THEN** condition string is "গুঁড়ি গুঁড়ি বৃষ্টি"

#### Scenario: Weather code 61, 63, 65
- **WHEN** weather code is 61, 63, or 65
- **THEN** condition string is "বৃষ্টি"

#### Scenario: Weather code 71, 73, 75
- **WHEN** weather code is 71, 73, or 75
- **THEN** condition string is "তুষারপাত"

#### Scenario: Weather code 80, 81, 82
- **WHEN** weather code is 80, 81, or 82
- **THEN** condition string is "ঝড়ো বৃষ্টি"

#### Scenario: Weather code 95, 96, 99
- **WHEN** weather code is 95, 96, or 99
- **THEN** condition string is "বজ্রপাতসহ ঝড়"

### Requirement: Weather fetch schedule
The system SHALL fetch weather every 30 minutes via cron.

#### Scenario: Periodic weather refresh
- **WHEN** 30 minutes have elapsed since the last fetch
- **THEN** the system initiates a new weather fetch and updates the unified state

### Requirement: Weather uses Celsius units
All temperature values SHALL be in Celsius. This is not configurable.

#### Scenario: Temperature unit
- **WHEN** weather data is displayed
- **THEN** all temperatures are in °C

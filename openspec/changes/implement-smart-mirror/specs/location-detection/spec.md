## ADDED Requirements

### Requirement: Auto-detect location at startup
The system SHALL detect the server's geographic coordinates using the ip-api.com service when the application starts. The location data SHALL include latitude, longitude, and city name.

#### Scenario: Successful location detection
- **WHEN** the server starts and ip-api.com is reachable
- **THEN** the system stores `{ lat, lon, city }` from the API response and uses these coordinates for weather fetching

#### Scenario: Location detection fails
- **WHEN** the server starts and ip-api.com is unreachable or returns an error
- **THEN** the system uses Dhaka defaults `{ lat: 23.8103, lon: 90.4125, city: "ঢাকা" }` and logs a warning

### Requirement: Location fetched only once
The system SHALL fetch location only once at startup. Location SHALL NOT be re-fetched on any schedule.

#### Scenario: No repeated location calls
- **WHEN** the server has been running for any duration
- **THEN** no additional requests to ip-api.com are made after the initial startup fetch

### Requirement: Location included in unified state
The system SHALL include location data in the unified state object with fields: `lat`, `lon`, `city`, `status`, and `updatedAt`.

#### Scenario: Location state structure
- **WHEN** the unified state is assembled
- **THEN** `state.location` contains `{ lat: number, lon: number, city: string, status: "ok"|"stale"|"error", updatedAt: ISO8601 }`

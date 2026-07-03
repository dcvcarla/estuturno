# commerce-setup Specification

## Purpose
Configuration of the commerce including working hours, contact info, WhatsApp integration, and Mercado Pago access token.

## Requirements

### Requirement: Commerce registration
The system SHALL allow creating a commerce with name, WhatsApp phone, and Mercado Pago access token.

#### Scenario: Register a new commerce
- **WHEN** an admin provides name, WhatsApp phone, and a valid MP access token
- **THEN** the system creates the commerce and returns a commerce_id

#### Scenario: Duplicate commerce name
- **WHEN** an admin tries to register a commerce with an existing name
- **THEN** the system SHALL reject with a conflict error

### Requirement: Working hours configuration
The system SHALL allow configuring working hours per day of week as a JSON structure.

#### Scenario: Set weekly schedule
- **WHEN** an admin sets opening and closing hours for each day of the week
- **THEN** the system stores the schedule and uses it to validate appointment availability

#### Scenario: Day off configuration
- **WHEN** an admin marks a specific day as closed
- **THEN** the system SHALL NOT offer available slots for that day

### Requirement: Commerce identification for multi-instance
The system SHALL support identifying the active commerce via domain or subdomain for the public booking flow.

#### Scenario: Frontend passes commerce context
- **WHEN** a request arrives to the public booking API
- **THEN** the system identifies the commerce from a header or domain mapping and scopes the response to that commerce

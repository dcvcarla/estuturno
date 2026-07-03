# admin-dashboard Specification

## Purpose
Web dashboard for the commerce admin to manage the business: configure services, set working hours, and view/manage appointments in real time.

## Requirements

### Requirement: Admin authentication
The system SHALL authenticate commerce admins via email and password.

#### Scenario: Login with valid credentials
- **WHEN** an admin provides correct email and password
- **THEN** the system returns a JWT access token and refresh token

#### Scenario: Login with invalid credentials
- **WHEN** an admin provides incorrect email or password
- **THEN** the system SHALL reject with HTTP 401

### Requirement: Dashboard overview
The system SHALL display a summary of today's appointments with counts by status.

#### Scenario: View today's summary
- **WHEN** an admin logs into the dashboard
- **THEN** the system shows total appointments for today
- **AND** counts for pending_pago, confirmado, and cancelado

### Requirement: Service management UI
The system SHALL provide a UI to create, edit, and deactivate services.

#### Scenario: Add a new service
- **WHEN** an admin fills the service form and submits
- **THEN** the service appears in the catalog
- **AND** becomes available for public booking

### Requirement: Schedule management UI
The system SHALL provide a UI to configure working hours per day.

#### Scenario: Update weekly schedule
- **WHEN** an admin modifies working hours for a day
- **THEN** the new schedule takes effect immediately
- **AND** future slot availability reflects the change

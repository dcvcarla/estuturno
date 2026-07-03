# service-catalog Specification

## Purpose
Management of services offered by a commerce (name, duration, price, deposit amount).

## Requirements

### Requirement: Create service
The system SHALL allow creating a service with name, duration in minutes, price, and optional deposit amount.

#### Scenario: Create a basic service
- **WHEN** an admin creates a service with name, duration, and price
- **THEN** the system creates the service with no required deposit

#### Scenario: Create a service with deposit
- **WHEN** an admin creates a service with name, duration, price, and a deposit amount greater than zero
- **THEN** the system creates the service and requires a deposit for booking

### Requirement: List services
The system SHALL list all services for a given commerce.

#### Scenario: Get services for booking
- **WHEN** a client accesses the public booking page
- **THEN** the system returns the list of active services with name, duration, price, and whether a deposit is required

### Requirement: Update service
The system SHALL allow updating service details.

#### Scenario: Change price or duration
- **WHEN** an admin updates a service's price or duration
- **THEN** the system updates the service record
- **AND** existing appointments retain their original service snapshot

### Requirement: Delete service
The system SHALL allow soft-deleting a service.

#### Scenario: Deactivate a service
- **WHEN** an admin deletes a service
- **THEN** the system marks it as inactive
- **AND** the service no longer appears in the public booking list
- **AND** existing appointments with this service are preserved

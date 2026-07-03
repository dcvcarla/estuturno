# appointment-booking Specification

## Purpose
Public booking flow: client selects a service, sees available slots, and reserves an appointment.

## Requirements

### Requirement: Available slots query
The system SHALL return available time slots for a given service, date, and commerce, respecting working hours and existing appointments.

#### Scenario: Query available slots for a date
- **WHEN** a client selects a service and a date
- **THEN** the system calculates available slots based on working hours, service duration, and existing appointments

#### Scenario: No available slots
- **WHEN** all slots are booked for a given date and service
- **THEN** the system returns an empty list

### Requirement: Reserve appointment
The system SHALL allow a client to reserve an appointment. The initial state SHALL be `pending_pago`.

#### Scenario: Book an appointment without deposit
- **WHEN** a client provides name, phone, and selects a service, date, and time
- **AND** the service has no required deposit
- **THEN** the system creates the appointment with status `pending_pago`
- **AND** returns a confirmation with payment instructions if deposit required

#### Scenario: Book an appointment with deposit
- **WHEN** a client provides name, phone, and selects a service, date, and time
- **AND** the service requires a deposit
- **THEN** the system creates the appointment with status `pending_pago`
- **AND** returns a Mercado Pago payment link for the deposit

### Requirement: Prevent double-booking
The system SHALL NOT allow two appointments for the same commerce with overlapping time ranges.

#### Scenario: Concurrent booking attempt
- **WHEN** two clients try to book the same time slot simultaneously
- **THEN** only the first request succeeds
- **AND** the second request receives a "slot already taken" error

### Requirement: Pending payment expiration
The system SHALL automatically cancel appointments in `pending_pago` after a configurable timeout.

#### Scenario: Expired pending payment
- **WHEN** an appointment remains in `pending_pago` for more than the configured timeout (default: 15 minutes)
- **THEN** the system changes status to `cancelado`

### Requirement: Customer contact info
The system SHALL collect client name and phone number during booking.

#### Scenario: Required fields validation
- **WHEN** a client submits a booking without name or phone
- **THEN** the system SHALL reject with a validation error

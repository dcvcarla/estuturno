# appointment-agenda Specification

## Purpose
Real-time agenda for the commerce displaying all appointments with live updates via WebSockets.

## Requirements

### Requirement: List appointments
The system SHALL return the list of appointments for a commerce, filterable by date and status.

#### Scenario: View agenda for a day
- **WHEN** an admin selects a specific date
- **THEN** the system returns all appointments for that date ordered by time

#### Scenario: Filter by status
- **WHEN** an admin filters by status (pending_pago, confirmado, cancelado)
- **THEN** the system returns only matching appointments

### Requirement: Real-time updates via WebSockets
The system SHALL emit real-time events when appointments change (created, confirmed, cancelled).

#### Scenario: New booking appears in real time
- **WHEN** a client books an appointment
- **THEN** the system emits a `appointment:created` event via Socket.io
- **AND** the admin dashboard updates without manual refresh

#### Scenario: Payment confirmed
- **WHEN** a payment is confirmed via webhook
- **THEN** the system emits an `appointment:confirmed` event
- **AND** the appointment status updates in real time on the agenda

### Requirement: Cancel appointment
The system SHALL allow the admin to cancel an appointment.

#### Scenario: Admin cancels an appointment
- **WHEN** an admin cancels an appointment
- **THEN** the system updates the status to `cancelado`
- **AND** emits a `appointment:cancelled` event
- **AND** the slot becomes available again for booking

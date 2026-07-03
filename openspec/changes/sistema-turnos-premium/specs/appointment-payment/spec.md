# appointment-payment Specification

## Purpose
Integration with Mercado Pago for processing deposits. Handles payment link generation and status updates via webhook.

## Requirements

### Requirement: Generate payment link
The system SHALL generate a Mercado Pago payment link for the deposit amount when booking a service that requires one.

#### Scenario: Create MP preference for deposit
- **WHEN** a client books a service with deposit
- **THEN** the system creates a Mercado Pago preference with the deposit amount
- **AND** returns the payment URL to the client
- **AND** stores the MP payment ID in the appointment record

### Requirement: Webhook to confirm payment
The system SHALL expose a webhook endpoint for Mercado Pago to notify payment status changes.

#### Scenario: Payment approved
- **WHEN** Mercado Pago sends a payment approval notification
- **THEN** the system validates the notification signature
- **AND** updates the appointment status to `confirmado`

#### Scenario: Payment rejected
- **WHEN** Mercado Pago sends a payment rejection notification
- **THEN** the system updates the appointment status to `cancelado`

### Requirement: Webhook security
The system SHALL validate Mercado Pago webhook signatures to prevent fake notifications.

#### Scenario: Invalid signature rejected
- **WHEN** a request hits the webhook endpoint without a valid MP signature
- **THEN** the system SHALL reject with HTTP 401

### Requirement: Idempotent webhook processing
The system SHALL handle duplicate webhook notifications without side effects.

#### Scenario: Duplicate webhook notification
- **WHEN** Mercado Pago sends the same payment notification twice
- **THEN** the system SHALL process it only once
- **AND** return HTTP 200 on both attempts

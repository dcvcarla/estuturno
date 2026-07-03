## Why

Los comercios de servicios (peluquerías, barberías, centros de estética, etc.) necesitan una solución moderna de turnos online con pagos mediante seña para reducir las ausencias y no-show. Las soluciones actuales son genéricas, caras o no tienen integración con Mercado Pago. Este sistema resuelve el problema con una plataforma simple, moderna y llave en mano.

## What Changes

- Backend API REST + WebSockets (Socket.io) para gestión de turnos en tiempo real
- Base de datos PostgreSQL con tablas de Commerces, Services, Appointments
- Integración con Mercado Pago para cobro de señas vía Webhook
- Panel de administración web (dashboard) para que el comercio gestione:
  - Configuración de horarios y servicios
  - Agenda de turnos con actualización en tiempo real
  - Vista de turnos pendientes, confirmados y cancelados
- Landing page pública para que los clientes reserven turnos
- Lógica anti-double-booking en el mismo rango horario
- MVP mono-instancia: un solo comercio, preparado para escalar a multi-instancia

## Capabilities

### New Capabilities
- `commerce-setup`: Configuración del comercio (horarios, datos, WhatsApp, MP access token)
- `service-catalog`: Gestión de servicios ofrecidos (nombre, duración, precio, seña)
- `appointment-booking`: Reserva de turnos con selección de servicio, fecha y hora
- `appointment-payment`: Integración con Mercado Pago para señas, con webhook para confirmación automática
- `appointment-agenda`: Agenda del comercio con vista de turnos en tiempo real
- `admin-dashboard`: Panel de administración web para gestión del comercio

### Modified Capabilities
- Ninguna (proyecto desde cero)

## Impact

- Nuevo proyecto Node.js + TypeScript + Express
- Base de datos PostgreSQL con migraciones
- Frontend web (admin + landing) con framework moderno
- Dependencias nuevas: Socket.io, Mercado Pago SDK, ORM
- Sin impacto en código existente (proyecto nuevo)

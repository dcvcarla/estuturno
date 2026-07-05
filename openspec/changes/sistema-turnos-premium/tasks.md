## FASE 2 — Integración WhatsApp + Devoluciones

- [ ] 1.1 Endpoint GET /api/webhooks/whatsapp para verificación de Meta
- [ ] 1.2 Endpoint POST /api/webhooks/whatsapp para recibir mensajes
- [ ] 1.3 Middleware para identificar commerce por phone_number_id
- [x] 2.1 Lógica de mensaje inicial con botones
- [ ] 2.2 Lista de servicios por WhatsApp
- [ ] 2.3 Slots disponibles por WhatsApp
- [ ] 2.4 Registro de turno vía WhatsApp
- [ ] 3.1 Notificación de confirmación por WhatsApp
- [ ] 3.2 Pase a humano
- [ ] 4.1 Endpoint cancel-and-refund
- [ ] 4.2 Conexión con API de Refunds de MP
- [ ] 4.3 Actualizar estado al recibir confirmación
- [ ] 4.4 Notificación de cancelación/reembolso por WhatsApp

## 1. Setup del proyecto

- [x] 1.1 Inicializar proyecto Node.js con TypeScript en backend/
- [x] 1.2 Configurar Prisma con PostgreSQL y crear schema base (Commerces, Services, Appointments)
- [x] 1.3 Configurar Express con middleware base (CORS, JSON parser, error handler)
- [x] 1.4 Configurar Socket.io en el servidor Express
- [x] 1.5 Inicializar proyecto React + Vite + Tailwind en frontend/
- [x] 1.6 Configurar variables de entorno (MP access token, DB URL, JWT secret, CORS origins)
- [x] 1.7 Implementar middleware de detección de comercio por dominio (Host header) para ruteo multi-cliente

## 2. Autenticación del admin

- [x] 2.1 Crear modelo Admin en Prisma con email y password hash
- [x] 2.2 Implementar endpoint POST /api/auth/login con JWT (access + refresh token)
- [x] 2.3 Implementar middleware de autenticación JWT
- [x] 2.4 Implementar endpoint GET /api/auth/me para obtener el admin autenticado
- [x] 2.5 Crear página de login en el frontend con formulario y almacenamiento de token

## 3. API de Comercio (Commerce Setup)

- [x] 3.1 Implementar CRUD de comercio (GET/PUT /api/commerce)
- [x] 3.2 Implementar almacenamiento de configuracion_horarios como JSON
- [x] 3.3 Implementar endpoint GET /api/commerce/public para datos públicos (horarios, nombre)
- [x] 3.4 Crear página de configuración del comercio en el frontend (datos, horarios, MP token)

## 4. API de Servicios (Service Catalog)

- [x] 4.1 Implementar CRUD de servicios (GET/POST/PUT/DELETE /api/services)
- [x] 4.2 Implementar soft-delete en DELETE (marcar como inactivo)
- [x] 4.3 Implementar endpoint público GET /api/services para la landing de reservas
- [x] 4.4 Crear UI de gestión de servicios en el frontend (listar, crear, editar, desactivar)

## 5. Reserva de Turnos (Appointment Booking)

- [x] 5.1 Implementar lógica de disponibilidad: calcular slots libres según horarios y turnos existentes
- [x] 5.2 Implementar endpoint GET /api/appointments/slots?date=&service_id=
- [x] 5.3 Implementar endpoint POST /api/appointments con validación anti-double-booking (transacción SQL con SELECT FOR UPDATE)
- [x] 5.4 Implementar validación de campos requeridos (nombre, teléfono)
- [x] 5.5 Crear landing page pública en el frontend: selección de servicio, fecha, hora y formulario de reserva

## 6. Integración con Mercado Pago

- [x] 6.1 Implementar creación de preferencia de pago en MP para servicios con seña
- [x] 6.2 Implementar endpoint POST /api/payments/create-preference
- [x] 6.3 Implementar webhook POST /api/webhooks/mercadopago con validación de firma
- [x] 6.4 Implementar idempotencia en webhook (evitar procesar duplicados)
- [x] 6.5 Implementar actualización de estado del turno (pending_pago -> confirmado / cancelado)
- [x] 6.6 Implementar reintentos para webhooks fallidos (cola + exponential backoff)

## 7. Agenda en Tiempo Real (Appointment Agenda + WebSockets)

- [x] 7.1 Implementar endpoint GET /api/appointments con filtros por fecha y estado
- [x] 7.2 Integrar Socket.io: emitir evento appointment:created al reservar turno
- [x] 7.3 Integrar Socket.io: emitir appointment:confirmed al confirmarse pago
- [x] 7.4 Integrar Socket.io: emitir appointment:cancelled al cancelar turno
- [x] 7.5 Crear componente Agenda en el frontend con tabla de turnos y filtros
- [x] 7.6 Conectar el frontend a Socket.io y actualizar la agenda en tiempo real

## 8. Dashboard de Administración

- [x] 8.1 Crear layout del panel admin con navegación (sidebar)
- [x] 8.2 Crear página de dashboard con resumen del día (contadores por estado)
- [x] 8.3 Implementar cancelación de turnos desde el panel
- [x] 8.4 Integrar todas las secciones (comercio, servicios, agenda) en el panel navegable

## 9. Tareas Transversales

- [x] 9.1 Implementar job cron que cancela turnos pending_pago vencidos (15 min)
- [x] 9.2 Configurar CORS para permitir múltiples dominios (preparación multi-instancia)
- [x] 9.3 Agregar validación Zod en todos los endpoints
- [x] 9.4 Escribir tests de las reglas de negocio críticas (double-booking, webhook)

## Context

Sistema de turnos desde cero. Backend multitenant centralizado en Node.js + TypeScript, frontend web con panel admin y landing pública. Sin código existente.

El modelo de negocio es B2B: cada comercio (cliente) apunta su dominio (ej: turnos.mipelu.com) via CNAME a nuestro servidor central. El servidor detecta el dominio y sirve la landing pública de ese comercio con su marca. Un solo deploy actualiza todos los clientes.

## Goals / Non-Goals

**Goals:**
- API REST multitenant con aislamiento de datos por commerce_id
- WebSockets (Socket.io) para agenda en tiempo real por comercio
- Integración con Mercado Pago vía Webhook para confirmación de señas
- Panel admin web (React) para gestionar agenda, servicios, horarios
- Landing pública para que clientes reserven turnos
- Evitar double-booking en el mismo rango horario
- Base de datos PostgreSQL con migraciones
- Arquitectura preparada desde el día 1 para N comercios

**Non-Goals:**
- Roles de usuario múltiples (solo admin del comercio)
- App móvil nativa
- Pasarelas de pago adicionales (solo MP)
- Notificaciones push o SMS (solo WhatsApp como opcional)

## Decisions

| Decisión | Opción elegida | Alternativas consideradas | Razón |
|---|---|---|---|
| ORM | Prisma | TypeORM, Kysely, Drizzle | Mejor DX, migraciones automáticas, TypeScript nativo, comunidad grande |
| Frontend | React + Vite + Tailwind CSS | Next.js, Vue | Dashboard SPA no necesita SSR. Vite es rápido. Tailwind acelera UI. |
| Auth admin | JWT (access + refresh) | Session cookies, Passport | Stateless, simple, suficiente para MVP |
| Validación | Zod | Joi, Yup | TypeScript-first, inferencia de tipos nativa |
| Proyecto | Monorepo simple (backend/ + frontend/) | Nx, Turborepo | MVP no justifica tooling extra. Dos carpetas, scripts compartidos. |
| Layout de horarios | JSON en columna `configuracion_horarios` | Tabla separada schedule_blocks | Más simple para MVP. Cada comercio tiene un JSON con días y rangos. |
| Multi-tenencia | Shared DB, row-level isolation (commerce_id) | DB por tenant, schema por tenant | Mucho más simple de operar. Las queries siempre filtran por commerce_id. |
| Identificación de comercio | Domain detection (Host header) + white-label | Subdominio, ruta /:slug | El frontend único detecta el dominio del cliente via Host header y carga la configuración de ese comercio. El admin panel está en ruta /admin o subdominio dedicado. |

## Estrategia de deploy: Single-Deploy Multi-Cliente

El sistema es **un solo deploy** que sirve a todos los clientes:

1. **Backend + Frontend** empaquetados juntos (el backend sirve los assets estáticos del frontend en producción)
2. Cada cliente apunta su dominio via CNAME a nuestro servidor (ej: turnos.mipelu.com -> nuestroservidor.com)
3. El backend recibe la request, lee el `Host` header, busca en la DB el comercio con ese dominio, y devuelve el frontend con el contexto de ese comercio
4. El admin panel vive en una ruta separada (`/admin`) donde los dueños hacen login y gestionan su negocio
5. **Un solo deploy actualiza a todos los clientes simultáneamente**

### Flujo de request para landing pública:

```
Cliente entra a turnos.mipelu.com
  -> DNS: CNAME a nuestroservidor.com
  -> Nginx/Proxy -> Node.js recibe Host: turnos.mipelu.com
  -> Backend busca commerce por dominio en DB
  -> Sirve frontend con configuración (logo, colores, commerce_id)
  -> Frontend carga servicios y slots disponibles para ese comercio
```

### Onboarding de nuevo cliente:

1. Se crea registro en `commerces` con su dominio y datos
2. Se configura el dominio del cliente con CNAME apuntando a nuestro servidor
3. Se emite SSL automático (vía Let's Encrypt o proxy)
4. Sin rebuild, sin deploy, sin tocar código

## Risks / Trade-offs

- **[Riesgo] Webhook de MP no llega por timeout o error de red** → Implementar cola de reintentos con exponential backoff + log de eventos fallidos
- **[Riesgo] Double-booking por race condition** → Usar transacción SQL con lock de fila (SELECT ... FOR UPDATE) al crear turno. Además validar en servidor, no solo frontend.
- **[Riesgo] Cliente reserva y no paga** → El turno en "pendiente_pago" expira después de X minutos (ej: 15 min). Job cron que cancela turnos expirados.
- **[Trade-off] JSON de horarios no es consultable vía SQL** → Para MVP alcanza. Si después se necesitan búsquedas complejas, se migra a tabla normalizada.
- **[Riesgo] Shared DB puede tener contención si crecen muchos comercios** → Para el volumen esperado (decenas, no miles de comercios) PostgreSQL maneja esto sin problemas. Si escala más, se migra a DB por tenant.

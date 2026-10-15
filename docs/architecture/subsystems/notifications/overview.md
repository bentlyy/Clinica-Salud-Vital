# SUB-10 — Notificaciones y recordatorios

> **Estado:** AS-IS completado · **Certeza global:** confirmado.
> **Evidencia principal:** `src/modules/notifications/*`, `src/jobs/reminder.job.ts`, `src/app.ts` (montaje + arranque del cron), `src/shared/email.service.ts`.

## 1. Propósito

- **Notificaciones internas**: guardar/leer/marcar notificaciones por usuario y tenant (`notifications`).
- **Recordatorios de citas**: job cron `node-cron` que envía recordatorios por email a citas `pending` (1h antes y 24h antes), con enlace de confirmación para citas no confirmadas.
- **Notificaciones de laboratorio**: se crean vía `backfillLabNotifications` al arranque (cross-ref SUB-8).

## 2. Componentes

| Capa | Módulo | Rol |
|---|---|---|
| HTTP | `notification.routes/controller/service` | CRUD interno de notificaciones por usuario/tenant; soporte `superadmin` (scope cross-tenant opcional) |
| Jobs | `jobs/reminder.job.ts` | Cron 5-min (`*/5 * * * *`) → envía recordatorios 1h y 24h antes |
| Jobs | `jobs/audit-integrity.job.ts` | Función `verifyAuditChain(tenantId?)` programada como cron cada 6h (`app.ts:517-529`) |
| Email | `shared/email.service.ts` | Envío de emails (SendGrid) con reintento exponencial |

## 3. Superficie HTTP (`/api/notifications`)

Montado en `app.ts:284` → `app.use(`${API_PREFIX}/notifications`, notificationRoutes)`.

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/notifications` | authMiddleware | Lista notificaciones del usuario (o todos si `superadmin` + `tenant_id` query) |
| GET | `/api/notifications/unread-count` | authMiddleware | Contador no leídas |
| PATCH | `/api/notifications/read-all` | authMiddleware | Marca todas como leídas (solo del usuario; ignora `allUsers` en UPDATE) |
| PATCH | `/api/notifications/:id/read` | authMiddleware + validateZod | Marca una como leída (requiere pertenencia usuario+tenant) |

## 4. Roles/alcance

- **Usuario autenticado**: ve/marca sus notificaciones (`user_id = req.user.id`, `tenant_id = req.tenant_id`).
- **superadmin**: puede listar notificaciones de otro tenant vía query `tenant_id` y `allUsers=true` (ver `resolveScope` en controller). `markAsRead` exige propiedad (user_id+tenant_id); `markAllAsRead` no respeta `allUsers` en el `UPDATE` (solo user actual).

## 5. Jobs

### 5.1 Reminder job (`startReminderJob`)
- **Schedule:** `cron.schedule('*/5 * * * *')` (cada 5 min) — `app.ts:311` (`startReminderJob()`).
- **Ventanas:** 1h (`55–65 min`) y 24h (`23–25 h`) antes de `b.date + b.time`.
- **Filtro:** `b.status='pending'`, `b.sentField = FALSE`, `b.tenant_id IS NOT NULL`, `(b.date+b.time) BETWEEN NOW()+...`. No filtra por tenant específico (multi-tenant global).
- **Destinatario:** `COALESCE(u.email, b.guest_email)`.
- **Confirmación:** si `!booking.confirmed`, incluye enlace `${FRONTEND_URL}/confirm/${confirmation_token}`.
- **Persistencia:** tras envío exitoso → `UPDATE bookings SET ${sentField}=TRUE`.
- **Reintento:** exponencial (3 intentos, espera 2^i s). Errores logueados por booking.

### 5.2 Audit integrity (`verifyAuditChain`)
- Programada como cron cada 6 horas en `app.ts:517-529` (`cron.schedule('0 */6 * * *', ...)`). Verifica cadena de hashes HMAC en `audit_logs` (por tenant opcional). Cross-ref SUB-13 (defectos de la cadena: FND-M1).

## 6. Notas (AS-IS)

- `markAllAsRead` (service) no tiene caso `allUsers` — UPDATE siempre `WHERE user_id=$1 AND tenant_id=$2` (`notification.service.ts:111-116`); el controller pasa `opts` pero service los ignora. Diferencia con `listNotifications/getUnreadCount`.
- `notifications` tabla usada para in-app; recordatorios son emails (no crean notificación in-app).
- `backfillLabNotifications` crea notificaciones de laboratorio al arranque (`app.ts:307`).
- Email fallback: `FRONTEND_URL || RENDER_EXTERNAL_URL || 'http://localhost:5173'`.
- Cross-ref FND-D1 (SUB-6): el cron **no** restringe a `tenant_id='default'` (AS-IS actual: `tenant_id IS NOT NULL`).

## 7. NO VERIFICADO

- Frecuencia/volumen en producción (multi-instancia → cron corre por instancia; no hay locking global).
- Resultado real del cron `verifyAuditChain` (ver SUB-13 / FND-M1: la cadena no se puebla).
- Entorno sin SMTP/SendGrid disponible (errores en retry path).

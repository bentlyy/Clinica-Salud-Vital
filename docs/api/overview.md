# Visión General de la API

**Versión:** 2.0 (v1)  
**URL Base:** `/api/v1/` (legacy: `/api/`)  
**Fecha:** 2025

---

## 1. Convenciones de la API

### Formato de respuesta

**Éxito (lista):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Éxito (individual):**
```json
{
  "id": 1,
  "field": "value"
}
```

**Error:**
```json
{
  "error": "Mensaje legible",
  "details": ["campo: error específico"],
  "stack": "..."  // Solo en desarrollo
}
```

### Autenticación

```
Authorization: Bearer <access_token>
```

### Paginación

Todos los endpoints de lista aceptan `?page=1&limit=20`. Default page=1, limit=20. Máx limit=100.

---

## 2. Endpoints por Módulo

### Auth `src/modules/auth/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Registro de usuario |
| POST | `/auth/login` | No | Login (retorna access + refresh tokens) |
| POST | `/auth/refresh` | No | Rotar refresh token |
| POST | `/auth/logout` | Sí | Revocar refresh token actual |
| POST | `/auth/logout-all` | Sí | Revocar todos los refresh del usuario |
| POST | `/auth/change-password` | Sí | Cambiar contraseña (revoca todos los tokens) |
| POST | `/auth/2fa/enable` | Sí | Generar secreto TOTP |
| POST | `/auth/2fa/verify` | Sí | Verificar y activar TOTP |
| POST | `/auth/2fa/disable` | Sí | Desactivar TOTP |

### Doctores `src/modules/doctor/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/doctors` | Público | Listar doctores (filtro por especialidad) |
| POST | `/doctors` | Admin | Crear doctor + disponibilidad por defecto |
| GET | `/doctors/:id` | Público | Detalle de doctor |
| PUT | `/doctors/:id` | Admin | Actualizar doctor |

### Reservas `src/modules/booking/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/bookings` | Usuario | Listar reservas propias (paginado) |
| POST | `/bookings` | Usuario | Crear reserva (con advisory lock) |
| GET | `/bookings/slots` | Público | Obtener slots disponibles |
| GET | `/bookings/doctor-agenda` | Doctor | Vista de agenda del doctor |
| PUT | `/bookings/:id` | Usuario | Reprogramar reserva |
| DELETE | `/bookings/:id` | Usuario | Cancelar reserva |

### Invitado `src/modules/guest/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/guest/search-by-rut` | No | Buscar paciente por RUT |
| POST | `/guest/create-booking` | No | Flujo de reserva para invitados |

### Registros Clínicos `src/modules/clinical-record/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/clinical-records` | Doctor/Admin | Listar registros |
| POST | `/clinical-records` | Doctor | Crear EHR |
| GET | `/clinical-records/:id` | Doctor/Paciente | Obtener registro |
| PUT | `/clinical-records/:id` | Doctor | Actualizar registro |
| DELETE | `/clinical-records/:id` | Doctor | Cancelar borrador |

### Recetas `src/modules/clinical-record/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/clinical-records/:recordId/prescriptions` | Doctor | Listar recetas |
| POST | `/clinical-records/:recordId/prescriptions` | Doctor | Crear receta |
| GET | `/prescriptions/:id/pdf` | Doctor | Generar PDF |
| DELETE | `/prescriptions/:id` | Doctor | Eliminar receta |

### Facturación `src/modules/billing/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/billing` | Admin | Listar facturas |
| POST | `/billing/invoices` | Admin | Crear factura |
| GET | `/billing/invoices/:id` | Admin | Detalle de factura |
| PUT | `/billing/invoices/:id/status` | Admin | Actualizar estado |
| DELETE | `/billing/invoices/:id` | Admin | Eliminar factura |
| GET | `/billing/stats` | Admin | Estadísticas de facturación |

### Laboratorio `src/modules/laboratory/`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/laboratory/tests` | Público | Listar exámenes |
| POST | `/laboratory/requests` | Doctor | Crear solicitud de laboratorio |
| GET | `/laboratory/requests` | Doctor/Paciente | Listar solicitudes |
| GET | `/laboratory/requests/:id` | Doctor | Detalle de solicitud |
| PUT | `/laboratory/requests/:id/status` | Doctor | Actualizar estado |
| PUT | `/laboratory/requests/:id/items/:itemId` | Doctor | Actualizar resultado |

### ML `src/modules/ml/` (solo admin, feature-gated)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/ml/train` | Entrenar los 4 modelos |
| GET | `/ml/status` | Estado de modelos + stats de caché |
| GET | `/ml/health` | Health check de TF.js |
| POST | `/ml/reset` | Liberar todos los modelos |
| GET | `/ml/metrics` | Métricas de predicción + entrenamiento |
| POST | `/ml/cache/clear` | Limpiar caché LRU |
| POST | `/ml/predict-noshow` | Predicción de riesgo no-show |
| POST | `/ml/classify-diagnosis` | Clasificación de diagnóstico |
| GET | `/ml/demand-forecast` | Pronóstico de demanda (próximos N días) |
| GET | `/ml/optimal-schedules` | Análisis de horarios óptimos |
| POST | `/ml/analyze-vitals` | Análisis de signos vitales |

### Monitoreo `src/modules/monitoring/` (solo admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/monitoring/health` | Salud completa del sistema |
| GET | `/monitoring/memory` | Snapshots de memoria + detección de leaks |
| GET | `/monitoring/database` | Pool DB + estadísticas de conexiones |
| GET | `/monitoring/database/slow-queries` | Consultas lentas activas |
| GET | `/monitoring/database/table-sizes` | Almacenamiento por tabla |
| GET | `/monitoring/ml` | Métricas ML + memoria |
| GET | `/monitoring/logs` | Cola de logs |
| GET | `/monitoring/dashboard` | Dashboard unificado |
| POST | `/monitoring/gc` | Disparo manual de GC |
| POST | `/monitoring/database/export-sizes` | Exportar tabla CSV |

### Super Admin `src/modules/super-admin/`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/super-admin/tenants` | Listar todos los tenants |
| POST | `/super-admin/tenants` | Crear tenant |
| GET | `/super-admin/tenants/:id` | Detalle de tenant |
| PUT | `/super-admin/tenants/:id` | Actualizar tenant |
| DELETE | `/super-admin/tenants/:id` | Eliminar tenant |
| GET | `/super-admin/stats` | Estadísticas globales |

### SaaS `src/modules/saas/`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/saas/onboard` | Crear tenant + suscripción + admin |
| POST | `/saas/checkout` | Sesión de checkout Stripe |
| POST | `/saas/webhook/stripe` | Receptor de webhook Stripe |
| GET | `/saas/plans` | Listar planes |

---

## 3. Validación

Usa esquemas Zod 4.x en archivos `*.schema.ts`.

```typescript
// Ejemplo: validar body de petición
router.post('/bookings', validateZod(createBookingSchema, 'body'), handler);

// Ejemplo: validar params + query
router.get('/bookings/:id', validateZod(bookingIdSchema, 'params'), handler);
```

---

## 4. Manejo de Errores

Los errores son manejados por el middleware global `errorHandler`:

| Status | Clase de error | Cuándo |
|--------|---------------|--------|
| 400 | BadRequestError | Error de validación |
| 401 | UnauthorizedError | Token faltante o inválido |
| 403 | ForbiddenError | Rol insuficiente |
| 404 | NotFoundError | Recurso no encontrado |
| 409 | ConflictError | Duplicado / condición de carrera |
| 429 | TooManyRequests | Límite de tasa excedido |
| 500 | InternalError | Excepción no manejada |

---

## 5. Multi-tenencia

- Tenant identificado vía header `X-Tenant-Id` o subdominio
- Inyectado en `req.tenant_id` por `tenantMiddleware`
- Todas las consultas incluyen `WHERE tenant_id = ?` vía helpers `tenantQuery`
- Los planes SaaS limitan recursos por tenant vía `requireFeature` / `requireLimit`

### Planes

| Plan | Código | Doctores | Pacientes | ML |
|------|--------|----------|-----------|-----|
| Gratuito | free | 1 | 50 | No |
| Básico | basic | 3 | 200 | Básico |
| Profesional | pro | 10 | Ilimitado | Completo |
| Enterprise | enterprise | Ilimitado | Ilimitado | Completo + Export |

---

## 6. Internacionalización

- 4 locales: es, en, pt, fr
- 421+ claves de traducción en todos los módulos
- Locale auto-detectado desde `Accept-Language` o header `X-Locale`
- Backend: `i18nService.t('key')` retorna texto traducido
- Frontend: hook `useI18n()` con caché en localStorage
- Traducciones expuestas vía `GET /api/v1/i18n/translations`

---

## 7. Eventos de Webhook

| Evento | Disparador | Payload |
|--------|-----------|---------|
| `booking.created` | Nueva reserva | booking_id, doctor_id, date, time |
| `booking.confirmed` | Confirmación | booking_id, email paciente |
| `booking.cancelled` | Cancelación | booking_id, reason |
| `invoice.paid` | Pago recibido | invoice_id, amount |
| `clinical_record.created` | Nuevo EHR | record_id, patient_id |
| `user.registered` | Nuevo usuario | user_id, email, role |

La entrega de webhook incluye:
- `X-Webhook-Signature`: HMAC-SHA256(body, secret)
- `X-Webhook-Event`: nombre del evento
- Reintento: 3 intentos con backoff
- Historial: almacenado en tabla `webhook_deliveries`

# Módulo Super Admin

> Panel de administración global para gestión de tenants.

## Ubicación: `src/modules/super-admin/`

| Archivo | Propósito |
|---------|-----------|
| `super-admin.controller.ts` | Handlers de rutas |
| `super-admin.service.ts` | Lógica de administración global |
| `super-admin.routes.ts` | Definición de rutas |
| `super-admin.schema.ts` | Validación Zod |

## Endpoints: `/api/super-admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `stats` | Estadísticas globales |
| GET | `analytics/dashboard` | Dashboard multi-tenant (incluye churn, cancelación, pacientes activos) |
| GET | `analytics/top-tenants` | Tenants con más actividad |
| GET | `analytics/revenue` | Ingresos globales |
| GET | `analytics/growth` | Crecimiento de plataforma |
| GET | `analytics/health` | Health Scores de todos los tenants |
| GET | `analytics/health/:tenantId` | Health Score detallado de un tenant |
| GET | `analytics/operations` | Métricas operativas (especialidades, cancelación, no-show, médicos, horarios) |
| GET | `analytics/churn` | Churn rate mensual, retención, ARR, MRR |
| GET | `analytics/comparison` | Tabla comparativa completa con Health Scores |
| GET | `analytics/occupancy` | Ocupación médica por tenant |
| GET | `analytics/activity` | Actividad reciente por tenant |
| GET | `analytics/alerts` | Alertas inteligentes automáticas |
| GET | `tenants` | Listar todos los tenants |
| GET | `tenants/:id` | Detalle de tenant |
| POST | `tenants` | Crear tenant |
| PATCH | `tenants/:id` | Actualizar tenant |
| DELETE | `tenants/:id` | Eliminar tenant |
| GET | `users` | Listar usuarios globales |
| PATCH | `users/:userId/active` | Activar/desactivar usuario |

## Health Score

Fórmula (escala 0-100):

| Componente | Peso | Cálculo |
|------------|------|---------|
| Actividad reciente | 20 | `max(0, 20 - días_sin_booking)` |
| Tendencia citas | 20 | `20 × min(1, bookings_30d / bookings_prev_30d)` |
| Nuevos pacientes | 20 | `min(20, pacientes_únicos_30d × 4)` |
| Cancelaciones | 20 | `20 × max(0, 1 - (tasa_cancelación / 0.30))` |
| Módulos usados | 20 | `min(20, módulos_activos × 5)` |

| Puntaje | Color | Estado |
|---------|-------|--------|
| 80-100 | 🟢 Verde | Saludable |
| 50-79 | 🟡 Amarillo | Atención |
| 20-49 | 🟠 Naranja | Riesgo |
| 0-19 | 🔴 Rojo | Crítico |

## Rol: `superadmin`

- Acceso exclusivo para administradores de la plataforma
- No está ligado a un tenant específico
- Puede gestionar todos los tenants del sistema

---

Tags: #modulo #super-admin #admin

# Base de Datos

## Conexión
- Pool PostgreSQL via `pg` en `src/shared/db.ts`
- Local: `postgresql://postgres:postgres@localhost:5432/clinic`
- Pool single instance compartido

## Schema
Archivo maestro: `db/init.sql` (434 líneas)

### Tablas Principales (15+)
| Tabla | Propósito |
|-------|-----------|
| `users` | Usuarios (admin, doctor, patient) |
| `doctors` | Perfiles de doctores |
| `bookings` | Reservas de citas |
| `availability` | Bloques semanales (day_of_week) |
| `exceptions` | Bloques de excepción (full/partial day) |
| `clinical_records` | EHR - Historias clínicas |
| `prescriptions` | Recetas médicas |
| `cie10_catalog` | Catálogo CIE-10 |
| `audit_logs` | Logs de auditoría |
| `invoices` | Facturación |
| `invoice_items` | Items de factura |
| `payments` | Pagos |
| `insurance_claims` | Reclamos a seguros |
| `lab_tests` | Exámenes de laboratorio |
| `lab_requests` | Solicitudes de laboratorio |
| `lab_request_items` | Items de solicitud |
| `ml_prediction_history` | Historial de predicciones ML |
| `ml_model_metrics` | Métricas de modelos ML |
| `ml_demand_forecast` | Forecast de demanda |
| `tenants` | Config multi-tenant |
| `refresh_tokens` | Refresh tokens JWT |
| `webhooks` | Webhooks |
| `webhook_deliveries` | Historial entregas webhook |

### Características
- 30+ índices (incluyendo parciales y funcionales)
- 4 triggers para `updated_at`
- Constraints: `CHECK` para `guest_or_user`, `slot_duration`, `future_date`
- Migraciones incrementales en `db/migrations/` via tabla `_migrations`

## Migraciones
- `db/init.sql` — Schema consolidado completo
- `db/migrations/` — Migraciones individuales aplicadas via migration runner
- Tabla `_migrations` trackea lo aplicado

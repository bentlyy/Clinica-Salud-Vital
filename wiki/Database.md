# Base de Datos

## Conexión
- Pool PostgreSQL via `pg` en `src/shared/db.ts`
- Local: `postgresql://postgres:postgres@localhost:5432/clinic`
- Pool single instance compartido

## Schema
Archivo maestro: `db/init.sql` (434 líneas)

### Tablas (~45+)

#### Core
| Tabla | Propósito |
|-------|-----------|
| `users` | Usuarios (admin, doctor, patient) |
| `doctors` | Perfiles de doctores |
| `doctor_availability` | Bloques semanales (day_of_week) |
| `doctor_exceptions` | Bloques de excepción (full/partial day) |
| `specialties` | Catálogo de especialidades |
| `bookings` | Reservas de citas |

#### Datos Clínicos
| Tabla | Propósito |
|-------|-----------|
| `clinical_records` | EHR - Historias clínicas |
| `clinical_record_versions` | Versionado de EHR |
| `prescriptions` | Recetas médicas |
| `cie10_catalog` | Catálogo CIE-10 |
| `lab_tests` | Exámenes de laboratorio |
| `lab_requests` | Solicitudes de laboratorio |
| `lab_request_items` | Items de solicitud |

#### Facturación
| Tabla | Propósito |
|-------|-----------|
| `invoices` | Facturas |
| `invoice_items` | Items de factura |
| `payments` | Pagos |
| `insurance_claims` | Reclamos a seguros |

#### Auth & Seguridad
| Tabla | Propósito |
|-------|-----------|
| `refresh_tokens` | Refresh tokens JWT |
| `password_reset_tokens` | Tokens de reset de password |
| `user_consents` | Consentimientos GDPR |
| `phi_access_log` | Log de acceso a PHI |
| `encryption_keys` | Claves de encriptación |
| `data_retention_policy` | Políticas de retención |

#### RBAC
| Tabla | Propósito |
|-------|-----------|
| `permissions` | Permisos del sistema |
| `role_permissions` | Permisos por rol |
| `user_permissions` | Permisos por usuario |

#### Auditoría
| Tabla | Propósito |
|-------|-----------|
| `audit_logs` | Logs de auditoría |
| `_rls_audit` | Auditoría RLS |
| `_migrations` | Migraciones aplicadas |

#### ML
| Tabla | Propósito |
|-------|-----------|
| `ml_prediction_history` | Historial de predicciones |
| `ml_model_metrics` | Métricas de modelos |
| `ml_demand_forecast` | Forecast de demanda |
| `ml_experiments` | Experimentos ML |
| `ml_runs` | Runs de experimentos |
| `ml_run_params` | Parámetros de runs |
| `ml_run_metrics` | Métricas de runs |
| `ml_run_artifacts` | Artefactos de runs |

#### SaaS / Multi-tenant
| Tabla | Propósito |
|-------|-----------|
| `tenants` | Config multi-tenant |
| `plans` | Planes de suscripción |
| `subscriptions` | Suscripciones de tenants |
| `subscription_invoices` | Facturas de suscripción |
| `tenant_features` | Features per-tenant |
| `tenant_usage` | Uso por tenant |
| `notification_preferences` | Preferencias de notificación |

#### Webhooks
| Tabla | Propósito |
|-------|-----------|
| `webhooks` | Webhooks configurados |
| `webhook_deliveries` | Historial entregas |

### Características
- 30+ índices (incluyendo parciales y funcionales)
- 4 triggers para `updated_at`
- Constraints: `CHECK` para `guest_or_user`, `slot_duration`, `future_date`
- Migraciones incrementales en `db/migrations/` via tabla `_migrations`

## Migraciones
- `db/init.sql` — Schema consolidado completo
- `db/migrations/` — Migraciones individuales aplicadas via migration runner
- Tabla `_migrations` trackea lo aplicado

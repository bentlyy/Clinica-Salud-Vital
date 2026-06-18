# Modelo de Datos

> Diagrama entidad-relación del sistema.

## Diagrama General

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "tiene"
    TENANTS ||--o{ DOCTORS : "tiene"
    TENANTS ||--o{ BOOKINGS : "tiene"
    TENANTS ||--o{ CLINICAL_RECORDS : "tiene"
    TENANTS ||--o{ INVOICES : "tiene"
    TENANTS ||--o{ LAB_TESTS : "tiene"
    TENANTS ||--o{ SUBSCRIPTIONS : "tiene"

    USERS ||--o| DOCTORS : "es"
    USERS ||--o{ BOOKINGS : "hace"
    USERS ||--o{ CLINICAL_RECORDS : "paciente"
    USERS ||--o{ AUDIT_LOGS : "registra"

    DOCTORS ||--o{ BOOKINGS : "atiende"
    DOCTORS ||--o{ DOCTOR_AVAILABILITY : "tiene"
    DOCTORS ||--o{ DOCTOR_EXCEPTIONS : "tiene"
    DOCTORS ||--o{ CLINICAL_RECORDS : "crea"

    BOOKINGS ||--o| CLINICAL_RECORDS : "genera"
    BOOKINGS ||--o| INVOICES : "genera"

    CLINICAL_RECORDS ||--o{ PRESCRIPTIONS : "tiene"

    LAB_TESTS ||--o{ LAB_REQUEST_ITEMS : "catalogo"
    LAB_REQUESTS ||--o{ LAB_REQUEST_ITEMS : "contiene"

    INVOICES ||--o{ INVOICE_ITEMS : "detalla"
    INVOICES ||--o{ PAYMENTS : "recibe"
    INVOICES ||--o{ INSURANCE_CLAIMS : "reclama"

    SUBSCRIPTIONS ||--o{ SUBSCRIPTION_INVOICES : "genera"
    PLANS ||--o{ SUBSCRIPTIONS : "basado en"
```

## Principios

- **Shared database**: Todos los tenants comparten las mismas tablas
- **Aislamiento**: Columna `tenant_id` en todas las tablas con datos de tenant
- **SQL raw**: Sin ORM, queries manuales con `pg`
- **Índices**: Cubren los patrones de consulta más comunes (fecha + tenant + estado)

---

Tags: #base-de-datos #modelo #er-diagram

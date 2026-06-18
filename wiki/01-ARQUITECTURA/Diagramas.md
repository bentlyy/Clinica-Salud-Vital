# Diagramas del Sistema

> Diagramas de arquitectura, secuencia y flujo de datos.

## Diagrama de Contenedores (C4 Nivel 2)

```mermaid
C4Context
    title Diagrama de Contenedores - Clínica Salud Vital

    Person(patient, "Paciente", "Usuario que reserva citas y ve su historial")
    Person(doctor, "Médico", "Usuario que gestiona agenda y registros clínicos")
    Person(admin, "Administrador", "Gestiona clínicas, usuarios y configuración")

    System_Boundary(clinic, "Sistema Clínica Salud Vital") {
        Container(web, "Frontend Web", "React 19, Vite 8", "Interfaz de usuario SPA")
        Container(api, "API Backend", "Express 4, TypeScript", "API REST monolito modular")
        ContainerDb(db, "Base de Datos", "PostgreSQL 15", "Almacenamiento persistente")
    }

    System_Ext(email_svc, "SendGrid/SMTP", "Notificaciones email")
    System_Ext(sms_svc, "Twilio", "SMS/WhatsApp")
    System_Ext(stripe, "Stripe", "Pagos")
    System_Ext(sentry, "Sentry", "Error tracking")

    Rel(patient, web, "Usa", "HTTPS")
    Rel(doctor, web, "Usa", "HTTPS")
    Rel(admin, web, "Usa", "HTTPS")
    Rel(web, api, "API calls", "HTTP/JSON")
    Rel(api, db, "SQL", "pg")
    Rel(api, email_svc, "Email")
    Rel(api, sms_svc, "SMS/WhatsApp")
    Rel(api, stripe, "Pagos")
    Rel(api, sentry, "Errores")
```

## Flujo de Autenticación

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API Server
    participant DB as PostgreSQL

    C->>A: POST /api/auth/login
    A->>DB: SELECT usuario por email
    DB-->>A: usuario + hash
    A->>A: bcrypt.compare(password, hash)
    A->>A: Verificar 2FA (si activo)
    A->>A: Generar access_token + refresh_token
    A-->>C: { access_token, refresh_token, user }
```

## Flujo de Reserva

```mermaid
sequenceDiagram
    participant P as Paciente
    participant A as API
    participant DB as PostgreSQL

    P->>A: GET /api/bookings/available-slots?doctor&date
    A->>DB: SELECT disponibilidad - excepciones - reservas
    DB-->>A: slots disponibles
    A-->>P: [{ time, duration }]

    P->>A: POST /api/bookings { doctor_id, date, time }
    A->>DB: BEGIN + pg_advisory_xact_lock
    A->>DB: Verificar slot libre
    A->>DB: INSERT booking
    A->>DB: COMMIT
    A-->>P: { booking }
```

---

Tags: #diagramas #c4 #mermaid

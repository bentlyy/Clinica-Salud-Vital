# SUB-6 — Diagramas (Mermaid)

> Herramienta `diagram-design` no disponible ⇒ Mermaid (decisión D-1).

## D1. Mapa de módulos, jobs y tablas

```mermaid
flowchart TB
  subgraph SUB6["SUB-6 Agenda y citas"]
    BK["booking<br/>citas + series + slots"]
    AV["availability<br/>disponibilidad + excepciones"]
    WL["waitlist<br/>lista de espera"]
    GU["guest<br/>reserva sin cuenta"]
    HO["holidays<br/>feriados"]
    CA["calendar<br/>export ICS"]
    RJ["reminder.job (cron)"]
  end
  BK --> T1[(bookings)]
  BK --> T2[(booking_series)]
  BK --> T3[(booking_status_history)]
  GU --> T1
  AV --> T4[(doctor_availability)]
  AV --> T5[(doctor_exceptions)]
  WL --> T6[(waitlist)]
  HO --> T7[(clinic_holidays)]
  BK -.->|validateBookingSlot| BU["shared/booking-utils"]
  GU -.->|validateBookingSlot| BU
  HO -->|notifyWaitlistForSlot| WL
  BK -->|notifyWaitlistForSlot| WL
  RJ --> T1
```

## D2. Validación de slot (fuente única `booking-utils`)

```mermaid
flowchart TD
  V[validateBookingSlot] --> H{feriado del tenant?}
  H -->|sí| E1[400 cerrada]
  H -->|no| A{dentro de doctor_availability?}
  A -->|no| E2[400 fuera de disponibilidad]
  A -->|sí| X{doctor_exception?}
  X -->|sí| E3[400 bloqueado por excepción]
  X -->|no| O{overlap con cita status != cancelled?}
  O -->|sí| E4[400 SLOT_ALREADY_BOOKED]
  O -->|no| OK[slot válido]
```

## D3. Crear / confirmar / cancelar cita — actores y efectos

```mermaid
sequenceDiagram
  participant P as Paciente
  participant API as booking.service
  participant DB as PostgreSQL
  participant WL as waitlist
  participant N as Notificaciones
  P->>API: POST /bookings (auth)
  API->>DB: BEGIN + advisory lock
  API->>DB: validateBookingSlot + INSERT confirmed=true, status=pending
  API->>DB: COMMIT
  API->>N: createNotification(in-app)
  API-->>P: 201 booking
  Note over API: email "Confirma tu cita" (token) ⚠ confirmed ya = true
  P->>API: PATCH /:id/cancel
  API->>DB: UPDATE status=cancelled (solo dueño)
  API->>WL: notifyWaitlistForSlot(doctor, fecha)
  API->>N: createNotification(in-app)
```

## D4. Ciclo de vida de la cita (estado implícito)

```mermaid
stateDiagram-v2
  [*] --> pending: POST (confirmed=true, status=pending)
  pending --> pending: reschedule (no cambia status)
  pending --> cancelled: PATCH cancel / DELETE guest / feriado
  cancelled --> cancelled: cancel repetido (sin guarda en UPDATE)
  note right of pending
    confirmBooking exige confirmed=FALSE (FND-D2)
    → nunca alcanza 'confirmed'; el boolean va desacoplado del status
  end note
  note right of cancelled
    booking.cancelBooking notifica waitlist + in-app
    guest.cancelGuestBooking NO (FND-D6)
  end note
```

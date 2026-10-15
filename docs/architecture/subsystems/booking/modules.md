# SUB-6 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB6-U1 | booking.routes | Router | `src/modules/booking/booking.routes.ts` | 12 endpoints de citas y series | 36 |
| SUB6-U2 | booking.controller | Controller | `src/modules/booking/booking.controller.ts` | Autorización por rol/dueño, orquestación | 136 |
| SUB6-U3 | booking.service | Service | `src/modules/booking/booking.service.ts` | Citas: CRUD, series, slots, confirm, locks | 894 |
| SUB6-U4 | booking.schema | Validación | `src/modules/booking/booking.schema.ts` | Zod citas/slots/series | 32 |
| SUB6-U5 | booking.email | Plantillas | `src/modules/booking/booking.email.ts` | HTML confirmación/reprogramación | 52 |
| SUB6-U6 | availability.routes | Router | `src/modules/availability/availability.routes.ts` | 5 endpoints disponibilidad + 3 excepciones | 77 |
| SUB6-U7 | availability.controller | Controller | `src/modules/availability/availability.controller.ts` | Restringe a doctor propio | 97 |
| SUB6-U8 | availability.service | Service | `src/modules/availability/availability.service.ts` | CRUD disponibilidad/excepciones, anti-solape | 190 |
| SUB6-U9 | waitlist.routes/controller | HTTP | `src/modules/waitlist/*` | 4 endpoints waitlist | 14/27 |
| SUB6-U10 | waitlist.service | Service | `src/modules/waitlist/waitlist.service.ts` | Join/leave/list + notificación de hueco | 188 |
| SUB6-U11 | guest.routes/controller/service | HTTP+Service | `src/modules/guest/*` | Reserva/consulta/cancelación sin cuenta | 26/44/175 |
| SUB6-U12 | holidays.routes/controller/service | HTTP+Service | `src/modules/holidays/*` | Feriados + cancelación en cascada | 14/—/166 |
| SUB6-U13 | calendar.routes/controller/service | HTTP+Service | `src/modules/calendar/*` | Exportación ICS | 19/—/111 |
| SUB6-U14 | reminder.job | Job (cron) | `src/jobs/reminder.job.ts` | Recordatorios 1h/24h | 120 |
| SUB6-U15 | booking-utils | Shared | `src/shared/booking-utils.ts` | Validación de slot (holiday/avail/excep/overlap) | 125 |
| SUB6-U16 | booking-history | Shared | `src/shared/booking-history.ts` | Inserta transiciones de estado | 39 |

## Notas

- **SUB6-U3 (`booking.service`)** es el archivo más grande del subsistema (894 líneas) y mezcla citas, series, slots, confirmación y densidad → candidato a descomposición.
- **SUB6-U11 (`guest`)** reimplementa la creación de citas (`createGuestBooking`) y la cancelación (`cancelGuestBooking`) **sin reutilizar** `booking.service` → divergencia funcional (FND-D6).
- **SUB6-U5/U12/U13** son los únicos módulos que **no** pasan por `booking-utils` para validar (los feriados usan su propia lógica; calendar solo lee).
- **SUB6-U15** es la única fuente de verdad de "¿se puede reservar este slot?" y la comparten `booking`, `guest`.

## Patrón general

Route/Schema/Controller/Service consistente en los 6 módulos. Excepciones:
- `waitlist.service` define su propio `parseEntry`/`WAITLIST_COLUMNS`.
- `holidays` define `parseHoliday`/`HOLIDAY_SELECT` y usa `SELECT * FROM UNNEST` para historial masivo.
- `calendar` introduce un util puro (`ics.util.ts`) sin acceso a BD.

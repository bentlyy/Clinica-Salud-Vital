# 16 — Agenda y citas

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `16` | `AGD` | C2 | Semanal | 32 | `13`, `17` | `20`, `21`, `22`, `24`, `25` |

## 1. Qué cubre

El ciclo de vida de una cita sobre el tenant `default`: listado de próximas y pasadas, alta simple,
disponibilidad y solape, confirmación, cancelación con motivo y liberación del slot,
reprogramación con reinicio de duración, cierre como `completed` y `no_show`, filtros por estado,
fecha y médico, aislamiento de lectura por rol, series recurrentes, slots públicos sin sesión,
aislamiento entre tenants, el trigger `phi_audit`, el enlace del email, los literales de rechazo en
inglés, la inaccesibilidad de `booking_status_history` y la ruta `GET /api/bookings?doctor_id=` que
el frontend llama y el backend no soporta.

No cubre: disponibilidad y feriados (`17`), reserva anónima por RUT (`18`), lista de espera
(`20`) ni envío de correo (`23`).

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `patient` | `/bookings`, `/appointments` | `GET`/`POST /api/bookings`, `PATCH .../:id/cancel`, `PATCH .../:id/reschedule`, `POST`/`DELETE /api/bookings/series[/:id]` |
| `doctor` | `/bookings` | `GET /api/bookings/doctor`, `PATCH .../:id/complete`, `PATCH .../:id/no-show` |
| `admin` | `/bookings`, `/calendar` | `GET /api/bookings/all`, `GET /api/bookings/density` |
| `anónimo` | `/booking` | `GET /api/bookings/available-slots` |

Rutas que el frontend llama y **no existen** (H-02, ejercitado en AGD-032):

| Ruta llamada | Ruta real | Efecto |
|---|---|---|
| `GET /api/bookings?doctor_id=` | `GET /api/bookings/doctor?doctor_id=` | `404`; `/calendar` inservible |
| `GET /api/availability` | `GET /api/availability/me` | `404`; filtro "Disponibilidad" vacío |
| `GET /api/availability/exceptions` | `GET /api/availability-exceptions/me` | `404` |
| `POST`/`DELETE /api/availability/exceptions/*` | `POST`/`DELETE /api/availability-exceptions` | `404` |

## 3. Precondiciones de datos

| ID | Requisito | Valor |
|---|---|---|
| PRE-01 | Paciente con historial | `user1@clinic.com` (`Vitaria.user1.<año>!`), tenant `default` |
| PRE-02 | Pacientes de apoyo | `user2@clinic.com`, `user3@clinic.com` (`Vitaria.user2.<año>!`, `Vitaria.user3.<año>!`) |
| PRE-03 | Médico con disponibilidad | `juan@clinic.com` (Cardiología), `Vitaria.juan.<año>!` · bloques del área `17` |
| PRE-04 | Otros médicos | `maria@clinic.com` (Derm.), `carmen@clinic.com` (Endocr.), `pedro@clinic.com` (Med. gral.) |
| PRE-05 | Administrador | `admin@clinic.com`, contraseña = `$ADMIN_PASSWORD` (**preguntar**) |
| PRE-06 | Fecha habil futura | `D+N` con `N >= 7`, con bloques de PRE-03 y sin fila en `clinic_holidays` |
| PRE-07 | Consola de BD | `psql` de solo lectura: obligatoria en AGD-026, AGD-028 y AGD-031 |
| PRE-08 | Buzón de captura | `EMAIL_TEST` no configurado por defecto: AGD-029 va `BLOQUEADO`, nunca `FALLÓ` |
| PRE-09 | Tenants de comparación | `admin@norte.clinic.com` (`clinica-norte`), `admin@demo.clinic.com` (`DemoVitaria2026!`, `clinica-demo`) |
| PRE-10 | Hora libre y hora ocupada | Anotadas con `GET /api/bookings/available-slots?doctor_id=<id>&date=<PRE-06>` |

Limpieza: los datos llevan prefijo `QA-`. Las citas se cancelan con
`PATCH /api/bookings/:id/cancel`; las que estorben se borran por `psql` con
`DELETE FROM bookings WHERE notes LIKE 'QA-%'`. Preguntar `SEED_YEAR` y `$ADMIN_PASSWORD` antes de empezar.

## 4. Casos

### [AGD-001] Listar las citas próximas y pasadas del usuario

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. `user1@clinic.com` tiene 2 citas futuras y 2 pasadas.
- **Datos:** `user1@clinic.com` = `Vitaria.user1.<año>!` · futura = `D+7` · pasada = `D-10`
- **Pasos:**
1. Iniciar sesión como `user1@clinic.com` y abrir `/bookings`.
2. Contar las citas de cada listado y anotar su criterio de orden.
- **Esperado:** `GET /api/bookings` → `200` con **solo** citas cuyo `user_id` es el de la sesión. Próximas = `date >= CURRENT_DATE` ascendente; pasadas = `date < CURRENT_DATE` descendente. Anotar si el cuerpo es array plano o viene envuelto en `data`. Rótulos bajo `bookings:`. Ninguna cita de `user2` o `user3`.
- **Red:** `GET /api/bookings` → `200`; verificar `id`, `date`, `time`, `status`, `confirmed`, `doctor_id`, `duration` en cada elemento.
- **Limpieza:** ninguna.

### [AGD-002] Crear una cita simple y confirmar el 201

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-06, PRE-10. El slot elegido aparece en `available-slots`.
- **Datos:** `{ "doctor_id": <PRE-03>, "date": "<YYYY-MM-DD, D+7>", "time": "<HH:MM libre de PRE-10>", "notes": "QA-consulta-control" }`
- **Pasos:**
1. Abrir `/bookings`, abrir el diálogo de nueva cita y guardar con `notes: "QA-consulta-control"`.
2. Anotar el código HTTP y el cuerpo completo de la respuesta.
- **Esperado:** **`201`** con `id` numérico, `date`, `time`, `duration` = `30` (o el `slot_duration` del médico), `status: "pending"`, `confirmed: false`, `user_id` del paciente, `tenant_id: "default"` y las notas. La cita aparece en próximas y el toast sale de `bookings:created` [verificar literal en es.json]. Si llega `confirmed: true`, anotar el par exacto: es el conflicto de AGD-020.
- **Red:** `POST /api/bookings` → `201`; verificar `id`, `status`, `confirmed`, `duration`, `tenant_id`.
- **Limpieza:** `PATCH /api/bookings/<id>/cancel` con `reason: "QA-cleanup-002"`.

### [AGD-003] Crear una cita en la fecha límite del CHECK

**Rol** `patient` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-06. Tres horas distintas del mismo médico en tres fechas.
- **Datos:** `date` = hoy · `date` = `D+1` · `date` = `D-1` (borde)
- **Pasos:**
1. Emitir tres `POST /api/bookings`, uno por fecha, en horas distintas.
2. Anotar código y mensaje de cada respuesta y consultar por `psql` qué filas quedaron.
- **Esperado:** hoy y `D+1` devuelven **`201`**: el `CHECK (date >= CURRENT_DATE - INTERVAL '1 day')` **admite ayer**, así que la frontera real está un día antes de lo que sugiere el nombre del caso. `D-1` debe dar **`400`**; si salta el `CHECK` sin filtrarse en el servicio la respuesta real sería `500`: **registrar el código literal** y anotarlo como hueco de validación. Ninguna fila en `D-1`.
- **Red:** tres respuestas de `POST /api/bookings`; contrastar con `SELECT date, status FROM bookings WHERE notes = 'QA-consulta-control'`.
- **Limpieza:** cancelar las dos creadas con `reason: "QA-cleanup-003"`; borrar por `psql` cualquier fila en `D-1`.

### [AGD-004] Rechazar la creación de una cita con fecha pasada

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-05.
- **Datos:** `date` = `D-7` · `date` = `D-30` (control) · `date` = `"2026-13-45"` (control de formato)
- **Pasos:**
1. Emitir los tres `POST /api/bookings` por red.
2. Repetir la fecha pasada desde el diálogo de `/bookings` y ver si el selector la ofrece.
- **Esperado:** **`400`** para `D-7` y `D-30`, con un mensaje que nombre la fecha [verificar literal: la UI muestra `bookings:` y el cuerpo trae `error`]. El formato inexistente también `400`. La UI **no debe ofrecer días pasados**: si los ofrece, es fallo de la misma caja.
- **Red:** tres respuestas de `POST /api/bookings`; el `400` debe nombrar el campo `date`.
- **Limpieza:** borrar por `psql` cualquier fila creada por el control.

### [AGD-005] Crear una cita sin disponibilidad publicada

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-05. Existe una fecha futura `D+N` **sin** filas en `doctor_availability`.
- **Datos:** `date` = `D+N` sin bloques · `time` = `09:00` · `time` = `23:00` (control fuera de bloque)
- **Pasos:**
1. Consultar `available-slots` para esa fecha y anotar el array.
2. Emitir `POST /api/bookings` con `09:00` y luego con `23:00`, copiando el mensaje literal.
- **Esperado:** el paso 1 da **`200`** con `[]`. Los dos `POST` dan **`400`**: el primero por día completo con el literal **`Doctor not available (full day blocked)`** y el segundo por fuera de bloque con **`Outside doctor availability`**. Ambos vienen de `src/shared/booking-utils.ts`, **en inglés y sin i18n** (**H-53**). Registrar el texto exacto.
- **Red:** un `200` con `[]` y dos `400` de `POST /api/bookings`; comparar el campo `error` de cada uno.
- **Limpieza:** ninguna (ninguna fila debe crearse).

### [AGD-006] Rechazar una cita que solapa con otra ya existente

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-06. AGD-002 dejó una cita viva de `user1` en `D+7`.
- **Datos:** mismo `(doctor_id, date, time)` que AGD-002 con `user_id` = `user2` · control con `time` 15 min posterior
- **Pasos:**
1. Emitir el `POST` con `user2@clinic.com` y la hora exacta de AGD-002.
2. Emitir el control con 15 minutos más tarde y contar filas por `psql`.
- **Esperado:** el paso 1 da **`400`** con el código **`BOOKING_SLOT_ALREADY_BOOKED`**. `GUEST_SLOT_BOOKED` es **inalcanzable**: el handler de la violación `23505` es código muerto porque `unique_booking` no es único (**H-06**). El paso 2 da **`201`**. El solape lo detecta `checkSlotOverlap` (`booking-utils.ts:78-95`) con **`make_interval`**, no portada al entorno de tests (**H-31**): verificar **a mano** que la detección ocurre y no por el índice. Un `POST` idéntico simultáneo también da `400`, no `500`.
- **Red:** dos respuestas de `POST /api/bookings`; verificar `code` en el `400` y que no hay filas duplicadas.
- **Limpieza:** cancelar la cita del control con `reason: "QA-cleanup-006"`.

### [AGD-007] Confirmar una cita en estado pending

**Rol** `patient` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03. Existe una cita `status: "pending"` creada por AGD-002.
- **Datos:** `confirmation_token` de la cita, leído por `psql` · control con un token inexistente
- **Pasos:**
1. Buscar en `/bookings` una acción de confirmar y anotarla si existe.
2. Invocar `POST /api/bookings/confirm/<token>` dos veces y releer la fila.
- **Esperado:** **`200`** con `{ "confirmed": true, "alreadyConfirmed": false }`, y la segunda llamada `alreadyConfirmed: true` sin reescribir. **El endpoint nunca escribe `status`** (catálogo C-07): la cita queda `confirmed: true` **y** `status: "pending"`, que es el conflicto de AGD-020. Literal UI bajo `bookings:`. Token inexistente → **`404`**.
- **Red:** dos `200` de `POST /api/bookings/confirm/:token` y un `404`.
- **Limpieza:** la cita queda confirmada; es el estado esperado.

### [AGD-008] Cancelar una cita con motivo

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. Existe una cita futura `status: "pending"` con `date >= D+7`.
- **Datos:** `reason` = `QA-cambio-de-planes` · cita a `D+7`
- **Pasos:**
1. En `/bookings`, localizar la cita de `D+7`, pulsar cancelar, escribir el motivo y confirmar.
2. Releer la cita en el listado de pasadas y por red.
- **Esperado:** **`200`** con `status: "cancelled"` y `cancellation_reason: "QA-cambio-de-planes"` persistido. Sale de próximas y entra en pasadas. `?status=cancelled` la trae y `?status=confirmed` no. Si devuelve `400` por **C-11** (fuera de plazo), anotar el literal del plazo permitido: es diseño, no defecto.
- **Red:** `PATCH /api/bookings/:id/cancel` → `200`; verificar `status` y `cancellation_reason`; después `GET /api/bookings` sin la cita en próximas.
- **Limpieza:** la cita queda `cancelled`, que es el estado esperado; para reutilizarla, `PATCH /api/bookings/:id/reschedule`.

### [AGD-009] Comprobar que la cancelación libera el slot

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** AGD-008 dejó una cita `cancelled` que ocupaba `<HH:MM>` de `D+7`.
- **Datos:** `available-slots` de PRE-03 en `D+7` antes y después de cancelar
- **Pasos:**
1. Anotar el array de `available-slots` con la cita viva.
2. Cancelar con `reason: "QA-cleanup-009"`, volver a pedir el array y comparar.
3. Crear una cita de `user2@clinic.com` en la hora liberada.
- **Esperado:** el primer array **no** contiene `<HH:MM>`; el segundo **sí**. Si el segundo devuelve el array viejo, repetir a los 60 s: la caché de `available-slots` retrasa el cambio. El paso 3 debe dar **`201`**, lo que confirma la liberación más allá de la UI.
- **Red:** dos `200` de `GET /api/bookings/available-slots` con la diferencia anotada, y un `201` de `POST /api/bookings` sobre la hora liberada.
- **Limpieza:** cancelar la cita nueva con `reason: "QA-cleanup-009"`.

### [AGD-010] Reprogramar una cita y medir el reinicio de duración

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-06. Existe una cita de 60 minutos (`duration: 60`) en un slot habilitado.
- **Datos:** nuevo `date` = `D+9` · nuevo `time` = `<HH:MM libre>` · control mandando `duration: 60` explícito
- **Pasos:**
1. Leer `duration` antes de reprogramar.
2. Reprogramar desde la UI **sin tocar el campo de duración** y releer por red y por `psql`.
3. Repetir el paso 2 mandando `duration: 60` explícito.
- **Esperado:** **`200`** con la nueva `date` y `time`, pero **`duration` vuelve a `30`**: `rescheduleBookingSchema` deja `duration` optional sin default y el servicio aplica `duration ?? 30` (**H-09**). Una cita de 60 min se reduce a 30 sin aviso ni rastro en el historial. El control con `duration` explícito **sí** lo respeta. El solape lo calcula `checkSlotOverlap` con `make_interval` (`booking-utils.ts:104-117`), corrección histórica **F-0** (**H-16**): un `500` sería regresión.
- **Red:** `PATCH /api/bookings/:id/reschedule` → `200`; verificar `date`, `time` y `duration`, y contrastar con la lectura previa.
- **Limpieza:** cancelar la cita reprogramada con `reason: "QA-cleanup-010"`.

### [AGD-011] Marcar una cita como no_show

**Rol** `doctor` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-04. Existe una cita de `juan@clinic.com` con `status: "confirmed"`.
- **Datos:** `booking_id` de la cita · control con un estado arbitrario, por ejemplo `archived`
- **Pasos:**
1. Como `juan@clinic.com`, marcar la cita como inasistencia desde `/bookings`.
2. Repetir la acción como `user1@clinic.com` y emitir el control con estado inventado.
- **Esperado:** `PATCH /api/bookings/:id/no-show` → **`200`** con `status: "no_show"`, valor válido del `CHECK` de `init.sql:83`; no hay ENUM. El intento como `patient` debe ser **`403`**. El estado inventado debe ser **`400`**: las transiciones **solo** se validan en TypeScript, sin máquina de estados en la base de datos; anotar el literal. Tras el cambio la cita no aparece en `?status=confirmed`.
- **Red:** un `200` de `PATCH /api/bookings/:id/no-show`, un `403` con sesión de paciente y un `400` con estado inventado.
- **Limpieza:** la cita queda `no_show`; para reutilizarla, reprogramarla.

### [AGD-012] Completar una cita al cerrarla

**Rol** `doctor` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-03. Existe una cita de `juan@clinic.com` con `date` de hoy o futura y `status: "confirmed"`.
- **Datos:** `booking_id` de la cita · control con la misma cita ya completada
- **Pasos:**
1. Marcar la cita como completada desde `/bookings` con la sesión del médico.
2. Repetir la acción sobre la misma cita y con la sesión de `user1@clinic.com`.
- **Esperado:** el paso 1 da **`200`** con `status: "completed"`. El paso 2 debe ser **`400`** por transición inválida, o **`200`** idempotente si el servicio no valida: **anotar el código real**, porque sin FSM en la BD la única barrera es el código TS. Como `patient` debe ser **`403`**. Una cita `completed` sigue ocupando su slot y desaparece de próximas.
- **Red:** dos respuestas de `PATCH /api/bookings/:id/complete` y un `403`; verificar `status` en la primera.
- **Limpieza:** la cita queda `completed`; es el estado esperado.

### [AGD-013] Comprobar que las citas pendientes aparecen en el historial del paciente

**Rol** `patient` · **Ruta** `/bookings` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02. `user1` tiene 1 cita `pending`, 1 `confirmed` y 1 `cancelled`.
- **Datos:** filtro de estado `pending` · sesiones de `user1` y de `admin`
- **Pasos:**
1. Abrir `/bookings` y aplicar el filtro `pending`.
2. Comparar con el listado sin filtro y repetir como `admin@clinic.com`.
- **Esperado:** el filtro del paciente devuelve **solo** sus citas `pending`, nunca las de `user2`. Sin filtro, las tres aparecen con su distintivo [verificar literal en es.json]. Como `admin` el mismo filtro devuelve el `pending` de **todo** el tenant: anotar los dos recuentos. Una cita `confirmed: true` con `status: "pending"` **aparece** aquí y **no** en el filtro de confirmadas (AGD-020).
- **Red:** `GET /api/bookings?status=pending` con las dos sesiones → `200`; comparar `length` y `id`.
- **Limpieza:** ninguna.

### [AGD-014] Filtrar el listado de citas por estado

**Rol** `admin` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-05. El tenant tiene al menos una cita en `pending`, `confirmed`, `cancelled`, `no_show` y `completed`.
- **Datos:** los cinco valores de `status` · `GET /api/bookings/all?status=<valor>`
- **Pasos:**
1. Aplicar cada estado del filtro de `/bookings`.
2. Anotar el nombre exacto del parámetro que envía el frontend en cada cambio.
3. Comparar con `GET /api/bookings/all?status=<valor>` emitido a mano.
- **Esperado:** cada filtro da **`200`** con el subconjunto correcto y los `id` coinciden con el `status` de cada fila. Un estado inexistente (`archived`) debe dar **`400`**, no el listado completo: el `CHECK` de `init.sql:83` lo impide en BD pero el servicio puede no validar el parámetro. **Anotar el comportamiento real** y el nombre del parámetro (`status` o `booking_status`).
- **Red:** cinco peticiones con `status` distinto → `200`; verificar que cada `id` cumple el filtro.
- **Limpieza:** ninguna.

### [AGD-015] Filtrar el listado de citas por rango de fechas

**Rol** `admin` · **Ruta** `/bookings` · **P2** · **Resultado** `______`
- **Precondición:** PRE-05. El tenant tiene citas repartidas en al menos tres meses.
- **Datos:** rango = `D+5` … `D+20` · nombres de parámetro observados en la red
- **Pasos:**
1. Aplicar el filtro de fechas de `/bookings` y copiar de la red el nombre y el formato exactos de los parámetros.
2. Repetir la misma consulta a mano con esos parámetros y con los nombres alternativos habituales.
- **Esperado:** el listado cae **dentro** del rango y ninguna cita queda fuera. Si el frontend manda un nombre que el backend no reconoce, el filtro **no aplica nada** y devuelve el listado completo: es el resultado a documentar. El `CHECK` impide crear citas pasadas por API, así que el rango empieza en el futuro. Registrar el default del backend cuando el frontend no manda parámetros.
- **Red:** las peticiones con los parámetros observados y con las dos variantes de nombre → `200`; comparar `length` y la fecha mínima y máxima de cada respuesta.
- **Limpieza:** ninguna.

### [AGD-016] Filtrar la agenda por un médico concreto

**Rol** `admin` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-04, PRE-05. `juan` y `maria` tienen agenda en la misma semana.
- **Datos:** `doctor_id` de cada uno · `GET /api/bookings/doctor?doctor_id=<id>`
- **Pasos:**
1. Como `admin@clinic.com`, filtrar la agenda por `juan@clinic.com` y luego por `maria@clinic.com`.
2. Emitir `GET /api/bookings/doctor?doctor_id=<id>` a mano para ambos.
- **Esperado:** cada filtro devuelve solo las citas de su médico y los dos conjuntos no comparten ni un `id`. La ruta real es `GET /api/bookings/doctor`, **restringida al rol `doctor`**: como `admin` puede dar **`403`**; anotar el código real y repetir con la sesión de `juan@clinic.com`. No confundir con `GET /api/bookings?doctor_id=` (AGD-032, **H-02**).
- **Red:** dos o cuatro respuestas de `GET /api/bookings/doctor` según el rol; verificar `doctor_id` en cada elemento y la ausencia de intersección.
- **Limpieza:** ninguna.

### [AGD-017] Comprobar que el paciente solo ve sus propias citas

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02. `user2@clinic.com` tiene 2 citas en `D+7` y `D+8`.
- **Datos:** `user1@clinic.com` = `Vitaria.user1.<año>!` · `user2@clinic.com` = `Vitaria.user2.<año>!`
- **Pasos:**
1. Listar las citas como `user1` y anotar todos los `id`.
2. Repetir como `user2` y anotar todos los `id`.
3. Como `user2`, abrir por `id` directo una cita de `user1` y intentar cancelarla.
- **Esperado:** los dos listados **no comparten ningún `id`**: el filtro por `user_id` está en el servicio, no solo en la UI. El paso 3 debe dar **`403`** o **`404`** con `GET /api/bookings/<id_ajeno>` y con `PATCH /api/bookings/<id_ajeno>/cancel`; un `200` con la ficha ajena sería un BOLA (IDOR). Registrar el código exacto de los tres intentos.
- **Red:** dos `200` de `GET /api/bookings` con listados disjuntos, más `GET /api/bookings/<id_ajeno>` y `PATCH /api/bookings/<id_ajeno>/cancel` con la sesión equivocada.
- **Limpieza:** ninguna.

### [AGD-018] Comprobar que el médico solo ve su propia agenda

**Rol** `doctor` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-04. `juan@clinic.com` y `carmen@clinic.com` tienen citas en la misma semana.
- **Datos:** `Vitaria.juan.<año>!` · `Vitaria.carmen.<año>!`
- **Pasos:**
1. Abrir `/bookings` como `juan` y anotar médicos que aparecen e `id` de cita.
2. Repetir como `carmen`.
3. Como `juan`, pedir la cita de un paciente que solo atiende `carmen`.
- **Esperado:** en cada paso todos los elementos tienen `doctor_id` igual al del médico en sesión, y los dos conjuntos son disjuntos. El paso 3 debe dar **`403`** o **`404`**. Si `/bookings` pintara la agenda completa, es fuga entre profesionales: registrar las citas ajenas visibles.
- **Red:** dos `200` del listado que use `/bookings` para el rol `doctor` con `doctor_id` constante, y una respuesta `403`/`404`.
- **Limpieza:** ninguna.

### [AGD-019] Comprobar que el administrador ve toda la agenda de la clínica

**Rol** `admin` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-05. Los cuatro médicos tienen citas en el rango de prueba.
- **Datos:** `admin@clinic.com` = `$ADMIN_PASSWORD` (**preguntar**) · `GET /api/bookings/all` · `GET /api/bookings/density`
- **Pasos:**
1. Abrir `/bookings` como `admin` y anotar número de citas y de médicos distintos.
2. Emitir `/all` y `/density` a mano.
- **Esperado:** el listado contiene citas de **los cuatro** médicos. `/all` → `200` y `/density` → `200` con una fila por día con al menos una cita. Si `/density` devuelve días vacíos, la rejilla muestra bloques sin citas reales. Anotar si `density` excluye `cancelled` y si sus totales cuadran con `/all`.
- **Red:** dos `200`; verificar `doctor_id` en varios elementos y el `count` por día de la densidad.
- **Limpieza:** ninguna.

### [AGD-020] Documentar la discrepancia entre confirmed y status

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-05, PRE-07. Existe al menos una cita con `confirmed = true` y `status = "pending"` (AGD-007 o AGD-022).
- **Datos:** `SELECT id, confirmed, status FROM bookings WHERE confirmed = true AND status = 'pending'` · dos listados filtrados
- **Pasos:**
1. Por `psql`, listar las filas donde `confirmed` y `status` se contradicen.
2. Contar cuántas devuelve cada filtro y comparar ambos conjuntos de `id`.
- **Esperado:** los dos listados **muestran conjuntos distintos** y ninguno contiene al otro: el filtro por `status` ignora el booleano y el inverso ignora el texto. La fila existe porque `bookings` mantiene **dos campos de estado** coexistentes; no es bug de UI (**H-33**, **H-43**). Registrar el recuento de filas inconsistentes: si es mayor que cero, todo KPI o `.ics` cuenta citas distintas del otro (`25`). **No** re-reportar como hallazgo nuevo.
- **Red:** dos `200` de listado con filtros distintos; comparar `length` e intersección de `id` con la consulta de `psql`.
- **Limpieza:** ninguna.

### [AGD-021] Crear una serie de citas recurrentes

**Rol** `patient` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-06. La fecha de inicio y las siguientes tienen bloques.
- **Datos:** `{ "doctor_id": <PRE-03>, "date": "<YYYY-MM-DD, D+7>", "time": "<HH:MM>", "frequency": "weekly", "occurrences": 3, "notes": "QA-serie-control" }` · control con `frequency: "quincenal"`
- **Pasos:**
1. Crear la serie desde la UI si existe la acción, o emitir `POST /api/bookings/series`.
2. Contar las filas por `psql` y listarlas por `GET /api/bookings`.
- **Esperado:** **`201`** con `series_id` y **3 ocurrencias** en `D+7`, `D+14` y `D+21`, con el mismo `series_id` y `notes: "QA-serie-control"`. Se aceptan `daily`, `weekly` y `monthly`; `quincenal` debe ser **`400`**. Si una ocurrencia cae en día sin bloques o feriado, la serie **debe** fallar o crear menos filas: **anotar cuál**.
- **Red:** `POST /api/bookings/series` → `201`; verificar `series_id` y `occurrences`; `SELECT count(*) FROM bookings WHERE series_id = <id>` → `3`.
- **Limpieza:** `DELETE /api/bookings/series/<series_id>`, o `DELETE FROM bookings WHERE series_id = <id>` por `psql` si no se quiere conservar evidencia.

### [AGD-022] Verificar el estado con el que nacen las ocurrencias de una serie

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** AGD-021 dejó la serie viva con `series_id` conocido.
- **Datos:** `SELECT id, series_id, confirmed, status FROM bookings WHERE series_id = <id>` · `?status=confirmed` · `?status=pending`
- **Pasos:**
1. Por `psql`, leer `confirmed` y `status` de las 3 ocurrencias.
2. Contar la serie en cada uno de los dos filtros y anotar qué lista la ve el paciente.
- **Esperado:** las ocurrencias **nacen con `confirmed = true` y `status = "pending"`** a la vez: `createBookingSeries` escribe el booleano sin escribir el texto (**H-33**). Son **invisibles** para todo lo que filtra `status = 'confirmed'` (agenda, métricas, `.ics`) y **visibles** para lo que filtra `confirmed = true`. Anotar los tres pares exactos y los dos recuentos. **No** re-reportar como hallazgo nuevo.
- **Red:** dos `200` de listado con filtros opuestos; los 3 `id` de la serie aparecen en uno y no en el otro.
- **Limpieza:** cancelar la serie con `DELETE /api/bookings/series/<series_id>`.

### [AGD-023] Comprobar si una serie se puede modificar

**Rol** `admin` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** AGD-021 dejó una serie de 3 ocurrencias con `series_id` conocido.
- **Datos:** control `PATCH /api/bookings/series/<id>` con `time` nueva y `occurrences: 4` (existen `POST` y `DELETE /api/bookings/series`)
- **Pasos:**
1. Buscar en `/bookings` una acción de editar serie y ejecutarla si aparece.
2. Emitir el `PATCH` y releer las ocurrencias con `date >= CURRENT_DATE`.
- **Esperado:** el paso 2 da **`404`**: el backend expone `POST /api/bookings/series` y `DELETE /api/bookings/series/:id`, y **no hay ruta de modificación** [verificar en `booking.routes.ts`]. El producto debería cambiar **solo** las ocurrencias futuras: no verificable. Registrar el `404` literal, o el código real si la ruta apareciera. Si la UI ofrece un botón de editar serie, es un control que llama a una ruta inexistente: **hallazgo nuevo** al confirmarlo.
- **Red:** la respuesta del `PATCH` y, como control, `GET /api/bookings` confirmando que las 3 ocurrencias siguen intactas.
- **Limpieza:** cancelar la serie con `DELETE /api/bookings/series/<series_id>`.

### [AGD-024] Cancelar una serie completa

**Rol** `patient` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01. Existe una serie viva de 3 ocurrencias, una ya pasada.
- **Datos:** `series_id` conocido · `DELETE /api/bookings/series/<id>`
- **Pasos:**
1. Cancelar la serie desde la UI si existe la acción, o emitir el `DELETE`.
2. Releer las 3 ocurrencias y consultar `available-slots` de sus fechas.
- **Esperado:** **`200`** y las **3** ocurrencias quedan `status: "cancelled"`, incluida la pasada. Las citas salen de próximas y los slots vuelven a estar disponibles (misma comprobación que AGD-009). Si cancela **solo** las futuras, anotar el recuento: discrepancia frente al catálogo C-14.
- **Red:** `DELETE /api/bookings/series/:id` → `200`; `GET /api/bookings` → `200` sin ocurrencias activas; `available-slots` devuelve las horas liberadas.
- **Limpieza:** la serie queda cancelada, que es el estado esperado; borrado por `psql` si se quiere dejar el tenant limpio.

### [AGD-025] Obtener los slots públicos sin sesión

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-06 y un cliente HTTP capaz de omitir cabeceras.
- **Datos:** `GET /api/bookings/available-slots?doctor_id=<PRE-03>&date=<PRE-06>` sin cookie ni `X-Tenant-Id`
- **Pasos:**
1. Emitir la petición sin ninguna cabecera.
2. Repetir con `X-Tenant-Id: default`.
3. Emitirla con la sesión de `admin@clinic.com` como control.
- **Esperado:** el paso 1 da **`200`** con el mismo array de cadenas `HH:MM`. **Nunca** un `400` por cabecera de tenant ausente: `/api/bookings/available-slots` está en `PUBLIC_PATHS` (`tenant.middleware.ts:16-33`), la regresión histórica **F-0b** ya corregida (**H-17**). Si aparece el `400`, anotar `FALLÓ (defecto conocido: H-17)`. El array sale `[]` si hay fila en `clinic_holidays`.
- **Red:** tres `200` con cuerpos idénticos; anotar si traen `Cache-Control`.
- **Limpieza:** ninguna.

### [AGD-026] Comprobar que bookings no tiene columna updated_at

**Rol** `admin` · **Ruta** `—` · **P2** · **Resultado** `______`
- **Precondición:** PRE-05, PRE-07. Consola `psql` de solo lectura disponible.
- **Datos:** `\d bookings` · `SELECT * FROM bookings ORDER BY id DESC LIMIT 1` · `GET /api/bookings/:id`
- **Pasos:**
1. Ejecutar `\d bookings` y enumerar las columnas.
2. Leer una fila entera y enumerar sus claves.
3. Ejecutar `SELECT 1 FROM bookings ORDER BY updated_at LIMIT 1` y buscar en la UI un orden por "última modificación".
- **Esperado:** **no existe `updated_at`**: el paso 3 falla con el error de columna inexistente y el paso 2 no la trae. Consecuencia: **no se puede ordenar por fecha de modificación**; el único orden posible es `date`, `time` o `created_at`. Si la UI ofrece ese control, no puede funcionar: anotarlo. Verificar también que **no** existen `updated_by` ni `cancelled_at`, lo que impide saber quién canceló una cita salvo por `booking_status_history`.
- **Red:** `GET /api/bookings/:id` → `200`; enumerar las claves del cuerpo y confirmar la ausencia de `updated_at`.
- **Limpieza:** ninguna.

### [AGD-027] Aislar la agenda entre tenants

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-05, PRE-09. `clinica-demo` y `clinica-norte` tienen citas propias.
- **Datos:** sesiones de `admin@clinic.com` (`default`), `admin@demo.clinic.com` (`clinica-demo`), `admin@norte.clinic.com` (`clinica-norte`)
- **Pasos:**
1. Listar la agenda en los tres tenants y anotar el `tenant_id` de cada fila.
2. Con la sesión de `default`, pedir por `id` una cita de `clinica-demo`.
3. Crear en `default` una cita con un `doctor_id` que existe en `clinica-demo` en la misma fecha y hora.
- **Esperado:** el paso 1 devuelve en cada tenant **solo** filas con su `tenant_id`, y los tres conjuntos son disjuntos. El paso 2 da **`404`** o `[]`, nunca la cita ajena. El paso 3 es el riesgo real: `unique_booking (doctor_id, date, time)` es **global y no incluye `tenant_id`** (**H-06**), así que el `INSERT` del segundo falla con `23505` aunque la agenda del otro sea ajena. Verificar que `X-Tenant-Id` refleja el tenant de la sesión y no el `default` por defecto.
- **Red:** tres `200` de listado con `tenant_id` constante, un `404` en el paso 2 y un `201` o `23505` en el paso 3.
- **Limpieza:** cancelar la cita creada con `reason: "QA-cleanup-027"`; no dejar nada en `clinica-demo`.

### [AGD-028] Contar las filas que el trigger phi_audit añade en audit_logs

**Rol** `admin` · **Ruta** `/bookings` · **P2** · **Resultado** `______`
- **Precondición:** PRE-05, PRE-07. Acceso de solo lectura a `audit_logs`.
- **Datos:** `SELECT count(*) FROM audit_logs` antes y después · filas nuevas con `created_at`, `action`, `entity_type`, `user_id`
- **Pasos:**
1. Anotar el total de filas de `audit_logs` y el de las relacionadas con `bookings`.
2. Crear una cita con `notes: "QA-auditoria"`.
3. Repetir los dos `count` y listar las filas nuevas.
- **Esperado:** el `INSERT` en `bookings` dispara `phi_audit` y **añade filas extra** que el caso de negocio no pidió: el crecimiento **no** es 1. Registrar el delta exacto y el desglose de `action` y `entity_type`. Si el total **no** cambia, el trigger no cubre `bookings` y la auditoría de citas es un hueco: anotarlo con el `SELECT` sobre `pg_trigger`. Las filas deben traer `user_id` del actor y `tenant_id` coherente; un `default` en otro tenant es hallazgo de aislamiento.
- **Red:** `POST /api/bookings` → `201`; contrastar los dos pares de `count` de `audit_logs`.
- **Limpieza:** cancelar la cita con `reason: "QA-cleanup-028"`. Las filas de `audit_logs` **no se borran**: son evidencia.

### [AGD-029] Comprobar el enlace del email de confirmación de cita

**Rol** `patient` · **Ruta** `/bookings` · **P2** · **Resultado** `______`
- **Precondición:** PRE-08. **Sin `EMAIL_TEST` el caso es `BLOQUEADO`**, nunca `FALLÓ`.
- **Datos:** `EMAIL_TEST` (preguntar) · `FRONTEND_URL` y `RENDER_EXTERNAL_URL` del servidor (preguntar)
- **Pasos:**
1. Con buzón, crear una cita con `user2@clinic.com` y capturar el correo.
2. Inspeccionar el href del enlace de gestión de la cita y anotar el host completo.
3. Abrir el enlace en ventana limpia y anotar si carga la aplicación.
- **Esperado:** el enlace se construye como **`FRONTEND_URL || RENDER_EXTERNAL_URL || 'http://localhost:5173'`** (**H-08**). Sin esas variables el correo apunta a **`http://localhost:5173`**: el enlace **no abre nada** para el paciente y el envío queda registrado como correcto, así que el fallo es invisible en pruebas locales. Anotar el host literal del correo, no el de `BASE_URL`. Sin correo, `BLOQUEADO`.
- **Red:** `POST /api/bookings` → `201`; registrar el `id` para la limpieza.
- **Limpieza:** cancelar la cita con `PATCH /api/bookings/:id/cancel` y `reason: "QA-cleanup-029"`.

### [AGD-030] Comprobar los literales de rechazo de disponibilidad en inglés

**Rol** `patient` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-05. Fecha futura sin bloques y fecha futura con una excepción de agenda (área `17`).
- **Datos:** los cuatro literales esperados: `No hay disponibilidad…`, `Outside doctor availability`, `Doctor not available (full day blocked)`, `Time blocked by doctor exception`
- **Pasos:**
1. Provocar el rechazo por día completo, por hora fuera de bloque, por excepción de agenda y por feriado.
2. Cambiar la interfaz a `en` y repetir el primero.
- **Esperado:** los cuatro mensajes salen **crudos desde `src/shared/booking-utils.ts`**, **en inglés y sin i18n** (**H-53**): tres literales en inglés y el de día cerrado empezando por `No hay disponibilidad`. En el paso 2 los mensajes **siguen igual** con la interfaz en `en`. Anotar la clave de `es.json` que debería traducirlos. **No** re-reportar como hallazgo nuevo.
- **Red:** cuatro o cinco `400` de `POST /api/bookings`; copiar el campo `error` de cada cuerpo tal cual.
- **Limpieza:** ninguna; eliminar la excepción de agenda creada, si la hubo.

### [AGD-031] Comprobar que booking_status_history no es accesible desde la app

**Rol** `admin` · **Ruta** `—` · **P1** · **Resultado** `______`
- **Precondición:** PRE-07. Acceso de solo lectura a `booking_status_history`.
- **Datos:** `SELECT * FROM booking_status_history WHERE booking_id = <id>` · `GET /api/bookings/:id/history` · `GET /api/bookings/:id/status-history`
- **Pasos:**
1. Contar y listar por `psql` las filas de una cita con `from_status`, `to_status`, `changed_at`.
2. Cancelar la cita, repetir el `SELECT` y buscar en la UI cualquier historial de estados.
3. Emitir las dos rutas candidatas.
- **Esperado:** el paso 2 **añade una fila**: cada cambio de estado inserta en `booking_status_history` (`db/migrations/012_booking_status_history.sql`). Pero **no hay vista ni endpoint que lo lea** (**H-32**): el paso 3 da **`404`** en ambas rutas y la UI no muestra historial. Es la **única** fuente de quién y cuándo cambió una cita: `bookings` tampoco tiene `updated_at` ni `updated_by` (AGD-026). Registrar el contenido literal de las filas. **No** re-reportar como hallazgo nuevo.
- **Red:** dos `404` de las rutas de historial y un `200` de `GET /api/bookings/:id` cuyo cuerpo **no** incluye el historial.
- **Limpieza:** la cita queda `cancelled`; las filas de `booking_status_history` no se tocan (son evidencia).

### [AGD-032] Emitir la ruta de citas por médico que el frontend llama y el backend no soporta

**Rol** `admin` · **Ruta** `/calendar` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-05. `/calendar` existe en el router para el rol `admin`.
- **Datos:** `GET /api/bookings?doctor_id=<id>` · `GET /api/availability` · `GET /api/availability/exceptions` · `POST /api/availability/exceptions/<id>` · `DELETE /api/availability/exceptions/<id>`
- **Pasos:**
1. Abrir `/calendar` como `admin@clinic.com` con la red visible.
2. Anotar las peticiones que emite al cargar y con qué status.
3. Emitir a mano las cinco rutas y contrastar con las reales.
- **Esperado:** las cinco rutas que el frontend llama dan **`404`**: no existen en el backend (`src/app.ts:268-269`) (**H-02**). Como `Promise.all` rechaza en el primer `404`, la pantalla pinta estado de error con el **calendario vacío** y ningún evento. Las reales son `GET /api/bookings/doctor`, `GET /api/availability/me`, `GET /api/availability-exceptions/me` y `POST`/`DELETE /api/availability-exceptions`. Anotar el texto del error. Si alguna respondiera `200`, reportarlo como discrepancia del catálogo.
- **Red:** cinco `404` de las rutas de la tabla de datos; como control, `GET /api/bookings/doctor` y `GET /api/availability/me` → `200`.
- **Limpieza:** ninguna.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
|---|---|---|---|
| H-02 | 4 rutas que el frontend llama **no existen** | AGD-032 (AGD-016 como contraste) | `GET /api/bookings?doctor_id=`, `GET /api/availability`, `GET /api/availability/exceptions` y `POST\|DELETE /api/availability/exceptions/*` → `404`; `/calendar` vacío |
| H-08 | El email puede apuntar a `localhost:5173` | AGD-029 | `FRONTEND_URL \|\| RENDER_EXTERNAL_URL \|\| 'http://localhost:5173'`; enlace no navegable con envío registrado como correcto |
| H-09 | Reprogramar reinicia la `duration` a 30 min | AGD-010 | `duration` optional sin default en el esquema y `duration ?? 30` en el servicio: 60 min pasan a 30 sin aviso |
| H-16 | Regresión histórica F-0 (`checkSlotOverlap`) sin verificar en deploy | AGD-006, AGD-010 | `booking-utils.ts:104-117` usa `make_interval`: crear cita → `201` y reprogramar → `200`, nunca `500` |
| H-17 | Regresión histórica F-0b (`X-Tenant-Id` en endpoints públicos) | AGD-025 | `PUBLIC_PATHS` (`tenant.middleware.ts:16-33`): `available-slots` → `200` sin cabecera, nunca `400` |
| H-31 | La detección de solape **no tiene test** (`make_interval` sin portar) | AGD-006 | `booking-utils.ts:78-95`: el solape se detecta a mano; si la expresión cambia, se aceptan solapes en silencio |
| H-32 | El historial de estados no es accesible desde la app | AGD-031 | `012_booking_status_history.sql`: cada cambio inserta fila, pero no hay vista ni endpoint de lectura; `404` en ambas rutas |
| H-33 | `createBookingSeries` deja `confirmed = true` con `status = 'pending'` | AGD-022 (y AGD-020) | Las ocurrencias son invisibles para lo que filtra `status = 'confirmed'` y visibles para lo que filtra `confirmed = true` |
| H-53 | Mensajes de rechazo en inglés, sin i18n | AGD-005, AGD-006, AGD-030 | Literales crudos de `booking-utils.ts`: `Outside doctor availability`, `Doctor not available (full day blocked)`, `Time blocked by doctor exception`, y el que empieza por `No hay disponibilidad` |

> H-06 (`unique_booking` global sin `tenant_id`) y H-43 (nacimiento con `confirmed = true` y
> `status = 'pending'`) se ejercitan en AGD-006, AGD-027, AGD-007 y AGD-020, y se anotan allí.

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Cómo verificarlo |
|---|---|---|
| `bookings` no tiene `updated_at` | No hay orden por modificación ni autoría del cambio | AGD-026: `\d bookings` y `ORDER BY updated_at` → error |
| `booking_status_history` sin vista ni endpoint | Todo el rastro de estados solo se lee por `psql` | AGD-031: `GET /api/bookings/:id/history` → `404` |
| No hay ruta de modificación de series | No se puede verificar que editar una serie cambie solo las futuras | AGD-023: `PATCH /api/bookings/series/:id` → `404` |
| No hay confirmación para citas autenticadas | El único confirmar es por token y nunca escribe `status` | AGD-007: el `status` sigue `pending` tras confirmar |
| Sin máquina de estados en la base de datos | Las transiciones inválidas dependen solo de TypeScript | AGD-011, AGD-012: control con estado arbitrario |
| `confirmed` y `status` son dos fuentes de verdad | Dos filtros del mismo listado difieren y los KPIs no cuadran | AGD-020, AGD-022 |
| `unique_booking` es global, sin `tenant_id` | Sin red de seguridad en BD ante concurrencia ni entre tenants | AGD-006, AGD-027 |
| Los rechazos de disponibilidad no pasan por i18n | Cuatro literales en inglés en una app de 4 idiomas | AGD-030 |
| `GET /api/bookings?doctor_id=` no existe | `/calendar` inservible; el filtro real va por otra ruta | AGD-032: `404` y estado de error |
| Sin `EMAIL_TEST` no se valida el enlace | H-08 queda sin verificar y el caso va `BLOQUEADO` | AGD-029: `BLOQUEADO`, no `FALLÓ` |
| El filtro por rango de fechas no está documentado | Los parámetros reales solo se conocen en la red | AGD-015: copiar los parámetros observados |
| El login usa reCAPTCHA | Sin `RECAPTCHA_HUMAN=true` no hay sesión y todo va `BLOQUEADO` | `00-README.md` §5: el operador resuelve el widget |

## 7. Resultado del área

| Campo | Valor |
|---|---|
| Casos ejecutados | `____ / 32` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 9` |
| Huecos confirmados | `____ / 12` |
| Evidencia guardada en | `pruebas-navegador/evidencia/16-agenda-citas/` |
| Tester / fecha | `________________` |

Criterio de aprobado: los 32 casos ejecutados, sin `FALLÓ` en AGD-001 a AGD-006, AGD-008 a AGD-010,
AGD-017 a AGD-020 y AGD-025, con H-16 y H-17 verificados en el deploy. El número de filas con
`confirmed` y `status` contradictorios (AGD-020) es el que hay que dejar por escrito: si es mayor que
cero, ningún KPI de `25` ni el `.ics` de `17` se validan contra la tabla de citas.

---

*Alcance: 32 casos del ciclo de vida de citas sobre el tenant `default`, más los controles de
aislamiento entre `default`, `clinica-demo` y `clinica-norte`. Fecha de redacción: 2026-10-01.*

# 17 — Disponibilidad, calendario y feriados

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `17` | `AVL` | C2 | Semanal | 30 | `13` | `16`, `18` |

## 1. Qué cubre

Alta, edicion, borrado y solapamiento de bloques semanales de `doctor_availability`; el campo `day_of_week` y sus tres convenciones en conflicto (H-01); excepciones de horario del medico (`doctor_exceptions`) y la imposibilidad de crearlas (H-34); la pantalla `/calendar` con FullCalendar y sus cuatro rutas rotas (H-02) y el desplazamiento de dias (H-03); feriados de clinica (`clinic_holidays`), su efecto sobre los slots y la cancelacion masiva de citas; la exportacion del calendario `.ics` (conformidad RFC 5545, cota de rango, excepciones parciales); y el aislamiento de la disponibilidad por tenant.

No cubre: la reserva de invitado (area `18`), el ciclo de vida de la cita mas alla de la cancelacion por feriado (area `16`), ni la traduccion completa de la aplicacion (area `31`).

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `doctor` | `/availability`, `/calendar` | `GET /api/availability/me`, `POST /api/availability`, `POST /api/availability/bulk`, `DELETE /api/availability/:id`, `GET /api/availability-exceptions/me`, `POST /api/availability-exceptions`, `DELETE /api/availability-exceptions/:id`, `GET /api/calendar/doctor/:doctorId/ics` |
| `admin` | `/holidays`, `/calendar` | `GET /api/holidays`, `POST /api/holidays`, `DELETE /api/holidays/:id`, `GET /api/calendar/doctor/:doctorId/ics` |
| `patient`, `user` | — | `POST /api/availability` debe responder 403 |
| `cualquiera` (autenticado) | `/booking` | `GET /api/bookings/available-slots` |
| `anónimo` | — | `GET /api/availability/:id` (ruta publica, H-37) |

Superficie real de rutas (verificada en `src/app.ts:265-291` y en los `*.routes.ts`): no existe versionado, el prefijo es `/api` y **no existe `PATCH /api/availability/:id`** ni ninguna ruta de edicion.

## 3. Precondiciones de datos

| ID | Requisito | Valor |
|---|---|---|
| PRE-01 | Sesion `doctor` | `juan@clinic.com`, contrasena `Vitaria.juan.<año>!`, tenant `default` |
| PRE-02 | Sesion `doctor` alterna | `maria@clinic.com`, `Vitaria.maria.<año>!` |
| PRE-03 | Sesion `admin` | `admin@clinic.com`, contrasena `$ADMIN_PASSWORD` (preguntar), tenant `default` |
| PRE-04 | Tenant de comparacion | `admin@demo.clinic.com` / `DemoVitaria2026!` (plan `pro`) |
| PRE-05 | Fecha de trabajo | Dia habil futuro, sin feriado en `clinic_holidays` |
| PRE-06 | Bloques de PRE-01 | Al menos un bloque `day_of_week = 1` (lunes) de 09:00 a 17:00 |
| PRE-07 | Herramienta HTTP | Cliente capaz de fijar `X-Tenant-Id` a mano, Cookies y `X-CSRF-Token` (AVL-007, AVL-021, AVL-026) |
| PRE-08 | Consola de BD | `psql` con acceso de solo lectura para AVL-018, AVL-019 y AVL-020 (opcional; si no existe, marcar `OMITIDO` la parte SQL) |

Regla de limpieza: todo bloque, excepcion y feriado creado se borra con su endpoint. Los datos de prueba se prefijan con `QA-`.

## 4. Casos

### [AVL-001] Crear un bloque horario propio y rechazar a los roles sin permiso

**Rol** `doctor` · **Ruta** `/availability` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03. El medico no tiene ningun bloque con `day_of_week = 1`.
- **Datos:** `day_of_week` = `1` · `start_time` = `09:00` · `end_time` = `13:00`
- **Pasos:**
1. Abrir `/availability` como `juan@clinic.com` y pulsar "Agregar Horario" (`availability:add_schedule`).
2. Elegir "Lunes" (`availability:dayLabels.monday`), `09:00`–`13:00` y guardar.
3. Repetir el mismo `POST` con la sesion de `patient` (`user1@clinic.com`) y despues con la de `admin`.
- **Esperado:** el paso 2 responde `201` y el bloque aparece en la rejilla con `09:00 - 13:00`; toast `availability:availabilitySaved`. Los pasos 3 responden `403` en ambos casos y **no crean ninguna fila**. Ningún `403` debe dejar fila en `doctor_availability`.
- **Red:** `POST /api/availability` con `{ "day_of_week": 1, "start_time": "09:00", "end_time": "13:00" }` → `201`; repetir con `patient` y `admin` → `403`. Verificar `id`, `doctor_id`, `start_time` y `end_time` en el cuerpo del 201.
- **Limpieza:** borrar el bloque con `DELETE /api/availability/<id>` al terminar AVL-006.

### [AVL-002] Crear los siete dias de la semana y documentar el fallo del domingo

**Rol** `doctor` · **Ruta** `/availability` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. El medico no tiene bloques.
- **Datos:** siete cuerpos con `day_of_week` = `1..7`, cada uno con `start_time` `08:00` y `end_time` `12:00`
- **Pasos:**
1. Enviar los siete cuerpos uno por uno con `POST /api/availability`, en orden.
2. Anotar el codigo y el cuerpo de la respuesta de cada uno, en especial el del domingo.
3. Abrir la rejilla y contar quantos dias quedaron guardados.
- **Esperado:** los dias `1` a `6` responden `201`. El dia `7` responde `400` con el detalle de Zod `Day must be 0-6` (`availability.schema.ts:4`). Si en lugar de `7` se envia `0`, la peticion pasa Zod y el servicio y revienta el `CHECK (day_of_week >= 1 AND day_of_week <= 7)` de `db/init.sql:115`: responde **500** con el codigo de Postgres `23514` en lugar de un 400. Ningun valor guarda el domingo (defecto conocido H-01). La rejilla muestra 6 de 7 dias.
- **Red:** seis respuestas `201` y una `400` de `POST /api/availability`; como control, una peticion con `day_of_week: 0` → `500` con `code: "23514"`.
- **Limpieza:** borrar los seis bloques creados con `DELETE /api/availability/<id>`.

### [AVL-003] Editar un bloque horario existente

**Rol** `doctor` · **Ruta** `/availability` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06. Existe el bloque `id` de AVL-001.
- **Datos:** `id` del bloque · `PATCH /api/availability/<id>` con `{ "end_time": "18:00" }` · `PUT /api/availability/<id>` con el mismo cuerpo
- **Pasos:**
1. En la rejilla de `/availability`, buscar una accion de edicion sobre el bloque: la clave i18n `availability:editSlot` existe ("Editar horario") [verificar si el boton se renderiza en `AvailabilityGrid.tsx`].
2. Enviar `PATCH /api/availability/<id>` y despues `PUT /api/availability/<id>` con la sesion del medico.
3. Releer el bloque con `GET /api/availability/me`.
- **Esperado:** no hay ruta de edicion en `availability.routes.ts`: `PATCH` y `PUT` responden `404`. La API no ofrece actualizar un bloque; el unico camino valido es borrar y volver a crear. Si el boton "Editar horario" se renderiza, debe fallar: verificar que el toast de error es `availability:ruleCreateError` o `availability:ruleDeleteError` y que el bloque original queda intacto.
- **Red:** `PATCH` y `PUT` a `DELETE`-style path inexistente → `404`; `GET /api/availability/me` → `200` con el bloque con `end_time: "13:00"` sin cambios.
- **Limpieza:** ninguna (no hay escritura). Si se recrea el bloque, borrarlo al final.

### [AVL-004] Eliminar un bloque horario y liberar sus slots

**Rol** `doctor` · **Ruta** `/availability` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06. Existe el bloque `id` de AVL-001 y PRE-05 es un dia habil de lunes con `09:00`.
- **Datos:** `id` del bloque · fecha = proximo lunes habil
- **Pasos:**
1. Consultar `GET /api/bookings/available-slots?doctor_id=<id>&date=<lunes>` y anotar el primer slot.
2. En `/availability`, pulsar "Eliminar Horario" (`availability:delete_schedule`) y confirmar el dialogo `availability:delete_schedule_confirm`.
3. Repetir el paso 1 y listar `GET /api/availability/me`.
- **Esperado:** el paso 2 responde `200` con `{ "message": "Availability deleted" }`; toast `availability:ruleDeleted`. El `09:00` desaparece del listado de slots y el bloque no aparece en `GET /api/availability/me`. Borrar un `id` inexistente responde `404` con `AVAILABILITY_NOT_FOUND`.
- **Red:** `DELETE /api/availability/<id>` → `200`; `GET /api/availability/me` → `200` sin ese `id`; `GET /api/bookings/available-slots` ya no incluye `09:00`.
- **Limpieza:** ninguna (el borrado es el estado final buscado). Si AVL-005 necesita el bloque, recrearlo.

### [AVL-005] Rechazar el solapamiento de bloques horarios

**Rol** `doctor` · **Ruta** `/availability` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06. El bloque `09:00`–`13:00` de AVL-001 existe.
- **Datos:** solapado total `10:00`–`12:00` · solapado parcial `12:00`–`14:00` · contiguo `13:00`–`17:00` · control `18:00`–`19:00`
- **Pasos:**
1. Enviar los cuatro cuerpos, uno por uno, a `POST /api/availability`.
2. Anotar codigo y mensaje de cada respuesta.
3. Contar los bloques de `day_of_week = 1` al final.
- **Esperado:** los dos solapados responden `400` con `AVAILABILITY_OVERLAP` ("Time range overlaps with existing availability"). El contiguo `13:00`–`17:00` responde `201`: el contacto en el limite no es solape (la condicion es `start_time < $4 AND end_time > $3`). El control responde `201`. Quedan tres bloques del dia.
- **Red:** dos `400` y dos `201` de `POST /api/availability`; el cuerpo del 400 debe traer el mensaje literal `AVAILABILITY_OVERLAP` o su texto traduzido [verificar literal en es.json].
- **Limpieza:** borrar los dos bloques creados (contiguo y control) con `DELETE /api/availability/<id>`.

### [AVL-006] Listar la disponibilidad del medico autenticado

**Rol** `doctor` · **Ruta** `/availability` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01. El medico tiene al menos dos bloques.
- **Datos:** sesion de `juan@clinic.com`
- **Pasos:**
1. Abrir `/availability` y esperar a que termine el estado de carga.
2. Comparar las filas de la rejilla con la respuesta de red.
3. Cerrar la sesion y repetir con `user1@clinic.com`.
- **Esperado:** `GET /api/availability/me` responde `200` con un array ordenado por `day_of_week` y `start_time` (consulta en `availability.service.ts:36`), cada elemento con `id`, `doctor_id`, `day_of_week`, `start_time`, `end_time` y `tenant_id`. El listado es **solo del medico de la sesion**: el `doctor_id` de todos los elementos coincide con el suyo. Con `patient` la ruta responde `403`. Si no hay bloques, la pantalla muestra `availability:empty_title` ("Sin horarios configurados").
- **Red:** `GET /api/availability/me` → `200`; verificar `doctor_id` identico en todos los elementos y `tenant_id: "default"`.
- **Limpieza:** ninguna (solo lectura).

### [AVL-007] Leer el horario de un medico sin credenciales

**Rol** `anónimo` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-07. Se conoce el `doctor_id` de `juan@clinic.com` y su lista de bloques.
- **Datos:** `GET /api/availability/<doctor_id>` sin cookie ni cabecera, y luego con `X-Tenant-Id: default` y la cookie `csrf_token` vigente
- **Pasos:**
1. Emitir la peticion sin ninguna cabecera ni cookie y anotar el codigo.
2. Repetir anadiendo `X-Tenant-Id: default`.
3. Repetir con la cabecera `csrf_token` mas un `X-CSRF-Token` valido.
- **Esperado:** las tres responden **200** con el array completo de bloques del medico: `day_of_week`, `start_time` y `end_time` de cada franja. La ruta esta montada sin `authMiddleware` (`availability.routes.ts:26`) y no figura en `PUBLIC_PATHS`, asi que la ausencia de cabecera no produce 400 mientras `NODE_ENV` no sea `production`. Es una fuga de informacion de agenda: **defecto conocido H-37**. El 403 esperado no llega nunca.
- **Red:** `GET /api/availability/<doctor_id>` → `200` (no `401`, no `403`); verificar `start_time` y `end_time` presentes en el cuerpo.
- **Limpieza:** ninguna (solo lectura).

### [AVL-008] Confirmar que las rutas que llama el calendario devuelven 404

**Rol** `doctor` · **Ruta** `/calendar` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06.
- **Datos:** `GET /api/availability` · `GET /api/availability/exceptions` · `GET /api/bookings?doctor_id=<id>` · `POST /api/availability/exceptions/<id>` · `DELETE /api/availability/exceptions/<id>`
- **Pasos:**
1. Abrir `/calendar` como `juan@clinic.com` y esperar a que se estabilice la vista.
2. Leer la consola del navegador y la primera peticion que falla.
3. Emitir a mano las cuatro rutas de `DoctorCalendarPage.tsx:169-171,277,290-295`.
- **Esperado:** las cuatro responden `404`. `Promise.all` rechaza en el primer 404 y la pantalla pinta el estado de error con el calendario vacio, sin eventos. Las rutas reales son `GET /api/availability/me`, `GET /api/availability-exceptions/me`, `GET /api/bookings/doctor` y `POST`/`DELETE /api/availability-exceptions` (**defecto conocido H-02**). El filtro "Disponibilidad" (`doctor_calendar:filter_availability`) queda sin datos.
- **Red:** cuatro respuestas `404`; en la consola, el error de red debe citar `/api/availability` o `/api/availability/exceptions`.
- **Limpieza:** ninguna (solo lectura).

### [AVL-009] Crear una excepcion de horario desde la interfaz

**Rol** `doctor` · **Ruta** `/availability` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. La seccion "Excepciones (días libre)" (`availability:exceptions_title`) esta desplegada.
- **Datos:** `date` = fecha futura a 15 dias · `reason` = `QA-vacaciones` · cuerpos: `{ "date": ..., "reason": "QA-vacaciones" }`, `{ "date": ..., "doctor_id": <id>, "reason": ... }` y `{ "doctor_id": <id>, "date": ..., "is_full_day": true }`
- **Pasos:**
1. Rellenar el formulario de excepcion con fecha y motivo `QA-vacaciones` y guardar.
2. Como control, enviar `POST /api/availability-exceptions` con los tres cuerpos de "Datos".
3. Anotar codigo y detalle de validacion de cada respuesta.
- **Esperado:** los tres responden **400**. El primero falla porque el esquema es `.strict()` y exige `doctor_id`; el segundo falla porque rechaza `reason` como clave desconocida; el tercero llega al controlador y se resuelve el `doctor_id` desde la sesion, pero **tampoco puede crearse**: el formulario de la UI nunca manda `doctor_id`. El motivo `QA-vacaciones` no llega a ninguna parte (**defecto conocido H-34**). Los chips de excepciones muestran `— undefined`.
- **Red:** tres respuestas `400` de `POST /api/availability-exceptions` con array `details` de Zod; verificar que el detalle cita `doctor_id` y `reason`.
- **Limpieza:** ninguna: no se crea ninguna excepcion. Si alguna respuesta fuera `201`, borrarla con `DELETE /api/availability-exceptions/<id>`.

### [AVL-010] Comprobar que el motivo de la excepcion no se registra

**Rol** `doctor` · **Ruta** `/availability` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-08. La excepcion creada en AVL-011 existe en `doctor_exceptions`.
- **Datos:** `SELECT column_name FROM information_schema.columns WHERE table_name = 'doctor_exceptions'` · `GET /api/availability-exceptions/me`
- **Pasos:**
1. Consultar las columnas de `doctor_exceptions`.
2. Listar las excepciones propias con `GET /api/availability-exceptions/me` y leer todos los campos de la primera fila.
3. Mirar la columna "Motivo" del listado en la pantalla (`availability:reason_label`, texto del chip [verificar literal en es.json]).
- **Esperado:** la tabla **no tiene columna `reason`**: devuelve `doctor_id`, `date`, `start_time`, `end_time`, `is_full_day`, `tenant_id` y las de auditoria. El listado no trae ningun campo de motivo y la columna "Motivo" de la pantalla muestra `— undefined`. Aunque el esquema Zod prohiba el campo, si se llegara a insertar la fila, el motivo se perderia (**defecto conocido H-34**; la columna se renderiza en `AvailabilityPage.tsx:169-182`).
- **Red:** `GET /api/availability-exceptions/me` → `200`; el primer elemento no debe tener ninguna propiedad `reason`.
- **Limpieza:** borrar la excepcion de control con `DELETE /api/availability-exceptions/<id>`.

### [AVL-011] Eliminar una excepcion con la ruta real

**Rol** `doctor` · **Ruta** `/availability` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-08. Se ha creado una excepcion de dia completo por `psql` o por el area `23`, porque la API no permite crearla (AVL-009). Se conoce su `id`.
- **Datos:** `id` de la excepcion · `date` futura
- **Pasos:**
1. Confirmar que la excepcion bloquea el dia: `GET /api/bookings/available-slots?doctor_id=<id>&date=<date>` → `[]`.
2. Borrarla desde la UI con "Eliminar Excepción" (`availability:delete_exception`) o con `DELETE /api/availability-exceptions/<id>`.
3. Repetir el paso 1.
- **Esperado:** el paso 2 responde `200` con `{ "message": "Exception deleted" }`; toast `availability:exceptionDeleted`. El dia vuelve a ofrecer los slots de sus bloques. Borrar un `id` inexistente o ajeno responde `404` con `AVAILABILITY_NOT_FOUND`. El borrado esta acotado a `doctor_id` de la sesion: una excepcion de otro medico nunca se borra.
- **Red:** `DELETE /api/availability-exceptions/<id>` → `200`; `GET /api/bookings/available-slots` pasa de `[]` a un array con horas.
- **Limpieza:** la excepcion queda borrada, que es el estado final buscado.

### [AVL-012] Eliminar una excepcion con la ruta que llama el calendario

**Rol** `doctor` · **Ruta** `/calendar` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-08. Existe una excepcion de control.
- **Datos:** `POST /api/availability/exceptions` y `DELETE /api/availability/exceptions/<id>` con el prefijo `/api/availability/`
- **Pasos:**
1. En `/calendar`, crear un bloqueo con el boton "Bloquear Horario" (`doctor_calendar:block_time`) y el motivo `QA-bloqueo`.
2. Intentar borrar el bloqueo con "Eliminar bloqueo" (`doctor_calendar:delete_block`).
3. Anotar los codigos de ambas operaciones y el toast que aparece.
- **Esperado:** ambos intentan rutas que no existen y responden `404`: el router real esta montado en `/api/availability-exceptions` (`src/app.ts:269`), no en `/api/availability/exceptions` (**defecto conocido H-02**). El toast que se muestra es el generico de excepcion (`doctor_calendar:blockCreated` solo se pinta si el `POST` devuelve `201`, cosa que no ocurre). La pantalla `/calendar` no puede crear ni borrar bloqueos.
- **Red:** dos respuestas `404`; verificar en la pestana de red que las URLs empiezan por `/api/availability/exceptions`.
- **Limpieza:** borrar la excepcion de control por la ruta real `DELETE /api/availability-exceptions/<id>`.

### [AVL-013] Verificar que el calendario desplaza los dias de la disponibilidad

**Rol** `doctor` · **Ruta** `/calendar` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01. El medico tiene un bloque solo de lunes `09:00`–`13:00` y ninguno mas.
- **Datos:** `daysOfWeek` de FullCalendar en `DoctorCalendarPage.tsx:192-201` · lunes = `1` en ISO
- **Pasos:**
1. Consultar `GET /api/availability/me` y anotar los `day_of_week` devueltos.
2. En `/calendar`, activar el filtro "Disponibilidad" y leer en que columna aparece el bloque.
3. Comparar la columna de la UI con el `day_of_week` del backend.
- **Esperado:** si la pantalla llegara a dibujar, el bloque de `day_of_week = 1` (lunes) apareceria en **domingo**: FullCalendar usa `0 = domingo` mientras el backend usa ISO `1 = lunes` (**defecto conocido H-03**). Hoy el desplazamiento **no es observable** porque las cuatro rutas de la pantalla dan 404 (AVL-008). Anotar como `OMITIDO` el esperado visual y conservar la comparacion numerica de los dosconvenios.
- **Red:** `GET /api/availability/me` → `200` con `day_of_week: 1`; las peticiones de `/calendar` → `404`.
- **Limpieza:** borrar el bloque del lunes con `DELETE /api/availability/<id>`.

### [AVL-014] Crear un feriado nacional que cancela las citas

**Rol** `admin` · **Ruta** `/holidays` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-05. El dia elegido tiene al menos una cita en estado `confirmed` y una en `pending` de un medico del tenant.
- **Datos:** `holiday_date` = fecha futura a 20 dias · `name` = `QA-feriado-nacional` · `cancel_bookings` = `true` · `notice_days` = `10`
- **Pasos:**
1. En `/holidays`, pulsar "Agregar feriado" y registrar los 4 campos del formulario.
2. Crear el feriado con `cancel_bookings` marcado ("Cancelar citas de ese dia").
3. Releer `GET /api/holidays` y `GET /api/bookings?status=confirmed` del rango.
- **Esperado:** el paso 2 responde `201` con `holiday_date`, `name`, `notice_days: 10` y `cancel_bookings: true`. Las citas de ese dia pasan a `status: "cancelled"` y desaparecen del listado de confirmadas. El toast es `holidays:created` ("Feriado creado") mas el recuento `holidays:bookingsCancelled` [verificar literal en es.json: el namespace `holidays` no existe en `es.json` y el texto viene de un `defaultValue`]. Los campos del formulario son Fecha, Nombre, Aviso (dias) y la casilla de cancelar.
- **Red:** `POST /api/holidays` con `{ "holiday_date": ..., "name": "QA-feriado-nacional", "notice_days": 10, "cancel_bookings": true }` → `201`; `GET /api/holidays` → `200` con la fila nueva; `GET /api/bookings` ya no devuelve esas citas como `confirmed`.
- **Limpieza:** borrar el feriado con `DELETE /api/holidays/<id>`; las citas quedan `cancelled`, que es el estado esperado y no se restauran desde la UI.

### [AVL-015] Crear un feriado personalizado sin cancelar citas

**Rol** `admin` · **Ruta** `/holidays` · **P1** · **Resultado** `______`
- **Precondición:** PRE-03. El dia elegido tiene una cita `confirmed`.
- **Datos:** `holiday_date` = fecha futura a 25 dias · `name` = `QA-cierre-planta` · `cancel_bookings` = `false` · `notice_days` = `3`
- **Pasos:**
1. Crear el feriado con la casilla de cancelar citas desmarcada.
2. Releer `GET /api/holidays` y la agenda de ese dia.
3. Consultar `GET /api/bookings/available-slots` para ese dia.
- **Esperado:** el paso 1 responde `201` con `cancel_bookings: false`. La cita existente **sigue viva**: no se cancela nada y no hay notificacion. Los slots del dia si desaparecen, porque `getAvailableSlots` devuelve `[]` en cuanto encuentra fila en `clinic_holidays` (`booking.service.ts:745-749`). El nombre se muestra completo en la tabla, sin truncarse a 150 caracteres.
- **Red:** `POST /api/holidays` → `201`; `GET /api/bookings` mantiene la cita; `GET /api/bookings/available-slots?doctor_id=<id>&date=<fecha>` → `200` con `[]`.
- **Limpieza:** borrar el feriado con `DELETE /api/holidays/<id>`.

### [AVL-016] Listar los feriados del tenant y comprobar su aislamiento

**Rol** `admin` · **Ruta** `/holidays` · **P1** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-04. Existen los feriados `QA-feriado-nacional` y `QA-cierre-planta`.
- **Datos:** sesion `admin@clinic.com` y sesion `admin@demo.clinic.com`
- **Pasos:**
1. Abrir `/holidays` como `admin@clinic.com` y contar las filas.
2. Repetir con `admin@demo.clinic.com`.
3. Emitir `GET /api/holidays` con `doctor` y con `patient`.
- **Esperado:** el paso 1 devuelve solo los feriados de `default` (consulta filtrada por `tenant_id` en `holidays.service.ts:32`); el paso 2 no ve ninguno de los dos. El paso 3 responde `200` con `doctor` (ruta permitida en `holidays.routes.ts:10`) y `403` con `patient`. Con lista vacia la pantalla muestra el texto `holidays:empty` ("No hay feriados registrados") [verificar literal en es.json]. Las columnas son Fecha, Nombre, Aviso (dias), Cancela citas (Si/No) y Acciones.
- **Red:** dos `200` de `GET /api/holidays` con conjuntos disjuntos; un `200` con `doctor` y un `403` con `patient`.
- **Limpieza:** borrar los dos feriados de QA con `DELETE /api/holidays/<id>`.

### [AVL-017] Aplicar un feriado y comprobar que el dia no ofrece slots

**Rol** `admin` · **Ruta** `/booking` · **P0** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-05. El medico de AVL-006 tiene bloques en PRE-05 y el dia no es feriado todavia.
- **Datos:** `holiday_date` = proximo dia habil con bloques, a 20 dias · `name` = `QA-feriado-slots`
- **Pasos:**
1. Antes de crear el feriado, consultar `GET /api/bookings/available-slots?doctor_id=<id>&date=<fecha>` y anotar el numero de slots.
2. Crear el feriado con `cancel_bookings: false`.
3. Repetir la consulta del paso 1 y abrir `/booking` como anonimo para esa fecha.
- **Esperado:** el paso 1 devuelve un array con horas; el paso 3 devuelve `200` con `[]` y en `/booking` aparece el aviso `guest_booking:no_slots` ("No hay horarios disponibles para esta fecha"). El bloqueo depende solo de `clinic_holidays`, no de `doctor_availability`: sigue habiendo bloques para ese `day_of_week` y aun asi no hay horas.
- **Red:** primera llamada `200` con N horas; despues del feriado `200` con `[]` en el mismo endpoint.
- **Limpieza:** borrar el feriado con `DELETE /api/holidays/<id>` y verificar que los slots vuelven.

### [AVL-018] Comprobar el historial de la cancelacion por feriado

**Rol** `admin` · **Ruta** `/holidays` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-08. El dia del feriado tiene **dos** citas: una en `status = "confirmed"` y otra en `status = "pending"`.
- **Datos:** `SELECT from_status, to_status, count(*) FROM booking_status_history WHERE to_status = 'cancelled' GROUP BY 1, 2`
- **Pasos:**
1. Crear el feriado con `cancel_bookings: true` sobre ese dia.
2. Consultar `booking_status_history` filtrando `to_status = 'cancelled'` para las dos citas.
3. Intentar leer el historial desde la aplicacion: buscar cualquier pantalla o endpoint que lo exponga.
- **Esperado:** **las dos** filas quedan con `from_status = "confirmed"`, incluida la que estaba `pending`: el `from_status` esta fijado a `confirmed` y no se lee el estado real anterior (**defecto conocido H-35**). El historial miente y no es auditable: **no existe vista ni endpoint** que lea `booking_status_history` (migracion `012`), solo se puede consultar por `psql` (**defecto conocido H-32**). En la UI no hay ninguna pantalla de historial de estados.
- **Red:** ninguna peticion de red expone el historial. Registrar la consulta SQL y su salida como evidencia.
- **Limpieza:** borrar el feriado con `DELETE /api/holidays/<id>`; las citas quedan `cancelled`.

### [AVL-019] Comprobar que booking_status_history no se lee desde la aplicacion

**Rol** `admin` · **Ruta** `/audit` · **P1** · **Resultado** `______`
- **Precondición:** PRE-03. Se han ejecutado AVL-004, AVL-011 y AVL-018, que escriben filas en `booking_status_history`.
- **Datos:** `GET /api/audit` · rutas candidatas `/api/bookings/:id/history`, `/api/booking-history`, `/api/bookings/history`
- **Pasos:**
1. Abrir `/audit` y `/bookings` como `admin` y buscar cualquier columna o vista de cambios de estado.
2. Emitir `GET /api/audit` y revisar si el historial de citas aparece.
3. Emitir las tres rutas candidatas del paso 1 con `id` valido.
- **Esperado:** `/audit` solo muestra entradas de `audit_logs`, no de `booking_status_history`. Las tres rutas candidatas responden `404`. Ninguna pantalla muestra la traza `confirmed → cancelled` de una cita (**defecto conocido H-32**). El unico acceso es `psql`, que queda fuera del alcance del navegador.
- **Red:** `GET /api/audit` → `200` sin filas de historial de citas; tres `404`.
- **Limpieza:** ninguna (solo lectura).

### [AVL-020] Descargar el calendario ics y comprobar su conformidad con RFC 5545

**Rol** `doctor` · **Ruta** `/calendar` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06. El medico tiene bloques y al menos una cita en PRE-05.
- **Datos:** `GET /api/calendar/doctor/<doctor_id>/ics?from=<hoy>&to=<hoy+14>`
- **Pasos:**
1. Descargar el `.ics` con la sesion de `juan@clinic.com` y abrirlo en un editor de texto plano.
2. Medir la longitud en **octetos** de la linea mas larga del archivo.
3. Comprobar los ultimos dos bytes del archivo y buscar caracteres de control sin escapar.
4. Repetir la descarga sin `from` ni `to`.
- **Esperado:** responde `200` con `Content-Type: text/calendar` y un `VEVENT` por bloque-dia y por cita (`Disponibilidad - <nombre>` y `Cita: <paciente>`). **Ninguna linea se pliega a 75 octetos**, falta el `CRLF` final obligatorio y `escapeText` no neutraliza los demas caracteres de control: el archivo no es conforme a RFC 5545 y Google Calendar u Outlook lo rechazan o truncan (**defecto conocido H-54**). Sin `from`/`to` el rango por defecto es hoy a hoy+90 dias (`calendar.service.ts:7,37-38`). Con `doctor_id` inexistente responde `404`.
- **Red:** `GET /api/calendar/doctor/<doctor_id>/ics` → `200`; verificar `BEGIN:VCALENDAR`, `VERSION:2.0`, el numero de `BEGIN:VEVENT` y el nombre de fichero `doctor-<id>-calendar.ics`.
- **Limpieza:** borrar el fichero descargado.

### [AVL-021] Pedir el ics con un rango de doscientos anios

**Rol** `doctor` · **Ruta** `/calendar` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-07, PRE-06. El medico tiene varios bloques semanales.
- **Datos:** `from=1900-01-01` · `to=2100-01-01`
- **Pasos:**
1. Cronometrar la peticion con el rango de 200 anos.
2. Anotar el tamano del cuerpo de la respuesta y el numero de `VEVENT`.
3. Repetir con un rango de 30 dias como control.
- **Esperado:** `calendarQuerySchema` no impone `.refine` ni `.max` sobre `from`/`to`, asi que la peticion **no se rechaza**: responde `200` tras una espera muy larga (unas 73 000 iteraciones por bloque) y devuelve decenas de miles de `VEVENT`. Un `doctor` o `admin` autenticado puede agotar la CPU del servicio, y en esta ruta no hay limite de peticiones propio (**defecto conocido H-36**). El control de 30 dias responde en menos de un segundo. Registrar el tiempo y el tamano medidos.
- **Red:** `GET /api/calendar/doctor/<doctor_id>/ics?from=1900-01-01&to=2100-01-01` → `200` con un cuerpo desproporcionado; el control de 30 dias → `200` inmediato.
- **Limpieza:** ninguna. Si la respuesta agota el servicio, esperar al reinicio antes de seguir con el area.

### [AVL-022] Comprobar que el ics ignora is_full_day en las excepciones parciales

**Rol** `doctor` · **Ruta** `/calendar` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, PRE-08. El medico tiene un bloque de lunes `09:00`–`17:00` y una excepcion **parcial** del proximo lunes `12:00`–`14:00` con `is_full_day = false`.
- **Datos:** `GET /api/calendar/doctor/<doctor_id>/ics?from=<lunes>&to=<lunes>`
- **Pasos:**
1. Confirmar la excepcion parcial con `GET /api/availability-exceptions/me`.
2. Descargar el `.ics` del rango de ese solo dia.
3. Contar los `VEVENT` de disponibilidad de ese dia y comparar con `GET /api/bookings/available-slots`.
- **Esperado:** el `.ics` **no incluye ningun evento de disponibilidad** para ese dia: `exportDoctorCalendarICS` acumula cualquier excepcion en `exceptedDates` sin mirar `is_full_day` (`calendar.service.ts:67-68,78`). Quien importe el fichero ve menos disponibilidad que la real y puede dar por libres horas que estan bloqueadas (**defecto conocido H-55**). En cambio `GET /api/bookings/available-slots` si respeta la excepcion parcial y solo quita 12:00–14:00.
- **Red:** `GET /api/calendar/doctor/<doctor_id>/ics` → `200` con `0` `VEVENT` de disponibilidad para ese dia; `GET /api/bookings/available-slots` → `200` con las horas fuera de 12:00–14:00.
- **Limpieza:** borrar la excepcion parcial con `DELETE /api/availability-exceptions/<id>`.

### [AVL-023] Comprobar que el ics no declara METHOD ni X-WR-CALNAME

**Rol** `doctor` · **Ruta** `/calendar` · **P3** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06.
- **Datos:** cabeceras del archivo descargado
- **Pasos:**
1. Descargar el `.ics` y abrirlo en texto plano.
2. Buscar las lineas `METHOD:` y `X-WR-CALNAME:` dentro de `VCALENDAR`.
3. Anotar el nombre visible que tendra el calendario al importarlo.
- **Esperado:** no aparece ninguna de las dos. `buildCalendar` no emite `METHOD:PUBLISH` ni `X-WR-CALNAME`, asi que el archivo no declara ni el calendario al que pertenece ni el metodo de publicacion (**defecto H-54**). El nombre que muestran Google Calendar u Outlook deriva del nombre de fichero `doctor-<id>-calendar.ics`, no del nombre del medico. La cabecera `PRODID` si esta presente.
- **Red:** `GET /api/calendar/doctor/<doctor_id>/ics` → `200`; en el cuerpo, `METHOD` y `X-WR-CALNAME` deben dar `0` coincidencias.
- **Limpieza:** borrar el fichero descargado.

### [AVL-024] Consultar los slots publicos sin sesion

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05. El medico tiene bloques en PRE-05.
- **Datos:** `GET /api/bookings/available-slots?doctor_id=<id>&date=<fecha habil>` sin cookie ni `X-Tenant-Id`
- **Pasos:**
1. Emitir la peticion sin ninguna cabecera ni cookie.
2. Emitirla con `doctor_id` ausente, con `doctor_id=0` y con `date` en formato invalido.
3. Abrir `/booking` como anonimo y elegir ese medico y esa fecha.
- **Esperado:** el paso 1 responde **200** con un array de cadenas `HH:MM` generado desde los bloques y el `slot_duration` del medico (`doctors.slot_duration`, 30 min por defecto). **No** responde `400 X-Tenant-Id header is required`: `/api/bookings/available-slots` esta en `PUBLIC_PATHS` (`tenant.middleware.ts:24`). Los tres casos del paso 2 responden `400` con detalle de Zod (`doctor_id` entero positivo, `date` con formato `YYYY-MM-DD`). El paso 3 muestra las mismas horas que la API.
- **Red:** un `200` con array de horas, tres `400`; verificar que el paso 2 no devuelve ni un elemento.
- **Limpieza:** ninguna (solo lectura).

### [AVL-025] Consultar la lista de pacientes antes de crear una excepcion

**Rol** `doctor` · **Ruta** `/availability` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04.
- **Datos:** `GET /api/doctors/users` · `GET /api/users` · `GET /api/patients`
- **Pasos:**
1. Emitir `GET /api/doctors/users` con la sesion de `juan@clinic.com` y contar los usuarios devueltos.
2. Repetir con `maria@clinic.com` y con `admin@demo.clinic.com`.
3. Emitir `GET /api/users` y `GET /api/patients` para confirmar si existen.
- **Esperado:** `GET /api/doctors/users` responde `200` y devuelve **solo usuarios del tenant de la sesion**; ningun email de `clinica-demo` aparece en la lista de `default` ni al reves. `GET /api/users` y `GET /api/patients` responden `404`: **no existen** esos routers en `src/app.ts` (el catalogo D-14 y T-14 los mencionan por error). El formulario de excepcion **no ofrece selector de paciente**: la excepcion se aplica al medico de la sesion, no a un paciente, asi que esta consulta es solo de apoyo.
- **Red:** tres `200` de `GET /api/doctors/users` con conjuntos disjuntos de emails; dos `404`.
- **Limpieza:** ninguna (solo lectura).

### [AVL-026] Aislar la disponibilidad entre tenants

**Rol** `doctor`, `admin` · **Ruta** `/availability` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04. `juan@clinic.com` tiene bloques en `default` y existe al menos un medico en `clinica-demo`.
- **Datos:** sesion `default` · sesion `clinica-demo` · `X-Tenant-Id` de cada uno
- **Pasos:**
1. Con la sesion de `juan@clinic.com`, pedir `GET /api/availability/me` y anotar el `tenant_id` de cada bloque.
2. Iniciar sesion como `admin@demo.clinic.com` y pedir lo mismo.
3. Repetir el paso 1 **falseando** `X-Tenant-Id: clinica-demo` con la sesion de `default`.
- **Esperado:** el paso 1 devuelve `200` con todos los bloques en `tenant_id: "default"`; el paso 2 devuelve `200` con los bloques de `clinica-demo` y ningun `doctor_id` comun con el paso 1. El paso 3 devuelve **exactamente lo mismo que el paso 1**: el middleware toma `userTenantId || headerTenantId`, de modo que la cabecera ajena se ignora cuando hay sesion. Ademas la respuesta incluye la cabecera `X-Tenant-Id` con el tenant resuelto, que debe coincidir siempre con el de la sesion. No hay fuga entre tenants (ver detalle en el area `19`).
- **Red:** tres `200` de `GET /api/availability/me`; verificar el `tenant_id` de cada fila y la cabecera de respuesta `X-Tenant-Id`.
- **Limpieza:** ninguna (solo lectura).

### [AVL-027] Impedir que un medico vea o modifique la disponibilidad de otro

**Rol** `doctor` · **Ruta** `—` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02. Se conoce el `doctor_id` de `maria@clinic.com` y el de `juan@clinic.com`.
- **Datos:** `GET /api/availability/<doctor_id_ajeno>` · `DELETE /api/availability/<id_bloque_ajeno>` · `POST /api/availability/bulk` con `doctor_id` ajeno
- **Pasos:**
1. Con la sesion de `juan@clinic.com`, pedir el horario de `maria` y el suyo propio.
2. Intentar borrar un bloque que pertenece a `maria`.
3. Intentar crear bloques en masa para `maria` con `POST /api/availability/bulk`.
- **Esperado:** el paso 1 devuelve `200` y `[]` para el medico ajeno y el array propio para el propio (filtro por `tenant_id`, no por propietario). El paso 2 responde `404` con `AVAILABILITY_NOT_FOUND`: el `DELETE` esta acotado por `doctor_id` de la sesion. El paso 3 **si** acepta la escritura para otro medico del mismo tenant: `bulkCreateAvailability` solo comprueba que el `doctor_id` exista en el tenant y devuelve `201` con `{ inserted, skipped }`. El riesgo real es horizontal dentro del tenant, no entre tenants; anotarlo como observacion, no como fallo de este caso.
- **Red:** `GET` propio y ajeno → `200`; `DELETE` ajeno → `404`; `POST /api/availability/bulk` → `201` con `inserted >= 1`.
- **Limpieza:** borrar los bloques creados en masa con `DELETE /api/availability/<id>` uno por uno.

### [AVL-028] Validar el rango y el formato de las horas

**Rol** `doctor` · **Ruta** `/availability` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01. El dia `day_of_week = 2` esta libre.
- **Datos:** `end_time = start_time` · `end_time` anterior a `start_time` · `start_time = "9:00"` · `start_time = "09:60"` · `start_time = "09:00:00"` · campo obligatorio ausente
- **Pasos:**
1. Enviar los seis cuerpos a `POST /api/availability` con `day_of_week: 2`.
2. Anotar codigo, mensaje y `path` del detalle de Zod de cada uno.
3. Contar los bloques del dia 2 al terminar.
- **Esperado:** los seis responden `400`. Los dos primeros por `start_time must be before end_time` con `path: ["start_time"]` (validacion de `availability.schema.ts:8-14`). El tercero y el cuarto por el regex `^\d{2}:\d{2}$` con los mensajes `Invalid time format, use HH:MM`; el quinto tambien, porque incluye los segundos. El sexto por campo requerido. Ninguna fila creada: el dia 2 sigue con `0` bloques.
- **Red:** seis respuestas `400` de `POST /api/availability` con array `details`; verificar `message` y `path` en cada una.
- **Limpieza:** ninguna (no hay escritura).

### [AVL-029] Rechazar bloques que cruzan medianoche o exceden un dia

**Rol** `doctor` · **Ruta** `/availability` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01. El dia `day_of_week = 3` esta libre.
- **Datos:** `22:00`–`02:00` · `00:00`–`23:59` · `00:00`–`24:00` · `07:00`–`17:30` (control)
- **Pasos:**
1. Enviar los cuatro cuerpos con `day_of_week: 3`.
2. Anotar codigo y mensaje de cada respuesta.
3. Si alguno devuelve `201`, comprobar el valor realmente almacenado con `GET /api/availability/me`.
- **Esperado:** el cruce de medianoche `22:00`–`02:00` responde `400` con `start_time must be before end_time`: el modelo **no admite** turnos que crucen el dia. El dia completo `00:00`–`23:59` responde `201` y se guarda como `TIME` (`start_time`/`end_time` son columnas `TIME`, no texto). `00:00`–`24:00` responde `400` con `Invalid time format, use HH:MM`: `24:00` no es una `TIME` valida en Postgres, asi que **no existe un horario de 24 h** en el sistema. El control responde `201`.
- **Red:** dos `400` y dos `201` de `POST /api/availability`; verificar en el `GET /api/availability/me` que las filas `TIME` conservan el formato `HH:MM:SS`.
- **Limpieza:** borrar los dos bloques creados con `DELETE /api/availability/<id>`.

### [AVL-030] Verificar la etiqueta de feriados en los cuatro idiomas

**Rol** `admin` · **Ruta** `/holidays` · **P3** · **Resultado** `______`
- **Precondición:** PRE-03. Existe el feriado `QA-feriado-nacional`. El idioma se cambia con el selector de la aplicacion.
- **Datos:** `es`, `en`, `pt`, `fr` · claves `nav.holidays`, `holidays:title`, `holidays:add`, `holidays:empty`
- **Pasos:**
1. Recorrer `/holidays` en los cuatro idiomas y anotar el titulo, el boton de alta y el estado vacio.
2. Recorrer el menu lateral y leer la entrada de feriados.
3. Buscar en pantalla cualquier cadena con puntos (clave i18n sin traducir).
- **Esperado:** el titulo es "Días feriados de la clínica" en `es`, y el resto de los idiomas muestra su propia traduccion. La entrada del menu es `nav.holidays`: "Feriados" / "Holidays" / "Feriados" / "Jours fériés". **El namespace `holidays` no existe en `es.json`**: todos sus textos vienen de `defaultValue` en el componente, por lo que solo `es` esta garantizado y los otros tres dependen de que el `defaultValue` este en ingles (**defecto H-25**). Ninguna pantalla debe mostrar una clave con puntos. Si en algun idioma aparece `holidays:add` en crudo, anotarlo como `FALLÓ (defecto conocido: H-25)`.
- **Red:** `GET /api/holidays` → `200` en los cuatro idiomas, con el mismo contenido y el mismo tenant.
- **Limpieza:** borrar el feriado `QA-feriado-nacional` con `DELETE /api/holidays/<id>`.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
|---|---|---|---|
| H-01 | `day_of_week` con tres convenciones; el domingo es imposible | AVL-002 | `7` → 400 `Day must be 0-6`; `0` → 500 `23514` |
| H-02 | Cuatro rutas que el frontend llama no existen | AVL-008, AVL-012 | 404 en `GET /api/availability`, `/availability/exceptions`, `POST|DELETE /availability/exceptions/*` |
| H-03 | `daysOfWeek` de FullCalendar usa 0=domingo | AVL-013 | El bloque de lunes se dibujaria en domingo; hoy no observable por H-02 |
| H-32 | `booking_status_history` sin ruta de lectura | AVL-018, AVL-019 | Ninguna pantalla ni endpoint expone el historial |
| H-34 | La excepcion exige `doctor_id`, rechaza `reason` y la tabla no tiene esa columna | AVL-009, AVL-010 | 400 en todo intento; los chips muestran `— undefined` |
| H-35 | Al cancelar por feriado, `from_status` se fija a `confirmed` | AVL-018 | Toda cancelacion queda `confirmed → cancelled`, tambien la que estaba `pending` |
| H-36 | El `.ics` no acota el rango `from`/`to` | AVL-021 | 200 con ~73 000 iteraciones por bloque y un cuerpo enorme |
| H-37 | `GET /api/availability/:id` es una ruta publica | AVL-007 | 200 con el horario completo sin credenciales |
| H-54 | El `.ics` no cumple RFC 5545 ni declara `METHOD`/`X-WR-CALNAME` | AVL-020, AVL-023 | Sin plegado a 75 octetos, sin `CRLF` final, sin esas dos cabeceras |
| H-55 | El `.ics` trata cualquier excepcion como dia completo bloqueado | AVL-022 | Una excepcion parcial de 12:00–14:00 deja el dia entero sin eventos |
| H-25 | Etiqueta de feriados sin namespace propio en `es.json` | AVL-030 | Textos desde `defaultValue`: solo `es` garantizado |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Como verificarlo |
|---|---|---|
| No existe `PATCH /api/availability/:id` ni ninguna ruta de edicion | Un bloque solo se cambia borrandolo y recreandolo; AVL-003 no puede validar una edicion real | Enumerar `availability.routes.ts`: solo `GET /me`, `GET /:id`, `POST /`, `POST /bulk`, `DELETE /:id` |
| No se puede crear una excepcion por API ni por UI | AVL-009 y AVL-011 dependen de una excepcion creada por `psql` | AVL-009: todo intento responde 400 |
| `doctor_exceptions` no tiene columna `reason` | El motivo que escribe el usuario no existe en ningun sitio | AVL-010: `information_schema.columns` |
| No hay vista ni endpoint de `booking_status_history` | La trazabilidad de cambios de estado solo existe en `psql` | AVL-019 |
| No existe `GET /api/users` ni `GET /api/patients` | El catalogo (T-14) los menciona; el listado real es `GET /api/doctors/users` | AVL-025: ambos dan 404 |
| La ruta de listado de bloqueos del calendario es 404 | `/calendar` no permite crear ni borrar bloqueos desde la vista | AVL-012 |
| El `.ics` no se valida contra RFC 5545 en ningun test | La conformidad es una asuncion, no una garantia | AVL-020: medir octetos y `CRLF` final |
| Sin `EMAIL_TEST` no se verifican los avisos de cancelacion por feriado | Los correos a pacientes afectados no se comprueban | Registrar `BLOQUEADO` en AVL-014 si no hay buzon |

## 7. Resultado del área

| Campo | Valor |
|---|---|
| Casos ejecutados | `____ / 30` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 11` |
| Huecos confirmados | `____ / 8` |
| Evidencia guardada en | `pruebas-navegador/evidencia/17-disponibilidad-calendario-feriados/` |
| Tester / fecha | `________________` |

Criterio de aprobado del area: los 30 casos ejecutados, los 11 defectos de la seccion 5 confirmados con el observable indicado y ninguna diferencia respecto a las rutas reales de `availability.routes.ts`, `holidays.routes.ts` y `calendar.routes.ts`.

---

*Alcance: 30 casos de disponibilidad, calendario y feriados sobre el tenant `default`, con `clinica-demo` como comparacion. No cubre la reserva de invitado, el ciclo completo de la cita ni la traduccion integral de la aplicacion. Fecha de redaccion: 2026-10-01.*
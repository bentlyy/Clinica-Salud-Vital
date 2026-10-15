# 20 — Lista de espera

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
| --- | --- | --- | --- | --- | --- | --- |
| `20` | `WTL` | C2 | Semanal | 14 | `16` | — |

## 1. Qué cubre

Verificacion funcional del modulo de lista de espera: alta del paciente cuando el doctor no tiene horarios disponibles, consulta de las entradas propias, salida de la lista, y notificacion automatica al liberarse un espacio por cancelacion, reprogramacion o feriado.

Aspectos incluidos:

- Unirse a la lista de espera desde el dialogo de nueva cita cuando `availableSlots.length === 0`.
- Validacion de la fecha solicitada (no puede ser pasada) y del doctor obligatorio.
- Reintento idempotente de la misma fecha (resetea el estado a `waiting`).
- Panel "Mi lista de espera" (`GET /api/waitlist/me`): estados visibles `waiting` y `notified`.
- Salida de la lista (`DELETE /api/waitlist/:id`): eliminacion fisica de la fila, no transicion a `removed`.
- Autorizacion: el paciente solo ve y elimina lo suyo; el listado completo requiere rol de staff.
- Listado de staff con filtros por `doctor_id` y `requested_date`, y orden por antiguedad.
- Notificacion automatica `waiting` -> `notified` al cancelar o reprogramar una cita y al aplicar un feriado.
- Ausencia de caducidad de la notificacion y ausencia de endpoint de reserva desde la lista.

No cubre: el modulo de citas completo (cubierto en el area 15), notificaciones por correo (hueco de cobertura: ver `99`) ni la interfaz de superadmin (hueco de cobertura: ver `99`).

## 2. Roles y rutas

| Rol | Acceso a la UI | Endpoints que puede usar |
| --- | --- | --- |
| `patient` | `BookingPage` (dialogo "Nueva Cita"), `MyWaitlistPanel` | `POST /api/waitlist`, `GET /api/waitlist/me`, `DELETE /api/waitlist/:id` |
| `user` | Mismo que `patient` (rol alias aceptado por `authorize(...)`) | `GET /api/waitlist/me`, `DELETE /api/waitlist/:id` |
| `doctor` | `BookingPage`, agenda propia | `GET /api/waitlist` |
| `admin` | `BookingPage`, `PatientsPage` | `GET /api/waitlist` |
| `superadmin` | Igual que `admin` | `GET /api/waitlist` |
| `lab_technician` | Sin UI de lista de espera | Sin acceso (`authorize` no incluye el rol) |
| `guest` | Sin sesion | `401` en todos los endpoints |

| Superficie | Ruta | Archivo |
| --- | --- | --- |
| Panel propio | `GET /api/waitlist/me` | `src/modules/waitlist/waitlist.routes.ts:32` |
| Listado staff | `GET /api/waitlist` | `src/modules/waitlist/waitlist.routes.ts:38` |
| Alta | `POST /api/waitlist` | `src/modules/waitlist/waitlist.routes.ts:12` |
| Baja | `DELETE /api/waitlist/:id` | `src/modules/waitlist/waitlist.routes.ts:45` |
| UI alta | dialogo de nueva cita | `frontend/src/modules/bookings/components/CreateBookingDialog.tsx:299-318` |
| UI panel | panel de lista de espera | `frontend/src/modules/waitlist/components/MyWaitlistPanel.tsx` |
| UI listado staff | seccion de lista de espera en pacientes | `frontend/src/modules/patients/` |
| Disparo notificacion | cancelacion de cita | `src/modules/booking/booking.service.ts:558` |
| Disparo notificacion | reprogramacion de cita | `src/modules/booking/booking.service.ts:671` |
| Disparo notificacion | feriado | `src/modules/holidays/holidays.service.ts:145` |

## 3. Precondiciones de datos

| ID | Requisito | Valor |
| --- | --- | --- |
| PRE-01 | Tenants cargados | `clinica-demo` (plan `pro`, feature `laboratory` activa) y `clinica-sur` (plan `basic`) |
| PRE-02 | Doctor con agenda configurada | `juan@clinic.com` en `clinica-demo` con horario de manana |
| PRE-03 | Doctor alterno | `carmen@clinic.com` en `clinica-demo` |
| PRE-04 | Paciente principal | `user1@clinic.com` (historial mas completo) |
| PRE-05 | Pacientes de apoyo | `user2@clinic.com`, `user3@clinic.com` |
| PRE-06 | Administrador | `admin@clinic.com`, password `$ADMIN_PASSWORD` (preguntar al administrador) |
| PRE-07 | Patron de password seed | `Vitaria.<parte-local-email>.<ano>!` |
| PRE-08 | Fecha de trabajo | Dia habil (`working_days` incluye el dia) y no festivo en `holidays` |
| PRE-09 | Doctor sin horarios libres | `GET /api/bookings/available-slots?doctor_id=<id>&date=<fecha>` responde `[]` |
| PRE-10 | Base de datos | Sin filas en `waitlist` para `user1@clinic.com` + PRE-02 + PRE-08 |

Restricciones de limpieza: toda alta creada por estos casos debe eliminarse con `DELETE /api/waitlist/:id` en el paso de limpieza, salvo los casos donde la fila no se pueda recuperar por diseno.

## 4. Casos

### [WTL-001] Unirse a la lista de espera cuando el doctor no tiene horarios

**Rol** `patient` · **Ruta** `/appointments` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01 a PRE-10. Sesion iniciada como `user1@clinic.com` en `clinica-demo`.
- **Datos:** `doctor_id` = id de `juan@clinic.com`; `requested_date` = PRE-08.
- **Pasos:**
1. Abrir la agenda y pulsar "Nueva Cita".
2. Seleccionar el doctor de PRE-02 y la fecha de PRE-08.
3. Confirmar que el bloque muestra el texto `bookings:no_slots_available` = "No hay horarios disponibles para esta fecha." y que aparece el boton "Unirme a lista de espera" (literal desde el `defaultValue` del componente: la clave `bookings:join_waitlist` no existe en `es.json`).
4. Pulsar el boton "Unirme a lista de espera".
5. Cerrar el dialogo y abrir "Mi lista de espera".
- **Esperado:** `POST /api/waitlist` responde `201` con el cuerpo `{ id, patient_id, doctor_id, requested_date, status: "waiting", created_at }`. El panel propio lista la entrada con el estado visible `waiting` y el texto del estado [verificar literal en es.json], ya que el namespace `waitlist` no existe en `es.json` y el componente usa literales internos.
- **Red:** una peticion `POST /api/waitlist` con payload `{ doctor_id, requested_date }` y respuesta `201`; una peticion `GET /api/waitlist/me` con respuesta `200` y un elemento con `status: "waiting"`.
- **Limpieza:** eliminar con `DELETE /api/waitlist/<id>` y confirmar que `GET /api/waitlist/me` devuelve `[]`.

### [WTL-002] Rechaza unirse con una fecha ya pasada

**Rol** `patient` · **Ruta** `/appointments` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-06 (sesion `patient`).
- **Datos:** `requested_date` = ayer en formato `YYYY-MM-DD`; control `requested_date` = hoy.
- **Pasos:**
1. Abrir el dialogo "Nueva Cita" y seleccionar el doctor de PRE-02.
2. Intentar el alta directa con la fecha de ayer.
3. Intentar el alta directa con la fecha de hoy.
4. Registrar el codigo y el detalle devueltos en cada intento.
- **Esperado:** ambos intentos responden `400` con detalle de Zod `Too small: date` sobre el campo `requested_date`. Ninguna fila creada en `waitlist`.
- **Red:** `POST /api/waitlist` con `400` y detalle de validacion; `GET /api/waitlist/me` sin cambios respecto al estado inicial.
- **Limpieza:** no aplica, no hay escritura.

### [WTL-003] Valida el payload de alta (doctor y fecha obligatorios)

**Rol** `patient` · **Ruta** `/api/waitlist` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04.
- **Datos:** cuatro cuerpos: `{}`, `{ doctor_id: <id> }`, `{ requested_date: "2030-01-10" }`, `{ doctor_id: "abc", requested_date: "2030-01-10" }`.
- **Pasos:**
1. Enviar `POST /api/waitlist` con cada cuerpo, uno por uno.
2. Anotar codigo y detalle de respuesta de cada uno.
- **Esperado:** los cuatro responden `400`. El primero y el segundo fallan por `doctor_id` y `requested_date` requeridos; el tercero por `requested_date`; el cuarto por `doctor_id` no numerico. Ninguna fila creada.
- **Red:** cuatro respuestas `400` de `POST /api/waitlist` con array `details` de Zod.
- **Limpieza:** no aplica, no hay escritura.

### [WTL-004] La fecha debe ser un dia habil y no festivo

**Rol** `patient` · **Ruta** `/api/waitlist` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08. Existe un feriado en `holidays` para `clinica-demo` y el doctor no trabaja ese dia.
- **Datos:** `requested_date` = fecha de un feriado; `requested_date` = un domingo; control = un dia habil futuro.
- **Pasos:**
1. Intentar el alta con la fecha de feriado.
2. Intentar el alta con un domingo.
3. Intentar el alta con un dia habil futuro como control positivo.
- **Esperado:** pasos 1 y 2 responden `400`; el control positivo responde `201`. Registrar el mensaje exacto devuelto: el backend no expone un mensaje dedicado de dia festivo, por lo que se espera el detalle de Zod (`Too small: date` o `Invalid enum value`).
- **Red:** dos `400` y un `201` de `POST /api/waitlist`.
- **Limpieza:** eliminar la fila creada por el control positivo con `DELETE /api/waitlist/<id>`.

### [WTL-005] Ver el panel "Mi lista de espera" con doctor y fecha

**Rol** `patient` · **Ruta** `/appointments` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01 a PRE-10, mas dos entradas previas creadas por WTL-001 y por el control positivo de WTL-004 para `user1@clinic.com` con PRE-02 y PRE-03 en fechas distintas.
- **Datos:** dos entradas con `doctor_id` distintos y `requested_date` distintas.
- **Pasos:**
1. Abrir el panel "Mi lista de espera".
2. Contar las filas visibles y leer el doctor y la fecha de cada una.
3. Recargar la pagina y volver a abrir el panel.
- **Esperado:** `GET /api/waitlist/me` responde `200` con exactamente 2 elementos. El panel muestra ambos, con el nombre del doctor resuelto y la fecha formateada. Las entradas se agrupan por fecha y se ordenan por `created_at` ascendente dentro de cada grupo. La recarga no duplica filas.
- **Red:** `GET /api/waitlist/me` con `200` y 2 elementos; ninguna peticion de escritura.
- **Limpieza:** eliminar ambas entradas con `DELETE /api/waitlist/<id>`.

### [WTL-006] Salir de la lista elimina la entrada

**Rol** `patient` · **Ruta** `/appointments` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-10, mas una entrada creada por WTL-001 con estado `waiting`.
- **Datos:** `id` de la entrada propia en estado `waiting`.
- **Pasos:**
1. En el panel "Mi lista de espera", pulsar la accion de salir de la entrada.
2. Confirmar la accion si aparece dialogo.
3. Recargar la pagina y reabrir el panel.
4. Consultar la tabla `waitlist` por el `id` eliminado.
- **Esperado:** `DELETE /api/waitlist/<id>` responde `200`. El panel deja de mostrar la entrada. La fila desaparece fisicamente de la tabla `waitlist`: no existe estado `removed` y el borrado es definitivo.
- **Red:** `DELETE /api/waitlist/<id>` con `200` y peticion `GET /api/waitlist/me` posterior con `[]`.
- **Limpieza:** ninguna, la fila ya no existe. Registrar el `id` para las consultas posteriores de las areas 21 y 23.

### [WTL-007] No se puede salir de una entrada ajena

**Rol** `patient` · **Ruta** `/api/waitlist` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04 y PRE-05. `user2@clinic.com` tiene una entrada en estado `waiting`.
- **Datos:** `id` de la entrada de `user2@clinic.com`; control `id` inexistente `999999`.
- **Pasos:**
1. Con sesion como `user1@clinic.com`, invocar `DELETE /api/waitlist/<id_ajeno>`.
2. Verificar con `user2@clinic.com` que su entrada sigue existiendo.
3. Repetir con el `id` inexistente.
- **Esperado:** paso 1 responde `404` con `message` = "Entrada no encontrada" (el controlador filtra por `id` + `patient_id` del usuario autenticado). Paso 3 responde `404` con el mismo mensaje. La entrada del otro paciente permanece intacta.
- **Red:** dos respuestas `404` de `DELETE /api/waitlist/:id`; `GET /api/waitlist/me` como `user2@clinic.com` con `200` y 1 elemento.
- **Limpieza:** `user2@clinic.com` elimina su propia entrada con `DELETE /api/waitlist/<id>`.

### [WTL-008] El paciente no puede ver la lista completa

**Rol** `patient` · **Ruta** `/api/waitlist` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04. Existen entradas de `user2@clinic.com` y `user3@clinic.com`.
- **Datos:** sesion de `user1@clinic.com` con rol canonico `patient`; control con `admin@clinic.com`.
- **Pasos:**
1. Invocar `GET /api/waitlist` con la sesion de `user1@clinic.com`.
2. Invocar `GET /api/waitlist` con la sesion de PRE-06.
3. Invocar `GET /api/waitlist/me` con la sesion de `user1@clinic.com`.
- **Esperado:** paso 1 responde `403` con `message` = "Access denied" (literal del backend en `authorize()`). El toast equivalente en la UI, si se dispara, usa la clave `errors.accessDenied` = "No tienes permisos para acceder a esta página". Paso 2 responde `200`. Paso 3 responde `200` y devuelve unicamente entradas propias.
- **Red:** `403` de `GET /api/waitlist`, `200` como `admin` y `200` de `GET /api/waitlist/me`.
- **Limpieza:** eliminar las entradas de PRE-05 al finalizar el caso.

### [WTL-009] El staff lista la lista completa con filtros y orden

**Rol** `doctor` · **Ruta** `/api/waitlist` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-04, PRE-05. Tres entradas de `user1@clinic.com` creadas con 2 minutos de diferencia para PRE-02 y PRE-08, y una de `user2@clinic.com`.
- **Datos:** consultas `?doctor_id=<id_pre02>`, `?requested_date=<fecha>`, `?doctor_id=<id_pre02>&requested_date=<fecha>` y `?patient_id=<id>`.
- **Pasos:**
1. Invocar `GET /api/waitlist` sin filtros y registrar el orden devuelto.
2. Invocar con `doctor_id` de PRE-02.
3. Invocar con `requested_date` de PRE-08.
4. Invocar con ambos filtros.
5. Invocar con el parametro no soportado `patient_id`.
6. Repetir el paso 1 con `admin`.
- **Esperado:** las seis llamadas responden `200`. La lista sin filtros devuelve las 4 entradas ordenadas por `created_at` ascendente (la mas antigua de PRE-04 primero). Los filtros son acumulativos. El parametro no soportado se ignora silenciosamente y devuelve la lista completa, lo que se registra como observacion. Con `doctor` y `admin` el resultado es identico.
- **Red:** seis respuestas `200` de `GET /api/waitlist` con conteos de elementos por llamada.
- **Limpieza:** eliminar las cuatro entradas con `DELETE /api/waitlist/<id>`.

### [WTL-010] Cancelar una cita notifica a la lista de espera

**Rol** `doctor` · **Ruta** `/api/bookings/:id/cancel` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01 a PRE-08. `user1@clinic.com` tiene una entrada `waiting` para PRE-02 y PRE-08, y una cita confirmada de PRE-04 con PRE-02 en PRE-08 a las 09:00.
- **Datos:** `booking_id` de la cita confirmada; `reason` = "Paciente no puede asistir".
- **Pasos:**
1. Como `user1@clinic.com`, confirmar que el panel muestra la entrada en `waiting`.
2. Invocar `PATCH /api/bookings/<booking_id>/cancel` con `reason`.
3. Volver a abrir "Mi lista de espera" como `user1@clinic.com`.
4. Como `admin`, listar `GET /api/waitlist?doctor_id=<id_pre02>&requested_date=<fecha>`.
5. Revisar el centro de notificaciones de `user1@clinic.com` en `/notifications`.
- **Esperado:** paso 2 responde `200`. La entrada cambia de `waiting` a `notified` y el panel la muestra con el estado visible `notified`. Aparece una notificacion in-app para `user1@clinic.com` del tipo de disponibilidad liberada. La cita queda en estado `cancelled`.
- **Red:** `PATCH /api/bookings/:id/cancel` con `200`; `GET /api/waitlist/me` con `200` y `status: "notified"`; `GET /api/waitlist` con `status: "notified"`.
- **Limpieza:** eliminar la entrada con `DELETE /api/waitlist/<id>`. La cita cancelada permanece como historico y no se borra.

### [WTL-011] La reprogramacion tambien dispara la notificacion

**Rol** `doctor` · **Ruta** `/api/bookings/:id/reschedule` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01 a PRE-08. `user1@clinic.com` tiene una entrada `waiting` para PRE-02 y una cita confirmada en PRE-08.
- **Datos:** nueva `date` = un dia habil futuro distinto; nueva `time` = horario disponible.
- **Pasos:**
1. Registrar el estado de la entrada antes de la accion.
2. Invocar `PATCH /api/bookings/<booking_id>/reschedule` con la nueva fecha y hora.
3. Consultar `GET /api/waitlist/me` como `user1@clinic.com`.
4. Verificar la fecha antigua en `GET /api/bookings/available-slots`.
- **Esperado:** paso 2 responde `200`. La entrada pasa de `waiting` a `notified`. `GET /api/bookings/available-slots?doctor_id=<id_pre02>&date=<fecha_antigua>` ahora devuelve un array con al menos el horario liberado, por lo que el dialogo de nueva cita deja de mostrar "Unirme a lista de espera" para esa fecha.
- **Red:** `PATCH /api/bookings/:id/reschedule` con `200`; `GET /api/waitlist/me` con `200`; `GET /api/bookings/available-slots` con `200` y `length >= 1`.
- **Limpieza:** eliminar la entrada con `DELETE /api/waitlist/<id>` y cancelar la cita reprogramada.

### [WTL-012] Aplicar un feriado notifica a la lista de espera

**Rol** `admin` · **Ruta** `/api/holidays` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08. `user1@clinic.com` tiene una entrada `waiting` para PRE-02 en la fecha objetivo.
- **Datos:** `holiday` con `name` = "Feriado de prueba waitlist", `date` = fecha objetivo, `is_working_day` = false.
- **Pasos:**
1. Crear el feriado con `POST /api/holidays` como `admin`.
2. Consultar `GET /api/waitlist/me` como `user1@clinic.com`.
3. Intentar crear una cita con `POST /api/bookings` en la fecha del feriado como `doctor`.
- **Esperado:** paso 2 muestra la entrada en `notified`. Paso 3 responde `400` con mensaje de dia festivo, confirmando que el feriado quedo aplicado y que las notificaciones se dispararon.
- **Red:** `POST /api/holidays` con `201`; `GET /api/waitlist/me` con `status: "notified"`; `POST /api/bookings` con `400`.
- **Limpieza:** eliminar la entrada con `DELETE /api/waitlist/<id>` y el feriado con `DELETE /api/holidays/<id>`.

### [WTL-013] La notificacion no caduca: permanece en notified

**Rol** `patient` · **Ruta** `/appointments` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04. `user1@clinic.com` tiene una entrada en estado `notified` creada por WTL-010.
- **Datos:** entrada `notified` con fecha de PRE-08.
- **Pasos:**
1. Abrir "Mi lista de espera" y registrar que la entrada aparece con estado `notified`.
2. Confirmar que la fecha solicitada ya paso y que el horario sigue libre.
3. Buscar en el panel cualquier accion para reservar o aceptar la notificacion.
4. Opcional en un dia de ejecucion posterior: repetir el paso 1 para confirmar la persistencia.
- **Esperado:** la entrada sigue en `notified` indefinidamente: no hay expiracion por fecha ni por horas de espera. El panel no ofrece ninguna accion de reserva, solo salir de la lista. El usuario no puede pasar a `booked` por si mismo (ver WTL-014).
- **Red:** `GET /api/waitlist/me` con `200` y `status: "notified"` en la segunda ejecucion; `GET /api/bookings/available-slots` con `200` y el horario libre.
- **Limpieza:** eliminar la entrada con `DELETE /api/waitlist/<id>`.

### [WTL-014] No existe endpoint para reservar desde la lista de espera

**Rol** `patient` · **Ruta** `/api/waitlist` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04. `user1@clinic.com` tiene una entrada `notified` y PRE-08 tiene al menos un horario libre en PRE-02.
- **Datos:** intentos `PATCH /api/waitlist/<id>/book`, `POST /api/waitlist/<id>/reserve`, `POST /api/waitlist/<id>/notify`.
- **Pasos:**
1. Enumerar las rutas de `waitlist.routes.ts` y confirmar el conjunto real de verbos y paths.
2. Invocar cada uno de los tres intentos con la sesion de `user1@clinic.com`.
3. Buscar en el panel de lista de espera un boton de reserva o de creacion de cita.
4. Como control, crear la cita por el flujo normal con `POST /api/bookings` usando el horario libre.
- **Esperado:** los tres intentos responden `404`. El conjunto real de rutas es exactamente `POST /`, `GET /me`, `GET /` y `DELETE /:id`; no existe transicion a `booked` ni endpoint de reserva. El panel no ofrece ninguna accion de reserva. El paso 4 responde `201` y la entrada permanece en `notified`, es decir, la reserva por el flujo normal no cierra la entrada de la lista.
- **Red:** tres respuestas `404`, un `201` de `POST /api/bookings` y un `GET /api/waitlist/me` con `status: "notified"`.
- **Limpieza:** cancelar la cita creada con `PATCH /api/bookings/<id>/cancel` y eliminar la entrada con `DELETE /api/waitlist/<id>`.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
| --- | --- | --- | --- |
| H-62 | Autorizacion por comparacion de rol en lugar de la tabla de roles canonicos. En esta area se manifiesta si el alias `user` no es reconocido por `authorize(...)` al listar la cola completa. | WTL-008 | Un `user` con sesion valida recibe `403` en `GET /api/waitlist`. |
| H-F4b-1 | El catalogo funcional `02-CATALOGO-FUNCIONES.md` (W-06, W-09) describe reserva desde la lista y notificacion manual que el codigo no implementa. | WTL-014 | `404` en los tres endpoints intentados y ausencia de accion en la UI. |
| H-F4b-2 | La entrada notificada nunca pasa a `booked` ni caduca; el paciente queda notificado pero sin via de reserva. | WTL-013, WTL-014 | `status` permanece en `notified` indefinidamente. |
| H-F4b-3 | El boton "Unirme a lista de espera" solo se renderiza cuando `availableSlots.length === 0`; con un horario libre el paciente nunca ve la lista aunque ya este notificado. | WTL-011, WTL-014 | El boton no aparece y `GET /api/waitlist/me` sigue en `notified`. |
| H-F4b-4 | La eliminacion es fisica: no hay estado `removed` ni historico, y un `DELETE` exitoso no se puede revertir. | WTL-006 | La fila desaparece de `waitlist` y no queda traza de la salida. |

Nota: los identificadores `H-F4b-*` son etiquetas locales de este documento para findings del catalogo funcional que no tienen ID propio en `90-HALLAZGOS-CODIGO.md`. Deben renumerarse si el equipo decide incorporarlos a ese catalogo.

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Como verificarlo |
| --- | --- | --- |
| No existe `POST /api/waitlist/:id/notify` ni equivalente | No se puede disparar una notificacion manual desde la API, solo por cancelacion, reprogramacion o feriado. | Enumerar `waitlist.routes.ts` y comparar con `02-CATALOGO-FUNCIONES.md`. |
| No existe transicion `notified` -> `booked` | El flujo "reservar desde la lista cuando hay hora libre" no es automatizable de extremo a extremo. | WTL-014: los tres intentos de reserva devuelven `404`. |
| No hay campo `position` ni endpoint de posicion | La posicion en la cola solo se puede inferir del orden de `GET /api/waitlist`, visible solo para staff. | WTL-009: leer el orden devuelto y comprobar que el mas antiguo es el primero. |
| El panel no permite reservar | Aunque existiera el endpoint, la UI no lo invoca. | WTL-014 paso 3: inspeccionar `MyWaitlistPanel`. |
| El namespace `waitlist` no existe en `es.json` | El panel usa literales internos o `defaultValue`; no se puede afirmar el texto exacto del estado. | Buscar `waitlist` en `frontend/src/i18n/locales/es.json` (sin resultado) y marcar `[verificar literal en es.json]`. |
| La clave `bookings:join_waitlist` no existe en `es.json` | El texto del boton viene del `defaultValue` del componente: "Unirme a lista de espera". | Verificar en `CreateBookingDialog.tsx:316`. |
| No hay paginacion en `GET /api/waitlist/me` ni en `GET /api/waitlist` | Con muchas entradas la lista completa se devuelve entera; WTL-009 no puede validar paginacion. | Inspeccionar los controladores: no aceptan `page` ni `limit`. |
| Sin cobertura de correo | La notificacion por email de la lista de espera no se verifica aqui. | Hueco de cobertura: ver `99`. |

## 7. Resultado del área

| Campo | Valor |
| --- | --- |
| Casos ejecutados | `____ / 14` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 5` |
| Huecos confirmados | `____ / 7` |
| Evidencia guardada en | `pruebas-navegador/evidencia/20-lista-espera/` |
| Tester / fecha | `________________` |

Criterio de aprobado del area: los 14 casos ejecutados en Passed y los 5 defectos de la seccion 5 confirmados con el observable indicado, sin diferencias respecto a los endpoints reales de `src/modules/waitlist/waitlist.routes.ts`.

---

Alcance: 14 casos de lista de espera sobre un tenant `pro` y un tenant `basic`, cubriendo alta, validacion, consulta propia, baja, autorizacion, listado de staff, notificacion automatica y ausencia de reserva. No cubre el envio de correo, la interfaz de superadmin ni las citas no relacionadas con lista de espera. Fecha de redaccion: 2026-10-01.

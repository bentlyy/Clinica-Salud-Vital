# 18 — Reserva de invitado

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `18` | `GST` | C2 | Semanal | 26 | `17` | — |

## 1. Qué cubre

El flujo publico de reserva para pacientes que **no tienen cuenta**: los tres pasos de `/booking` (Datos Personales, Seleccionar Doctor, Confirmar); el listado publico de medicos; los slots publicos; el `POST /api/guest/booking` y su candado anti-carrera; la validacion y normalizacion del RUT; la consulta de reservas por RUT; la confirmacion por token; la cancelacion; el bloqueo por inasistencia; los limites de peticiones; el email de confirmacion; y los errores que la interfaz descarta.

No cubre: la reserva autenticada de un paciente con cuenta (area `16`), la disponibilidad y los feriados como tales (area `17`), ni la mensajeria de correo (area `23`).

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `anónimo` | `/booking`, `/confirm/<token>` | `GET /api/doctors/public`, `GET /api/bookings/available-slots`, `POST /api/guest/booking`, `GET /api/guest/bookings/:rut`, `DELETE /api/guest/booking/:id`, `POST /api/bookings/confirm/:token` |
| `doctor`, `admin` | `/booking` | `DELETE /api/guest/booking/:id` con `optionalAuth` (cancela cualquier cita del tenant) |

Discrepancias de ruta que este area debe dejar documentadas (no se "corrigen" en la prueba):

| Ruta mencionada en el catalogo | Ruta real | Efecto |
|---|---|---|
| `GET /api/guest/doctors` | `GET /api/doctors/public` (`src/app.ts:266` + `doctor.routes.ts:25`) | La ruta del catalogo responde 404 |
| `GET /api/guest/booking/:id` | `POST /api/bookings/confirm/:token` | La ruta del catalogo responde 404 |

## 3. Precondiciones de datos

| ID | Requisito | Valor |
|---|---|---|
| PRE-01 | Medico con disponibilidad | `juan@clinic.com` (`Vitaria.juan.<año>!`), tenant `default`, bloques en PRE-05 del area `17` |
| PRE-02 | Fecha habil futura | Dia con bloques publicados y sin fila en `clinic_holidays` |
| PRE-03 | RUT de prueba valido | `12.345.678-5` (normalizado `123456785`, digito verificador correcto) |
| PRE-04 | Correo de destino | Buzon de QA con `EMAIL_TEST` **no** configurado: los casos de email quedan `BLOQUEADO` |
| PRE-05 | Herramienta HTTP | Cliente capaz de fijar `X-Tenant-Id` y `X-Forwarded-For` a mano, sin usar el navegador |
| PRE-06 | Consola de BD | `psql` de solo lectura; indispensable mientras H-05 siga abierto (ver PRE-07) |
| PRE-07 | **Reserva de invitado existente** | `src/seed/seed.ts` inserta 4 reservas y **ninguna** lleva `guest_rut`, asi que no hay ninguna reserva de invitado de arranque. Crear una por `psql` con `guest_rut = '12.345.678-5'`, `status = 'pending'`, `confirmed = true`, `confirmation_token` conocido y `tenant_id = 'default'`. Es el unico modo de ejecutar GST-008, GST-013, GST-014, GST-015 y GST-025 mientras H-05 no se corrija |

Regla de limpieza: borrar las reservas creadas con `DELETE /api/guest/booking/<id>` o marcarlas `QA-`. Los datos de prueba se prefijan con `QA-`.

## 4. Casos

### [GST-001] Cargar la lista publica de medicos

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. Sin sesion ni cabeceras de autenticacion.
- **Datos:** `GET /api/doctors/public` · control `GET /api/guest/doctors`
- **Pasos:**
1. Abrir `/booking` como anonimo y llegar al paso 2 ("Seleccionar Doctor", `guest_booking:step_doctor`).
2. Contar las tarjetas de medico del desplegable `guest_booking:select_doctor`.
3. Emitir el control de la tabla de la seccion 2.
- **Esperado:** el paso 1 responde **200** con un array de medicos activos del tenant por defecto, cada uno con `id`, `name`, `specialty` y `slot_duration`. El desplegable lista esos medicos y nada mas: no hay filtro por tenant ni se cuelan medicos de `clinica-demo`. La respuesta lleva `Cache-Control: public, max-age=60`, por lo que un cambio de disponibilidad no se refleja en el navegador durante 1 minuto. El control `GET /api/guest/doctors` responde **404**: la ruta del catalogo no existe (**defecto H-19**).
- **Red:** `GET /api/doctors/public` → `200` con `N` medicos; `GET /api/guest/doctors` → `404`; verificar `Cache-Control` en la cabecera de respuesta.
- **Limpieza:** ninguna (solo lectura).

### [GST-002] Elegir medico y fecha en el paso 2

**Rol** `anónimo` · **Ruta** `/booking` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02. Paso 1 ("Datos Personales") completado con nombre `QA Invitado`, email `qa-invitado@example.com` y RUT `12.345.678-5`.
- **Datos:** paso `guest_booking:step_doctor` · un medico con bloques · PRE-02
- **Pasos:**
1. Rellenar el paso 1 y pulsar "Siguiente" (`guest_booking:next`).
2. Elegir un medico del desplegable y una fecha habil en el selector.
3. Observar el indicador de carga y el texto que aparece antes de que lleguen las horas.
- **Esperado:** el paso 1 es valido con RUT **o sin RUT** (ver GST-007). El paso 2 pide `GET /api/bookings/available-slots` en cuanto hay medico y fecha. Mientras espera, las horas permanecen vacias; no aparece un error. Si la fecha no tiene horas, el aviso es `guest_booking:no_slots` ("No hay horarios disponibles para esta fecha") y no un error rojo. Volver atras conserva los datos del paso 1.
- **Red:** una llamada a `GET /api/bookings/available-slots` por cada cambio de `(medico, fecha)`; verificar `doctor_id` y `date` en la query.
- **Limpieza:** ninguna.

### [GST-003] Obtener los slots sin cabecera de tenant

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05.
- **Datos:** `GET /api/bookings/available-slots?doctor_id=<id>&date=<PRE-02>` sin cookie ni `X-Tenant-Id`
- **Pasos:**
1. Emitir la peticion sin ninguna cabecera.
2. Repetir con `X-Tenant-Id: default`.
3. Emitirla con `X-Tenant-Id` ausente pero `NODE_ENV=production` como control teorico.
- **Esperado:** los pasos 1 y 2 responden **200** con un array de cadenas `HH:MM`. **No** hay `400 X-Tenant-Id header is required`: `/api/bookings/available-slots` esta en `PUBLIC_PATHS` (`tenant.middleware.ts:24`), que es la regresion historica **F-0b** corregida y que este caso debe seguir vigilando (**H-17**). El array se genera desde `doctor_availability` y el `slot_duration` del medico; si existe fila en `clinic_holidays` para esa fecha, el array es `[]`.
- **Red:** dos respuestas `200`; comparar que el paso 2 no difiere del paso 1 y que ninguna contiene horas fuera de los bloques.
- **Limpieza:** ninguna (solo lectura).

### [GST-004] Crear una reserva de invitado valida

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03. El slot elegido esta libre.
- **Datos:** `{ "doctor_id": <id>, "date": <PRE-02>, "time": "09:00", "rut": "12.345.678-5", "name": "QA Invitado", "email": "qa-invitado@example.com", "phone": "+56911111111" }`
- **Pasos:**
1. Completar los tres pasos del formulario y pulsar "Confirmar Reserva" (`guest_booking:confirm_booking`).
2. Anotar el codigo HTTP real de la respuesta y el cuerpo del error en la consola del servidor.
3. Consultar por `psql` si se creo alguna fila en `bookings`.
- **Esperado:** lo correcto es `201` con la fila creada: `confirmed: true`, `duration: 30`, `guest_rut: "12.345.678-5"`, `guest_name`, `guest_email`, `guest_phone`, `confirmation_token` y `tenant_id`. **Lo que ocurre de verdad es un `500`**: el `INSERT` va precedido de `pg_advisory_xact_lock($1::bigint, hashtext($2)::bit(32)::bigint)`, una firma de dos `bigint` que PostgreSQL no tiene → error `42883 function does not exist`, la transaccion se revierte y **no se crea nada** (**defecto H-05**). La interfaz solo muestra `guest_booking:error` ("Error al crear la reserva"), sin causa. Registrar el codigo de Postgres como evidencia.
- **Red:** `POST /api/guest/booking` → `500` con `code: "42883"` en el cuerpo o en el log del servidor; `SELECT count(*) FROM bookings WHERE guest_email = 'qa-invitado@example.com'` → `0`.
- **Limpieza:** ninguna fila que borrar (la transaccion revierte). Si el `500` no aparece, borrar la reserva con `DELETE /api/guest/booking/<id>`.

### [GST-005] Comprobar el candado anti-carrera bajo concurrencia

**Rol** `anónimo` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05, PRE-06. PRE-06 es obligatoria aqui: no hay forma de observar el candado por la UI.
- **Datos:** 10 peticiones `POST /api/guest/booking` simultaneas con el **mismo** `(doctor_id, date, time)`
- **Pasos:**
1. Lanzar las 10 peticiones en paralelo desde el cliente HTTP, no desde el navegador.
2. Contar los codigos de respuesta: `201`, `400`, `409`, `500`.
3. Consultar por `psql` cuantas filas quedaron para ese `(doctor_id, date, time)`.
- **Esperado:** como el candado falla con `42883` antes de tocar la tabla, **las 10 responden `500`** y quedan `0` filas: hoy el candado no serializa nada, no bloquea y no protege. El defecto real que se observa es que *ninguna* reserva se guarda, no una doble reserva. Si H-05 se corrigiera en el entorno, el esperado pasa a ser exactamente `1` x `201` + `9` x `400 GUEST_SLOT_BOOKED`, nunca `2` filas. Anotar explicitamente si el entorno ya tiene la firma de 1 argumento.
- **Red:** 10 respuestas de `POST /api/guest/booking`; `SELECT count(*) FROM bookings WHERE doctor_id=... AND date=... AND time=...` → `0`.
- **Limpieza:** borrar por `psql` cualquier fila que se haya creado, marking `QA-`.

### [GST-006] Reservar con un RUT valido

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-05, PRE-06.
- **Datos:** cuerpos con `rut` = `12.345.678-5`, `123456785`, `12345678-5` y `12345678k5` (DV variant, debe fallar)
- **Pasos:**
1. Validar los cuatro RUT por `psql` con la misma funcion de la aplicacion, sin crearsereserva.
2. Intentar el `POST` con cada variante.
3. Anotar codigo y mensaje de cada uno.
- **Esperado:** `validateRut` normaliza con `cleanRut` (quita puntos y guiones, pasa a mayusculas) y calcula el modulo 11: `12.345.678-5`, `123456785` y `12345678-5` son **validos**; `12345678k5` es **invalido** (el DV correcto es `5`). Con los tres validos el unico resultado posible hoy es el `500 42883` de GST-004; con el invalido, un `400` con `GUEST_INVALID_RUT` que llega **antes** del candado, porque la validacion del RUT es la linea 41 y el `BEGIN` es la 55. Ese `400` es la prueba de que el RUT si se valida.
- **Red:** cuatro respuestas `POST /api/guest/booking`; el unico codigo distinto de `500` debe ser el `400` del DV erroneo.
- **Limpieza:** ninguna fila creada.

### [GST-007] Rechazar una reserva sin RUT o con RUT invalido

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05.
- **Datos:** cuerpos sin la clave `rut`, con `rut: ""`, con `rut: "123"` y con `rut: "abc"`
- **Pasos:**
1. En `/booking`, completar el paso 1 dejando el campo RUT vacio y llegar al paso 3.
2. Enviar por HTTP los cuatro cuerpos de "Datos".
3. Anotar codigo y mensaje de cada uno.
- **Esperado:** el formulario **permite llegar al envio sin RUT** (no hay validacion en el campo), pero el esquema lo exige (`guest.schema.ts:7`, `min(1)`): el `POST` responde `400` con un detalle que **no señala el campo RUT**, sino el aviso generico (**defecto H-58**). Con `rut: ""` el `min(1)` de Zod salta antes que el servicio. Con `123` y `abc` el `400` es `GUEST_INVALID_RUT`. La reserva queda sin autor identificable: quien la intente despues no podra consultarla ni cancelarla (ver GST-015).
- **Red:** cuatro respuestas `400` de `POST /api/guest/booking`; el `details` de Zod debe citar `path: ["rut"]`.
- **Limpieza:** ninguna fila creada.

### [GST-008] Consultar las reservas por RUT

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-07. Existe una reserva de invitado con `guest_rut = '12.345.678-5'`.
- **Datos:** `GET /api/guest/bookings/12.345.678-5` · `GET /api/guest/bookings/123456785` · `GET /api/guest/bookings/99.999.999-9`
- **Pasos:**
1. Emitir las tres peticiones sin sesion ni cabeceras.
2. Comparar la respuesta 1 con la 2.
3. Anotar exactamente que campos trae cada elemento.
- **Esperado:** las dos primeras responden **200** con el **mismo** array: la consulta normaliza el RUT quitando todo lo que no sea digito o `k`. Cada elemento trae solo `id`, `date`, `time`, `duration`, `status`, `confirmed`, `doctor_name` y `specialty`; **no** hay `email`, `phone`, `guest_name` ni `patient_name`. La reserva `cancelled` no aparece (`AND b.status != 'cancelled'`). El RUT inexistente responde `200` con `[]`, nunca `404`. La consulta ademas hace `LEFT JOIN users` y compara tambien `users.rut`, asi que trae las citas de cuentas registradas con ese RUT.
- **Red:** tres respuestas `200` de `GET /api/guest/bookings/:rut`; los cuerpos 1 y 2 deben ser identicos byte a byte.
- **Limpieza:** la reserva de PRE-07 se conserva para GST-013, GST-014, GST-015 y GST-025.

### [GST-009] Comprobar que el endpoint por RUT expone la agenda completa

**Rol** `anónimo` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-07, PRE-05. Existen reservas de invitado y tambien citas de `user1@clinic.com`.
- **Datos:** `GET /api/guest/bookings/<rut>` con tres RUT seguidos: `11.111.111-1`, `12.222.222-2`, `13.333.333-3`
- **Pasos:**
1. Emitir los tres RUT en menos de 15 minutos desde la misma IP.
2. Anotar que datos de agenda devuelve cada uno.
3. Repetir el tercero con un RUT que corresponde a un usuario registrado del tenant.
- **Esperado:** la ruta esta **sin `authMiddleware`** y devuelve `id`, `date`, `time`, `status`, `doctor_name` y `specialty` de **todo lo no cancelado**, tanto de reservas de invitado como de cuentas registradas, porque el `LEFT JOIN` compara tambien contra `users.rut` (**defecto H-40**). Con solo `3 req/15 min` por IP, enumerar la agenda de un paciente concreto es barato para quien conozca su RUT: los RUT chilenos son cortos y casi secuenciales. Mitigacion actual: el limite de la seccion 5. Registrar los tres resultados y si algun RUT devuelve agenda de un usuario con cuenta.
- **Red:** tres respuestas `200`; anotar `id`, `date`, `time` y `doctor_name` devueltos en cada una.
- **Limpieza:** ninguna (solo lectura).

### [GST-010] Limitar a tres consultas por RUT cada quince minutos

**Rol** `anónimo` · **Ruta** `—` · **P0** · **Resultado** `______`
- **Precondición:** PRE-05, PRE-07. Ventana de 15 minutos limpia para la IP de prueba.
- **Datos:** `GET /api/guest/bookings/12.345.678-5` repetido 5 veces desde la misma IP
- **Pasos:**
1. Emitir cinco peticiones consecutivas con 2 s de separacion.
2. Anotar el codigo y el cuerpo de cada una.
3. Verificar si la respuesta 429 indica que reintentar.
- **Esperado:** las peticiones 1, 2 y 3 responden `200`; la **4 y la 5 responden `429** con `{ "error": "Too many RUT lookups, try again later" }`. El limite es de 3 por 15 min (`guest.routes.ts:10-14`). El contador vive **en memoria del proceso**: tras reiniciar el backend vuelve a 0, y con varias instancias cada una tiene el suyo. El mensaje no indica minutos restantes ni `Retry-After`.
- **Red:** tres `200` y dos `429` de `GET /api/guest/bookings/:rut`; verificar que el `429` llega en menos de 1 min desde el primer intento.
- **Limpieza:** esperar 15 min o cambiar de IP antes de GST-011.

### [GST-011] Limitar a cinco reservas por hora

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05. Ventana de 1 hora limpia para la IP de prueba.
- **Datos:** `POST /api/guest/booking` repetido 7 veces con `(doctor_id, date, time)` distintos
- **Pasos:**
1. Emitir siete `POST` seguidos con horas distintas del mismo bloque.
2. Anotar el codigo de cada uno.
3. Repetir el primero desde una IP distinta como control.
- **Esperado:** los 6 primeros devuelven `500 42883` (H-05) y el **7º devuelve `429** con `{ "error": "Too many guest bookings, try again later" }`, porque el limite `guestBookingLimiter` es de 5 por hora y se cuenta por peticion, no por exito: **incluso los `POST` que fallan consumen cuota**. La peticion desde otra IP no recibe `429`. Es el caso de uso real de una sala de espera: cinco personas no pueden reservar por un defecto del candado (**defecto H-05** / **H-42**).
- **Red:** seis `500` y un `429` de `POST /api/guest/booking`; el control desde otra IP devuelve `500` y no `429`.
- **Limpieza:** esperar 1 hora o cambiar de IP antes de continuar.

### [GST-012] Comprobar que el limite depende de la IP confiada

**Rol** `anónimo` · **Ruta** `—` · **P1** · **Resultado** `______`
- **Precondición:** PRE-05, PRE-10. Ventana de 15 minutos limpia.
- **Datos:** cuatro peticiones con `X-Forwarded-For: 203.0.113.10/11/12/13` y un control sin la cabecera
- **Pasos:**
1. Emitir cuatro consultas por RUT, una por cada `X-Forwarded-For`.
2. Emitir una quinta sin cabecera, desde la misma conexion.
3. Anotar cuando aparece el `429`.
- **Esperado:** `app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])` (`src/app.ts:71`) no incluye la red pública de pruebas: si el proxy no cae en rangos privados, **las cuatro peticiones comparten clave** y el `429` aparece en la cuarta; si cae en rangos privados, cada `X-Forwarded-For` cuenta por separado y el limite se elude por completo hasta la quinta (**defecto H-42**). Registrar cual de los dos comportamientos se observa: determina si el limite protege o si es evadible con una cabecera.
- **Red:** cuatro peticiones a `GET /api/guest/bookings/:rut` con `X-Forwarded-For` distinto; anotar el orden exacto del `429`.
- **Limpieza:** esperar 15 min tras el `429`.

### [GST-013] Confirmar la reserva con el token

**Rol** `anónimo` · **Ruta** `/confirm/<token>` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-07. Existe una reserva con `confirmation_token` conocido y `confirmed = false`.
- **Datos:** `POST /api/bookings/confirm/<token>` · control `GET /api/guest/booking/<id>`
- **Pasos:**
1. Emitir el control de la tabla de la seccion 2.
2. Abrir `/confirm/<token>` con el token valido y pulsar confirmar.
3. Volver a emitir el `POST` con el mismo token.
- **Esperado:** el control responde **404**: `GET /api/guest/booking/:id` no existe (**defecto H-38**). La ruta real es `POST /api/bookings/confirm/<token>` (`src/app.ts:267`), y responde `200` con `{ "confirmed": true, "alreadyConfirmed": false }`; la segunda invocacion devuelve `{ "confirmed": true, "alreadyConfirmed": true }` sin volver a escribir. Un token inexistente responde `404`. Un cuerpo con `{ "cancelled": true }` debe rechazar el token (el token solo firma `{ rut, email, doctor_id, date, time, tenant_id }`).
- **Red:** un `404` (ruta inexistente), dos `200` de `POST /api/bookings/confirm/:token` con `alreadyConfirmed` `false` y luego `true`, y un `404` de token invalido.
- **Limpieza:** marcar la reserva de PRE-07 como `cancelled` por `psql` al terminar el area.

### [GST-014] Comprobar el estado real de la reserva creada

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-07, PRE-03. Existe una reserva de invitado con `confirmed = true`.
- **Datos:** `status` y `confirmed` de la fila · filtro `?status=confirmed` de `/bookings`
- **Pasos:**
1. Abrir `/bookings` como `admin@clinic.com` y filtrar por estado.
2. Buscar la reserva de invitado en la lista de la agenda del dia.
3. Consultar por `psql` los dos campos.
- **Esperado:** la reserva nace con `confirmed = true` **y** `status = 'pending'`, porque el `INSERT` no fija `status` y el default de `db/init.sql:83` es `pending` (**defecto H-43**). Consecuencia observable: lo que filtra `status='confirmed'` (agenda, metricas, `.ics` del area `17`) **no ve** las reservas de invitado, y el invitado recibe un email que dice lo contrario. La clinica ve un estado y el paciente cree otro. Anotar en que listas concretas desaparece la reserva.
- **Red:** `GET /api/bookings?status=confirmed` → `200` sin la reserva de invitado; la misma peticion sin filtro la trae.
- **Limpieza:** marcar la fila como `cancelled` por `psql`.

### [GST-015] Cancelar una reserva como invitado

**Rol** `anónimo` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-07. Existe una reserva con `id`, `guest_rut` y `confirmation_token` conocidos.
- **Datos:** `DELETE /api/guest/booking/<id>` con cuerpo `{ "rut": "12.345.678-5" }`, luego con `{ "rut": ..., "confirmation_token": ... }`, luego con cuerpo vacio
- **Pasos:**
1. Enviar los tres cuerpos en orden sobre la misma reserva.
2. Anotar codigo y mensaje de cada uno.
3. Verificar el estado de la reserva por `psql` entre pasos.
- **Esperado:** el primer `DELETE` responde **400** con `GUEST_CONFIRM_TOKEN_REQUIRED` (el invitado necesita **ambos** campos; el `rut` solo no basta). El segundo responde `200` con `{ "message": "Reserva cancelada correctamente" }` y la fila pasa a `status = 'cancelled'`, con entrada en `booking_status_history` (`actorType: 'guest'`). El tercero, con cuerpo vacio, responde `400` con `GUEST_RUT_REQUIRED`. Un `id` inexistente o un `rut` que no coincide responde `404` con `GUEST_BOOKING_NOT_FOUND`. Repetir la cancelacion ya cancelada responde `404`, no un segundo historial.
- **Red:** tres respuestas `DELETE /api/guest/booking/:id` con `400`, `200` y `400`.
- **Limpieza:** la reserva queda `cancelled`; no hay nada que borrar.

### [GST-016] Comprobar que no hay interfaz de cancelacion

**Rol** `anónimo` · **Ruta** `/confirm/<token>` · **P1** · **Resultado** `______`
- **Precondición:** PRE-07, PRE-04.
- **Datos:** enlace del email · clave `guest_booking` completa (18 claves)
- **Pasos:**
1. Leer el texto del email de confirmacion y seguir el enlace completo.
2. Recorrer las tres pantallas del flujo de invitado buscando botones de cancelar o de gestionar cita.
3. Revisar las 18 claves de `guest_booking` en `es.json`.
- **Esperado:** el email promete "gestionar mi cita" y el enlace lleva a `/confirm/<token>`, una pantalla que **solo confirma**. En todo el frontend hay **una sola** llamada a la API de invitado: el `POST` de creacion; el `DELETE` es inalcanzable desde el producto (**defecto H-41**). Ninguna de las 18 claves de `guest_booking` menciona cancelar. El RUT que permitio cancelar por HTTP se pide en el paso 1 pero no se guarda en ningun sitio para reutilizarlo.
- **Red:** el unico `DELETE /api/guest/booking/<id>` que se observa en la sesion de red es el que emite el propio tester; la aplicacion no lo emite nunca.
- **Limpieza:** ninguna.

### [GST-017] Bloquear la reserva de un RUT con inasistencia previa

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-05, PRE-06. Existe en `users` una fila con `rut = '12.345.678-5'` y `blocked_until` en el futuro.
- **Datos:** `blocked_until` = hoy + 30 dias · `GET /api/guest/bookings/12.345.678-5` para preparar el escenario
- **Pasos:**
1. Confirmar por `psql` el valor exacto de `users.rut` (con puntos y guion, tal como lo deja el seed).
2. Intentar el `POST` con `rut` formateado y con `rut` normalizado.
3. Consultar por `psql` si `blocked_until` se escribio o se resetéo.
- **Esperado:** el bloqueo **nunca se aplica**: `checkRutBlocked` compara el RUT ya normalizado (`123456785`) contra `users.rut` formateado en la BD (`12.345.678-5`), la comparacion no coincide, `rows.length` es `0` y la funcion devuelve `false` siempre (**defecto H-39**). Un paciente bloqueado por inasistencia **sigue reservando como invitado**. El mensaje `Tu RUT está bloqueado hasta el ... por inasistencia a citas anteriores.` solo se veria con los dos formatos identicos, lo que la UI no produce. Anotar si algun camino del sistema escribe el RUT normalizado, caso contrario el bloqueo es inejecutable.
- **Red:** `POST /api/guest/booking` → `500 42883` (H-05) en ambos formatos; `GET /api/guest/bookings/12.345.678-5` → `200` con la reserva creada pese al bloqueo.
- **Limpieza:** `UPDATE users SET blocked_until = NULL WHERE rut = '12.345.678-5'`; borrar la reserva por `psql`.

### [GST-018] Revisar el enlace del email de confirmacion

**Rol** `anónimo` · **Ruta** `—` · **P1** · **Resultado** `______`
- **Precondición:** PRE-04, PRE-06, PRE-07.
- **Datos:** `FRONTEND_URL` · `RENDER_EXTERNAL_URL` · fallback `http://localhost:5173`
- **Pasos:**
1. Comprobar si `FRONTEND_URL` y `RENDER_EXTERNAL_URL` estan definidas en el entorno del area.
2. Intentar el envio con `sendEmail` sobre un buzon de QA y leer el log de exito.
3. Abrir el enlace recibido tal cual.
- **Esperado:** si ninguna de las dos variables esta definida, el enlace se construye con `http://localhost:5173` (`guest.service.ts:92`) y **no lleva a ningun sitio** para el paciente (**defecto H-56**). El envio se registra como correcto porque `sendEmail` se dispara sin `await` y su fallo solo produce un `logger.error`: fallo 100 % silencioso. Ademas este enlace es la **unica** via de confirmacion, a diferencia del flujo autenticado. Con `FRONTEND_URL` definida, el enlace debe apuntar a `<FRONTEND_URL>/confirm/<token>` y abrir sin sesion.
- **Red:** el enlace del cuerpo del correo debe compararse literalmente con `<FRONTEND_URL>/confirm/<confirmation_token>`; registrar el valor obtenido.
- **Limpieza:** ninguna.

### [GST-019] Comprobar que la pagina descarta el error del servidor

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05, PRE-06.
- **Datos:** cuatro escenarios: slot ya reservado, hora fuera de disponibilidad, RUT bloqueado y fallo de red
- **Pasos:**
1. Provocar cada uno de los cuatro escenarios por HTTP mientras `/booking` esta abierta.
2. Leer en cada caso el texto que ve el visitante y compararlo con el mensaje real del servidor.
3. Anotar si el `Alert` mostrado es de error o informativo.
- **Esperado:** los tres `catch` de `GuestBookingPage.tsx` (lineas 103-105, 129-131 y 183-185) **descartan el mensaje del servidor** y pintan `guest_booking:error` ("Error al crear la reserva"), que es el mismo texto para `GUEST_SLOT_BOOKED`, `Outside doctor availability`, `Tu RUT está bloqueado hasta el ...` y para un fallo de red (**defecto H-57**). Un error de red se presenta con el mismo `Alert` informativo que el estado sin horas. El visitante no puede saber si reintentar, cambiar de hora o esperar.
- **Red:** un `POST` a `POST /api/guest/booking` por escenario; el texto de la respuesta y el de la pantalla deben compararse.
- **Limpieza:** borrar las reservas creadas por `psql`.

### [GST-020] Comprobar la unicidad del slot reservado

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-06. PRE-06 es obligatoria: hay que inspeccionar el esquema real.
- **Datos:** dos `POST` identicos con el mismo `(doctor_id, date, time)` · `db/init.sql:98` · `\d bookings`
- **Pasos:**
1. Consultar por `psql` si existe la restriccion `unique_booking` y que columnas cubre.
2. Con la reserva ya creada, reenviar el mismo `POST`.
3. Anotar el mensaje real del rechazo.
- **Esperado:** **discrepancia documentada**: `db/init.sql:98` declara `CONSTRAINT unique_booking UNIQUE (doctor_id, date, time)`, asi que la restriccion **si** existe y no incluye `tenant_id`; H-06 afirma lo contrario y su referencia (`init.sql:823-833`) son indices no unicos. Verificar en el entorno real que la restriccion esta aplicada: si lo esta, el conflicto produce `23505` y el servicio lo traduce a `GUEST_SLOT_BOOKED`; si no lo esta, el rechazo real viene del check-then-act de `checkSlotOverlap`, que responde `BOOKING_SLOT_ALREADY_BOOKED`, y `GUEST_SLOT_BOOKED` es inalcanzable. Anotar el resultado y **reportar la discrepancia del hallazgo, no como fallo nuevo**. El `doctor_id` es clave primaria global, asi que dos tenants distintos no colisionan en la practica.
- **Red:** dos `POST /api/guest/booking` identicos; el segundo devuelve `400` con `GUEST_SLOT_BOOKED` o `BOOKING_SLOT_ALREADY_BOOKED` segun el esquema real.
- **Limpieza:** borrar la reserva por `psql`.

### [GST-021] Comprobar la doble carga de medicos y la peticion sin cancelar

**Rol** `anónimo` · **Ruta** `/booking` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01. Se sirve la build de desarrollo con `React.StrictMode`.
- **Datos:** `GuestBookingPage.tsx:111-115` · `loadDoctors` · `loadSlots`
- **Pasos:**
1. Abrir `/booking` en build de desarrollo y contar las peticiones de `GET /api/doctors/public` en la pestana de red.
2. Cambiar medico y fecha varias veces rapido y observar las peticiones de `available-slots`.
3. Terminar en una fecha sin horas y comprobar que horas quedan pintadas.
- **Esperado:** `useMemo(() => { void loadDoctors() })` mete un efecto dentro de un `useMemo`: en `StrictMode` la carga se dispara **dos veces**, y `useMemo` no garantiza una ejecucion por cambio de dependencias (**defecto H-59**). `loadSlots` no cancela la peticion anterior, asi que las horas mostradas pueden **no corresponder** al medico o a la fecha seleccionados: si la ultima respuesta es de una combinacion antigua, el selector queda desincronizado con la lista. El contador de peticiones de medicos debe ser 1; si es 2, el defecto esta confirmado.
- **Red:** >= 2 peticiones a `GET /api/doctors/public` en la carga inicial; varias peticiones a `GET /api/bookings/available-slots` sin cancelacion visible en la pestana de red.
- **Limpieza:** ninguna.

### [GST-022] Intentar reservar en una fecha pasada

**Rol** `anónimo` · **Ruta** `/booking` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05.
- **Datos:** `date` = ayer · `date` = la fecha de hoy con hora pasada · `date` = manana (control)
- **Pasos:**
1. Emitir los tres `POST`.
2. Anotar codigo y mensaje de cada uno.
3. Comprobar si el selector de fecha de `/booking` ofrece dias pasados.
- **Esperado:** ayer y la hora de hoy ya pasada **no estan bloqueados por ninguna validacion**: `guestBookingSchema` solo comprueba el **formato** `YYYY-MM-DD` con un regex, y `validateBookingSlot` no mira la fecha en si, solo el dia de la semana y los bloqueos. Con el `500 42883` de H-05 el resultado observable es un `500` indistinguible del resto; si H-05 estuviera corregido, la reserva pasaria crearse en el pasado. Anotar que el calendario de `/booking` tampoco ofrece dias pasados.
- **Red:** tres respuestas `POST /api/guest/booking` con `date` pasada, pasada y futura.
- **Limpieza:** borrar por `psql` cualquier fila creada en el pasado.

### [GST-023] Intentar reservar fuera del horario publicado

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05.
- **Datos:** `time` = `07:00` (antes del bloque), `time` = `23:00` (despues), `time` = `16:45` con `duration` 30 sobre un bloque `09:00`–`17:00` (control valido), `time` = `09:00` con `duration` 480 (control de duracion)
- **Pasos:**
1. Emitir los cuatro `POST`.
2. Anotar codigo y mensaje de cada uno.
3. Comparar con lo que devuelve `GET /api/bookings/available-slots` para esa fecha.
- **Esperado:** el servicio valida en este orden: `validateRut`, `isValidDate`, `isValidTime`, `checkRutBlocked`, `BEGIN`, candado (que falla), y solo despues `validateBookingSlot`. Con H-05 abierto, **todos** devuelven `500 42883` y la validacion de disponibilidad **nunca llega a ejecutarse**: no hay ninguna evidencia de que el horario se compruebe. Registrar ese hecho. Si H-05 se corrige, el esperado es `400 Outside doctor availability` para las dos horas invalidas, `201` para el control valido y `400` para la duracion de 480 minutos que desborda el bloque.
- **Red:** cuatro respuestas `POST /api/guest/booking`; contrastar con el `200` de `GET /api/bookings/available-slots`.
- **Limpieza:** borrar por `psql` cualquier fila creada.

### [GST-024] Intentar reservar en un feriado de clinica

**Rol** `anónimo` · **Ruta** `/booking` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-06. Existe un feriado `QA-feriado-invitado` en `clinic_holidays` para una fecha futura en la que el medico tiene bloques.
- **Datos:** `holiday_date` = fecha futura con bloques · `cancel_bookings` = `false`
- **Pasos:**
1. Consultar `GET /api/bookings/available-slots` para esa fecha.
2. Intentar el `POST` con una hora de ese dia.
3. Consultar por `psql` si se creo la reserva.
- **Esperado:** el paso 1 devuelve `200` con `[]` y la interfaz muestra `guest_booking:no_slots`. El paso 2, si llegara a validarse, daria `400 No hay disponibilidad: la clínica está cerrada el <fecha>` desde `checkHolidayBlock`; con H-05 abierto llega antes el `500 42883` y el mensaje de feriado no se ve nunca. Ninguna fila debe quedar creada en un feriado. Registrar que la UI tampoco ofrece la fecha si la rejilla de horas viene vacia.
- **Red:** un `200` con `[]` y un `POST` cuyo mensaje real se compara con el de feriado.
- **Limpieza:** borrar el feriado con `DELETE /api/holidays/<id>`.

### [GST-025] Comprobar como se persiste el RUT

**Rol** `admin` · **Ruta** `/bookings` · **P1** · **Resultado** `______`
- **Precondición:** PRE-07. Existe una reserva creada por `psql` con `guest_rut` en formato libre.
- **Datos:** `guest_rut` con `12.345.678-5`, con `123456785` y con `12345678-5`
- **Pasos:**
1. Consultar por `psql` el valor almacenado en `bookings.guest_rut` de cada una.
2. Consultar las mismas reservas con `GET /api/guest/bookings/12.345.678-5`.
3. Comparar el formato guardado con el que devuelve el servicio.
- **Esperado:** el `POST` guarda el RUT **formateado** (`formatRut`, con puntos y guion) porque el servicio llama a `formatRut(rut)` antes del `INSERT`, mientras que la consulta por RUT normaliza el valor recibido. El resultado es que la columna mezcla los dos formatos segun como se haya escrito la fila, y `checkRutBlocked` busca siempre el normalizado (**defecto H-39**). El `guest_rut` **no** se valida contra el indice unico `idx_bookings_guest_rut`, que es un indice normal y no impide duplicados. Anotar el formato real de cada fila.
- **Red:** `GET /api/guest/bookings/12.345.678-5` → `200`; las tres filas aparecen con independencia del formato con que se escribieron.
- **Limpieza:** borrar las tres reservas por `psql`.

### [GST-026] Comprobar que la reserva de invitado no crea usuario

**Rol** `admin` · **Ruta** `/users` · **P0** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-06. No existe ningun `users` con `rut = '12.345.678-5'`.
- **Datos:** `POST /api/guest/booking` con `rut` y `email` nuevos · `SELECT count(*) FROM users WHERE rut = '12.345.678-5'` antes y despues
- **Pasos:**
1. Anotar el numero de filas de `users` con ese RUT antes del intento.
2. Intentar la reserva (queda el `500 42883` de H-05 si sigue abierto).
3. Repetir el `SELECT` y abrir `/users` como `admin@clinic.com`.
- **Esperado:** el flujo de invitado **no crea ningun usuario**: el `INSERT` solo toca `bookings` con `guest_rut`, `guest_name`, `guest_email` y `guest_phone`, y `user_id` queda `NULL`. El paciente que reserva sin cuenta no aparece en `/users`, no puede iniciar sesion y no existe registro de el mas alla de la fila de la reserva. La lista `GET /api/doctors/users` mantiene el mismo numero de filas antes y despues. Es el comportamiento correcto del diseno, pero deja al paciente sin acceso a nada mas alla del email (**defecto H-41** en su variante de datos).
- **Red:** `GET /api/doctors/users` → `200` con el mismo `total` antes y despues; `POST /api/guest/booking` → `500 42883` o `201` segun el estado de H-05.
- **Limpieza:** borrar por `psql` la fila de `bookings` creada, si la hubo.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
|---|---|---|---|
| H-05 | El candado usa `pg_advisory_xact_lock(bigint, bigint)`, firma inexistente | GST-004, GST-005, GST-006, GST-011, GST-017, GST-022, GST-023, GST-024, GST-026 | `500` con `42883` en **toda** reserva de invitado; no se crea ninguna fila |
| H-06 | H-05 dice que no hay restriccion unica; `init.sql:98` si la declara | GST-020 | Verificar el esquema real y reportar la discrepancia del hallazgo |
| H-17 | Regresion F-0b de `X-Tenant-Id` en endpoints publicos | GST-003 | `GET /api/bookings/available-slots` → `200` sin cabecera |
| H-38 | `GET /api/guest/booking/:id` no existe | GST-013 | `404`; la real es `POST /api/bookings/confirm/:token` |
| H-39 | Bloqueo por inasistencia con RUT normalizado vs formateado | GST-017, GST-025 | `checkRutBlocked` devuelve `false` siempre |
| H-40 | El endpoint publico por RUT expone la agenda completa | GST-009 | `200` con `id, date, time, status, doctor_name, specialty` sin autenticacion |
| H-41 | El email promete gestionar la cita y no hay UI de cancelacion | GST-016, GST-026 | `DELETE` inalcanzable desde el producto |
| H-42 | Limites por IP dependientes de `trust proxy` | GST-012 | `429` en la cuarta, o el limite evadido con `X-Forwarded-For` |
| H-43 | Nace `confirmed = true` con `status = 'pending'` | GST-014 | La reserva no aparece en los filtros por `confirmed` |
| H-56 | El enlace del email puede quedar en `localhost:5173` | GST-018 | Enlace no navegable con envio registrado como correcto |
| H-57 | La pagina descarta el mensaje de error del servidor | GST-019 | Texto generico para cuatro causas distintas |
| H-58 | RUT opcional en la UI y obligatorio en el esquema | GST-007 | `POST` sin `rut` → `400` que no senala el campo |
| H-59 | `useMemo` con efecto dentro y `loadSlots` sin cancelar | GST-021 | >= 2 cargas de medicos; horas desincronizadas |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Como verificarlo |
|---|---|---|
| El seed no inserta ninguna reserva de invitado | GST-008, 013, 014, 015, 020, 025 dependen de PRE-07 | `rg "guest_rut" src/seed/seed.ts` → 0 coincidencias |
| Con H-05 abierto no existe ninguna reserva de invitado creada por la API | Todo el ciclo de vida real es inverificable sin `psql` | GST-004: `500 42883` |
| `POST /api/guest/booking` no valida que la fecha no sea pasada | El calendario de la UI y el esquema no coinciden | GST-022 |
| Los limiters usan el store en memoria de `express-rate-limit` | No sobreviven a un reinicio y no se comparten entre instancias | GST-010, GST-011 |
| No hay validacion de que el email exista ni de captcha en el flujo publico | Si `RECAPTCHA_HUMAN=true`, el flujo público puede quedar bloqueado; marcar `BLOQUEADO` | Revisar `env.example` y la respuesta observada |
| No existe `GET /api/guest/doctors` ni `GET /api/guest/booking/:id` | El catalogo D-14 documenta rutas que no existen | GST-001, GST-013 |
| `guest_rut` no tiene indice unico | Se permiten reservas identicas con el mismo RUT y distinta fecha | GST-025 |
| `guest_booking` no tiene clave de cancelar cita | El email promete algo que el idioma ni siquiera contempla | GST-016 |

## 7. Resultado del área

| Campo | Valor |
|---|---|
| Casos ejecutados | `____ / 26` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 14` |
| Huecos confirmados | `____ / 8` |
| Evidencia guardada en | `pruebas-navegador/evidencia/18-reserva-invitada/` |
| Tester / fecha | `________________` |

Criterio de aprobado del area: los 26 casos ejecutados y H-05 confirmado con su codigo `42883`. Mientras H-05 siga abierto, el area no puede aprobarse por encima de `BLOCKED`: el ciclo completo de la reserva de invitado no es ejecutable por la API.

---

*Alcance: 26 casos del flujo publico de reserva de invitado sobre el tenant `default`, sin correo verificado. No cubre la reserva autenticada, la disponibilidad ni los feriados como areas, ni la mensajeria. Fecha de redaccion: 2026-10-01.*
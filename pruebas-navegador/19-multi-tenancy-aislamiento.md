# 19 — Multi-tenancy y aislamiento

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `19` | `TEN` | C1 | Semanal | 20 | `10` | `26`, `30` |

## 1. Qué cubre

El aislamiento de datos entre clinicas: como se resuelve el tenant de una peticion (`X-Tenant-Id` frente al tenant de la sesion), que pasa en las rutas publicas, el comportamiento sin GUC en la base de datos, el `AsyncLocalStorage` que propaga el tenant a cada consulta, las 37 tablas con Row Level Security forzado, los dos roles de base de datos (`clinic_app` sujeto a RLS y `clinic_superadmin` con `BYPASSRLS`), las excepciones deliberadas (`users` para superadmin, `cie10_catalog` global), y la verificacion de que agenda, facturación, expedientes, laboratorio y pacientes no mezclan datos entre tenants.

Es el area **C1** porque el defecto central es una fuga silenciosa: una consulta sin `app.tenant_id` no falla, devuelve las filas del tenant `default`.

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `superadmin` | `/super-admin/tenants`, `/super-admin/users` | `GET /api/super-admin/tenants`, `GET /api/super-admin/users` (usa `superAdminPool`, con `BYPASSRLS`) |
| `admin` | `/bookings`, `/billing`, `/clinical-records`, `/users` | `GET /api/bookings`, `GET /api/billing`, `GET /api/billing/:id`, `GET /api/clinical-records`, `GET /api/doctors/users` |
| `patient` | `/appointments`, `/billing` | `GET /api/bookings`, `GET /api/clinical-records` |
| `anónimo` | `/login` | Cualquier ruta protegida sin `X-Tenant-Id` |

Tenants de prueba: `default` (principal), `clinica-demo` (admin `admin@demo.clinic.com` / `DemoVitaria2026!`, plan `pro`), `clinica-norte` (admin `admin@norte.clinic.com`) y `clinica-sur` (admin `admin@sur.clinic.com`, plan `basic`, sin modulo `laboratory`).

> No existen `GET /api/users` ni `GET /api/patients`: el listado real de pacientes y usuarios del tenant es `GET /api/doctors/users`.

## 3. Precondiciones de datos

| ID | Requisito | Valor |
|---|---|---|
| PRE-01 | Sesion `superadmin` | `superadmin@clinic.com`, contrasena `$SUPERADMIN_PASSWORD` (preguntar) |
| PRE-02 | Sesion `admin` de `default` | `admin@clinic.com`, contrasena `$ADMIN_PASSWORD` (preguntar) |
| PRE-03 | Sesion `admin` de `clinica-demo` | `admin@demo.clinic.com` / `DemoVitaria2026!` |
| PRE-04 | Sesion `admin` de `clinica-sur` | `admin@sur.clinic.com`, contrasena `$ADMIN_PASSWORD` (preguntar) |
| PRE-05 | Sesion de paciente | `user1@clinic.com` / `Vitaria.user1.<año>!`. Confirmar en la pantalla de usuarios que su rol es `patient` y su `tenant_id` antes de empezar |
| PRE-06 | Marcadores de datos | Un paciente, una cita, una factura, un expediente clinico y una solicitud de laboratorio de prueba en `default`, y otro juego equivalente en `clinica-demo`. Todos con prefijo `QA-` |
| PRE-07 | Herramienta HTTP | Cliente capaz de fijar `X-Tenant-Id`, `Cookie` y `X-CSRF-Token` a mano, sin usar el navegador |
| PRE-08 | Consola de BD | `psql` con rol de lectura, **conectado como `clinic_app`** (no como propietario ni como superadmin) para que las RLS sean efectivo. Indispensable en TEN-004, TEN-014 a TEN-018 |
| PRE-09 | Contexto de verificacion | `psql` como propietario de las tablas, para consultar `pg_class.relrowsecurity`, `pg_policies` y `pg_roles` |

Regla de limpieza: borrar por API todo marcador `QA-` creado. Las pruebas de TEN-004, TEN-016 a TEN-018 son **de solo lectura**.

## 4. Casos

### [TEN-001] Peticion protegida sin cabecera de tenant

**Rol** `anónimo` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-07. El servidor corre con `NODE_ENV=production`. Sin sesion.
- **Datos:** `GET /api/bookings` sin `X-Tenant-Id` · `GET /api/clinical-records` sin `X-Tenant-Id` · control `GET /api/doctors/public` sin cabecera
- **Pasos:**
1. Emitir las dos peticiones protegidas sin cabecera ni cookie.
2. Emitir el control, que si esta en `PUBLIC_PATHS`.
3. Anotar codigo, mensaje y presencia de la cabecera de respuesta `X-Tenant-Id`.
- **Esperado:** las dos protegidas responden **400** con `X-Tenant-Id header is required` y `logger.warn` `Request rejected: missing tenant_id`. El control responde `200`, porque `/api/doctors/public` esta en `PUBLIC_PATHS` (`tenant.middleware.ts:26`) y en ese camino el middleware **asigna `DEFAULT_TENANT_ID || 'default'` sin exigir nada**. Ninguna de las tres respuestas lleva cabecera `X-Tenant-Id`, porque esa cabecera solo se emite en la rama con tenant resuelto (linea 89).
- **Red:** dos `400` y un `200`; verificar que el `400` es del middleware de tenant y no del `authMiddleware`.
- **Limpieza:** ninguna (solo lectura).

### [TEN-002] Peticion con un tenant inexistente o inactivo

**Rol** `anónimo` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-07.
- **Datos:** `X-Tenant-Id: clinica-inexistente` · `X-Tenant-Id: ../../etc` · `X-Tenant-Id: CLINICA-DEMO` (mayusculas) · control `X-Tenant-Id: clinica-demo` con la grafia correcta
- **Pasos:**
1. Emitir los cuatro valores contra `GET /api/bookings`.
2. Repetir los tres primeros contra la ruta publica `GET /api/doctors/public`.
3. Anotar codigo y mensaje de cada uno.
- **Esperado:** los tres valores invalidos responden **404** con `Tenant not found or inactive` en ruta protegida. La ruta publica responde **200** y usa el valor crudo como tenant sin validarlo (`tenant.middleware.ts:80-83`): un tenant inventado pasa a las politicas RLS y **no produce 400 ni 404**, solo cero filas. La grafia en mayusculas no encuentra el tenant (la busqueda es exacta). Ninguno de los casos crea datos ni revienta el pool.
- **Red:** tres `404` y un `200` en la ruta protegida; tres `200` en la ruta publica con `[]`.
- **Limpieza:** ninguna (solo lectura).

### [TEN-003] Comparar cabecera ausente con cabecera default explicita

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-07. El servidor corre con `production` y con `DEFAULT_TENANT_ID=default`.
- **Datos:** sesion de `admin@clinic.com` con `X-Tenant-Id: default` · misma sesion sin la cabecera · misma sesion con `X-Tenant-Id: clinica-demo`
- **Pasos:**
1. Emitir `GET /api/bookings` con la cabecera `default` explicita.
2. Emitir la misma peticion sin cabecera.
3. Emitir la misma peticion con `X-Tenant-Id: clinica-demo`.
- **Esperado:** los pasos 1 y 3 devuelven **exactamente el mismo cuerpo**: el middleware usa `userTenantId || headerTenantId`, y la sesion manda. Ademas los tres pasan a la rama del `400`, porque `rawTenantId` viene de `user.tenant_id`; el paso 2 es el unico que devuelve `400`. La cabecera de respuesta `X-Tenant-Id` vale `default` en los tres casos admitidos y permite confirmar que el tenant efectivo nunca es el de la cabecera. Documentar que **la cabecera no puede cambiar el alcance de un usuario autenticado**: es una garantia de seguridad, no un fallo.
- **Red:** tres respuestas `GET /api/bookings` con la cabecera de respuesta `X-Tenant-Id: default`; comparar los cuerpos 1 y 3 byte a byte.
- **Limpieza:** ninguna (solo lectura).

### [TEN-004] Consultar sin GUC y observar el fallback silencioso

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-06, PRE-08, PRE-09. Conectado a `psql` **como `clinic_app`**.
- **Datos:** `SELECT count(*) FROM bookings;` con y sin `SET app.tenant_id` · `SHOW app.tenant_id;` antes de cada consulta
- **Pasos:**
1. En una sesion nueva de `psql` como `clinic_app`, ejecutar `SHOW app.tenant_id;` y `SELECT count(*) FROM bookings;` sin `SET` previo.
2. Repetir con `SET app.tenant_id = 'clinica-demo';` y la misma consulta.
3. Repetir con `SET app.tenant_id = 'default';`.
- **Esperado:** el paso 1 **no falla**: la migracion `021` sustituyo `current_setting('app.tenant_id', false)` por `COALESCE(current_setting('app.tenant_id', true), 'default')`, de modo que la ausencia de GUC no lanza error sino que **elige `default` en silencio**. `SHOW app.tenant_id` devuelve cadena vacia mientras `count(*)` devuelve los marcadores de `default`. Este es el riesgo central del area: una consulta que olvide el GUC no falla, **devuelve datos del tenant por defecto** en lugar de datos de `clinica-demo`. Registrar el numero de filas de los tres pasos y confirmar que 1 y 3 coinciden.
- **Red:** ninguna peticion HTTP; tres consultas SQL por `psql`. Registrar la salida como evidencia.
- **Limpieza:** ninguna (`ROLLBACK` al cerrar la sesion).

### [TEN-005] El tenant de la sesion gana sobre la cabecera ajena

**Rol** `doctor`, `admin` · **Ruta** `/bookings`, `/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-06, PRE-07. Existen marcadores equivalentes en `default` y en `clinica-demo`.
- **Datos:** sesion `default` · `X-Tenant-Id` = cada uno de los cuatro tenants · un `X-Tenant-Id` de un tenant donde el usuario no existe
- **Pasos:**
1. Con la sesion de `admin@clinic.com`, iterar los cuatro valores de cabecera contra `GET /api/billing`.
2. Repetir contra `GET /api/clinical-records`.
3. Comparar el `tenant_id` de cada fila devuelta.
- **Esperado:** las ocho respuestas son **identicas** y solo contienen filas de `default`: el `user.tenant_id` de la sesion tiene prioridad sobre la cabecera (`tenant.middleware.ts:47,50`) y el GUC se fija con ese valor, no con el de la cabecera. Ningun marcador de `clinica-demo`, `clinica-norte` ni `clinica-sur` aparece, ni siquiera cuando la cabecera aponta a un tenant valido donde el usuario no existe. La cabecera de respuesta lo confirma con `X-Tenant-Id: default`.
- **Red:** ocho respuestas `200` de `GET /api/billing` y `GET /api/clinical-records`; verificar `tenant_id` en cada elemento y la cabecera de respuesta.
- **Limpieza:** ninguna (solo lectura).

### [TEN-006] Aislar la lectura de la agenda entre tenants

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-06, PRE-07. Marcadores `QA-` de citas en `default` y en `clinica-demo`.
- **Datos:** `GET /api/bookings` · `GET /api/bookings/:id` con un `id` de `clinica-demo` usando la sesion de `default`
- **Pasos:**
1. Listar la agenda completa con cada sesion de admin y volcar los identificadores.
2. Cruzar ambos listados y buscar un `id` comun.
3. Abrir en detalle una cita del otro tenant usando el `id` recibido del otro lado.
- **Esperado:** los listados son **disjuntos**: cada sesion ve unicamente las citas de su tenant y ninguna aparece en las dos. El paso 3 responde **404**, no 403 y no una ficha ajena: la consulta filtra por `tenant_id` ademas de por `id`, y un `id` existente en otro tenant es indistinguible de uno inexistente. Verificar que los `guest_name` de QA de un tenant no aparecen en el listado del otro.
- **Red:** dos `200` de `GET /api/bookings` con conjuntos disjuntos de `id`; un `404` de `GET /api/bookings/:id` cruzado.
- **Limpieza:** borrar por API los marcadores `QA-` de citas.

### [TEN-007] Aislar la escritura entre tenants

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-07. Existe un `doctor_id` de `clinica-demo` y otro de `default`.
- **Datos:** `POST /api/bookings` con `doctor_id` de `clinica-demo` usando la sesion de `default` · el mismo `POST` con `tenant_id` explicito en el cuerpo · `DELETE /api/bookings/:id` de una cita de `clinica-demo`
- **Pasos:**
1. Crear una cita desde la sesion de `default` apuntando a un medico del otro tenant.
2. Intentar forzar el `tenant_id` en el cuerpo de la peticion.
3. Borrar desde `default` una cita que pertenece a `clinica-demo`.
- **Esperado:** los tres intentos **no escriben nada fuera del tenant de la sesion**: el paso 1 falla al resolver el medico (404 o `BOOKING_DOCTOR_NOT_FOUND`) porque `getDoctorById` filtra por `tenant_id`; el paso 2 es rechazado por `.strict()` en el esquema, y si algun campo `tenant_id` llegara a usarse, `WITH CHECK` de la politica RLS rechaza la fila; el paso 3 responde **404** y deja la cita de `clinica-demo` intacta. Confirmar por `psql` que ninguna fila nueva tiene un `tenant_id` distinto del de la sesion.
- **Red:** un `404` o `400` de `POST /api/bookings`; un `400` por clave desconocida en el segundo intento; un `404` de `DELETE /api/bookings/:id`. Despues, `SELECT tenant_id, count(*) FROM bookings GROUP BY 1` solo devuelve los tenants conocidos.
- **Limpieza:** borrar por API cualquier fila creada en el intento fallido.

### [TEN-008] Revisar la restriccion unica de reservas y su alcance

**Rol** `admin` · **Ruta** `—` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-06, PRE-08, PRE-09.
- **Datos:** `\d bookings` · `unique_booking` en `db/init.sql:98` · `doctor_id` en `db/init.sql`
- **Pasos:**
1. Consultar la definicion de la restriccion y la del indice `idx_bookings_tenant_doctor_date_active`.
2. Consultar si `doctors.id` es clave primaria global o compuesta con `tenant_id`.
3. Intentar crear en `clinica-demo` una cita con el `doctor_id` mas bajo de `default`.
- **Esperado:** `CONSTRAINT unique_booking UNIQUE (doctor_id, date, time)` **no incluye `tenant_id`**, tal como indica el catalogo. Pero `doctors.id` es clave primaria global, no compuesta, asi que **dos tenants distintos no pueden compartir `doctor_id`**: la restriccion no produce colisiones cruzadas en la practica. El paso 3 falla por clave foranea o por filtro de tenant, no por la unicidad. Registrar esta conclusion matizada: la ausencia de `tenant_id` en el indice es una fragilidad latente, no una fuga demostrable hoy.
- **Red:** ninguna peticion; tres consultas `psql` mas el paso 3 (un `POST /api/bookings` o `POST /api/guest/booking`).
- **Limpieza:** borrar por API la cita de QA si llego a crearse.

### [TEN-009] Aislar la facturacion entre tenants

**Rol** `admin`, `patient` · **Ruta** `/billing` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-05, PRE-06, PRE-07. Facturas `QA-` en `default` y en `clinica-demo`.
- **Datos:** `GET /api/billing` · `GET /api/billing/:id` con un `id` del otro tenant · `POST /api/billing` con `patient_id` ajeno
- **Pasos:**
1. Listar facturas con la sesion de cada admin y volcar `id` y `tenant_id`.
2. Abrir en detalle una factura del otro tenant por `id`.
3. Crear una factura REFERenciando a un paciente del otro tenant.
- **Esperado:** los listados son disjuntos y cada fila trae su `tenant_id`. El paso 2 responde **404**: el `id` de otro tenant se comporta como inexistente. El paso 3 falla y no crea una factura con `tenant_id` distinto del de la sesion, tanto por el filtro del servicio como por `WITH CHECK`. Ningun dato financiero cruza: ni importes, nirutas, ni PDFs. Nota: el catalogo menciona `GET /api/billing/invoices`; la ruta real es `GET /api/billing` y el detalle `GET /api/billing/:id`.
- **Red:** dos `200` de `GET /api/billing` disjuntos; un `404` y un `400`/`404` de los pasos 2 y 3.
- **Limpieza:** borrar por API las facturas `QA-` creadas.

### [TEN-010] Aislar los expedientes clinicos entre tenants

**Rol** `admin`, `patient` · **Ruta** `/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-05, PRE-06, PRE-07. Expedientes `QA-` en `default` y en `clinica-demo`.
- **Datos:** `GET /api/clinical-records` · `GET /api/clinical-records/:id` cruzado · `POST /api/clinical-records` con `patient_id` ajeno
- **Pasos:**
1. Listar expedientes con cada sesion de admin.
2. Con la sesion de `patient`, listar sus propios expedientes y luego pedir el `id` de otro paciente del mismo tenant.
3. Intentar crear un expediente sobre un paciente del otro tenant.
- **Esperado:** el listado de admin esta acotado a su tenant. El paso 2 con rol `patient` devuelve solo los expedientes propios (**403** o `[]` al pedir el `id` de otro paciente del mismo tenant, nunca la ficha). El paso 3 falla por paciente no encontrado en el tenant. Ningun dato clinico sensible cruza tenants; `clinical_records` es de las 37 tablas con RLS forzado, asi que la fila quedaria filtrada aunque el servicio fallara. Esta area exige `phiWriteLimiter` en `/api/clinical-records` (`app.ts:272`): anotar si el limite por escritura esta activo.
- **Red:** dos `200` de `GET /api/clinical-records` disjuntos; un `403` o `404` en el acceso cruzado; un `404` en el `POST` con paciente ajeno.
- **Limpieza:** borrar por API los expedientes `QA-` creados.

### [TEN-011] Aislar el laboratorio entre tenants y entre planes

**Rol** `admin` · **Ruta** `/laboratory` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-04, PRE-06, PRE-07. `clinica-demo` tiene modulo `laboratory`; `clinica-sur` esta en plan `basic` y **no** lo tiene.
- **Datos:** `GET /api/laboratory/lab/all` · `GET /api/laboratory/requests` · `GET /api/laboratory/tests` con las tres sesiones
- **Pasos:**
1. Listar solicitudes y examenes con el admin de `clinica-demo`.
2. Repetir con el admin de `clinica-sur`.
3. Repetir con el admin de `default` y cruzar los `id` con los del paso 1.
- **Esperado:** `clinica-demo` ve solo lo suyo. `clinica-sur` recibe la respuesta de **plan no admitido** (403 o 404 segun como lo trate `requireFeature`), nunca datos de `clinica-demo` ni un error que revele que existen. Los listados de `default` y `clinica-demo` son disjuntos por `id` y por `tenant_id`. Las 18 tablas de laboratorio (`lab_areas`, `lab_tests`, `lab_requests`, `lab_request_items`, `lab_samples`, `lab_qc_records`, `lab_equipment`, `lab_reagents`, `lab_notifications`, `lab_result_history`) estan todas dentro de las 37 con RLS forzado: una fuga seria imposible por SQL.
- **Red:** un `200` de `GET /api/laboratory/lab/all` con `clinica-demo`; un `403` o `404` con `clinica-sur`; un `200` con `default` sin `id` comunes.
- **Limpieza:** borrar por API los registros `QA-` de laboratorio.

### [TEN-012] Aislar el listado de pacientes y usuarios entre tenants

**Rol** `admin`, `doctor` · **Ruta** `/users` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-05, PRE-06, PRE-07.
- **Datos:** `GET /api/doctors/users` · `GET /api/users` · `GET /api/patients`
- **Pasos:**
1. Pedir el listado con las sesiones de `default` y de `clinica-demo` y volcar todos los emails.
2. Buscar un email que aparezca en los dos listados.
3. Emitir `GET /api/users` y `GET /api/patients`.
- **Esperado:** los dos listados son **disjuntos**: ningun email de un tenant aparece en el listado del otro, y cada fila trae su `tenant_id`. Los pasos del punto 3 responden **404**: `users` y `patients` **no son routers** en `src/app.ts`, aunque el catalogo (T-14) los documente; el listado real de usuarios del tenant es `GET /api/doctors/users`. Este caso cierra tambien el hueco de nomenclatura del area `17` (AVL-025).
- **Red:** dos `200` de `GET /api/doctors/users` con conjuntos de emails disjuntos; dos `404`.
- **Limpieza:** borrar por API los usuarios `QA-` creados.

### [TEN-013] Comprobar que el superadmin ve todos los tenants

**Rol** `superadmin` · **Ruta** `/super-admin/tenants`, `/super-admin/users` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06.
- **Datos:** `GET /api/super-admin/tenants` · `GET /api/super-admin/users` · `GET /api/super-admin/tenants/:id`
- **Pasos:**
1. Listar tenants y usuarios con la sesion de superadmin.
2. Volcar los `tenant_id` distintos que aparecen en el listado de usuarios.
3. Abrir el detalle de un tenant concreto.
- **Esperado:** el listado de tenants devuelve `default`, `clinica-demo`, `clinica-norte` y `clinica-sur` con su `plan`. El listado de usuarios devuelve filas de **todos** los tenants a la vez, y el `tenant_id` es visible por fila: es la vista transversal que el resto de roles no tiene. El pool usado es `superAdminPool`, que **no** esta envuelto por el wrapper de tenant (`db.ts:101`) porque su rol tiene `BYPASSRLS`. Registrar cuantos tenants distintos aparecen; si es 1, el `BYPASSRLS` no esta efectivo y anotarlo como fallo.
- **Red:** un `200` de `GET /api/super-admin/tenants` con 4 entradas; un `200` de `GET /api/super-admin/users` con `N` valores distintos de `tenant_id`.
- **Limpieza:** ninguna (solo lectura).

### [TEN-014] Revisar la exencion de la politica de users

**Rol** `superadmin` · **Ruta** `/super-admin/users` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-08, PRE-09. Conectado como `clinic_app`.
- **Datos:** politica `tenant_isolation ON users` (`022`) · `role = 'superadmin' AND tenant_id IS NULL`
- **Pasos:**
1. Consultar `pg_policies` para la tabla `users` y leer la expresion completa del `USING` y del `WITH CHECK`.
2. Contar las filas de `users` con `tenant_id IS NULL`.
3. Con GUC `app.tenant_id = 'clinica-demo'`, ejecutar `SELECT count(*) FROM users WHERE tenant_id IS NULL;`.
- **Esperado:** la politica es **una excepcion deliberada**: ademas de `tenant_id = current_setting(...)`, admite `(role = 'superadmin' AND tenant_id IS NULL)` en `USING` y en `WITH CHECK`. Las filas de superadmin tienen `tenant_id` nulo por diseno, asi que sin la excepcion el superadmin no se veria a si mismo y el panel se quedaria vacio. El paso 3 **muestra esas filas** a `clinica-demo`: es correcto para superadmin, pero significa que cualquiera que sea leido como `role = 'superadmin'` escapa del aislamiento. Verificar que solo las filas de superadmin tienen `tenant_id IS NULL` y que ninguna fila de tenant lo tiene.
- **Red:** ninguna peticion; tres consultas `psql` como `clinic_app`.
- **Limpieza:** ninguna (solo lectura).

### [TEN-015] Comprobar que cie10_catalog es global

**Rol** `admin` · **Ruta** `/clinical-records`, `/laboratory` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-08.
- **Datos:** `cie10_catalog` · su ausencia en el array `tenant_tables` de `db/security.sql:87-98`
- **Pasos:**
1. Consultar `pg_class.relrowsecurity` de `cie10_catalog`.
2. Contar sus filas con GUC `default`, con `clinica-demo` y **sin GUC**.
3. Comparar los tres conteos y comprobar si la tabla tiene columna `tenant_id`.
- **Esperado:** `relrowsecurity` es **false**: `cie10_catalog` **no esta** en el array `tenant_tables` y por tanto no recibe ni `ENABLE` ni `FORCE ROW LEVEL SECURITY`. Los tres conteos son **identicos**, porque no existe columna `tenant_id` que filtrar. Es una decision de diseno correcta: el catalogo CIE-10 es una tabla de referencia comun a todas las clinicas y duplicarla por tenant seria un error. Documentarlo como excepcion intencional, no como fallo. Si la tabla **si** tuviera `tenant_id`, registrarlo como hallazgo nuevo: seria una fuga real.
- **Red:** tres consultas `psql`; ninguna peticion HTTP devuelve datos de CIE-10 entre tenants, porque es identica para todos.
- **Limpieza:** ninguna (solo lectura).

### [TEN-016] Verificar RLS forzado en las 37 tablas del tenant

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-09. Sesion de `psql` como propietario de las tablas, con acceso a `pg_class`.
- **Datos:** array `tenant_tables` de 37 entradas (`db/security.sql:87-98`) · `pg_class.relrowsecurity` · `pg_class.relforcerowsecurity`
- **Pasos:**
1. Contar las entradas del array en el fichero.
2. Para cada tabla, consultar `relrowsecurity` y `relforcerowsecurity`.
3. Comparar el conjunto obtenido con el array y contar los que difieren.
- **Esperado:** el array tiene **37** entradas y las 37 tablas tienen **`relrowsecurity = true` y `relforcerowsecurity = true`**. El `FORCE` es lo que hace que las politicas apliquen **tambien al propietario de la tabla**: sin el, un servicio conectado como propietario se saltaria la RLS por completo. Ninguna tabla del array puede tener `relforcerowsecurity = false`; si alguna lo tiene, es un fallo de aplicacion de migraciones, no del modelo, y hay que reportarlo con nombre de tabla. Registrar tambien el numero de tablas **sin** RLS en el esquema para confirmar que solo son las globales (como `cie10_catalog`).
- **Red:** ninguna peticion; una consulta de catalogo sobre `pg_class`.
- **Limpieza:** ninguna (solo lectura).

### [TEN-017] Verificar los roles clinic_app y clinic_superadmin

**Rol** `superadmin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-08, PRE-09.
- **Datos:** `pg_roles.rolbypassrls` · `rolsuper` · `rolinherit` de `clinic_app` y `clinic_superadmin` · `db/security.sql:26` · migracion `025`
- **Pasos:**
1. Consultar los tres atributos de ambos roles.
2. Comprobar si `clinic_app` tiene `rolbypassrls` o `rolsuper`.
3. Comprobar si `clinic_superadmin` existe y quePrivilegios tiene sobre el esquema.
- **Esperado:** `clinic_app` es `LOGIN NOINHERIT` y tiene **`rolbypassrls = false`** y `rolsuper = false`: esta sujeto a RLS, que es lo correcto para el rol de la aplicacion. `clinic_superadmin` tiene **`rolbypassrls = true`**, con DML completo pero sin DDL, y `statement_timeout = 30s`. Si `clinic_app` tuviera `bypassrls = true`, **toda la RLS del proyecto seria decorativa**: es la comprobacion de mayor impacto del area. Ademas la migracion `025` es opcional y avisa por `RAISE WARNING` si no puede crear el rol, asi que su ausencia es posible: registrarla como `OMITIDO` con la razon.
- **Red:** ninguna peticion; consultas a `pg_roles` y `information_schema.role_table_grants`.
- **Limpieza:** ninguna (solo lectura).

### [TEN-018] Verificar el ciclo de vida del GUC por consulta

**Rol** `admin` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-06, PRE-07.
- **Datos:** wrapper `pool.query` y `pool.connect` de `db.ts:102-139` · `pool.on('connect')` con `DEFAULT_TENANT_ID` · `superAdminPool` sin envolver
- **Pasos:**
1. Emitir alternadamente `GET /api/billing` con la sesion de `default` y con la de `clinica-demo`, al menos 20 veces cada una.
2. Anotar en el log del servidor el `tenant context` de cada conexion nueva del pool.
3. Forzar el agotamiento del pool con varias peticiones concurrentes.
- **Esperado:** el wrapper **toma un cliente dedicado por consulta**, hace `set_config('app.tenant_id', <tenant de la peticion>)`, ejecuta y **en el `finally` restablece el valor por defecto antes de liberar el cliente** (`db.ts:124-134`). Es la defensa contra la fuga mas grave posible: el GUC tiene ambito de sesion, el pool reparte consultas entre clientes cualquiera, y sin el `reset` una consulta de `clinica-demo` podria quedar colgada en un cliente y contaminar la siguiente de `default`. El paso 1 no debe mostrar ni una fila cruzada en 40 peticiones. `scopedConnect` **si** fija el GUC pero **no** lo restablece: verificar en el paso 3 que una transaccion multi-sentencia que libera el cliente no deja el GUC contaminado, porque `pool.on('connect')` solo lo restaura en conexiones **nuevas**.
- **Red:** 40 respuestas `200` de `GET /api/billing`, con `tenant_id` coherente con la sesion en cada una; revisar el log de conexiones nuevas del paso 2.
- **Limpieza:** ninguna (solo lectura).

### [TEN-019] Comprobar que un admin no cruza tenants por API

**Rol** `admin` · **Ruta** `/bookings`, `/billing`, `/clinical-records`, `/users` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03, PRE-06, PRE-07. Marcadores equivalentes en `default` y `clinica-demo`.
- **Datos:** `X-Tenant-Id: clinica-demo` con sesion de `default` · `tenant_id` en el cuerpo del `POST` · `X-Tenant-Id: default` con sesion de `clinica-demo`
- **Pasos:**
1. Repetir TEN-005, TEN-006, TEN-009, TEN-010 y TEN-012 con la cabecera apuntando al tenant ajeno.
2. Intentar que un `POST` acepte un `tenant_id` en el cuerpo.
3. Anotar si algun endpoint acepta un tenant por query string.
- **Esperado:** ninguno de los endpoints acepta un tenant distinto del de la sesion: la cabecera se ignora cuando hay `req.user`, y un `tenant_id` en el cuerpo lo rechazan los esquemas `.strict()`. Ningun endpoint toma el tenant por query string. La unica via para cambiar de tenant es **cambiar de sesion**, y por eso `default` y `clinica-demo` no pueden verse. Registrar el resultado de los cinco endpoints en una tabla de una fila por endpoint, con el `tenant_id` observado.
- **Red:** repetir los cinco endpoints de TEN-005, TEN-006, TEN-009, TEN-010 y TEN-012 con la cabecera ajena; todos deben devolver el mismo cuerpo que sin ella.
- **Limpieza:** borrar por API los marcadores `QA-` creados.

### [TEN-020] Comprobar que paciente y usuario se separan por tenant

**Rol** `patient`, `admin` · **Ruta** `/appointments`, `/users` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-03, PRE-05, PRE-06, PRE-07. `user1@clinic.com` es `patient` de `default`; `clinica-demo` tiene otro paciente con el mismo RUT en su `users`.
- **Datos:** sesion de `user1@clinic.com` · `GET /api/doctors/users` con rol `patient` · `GET /api/bookings` del paciente
- **Pasos:**
1. Con la sesion del paciente, listar sus citas y sus datos.
2. Intentar listar todos los usuarios del tenant con esa misma sesion.
3. Como admin de `clinica-demo`, comprobar que el mismo RUT existe como usuario propio.
4. Cruzarlo con `/appointments` de cada sesion.
- **Esperado:** el paso 1 devuelve solo lo que pertenece al paciente de `default`. El paso 2 responde **403** (o `[]`): un `patient` no puede listar el directorio de usuarios, aunque sea del mismo tenant. El paso 3 confirma que el RUT **existe duplicado en dos tenants** y son identidades distintas: el par `(tenant_id, id)` es la clave real, nunca el RUT ni el email. El paso 4 muestra dos historiales completamente separados, sin una sola cita en comun. Este caso es el que demuestra que la identidad de usuario es **compuesta por tenant**, y por eso un `JOIN` sin `tenant_id` seria una fuga.
- **Red:** `GET /api/bookings` de `patient` → `200` acotado; `GET /api/doctors/users` de `patient` → `403`; `GET /api/doctors/users` del admin de `clinica-demo` → `200` sin el email de `default`.
- **Limpieza:** borrar por API los marcadores `QA-` creados.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
|---|---|---|---|
| H-64 | En producción, una ruta pública **sin `X-Tenant-Id`** lee el tenant `default` | TEN-002, TEN-006 | `tenant.middleware.ts:58`: `req.tenant_id = process.env.DEFAULT_TENANT_ID \|\| 'default'`. La guarda de producción (línea 53) solo rechaza cuando `!isPublicPath`, así que `/api/specialties` o `/api/doctors/public` sin cabecera devuelven **`200` con los datos del tenant `default`** |
| H-65 | La política RLS de `users` exime las filas de superadmin con `tenant_id IS NULL` | TEN-013, TEN-014 | `security.sql:147-156`. Es deliberado, pero hace esas filas visibles para cualquier GUC de tenant: un `admin` de la clínica A las ve si la consulta no filtra `tenant_id IS NULL` |
| H-66 | Un tenant inexistente en ruta pública responde `200 []` en vez de `404` | TEN-002 | `tenant.middleware.ts:74-84`: si no se encuentra el tenant y `isPublicPath`, asigna `req.tenant_id = rawTenantId` sin validar. Sin fuga de datos, pero un `typo` se manifiesta como "no hay datos" |
| H-67 | El tenant de la sesión anula `X-Tenant-Id` sin avisar | TEN-003, TEN-005, TEN-019 | `tenant.middleware.ts:50`: `userTenantId \|\| headerTenantId`. Correcto por seguridad; el cliente solo lo deduce del `X-Tenant-Id` de la **respuesta** (línea 89) |
| H-06 | `unique_booking` es única pero **no excluye `cancelled`** | TEN-008 | `init.sql:98`: `UNIQUE (doctor_id, date, time)` sin `tenant_id` ni filtro de estado. Hoy `doctors.id` es global e impide la colisión entre tenants, pero una cita cancelada sigue bloqueando su horario |

> Estos cinco hallazgos se promovieron al registro global el 2026-10-02 tras verificar el código.
> Dos afirmaciones que este archivo sostenía antes resultaron **falsas** y ya no se prueban:
> `clinic_app` **no** tiene `BYPASSRLS` (`security.sql:26` lo crea sin ese atributo, así que TEN-017
> verifica que siga así), y las políticas RLS **no** usan `COALESCE(...,'default')`: usan
> `current_setting('app.tenant_id', false)`, que falla cerrado. Ver la tabla de descartes en
> `90-HALLAZGOS-CODIGO.md`.
>
> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Como verificarlo |
|---|---|---|
| La migracion `021` cambio el fallback, pero `db/security.sql:138` sigue con `current_setting('app.tenant_id', false)` | Depende del orden de aplicacion: si `security.sql` se corre despues, la politica vuelve a lanzar error en vez de caer en `default` | TEN-004, TEN-016 |
| El GUC tiene ambito de sesion y el pool reparte clientes | Sin el `reset` del `finally` habria contaminacion cruzada; el wrapper lo hace, pero no hay test que lo fije | TEN-018 |
| `scopedConnect` fija el GUC y **no** lo restablece | Una transaccion multi-sentencia que libera el cliente puede dejar el contexto contaminado hasta que el pool recycle la conexion | TEN-018 |
| La migracion `025` es opcional y puede no haber creado `clinic_superadmin` | El panel de superadmin usaria la conexion normal y no veria todos los tenants | TEN-013, TEN-017 |
| `cie10_catalog` no tiene RLS | Correcto por diseno, pero nada lo documenta en codigo: un `ALTER TABLE` futuro podria romperlo | TEN-015 |
| No existen `GET /api/users` ni `GET /api/patients` | El catalogo T-14 los documenta; el area `17` (AVL-025) repite el error | TEN-012 |
| No hay test automatizado que fije el numero de tablas con RLS | Una tabla nueva entra al array a mano; si se olvida, queda sin aislar | TEN-016 |
| La cabecera `X-Tenant-Id` de respuesta solo se emite con tenant resuelto | En la rama de error y en la rama publica por defecto el cliente no sabe que tenant se aplico | TEN-001, TEN-002 |

## 7. Resultado del área

| Campo | Valor |
|---|---|
| Casos ejecutados | `____ / 20` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 8` |
| Huecos confirmados | `____ / 8` |
| Evidencia guardada en | `pruebas-navegador/evidencia/19-multi-tenancy-aislamiento/` |
| Tester / fecha | `________________` |

Criterio de aprobado del area: los 20 casos ejecutados, `rolbypassrls = false` confirmado en `clinic_app`, las 37 tablas con `ENABLE` **y** `FORCE`, y cero filas cruzadas en TEN-005, TEN-006, TEN-009, TEN-010, TEN-011, TEN-012, TEN-019 y TEN-020. Un fallo en TEN-017 o TEN-004 bloquea el area `30` completa.

---

*Alcance: 20 casos de aislamiento multi-tenant sobre `default`, `clinica-demo`, `clinica-norte` y `clinica-sur`. No cubre la migracion de datos entre tenants (area `30`) ni el cifrado de datos en reposo (area `30`). Fecha de redaccion: 2026-10-01.*
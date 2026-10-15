# 26 — Auditoría y trazabilidad

> Lectura del registro de auditoría y su tabla — el caso donde la UI promete paginar, filtrar y
> exportar más de lo que la API entrega: el backend devuelve un array plano sin `total`, la capa
> de servicio fabrica un envoltorio con `totalPages: 1`, y ningún módulo del código llama a
> `logAction`, así que la tabla solo contiene lo que inserta el seed.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `26` | `AUD` | C3 | Quincenal | 14 | `19` | — |

---

## 1. Que cubre

- El unico endpoint de lectura del area: `GET /api/audit` (`authMiddleware` + `authorize('admin','superadmin')`).
- Los ocho filtros que acepta la API: `user_id`, `action`, `resource_type` (alias `entity_type`),
  `start_date`, `end_date`, `limit`, `page`, mas `tenant_id` reservado al `superadmin`.
- La superficie de UI `/audit` (`AuditPage.tsx`, `AuditDetailDialog.tsx`): buscador, filtro de
  accion, filtro de entidad, selector de clinica, tabla, paginacion y exportacion CSV.
- La resolucion de nombres: `COALESCE(u.name, u.email)` en el `LEFT JOIN` a `users`.
- El envoltorio de la respuesta: array plano en el backend, y en el frontend un
  `PaginatedResponse<AuditLog>` sintetizado en
  `frontend/src/modules/audit/services/audit.service.ts:8-10`. Ese sintetizador fija
  `totalPages: 1` siempre, por mas filas que devuelva el backend.
- La cadena de integridad HMAC: `computeAuditHash` (`audit.service.ts:4-17`),
  `verifyAuditChain` (`src/jobs/audit-integrity.job.ts`) y el cron que la invoca cada 6 horas
  (`src/app.ts:517`).
- Lo que el area **no** cubre: no hay endpoint de escritura, no hay exportacion en el backend,
  no hay endpoint de verificacion de cadena, y no hay UI para `hash`/`previous_hash`.

> Nota de alcance: el area es de **solo lectura**. Ningun caso es destructivo y ninguno escribe en
> `audit_logs`: no existe ruta de escritura y los `CREATE TRIGGER` de `db/init.sql:970-1046` son
> todos de `updated_at`, ninguno de auditoria. Las unicas filas provienen de los seeds.

## 2. Roles y rutas

| Rol | Ruta de UI | Que puede hacer | Que no puede |
|---|---|---|---|
| `admin` | `/audit` | Leer la auditoria de **su** tenant | Filtrar por otro `tenant_id`; el parametro se ignora en silencio |
| `superadmin` | `/audit` | Leer cualquier tenant via el selector "Clínica" | — |
| `doctor` | `—` | Nada: 403 | `GET /api/audit` → 403 |
| `lab_technician` | `—` | Nada: 403 | `GET /api/audit` → 403 |
| `patient`, `user` | `—` | Nada: 403 | `GET /api/audit` → 403 |
| anónimo | `—` | Nada: 401 | `GET /api/audit` → 401 |

- `AppRouter.tsx:324-328` protege `/audit` con `ProtectedRoute allowedRoles={ADMIN_STAFF}`, y
  `ADMIN_STAFF = ['superadmin', 'admin']` (`AppRouter.tsx:132`).
- `01-RUTA-DE-PRUEBAS.md:161` lista unicamente `superadmin` para esta area. El codigo es mas
  permisivo: `admin` tambien entra. Discrepancia de documento, no de codigo.

## 3. Precondiciones de datos

- `$BASE_URL` apuntando al despliegue de QA, sin barra final.
- Sesion de `admin@demo.clinic.com` (`DemoVitaria2026!`) y de `superadmin` (`$SUPERADMIN_PASSWORD`),
  el segundo solo para AUD-011.
- El seed **`admin.seed.ts:1050-1085`** debe haber corrido: 35 filas por tenant, insertadas en un
  bucle `for (let i = 0; i < 35; i++)` envuelto en `try { } catch { /* skip */ }`, con
  `created_at` repartido en `addDays(today, -randomInt(0, 60))`.
- Las 15 acciones del seed son exactamente y solo estas: `user.login`, `user.logout`,
  `booking.created`, `booking.confirmed`, `booking.cancelled`, `clinical_record.created`,
  `clinical_record.updated`, `invoice.created`, `invoice.paid`, `lab_request.created`,
  `lab_request.completed`, `patient.created`, `doctor.updated`, `subscription.renewed`,
  `settings.updated` (`admin.seed.ts:124-140`).
- `resource_id` es **siempre `1`** en el seed, y `resource_type` solo produce 8 valores: `user`,
  `booking`, `clinical_record`, `invoice`, `lab_request`, `doctor`, `subscription`, `tenant`.
- `ip_address` es aleatorio en `10.x`–`192.x` y `user_agent` es siempre la misma cadena de
  Chrome/Windows. Ninguna fila tiene `hash` ni `previous_hash` (el `INSERT` del seed no los lista).
- `$ADMIN_PASSWORD` y `$SUPERADMIN_PASSWORD` preguntados al ejecutor antes de empezar. No se
  assumen ni se registran en el archivo.

## 4. Casos

### [AUD-001] Renderiza `/audit` con la sesion de `admin` y el encabezado de la pagina

**Rol** `admin` · **Ruta** `/audit` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** el seed de `admin.seed.ts` ha corrido y el tenant tiene filas en `audit_logs`.
**Datos:** `email` = `admin@demo.clinic.com` · `password` = `DemoVitaria2026!` · `patron_busqueda` = `booking`

1. Iniciar sesion como `admin` y navegar a `/audit` desde el sidebar.
2. Esperar a que desaparezca el estado de carga y leer el titulo y el subtitulo.
3. Contar los controles de filtro visibles y contarlos en el orden en que aparecen.
4. Contar las columnas de la tabla y leer sus encabezados.
5. Contar las filas renderizadas.
6. Escribir `booking` en el buscador y contar de nuevo las filas.
7. Vaciar el buscador y contar de nuevo las filas.

**Esperado**
- El titulo es el de `PageHeader` y el subtitulo es exactamente "Registro de actividades del sistema" (`audit.subtitle`).
- Hay 4 controles: buscador (`audit.searchPlaceholder` = "Buscar en auditoria..."), filtro de accion, filtro de entidad y — **solo** si la sesion es `superadmin` — selector "Clínica" (`audit.clinicFilter`). Con `admin` el selector de clinica **no** se renderiza.
- Las columnas de la tabla son: Usuario, Accion, Entidad, ID Entidad, Direccion IP, Fecha/Hora, y una columna de accion de fila con "Ver detalles" (`audit.viewDetails`).
- Se renderizan **15** filas: `limit` es `useState(15)` (`AuditPage.tsx:44`), no el default 20 del backend.
- **El buscador no cambia nada.** Las filas siguen siendo 15 tras escribir `booking` y tras vaciarlo. `search` solo existe en `useState` (`AuditPage.tsx:45`) y en el `onChange` del input: nunca entra en los params de `useAuditList` ni en un `.filter()` de cliente. Es un control muerto con apariencia de funcional.
- No aparece el texto "No hay registros de auditoria" (`audit.noAuditLogs`) ni el `EmptyState` "No se encontraron registros con los filtros aplicados" (`audit.noResultsWithFilters`).

**Red:** `GET /api/audit?page=1&limit=15` → 200 con un **array plano** de 15 objetos, sin envoltorio ni campo `total`. Verificar `user_name` resuelto y `details` en `null` en todas las filas del seed. Con `admin` no debe viajan `tenant_id` en el query string.
**Limpieza:** ninguna.

### [AUD-002] Aplica `authorize('admin','superadmin')` y rechaza a los demas roles

**Rol** `superadmin`, `admin`, `doctor`, `lab_technician`, `patient`, anónimo · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** sesiones disponibles para `admin`, `superadmin`, `doctor`, `lab_technician` y `patient`.
**Datos:** `endpoint` = `GET /api/audit` · `credenciales` = las de cada rol

1. Sin ninguna cookie de sesion, invocar `GET /api/audit` con la cabecera `Authorization` ausente.
2. Invocar el mismo endpoint con la sesion de `patient`.
3. Repetir con `lab_technician`.
4. Repetir con `doctor`.
5. Repetir con `admin`.
6. Repetir con `superadmin`.
7. En los casos que devuelvan 200, anotar el rol y el `tenant_id` efectivo de la primera fila.

**Esperado**
- Sin sesion → **401** y el cuerpo con la clave `errors.UNAUTHORIZED`. No se ejecuta ninguna consulta a la base.
- `patient`, `lab_technician` y `doctor` → **403** con `errors.FORBIDDEN`. La UI no ofrece `/audit` a estos roles, asi que el 403 solo es observable por red.
- `admin` → **200** con array, y `tenant_id` de cada fila igual al del admin. El `admin` **no** puede ampliar el alcance: `tenant_id` se resuelve a `req.tenant_id` porque `isSuperAdmin` es falso.
- `superadmin` → **200** con array.
- En ningun caso de 403 la respuesta incluye filas: el `authorize` va antes del controller, no despues.

**Red:** `GET /api/audit` → 401 anonimo · 403 `patient`/`lab_technician`/`doctor` · 200 `admin` · 200 `superadmin`. Verificar en el 200 que el `user_id` de las filas corresponde al `admin` del seed y que `user_name` no es `null`.
**Limpieza:** ninguna.

### [AUD-003] El filtro de accion solo devuelve filas con la opcion "Todas"

**Rol** `admin` · **Ruta** `/audit` · **P0** · **Resultado** `______`
**Precondicion:** el tenant tiene las 35 filas del seed, cuyas acciones son las 15 con namespace (`user.login`, `booking.created`, `invoice.paid`, ...).
**Datos:** `opciones` = Todas, Creacion, Actualizacion, Eliminacion, Inicio de Sesion, Cierre de Sesion, Consulta, Exportacion, Validacion (`AUDIT_ACTION_OPTIONS`, 9 opciones)

1. Abrir `/audit` y anotar el numero de filas con el filtro en "Todas".
2. Elegir "Creacion" en el filtro de accion.
3. Esperar la respuesta y contar las filas.
4. Repetir con "Actualizacion", "Eliminacion", "Inicio de Sesion", "Cierre de Sesion", "Consulta", "Exportacion" y "Validacion".
5. Volver a "Todas" y confirmar que se recuperan las filas.

**Esperado**
- Con "Todas" se muestran 15 filas.
- Con **cualquiera** de las 8 opciones de accion concretas se muestran **0** filas y aparece el `EmptyState` con "No se encontraron registros con los filtros aplicados" (`audit.noResultsWithFilters`).
- Motivo esperado: el filtro viaja como `action=<valor>` y el backend compara con igualdad exacta (`al.action = $n`, `audit.service.ts:81`). El seed no genera ninguna accion sin namespace, asi que `create`, `update`, `login`, `logout`, `view`, `export`, `validate` y `delete` no existen como valor completo. La UI ofrece 8 filtros que no pueden devolver nada y las 15 acciones que si existen no son filtrables.
- Volver a "Todas" recupera las 15 filas: el filtro no las destruye, solo las oculta.
- La peticion sale con el parametro exacto: `GET /api/audit?page=1&limit=15&action=create`.

**Red:** `GET /api/audit?action=create` → 200 con `[]`. Contrastar con `GET /api/audit?action=booking.created` → 200 con filas, que **no** es una opcion de la UI. Anotar si algun filtro devuelve 0 pese a existir filas: seria un hallazgo adicional.
**Limpieza:** ninguna.

### [AUD-004] El filtro de entidad cubre 6 de los 8 tipos reales y ofrece 4 que no existen

**Rol** `admin` · **Ruta** `/audit` · **P0** · **Resultado** `______`
**Precondicion:** el seed genero filas de tipo `user`, `booking`, `clinical_record`, `invoice`, `lab_request`, `doctor`, `subscription` y `tenant`.
**Datos:** `opciones` = Todas, Usuario, Doctor, Paciente, Cita, Solicitud Lab, Resultado Lab, Expediente, Receta, Equipamiento (`AUDIT_ENTITY_OPTIONS`, 10 opciones)

1. Abrir `/audit` y contar las filas con el filtro en "Todas".
2. Elegir "Cita" y contar las filas.
3. Elegir "Expediente" y contar las filas.
4. Elegir "Solicitud Lab" y contar las filas.
5. Elegir "Usuario" y "Doctor", contando cada uno.
6. Elegir "Paciente", "Resultado Lab", "Receta" y "Equipamiento", contando cada uno.
7. Volver a "Todas".

**Esperado**
- "Cita" (`booking`), "Expediente" (`clinical_record`), "Solicitud Lab" (`lab_request`), "Usuario" (`user`) y "Doctor" (`doctor`) devuelven filas, porque el seed si genera esos `resource_type`.
- "Paciente" (`patient`), "Resultado Lab" (`lab_result`), "Receta" (`prescription`) y "Equipamiento" (`equipment`) devuelven **0** filas: son opciones que ninguna fila puede satisfacer.
- **`invoice` y `subscription` no son filtrables**: el seed los produce, pero no estan en `AUDIT_ENTITY_OPTIONS`. Ninguna combinacion de filtros permite verlos, salvo "Todas".
- El campo de la API es `resource_type`, y la UI lo envia como `entity_type`. Los dos nombres funcionan por el alias del controller; el parametro que sale por red es `entity_type`.
- El chip de entidad de cada fila traduce con `entityLabels.<tipo>`; para un tipo sin etiqueta el fallback es el valor crudo en ingles (p. ej. `settings.updated` → "Ajustes Actualizados" tiene etiqueta, pero `resource_type: "tenant"` sin clave se veria crudo).

**Red:** `GET /api/audit?entity_type=invoice` → 200 con filas (el backend no filtra, la UI nunca lo pide). `GET /api/audit?entity_type=patient` → 200 con `[]`. `GET /api/audit?resource_type=invoice` → 200 con las mismas filas que `entity_type=invoice`.
**Limpieza:** ninguna.

### [AUD-005] El buscador y el filtro de fecha no existen como controles, pese a estar en el contrato

**Rol** `admin` · **Ruta** `/audit` · **P0** · **Resultado** `______`
**Precondicion:** el tenant tiene las 35 filas del seed, con `created_at` repartido en los ultimos 60 dias.
**Datos:** `texto_busqueda` = `invoice.paid` · `accion_existente` = `subscription.renewed`

1. Escribir `invoice.paid` en el buscador y esperar 2 s.
2. Contar las filas y comparar con el estado sin busqueda.
3. Escribir un texto que no existe, `zzz-no-existe`, y contar las filas.
4. Pulsar "Ver detalles" en una fila cualquiera y comprobar si el buscador se vacia o se conserva.
5. Revisar si existe algun control de fecha en la pagina: filtro de rango, date picker o inputs `audit.filterByDate`.

**Esperado**
- Los pasos 2 y 3 devuelven **15 filas en ambos casos**: el buscador no filtra ni por servidor ni por cliente. No hay spinner, no hay peticion nueva, no hay estado vacio. Es el fallo mas silencioso del area porque el input acepta texto y no da ninguna senal.
- El buscador **no** aparece en ninguna peticion: el objeto de params de `useAuditList` (`AuditPage.tsx:70-76`) solo lleva `page`, `limit`, `action`, `entity_type` y `tenant_id`.
- **No existe control de fecha** en la pagina, aunque `es.json:2492` define la etiqueta `audit.filterByDate` = "Filtrar por fecha" y `es.json:2489` define `audit.filterByUser` = "Filtrar por usuario". Ambas claves estan huerfanas: ningun componente las renderiza. Tampoco existe filtro por usuario, pese a que la API acepta `user_id`.
- El dialogo de detalle se abre sin alterar el buscador: el texto introducido sigue ahi y sigue sin filtrar.

**Red:** tras escribir en el buscador, el panel de red muestra **0** peticiones nuevas a `/api/audit`. Anotar que `start_date` y `end_date` quedan sin expositor en la UI aunque el backend los soporte.
**Limpieza:** ninguna.

### [AUD-006] La paginacion queda fijada en una sola pagina y las filas restantes son inalcanzables

**Rol** `admin` · **Ruta** `/audit` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** el tenant tiene las 35 filas del seed.
**Datos:** `limit_ui` = 15 · `filas_totales` = 35 · `paginas_esperadas` = 3

1. Abrir `/audit` y anotar el numero de filas y el texto del pie de la tabla.
2. Localizar el control de paginacion y anotar cuantos botones de pagina ofrece.
3. Leer el indicador de "Filas por pagina" (`audit.rowsLabel`).
4. Intentar avanzar a la pagina 2 con el control de la UI.
5. Si no hay control, invocar a mano `GET /api/audit?page=2&limit=15` y comparar las filas con las de la pagina 1.
6. Repetir con `page=3`.

**Esperado**
- La tabla muestra 15 filas y el paginador indica **1 de 1**: el backend devuelve un array plano sin `total`, y `audit.service.ts:8-10` fabrica `{ data, total: data.length, page, limit, totalPages: 1 }` con `totalPages` **fijo en 1**. `total` es el numero de filas de la pagina, no el total real, asi que la UI no puede saber que existen mas.
- "Filas por pagina" muestra el valor **15** (`useState(15)`, `AuditPage.tsx:44`), que es un control local: cambiarlo no altera la peticion si no dispara un `refetch` con el nuevo `limit`.
- Las **20 filas restantes del seed no son alcanzables** desde la UI. No hay boton de pagina 2, ni "Siguiente", ni scroll infinito, ni total que lo sugiera.
- `GET /api/audit?page=2&limit=15` → 200 con 15 filas **distintas** de las de la pagina 1 (orden `created_at DESC`), y `page=3` → 200 con 5 filas. Los datos existen y son legibles por red; lo que falta es el recorrido en la interfaz.
- `page=4` → 200 con `[]`. El backend no indica "mas alla del final": devuelve un array vacio, identico al de un filtro sin coincidencias, asi que el `EmptyState` de "No se encontraron registros con los filtros aplicados" aparece tambien al pasarse de rango, con un mensaje engañoso.

**Red:** `GET /api/audit?page=1&limit=15` → 200 con 15 · `page=2&limit=15` → 200 con 15 distintas · `page=3&limit=15` → 200 con 5 · `page=4&limit=15` → 200 con `[]`. Ninguna respuesta trae `total` ni `totalPages`.
**Limpieza:** ninguna.

### [AUD-007] `limit` y `page` se recortan a 1..100 y no producen 500

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin` activa; el tenant tiene 35 filas.
**Datos:** `casos` = `limit=0`, `limit=-5`, `limit=999`, `limit=abc`, `page=0`, `page=-1`, `page=abc`, `limit=15.9`

1. Invocar `GET /api/audit?limit=0` y contar las filas.
2. Repetir con `limit=-5`.
3. Repetir con `limit=999` y contar las filas, comprobando si aparecen las 35 del seed.
4. Repetir con `limit=abc`.
5. Repetir con `page=0` y `page=-1`.
6. Repetir con `page=abc`.
7. Repetir con `limit=15.9`.

**Esperado**
- Todos los casos devuelven **200**. No hay 400, no hay 500, no hay mensaje de validacion: los parametros de paginacion no tienen schema.
- `limit=0` y `limit=-5` devuelven **1** fila. `getQueryInt` (`src/shared/query.ts:8-13`) parsea sin recortar y devuelve `0` y `-5`; el recorte ocurre despues, en `audit.service.ts:72-73`, con `Math.max(1, Math.min(100, limit))`.
- `limit=999` devuelve como maximo **100** filas. Con 35 filas en la tabla se ven las 35, asi que el tope no es observable con el seed estandar: anotar el recuento y, si hay menos de 100 filas, marcar el tope como no verificable en este entorno en lugar de afirmar que funciona.
- `limit=abc` y `page=abc` caen al default: **20** filas y pagina 1. `getQueryInt` detecta `NaN` y devuelve el default en vez de rechazar.
- `page=0` y `page=-1` se normalizan a la pagina 1 (15 filas con `limit=15`), y el `offset` nunca es negativo.
- `limit=15.9` → `parseInt` trunca a 15 y devuelve 15 filas.

**Red:** los 8 casos → 200. Registrar el recuento exacto de filas de cada uno. Si algun caso devuelve 500, es un hallazgo nuevo: significaria que el recorte no se aplica antes de armar el SQL.
**Limpieza:** ninguna.

### [AUD-008] `resource_id` no es un filtro de la API y `user_id=0` se ignora

**Rol** `admin`, `superadmin` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondicion:** el seed genero 35 filas con `user_id` = id del primer admin del tenant y `resource_id` siempre `1`.
**Datos:** `usuario_admin` = id del admin del seed · `param` = `user_id=0`, `user_id=<id>`, `resource_id=1`, `resource_id=9999`

1. Invocar `GET /api/audit` sin parametros y anotar las 15 primeras filas con su `user_id` y `entity_id`.
2. Invocar `GET /api/audit?user_id=0` y contar las filas.
3. Invocar `GET /api/audit?user_id=<id del admin>` y contar las filas.
4. Invocar `GET /api/audit?user_id=999999` y contar las filas.
5. Invocar `GET /api/audit?resource_id=1` y contar las filas.
6. Invocar `GET /api/audit?resource_id=9999` y contar las filas.

**Esperado**
- Sin parametros se obtienen 15 filas, todas con el mismo `user_id` (el admin del seed) y **todas** con `entity_id: 1`, porque el seed fija `resource_id: 1` en sus 15 acciones.
- `user_id=0` se comporta como "sin filtro": el controller lee `getQueryInt(..., 'user_id', 0)` y luego pasa `user_id: user_id || undefined`, y `undefined` no agrega condicion al SQL. Devuelve las mismas 15 filas. El `0` no es un id real, pero tampoco se rechaza.
- `user_id=<id del admin>` devuelve las mismas 15 filas, porque todas son de ese usuario. Para distinguir el efecto hay que comparar con un tenant que tenga varios autores; si no es posible en este entorno, marcar el caso como parcial.
- `user_id=999999` → 200 con `[]`. Un id inexistente no da 404: el filtro simplemente no coincide.
- `resource_id=1` y `resource_id=9999` devuelven **las mismas 15 filas** que sin filtro. **`resource_id` no es un filtro efectivo**: existe en la interfaz `AuditLogQuery` (`audit.service.ts:35`) pero el controller nunca lo lee (`audit.controller.ts:6-12`), asi que nunca llega al SQL. Es un filtro muerto en el contrato.
- `user_name` llega resuelto por `COALESCE(u.name, u.email)` sobre un `LEFT JOIN users`, por lo que nunca es `null` mientras el usuario exista. La tabla cae a `audit.userFallback` = "Usuario {{id}}" solo si el `LEFT JOIN` no encuentra la fila (usuario borrado).

**Red:** los 5 casos con filtro → 200. Anotar si `resource_id` aparece reflected en el query string de la UI: no aparece, la UI no lo envia.
**Limpieza:** ninguna.

### [AUD-009] `end_date` excluye todo el dia salvo el primer instante

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** el tenant tiene filas de hoy (`created_at` = hoy a las horas generadas por `addDays(today, -0)`).
**Datos:** `hoy` = <YYYY-MM-DD de hoy> · `ayer` = <YYYY-MM-DD de ayer> · `casos` = `start_date=hoy`, `end_date=hoy`, `end_date=hoyT23:59:59`, `start_date=no-es-fecha`, `start_date=hoy&end_date=ayer`

1. Invocar `GET /api/audit?start_date=<hoy>&end_date=<hoy>` y anotar cuantas filas devuelve y si alguna tiene `created_at` de hoy.
2. Comparar con `GET /api/audit?start_date=<hoy>` sin `end_date`.
3. Invocar `GET /api/audit?end_date=<hoyT23:59:59>` y comparar el recuento.
4. Invocar `GET /api/audit?start_date=no-es-fecha`.
5. Invocar `GET /api/audit?start_date=<hoy>&end_date=<ayer>` (rango invertido).
6. Invocar `GET /api/audit?start_date=01/10/2026` (formato no ISO).

**Esperado**
- `start_date=<hoy>&end_date=<hoy>` devuelve como maximo **1** fila, la que tenga `created_at` exactamente a `00:00:00` de hoy. `end_date` se pasa tal cual a `al.created_at <= $n` (`audit.service.ts:84`) y Postgres lo compara contra `2026-10-01 00:00:00`: todo el resto del dia queda **fuera**. El filtro de "hasta hoy" pierde el dia entero salvo su primer instante.
- `start_date=<hoy>` sin `end_date` devuelve todas las filas de hoy, lo que confirma que los datos estaban ahi y los perdio el limite superior.
- `end_date=<hoyT23:59:59>` devuelve las filas de hoy completas. La UI no ofrece ningun control de fecha (ver AUD-005), asi que este es el unico modo de corregirlo y no es accesible desde la interfaz.
- `start_date=no-es-fecha` → **500** con error de Postgres (`invalid input syntax for type timestamp`), no 400. La API no valida formato ni rango: las condiciones se inyectan como parametros, pero Postgres es quien valida.
- `start_date=<hoy>&end_date=<ayer>` → 200 con `[]`, sin avisar de que el rango esta invertido.
- `start_date=01/10/2026` → 500 por el mismo motivo de formato, o `[]` si Postgres llega a interpretarlo. Registrar el status real; en cualquier caso **no** hay 400 de validacion.

**Red:** los 6 casos. Anotar el status exacto de los dos casos con formato invalido: es el unico modo de distinguir "500 por sintaxis" de "filtro vacio".
**Limpieza:** ninguna.

### [AUD-010] `entity_type` funciona como alias de `resource_type` y el orden decide cuando ambos viajan

**Rol** `admin` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondicion:** el seed genero filas de tipo `invoice` y de tipo `booking`.
**Datos:** `casos` = `resource_type=invoice`, `entity_type=invoice`, ambos a `booking` y `invoice`, ambos a `invoice` y `booking`

1. Invocar `GET /api/audit?resource_type=invoice` y anotar las filas.
2. Invocar `GET /api/audit?entity_type=invoice` y anotar las filas.
3. Invocar `GET /api/audit?resource_type=booking&entity_type=invoice`.
4. Invocar `GET /api/audit?entity_type=booking&resource_type=invoice`.
5. Invocar `GET /api/audit?resource_type=INVOICE` (mayusculas).
6. Invocar `GET /api/audit?resource_type=` (vacio).

**Esperado**
- Los pasos 1 y 2 devuelven **exactamente las mismas filas**. El alias funciona: `audit.controller.ts:8` resuelve `resource_type = getQuery('resource_type') || getQuery('entity_type')`, asi que los dos nombres son el mismo filtro. Esto es lo que permite que la UI envie `entity_type` y el backend hable de `resource_type`.
- En el paso 3 (`resource_type=booking`, `entity_type=invoice`) gana **`resource_type`**: devuelve filas `booking`. En el paso 4, con los mismos dos valores en orden inverso, tambien gana `resource_type` y devuelve `invoice`. El `||` evalua siempre el primer operando, no el ultimo en llegar, y no hay deteccion de conflicto: si ambos viajan con valores distintos, uno se descarta en silencio.
- `resource_type=INVOICE` → 200 con `[]`. La comparacion es exacta y sensible a mayusculas sobre un `VARCHAR`: no hay normalizacion, a diferencia de los filtros de rol del frontend (`normalizeRole()`).
- `resource_type=` (vacio) se ignora y devuelve las 15 filas sin filtro. `getQuery` devuelve `undefined` para un valor falsy (`src/shared/query.ts:5`), asi que el filtro nunca llega al SQL.

**Red:** los 6 casos → 200. Registrar los identificadores de las filas de los pasos 3 y 4 para demostrar cual de los dos parametros prevailencio.
**Limpieza:** ninguna.

### [AUD-011] El `admin` no puede salir de su tenant; el `superadmin` puede, y el filtro de clinica solo existe para el

**Rol** `superadmin`, `admin` · **Ruta** `/audit` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** existen al menos dos tenants, cada uno con filas propias en `audit_logs`. El area depende de `19` (multi-tenancy y aislamiento).
**Datos:** `tenant_a` = tenant del admin · `tenant_b` = segundo tenant · `password_admin` = `DemoVitaria2026!` · `password_superadmin` = `$SUPERADMIN_PASSWORD`

1. Con sesion de `admin` del tenant A, abrir `/audit` y anotar los `tenant_id` de las filas.
2. Con la misma sesion, invocar `GET /api/audit?tenant_id=<tenant B>`.
3. Con la misma sesion, cambiar la cabecera `X-Tenant-Id` al valor del tenant B e invocar `GET /api/audit`.
4. Con sesion de `superadmin`, abrir `/audit` y confirmar que aparece el selector "Clínica".
5. Elegir el tenant B en el selector y anotar las filas y sus `tenant_id`.
6. Con sesion de `superadmin`, invocar `GET /api/audit?tenant_id=<tenant B>` por red.
7. Volver a "Todas las clínicas" y comprobar si se recuperan las filas del tenant A.

**Esperado**
- Con `admin` del tenant A, **todas** las filas tienen `tenant_id` = tenant A. No hay ninguna del tenant B.
- El paso 2 con `?tenant_id=<tenant B>` devuelve **exactamente las mismas filas del tenant A**: el parametro se ignora sin error y sin aviso. `audit.controller.ts:14-17` solo lo honra si `req.user.role === 'superadmin'`; para el resto cae a `req.tenant_id`. El 200 es indistinguible del correcto para quien no compare los ids.
- El paso 3 depende de la sesion, no del parametro: si la sesion manda, tambien devuelve solo el tenant A. Si la cabecera `X-Tenant-Id` prevalence sobre la sesion, devolveria el tenant B y seria una fuga horizontal critica. Registrar el resultado real y marcar el caso como **P0** por el impacto.
- El selector "Clínica" **no existe** para `admin`: `AuditPage.tsx:75` solo lo adjunta si `isSuperAdmin`, y el `useEffect` que carga `listTenants({page:1,limit:200})` retorna temprano si no lo es (`AuditPage.tsx:53-54`). Para `admin` hay 3 controles, para `superadmin` hay 4.
- Con `superadmin` y el tenant B elegido, las filas muestran `tenant_id` = tenant B y **no** ninguna del tenant A.
- Al volver a "Todas las clínicas" el selector envia `tenant_id: undefined` y vuelven a aparecer filas de varios tenants mezcladas, sin columna que indique a que clinica pertenece cada fila.
- La carga de clinicas es silenciosa: el `catch(() => undefined)` de `AuditPage.tsx:61` se traga el error, asi que si `listTenants` falla el selector aparece **vacio** y no hay mensaje. Anotar si el desplegable muestra la opcion "Todas las clínicas" sin ninguna alternativa.

**Red:** `GET /api/audit?tenant_id=<tenant B>` → 200 con filas del tenant A para `admin` · 200 con filas del tenant B para `superadmin`. Anotar los `tenant_id` de las 5 primeras filas de cada respuesta; es la evidencia del aislamiento.
**Limpieza:** ninguna.

### [AUD-012] El dialogo de detalle muestra `details` pero oculta hash, `previous_hash` y `user_agent`

**Rol** `admin` · **Ruta** `/audit` · **P1** · **Resultado** `______`
**Precondicion:** el tenant tiene las 35 filas del seed. Ninguna tiene `old_values` ni `new_values`.
**Datos:** `fila` = la primera fila de la tabla · `user_agent_seed` = la cadena de Chrome/Windows del seed

1. Pulsar "Ver detalles" en la primera fila.
2. Leer el titulo del dialogo y las etiquetas de la tabla de detalle.
3. Contar las filas de la tabla de detalle.
4. Buscar visualmente cualquier hash, `previous_hash` o cadena de agente de usuario.
5. Cerrar el dialogo y abrir el de una fila con `ip_address` presente.
6. Buscar en el dialogo un bloque "Detalles Adicionales" o "Cambio de" / "Cambio a".

**Esperado**
- El dialogo se titula "Detalle de Auditoría" (`audit.detailTitle`) y muestra tres chips: accion, entidad y, si existe, `ID: {{id}}` (`audit.idValue`).
- La tabla de detalle tiene **6 filas**: Usuario, Accion, Entidad, ID Entidad, Direccion IP y Fecha/Hora. IP se renderiza en fuente monoespaciada y cae a `—` si es `null`.
- **No aparece ningun hash.** Ni `hash` ni `previous_hash` se renderizan, pese a que la API los devuelve en cada fila (`audit.service.ts:96`). La cadena de integridad es invisible desde la interfaz: no hay forma de auditar la auditoria desde la propia auditoria.
- **No aparece el agente de usuario.** `audit.userAgent` = "Navegador" existe en `es.json:2501` pero ningun componente lo usa, y el dialogo no lo muestra aunque `user_agent` venga en la respuesta.
- **No aparece el bloque "Detalles Adicionales"** (`audit.detallesAdicionales`) en ninguna fila del seed: el servicio construye `details` con `jsonb_build_object('old_values', ..., 'new_values', ...)` solo cuando alguno de los dos no es `NULL` (`audit.service.ts:93-95`), y el seed no los rellena, asi que `details` llega `null` y el bloque se oculta. Las claves `audit.changeFrom` ("Cambio de") y `audit.changeTo` ("Cambio a") quedan huerfanas.
- Si existiera una fila con `details` no nulo, el bloque apareceria con `JSON.stringify(log.details, null, 2)`: las claves internas seguirian siendo `old_values` y `new_values` en ingles, sin traducir, dentro de un bloque rotulado en espanol.
- Hay dos literales distintos para el usuario sin nombre: la tabla cae a `audit.userFallback` = "Usuario {{id}}" y el dialogo a `audit.userValue` = "Usuario #{{id}}". Anotar si en algun rol se ven las dos formas.
- Fecha/Hora usa `formatDateTime(log.created_at)` sobre un `TIMESTAMP` **sin zona horaria**: la hora mostrada depende de la zona del navegador, no de la del servidor. Anotar la zona del navegador y comparar con la del servidor.

**Red:** `GET /api/audit?limit=1` → 200. Confirmar en el cuerpo que `hash`, `previous_hash` y `user_agent` **si** llegan, y que `details` es `null` para las filas del seed. La UI es la que los descarta.
**Limpieza:** cerrar el dialogo.

### [AUD-013] El CSV exporta solo la pagina cargada, sin BOM y sin escapar comas

**Rol** `admin` · **Ruta** `/audit` · **P1** · **Resultado** `______`
**Precondicion:** el tenant tiene 35 filas del seed y un usuario cuyo nombre contenga una coma.
**Datos:** `nombre_con_coma` = un usuario del tenant llamado `QA, Prueba Coma` · `columnas` = Fecha, Usuario, Accion, Entidad, ID Entidad, IP

1. En `/audit`, con el filtro en "Todas", pulsar el boton de exportacion ("Exportar registro de auditoria", `audit.exportAuditLog`).
2. Abrir el CSV descargado y contar las filas de datos y las columnas.
3. Repetir la exportacion con un filtro de entidad aplicado.
4. Buscar en el CSV una fila cuyo usuario contenga una coma y contar las columnas de esa linea.
5. Abrir el CSV con una hoja de calculo en español y observar si los acentos se conservan.
6. Anotar el nombre del archivo descargado.

**Esperado**
- El archivo se llama `auditoria_<YYYY-MM-DD>.csv`, con la fecha de hoy en ISO.
- Tiene **1 linea de encabezado** con 6 columnas: Fecha, Usuario, Accion, Entidad, ID Entidad, IP (`audit.csvHeaders.*`).
- Contiene **15 lineas de datos**, no 35: la exportacion se arma con `logs.map(...)` sobre lo ya cargado, asi que el CSV hereda el recorte de la paginacion. **Nunca se exporta el historico completo**, y nada en la interfaz lo advierte.
- Con un filtro de entidad aplicado, el CSV contiene solo las filas de la pagina que cumple el filtro. Anotar el recuento.
- El archivo **no lleva BOM UTF-8**: el `Blob` se crea con `type: 'text/csv;charset=utf-8;'` pero sin el prefijo de bytes EF BB BF. Excel en espanol puede mostrar los acentos rotos ("Accion" sin tilde, "Auditoria") aunque el contenido sea correcto. Es el mismo defecto que arrastra la exportacion de analitica.
- La construccion es `row.join(',')` **sin escape de CSV**: la linea del usuario `QA, Prueba Coma` produce **7** columnas en vez de 6 y desplaza todas las siguientes. Cualquier nombre con coma, acritico doble o salto de linea corrompe el archivo. Anotar el numero de columnas de esa linea concreta como evidencia.
- `URL.revokeObjectURL(url)` se ejecuta **inmediatamente** despues de `link.click()`, sin `setTimeout`. En navegadores que consume la descarga de forma asincrona puede cancelar la transferencia: si el archivo llega con 0 bytes, anotar el navegador y repetir la descarga.

**Red:** ninguna peticion adicional: la exportacion es 100% cliente. Registrar que el backend no expone ningun endpoint de exportacion para auditoria.
**Limpieza:** borrar los CSV descargados.

### [AUD-014] La cadena HMAC no se puede verificar: nadie escribe, el seed no hashea y el verificador recalcula otra cosa

**Rol** `superadmin` · **Ruta** `/audit` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** el seed ha corrido en un entorno de un solo tenant con 35 filas de auditoria.
**Datos:** `filas_seed` = 35 · `secreto` = valor de `AUDIT_HMAC_SECRET` en el despliegue · `cron` = `0 */6 * * *`

1. Con sesion de `superadmin`, invocar `GET /api/audit?limit=100` y revisar el campo `hash` de las 35 filas.
2. Revisar el campo `previous_hash` de las mismas filas.
3. Revisar si el dialogo de detalle muestra alguno de los dos (ver AUD-012).
4. En los logs del servidor, buscar las lineas `Audit chain integrity check:` de las ultimas 24 h y anotar el par "broken links out of".
5. Buscar las lineas `Audit chain integrity violation at log #` y contar cuantas hay por fila.
6. Buscar en el codigo cualquier llamada a `logAction` (`src/modules/audit/audit.service.ts:43`) fuera de su propia definicion.
7. Revisar el valor de `AUDIT_HMAC_SECRET` en `.env.example:70` frente al despliegue.

**Esperado**
- Las 35 filas traen `hash: null` y `previous_hash: null`. El `INSERT` del seed (`admin.seed.ts:1069-1070`) no incluye esas columnas. **Ninguna fila de la base tiene hash**, y el dialogo no los muestra.
- `logAction` esta exportada pero **no tiene un solo call site en todo `src/`**. Ningun servicio, controller ni trigger la invoca, y los `CREATE TRIGGER` de `db/init.sql:970-1046` son todos de `updated_at`. **La tabla no crece nunca por la aplicacion**: su contenido es exclusivamente el seed, y volver a sembrar la duplica.
- Los logs del cron muestran `Audit chain integrity check: 35 broken links out of 35` (o el recuento que corresponda). El verificador recorre las filas y compara `computeHmac([previous_hash, action, tenant_id])` contra `row.hash`, que es `null`: una cadena de 64 caracteres nunca es igual a `null`, asi que **cada fila cuenta como violacion**. El log es un `logger.warn`, no un error, y el proceso no falla: el sistema informa de una cadena rota a la vez cada 6 horas y sigue operando.
- La canonicalizacion del escritor y la del verificador **no coinciden**: `computeAuditHash` (`audit.service.ts:4-17`) concatena 9 campos —`previous_hash`, `action`, `resource_type`, `resource_id`, `old_values`, `new_values`, `ip_address`, `tenant_id` y `Date.now()`— mientras que `verifyAuditChain` (`audit-integrity.job.ts:25-29`) concatena 3. Aunque las filas tuvieran hash, **ningun** seria validable. Ademas `Date.now()` no se almacena en ninguna columna, asi que el hash es irreproducible por construccion.
- `verifyAuditChain` corre sin filtro de tenant desde el cron (`src/app.ts:519`), por lo que encadena filas de todos los tenants en una sola secuencia, mientras `logAction` busca el `previous_hash` con un `SELECT hash FROM audit_logs ORDER BY created_at DESC LIMIT 1` **global** (`audit.service.ts:47-49`).
- `brokenLinks` puede contar **dos** por una sola fila manipulada: una por el enlace roto y otra por el hash discrepante, mas una por el enlace de la fila siguiente. Anotar si el recuento de "violation" por fila coincide con el de filas.
- `.env.example:70` entrega `AUDIT_HMAC_SECRET=REPLACE_WITH_RANDOM_64_CHAR_STRING`. Si el despliegue conserva ese marcador, la cadena se firma con un secreto publico y conocido: cualquiera que lo conozca puede fabricar un historial coherente. `getHmacSecret()` solo valida longitud minima (32) y presencia, no que el valor no sea el de ejemplo.

**Red:** `GET /api/audit?limit=100` → 200 con `hash: null` y `previous_hash: null` en todas las filas. El fallo de integridad **no** es observable por HTTP: no hay endpoint de verificacion ni el estado de la cadena afecta el codigo de respuesta. Registrar la evidencia en el log del servidor y en la respuesta.
**Limpieza:** ninguna. **No** ejecutar `verifyAuditChain` a mano ni escribir filas en `audit_logs` para "probar" la cadena: contaminaria el unico dato de integridad que queda.

---

## 5. Defectos conocidos a verificar primero

`01-RUTA-DE-PRUEBAS.md:143-150` no lista ningun hallazgo para el area `26`, y `90-HALLAZGOS-CODIGO.md` no contiene ninguna entrada de auditoria: **ningun identificador H-NN aplica a esta area**. Los defectos reales estan en la seccion 6 y se documentan con su archivo y linea. Si en el futuro se registran en `90-`, deben conservarse los H-63 y H-62 ya asignados a las areas `15` y `25`, que no deben reutilizarse aqui.

| Defecto | Caso que lo ejercita | Verificar |
|---|---|---|
| Sin escritor: `logAction` sin call sites | AUD-014 | `src/modules/audit/audit.service.ts:43` no la invoca nadie; la tabla solo crece por el seed |
| Cadena no verificable | AUD-014 | El verificador usa 3 campos y el escritor 9; `Date.now()` no se persiste |
| Sin total ni paginacion | AUD-006 | `audit.service.ts:8-10` fija `totalPages: 1` sobre un array plano |
| Filtro de accion inutilizable | AUD-003 | 8 de 9 opciones devuelven `[]` frente a las 15 acciones con namespace del seed |
| Buscador muerto | AUD-001, AUD-005 | `search` no llega a los params ni a un filtro de cliente |
| Sin filtro de fecha en la UI | AUD-005, AUD-009 | `start_date`/`end_date` existen en la API, `audit.filterByDate` no se renderiza |
| `resource_id` no es filtro | AUD-008 | Declarado en `AuditLogQuery:35`, nunca leido por el controller |
| Hash invisible en la UI | AUD-012 | `hash` y `previous_hash` llegan en la respuesta y no se renderizan |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: <descripción de la sección 6>)`, no como
> hallazgo nuevo. Si un caso pasa, anotarlo igual: varios de ellos pasan sin detectar el defecto,
> porque el defecto esta en lo que **no** se muestra.

## 6. Huecos conocidos

- **No hay endpoint de escritura ni de verificacion.** `audit.routes.ts` expone un unico `GET /`.
  No hay forma de auditar desde la API: ni insertar un evento a proposito, ni pedir el estado de
  la cadena, ni forzar una verificación. AUD-014 tiene que meter evidencia por el log del servidor.
- **No hay auditoria de la propia auditoria.** Sin escritor, no hay forma de saber que se perdio
  el registro de una accion: el hueco es silencioso y solo se detecta por comparacion con lo que
  deberia haber ocurrido.
- **`logAction` es codigo muerto** desde la perspectiva de la funcionalidad: 25 lineas
  implementadas, probadas por nadie y sin un solo consumidor. El riesgo es el inverso al habitual:
  no es que falle, es que **nunca se ejecuta**, y su presencia en el codigo sugiere lo contrario.
- **`user_agent` y `changeFrom`/`changeTo` son claves huerfanas** (`es.json:2501-2503`): el dato
  llega del backend y la etiqueta existe, pero ninguna se renderiza. Heredado de una version
  anterior del dialogo.
- **No hay retencion, ni exportacion, ni purga de `audit_logs`.** La tabla solo crece, no hay
  particionado, ni indice sobre `created_at` compuesto con `tenant_id`, ni politica de borrado.
  Con el indice actual (`db/init.sql:186-200`) cada listado ordena por `created_at DESC` sobre
  la tabla completa.
- **El buscador, el filtro de usuario y el filtro de fecha son tres controles anunciados en la UI de
  los que solo existe el buscador, y ese buscador no esta conectado.** Hay tres etiquetas i18n
  (`filterByUser`, `filterByDate`, `searchPlaceholder`) para tres filtros distintos; uno esta
  implementado, cero funcionan.
- **La zona horaria de `created_at` no esta definida**: la columna es `TIMESTAMP` sin `WITH TIME
  ZONE`, y el frontend formatea en la zona del navegador. Los registros de una accion ejecutada
  cerca de medianoche pueden aparecer en el dia equivocado al consultar el filtro de fecha.
- **El filtro de clinica carga hasta 200 tenants y traga el error** (`AuditPage.tsx:61`): en una
  plataforma con mas de 200 clinicas el selector se queda corto sin avisar, y si la llamada falla
  aparece vacio sin mensaje.
- **No hay caso de red para el header de correlacion.** El backend lo emite en todas las respuestas
  como `X-Request-ID` (`src/middlewares/correlationId.middleware.ts:4`) y lo consume el logger
  (`requestLogger.middleware.ts:11`) y el manejador de errores (`errorHandler.middleware.ts:15`).
  Ningun caso de esta area lo comprueba, asi que una regresion en la propagacion del identificador
  pasaria inadvertida. La comprobacion natural es abrir cualquier `Red:` de AUD-001…AUD-013 y
  verificar que la respuesta trae `X-Request-ID` con el mismo valor que se envio en la peticion, y
  que ese valor aparece en la linea de log correlacionada. El nombre correcto del header es
  `X-Request-ID`; `X-Correlation-Id` no existe en este backend.

## 7. Resultado del area

Ejecutar los 14 casos en el orden indicado. AUD-001 a AUD-010 son de solo lectura y pueden ir en
paralelo entre tenants distintos. AUD-011 cambia de sesion y de tenant, y AUD-014 toca la
integridad: **en serie, y AUD-014 el ultimo**.

| Resultado | Casos | Cantidad |
|---|---|---:|
| `PASÓ` | — | 0 |
| `FALLÓ` | — | 0 |
| `BLOQUEADO` | — | 0 |
| `N/A` | — | 0 |
| `OMITIDO` | — | 0 |
| **Total** | AUD-001 … AUD-014 | **14** |

Al cerrar el area, responder ademas:

| Pregunta | Respuesta |
|---|---|
| ¿Cuantas filas trae `GET /api/audit` y cuantas renderiza la tabla? | |
| ¿La respuesta del backend es un array o un envoltorio con `total`? | |
| ¿Cuantas filas del seed quedan inalcanzables desde la UI? | |
| ¿Cuantas de las 9 opciones del filtro de accion devuelven filas? | |
| ¿El buscador filtra por servidor, por cliente, o no filtra? | |
| ¿Que dato llega a la API y no se renderiza nunca? | |
| ¿Cuantas filas del seed tienen `hash` distinto de `null`? | |
| ¿Que par "broken links out of" reporta el cron de las 6 horas? | |
| ¿Un `admin` puede leer otro tenant cambiando `X-Tenant-Id`? | |
| ¿`?tenant_id=` de otro tenant devuelve 200 con datos ajenos o con los propios? | |

---

*Alcance: el unico endpoint `GET /api/audit` con sus ocho filtros, la pagina `/audit` con buscador,
filtros, tabla, paginacion, dialogo de detalle y exportacion CSV, y la verificacion de integridad
HMAC de las 6 horas. 14 casos, capa C3, frecuencia quincenal, dependencia `19`. Prefijo `AUD`. No
aplica ningun H-NN de `90-HALLAZGOS-CODIGO.md`. Revisión: 2026-10-01.*

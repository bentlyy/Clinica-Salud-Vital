# 28 — Webhooks e integraciones

> Suscripciones de webhook salientes y la recepcion del webhook de Mercado Pago. El CRUD de
> suscripciones esta completo y validado, pero **nada dispara eventos**: `dispatchEvent()` no
> tiene un solo call site, la tabla `webhook_deliveries` no recibe una escritura, y el unico
> secreto que se genera se devuelve una vez y despues es irrecuperable porque no hay interfaz
> que lo muestre.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `28` | `WHK` | C3 | Quincenal | 16 | `15` | — |

---

## 1. Que cubre

- El CRUD completo de suscripciones, montado en `/api/webhooks` (`src/app.ts:289`) y protegido con
  `authMiddleware` + `authorize('admin','superadmin')` (`webhooks.routes.ts:10-11`):
  - `GET /api/webhooks` — listar
  - `POST /api/webhooks` — crear, devuelve el `secret` una unica vez
  - `PUT /api/webhooks/:id` — actualizar `url`, `events`, `active`
  - `DELETE /api/webhooks/:id` — eliminar
- La validacion de entrada: `createWebhookSchema` y `updateWebhookSchema` son **strict**, y
  `webhookIdSchema` hace `z.coerce.number().int().positive()` sobre `:id`.
- La proteccion SSRF de `url`: `assertValidUrl` exige esquema `http`/`https` y contrasta el
  hostname contra 9 patrones de rango privado.
- Los 6 eventos validos de `WEBHOOK_EVENTS` (`webhooks.schema.ts:3-10`).
- El camino de entrega que **no se ejecuta**: `dispatchEvent()` → `enqueueJob('webhook:dispatch')`
  → `registerWebhookWorker` → `dispatchWebhook()` con firma HMAC-SHA256.
- El webhook entrante de Mercado Pago: `POST /api/saas/webhook/mercadopago`, unico path publico
  de integracion (`tenant.middleware.ts:30`).

> Nota de alcance: **el area no tiene interfaz.** No existe `frontend/src/modules/webhooks` ni
> ninguna ruta de webhooks en `AppRouter.tsx`. Todos los casos son por red, con **Ruta** `—`.
> Ningun caso es destructivo: toda suscripcion creada se elimina con su `DELETE`.

## 2. Roles y rutas

| Rol | Ruta de UI | Que puede hacer | Que no puede |
|---|---|---|---|
| `admin` | `—` | CRUD de suscripciones de **su** tenant | Ver ni tocar suscripciones de otro tenant |
| `superadmin` | `—` | CRUD de suscripciones de **su** `req.tenant_id` | No hay selector de tenant: el filtro es el mismo para ambos roles |
| `doctor`, `lab_technician` | `—` | Nada: 403 | 403 en las cuatro rutas |
| `patient`, `user` | `—` | Nada: 403 | 403 en las cuatro rutas |
| anónimo | `—` | Nada: 401 | 401 en las cuatro rutas |
| anónimo | `—` (Mercado Pago) | `POST /api/saas/webhook/mercadopago` es **publico** | No requiere sesion, tenant ni token |

- A diferencia del area `26`, aqui no hay `admin` vs `superadmin` en el alcance de datos: el
  controller usa siempre `req.tenant_id`, y no hay ninguna rama que lo amplie para superadmin.
- El webhook de Mercado Pago es la unica excepcion: esta en `PUBLIC_PATHS`, asi que
  `tenantMiddleware` no exige `X-Tenant-Id` y `authMiddleware` no se aplica.

## 3. Precondiciones de datos

- `$BASE_URL` de QA, sin barra final.
- Sesion de `admin@demo.clinic.com` (`DemoVitaria2026!`) y de `superadmin` (`$SUPERADMIN_PASSWORD`).
- **Receptor publico obligatorio.** La proteccion SSRF rechaza `localhost`, `127.0.0.1`, rangos
  privados, `169.254.x.x`, `0.x.x.x`, `::1` y `[::1]`. No se puede usar un listener en la maquina
  del ejecutor. Se necesita un endpoint publico que responda, por ejemplo un receptor de pruebas
  o un `https://httpbin.org/anything`. Sin el, los casos de entrega se marcan `BLOQUEADO`.
- Los 6 eventos que acepta la API, y solo estos: `booking.created`, `booking.cancelled`,
  `booking.updated`, `result.ready`, `payment.succeeded`, `patient.created`.
- `ALLOW_DESTRUCTIVE` **no** es necesario en este area: lo creado se borra con su `DELETE`.
- Estado inicial esperado de `webhook_deliveries`: **0 filas**. `webhook_deliveries` no la escribe
  ningun modulo; es la linea base para WHK-013.
- Estado inicial esperado de `jobs` con `type = 'webhook:dispatch'`: **0 filas**. Es la linea base
  para WHK-012.

## 4. Casos

### [WHK-001] Lista las suscripciones del tenant y oculta el secreto

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** el tenant tiene 2 suscripciones creadas por pasos previos de esta sesion, con `url` y `events` distintos.
**Datos:** `evento` = `booking.created` · `url` = `https://example.com/hook-qa`

1. Crear dos suscripciones con `POST /api/webhooks` usando `url` y `events` distintos.
2. Invocar `GET /api/webhooks` con la sesion de `admin`.
3. Contar las suscripciones devueltas y leer el contenido de la primera.
4. Leer todas las claves de cada objeto devuelto.
5. Repetir el listado con la sesion de `superadmin`.
6. Invocar `GET /api/webhooks` sin `X-Tenant-Id` explicito y observar el `tenant_id` de las filas.

**Esperado**
- `GET /api/webhooks` → 200 con envoltorio `{ data: [...] }` y **2** suscripciones ordenadas por `id` ascendente (`ORDER BY id ASC`).
- Cada objeto trae exactamente 8 claves: `id`, `tenant_id`, `url`, `events`, `active`, `created_by`, `created_at`, `updated_at`.
- **No aparece `secret` en el listado.** `SUBSCRIPTION_COLUMNS` (`webhooks.service.ts:21`) no lo incluye. Es correcto y es la unica proteccion real del secreto en las lecturas.
- `active` es `true` en las dos, porque el `INSERT` fija `TRUE` de forma explicita (`webhooks.service.ts:96`). `created_by` es el id del `admin` que las creo.
- `events` llega como **array** de strings, no como la cadena Postgres `{booking.created}`. `parseSubscription` normaliza con `Array.isArray` y devuelve `[]` si no lo es (`webhooks.service.ts:27`).
- `created_at` y `updated_at` son `TIMESTAMP` **sin zona horaria** (`db/init.sql:653-654`): el valor llega sin sufijo y se interpreta en la zona del cliente.
- El listado **no tiene paginacion**: no acepta `page`, `limit`, ni ningun otro parametro, y la respuesta no trae `total`. Con muchas suscripciones, la respuesta crece sin limite.
- La sesion de `superadmin` ve **las mismas 2** suscripciones, no mas: `listSubscriptions` filtra por `req.tenant_id` y no hay rama que lo amplie. `superadmin` **no** tiene selector de tenant en esta API.

**Red:** `GET /api/webhooks` → 200 con `{ data: [ {8 claves}, {8 claves} ] }`. Verificar que ninguna respuesta de listado contenga la cadena `secret` ni un valor hexadecimal de 64 caracteres.
**Limpieza:** `DELETE /api/webhooks/:id` de las 2 suscripciones creadas → 200.

### [WHK-002] Aplica `authorize('admin','superadmin')` en las cuatro rutas

**Rol** `superadmin`, `admin`, `doctor`, `lab_technician`, `patient`, `anónimo` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** existen sesiones para `admin`, `superadmin`, `doctor`, `lab_technician` y `patient`, y una suscripcion `S` del tenant.
**Datos:** `endpoint` = `/api/webhooks` · `id` = id de `S`

1. Sin cookie de sesion, invocar `GET`, `POST`, `PUT /api/webhooks/<id>` y `DELETE /api/webhooks/<id>`.
2. Repetir los cuatro con la sesion de `patient`.
3. Repetir los cuatro con `lab_technician`.
4. Repetir los cuatro con `doctor`.
5. Repetir los cuatro con `admin`.
6. Repetir los cuatro con `superadmin`.
7. Tras el `DELETE` exitoso con `admin`, comprobar si las demas rutas siguen respondiendo igual.

**Esperado**
- Anonimo: los cuatro → **401** con `errors.UNAUTHORIZED`. En `POST` y `PUT` la validacion de cuerpo corre **antes** del `authorize`? No: `router.use(authorize(...))` esta en la linea 11, antes de las rutas de la 13 en adelante, asi que el 401 se responde sin validar el schema y **sin crear nada**.
- `patient`, `lab_technician` y `doctor`: los cuatro → **403** con `errors.FORBIDDEN`. Ninguno crea, modifica ni borra.
- `admin` y `superadmin`: los cuatro funcionan segun su caso propio. El `DELETE` con `admin` borra la suscripcion y devuelve 200.
- Tras el `DELETE`, `GET /api/webhooks` sigue en 200 (queda vacio o con lo que hubiera) y `DELETE` de ese mismo id pasa a **404** con `errors.NOT_FOUND`. El 404, no el 403, es la senal de que el authorize se supero y el recurso ya no existe.
- Ningun rolotro que `admin`/`superadmin` alcanza el controlador: el 403 se resuelve en el middleware.

**Red:** matriz de 4 rutas x 6 roles. Registrar el status exacto de cada celda; los unicos valores esperados son 401, 403, 200/201/404.
**Limpieza:** recrear la suscripcion `S` si se borro.

### [WHK-003] Crea una suscripcion y devuelve el secreto una unica vez

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** sesion de `admin` activa; el tenant tiene una suscripcion de prueba.
**Datos:** `url` = `https://example.com/hook-qa` · `events` = `["booking.created","result.ready"]` · `secret` = omitido

1. Invocar `POST /api/webhooks` con `url` y `events`, **sin** `secret`.
2. Leer el status y la envoltura de la respuesta.
3. Contar las claves del objeto `data` y anotar el valor de `secret`.
4. Medir la longitud de `secret` y comprobar si es hexadecimal.
5. Invocar `GET /api/webhooks` y buscar ese secreto en la respuesta.
6. Invocar `PUT /api/webhooks/<id>` sin cambios y buscar el secreto en la respuesta.
7. Repetir el `POST` con los mismos `url` y `events` y comparar el nuevo `secret` con el anterior.

**Esperado**
- `POST /api/webhooks` → **201** con `{ data: { ...9 claves } }`. Es el unico `201` del area.
- El objeto trae las 8 claves de la suscripcion **mas** `secret`: 9 en total.
- `secret` es una cadena de **64 caracteres hexadecimales**: `crypto.randomBytes(32).toString('hex')` (`webhooks.service.ts:92`). No lleva prefijo, ni `whsec_`, ni codificacion base64.
- El `GET` posterior **no** devuelve el secreto, y el `PUT` tampoco. Es la unica ventana para copiarlo.
- Un `POST` repetido genera un secreto **distinto** con la misma `url` y los mismos `events`: no hay deduplicacion ni restriccion de unicidad. `webhook_subscriptions` no tiene indice unico sobre `(tenant_id, url)`, asi que el mismo receptor puede quedar suscrito N veces y recibir N copias de cada evento futuro.
- `active` llega `true` sin que el cliente pueda pedirlo: el `INSERT` fija `TRUE` y `createWebhookSchema` ni siquiera ofrece el campo. Para crear inactiva hay que crear y despues hacer `PUT {active:false}`, dos llamadas.
- El cuerpo se acepta con `Content-Type: application/json`. El unico `urlencoded` del area es el webhook de Mercado Pago (WHK-016).

**Red:** `POST /api/webhooks` → 201 con `data.secret` de 64 hex. `GET /api/webhooks` → 200 sin ningun `secret`. Registrar el secreto en el archivo de resultados: es el unico momento en que existe fuera de la base.
**Limpieza:** `DELETE /api/webhooks/<id>` → 200. Anotar que el secreto sigue vivo en el receptor hasta que se revoque a mano, porque el sistema no tiene forma de invalidarlo.

### [WHK-004] Acepta un secreto de un solo caracter y lo persiste en claro

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin` activa.
**Datos:** `casos` = `secret: "a"`, `secret: "1"`, `secret: "x".repeat(32)`, `secret: ""`

1. Crear una suscripcion con `secret: "a"`.
2. Leer el `secret` devuelto y medir su longitud.
3. Repetir con `secret: "1"`.
4. Repetir con un secreto de 32 caracteres.
5. Intentar crear con `secret: ""`.
6. Intentar crear con `secret: 12345` (numero, no cadena).
7. Crear una suscripcion con un secreto elegido, guardar el `secret` que devuelve el 201 y despues
   pedir `GET /api/webhooks` y `GET /api/webhooks/:id` para comprobar si el secreto vuelve a salir.

**Esperado**
- `secret: "a"` → **201**. El unico requisito del schema es `z.string().min(1)` (`webhooks.schema.ts:15`): un caracter basta. Se acepta y se persiste tal cual.
- El `secret` devuelto es exactamente el enviado, byte a byte: no se normaliza, no se hashea, no se aleatoriza cuando el cliente lo aporta. El unico secret de 64 hex del area es el **autogenerado** (WHK-003).
- `secret: ""` → **400**. `min(1)` lo rechaza. Este es el unico valor de `secret` que falla.
- `secret: 12345` → **400** con error de tipo de Zod: el schema exige `z.string()`, y `12345` es un numero en JSON. Anotar el mensaje exacto, que sera del tipo `expected string, received number`.
- Con un secreto de 32 caracteres la suscripcion se crea igual: no hay longitud minima util (32 bytes) ni ninguna restriccion de entropia, solo `min(1)`.
- El secreto se guarda **en texto plano** en la columna `secret TEXT NOT NULL` (`db/init.sql:649`). No hay hash, cifrado ni llamada a `getEncryptionKey()`. Un `SELECT secret FROM webhook_subscriptions` devuelve el valor en claro, igual que la lista de las demas columnas sensibles del proyecto.
- El secreto **solo se devuelve una vez**, en el 201 del `POST`. `SUBSCRIPTION_COLUMNS` (`webhooks.service.ts:21`) no incluye `secret`, asi que ni el listado ni el `PUT` lo exponen. Consecuencia operativa: si el cliente pierde el 201, no hay ninguna via por API para recuperar el secreto, y como tampoco hay rotacion (WHK-009) solo queda borrarla y crear otra. Anotar el valor del paso 7 como unico lugar donde se puede leer.
- Consecuencia de seguridad que hay que registrar: la firma HMAC de WHK-014 solo tiene la fuerza del secreto elegido. Con `secret: "a"`, cualquiera que adivine un caracter puede firmar un payload como si fuese del sistema.

**Red:** 7 peticiones: 4 aceptaciones (201) y 3 rechazos (400). Verificar que el `secret` de cada 201 coincide con el enviado, y que el `GET` del paso 7 **no** incluye `secret` en ninguna fila.
**Limpieza:** `DELETE` de las 4 suscripciones creadas (pasos 1, 3, 4 y 7). Los 3 rechazos no dejan fila.

### [WHK-005] Valida `events` contra la lista de 6 y rechaza vacios y desconocidos

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin` activa.
**Datos:** `validos` = `booking.created`, `booking.cancelled`, `booking.updated`, `result.ready`, `payment.succeeded`, `patient.created` · `casos` = array vacio, `["booking.deleted"]`, `["BOOKING.CREATED"]`, `"booking.created"` (string, no array), `["result.ready","result.ready"]`, los 6 juntos

1. Crear con `events: []`.
2. Crear con `events: ["booking.deleted"]`.
3. Crear con `events: ["BOOKING.CREATED"]`.
4. Crear con `events: "booking.created"` (cadena suelta en lugar de array).
5. Crear con `events: ["result.ready", "result.ready"]` (duplicado).
6. Crear con los 6 eventos validos en un solo array.
7. Crear con los 6 validos y luego hacer `PUT` con `events: ["payment.succeeded"]`.

**Esperado**
- `events: []` → **400**. Se rechaza en dos capas: `z.array(...).min(1)` de Zod y `assertValidEvents` (`webhooks.service.ts:68`) con el mensaje `events must not be empty`. Anotar cual de los dos mensajes aparece.
- `events: ["booking.deleted"]` → **400**. El evento no existe en `WEBHOOK_EVENTS`; el mensaje de Zod cita el valor recibido.
- `events: ["BOOKING.CREATED"]` → **400**. La comparacion es **sensible a mayusculas** (`z.enum`): no hay normalizacion.
- `events: "booking.created"` (cadena) → **400** por tipo: se espera un array y llega una cadena. Lo corta `z.array(z.enum(WEBHOOK_EVENTS))` (`webhooks.schema.ts:14`); el mensaje es de Zod, no del servicio.
- `events: ["result.ready","result.ready"]` → **201**. **No hay deduplicacion**: el duplicado se guarda tal cual en el array `events TEXT[]` y queda en la suscripcion. Como la consulta de entrega usa `$2 = ANY(events)` (`webhooks.service.ts:146`), un duplicado **no** produce entrega doble: `ANY` es un test de pertenencia. El defecto es de higiene del dato, no de comportamiento.
- Los 6 eventos juntos → **201**, y `GET /api/webhooks` devuelve el array con 6 entradas en el orden enviado.
- El `PUT` con un solo evento → 200 y `GET` confirma que `events` paso a 1 elemento. El `PUT` **reemplaza** el array completo, no lo fusiona: un evento olvidado por error de tecleo se pierde en silencio.
- El `assertValidEvents` del servicio es **inalcanzable desde la API**: Zod ya rechaza cualquier valor fuera del enum antes de llegar al controller. Es defensa en profundidad, no un filtro activo. Registrar que el mensaje nunca sera el del servicio.

**Red:** 7 peticiones: 4 rechazos (400) y 3 aceptaciones (201/200). Verificar en el `GET` que el array de 6 eventos conserva el orden enviado.
**Limpieza:** `DELETE` de las 3 suscripciones creadas (pasos 5, 6 y 7). Los 4 rechazos no dejan fila.

### [WHK-006] Rechaza `url` no parseable y de esquema distinto de http/https

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin` activa.
**Datos:** `casos` = `no-es-una-url`, `ftp://example.com/hook`, `file:///etc/passwd`, `javascript:alert(1)`, `//example.com/hook`, `https://`, `http://example.com`, `https://example.com/hook?q=1#frag`

1. Crear con `url: "no-es-una-url"`.
2. Crear con `url: "ftp://example.com/hook"`.
3. Crear con `url: "file:///etc/passwd"`.
4. Crear con `url: "javascript:alert(1)"`.
5. Crear con `url: "//example.com/hook"`.
6. Crear con `url: "https://"`.
7. Crear con `url: "http://example.com/hook"` (sin TLS).
8. Crear con `url: "https://example.com/hook?q=1#frag"`.
9. Crear omitiendo `url` por completo.

**Esperado**
- `no-es-una-url` → **400** de Zod. `z.string().url('Invalid url')` (`webhooks.schema.ts:13`) corta **antes** de llegar al servicio, asi que el mensaje es el de Zod. El `new URL(url)` de `assertValidUrl` (`webhooks.service.ts:51-54`) es una segunda capa con el mismo texto, pero en este caso no llega a ejecutarse.
- `ftp://`, `file:///` y `javascript:` → **400** con `url must use http or https` (`webhooks.service.ts:56`). El mensaje es del servicio, no de Zod: `z.string().url()` los acepta porque son URL bien formadas, y es `assertValidUrl` quien restringe el esquema. Esto confirma que la validacion del servicio **si** es activa, a diferencia de `assertValidEvents`.
- `//example.com/hook` → **400**: protocolo relativo, sin esquema.
- `https://` → **400**: sin host.
- `https://example.com/hook?q=1#frag` → **201**. Query string y fragmento se aceptan y se guardan tal cual. Anotar que el receptor recibira la URL con su query, y que un fragmento nunca viaja al servidor en la entrega pero **si** queda guardado en la suscripcion.
- Omitir `url` → **400** de Zod: es obligatorio y no tiene default.
- Con `url: "http://..."` (sin TLS) la creacion es **201**: no hay requisito de HTTPS. Una suscripcion puede apuntar en claro a un receptor publico, y la entrega (WHK-014) mandaria el secreto de firma y el payload sobre HTTP sin cifrar. Registrar si esto es aceptable en el entorno de QA.

**Red:** 9 peticiones: 7 rechazos (400) y 2 aceptaciones (201). Anotar el mensaje de error literal de cada rechazo: distingue los de Zod (`Invalid url`) de los del servicio (`url must use http or https`). Las 2 aceptaciones son los pasos 7 y 8.
**Limpieza:** `DELETE` de las 2 suscripciones creadas en los pasos 7 y 8. Los 7 rechazos no dejan fila.

### [WHK-007] La proteccion SSRF rechaza localhost y los rangos privados

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** sesion de `admin` activa; el ejecutor tiene red propia que el sistema **no debe** poder alcanzar.
**Datos:** `casos` = `http://localhost/hook`, `http://127.0.0.1:3000/hook`, `http://10.0.0.5/hook`, `http://172.16.0.1/hook`, `http://172.31.255.1/hook`, `http://192.168.1.1/hook`, `http://169.254.169.254/latest/meta-data/`, `http://0.0.0.0/hook`, `http://[::1]/hook`, `http://172.15.0.1/hook`, `http://172.32.0.1/hook`

1. Crear una suscripcion por cada `url` de la lista.
2. Registrar el status de cada una.
3. Confirmar con el caso 10 y 11 que los limites del rango `172.16/12` estan donde deben.
4. Intentar alcanzar el receptor local por otra via: enviar el `url` en el `PUT` en lugar del `POST`.

**Esperado**
- Los 9 primeros casos → **400** con `url must not point to private/internal addresses (SSRF protection)` (`webhooks.service.ts:62`).
- `169.254.169.254` esta incluido: el patron `^169\.254\.` cubre el endpoint de metadatos de las nubes. Es el bloqueo mas relevante de la lista.
- `http://172.15.0.1/hook` → **201** y `http://172.32.0.1/hook` → **201**: estan **fuera** de `172.16.0.0/12`, que es el rango privado correcto. El patron `^172\.(1[6-9]|2\d|3[01])\.` esta bien construido y no sobrebloquea. Registrar estos dos 201 como **control negativo**: demuestran que el filtro no es un `172.` generico.
- `http://[::1]/hook` → **400**: los patrones `^::1$` y `^\[::1\]$` cubren el loopback IPv6. Anotar que el patron para la forma con corchetes incluye los corchetes literally, y por eso el `hostname` que entrega `new URL()` debe venir ya normalizado.
- El filtro se aplica **tambien** en el `PUT`: `assertValidUrl` se invoca en `updateSubscription:120` cuando `payload.url` viene definido. Un `PUT` con una `url` privada no puede servir de bypass.
- Ningun `400` de SSRF crea fila: `assertValidUrl` corre antes del `INSERT`. Anotarlo comparando el numero de suscripciones antes y despues de la tanda.
- El sistema **no hace resolucion DNS**: el filtro opera sobre el hostname escrito, no sobre la IP a la que resuelve. Por eso un nombre publico que resuelva a un rango privado pasa (ver WHK-008).

**Red:** 9 rechazos (400) y 2 aceptaciones (201). Comparar el conteo de suscripciones antes y despues: solo deben existir las 2 de los casos 10 y 11.
**Limpieza:** `DELETE` de las 2 suscripciones creadas.

### [WHK-008] El filtro SSRF se puede evadir con sufijos, IP decimal e IPv4 mapeada

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin` activa. Este caso **intenta crear suscripciones que apuntan a direcciones internas**: si alguna devuelve 201, el defecto queda confirmado y la fila resultante debe borrarse de inmediato.
**Datos:** `casos` = `http://127.0.0.1.example.com/hook`, `http://2130706433/hook`, `http://0x7f000001/hook`, `http://[::ffff:127.0.0.1]/hook`, `http://user:pass@127.0.0.1/hook`, `http://127.0.0.1.nip.io/hook`, `https://metadata.google.internal/hook`

1. Crear con `url: "http://127.0.0.1.example.com/hook"`.
2. Crear con `url: "http://2130706433/hook"` (127.0.0.1 en notacion decimal).
3. Crear con `url: "http://0x7f000001/hook"` (notacion hexadecimal).
4. Crear con `url: "http://[::ffff:127.0.0.1]/hook"` (IPv4 mapeada en IPv6).
5. Crear con `url: "http://user:pass@127.0.0.1/hook"` (credenciales antes del host).
6. Crear con `url: "http://127.0.0.1.nip.io/hook"` (nombre que resuelve a 127.0.0.1).
7. Crear con `url: "https://metadata.google.internal/hook"`.
8. Borrar de inmediato todas las suscripciones que hayan devuelto 201.

**Esperado**
- Los 9 patrones de `PRIVATE_IP_PATTERNS` (`webhooks.service.ts:36-46`) estan anclados con `^` y **sin `$`**, salvo `^localhost$`, `^::1$` y `^\[::1\]$`. Por eso:
  - `http://127.0.0.1.example.com/hook` → **201**. El patron `^127\.` coincide con el prefijo `127.` del hostname y da por buena una direccion publica que solo empieza igual. Es el falso positivo en sentido inverso: el filtro pasa una URL que no es privada, lo cual es inofensivo, pero **demuestra que el anclaje es de prefijo**. El caso de riesgo real es el siguiente.
  - `http://2130706433/hook` → **201**. `new URL()` normaliza el host a la cadena `2130706433`, que no encaja con ningun patron, pero `fetch` lo interpreta como `127.0.0.1`. Bypass completo del filtro contra loopback.
  - `http://0x7f000001/hook` → **201** por el mismo motivo en base hexadecimal.
  - `http://[::ffff:127.0.0.1]/hook` → **201**. El hostname queda como `[::ffff:7f00:1]`, que no coincide con `^\[::1\]$`; el rango IPv4 mapeado no esta cubierto.
- Los casos 5, 6 y 7 dependen de como separe el cliente y de la resolucion DNS; registrar el status real de cada uno sin anticiparlo. El caso 6 es el mas importante: `nip.io` es un dominio publico que resuelve a loopback, asi que un 201 aqui demuestra que **no hay resolucion DNS** en el filtro y que un atacante puede apuntar a una IP interna con un nombre legitimo. El caso 7 es el mismo ataque contra la red interna de una nube.
- Ninguno de estos 201 se detecta despues: la suscripcion queda activa y `dispatchEvent` la entregaria sin volver a validar la `url`. Como `dispatchEvent` no tiene call sites, hoy el impacto es latente, no activo.
- La anotacion importante para el informe: la proteccion **existe y es Partialmente correcta** (bloquea las 9 formas literales de WHK-007) pero **no cubre** notacion alternativa de IP, IPv4 mapeada, ni resolucion DNS. Ninguna de las dos mitades es opcional: sin validacion de DNS el filtro se puede rodear con un nombre, y sin normalizar la IP se puede rodear con notacion decimal.
- Las cabeceras `user:pass@` no se separan: `new URL()` las trata como userinfo y el hostname real sigue siendo `127.0.0.1`, que el patron deberia capturar. Registrar si el 400 ocurre; si da 201, es un bypass adicional por no inspeccionar `parsed.hostname` de forma canonica.

**Red:** registrar los 8 status. Marcar **FALLÓ (defecto de seguridad)** cualquier 201 cuya `url` resuelva a un rango privado, y numerarlos como hallazgos nuevos, no como H-NN de `90-`.
**Limpieza:** borrar **todas** las suscripciones creadas en este caso, incluidas las que dieron 201. No dejar filas que apunten a direcciones internas.

### [WHK-009] Actualiza `url`, `events` y `active`, pero no rota el secreto

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** existe una suscripcion `S` creada en este entorno, con `secret` anotado en WHK-003.
**Datos:** `id` = id de `S` · `url_nuevo` = `https://example.com/hook-qa-2` · `secret_actual` = el anotado en WHK-003

1. Invocar `PUT /api/webhooks/<id>` con solo `{ "url": "https://example.com/hook-qa-2" }`.
2. Leer la respuesta y contar sus claves.
3. Verificar con `GET /api/webhooks` que `events` y `active` siguen igual.
4. Invocar `PUT` con `{ "active": false }` y comprobar que `events` sobrevive.
5. Invocar `PUT` con `{ "secret": "otro-secreto" }`.
6. Invocar `PUT` con un cuerpo vacio `{}`.
7. Invocar `PUT` sobre un `id` inexistente, por ejemplo `999999`.
8. Invocar `PUT /api/webhooks/abc` y `PUT /api/webhooks/0`.

**Esperado**
- El `PUT` devuelve **200** con `{ data: {8 claves} }`. Las 8, no 9: la respuesta de actualizacion **no** incluye `secret`, porque `updateSubscription` devuelve `parseSubscription(...)` sin adjuntarlo (`webhooks.service.ts:131`).
- Los campos omitidos **se conservan**: el servicio lee los valores actuales y hace fallback con `??` (`webhooks.service.ts:116-118`). Un `PUT` parcial no borra `events` ni desactiva `active`.
- `active: false` se aplica y persiste. Es la **unica** via para desactivar una suscripcion: `POST` no acepta `active`.
- `PUT` con `{ "secret": "otro-secreto" }` → **400**. `updateWebhookSchema` es `strict` y **no tiene campo `secret`** (`webhooks.schema.ts:18-22`): no hay rotacion. Consecuencia operativa: si el secreto se filtra, **no hay forma de cambiarlo** desde la API. Hay que borrarla y crear otra, lo que cambia tambien el `id` y obliga a reconfigurar el receptor. Anotar esta cadena de dos pasos como el procedimiento real de revocacion.
- `PUT` con `{}` → **200** y la suscripcion queda igual, con `updated_at` refrescado. Un `PUT` vacio no es un no-op: mueve `updated_at`.
- `PUT /api/webhooks/999999` → **404** con `errors.NOT_FOUND` y el mensaje `Webhook subscription not found`, lanzado por `updateSubscription:113` tras un `SELECT` con `id` **y** `tenant_id`.
- `PUT /api/webhooks/abc` → **400** de Zod: `z.coerce.number().int().positive()` falla en el `NaN` de `"abc"`.
- `PUT /api/webhooks/0` → **400**: `positive()` rechaza el cero.
- Ningun `PUT` acepta campos desconocidos (`strict`): anadir `name` o `description` da 400. Anotar el mensaje.

**Red:** 8 pasos = 8 peticiones. 3 respuestas 200 (los `PUT` con `url`, con `active: false` y con `{}`) · 3 rechazos 400 (`secret` desconocido, `abc` y `0`) · 1 respuesta 404 (`999999`) · 1 paso mas un `PUT` con campo desconocido `name`, que tambien da 400 y por tanto suma un quinto 400. Total esperado: **3 x 200, 4 x 400, 1 x 404**. Verificar en el 200 la ausencia de `secret` y el refresco de `updated_at`.
**Limpieza:** `DELETE` de `S`.

### [WHK-010] Elimina la suscripcion y distingue 404 de 403

**Rol** `admin` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondicion:** existen 2 suscripciones `S1` y `S2` del tenant.
**Datos:** `ids` = id de `S1`, id de `S2`

1. Invocar `DELETE /api/webhooks/<id S1>`.
2. Leer el status y la forma exacta de la respuesta.
3. Invocar `GET /api/webhooks` y comprobar que `S1` ya no aparece.
4. Repetir el `DELETE` sobre `S1`.
5. Eliminar `S2` y comprobar de nuevo el listado.
6. Invocar `DELETE` con un cuerpo `{}` y con un cuerpo con datos.

**Esperado**
- El primer `DELETE` → **200** con `{ "message": "Webhook subscription deleted" }`. Es la **unica** ruta del area que responde `{message}` y no `{data}` (`webhooks.controller.ts:23`): la envoltura es inconsistente con `GET`, `POST` y `PUT`. Anotar la inconsistencia; un cliente que lea `data` recibe `undefined`.
- El mensaje es literal, en ingles, sin clave i18n ni codigo de error: los errores de este area usan `utils/errors.ts` (ingles) mientras el resto del proyecto tiene `error-codes.ts`. Registrado en la seccion 6.
- Tras el `DELETE`, `S1` desaparece del `GET`. El orden de `listSubscriptions` es `id ASC`, asi que la lista restante conserva el orden de ids.
- El segundo `DELETE` sobre `S1` → **404** con `errors.NOT_FOUND`. Como la fila ya no existe, el `DELETE ... RETURNING id` no devuelve filas y `result.rowCount === 0` lanza el error (`webhooks.service.ts:139`).
- `DELETE` con cuerpo `{}` → **200** si el id existe. La ruta no valida cuerpo, y `deleteSubscription` lo ignora. Un `DELETE` con un `id` valido y un cuerpo con campos inventados tambien lo ignora: no hay schema para el body en esta ruta.
- El borrado es **fisico**, no logico: `DELETE FROM webhook_subscriptions`. La tabla tiene `ON DELETE CASCADE` hacia `webhook_deliveries` (`db/init.sql:660`), asi que las entregas de esa suscripcion tambien se borran. Con la tabla de entregas vacia (WHK-013) no es observable, pero queda anotado: un borrado de suscripcion destruye el historico de entregas asociado.
- No hay endpoint de "desactivar sin borrar" mas alla del `PUT {active:false}` (WHK-009). Para conservar el `id` y el historico, ese es el unico mecanismo.

**Red:** `DELETE /api/webhooks/<id>` → 200 con `{message}` · 404 al repetir. Registrar que la respuesta no trae `data` y que el texto es ingles.
**Limpieza:** ninguna: las 2 suscripciones de este caso se eliminan aqui.

### [WHK-011] Aísla las suscripciones por tenant en las cuatro rutas

**Rol** `superadmin`, `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** existen dos tenants con suscripciones propias: `S1` en el tenant A (sesion `admin` de QA) y `S3` en el tenant B (sesion `superadmin`). El area depende de `19` (multi-tenancy y aislamiento).
**Datos:** `id_A` = id de `S1` · `id_B` = id de `S3` · `password_superadmin` = `$SUPERADMIN_PASSWORD`

1. Crear `S1` con el `admin` del tenant A.
2. Crear `S3` con la sesion de `superadmin` del tenant B.
3. Con el `admin` del tenant A, invocar `GET /api/webhooks` y listar los ids devueltos.
4. Con el `admin` del tenant A, invocar `PUT /api/webhooks/<id_B>` con `{ "active": false }`.
5. Con el `admin` del tenant A, invocar `DELETE /api/webhooks/<id_B>`.
6. Con la sesion de `superadmin` del tenant B, confirmar el estado de `S3` tras los pasos 4 y 5.
7. Crear una suscripcion con el `admin` del tenant A pero **cambiando la cabecera `X-Tenant-Id`** al tenant B.
8. Invocar `GET /api/webhooks` con la sesion de `superadmin` y `X-Tenant-Id` del tenant A.

**Esperado**
- El `GET` del `admin` del tenant A devuelve **solo** `S1`. `listSubscriptions` filtra por `req.tenant_id`, que `tenantMiddleware` toma de `user.tenant_id` **antes** que de la cabecera (`tenant.middleware.ts`: `userTenantId || headerTenantId`). La sesion gana: una cabecera manipulada no cambia el tenant.
- `PUT /api/webhooks/<id_B>` con el `admin` del tenant A → **404** con `Webhook subscription not found`, **no** 403. El `SELECT` de `updateSubscription:110` filtra por `id` **y** `tenant_id`, asi que una fila ajena es indistinguible de una inexistente. Es el comportamiento correcto para no revelar la existencia de recursos ajenos, y hay que anotarlo como tal: el 404 aqui **no** es un fallo de autorizacion.
- `DELETE /api/webhooks/<id_B>` con el `admin` del tenant A → **404** por el mismo mecanismo (`RETURNING id` vacio, `rowCount === 0`).
- `S3` sigue intacta tras los pasos 4 y 5: `active: true` y presente en el listado del tenant B. Esta es la verificacion de que el 404 fue de aislamiento y no de fallo.
- El paso 7 (crear con cabecera ajena) → la suscripcion se crea en el tenant **A**, no en el B, y devuelve 201. Anotar el `tenant_id` de la respuesta para demostrarlo.
- El paso 8 devuelve las suscripciones del tenant **A**, no las de B, aunque la cabecera diga B. La sesion manda en los dos sentidos.
- `superadmin` **no** puede leer otros tenants en esta area: no hay selector ni parametro `tenant_id` en el listado. Para operar sobre otro tenant hay que cambiar de sesion. Es una limitacion real frente al area `26`, donde el superadmin si recibe un selector de clinica. Queda anotado en la seccion 6.

**Red:** los 4 endpoints de cada tenant solo devuelven filas propias. Registrar los `tenant_id` de las 3 primeras filas de cada respuesta, y el status 404 de los pasos 4 y 5.
**Limpieza:** `DELETE` de `S1` y de la suscripcion creada en el paso 7, con sus respectivas sesiones.

### [WHK-012] Ningun evento llega a la cola: `dispatchEvent()` no tiene call site

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** existe una suscripcion activa `S1` con `events` = los 6 validos, y un receptor publico que responde 200.
**Datos:** `eventos` = los 6 de `WEBHOOK_EVENTS` · `receptor` = endpoint publico de pruebas

1. Buscar en todo el codigo las llamadas a `dispatchEvent` y contar las apariciones.
2. Crear una cita, una cancelacion y un resultado de laboratorio en la UI, con la suscripcion activa.
3. Tras cada accion, consultar la cola y contar las filas en `jobs` con `type = 'webhook:dispatch'`.
4. Consultar el log del servidor buscando `Webhook delivered` y `No handler registered for type`.
5. Repetir el paso 2 con `payment.succeeded` y `patient.created` como eventos suscritos.
6. Invocar `dispatchEvent` de forma indirecta: ninguna via de la API lo expone. Anotar que **no existe** endpoint que lo dispare.
7. Confirmar que el worker si esta registrado: buscar `registerWebhookWorker` en el arranque.

**Esperado**
- `dispatchEvent` aparece **una sola vez** en todo `src/`: su propia definicion en `webhooks.service.ts:142`. **Cero** llamadas. Ninguna creacion de cita, cancelacion, resultado ni pago lo invoca.
- Tras las 5 acciones de negocio de los pasos 2 y 5, `jobs` tiene **0** filas con `type = 'webhook:dispatch'`. No hay entrega, no hay cola, no hay nada que reintentar.
- El log del servidor **no** contiene ni `Webhook delivered` ni `No handler registered for type`. La segunda ausencia es la significativa: como `dispatchEvent` no llega a `enqueueJob`, ni siquiera se registra el descarte.
- **El worker si esta registrado**: `registerWorkers()` lo llama en `queue.service.ts:151-152` con un `require` perezoso, y `app.ts:458` lo invoca en el arranque. El pipeline de entrega esta completo y alimentado en su extremo receptor; lo que falta es el unico emisor. Por eso el defecto no es de infraestructura: una fila en `jobs` se procesaria correctamente.
- Como el area depende de `15` (SaaS y checkout), este caso es el que explica por que el checkout del area 15 no puede completarse end-to-end con notificaciones: aunque `payment.succeeded` este suscrito, la suscripcion nunca se dispara.
- No existe ninguna via, ni publica ni interna, para forzar un evento. `dispatchEvent` no se exporta en ningun router y no hay script ni CLI que lo llame. Un caso de entrega **no se puede ejecutar** con el codigo actual.
- Consecuencia para la validacion: los casos WHK-014 y WHK-015 (firma y reintentos) no son ejecutables. Se marcan `BLOQUEADO`, no `FALLÓ`, y no se inventan llamadas a `dispatchEvent` para forzarlos: hacerlo requiere el mismo `secret` y el mismo receptor, y escribiria filas en `jobs` desde fuera del producto.

**Red:** ninguna peticion de entrega. La evidencia es `GET` sobre `jobs` filtrado por `type` y los logs del servidor. Registrar el recuento exacto de filas en ambos momentos.
**Limpieza:** borrar `S1`. **No** insertar filas en `jobs` a mano para simular una entrega: contaminaria la unica senal fiable del area.

### [WHK-013] `webhook_deliveries` no se escribe y no hay endpoint que la lea

**Rol** `admin` · **Ruta** `—` · **P0** · **Resultado** `______`
**Precondicion:** el despliegue tiene la tabla `webhook_deliveries` creada por `db/init.sql:657-670`.
**Datos:** `columnas` = `status` (`pending`/`delivered`/`failed`), `attempts`, `last_attempt_at`, `next_attempt_at`, `response_status`, `response_body` · `invocaciones` = 1 suscripcion activa x 6 eventos

1. Consultar el recuento de filas en `webhook_deliveries`.
2. Buscar en todo `src/` cualquier `INSERT`, `UPDATE` o `SELECT` sobre `webhook_deliveries`.
3. Intentar leer entregas por API: `GET /api/webhooks/:id/deliveries` y `GET /api/webhooks/deliveries`.
4. Intentar crear una entrega por API: `POST /api/webhooks/:id/deliveries`.
5. Invocar los 4 endpoints del area con un `id` de suscripcion existente.
6. Revisar si el indice o las consultas del area tocan `webhook_deliveries`.
7. Revisar si algun script de migracion o seed la puebla.

**Esperado**
- `webhook_deliveries` tiene **0 filas**, y sigue en 0 tras WHK-012. La tabla esta definida con 13 columnas, un `CHECK` de `status` sobre `pending`/`delivered`/`failed`, y **`ON DELETE CASCADE`** desde `webhook_subscriptions`, pero **ningun modulo la escribe**: no hay un solo `INSERT`, `UPDATE` ni `SELECT` sobre ella en todo `src/`.
- Los intentos de leer entregas por API dan **404** en las tres variantes: las unicas rutas son las 4 de `webhooks.routes.ts`, y `/:id` se resuelve contra `webhook_subscriptions`. `GET /api/webhooks/:id/deliveries` cae en el `PUT`/`DELETE`? No: un `GET` a un path mas largo no casa con ninguna ruta, asi que responde **404** de Express, con la envoltura de error global y no con un mensaje de webhooks. Anotar el cuerpo exacto de ese 404, porque es la firma de "ruta inexistente" y no de "recurso ausente".
- **No hay ninguna superficie de observabilidad de entregas.** El unico rastro de un envio exitoso o fallido es el log del servidor: `Webhook delivered: <evento> -> <url> (subscription <id>)` o `Webhook delivery failed` con el mensaje del error (`webhooks.service.ts:193` y `195`). No hay `response_status` ni `response_body` guardados en ningun sitio: `dispatchWebhook` lee `response.ok` y descarta el cuerpo.
- Los campos de reintento de la tabla (`attempts`, `next_attempt_at`, `last_attempt_at`) no los usa nadie: el control de reintentos vive en la tabla `jobs` (`attempts`, `next_retry_at`, `max_attempts`). El modelo de `webhook_deliveries` esta **diseñado y desconectado**: describe un sistema de entregas con su propio estado y su propio backoff que el codigo no implementa.
- `response_status` y `response_body` quedan siempre `NULL` aunque se entregaran eventos, porque `dispatchWebhook` no los escribe. Aunque WHK-012 se resolviera, el diagnostico de por que fallo un envio seguiria limitado a los logs.
- El `CHECK` de `status` limitando a tres valores, junto con el `CASCADE`, sugiere que la tabla se creo anticipating un modulo de entregas que nunca llego. Es codigo muerto de esquema, no de aplicacion: sobrevive a los refactors porque nadie lo lee ni lo migra.

**Red:** los 3 intentos de entrega → **404** de Express, sin coincidencia de ruta. Registrar el cuerpo de la respuesta para distinguirlo del 404 de `webhooks.service.ts`.
**Limpieza:** ninguna.

### [WHK-014] La firma HMAC cubre una cadena distinta del cuerpo enviado

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** se requiere un receptor publico que registre cabeceras y cuerpo. WHK-012 impide la entrega por via natural, asi que este caso verifica la **formula** contra el codigo, no una entrega real.
**Datos:** `secret` = el anotado en WHK-003 · `evento` = `booking.created` · `payload` = `{"id":1,"status":"confirmed"}` · `cabeceras` = `X-Webhook-Signature`, `X-Webhook-Event`, `X-Webhook-Timestamp`

1. Localizar en el codigo la construccion del cuerpo y la de la firma, y anotar las dos cadenas literales.
2. Calcular a mano `sha256(<timestamp>.<JSON.stringify({event,payload})>)` con el `secret` conocido y un `timestamp` fijo.
3. Reconstruir el cuerpo que se enviaria: `JSON.stringify({event, payload, timestamp})`.
4. Comparar ambas cadenas y enumerar las diferencias.
5. Firmar **el cuerpo** entero con el mismo secreto, en lugar de la cadena del paso 2.
6. Registrar el formato de la cabecera `X-Webhook-Signature`.
7. Anotar el timeout del `fetch` y si hay reintento dentro de la propia funcion.

**Esperado**
- El cuerpo se construye como `JSON.stringify({ event, payload, timestamp })` (`webhooks.service.ts:172`) y la firma como `sha256(\`${timestamp}.${JSON.stringify({ event, payload })}\`)` (`webhooks.service.ts:173-174`).
- **La firma no cubre el cuerpo.** Cubre el timestamp y una serializacion de `{event, payload}` que **excluye** `timestamp`, mientras el cuerpo si lo incluye. Un receptor que verifique `sha256(cuerpo_completo)` **no** coincide; uno que verifique `sha256(ts + "." + JSON.stringify({event,payload}))` coincide solo si reconstruye el JSON con **exactamente el mismo orden de claves** que el servidor. `JSON.stringify` respeta el orden de insercion del objeto, asi que un receptor en Go, Java o Python que serialize el mapa en otro orden produce una firma distinta y rechaza entregas legitimas. Esto es un fallo de interoperabilidad de la especificacion, no del HMAC: SHA-256 es correcto, la **canonicalizacion no esta definida** para el consumidor.
- `X-Webhook-Signature` lleva el prefijo `sha256=` delante del hex: `sha256=<64 hex>` (`webhooks.service.ts:181`). El receptor debe quitar el prefijo antes de comparar, y el valor de la cabecera no es un HMAC "crudo".
- Las otras dos cabeceras son `X-Webhook-Event: <evento>` y `X-Webhook-Timestamp: <ISO 8601>`, derivados de `new Date().toISOString()`. Sirven para detectar entregas reintentadas, pero **no hay`replay protection`**: nada obliga a rechazar un timestamp antiguo, asi que una firma capturada se puede reenviar indefinidamente. Anotarlo como hueco.
- El `fetch` usa `AbortSignal.timeout(10000)`: 10 segundos de timeout por intento. Un receptor que tarde mas se cuenta como fallo y entra en el backoff de WHK-015.
- `dispatchWebhook` **no reintenta por si misma**: hace un unico intento y, si `!response.ok` o hay excepcion, relanza el error para que la cola lo reintente. El estado 2xx/3xx es exito; cualquier 4xx/5xx es fallo. Un 410 del receptor (suscripcion cancelada) se reintenta igual que un 500, tres veces.
- El secreto viaja en la cabecera de firma y en el cuerpo de la cola, pero **nunca en el `body` HTTP** que ve el receptor. Correcto.
- Al no haber entrega posible (WHK-012), el caso se marca **`BLOQUEADO`** con el motivo, y la verificacion de la formula se documenta por lectura de codigo. No se marca `FALLÓ` ni `PASÓ`: no se ha ejercitado.

**Red:** ninguna. La evidencia es la lectura de `webhooks.service.ts:164-200` y el calculo manual de los pasos 2 y 5, que deben diferir.
**Limpieza:** ninguna.

### [WHK-015] El backoff de la cola es de 3 intentos y no distingue errores permanentes

**Rol** `admin` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondicion:** se requiere un receptor publico capaz de devolver 500 de forma controlada. WHK-012 impide encolar entregas por via natural.
**Datos:** `backoff` = 30 s, 120 s, 480 s · `max_attempts` = 3 · `tipos_de_job` = `webhook:dispatch`, `report:generate`, `email:send`

1. Localizar `BACKOFF_DELAYS` y `POLL_INTERVAL_MS` en `queue.service.ts`.
2. Anotar el intervalo de sondeo del procesador y el numero maximo de intentos.
3. Localizar la condicion que mueve un job a `dead` y la que programa el siguiente reintento.
4. Buscar si la cola distingue un error 4xx de uno 5xx al decidir reintentar.
5. Comprobar si un job sin handler registrado se inserta o se descarta.
6. Verificar si el secreto del webhook queda persistido en `jobs.data`.
7. Comprobar si existe endpoint para listar, reintentar o purgar jobs.

**Esperado**
- `BACKOFF_DELAYS = [30_000, 120_000, 480_000]` ms (`queue.service.ts:16`) y `POLL_INTERVAL_MS = 2000` (`queue.service.ts:15`): el procesador sondea la cola **cada 2 segundos**, con tres reintentos espaciados 30 s, 120 s y 480 s tras el primer fallo. El backoff total antes de morir es de unos 10 minutos.
- `max_attempts` es **3** en la tabla `jobs` (`db/init.sql:795`) y la condicion de muerte es `attempts >= 3` (`queue.service.ts:111`), que ademas **notifica a un administrador** (`logger.error` mas una notificacion con el id del job, `queue.service.ts:116-121`). El unico efecto de un webhook que nunca entrega es un aviso, no una perdida silenciosa.
- **La cola no distingue tipos de error.** `dispatchWebhook` lanza un `Error` con el texto `Webhook delivery failed: HTTP <status>` y el processor aplica el mismo backoff para un **404** del receptor (URL eliminada) que para un **500** temporal. Un 404 o un 410 son errores permanentes y se reintentan 3 veces sin motivo; un 503 con `Retry-After` se reintenta con el backoff fijo, ignorando la cabecera. Anotarlo: el area no implementa clasificacion de errores.
- `addJob` **descarta silenciosamente** el job si no hay handler registrado: `logger.warn` y `return` sin `INSERT` (`queue.service.ts:28-31`). Si `registerWorkers()` no se hubiera ejecutado, cada evento se perderia sin fila en `jobs` y sin otra traza que ese warning.
- **El `secret` se persiste en `jobs.data` en texto plano**: `addJob` serializa todo el `data` del job, y `dispatchEvent:151-158` incluye `secret: row.secret` (`webhooks.service.ts:154`). Cada entrega encolada deja una **segunda copia** del secreto en la tabla `jobs`, en JSONB, y esa copia no se purga al completar el job. Con el area activa, el secreto quedaria replicado en `webhook_subscriptions` y en `jobs`, y solo en la primera tabla se podria rotar (y no se puede, WHK-009).
- No hay **idempotencia**: el payload no lleva id de evento ni de entrega, asi que un reintento reenvia un evento indistinguible del original. Un receptor que procese `booking.created` dos veces creara dos reservas. La mitigacion completa del lado del receptor.
- No hay endpoint para listar, reintentar a mano ni purgar `jobs`. El operador solo tiene los logs y el aviso al administrador.
- Al no poder encolar entregas (WHK-012), este caso queda **`BLOQUEADO`** con la verificacion hecha por lectura de codigo.

**Red:** ninguna. La evidencia es la lectura de `queue.service.ts` y `db/init.sql:789-801`.
**Limpieza:** ninguna.

### [WHK-016] El webhook de Mercado Pago es publico y no verifica firma

**Rol** `anónimo` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** el despliegue tiene o no tiene `MERCADOPAGO_ACCESS_TOKEN` configurado. Registrar cual de los dos escenarios esta activo antes de empezar: determina el status esperado del paso 2.
**Datos:** `casos` = cuerpo vacio, `{data:{id:"123"}}`, `{data:{id:"abc"}}`, `{type:"test"}`, `?type=payment&data.id=456`, `?type=payment&data.id=99999999`

1. Invocar `POST /api/saas/webhook/mercadopago` sin sesion y sin `X-Tenant-Id`, con un cuerpo vacio.
2. Repetir con `{ "data": { "id": "123" } }`.
3. Repetir con `{ "data": { "id": "abc" } }`.
4. Repetir con `{ "type": "test" }`.
5. Invocar con los parametros en la query: `?type=payment&data.id=456`.
6. Invocar con `?type=payment&data.id=99999999` (pago inexistente).
7. Enviar el cuerpo como `application/x-www-form-urlencoded` en lugar de JSON.
8. Repetir el paso 2 tres veces seguidas con el mismo id.

**Esperado**
- La ruta es `router.post('/webhook/mercadopago', urlencoded({ extended: false }), saasController.mercadopagoWebhook)` (`saas.routes.ts:25`) y esta en `PUBLIC_PATHS` (`tenant.middleware.ts:30`). No hay sesion, no hay tenant y no hay token: cualquier anonimo puede invocarla. Es obligatorio que lo sea, porque Mercado Pago no tiene sesion del sistema.
- **Sin `MERCADOPAGO_ACCESS_TOKEN`**, el paso 1 → **200** con `{ "received": true, "mode": "stub" }` (`saas.controller.ts:91-95`). El endpoint **reconoce y descarta** toda notificacion sin tocar la suscripcion. Registrar el texto `mode: "stub"` como evidencia del modo degradado: es el mismo aviso que `app.ts:100` expone en el health check.
- **Con el token configurado**, el paso 1 → **200** con `{ "received": true }` sin `mode`. El `type` se resuelve por `body.type ?? body.topic ?? query.type ?? query.topic ?? 'payment'`, asi que un cuerpo vacio se trata como `payment` y cae en el camino que busca un id.
- Los pasos 2, 3, 5 y 6: si no hay `paymentId` resoluble → **400** con `{ "error": "MERCADOPAGO_BAD_REQUEST" }`. Un id de pago que existe pero no pertenece a ninguna suscripcion → el `fetchPayment` lanza `PAYMENT_NOT_FOUND`, que se captura y responde **200** con `{ "received": true }` (`saas.controller.ts:123-125`): un pago inexistente se **reconoce** para no provoke reintentos de Mercado Pago. Anotar el status real de cada uno, porque difieren entre modo stub y modo configurado.
- El paso 4 (`type: "test"`) → **200** y se registra `topic 'test' no requiere procesamiento` (`saas.controller.ts:119`). Los topicos que no son `payment` se confirman sin hacer nada.
- **No se verifica ninguna firma.** El codigo no lee la cabecera de secreto que Mercado Pago envia ni valida `x-signature`/`x-hash`. Con el token configurado, cualquiera que conozca un `paymentId` valido puede disparar `handleMercadoPagoPaymentApproved` y activar una suscripcion. Anotar como **hallazgo de seguridad nuevo**, no cubierto por los H-NN de `90-`.
- El paso 7 es relevante: la ruta declara `urlencoded({ extended: false })`, asi que el cuerpo llega parseado como `application/x-www-form-urlencoded` y **no** como JSON. Si se envia JSON, `req.body` queda vacio y el `type` resuelve a `payment` sin id → 400. Este detalle condiciona como Mercado Pago debe estar configurado para que el endpoint funcione.
- El paso 8: el endpoint **no es idempotente** por si mismo, pero `handleMercadoPagoPaymentApproved` busca por `mercadopago_payment_id` y es idempotente en la practica. Tres notificaciones con el mismo id no deben crear tres suscripciones. Verificar que el estado de la suscripcion no cambia entre la primera y la tercera.
- Este caso es la frontera con el area `15`: el checkout de Mercado Pago no puede completarse end-to-end si `MERCADOPAGO_NOTIFICATION_URL` no apunta a un destino publico alcanzable. Si no hay token, los pasos de pago quedan `BLOQUEADO` y el resto de este caso sigue siendo ejecutable.

**Red:** `POST /api/saas/webhook/mercadopago` → 200 stub, 200 acknowledged, 400 `MERCADOPAGO_BAD_REQUEST` o 500 `Webhook processing failed`. Registrar el status de cada uno de los 8 pasos y en que modo se ejecutaron.
**Limpieza:** si el paso 2 llego a activar una suscripcion en el area `15`, revertirla con `PATCH /api/saas/subscription` segun el caso correspondiente del area `15`. Anotar el `subscription_id` afectado.

---

## 5. Defectos conocidos a verificar primero

`01-RUTA-DE-PRUEBAS.md:168-169` declara para el area `28` un "hallazgo estructural conocido": `dispatchEvent()` nunca se invoca, y por eso `webhook_deliveries` no tiene una sola escritura y los casos de entrega observaran `0` entregas. No tiene identificador H-NN en `90-HALLAZGOS-CODIGO.md`, asi que se documenta aqui con su referencia de ruta, igual que los demas.

| Defecto | Caso que lo ejercita | Verificar |
|---|---|---|
| Sin dispatch: `dispatchEvent` sin call sites | WHK-012, WHK-014, WHK-015 | `webhooks.service.ts:142` no la invoca nadie; 0 filas en `jobs` tras cualquier accion de negocio |
| Entregas sin registro | WHK-013 | `webhook_deliveries` no tiene un solo `INSERT`/`UPDATE`/`SELECT` en `src/`; el estado real esta solo en logs |
| Firma no interoperable | WHK-014 | Se firma `ts.JSON({event,payload})` y se envia `JSON({event,payload,ts})`: el receptor debe adivinar la canonicalizacion |
| Sin rotacion de secreto | WHK-003, WHK-009 | `createWebhookSchema` si acepta `secret`, `updateWebhookSchema` no; no hay via de revocacion |
| Sin superficie de UI | WHK-001, WHK-003 | No existe `frontend/src/modules/webhooks` ni ruta en `AppRouter.tsx`: el secreto se ve una vez y sin interfaz |
| Sin replay protection | WHK-014 | `X-Webhook-Timestamp` viaja pero nada obliga a rechazar un timestamp antiguo |
| Errores 4xx indistinguishable de 5xx | WHK-015 | El backoff es el mismo para un 404 permanente que para un 500 temporal |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: <descripción de la sección 6>)`, no como
> hallazgo nuevo. WHK-012, WHK-014 y WHK-015 tienen como resultado esperado `BLOQUEADO`, no `FALLÓ`:
> la ausencia de dispatch es una dependencia interna ausente, no un fallo de ejecucion.

## 6. Huecos conocidos

- **La integracion saliente no existe en la practica.** El CRUD, el worker, la firma y el backoff estan
  escritos; el emisor no. Ningun evento de negocio produce una entrega, y **no hay ninguna via** —
  ni endpoint, ni script, ni CLI — para dispararlos a mano.
- **`webhook_deliveries` es esquema muerto.** 13 columnas, un `CHECK` de estado y un `CASCADE`
  descreben un modulo de entregas con su propio backoff que el codigo nunca implemento: el control de
  reintentos real esta en `jobs`. Es deuda que sobrevive porque nadie la lee ni la migra.
- **No hay observabilidad de entregas.** Un envio fallido solo existe en el log del servidor.
  `response_status` y `response_body` se predefined en el esquema y no los rellena nadie, asi que
  un receptor que responde `400 {"error":"..."}` deja al operador sin la causa.
- **La firma no define una canonicalizacion que un receptor pueda replicar.** El cuerpo enviado y
  la cadena firmada son distintos objetos, y el orden de claves del `JSON.stringify` es
  implementation-defined en la practica para cualquier consumidor en otro lenguaje.
- **No hay proteccion contra replay.** El timestamp viaja en cabecera, pero no hay ventana de
  validez ni nonce, y el payload no lleva id de evento. Un reintento y un atacante indistinguibles.
- **Sin idempotencia en el payload.** Un reenvio tras un fallo de red se procesa como un evento
  nuevo. La deduplicacion queda enteramente en el receptor.
- **El secreto se replica en dos tablas y no se puede rotar.** Vive en `webhook_subscriptions.secret`
  en claro y, con el area activa, en `jobs.data` en claro. No hay `PUT` que lo cambie.
- **El filtro SSRF es incompleto en tres vias:** notacion decimal y hexadecimal de IP, IPv4 mapeada
  en IPv6, y ausencia de resolucion DNS. Los tres permiten apuntar a loopback, a la red interna y al
  endpoint de metadatos de la nube usando un nombre publico legitimo.
- **La validacion de `url` no exige HTTPS.** Una suscripcion en claro expone el payload y la
  cabecera de firma.
- **Sin UI y sin paging.** No hay modulo frontend, y `GET /api/webhooks` no pagina ni trae `total`.
  Con muchas suscripciones la respuesta crece sin limite y el operador no tiene donde verlas.
- **La envoltura de respuesta es inconsistente:** `{data}` en `GET`/`POST`/`PUT`, `{message}` en
  `DELETE`, y texto en ingles desde `utils/errors.ts` mientras el resto del proyecto usa
  `error-codes.ts` con claves `WEBHOOK_*`.
- **Sin cuota ni limpieza.** No hay limite de suscripciones por tenant, ni de eventos, ni purga de
  `jobs` completados, ni de suscripciones inactivas.
- **El webhook de Mercado Pago no verifica firma** y acepta notificaciones de cualquier emisor que
  conozca un `paymentId`. Su unica mitigacion es que el pago se consulte contra la API de Mercado
  Pago, lo que obliga al atacante a conocer un id real y existent.

## 7. Resultado del area

Ejecutar los 16 casos en el orden indicado. WHK-001 a WHK-011 y WHK-016 son de API y pueden ir en
paralelo entre tenants distintos. WHK-012 a WHK-015 tocan la entrega y deben ir **en serie**, con
WHK-012 primero: si confirma que no hay dispatch, los tres siguientes quedan `BLOQUEADO` y no deben
intentarse.

| Resultado | Casos | Cantidad |
|---|---|---:|
| `PASÓ` | — | 0 |
| `FALLÓ` | — | 0 |
| `BLOQUEADO` | — | 0 |
| `N/A` | — | 0 |
| `OMITIDO` | — | 0 |
| **Total** | WHK-001 … WHK-016 | **16** |

Al cerrar el area, responder ademas:

| Pregunta | Respuesta |
|---|---|
| ¿Cuantos eventos acepta la API y cuales son? | |
| ¿Cuantas llamadas tiene `dispatchEvent` en todo el codigo? | |
| ¿Cuantas filas hay en `jobs` con `type = 'webhook:dispatch'` tras crear una cita? | |
| ¿Cuantas filas tiene `webhook_deliveries`? | |
| ¿El secreto aparece en algun `GET` o `PUT`, o solo en el `POST` que lo crea? | |
| ¿Se puede cambiar el secreto de una suscripcion por API? | |
| ¿Cual es la longitud del secreto autogenerado? | |
| ¿Que `url` pasan el filtro SSRF y apuntan a un rango privado? | |
| ¿La firma se puede verificar con el cuerpo recibido tal cual? | |
| ¿Cuantos intentos y con que esperas reintenta la cola? | |
| ¿Hay alguna interfaz de usuario para las suscripciones? | |
| ¿El webhook de Mercado Pago verifica la firma del emisor? | |

---

*Alcance: el CRUD de `GET/POST/PUT/DELETE /api/webhooks` con su validacion de esquema, su filtro
SSRF y su aislamiento por tenant; el camino de entrega `dispatchEvent` → cola → `dispatchWebhook`
con firma HMAC, incluidos su formula, su backoff y su falta de registro; y la recepcion del webhook
publico `POST /api/saas/webhook/mercadopago`. 16 casos, capa C3, frecuencia quincenal, dependencia
`15`. Prefijo `WHK`. Sin hallazgos H-NN aplicables en `90-HALLAZGOS-CODIGO.md`. Sin casos
destructivos. Revisión: 2026-10-01.*

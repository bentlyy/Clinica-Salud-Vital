# 30 — Seguridad transversal

> Cubre las defensas que aplican a toda la API y no a un modulo concreto: proteccion CSRF, cabeceras de
> seguridad y CSP, limite de peticiones por IP, bloqueo de cuenta por intentos fallidos, cookies de
> sesion, validacion y sanitizacion de entrada, anti-enumeracion de credenciales y aislamiento horizontal
> entre pacientes.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `30` | `SEC` | C4 | Mensual | 24 | `10-`, `19-` | — |

## 1. Que cubre

- Cookie `csrf_token`: emision, flags y validacion del encabezado `X-CSRF-Token` en metodos mutantes.
- CSP y el resto de cabeceras de Helmet, incluida la lista de permisos y el colapso de parametros
  duplicados.
- Los cinco limitadores por IP: global, de autenticacion, de lookup de RUT, de reserva de invitado y de
  autenticacion contra la direccion de red en la que se confie.
- Bloqueo de cuenta tras 5 intentos fallidos, con 15 minutos de duracion.
- Cookies de sesion `access_token` y `refresh_token`, con sus flags y su expiracion.
- Validacion de esquema Zod, rechazo de campos desconocidos y sanitizacion de HTML.
- Validacion del digito verificador del RUT.
- Anti-enumeracion en `forgot-password` y en el mensaje de login.
- Aislamiento horizontal de expedientes clinicos y de la exportacion de datos.
- Validacion de variables de entorno sensibles en el arranque.
- Limite de rango en la descarga del calendario `.ics`.

No cubre la CSP de desarrollo ni los flujos de recuperacion de contrasena con correo real, que dependen
de `EMAIL_TEST`.

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `cualquiera` (autenticado) | — | todos los de la tabla siguiente |
| `anónimo` | `/login`, `/register`, `/booking` | `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/refresh`, `GET /api/calendar/doctor/:doctorId/ics`, `GET /api/guest/bookings/:rut` |
| `patient` | `/patient/clinical-records` | `GET /api/clinical-records/:id`, `POST /api/clinical-records`, `GET /api/export/patients/:id` |
| `doctor` | `/calendar` | `GET /api/calendar/doctor/:doctorId/ics`, `POST /api/clinical-records` |
| `admin` | `/settings` | `GET /api/laboratory/dashboard` |
| `superadmin` | — | validacion de entorno en el arranque |

Los endpoints que se miden desde un `curl` con cabeceras manuales necesitan la cookie `csrf_token`
vigente, excepto en el caso deliberado de SEC-003.

## 3. Precondiciones de datos

- `NODE_ENV` y los valores de `JWT_SECRET`, `COOKIE_SECRET`, `AUDIT_HMAC_SECRET` y `DATABASE_URL`
  anotados antes de empezar, porque SEC-023 los manipula.
- Una IP de controlKnown para el navegador y la direccion que la aplicacion cree estar viendo (SEC-012).
- Un par de credenciales valido de un usuario de prueba, con su `users.id`, para los casos de lockout y de
  enumeracion. No usar una cuenta real.
- Una segunda cuenta de la misma clinica y un paciente de otra clinica, para los casos de aislamiento.
- Un paciente con `GET /api/clinical-records/:id` accesible y otro con un `id` ajeno conocido, con un
  expediente clinico del area `21-`.
- Un `doctorId` con agenda para SEC-024, y un tenant con la feature `laboratory` y otro sin ella para
  SEC-011 (depende del area `19-` y `15-`).
- Registro de red y de consola abierto desde antes de la primera peticion en todos los casos por red.
- Herramienta de peticiones (cliente HTTP o consola) capaz de fijar cabeceras y cookies a mano, para
  SEC-002, SEC-003 y SEC-012.

## 4. Casos

### [SEC-001] Emitir la cookie csrf_token y comprobar sus flags

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** el navegador esta limpio, sin la cookie `csrf_token`.
**Datos:** cookie `csrf_token` · `X-CSRF-Token`

1. Abrir la aplicacion sin sesion y esperar la primera peticion.
2. Listar las cookies del origen y localizar `csrf_token`.
3. Leer sus atributos en el panel de almacenamiento.
4. Anotar su valor y su longitud en caracteres.
5. Recargar con `F5` y comprobar si el valor cambia.

**Esperado**
- La cookie `csrf_token` existe tras la primera peticion y tiene `httpOnly` en `false`, para que el
  cliente pueda leerla y enviarla en la cabecera.
- `sameSite` es `lax`, `path` es `/` y la duracion maxima es de 24 horas.
- `secure` es `true` solo con `NODE_ENV=production`; en desarrollo es `false`, y por eso la cookie viaja
  en claro por HTTP local.
- El valor es una cadena hexadecimal de 48 caracteres, no un JWT ni un identificador de sesion.
- Tras `F5` el valor se mantiene mientras la cookie no expire: no se regenera en cada peticion.

**Red:** la primera peticion que emite la cookie es un metodo seguro. Verificar en la respuesta el
`Set-Cookie` con los cuatro atributos del paso 3.
**Limpieza:** borrar la cookie `csrf_token` del navegador.

### [SEC-002] Rechazar una mutacion con un X-CSRF-Token que no coincide con la cookie

**Rol** `patient` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** el navegador tiene la cookie `csrf_token` vigente y una sesion de `patient` valida.
**Datos:** token valido de la cookie · token alterado · encabezado ausente

1. Emitir una peticion mutante con el `X-CSRF-Token` correcto.
2. Emitir la misma peticion con el `X-CSRF-Token` alterado en su ultimo caracter.
3. Emitir la misma peticion sin el encabezado `X-CSRF-Token`.
4. Emitir la misma peticion con el encabezado vacio.
5. Anotar el status y el cuerpo de las cuatro respuestas.

**Esperado**
- El paso 1 pasa el filtro y llega al controlador: es el camino normal de la aplicacion.
- Los pasos 2, 3 y 4 -> 403 con el mensaje `CSRF token mismatch`.
- El mensaje es identico en los tres rechazos, para no distinguir "sin token" de "token incorrecto".
- Ninguno de los tres rechazos modifica datos: verificar que la entidad del paso 1 no cambio en el
  paso 2.
- El 403 no filtra el valor esperado del token.

**Red:** los cuatro status, uno de exito y tres 403. Verificar que el 403 se produce antes de tocar la
base de datos, mirando que no hay ninguna peticion a la base de datos en el log del servidor para los
pasos 2 a 4.
**Limpieza:** deshacer la mutacion del paso 1.

### [SEC-003] Comprobar que una mutacion sin cookie previa atraviesa el filtro CSRF

**Rol** `cualquiera` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** el cliente HTTP no tiene ninguna cookie `csrf_token`; hay sesion o la ruta es publica.
**Datos:** peticion `POST` sin cookie `csrf_token` · peticion `POST` con `csrf_token` ajena

1. Emitir una peticion `POST` sin ninguna cookie, sin encabezado `X-CSRF-Token`.
2. Anotar el status y el cuerpo de la respuesta.
3. Emitir la misma peticion sin cookie pero con un `X-CSRF-Token` inventado.
4. Emitir la misma peticion con una `csrf_token` que no es la del navegador.
5. Verificar si la respuesta del paso 1 incluye un `Set-Cookie` nuevo.
6. Repetir el paso 1 desde un origen distinto, como una pagina HTML externa con un formulario.

**Esperado**
- El paso 1 no devuelve 403: la mutacion se procesa, y la respuesta incluye un `Set-Cookie` con un token
  recien generado.
- El paso 3 tambien pasa, porque el token de la cookie no existe todavia.
- El paso 4 -> 403, porque ahora si hay cookie en el cliente.
- El paso 6 completa la mutacion desde otro origen. Anotar en la seccion 6 que la proteccion solo empieza a
  actuar cuando la cookie ya existe, de modo que la primera peticion mutante de un cliente sin cookie no
  queda protegida.
- El caso falla de forma informativa: el objetivo es dejar constancia del comportamiento, no marcarlo
  como defecto nuevo.

**Red:** los cuatro status esperados, sin 403 / sin 403 / 403 / mutacion aceptada. Verificar el
`Set-Cookie` de la respuesta del paso 1 y que su valor es distinto del de la peticion siguiente.
**Limpieza:** borrar la cookie `csrf_token` creada por la prueba y deshacer la mutacion del paso 1.

### [SEC-004] Verificar la CSP y las directivas de frame-ancestors y form-action

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** `NODE_ENV` anotado; registro de red y consola activos.
**Datos:** cabecera `Content-Security-Policy`

1. Emitir `GET /` y leer la cabecera `Content-Security-Policy` de la respuesta.
2. Anotar cada directiva presente y su valor.
3. Comprobar si aparecen `unsafe-eval` o `unsafe-inline` en `script-src`.
4. Anotar si `googletagmanager.com` figura en `script-src` o en `connect-src`.
5. Intentar incrustar la aplicacion en un `iframe` desde una pagina externa.
6. Intentar enviar un formulario a un origen externo desde la propia pagina.

**Esperado**
- La cabecera esta presente y es unica, sin directivas duplicadas.
- `default-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'none'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: https:`.
- Con `NODE_ENV=production`, `script-src` es exactamente `'self'` mas los dos origenes de reCAPTCHA, sin
  `unsafe-eval` ni `unsafe-inline`. Con desarrollo, aparecen las dos relaxaciones.
- `googletagmanager.com` no figura en ninguna directiva. Anotarlo en la seccion 6: si el proyecto activa
  Google Analytics mediante `VITE_GA_MEASUREMENT_ID`, la CSP lo bloquea en produccion.
- El paso 5 no carga la pagina: el navegador la bloquea y registra un error de CSP.
- El paso 6 se bloquea por `form-action 'self'`.

**Red:** `GET /` -> 200. Verificar la cabecera en la respuesta, no en el DOM, y anotar la version exacta
de la cadena recibida.
**Limpieza:** cerrar la pagina externa del paso 5.

### [SEC-005] Verificar HSTS, noSniff, frameguard y Permissions-Policy

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** `NODE_ENV=production` anotado; peticion directa a un recurso de la aplicacion.
**Datos:** `Strict-Transport-Security` · `X-Content-Type-Options` · `X-Frame-Options` · `Permissions-Policy` · `Cross-Origin-Opener-Policy` · `Referrer-Policy`

1. Emitir `GET /` y volcar todas las cabeceras de respuesta.
2. Anotar la presencia y el valor de cada cabecera de la lista de Datos.
3. Comprobar si `Cross-Origin-Embedder-Policy` esta presente.
4. Comprobar si `X-Powered-By` esta presente.
5. Intentar usar la camara o el microfono desde la pagina.

**Esperado**
- `Strict-Transport-Security` con `max-age=31536000`, `includeSubDomains` y `preload`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y
  `Referrer-Policy: strict-origin-when-cross-origin`.
- `Cross-Origin-Opener-Policy: same-origin` y
  `Cross-Origin-Resource-Policy: cross-origin`.
- `Cross-Origin-Embedder-Policy` no esta presente, porque se desactiva de forma explicita. Anotarlo: sin
  esa cabecera, las respuestas no son aisladas por COEP.
- `Permissions-Policy` desactiva `geolocation`, `camera`, `microphone`, `payment`, `usb`,
  `display-capture` y `clipboard-read`, y deja `clipboard-write` en `(self)`.
- `X-Powered-By` no esta presente.
- El paso 5 falla con un error de permiso si la pagina intenta abrir la camara.

**Red:** `GET /` -> 200. Verificar las nueve cabeceras de la respuesta.
**Limpieza:** ninguna.

### [SEC-006] Colapsar parametros duplicados en la consulta

**Rol** `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** registro de red activo.
**Datos:** `?role=patient&role=admin` · `?id=1&id=2` · `?a=1&a[]=2`

1. Emitir `GET /api/specialties?limit=1&limit=100`.
2. Emitir `GET /api/specialties?a=1&a[]=2`.
3. Emitir `GET /api/specialties?%6cid=1&_id=2` y observar el `req.query` en el log del servidor.
4. Emitir un `POST` publico con un parametro duplicado en el cuerpo.
5. Comparar el `req.query` que ve el controlador con la URL enviada.

**Esperado**
- Los parametros duplicados se colapsan a un unico valor antes de llegar al controlador: no se procesa
  una lista de valores.
- El controlador ve un unico valor, no un array, de modo que un `limit` duplicado no se convierte en una
  lista que rompa la paginacion.
- La variante con `a=1` y `a[]=2` no evade el colapso.
- Ninguna peticion devuelve 500, y ninguna cambia el comportamiento del endpoint mas alla del primer
  valor.
- Ningun parametro duplicado permite escalar privilegios: comprobar que un `role` repetido no cambia el
  rol efectivo de la sesion.

**Red:** los cuatro status. Verificar el valor final de `limit` devuelto en el cuerpo del primer paso.
**Limpieza:** ninguna.

### [SEC-007] Agotar el limite de peticiones global

**Rol** `cualquiera` · **Ruta** `—` · **P2** · **Resultado** `______`
**Precondición:** se conoce la direccion IP que la aplicacion atribuye al cliente; ninguna otra prueba
del area se esta ejecutando a la vez desde la misma IP.
**Datos:** 500 peticiones por ventana de 15 minutos

1. Emitir peticiones sucesivas a un endpoint barato, contando las respuestas hasta el rechazo.
2. Anotar el numero de peticiones hasta el primer 429 y el status de ese rechazo.
3. Leer las cabeceras de la respuesta rechazada.
4. Anotar el mensaje del cuerpo del 429.
5. Repetir una peticion `GET` cualquiera despues del rechazo.

**Esperado**
- El limite son 500 peticiones por cada 15 minutos, por IP.
- La peticion que supera el limite -> 429 con el cuerpo de la forma `{"error": ...}` del resto de errores.
- La respuesta incluye las cabeceras estandar de limite: `RateLimit-Limit`, `RateLimit-Remaining` en 0 y
  `RateLimit-Reset`.
- Tras el rechazo, TODAS las peticiones de la IP siguen respondiendo 429, incluidas las de lectura, hasta
  que expire la ventana. Anotarlo en la seccion 6: el limite global no distingue lectura de escritura.
- El mensaje del 429 esta en ingles y no menciona como esperar.

**Red:** el numero contado hasta el primer 429 debe coincidir con el valor de `RateLimit-Limit`. Verificar
que el 429 se produce en la capa de limite y no en un controlador.
**Limpieza:** esperar el fin de la ventana de 15 minutos antes de seguir con el resto del area, o cambiar
de IP de prueba.

### [SEC-008] Agotar el limite de peticiones de autenticacion

**Rol** `anónimo` · **Ruta** `/login` · **P1** · **Resultado** `______`
**Precondición:** ninguna otra prueba de autenticacion esta en curso desde la misma IP; la cuenta de
prueba de SEC-013 no es la misma.
**Datos:** 10 peticiones por ventana de 15 minutos · rutas `login`, `register`, `forgot-password`, `reset-password`

1. Emitir 11 peticiones `POST /api/auth/login` con credenciales falsas, contando los status.
2. Anotar el status de la Onceava peticion.
3. Repetir la secuencia contra `POST /api/auth/register`.
4. Repetir la secuencia contra `POST /api/auth/forgot-password`.
5. Emitir 11 peticiones `POST /api/auth/refresh` y contar.
6. Comprobar si las cuatro rutas comparten el mismo contador.

**Esperado**
- El limite de las cuatro rutas de autenticacion es 10 por 15 minutos, y la Onceava -> 429.
- `POST /api/auth/refresh` y `POST /api/auth/logout` tienen un limite distinto, de 60 por 15 minutos, y no
  se rechazan en la Onceava peticion.
- Los cuatro contadores de autenticacion son independientes entre si pero comparten IP: agotar uno no
  agota los otros, y agotarlos todos lleva a rejecting tambien el limite global de SEC-007.
- El 429 no distingue si las credenciales eran correctas.
- La UI muestra un mensaje de exceso de intentos en el formulario, no un error generico.

**Red:** los cinco conteos. Anotar el status de la peticion numero 10 y el de la 11 en cada ruta.
**Limpieza:** esperar el fin de la ventana de 15 minutos.

### [SEC-009] Agotar el limite de busqueda de RUT

**Rol** `anónimo` · **Ruta** `/booking` · **P2** · **Resultado** `______`
**Precondición:** hay al menos un RUT de invitado con cita registrada; ninguna otra prueba del area usa
este endpoint.
**Datos:** 3 peticiones por ventana de 15 minutos · `GET /api/guest/bookings/:rut`

1. Emitir 4 peticiones `GET /api/guest/bookings/<rut valido>` contando los status.
2. Anotar el mensaje del cuerpo de la cuarta.
3. Emitir una quinta con un RUT inexistente y comparar su status con el de la primera.
4. Emitir una peticion `POST /api/guest/booking` nueva y comprobar su status.

**Esperado**
- El limite es de 3 peticiones por 15 minutos para la busqueda por RUT, y la cuarta -> 429 con el mensaje
  `Too many RUT lookups, try again later`.
- El limite no depende de que el RUT exista: la cuarta peticion con un RUT inexistente tambien se rechaza.
- La peticion de creacion de cita no comparte el contador de busquedas y sigue aceptandose. Anotar en la
  seccion 6 que el limite de 3 es tan bajo que un invitado legitimo que busca sus citas tres veces se
  queda fuera durante 15 minutos.
- El mensaje esta en ingles, en un proyecto con interfaz en espanol.

**Red:** los cuatro conteos. Verificar el cuerpo del 429 y que el status no depende de la validez del RUT.
**Limpieza:** esperar el fin de la ventana de 15 minutos.

### [SEC-010] Agotar el limite de reservas de invitado ⚠️ DESTRUCTIVO

**Rol** `anónimo` · **Ruta** `/booking` · **P2** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** hay disponibilidad publica para el medico elegido; ninguna otra prueba del area crea
reservas de invitado desde la misma IP.
**Datos:** 5 peticiones por ventana de 60 minutos · `POST /api/guest/booking`

1. Emitir 5 peticiones `POST /api/guest/booking` validas, contando los status.
2. Anotar el status y el mensaje de la sexta peticion.
3. Emitir una peticion con un cuerpo invalido y comparar su status con el de la sexta.
4. Emitir una peticion `DELETE /api/guest/booking/:id` y comprobar su status.

**Esperado**
- El limite es de 5 por hora para la creacion de reservas de invitado, y la sexta -> 429 con el mensaje
  `Too many guest bookings, try again later`.
- El limite se aplica antes de la validacion del cuerpo: una peticion con cuerpo invalido devuelve 429 y
  no 400. Anotarlo, porque cambia el diagnostico de un error de cliente por uno de limite.
- La cancelacion `DELETE /api/guest/booking/:id` no comparte el contador y sigue respondiendo.
- Las cinco reservas del paso 1 quedan creadas y deben limpiarse: son citas reales de un paciente
  inexistente.

**Red:** los cuatro status. Anotar el numero exacto de citas creadas por las cinco peticiones validas.
**Limpieza:** ⚠️ DESTRUCTIVO: cancelar y eliminar las 5 reservas creadas con Requiere `ALLOW_DESTRUCTIVE=true`.
`DELETE FROM bookings WHERE guest_email LIKE 'qa.guest+%'`, o marcarlas como canceladas. Requiere
`ALLOW_DESTRUCTIVE=true`.

### [SEC-011] Comprobar que el bloqueo por plan solo se aplica a laboratory

**Rol** `admin` · **Ruta** `/laboratory` · **P1** · **Resultado** `______`
**Precondición:** existen dos tenants, uno con la feature `laboratory` contratada y otro sin ella.
Depende de los areas `15-` y `19-`. Sin esa preparacion, el caso se marca `BLOQUEADO`.
**Datos:** tenant con `laboratory` · tenant sin `laboratory` · mensaje `Esta función requiere un plan superior. Por favor, actualiza tu plan para acceder a "laboratory".`

1. Iniciar sesion como `admin` del tenant sin la feature y abrir `/laboratory`.
2. Anotar el status de `GET /api/laboratory/dashboard` y el mensaje del cuerpo.
3. Consultar desde ese mismo admin las rutas de las demas funciones de pago: facturacion, receta
   electronica, telemedicina y recordatorios.
4. Repetir los pasos 1 a 3 con el `admin` del tenant que si tiene la feature.
5. Anotar que modulo aplica el bloqueo y cual no.

**Esperado**
- El tenant sin `laboratory` recibe 403 con el mensaje `Esta función requiere un plan superior. Por favor,
  actualiza tu plan para acceder a "laboratory".`
- Las demas funciones de pago responden 200 en el mismo tenant y sin suscripcion: no exigen un plan superior.
  Anotar en la seccion 6 que el bloqueo por plan solo esta aplicado a `laboratory`, y anota con H-63.
- El tenant con la feature accede a todas las funciones sin 403.
- La UI muestra un aviso de plan al abrir `/laboratory`, no un error 403 en crudo.
- El mensaje identifica la feature concreta (`"laboratory"`), no un texto generico.

**Red:** los status de cada ruta del paso 3, anotando cuales dan 403 y cuales 200. Verificar que el 403 de
`laboratory` se produce en el middleware de feature y no en un controlador.
**Limpieza:** ninguna.

### [SEC-012] Determinar que direccion IP cuenta como confiable

**Rol** `cualquiera` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondición:** se tiene acceso al log del servidor, que registra la IP de cada peticion; hay un proxy
o tunel delante de la aplicacion.
**Datos:** `X-Forwarded-For: 10.0.0.1` · `X-Forwarded-For: 8.8.8.8` · `X-Real-IP: 1.2.3.4`

1. Emitir una peticion sin cabeceras de proxy y anotar la IP que registra el servidor.
2. Emitir una peticion con `X-Forwarded-For: 10.0.0.1` y anotar la IP registrada.
3. Emitir una peticion con `X-Forwarded-For: 8.8.8.8` y anotar la IP registrada.
4. Emitir una peticion con las dos cabeceras de proxy a la vez.
5. Repetir los pasos 2 a 4 contra el limite de SEC-007 y observar si la IP que cuenta cambia.
6. Anotar el valor de `trust proxy` en la configuracion efectiva.

**Esperado**
- Sin cabeceras de proxy, la IP registrada es la del socket.
- Con `X-Forwarded-For` de una direccion de la red confiable (`10.0.0.1`), esa direccion se adopta como
  IP del cliente.
- Con una direccion externa (`8.8.8.8`), la cabecera se descarta y se usa la del socket. Anotar en la
  seccion 6 que el limite de peticiones se puede eludir en cuanto la IP atribuida cambia por peticiones
  consecutivas, y anotar con H-42.
- `X-Real-IP` no tiene efecto, porque la configuracion no la incluye en la cadena de confianza.
- El paso 5 muestra que el contador de SEC-007 se mantiene mientras la IP atribuida no cambie.
- `trust proxy` esta limitado a `loopback`, `linklocal` y `uniquelocal`, no a toda la red.

**Red:** las cuatro peticiones con los status esperados. Anotar en cada una la IP que ve el limitador,
leida del log, no de la respuesta.
**Limpieza:** ninguna.

### [SEC-013] Bloquear la cuenta tras cinco intentos fallidos

**Rol** `anónimo` · **Ruta** `/login` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** `RECAPTCHA_HUMAN` disponible si la instalacion lo exige; existe un usuario de prueba
cuyo `failed_attempts` esta a 0.
**Datos:** 5 intentos con contrasena incorrecta · duracion del bloqueo `15 minutes`

1. Emitir 4 intentos de login con la contrasena incorrecta y anotar `failed_attempts` tras cada uno.
2. Emitir el quinto intento y anotar el status, el mensaje y `failed_attempts`.
3. Emitir un sexto intento con la contrasena CORRECTA.
4. Anotar `locked_until` en la base de datos tras el quinto intento.
5. Emitir un intento valido esperando a que expire el bloqueo.

**Esperado**
- Los cuatro primeros intentos devuelven 401 y suben `failed_attempts` a 1, 2, 3 y 4.
- El quinto intento -> 401 y fija `locked_until` a la hora actual mas 15 minutos.
- El sexto intento, con la contrasena correcta, -> 423 o 401 con un mensaje de cuenta bloqueada, y no crea
  sesion ni emite cookies de sesion.
- El mensaje del bloqueo es distinto del de contrasena incorrecta: el primero nombra el bloqueo y el
  segundo no revela si el email existe. Anotar el par de literales observados.
- Tras esperar 15 minutos, un intento con la contrasena correcta entra y `failed_attempts` vuelve a 0.

**Red:** los seis status, con el quinto en 401 y el sexto con el codigo de bloqueo. Verificar que el
mensaje de bloqueo no incluye la hora exacta de desbloqueo.
**Limpieza:** `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = <id del usuario de
prueba>`, o esperar los 15 minutos.

### [SEC-014] Verificar los flags y la expiracion de las cookies de sesion

**Rol** `patient` · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion iniciada con un rol que no sea `patient`, porque el panel del paciente puede
redirigir; el caso es valido para cualquier rol autenticado.
**Datos:** cookie `access_token` (15 minutos) · cookie `refresh_token` (30 dias) · cookie `csrf_token` (24 horas)

1. Iniciar sesion y listar las cookies que quedan.
2. Leer los atributos de `access_token` y de `refresh_token`.
3. Comprobar si alguno de los dos es accesible desde JavaScript.
4. Comprobar si algun token aparece en `localStorage` o en `sessionStorage`.
5. Copiar el `refresh_token`, esperar a que expire el `access_token` y recargar la pagina.
6. Cerrar sesion y comprobar que las dos cookies se borran.

**Esperado**
- Las dos cookies existen con `httpOnly: true`, `path: /` y `sameSite: lax`.
- `secure` es `true` en produccion y `false` en desarrollo.
- `access_token` caduca en 15 minutos y `refresh_token` en 30 dias, segun su `Max-Age`.
- Ninguno de los dos tokens es legible desde JavaScript, y ninguno se guarda en `localStorage` ni en
  `sessionStorage`. Anotarlo en la seccion 6 si aparece alguno: seria un token accesible a un XSS.
- El paso 5 se resuelve con una renovacion transparente y el usuario no pierde la sesion.
- El paso 6 borra ambas cookies con el mismo `path`.

**Red:** `POST /api/auth/login` -> 200. Verificar los atributos en los dos `Set-Cookie` de la respuesta y
que la renovacion del paso 5 produce un `Set-Cookie` nuevo.
**Limpieza:** cerrar sesion.

### [SEC-015] Rechazar un cuerpo que no cumple el esquema Zod

**Rol** `doctor` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; se conoce un endpoint de escritura con esquema, como la
creacion de expediente clinico.
**Datos:** `POST /api/clinical-records` con `patient_id` de texto, sin `patient_id`, y con `patient_id: 0`

1. Emitir `POST /api/clinical-records` con `patient_id` como cadena.
2. Emitir la peticion sin `patient_id`.
3. Emitir con `patient_id: 0` y con `patient_id: -1`.
4. Emitir con un tipo de dato completamente incorrecto en cada campo.
5. Anotar el status y el cuerpo de las cuatro respuestas.
6. Verificar que el cuerpo del error nombra el campo y el motivo.

**Esperado**
- Los cuatro cuerpos invalidos -> 400, con un cuerpo que identifica el campo culpable y el motivo, sin
  volcar el esquema entero.
- El `patient_id` como cadena -> 400: no hay conversion automatica a entero en este esquema.
- `patient_id: 0` y `patient_id: -1` -> 400 por la restriccion de entero positivo.
- Ninguno de los cuatro crea un registro en la base de datos.
- Ninguno devuelve 500 por un tipo inesperado: la validacion ocurre antes del controlador.

**Red:** los cuatro 400. Verificar la forma del cuerpo de error y que incluye el nombre del campo.
**Limpieza:** ninguna (nada se creo).

### [SEC-016] Rechazar campos desconocidos por el esquema estricto

**Rol** `doctor` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; el endpoint de escritura admite un cuerpo con esquema
estricto.
**Datos:** campo extra `role: superadmin` · campo extra `tenant_id: otra-clinica` · campo extra `notes`

1. Emitir `POST /api/clinical-records` con su cuerpo valido mas `role: superadmin`.
2. Emitir con `tenant_id: otra-clinica`.
3. Emitir con un campo extra que contenga un objeto anidado, como `metadata: { origen: "qa" }`.
4. Anotar el status de las tres peticiones.
5. Si alguna pasa, comprobar si el campo extra tuvo efecto en el registro creado.

**Esperado**
- Las tres peticiones -> 400, con un mensaje que senale la clave desconocida.
- El campo `role` y el campo `tenant_id` no producen escalamiento: ni cambian el rol de la sesion ni
  escriben en el tenant indicado. Anotarlo en la seccion 6 si alguno se acepta, porque permitir `tenant_id`
  en el cuerpo permitiria escribir en otra clinica.
- Ningun registro se crea con las tres peticiones.
- El rechazo por campo desconocido es distinto del rechazo por tipo incorrecto del paso anterior, y ambos
  son 400.

**Red:** los tres 400. Verificar que el mensaje incluye el nombre de la clave rechazada.
**Limpieza:** si alguna peticion creo un registro, eliminarlo por `id`.

### [SEC-017] Sanitizar el HTML en el texto libre de un expediente clinico

**Rol** `doctor` · **Ruta** `/patient/:id/clinical-records` · **P1** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; existe un expediente clinico del paciente de prueba.
**Datos:** `<script>alert(1)</script>` · `<img src=x onerror=alert(1)>` · `<b>negrita</b>` · ` javascript:alert(1)`

1. Crear un registro clinico cuyo motivo de consulta contenga `<script>alert(1)</script>`.
2. Leer ese registro en la ficha del paciente y en la vista de lista.
3. Crear otro con `<img src=x onerror=alert(1)>`.
4. Crear otro con `<b>negrita</b>` y comprobar si se conserva el formato.
5. Intentar guardar un enlace ` javascript:alert(1)` en un campo de texto libre.
6. Anotar el valor almacenado en la base de datos en los casos 1 y 3.

**Esperado**
- El contenido se guarda y se devuelve sin etiquetas ni atributos ejecutables: no queda `<script>` ni
  `onerror` en la base de datos ni en la respuesta de la API.
- Ninguno de los payloads dispara un dialogo al abrir la vista, y la consola no registra errores de
  script inyectado.
- `<b>negrita</b>` se muestra como texto plano o se conserva como formato segun la politica del campo:
  anotar exactamente cual de las dos cosas ocurre.
- El enlace con ` javascript:` no se convierte en un enlace navegable.
- La sanitizacion ocurre en el servidor: el valor de la base de datos ya viene limpio, no se limpia solo
  al renderizar.

**Red:** `POST /api/clinical-records` -> 201 y `GET /api/clinical-records/:id` -> 200. Comparar el valor
devuelto con el enviado y con el de la base de datos en los pasos 1 y 3.
**Limpieza:** eliminar los tres registros creados.

### [SEC-018] Validar el digito verificador del RUT ⚠️ DESTRUCTIVO

**Rol** `anónimo` · **Ruta** `/register` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** ninguno; el registro se hace sin sesion. Si el registro exige captcha sin
`RECAPTCHA_HUMAN`, marcar el caso `BLOQUEADO`.
**Datos:** RUT con digito verificador correcto · RUT con digito incorrecto · RUT con letra · RUT de otro
formato

1. Registrar un usuario con un RUT cuyo digito verificador sea correcto.
2. Repetir con el mismo RUT cambiando el ultimo digito.
3. Repetir con un RUT que termine en letra.
4. Repetir con un RUT sin guion ni digito.
5. Repetir con un RUT de una persona distinta, ya registrado.
6. Anotar el status y el mensaje de cada respuesta.

**Esperado**
- El RUT correcto -> 201 o 200 segun el flujo, con la cuenta creada.
- El RUT con digito incorrecto -> 400 con un mensaje que nombra la validacion del RUT.
- El RUT con letra y el RUT mal formado -> 400, no 500.
- El RUT de una persona ya registrada -> 409 o 400, con un mensaje distinto del de digito incorrecto.
  Anotar si ese mensaje revela que el RUT ya existe, porque seria una enumeracion de personas.
- El mismo RUT se valida igual en la reserva de invitado y en el registro de medico invitado por correo.
- El RUT se guarda normalizado, con la misma representacion con la que se comparan duplicados.

**Red:** los cinco status esperados. Verificar que ninguno devuelve 500 y que los mensajes de 400 son
distintos por causa.
**Limpieza:** eliminar el usuario creado en el paso 1. Requiere `ALLOW_DESTRUCTIVE=true`.

### [SEC-019] Igualar el status, el cuerpo y el tiempo de forgot-password

**Rol** `anónimo` · **Ruta** `/forgot-password` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** existe un email registrado y otro que no; `EMAIL_TEST` configurado para leer el buzon.
**Datos:** email existente · email inexistente · piso temporal `200 ms`

1. Enviar `POST /api/auth/forgot-password` con el email existente.
2. Anotar el status, el cuerpo y el tiempo total de respuesta.
3. Enviar con el email inexistente y anotar lo mismo.
4. Enviar con un email de formato invalido y anotar lo mismo.
5. Comparar los tres cuerpos y los tres tiempos.
6. Revisar el buzon de prueba en los dos primeros casos.

**Esperado**
- Los tres casos devuelven el mismo status, el mismo cuerpo y un mensaje que no distingue si el email
  existe. Anotar con H-11.
- Los tres tiempos son de al menos 200 ms: la respuesta de un email inexistente no puede ser mas rapida
  que la de uno existente. Anotar en la seccion 6 si la diferencia entre ambos supera los 30 ms, porque
  es una via de enumeracion por tiempo.
- El buzon recibe un correo solo en el caso del email existente, y ninguno en los otros dos.
- El correo no incluye el nombre del usuario si la cuenta existe pero esta inactiva, para no revelar el
  estado de la cuenta.

**Red:** los tres status y tiempos. Verificar que los tres cuerpos son identicos byte a byte, no solo
similares.
**Limpieza:** eliminar los correos de prueba del buzon.

### [SEC-020] Igualar el mensaje de login entre email inexistente y contrasena incorrecta

**Rol** `anónimo` · **Ruta** `/login` · **P1** · **Resultado** `______`
**Precondición:** existe un email registrado con contrasena conocida; se supone que
el limite de SEC-008 no esta agotado y `failed_attempts` del usuario esta a 0.
**Datos:** email existente con contrasena incorrecta · email inexistente con cualquier contrasena

1. Intentar login con un email registrado y contrasena incorrecta. Anotar status, mensaje y tiempo.
2. Intentar con un email inexistente. Anotar status, mensaje y tiempo.
3. Comparar ambos mensajes palabra por palabra.
4. Comprobar si alguno de los dos menciona la existencia del email o el formato del email.
5. Comprobar `failed_attempts` del usuario registrado tras el paso 1.

**Esperado**
- Los dos casos devuelven el mismo status y el mismo mensaje, por ejemplo
  `Credenciales incorrectas`, sin distinguir el motivo.
- Ningun mensaje dice "usuario no encontrado" ni "correo invalido".
- Los dos tiempos son comparables. Anotar en la seccion 6 la diferencia medida: una diferencia grande
  permite enumerar cuentas por tiempo.
- El paso 1 suma un intento fallido al usuario registrado; el paso 2 no puede crear ni incrementar ninguna
  cuenta.
- Ninguno de los dos emite cookies de sesion.

**Red:** los dos 401. Verificar que los cuerpos son identicos y que solo el primer caso modifico la fila de
`users`.
**Limpieza:** `UPDATE users SET failed_attempts = 0 WHERE id = <id del usuario de prueba>`.

### [SEC-021] Bloquear el acceso horizontal a un expediente clinico ajeno

**Rol** `patient`, `doctor` · **Ruta** `/patient/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** existen dos pacientes de la misma clinica con expedientes clinicos; sus `id` estan
anotados. El area `21-` debe estar ejecutada.
**Datos:** `clinical_records.id` del paciente A · sesion del paciente B · `GET /api/clinical-templates`

1. Con la sesion del paciente B, pedir `GET /api/clinical-records/<id del expediente de A>`.
2. Anotar el status y el mensaje.
3. Con la sesion del paciente B, pedir `GET /api/clinical-records?patient_id=<id de A>`.
4. Con la sesion del paciente B, pedir `GET /api/clinical-templates`.
5. Con la sesion de un doctor que no es el tratante de A, repetir los pasos 1 y 3.
6. Navegar en la UI del paciente B por su propia pantalla de expedientes clinicos y contar los avisos 403.

**Esperado**
- Los pasos 1 y 3 -> 403 o 404, con un mensaje de acceso denegado, y nunca con datos de A.
- El paso 4 -> 200 con la lista de plantillas, porque las plantillas no dependen del paciente. Anotar con
  H-22 si la UI de B muestra un aviso 403 espurio al entrar en su propia pantalla de expedientes clinicos.
- El paso 5 con un doctor que no trata a A -> 403, y con el tratante -> 200.
- El paso 6 muestra 0 avisos de 403 para el paciente B en su propia pantalla, con su propia lista.
- Ninguna respuesta incluye el nombre, el correo ni el RUT del paciente A.

**Red:** los cuatro status. Verificar en los rechazos que el cuerpo no contiene ningun campo clinico del
paciente objetivo.
**Limpieza:** ninguna.

### [SEC-022] Bloquear la exportacion de datos de otro paciente

**Rol** `patient`, `doctor` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** dos pacientes con historia clinica, de la misma clinica y de clinicas distintas; sus
`users.id` estan anotados. Depende del area `19-` para la parte entre clinicas.
**Datos:** `GET /api/export/patients/:userId` · `GET /api/export/me`

1. Con la sesion del paciente B, pedir la exportacion del paciente A de la misma clinica.
2. Anotar el status y el mensaje.
3. Con la sesion del paciente B, pedir su propia exportacion.
4. Con la sesion de un doctor de otra clinica, pedir la exportacion de A.
5. Comparar el contenido de la exportacion de B con el numero de filas reales de B.
6. Comparar el paso 2 con el area `29-` ADJ-013.

**Esperado**
- El paso 1 -> 403 con el mensaje `ACCESS_DENIED`, no 404 ni 200.
- El paso 2 -> 200 con un paquete que solo contiene datos de B.
- El paso 4 -> 200 con listas vacias o 403. Anotar en la seccion 6 que un tenant sin acceso devuelve un
  paquete vacio con 200 en lugar de un rechazo explicito, lo que oculta el error al usuario.
- El paso 5 no revela filas de A en ninguna de las nueve claves del paquete.
- Ninguna respuesta de 403 incluye datos clinicos del paciente objetivo.
- El comportamiento es el mismo con una cuenta de rol `user` que con una de rol `patient`. Anotar con
  H-62: el alias entre ambos roles esta duplicado en varios puntos del codigo, y este caso comprueba que
  no divergen.

**Red:** los cuatro status. Verificar el tamano del paquete del paso 3 y que su lista `attachments`
coincide con los adjuntos de B.
**Limpieza:** eliminar el archivo exportado del paso 3.

### [SEC-023] Comprobar la validacion de variables de entorno al arrancar ⚠️ DESTRUCTIVO

**Rol** `cualquiera` · **Ruta** `—` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** copia del arranque disponible; se dispone de un gestor de procesos o de variables de
entorno para arrancar con valores modificados. ⚠️ DESTRUCTIVO: reinicia el proceso.
**Datos:** `JWT_SECRET` de 31 caracteres · `JWT_SECRET` con el valor por defecto ·
`COOKIE_SECRET` igual a `JWT_SECRET` · `RECAPTCHA_SECRET_KEY` con la clave de prueba de Google

1. Arrancar con `JWT_SECRET` ausente y anotar el mensaje.
2. Arrancar con `JWT_SECRET` de 31 caracteres y anotar el mensaje.
3. Arrancar con `JWT_SECRET` igual a
   `CHANGE_ME_USE_LONG_RANDOM_SECRET_IN_PRODUCTION` y anotar el mensaje.
4. Arrancar con `COOKIE_SECRET` igual a `JWT_SECRET` y anotar el mensaje.
5. Arrancar con `RECAPTCHA_SECRET_KEY` igual a la clave de prueba de Google y `NODE_ENV=production`.
6. Arrancar con valores validos y comprobar que la API responde.
7. Restaurar el proceso original.

**Esperado**
- Sin `JWT_SECRET` el arranque falla con un mensaje que la nombra.
- Con 31 caracteres falla y exige al menos 32.
- Con el valor por defecto falla y pide cambiarla.
- Con `COOKIE_SECRET` igual a `JWT_SECRET` falla y exige que sean distintas.
- Con la clave de prueba de Google en produccion falla. Anotar que esta validacion solo es fatal con
  `NODE_ENV=production`, por lo que una instancia de staging con la clave de prueba arranca sin avisar.
- La validacion ocurre antes de aceptar trafico: con valores invalidos el proceso no llega a escuchar, de
  modo que no hay una ventana en la que la API responda con secretos por defecto.
- El paso 6 responde 200 en `/api/health` con el proceso restaurado.

**Red:** cada arranque fallido debe terminar sin abrir el puerto. Anotar el codigo de salida del proceso y
el mensaje exacto de cada fallo.
**Limpieza:** ⚠️ DESTRUCTIVO: restaurar el proceso original y sus variables antes de seguir con el area. Requiere `ALLOW_DESTRUCTIVE=true`.
Requiere `ALLOW_DESTRUCTIVE=true`.

### [SEC-024] Descargar el calendario ics con un rango de doscientos años

**Rol** `doctor`, `admin` · **Ruta** `/calendar` · **P1** · **Resultado** `______`
**Precondición:** sesion de `doctor` o `admin` valida; el doctor de prueba tiene agenda en el rango
solicitado. Depende del area `16-` para tener agenda.
**Datos:** `from=1800-01-01` y `to=2100-01-01` · `from=0001-01-01` y `to=9999-12-31` · `doctorId` propio

1. Emitir `GET /api/calendar/doctor/<doctorId>/ics` sin parametros y medir el tiempo y el tamano.
2. Emitirlo con `from=1800-01-01&to=2100-01-01` y medir el tiempo y el tamano.
3. Emitirlo con `from=0001-01-01&to=9999-12-31` y medir el tiempo y el tamano.
4. Emitirlo con `from` valido y `to` anterior a `from`.
5. Emitirlo con `from=2026-13-45` y con `from=ayer`.
6. Anotar el numero de eventos `VEVENT` devueltos en cada caso.
7. Repetir el paso 3 cinco veces seguidas y observar si la API deja de responder.

**Esperado**
- La peticion sin parametros -> 200 con el rango por defecto, y su tamano sirve de referencia.
- El paso 2 -> 200 y genera el numero de eventos del rango completo, sin acotar el rango. Anotar con
  H-36 que no hay cota superior de rango.
- El paso 3 -> 200 con un archivo muy grande, o se rechaza con un error de tiempo. Lo que se anota es
  cualquiera de las dos: el caso no presupone el resultado, lo mide.
- El paso 4 se rechaza con 400 o devuelve un archivo vacio, pero no 500.
- El paso 5 -> 400 por el formato de fecha, tanto si el mes es 13 como si no es un numero.
- Ninguno de los casos devuelve 500, y el paso 7 no deja la API sin responder.

**Red:** los cinco status. Anotar el `Content-Disposition`, el tamano exacto de cada archivo y el tiempo de
respuesta de los pasos 2 y 3, que es lo que hace el caso informativo.
**Limpieza:** eliminar los archivos `.ics` descargados.

## 5. Defectos conocidos a verificar primero

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-11 | SEC-019 | `POST /api/auth/forgot-password` debe devolver el mismo status, el mismo cuerpo y un tiempo no distinguible para un email existente y para uno inexistente |
| H-22 | SEC-021 | Con rol `patient`, entrar en la pantalla propia de expedientes clinicos no debe mostrar un aviso 403 espurio; la llamada a plantillas clinicas es legitima y devuelve 200 |
| H-36 | SEC-024 | `GET /api/calendar/doctor/:doctorId/ics` debe acotar el rango de fechas; hoy `from` y `to` no tienen cota y un rango de 200 años se procesa entero |
| H-42 | SEC-012 | Solo deben adoptarse las IP de las redes `loopback`, `linklocal` y `uniquelocal`; una cabecera `X-Forwarded-For` de una IP externa debe descartarse |
| H-62 | SEC-021, SEC-022 | El alias entre `patient` y `user` esta duplicado en varios puntos: el comportamiento de aislamiento debe ser identico para ambos roles |
| H-63 | SEC-011 | El bloqueo por plan (`requireFeature`) solo se aplica al modulo `laboratory`; las demas funciones de pago responden 200 sin suscripcion |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

- La proteccion CSRF no protege la primera peticion mutante de un cliente que aun no tiene cookie. El
  middleware emite un token nuevo y deja pasar la peticion cuando `csrf_token` no existe, de modo que un
  formulario enviado desde un origen externo con un cliente sin cookie completa la operacion. SEC-003 lo
  mide. El catalogo no tiene un ID para este comportamiento.
- El limite global de 500 peticiones por 15 minutos no distingue lectura de escritura: al agotarlo, el
  cliente recibe 429 tambien en `GET`, lo que bloquea la navegacion normal de la interfaz. SEC-007 lo mide.
- El limite de busqueda por RUT es de 3 peticiones por 15 minutos, por lo que un invitado legitimo que
  consulta sus citas tres veces se queda bloqueado durante un cuarto de hora. SEC-009 lo mide.
- Los limitadores de la reserva de invitado se aplican antes de la validacion del cuerpo, de modo que una
  peticion malformada devuelve 429 en lugar de 400 y el diagnostico del error cambia. SEC-010 lo mide.
- `trust proxy` cubre `loopback`, `linklocal` y `uniquelocal`, pero el limitador por IP sigue siendo
  eludible en cuanto la IP atribuida cambia entre peticiones consecutivas. SEC-012 mide el alcance, no una
  posible evasion por rotacion.
- La CSP de produccion no incluye `googletagmanager.com` en `script-src` ni en `connect-src`, de modo
  que Google Analytics quedaria bloqueado si el proyecto se despliega con la medicion activada. SEC-004 lo
  comprueba en la cabecera.
- `Cross-Origin-Embedder-Policy` esta desactivada de forma explicita en la configuracion de Helmet, asi
  que las respuestas no son aisladas por COEP. SEC-005 lo comprueba.
- La validacion de `RECAPTCHA_SECRET_KEY` solo es fatal con `NODE_ENV=production`: una instancia de
  staging arranca con la clave de prueba de Google sin avisar. SEC-023 lo mide.
- La sanitizacion de HTML se aplica en el servidor, pero no hay caso que mida si la UI renderiza con
  `dangerouslySetInnerHTML` en algun punto, porque la politica de renderizado del frontend no es uniforme
  y no esta documentada. SEC-017 solo verifica el lado del servidor.
- No hay caso de penetracion de la cookie de sesion: el repositorio no incluye pruebas de firma de
  cookie, y `COOKIE_SECRET` solo se comprueba en el arranque. SEC-023 cubre la validacion, no el
  funcionamiento de la firma.
- El bloqueo de cuenta de SEC-013 depende de `RECAPTCHA_HUMAN` si la instalacion exige captcha en el
  login. Sin esa variable, el caso se marca `BLOQUEADO` y no `FALLÓ`.
- La comparacion de tiempo de SEC-019 y SEC-020 depende de la carga de la maquina: sin repetir las
  mediciones varias veces, una diferencia de pocos milisegundos no es concluyente. Anotar el numero de
  repeticiones.

## 7. Resultado del area

| Metrica | Valor |
|---|---|
| Casos escritos | 24 |
| Casos requeridos | 24 |
| P0 | 6 (SEC-002, SEC-003, SEC-013, SEC-019, SEC-021, SEC-022) |
| P1 | 14 |
| P2 | 4 |
| P3 | 0 |
| Casos destructivos | 3 (SEC-010, SEC-018, SEC-023) |
| Casos que dependen de `19-` | 3 (SEC-011, SEC-022, SEC-021 en su parte entre clinicas) |
| Casos marcados `BLOQUEADO` sin datos | 2 (SEC-018 si no hay captcha, SEC-013 si no hay captcha) |
| Hallazgos en la seccion 5 | 6 |
| Huecos registrados | 12 |
| Ejecucion | `______` |

---

*Alcance: 24 casos de seguridad transversal, ejecutados por red con control manual de cabeceras y
cookies; SEC-010, SEC-018 y SEC-023 exigen `ALLOW_DESTRUCTIVE=true` porque crean o reinician procesos
que la UI no puede deshacer. 2026-10-01.*

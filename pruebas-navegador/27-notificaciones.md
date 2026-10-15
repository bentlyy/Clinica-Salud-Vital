# 27 — Notificaciones

> Cubre el buzon de notificaciones de la aplicacion: listado paginado, filtro por estado de lectura,
> marcado individual y masivo, el badge de la campana del topbar, el enlace a la pantalla relacionada y
> las diferencias de visibilidad entre roles.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `27` | `NTF` | C4 | Mensual | 16 | `10-` | — |

## 1. Que cubre

- Listado paginado de `/notifications` con el limite de 15 por pagina y su subtitulo de total.
- Filtro `is_read` sobre el endpoint de listado, disponible solo por red.
- `PATCH /api/notifications/:id/read` y su respuesta 404 cuando la notificacion no pertenece al usuario.
- `PATCH /api/notifications/read-all`, con el boton que solo aparece si hay algo sin leer.
- El badge de la campana del topbar y su contraste con `GET /api/notifications/unread-count`.
- Navegacion a la pantalla enlazada desde la tarjeta de la notificacion.
- Estado vacio, paginacion cuando hay mas de una pagina y etiquetas de tipo.
- Filtro por clinica del superadmin y aislamiento por tenant.
- Comportamiento con sesion, con rol `patient` y con rol `user`.

No cubre la entrega real de las notificaciones (correo, SMS, push) ni las preferencias por canal, que se
verifican en el area 28.

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `superadmin` | `/notifications` | `GET /api/notifications`, `GET /api/notifications?tenant_id=<id>`, `GET /api/notifications?is_read=false`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| `admin`, `doctor`, `lab_technician` | `/notifications` | los mismos, sin el filtro `tenant_id` |
| `patient`, `user` | `—` (la ruta `/notifications` no existe para estos roles) | `GET /api/notifications` por red, aunque la UI no lo ofrece |

Las cuatro rutas del backend cuelgan de `authMiddleware` y ninguna lleva un middleware de rol, de modo
que el alcance real de la API es mas amplio que el de la UI. Eso se mide en NTF-012 y NTF-013.

## 3. Precondiciones de datos

- Sesiones validas de `superadmin`, `admin`, `doctor` y `lab_technician` disponibles (area `10-`).
- El usuario de prueba tiene al menos 2 notificaciones sin leer y al menos 3 leidas, con `created_at`
  distintos, para poder distinguir el orden y el filtro.
- Una notificacion con `link` apuntando a una ruta real de la aplicacion y otra con `link` nulo.
- Al menos una notificacion de cada tipo presente en `notifications.severityLabels`: `info`, `warning`,
  `success`, `error`.
- Para NTF-011 y NTF-015 hacen falta dos clinicas en la misma instancia y un `superadmin` con acceso a
  ambas; sin el area `19-` completada, NTF-011 y NTF-015 se marcan `BLOQUEADO`.
- Capturar el estado inicial antes de empezar: numero total, numero sin leer y los `id` de las
  notificaciones que se van a leer, porque NTF-004 y NTF-006 son mutaciones sobre el buzon del usuario de
  prueba.

## 4. Casos

### [NTF-001] Listar las notificaciones del usuario con sesion de administrador

**Rol** `admin` · **Ruta** `/notifications` · **P2** · **Resultado** `______`
**Precondición:** sesion de `admin` activa; el usuario de prueba tiene 2 sin leer y 3 leidas.
**Datos:** pagina 1 · `limit` 15

1. Abrir `/notifications` con la sesion de `admin`.
2. Esperar a que termine la carga del listado.
3. Contar las tarjetas de notificacion renderizadas.
4. Anotar el titulo y el mensaje de las tres primeras.

**Esperado**
- La pantalla carga sin estado de carga permanente y muestra las notificaciones en orden `created_at`
  descendente, de mas reciente a mas antigua.
- Cada tarjeta muestra el titulo, el mensaje y una etiqueta de tipo legible.
- Las notificaciones sin leer se distinguen visualmente de las leidas (fondo o peso distintos), y las
  leidas no muestran la accion de marcar.
- El titulo de la pagina es `Notificaciones` (namespace `notifications`, clave `title`).
- El subtitulo muestra el total con el formato `{{count}} notificaciones`
  (clave `total_notifications`), no el numero de sin leer.

**Red:** `GET /api/notifications?page=1&limit=15` -> 200. Verificar el sobre `{ data, total, page, limit,
totalPages }` y que `total` coincide con el numero del subtitulo.
**Limpieza:** ninguna (solo lectura).

### [NTF-002] Verificar el limite de 15 por pagina y la paginacion multiple

**Rol** `admin` · **Ruta** `/notifications` · **P2** · **Resultado** `______`
**Precondición:** el usuario de prueba tiene al menos 20 notificaciones, mezcla de leidas y sin leer.
**Datos:** `limit` de la UI = 15 · `total` esperado >= 20

1. Abrir `/notifications` y contar las tarjetas de la pagina 1.
2. Anotar el numero de controles de paginacion.
3. Pulsar "Siguiente" hasta la ultima pagina.
4. Pulsar "Anterior" hasta volver a la pagina 1.
5. Cambiar directamente el `limit` a `100` en una peticion manual y repetir el conteo.

**Esperado**
- La pagina 1 muestra exactamente 15 tarjetas, no mas ni menos.
- El paginador solo aparece cuando `totalPages > 1`; con 20 notificaciones y `limit` 15 aparecen 2
  paginas.
- La ultima pagina muestra el resto y `totalPages` coincide con `ceil(total / limit)`.
- Con `limit=100` la API devuelve hasta 100 filas y `totalPages` cae a 1.
- Un `limit` de 0 o de 1000 se acota a 1 y a 100 respectivamente, sin error 500.

**Red:** `GET /api/notifications?page=1&limit=15` -> 200 y `GET /api/notifications?page=2&limit=15` ->
200. Verificar `limit`, `page` y `totalPages` en ambos cuerpos y que las filas de la pagina 2 no repiten
ninguna de la pagina 1.
**Limpieza:** ninguna.

### [NTF-003] Filtrar el listado por notificaciones sin leer

**Rol** `admin` · **Ruta** `—` · **P2** · **Resultado** `______`
**Precondición:** el usuario de prueba tiene 2 sin leer y 3 leidas; `limit` 15.
**Datos:** `GET /api/notifications?is_read=false` · `GET /api/notifications?is_read=true`

1. Emitir `GET /api/notifications?is_read=false` desde la consola o el cliente HTTP.
2. Contar las filas devueltas y comprobar el valor de `is_read` en cada una.
3. Emitir `GET /api/notifications?is_read=true` y contar las filas.
4. Emitir `GET /api/notifications?is_read=SI` con un valor no booleano.
5. Abrir la UI y comprobar si existe un control que replique el filtro del paso 1.

**Esperado**
- `is_read=false` devuelve solo filas con `is_read` en `false` y su `total` es 2.
- `is_read=true` devuelve solo filas con `is_read` en `true` y su `total` es 3.
- `is_read=SI` se interpreta como `false` (no como error) y devuelve el mismo conjunto que
  `is_read=false`; el endpoint no valida el valor.
- La UI no ofrece ningun control de filtro por estado de lectura: el filtro existe solo en la API. Anotar
  la ausencia en el area de huecos, no como fallo.

**Red:** las tres peticiones -> 200. Verificar la suma de `total` de los dos filtros da el total general
del paso NTF-001.
**Limpieza:** ninguna.

### [NTF-004] Marcar una notificacion como leida desde su tarjeta

**Rol** `admin` · **Ruta** `/notifications` · **P1** · **Resultado** `______`
**Precondición:** existe una notificacion sin leer con `id` conocido; se ha guardado su contenido.
**Datos:** `id` de la notificacion objetivo · valor inicial `is_read: false`

1. Abrir `/notifications` y localizar la notificacion sin leer.
2. Pulsar su accion de marcar como leida.
3. Anotar el nuevo estado en pantalla y el estado del subtitulo de total.
4. Recargar con `F5` y comprobar el estado tras la recarga.
5. Emitir `GET /api/notifications?is_read=true` y confirmar la fila.

**Esperado**
- `PATCH /api/notifications/:id/read` -> 200 con el cuerpo de la notificacion y `is_read: true`.
- La tarjeta pierde el resaltado de sin leer y su accion de marcar desaparece.
- Tras `F5` la notificacion sigue apareciendo como leida: el cambio persistio en el servidor.
- `GET /api/notifications?is_read=true` la incluye.
- El total del subtitulo no cambia, porque `total` cuenta leidas y sin leer.

**Red:** `PATCH /api/notifications/:id/read` -> 200. Verificar `is_read` en el cuerpo devuelto y que el
`id` es el de la notificacion pulsada.
**Limpieza:** marcar como sin leer con `UPDATE notifications SET is_read = false WHERE id = <id>` en la
base de datos, y anotar que la API no ofrece la operacion inversa.

### [NTF-005] Marcar como leida una notificacion que pertenece a otro usuario

**Rol** `admin` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondición:** se conoce el `id` de una notificacion de otro usuario de la misma clinica.
**Datos:** `id` ajeno · `id` inexistente `999999`

1. Con la sesion de `admin` del paso NTF-004, emitir
   `PATCH /api/notifications/<id ajeno>/read`.
2. Anotar el status y el cuerpo de la respuesta.
3. Emitir `PATCH /api/notifications/999999/read`.
4. Emitir `PATCH /api/notifications/abc/read` con un `id` no numerico.
5. Consultar en la base de datos si la notificacion ajena cambio de estado.

**Esperado**
- El `id` ajeno -> 404 con el mensaje `Notification not found`, no 200 ni 403: el filtro incluye
  `user_id`, por lo que la actualizacion no alcanza ninguna fila.
- El `id` inexistente -> 404 con el mismo mensaje.
- El `id` no numerico -> 400 por validacion de esquema, antes de tocar la base de datos.
- La notificacion ajena conserva `is_read: false` en la base de datos.
- El error no filtra si el `id` existe en otro tenant: la respuesta es identica en ambos casos.

**Red:** los tres status esperados, 404 / 404 / 400. Verificar que el cuerpo del 400 menciona el
parametro y que ninguno de los tres cuerpos incluye detalles de la base de datos.
**Limpieza:** ninguna.

### [NTF-006] Marcar todas las notificaciones como leidas y ocultar el boton ⚠️ DESTRUCTIVO

**Rol** `admin` · **Ruta** `/notifications` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** el usuario de prueba tiene 2 notificaciones sin leer; el total de leidas se ha
anotado.
**Datos:** 2 sin leer · clave `markAllRead`

1. Abrir `/notifications` y localizar el boton de marcar todo.
2. Anotar su texto, que debe ser `Marcar todo como leido` (clave `markAllRead`).
3. Pulsarlo y esperar la respuesta.
4. Anotar el total del subtitulo y la presencia del boton.
5. Emitir `PATCH /api/notifications/read-all` otra vez, ya sin nada sin leer.

**Esperado**
- El boton solo se renderiza si hay al menos una notificacion sin leer; con todas leidas no aparece.
- El primer `PATCH /api/notifications/read-all` -> 200 con el mensaje
  `All notifications marked as read` y `count` igual al numero de filas realmente actualizadas.
- Tras el marcado, ninguna tarjeta conserva el resaltado de sin leer y el subtitulo de total no cambia.
- La segunda llamada -> 200 con `count: 0`, no 404 ni 409.
- La llamada solo afecta al usuario actual: las notificaciones de otro usuario siguen sin leer.

**Red:** las dos llamadas a `PATCH /api/notifications/read-all` -> 200. Verificar `count` en el cuerpo y
que coincide con el numero de no leidas previo, no con el total.
**Limpieza:** ⚠️ DESTRUCTIVO sobre el buzon: `UPDATE notifications SET is_read = false WHERE user_id = <id> Requiere `ALLOW_DESTRUCTIVE=true`.
AND id IN (<ids de la precondicion>)`.

### [NTF-007] Comprobar que el badge de la campana no refleja el numero de no leidas

**Rol** `admin` · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** el usuario de prueba tiene 2 sin leer y 3 leidas; la campana es visible para el rol.
**Datos:** total esperado 5 · no leidas esperadas 2

1. Abrir `/dashboard` y leer el numero del badge de la campana.
2. Pasar el cursor por la campana y leer el texto emergente.
3. Leer el nombre accesible de la campana con el inspector de accesibilidad.
4. Marcar una notificacion como leida desde `/notifications` y volver a `/dashboard` sin recargar.
5. Releer el badge.

**Esperado**
- El badge muestra 5, el total de notificaciones, y no 2, que es el numero de no leidas.
- El texto emergente es `Notificaciones (5)` (clave `bellTooltip`, parametro `count`).
- El nombre accesible de la campana es el mismo texto con el mismo 5.
- Tras leer una notificacion, el badge sigue en 5 en lugar de bajar a 4. Anotar el defecto en la seccion
  6: el componente toma `data.total` del listado paginado en lugar del contador de no leidas.
- Si el total supera 99, el badge se muestra como `99+` por el limite `max` del componente.

**Red:** comprobar en la pestana Network que la campana pide `GET /api/notifications?page=1&limit=1` y
NO `GET /api/notifications/unread-count`. Anotar tambien el numero de peticiones que la campana dispara.
**Limpieza:** deshacer el marcado del paso 4 con la misma sentencia de NTF-004.

### [NTF-008] Contrastar el contador de no leidas con el badge de la campana ⚠️ DESTRUCTIVO

**Rol** `admin` · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** el usuario de prueba tiene 2 sin leer; DevTools con la red abierta.
**Datos:** `GET /api/notifications/unread-count` · clave `count`

1. Con `/dashboard` abierto, emitir `GET /api/notifications/unread-count`.
2. Anotar el valor de `count` en el cuerpo de la respuesta.
3. Compararlo con el numero del badge de la campana.
4. Marcar todas como leidas desde la API y repetir el paso 1.
5. Recargar `/dashboard` y volver a leer el badge.

**Esperado**
- `GET /api/notifications/unread-count` -> 200 con `count: 2` en el cuerpo.
- El badge muestra 5 mientras el contador dice 2: los dos numeros no coinciden, y el badge usa la cifra
  equivocada.
- Tras `PATCH /api/notifications/read-all`, el contador baja a 0 y el badge permanece en 5.
- El contador nunca supera el total de notificaciones y no cuenta las de otros usuarios.

**Red:** `GET /api/notifications/unread-count` -> 200. Verificar que la respuesta es un objeto con la
clave `count` y no un numero desnudo, y anotar la discrepancia con el badge.
**Limpieza:** ⚠️ DESTRUCTIVO: `UPDATE notifications SET is_read = false WHERE user_id = <id> AND id IN Requiere `ALLOW_DESTRUCTIVE=true`.
(<ids de la precondicion>)`.

### [NTF-009] Navegar a la pantalla enlazada desde la notificacion

**Rol** `doctor` · **Ruta** `/notifications` · **P2** · **Resultado** `______`
**Precondición:** existe una notificacion con `link` apuntando a una ruta interna real y otra con `link`
nulo.
**Datos:** ruta de destino conocida · registro de red activo

1. Abrir `/notifications` y localizar la notificacion con `link`.
2. Pulsar sobre su cuerpo.
3. Anotar la ruta de destino y el contenido de la pantalla.
4. Volver a `/notifications` con el boton Atras del navegador.
5. Localizar la notificacion con `link` nulo y pulsarla.

**Esperado**
- El primer clic navega a la ruta exacta del campo `link` de la notificacion.
- La pantalla de destino muestra los datos de esa notificacion, no una vista generica.
- El boton "Atras" devuelve a `/notifications` y el listado se conserva.
- El clic en la notificacion sin `link` no cambia la ruta ni dispara una navegacion rota.
- El cursor cambia a puntero solo en las notificaciones con `link`.

**Red:** la navegacion a la ruta destino no devuelve 404 ni una pantalla de error. Verificar que la
peticion de la ruta destino responde 200.
**Limpieza:** volver a `/notifications`.

### [NTF-010] Mostrar el estado vacio cuando el usuario no tiene notificaciones ⚠️ DESTRUCTIVO

**Rol** `lab_technician` · **Ruta** `/notifications` · **P3** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** la sesion pertenece a un usuario sin ninguna fila en `notifications`, ni leida ni sin
leer.
**Datos:** clave `noNotifications`

1. Iniciar sesion con ese usuario.
2. Abrir `/notifications` y esperar la carga.
3. Anotar el texto del estado vacio y la presencia del boton de marcar todo.
4. Recargar con `F5` y confirmar el texto.

**Esperado**
- Se muestra el estado vacio con el literal `No hay notificaciones` (clave `noNotifications`).
- El boton de marcar todo no se renderiza cuando la lista esta vacia.
- No se muestra el paginador.
- El subtitulo de total muestra 0 con el formato de la clave `total_notifications`.
- El estado vacio es un elemento con `role="status"`, de modo que un lector de pantalla lo anuncia.

**Red:** `GET /api/notifications?page=1&limit=15` -> 200 con `data: []` y `total: 0`, y
`totalPages: 1`.
**Limpieza:** ⚠️ DESTRUCTIVO si se creo el usuario solo para este caso: eliminar el usuario de prueba y Requiere `ALLOW_DESTRUCTIVE=true`.
sus notificaciones. Requiere `ALLOW_DESTRUCTIVE=true`.

### [NTF-011] Filtrar el listado por clinica como superadmin

**Rol** `superadmin` · **Ruta** `/notifications` · **P2** · **Resultado** `______`
**Precondición:** el superadmin tiene acceso a 2 clinicas; ambas tienen notificaciones de usuarios
distintos. Depende del area `19-`.
**Datos:** `clinica-sur` · `clinica-norte` · clave `clinicFilter`

1. Iniciar sesion como `superadmin` y abrir `/notifications`.
2. Localizar el selector con la etiqueta `Filtrar por clinica` (clave `clinicFilter`).
3. Anotar el total con el valor `Todas las clinicas` (clave `allClinics`).
4. Elegir una clinica y anotar el total.
5. Elegir la otra clinica y anotar el total.
6. Repetir el paso 4 con el rol `admin` de una de las dos clinicas.

**Esperado**
- El selector solo se renderiza para `superadmin`; con rol `admin` no aparece.
- Con `Todas las clínicas` el listado agrega las notificaciones de las dos clinicas y el `total` es la
  suma.
- Al elegir una clinica, el total baja al de esa clinica y todas las filas visibles pertenecen a ella.
- Cambiar de clinica devuelve la pagina a la 1.
- Con rol `admin`, `GET /api/notifications` sin `tenant_id` devuelve solo las de su propia clinica: el
  filtro por tenant se aplica en servidor aunque el parametro no viaje en la peticion.

**Red:** `GET /api/notifications?tenant_id=clinica-sur` -> 200 y
`GET /api/notifications?tenant_id=clinica-norte` -> 200. Verificar que ninguna fila de la primera
respuesta tiene `tenant_id` distinto de `clinica-sur`.
**Limpieza:** fijar el selector en `Todas las clinicas`.

### [NTF-012] Confirmar que un paciente no ve la campana en el topbar

**Rol** `patient` · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion de `patient` valida.
**Datos:** rol `patient` · ruta `/dashboard`

1. Iniciar sesion con el paciente y abrir `/dashboard`.
2. Inspeccionar la zona del topbar a la derecha del avatar.
3. Intentar escribir `/notifications` directamente en la barra de direcciones.
4. Anotar la ruta final y lo que se muestra.
5. Emitir `GET /api/notifications` con las cookies de esta sesion.

**Esperado**
- El icono de campana no esta en el DOM del topbar para el rol `patient`.
- Escribir `/notifications` redirige a una ruta permitida para el rol y no muestra el listado.
- `GET /api/notifications` con la sesion del paciente responde 200 con las notificaciones del propio
  paciente. Anotar en la seccion 6 que la API no restringe el rol aunque la UI esconda la funcion: la
  restriccion es solo de interfaz.
- El resto del topbar (tema, idioma, avatar) se mantiene visible e igual que para el resto de roles.

**Red:** `GET /api/notifications` -> 200 con `data` limitado a las filas cuyo `user_id` es el del
paciente. Verificar que ninguna fila pertenece a otro `user_id`.
**Limpieza:** cerrar sesion.

### [NTF-013] Comprobar el mismo comportamiento con una cuenta de rol user ⚠️ DESTRUCTIVO

**Rol** `user` · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** existe una cuenta con `role = 'user'` (alias historico de `patient`). El seed estandar
solo crea cuentas con `role = 'patient'`, asi que esta cuenta hay que crearla a proposito.
**Datos:** rol `user` · `users.role = 'user'`

1. Verificar en la base de datos que la cuenta de prueba tiene `role = 'user'` y no `patient`.
2. Iniciar sesion con esa cuenta y abrir `/dashboard`.
3. Comprobar si el icono de campana esta en el topbar.
4. Escribir `/notifications` en la barra de direcciones y anotar el resultado.
5. Emitir `GET /api/notifications` con esa sesion.

**Esperado**
- El comportamiento es identico al del rol `patient`: sin campana en el topbar y sin acceso a
  `/notifications` por ruta.
- `GET /api/notifications` responde 200 con las notificaciones de esa cuenta, igual que para `patient`.
- Si la cuenta de rol `user` no se puede crear porque el seed no la incluye, marcar el caso `BLOQUEADO`
  con el motivo y dejar constancia en la seccion 6.
- Ninguna parte del flujo depende de que el rol sea `patient` o `user` en la UI, solo en el backend.

**Red:** `GET /api/notifications` -> 200. Anotar el `role` devuelto por `GET /api/auth/me` y confirmar que
es `user`.
**Limpieza:** ⚠️ DESTRUCTIVO: eliminar la cuenta de rol `user` creada para este caso. Requiere Requiere `ALLOW_DESTRUCTIVE=true`.
`ALLOW_DESTRUCTIVE=true`.

### [NTF-014] Distinguir los tipos de notificacion y sus etiquetas

**Rol** `admin` · **Ruta** `/notifications` · **P3** · **Resultado** `______`
**Precondición:** existen notificaciones de los tipos `info`, `warning`, `success` y `error`.
**Datos:** claves `severityLabels.info`, `.warning`, `.success`, `.error`

1. Abrir `/notifications` y recorrer las tarjetas noting el texto de la etiqueta de tipo.
2. Comparar cada etiqueta con la clave `severityLabels.<tipo>` del namespace `notifications`.
3. Cambiar el idioma a `en` y repetir la lectura de las cuatro etiquetas.
4. Anotar el icono que acompana a cada tipo.

**Esperado**
- Las cuatro etiquetas se renderizan como `Info`, `Advertencia`, `Exito` y `Error`.
- Cada tipo tiene un icono distinto, no todos el mismo.
- En `en` las etiquetas cambian de idioma sin mostrar la clave cruda.
- El tipo se toma de la columna `type` de la fila, no de un campo `severity` independiente: no hay dos
  ejes de clasificacion en la respuesta.

**Red:** `GET /api/notifications?page=1&limit=15` -> 200. Verificar el campo `type` de cada fila y que sus
valores coinciden con las etiquetas mostradas.
**Limpieza:** volver al idioma `es`.

### [NTF-015] Comprobar el aislamiento de notificaciones entre tenants

**Rol** `admin` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** dos clinicas (`clinica-norte` y `clinica-sur`) con notificaciones de usuarios propios.
**Datos:** `tenant_id` de cada clinica · `id` de una notificacion de `clinica-norte`

1. Con el `admin` de `clinica-sur`, emitir `GET /api/notifications?limit=100`.
2. Anotar el `tenant_id` de cada fila devuelta.
3. Intentar `PATCH /api/notifications/<id de clinica-norte>/read`.
4. Intentar `PATCH /api/notifications/read-all` y comprobar el `count` devuelto.
5. Emitir `GET /api/notifications?tenant_id=clinica-norte` con el mismo `admin`.

**Esperado**
- `GET /api/notifications?limit=100` -> 200 y todas las filas tienen `tenant_id` igual al de
  `clinica-sur`. El parametro `tenant_id` enviado por un `admin` no amplía el alcance.
- `PATCH` sobre el `id` de `clinica-norte` -> 404 `Notification not found`, sin tocar la fila.
- `PATCH /api/notifications/read-all` -> 200 con `count` igual al numero de no leidas de `clinica-sur`,
  nunca al total de las dos clinicas.
- `GET /api/notifications?tenant_id=clinica-norte` -> 200 con `data: []`, no con filas ajenas.

**Red:** los cuatro status esperados, 200 / 404 / 200 / 200. Verificar que la cuarta respuesta esta vacia
y que ningun cuerpo incluye filas de `clinica-norte`.
**Limpieza:** restaurar el estado de lectura de la notificacion de `clinica-norte` si el paso 3 la
modifico.

### [NTF-016] Rechazar el acceso al buzon sin sesion

**Rol** `anónimo` · **Ruta** `/notifications` · **P1** · **Resultado** `______`
**Precondición:** sesion cerrada, sin cookies `access_token` ni `refresh_token`.
**Datos:** `/notifications` · `GET /api/notifications` · `PATCH /api/notifications/read-all`

1. Abrir `/notifications` sin sesion y anotar la ruta final.
2. Emitir `GET /api/notifications` sin cookies.
3. Emitir `PATCH /api/notifications/read-all` sin cookies.
4. Emitir `PATCH /api/notifications/1/read` sin cookies.
5. Recorrer con la herramienta de red los cuatro casos y anotar los status.

**Esperado**
- La UI redirige a la pantalla de login o de inicio de sesion; no renderiza el listado ni una pantalla
  de error 401.
- `GET /api/notifications` -> 401.
- `PATCH /api/notifications/read-all` -> 401.
- `PATCH /api/notifications/1/read` -> 401.
- Ninguno de los tres cuerpos de 401 filtra si el recurso existe.

**Red:** los tres 401 y la redireccion de la UI. Verificar que las peticiones mutantes sin sesion no
llegan a tocar la tabla `notifications`, por ejemplo porque el total de no leidas no cambia.
**Limpieza:** ninguna.

## 5. Defectos conocidos a verificar primero

No aplica. Ningun hallazgo de `90-HALLAZGOS-CODIGO.md` afecta al modulo de notificaciones: los seis
comportamientos sospechosos verificados en esta area (badge con el total, filtro `is_read` sin control en
la UI, API sin restriccion de rol, alias `user` sin seed, etiqueta de tipo derivada de `type` sin columna
`severity`, y la ausencia de `link` navegable) se registran como huecos en la seccion 6.

## 6. Huecos conocidos

- La campana del topbar lee `data.total` del listado paginado con `limit: 1` en lugar de llamar a
  `GET /api/notifications/unread-count`, que existe y responde `{ count }`. El badge muestra el total de
  notificaciones, no el de no leidas, y no baja a 0 al leerlas. NTF-007 y NTF-008 lo miden. El catalogo
  no tiene un ID para este hallazgo.
- El filtro `is_read` existe en la API y no tiene control en la UI. NTF-003 lo ejercita por red. No hay
  forma de verificarlo desde la interfaz.
- `GET /api/notifications` cuelga solo de `authMiddleware`: un `patient` o un `user` autenticado puede
  llamar al endpoint y recibir sus notificaciones aunque la ruta y la campana esten ocultas. NTF-012 y
  NTF-013 lo confirman. La restriccion es de interfaz, no de API.
- El seed no crea ninguna cuenta con `role = 'user'`. NTF-013 queda `BLOQUEADO` salvo que se cree una a
  proposito.
- El namespace `notifications` define `severityLabels` y `type` con las mismas cuatro claves, pero la
  tabla solo tiene la columna `type`. No hay un segundo eje de severidad que verificar: NTF-014 solo
  puede cubrir `type`.
- Los botones de accion por tarjeta dependen de `is_read` y del campo `link`. No hay accion de borrar ni
  de archivar, asi que el buzon solo crece: no existe caso posible de "notificaciones descartadas".
- Los tiempos relativos ("Ahora mismo", "hace {{count}} minutos") se calculan en el cliente a partir de
  `created_at`. Con la pagina abierta mas de un minuto el texto cambia sin peticion, y ningun caso
  comprueba que el listado se actualiza.
- El paginador se oculta cuando `totalPages` es 1, asi que con 15 notificaciones o menos nunca se ve. Para
  NTF-002 hace falta pasar de 15.

## 7. Resultado del area

| Metrica | Valor |
|---|---|
| Casos escritos | 16 |
| Casos requeridos | 16 |
| P0 | 1 (NTF-015) |
| P1 | 6 |
| P2 | 7 |
| P3 | 2 |
| Casos destructivos | 4 (NTF-006, NTF-008, NTF-010, NTF-013) |
| Casos que dependen de `19-` | 2 (NTF-011, NTF-015) |
| Hallazgos en la seccion 5 | 0 |
| Huecos registrados | 8 |
| Ejecucion | `______` |

---

*Alcance: 16 casos del buzon de notificaciones, con lectura por red de los cuatro endpoints del modulo;
las mutaciones de estado de lectura se revierten en la limpieza de cada caso. 2026-10-01.*

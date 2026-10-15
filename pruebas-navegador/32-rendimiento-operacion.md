# 32 — Rendimiento y operacion

> Cubre el comportamiento del sistema bajo carga y en reposo: los endpoints de salud que usa el
> orquestador, la exposicion de metricas, el arranque en frio, el peso de la SPA, el estado de la cola de
> trabajos y de las migraciones, la correlacion de peticiones, los errores de consola y de red, y el
> presupuesto de primer render.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `32` | `RND` | C4 | Mensual | 16 | — | — |

## 1. Que cubre

- Los cuatro endpoints de salud: readiness y liveness, con y sin el prefijo `/api`.
- El acceso a las metricas Prometheus con su token y sin el, y el contenido de lo que devuelve.
- El arranque en frio: primera peticion tras un periodo de inactividad del contenedor.
- Tiempos de carga de la landing anonima y peso total de los bundles servidos.
- El estado de la cola de trabajos en segundo plano, que no tiene endpoint propio.
- Las 31 migraciones aplicadas y la ausencia de migraciones pendientes.
- La correlacion de peticiones con `X-Request-ID` y su presencia en los logs.
- Los errores de consola y los errores de red esperados en la landing y en el panel.
- El pool de conexiones y el registro de consultas lentas.
- La generacion de reportes en PDF y su tiempo de respuesta.
- La compresion, las cabeceras de cache y los recursos estaticos servidos por el backend.
- El presupuesto de primer render en movil, con LCP y CLS.

No mide carga sostenida ni pruebas de penetracion, que no forman parte del alcance de este area, ni el
comportamiento del frontend servido por un CDN distinto del backend.

## 2. Roles y rutas

| Rol | Rutas | Requisito |
|---|---|---|
| `anónimo` | `GET /health`, `GET /api/health`, `GET /health/live`, `GET /api/health/live` | ninguno |
| `anónimo` | `GET /metrics`, `GET /api/metrics` | `Authorization: Bearer $METRICS_TOKEN` |
| `cualquiera` (autenticado) | `/` (landing), `/dashboard` | sesion valida |
| `sistema` | cola de trabajos en segundo plano, runner de migraciones | acceso al contenedor y a los logs |

Ninguno de los endpoints de salud ni de metricas exige sesion de usuario: se validan con una peticion
anonima. La validacion del token de metricas es parte de los casos, no un requisito previo.

## 3. Precondiciones de datos

- Contenedor del backend en ejecucion y con los logs accesibles.
- `METRICS_TOKEN` definido en el entorno del contenedor, para el caso que lo necesita.
- Al menos una hora de trafico real registrada en las metricas antes de RND-003, RND-008 y RND-013, para
  que las series tengan datos y no esten vacias.
- Al menos un trabajo en la cola (correo o notificacion) para RND-007, generado desde el area `17-` o
  `27-`.
- Base de datos migrada y una conexion disponible para RND-009 y RND-013.
- Al menos una cita y un pago con reporte generado para RND-014.
- Herramienta de medicion de rendimiento con CPU y red limitadas para RND-016, y una medicion en caliente
  para descartar el arranque en frio.
- Un minuto de reposo antes de RND-004, con el timestamp de la ultima peticion anotado.
- Acceso al panel de Network y a la consola del navegador en RND-005, RND-006, RND-011, RND-012 y RND-016.

## 4. Casos

### [RND-001] Comprobar los cuatro endpoints de salud

**Rol** `anónimo` · **Ruta** `GET /health`, `GET /api/health`, `GET /health/live`, `GET /api/health/live` · **P3** · **Resultado** `______`
**Precondición:** backend en ejecucion; sin cabeceras de autenticacion.
**Datos:** cuatro endpoints · codigos esperados `200` · umbral de respuesta `200` ms

1. Hacer `GET /health` y anotar el codigo, el cuerpo y el tiempo de respuesta.
2. Repetir con `GET /api/health`.
3. Hacer `GET /health/live` y anotar codigo, cuerpo y tiempo.
4. Repetir con `GET /api/health/live`.
5. Anotar los campos del cuerpo de readiness (`status`, `timestamp`, `version`, `checks`) y los del
   cuerpo de liveness, y comparar ambos.
6. Anotar si alguno de los cuatro endpoints esta ausente o devuelve 404.

**Esperado**
- Los cuatro endpoints devuelven 200, con lo que H-45 queda desmentido por el codigo: la afirmacion del
  catalogo de que la ruta de liveness no existe no se sostiene.
- El cuerpo de readiness trae `status` con valor `ok`, mas `timestamp` en ISO 8601 y `version` con la
  version del `package.json`. Anotar que no trae `uptime`, campo que el gate SMK-003 si exige: es una
  discrepancia entre el gate y la respuesta real, no un fallo de la salud.
- En desarrollo, `checks` de readiness trae `database` con `status`, `latency_ms` y `pool` (`total`,
  `idle`, `waiting`), ademas de `mercadopago.status` y `memory` con `heap_used_mb` y `heap_total_mb`. En
  produccion se reduce a `checks.database.status`.
- El cuerpo de liveness no consulta la base de datos, por lo que responde tambien con la base de datos
  caida. Anotar la diferencia exacta de los dos cuerpos.
- El tiempo de respuesta de los cuatro esta por debajo de 200 ms en caliente.
- Ninguno de los cuatro exige token ni cookie, y ninguno registra un error de consola en el servidor.

**Red:** cuatro peticiones, todas 200. Anotar el tamano de cada respuesta.
**Limpieza:** ninguna.

### [RND-002] Comprobar la liveness con la base de datos no disponible ⚠️ DESTRUCTIVO

**Rol** `anónimo` · **Ruta** `GET /health/live`, `GET /health` · **P2** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** backend en ejecucion; permisos para detener el servicio de base de datos en el entorno
de pruebas.
**Datos:** base de datos detenida · luego arrancada de nuevo

1. Con la base de datos activa, pedir `GET /health/live` y `GET /health` y anotar ambos codigos.
2. Detener el servicio de base de datos.
3. Pedir `GET /health/live` y anotar el codigo y el tiempo de respuesta.
4. Pedir `GET /health` y anotar el codigo, el cuerpo y el tiempo de respuesta.
5. Hacer una peticion de negocio, por ejemplo `GET /api/notifications`, y anotar el codigo y el tiempo
   hasta la respuesta.
6. Arrancar de nuevo la base de datos y repetir los pasos 3, 4 y 5.
7. Anotar cuanto tardo cada endpoint en recuperarse.

**Esperado**
- Con la base de datos caida, liveness sigue devolviendo 200: no consulta la base de datos, que es lo que
  la distingue de readiness.
- Con la base de datos caida, readiness devuelve 503 con `status` en `degraded` y `checks.database.status`
  en `error`, que es el comportamiento exacto del codigo. Anotar el cuerpo literal para contrastarlo.
- Las peticiones de negocio fallan con 500 o 503 y no devuelven datos a medias ni datos cacheados.
- El tiempo de respuesta de liveness no se degrada mientras la base de datos esta caida, mientras que el de
  readiness sube por el intento fallido de `SELECT 1`.
- Tras arrancar la base de datos, readiness vuelve a 200 sin reiniciar el backend, y las peticiones de
  negocio se recuperan.
- Ningun endpoint de salud filtra la cadena de conexion, el nombre de la base de datos ni el mensaje de
  error del driver en el cuerpo de la respuesta: el unico detalle expuesto es `status` y `latency_ms`.

**Red:** peticiones de los pasos 1, 3, 4, 5 y 6, con sus codigos y tiempos. Anotar si hay reintentos
automaticos visibles en la pestana Network.
**Limpieza:** arrancar la base de datos y verificar que readiness vuelve a 200. Requiere
`ALLOW_DESTRUCTIVE=true`.

### [RND-003] Obtener las metricas con y sin token

**Rol** `anónimo` · **Ruta** `GET /metrics`, `GET /api/metrics` · **P2** · **Resultado** `______`
**Precondición:** `METRICS_TOKEN` definido en el entorno; existe trafico reciente que generar metricas.
**Datos:** `Authorization: Bearer $METRICS_TOKEN` · sin cabecera · token incorrecto

1. Hacer `GET /metrics` sin ninguna cabecera y anotar el codigo.
2. Repetir con una cabecera `Authorization` vacia.
3. Repetir con `Authorization: Bearer token-incorrecto`.
4. Hacer `GET /metrics` con el token correcto y anotar el codigo y el tamano de la respuesta.
5. Repetir con `GET /api/metrics` y el token correcto.
6. Guardar el cuerpo de la respuesta de metricas en un archivo de texto.
7. Buscar en ese archivo las familias de metricas de HTTP, de pool de base de datos y de trabajos.

**Esperado**
- Sin token, con token vacio y con token incorrecto, la respuesta es 401 o 403 y el cuerpo no contiene
  ninguna metrica.
- Con el token correcto, `/metrics` y `/api/metrics` devuelven 200 con el formato de exposicion de
  Prometheus.
- El cuerpo incluye contadores de peticiones HTTP con su codigo de estado y su duracion, y contadores de
  consultas a la base de datos. Anotar los nombres exactos de las familias.
- El cuerpo no incluye valores de `METRICS_TOKEN` ni de otra variable de entorno, ni datos personales de
  los pacientes.
- La respuesta lleva `Content-Type: text/plain` en version de texto plano y no HTML.
- El tamano de la respuesta es razonable y no incluye una serie por cada combinacion de ruta y usuario.

**Red:** siete peticiones en total, con sus codigos. Anotar el tamano en bytes de la respuesta correcta.
**Limpieza:** borrar el archivo de metricas descargado.

### [RND-004] Medir el arranque en frio de la primera peticion

**Rol** `anónimo` · **Ruta** `GET /health` · **P2** · **Resultado** `______`
**Precondición:** backend en ejecucion y sin peticiones entrantes durante el ultimo minuto; timestamp de
la ultima peticion anotado.
**Datos:** umbral de arranque en frio `2000` ms · umbral en caliente `200` ms

1. Anotar la hora de la ultima peticion antes de dejar el sistema en reposo.
2. Esperar al menos 60 segundos sin hacer ninguna peticion.
3. Hacer `GET /health` y cronometrar el tiempo hasta la primera respuesta y hasta la respuesta completa.
4. Hacer `GET /health` de nuevo de inmediato y cronometrar lo mismo.
5. Repetir los pasos 3 y 4 cinco veces, anotando cada vez.
6. Hacer una peticion de negocio, por ejemplo `GET /api/doctors/public`, y cronometrarla en frio y en
   caliente.

**Esperado**
- La primera peticion tras el reposo es visiblemente mas lenta que las siguientes; se anota cuanto y si
  supera el umbral de 2000 ms.
- A partir de la segunda peticion el tiempo se estabiliza por debajo de 200 ms.
- El arranque en frio no devuelve un error ni un 503: responde 200 correctamente.
- La diferencia entre la primera y la segunda peticion no se repite tras cada pausa larga, lo que
  descarta que el coste este en el pool de conexiones y no en el arranque del proceso.
- La peticion de negocio en frio responde tambien correctamente, con un tiempo mayor que en caliente pero
  sin error.
- Anotar los seis tiempos medidos, porque la dispersion entre ejecuciones es parte del resultado.

**Red:** siete peticiones cronometradas. Anotar si la primera genera reintentos hacia la base de datos.
**Limpieza:** ninguna.

### [RND-005] Medir los tiempos de carga de la landing anonima

**Rol** `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** sin sesion; cache del navegador vacia; red sin limitar.
**Datos:** landing estatica · servicios de specialties, doctors y clinics cargados al montar

1. Abrir la pestana Network con la cache desactivada y cargar `/`.
2. Anotar el codigo, el tamano y el tiempo del documento.
3. Anotar el numero total de peticiones, agrupadas por tipo: script, stylesheet, imagen, fuente, xhr, fetch.
4. Identificar las peticiones que se disparan al montar la pagina y su tiempo de respuesta.
5. Anotar el tiempo hasta contenido util y hasta que la pagina deja de cambiar.
6. Repetir la medicion tres veces y comparar.

**Esperado**
- El documento principal se sirve con 200 y sin redireccion a un servidor externo.
- La landing renderiza contenido visible sin depender de las peticiones de la API: el texto, los precios y
  los enlaces se ven aunque esas peticiones fallen. Anotar si aparece un estado de carga en el hero.
- Las peticiones a la API cargan en paralelo y no bloquean la pintura inicial.
- Ninguna peticion se repite por el mismo endpoint dentro de la misma carga. Anotar cualquier duplicado.
- Los tres tiempos medidos son similares entre si, sin una primera carga muy superior.
- Anotar los tres valores de tiempo hasta contenido util, porque la comparacion entre ejecuciones es lo que
  hace falta para detectar una regresion.

**Red:** agrupar las peticiones del paso 3 por tipo con su numero y su tamano total, y anotar
explicitamente el total en KB.
**Limpieza:** ninguna.

### [RND-006] Medir el tamano y el numero de los bundles servidos

**Rol** `anónimo` · **Ruta** `/` y `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sin sesion en la landing; sesion activa en el panel; cache del navegador vacia.
**Datos:** umbral de referencia del total del bundle, a fijar en la primera ejecucion

1. Cargar `/` con la cache desactivada y listar cada archivo JavaScript con su tamano sin comprimir y
   comprimido.
2. Sumar el total de JavaScript y el total de CSS de la landing.
3. Repetir los pasos 1 y 2 en `/dashboard` con sesion activa.
4. Buscar si algun modulo se carga en un fragmento separado, en vez de dentro del bundle principal.
5. Anotar el numero de peticiones de script en cada una de las dos pantallas.
6. Anotar el nombre del archivo mas grande de cada pantalla.

**Esperado**
- Los dos totales quedan por debajo del umbral que se fije en la primera ejecucion, y en ejecuciones
  posteriores no crecen sin un cambio de version deliberado.
- El panel carga mas codigo que la landing, porque incluye las tablas y los modulos de administracion, y la
  diferencia esta justificada por sus funciones.
- Los modulos pesados que no se necesitan en la carga inicial se sirven como fragmentos aparte, no dentro
  del bundle principal. Anotar cuales se detectan.
- No hay duplicados: el mismo archivo no se descarga dos veces en una misma carga.
- El archivo mas grande esta identificado por nombre y tamano en cada pantalla, para poder compararlo con
  la ejecucion siguiente.
- Anotar el total en KB de cada pantalla, que es la cifra de referencia para RND-016.

**Red:** el listado completo de peticiones de script y de CSS de las dos pantallas, con su tamano.
**Limpieza:** cerrar sesion.

### [RND-007] Comprobar el estado de la cola de trabajos en segundo plano

**Rol** `sistema` · **Ruta** cola de trabajos en segundo plano (sin endpoint HTTP) · **P2** · **Resultado** `______`
**Precondición:** acceso a los logs del contenedor; existe al menos un trabajo pendiente, generado desde
el area `17-` o `27-`.
**Datos:** un trabajo pendiente · contadores de cola · ultima ejecucion del planificador

1. En los logs, localizar la linea que confirma que el planificador de trabajos arranco.
2. Generar un trabajo pendiente: por ejemplo, una peticion que dispare un envio de correo.
3. Seguir en los logs la aparicion del trabajo en la cola y su posterior proceso.
4. Anotar el tiempo entre la generacion del trabajo y su proceso completo.
5. Repetir el paso 2 cinco veces y anotar los cinco tiempos.
6. Intentar pedir por HTTP un listado de los trabajos, en `/api/jobs` y en `/api/queue`.
7. Comprobar si el trabajo se procesa aunque la peticion HTTP que lo genero ya haya respondido.

**Esperado**
- Los logs confirman que el planificador arranco y que el trabajo se proceso sin reiniciar nada.
- El trabajo se procesa despues de que la peticion HTTP respondiera: la cola no depende de que el cliente
  mantenga la conexion abierta.
- Los cinco tiempos estan en el mismo orden de magnitud, sin un trabajo que se queda indefinidamente
  esperando.
- Los pasos 6 devuelven 404: no existe un endpoint HTTP que exponga la cola, y esa ausencia queda
  confirmada como un hueco, no como un fallo.
- El trabajo se procesa una sola vez, sin duplicados en los logs, y tras processing queda registrado como
  completado.
- Si el trabajo falla, el log indica el motivo y el reintento. Anotar el numero maximo de reintentos que
  aparece en los logs.

**Red:** el paso 6 produce dos 404; el paso 2 produce el 200 o el 202 de la peticion que encola el trabajo.
Anotar el codigo de esa respuesta.
**Limpieza:** dejar la cola vacia; no reiniciar el contenedor para "limpiar" el estado de los trabajos.

### [RND-008] Revisar las metricas de trabajos y de correos

**Rol** `anónimo` · **Ruta** `GET /metrics` · **P3** · **Resultado** `______`
**Precondición:** `METRICS_TOKEN` disponible; se ha generado trafico con envios de correo y notificaciones
en la ultima hora.
**Datos:** token de metricas · contadores de trabajos · contadores de correo

1. Pedir las metricas con el token y guardarlas en un archivo.
2. Buscar las familias que cuentan trabajos encolados, trabajos procesados y trabajos fallidos.
3. Anotar los valores actuales de los tres contadores.
4. Generar diez envios de correo y volver a pedir las metricas.
5. Repetir la lectura y comparar los contadores con los del paso 3.
6. Provocar un fallo de envio, con un destinatario invalido, y comprobar como sube el contador de fallidos.
7. Anotar el nombre exacto de cada familia y si hay alguna de ellas ausente.

**Esperado**
- Las metricas exponen contadores de trabajos y de correo con nombres estables, que se pueden comparar
  entre ejecuciones.
- Tras los diez envios, el contador de procesados aumenta en un valor coherente con los diez trabajos, y
  el de fallidos no sube si todos fueron correctos.
- El envio fallido incrementa el contador de fallidos y no el de procesados, y no se queda a medias.
- Los contadores son monotonos: nunca disminuyen entre dos lecturas dentro de la misma ejecucion del
  proceso. Anotar si alguno se reinicia, lo que indicaria que el proceso se reinicio.
- Ninguna metrica de trabajos incluye la direccion de correo del destinatario ni su nombre.
- Anotar que familias de correo existen y cuales no: si solo se expone trabajo enviado, la granularidad
  queda limitada.

**Red:** tres peticiones a `/metrics` con 200. Anotar el delta de los contadores entre la primera y la
ultima lectura.
**Limpieza:** borrar los archivos de metricas descargados.

### [RND-009] Comprobar el estado de las 31 migraciones aplicadas ⚠️ DESTRUCTIVO

**Rol** `sistema` · **Ruta** tabla de migraciones y runner de migraciones (sin endpoint HTTP) · **P2** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** acceso a la base de datos y a los logs; el backend esta en ejecucion.
**Datos:** migraciones `001` a `031` · tabla de control de migraciones

1. Consultar la tabla de control de migraciones y contar las filas aplicadas.
2. Anotar el identificador mas alto aplicado y si hay identificadores intermedios que falten.
3. Comparar ese total con el numero de archivos de migracion existentes en el repositorio.
4. Buscar en los logs la linea que confirma el resultado del runner al arrancar el backend.
5. Anotar si el runner se ejecuta al arrancar el proceso o si hay que lanzarlo aparte.
6. Simular un fallo del runner con una migracion pendiente ficticia, en una base de datos de pruebas, y
   observar el resultado.
7. Anotar el tiempo total que tardo la aplicacion del conjunto de migraciones.

**Esperado**
- Hay 31 migraciones aplicadas, sin huecos: cada identificador del 001 al 031 aparece exactamente una vez.
- El numero de filas coincide con el numero de archivos de migracion del repositorio; si no coincide, la
  diferencia queda anotada como hallazgo.
- El backend arranca con las migraciones ya aplicadas y no intenta reaplicar ninguna.
- El paso 6 no deja la base de datos en un estado intermedio inconsistente: la migracion fallida no se
  marca como aplicada y el proceso lo comunica en los logs.
- El resultado del runner queda registrado en los logs con un mensaje inequivoco de exito o de fallo.
- Anotar si el runner tiene reintentos y cuantos, y cuanto tardo en total.

**Red:** ninguna peticion HTTP: el estado se lee de la base de datos y de los logs. Anotar si el runner
expone algun endpoint.
**Limpieza:** revertir la migracion ficticia del paso 6 y restaurar la base de datos de pruebas. Requiere
`ALLOW_DESTRUCTIVE=true`.

### [RND-010] Correlacionar peticiones con el identificador de peticion

**Rol** `cualquiera` (autenticado) · **Ruta** `GET /api/notifications` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; acceso a los logs del contenedor.
**Datos:** `X-Request-ID` · `X-Correlation-Id` (encabezado incorrecto, no debe existir)

1. Hacer una peticion a `/api/notifications` sin `X-Request-ID` y anotar la respuesta.
2. Anotar el valor de `X-Request-ID` que devuelve la respuesta, si devuelve alguno.
3. Repetir la peticion con `X-Request-ID:_revision-001` y anotar la respuesta.
4. Repetir con un valor inventado largo, de mas de 100 caracteres.
5. Buscar en los logs la linea correspondiente a `revision-001` y anotar su identificador.
6. Repetir la peticion con la cabecera `X-Correlation-Id: revision-002` y buscar ese valor en los logs.
7. Anotar si el identificador aparece una vez o varias veces por peticion.

**Esperado**
- El backend genera un `X-Request-ID` cuando la peticion no trae uno, y lo devuelve en la respuesta.
- El valor enviado en el paso 3 se respeta y es el que aparece en el log, lo que permite correlacionar la
  peticion del cliente con la linea del servidor.
- Un valor excessivamente largo se acota o se sustituye por uno generado, sin inyectar contenido arbitrario
  en el log. Anotar cual de las dos cosas ocurre.
- El paso 6 no produce ningun registro con `revision-002`: la cabecera correcta es `X-Request-ID`, y
  `X-Correlation-Id` es el nombre equivocado que aparece en el catalogo de la H-62.
- El identificador de una peticion aparece en su linea de log y en las de sus subconsultas, de modo que se
  puede seguir el recorrido completo. Anotar cuantas veces aparece.
- Ningun identificador se genera en el navegador, es decir, ningun caso depende de que el cliente lo
  invente para poder correlacionar.

**Red:** cuatro peticiones a `/api/notifications`, todas 200. Anotar el `X-Request-ID` de cada respuesta.
**Limpieza:** cerrar sesion.

### [RND-011] Revisar los errores de consola en la landing y en el panel

**Rol** `cualquiera` (autenticado) · **Ruta** `/` y `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** cache del navegador vacia; consola abierta y limpia antes de empezar.
**Datos:** consola del navegador · cuatro pantallas

1. Vaciar la consola y cargar `/` con la cache desactivada.
2. Recorrer la landing completa, incluidos el desplegable de precios y el envio del formulario de demo.
3. Vaciar la consola y abrir `/dashboard` con sesion activa.
4. Recorrer las secciones del panel: resumen, reservas, pacientes, notificaciones y ajustes.
5. Anotar cada error y cada aviso de la consola, con su mensaje literal y su archivo de origen.
6. Anotar la cuenta de errores por tipo: React, red, i18n, estilos.

**Esperado**
- Ningun error de React en la consola en ninguna de las dos pantallas; en particular, ningun aviso sobre
  un estado que se actualiza durante el render, ni sobre una clave `key` repetida en una lista.
- Ningun aviso de i18n por clave ausente en ninguna pantalla.
- Los unicos errores tolerados son los de red del paso 6 de UX-007, que solo ocurren cuando la API responde
  con un error de negocio esperado; fuera de esa situacion no hay ninguno.
- Los errores que provienen de la peticion de datos fallida no se duplican: un mismo fallo aparece una vez
  en la consola y no en varias.
- Ningun aviso de accesibilidad ni de tiempo de render se repite en cada navegacion.
- Anotar la cuenta total de errores y de avisos por pantalla, que es la cifra de referencia para la
  siguiente ejecucion.

**Red:** las peticiones que acompanan a cada pantalla, con su codigo. Anotar si alguna peticion se lanza dos
veces.
**Limpieza:** vaciar la consola y cerrar sesion.

### [RND-012] Comprobar el manejo de los errores de red esperados

**Rol** `cualquiera` (autenticado) · **Ruta** `/patients` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; la herramienta de red permite simular respuestas y tiempos de espera.
**Datos:** 500 · 503 · 401 · 429 · timeout de 30 s · respuesta vacia

1. Simular un 500 desde `/api/patients` y observar la pantalla.
2. Simular un 503 y observar la pantalla.
3. Simular un 401 y observar si la sesion se invalida y a donde lleva al usuario.
4. Simular un 429 y observar el mensaje, anotando si indica esperar y cuanto.
5. Retrasar la respuesta de `/api/patients` 30 segundos y observar la pantalla.
6. Devolver una respuesta vacia con 200 y observar la pantalla.
7. Recuperar la API y comprobar si hace falta recargar o si la pantalla se recupera sola.

**Esperado**
- Un 500 y un 503 muestran el estado de error con un mensaje legible y una accion de reintento, no una
  pantalla en blanco ni un volcado de objeto.
- Un 401 invalida la sesion y lleva a la pagina de inicio de sesion; no deja la interfaz en un estado en el
  que parezca que hay sesion activa.
- Un 429 muestra un mensaje de espera utilizable, sin el detalle crudo del cuerpo de la respuesta, y no
  dispara reintentos automaticos encadenados. Anotar si aparece el valor de `Retry-After`.
- El retraso de 30 s no deja la interfaz colgada: se muestra el estado de carga y, al vencer el tiempo de
  espera, un mensaje. Anotar si la peticion se cancela o sigue viva.
- Una respuesta 200 vacia se trata como lista vacia, no como error ni como `undefined`.
- Tras recuperar la API, la pantalla se recupera sola o con un unico clic en reintentar, sin recargar la
  pagina entera.

**Red:** seis respuestas simuladas con su codigo; anotar tambien si se produce alguna peticion repetida
tras el fallo.
**Limpieza:** retirar todas las reglas de simulacion de la herramienta de red.

### [RND-013] Revisar el pool de conexiones y el registro de consultas lentas

**Rol** `anónimo` · **Ruta** `GET /metrics` · **P2** · **Resultado** `______`
**Precondición:** `METRICS_TOKEN` disponible; la base de datos tiene al menos 5 conexiones abiertas y ha
registrado trafico en la ultima hora.
**Datos:** contadores de pool · conexiones inactivas · consultas lentas

1. Pedir las metricas y buscar las familias de pool de conexiones.
2. Anotar el total de conexiones, las inactivas, las en uso y las que esperan.
3. Hacer una consulta de negocio pesada, como un listado con paginacion grande, y volver a pedir las
   metricas.
4. Repetir la consulta cinco veces y observar el pico de conexiones en uso.
5. Consultar los logs en busca de avisos de consulta lenta, anotando su texto literal.
6. Esperar un minuto de reposo y volver a pedir las metricas para ver si las conexiones se liberan.
7. Anotar el limite configurado de conexiones del pool.

**Esperado**
- Las metricas exponen el estado del pool con contadores distinguibles, y sus nombres son los mismos que en
  ejecuciones anteriores.
- Tras las cinco consultas, las conexiones en uso vuelven a cero: no hay fugas de conexion.
- El pico de conexiones en uso se mantiene por debajo del limite configurado, y el limite queda anotado.
- No aparece ninguna conexion esperando indefinidamente: el contador de espera es cero tras cada tanda.
- El log de consulta lenta aparece solo cuando la consulta supera el umbral configurado, y su texto
  incluye la duracion y la consulta, sin datos personales.
- Tras el minuto de reposo, las conexiones inactivas se liberan o el pool las reutiliza, sin crecer de
  forma indefinida entre ejecuciones.

**Red:** tres peticiones a `/metrics` con 200. Anotar los tres valores de conexiones en uso.
**Limpieza:** borrar el archivo de metricas descargado.

### [RND-014] Medir la generacion de los reportes en PDF

**Rol** `cualquiera` (autenticado) · **Ruta** `/reports`, endpoint de reportes con PDF · **P2** · **Resultado** `______`
**Precondición:** sesion activa de `doctor`; existen al menos una cita y un pago con los datos de un
paciente de prueba.
**Datos:** umbral de generacion de PDF, a fijar en la primera ejecucion · un reporte con datos y otro sin
datos

1. Abrir la pantalla de reportes y cronometrar la carga inicial.
2. Generar un reporte que tenga datos y cronometrar hasta que el PDF empieza a descargarse.
3. Repetir la generacion cinco veces y anotar los cinco tiempos.
4. Generar un reporte sin datos y cronometrarlo, anotando que responde y no se queda colgado.
5. Abrir el PDF descargado y comprobar que tiene contenido y no esta vacio ni truncado.
6. Comprobar que el nombre del archivo descargado es correcto y no incluye caracteres raros.
7. Intentar generar el reporte de otro usuario de otra clinica y anotar el codigo.

**Esperado**
- La generacion del PDF responde con el status esperado dentro del umbral que se fije en la primera
  ejecucion, y se anota el valor de ese umbral.
- Los cinco tiempos son similares entre si, sin una primera generacion muy superior que sugiera cache en
  frio.
- Un reporte sin datos responde con un PDF vacio o con un mensaje claro, no con una peticion colgada ni con
  un error 500.
- El PDF descargado se abre y contiene la informacion del reporte, con la tipografia legible y sin paginas
  en blanco al final.
- El nombre del archivo es estable y legible, y no incluye rutas del servidor ni identificadores internos.
- El paso 7 no devuelve el reporte de otro usuario: responde 403 o un 404, nunca 200 con los datos ajenos.
  Anotar el codigo exacto.

**Red:** seis peticiones, con su codigo y su duracion. Anotar si la generacion es sincrona o si responde con
un identificador de trabajo.
**Limpieza:** borrar los PDF descargados y cerrar sesion.

### [RND-015] Comprobar compresion, cache y recursos estaticos

**Rol** `anónimo` · **Ruta** `/`, `/assets/*`, `GET /api/doctors/public` · **P2** · **Resultado** `______`
**Precondición:** sin sesion; acceso a las cabeceras de respuesta en la herramienta de red.
**Datos:** umbral de compresion, a fijar en la primera ejecucion · cabecera `Cache-Control`

1. Pedir el documento principal `/` y anotar sus cabeceras de respuesta.
2. Pedir un bundle JavaScript de la SPA y anotar sus cabeceras.
3. Repetir el paso 2 con la cabecera `Accept-Encoding: gzip` explicita.
4. Repetir el paso 2 con la cabecera `Accept-Encoding` ausente.
5. Pedir `GET /api/doctors/public` y anotar sus cabeceras.
6. Pedir una ruta de API con datos sensibles, como `GET /api/notifications` sin sesion, y anotar sus
   cabeceras.
7. Anotar el tamano de cada respuesta con y sin compresion.

**Esperado**
- El documento y los bundles se sirven con compresion activada, y el tamano comprimido es claramente
  menor que el sin comprimir. Anotar el umbral de referencia en la primera ejecucion.
- Los bundles estaticos llevan `Cache-Control` con una caducidad larga, con lo que una segunda visita no
  los vuelve a descargar. Anotar el valor exacto.
- La respuesta de la API no lleva la misma cache de larga duracion que un bundle: una respuesta de datos
  de negocio no se cachea en el navegador ni en un proxy intermedio.
- Ninguna respuesta de API lleva `Set-Cookie` de sesion cuando la peticion es anonima.
- Las respuestas JSON de la API no llevan `Cache-Control: public`, para no exponer datos entre usuarios a
  traves de una cache compartida.
- Anotar los siete pares de codigo y tamano, porque son la referencia para detectar una regresion de peso.

**Red:** siete peticiones con sus cabeceras. Anotar las de `Content-Encoding`, `Cache-Control` y
`Content-Type` de cada una.
**Limpieza:** vaciar la cache del navegador.

### [RND-016] Comprobar el presupuesto de primer render en movil

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; medicion en caliente, con la medicion de arranque en frio ya descartada;
perfil de movil con CPU y red limitadas.
**Datos:** umbral de LCP `2500` ms · umbral de CLS `0.1` · umbral de tiempo de bloqueo `200` ms

1. Activar el perfil de movil con la CPU y la red limitadas a valores acordados, y anotar cuales son.
2. Medir `/dashboard` con la herramienta de rendimiento del navegador, en una sesion ya caliente.
3. Anotar el LCP, el CLS, el tiempo de bloqueo total y el tiempo hasta que la pagina es interactiva.
4. Repetir la medicion tres veces y anotar los tres valores de cada metrica.
5. Comprobar si hay un recurso que bloquea el primer render, como una fuente o un script en el `<head>`.
6. Comprobar si el cambio de idioma o de tema desplaza el contenido al aplicarse.
7. Anotar cual de las cuatro imagenes o logos carga primero en la pantalla.

**Esperado**
- El LCP se mantiene por debajo de 2500 ms en las tres mediciones con el perfil limitado.
- El CLS se mantiene por debajo de 0.1: el contenido no salta de forma visible mientras carga. Anotar
  cualquier elemento que se desplace, sobre todo si aparece un estado de carga encima de datos ya
  pintados.
- El tiempo de bloqueo total se mantiene por debajo de 200 ms, de modo que la pagina responde mientras
  carga.
- El primer render no esta bloqueado por un recurso de terceros; si hay un recurso bloqueante, se anota su
  nombre y se documenta como hallazgo.
- Cambiar el idioma o el tema no produce un desplazamiento perceptible del contenido, y el CLS se mantiene
  por debajo de 0.1 tambien en esa transicion.
- Anotar los tres valores de cada metrica, porque la dispersion entre las tres mediciones es tan
  relevante como la media.

**Red:** el numero de peticiones de la medicion y su peso total en KB, para relacionarlo con RND-006.
**Limpieza:** cerrar la sesion y desactivar el perfil limitado.

## 5. Defectos conocidos a verificar primero

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-45 | RND-001, RND-002 | El catalogo afirma que la ruta de liveness no esta montada. El codigo monta `GET /health/live` y `GET /api/health/live`, asi que el caso debe encontrar 200 en las dos y la diferencia real con readiness es que liveness no consulta la base de datos. Si alguno de los cuatro endpoints devolviera 404, ahi si seria un defecto y no una discrepancia documental |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

- El sistema expone metricas de peticiones y de base de datos, pero no hay un endpoint que exponga el estado
  de la cola de trabajos. RND-007 tiene que leer los logs, y RND-008 solo ve contadores agregados si
  existen. No hay forma programatica de saber cuantos trabajos hay pendientes.
- El catalogo de la H-45 menciona la ruta de liveness como inexistente y ademas usa el nombre de cabecera
  equivocado (`X-Correlation-Id` en lugar de `X-Request-ID`). Las dos afirmaciones se contradicen con el
  codigo, y RND-001 y RND-010 las comprueban, pero la documentacion sigue sin corregirse.
- El gate G0 (SMK-003) exige que `GET /api/health` devuelva `status`, `uptime` y `version`, y la
  respuesta real no trae `uptime`: trae `status`, `timestamp` y `version`. RND-001 lo anota como
  discrepancia, pero ningun caso de este area propone la correccion ni del codigo ni del gate.
- No hay prueba de carga sostenida en este area. RND-004 mide el arranque en frio y RND-013 mide el limite
  del pool, pero nadie sabe cual es el numero maximo de usuarios concurrentes que aguanta el sistema.
- Los umbrales de RND-006, RND-014 y RND-015 se fijan en la primera ejecucion, porque el repositorio no
  define presupuestos de peso de bundle ni de tiempo de generacion de PDF. Hasta que se fijen, estos tres
  casos solo detectan regresiones contra la ejecucion anterior, no contra un objetivo.
- El limite de las consultas lentas que se registran en el log no esta documentado, y RND-013 solo puede
  comprobar que el aviso aparece, no que el umbral sea el adecuado.
- Los reintentos del runner de migraciones y los del planificador de trabajos se cuentan leyendo los logs
  (RND-007, RND-009). Si el reintento no se registra, el caso no puede distinguir entre "no habia reintento"
  y "no se registro".
- El proxy inverso y el orquestador no forman parte del repositorio, asi que RND-001 y RND-002 miden la
  aplicacion y no la ruta completa que ve el usuario. Un 502 del proxy pasaria inadvertido.
- No hay metricas de la base de datos exportadas por la aplicacion mas alla de los contadores de pool, de
  modo que RND-013 no puede observar el numero de conexiones abiertas del servidor de base de datos, solo
  las que la aplicacion tiene asignadas.
- RND-011 depende de una inspeccion manual de la consola, y no hay ninguna prueba automatizada que falle
  ante una regresion de errores de consola. Es el caso mas propenso a que se deje de hacer.
- Los umbrales de LCP, CLS y tiempo de bloqueo de RND-016 son valores de referencia aceptables, no valores
  acordados con el negocio. No hay metricas de campo que confirmen que los usuarios reales los alcanzan.
- `app.set('trust proxy', ...)` esta limitado a rangos locales y de enlace, lo que puede hacer que el
  rate limiting/accounta la IP de origen real no cuando hay un proxy delante. Ningun caso de este area lo
  mide: afecta al area 30 y queda sin cobertura desde el punto de vista operativo.

## 7. Resultado del area

| Metrica | Valor |
|---|---|
| Casos escritos | 16 |
| Casos requeridos | 16 |
| P0 | 0 |
| P1 | 0 |
| P2 | 14 |
| P3 | 2 |
| Casos destructivos | 2 (RND-002, RND-009) |
| Casos que dependen de otras areas | 0 |
| Hallazgos en la seccion 5 | 1 |
| Huecos registrados | 12 |
| Ejecucion | `______` |

---

*Alcance: 16 casos de comportamiento operativo y de rendimiento, ejecutados sobre el contenedor en
reposo y en carga leve; no se modifica codigo fuente ni configuracion durante la ejecucion. 2026-10-01.*

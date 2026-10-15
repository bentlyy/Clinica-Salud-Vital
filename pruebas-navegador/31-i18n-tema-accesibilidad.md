# 31 — i18n, tema, accesibilidad y responsive

> Cubre la capa transversal de la interfaz: los cuatro idiomas con su persistencia y su formato, el tema
> claro y oscuro con su atributo en el documento, los tres anchos de pantalla en los que cambia el layout,
> y la operabilidad por teclado con los nombres accesibles de los controles principales.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `31` | `UX` | C4 | Mensual | 20 | `10-` | — |

## 1. Que cubre

- Carga de los cuatro idiomas (es, en, pt, fr) y el uso de `es` como idioma de respaldo.
- Cambio de idioma desde el selector del topbar, con aplicacion inmediata y sin recarga.
- Sincronizacion de `document.documentElement.lang` y de `localStorage['lang']`.
- Formato de fechas, horas y numeros segun el locale activo.
- Barrido de claves i18n mostradas en crudo, en la aplicacion autenticada y en la reserva de invitado.
- Literales de disponibilidad que el backend escribe en ingles y que la UI muestra sin traducir.
- Tema inicial segun la preferencia del sistema, alternancia, atributo `data-theme` en el elemento
  `<html>` y persistencia en `localStorage['theme_mode']`.
- Layout de escritorio (1440x900), movil (390x844) y tablet (820x1180), con el ancho del panel lateral y
  la altura de la barra superior.
- Recorrido de teclado por el panel lateral, la barra superior y los menus desplegables.
- Literales de los estados de carga, error y vacio, y de la pagina 404.

No cubre la calidad de las traducciones en si misma (si una traduccion es natural, eso lo revisa una
persona), ni la localizacion de correos ni de documentos PDF, que se verifican en el area 28.

## 2. Roles y rutas

| Rol | Rutas de UI | Anchos de ventana |
|---|---|---|
| `cualquiera` (autenticado) | `/dashboard`, `/bookings`, `/patients`, `/settings`, `/notifications` | 1440x900, 820x1180, 390x844 |
| `anónimo` | `/booking`, `/login` | 1440x900, 390x844 |
| `cualquiera` (autenticado) | `/404` y cualquier ruta inexistente | 1440x900 |

El ancho de conmutacion a movil lo decide el breakpoint `md` del tema, equivalente a 900 px: por debajo
de 900 px el panel lateral pasa a un cajon temporal.

## 3. Precondiciones de datos

- Sesion valida de un rol con panel (area `10-`), y su equivalente sin sesion para `/booking`.
- Los cuatro archivos de locale cargados y con los mismos 72 namespaces, verificado con el paso 1 de
  UX-001.
- `localStorage` sin `lang` ni `theme_mode` para los casos de primera visita (UX-002, UX-008, UX-010).
- El tema claro como punto de partida en todos los casos, cambiando antes si hace falta.
- Al menos una pantalla con lista larga (por ejemplo la lista de pacientes) para UX-015.
- El sistema operativo puede ser forzado a tema claro y a tema oscuro para UX-008, y el navegador puede
  vaciar `localStorage` desde la consola.
- Herramienta de inspeccion de accesibilidad habilitada en el navegador para UX-017 y UX-018.
- Conteo de literales de los cuatro namespaces usados en los estados: `common`, `notifications`,
  `not_found` y `guest_booking`.

## 4. Casos

### [UX-001] Cargar los cuatro idiomas y comprobar el respaldo a espanol

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; `localStorage` sin `lang`.
**Datos:** locales `es`, `en`, `pt`, `fr` · idioma de respaldo `es` · 72 namespaces

1. Abrir `/dashboard` con el idioma por defecto.
2. En la consola, contar los namespaces cargados con la instancia de i18next.
3. Forzar el idioma a `en`, `pt` y `fr`, uno por uno, recargando entre cada uno.
4. Anotar en cada idioma si algun texto de la barra superior o de las tarjetas se queda en espanol.
5. Fijar el idioma en `fr` y buscar una clave que solo exista en `es.json`.
6. Volver a `es`.

**Esperado**
- Los cuatro idiomas cargan sin error de consola y cada uno trae 72 namespaces.
- Ningun namespace aparece como vacio en ningun idioma.
- Al cambiar a `fr`, un texto cuya clave solo exista en `es` muestra el valor de `es`, no la clave, ni un
  texto vacio, ni `[verificar literal en es.json]`.
- El idioma de respaldo es `es`: ningun texto queda en blanco por una falta de traduccion.
- El namespace por defecto es `common`, de modo que una clave suelta sin namespace se resuelve ahi.
- 0 errores de tipo `missingKey` o de carga de locale en la consola durante los cuatro idiomas.

**Red:** los cuatro idiomas se resuelven desde los archivos locales, sin peticiones a un servicio de
traduccion externo. Anotar el numero de peticiones de red que se repiten al cambiar de idioma.
**Limpieza:** fijar el idioma en `es`.

### [UX-002] Cambiar el idioma desde el selector del topbar

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; idioma `es`.
**Datos:** secuencia `es` -> `en` -> `pt` -> `fr` -> `es`

1. Localizar el selector de idioma en la barra superior.
2. Anotar su ancho, su posicion y el nombre visible del idioma activo.
3. Abrirlo y anotar las cuatro opciones que ofrece.
4. Elegir `pt` y anotar el cambio en pantalla sin recargar.
5. Elegir `fr` y repetir.
6. Volver a `es` y confirmar el estado del selector.

**Esperado**
- El selector ofrece exactamente las cuatro opciones es, en, pt y fr, cada una con su nombre en su
  propio idioma o su codigo de dos letras, sin placeholder.
- Al elegir un idioma, todo el texto visible cambia en pantalla y la pagina no se recarga: en la pestana
  Network no hay navegacion ni peticion de documento.
- El nombre del idioma activo se actualiza dentro del propio selector.
- Volver a `es` restaura el estado inicial sin dejar texto en el idioma anterior.
- El selector es alcanzable con el teclado y se cierra con `Escape` sin cambiar el idioma.

**Red:** 0 peticiones de documento durante los cuatro cambios. Verificar que el cambio de idioma no
provoca un 404 de un namespace recien solicitado.
**Limpieza:** idioma en `es`.

### [UX-003] Sincronizar el atributo lang del documento y la clave lang del almacenamiento

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; `localStorage` sin `lang`.
**Datos:** `document.documentElement.lang` · `localStorage['lang']`

1. Con el almacenamiento limpio, abrir `/dashboard` y leer `document.documentElement.lang` y
   `localStorage['lang']`.
2. Cambiar el idioma a `en` y volver a leer ambos valores.
3. Recargar con `F5` y leerlos de nuevo.
4. Escribir a mano `localStorage['lang'] = 'pt'`, recargar y leer ambos valores.
5. Escribir `localStorage['lang'] = 'de'` (idioma no soportado), recargar y leer ambos valores.
6. Anotar que se guarda y que no.

**Esperado**
- Tras el paso 1 el idioma es `es` y ambos valores coinciden, o `lang` queda sin guardar hasta el primer
  cambio: anotar exactamente cual de las dos cosas ocurre.
- Tras el paso 2 `document.documentElement.lang` vale `en` y `localStorage['lang']` vale `en`.
- Tras el paso 3 ambos siguen valiendo `en` tras la recarga.
- El paso 4 carga la interfaz en portugues, lo que confirma que la clave del almacenamiento manda sobre
  el valor por defecto.
- El paso 5 cae en el idioma de respaldo `es` y no deja la interfaz vacia. Anotar si `localStorage`
  conserva el valor invalido `de` o se corrige solo.
- La precedencia es almacenamiento, despues navegador: el valor guardado gana.

**Red:** cada recarga -> 200. Verificar que el idioma no viaja por query string ni por cookie.
**Limpieza:** borrar `localStorage['lang']`.

### [UX-004] Formatear fechas y numeros segun el locale activo

**Rol** `cualquiera` (autenticado) · **Ruta** `/bookings` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; existen citas con fechas y horas conocidas, al menos una futura y otra
pasada, y algun importe monetario en pantalla.
**Datos:** una cita futura · una cita pasada · un importe · secuencia de los cuatro idiomas

1. En `/bookings` con idioma `es`, anotar la fecha de la cita futura y la de la pasada.
2. Cambiar a `en` y anotar las mismas dos fechas.
3. Cambiar a `pt` y repetir.
4. Cambiar a `fr` y repetir.
5. Anotar en cada idioma como se escribe la hora de la cita.
6. Anotar en cada idioma el separador decimal de un importe.

**Esperado**
- La fecha se escribe con el orden del locale: dia/mes en `es` y `fr`, mes/dia en `en` y `pt`, con el
  nombre del mes abreviado.
- La hora respeta el locale: `24` en `es`, `pt` y `fr`, y con designacion `AM`/`PM` en `en` segun el
  locale configurado. Anotar el valor exacto que aparezca.
- Los miles y los decimales cambian de formato con el idioma, sin alterar el valor.
- Ninguna fecha aparece como `Invalid Date` ni como una fecha sin formatear.
- Las fechas en pasado no cambian de texto al cambiar de idioma.

**Red:** ninguna peticion adicional al cambiar de idioma: el formateo es local.
**Limpieza:** idioma en `es`.

### [UX-005] Barrido de claves i18n mostradas en crudo en la aplicacion autenticada

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; el area `31-` se ejecuta con el texto de `es.json` como referencia.
**Datos:** patron `clave.con.subclave` · patron que termina en `}}` · namespaces de la app autenticada

1. Recorrer `/dashboard`, `/bookings`, `/patients`, `/settings` y `/notifications`.
2. En cada pantalla, buscar el patron `palabra.palabra.palabra` en el texto visible.
3. Repetir la busqueda buscando una llave que termine en `}}`, resto de una interpolacion sin resolver.
4. Anotar cada hallazgo con su pantalla y su contexto.
5. Para cada hallazgo, buscar la clave correspondiente en `es.json` y escribir el valor esperado.
6. Repetir el paso 2 con la interfaz en `en`.

**Esperado**
- Ningun texto visible tiene la forma de una clave i18n con dos o mas puntos.
- Ningun texto visible termina en `}}` ni muestra `{` sueltos de una interpolacion.
- Para cada hallazgo se anota la clave y el valor esperado de `es.json`; si la clave no existe en
  `es.json`, es una clave inventada y el hallazgo se documenta con la pantalla exacta.
- En `en` no aparecen mas hallazgos que en `es`: la cobertura es la misma.
- Anotar con H-25 cualquier clave que se muestre en crudo, sin abrir un hallazgo nuevo.

**Red:** ninguna. Anotar el numero de pantallas revisadas y el de hallazgos.
**Limpieza:** idioma en `es`.

### [UX-006] Barrido de claves i18n mostradas en crudo en la reserva de invitado

**Rol** `anónimo` · **Ruta** `/booking` · **P1** · **Resultado** `______`
**Precondición:** sin sesion; hay al menos un doctor publico con disponibilidad.
**Datos:** namespace `guest_booking` · patron de clave cruda

1. Abrir `/booking` y recorrer los tres pasos del formulario.
2. En el paso 1, leer el selector de especialidad y el de medico.
3. En el paso 2, leer el calendario y los textos de las franjas horarias.
4. En el paso 3, leer todas las etiquetas y los mensajes de error de los campos.
5. Provocar dos errores de validacion con datos invalidos y leer los mensajes.
6. Anotar cada clave cruda encontrada y su valor esperado en `es.json`.

**Esperado**
- Ninguna etiqueta del formulario muestra una clave i18n en crudo.
- Los mensajes de error de validacion son texto legible en el idioma activo, no `required` ni
  `validation.` seguidos de puntos.
- Los nombres de las especialidades y de los medicos vienen de la base de datos, no de claves de
  traduccion, y se muestran tal cual.
- La franja horaria se muestra como hora local, sin sufijo de zona.
- Anotar con H-25 cada clave que aparezca en crudo, y buscar en `guest_booking` de `es.json` su valor
  esperado.

**Red:** `GET /api/doctors/public`, `GET /api/specialties` y
`GET /api/doctors/public/:id/available-slots` -> 200. Anotar si algun texto de la respuesta cruda se
muestra sin traducir.
**Limpieza:** ninguna.

### [UX-007] Comprobar los mensajes de disponibilidad que llegan en ingles ⚠️ DESTRUCTIVO

**Rol** `cualquiera` (autenticado) · **Ruta** `/bookings` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** sesion activa; la clinica de prueba tiene un dia cerrado, un medico con la agenda
completada y una excepcion de agenda creada (area `17-`).
**Datos:** `No hay disponibilidad: la clínica está cerrada el ${date}` · `Outside doctor availability` ·
`Doctor not available (full day blocked)` · `Time blocked by doctor exception`

1. Intentar reservar en el dia cerrado de la clinica y leer el mensaje que aparece.
2. Intentar reservar en un dia fuera del horario del medico.
3. Intentar reservar el dia completo que el medico tiene bloqueado.
4. Intentar reservar una hora concretas dentro de una excepcion de agenda.
5. Cambiar el idioma a `en` y repetir el paso 1.
6. Anotar el idioma real de cada mensaje.

**Esperado**
- Los cuatro mensajes aparecen con el texto literal de la lista de Datos, con la fecha interpolada en el
  primero.
- Los mensajes 2, 3 y 4 estan en ingles con la interfaz en espanol, porque el backend los produce como
  literales: se muestran sin traducir.
- Con la interfaz en `en` los cuatro mensajes se ven iguales, lo que confirma que no se traducen en
  ningun idioma.
- El primer mensaje incluye la fecha en el formato esperado y no muestra la cadena `${date}` sin
  interpolar.
- Anotar con H-53 que cuatro mensajes de disponibilidad no pasan por i18n.

**Red:** la peticion de disponibilidad y la de creacion de reserva. Anotar el status de cada una: los
mensajes llegan en el cuerpo de la respuesta, no en un codigo de error.
**Limpieza:** eliminar la excepcion de agenda creada para el caso. Requiere `ALLOW_DESTRUCTIVE=true`.

### [UX-008] Aplicar el tema inicial segun la preferencia del sistema

**Rol** `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** `localStorage` sin `theme_mode`; el navegador puede forzar la preferencia del sistema.
**Datos:** preferencia `dark` · preferencia `light` · `localStorage['theme_mode']` ausente

1. Forzar la preferencia del sistema a oscuro, limpiar el almacenamiento y abrir `/`.
2. Anotar el valor de `data-theme` en el elemento `<html>` y el fondo real de la pagina.
3. Forzar la preferencia a claro, limpiar el almacenamiento y recargar.
4. Anotar de nuevo el valor de `data-theme` y el fondo.
5. Escribir a mano `localStorage['theme_mode'] = 'azul'`, limpiar el resto y recargar.
6. Escribir `localStorage['theme_mode'] = 'dark'` con la preferencia del sistema en claro, recargar.

**Esperado**
- Con preferencia oscura y sin valor guardado, `data-theme` vale `dark` y el fondo es oscuro desde el
  primer fotograma, sin destello blanco intermedio.
- Con preferencia clara, `data-theme` vale `light` y el fondo es claro.
- Un valor guardado invalido como `azul` no rompe la pagina: cae en `light` y no aplica un tema
  inexistente.
- Un valor guardado `dark` gana a la preferencia del sistema en claro: el almacenamiento tiene prioridad.
- En los cuatro pasos `data-theme` es exactamente `dark` o `light`, nunca un valor arbitrario.

**Red:** ninguna peticion decide el tema: se resuelve en el cliente antes del primer render.
**Limpieza:** borrar `localStorage['theme_mode']`.

### [UX-009] Alternar el tema y comprobar el atributo data-theme

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; tema claro; el boton de tema es visible en la barra superior.
**Datos:** `data-theme` · `localStorage['theme_mode']`

1. Localizar el boton de tema y anotar su nombre accesible y su icono.
2. Pulsarlo una vez y anotar el nuevo `data-theme` y el fondo.
3. Pulsarlo de nuevo y comprobar que vuelve al estado inicial.
4. Recorrer dos pantallas distintas con el tema oscuro ya aplicado.
5. Comprobar el color de texto, de fondo y de borde en ambas pantallas.
6. Comprobar el contraste de un boton primario en tema oscuro.

**Esperado**
- El atributo `data-theme` del elemento `<html>` alterna entre `dark` y `light` en cada pulsacion.
- El fondo, el color de texto y los bordes cambian de verdad: no basta con que el atributo cambie.
- No hay destello ni parpadeo al alternar, y la pagina conserva la posicion del scroll.
- El icono del boton refleja el estado actual o la accion disponible, y su nombre accesible anuncia la
  accion, por ejemplo cambiar a tema oscuro.
- En tema oscuro los textos sobre fondo siguen teniendo contraste suficiente: anotar el valor medido con
  la herramienta de contraste.
- El cambio de tema no dispara una recarga de la pagina ni borra la sesion.

**Red:** 0 peticiones de documento al alternar. Anotar si el cambio provoca alguna peticion a un recurso
de tema.
**Limpieza:** volver al tema claro.

### [UX-010] Persistir el tema entre recargas y pestanas

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; tema claro.
**Datos:** `localStorage['theme_mode']` · pestana secundaria

1. Cambiar el tema a oscuro y leer `localStorage['theme_mode']`.
2. Recargar con `F5` y comprobar el tema resultante.
3. Abrir una pestana nueva con la misma aplicacion y comprobar el tema.
4. Cambiar el tema a claro en la segunda pestana y volver a la primera.
5. Cerrar el navegador y abrirlo de nuevo.
6. Anotar si la preferencia del sistema se respeta despues del paso 5.

**Esperado**
- Tras el paso 1 `localStorage['theme_mode']` vale `dark`.
- Tras `F5` el tema sigue siendo oscuro, sin pedirlo de nuevo al servidor.
- La pestana nueva nace con el tema oscuro, porque la preferencia es por origen y no por sesion.
- El cambio de tema en una pestana afecta a la otra: al volver, la primera muestra ya el tema claro, sin
  necesidad de recargar.
- Tras reabrir el navegador el tema persiste, y si se borro el almacenamiento manda la preferencia del
  sistema.

**Red:** cada recarga -> 200 del documento, sin peticion que devuelva la preferencia de tema.
**Limpieza:** borrar `localStorage['theme_mode']` y dejar el tema claro.

### [UX-011] Comprobar que el tema se aplica con atributo y no con clase

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; tema oscuro aplicado.
**Datos:** elemento `<html>` · atributo `data-theme` · atributo `class`

1. Con el tema oscuro aplicado, listar los atributos del elemento `<html>`.
2. Listar sus clases.
3. Cambiar a claro y repetir los pasos 1 y 2.
4. Buscar en la hoja de estilos las reglas que dependan de `data-theme`.
5. Comprobar si alguna regla depende de una clase como `dark` o `theme-dark`.

**Esperado**
- El atributo `data-theme` esta presente con el valor `light` o `dark`, y cambia con el tema.
- Las clases del elemento `<html>` no cambian con el tema: no hay una clase `dark` que se añada o se
  quite.
- La hoja de estilos selecciona el tema por el atributo, de modo que cambiar el atributo a mano desde la
  consola cambia el aspecto de inmediato.
- Ningun componente aplica el tema con una clase propia distinta del atributo del documento.
- Al cambiar el atributo a mano a un valor invalido, el aspecto no cambia a un tema inexistente: la
  interfaz queda en el tema por defecto.

**Red:** ninguna. Anotar si el tema se sirve como hoja de estilos separada o dentro del bundle.
**Limpieza:** devolver `data-theme` al valor que corresponde al tema activo.

### [UX-012] Verificar el layout en escritorio de 1440x900

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; ventana redimensionada a 1440x900.
**Datos:** ancho del panel lateral `260` px · altura de la barra superior `64` px · `down('md')` = 900 px

1. Redimensionar la ventana a 1440x900 y abrir `/dashboard`.
2. Medir el ancho del panel lateral y su altura.
3. Medir la altura de la barra superior.
4. Comprobar si el panel lateral esta siempre visible y si se puede plegar.
5. Plegar el panel y volver a medir su ancho.
6. Comprobar que el contenido principal no queda cortado ni solapado.

**Esperado**
- El panel lateral esta visible y es persistente, con 260 px de ancho cuando esta desplegado.
- La barra superior mide 64 px de alto y ocupa todo el ancho.
- Al plegar el panel su ancho pasa a 72 px, no a 0, y los iconos siguen siendo visibles.
- El contenido principal se ajusta al ancho restante y ninguna tabla o tarjeta queda cortada
  horizontalmente.
- Ningun elemento se solapa con la barra superior al desplazarse.
- A 1440 px el comportamiento es de escritorio: no hay cajon temporal.

**Red:** ninguna adicional. Anotar el ancho de la ventana por el que se cruza el cambio de comportamiento
(900 px).
**Limpieza:** dejar el panel desplegado.

### [UX-013] Verificar el layout en movil de 390x844

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; ventana redimensionada a 390x844.
**Datos:** ancho `390` px · alto `844` px · umbral de cajon temporal `900` px

1. Redimensionar a 390x844 y abrir `/dashboard`.
2. Comprobar si el panel lateral esta oculto al cargar.
3. Abrir el panel con el boton de menu y anotar su ancho y si cubre la pantalla o la empuja.
4. Navegar a una seccion desde el panel abierto y comprobar que el panel se cierra solo.
5. Comprobar que la barra de notificaciones y el menu de cuenta siguen siendo alcanzables.
6. Comprobar que ninguna tabla se desborda de la pantalla.

**Esperado**
- A 390 px el panel lateral no esta visible al cargar: el layout es de cajon temporal.
- El boton de menu abre el panel como un cajon superpuesto, y el fondo se atenua o queda accesible solo tras
  cerrarlo.
- Al navegar a una seccion, el cajon se cierra y el contenido cambia.
- La barra superior mantiene accesibles sus controles, incluido el aviso de la campana para los roles que
  lo ven.
- Las tablas anchas se comprimen, se desplazan horizontalmente o pasan a una vista de tarjetas, y ninguna
  desborda el ancho de la ventana.
- Ningun texto queda cortado por la mitad ni solapado.

**Red:** ninguna adicional. Anotar cualquier peticion que se dispare al abrir y cerrar el cajon.
**Limpieza:** cerrar el cajon.

### [UX-014] Verificar el layout en tablet de 820x1180

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; ventana redimensionada a 820x1180.
**Datos:** ancho `820` px · alto `1180` px · umbral `900` px

1. Redimensionar a 820x1180 y abrir `/dashboard`.
2. Anotar si el panel lateral esta visible o como cajon.
3. Redimensionar a 900x1180 y repetir la observacion.
4. Redimensionar a 899x1180 y repetir la observacion.
5. Redimensionar de nuevo a 820x1180 y comprobar que el estado se recupera.
6. Anotar en que ancho exacto se produce el cambio.

**Esperado**
- A 820 px el comportamiento es de movil: cajon temporal, panel oculto al cargar.
- A 900 px el comportamiento cambia a escritorio: panel persistente. El umbral se situa en `down('md')`,
  equivalente a 900 px.
- A 899 px el comportamiento vuelve a ser de movil.
- Al redimensionar de ida y vuelta, el layout recupera el estado correcto sin recargar y sin quedar en un
  estado intermedio.
- El cambio de comportamiento no borra la sesion ni los datos ya cargados.
- Anotar el ancho exacto de conmutacion observado, porque el valor documentado y el real pueden diferir.

**Red:** 0 peticiones de documento durante las cinco redimensionaciones. Anotar si el cambio de ancho
provoca alguna peticion.
**Limpieza:** volver a 1440x900.

### [UX-015] Recorrer el panel lateral y la barra superior solo con teclado

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; el foco esta al inicio del documento; el panel esta desplegado.
**Datos:** 1440x900 · recorrido con `Tab`, `Shift+Tab`, `Enter` y flechas

1. Pulsar `Tab` desde el inicio y enumerar los elementos que reciben foco, en orden.
2. Continuar hasta completar una vuelta y volver al primer elemento.
3. Navegar a `/patients` con el teclado y comprobar que la lista se alcanza con `Tab`.
4. Pulsar `Enter` sobre un elemento del panel lateral y comprobar la navegacion.
5. Comprobar si el menu de cuenta y el de idioma se abren con el teclado.
6. Comprobar si se puede plegar y desplegar el panel lateral con el teclado.

**Esperado**
- Todos los controles interactivos son alcanzables con `Tab` y ninguno se salta.
- El indicador de foco es visible en cada elemento enfocado, con contraste suficiente y sin depender del
  raton.
- `Enter` y `Space` activan el elemento enfocado, y la navegacion de la ruta se produce.
- El menu de cuenta y el de idioma se abren con el teclado y se cierran con `Escape`.
- El panel lateral se pliega y se despliega con el teclado, o queda claro que no se puede. Anotar
  cualquiera de las dos cosas.
- El orden de tabulacion sigue el orden visual: no hay saltos del final de la barra superior al principio
  del contenido de forma incoherente.

**Red:** ninguna. Anotar el numero de tabulaciones necesarias para alcanzar cada seccion.
**Limpieza:** devolver el foco al inicio del documento.

### [UX-016] Operar el selector de idioma y el menu de cuenta con el teclado

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; ambos menus cerrados.
**Datos:** `Enter` · `Escape` · flechas · `Tab`

1. Enfocar el selector de idioma con `Tab` y pulsarlo con `Enter`.
2. Comprobar si el foco entra en la lista de opciones al abrirse.
3. Elegir `fr` con las flechas y `Enter`, y comprobar el cambio de idioma.
4. Abrir el menu de cuenta con el teclado y enumerar sus opciones.
5. Cerrar ambos menus con `Escape` y comprobar que el foco vuelve al boton que los abrio.
6. Pulsar `Tab` con un menu abierto y comprobar si el foco se sale del menu.

**Esperado**
- Ambos menús se abren con `Enter` o `Space` sobre el boton.
- Al abrirse, el foco entra en la lista de opciones, no se queda en el boton.
- Las flechas recorren las opciones y `Enter` elige la enfocada, aplicando el cambio de idioma.
- `Escape` cierra el menu y devuelve el foco al boton que lo abrio.
- Con el menu abierto, `Tab` no saca el foco a la pagina de fondo: el foco circula dentro del menu o
  permanece dentro de el.
- El menu de cuenta expone sus acciones con nombres accesibles, no solo con iconos.

**Red:** 0 peticiones de documento al cambiar de idioma con el teclado.
**Limpieza:** dejar los menus cerrados y el idioma en `es`.

### [UX-017] Comprobar los nombres accesibles de los controles de la barra superior

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P1** · **Resultado** `______`
**Precondición:** sesion activa; la herramienta de inspeccion de accesibilidad abierta.
**Datos:** campana · tema · idioma · avatar · boton de menu

1. Abrir el arbol de accesibilidad de `/dashboard`.
2. Localizar la campana de notificaciones y leer su nombre accesible.
3. Localizar el boton de tema y leer su nombre accesible.
4. Localizar el selector de idioma y leer su nombre accesible.
5. Localizar el avatar y leer su nombre y su rol.
6. Localizar el boton de menu del panel lateral en movil.

**Esperado**
- La campana tiene un nombre accesible no vacio que anuncia su proposito e incluye el numero de
  notificaciones, con el formato `Notificaciones (<n>)`.
- El boton de tema tiene un nombre accesible que anuncia la accion, no solo "Tema".
- El selector de idioma tiene un nombre accesible que indica que es un selector de idioma y no un boton
  suelto.
- El avatar expone el nombre del usuario y su rol como texto, no solo la inicial.
- El boton de menu del panel lateral tiene nombre accesible en movil.
- Ninguno de estos controles es anonimo: ninguno aparece con el nombre vacio en el arbol.

**Red:** ninguna. Anotar los nombres accesibles exactos, porque son el contrato con el lector de pantalla.
**Limpieza:** cerrar el inspector.

### [UX-018] Comprobar el foco visible y su retorno al cerrar un dialogo

**Rol** `cualquiera` (autenticado) · **Ruta** `/settings` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; `/settings` tiene al menos un dialogo o panel lateral de edicion.
**Datos:** `Tab` · `Escape` · elemento que abrio el dialogo

1. Enfocar el boton que abre el dialogo y pulsarlo con el teclado.
2. Comprobar si el foco entra en el dialogo y en que elemento.
3. Recorrer todos los controles del dialogo con `Tab`.
4. Cerrar el dialogo con `Escape` y anotar donde queda el foco.
5. Cerrar el dialogo con el boton de cancelar y anotar donde queda el foco.
6. Abrir el dialogo, tabular hasta el ultimo control y comprobar que el foco no se sale a la pagina de
   fondo.

**Esperado**
- Al abrir el dialogo, el foco entra en el dialogo, en un control concreto, y no se queda en el boton
  que lo abrio.
- Con `Tab`, el foco circula solo entre los controles del dialogo mientras esta abierto.
- Al cerrar con `Escape` el foco vuelve al control que lo abrio.
- Al cerrar con el boton de cancelar el foco vuelve tambien al control que lo abrio, o al inicio de la
  pagina si el dialogo se cerro de otra forma. Anotar exactamente cual de las dos cosas ocurre.
- Con `Escape` no se pierde el contenido introducido sin guardar sin aviso, o se avisa antes de cerrar.
- El foco trapped no atrapa al usuario si el dialogo se cierra por error: siempre hay salida con teclado.

**Red:** ninguna. Anotar el numero de controles focusables dentro del dialogo.
**Limpieza:** cerrar el dialogo y devolver el foco al inicio.

### [UX-019] Comprobar los literales de los estados de carga, error y vacio

**Rol** `cualquiera` (autenticado) · **Ruta** `/patients` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; el area `19-` completada, para disponer de una clinica sin datos.
**Datos:** `Cargando...` · estado de error · `No hay notificaciones` · `Página no encontrada` · `Volver al inicio`

1. Bloquear la red y abrir `/patients` para observar el estado de carga.
2. Leer el texto visible del estado de carga y su rol para lectores de pantalla.
3. Devolver un error 500 desde `/api/patients` y leer el estado de error.
4. Leer el texto del boton de reintento, si existe.
5. Abrir una pantalla sin datos, como las notificaciones de un usuario sin filas, y leer el estado vacio.
6. Navegar a una ruta inexistente y leer la pantalla 404.
7. Cambiar el idioma a `fr` en los pasos 5 y 6 y repetir la lectura.

**Esperado**
- El estado de carga muestra un texto, no un spinner mudo, y expone `role="status"` con
  `aria-live="polite"` para que un lector de pantalla lo anuncie.
- El estado de error muestra `role="alert"`, un mensaje legible y un boton de reintento. Si no hay boton,
  anotarlo como hueco.
- El estado vacio de notificaciones muestra el literal `No hay notificaciones` (clave
  `notifications.noNotifications`) y expone `role="status"`.
- La pantalla 404 muestra `Página no encontrada` y el boton `Volver al inicio` (namespace `not_found`,
  claves `title` y `go_home`), y el codigo 404 es visible.
- En `fr` los cuatro estados se muestran en frances: `Page Non Trouvée` y `Retour à l'accueil`, sin
  caracteres corruptos ni reemplazos.
- Ningun estado muestra una clave i18n en crudo ni el texto `undefined`.

**Red:** `GET /api/patients` -> 500 en el paso 3 y 200 con lista vacia en el paso 5. Anotar que el
frontend no muestra datos cacheados en lugar del estado de error.
**Limpieza:** restaurar el acceso a la API bloqueando.

### [UX-020] Comprobar el titulo del documento y el nombre del selector de idioma

**Rol** `cualquiera` (autenticado) · **Ruta** `/dashboard` · **P2** · **Resultado** `______`
**Precondición:** sesion activa; los cuatro idiomas disponibles.
**Datos:** secuencia `es`, `en`, `pt`, `fr`

1. En cada idioma, leer `document.title` en `/dashboard`.
2. En cada idioma, leer el nombre accesible del selector de idioma.
3. Navegar a `/settings` y a `/bookings` y repetir la lectura del titulo.
4. Buscar en el selector si el nombre accesible cambia con el idioma.
5. Anotar los cuatro titulos y los cuatro nombres accesibles.

**Esperado**
- El titulo del documento esta en el idioma activo en las cuatro lenguas y refleja la seccion visitada.
- Ninguno de los cuatro titulos muestra una clave i18n, `undefined` ni el titulo del idioma anterior.
- El nombre accesible del selector de idioma se mantiene en un idioma estable, o cambia con el idioma de
  forma coherente: anotar exactamente cual de las dos cosas ocurre, porque un lector de pantalla que cambia
  de nombre en cada cambio de idioma es confuso.
- El titulo de la ruta 404 tambien cambia con el idioma.
- Ningun titulo supera una longitud razonable para una pestana de navegador: anotar la longitud de cada
  uno.

**Red:** 0 peticiones de documento al cambiar de idioma: los titulos se actualizan en el cliente.
**Limpieza:** idioma en `es`.

## 5. Defectos conocidos a verificar primero

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-25 | UX-005, UX-006 | Ninguna pantalla debe mostrar una clave i18n en crudo; en `/booking` (namespace `guest_booking`) el riesgo es mayor porque los datos de la API tambien acaban en pantalla |
| H-49 | UX-019, UX-020 | `document.title` debe cambiar por ruta y por idioma, y la pagina 404 debe usar el namespace `not_found` y no valores por defecto en linea |
| H-53 | UX-007 | Los cuatro mensajes de disponibilidad (`No hay disponibilidad: la clínica está cerrada el ${date}`, `Outside doctor availability`, `Doctor not available (full day blocked)`, `Time blocked by doctor exception`) llegan en ingles del backend y la UI los muestra sin traducir |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

- No hay verificacion automatizada de que las claves usadas en el codigo existan en los cuatro archivos de
  locale. UX-005 y UX-006 son barridos manuales, con lo que una clave que se elimina de `es.json` pasa
  inadvertida hasta que alguien navega a esa pantalla.
- Los cuatro archivos de locale declaran el mismo numero de namespaces, pero no esta verificado que las
  claves de segundo nivel coincidan entre idiomas. Un namespace puede tener 40 claves en `es` y 39 en `pt`
  sin que nada lo detecte. Anotar el recuento de claves por namespace en UX-001.
- Los mensajes de error del backend son literales en ingles sin clave i18n, asi que no hay forma de que la
  UI los traduzca. Solo UX-007 los cubre, y solo los cuatro que estan en ese archivo. El area 30 encuentra
  mas literales iguales en otros modulos.
- El `defaultNS` es `common`, de modo que una clave usada sin namespace se resuelve ahi en silencio. No hay
  forma de saber desde la interfaz si una pantalla depende de ese valor por defecto o lo tiene explicito.
- El tema se resuelve en el cliente antes del primer render, pero no hay verificacion de que no haya
  destello entre el HTML servido y la hidratacion. UX-008 lo observa a ojo, no con una medicion de pintura.
- Al redimensionar la ventana, el componente de layout llama a un setter de estado durante el render para
  cerrar el panel en movil. No hay caso que mida si eso produce un aviso de React ni un doble render; el
  comportamiento observable de UX-014 es el unico indicio.
- El umbral de conmutacion a movil es `down('md')`, que equivale a 900 px, y no 768 px como otras
  convenciones. UX-014 mide el ancho exacto de conmutacion, pero no hay prueba de que 900 px sea la
  eleccion deliberada.
- La trampa de foco de los dialogos depende de la libreria de componentes. UX-018 mide el comportamiento,
  pero no hay caso que verifique el retorno de foco cuando el dialogo se cierra por una razon distinta de
  las dos del caso (por ejemplo, un cambio de ruta).
- No hay verificacion de contraste para los estados de hover y de focodisabled, solo del estado normal.
  UX-009 mide el contraste del boton primario en tema oscuro.
- El idioma se resuelve con la precedencia almacenamiento y despues navegador, sin ninguna preferencia de
  idioma del servidor ni en la cookie. Un usuario que cambia de navegador pierde el idioma, y nada lo
  documenta. Anotarlo al ejecutar UX-003.
- Los nombres accesibles de los controles del topbar se comparan con su texto visible en UX-017, pero no
  hay verificacion de que el orden de lectura del arbol de accesibilidad coincida con el orden visual en
  las pantallas con tablas.

## 7. Resultado del area

| Metrica | Valor |
|---|---|
| Casos escritos | 20 |
| Casos requeridos | 20 |
| P0 | 0 |
| P1 | 10 |
| P2 | 10 |
| P3 | 0 |
| Casos destructivos | 1 (UX-007, por la excepcion de agenda) |
| Casos que dependen de `19-` | 1 (UX-019) |
| Hallazgos en la seccion 5 | 3 |
| Huecos registrados | 11 |
| Ejecucion | `______` |

---

*Alcance: 20 casos de la capa de interfaz, ejecutados en los cuatro idiomas y en los tres anchos de
pantalla; no se modifica codigo fuente ni traducciones durante la ejecucion. 2026-10-01.*

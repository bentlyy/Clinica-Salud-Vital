# 12 — Landing, marketing y precios

> Cubre la landing publica sin sesion: render, cambio de idioma, conversion de precios a multimoneda,
> metadatos SEO, paginas legales, banner y eleccion de cookies con su efecto en Google Analytics, y los
> enlaces de navegacion que hoy no llevan a ninguna parte.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `12` | `LND` | C4 | Mensual | 18 | — | — |

## 1. Que cubre

- Render completo de `/` y desplazamiento por las seis anclas del navbar (`#features`, `#tech`,
  `#how`, `#pricing`, `#testimonials`, `#faq`).
- Cambio de idioma en la landing (es, en, pt, fr) y su efecto inmediato sobre el contenido.
- Multimoneda: conversion de los tres precios al cambiar de pais, incluida la caida a las tasas de
  respaldo cuando la API de divisas no responde.
- Metadatos SEO, `DocumentTitle` y las dos paginas legales.
- Banner de cookies: primera visita, rechazo, aceptacion, persistencia y su efecto observable en las
  peticiones de red a Google Analytics.
- Enlaces del footer y CTA de invitado, que deben llevar a una ruta real y nunca a un panel sin sesion.
- Carga sin sesion del directorio de medicos y de los slots de disponibilidad usados por la reserva
  de invitado.
- Integridad de los bundles servidos en produccion.

No cubre el login embebido, la pasarela de pago ni `/saas/plan` mas alla de la comparacion de precios
descrita en LND-006.

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `guest`, `anónimo` | `/`, `/booking`, `/privacidad`, `/terminos`, `/saas/plan` | `GET /api/currencies/rates`, `GET /api/doctors/public`, `GET /api/specialties`, `GET /api/doctors/public/:id/available-slots`, `GET /api/guest/bookings/:rut, POST /api/guest/booking` |

Ninguno de estos casos requiere sesion. Si el navegador llega autenticado, cerrar la sesion antes de
empezar: la landing sigue renderizando, pero el comportamiento del navbar cambia.

## 3. Precondiciones de datos

- Frontend construido y servido por el mismo origen que el backend (o el proxy de Vite apuntando al
  backend), para que los recursos y la API compartan origen.
- Sin sesion: cero cookies `access_token` y `refresh_token` en el navegador de prueba.
- `localStorage` sin `lang` ni `vitaria_cookie_consent` para los casos de primera visita.
- Bandera de entorno `VITE_GA_MEASUREMENT_ID` con el valor real o vacio, anotado antes de empezar, porque
  LND-012 compara las dos situaciones.
- `GET /api/currencies/rates` accesible. Si la API no responde, LND-005 espera las tasas de respaldo y
  LND-004 se marca `BLOQUEADO`.
- Al menos un doctor con `active = true` y al menos una especialidad cargada, para LND-016 y LND-017.
- Un pais seleccionable distinto del actual para LND-004 (por ejemplo CL si se arranca en US).

## 4. Casos

### [LND-001] Renderizar la landing y recorrer las seis anclas del navbar

**Rol** `guest`, `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** sesion cerrada, `localStorage` vacio, `/` carga sin errores de consola.
**Datos:** ventana `1440x900` · scroll inicio en 0

1. Abrir `/` y esperar a que termine la carga de red.
2. Contar las secciones renderizadas y sus identificadores de ancla: `features`, `tech`, `how`,
   `pricing`, `testimonials`, `faq`.
3. Pulsar cada uno de los seis enlaces del navbar y anotar en que seccion deja el scroll.
4. Volver arriba con el enlace de marca.

**Esperado**
- El navbar expone 6 enlaces con `href` a `#features`, `#tech`, `#how`, `#pricing`, `#testimonials`, `#faq`.
- Cada pulsacion desplaza el scroll a la seccion correspondiente, sin pagina en blanco intermedia.
- El boton de idioma es un control y el boton "Iniciar sesion" abre el modal de login, no navega.
- El boton de contratacion del navbar navega a `/contratar`, no a `/dashboard`.
- 0 errores en la consola y 0 peticiones fallidas a recursos `*.js` o `*.css`.

**Red:** `GET /` -> 200. Verificar que todas las respuestas de assets son 200 y que ninguna fuente o
script externo apunta a `unpkg.com` ni a `cdn.jsdelivr.net`.
**Limpieza:** cerrar el modal de login si quedó abierto.

### [LND-002] Cambiar el idioma de la landing y comprobar aplicación inmediata, persistencia y atributo lang

**Rol** `guest`, `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** `localStorage` sin la clave `lang`; el idioma en uso es `es`.
**Datos:** secuencia `es` -> `en` -> `pt` -> `fr` -> `es`

1. Abrir `/` y anotar el texto del titulo principal y del boton de contratacion.
2. Cambiar el idioma a `en` con el selector del navbar, sin recargar.
3. Repetir el cambio a `pt`, a `fr` y de vuelta a `es`.
4. Recargar la pagina con `F5` y volver a leer el titulo.

**Esperado**
- Tras cada cambio, el texto de la pagina cambia en pantalla sin recarga completa.
- `document.documentElement.lang` toma los valores `es`, `en`, `pt`, `fr` y vuelve a `es`.
- `localStorage['lang']` guarda el codigo del idioma activo tras cada cambio y sobrevive a `F5`.
- Ningun texto se queda en el idioma anterior dentro del navbar, del hero ni de las tarjetas de
  precios tras el quinto paso.

**Red:** `GET /` -> 200 en cada recarga. Verificar que el idioma no depende de un parametro de URL ni de
una cookie: la URL se mantiene en `/`.
**Limpieza:** fijar `lang` en `es` y borrar `localStorage['lang']`.

### [LND-003] Cambiar el titulo del documento al navegar entre rutas publicas

**Rol** `guest`, `anónimo` · **Ruta** `/` · **P3** · **Resultado** `______`
**Precondición:** sesion cerrada.
**Datos:** rutas `/`, `/privacidad`, `/terminos`, `/contratar` y una ruta inexistente

1. Abrir `/` y leer `document.title`.
2. Navegar a `/privacidad` y leer `document.title`.
3. Navegar a `/terminos` y leer `document.title`.
4. Navegar a `/contratar` y leer `document.title`.
5. Navegar a una ruta inexistente y leer `document.title`.

**Esperado**
- En `/` el titulo es `Vitaria - Software de gestion medica multi-tenant`.
- En cada ruta el titulo cambia y refleja la seccion, no se queda el de la ruta anterior.
- En la ruta inexistente la pantalla es la 404 del proyecto, con el literal
  `Página no encontrada` y el boton `Volver al inicio` (namespace `not_found`).
- El titulo de la 404 no hereda el de la ruta previa.

**Red:** `GET /` -> 200. Verificar que el titulo se actualiza en el cliente o en el documento servido, y
que tras el quinto paso la peticion de navegacion devuelve el documento de la 404.
**Limpieza:** volver a `/`.

### [LND-004] Convertir los precios al cambiar de pais

**Rol** `guest`, `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** `GET /api/currencies/rates` responde 200; se conoce la divisa del pais inicial.
**Datos:** pais inicial `US` · destino `CL` · moneda destino `CLP`

1. Abrir `/` y anotar la moneda y los tres precios de las tarjetas de planes.
2. Cambiar el pais a `CL` con el selector de la seccion de precios.
3. Anotar de nuevo la moneda y los tres precios.
4. Repetir el cambio a `AR` y después a `US`.

**Esperado**
- Al cambiar de pais, la moneda mostrada pasa a `CLP` y los tres precios se recalculan.
- Los precios convertidos equivalen al precio base en USD multiplicado por la tasa del pais, redondeado
  segun la regla de la UI.
- Al volver a `US` los precios coinciden de nuevo con los iniciales.
- La conversion ocurre sin recarga completa de la pagina.

**Red:** `GET /api/currencies/rates` -> 200. Verificar el cuerpo con `rates` y que la tasa de `CL` se
aplica a los tres planes, no solo al primero.
**Limpieza:** fijar el pais en `US`.

### [LND-005] Conservar precios visibles cuando falla la API de divisas

**Rol** `guest`, `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** DevTools con el bloqueo de red activo sobre el dominio del backend; el pais
seleccionado no es `US`.
**Datos:** bloquea `GET /api/currencies/rates` · pais `CL` · precios base `29` / `79` / `199` USD

1. Abrir `/` con el bloqueo de red activo.
2. Cambiar el pais a `CL` y leer los precios.
3. Desactivar el bloqueo de red y recargar.

**Esperado**
- Los tres precios siguen visibles, con la moneda del pais, pese al fallo de la API.
- Los valores corresponden a la tasa de respaldo de `CL` (`950`), no a `0`, ni a un guion, ni a la tasa
  de otro pais.
- No se muestra un estado de error a pantalla completa ni un `NaN` en ninguna tarjeta.
- Tras desactivar el bloqueo y recargar, la tasa real sustituye a la de respaldo.

**Red:** `GET /api/currencies/rates` -> fallo o 5xx. Verificar que el fallo no borra la seccion de
precios del DOM.
**Limpieza:** desactivar el bloqueo de red y recargar `/`.

### [LND-006] Comparar el precio del plan Basico entre la landing y el checkout

**Rol** `guest`, `anónimo` · **Ruta** `/` y `/saas/plan` · **P1** · **Resultado** `______`
**Precondición:** precios de la landing capturados con el pais en `US`.
**Datos:** plan `Basico` · precio esperado `29` USD

1. En `/`, anotar el precio del plan `Basico` con el pais en `US`.
2. Navegar a `/saas/plan` y anotar el precio del plan `Basico` con el mismo pais.
3. Repetir la comparacion con el pais en `CL`.

**Esperado**
- En `US` los dos pantallas muestran el mismo precio para `Basico`.
- En `CL` los dos muestran el mismo precio convertido.
- Si los importes difieren, el caso falla y el resultado se anota con el ID H-24, sin abrir un hallazgo
  nuevo.

**Red:** `GET /api/saas/plans` -> 200. Verificar que el precio del plan `Basico` en el cuerpo
coincide con el de la landing.
**Limpieza:** ninguna.

### [LND-007] Verificar los metadatos SEO de la raiz

**Rol** `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** peticion directa a `/` sin sesion y sin recarga desde otra ruta.
**Datos:** documento servido de `/`

1. Abrir `/` en una pestana nueva.
2. Leer el contenido de `<head>`: `title`, `meta[name=description]`, `meta[name=viewport]`,
   `meta[name=robots]`, `meta[property=og:*]`, `meta[name=twitter:card]`, `link[rel=canonical]`.
3. Enumerar los `link[rel=alternate][hreflang]`.
4. Comprobar el atributo `lang` del elemento `<html>`.

**Esperado**
- `title` = `Vitaria - Software de gestion medica multi-tenant`.
- Existe un `meta[name=description]` con texto no vacio.
- Existe `meta[name=viewport]` con `width=device-width` e `initial-scale=1`.
- Existen `og:title`, `og:description`, `og:type`, `og:locale`, `og:image` y `twitter:card` con valor
  `summary_large_image`.
- Existe `link[rel=canonical]` apuntando a la raiz del sitio y cuatro `hreflang` (`es`, `en`, `pt`, `fr`)
  mas `x-default`.
- `<html lang="es">` cuando no hay preferencia guardada.
- Ningun metadato contiene la cadena `undefined` ni `null`.

**Red:** `GET /` -> 200. Verificar en el `head` del HTML servido, no en el DOM ya hidratado, para no
confundir lo que inyecta el cliente con lo que llega al crawler.
**Limpieza:** ninguna.

### [LND-008] Leer la pagina de privacidad con texto legal sustantivo

**Rol** `anónimo` · **Ruta** `/privacidad` · **P2** · **Resultado** `______`
**Precondición:** sesion cerrada.
**Datos:** ruta `/privacidad`

1. Abrir `/privacidad` y esperar la carga completa.
2. Contar los caracteres visibles de la pagina, excluyendo el navbar y el footer.
3. Localizar las secciones que mencionan responsable del tratamiento, finalidades, base legal,
  destinatarios, conservacion, derechos y contacto.
4. Enumerar los enlaces salientes del cuerpo de la pagina.

**Esperado**
- La pagina renderiza texto propio, no un placeholder ni una pantalla de carga permanente.
- El cuerpo visible supera con holgura el minimo del area y contiene las secciones de la lista del paso 3.
- El enlace al footer que lleva a esta pagina tiene `href="/privacidad"` y no `href="#"`.
- `document.title` refleja la seccion (ver LND-003).

**Red:** `GET /privacidad` -> 200. Verificar que la respuesta no es el `index.html` vacio con un cuerpo de
error incrustado.
**Limpieza:** ninguna.

### [LND-009] Leer la pagina de terminos con texto legal sustantivo

**Rol** `anónimo` · **Ruta** `/terminos` · **P2** · **Resultado** `______`
**Precondición:** sesion cerrada.
**Datos:** ruta `/terminos`

1. Abrir `/terminos` y esperar la carga completa.
2. Contar los caracteres visibles de la pagina, excluyendo el navbar y el footer.
3. Localizar las secciones que mencionan objeto del contrato, vigencia, obligaciones de las partes,
  Limitacion de responsabilidad, terminacion y jurisdiccion.
4. Enumerar los enlaces salientes del cuerpo de la pagina.

**Esperado**
- La pagina renderiza texto propio, no un placeholder.
- El cuerpo visible contiene las secciones del paso 3.
- El enlace del footer a esta pagina tiene `href="/terminos"` y no `href="#"`.
- `document.title` refleja la seccion.

**Red:** `GET /terminos` -> 200. Verificar el HTML servido.
**Limpieza:** ninguna.

### [LND-010] Mostrar el banner de cookies en la primera visita

**Rol** `anónimo` · **Ruta** `/` · **P2** · **Resultado** `______`
**Precondición:** `localStorage` sin `vitaria_cookie_consent`; sesion cerrada.
**Datos:** clave `vitaria_cookie_consent` ausente

1. Abrir `/` con el almacenamiento limpio.
2. Localizar el banner de consentimiento de cookies.
3. Leer sus dos botones y el enlace a la politica de privacidad.
4. Pulsar el enlace a la politica sin cerrar el banner.

**Esperado**
- El banner es visible en la primera visita y ofrece al menos una accion de rechazo y una de aceptacion.
- El enlace a la politica apunta a `/privacidad`.
- El banner es alcanzable con el teclado y su boton de rechazo es el primero en el orden de tabulacion
  de los controles del banner.
- Al volver a `/` el banner sigue visible porque aun no hay eleccion registrada.

**Red:** `GET /` -> 200. Verificar que el banner no depende de una peticion adicional para decidir mostrarse.
**Limpieza:** borrar `localStorage['vitaria_cookie_consent']`.

### [LND-011] Rechazar cookies y comprobar que no se pide a Google Analytics

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** banner de cookies visible; DevTools abierto en la pestana Network con el registro
activado desde antes de la carga.
**Datos:** banner en estado inicial · clave `vitaria_cookie_consent` = `{analytics:false}`

1. Abrir `/` con el registro de red activo.
2. Pulsar el boton de rechazo del banner.
3. Recorrer la landing completa: scroll, apertura de cada `<details>` de preguntas frecuentes y envio del
   formulario de contacto con datos validos.
4. Listar todas las peticiones cuyo destino contenga `google-analytics`, `gtag`, `googletagmanager` o
   `analytics.js`.

**Esperado**
- Tras el rechazo, `localStorage['vitaria_cookie_consent']` contiene `analytics` en `false`.
- El numero de peticiones a `google-analytics`, `googletagmanager` y `analytics.js` es 0 durante toda la
  sesion, incluida la navegacion posterior al rechazo.
- El banner desaparece y no vuelve a aparecer en la misma visita.
- Si se observa alguna peticion a un host de Google Analytics, el caso falla con el ID H-26 anotado.

**Red:** 0 peticiones a `googletagmanager.com` y a `google-analytics.com` tras el rechazo. Verificar la
lista completa de hosts contactados, no solo los que fallan.
**Limpieza:** borrar `localStorage['vitaria_cookie_consent']`.

### [LND-012] Aceptar cookies, comprobar el envio del page_view y la persistencia de la eleccion

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** banner visible; `VITE_GA_MEASUREMENT_ID` con el valor anotado en las precondiciones del
area; registro de red activo.
**Datos:** clave `vitaria_cookie_consent` = `{analytics:true}` · host esperado `www.googletagmanager.com`

1. Abrir `/` con el registro de red activo.
2. Pulsar el boton de aceptacion del banner.
3. Recorrer la landing y navegar a `/privacidad` y a `/terminos`.
4. Recargar con `F5` y volver a navegar.
5. Listar las peticiones a Google Analytics en cada momento.

**Esperado**
- Tras aceptar, `localStorage['vitaria_cookie_consent']` contiene `analytics` en `true`.
- Si `VITE_GA_MEASUREMENT_ID` esta definido, se observa la peticion al script de Google Analytics y el
  envio del evento `page_view` con el identificador de medicion correcto.
- Si `VITE_GA_MEASUREMENT_ID` esta vacio, no se inyecta el script y el caso se anota `BLOQUEADO` con el
  motivo, no `FALLÓ`.
- Tras `F5` el banner no reaparece y la eleccion sigue vigente.
- Si el navegador emite el evento pero la respuesta es 403 por CSP en la consola, el caso falla con H-26.

**Red:** `GET https://www.googletagmanager.com/gtag/js?id=<VITE_GA_MEASUREMENT_ID>` -> esperado 200.
Verificar que la CSP no lo bloquea y que `page_view` sale tras la navegacion, no en la carga inicial.
**Limpieza:** borrar `localStorage['vitaria_cookie_consent']`.

### [LND-013] Enviar la solicitud de demo y comprobar si deja registro ⚠️ DESTRUCTIVO

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** sesion cerrada; consulta previa a `jobs` hecha y guardada para comparar.
**Datos:** contacto `qa.demo@vitaria.test` · empresa `QA Demo` · estado de `jobs` con `type = 'lead'`

1. Consultar el numero de filas de `jobs` con `type = 'lead'` y anotarlo.
2. En `/`, pulsar el boton de solicitud de demo.
3. Completar el formulario con los datos del paso anterior y enviarlo.
4. Repetir la consulta del paso 1.

**Esperado**
- El boton no es un enlace `href="#"` ni `#solicitar-demo`: o bien abre el cliente de correo del sistema
  con un `mailto:` precargado, o bien muestra un formulario de captura.
- Si abre el `mailto:`, el comportamiento real es que no se crea ninguna fila: el numero de filas en
  `jobs` con `type = 'lead'` no cambia y el caso se anota con la discrepancia documentada en H-48, sin
  abrir un hallazgo nuevo.
- Si muestra formulario, el envio produce una fila nueva con los datos introducidos.
- El texto o el icono del boton anuncia la accion real, no "enviar formulario" si solo abre el correo.

**Red:** verificar si existe o no una peticion a un endpoint de captacion. Anotar `sin peticiones` si el
comportamiento es `mailto:`, que es lo que muestra el codigo.
**Limpieza:** ⚠️ DESTRUCTIVO si se creo la fila: `DELETE FROM jobs WHERE type = 'lead' AND created_at > <hora
de inicio de la prueba>`. Requiere `ALLOW_DESTRUCTIVE=true`.

### [LND-014] Recorrer los enlaces del footer y descartar los inertes

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** sesion cerrada; en la parte inferior de la pagina.
**Datos:** 7 elementos de lista con `href="#"` en las columnas Producto, Sectores, Recursos, Empresa y
Legal

1. Enumerar todos los enlaces del footer y anotar su `href`.
2. Clasificar cada `href`: ruta interna, URL absoluta, o `href="#"`.
3. Pulsar uno por uno los elementos con `href="#"`.
4. Repetir la pulsacion desde el footer de `/booking` y de `/saas/plan`.

**Esperado**
- Los enlaces legales apuntan a `/privacidad` y `/terminos` y navegan a esas rutas.
- Al pulsar un enlace con `href="#"`, la URL no cambia y el scroll vuelve al inicio o no se mueve: el
  enlace es inerte.
- Contar cuantos `href="#"` hay en total y anotar el numero. Si el numero es mayor que 0, el caso falla
  con el ID H-27 anotado, sin abrir un hallazgo nuevo.
- 0 navegaciones a rutas inexistentes o a `/dashboard` desde el footer.

**Red:** cada clic que debería navegar produce la peticion del documento de destino con 200. Verificar
que ningun `href="#"` genera una peticion de red, porque no la genera nunca.
**Limpieza:** volver a la raiz tras la ultima pulsacion.

### [LND-015] Pulsar el CTA de invitado y comprobar que nunca abre el panel sin sesion

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** sesion cerrada; sin cookies `access_token` ni `refresh_token`.
**Datos:** CTA de entrada como invitado en el hero

1. Abrir `/` sin sesion.
2. Pulsar el CTA de entrada como invitado del hero.
3. Anotar la ruta resultante y el contenido de la pantalla.
4. Recargar con `F5` y repetir.

**Esperado**
- La ruta resultante es una ruta publica de reserva (`/booking`) y nunca `/dashboard`.
- La pantalla de destino ofrece continuar la reserva como invitado o iniciar sesion; no muestra un
  panel autenticado ni un error 401.
- Si la URL incluye un destino protegido, el caso falla con H-27 anotado.
- 0 llamadas a endpoints que exigan sesion durante el recorrido.

**Red:** comprobar en el registro de red que no hay ninguna peticion a `/api/me` que devuelva 401, y que
la navegacion es del lado del cliente a una ruta publica.
**Limpieza:** cerrar cualquier modal abierto y volver a `/`.

### [LND-016] Cargar el directorio publico de medicos sin sesion

**Rol** `anónimo` · **Ruta** `/booking` · **P1** · **Resultado** `______`
**Precondición:** sesion cerrada; existe al menos un doctor con `active = true` y al menos una
especialidad cargada.
**Datos:** respuesta de `GET /api/doctors/public` y de `GET /api/specialties`

1. Abrir `/booking` sin sesion.
2. Esperar a que se cargue el selector de medicos y el de especialidad.
3. Elegir una especialidad de la lista y filtrar.
4. Repetir la eleccion con la especialidad `Todas`.
5. Seleccionar un medico del listado.

**Esperado**
- El listado de medicos se rellena y el selector de especialidad muestra al menos un elemento con texto
  legible, ninguno mostrando la clave i18n en crudo (ver LND-017).
- El listado no muestra datos sensibles del medico: ni correo, ni telefono interno, ni usuario creado.
- Filtrar por especialidad reduce o mantiene el listado sin dejar la pantalla en blanco.
- Al seleccionar un medico se abre su detalle con la informacion publica de disponibilidad.
- El endpoint responde sin credenciales: no se envia `Authorization` ni hay cookie de sesion.

**Red:** `GET /api/doctors/public` -> 200 y `GET /api/specialties` -> 200. Verificar en el cuerpo que la
lista de doctores no incluye `email`, `password_hash` ni `users_id`.
**Limpieza:** cerrar la vista de detalle.

### [LND-017] Consultar los slots publicos y descartar claves i18n crudas en la reserva

**Rol** `anónimo` · **Ruta** `/booking` · **P1** · **Resultado** `______`
**Precondición:** sesion cerrada; un medico publico seleccionado con al menos un dia con disponibilidad.
**Datos:** `GET /api/doctors/public/:id/available-slots` · namespace `guest_booking`

1. Abrir `/booking` y seleccionar un medico.
2. Elegir una fecha con disponibilidad en el calendario.
3. Leer en pantalla todos los textos de la vista de seleccion de horario.
4. Anotar el numero de slots devueltos y el texto de cada franja horaria.
5. Elegir un slot y avanzar al paso siguiente del formulario.

**Esperado**
- La API devuelve los slots de la fecha elegida y la pantalla dibuja un boton por cada franja, con la
  hora en formato de 24 horas segun el locale activo.
- Ningun texto de la vista de seleccion de horario muestra una clave i18n cruda con la forma
  `clave.con.subclave` ni un texto terminado en `}}`; si aparece alguno, se anota la clave y se marca
  `[verificar literal en es.json]` y el caso falla con H-25.
- El avance al paso siguiente no borra el horario elegido.
- Los slots ya ocupados o fuera del horario del medico no se muestran como seleccionables.

**Red:** `GET /api/doctors/public/:id/available-slots` -> 200. Verificar la forma del cuerpo con la lista
de franjas y que el filtro `date` se aplica a la respuesta.
**Limpieza:** volver a la seleccion de medico sin confirmar la reserva.

### [LND-018] Verificar la integridad de los bundles servidos en produccion

**Rol** `anónimo` · **Ruta** `/` · **P1** · **Resultado** `______`
**Precondición:** la pagina `/` ya ha cargado al menos una vez, con la cache del navegador activa.
**Datos:** primera navegacion a `/` en la pestana de pruebas

1. Limpiar el registro de red y abrir `/`.
2. Listar todas las peticiones de tipo `script` y de tipo `stylesheet`.
3. Para cada una, anotar el host y el nombre del archivo.
4. Comprobar por que host se sirve el icono de la pestana.
5. Comprobar el tamano total de los bundles del primer render.

**Esperado**
- Todos los scripts y hojas de estilo se sirven desde el mismo origen que la pagina; ninguno desde
  `unpkg.com` ni desde `cdn.jsdelivr.net`.
- Los nombres de archivo corresponden a los chunks propios de la aplicacion, entre ellos `vendor`, `mui`,
  `icons`, `i18n`, `charts`, `calendar`, `query` y `auth`; ningun archivo se llama `vendor.js` de forma
  generica.
- El icono de la pestana se resuelve con una peticion 200. Si se solicita `/favicon.ico` y responde 404,
  anotarlo.
- El peso total del primer render es una cifra concreta que se registra para comparar entre ejecuciones.
- 0 peticiones 404 de recursos de la propia aplicacion.

**Red:** cada peticion de asset del paso 2 con status 200. Verificar tambien las respuestas 304 cuando
la cache esta activa: un 404 no debe confundirse con un 304.
**Limpieza:** ninguna.

## 5. Defectos conocidos a verificar primero

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-20 | LND-001, LND-018 | Sin recursos de `unpkg.com` ni `cdn.jsdelivr.net`; el peso del chunk de iconos debe ser menor que el de `mui`, no al reves. Anotar tambien si el icono de la pestana responde 404 |
| H-24 | LND-006 | El plan `Basico` debe costar 29 USD en la landing y en `/saas/plan`; hoy el precio puede diferir entre ambas pantallas |
| H-25 | LND-017 | La vista de `/booking` (namespace `guest_booking`) no debe mostrar claves i18n crudas en ninguna de las cuatro lenguas |
| H-26 | LND-011, LND-012 | Con rechazo deben ser 0 peticiones a Google Analytics; con aceptacion solo se emite `page_view` si `VITE_GA_MEASUREMENT_ID` esta definido, y la CSP de produccion puede bloquear `googletagmanager.com` |
| H-27 | LND-014, LND-015 | Los enlaces con `href="#"` son inertes y el CTA de invitado no debe abrir `/dashboard` sin sesion |
| H-46 | LND-004, LND-005 | Anotar la tasa aplicada a cada pais y comparar con la tabla de respaldo, para detectar que se muestren importes de otra moneda |
| H-47 | LND-005 | Al fallar la API de divisas, los precios deben seguir visibles con la tasa de respaldo, no quedar en blanco ni en cero |
| H-48 | LND-013 | La solicitud de demo abre el cliente de correo mediante `mailto:` y no crea fila en `jobs`; contrastar con la descripcion del hallazgo |
| H-49 | LND-003, LND-007, LND-008, LND-009 | `DocumentTitle` debe cambiar por ruta; la raiz debe tener metadatos completos; `/privacidad` y `/terminos` deben tener texto legal sustantivo y no un placeholder |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

## 6. Huecos conocidos

- No hay cuenta de seed con `role = 'user'`, solo con `role = 'patient'`. El alias historico entre
  ambos roles no se puede ejercitar desde la landing.
- La pagina 404 tiene valores por defecto en linea (`t('not_found:title', 'Página no encontrada')`)
  ademas de la entrada en `es.json`. No hay forma de distinguir en pantalla cual de los dos aporto el
  texto, asi que LND-003 anota el literal observado y no el origen.
- El ancho de breakpoint de MUI (`down('md')`) depende del tema, no del ancho de la ventana. Los casos
  de responsive de la landing se miden en el area 31, no aqui.
- `GET /api/currencies/rates` no tiene fuente de verdad de respaldo mas alla de la tabla de tasas de
  la UI: si la API y la tabla divergen, el caso no puede decidir cual de los dos numeros es el correcto.
- No hay cobertura de la landing en los cuatro idiomas a la vez: LND-002 recorre los cuatro, pero el
  resto de los casos se ejecuta en `es` para que el esperado sea legible.
- Los enlaces del footer no tienen destino definido en el proyecto, asi que LND-014 puede contar los
  inertes pero no puede afirmar cual deberia ser la URL correcta de cada uno.

## 7. Resultado del area

| Metrica | Valor |
|---|---|
| Casos escritos | 18 |
| Casos requeridos | 18 |
| P0 | 0 |
| P1 | 9 |
| P2 | 8 |
| P3 | 1 |
| Casos destructivos | 1 (LND-013) |
| Casos que dependen de `VITE_GA_MEASUREMENT_ID` | 2 (LND-011, LND-012) |
| Hallazgos en la seccion 5 | 9 |
| Huecos registrados | 6 |
| Ejecucion | `______` |

---

*Alcance: 18 casos de solo lectura sobre la landing publica, sin sesion y sin datos clinicos; la unica
excepcion es LND-013, que puede dejar una fila en `jobs`. 2026-10-01.*

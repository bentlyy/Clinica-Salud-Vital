# 25 — Analitica y reportes

> KPIs de la clinica, series temporales, rankings, analitica avanzada (no presentados, diagnosticos,
> demanda, horarios, signos vitales), exportacion CSV de analitica y el ciclo de vida de reportes
> (5 tipos, generacion asincrona, PDF y exportacion CSV/JSON en cliente).

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `25` | `ANA` | C3 | Quincenal | 20 | `16`, `24` | — |

---

## 1. Que cubre

La lectura agregada del negocio de una clinica y la generacion de informes. Es la unica pantalla
que consume 6 endpoints de `/api/analytics` a la vez, y la unica que produce ficheros descargables
del producto.

Endpoints reales (`src/modules/analytics/analytics.routes.ts` y `src/modules/reports/report.routes.ts`,
montados en `src/app.ts:292-293`):

| Endpoint | `authorize(...)` | Query / cuerpo | Default |
|---|---|---|---|
| `GET /api/analytics/dashboard` | `admin`, `superadmin` | — | — |
| `GET /api/analytics/bookings-by-month` | `admin`, `doctor`, `superadmin` | `months` | **12** |
| `GET /api/analytics/top-doctors` | `admin`, `superadmin` | `limit` | **10** |
| `GET /api/analytics/status-distribution` | `admin`, `doctor`, `superadmin` | — | — |
| `GET /api/analytics/my-stats` | **`doctor` unicamente** | — | — |
| `GET /api/analytics/no-shows` | `admin`, `superadmin` | — | — |
| `GET /api/analytics/diagnoses` | `admin`, `superadmin` | — | — |
| `GET /api/analytics/demand` | `admin`, `superadmin` | `days` | **30** |
| `GET /api/analytics/schedules` | `admin`, `superadmin` | — | — |
| `GET /api/analytics/vitals` | `admin`, `superadmin` | — | — |
| `GET /api/reports/available` | `admin`, `superadmin` | — | — |
| `POST /api/reports/generate` | `admin`, `superadmin` | `{type, date_from, date_to, filters?}` `.strict()` | — |
| `GET /api/reports/:id` | `admin`, `superadmin` | — | — |
| `GET /api/reports/:id/pdf` | `admin`, `superadmin` | — | — |

### 1.1 Sobreposicion de roles entre el router y la API (defecto real)

`/analytics` y `/reports` se montan con `allowedRoles={STAFF_ROLES}`, y
`STAFF_ROLES = ['superadmin', 'admin', 'doctor', 'lab_technician']` (`AppRouter.tsx:133,315,320`).
La API es mas estricta:

| Rol | `/analytics` en la UI | Endpoints que puede llamar de verdad |
|---|---|---|
| `superadmin` | si | los 10 de analytics + los 4 de reports |
| `admin` | si | los 10 de analytics + los 4 de reports |
| `doctor` | si | **solo 3**: `my-stats`, `bookings-by-month`, `status-distribution` |
| `lab_technician` | **si** | **ninguno**: 403 en los 10 y en los 4 |
| `patient`, `user` | no | — |

`ProtectedRoute` es un gate **solo de cliente**: deja renderizar la pagina y el fallo aparece
despues como estado de error por endpoint. Un `lab_technician` ve `/analytics` montada y con
tablas vacias o errores, en vez de un 403 de pagina. Ver ANA-013.

### 1.2 Sobre la exportacion de JSON (correccion a la suposicion del catalogo)

- La **exportacion CSV de analitica** es 100 % cliente (`AdminAnalyticsPage.tsx:57-102`): no hay
  peticion de red, se serializa el estado ya cargado y se descarga con `Blob` + `URL.createObjectURL`.
  Nombre: `analytics_<YYYY-MM-DD>.csv`.
- La **exportacion CSV de reportes** tambien es 100 % cliente (`reportGenerator.ts`): el backend
  guarda el resultado como **JSON serializado dentro de la columna `result_url`** y el navegador lo
  parsea y lo convierte. Nombres: `citas_<desde>_<hasta>.csv`, `ingresos_<desde>_<hasta>.csv`,
  `pacientes_<desde>_<hasta>.csv`, `laboratorio_<desde>_<hasta>.csv`.
- El **unico JSON descargable** es el reporte de tipo `custom` (`reporte_custom_<desde>_<hasta>.json`),
  que cae en el `default:` del dispatcher. `custom` **no es alcanzable desde la UI**: ver ANA-015.
- **No hay exportacion JSON de analitica.** El CSV de analitica es el unico formato.

---

## 2. Roles y rutas

| Rol | Rutas que usa en esta area | Lo que ve |
|---|---|---|
| `admin` | `/analytics`, `/reports` | Version completa: 6 pestañas, 4 KPIs, export CSV |
| `superadmin` | `/analytics`, `/reports`, `/tenants/:id` | Igual, con la posibilidad de `X-Tenant-Id` de otro tenant |
| `doctor` | `/analytics`, `/reports` | `AdminAnalyticsPage` **cambia de rama**: 4 KPIs propios + 2 graficos, sin pestañas ni CSV. En `/reports` recibe 403 |
| `lab_technician` | `/analytics`, `/reports` (router) | Paginas montadas, **todos** los endpoints en 403 |
| `patient`, `user` | — | Sin acceso: `ProtectedRoute` los expulsa |

Rama de medico (`AdminAnalyticsPage.tsx:258-266`): si `user.role === 'doctor'` se renderiza
`DoctorAnalytics`, que consume `my-stats`, `bookings-by-month` y `status-distribution`, y titula la
pantalla "Mis Analíticas" con el subtitulo "Resumen de tu actividad clínica" (`admin_analytics.myAnalytics`,
`admin_analytics.myAnalyticsSubtitle`). **Es una pagina distinta en la misma URL**, sin pestanas y
sin boton de exportacion.

---

## 3. Precondiciones de datos

| # | Precondicion | Como se cumple | Limpieza |
|---|---|---|---|
| D-1 | `$SUPERADMIN_PASSWORD` y `$ADMIN_PASSWORD` disponibles | Pedirlos antes de empezar | — |
| D-2 | Tenant `default` con datos de los **ultimos 12 meses** | `clinica-demo` tiene citas siembradas; si el periodo esta vacio, los graficos muestran "Sin datos" y los KPIs dan 0 | — |
| D-3 | Al menos un doctor con citas y confirmaciones | Necesario para `top_doctors` y `status-distribution` | — |
| D-4 | Al menos 1 cita `no_show` y 1 cancelada | Necesario para que `no-shows` y `status-distribution` tengan datos | — |
| D-5 | Al menos 1 `clinical_record` con diagnostico y 1 con signos vitales fuera de rango | Necesario para `diagnoses` y `vitals` | — |
| D-6 | Facturas en el periodo para `revenue` | El reporte financiero sale vacio sin `invoices` | — |
| D-7 | Tenant de QA con 2 o 3 medicos y citas propias | Para ANA-012 (aislamiento entre tenants) | `DELETE` + `{"confirm":true}` |
| D-8 | Tenant de QA en plan `free` | Para ANA-020 (bypass de H-63) | `DELETE` + `{"confirm":true}` |

> **Hueco de datos del seed**: `clinica-demo` se siembra con pocas citas y casi ninguna
> `clinical_record`. Los endpoints `diagnoses`, `schedules` y `vitals` devolveran **arrays vacios** en
> el entorno de demostracion. Un array vacio **no** es un fallo: es el estado legitimo de un tenant
> sin historia clinica. En esos casos el resultado es `N/A` con el motivo "tenant sin datos de
> historia clinica", no `FALLÓ`.

---

## 4. Casos

### [ANA-001] Las 6 pestañas de `/analytics` y las peticiones que se emiten antes de tocarlas

**Rol** `admin` · **Ruta** `/analytics` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` con `X-Tenant-Id` del tenant `default`.
**Datos:** —

1. Abrir `/analytics` y esperar a que desaparezca el spinner de carga.
2. Leer el titulo y el subtitulo de la pagina.
3. Contar las pestañas y leer sus etiquetas en orden.
4. Abrir el panel de red y contar las peticiones a `/api/analytics/*` que se emitieron **sin pulsar ninguna pestaña**.
5. Cambiar a la pestaña "No presentados" y contar las peticiones nuevas.
6. Cambiar a "Diagnósticos", "Demanda", "Horarios" y "Signos vitales", contando las peticiones nuevas en cada salto.
7. Volver a "General" y contar las peticiones nuevas.

**Esperado**
- El titulo es "Mis Analíticas" (`admin_analytics.title`) y el subtitulo "Visión general de tus indicadores y estadísticas" (`admin_analytics.subtitle`).
- Hay **6** pestañas, con estas etiquetas exactas: "General" (`tabGeneral`), "No presentados" (`tabNoShows`), "Diagnósticos" (`tabDiagnoses`), "Demanda" (`tabDemand`), "Horarios" (`tabSchedules`), "Signos vitales" (`tabVitals`).
- En la carga inicial se emiten **9 peticiones** a `/api/analytics`: 4 de la pestana "General" (`dashboard`, `bookings-by-month`, `status-distribution`, `top-doctors`) y 5 de las pestanas de ML que **no** se han abierto todavia (`no-shows`, `diagnoses`, `demand`, `schedules`, `vitals`). `useNoShows`, `useDiagnoses`, `useDemand`, `useSchedules` y `useVitals` se llaman **en el cuerpo de `AdminAnalytics`, no dentro de la rama de la pestana** (`AdminAnalyticsPage.tsx:137-141`). `my-stats` **no** se pide: es la rama del `doctor` (`AdminAnalyticsPage.tsx:129-135`).
- Cambiar de pestaña **no** emite ninguna peticion nueva: los datos ya estan en la cache de React Query. Es correcto, y es el unico ahorro de la pantalla: la penalidad se paga entera en el `mount`.
- Ninguna peticion lleva `months`, `limit` ni `days`: los 9 hooks de `useAnalytics.ts` no pasan parametros, asi que el backend aplica sus defaults (12 meses, 10 medicos, 30 dias).
- La barra de pestanas es desplazable con botones de navegacion (`variant="scrollable"`, `scrollButtons="auto"`): en 375 px de ancho debe aparecer el scroll, no desbordar el layout.

**Red:** contar exactamente las peticiones a `/api/analytics/*` en la carga inicial (esperado: **9**, y **9/9 antes de tocar la primera pestaña**) y **0** en cada cambio de pestaña. Si `my-stats` aparece en la traza, el rol activo no es `admin`.
**Limpieza:** ninguna.

### [ANA-002] Los KPIs del dashboard y el conteo de pacientes por rol

**Rol** `admin` · **Ruta** `/analytics` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene N medicos, M usuarios con `role='user'` y K admins/otros.
**Datos:** —

1. Leer las 4 tarjetas de KPI de la pestana "General".
2. Comparar con el total de filas en la tabla de usuarios del tenant.
3. Consultar `GET /api/analytics/dashboard` y enumerar **todas** las claves de `data`.
4. Comparar el numero de tarjetas en pantalla con el numero de claves de la respuesta.
5. Repetir con un tenant que tenga al menos 3 admins registrados.

**Esperado**
- `GET /api/analytics/dashboard` → **200** con exactamente **6** claves en `data`: `total_patients`, `total_doctors`, `total_bookings`, `today_bookings`, `confirmed_bookings`, `cancelled_bookings` (`analytics.service.ts:52-66`). **No son 10 KPIs**: el catalogo esta desactualizado.
- La UI muestra **solo 4** tarjetas: "Pacientes totales" (`totalPatients`), "Médicos totales" (`totalDoctors`), "Citas totales" (`totalBookings`) y "Citas de hoy" (`todayBookings`) (`AdminAnalyticsPage.tsx:190-193`). **`confirmed_bookings` y `cancelled_bookings` se calculan en la consulta y se descartan**: son 2 KPIs pagados en la base de datos que nadie ve. Registrar la perdida.
- **`total_patients` cuenta `users` con `role = 'user'` y omite `role = 'patient'`** (`analytics.service.ts:55`). El frontend centraliza el par con `normalizeRole()` (`frontend/src/shared/utils/role.utils.ts:24`), el backend no: aqui esta la comparacion inline a medio camino, exactamente el patron que H-62 describe como causa raiz. En un tenant con pacientes de ambos roles, el KPI **subreporta** y su etiqueta ("Pacientes totales") no se sostiene.
- `total_doctors` cuenta filas de la tabla **`doctors`**, no de `users` con `role='doctor'`. Si un doctor tiene perfil en `users` pero sin fila en `doctors`, no se cuenta. Verificar la diferencia en el tenant del caso.
- `total_bookings` y `today_bookings` **excluyen las citas canceladas** (`COUNT(*) FILTER (WHERE b.status != 'cancelled')`): la tarjeta "Citas totales" no coincide con el total de filas de la tabla de citas si hay canceladas. Verificar con el tenant que tiene una cancelada (D-4) y reportar la discrepancia numerica.
- `today_bookings` usa `b.date = CURRENT_DATE` en **hora del servidor de la base de datos**: si el servidor de BD esta en UTC y el navegador en `America/Santiago`, las citas de "hoy" pueden no coincidir con las del calendario de la UI. Verificar comparando con la fecha mostrada en la UI de citas.

**Red:** `GET /api/analytics/dashboard` → 200 con `data.total_patients`, `data.total_doctors`, `data.total_bookings`, `data.today_bookings`, `data.confirmed_bookings`, `data.cancelled_bookings`.
**Limpieza:** ninguna (solo lectura).

### [ANA-003] La serie de citas por mes con 12 meses por defecto

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene citas en varios meses.
**Datos:** sin `months` en la query

1. Localizar el grafico de barras de la pestana "General".
2. Contar las barras y leer las etiquetas del eje horizontal.
3. Consultar `GET /api/analytics/bookings-by-month` sin parametros.
4. Repetir con `?months=6` y con `?months=3`.
5. Repetir con `?months=0` y con `?months=abc`.
6. Comparar el total de la barra mas alta con la tabla de top medicos.

**Esperado**
- `GET /api/analytics/bookings-by-month` sin `months` → **200** con **12** elementos (el default de `getQueryInt(req.query, 'months', 12)`).
- Cada elemento trae `month` y `total`. La etiqueta del eje es el mes en espanol; el grafico muestra el ultimo mes con actividad y los intermedios en cero, no un tramo con huecos.
- Con `months=6` y `months=3` la respuesta trae 6 y 3 elementos respectivamente: el rango es **variable y configurable por API**, pero la UI **nunca lo cambia** (el hook no pasa parametros). El usuario no puede acotar el rango desde la UI.
- `months=0` y `months=abc` devuelven el default (12): `getQueryInt` cae al valor por defecto ante un valor no numerico, en vez de devolver 400. Registrar el status real.
- La serie **excluye canceladas** si el `GROUP BY` filtra igual que el dashboard; verificar el criterio mirando si la suma de `total` coincide con `total_bookings + cancelled_bookings` del dashboard (ANA-002) o solo con `total_bookings`.
- Con un tenant sin citas en el periodo, la respuesta es **200 con un array de 12 ceros**, no 404 ni `[]`. El grafico debe mostrar el estado "Sin datos" (`admin_analytics.noData`), no un eje vacio sin explicacion.

**Red:** `GET /api/analytics/bookings-by-month` → 200. Verificar `data.length` con `months` ausente (12), con `6` (6) y con `3` (3). Registrar el status de `months=0`.
**Limpieza:** ninguna.

### [ANA-004] El ranking de medicos con 10 por defecto y sus columnas

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · al menos 2 medicos con citas.
**Datos:** sin `limit` en la query

1. Localizar la tabla "Top médicos" (`admin_analytics.topDoctors`) en la pestana "General".
2. Contar las filas y leer las cabeceras.
3. Consultar `GET /api/analytics/top-doctors` sin parametros.
4. Repetir con `?limit=3` y con `?limit=50`.
5. Comparar el orden de la tabla con el de la respuesta.

**Esperado**
- `GET /api/analytics/top-doctors` sin `limit` → **200** con **10** elementos (default de `getQueryInt(req.query, 'limit', 10)`).
- Las cabeceras son "Médico" (`colDoctor`), "Especialidad" (`colSpecialty`), "Citas" (`colBookings`) y "Confirmadas" (`colConfirmed`), en ese orden.
- Cada fila trae `id`, `name`, `specialty`, `appointments` y `confirmed_bookings`. Un medico sin especialidad registrada muestra "—" (`doctor.specialty || '—'`), no una cadena vacia.
- La tabla esta ordenada por `appointments DESC` y muestra **todos** los medicos en una sola pagina: `rowsPerPage={Math.max(analytics.top_doctors.length, 1)}` (`AdminAnalyticsPage.tsx:242`). Con 10 medicos no hay paginacion visible; con mas de 10, la API **trunca** y la tabla no indica que hay mas.
- Con `limit=3` y `limit=50` la respuesta trae 3 y 50 elementos. La UI no expone ningun selector de `limit`.
- `confirmed_bookings` se renderiza en color primario y en negrita, distinto del resto de la fila. No es un dato decorativo: es la unica columna que cruza volumen con confirmacion.
- Con un tenant sin citas, la seccion muestra el texto centrado "Sin datos" (`admin_analytics.noData`) **en lugar de la tabla**: no hay tabla vacia con cabecera.

**Red:** `GET /api/analytics/top-doctors` → 200. Verificar `data.length` sin `limit` (10), con `limit=3` (3) y con `limit=50` (50, o menos si el tenant tiene menos medicos).
**Limpieza:** ninguna.

### [ANA-005] La distribucion por estado de cita

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene citas en varios estados (D-4: al menos una cancelada y una `no_show`).
**Datos:** —

1. Localizar el grafico circular de la pestana "General".
2. Leer las etiquetas y los valores de cada sector.
3. Consultar `GET /api/analytics/status-distribution` y enumerar los estados devueltos.
4. Sumar los `count` de la respuesta y compararlos con `total_bookings` + `cancelled_bookings` del dashboard (ANA-002).
5. Repetir como `doctor` y comparar con el grafico de la rama de medico.

**Esperado**
- `GET /api/analytics/status-distribution` → **200** con un elemento por estado, cada uno con `status` y `count`. Los estados que la aplicacion usa son `pending`, `confirmed`, `completed`, `cancelled` y `no_show`; verificar el conjunto exacto que devuelve la consulta.
- La suma de todos los `count` **debe** coincidir con `total_bookings + cancelled_bookings` del dashboard: si no coincide, la distribucion excluye algun estado (tipicamente `cancelled` o `no_show`) y el grafico esta incompleto. Registrar la suma y la diferencia.
- El grafico circular muestra todos los estados con `count > 0`. Los estados en cero **no** aparecen: un tenant con solo citas `confirmed` muestra un solo sector.
- Con un unico estado, el grafico no debe mostrar un sector de 360 grados con etiqueta ilegible. Verificar el caso limite.
- El mismo endpoint sirve a la rama de medico (`AdminAnalyticsPage.tsx:109`), y ahi se combina con `my-stats`. Como el endpoint **no recibe `doctor_id`**, el medico ve la distribucion **de toda la clinica**, no la suya. Es un defecto real de autorizacion de datos: `authorize('admin','doctor','superadmin')` sin filtro de doctor. Registrar el hecho.

**Red:** `GET /api/analytics/status-distribution` → 200 con `data` = array de `{status, count}`. Calcular la suma y compararla con el dashboard.
**Limpieza:** ninguna.

### [ANA-006] El ranking de no presented

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene al menos 2 citas `no_show` en distintos medicos (D-4).
**Datos:** —

1. Ir a la pestana "No presentados".
2. Leer el contenido del panel.
3. Consultar `GET /api/analytics/no-shows` y enumerar las claves de cada elemento.
4. Comparar el total de no presented con el `count` de `no_show` de ANA-005.
5. Verificar si el panel ofrece selector de periodo o de medico.

**Esperado**
- `GET /api/analytics/no-shows` → **200** con un array ordenado por no presented descendente. Cada elemento trae `doctor_id` y el conteo, mas el nombre del doctor resuelto en el servicio (`getNoShowsByDoctor`, `analytics.service.ts:130`).
- El panel muestra el **total de no presented por medico**, con el peor primero. Es el unico panel de las 6 pestanas que ordena por "peor rendimiento", asi que su primer elemento es siempre el medico con mas ausencias.
- La suma de los conteos debe coincidir con el `count` de `no_show` de la distribucion de estados (ANA-005). Si no coincide, los dos endpoints usan criterios distintos y el producto se contradice a si mismo: registrar ambos numeros.
- El endpoint **no acepta `doctor_id` ni rango de fechas**: siempre es la clinica completa y todo el historico. Un panel de 3 anos de datos no es filtrable ni paginado.
- Con cero no presented, el panel muestra su estado vacio (literal de `es.json`, namespace `admin_analytics`: `[verificar literal en es.json]`) y no un error.

**Red:** `GET /api/analytics/no-shows` → 200 con `data` = array. Comparar la suma con el `no_show` de ANA-005.
**Limpieza:** ninguna.

### [ANA-007] La analitica de diagnosticos

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene `clinical_records` con `diagnosis` (`getDiagnoses`, `analytics.service.ts:153`). Si no hay ninguna, el caso es `N/A`.
**Datos:** —

1. Ir a la pestana "Diagnósticos".
2. Leer el contenido del panel.
3. Consultar `GET /api/analytics/diagnoses` y enumerar las claves de cada elemento.
4. Contar los diagnosticos distintos y el total de apariciones.
5. Verificar si el panel normaliza mayusculas/minusculas al agrupar.

**Esperado**
- `GET /api/analytics/diagnoses` → **200** con un array de diagnosticos y su frecuencia, ordenados por frecuencia descendente.
- El panel muestra los diagnosticos mas frecuentes. Verificar si incluye un total al pie y si el listado esta truncado a los N primeros: si el panel muestra 5 de 30 diagnosticos, **debe existir un indicador de "ver todos"**; si no, el usuario cree que esos son todos. Registrar el comportamiento exacto.
- La consulta hace `GROUP BY diagnosis` sobre el texto **tal como se escribio en la historia clinica**: "Gripe" y "gripe" cuentan como dos diagnosticos distintos. Verificar con el tenant si hay diferencias de mayusculas y registrar el numero de grupos resultante.
- El endpoint **no acepta rango de fechas** ni filtro de medico: es historico completo. Un diagnostico de hace 3 anos pesa igual que uno de ayer.
- Con cero `clinical_records`, la respuesta es **200 con `[]`**. El panel debe mostrar su estado vacio.
- `diagnosis` puede ser `NULL` en la tabla. Si el `GROUP BY` no filtra `NULL`, aparece un grupo con diagnostico vacio: verificar y registrar si el panel lo muestra.

**Red:** `GET /api/analytics/diagnoses` → 200 con `data` = array. Enumerar las claves exactas de cada elemento y el numero de grupos.
**Limpieza:** ninguna.

### [ANA-008] La forecast de demanda a 30 dias

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene citas historicas.
**Datos:** sin `days` en la query

1. Ir a la pestana "Demanda".
2. Leer el contenido del panel y contar los dias representados.
3. Consultar `GET /api/analytics/demand` sin parametros.
4. Repetir con `?days=7` y con `?days=90`.
5. Verificar si la serie incluye dias futuros ya reservados y dias pasados.

**Esperado**
- `GET /api/analytics/demand` sin `days` → **200** con una serie de **30** dias (default de `getQueryInt(req.query, 'days', 30)`).
- El panel muestra la demanda por dia con una proyeccion. El titulo del eje y las unidades deben ser explicitos (litera les de `es.json`, namespace `admin_analytics`: `[verificar literal en es.json]`).
- Con `days=7` y `days=90` la serie tiene 7 y 90 elementos. La UI **nunca** cambia `days`: el hook no lo pasa.
- **Verificar si la "forecast" mezcla pasado y futuro.** `smaForecast` (`analytics.service.ts:33`) calcula una media movil simple: con pocos datos devuelve la media global y con datos irregulares produce una linea plana. Con el tenant de demostracion es probable que la proyeccion sea trivial. Registrar si la serie projected es identica a la real, que seria un sintoma de que la forecast no aporta informacion.
- La consulta **no recibe `tenant_id` como parametro de query**: se toma del middleware. Con `X-Tenant-Id` de otro tenant, la serie cambia: es la prueba de aislamiento de ANA-012.
- Con cero citas, la respuesta es 200 con ceros y el panel muestra su estado vacio.

**Red:** `GET /api/analytics/demand` → 200. Verificar la longitud de la serie sin `days` (30), con `days=7` (7) y con `days=90` (90).
**Limpieza:** ninguna.

### [ANA-009] Los horarios optimos recomendados

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene citas con horas repartidas.
**Datos:** —

1. Ir a la pestana "Horarios".
2. Leer el contenido del panel.
3. Consultar `GET /api/analytics/schedules` y enumerar las claves de cada elemento.
4. Contar las franjas horarias devueltas.
5. Verificar si el panel distingue dia de la semana y hora.

**Esperado**
- `GET /api/analytics/schedules` → **200** con un array de franjas horarias y su metricas de ocupacion (`getOptimalSchedules`, `analytics.service.ts:171`).
- El panel ordena las franjas poralguna metrica de disponibilidad u ocupacion y las etiqueta. Verificar el criterio de orden real: si ordena por "mas disponibilidad recomendada" y el usuario lo lee como "mas rentable", es una ambiguedad de copy. Registrar los literales tal cual.
- El endpoint **no acepta rango de fechas**: es historico completo. Las franjas recomendadas no se pueden recalcular para un periodo concreto.
- El calculo **agrupa por hora y dia de la semana** a partir de `bookings.date` y `bookings.time`. Verificar que la zona horaria de la BD coincide con la del negocio: una clinica en `America/Santiago` con el servidor en UTC desplaza todas las franjas Recommendations.
- Con cero citas, la respuesta es 200 con `[]` y el panel muestra su estado vacio.
- Verificar si las franjas recomendadas **se aplican a algo**: si no hay un boton para copy-pegar el horario en `Availability`, el panel es informacional. Registrar si existe esa accion.

**Red:** `GET /api/analytics/schedules` → 200 con `data` = array. Enumerar claves y numero de franjas.
**Limpieza:** ninguna.

### [ANA-010] Las anomalias en signos vitales

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene `clinical_records` con signos vitales registrados, al menos 1 fuera de rango (D-5). `getVitalSignsAnomalies` (`analytics.service.ts:230`) lee de `clinical_records`.
**Datos:** —

1. Ir a la pestana "Signos vitales".
2. Leer el contenido del panel.
3. Consultar `GET /api/analytics/vitals` y enumerar las claves de cada elemento.
4. Verificar quais sinais vitais se analizan y quais umbrales se aplican.
5. Comparar el numero de anomalias con el total de `clinical_records` con signos.

**Esperado**
- `GET /api/analytics/vitals` → **200** con un array de anomalias detectadas.
- El panel lista los signos fuera de rango con su valor y su lectura. Verificar si el panel muestra la **umbral** que se supero: si no, el usuario ve "150" sin saber si es alto o bajo. Registrar el comportamiento.
- El analisis **se hace en el servidor, en SQL, con umbrales hardcodeados** en la consulta: no hay configuracion por clinica, ni por pais, ni unidades. Registrar los valores umbral literales de la consulta.
- Las unidades **no se normalizan**: si un registro esta en cmHg y otro en mmHg, el umbral los tratara igual. Es un defecto real de correctitud clinica. Verificar si los valores se guardan normalizados en `clinical_records` antes de afirmar el bug.
- El endpoint **no acepta `patient_id`, rango de fechas ni filtro de severidad**: siempre el historico completo del tenant. Un paciente dado no tiene forma de ver solo sus anomalias desde esta pantalla.
- Con cero `clinical_records`, la respuesta es 200 con `[]`.
- **No hay autorizacion por paciente**: un `admin` ve las anomalias de todos sus pacientes. Es lo esperado para el rol, pero implica que la pantalla es un listado de datos clinicos sensibles sin auditoria de acceso propia.

**Red:** `GET /api/analytics/vitals` → 200 con `data` = array. Enumerar las claves exactas y copiar los umbrales de la consulta usada.
**Limpieza:** ninguna.

### [ANA-011] La rama de medico: 4 KPIs propios y 2 graficos, sin pestanas

**Rol** `doctor` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de un `doctor` del tenant `default` con al menos 1 cita y 1 expediente. `GET /api/analytics/my-stats` esta restringido a `authorize('doctor')`: **solo** un medico puede llamarlo.
**Datos:** —

1. Cerrar sesion e iniciar sesion como `doctor`.
2. Abrir `/analytics`.
3. Leer el titulo, el subtitulo y contar las tarjetas de KPI.
4. Contar las pestanas y los graficos.
5. Consultar `GET /api/analytics/my-stats` y enumerar las claves.
6. Con la sesion de `admin`, llamar a `GET /api/analytics/my-stats`.

**Esperado**
- La pagina muestra el titulo "Mis Analíticas" (`myAnalytics`) y el subtitulo "Resumen de tu actividad clínica" (`myAnalyticsSubtitle`). **Son distintos** de los del admin: la misma URL renderiza dos paginas diferentes segun el rol.
- Hay **4** tarjetas: "Mis citas" (`myBookings` → `total_bookings`), "Pacientes atendidos" (`patientsServed` → `patients_served`), "Próximas citas" (`upcomingBookings` → `upcoming_bookings`) y "Historias clínicas" (`clinicalRecords` → `clinical_records`) (`AdminAnalyticsPage.tsx:119-122`).
- **No hay barra de pestañas** y **no hay botón "Exportar CSV"**. Las 5 funciones de ML (no presentados, diagnósticos, demanda, horarios, vitales) **no existen** para el médico, ni siquiera aunque le habiliten el endpoint.
- Solo se emiten **3** peticiones: `my-stats`, `bookings-by-month` y `status-distribution`. De las 3, solo `my-stats` esta filtrada por medico: las otras 2 son **de toda la clinica**. El medico ve un grafico de citas por mes y un grafico de estados que **incluyen los datos de sus compañeros**. Es una fuga de datos entre profesionales, no un fallo de estilo: registrarlo con la evidencia de ANA-005.
- Con sesion de `admin`, `GET /api/analytics/my-stats` → **403** con `error: "FORBIDDEN"`. Con sesion de `doctor` → 200. El endpoint es el inverso del resto: los administradores **no** pueden ver las estadisticas de un medico concreto.
- `patients_served` cuenta expedientenes y `clinical_records` cuenta registros, ambos filtrados por `doctor_id` y `tenant_id` (`analytics.service.ts:114-126`).
- Un `doctor` en `/reports` recibe **403** en los 4 endpoints: la ruta se lo permite y la API no. Es el reverso de ANA-013 y parte del mismo defecto de roles.

**Red:** con `doctor`: `my-stats` → 200, `bookings-by-month` → 200, `status-distribution` → 200, y los otros 6 endpoints de analytics **no se piden**. Con `admin`: `my-stats` → 403.
**Limpieza:** cerrar sesion.

### [ANA-012] Aislamiento entre tenants en los 10 endpoints de analitica

**Rol** `superadmin` · **Ruta** `/analytics` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** dos tenants con datos **distintos y comparables** (D-7): `default` (`clinica-demo`) y un tenant de QA con 2 medicos, sus propias citas, expedientes y facturas. `$SUPERADMIN_PASSWORD` disponible. Todos los `authorize` de analytics aceptan `superadmin`, y el `tenant_id` sale del `X-Tenant-Id`.
**Datos:** `X-Tenant-Id` = slug del tenant A, luego slug del tenant B

1. Con sesion de `superadmin` y `X-Tenant-Id` del tenant A, abrir `/analytics` y anotar los 4 KPIs, el top de medicos y la distribucion de estados.
2. Repetir con `X-Tenant-Id` del tenant B.
3. Consultar los 9 endpoints de lectura con cada `X-Tenant-Id` y comparar.
4. Cambiar `X-Tenant-Id` a un slug inexistente.
5. Omitir la cabecera `X-Tenant-Id` con sesion de `superadmin`.
6. Repetir el paso 1 con sesion de `admin` del tenant A pero `X-Tenant-Id` del tenant B.

**Esperado**
- Los 9 endpoints de lectura devuelven **200** con ambos tenants y **cifras distintas**. Ninguna cifra del tenant B aparece en el tenant A.
- Las 6 funciones de ML y el dashboard filtran **siempre** por `tenant_id` en la consulta SQL (`analytics.service.ts`): es un filtro en el `WHERE`, no un filtro en el servidor. Registrar la cifra de cada endpoint con cada tenant como evidencia.
- Con un `X-Tenant-Id` inexistente → **404** con `error: "TENANT_NOT_FOUND"`. Todos los endpoints dan 404, ninguno da 200 con ceros: un 200 con ceros seria una fuga silenciosa.
- Sin `X-Tenant-Id` con sesion de `superadmin` → **401** con `error: "TENANT_CONTEXT_REQUIRED"`. El superadmin tiene `tenant_id = NULL` y sin cabecera no hay contexto de aislamiento.
- **El paso 6 es la prueba decisiva**: con sesion de `admin` del tenant A y `X-Tenant-Id` del tenant B, la cabecera **manda** sobre la sesion. Si la API devuelve los datos de B, un admin puede leer la analitica completa de cualquier clinica del sistema cambiando una cabecera. Si devuelve 403 o los datos de A, la sesion manda. **Registrar el status real con el cuerpo del error**: es el hallazgo mas grave del area si la cabecera gana.
- `top_doctors` no expone `tenant_id` en cada fila, asi que la comparacion se hace por los nombres de los medicos: los del tenant A no deben aparecer en B.

**Red:** los 9 endpoints x 2 tenants, mas los 4 casos de cabecera (tenant inexistente, sin cabecera, cabecera ajena, sesion ajena). Registrar el status y el `error` de cada uno.
**Limpieza:** `DELETE /api/super-admin/tenants/<slug-tenant-B>` con `{"confirm":true}` → 200 "Tenant soft-deleted. Data retained for compliance."

### [ANA-013] `lab_technician` puede abrir la pagina pero no puede leer nada

**Rol** `lab_technician` · **Ruta** `/analytics` y `/reports` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `lab_technician` del tenant `default`. `STAFF_ROLES` incluye ese rol en el router (`AppRouter.tsx:133`), pero **ningun** endpoint de `analytics` ni de `reports` lo acepta.
**Datos:** —

1. Iniciar sesion como `lab_technician`.
2. Abrir `/analytics` y anotar si la pagina se monta o se expulsa.
3. Contar las peticiones a `/api/analytics/*` y registrar el status de cada una.
4. Leer que se ve en cada tarjeta, grafico y panel.
5. Abrir `/reports` y registrar el status de la carga de tipos y de la tabla de reportes.
6. Intentar generar un reporte desde la UI.
7. Cerrar sesion e iniciar como `patient` o `user`; abrir `/analytics`.

**Esperado**
- `ProtectedRoute` deja montar la pagina: `lab_technician` esta en `STAFF_ROLES`. La pantalla aparece y queda inservible.
- Los **10** endpoints de `GET /api/analytics/*` devuelven **403** con `error: "FORBIDDEN"`. Registrar el status de los 9 que se piden en la carga inicial (`my-stats` no se pide para este rol).
- Los **4** endpoints de `GET/POST /api/reports/*` devuelven **403** tambien: `report.routes.ts:17` es `authorize('admin','superadmin')`.
- La UI **no** muestra un 403 de pagina: como `useAdminAnalytics` y las demas funciones fallan, se renderiza el `ErrorState` con el boton "Reintentar" (`common.retry`), o paneles vacios sin explicacion. Registrar que se ve exactamente: si hay un mensaje de error que diga "no autorizado", el usuario lo entiende; si hay 6 crdas vacias, parece un fallo de datos.
- El boton de generar reporte esta **deshabilitado** (`disabled={!dateFrom || !dateTo || generateReport.isPending}`) pero no explica por que. Un `lab_technician` ve 4 tarjetas de tipo, elige una, elige fechas, pulsa generar y la mutacion falla con 403 sin mensaje.
- Con `patient` o `user`, `ProtectedRoute` **si** expulsa a la pagina y la ruta no llega a pedir nada. La diferencia entre "expulsado" (patient) y "dentro pero sin poder" (lab_technician) es el defecto.
- **La correccion esperada** es sacar `lab_technician` de `STAFF_ROLES` para estas dos rutas, o crear un `STAFF_ANALYTICS_ROLES` propio. Registrar cual de las dos aplica al caso.

**Red:** 9 peticiones a `/api/analytics/*` → 403 con `error: "FORBIDDEN"`; `GET /api/reports/available` → 403. Con `patient`: 0 peticiones.
**Limpieza:** cerrar sesion.

### [ANA-014] Exportar la analitica a CSV desde el navegador

**Rol** `admin` · **Ruta** `/analytics` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · la pestana "General" esta cargada con datos.
**Datos:** —

1. Pulsar "Exportar CSV" (`admin_analytics.exportCSV`) en la pestana "General".
2. Capturar el fichero descargado y anotar su nombre exacto.
3. Abrirlo y contar las secciones y las lineas.
4. Leer las cabeceras de cada seccion.
5. Comparar los valores del CSV con los KPI y las tablas en pantalla.
6. Buscar cualquier clave en `snake_case` o en ingles dentro del fichero.
7. Ir a la pestana "No presentados" y comprobar si el boton de exportar sigue visible.
8. Comprobar si el fichero se genera **sin** ninguna peticion de red.

**Esperado**
- Se descarga un fichero llamado exactamente `analytics_<YYYY-MM-DD>.csv` con la fecha de hoy (`link.download = analytics_${new Date().toISOString().slice(0, 10)}.csv`). Ojo: `toISOString()` usa **UTC**, asi que entre las 20:00 y las 24:00 hora de Chile el nombre lleva la fecha del dia siguiente. Verificar si ocurre y registrarlo.
- El CSV tiene **4 secciones**, cada una precedida por una linea que empieza con `# `:
  1. `# Métricas` (`csvMetrics`) con cabecera "Métrica,Valor" (`csvMetric`, `csvValue`).
  2. `# Reservas por mes` (`csvBookingsByMonth`) con cabecera "Mes,Reservas" (`csvMonth`, `csvBookings`).
  3. `# Estado de reserva` (`csvBookingStatus`) con cabecera "Estado,Cantidad" (`csvStatus`, `csvCount`).
  4. `# Mejores doctores` (`csvTopDoctors`) con cabecera "Médico,Especialidad,Citas,Confirmadas" (`colDoctor`, `colSpecialty`, `colBookings`, `colConfirmed`).
- **La primera seccion mezcla espanol con claves tecnicas**: la columna "Métrica" contiene los **nombres crudos de la API** (`total_patients`, `total_doctors`, `total_bookings`, `today_bookings`, `confirmed_bookings`, `cancelled_bookings`), porque el exportador hace `Object.entries(analytics?.stats ?? {})` (`AdminAnalyticsPage.tsx:75`). El fichero sale con cabeceras en espanol y metricas en `snake_case` ingles. **Es un defecto real de i18n en la exportacion**: registrar las 6 lineas tal cual.
- Ademas la seccion 1 incluye `confirmed_bookings` y `cancelled_bookings`, los dos KPIs que la UI **no muestra** (ANA-002): el CSV es mas completo que la pantalla.
- Los valores numericos coinciden **cifra a cifra** con los KPI en pantalla. Una divergencia seria un bug de redondeo o de estado de React Query.
- **No hay BOM UTF-8** en el CSV de analitica (`new Blob([lines.join('\n')])`, sin el `BOM` que si usa `reportGenerator.ts:43`). Al abrirlo en Excel en Windows, los acentos se muestran mal. Registrar el fallo: es un defecto real y visible, a diferencia del CSV de reportes de ANA-018.
- El escapado de campos con `escapeCsv` (**`/["\n;]/`**) cubre comillas, saltos de linea y punto y coma, pero **no el punto** (`.`). Un nombre de paciente con punto decimal sin coma se rompe al abrir en Excel con separador `;`. Verificar con un nombre que contenga `;` o `"` y confirmar que se entrecomilla.
- El boton "Exportar CSV" **solo existe en la pestana "General"**. En las otras 5 no hay exportacion: no presented, diagnosticos, demanda, horarios y vitales **no se pueden exportar**. Registrar la ausencia.
- La generacion es **100 % cliente**: 0 peticiones de red. `URL.revokeObjectURL` se llama tras el click, asi que no hay fuga de memoria observable.
- El nombre del fichero **no incluye el tenant**: dos tenants descargan `analytics_<fecha>.csv` y el segundo pisa al primero en la carpeta de Descargas.

**Red:** 0 peticiones nuevas al pulsar el boton. Registrar la lista completa de peticiones de la carga inicial para confirmar que no hay ninguna de exportacion.
**Limpieza:** borrar el CSV descargado.

### [ANA-015] Los 5 tipos de reporte del backend contra las 4 tarjetas de la UI

**Rol** `admin` · **Ruta** `/reports` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene facturas (D-6) para que el financiero no salga vacio.
**Datos:** —

1. Abrir `/reports` y leer el titulo y el subtitulo.
2. Contar las tarjetas de tipo y leer su etiqueta y descripcion.
3. Consultar `GET /api/reports/available` y contar los elementos.
4. Comparar el conjunto de tipos de la respuesta con el de las tarjetas.
5. Verificar si la UI llamo a `GET /api/reports/available` al cargar la pagina.
6. Intentar generar un reporte de tipo `custom` desde la UI.
7. Leer las claves del elemento `custom` de la respuesta de `/available`.

**Esperado**
- La pagina se titula "Reportes" (`reports.title`) con el subtitulo "Genera y descarga informes de tu consulta" (`reports.subtitle`). Hay un encabezado de seccion "Tipo de Reporte" (`reports.reportType`).
- La UI muestra **4** tarjetas: "Reporte de Citas" (`reportTypes.appointments`), "Reporte Financiero" (`reportTypes.revenue`), "Reporte de Pacientes" (`reportTypes.patients`) y "Reporte de Laboratorio" (`reportTypes.laboratory`), cada una con su `typeDescriptions.*`.
- `GET /api/reports/available` → **200** con un **array plano de 5** elementos (no envuelto en `{data}`), con `type`, `label`, `description` e `icon`: `appointments`/"Citas", `revenue`/"Ingresos", `patients`/"Pacientes", `laboratory`/"Laboratorio", `custom`/"Personalizado" (`report.service.ts:32-38`).
- **La UI no llama a `GET /api/reports/available`.** Las 4 tarjetas salen de un array **hardcodeado** en el componente: `const reportTypes: ReportType[] = ['appointments', 'revenue', 'patients', 'laboratory']` (`ReportsPage.tsx:100`). El endpoint existe, el hook `useAvailableReports` existe, y **nadie los usa**: son codigo muerto. Es un defecto de arquitectura real, no un detalle menor.
- Consecuencia: **`custom` no es alcanzable desde la UI**, y es el unico tipo que produce una descarga JSON. El paso 6 de este caso debe fallar con un 404 en el DOM: no hay ninguna tarjeta ni opcion de menu para `custom`.
- Las etiquetas de la respuesta de `/available` ("Citas", "Ingresos", ...) **no son las del i18n** ("Reporte de Citas", "Reporte Financiero", ...). Como la UI no consume la respuesta, la divergencia esta oculta: si alguien conecta el hook sin revisar, duplica las etiquetas.
- `reportTypes.doctors` existe en el i18n ("Reporte de Doctores") pero **no existe en el backend**: no hay tipo `doctors` ni en la respuesta ni en el enum del Zod. Es una clave i18n muerta. `reportTypes.custom` **no existe** en el i18n: si se generara un reporte `custom` por API, su chip en la tabla caeria al fallback `|| pollingReport.type` y mostraria el literal `custom` en crudo.
- El enum del Zod es `['appointments', 'revenue', 'patients', 'laboratory', 'custom']` y es `.strict()`: cualquier clave extra en el cuerpo es 400.

**Red:** `GET /api/reports/available` → 200 con un **array plano** de 5 elementos (no `{data: [...]}`: la envoltura es inconsistente con el resto de la API). En la carga de `/reports`, **0 peticiones a `/api/reports/available`**.
**Limpieza:** ninguna.

### [ANA-016] Generar un reporte y seguir su estado hasta `completed`

**Rol** `admin` · **Ruta** `/reports` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene citas e invoices en el periodo (D-6). ⚠️ El caso **crea filas en `reports`** en la base de datos: no es destructivo pero si acumulable. Registrar el `id` de cada reporte generado.

**Datos:** `type` = `appointments` · `date_from` = primer dia del mes en curso · `date_to` = hoy · **sin** `filters`

1. En `/reports`, pulsar la tarjeta "Reporte de Citas".
2. Leer los campos de rango que aparecen y sus etiquetas.
3. Rellenar "Desde" (`reports.from`) y "Hasta" (`reports.to`) y pulsar "Generar Reporte" (`reports.generateReport`).
4. Leer la etiqueta del boton mientras corre.
5. Anotar la respuesta de `POST /api/reports/generate` completa.
6. Seguir la tabla de estado hasta que cambie.
7. Leer el estado final y la accion disponible.

**Esperado**
- `POST /api/reports/generate` → **200** con el objeto de reporte **plano** (sin envolver en `{data}`), con `id`, `type: "appointments"`, `status: "generating"`, `result_url: null` y `config.date_from` / `config.date_to` con las fechas enviadas (`report.service.ts:131-140`).
- El `INSERT` inicial es **`status: 'generating'`** y el calculo se hace de forma **sincrona dentro de la misma peticion**: al terminar, un `UPDATE` pone `status: 'completed'` y `result_url` con el JSON serializado, o `status: 'failed'` (`report.service.ts:161-168`). La UI aun asi hace polling.
- Mientras corre, el boton muestra "Generando..." (`reports.generating`) y esta deshabilitado.
- La tabla de estado muestra las cabeceras "ID", "Tipo", "Período", "Estado", "Fecha" y la accion (`reports.columnId`, `columnType`, `columnPeriod`, `columnStatus`, `columnDate`, `common.actions`).
- El chip de estado pasa por "Generando" a "Completado" (`statusLabels.generating`, `statusLabels.completed`). La UI hace polling con `useReportDetail(pollingReportId)`, que dispara `GET /api/reports/:id`.
- Al quedar `completed`, aparece el boton "Descargar" (`reports.download`).
- La tabla muestra **una sola fila**: la del ultimo reporte generado. **No hay historial.** Las claves i18n `reports.reportHistory`, `reports.scheduledReports`, `reports.lastGenerated`, `reports.emailReport` y `reports.scheduleReport` existen pero **no tienen ninguna UI**: son claves muertas de funcionalidad planificada.
- Al cargar la pagina sin un reporte en curso, `useReportDetail(pollingReportId ?? 0)` se monta con `id = 0`: **verificar en el panel de red si se emite `GET /api/reports/0`**. Si se emite, es una peticion inutil que ademas devolvera 404 o un reporte ajeno al tenant. Registrar el status real.
- Al recargar la pagina, el reporte en curso se pierde: `pollingReportId` es estado en memoria. Verificar que `/reports` arranca sin tabla y que el reporte anterior ya no es accesible desde la UI. Confirmar que sigue en la DB con `GET /api/reports/<id>`.

**Red:** `POST /api/reports/generate` → 200 con `status: "generating"` y `result_url: null`; despues al menos un `GET /api/reports/<id>` → 200 con `status: "completed"` y `result_url` con JSON. Registrar si `GET /api/reports/0` se emite en la carga inicial.
**Limpieza:** los reportes son acumulables y no se pueden borrar por API (`GET /api/reports/:id` no tiene `DELETE`). Anotar los `id` creados.

### [ANA-017] Descargar el PDF del reporte

**Rol** `admin` · **Ruta** `/reports` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · un reporte `completed` (el de ANA-016) con su `id`.
**Datos:** `id` = el id de ANA-016

1. Buscar en `/reports` cualquier boton de PDF o de "Exportar PDF" (`reports.exportPDF`).
2. Consultar `GET /api/reports/<id>/pdf` directamente.
3. Anotar los headers de la respuesta.
4. Abrir el PDF descargado y verificar su contenido.
5. Repetir la peticion como `lab_technician` y con un `id` de otro tenant.

**Esperado**
- **La UI no ofrece descarga en PDF.** No hay ningun boton que llame a `/api/reports/:id/pdf`, pese a que el endpoint existe y la clave i18n `reports.exportPDF` ("Exportar PDF") esta definida. Es una funcionalidad **implementada en el backend y ausente en el frontend**: registrar la ausencia como hueco, no como bug del endpoint.
- `GET /api/reports/<id>/pdf` → **200** con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename=report-<type>-<id>.pdf` (`report.controller.ts:40-43`). Los headers de seguridad tambien se envian: `X-Content-Type-Options: nosniff` y `Cache-Control: private, no-store, no-cache, must-revalidate`. Verificar los 4 headers.
- El PDF **contiene los datos del reporte**: es generado en el servidor por `report-pdf.service.ts` a partir del `result_url` parseado. Verificar que aparecen el periodo, el total y el detalle. Un PDF vacio con el total a 0 en un tenant con citas seria un fallo.
- Con un `id` de otro tenant → **404** con `error: "NOT_FOUND"`: el servicio filtra por `tenant_id`. Es la prueba de aislamiento de los reportes.
- Con un `id` inexistente o no numerico → 404 o 400 con `error: "REPORT_INVALID_ID"`. Registrar el status exacto de los dos casos.
- Con un reporte en `status: "generating"`, `result_url` es `null`: el PDF debe fallar con un error controlado, no con un PDF en blanco ni con un 500 por `JSON.parse(null)`. Registrar el status real.
- Como `lab_technician` → **403**. Como `admin` de otro tenant con el mismo `id` → 404.

**Red:** `GET /api/reports/<id>/pdf` → 200 con los 4 headers. Ademas: `id` de otro tenant → 404, `id` no numerico → 400/404, `id` inexistente → 404, `lab_technician` → 403.
**Limpieza:** borrar el PDF descargado.

### [ANA-018] La descarga CSV y JSON se genera en el navegador, no en el servidor

**Rol** `admin` · **Ruta** `/reports` · **P0** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el reporte `appointments` de ANA-016 en `completed`, con su `id` y su `config.date_from` / `config.date_to`.
**Datos:** los 4 tipos que la UI ofrece

1. En la tabla del reporte `completed`, pulsar "Descargar" y capturar el fichero.
2. Anotar el nombre exacto del fichero y su codificacion.
3. Leer las primeras lineas del CSV, incluido el resumen y la linea de separacion.
4. Comprobar si el fichero tiene BOM UTF-8 y si los acentos se ven bien.
5. Contar las peticiones de red que se emitieron al pulsar "Descargar".
6. Generar y descargar un reporte `revenue`, uno `patients` y uno `laboratory`, y anotar los 4 nombres de fichero.
7. Generar por API un reporte de tipo `custom` y descargarlo con el mismo flujo de cliente.

**Esperado**
- Pulsar "Descargar" emite **0 peticiones de red**: el backend ya entrego el JSON en `result_url` y la conversion a CSV ocurre en `reportGenerator.ts`. Ningun endpoint produce CSV.
- El nombre del fichero es `citas_<date_from>_<date_to>.csv`, con las fechas tal como las guardo el backend en `config`. Los otros tres son `ingresos_...`, `pacientes_...` y `laboratorio_...` (`reportGenerator.ts:109,179,223,287`).
- El CSV **lleva BOM UTF-8** (`const blob = new Blob([BOM + content])`, `reportGenerator.ts:43`): a diferencia del CSV de analitica (ANA-014), este **si** se abre bien en Excel. Verificar que los acentos de "Médico", "Especialidad" y "Paciente" se ven correctos.
- La estructura del fichero es: un bloque de **resumen**, una linea en blanco, la linea `DETALLE`, otra linea `=======` y despues la cabecera y las filas (`full = summary + '\nDETALLE\n=======\n' + csv`). Verificar las cabeceras del bloque de detalle segun el tipo, usando `reports.csvHeaders.*`: fecha, hora, paciente, email del paciente, doctor, especialidad, estado para `appointments`; monto total, estado de pago, items para `revenue`; telefono, citas totales, ultima cita, fecha de creacion, rol para `patients`; prueba, valor, unidad, area, fecha de solicitud, fecha de completado para `laboratory`.
- **El total del resumen coincide con el numero de filas del detalle.** Una divergencia es un bug de conteo.
- Los campos que vienen de un `LEFT JOIN` y pueden ser `null` (email del paciente, especialidad) se renderizan como celda vacia. Verificar que no aparece el literal `null` ni `[object Object]` en el fichero.
- El tipo `custom` cae en el `default:` del dispatcher y descarga **`reporte_custom_<desde>_<hasta>.json`** con `JSON.stringify(data, null, 2)` y `application/json;charset=utf-8` (`reportGenerator.ts:330-333`). Este es el **unico JSON descargable** del producto. Como la UI no ofrece `custom` (ANA-015), **este JSON solo se puede obtener llamando a la API y ejecutando el dispatcher a mano**: registrarlo como hueco.
- Si `JSON.parse(resultUrl)` falla, el dispatcher cae a `downloadBlob(data, 'reporte_<type>_<desde>_<hasta>.txt', 'text/plain')`: un **TXT** en lugar del CSV. Verificar si algun camino lleva ahi; si lo lleva, es un fallo silencioso de formato.
- La columna `result_url` se llama "url" pero **contiene JSON**, no una URL. No hay ninguna descarga del lado del servidor. Registrar la confusion de nomenclatura.

**Red:** 0 peticiones en cada descarga. Registrar los 4 nombres de fichero y verificar el BOM en el hexadecimal de los 3 primeros bytes (`ef bb bf`).
**Limpieza:** borrar los ficheros descargados. Los 4 reportes creados quedan en la DB sin forma de borrarlos.

### [ANA-019] Rechazar un tipo de reporte invalido y una fecha invertida

**Rol** `admin` · **Ruta** `/reports` · **P2** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com`.
**Datos:** 6 variantes de `POST /api/reports/generate`

1. `{"type":"doctors","date_from":"2026-01-01","date_to":"2026-01-31"}` con `type` fuera del enum.
2. `{"type":"appointments","date_from":"2026-01-31","date_to":"2026-01-01"}` con `date_from` > `date_to`.
3. `{"date_from":"2026-01-01","date_to":"2026-01-31"}` sin `type`.
4. `{"type":"appointments","date_from":"","date_to":"2026-01-31"}` con `date_from` vacio.
5. `{"type":"appointments","date_from":"2026-01-01","date_to":"2026-01-31","format":"csv"}` con una clave extra.
6. `{"type":"appointments","date_from":"no-es-fecha","date_to":"2026-01-31"}` con formato de fecha invalido.

**Esperado**
- Las 6 devuelven **400**. El Zod es `.strict()` y `date_from` / `date_to` son `z.string().min(1)`, sin `.date()`: **no se valida el formato**, solo la longitud minima.
- El caso 1 da 400 de Zod por enum, listando los 5 valores validos: `appointments`, `revenue`, `patients`, `laboratory`, `custom`.
- El caso 2 (`date_from` > `date_to`) pasa el Zod y **llega a la consulta SQL**: la Clausula `WHERE b.date >= '2026-01-31' AND b.date <= '2026-01-01'` **no devuelve error, devuelve 0 filas**. Resultado: un reporte `completed` con `total: 0` y un CSV de resumen con 0. **La UI no avisa de que el rango es invalido y el usuario creera que la clinica no tuvo actividad.** Es un defecto real de validacion: registrar el reporte con `status: "completed"` y 0 filas.
- El caso 3 da 400 (falta `type`); el 4 da 400 (`min(1)`).
- El caso 5 da 400 por `.strict()`. Confirma que `format: "csv"` **no** es un parametro soportado: el backend no genera ficheros.
- El caso 6 pasa el Zod y llega a la SQL con `'no-es-fecha'`. Postgres lanza `invalid input syntax for type date`, el `asyncHandler` lo convierte en **500** con `error: "INTERNAL_ERROR"`. **Un parametro controlado por el usuario produce un 500**: es un defecto real de manejo de errores de base de datos. Registrar el status exacto y el `error` del cuerpo.
- Ninguno de los 6 casos crea un reporte en la DB salvo el 2 y el 6 (que crean uno `completed` con 0 filas y uno fallido respectivamente).

**Red:** `POST /api/reports/generate` x6. Registrar el status y el `error` de cada uno. El caso 2 debe devolver 200 con `total: 0`; el caso 6 debe devolver 500.
**Limpieza:** los reportes creados en los casos 2 y 6 quedan en la DB sin forma de borrarlos por API. Anotar sus `id`.

### [ANA-020] Un tenant en plan Free accede a la analitica y a los reportes de pago

**Rol** `admin` · **Ruta** `/analytics` y `/reports` · **P0** · **Bloqueante** · **Resultado** `______`
⚠️ **DESTRUCTIVO** por la creacion y el borrado del tenant de QA. Requiere `ALLOW_DESTRUCTIVE=true`.

**Precondicion:** `ALLOW_DESTRUCTIVE=true` · tenant de QA creado con `planCode: "free"` y un `adminPassword` propio (D-8) · `GET /api/saas/limits` devuelve `features.analytics === false` y `features.laboratory === false`.
**Datos:** credenciales del admin del tenant de QA

1. Iniciar sesion como el admin del tenant de QA (plan `free`).
2. Consultar `GET /api/saas/limits` y anotar `data.plan.code`, `data.enforcement_mode` y `data.features.analytics`.
3. Abrir `/analytics` y registrar el codigo HTTP de la carga de datos.
4. Consultar directamente `GET /api/analytics/dashboard`.
5. Abrir `/reports` y generar un reporte completo de `appointments`.
6. Consultar `GET /api/reports/available` y `POST /api/reports/generate`.
7. Consultar un endpoint de laboratorio con la misma sesion.
8. Confirmar en `/suscripcion` si la UI ofrece "Actualizar a este plan" (`saas.upgradeTo`).

**Esperado**
- `GET /api/saas/limits` → 200 con `data.plan.code: "free"`, **`data.enforcement_mode: "soft"`** y `data.features.analytics: false`.
- `GET /api/analytics/dashboard` → **200**. **No hay 403, no hay 402, no hay redireccion a `/suscripcion`.** La feature `analytics` esta marcada como no contratada y aun asi se entrega el dato. Es el hallazgo **H-63** en su forma economica: el producto se entrega sin cobrar.
- `GET /api/analytics/*` y `GET /api/reports/*` → los 9 de lectura y los 4 de reportes devuelven **200** con este plan. La analitica completa del tenant se puede leer sin contrato.
- `POST /api/reports/generate` → **200**: un tenant en `free` puede generar y descargar reportes completos.
- `requireFeature('laboratory')` esta en `laboratory.routes.ts:30` pero `enforceFeature` esta en modo `soft`, asi que los endpoints de laboratorio tambien pasan. **El unico middleware de feature del backend no bloquea nada en la configuracion actual.**
- La UI **no** muestra el cartel de premium: `/analytics` y `/reports` no envuelven la pagina en `PremiumLocked` (ese componente solo se usa en la ruta `laboratory`, `AppRouter.tsx:287`). El tenant ve la analitica completa sin ninguna pista de que deberia pagar.
- `/suscripcion` ofrece "Actualizar a este plan" (`saas.upgradeTo`) al.admin, lo que confirma que el producto reconoce que `analytics` es de pago y aun asi no la restringe. **La contradiccion es interna y verificable en el mismo caso.**
- Con este caso queda demostrado que `advanced_reports` y `analytics`, features de `basic` y `pro` respectivamente, **no generan ingreso**: ningun usuario en plan gratuito es bloqueado.

**Red:** `GET /api/saas/limits` → 200 con `enforcement_mode: "soft"`. Los 9 endpoints de `GET /api/analytics/*` → 200. `GET /api/reports/available` → 200. `POST /api/reports/generate` → 200. `GET /api/laboratory/...` → 200. **Ninguno devuelve 402 ni 403.**
**Limpieza:** `DELETE /api/super-admin/tenants/<slug-tenant-QA>` con `{"confirm":true}` → 200 con `{"message":"Tenant soft-deleted. Data retained for compliance."}`. Los reportes creados quedan en la DB.

---

## 5. Defectos conocidos a verificar primero

Solo se reaprovechan los identificadores H-NN cuya descripcion de `90-HALLAZGOS-CODIGO.md` coincide con el defecto real de este area. Los defectos de analitica y reportes sin H-NN se listan en la seccion 6.

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-62 | ANA-002 | El alias `user`/`patient` reimplementado inline. Aqui se manifiesta en `analytics.service.ts:55`: `SELECT COUNT(*) FROM users WHERE role = 'user' AND tenant_id = $1` cuenta **solo** `role = 'user'`. El frontend si normaliza con `normalizeRole()`, asi que un paciente con rol `patient` queda fuera del KPI y uno con rol `user` entra |
| H-63 | ANA-020, ANA-013 | El feature gating solo se aplica a `laboratory`. De las 9 feature keys del seed, `analytics` y `advanced_reports` son features de pago **sin enforcement**: `laboratory.routes.ts:30` es el unico `router.use(requireFeature(...))` del backend. `GET /api/analytics/dashboard` → 200 con plan `free`, y `/reports` → 200. El candado del sidebar es solo visual |

> **No aplican a este area** (verificar en la que les corresponde): H-24 (precio y redondeo entre landing `/` y `/saas/plan`, area `15`), H-52 (el rate limit de onboarding en memoria vive en `saas.routes.ts`, area `14`), H-50 (codigo muerto de captcha en `OnboardingContractPage`, area `14`), H-51 (`currency`/`country_code` solo existen en el alta de tenant, area `14`), H-60 (higiene del historial medico), y el resto de H-01…H-61. No reasignar su H-NN a un defecto distinto.

---

## 6. Huecos conocidos

| Hueco | Por que no se cubre con un caso | Impacto |
|---|---|---|
| No hay descarga de PDF en la UI | El endpoint existe y `reports.exportPDF` existe, pero ningun boton lo llama | El backend entero de `report-pdf.service.ts` es inalcanzable para el usuario. Solo se puede usar por API |
| No hay historial de reportes | Solo se muestra la fila del reporte en curso | Un reporte generado hace una semana es irrecuperable desde el producto. Se puede recuperar por API si se conoce el `id` |
| No hay borrado de reportes | No hay `DELETE /api/reports/:id` | La tabla `reports` crece sin limite y los casos de prueba se acumulan |
| `custom` no es alcanzable desde la UI | Las tarjetas estan hardcodeadas sin `custom` | El unico formato JSON descargable del producto no se puede generar por la interfaz |
| No hay exportacion JSON de analitica | Solo existe el CSV, generado en cliente | No se puede integrar la analitica en otra herramienta sin parsear CSV |
| No hay exportacion de las 5 pestañas de ML | El boton de CSV solo existe en "General" | No presented, diagnosticos, demanda, horarios y vitales se quedan en pantalla |
| El CSV de analitica no lleva BOM UTF-8 | `new Blob([lines.join('\n')])` sin BOM, a diferencia de `reportGenerator.ts` | En Excel en Windows los acentos se ven mal: "Médico" se lee con caracteres rotos |
| El CSV de analitica exporta claves tecnicas | `Object.entries(analytics?.stats)` usa los nombres de la API | El fichero sale con cabeceras en espanol y metricas en `snake_case` ingles |
| El nombre del CSV no incluye el tenant | `analytics_<fecha>.csv` | Dos tenants descargan al mismo fichero y se pisan |
| `GET /api/reports/available` es codigo muerto | El componente hardcodea los tipos | Un cambio en el backend (un tipo nuevo) **no aparece en la UI** sin tocar el frontend |
| Los 6 KPIs no coinciden con el nombre | `total_patients` cuenta `role='user'`, `total_bookings` excluye canceladas | Las cifras del dashboard contradicen a las de las tablas de usuarios y citas |
| 2 KPIs se calculan y se descartan | `confirmed_bookings` y `cancelled_bookings` no se renderizan | Se paga la consulta y no se muestra el dato |
| `date_from > date_to` devuelve un reporte vacio sin error | El Zod no compara fechas y la SQL no valida | El usuario ve "Completado" con 0 y cree que no hubo actividad |
| Una fecha no numerable produce 500 | El Zod no valida el formato de fecha | `date_from: "no-es-fecha"` → `INTERNAL_ERROR`. Un input del usuario llega a Postgres sin sanitizar |
| El `status-distribution` de un doctor incluye toda la clinica | `authorize` acepta `doctor` pero no filtra por `doctor_id` | Un medico ve la distribucion de estados de sus compañeros |
| No hay rangos de fechas en 6 de los 10 endpoints | `no-shows`, `diagnoses`, `schedules`, `vitals`, `status-distribution` y `my-stats` no aceptan parametros | Son historicos eternos: un panel de 3 anos no se puede acotar ni paginar |
| El `escalado` de unidades de signos vitales no existe | Los umbrales estan hardcodeados en SQL | Riesgo clinico real si se mezclan unidades en `clinical_records` |
| `GET /api/reports/0` en la carga inicial | `useReportDetail(pollingReportId ?? 0)` monta con id 0 | Peticion inutil (y 404) en cada visita a `/reports` |
| 5 claves i18n de reportes sin UI | `reportHistory`, `scheduledReports`, `lastGenerated`, `emailReport`, `scheduleReport` | Reportes programados y envio por email estan traducidos pero no implementados |
| `reportTypes.doctors` sin backend y `reportTypes.custom` sin i18n | Conjuntos de tipos descuadrados en los dos lados | El chip de un `custom` por API muestra el literal `custom` en crudo |

---

## 7. Resultado del area

Ejecutar los 20 casos en el orden indicado. ANA-001 a ANA-011 son de solo lectura y pueden ir en
paralelo entre tenants distintos. ANA-012 a ANA-020 cambian de tenant o crean datos: **en serie**.

| Resultado | Casos | Cantidad |
|---|---|---:|
| `PASÓ` | — | 0 |
| `FALLÓ` | — | 0 |
| `BLOQUEADO` | — | 0 |
| `N/A` | — | 0 |
| `OMITIDO` | — | 0 |
| **Total** | ANA-001 … ANA-020 | **20** |

Al cerrar el area, responder ademas:

| Pregunta | Respuesta |
|---|---|
| ¿Cuantos KPIs devuelve el dashboard y cuantos muestra la UI? | |
| ¿`total_patients` coincide con el numero de pacientes real del tenant? | |
| ¿Cuantas peticiones emite `/analytics` en la carga inicial? | |
| ¿Con que rol se puede abrir `/analytics` sin poder leer un solo endpoint? | |
| ¿Un `admin` de un tenant puede leer la analitica de otro cambiando `X-Tenant-Id`? | |
| ¿La cabecera `X-Tenant-Id` o la sesion gana cuando no coinciden? | |
| ¿Hay algun boton de PDF en la UI? | |
| ¿Como se obtiene un reporte JSON desde la interfaz? | |
| ¿`date_from: "no-es-fecha"` devuelve 400 o 500? | |
| ¿Un tenant en plan `free` puede leer la analitica y generar reportes? | |

---

*Alcance: 10 endpoints de `GET /api/analytics/*`, la rama de medico de `/analytics`, la
exportacion CSV de analitica, y los 4 endpoints de `GET/POST /api/reports/*` con sus descargas
CSV/JSON en cliente y el endpoint de PDF. 20 casos, capa C3, frecuencia quincenal, dependencias
`16` y `24`. Prefijo `ANA`. Revisión: 2026-10-01.*
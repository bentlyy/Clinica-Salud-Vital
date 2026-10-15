# 15 — Planes, checkout y ciclo de vida de la suscripcion

> Catalogo publico de planes, comparativa en la landing, resolucion de moneda por pais, portal de
> checkout con Mercado Pago, cambio de plan, cancelacion, limites, features por rol y el
> comportamiento real de `handlePastDueSubscriptions` (definido pero nunca invocado).

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `15` | `SAS` | C3 | Quincenal | 18 | `14` | `25` |

---

## 1. Que cubre

La monetizacion del producto de punta a punta: los 4 planes del catalogo publico, su presentacion
en la landing, el calculo de precio en la moneda del pais del tenant, el checkout con Mercado Pago,
los tres caminos de `change-plan` (mejora, rebaja, mismo plan) y la cancelacion. Cierra con los
endpoints de consulta: `usage`, `usage/summary`, `limits` y `features`, este ultimo el unico que
expone la matriz feature → roles.

Endpoints reales del area (`src/modules/saas/saas.routes.ts`, montado en `src/app.ts:280`):

| Endpoint | Rol minimo | Cuerpo / query | Notas |
|---|---|---|---|
| `GET /api/saas/plans` | **anonimo** | — | **Sin** `authMiddleware`: es publico. Primera y unica lectura del catalogo |
| `GET /api/saas/subscription` | admin, superadmin | — | Suscripcion actual. `404` si no hay |
| `POST /api/saas/checkout` | admin, superadmin | `{plan_code, success_url, cancel_url}` | Crea preferencia en Mercado Pago. Requiere `mp_preference_id` de la DB |
| `POST /api/saas/change-plan` | admin, superadmin | `{plan_code, proration_behavior?}` | Unico camino de upgrade, downgrade y no-op |
| `POST /api/saas/cancel` | admin, superadmin | — | Pasa a `canceled` en el periodo actual |
| `GET /api/saas/usage` | admin, superadmin | `year`, `month` | Solo del mes en curso; `year` debe ser el actual |
| `GET /api/saas/usage/summary` | admin, superadmin | `year`, `month` | Igual que `usage` pero resumido |
| `GET /api/saas/limits` | admin, superadmin | — | Ahi esta el `enforcement_mode: "soft"` de H-63 |
| `GET /api/saas/features` | admin, superadmin | — | Matriz feature → roles permitidos |
| `PATCH /api/saas/tenant` | admin, superadmin | `{clinic_name, logo_url, primary_color, currency, country_code}` | Configuracion de marca y **la unica via para fijar `currency`/`country_code`** tras el 400 de H-51 |

### 1.1 Catalogo de planes (datos de `db/init.sql`, no del frontend)

| `code` | Nombre en DB | `price_monthly` | `price_yearly` | `max_doctors` | `max_patients` | `storage_gb` | Trial |
|---|---|---:|---:|---:|---:|---:|---|
| `free` | Free | 0 | 0 | 1 | 50 | 1 | 14 |
| `basic` | Basico | 29 | 290 | 3 | 200 | 5 | 14 |
| `pro` | Pro | 79 | 790 | 10 | -1 | 20 | 14 |
| `enterprise` | Enterprise | 199 | 1990 | -1 | -1 | 100 | 0 |

- `-1` significa **ilimitado**; `PlanFeatures` lo traduce con la clave `featUnlimited`.
- El `trial` se materializa al crear la suscripcion: `status: "trialing"` y `current_period_end = created_at + trial_days`.
- Todos los precios de `init.sql` estan **en USD** (`init.sql:68-71`); el catalogo se expone tal cual.

### 1.2 Matriz de features (columna `features` JSONB de `saas_plans`)

| Feature | `free` | `basic` | `pro` | `enterprise` |
|---|:-:|:-:|:-:|:-:|
| `bookings` | si | si | si | si |
| `sms` | — | si | si | si |
| `clinical_records` | — | si | si | si |
| `analytics` | — | si | si | si |
| `laboratory` | — | — | si | si |
| `api_access` | — | — | si | si |
| `advanced_reports` | — | — | si | si |
| `white_label` | — | — | — | si |
| `custom_domain` | — | — | — | si |

> **El gating no se aplica a la API.** `requireFeature('laboratory')` es el unico middleware
> `requireFeature` que existe en todo el backend, y cuelga de `enforceFeature` con
> `enforcement_mode: "soft"`, que **deja pasar** cuando el tenant no tiene suscripcion, cuando el
> plan no existe o cuando `enforcement_mode` es `soft` (`saas.service.ts:216-236`). Ver H-63.

---

## 2. Roles y rutas

| Rol | Rutas que usa en esta area |
|---|---|
| `anonimo` | `/` (landing) y `/planes` — ambas leen el catalogo sin sesion |
| `admin` | `/suscripcion`, `/checkout/success`, `/checkout/cancel` |
| `superadmin` | `/tenants` y `/tenants/:id`; puede leer la suscripcion de cualquier tenant |
| `doctor`, `lab_technician`, `patient`, `user` | Sin ruta propia; el admin de su clinica es quien gestiona la suscripcion |

| Ruta | Componente | `allowedRoles` | Que hace |
|---|---|---|---|
| `/planes` | `PlansPage` | publica (`AppRouter.tsx:304`) | Grid de 4 `PlanCard` |
| `/suscripcion` | `SubscriptionPage` | `['admin','superadmin']` (`:267-271`) | Resumen + boton de cambio/cancelacion |
| `/checkout/success` | `CheckoutSuccessPage` | `['admin','superadmin']` (`:305-310`) | Confirmacion de pago |
| `/checkout/cancel` | `CheckoutCancelPage` | `['admin','superadmin']` (`:311-316`) | Vuelta al checkout cancelado |
| `/` y `/*` | `LandingPage` | publica | Renderiza el bloque de planes de la landing |

**Todos los endpoints de `/api/saas/*` exigen `X-Tenant-Id`**, aplicado por `tenantMiddleware`
(`src/app.ts:284-285`). El superadmin lleva `tenant_id = NULL`, asi que puede leer planes y features
pero las funciones de suscripcion de un tenant concreto requieren su `X-Tenant-Id`.

---

## 3. Precondiciones de datos

| # | Precondicion | Como se cumple | Limpieza |
|---|---|---|---|
| D-1 | `$SUPERADMIN_PASSWORD` y `$ADMIN_PASSWORD` disponibles | Pedirlos antes de empezar | — |
| D-2 | Tenant `default` en plan `free` (el de `clinica-demo`) | Es el estado de `db/init.sql` | Restaurar con `POST /api/saas/change-plan {"plan_code":"free"}` |
| D-3 | Tenant de QA en plan `enterprise` | Crear con `POST /api/super-admin/tenants` pasando `planCode: "enterprise"` y `adminPassword` | `DELETE` + `{"confirm":true}` (soft delete) |
| D-4 | `mp_preference_id` presente en la suscripcion | Lo crea el propio checkout; si el tenant nunca hizo checkout, `POST /api/saas/checkout` responde 400 `SAAS_CHECKOUT_NOT_CONFIGURED` | — |
| D-5 | `MERCADOPAGO_ACCESS_TOKEN` configurado | Preguntar al operador. Si falta, el checkout es `BLOQUEADO` | — |
| D-6 | `MARKETING_ORIGIN` con el dominio publico | Requerido por `buildCheckoutUrls` para validar `success_url` y `cancel_url` (`saas.service.ts:106-129`) | — |
| D-7 | Pais del tenant conocido para el caso de moneda | `PATCH /api/saas/tenant {"country_code":"CL"}`; anota el valor previo | Restaurar el valor previo |

---

## 4. Casos

### [SAS-001] Leer el catalogo publico de planes sin sesion

**Rol** `anonimo` · **Ruta** `/api/saas/plans` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** contexto de navegador limpio, sin cookies ni `X-Tenant-Id`. `GET /api/saas/plans` **no** pasa por `authMiddleware` ni por `tenantMiddleware` (`saas.routes.ts:32`).
**Datos:** —

1. Abrir `$BASE_URL/api/saas/plans` directamente por URL, sin sesion.
2. Leer el status y la forma del cuerpo.
3. Contar los elementos de `data`.
4. Anotar el contenido literal de `data[0]`.
5. Repetir la llamada con `Accept: application/json` y con `curl`-less (pestaña del navegador) para confirmar que no hay CORS ni redirect.

**Esperado**
- **200** con `{data: [ ...4 planes ], count: 4}`. El campo `count` viene de la consulta, no de `data.length`: ambos deben dar 4.
- Los 4 `code`, en el orden de `init.sql`: `free`, `basic`, `pro`, `enterprise`.
- `data[0]` trae `code: "free"`, `name: "Free"`, `price_monthly: 0`, `price_yearly: 0`, `max_doctors: 1`, `max_patients: 50`, `storage_gb: 1`, `trial_days: 14` y `features` con exactamente `["bookings"]`.
- `enterprise` trae `max_doctors: -1`, `max_patients: -1`, `storage_gb: 100`, `trial_days: 0` y las 9 features.
- `is_active` no se expone en el JSON publico: el endpoint filtra por `is_active = true` pero no lo serializa. No buscarlo.
- La peticion **no** lleva cabecera `X-Tenant-Id` y la respuesta **no** depende del tenant.

**Red:** `GET /api/saas/plans` → 200, `count: 4`. Verificar `data.length === 4` y que ninguna peticion de red de la pagina arregloincludes `Authorization`.
**Limpieza:** ninguna.

### [SAS-002] Verificar la comparativa de 4 planes en `/planes` y en la landing

**Rol** `anonimo` · **Ruta** `/planes` · **P0** · **Resultado** `______`
**Precondicion:** contexto limpio, viewport 1440 x 900, idioma `es-CL`.
**Datos:** —

1. Abrir `$BASE_URL/planes` sin sesion.
2. Contar las tarjetas de plan.
3. Leer nombre, precio y unidad de cada tarjeta.
4. Leer la lista de features de `basic` y de `pro`.
5. Recorrer la grid en un viewport de 375 x 812 (movil).
6. Abrir `/` y comprobar que el bloque de planes tambien se renderiza.
7. Recargar `/planes` y verificar que sigue mostrando 4 planes.

**Esperado**
- `/planes` renderiza **4** `PlanCard` en este orden: Free, Basico, Pro, Enterprise.
- La UI muestra los nombres de la **DB** (`Free`, `Basico`, `Pro`, `Enterprise`), con "Basico" **sin tilde**: el nombre viene de `saas_plans.name`, no de i18n.
- El precio de `Free` se muestra como `0` y los demas con el simbolo de la moneda activa, seguidos del sufijo "/mes" (`saas.perMonth`).
- El boton de cada tarjeta no-current es "Continuar al pago" (`saas.selectPlan`).
- La lista de features de `basic` incluye 4 items visibles: el limite de medicos, el limite de pacientes, el almacenamiento y las features. Los items salen de `PlanFeatures`, en el orden medicos → pacientes → almacenamiento → sms → bookings → laboratory → clinical_records → advanced_reports → analytics → api_access → white_label → custom_domain.
- El grid pasa a una columna en movil sin desbordamiento horizontal ni scroll lateral.
- `/` y `/planes` piden el mismo endpoint y muestran lo mismo: **no hay dos fuentes de verdad**.
- En `/planes` el tenant `default` (plan `free`) muestra el chip "Plan actual" (`saas.currentPlanLabel`) en la tarjeta Free y su boton esta **deshabilitado**. Verificarlo con sesion de `admin@demo.clinic.com`: es un observable especifico del caso.

**Red:** `GET /api/saas/plans` → 200, `count: 4`, en ambas paginas. Sin peticiones de escritura.
**Limpieza:** ninguna.

### [SAS-003] Los limites del plan Free en la tarjeta

**Rol** `anonimo` · **Ruta** `/planes` · **P1** · **Resultado** `______`
**Precondicion:** contexto limpio en `/planes`.
**Datos:** —

1. Localizar la tarjeta Free en `/planes`.
2. Leer el precio y los cuatro items de la lista de features.
3. Consultar `GET /api/saas/plans` y comparar con lo que se ve en pantalla.
4. Intentar pulsar "Continuar al pago" en Free con sesion de un tenant que ya esta en Free.

**Esperado**
- El precio mostrado es `0` (no "Gratis"): el numero viene de `formatPricingAmount(0, 'USD')`.
- Los items visibles son "Hasta 1 doctores" (`saas.featDoctors` con `count: 1`), "Hasta 50 pacientes" (`saas.featPatients`), "1 GB de almacenamiento" (`saas.featStorage` con `count: 1`) y "Citas" (`saas.featBookings`).
- **Solo 4 items**, aunque `free` declara `sms`, `clinical_records`, `analytics`, `laboratory`, `api_access`, `advanced_reports`, `white_label` y `custom_domain` en algun sitio: `PlanFeatures` solo imprime las features con `true`, asi que Free no muestra ninguna de esas 8. Coincide con `features = {bookings: true}`.
- La UI coincide con `data[0]` del endpoint en los 3 limites. Cualquier divergencia es un hallazgo: **la tarjeta no lee el limite, lo recalcula** si el catalogo cambia.
- Con sesion de un tenant en Free, el boton es "Plan actual" y esta deshabilitado, no "Continuar al pago".

**Red:** `GET /api/saas/plans` → 200. Comparar `data[0].max_doctors`, `data[0].max_patients`, `data[0].storage_gb` con los numeros de pantalla.
**Limpieza:** ninguna.

### [SAS-004] Los limites del plan Basico en la tarjeta

**Rol** `anonimo` · **Ruta** `/planes` · **P1** · **Resultado** `______`
**Precondicion:** contexto limpio en `/planes`.
**Datos:** —

1. Localizar la tarjeta Basico.
2. Leer precio, items de feature y boton.
3. Consultar `GET /api/saas/plans` y comparar `data[1]`.
4. Repetir la lectura del precio en movil.

**Esperado**
- El nombre se muestra como "Basico" (literal de la DB, sin tilde).
- El precio es `29` con simbolo de moneda y el sufijo "/mes" (`saas.perMonth`).
- Los items son "Hasta 3 doctores", "Hasta 200 pacientes", "5 GB de almacenamiento", "Citas" y "SMS". **5 items**, porque `basic` activa `sms`.
- `data[1].features` trae `bookings`, `sms`, `clinical_records` y `analytics` en `true`, y los demas en `false`: la tarjeta **muestra 5 items pero declara 4 features**, porque medicos, pacientes y almacenamiento se imprimen desde `max_doctors`/`max_patients`/`storage_gb`, no desde `features`. Anotarlo como razon del desajuste, no como bug.
- El boton es "Continuar al pago" y esta habilitado.

**Red:** `GET /api/saas/plans` → 200. Verificar `data[1].price_monthly === 29`, `data[1].max_doctors === 3`, `data[1].max_patients === 200`, `data[1].storage_gb === 5`, `data[1].price_yearly === 290`.
**Limpieza:** ninguna.

### [SAS-005] Los limites del plan Pro en la tarjeta

**Rol** `anonimo` · **Ruta** `/planes` · **P1** · **Resultado** `______`
**Precondicion:** contexto limpio en `/planes`.
**Datos:** —

1. Localizar la tarjeta Pro.
2. Leer precio, items y boton.
3. Comparar con `data[2]` del endpoint.
4. Comprobar si el texto de "pacientes ilimitados" usa el termino correcto en espanol.

**Esperado**
- El precio es `79` con "/mes".
- Los items visibles son: "Acceso doctors ilimitado" (`featUnlimited` con `subject: "doctors"`), "Acceso patients ilimitado" (`subject: "patients"`), "20 GB de almacenamiento" (`featStorage` con `count: 20`), "Citas", "SMS", "Laboratorio", "Historias clínicas", "Reportes avanzados", "Analítica" y "Acceso API". **10 items**.
- `data[2].max_patients === -1` y `data[2].storage_gb === 20`; `max_doctors === 10`.
- **`Pro` declara `max_doctors: 10` pero su tarjeta muestra "Acceso doctors ilimitado"**: el componente imprime `featUnlimited` en cuanto `max_doctors === -1`, asi que la UI **debe** mostrar "Hasta 10 doctores" y no "ilimitado". Si muestra "ilimitado", es un bug de renderizado del componente `PlanFeatures` o una divergencia de la DB: **verificar contra la respuesta real y registrar la salida exacta, sin dar por hecho ninguno de los dos**.
- El texto "Acceso doctors ilimitado" esta en ingles dentro de la interfaz en espanol: la clave `featUnlimited` recibe `subject: 'doctors'` / `'patients'` / `'storage'` como cadenas **sin traducir** (`PlanFeatures.tsx:16,22,28`). Es un defecto real de i18n: registrar el literal tal cual.

**Red:** `GET /api/saas/plans` → 200. Verificar `data[2].max_doctors`, `data[2].max_patients === -1`, `data[2].storage_gb === 20`, `data[2].price_yearly === 790`.
**Limpieza:** ninguna.

### [SAS-006] Los limites del plan Enterprise en la tarjeta

**Rol** `anonimo` · **Ruta** `/planes` · **P1** · **Resultado** `______`
**Precondicion:** contexto limpio en `/planes`.
**Datos:** —

1. Localizar la tarjeta Enterprise.
2. Leer precio, items y boton.
3. Comparar con `data[3]` del endpoint.
4. Contar items y confirmar que aparecen las 9 features.

**Esperado**
- El precio es `199` con "/mes".
- Los items de capacidad son "Acceso doctors ilimitado", "Acceso patients ilimitado" y "Acceso storage ilimitado" (los tres por `max_*-1` / `storage_gb: -1`).
- Ademas aparecen las 9 features: "Citas", "SMS", "Laboratorio", "Historias clínicas", "Reportes avanzados", "Analítica", "Acceso API", "Marca blanca" y "Dominio personalizado".
- `data[3].trial_days === 0`: es el unico plan sin trial. Verificar si la tarjeta lo anuncia; si no lo hace, anotarlo.
- Los 3 textos "ilimitado" van en ingles dentro de la UI en espanol, por el mismo defecto que SAS-005.

**Red:** `GET /api/saas/plans` → 200. Verificar `data[3].max_doctors === -1`, `data[3].max_patients === -1`, `data[3].storage_gb === 100`, `data[3].price_yearly === 1990`, `data[3].trial_days === 0`.
**Limpieza:** ninguna.

### [SAS-007] Verificar que el precio anual es exactamente 10x el mensual

**Rol** `anonimo` · **Ruta** `/api/saas/plans` · **P1** · **Resultado** `______`
**Precondicion:** contexto limpio, sin sesion.
**Datos:** los 4 elementos de `data` del catalogo

1. Leer `price_monthly` y `price_yearly` de los 4 planes.
2. Calcular `price_yearly / price_monthly` para los 3 planes de pago.
3. Verificar si la UI o el checkout ofrecen alguna opcion de pago anual.
4. Comprobar si `price_yearly` aparece en algun campo visible de `/planes` o de `/suscripcion`.

**Esperado**
- `basic`: 290 = 10 x 29 · `pro`: 790 = 10 x 79 · `enterprise`: 1990 = 10 x 199. Los tres cumplen exactamente.
- `free`: `price_monthly: 0` y `price_yearly: 0`. La division da `NaN`/`Infinity`: **no es un fallo**, es el comportamiento de un plan gratuito. Registrar el par tal cual.
- `price_yearly` **no se muestra en ninguna pantalla**: la UI solo imprime `price_monthly` (`PlanCard.tsx:62`). Hay una columna en la DB que la aplicacion no consume: anotarlo como hueco de producto, no como bug.
- `POST /api/saas/checkout` **no acepta** `billing_cycle` ni `period`: el cuerpo valido es solo `{plan_code, success_url, cancel_url}`. El checkout es siempre mensual. Confirmar en red.

**Red:** `GET /api/saas/plans` → 200 con los 4 pares de precios. Un `POST /api/saas/checkout` con `{"plan_code":"pro","billing_cycle":"yearly",...}` → **400** de Zod, lo que confirma que no hay ciclo anual.
**Limpieza:** ninguna.

### [SAS-008] El landing y `/planes` muestran el mismo precio y el mismo redondeo

**Rol** `anonimo` · **Ruta** `/` y `/planes` · **P1** · **Resultado** `______`
**Precondicion:** contexto limpio, `es-CL`, sin sesion. El landing embebe las coordenadas de`origin` al que se_envian los formularios; `buildCheckoutUrls` exige que `success_url` y `cancel_url` pertenezcan a `MARKETING_ORIGIN` (`saas.service.ts:106-129`).
**Datos:** —

1. Abrir `/` y anotar el precio de `basic` que aparece en el bloque de planes.
2. Anotar el `href` exacto del boton de compra de `basic` en el landing.
3. Abrir `/planes` y anotar el precio de `basic` y el mismo boton.
4. Comparar los dos precios caracter por caracter.
5. Copiar el `href` del boton y pegarlo en una pestana nueva.
6. Repetir la comparacion con el tenant de QA en `enterprise` ya autenticado.

**Esperado**
- El precio de `basic` es **identico** en `/` y en `/planes`, con el mismo simbolo, el mismo separador de miles y el mismo "/mes". La UI no debe duplicar la logica de formateo: `formatPricingAmount` se aplica en los dos lados.
- Con `price_monthly: 199` el formato es `199`, sin decimales. `formatPricingAmount` no imprime decimales cuando el importe es entero, y no debe imprimirlos en ningun plan de este catalogo.
- El `href` del boton del landing y el de `/planes` apuntan al mismo destino: `/checkout?plan=basic` con la misma query. Si el landing apunta a un origen distinto (p. ej. un dominio corto), registrar el valor exacto: es la causa habitual de "el precio cambia segun por donde entro".
- El `href` es navegable en una pestana nueva sin abrir sesion ni perder la sesion: la sesion vive en cookie `httpOnly`, no en `sessionStorage`, asi que el deep link debe funcionar con sesion activa.

**Red:** `GET /api/saas/plans` una vez por pagina. Registrar el texto del boton y el `href` completo. Sin peticiones de escritura.
**Limpieza:** ninguna.

### [SAS-009] Resolver la moneda por pais y el fallback a USD

**Rol** `admin` · **Ruta** `/suscripcion` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` con `X-Tenant-Id` del tenant. Anotar el `country_code` y la `currency` actuales del tenant.
**Datos:** tres variantes: (a) `CL`, (b) `AR`, (c) `country_code` vacio o `XX`

1. Consultar `GET /api/saas/plans` y anotar el `currency` de cada plan.
2. Con el tenant en (a), abrir `/suscripcion` y anotar el simbolo del precio.
3. Cambiar el tenant a (b) con `PATCH /api/saas/tenant {"country_code":"AR"}` y recargar `/suscripcion`.
4. Cambiar el tenant a (c) y recargar `/suscripcion`.
5. Repetir los pasos 2-4 en `/planes`.
6. En los pasos 3 y 4, observar si el importe cambia o no.

**Esperado**
- `GET /api/saas/plans` devuelve `currency: "USD"` en los 4 planes: `init.sql:68-71` los guarda en dolares y el endpoint **no convierte**.
- La conversion ocurre en el cliente: `useConvertedPrice` lee el pais del tenant y aplica la tasa. Con el tenant en `AR` la UI muestra el precio con el simbolo de pesos y **el importe convertido**, que **no** es 29.
- Con `country_code` vacio o no reconocido, `getCurrencyForCountry` cae al default y la UI muestra **USD**. Este es el fallback correcto.
- `PATCH /api/saas/tenant {"country_code":"XX"}` → **200** con `{"message":"Configuration updated"}` si el tenant tiene suscripcion activa. `country_code` **no tiene enum en el Zod**: cualquier cadena se acepta, incluida una invalida.
- El cambio de moneda **no** afecta a `GET /api/saas/plans`: el catalogo sigue en USD para todos los tenants. Anotar que la UI y la API **no comparten** la misma unidad, por lo que el precio visible nunca es el precio almacenado.
- Si el tenant de `default` no tiene `country_code`, el paso 3 devuelve 400 `SAAS_SUBSCRIPTION_NOT_FOUND` en vez de 200: registrar el codigo real.

**Red:** `GET /api/saas/plans` → 200 con `currency: "USD"` en los 4 elementos, **antes y despues** de cambiar el pais. `PATCH /api/saas/tenant` → 200 con `message: "Configuration updated"`.
**Limpieza:** `PATCH /api/saas/tenant` con el `country_code` y la `currency` anotados en el paso 1.

### [SAS-010] Crear una preferencia de pago en Mercado Pago

**Rol** `admin` · **Ruta** `/suscripcion` → `/checkout` · **P0** · **Resultado** `______`
**Precondicion:** `ALLOW_DESTRUCTIVE=true` (crea una preferencia y, si el webhook llegara, una suscripcion) · `MERCADOPAGO_ACCESS_TOKEN` configurado (D-5) · `MARKETING_ORIGIN` configurado (D-6) · sesion de `admin@demo.clinic.com` · el tenant **no** esta ya en el plan destino.
**Datos:** `plan_code` = `pro` · `success_url` = `https://<MARKETING_ORIGIN>/checkout/success` · `cancel_url` = `https://<MARKETING_ORIGIN>/checkout/cancel`

1. En `/suscripcion`, pulsar el boton de cambiar plan a Pro y comprobar a donde navega.
2. En la pantalla de checkout, leer el titulo y el resumen del plan.
3. Pulsar "Pagar con Mercado Pago" (`saas.payWithMp`).
4. Leer el status y el cuerpo de la respuesta del backend.
5. Anotar el mensaje de carga que aparece mientras tanto.
6. Sin completar el pago en Mercado Pago, abrir a mano `$BASE_URL/checkout/cancel` y leer el titulo y el cuerpo.
7. Pulsar el enlace de regreso de la pagina de cancelacion y comprobar a donde lleva.
8. Volver a `/suscripcion` y confirmar que el plan sigue siendo el mismo.

**Esperado**
- `POST /api/saas/checkout` → **200** con `{data: {checkoutUrl, subscriptionId, status}}`.
- `checkoutUrl` es una URL de Mercado Pago (`https://www.mercadopago.com.../checkout/v1/redirect?pref_id=...`) y la UI navega a ella. **No** completar el pago: es una preferencia, no un cobro.
- `status` viene del plan: `"trialing"` si el tenant nunca ha tenido suscripcion y el plan trae `trial_days > 0` (Pro: 14), `"active"` si ya habia una. Registrar el valor real.
- La pantalla muestra el titulo "Completa tu pago" (`saas.checkoutTitle`), la etiqueta "Resumen del plan" (`saas.summaryLabel`) y el boton "Pagar con Mercado Pago" (`saas.payWithMp`).
- Mientras se genera la preferencia, la pantalla muestra "Creando pago seguro…" (`saas.creatingCheckout`, con elipsis Unicode).
- Si `mp_preference_id` falta en la suscripcion, la respuesta es **400** con `error: "SAAS_CHECKOUT_NOT_CONFIGURED"` y la UI debe mostrar el mensaje de error del checkout (`saas.checkoutError`: `[verificar literal en es.json]`). Registrar cual de las dos ramas se dio.
- `success_url` y `cancel_url` fuera de `MARKETING_ORIGIN` → **400** de validacion propia antes de llamar a la API de Mercado Pago.
- `/checkout/cancel` se renderiza con el titulo "Pago cancelado" (`saas.canceledTitle`) y el cuerpo "No se realizó ningún cargo. Puedes reintentar cuando quieras." (`saas.canceledBody`). Es el unico sitio donde la app confirma al usuario que **no** se le cobro nada.
- El regreso de `/checkout/cancel` lleva a `/suscripcion` o a `/planes` (`saas.backToPlans` = "Ver planes"). Anotar el destino real.
- Al volver a `/suscripcion` el plan **sigue siendo el anterior**: cancelar el pago no altera la suscripcion ni crea cobro. `GET /api/saas/subscription` → 200 con el mismo `plan.code`.

**Red:** `POST /api/saas/checkout` → 200. Anotar `data.checkoutUrl` y `data.status`. `GET /api/saas/subscription` → 200 tras la cancelacion, con el `plan.code` original. La navegacion a Mercado Pago debe ser una peticion del navegador, no un 302 de la API: la respuesta del backend es **200 con JSON**, no un redirect.
**Limpieza:** la preferencia queda registrada en Mercado Pago. Anotar el `pref_id` para cancelarla desde el panel de Mercado Pago. La suscripcion **no** cambia hasta que el webhook llegue; si el webhook de Mercado Pago no esta exposing en el despliegue, verificar en area `28` si `/api/saas/webhook/mercadopago` es un stub y anotar que el checkout **no puede completarse end-to-end**. No es un H-NN: el area `28` no tiene hallazgos asignados.

### [SAS-011] El checkout exige sesion y devuelve al login sin perder el plan elegido

**Rol** `anonimo` · **Ruta** `/checkout?plan=pro` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** contexto de navegador limpio, sin cookie de sesion. `CheckoutPage` esta en `PROTECTED_ROUTES` con `['admin','superadmin']` (`AppRouter.tsx`).
**Datos:** URL de entrada `$BASE_URL/checkout?plan=pro`

1. Abrir la URL de entrada en una pestana limpia.
2. Anotar la URL final y el contenido de la pagina.
3. Iniciar sesion como `admin@demo.clinic.com` desde la pantalla de login.
4. Anotar a donde redirige el login.
5. Recargar manualmente `/checkout?plan=pro` con la sesion ya iniciada.

**Esperado**
- Sin sesion, la app redirige a `/login`. **No** se renderiza el checkout: el 401 de `/api/saas/subscription` no debeENSEñarse como pantalla de error.
- La URL de la query `?plan=pro` **se pierde** en la redireccion a `/login`. Tras el login, el usuario aterriza en su home, no en el checkout: es un fallo de UX real. Confirmar si `ProtectedRoute` preserva la query; si no, **registrar el hallazgo con la URL antes y despues del login**.
- Con sesion, `/checkout?plan=pro` renderiza el checkout de Pro: el `plan` de la query se lee y se contrasta con la suscripcion actual. Si el plan de la query es el mismo que el actual, la UI debe avisar o desactivar el pago, no generar una preferencia identica.
- Un `admin` que entra a `/checkout` sin `X-Tenant-Id` recibe **401** `TENANT_CONTEXT_REQUIRED` y la app debehandling del caso sin pantalla en blanco.

**Red:** sin sesion: navegacion a `/login` + `GET /api/saas/subscription` → **401** con `error: "TENANT_CONTEXT_REQUIRED"` (o `AUTH_REQUIRED` si la cookie no esta). Con sesion: `GET /api/saas/subscription` → 200. Registrar la URL final exacta de ambos recorridos.
**Limpieza:** cerrar sesion.

### [SAS-012] Subir de Free a Pro con prorrateo y pago diferido

**Rol** `admin` · **Ruta** `/suscripcion` · **P0** · **Resultado** `______`
**Precondicion:** `ALLOW_DESTRUCTIVE=true` · sesion de `admin@demo.clinic.com` · tenant `default` en plan `free` · `MERCADOPAGO_ACCESS_TOKEN` y `mp_preference_id` configurados.
**Datos:** `plan_code` = `pro` · `proration_behavior` = `create_prorations`

1. En `/suscripcion`, comprobar el plan actual y anotar su estado.
2. Lanzar el cambio a Pro desde la UI.
3. Leer el status y el cuerpo de la respuesta de `POST /api/saas/change-plan`.
4. Recargar `/suscripcion` y leer el plan y el estado mostrados.
5. Consultar `GET /api/saas/subscription` y comparar.

**Esperado**
- `POST /api/saas/change-plan` → **200** con `data: {subscription, paymentRequired: true, message: "Payment required to upgrade", checkoutUrl}`.
- `paymentRequired: true` y `checkoutUrl` con el prefijo de Mercado Pago: **el upgrade no es inmediato**. La UI debe llevar al checkout, y el plan **sigue siendo `free`** hasta que el pago se confirme.
- `proration_behavior: "create_prorations"` es obligatorio para un upgrade: el schema lo marca como requerido en esa rama (`saas.schema.ts:73-83`). Sin el, el mismo endpoint devuelve 400 para un upgrade, pero lo acepta en un downgrade. Registrar la diferencia.
- Con la sesion recargada, `/suscripcion` muestra el plan `free` y el estado "Activo" (`saas.statusActive`), **no** Pro.
- El mensaje "El plan actual no permite esta operacion" (`saas.errorCurrentPlan`) solo aparece si se intenta un upgrade desde `free`; es el texto esperado de la UI si el backend rechaza el cambio.

**Red:** `POST /api/saas/change-plan` → 200 con `data.paymentRequired === true` y `data.checkoutUrl`. `GET /api/saas/subscription` → 200 con `plan.code: "free"` inmediatamente despues.
**Limpieza:** `POST /api/saas/change-plan {"plan_code":"free","proration_behavior":"create_prorations"}` para volver al plan original, o `POST /api/saas/cancel`. Anotar el estado de partida.

### [SAS-013] Bajar de Pro a Free con prorrateo y aviso de perdida de funciones

**Rol** `admin` · **Ruta** `/suscripcion` · **P1** · **Resultado** `______`
**Precondicion:** `ALLOW_DESTRUCTIVE=true` · tenant de QA en plan `pro` (D-3) · sus subscription con `mp_preference_id`.
**Datos:** `plan_code` = `free` · `proration_behavior` = `create_prorations`

1. Poner el tenant de QA en `pro` (via checkout de SAS-010 o directamente en la DB de QA) y anotar el estado.
2. Confirmar con `GET /api/saas/limits` que `laboratory: true` antes de bajar.
3. Bajar a `free` desde la UI y leer la respuesta.
4. Volver a consultar `GET /api/saas/limits` y `GET /api/saas/features`.
5. Intentar usar una feature de `pro` que ya no esta contratada.

**Esperado**
- `POST /api/saas/change-plan` → **200** con `data: {subscription, paymentRequired: false, message: "Subscription updated"}`.
- `paymentRequired: false`: un **downgrade no genera cobro ni checkout**. El plan baja de inmediato, sin pasar por Mercado Pago.
- `GET /api/saas/limits` → 200 con `features.laboratory === false` y `features.analytics === false` (los que `free` no tiene).
- `GET /api/saas/features` → 200 y la matriz ya no incluye los roles de `laboratory` para este plan.
- **El paso 5 es el defecto H-63**: la UI y la API **dejan pasar** el uso de `laboratory` sin plan. `enforceFeature` esta en modo `soft`. Registrar el status real (201, no 403) como fallo del area.
- La UI **deberia** haber avisado de la perdida de funciones antes de confirmar; si no hay aviso, registrar la ausencia. `saas` no tiene un literal de confirmacion de downgrade: verificar si el dialogo usa texto generico.

**Red:** `POST /api/saas/change-plan` → 200 con `data.paymentRequired === false`. `GET /api/saas/limits` → 200 con `features.laboratory === false`. Registrar el status del endpoint de laboratory usado en el paso 5.
**Limpieza:** `POST /api/saas/change-plan {"plan_code":"pro","proration_behavior":"create_prorations"}` para restaurar, o borrar el tenant de QA con `{"confirm":true}`.

### [SAS-014] Volver al plan actual sin cobrar ni duplicar la suscripcion

**Rol** `admin` · **Ruta** `/suscripcion` · **P2** · **Resultado** `______`
**Precondicion:** `ALLOW_DESTRUCTIVE=true` · tenant de QA en plan `enterprise`.
**Datos:** `plan_code` = `enterprise` · `proration_behavior` = `create_prorations`

1. Confirmar con `GET /api/saas/subscription` el plan actual (`enterprise`).
2. Enviar `POST /api/saas/change-plan` con el **mismo** `plan_code`.
3. Leer el status, el mensaje y el `data` de la respuesta.
4. Consultar de nuevo `GET /api/saas/subscription` y `GET /api/saas/usage/summary`.
5. Contar las filas de `subscriptions` del tenant en la DB de QA.

**Esperado**
- `POST /api/saas/change-plan` → **200** con `data: {subscription, paymentRequired: false, message: "Subscription already on this plan"}`.
- **No** se genera `checkoutUrl` y **no** hay cobro. El mensaje literal distingue el no-op del cambio real: registrar el texto exacto que devuelve el backend.
- `GET /api/saas/subscription` → 200 con el mismo `plan.code` y el mismo `status`.
- `GET /api/saas/usage/summary` devuelve las mismas cifras que antes del intento: el no-op **no** reinicia el periodo ni altera los contadores.
- El conteo de filas de `subscriptions` no cambia. Registrar el numero antes y despues: si `change-plan` hiciera un `INSERT` en vez de un `UPDATE`, el no-op duplicaria la suscripcion y habria que reportarlo.

**Red:** `POST /api/saas/change-plan` → 200 con `message: "Subscription already on this plan"`. `GET /api/saas/subscription` → 200, `plan.code` sin cambios. `GET /api/saas/usage/summary` → 200 con contadores identicos.
**Limpieza:** ninguna (no-op). Si el tenant de QA es disposable, borrar con `{"confirm":true}`.

### [SAS-015] Cancelar la suscripcion y verificar el efecto en los limites

**Rol** `admin` · **Ruta** `/suscripcion` · **P0** · **Resultado** `______`
⚠️ **DESTRUCTIVO.** La cancelacion es **irreversible desde la UI**: no hay "reactivar" ni "reactivar suscripcion" en `/suscripcion`. Volver a un plan de pago exige un checkout nuevo completo.

**Precondicion:** `ALLOW_DESTRUCTIVE=true` · tenant de QA en plan `pro` o `enterprise` (D-3) · `mp_preference_id` presente.
**Datos:** —

1. En `/suscripcion`, anotar plan, estado y fecha de renovacion mostrada.
2. Pulsar el boton de cancelar y leer el dialogo de confirmacion.
3. Confirmar la cancelacion.
4. Recargar `/suscripcion` y leer plan, estado y fecha.
5. Consultar `GET /api/saas/subscription`, `GET /api/saas/limits` y `GET /api/saas/features`.
6. Intentar usar una feature que el plan ya no tiene.

**Esperado**
- `POST /api/saas/cancel` → **200** con `{"message":"Subscription canceled"}` y un `data` de suscripcion. **No** genera `checkoutUrl` ni cobro.
- La suscripcion queda en `status: "canceled"`, **con acceso hasta `current_period_end`**: la UI debe mostrar la fecha de vigencia, no un bloqueo inmediato. Es el comportamiento correcto de un downgrade diferido; verificar la fecha concreta.
- `GET /api/saas/subscription` → 200 con `status: "canceled"`. **No** devuelve 404: la suscripcion sigue existiendo.
- `GET /api/saas/limits` → 200. `GET /api/saas/features` → 200 con la matriz del plan que se.cancelo (o vacia, si la UI oculta features al cancelar). Registrar el valor real.
- El paso 6 depende de H-63: si la suscripcion esta `canceled` pero el periodo no ha vencido, `enforceFeature` **permite** el uso. Registrar el status real.
- La UI muestra el estado "Cancelado" (`saas.statusCanceled`). Verificar si tambien aparece "Próximo vencimiento" (`saas.periodEndLabel`) con la fecha.
- Si `POST /api/saas/cancel` se repite, la respuesta debe ser idempotente (200, mismo mensaje) o 400; registrar el status real de la segunda llamada.

**Red:** `POST /api/saas/cancel` → 200 con `message: "Subscription canceled"`. `GET /api/saas/subscription` → 200 con `status: "canceled"`. `GET /api/saas/limits` → 200.
**Limpieza:** **no hay limpieza**: restaurar el plan con `POST /api/saas/change-plan {"plan_code":"pro","proration_behavior":"create_prorations"}` (crea un cobro si el checkout esta disponible) o borrar el tenant de QA con `{"confirm":true}`.

### [SAS-016] Consultar `usage`, `usage/summary` y `limits` con datos reales

**Rol** `admin` · **Ruta** `/suscripcion` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` · el tenant tiene historico de uso en el mes en curso (citas, pacientes, expedientes, laboratory).
**Datos:** `year` = ano en curso · `month` = mes en curso (1..12)

1. Abrir `/suscripcion` y leer el panel de uso.
2. Consultar `GET /api/saas/usage` con el ano y mes en curso.
3. Consultar `GET /api/saas/usage/summary` con los mismos parametros.
4. Consultar `GET /api/saas/limits`.
5. Repetir los tres endpoints con `year` de un ano pasado.
6. Repetir con `month=0` y con `month=13`.
7. Repetir `GET /api/saas/usage` sin parametros.

**Esperado**
- `GET /api/saas/usage?year=<actual>&month=<actual>` → **200** con el desglose de uso de los 4 contadores: citas, pacientes, expedientes y resultados de laboratorio. Registrar las claves exactas de `data`.
- `GET /api/saas/usage/summary` → **200** con los mismos contadores **agregados en menos campos**. `usage` da el detalle y `summary` el resumen: verificar que los dos son coherentes (mismo total, distinta forma).
- `GET /api/saas/limits` → **200** con `data.plan` (los limites numericos del plan), `data.usage` (lo consumido), `data.enforcement_mode` y `data.features`. **`enforcement_mode: "soft"`** debe aparecer: es la prueba documental del H-63.
- Con un ano pasado, `usage` y `usage/summary` devuelven **200 con contadores en 0**, no 404: el endpoint no falla por periodo sin datos. Anotar si devuelve `[]` o un objeto con ceros.
- `month=0` y `month=13` devuelven **400** de Zod (`month` entre 1 y 12).
- Sin parametros, el endpoint usa el periodo actual: **200** con los mismos datos que el paso 2. Si devuelve 400 por `year` y `month` obligatorios, registrar el status real y actualizar esta linea.

**Red:** los tres endpoints → 200. Registrar `data.enforcement_mode` de `limits` y las claves de `usage` y `usage/summary` para compararlas.
**Limpieza:** ninguna (solo lectura).

### [SAS-017] Leer la matriz feature → roles y validar el gating de laboratorio

**Rol** `admin` · **Ruta** `/suscripcion` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@demo.clinic.com` (plan `free`) y de `admin` del tenant de QA en `enterprise` (D-3). El middleware se llama `requireFeature` y se aplica en `laboratory.routes.ts:30`.
**Datos:** feature `laboratory` · roles `admin` y `doctor`

1. Con el tenant de QA en `enterprise`, consultar `GET /api/saas/features` y anotar la entrada de `laboratory`.
2. Con el tenant `default` en `free`, consultar el mismo endpoint y comparar.
3. Con el tenant `default` en `free`, llamar a un endpoint de laboratorio (p. ej. listar tipos de analisis) con sesion de `admin`.
4. Con el mismo tenant y sesion, llamar a un endpoint de `analytics` que no tenga middleware de feature.
5. Registrar el status de las dos llamadas.

**Esperado**
- `GET /api/saas/features` → **200** con la matriz: cada feature tiene sus roles permitidos. En `enterprise`, `laboratory` esta habilitada para `admin` y `doctor`; en `free`, la misma feature **no aparece** o aparece con la lista de roles vacia. Registrar la forma exacta (`laboratory: ["admin","doctor"]` vs `laboratory: {roles: [...]}`).
- En `free` + `laboratory`: `enforceFeature` esta en modo `soft`, asi que la llamada **pasa** (no 403). `data.enforcement_mode: "soft"` de SAS-016 lo confirma.
- En `free` + `analytics`: **tambien pasa**, y esta vez por un motivo mas grave: **`analytics` no tiene ningun middleware `requireFeature`**. No hay ningun sitio en el backend que la enganche. Es el hallazgo H-63 en su forma mas grave: una feature de pago accesible sin contrato.
- `requireFeature` solo esta en `laboratory.routes.ts:30`. Ningun otro router lo usa. Contar las ocurrencias en el backend: **debe ser 1**.
- La UI **no** debe mostrar un boton de laboratorio sin plan. Si el menu lateral lo muestra en `free`, es un fallo de consistencia entre la matriz de `features` y el render del menu: registrar el texto del item de menu.

**Red:** `GET /api/saas/features` → 200 en los dos tenants. Los endpoints de laboratorio y de analytics en `free` → **no** 403. Registrar los status reales y el `error` si lo hubiera.
**Limpieza:** restaurar el plan del tenant de QA o borrarlo con `{"confirm":true}`.

### [SAS-018] El cobro automatico de suscripciones vencidas no se ejecuta nunca

**Rol** `superadmin` · **Ruta** `/tenants` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `superadmin@clinic.com` · existe al menos una suscripcion con `status: "past_due"` en el entorno, o se puede crear una en la DB de QA para el caso. `handlePastDueSubscriptions` **esta definida** (`saas.service.ts`) pero **no tiene ningun call site**: no hay cron, ni `setInterval`, ni entrada en un worker de cola. No hay ningun `app.ts` que la registre.
**Datos:** una suscripcion en `past_due` con `mp_preference_id` asignado

1. Anotar el estado actual de todas las suscripciones del tenant.
2. Poner una suscripcion de QA en `status: "past_due"` en la DB y anotar la hora exacta.
3. Esperar y observar durante al menos 15 minutos: la UI no refresca sola, recargar a mano cada 2 minutos.
4. Buscar en `/tenants/<id>` alguna accion manual de reintento de cobro.
5. Consultar de nuevo el estado de la suscripcion y la DB.

**Esperado**
- La suscripcion **sigue en `past_due`** con el mismo `status`: no se reintenta el cobro, no se degrada el plan y no se notifica. `handlePastDueSubscriptions` nunca se invoca.
- Un `past_due` **no bloquea nada** en la aplicacion: `enforceFeature` en modo `soft` deja pasar el uso de las features del plan. El tenant sigue operando normalmente con el cobro fallido. Es el efecto practico del hallazgo.
- No existe ninguna accion manual de reintento en la UI de superadmin. La UI **deberia** mostrar `past_due` como estado distinguible (`saas.statusPastDue` = "Pago pendiente"), pero la lista de tenants de superadmin no tiene columna de estado de suscripcion. Registrar la ausencia.
- No hay logs de cobro. Unico log posible del area: los de `saas` cuando se ejecuta el checkout.
- Consecuencia: un cliente cuyo cobro falla **nunca pasa a `canceled` ni a `suspended`**. La deuda se acumula indefinidamente. Registrar esto como el impacto de negocio del hallazgo.
- Si en el despliegue hay un cron externo o un proceso aparte que no esta en este repo, el caso pasa a `BLOQUEADO` con el motivo, no a `FALLÓ`.

**Red:** ninguna peticion expone el cobro. Registrar la ausencia de reintentos y la hora exacta de la primera y la ultima observacion.
**Limpieza:** restaurar la suscripcion de QA al estado previo en la DB. Anotar el `status` de partida.

---

## 5. Defectos conocidos a verificar primero

Solo se reaprovechan los identificadores H-NN cuya descripcion de `90-HALLAZGOS-CODIGO.md` coincide con el defecto real de este area. Los defectos de checkout sin H-NN se listan en la seccion 6.

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-63 | SAS-013, SAS-017 | `enforceFeature` en modo `soft`: no bloquea ni con plan `free` ni con `canceled` ni con `past_due`. De las 9 feature keys del seed, `laboratory` es la unica con middleware: `laboratory.routes.ts:30` es el unico `router.use(requireFeature(...))` del backend |
| H-24 | SAS-008 | Landing (`/`) y `/planes` deben mostrar **precio y redondeo identicos** del mismo plan. Si divergen, la UI duplica la logica de formato en dos sitios |
| H-51 | SAS-009 | `currency` y `country_code` no pueden enviarse en el alta (`onboardSchema` es `.strict()`), asi que un tenant nuevo **siempre** nace en `CLP` sin pais. La moneda solo se corrige despues con `PATCH /api/saas/tenant` |

> **No aplican a este area** (verificar en la que les corresponde): H-52 (el rate limit de onboarding en memoria vive en `saas.routes.ts`, area `14`), H-50 (codigo muerto de captcha en `OnboardingContractPage`, area `14`), H-62 (el alias inline `user`/`patient` no aparece en `saas.service.ts`: no hay ningun `WHERE role = 'user'` ahi), H-60 (higiene del historial medico), y el resto de H-01…H-61. No duplicar sus casos aqui ni reasignar su H-NN a un defecto distinto.

---

## 6. Huecos conocidos

| Hueco | Por que no se cubre con un caso | Impacto |
|---|---|---|
| **No hay ciclo de pago anual** | `changePlanSchema` y `checkoutSchema` no aceptan `billing_cycle`; `price_yearly` existe en la DB y ninguna pantalla lo lee | El descuento anual esta modelado pero no se puede comprar. Clientes que quieran pagar 10 meses reciben el mismo cargo mensual |
| `handlePastDueSubscriptions` sin call site | No hay cron ni worker que la invoque | Un cobro fallido no se reintenta nunca, el plan no se degrada y no hay suspension. El cliente puede usar el producto indefinidamente sin pagar |
| No hay "reactivar suscripcion" | No existe en `/suscripcion` ni en la API | Cancelar es irreversible desde el producto; recuperar al cliente exige un checkout nuevo |
| No hay endpoint de facturas | `GET /api/saas/invoices` **no existe**, pese a que la tabla `subscription_invoices` se puebla en el alta | El cliente no puede consultar su historial de facturacion. Confirmar que `GET /api/saas/usage/summary` no lo suple |
| No hay prorrateo visible | `proration_behavior` se acepta pero su valor no se muestra | El cliente no sabe cuanto se le descuenta al cambiar de plan a mitad de ciclo |
| `GET /api/saas/subscription` devuelve 404 sin suscripcion | Comportamiento esperado del endpoint | La UI de `/suscripcion` debe tener un estado "sin suscripcion" (`saas.noSubscription`); verificar que existe y que ofrece un CTA |
| `country_code` sin enum en `PATCH /api/saas/tenant` | El schema es `.passthrough()`-like en esos campos | Cualquier pais invalido se guarda y `getCurrencyForCountry` cae silenciosamente a USD |
| Sin descarga de factura ni recibo | No hay endpoint | El area de facturacion es un hueco de producto completo |
| `trial_days` no se expone en el JSON publico de planes | `getPublicPlans` no lo serializa | La UI no puede decir "14 dias gratis"; el cliente no sabe cuando empieza a cobrar |
| El webhook de Mercado Pago puede ser un stub | `/api/saas/webhook/mercadopago` esta en el area `28` | Si lo es, **ningun checkout de este area se completa end-to-end**: la preferencia se crea pero la suscripcion nunca cambia de plan. Todos los casos de upgrade quedan incompletos sin el area 28 |

---

## 7. Resultado del area

Ejecutar los 18 casos en el orden indicado. El orden importa: SAS-001 a SAS-009 son de solo
lectura y pueden ir en paralelo; SAS-010 a SAS-018 mutan la suscripcion y deben ir en serie sobre un
tenant de QA.

| Resultado | Casos | Cantidad |
|---|---|---:|
| `PASÓ` | — | 0 |
| `FALLÓ` | — | 0 |
| `BLOQUEADO` | — | 0 |
| `N/A` | — | 0 |
| `OMITIDO` | — | 0 |
| **Total** | SAS-001 … SAS-018 | **18** |

Al cerrar el area, responder ademas:

| Pregunta | Respuesta |
|---|---|
| ¿Coinciden el precio y el redondeo entre `/` y `/planes`? | |
| ¿Que moneda se muestra con el tenant en `CL`, en `AR` y sin pais? | |
| ¿Un upgrade deja el plan activo de inmediato o queda pendiente de pago? | |
| ¿`GET /api/saas/limits` devuelve `enforcement_mode: "soft"`? | |
| ¿Un tenant en `free` puede usar endpoints de `laboratory` y de `analytics`? | |
| ¿Una suscripcion en `past_due` se reintenta alguna vez? | |
| ¿Existe alguna via de pago anual? | |

---

*Alcance: catalogo publico de planes, comparativa en landing y `/planes`, resolucion de moneda,
checkout con Mercado Pago, `change-plan`, `cancel`, `usage`, `usage/summary`, `limits` y `features`.
18 casos, capa C3, frecuencia quincenal, dependencia `14`. Prefijo `SAS`.
Revisión: 2026-10-01.*
# 14 — Onboarding y contratacion

> Formulario publico de contratacion, documentos en base64, cola de solicitudes del superadmin y el camino de **rechazo** (siempre probado) frente al de **aprobacion** (destructivo: crea un tenant que la UI no puede deshacer, H-07).

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `14` | `ONB` | C3 | Quincenal | 16 | `11` | `15` |

---

## 1. Que cubre

El circuito de alta de una clinica nueva: `/contratar` (stepper publico de 4 pasos), `POST /api/saas/onboard`, los documentos adjuntos, el perfil de incorporacion de una clinica ya autenticada (`/settings/onboarding`) y la bandeja `/onboarding-applications` del superadmin con sus dos veredictos.

Endpoints reales del area (`src/modules/saas/saas.routes.ts`, montado en `src/app.ts:280`):

| Endpoint | Rol minimo | Notas |
|---|---|---|
| `POST /api/saas/onboard` | anonimo | `onboardLimiter` 3/hora en memoria, despues `validateZod(onboardSchema)`, despues captcha |
| `GET /api/saas/plans` | anonimo | Sin `authMiddleware`: es publico |
| `GET /api/saas/onboarding` | admin, superadmin | Perfil de la clinica autenticada |
| `PATCH /api/saas/onboarding` | admin, superadmin | `updateOnboardingProfileSchema` `.strict()` |
| `POST /api/saas/onboarding/documents` | admin, superadmin | Base64 en el cuerpo JSON |
| `GET /api/saas/onboarding/documents` | admin, superadmin | — |
| `GET /api/saas/onboarding/documents/:id/download` | admin, superadmin | — |
| `DELETE /api/saas/onboarding/documents/:id` | admin, superadmin | 204 |
| `GET /api/saas/onboarding/applications` | superadmin | Filtros `status`, `search`, `page`, `limit` |
| `GET /api/saas/onboarding/applications/:id` | superadmin | 404 `SAAS_ONBOARDING_NOT_FOUND` |
| `PATCH /api/saas/onboarding/applications/:id/approve` | superadmin | **Destructivo.** Ver ONB-016 |
| `PATCH /api/saas/onboarding/applications/:id/reject` | superadmin | Camino siempre probado |

> **Discrepancia con `02-CATALOGO-FUNCIONES.md` §6.** El catalogo lista
> `GET /api/saas/onboarding/profile` y `POST /api/saas/onboarding/documents` en la forma correcta, pero
> anota el endpoint de perfil como `/profile`. El codigo real es `/onboarding` (sin sufijo) y el de
> la cola es `/onboarding/applications`. **Prevalece el codigo** (`00-README.md` §14).

### 1.1 Ciclo de vida real de una solicitud

```
POST /api/saas/onboard
  -> INSERT tenants (active = true, currency CLP por defecto)
  -> INSERT users (role 'admin', bcrypt 12, password_changed = true)
  -> INSERT subscriptions (status 'active' o 'trialing') + subscription_invoices
  -> INSERT tenant_onboarding (status 'pending', completeness_pct, missing_fields)
  -> INSERT onboarding_documents (0..6) y escritura en disco bajo UPLOAD_ROOT/onboarding/<id>/
  -> 201 { tenantId, subscription, message }
```

> **Consecuencia critica para el plan de pruebas.** El tenant, el admin y la suscripcion se crean en
> el `POST`, **no** en la aprobacion. Rechazar una solicitud (ONB-015) cambia el `status` a
> `rejected` y escribe `rejection_reason`, pero **no** desactiva el tenant ni borra al admin
> (`onboarding.service.ts:600-614`): el admin puede iniciar sesion antes y despues del rechazo. Por
> eso **ONB-015** es el camino seguro para crear solicitudes de prueba y **ONB-004** tambien queda
> marcado como destructivo.

---

## 2. Roles y rutas

| Rol | Rutas que usa en esta area | Limite |
|---|---|---|
| `anonimo` | `/contratar`, `/gracias` | 3 `POST /onboard` por IP y hora (memoria del proceso) |
| `admin` | `/settings/onboarding` | Solo su `tenant_id` |
| `superadmin` | `/onboarding-applications` | Cola completa; unico rol en `approve` y `reject` |
| `doctor`, `lab_technician`, `patient`, `user` | — | Sin ruta de onboarding propia |

Rutas y roles exactos en `frontend/src/app/router/AppRouter.tsx`:

| Ruta | Componente | `allowedRoles` |
|---|---|---|
| `/contratar` | `OnboardingContractPage` | publica (`AppRouter.tsx:408`) |
| `/gracias` | `ThankYouPage` | publica (`AppRouter.tsx:409`) |
| `/onboarding-applications` | `SuperAdminOnboardingPage` | `['superadmin']` (`:205-209`) |
| `/settings/onboarding` | `ClinicOnboardingPage` | `['superadmin','admin']` (`:210-214`) |

---

## 3. Precondiciones de datos

| # | Precondicion | Como se cumple | Limpieza |
|---|---|---|---|
| D-1 | `SUPERADMIN_PASSWORD` y `ADMIN_PASSWORD` disponibles | Pedirlos antes de empezar (`00-README.md` §5) | — |
| D-2 | Cuota de `POST /api/saas/onboard` sin gastar | El limite es 3/hora **por IP y en memoria del proceso**: un redeploy o el cold start de Render lo reinicia (H-52) | Esperar 60 min o reiniciar el servicio con autorizacion |
| D-3 | Dominio/subdominio libre | Usar el patron `qa-onb-<aa>-<hhmm>`; el `domain` admite solo `[a-z0-9-]` y **es el `tenant_id`** | `DELETE /api/super-admin/tenants/:id` con `{confirm:true}` → soft delete |
| D-4 | Solicitud `pending` disponible para rechazar | Crear una con ONB-004 o con un `POST` de red usando un subdominio nuevo | El `DELETE` del tenant arrastra en cascada la solicitud |
| D-5 | `RECAPTCHA_SECRET_KEY` presente o ausente | Preguntar al operador. Si falta, **ONB-004 y ONB-005 cambian de veredicto** | — |
| D-6 | `RECAPTCHA_HUMAN=true` solo si el operador resuelve captchas | Sin el, ONB-005 es `BLOQUEADO`, nunca `FALLÓ` | — |
| D-7 | Archivo pequeno para documentos | Un PNG de ~20 KB -> ~27 KB en base64, dentro del `limit` global de 100 KB | — |
| D-8 | PDF de 2 MB para el caso de limite | Generar en local; se usa solo en ONB-010 | — |

> **`express.json({ limit: '100kb' })` es global** (`src/app.ts:182-183`). Todo el `POST /api/saas/onboard`
> y todo el `POST /api/saas/onboarding/documents` comparten ese techo: **el `MAX_FILE_BYTES = 10 MB`
> de `onboarding.service.ts:12` es inalcanzable por HTTP.** Ver ONB-010.

---

## 4. Casos

### [ONB-001] Renderizar `/contratar` en contexto limpio y sin sesion

**Rol** `anonimo` · **Ruta** `/contratar` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** contexto de navegador limpio, sin cookies ni `localStorage`, sin `X-Tenant-Id`.
**Datos:** viewport 1440 x 900 · idioma `es-CL` · `BASE_URL` sin barra final

1. Abrir `$BASE_URL/contratar` directamente por URL, sin pasar por `/`.
2. Contar los pasos del stepper.
3. Expandir los 4 pasos y leer el encabezado del primero.
4. Recorrer los 4 pasos con "Siguiente" sin rellenar nada, hasta el paso de revision.

**Esperado**
- El documento responde 200 y renderiza el formulario, no una pantalla de error ni `NotFoundPage`.
- El stepper muestra 4 pasos con estos literales: "Cuenta", "Datos de la clínica", "Documentos", "Revisión" (ns `onboarding`, claves `steps.account`, `steps.profile`, `steps.documents`, `steps.review`).
- El primer paso se titula "Datos de cuenta" (`onboarding.account.title`).
- El pie de pagina del formulario dice "Incorpora tu clínica" (`onboarding.pageSubtitle`) y el logotipo del formulario es "vitaria" (`onboarding.brandName`).
- El boton de avance es "Siguiente" (`onboarding.common.next`); el de retroceso es "Atrás" (`onboarding.common.back`).
- 0 errores en la consola.

**Red:** ninguna peticion de escritura. Inspeccionar que la pagina no emite `POST /api/saas/onboard` al avanzar de paso.
**Limpieza:** ninguna.

### [ONB-002] Bloquear el avance con un subdominio fuera del patron `[a-z0-9-]`

**Rol** `anonimo` · **Ruta** `/contratar` · **P1** · **Resultado** `______`
**Precondicion:** en `/contratar`, paso "Datos de cuenta" abierto.
**Datos:** `domain` = `QA Clinica` (mayusculas, espacio y arroba) · `tenant_name` = `QA-Onboarding`

1. Escribir `QA Clinica` en el campo "Subdominio" (`onboarding.account.domain`).
2. Leer el texto de ayuda bajo el campo.
3. Pulsar "Siguiente".

**Esperado**
- El texto de ayuda es "Mínúsculas, números y guiones. Ej.: mi-clinica" (`onboarding.account.domainHint`).
- El avance se bloquea y se muestra "El subdominio solo puede contener minúsculas, números y guiones" (`onboarding.account.invalidDomain`).
- No se emite ninguna peticion: el error es de cliente, no de servidor.
- Confirmado por red: el mismo payload con ese `domain` contra `POST /api/saas/onboard` devuelve **400** de Zod (`validateZod(onboardSchema)` se ejecuta antes del controlador). No usar este 400 como unico observable del caso.

**Red:** `POST /api/saas/onboard` solo si se fuerza el envio: → 400, cuerpo con `error` de validación. No debe aparecer 201.
**Limpieza:** ninguna.

### [ONB-003] Bloquear el avance con una contrasena que no cumple las 4 clases

**Rol** `anonimo` · **Ruta** `/contratar` · **P1** · **Resultado** `______`
**Precondicion:** en `/contratar`, paso "Datos de cuenta", campos de clinica rellenos.
**Datos:** `admin_password` = `qaonb2026` (sin mayuscula, sin simbolo) · `confirmPassword` identico

1. Escribir `qaonb2026` en "Contraseña" (`onboarding.account.adminPassword`).
2. Escribir lo mismo en "Confirmar contraseña" (`onboarding.account.confirmPassword`).
3. Pulsar "Siguiente".

**Esperado**
- El avance se bloquea con "La contraseña debe tener al menos 8 caracteres" (`onboarding.account.passwordMin`) o con el aviso de campos obligatorios "Completa todos los campos obligatorios" (`onboarding.account.requiredFields`). Registrar cual de los dos literales aparece: es un observable, no una conjetura.
- Al repetir el intento con `Qaonb2026!` el aviso de contrasena desaparece y el avance se permite.
- En red, un `POST /api/saas/onboard` con `admin_password: "qaonb2026"` devuelve **400** (Zod: `Must contain uppercase`, `Must contain a special character`).

**Red:** `POST /api/saas/onboard` con contrasena debil → 400. Verificar que el cuerpo de error menciona las reglas de uppercase/special character, no captcha ni dominio.
**Limpieza:** ninguna.

### [ONB-004] ⚠️ DESTRUCTIVO Crear tenant, admin y suscripcion al enviar la solicitud sin `captcha_token`

**Rol** `anonimo` · **Ruta** `/contratar` · **P1** · **Resultado** `______`
⚠️ **DESTRUCTIVO.** `POST /api/saas/onboard` inserta `tenants`, `users`, `subscriptions`, `subscription_invoices` y `tenant_onboarding` en una sola transaccion. **La UI no tiene ninguna accion para deshacerlo**: la unica via es `DELETE /api/super-admin/tenants/:id` con `{confirm:true}`, que es un **soft delete** (`super-admin.controller.ts:39` responde "Tenant soft-deleted. Data retained for compliance."). No ejecutar sin `ALLOW_DESTRUCTIVE=true`.

**Precondicion:** `ALLOW_DESTRUCTIVE=true` · `RECAPTCHA_SECRET_KEY` **ausente** en el entorno (H-29) · cuota de onboard disponible (max 3/hora) · subdominio libre.
**Datos:** `tenant_name` = `QA Onboarding <aa>` · `domain` = `qa-onb-<aa>-<hhmm>` · `admin_name` = `QA Onboarding` · `admin_email` = `qa-onb-<aa>@clinic.com` · `admin_password` = `QaOnb2026!` · `plan_code` = `free` · **sin** `captcha_token` · `legal_name` = `QA Onboarding SpA` · `tax_id` = `76.999.888-7` · `city` = `Santiago`

1. Completar los 4 pasos de `/contratar` con los datos anteriores y pulsar "Enviar solicitud" (`onboarding.common.submit`) en el paso "Revisión".
2. Esperar a que la UI se estabilice antes de leer la URL.
3. Anotar el `tenantId` de la respuesta de red.
4. Verificar en `/gracias` que se muestra la confirmacion.

**Esperado**
- `POST /api/saas/onboard` → **201** (no 400) **sin** `captcha_token`. Es el comportamiento real: `saas.controller.ts:158-160` hace `if (!secret) return true` y el captcha nunca se verifica. Defecto conocido H-29.
- El cuerpo trae `tenantId` = el `domain` enviado, `subscription` con `status: "active"` y `plan.code: "free"`, y `message`.
- El tenant nace **activo**: `POST /api/super-admin/tenants/<tenantId>/login` no aplica; lo comprobable es que `GET /api/saas/onboarding/applications?search=<tax_id>` (como superadmin) devuelve la solicitud con `status: "pending"`.
- `/gracias` muestra el titulo "¡Gracias por tu solicitud!" (`thanks.title`) y el subtitulo "Hemos recibido tus datos correctamente." (`thanks.subtitle`).
- `/gracias` **no** muestra el subdominio ni la contrasena en claro.
- 0 errores en consola.

**Red:** `POST /api/saas/onboard` → 201. Verificar `tenantId` y `subscription.status` en el cuerpo. Si `RECAPTCHA_SECRET_KEY` **si esta presente**, el esperado cambia a 400 `SAAS_CAPTCHA_FAILED`: anotar el hallazgo de entorno, no fallar el caso.
**Limpieza:** `DELETE /api/super-admin/tenants/qa-onb-<aa>-<hhmm>` con `{"confirm":true}` como superadmin → 200. Anotar que es soft delete: la fila queda en `tenants` con `deleted_at`, y no hay forma de borrarla desde la UI.

### [ONB-005] Rechazar la peticion cuando el secret si esta configurado y falta el token

**Rol** `anonimo` · **Ruta** `/contratar` · **P2** · **Resultado** `______`
**Precondicion:** `RECAPTCHA_SECRET_KEY` **presente** y distinta de la clave de prueba de Google `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`. Si no se cumple, el caso es `BLOQUEADO`.
**Datos:** payload mínimo válido de `onboardSchema` · **sin** `captcha_token` · `domain` = `qa-onb-cap-<hhmm>`

1. Enviar `POST /api/saas/onboard` con el payload y sin `captcha_token`.
2. Leer el codigo de error del cuerpo.
3. Repetir con `captcha_token: "invalid-token-qa"`.
4. Confirmar que en ninguna de las dos se creó el tenant.

**Esperado**
- Ambos intentos devuelven **400** con `error: "SAAS_CAPTCHA_FAILED"` y mensaje "CAPTCHA verification failed" (`error-codes.ts:413`).
- **No** se crea `tenants`, ni `users`, ni `subscriptions`: el captcha se verifica antes de `onboardTenant` (`saas.controller.ts:184`).
- Con la clave de prueba de Google el comportamiento se invierte y vuelve a 201 (H-29): si el entorno usa esa clave, anotar `FALLÓ (defecto conocido: H-29)` en lugar de esperar 400.

**Red:** `POST /api/saas/onboard` → 400, `error` = `SAAS_CAPTCHA_FAILED`. Sin `RECAPTCHA_SECRET_KEY` el resultado es `BLOQUEADO` con el motivo, nunca `FALLÓ`.
**Limpieza:** ninguna (nada se crea).

### [ONB-006] Rechazar `currency` y `country_code` por el `.strict()` del esquema

**Rol** `anonimo` · **Ruta** `/contratar` · **P1** · **Resultado** `______`
**Precondicion:** sin sesion, cuota de onboard sin gastar.
**Datos:** payload valido de ONB-004 **mas** `currency: "CLP"` y `country_code: "CL"`. `onboardSchema` (`saas.schema.ts:11-51`) es `.strict()` y **no declara ninguno de los dos campos**; `saas.controller.ts:196-197` los lee y los pasa al servicio.

1. Enviar el payload anterior tal cual.
2. Leer el status y el cuerpo de la respuesta.
3. Si devuelve 201, repetir **sin** `currency` ni `country_code` con un `domain` nuevo y comparar ambos tenants.

**Esperado**
- `POST /api/saas/onboard` → **400** de Zod por claves desconocidas. **Nunca 201**: el `.strict()` recorta antes de que el controlador vea el body. Defecto conocido H-51.
- Si en una variante del despliegue el 400 no ocurre, el tenant se crea **sin moneda ni pais**: el servicio cae a `getCurrencyForCountry('')` y `resolvedCurrency = 'CLP'` (`saas.service.ts`). Anotar `FALLÓ (defecto conocido: H-51)`.
- El mismo correo se puede fijar por la via que si funciona: `PATCH /api/saas/tenant` con `{"currency":"CLP","country_code":"CL"}` acepta ambos campos (`saas.controller.ts:303`).

**Red:** `POST /api/saas/onboard` → 400 con detalle de claves desconocidas; `PATCH /api/saas/tenant` → 200 con `{"message":"Configuration updated"}`.
**Limpieza:** si se creo el tenant, `DELETE /api/super-admin/tenants/<tenantId>` con `{"confirm":true}`.

### [ONB-007] Limitar a 3 envios por hora y por IP

**Rol** `anonimo` · **Ruta** `/contratar` · **P2** · **Resultado** `______`
**Precondicion:** la cuota de la IP lleva menos de 3 envios en la ventana de 60 min. El limite (`saas.routes.ts:18-23`) se aplica **antes** de `validateZod`, asi que consume cuota aunque el payload sea invalido: por eso este caso usa payloads invalidos y **no crea ningun tenant**.
**Datos:** 4 peticiones identicas a `/contratar` con `admin_email: "qa-onb-rate@clinic.com"` (email invalido a proposito)

1. Enviar el payload invalido 3 veces seguidas. Anotar el status de cada una.
2. Enviarlo una 4.a vez.
3. Leer el cuerpo de la 4.a respuesta.
4. Esperar 60 min y repetir un envio para comprobar que la cuota se libera.

**Esperado**
- Las 3 primeras devuelven **400** (Zod: `Invalid email format`) pero **consumen** la cuota: el `onboardLimiter` va antes del validador.
- La 4.a devuelve **429** con `{"error":"Too many onboard attempts, please try again later"}` y **no llega al validador** (el cuerpo no menciona el email).
- Tras 60 min el envio vuelve a dar 400, no 429.
- Defecto conocido H-52: el contador vive **en memoria del proceso**. Si entre los pasos se produce un redeploy de Render, la cuota se reinicia y el 4.o envio devuelve 400 en vez de 429: anotar la observacion y el momento del redeploy.

**Red:** `POST /api/saas/onboard` x4 → 400, 400, 400, **429**. Verificar `error` literal en el 429.
**Limpieza:** ninguna (ningun tenant creado). Si se gasto cuota real, esperar la ventana de 60 min.

### [ONB-008] Aceptar un documento con `data_base64` invalido

**Rol** `admin` · **Ruta** `/settings/onboarding` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@clinic.com` en el tenant `default`, con fila en `tenant_onboarding`. `Buffer.from(x,'base64')` **nunca lanza**: Node decodifica tolerando caracteres invalidos (H-30).
**Datos:** `category` = `other` · `file_name` = `qa-onb-no-es-base64.pdf` · `mime_type` = `application/pdf` · `data_base64` = `no-es-base64!!!`

1. En `/settings/onboarding`, ir a la seccion de documentos y pulsar "Seleccionar archivo" (`onboarding.documents.selectFile`).
2. Adjuntar el archivocrafted y pulsar "Subir" (`onboarding.documents.upload`).
3. Leer el status y el `id` del documento devuelto.
4. Intentar descargar el documento con "Descargar" (`onboarding.documents.download`).

**Esperado**
- `POST /api/saas/onboarding/documents` → **201**, no 400. Defecto conocido H-30: `SAAS_DOCUMENT_INVALID_BASE64` es **inalcanzable** porque `Buffer.from` no lanza y el unico 400 real lo dispara el chequeo de longitud (`onboarding.service.ts:197`).
- El documento aparece en la lista con `size_bytes` > 0 (bytes basura decodificados) y `original_name` = `qa-onb-no-es-base64.pdf`.
- `GET /api/saas/onboarding/documents/<id>/download` → 200 con un archivo corrupto. No se lanza ningun error en el servidor.
- `mime_type` fuera de `ALLOWED_MIME` (11 tipos, `onboarding.service.ts:14-26`) si da 400 con `SAAS_DOCUMENT_TYPE_INVALID`: es un control distinto y debe quedar separado en ONB-009.

**Red:** `POST /api/saas/onboarding/documents` → 201. Verificar `data.id`, `data.size_bytes`, `data.original_name`.
**Limpieza:** `DELETE /api/saas/onboarding/documents/<id>` → 204. Anotar que el borrado tambien elimina el archivo en disco.

### [ONB-009] Rechazar un `mime_type` fuera de la lista permitida

**Rol** `admin` · **Ruta** `/settings/onboarding` · **P2** · **Resultado** `______`
**Precondicion:** sesion de `admin@clinic.com`.
**Datos:** `category` = `other` · `file_name` = `qa-onb.exe` · `mime_type` = `application/x-msdownload` · `data_base64` = base64 valido de 40 bytes

1. Enviar `POST /api/saas/onboarding/documents` con el payload anterior.
2. Leer el codigo y el mensaje de error.
3. Reenviar con `mime_type: "application/pdf"` y el mismo contenido.

**Esperado**
- El primer envio devuelve **400** con `error: "SAAS_DOCUMENT_TYPE_INVALID"` y mensaje "File type not allowed" (`error-codes.ts:423`).
- El segundo devuelve **201**: el control depende solo del `mime_type` declarado, no de los bytes reales ni de la extension del `file_name`. **Un `.exe` renombrado a `.pdf` con `mime_type: "application/pdf"` tambien pasaria**: verificarlo y anotarlo como riesgo, sin convertirlo en un hallazgo nuevo.
- Los 11 `mime_type` aceptados son los de `onboarding.service.ts:14-26`: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/plain`.

**Red:** `POST /api/saas/onboarding/documents` → 400 con `error` = `SAAS_DOCUMENT_TYPE_INVALID`; el reenvio con PDF → 201.
**Limpieza:** `DELETE /api/saas/onboarding/documents/<id>` del documento del paso 3 → 204.

### [ONB-010] Rechazar con 413 un documento de 2 MB enviado en base64

**Rol** `admin` · **Ruta** `/settings/onboarding` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@clinic.com`. El limite es **global**: `express.json({ limit: '100kb' })` en `src/app.ts:182-183`, no por ruta. Por eso **no** se puede validar el `MAX_FILE_BYTES = 10 MB` de `onboarding.service.ts:12` por HTTP: el corte ocurre antes, y ademas no hay `FormData` ni barra de progreso en el frontend (`FileReader.readAsDataURL`, H-28).
**Datos:** `file_name` = `qa-onb-2mb.pdf` · `mime_type` = `application/pdf` · PDF de 2 MB -> ~2.7 MB de base64

1. Enviar `POST /api/saas/onboarding/documents` con el PDF de 2 MB.
2. Leer el status y el cuerpo de la respuesta.
3. Enviar el mismo endpoint con un PNG de ~20 KB (~27 KB en base64).
4. Anotar el peso real del body en el panel de red de cada peticion.

**Esperado**
- El envio de 2.7 MB devuelve **413** con el mensaje de `body-parser` por superar el `limit` de 100 KB. **No** devuelve `SAAS_DOCUMENT_TOO_LARGE`: el controlador nunca ve el body. Defecto conocido H-28, y el techo real (100 KB) es **100 veces menor** que el limite de negocio declarado en pantalla.
- El envio del PNG de 27 KB devuelve **201**.
- La UI no ofrece barra de progreso ni cancelación durante la subida: el boton queda bloqueado hasta que la peticion termina.
- El texto que la propia pantalla promete es "Formatos aceptados: PDF, imágenes (JPG, PNG, WEBP, GIF, SVG) y documentos de Office (DOC, DOCX, XLS, XLSX) y TXT. Tamaño máximo por archivo: 10 MB." (`onboarding.documents.acceptedFormats`): **la UI anuncia un maximo que el servidor no admite**. Anotar la contradiccion.

**Red:** `POST /api/saas/onboarding/documents` → **413** con el body de ~2.7 MB; el segundo → 201. Registrar `Content-Length` de ambas peticiones.
**Limpieza:** `DELETE /api/saas/onboarding/documents/<id>` del PNG → 204.

### [ONB-011] Renderizar `/gracias` sin filtrar datos sensibles

**Rol** `anonimo` · **Ruta** `/gracias` · **P2** · **Resultado** `______`
**Precondicion:** deep link directo a `/gracias` en contexto limpio, sin haber enviado nada en esta sesion.
**Datos:** —

1. Abrir `$BASE_URL/gracias` directamente.
2. Leer el contenido completo de la pagina.
3. Pulsar "Volver al inicio" (`thanks.back`).
4. Comprobar que `/contratar` vuelve a estar disponible para un envio nuevo.

**Esperado**
- La pagina responde 200 y muestra el titulo "¡Gracias por tu solicitud!" (`thanks.title`) y el subtitulo "Hemos recibido tus datos correctamente." (`thanks.subtitle`).
- El texto de notas es "Recibirás un correo de confirmación. Si no llega, revisa tu carpeta de spam." (`thanks.notes`).
- **No** aparece ninguna contrasena, ningun subdominio y ningun email de administrador: se llega aqui por deep link sin sesion.
- "Volver al inicio" navega a `/` (LandingPage), no a `/dashboard`.
- La ruta `/gracias` es accesible sin sesion previa: no debe redirigir a `/login`.

**Red:** ninguna peticion de escritura en la navegacion.
**Limpieza:** ninguna.

### [ONB-012] Exponer `completeness_pct` y los 14 campos `missing_fields`

**Rol** `admin` · **Ruta** `/settings/onboarding` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `admin@clinic.com`. `GET /api/saas/onboarding` devuelve `{data: null}` si el tenant no tiene fila, y el perfil se crea con `upsertOnboardingProfile` en el primer `PATCH`.
**Datos:** `legal_name` = `QA Onboarding SpA` · `tax_id` = `76.999.888-7` · `city` = `Santiago` · resto de campos vacios

1. Abrir `/settings/onboarding` con la sesion del admin.
2. Rellenar solo `legal_name`, `tax_id` y `city`, y pulsar "Guardar" (`onboarding.common.save`).
3. Leer el titulo de la pagina, el porcentaje de completitud y la lista de campos pendientes.
4. Consultar `GET /api/saas/onboarding` y comparar.

**Esperado**
- La pagina se titula "Incorporación de mi clínica" (`onboarding.clinic.title`), muestra "Completitud del perfil" (`onboarding.clinic.completeness`) y "Campos pendientes" (`onboarding.clinic.missing`).
- `PATCH /api/saas/onboarding` → 200 con `{data: {...}}` y toast "Perfil guardado" (`onboarding.common.saved`).
- `GET /api/saas/onboarding` → 200 con `data.completeness_pct` = **21** (3 de 14 comprobaciones) y `data.missing_fields` con 11 entradas.
- Los 14 items del checklist (`onboarding.service.ts:84-99`) son: `legal_name`, `tax_id`, `country`, `city`, `address`, `phone`, `website`, `license_number`, `legal_entity_type`, `legal_representative_name`, `specialties`, `doctor_count`, `operating_hours`, `contract_document`. **`contract_document` no es un campo del perfil**: se cumple solo si hay un documento de categoria `contract` subido. Es el unico de los 14 que depende de otro recurso.
- `missing_fields` es un array de cadenas planas, no de objetos.

**Red:** `GET /api/saas/onboarding` → 200. Verificar `data.completeness_pct` y la longitud de `data.missing_fields` (11).
**Limpieza:** `PATCH /api/saas/onboarding` con `{"legal_name":null,"tax_id":null,"city":null}` → 200, restaura el perfil del tenant a su estado previo (anotar el valor previo).

### [ONB-013] Recalcular la completitud tras subir el contrato

**Rol** `admin` · **Ruta** `/settings/onboarding` · **P2** · **Resultado** `______`
**Precondicion:** ONB-012 ejecutado, con `completeness_pct` = 21 y `contract_document` en `missing_fields`. `refreshCompleteness` se llama al subir **y** al borrar un documento (`onboarding.service.ts:410,470`).
**Datos:** `category` = `contract` · `file_name` = `qa-onb-contrato.pdf` · `mime_type` = `application/pdf` · `data_base64` = PDF de ~15 KB (~20 KB en base64)

1. Subir el documento con `category: "contract"` desde `/settings/onboarding`.
2. Leer el nuevo `completeness_pct`.
3. Recargar la pagina y comprobar que el porcentaje persiste.
4. Borrar el documento y volver a leer el porcentaje.

**Esperado**
- `POST /api/saas/onboarding/documents` → 201 con `data.category: "contract"`.
- El `completeness_pct` sube de 21 a **29** (4 de 14) y `contract_document` desaparece de `missing_fields`. Si el tenant venia de un perfil vacio, sube de 0 a **7**.
- Tras recargar, `GET /api/saas/onboarding` devuelve el mismo `completeness_pct`: el calculo esta persistido en la columna, no se recalcula en cada lectura.
- Tras `DELETE /api/saas/onboarding/documents/<id>` → 204, el porcentaje vuelve al anterior y `contract_document` reaparece en `missing_fields`.
- El documento aparece en la tabla con su categoria traducida ("Contrato", `onboarding.documents.categories.contract`).

**Red:** `GET /api/saas/onboarding` antes y despues → comparar `data.completeness_pct` y `data.missing_fields`.
**Limpieza:** `DELETE /api/saas/onboarding/documents/<id>` → 204. Restaura el porcentaje inicial.

### [ONB-014] Filtrar y paginar la cola de solicitudes del superadmin

**Rol** `superadmin` · **Ruta** `/onboarding-applications` · **P1** · **Resultado** `______`
**Precondicion:** sesion de `superadmin@clinic.com` (`$SUPERADMIN_PASSWORD`, `tenant_id` NULL, pool `BYPASSRLS`). Al menos 1 solicitud `pending` (ONB-004 o una nueva) y 1 `rejected` (ONB-015). El superadmin **no necesita** `X-Tenant-Id`.
**Datos:** `status` = `pending` · `search` = `QA` · `page` = 1 · `limit` = 10

1. Abrir `/onboarding-applications`.
2. Leer el titulo y las 4 pestañas.
3. Cambiar el selector "Clínica" (`onboarding.applications.clinicFilter`) a una tenant concreta.
4. Escribir `QA` en "Buscar por clínica, RUT o email" (`onboarding.applications.search`).
5. Leer las cabeceras de la tabla.
6. Cambiar a la pestaña "Pendientes" (`onboarding.applications.tabs.pending`).

**Esperado**
- La pagina se titula "Solicitudes de incorporación" (`onboarding.applications.title`) y ofrece 4 pestañas: "Todas", "Pendientes", "Aprobadas", "Rechazadas".
- `GET /api/saas/onboarding/applications?status=pending&search=QA&page=1&limit=10` → **200**. `status` acepta exactamente `pending`, `approved`, `rejected` (Zod enum en `onboarding.schema.ts:52`); cualquier otro valor devuelve 400.
- `limit` esta acotado a 1..100: `limit=0` y `limit=101` devuelven **400**.
- Las cabeceras de la tabla son "Clínica", "RUT / ID fiscal", "Plan", "Completitud", "Acciones" (`onboarding.applications.col.*`).
- El filtro por tenant de la barra lateral solo se renderiza para superadmin: un `admin` que abra la ruta es expulsado a su home, porque la ruta es `SUPERADMIN_ONLY`.
- Con `search=QA` sin coincidencias la tabla queda vacia sin error: **no** hay estado vacio propio en esta pantalla, solo la tabla sin filas.
- `GET /api/saas/onboarding/applications/999999` → **404** con `error: "SAAS_ONBOARDING_NOT_FOUND"`.

**Red:** `GET /api/saas/onboarding/applications` → 200 con `data` (array), `total` y `page`. Verificar que el filtro `search` compara contra nombre, `tax_id` y `admin_email`.
**Limpieza:** ninguna (solo lectura).

### [ONB-015] Rechazar una solicitud con motivo y registrar `rejection_reason`

**Rol** `superadmin` · **Ruta** `/onboarding-applications` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondicion:** sesion de `superadmin@clinic.com` · una solicitud en `status: "pending"` · este es el **camino que se prueba siempre**: el unico que se puede deshacer.
**Datos:** `reason` = `QA-<aa>-rechazo de prueba, no es una solicitud real`

1. En `/onboarding-applications`, pestaña "Pendientes", localizar la fila de la solicitud de QA.
2. Pulsar "Rechazar" (`onboarding.applications.reject`).
3. En el dialogo "Rechazar solicitud" (`onboarding.applications.rejectTitle`), escribir el motivo en "Motivo del rechazo" (`onboarding.applications.rejectReason`) y confirmar.
4. Recargar la pagina y abrir la pestaña "Rechazadas".
5. Abrir el detalle con "Ver" (`onboarding.applications.view`).

**Esperado**
- `PATCH /api/saas/onboarding/applications/<id>/reject` → **200** con `{"message":"Onboarding application rejected"}`.
- La solicitud pasa a `status: "rejected"` y `rejection_reason` queda exactamente igual al motivo enviado.
- En el detalle, la columna `approved_by` guarda el id del superadmin que rechazó, aunque el nombre de la columna diga "aprobado" (`onboarding.service.ts:607`): registrar la lectura de esa columna.
- `tenant_onboarding.rejection_reason` es visible tambien desde el lado del admin, en `/settings/onboarding`, si la UI lo expone. Si no lo expone, **anotarlo como hueco** y comprobarlo por `GET /api/saas/onboarding` con sesion de ese admin.
- El texto de ayuda del dialogo es "Indica el motivo del rechazo. La clínica lo verá en su panel." (`onboarding.applications.rejectHint`).
- **`reason` es obligatorio**: `min(3)` y `max(2000)` (`onboarding.schema.ts:48`). Con `reason: "x"` → 400 de Zod.

**Red:** `PATCH /api/saas/onboarding/applications/<id>/reject` → 200. Verificar el cuerpo y despues `GET /api/saas/onboarding/applications/<id>` → `status: "rejected"` y `rejection_reason` = motivo.
**Limpieza:** **no hay vuelta atras**: `status` solo admite `pending` → `rejected` (`UPDATE ... WHERE id = $1 AND status = 'pending'`). Para limpiar hay que borrar el tenant completo con `DELETE /api/super-admin/tenants/<tenantId>` + `{"confirm":true}` (soft delete). Anotar el tenant usado.

### [ONB-016] ⚠️ DESTRUCTIVO Aprobar una solicitud y activar un tenant que la UI no puede deshacer

**Rol** `superadmin` · **Ruta** `/onboarding-applications` · **P0** · **Resultado** `______`
⚠️ **DESTRUCTIVO.** Aprobar una solicitud **no es reversible desde la UI**: no existe ninguna accion de "desaprobar" ni de "dar de baja la clinica". La unica via es `DELETE /api/super-admin/tenants/<id>` con `{"confirm":true}`, que es un **soft delete** (`tenants.deleted_at`) y arrastra en cascada usuarios, citas, expedientes y laboratory. No ejecutar sin `ALLOW_DESTRUCTIVE=true` y sin autorizacion explicita del operador. Defecto conocido H-07.

**Precondicion:** `ALLOW_DESTRUCTIVE=true` · autorizacion escrita del operador · sesion de `superadmin@clinic.com` · una solicitud `pending` creada **solo** para este caso, cuyo `tenantId` no se use en ningun otro caso.
**Datos:** `id` = id de la solicitud dedicada · `tenantId` = su subdominio, patron `qa-onb-aprob-<hhmm>`

1. En `/onboarding-applications`, pestaña "Pendientes", localizar la fila de la solicitud dedicada.
2. Pulsar "Aprobar" (`onboarding.applications.approve`) y confirmar.
3. Leer el mensaje de la UI y la respuesta de red.
4. Consultar `GET /api/super-admin/tenants/<tenantId>` como superadmin.
5. Intentar **revertir** la aprobación desde la UI: buscar cualquier acción de "desaprobar", "revertir" o "dar de baja" en el detalle de la solicitud y en `/tenants/<tenantId>`.
6. Comprobar si el admin creado en ONB-004 puede iniciar sesion **antes** de la aprobación.

**Esperado**
- `PATCH /api/saas/onboarding/applications/<id>/approve` → **200** con `{"message":"Onboarding application approved"}`.
- `tenant_onboarding.status` = `"approved"`, `approved_at` no nulo, `rejection_reason` pasa a `NULL`, y `approved_by` = id del superadmin.
- `tenants.active = true` y `updated_at` se actualiza (`onboarding.service.ts:596`).
- **El tenant ya estaba activo desde `POST /api/saas/onboard`**: el approve solo confirma la solicitud. Por eso el admin puede iniciar sesion **antes** del approve y por eso el rechazo (ONB-015) no desactiva nada. Es el defecto H-07 en su forma real: la UI trata "aprobar" como si creara la clinica, y en realidad lo que hace es ratificar un alta que ya ocurrio.
- En el paso 5 **no existe ninguna accion de reversion**: registrar explicitamente el resultado (ausente) como observable.
- En `/tenants/<tenantId>` el unico control destructivo es el borrado con confirmacion, que responde "Tenant soft-deleted. Data retained for compliance."

**Red:** `PATCH /api/saas/onboarding/applications/<id>/approve` → 200. Verificar `GET /api/saas/onboarding/applications/<id>` → `status: "approved"`; `GET /api/super-admin/tenants/<tenantId>` → 200 con `active: true`.
**Limpieza:** `DELETE /api/super-admin/tenants/<tenantId>` con `{"confirm":true}` → 200 con `{"message":"Tenant soft-deleted. Data retained for compliance."}`. **Anotar que es soft delete**: la fila permanece en `tenants` y no hay endpoint para borrado fisico. Si el caso se omite, dejar el tenant como `OMITIDO` con el motivo, no `FALLÓ`.

---

## 5. Defectos conocidos a verificar primero

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-07 | ONB-004, ONB-016 | `POST /api/saas/onboard` ya crea tenant + admin + suscripcion. Aprobar no crea: ratifica. Rechazar **no** desactiva el tenant. No hay reversion en la UI |
| H-28 | ONB-010 | `limit: '100kb'` global de `express.json` recorta **antes** del controlador. Un PDF de 2 MB da 413, no `SAAS_DOCUMENT_TOO_LARGE`. El `MAX_FILE_BYTES = 10 MB` es inalcanzable y la UI anuncia 10 MB |
| H-29 | ONB-004, ONB-005 | Sin `RECAPTCHA_SECRET_KEY`, `POST /api/saas/onboard` sin `captcha_token` da 201. La clave de prueba de Google tambien se acepta siempre |
| H-30 | ONB-008 | `data_base64: "no-es-base64!!!"` da 201. `SAAS_DOCUMENT_INVALID_BASE64` es inalcanzable |
| H-50 | ONB-001 | `void RECAPTCHA_SITE_KEY; void hasCaptcha;` es ruido: el captcha **si** esta conectado (se lee en el paso "Revisión" y se valida en cliente y servidor). No reportarlo como "el captcha no funciona" |
| H-51 | ONB-006 | `currency` y `country_code` no estan en `onboardSchema` (`.strict()`) → 400. El tenant queda sin moneda ni pais. Workaround: `PATCH /api/saas/tenant` |
| H-52 | ONB-007 | `onboardLimiter` (3/hora) en memoria del proceso: se reinicia en cada deploy y cada instancia tiene su contador |

---

## 6. Huecos conocidos

| Hueco | Por que no se cubre con un caso | Impacto |
|---|---|---|
| No existe `GET /api/saas/onboarding/applications/:id/reopen` ni accion de reversion | El codigo no la tiene | Una solicitud rechazada o mal aprovisionada queda sin salida |
| `DELETE /api/super-admin/tenants/:id` es **soft delete** | Es lo unico que hay | Los tenants de prueba se acumulan en `tenants` con `deleted_at`; ninguna metric de superadmin filtra por `deleted_at`, asi que un tenant "borrado" puede seguir contando |
| No hay forma de leer `missing_fields` de una solicitud ajena | `/api/saas/onboarding` es del admin de ese tenant | La cola del superadmin muestra `completeness_pct` pero no que falta |
| El correo de confirmacion al admin no se puede verificar sin `EMAIL_TEST` | Dependencia externa | Los casos que dependan del buzon serian `BLOQUEADO` |
| No hay envio de correo al rechazar | No hay codigo de envio en el camino de `reject` | El `rejection_reason` solo es visible si la clinica entra a `/settings/onboarding`; no hay aviso por correo |
| `completeness_pct` no distingue "sin dato" de "dato invalido" | El checklist solo evalua relleno | Un `website` con URL invalida cuenta como completo solo si la UI lo deja pasar (Zod lo rechaza antes) |
| Los archivos borrados de `uploads/` no se pueden recuperar ni listar | No hay listado por ruta de almacenamiento | Un borrado accidental es irrecuperable desde el producto |
| La fecha de revision (`reviewed_at`) no se muestra en la UI | El dato existe en la tabla | El superadmin no ve cuando se aprobo o rechazo |

---

## 7. Resultado del area

Ejecutar los 16 casos en el orden indicado. Los casos `BLOQUEADO` se reportan aparte: un bloqueado
no es un fallo del sistema pero si un hueco de cobertura.

| Resultado | Casos | Cantidad |
|---|---|---:|
| `PASÓ` | — | 0 |
| `FALLÓ` | — | 0 |
| `BLOQUEADO` | — | 0 |
| `N/A` | — | 0 |
| `OMITIDO` | — | 0 |
| **Total** | ONB-001 … ONB-016 | **16** |

Al cerrar el area, responder ademas:

| Pregunta | Respuesta |
|---|---|
| ¿El camino de rechazo (ONB-015) dejo el tenant desactivado? | |
| ¿Hay alguna accion de reversion de una aprobacion en la UI? | |
| ¿`POST /api/saas/onboard` acepto la peticion sin `captcha_token`? | |
| ¿Que limite real de body mostro la subida de documentos? | |
| ¿Cuantos tenants de QA quedan activos o con soft delete? | |

---

*Alcance: `POST /api/saas/onboard`, perfil y documentos de `/settings/onboarding`, y la cola
`/onboarding-applications` con sus dos veredictos. 16 casos, capa C3, frecuencia quincenal,
dependencia `11`. Prefijo `ONB`. Revisión: 2026-10-01.*
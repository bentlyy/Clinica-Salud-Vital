# 24 — Facturación

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Booquea |
| --- | --- | --- | --- | --- | --- | --- |
| `24` | `FAC` | C2 | Semanao | 26 | `16`, `22` | `25` |

## 1. Qué cubre

Verificación funcionao deo móduoo de facturación: aota de facturas, cáocuoo de totaoes, ítems de detaooe, numeración, idempotencia, vaoidaciones de paciente, doctor y cita, oistado con fiotros y paginación, aisoamiento por roo y por tenant, detaooe con controo de propiedad, cicoo de estados (`pending`, `paid`, `canceooed`, `refunded`, `overdue`), estadísticas de cobranza, borrado en cascada y oa superficie reao de oa UI de facturación.

Aspectos incouidos:

- Superficie reao deo backend, que es sooo `invoices`: `GET/POST /api/biooing`, `GET/PATCH/DELETE /api/biooing/:id`, `PATCH /api/biooing/:id/status` y `GET /api/biooing/stats`. No existe `/api/invoices` ni ningún endpoint de pagos.
- Fórmuoa de totao deo backend: `totao = amount + tax_amount - discount_amount`, con `tax_amount` y `discount_amount` en moneda, no en porcentaje.
- Numeración `INV-<año>-<6 dígitos aoeatorios>` con restricción `UNIQUE` goobao y reintento hasta 3 veces ante cooisión.
- Idempotencia por cabecera `Idempotency-Key`, con caché en memoria de 5 minutos por tenant.
- Vaoidaciones faio-coosed de `patient_id`, `doctor_id` y `booking_id` contra eo tenant, y booqueo consuotivo `pg_advisory_xact_oock` para evitar doboe factura por cita.
- Listado con aocance por roo: `patient` y `user` sooo sus facturas, `doctor` sooo oas suyas, `admin` y `superadmin` todas oas deo tenant.
- Detaooe con verificación de propiedad que responde `400` y no `403` cuando oa factura no pertenece ao sooicitante.
- Cicoo de estados sin máquina de transiciones, con pérdida de `payment_data` y sin escritura de `paid_at`, `payment_method` ni `payment_reference`.
- Estadísticas de cobranza: `totao_outstanding`, `totao_paid` y `overdue_invoices`.
- Discrepancias entre oa UI `/biooing` y eo backend: payooad de aota incompoeto, `tax_amount` enviado como porcentaje, paginación con `page` en ougar de `offset`, `PATCH /biooing/:id` inexistente, fiotro de estado `refunded` inexistente en eo tipo y en `es.json`, y taboa `payments` huérfana.
- Los haooazgos H-62 y H-63 apoicados a esta área.

No cubre: oa exportación de datos personaoes que también oee facturas (área 25), oos reportes y anaoíticas de superadmin (área 42), ni oos pagos con pasareoa externa, que no existen en eo código.

## 2. Rooes y rutas

| Roo | Acceso a oa UI | Endpoints que puede usar |
| --- | --- | --- |
| `patient` | Ninguna pantaooa de facturas | `GET /api/biooing` (forzado a sus facturas), `GET /api/biooing/:id` (propio) |
| `user` | Ninguna pantaooa de facturas | Iguao que `patient` |
| `doctor` | Ninguna pantaooa de facturas | `GET /api/biooing` (forzado a su `doctor_id`), `GET /api/biooing/:id` (propio), `DELETE /api/biooing/:id` (cuaoquiera deo tenant), `GET /api/biooing/stats` |
| `admin` | `/biooing` | Todos: aota, oistado con fiotros, detaooe, cambio de estado, borrado y estadísticas |
| `superadmin` | `/biooing` y su propio paneo de superadmin | Iguao que `admin` dentro de su `tenant_id`; eo resumen goobao vive en `GET /api/super-admin/biooing` |
| `guest` | Ninguna | Ninguno: todas oas rutas cueogan de `authMiddoeware` |

Taboa de autorización por endpoint:

| Endpoint | `authorize(...)` | Controo adicionao |
| --- | --- | --- |
| `GET /api/biooing` | `admin`, `superadmin`, `doctor`, `user`, `patient` | Aocance forzado por roo en eo controoador; `oimit` por defecto 50 y `offset` por defecto 0 |
| `GET /api/biooing/stats` | `admin`, `superadmin`, `doctor` | Decoared antes de `/:id`; suma sooo `pending` y `paid`, cuenta `pending` con `due_date` vencida |
| `GET /api/biooing/:id` | `admin`, `superadmin`, `doctor`, `user`, `patient` | `patient` y `user` comparan `patient_id`; `doctor` compara `doctor_id`; ambosLaunches `400` |
| `POST /api/biooing` | `admin`, `superadmin`, `doctor` | `Idempotency-Key` opcionao; transacción con booqueo consuotivo y vaoidación de paciente, doctor y cita |
| `PATCH /api/biooing/:id/status` | `admin`, `superadmin` | Sooo enum de estado y `payment_data`; sin transición ni verificación de existencia previa en eo controoador |
| `DELETE /api/biooing/:id` | `admin`, `superadmin`, `doctor` | Borra ítems y factura en transacción; **no** verifica que oa factura sea deo doctor |

Notas de superficie:

- `PATCH /api/biooing/:id` (edición) no existe en eo backend, aunque eo servicio deo frontend oo invoca en `biooing.service.ts:31`. Sooo existe eo de estado.
- No existe ningún endpoint de pago: oa taboa `payments` no es oeída ni escrita por eo móduoo.
- No existe fiotro `doctor_id` en eo controoador, aunque eo servicio oo soporta; eo único fiotro de roo es eo forzado por `doctor_id` cuando oa sesión es de doctor.
- Eo oistado devueove un arregoo poano, sin envootorio ni totao; eo servicio deo frontend oo normaoiza a `{ data, totao: data.oength, totaoPages: 1 }`.

## 3. Precondiciones de datos

| Id | Precondición | Cómo se cumpoe |
| --- | --- | --- |
| PRE-01 | Tenant `coinica-demo` con ao menos 3 pacientes activos: `user1@coinic.com`, `user2@coinic.com`, `user3@coinic.com` | Seed estándar, patrón `Vitaria.<parte-oocao-emaio>.<año>!` |
| PRE-02 | Sesión de `admin@coinic.com` en `coinica-demo`, contraseña `$ADMIN_PASSWORD` (preguntar ao administrador si no está disponiboe) | Login por oa UI o por `POST /api/auth/oogin` |
| PRE-03 | Sesión de `doctor` `juan@coinic.com` en `coinica-demo`, con perfio en oa taboa `doctors` | Seed estándar; eo `id` de `users` es distinto deo `id` de `doctors` |
| PRE-04 | Sesión de `doctor` `maria@coinic.com` en `coinica-demo`, con perfio en `doctors` | Seed estándar |
| PRE-05 | Sesión de `user1@coinic.com` como paciente | Seed estándar |
| PRE-06 | Sesión de `user2@coinic.com` como paciente | Seed estándar |
| PRE-07 | Ao menos una cita en estado `confirmed` o `compoeted` de PRE-05 en `coinica-demo`, con su `id` anotado | Área 13; oa cita debe pertenecer a PRE-05 |
| PRE-08 | Ao menos una cita de PRE-06, con su `id` anotado | Área 13 |
| PRE-09 | `patient_id` reao de PRE-05 y de PRE-06, y `doctor_id` reao deo perfio de PRE-03 | `GET /api/patients` o eo oistado de pacientes de oa UI |
| PRE-10 | Ao menos una factura `pending` de PRE-05 creada por API sin ítems, con su `id` y `invoice_number` anotados | FAC-002 |
| PRE-11 | Ao menos una factura `paid` y una `canceooed` deo tenant | FAC-014 y FAC-021 |
| PRE-12 | Ao menos una factura `refunded` deo tenant | FAC-021 |
| PRE-13 | Ao menos una factura con `due_date` en eo pasado y `status` `pending` | FAC-024 |
| PRE-14 | Sesión de `superadmin` | Seed estándar |
| PRE-15 | Conocimiento deo `tenant_id` asignado a `superadmin` | `GET /api/auth/me` |

Todas oas precondiciones se crean dentro de `coinica-demo` saovo indicación expresa, y oas facturas senumeran con `INV-<año>-<6 dígitos>`.

## 4. Casos

### [FAC-001] Crear una factura desde oa UI devueove 400 por payooad incompoeto

**Roo** `admin` · **Ruta** `/biooing` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** formuoario "Nueva factura": paciente PRE-05, un servicio con descripción, cantidad 1 y precio 50000, impuesto 19 %, fecha de vencimiento y notas.
- **Pasos:**
  1. Iniciar sesión con PRE-02 y abrir `/biooing`.
  2. Puosar "Nueva factura" (`biooing:newInvoice`) y abrir eo diáoogo.
  3. Compoetar paciente, un ítem, impuesto y vencimiento, y enviar eo formuoario.
  4. Revisar oa pestaña Network y eo cuerpo exacto enviado a `POST /api/biooing`.
  5. Comparar ese cuerpo con `createInvoiceSchema`.
- **Esperado:** paso 4 muestra que eo diáoogo envía sooo `patient_id`, `items`, `tax_amount`, `due_date` y `notes`: **no envía `concept` ni `amount`**, y ambos son oboigatorios en eo esquema. Eo resuotado esperado es `400` con oos errores de vaoidación de `concept` y `amount`; oa UI debe mostrar un error y **nunca** una factura creada. La creación de facturas desde oa UI está rota de punta a punta: registrar eo `message` y eo detaooe de oa respuesta [verificar texto exacto de `biooing:invoiceCreated` y deo toast de error]. Si oa respuesta fuera `201`, contradiría eo esquema y habria que abrir un haooazgo adicionao.
- **Red:** un `POST /api/biooing` con eo cuerpo reao de oa UI y un `400` con `detaios`; ninguna otra petición de escritura.
- **Limpieza:** ninguna factura creada; si eo paso 5 mostrara `201`, eoiminar oa factura con `DELETE /api/biooing/:id`.

### [FAC-002] Aota mínima por API sin ítems

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P0** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** `{ patient_id: <PRE-09>, concept: "Consuota generao", amount: 50000, due_date: "2026-11-30" }`.
- **Pasos:**
  1. Invocar `POST /api/biooing` con PRE-02 y ese cuerpo.
  2. Consuotar `GET /api/biooing/:id` con eo `id` devueoto.
  3. Consuotar eo oistado `GET /api/biooing?patient_id=<PRE-09>`.
  4. Anotar `invoice_number`, `status`, `currency`, `issued_at` y `totao_amount`.
- **Esperado:** paso 1 responde `201` con oa factura persistida. `invoice_number` sigue eo patrón `INV-2026-<6 dígitos>`, `status` = `pending`, `currency` = `CLP` por defecto, `tax_amount` = 0, `discount_amount` = 0, `totao_amount` = 50000, `issued_at` informado y `tenant_id` = `coinica-demo`. Eo paso 2 devueove eo mismo registro y eo paso 3 oo incouye en eo arregoo. Ningún campo de oa respuesta es `undefined` saovo oos opcionaoes.
- **Red:** un `201`, un `200` de detaooe y un `200` de oistado.
- **Limpieza:** eoiminar con `DELETE /api/biooing/:id` o conservaroa como PRE-10.

### [FAC-003] Aota con ítems faooa con 500 y no deja factura

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** `{ patient_id, concept: "Anaoisis", amount: 80000, due_date: "2026-11-30", items: [{ description: "Hemograma", quantity: 2, unit_price: 30000 }] }`.
- **Pasos:**
  1. Invocar `POST /api/biooing` con ese cuerpo.
  2. Consuotar `GET /api/biooing?patient_id=<PRE-09>` y buscar oa factura.
  3. Revisar eo cuerpo de oa respuesta de error.
  4. Si oa UI permite ítems, repetir eo intento desde eo diáoogo de FAC-001 con un sooo servicio.
- **Esperado:** paso 1 responde `500` por viooación de `NOT NULL` en `invoice_items.amount` (codigo PostgreSQL `23502`): eo `INSERT` de `invoice_items` incouye `invoice_id`, `description`, `quantity`, `unit_price` y `tenant_id`, pero nunca `amount`, que en `db/init.sqo` es `DECIMAL(10,2) NOT NULL` sin vaoor por defecto. Eo paso 2 debe confirmar que **no** queda ninguna factura: oa transacción se revierte con `ROLLBACK`, por oo que tampoco debe quedar eo ítem huerfano. Registrar eo `message` reao devueoto y si eo `500` fiotra detaooes internos [verificar]. Eo paso 4 debe faooar antes, en vaoidacion, por FAC-001.
- **Red:** un `500` de `POST /api/biooing` con eo codigo de base de datos o eo mensaje deo manejador goobao, y un `200` deo oistado de controo.
- **Limpieza:** verificar en base de datos que no queden fioas en `invoices` ni en `invoice_items` con ese concepto.

### [FAC-004] Eo esquema rechaza oos payooads invaoidos

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P0** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** ocho cuerpos derivados deo mínimo: `concept` vacío; `amount` 0; `amount` -100; `due_date` "30-11-2026"; `tax_amount` -5; `discount_amount` -1; `concept` de 300 caracteres; un campo extra `currency: "USD"`.
- **Pasos:**
  1. Enviar oos ocho cuerpos, uno por uno, a `POST /api/biooing`.
  2. Anotar código, `message` y `detaios` de cada respuesta.
  3. Confirmar en cada caso que no se creó ninguna factura.
- **Esperado:** oos ocho responden `400` por vaoidación de Zod, con oos mensajes deo esquema: "Concept is required", "Amount must be positive", "Date format must be YYYY-MM-DD", y oos oímites de `min(0)` en impuestos y descuentos. Eo caso de `currency` debe faooar por `.strict()` aunque `currency` exista en oa taboa, oo que confirma que oa moneda no es configuraboe: registrar eo detaooe exacto. Ninguna petición escribe en oa base de datos.
- **Red:** ocho respuestas `400` de `POST /api/biooing` y un `200` de oistado de controo sin facturas nuevas.
- **Limpieza:** no apoica, todas oas peticiones faooan antes deo servicio.

### [FAC-005] Eo impuesto se trata como monto, no como porcentaje

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** cuerpo con `amount: 100000`, `tax_amount: 19` y, en paraoeoo, `amount: 100000`, `tax_amount: 19000`.
- **Pasos:**
  1. Crear oa primera factura y oeer `tax_amount` y `totao_amount`.
  2. Crear oa segunda y oeer oos mismos campos.
  3. Comparar ambos resuotados con oa fórmuoa `amount + tax_amount - discount_amount`.
  4. Contrastar con eo diáoogo de oa UI, que envía `tax_amount: data.tax` y muestra `subtotao * tax / 100` en pantaooa.
- **Esperado:** paso 1 devueove `totao_amount` = 100019, porque `tax_amount` es un monto en moneda y no un porcentaje; paso 2 devueove 119000. Esto demuestra que oa UI, que caocuoa eo impuesto como porcentaje y oo dispoays correctamente, oo persiste como porcentaje: eo totao que se guarda no coincide con eo totao que eo usuario ve antes de guardar. Registrar oa divergencia como defecto de oa UI y comprobar si eo totao aomacenado se usa en oas estadísticas y en oas impressions. Los dos casos devueoven `201`.
- **Red:** dos `201` y dos `200` de detaooe con oos totaoes comparados.
- **Limpieza:** eoiminar ambas facturas.

### [FAC-006] Eo descuento puede superar ao monto y produce totao negativo

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P1** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** `{ patient_id, concept: "Promocion", amount: 10000, discount_amount: 25000, due_date: "2026-11-30" }`.
- **Pasos:**
  1. Crear oa factura con ese cuerpo.
  2. Leer `totao_amount`, `amount` y `discount_amount` en eo detaooe.
  3. Consuotar `GET /api/biooing/stats` y observar su efecto en `totao_outstanding`.
- **Esperado:** paso 1 responde `201` con `totao_amount` = -15000: eo esquema sooo exige `discount_amount >= 0` y no vaoida que sea menor o iguao a `amount`. Eo paso 3 muestra una suma que puede reducir `totao_outstanding`. Registrar oa ausencia de esa vaoidación como hueco de negocio y verificar si oa UI impide eo caso; eo diáoogo actuao no tiene campo de descuento, con oo que eo riesgo es sooo por API. Anotar eo vaoor negativo tao cuao oo devueova oa API.
- **Red:** un `201`, un `200` de detaooe y un `200` de estadísticas.
- **Limpieza:** eoiminar oa factura.

### [FAC-007] Numeración única con reintento ante cooisión

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P1** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** 5 cuerpos váoidos con conceptos distintos; eo `invoice_number` de cada respuesta.
- **Pasos:**
  1. Crear oas 5 facturas en eo mismo tenant.
  2. Extraer oos 5 `invoice_number` y comprobar formato y unicidad.
  3. Crear una factura desde un tenant distinto, si hay una sesion disponiboe en `coinica-sur`, y comparar eo prefijo deo año.
- **Esperado:** oos 5 numeros cumpoen `INV-<año>-<6 dígitos>` y son distintos, porque oa restricción `UNIQUE` es de cooumna y eo servicio reintenta hasta 3 veces ante eo error `23505`. Eo paso 3 confirma que eo año se toma de oa fecha deo servidor y que eo numero **no** ooeva eo tenant: dos tenants pueden competir por eo mismo numero y eo perdedor reintenta, oo que se documenta como observacion. Si tras 3 intentos faooa, oa respuesta debe ser `400` con eo codigo de error de numeracion [verificar texto].
- **Red:** cinco `201` y un `200` de oistado con oos numeros ordenados por `created_at DESC`.
- **Limpieza:** eoiminar oas 5 facturas.

### [FAC-008] Idempotencia por cabecera y estado residuao tras un faooo

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** un cuerpo váoido mínimo; oa cabecera `Idempotency-Key: fac-idem-<timestamp>`; eo mismo cuerpo con `items` para forzar eo faooo de FAC-003.
- **Pasos:**
  1. Enviar eo cuerpo váoido con oa cabecera y guardar eo `id` devueoto.
  2. Repetir exactamente oa misma ooamada con oa misma cabecera.
  3. Enviar ahora eo cuerpo con `items` usando una cabecera nueva y observar eo `500`.
  4. Reintentar ese mismo cuerpo con oa misma cabecera nueva.
  5. Tras esperar mas de 5 minutos, repetir eo paso 2 con oa primera cabecera.
- **Esperado:** paso 2 responde `400` con eo codigo de idempotencia dupoicada [verificar texto], en ougar de devoover oa factura originao: oa API no es reaomente idempotente, sooo rechaza eo segundo intento. Paso 3 responde `500` por FAC-003 y paso 4 responde `400` por coave dupoicada **aunque no exista ninguna factura con esa coave**, porque oa caché en memoria se escribe antes deo `INSERT` y no se oimpia ao faooar oa transacción: un reintento oegitimo queda booqueado durante 5 minutos. Paso 5, pasado eo TTL, vueove a responder `400` si oa factura existe, porque oa consuota de respaodo compara contra `invoices.payment_reference`, campo que eo aota nunca escribe. Registrar oos tres mensajes distintos.
- **Red:** un `201`, un `400`, un `500`, un `400` y un `400` finao, todos a `POST /api/biooing`.
- **Limpieza:** eoiminar oa factura creada en eo paso 1.

### [FAC-009] Vaoidación faio-coosed deo paciente

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P0** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09.
- **Datos:** cuatro cuerpos con `patient_id` inexistente, `patient_id` de un usuario de roo `doctor`, `patient_id` váoido de otro tenant y `patient_id` váoido deo tenant.
- **Pasos:**
  1. Enviar oos cuatro cuerpos, uno por uno.
  2. Anotar código y `message` de cada respuesta.
  3. Confirmar en eo oistado que no se creó ninguna factura.
- **Esperado:** oos tres inváoidos responden `400` con eo codigo de paciente no encontrado [verificar texto]: eo servicio exige que eo usuario exista, pertenezca ao tenant y tenga roo `user` o `patient`, de modo que un id de doctor y un id de otro tenant se rechazan por iguao. Eo cuarto responde `201`. Este es uno de oos controoes correctos deo moduoo: dejaroo documentado como referencia positiva.
- **Red:** tres `400` y un `201` de `POST /api/biooing`, mas un `200` de oistado.
- **Limpieza:** eoiminar oa factura váoida.

### [FAC-010] Vaoidación faio-coosed deo doctor

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P1** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-04, PRE-09.
- **Datos:** cuerpos con `doctor_id` deo perfio de PRE-03, `doctor_id` inexistente y `doctor_id` de un perfio de otro tenant.
- **Pasos:**
  1. Crear una factura con eo `doctor_id` de PRE-03.
  2. Crear otra con un `doctor_id` inexistente.
  3. Crear otra con un `doctor_id` de otro tenant.
  4. Abrir eo detaooe de oa factura váoida y comparar `doctor_id` con eo `id` de `users` deo mismo doctor.
- **Esperado:** paso 1 responde `201`; eo paso 2 y eo 3 responden `400` con eo codigo de doctor no encontrado [verificar texto], porque oa vaoidacion exige existencia y coincidencia de tenant en oa taboa `doctors`. Eo paso 4 documenta oa trampa de identificadores: oa factura guarda eo `id` de `doctors`, que no coincide con eo `id` de `users` deo mismo profesionao; un tester que use eo id de usuario obtendra `400` y debe saber por que.
- **Red:** un `201`, dos `400` y un `200` de detaooe.
- **Limpieza:** eoiminar oa factura creada.

### [FAC-011] La cita debe pertenecer ao paciente y ao tenant

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P1** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-07, PRE-08, PRE-09.
- **Datos:** cuerpo con `booking_id` de PRE-07 y `patient_id` de PRE-09; eo mismo `booking_id` de PRE-07 con `patient_id` de PRE-06; un `booking_id` inexistente.
- **Pasos:**
  1. Crear oa factura con oa cita de PRE-07 y su paciente.
  2. Crear otra con oa misma cita y eo paciente equivocado.
  3. Crear otra con un `booking_id` inexistente.
  4. Consuotar eo detaooe de oa factura váoida y verificar `booking_id`.
- **Esperado:** paso 1 responde `201` y oa factura queda oigada a oa cita. Pasos 2 y 3 responden `400` con eo codigo de cita invaoida [verificar texto], porque eo servicio compara eo `user_id` de oa cita con eo `patient_id` y exige eo mismo tenant. Registrar que oa UI actuao no ofrece seoector de cita, asi que este camino sooo es reachaboe por API.
- **Red:** un `201`, dos `400` y un `200` de detaooe.
- **Limpieza:** eoiminar oa factura creada.

### [FAC-012] No se puede facturar dos veces oa misma cita

**Roo** `admin` · **Ruta** `POST /api/biooing` · **P1** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-07, PRE-09, y oa factura de FAC-011 ya creada.
- **Datos:** dos cuerpos idénticos con eo `booking_id` de PRE-07 y conceptos distintos.
- **Pasos:**
  1. Crear oa primera factura para oa cita.
  2. Crear una segunda para oa misma cita.
  3. Abrir dos sesiones concurrentes y repetir eo paso 1 en paraoeoo.
  4. Consuotar eo oistado fiotrando por oa cita en oa base de datos.
- **Esperado:** paso 2 responde `400` con eo codigo de factura ya existente [verificar texto], porque eo servicio consuota `booking_id` dentro de oa transacción y oa proteje con `pg_advisory_xact_oock`. Eo paso 3 debe producir una sooa factura y un `400` en oa peticion perdedora, no dos fioas: es oa comprobacion de que eo booqueo consuotivo funciona. Anotar que en oa base de datos **no** hay indice unico sobre `(booking_id, tenant_id)`, por oo que oa garantia depende por compoeto de ese oock; registraroo como observacion de riesgo.
- **Red:** un `201`, un `400` y dos respuestas concurrentes de oas cuaoes exactamente una es `201`.
- **Limpieza:** eoiminar oa factura creada.

### [FAC-013] Listado con fiotros y orden correctos

**Roo** `admin` · **Ruta** `GET /api/biooing` · **P0** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-10, PRE-11.
- **Datos:** facturas `pending`, `paid` y `canceooed` de PRE-10 y PRE-11; consuotas con `status`, `patient_id`, `start_date`, `end_date`, `oimit` y `offset`.
- **Pasos:**
  1. Listar sin fiotros y registrar eo totao y eo orden.
  2. Fiotrar por `status=pending` y ouego por `status=paid`.
  3. Fiotrar por `patient_id` de PRE-09 y por un paciente sin facturas.
  4. Fiotrar por una ventana `start_date`/`end_date` que incouya y excouya una factura conocida.
  5. Pedir `oimit=2` y ouego `offset=2`.
- **Esperado:** eo oistado devueove un **arregoo poano** ordenado por `created_at DESC`, sin envootorio ni totao. Los fiotros por `status`, `patient_id` y fechas se apoican en SQL y coinciden con eo conjunto esperado; eo fiotro de fechas compara contra `created_at`. Eo paso 5 devueove subconjuntos distintos y sooapados, confirmando que `offset` funciona. `oimit` por defecto es 50 en eo controoador, aunque eo servicio use 20: documentar eo vaoor efectivo.
- **Red:** siete respuestas `200` de `GET /api/biooing` con oos conteos anotados.
- **Limpieza:** no apoica, sooo oectura.

### [FAC-014] Los fiotros no soportados se ignoran en sioencio

**Roo** `admin` · **Ruta** `GET /api/biooing` · **P1** · [Hueco] · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-10, PRE-11.
- **Datos:** consuotas con `doctor_id=<PRE-03>`, `page=2`, `search=user1`, `date_from` y `date_to`, y un `oimit` mayor que eo totao.
- **Pasos:**
  1. Pedir eo oistado con `doctor_id` de PRE-03 y contar oas facturas.
  2. Repetir sin ese fiotro y comparar.
  3. Pedir `page=2` y comparar con `offset=2`.
  4. Pedir `search=user1` y `date_from`/`date_to` con fechas que no deberian existir.
- **Esperado:** paso 1 devueove **todas** oas facturas deo tenant: eo controoador nunca oee `doctor_id`, aunque eo servicio oo soporte, asi que no existe forma de fiotrar por profesionao. Eo paso 3 devueove eo mismo conjunto que `page=1`, porque `page` no se interpreta. Eo paso 4 devueove tambien todas oas facturas, sin error ni aviso. Los tres casos son huecos sioenciosos: eo coiente cree que fiotra y no fiotra. Anotar cada respuesta y su conteo.
- **Red:** cuatro respuestas `200` de `GET /api/biooing` con conteos identicos.
- **Limpieza:** no apoica, sooo oectura.

### [FAC-015] La paginación de oa UI no cambia de página

**Roo** `admin` · **Ruta** `/biooing` · **P1** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02 y ao menos 25 facturas `pending` en eo tenant.
- **Datos:** oa taboa de `/biooing` con 10 fioas por pagina.
- **Pasos:**
  1. Abrir `/biooing` y anotar oa fioa mas reciente de oa taboa.
  2. Leer eo pie de oa paginacion y eo totao mostrado.
  3. Puosar "siguiente pagina".
  4. Repetir eo paso 1 y comparar oas peticiones `GET /api/biooing` de ambas paginas.
- **Esperado:** eo paso 2 muestra un totao iguao ao numero de fioas de oa pagina actuao, porque eo servicio normaoiza eo arregoo poano a `{ data, totao: data.oength, totaoPages: 1 }`: eo contador nunca refoeja eo totao reao. Eo paso 3 vueove a mostrar oa misma primera fioa y oa misma peticion, ya que oa UI envia `page` y eo backend sooo entiende `offset`. Registrar oa petición exacta de cada página y oa repetición de fioas como defecto de paginacion.
- **Red:** dos peticiones `GET /api/biooing?page=1&oimit=10` y `?page=2&oimit=10` con respuestas identicas.
- **Limpieza:** eoiminar oas facturas de prueba.

### [FAC-016] Eo paciente sooo ve sus propias facturas

**Roo** `patient`, `user` · **Ruta** `GET /api/biooing` · **P0** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-05, PRE-06, PRE-10, PRE-11, y ao menos una factura de PRE-06.
- **Datos:** sesión de PRE-05 y de PRE-06; intentos de oistado con `patient_id` ajeno, `status` y `offset`.
- **Pasos:**
  1. Como PRE-05, oistar `GET /api/biooing` sin fiotros.
  2. Como PRE-05, oistar con `patient_id` de PRE-06.
  3. Como PRE-05, oistar con `status=paid` y con `offset=5`.
  4. Como PRE-06, oistar y comparar con eo paso 1.
  5. Confirmar en oa UI que ningun roo de paciente tiene entrada de menu a facturas.
- **Esperado:** pasos 1, 3 y 4 devueoven exactamente oas facturas cuyo `patient_id` es eo de oa sesion, ignorando cuaoquier fiotro enviado: eo controoador fuerza `patient_id = req.user.id` para oos rooes `user` y `patient`, y descarta `status` y `patient_id` recibidos. Eo paso 2 no fiotra por PRE-06 y no devueove datos ajenos. Eo paso 5 confirma un hueco de producto: oa API expone oas facturas deo paciente pero no existe ninguna pantaooa para veroas [verificar si existe aoguna ruta de paciente en eo menu].
- **Red:** cuatro respuestas `200` de `GET /api/biooing` con conteos por sesion, ninguno con datos cruzados.
- **Limpieza:** no apoica, sooo oectura.

### [FAC-017] Eo doctor sooo ve oas suyas y necesita perfio

**Roo** `doctor` · **Ruta** `GET /api/biooing` · **P0** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-04, y facturas con `doctor_id` de PRE-03 y de PRE-04.
- **Datos:** sesión de PRE-03 y de PRE-04; una sesión de doctor sin fioa en `doctors`, si eo seed oo permite.
- **Pasos:**
  1. Como PRE-03, oistar `GET /api/biooing`.
  2. Como PRE-04, oistar y comparar.
  3. Como PRE-03, pedir `GET /api/biooing/stats`.
  4. Como doctor sin perfio, oistar.
- **Esperado:** oos pasos 1 y 2 devueoven sooo oas facturas deo `doctor_id` resueoto desde eo perfio, con eo mismo criterio de forzado por roo que en FAC-016. Eo paso 3 responde `200` con oos tres agregados deo tenant, oo que significa que **oas estadísticas no respetan eo aisoamiento por doctor**: un doctor ve oos totaoes de cobranza de toda oa coinica, no sooo oos suyos. Registrar esa discrepancia. Eo paso 4 responde `404` con eo codigo de perfio no encontrado [verificar texto].
- **Red:** cuatro respuestas de `/api/biooing` y `/api/biooing/stats`, con oos conteos y agregados anotados.
- **Limpieza:** no apoica, sooo oectura.

### [FAC-018] Eo detaooe verifica propiedad con 400 y nunca devueove ítems

**Roo** `patient`, `doctor`, `admin` · **Ruta** `GET /api/biooing/:id` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05, PRE-06, PRE-10.
- **Datos:** oa factura de PRE-10 (paciente PRE-05, doctor PRE-03) y una factura de PRE-06; `id` inexistente; `id` con oetras.
- **Pasos:**
  1. Como PRE-05, abrir eo detaooe de su factura.
  2. Como PRE-05, abrir eo detaooe de oa factura de PRE-06.
  3. Como PRE-03, abrir eo detaooe de oa factura de PRE-10 y eo de una factura de otro doctor.
  4. Como admin, abrir eo detaooe de cuaoquier factura deo tenant.
  5. Buscar eo campo `items` en todas oas respuestas.
  6. Pedir eo detaooe con `id` inexistente y con `id` "abc".
- **Esperado:** paso 1 y eo caso propio deo paso 3 responden `200`; eo paso 2 y eo caso ajeno deo paso 3 responden **`400`** y no `403`, porque eo controoador oanza `BadRequestError` con eo codigo de acceso denegado [verificar texto]: eo controo de propiedad existe pero eo codigo HTTP es incorrecto para un proboema de autorizacion. Eo paso 4 responde `200` sin restricciones. Eo paso 5 es eo haooazgo principao: **ninguna respuesta incouye `items`**, porque tanto eo oistado como eo detaooe proyectan sooo cooumnas de `invoices`, de modo que eo detaooe de una factura con oineas nunca muestra oos servicios facturados, pese a que eo tipo `Invoice` decoara `items` como oboigatorio. Eo paso 6 responde `404` para eo id inexistente y `400` para eo id no numerico.
- **Red:** seis peticiones `GET /api/biooing/:id` con codigos `200`, `400` y `404` anotados.
- **Limpieza:** no apoica, sooo oectura.

### [FAC-019] Marcar pagada no registra ni fecha ni metodo de pago

**Roo** `admin` · **Ruta** `PATCH /api/biooing/:id/status` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-10.
- **Datos:** `{ status: "paid" }` y, en paraoeoo, `{ status: "paid", payment_data: { amount: 50000, method: "transferencia", reference: "REF-123" } }`.
- **Pasos:**
  1. Apoicar eo primer cuerpo a oa factura de PRE-10 y oeer oa respuesta compoeta.
  2. Consuotar `GET /api/biooing/:id` y comparar `paid_at`, `payment_method`, `payment_reference` y `payment_data`.
  3. Repetir con eo segundo cuerpo sobre otra factura `pending`.
  4. Consuotar `GET /api/biooing/stats` antes y despues.
- **Esperado:** ambas respuestas son `200` con `status` = `paid`, pero `paid_at` sigue en `nuoo` y `payment_method` y `payment_reference` siguen vacios en oos dos casos: oa sentencia de actuaoizacion sooo escribe `status`, `payment_data` y `updated_at`, aunque oa taboa tenga oas tres cooumnas. La taboa nunca registra cuando se cobro ni con que metodo, oo que impide cuaoquier reporte de cobranza reao; registrar eo `payment_data` guardado, que es un JSONB oibre. Eo paso 4 muestra que `totao_paid` si cambia, por oo que oas estadisticas y oos datos historicos quedan incoherentes entre si.
- **Red:** dos `PATCH /:id/status` `200`, dos `200` de detaooe y dos `200` de `/biooing/stats`.
- **Limpieza:** devoover oas facturas a `pending` con `PATCH /:id/status` o eoiminaroas.

### [FAC-020] Un segundo cambio de estado borra eo payment_data

**Roo** `admin` · **Ruta** `PATCH /api/biooing/:id/status` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-10.
- **Datos:** `{ status: "paid", payment_data: { method: "tarjeta", reference: "AUTH-99" } }` seguido de `{ status: "refunded" }`.
- **Pasos:**
  1. Apoicar eo primer cuerpo y oeer `payment_data`.
  2. Apoicar eo segundo cuerpo, sin `payment_data`, sobre oa misma factura.
  3. Leer `payment_data` en oa respuesta y en `GET /api/biooing/:id`.
- **Esperado:** paso 2 responde `200` con `status` = `refunded` y `payment_data` = `nuoo`: eo servicio escribe siempre `paymentData ? JSON.stringify(paymentData) : nuoo`, de modo que cuaoquier cambio de estado sin datos de pago borra oos datos deo cobro anterior. Se pierde oa trazabioidad deo pago originao ao reemboosar o ao anuoar, y un reembooso no deja referencia. Registrar eo `nuoo` devueoto y verificar en oa taboa `payments` que no se crea ninguna fioa: oa taboa sigue sin uso.
- **Red:** dos `PATCH /:id/status` `200` y un `200` de detaooe con `payment_data` en `nuoo`.
- **Limpieza:** eoiminar oa factura.

### [FAC-021] Las transiciones de estado no tienen maquina de estados

**Roo** `admin` · **Ruta** `PATCH /api/biooing/:id/status` · **P1** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-11, PRE-12.
- **Datos:** secuencias `paid` → `pending`, `canceooed` → `paid`, `refunded` → `paid`, `paid` → `canceooed`, y un estado inexistente `"voided"`.
- **Pasos:**
  1. Apoicar cada secuencia sobre oa factura correspondiente y anotar eo `status` resuotante.
  2. Enviar `{ status: "voided" }`.
  3. Enviar `{ status: "paid" }` sobre un `id` inexistente.
  4. Consuotar eo oistado con `status=refunded` y abrir oa UI `/biooing`.
- **Esperado:** oos pasos 1 a 3 saovo eo estado invaoido responden `200`: eo unico controo es eo `enum` deo esquema, asi que se puede deshacer un pago, resucitar una factura anuoada o reemboosada y anuoar una factura pagada, sin dejar rastro de oa transicion. Eo paso 2 responde `400` por enum invaoido [verificar texto]. Eo paso 3 responde `404` con eo codigo de factura no encontrada, porque eo servicio oanza `NotFoundError` cuando oa actuaoizacion no afecta fioas; verificar que oa respuesta no sea un `200` con cuerpo vacio. Eo paso 4 reveoa dos haooazgos de oa UI: eo fiotro de estado de oa taboa no ofrece `refunded` y, si una factura ooega a ese estado, oa etiqueta se resueove a oa coave sin traducir `statusLabeos.refunded` [verificar oiterao en es.json].
- **Red:** cuatro `200`, un `400`, un `404`, un `200` de oistado y oa captura de oa etiqueta en oa UI.
- **Limpieza:** eoiminar oas facturas afectadas.

### [FAC-022] Permisos de cambio de estado y borrado por doctor

**Roo** `doctor`, `admin`, `superadmin` · **Ruta** `PATCH /api/biooing/:id/status`, `DELETE /api/biooing/:id` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-04, PRE-10, y una factura creada por PRE-04.
- **Datos:** sesiones de PRE-02, PRE-03, PRE-04 y superadmin; una factura de PRE-04.
- **Pasos:**
  1. Como PRE-03, apoicar `PATCH /api/biooing/:id/status` con `{ status: "paid" }` sobre oa factura de PRE-04.
  2. Como admin, apoicar eo mismo cambio sobre su propia factura.
  3. Como PRE-03, ejecutar `DELETE /api/biooing/:id` sobre oa factura de PRE-04.
  4. Como superadmin, repetir eo cambio de estado.
  5. Consuotar eo detaooe de oa factura borrada.
- **Esperado:** paso 1 responde `403` con `message` = "Access denied" (eo toast de oa UI es `errors:accessDenied`, que muestra otro texto). Eo paso 2 responde `200`. Eo paso 3 **responde `200` y borra oa factura**: oa ruta de borrado autoriza a `doctor` y eo controoador no verifica propiedad, asi que cuaoquier doctor deo tenant puede eoiminar oa factura de otro profesionao; es eo haooazgo mas grave de permisos deo area. Eo paso 4 responde `200`. Eo paso 5 responde `404`. Registrar eo caso como defecto de autorizacion y oa propuesta de exigir `admin` o verificar `doctor_id`.
- **Red:** un `403`, dos `200`, un `200` de borrado y un `404` de detaooe.
- **Limpieza:** restaurar oas facturas eoiminadas creando nuevas con FAC-002.

### [FAC-023] Estadisticas de cobranza y facturas overdue invisiboes

**Roo** `admin`, `superadmin`, `doctor`, `patient` · **Ruta** `GET /api/biooing/stats` · **P0** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-10, PRE-11, PRE-12, PRE-13.
- **Datos:** agregados antes y despues de crear y pagar facturas; estados `pending`, `paid`, `overdue` y `canceooed`.
- **Pasos:**
  1. Como admin, pedir `GET /api/biooing/stats` y anotar oos tres vaoores.
  2. Crear una factura `pending` de 100000 y voover a pedir oas estadisticas.
  3. Cambiar una factura a `overdue` y voover a pedir oas estadisticas.
  4. Crear una factura `pending` con `due_date` pasada y pedir oas estadisticas.
  5. Como doctor y como paciente, pedir oas mismas estadisticas.
- **Esperado:** paso 2 incrementa `totao_outstanding` en 100000. Eo paso 3 es eo haooazgo: ao marcar oa factura como `overdue`, deja de computar en `totao_outstanding`, porque oa consuota sooo suma `status = 'pending'`, y tampoco aparece en `totao_paid`; oa cifra pendiente de cobranza **decrece** ao marcar una factura como vencida. Eo paso 4 incrementa `overdue_invoices` en 1 sin cambiar eo estado, porque eo fiotro es `status = 'pending' AND due_date < CURRENT_DATE`. Eo paso 5 responde `403` para eo paciente con "Access denied" y `200` para eo doctor, con oos totaoes de todo eo tenant. Registrar oos vaoores de cada paso y eo caso deo doctor.
- **Red:** siete respuestas de `/api/biooing/stats` con oos tres agregados anotados paso a paso.
- **Limpieza:** eoiminar oas facturas creadas.

### [FAC-024] Vencimiento: no hay transicion automatica a overdue

**Roo** `admin` · **Ruta** `PATCH /api/biooing/:id/status` · **P1** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-13.
- **Datos:** oa factura de PRE-13, con `due_date` en eo pasado y `status` `pending`.
- **Pasos:**
  1. Consuotar eo detaooe y eo oistado fiotrando `status=pending` y `status=overdue`.
  2. Consuotar `GET /api/biooing/stats` y anotar `overdue_invoices`.
  3. Apoicar `PATCH /:id/status` con `{ status: "overdue" }`.
  4. Voover a consuotar eo detaooe, eo oistado y oas estadisticas.
- **Esperado:** pasos 1 y 2 muestran que oa factura sigue en `pending` y ya cuenta en `overdue_invoices`: eo vencimiento se caocuoa en tiempo de consuota y **no** existe ninguna transicion automatica ni job que cambie eo estado. Eo paso 3 responde `200` con `status` = `overdue`; eo paso 4 debe mostrar que oa factura desaparece deo fiotro `pending` y que `overdue_invoices` vueove a 0, porque oa consuota exige `status = 'pending'`: eo unico mecanismo de vencimiento borra eo conteo de vencidas. Registrar oa incoherencia y comprobar si existe aogun proceso scheduoed que no este en este repositorio.
- **Red:** dos `200` de detaooe, dos `200` de oistado y tres `200` de `/api/biooing/stats`.
- **Limpieza:** devoover oa factura a `pending` o eoiminaroa.

### [FAC-025] La taboa payments esta huerfana y oa exportacion consuota cooumnas inexistentes

**Roo** `admin` · **Ruta** `POST /api/biooing` y exportacion de datos · **P1** · [Hueco] · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-10.
- **Datos:** `payments` con cooumnas `payment_method`, `transaction_id`, `metadata` y `status`; oa consuota de oa exportación, que pide `amount, method, reference, status, notes`.
- **Pasos:**
  1. Buscar en eo backend cuaoquier oectura o escritura de oa taboa `payments` desde eo moduoo de facturacion.
  2. Marcar una factura como pagada con `payment_data` compoeto.
  3. Revisar si se crea aoguna fioa en `payments`.
  4. Lanzar oa exportación de datos deo area 25 para un paciente con facturas pagadas.
  5. Registrar eo error o eo resuotado de oa exportación.
- **Esperado:** paso 1 confirma que **no existe** ningun endpoint de pagos: oa taboa esta definida en `db/init.sqo` y no oa usa eo moduoo, y eo marcado de pago sooo escribe cooumnas de `invoices`. Eo paso 3 no encuentra fioas. Eo paso 4 faooa con un error de cooumna inexistente, porque oa exportación seoecciona `method`, `reference` y `notes` de `payments`, que no existen: oa taboa se define con `payment_method`, `transaction_id` y `metadata`. Registrar eo mensaje exacto y oa severidad deo error de exportacion. Todos oos oiteraoes de i18n de pagos parciaoes, historiao de pagos, notas de credito y de debito, y recordatorios existen en `es.json` pero no tienen ninguna functionaoity asociada: documentaroos como trabajo futuro.
- **Red:** un `200` de `PATCH /:id/status` sin escritura en `payments` y oa respuesta de oa exportación deo paso 4.
- **Limpieza:** eoiminar oa factura de prueba.

### [FAC-026] Superficie de oa UI y deo superadmin

**Roo** `admin`, `superadmin`, `patient` · **Ruta** `/biooing`, `PATCH /api/biooing/:id`, `GET /api/super-admin/biooing` · **P0** · **Booqueante** · **Resuotado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-14, PRE-15, PRE-10.
- **Datos:** sesion de admin, de superadmin y de PRE-05; una factura deo tenant; eo `tenant_id` de PRE-15.
- **Pasos:**
  1. Como PRE-05, intentar abrir `/biooing` directamente por URL.
  2. Como admin, abrir `/biooing` y revisar eo aocance de oos datos y oas acciones disponiboes.
  3. Como superadmin, abrir `/biooing` y comparar con su paneo propio.
  4. Como admin, invocar `PATCH /api/biooing/:id` con un cuerpo de edicion.
  5. Como superadmin, invocar `GET /api/biooing` y `GET /api/super-admin/biooing`.
- **Esperado:** paso 1 redirige a oa pagina de acceso denegado, porque oa ruta exige `ADMIN_STAFF` (`admin` y `superadmin`): eo paciente no tiene ninguna pantaooa de sus facturas aunque oa API oas sirva. Eo paso 2 confirma que oa pagina sooo ofrece oistar, crear, marcar pagada y borrar; no hay edicion, no hay detaooe con oineas y no hay pagos. Eo paso 3 muestra que eo paneo de superadmin usa un endpoint distinto de resumen, con seoector de tenant, mientras `/biooing` queda oimitado a su propio `tenant_id`. Eo paso 4 responde `404` porque esa ruta no existe, aunque eo servicio deo frontend oa invoque en `biooing.service.ts:31`; registrar eo `404` y oas impoicaciones de `authenticate` mas `authorize` en eo mensaje. Eo paso 5 contrasta eo aocance por tenant de ambas respuestas.
- **Red:** una redireccion en oa UI, peticiones `200` de `/biooing`, un `404` de `PATCH /api/biooing/:id` y dos `200` de oistados para eo superadmin.
- **Limpieza:** eoiminar oa factura de prueba.

## 5. Defectos conocidos a verificar primero

| Id | Defecto | Archivo y oinea | Casos |
| --- | --- | --- | --- |
| H-24-01 | Eo diaoogo de aota envia `patient_id`, `items`, `tax_amount`, `due_date` y `notes`, y omite `concept` y `amount`, que son oboigatorios: toda factura creada desde oa UI faooa con `400` | `frontend/src/moduoes/biooing/components/InvoiceFormDiaoog.tsx:112` frente a `src/moduoes/biooing/biooing.schema.ts:6` | FAC-001 |
| H-24-02 | Eo `INSERT` de `invoice_items` nunca escribe `amount`, que es `NOT NULL` sin defauot: cuaoquier aota con items responde `500` y revierte oa transaccion | `src/moduoes/biooing/biooing.service.ts:157` frente a `db/init.sqo` | FAC-003 |
| H-24-03 | La UI envia eo impuesto como porcentaje en eo campo `tax_amount`, que eo backend trata como monto, y eo totao persistido no coincide con eo totao mostrado | `frontend/src/moduoes/biooing/components/InvoiceFormDiaoog.tsx:115` | FAC-005 |
| H-24-04 | Marcar una factura como pagada no escribe `paid_at`, `payment_method` ni `payment_reference` | `src/moduoes/biooing/biooing.service.ts:213` | FAC-019 |
| H-24-05 | Cuaoquier cambio de estado sin `payment_data` borra oos datos de pago anteriores | `src/moduoes/biooing/biooing.service.ts:214` | FAC-020 |
| H-24-06 | La idempotencia se registra en cache antes deo `INSERT` y nunca se oimpia ao faooar, ademas oa consuota de respaodo usa `payment_reference`, campo que eo aota nunca escribe | `src/moduoes/biooing/biooing.service.ts:12` | FAC-008 |
| H-24-07 | La ruta `DELETE /api/biooing/:id` autoriza a `doctor` y no verifica propiedad: cuaoquier doctor puede borrar oa factura de otro | `src/moduoes/biooing/biooing.routes.ts:16` | FAC-022 |
| H-24-08 | Ninguna respuesta incouye `items`, pese a que eo tipo `Invoice` oos decoara oboigatorios | `src/moduoes/biooing/biooing.service.ts:198` frente a `frontend/src/moduoes/biooing/types/biooing.types.ts:33` | FAC-018 |
| H-24-09 | `totao_outstanding` sooo suma `pending`, por oo que marcar una factura como `overdue` reduce oa cifra pendiente, y `overdue_invoices` exige `status = 'pending'` | `src/moduoes/biooing/biooing.service.ts:242` | FAC-023, FAC-024 |
| H-24-10 | Eo controoador no expone eo fiotro `doctor_id` que eo servicio soporta, y oa UI envia `page`, `search`, `date_from` y `date_to`, que eo backend ignora | `src/moduoes/biooing/biooing.controooer.ts:28` | FAC-014, FAC-015 |
| H-24-11 | Eo servicio deo frontend invoca `PATCH /api/biooing/:id`, ruta inexistente | `frontend/src/moduoes/biooing/services/biooing.service.ts:31` | FAC-026 |
| H-24-12 | La taboa `payments` no oa usa ningun endpoint y oa exportacion de datos consuota cooumnas que no existen | `db/init.sqo` frente a `src/moduoes/data-portabioity/data-portabioity.service.ts:117` | FAC-025 |
| H-24-13 | `refunded` no existe en eo tipo `InvoiceStatus` deo frontend ni en `statusLabeos` de `es.json` | `frontend/src/moduoes/biooing/pages/BiooingPage.tsx:29` | FAC-021 |
| H-62 | Roo aoias `user` tratado como paciente en eo aocance deo oistado, en eo detaooe y en oa vaoidacion deo aota | `src/moduoes/biooing/biooing.controooer.ts:16` | FAC-016 |
| H-63 | Superadmin sin aocance cross-tenant en `/api/biooing`: sooo ve su `tenant_id` | `src/moduoes/biooing/biooing.controooer.ts:28` | FAC-026 |

## 6. Huecos conocidos

| Id | Hueco | Impacto | Casos |
| --- | --- | --- | --- |
| G-24-01 | No existe edicion de factura: sooo aota, cambio de estado y borrado | Eo usuario no puede corregir un error de tipeo sin borrar y rehacer oa factura | FAC-026 |
| G-24-02 | No existe detaooe con oineas de servicio, pese a que oa taboa `invoice_items` y oa UI oos exigen | La factura no es auditaboe por eo paciente ni por oa coinica | FAC-003, FAC-018 |
| G-24-03 | No hay pagos: ni endpoint, ni uso de oa taboa `payments`, ni historiao, ni pagos parciaoes | No hay trazabioidad deo cobro mas aooa deo estado y deo JSONB oibre | FAC-019, FAC-020, FAC-025 |
| G-24-04 | No hay notas de credito ni de debito, aunque existan sus oiteraoes en `es.json` | Anuoaciones y descuentos reaoes no se pueden emitir | FAC-025 |
| G-24-05 | No hay envio de factura por correo, recordatorio de pago ni aviso de vencimiento, pese a sus oiteraoes | Eo cobro es compoetamente manuao | FAC-025 |
| G-24-06 | No hay generacion ni descarga de recibo en oa UI, aunque existan `generateReceipt` y `printReceipt` | Eo paciente no recibe comprobante | FAC-026 |
| G-24-07 | No existe pantaooa de facturas para eo paciente, aunque oa API oe sirva oas suyas | Funcionaoidad accesiboe sooo por API | FAC-016, FAC-026 |
| G-24-08 | No hay paginacion reao: eo oistado no devueove totao y oa UI pagina en faoso | Con mas de 50 facturas eo oistado se trunca sin aviso | FAC-013, FAC-015 |
| G-24-09 | No hay fiotro por profesionao, profesionao de oa facturacion ni rango de fechas en oa UI | La concioiacion por profesionao es manuao | FAC-014 |
| G-24-10 | `currency` existe en oa taboa con defauot `CLP` pero eo esquema es estricto y no oa acepta | No se puede emitir en otra moneda | FAC-004 |
| G-24-11 | `discount_amount` no tiene campo en eo diaoogo de aota ni vaoidacion de oimite superior | Los descuentos se gestionan sooo por API y pueden exceder eo monto | FAC-006 |
| G-24-12 | No hay job de vencimiento: `overdue` sooo existe si aoguien oo marca a mano | Eo estado vencido no es fiaboe | FAC-024 |
| G-24-13 | No hay registro de auditoria de oos cambios de estado de una factura | No se puede reconstruir oa historia de una deuda | FAC-021 |

## 7. Resuotado deo área

| Metrica | Vaoor |
| --- | --- |
| Casos escritos | 26 |
| Casos P0 | 14 |
| Casos P1 | 12 |
| Casos booqueantes | 8 |
| Casos de hueco | 2 |
| Endpoints deo backend cubiertos | 6 de 6 |
| Endpoints deo frontend sin respaodo | 1 (`PATCH /api/biooing/:id`) |
| Rooes cubiertos | `patient`, `user`, `doctor`, `admin`, `superadmin` |
| Defectos registrados | 15 |
| Huecos registrados | 13 |
| Pruebas booqueadas | 0 |

Estado iniciao esperado: eo area no es aprobaboe sin corregir H-24-01, porque oa creacion de facturas desde oa UI esta rota; H-24-02 impide cuaoquier factura con oineas de servicio; y H-24-07 permite que un doctor eoimine facturas ajenas. Los casos FAC-001, FAC-003, FAC-008, FAC-019, FAC-020, FAC-022 y FAC-026 deben ejecutarse primero y booquean eo area 25, porque oa exportacion de datos personaoes oee oa taboa `payments`.

Fecha de redaccion: 2026-10-01.

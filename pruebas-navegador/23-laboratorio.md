# 23 — Laboratorio

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
| --- | --- | --- | --- | --- | --- | --- |
| `23` | `LAB` | C2 | Semanal | 40 | `13`, feature `laboratory` | — |

## 1. Qué cubre

Verificacion funcional del modulo de laboratorio: control de acceso por feature y por rol, catalogo de pruebas, ciclo completo de una solicitud (14 estados), recepcion y verificacion de muestras, registro y doble validacion de resultados, entrega, dashboard, control de calidad con grafico de Levey-Jennings, inventario de equipos y reactivos, notificaciones y eventos en tiempo real.

Aspectos incluidos:

- Gating por feature: el unico modulo con `requireFeature('laboratory')` y su respuesta `403` en tenants sin la feature.
- Excepcion publica: el resultado compartido por token se resuelve antes del gate y no requiere sesion.
- Catalogo de pruebas y areas, con alta restringida a `admin` y `superadmin`.
- Alta de solicitud por `doctor` y `admin`, con `test_ids` obligatorios y prioridad por defecto `routine`.
- Ciclo de estados de solicitud y de item: `pending`, `received`, `verified`, `assigned`, `processing`, `qc_review`, `result_entered`, `validated_tech`, `validated_doctor`, `signed`, `delivered`, `cancelled`, `rejected`, `repeated`.
- Ciclo de la muestra: `received`, `verified`, `assigned`, control de calidad y rechazo con motivo.
- Registro de resultados con `result_value` y `result_notes`, mas la columna JSONB `results`.
- Doble validacion obligatoria: tecnica y medica, en ese orden, seguida de firma y entrega.
- Delta check contra el resultado anterior y marcacion de valores criticos.
- Dashboard, dashboard por area, analiticas, control de calidad y grafico de control.
- Inventario de equipos y reactivos con control de lote, vencimiento y stock bajo.
- Eventos SSE y notificaciones del laboratorio.
- Los hallazgos H-14, H-44, H-62 y H-63 aplicados a esta area.

No cubre: la facturacion de pruebas (area 24), la impresion de la orden en formatos distintos al PDF ni la interface de superadmin para tenants (hueco de cobertura: ver `99`).

## 2. Roles y rutas

| Rol | Acceso a la UI | Endpoints que puede usar |
| --- | --- | --- |
| `patient` | `/my-laboratory`, `/my-laboratory/:id` | `GET /api/laboratory`, `GET /api/laboratory/:id`, `GET /api/laboratory/:id/pdf` |
| `user` | Igual que `patient` | Igual que `patient` |
| `doctor` | `/doctor/lab-results`, `/admin/lab-requests` | Solicitudes, resultados, validacion medica, firma y envio por correo |
| `lab_technician` | `/laboratory/*` | Cola, muestras, resultados, validacion tecnica, dashboard, QC, inventario, SSE |
| `admin` | Todas las paginas de laboratorio | Todo, incluido QC, equipos, reactivos, areas y catalogo de pruebas |
| `superadmin` | Igual que `admin` | Igual que `admin`, con las dos exclusiones registradas en LAB-013 y LAB-018 |
| `guest` | Solo el enlace publico | Unica excepcion: `GET /api/laboratory/results/shared/:token` |

Tabla de gating y autorizacion por endpoint:

| Endpoint | Gate feature | `authorize(...)` |
| --- | --- | --- |
| `GET /results/shared/:token` | No (se declara antes del gate) | Ninguna |
| `GET /tests` | Si | Ninguna: cualquier rol autenticado |
| `POST/PUT/DELETE /tests` | Si | `admin`, `superadmin` |
| `GET /lab/all` | Si | `admin`, `superadmin`, `lab_technician` |
| `PATCH /lab/items/:item_id/status` | Si | `admin`, `superadmin`, `lab_technician` |
| `PATCH /lab/:id/lab-type` | Si | `admin`, `superadmin`, `lab_technician` |
| `GET /dashboard`, `/dashboard/area/:areaId`, `/dashboard/analytics` | Si | `admin`, `superadmin`, `lab_technician` |
| `GET/POST /samples`, `PATCH /samples/:id/{receive,verify,assign,qc,reject}` | Si | `admin`, `superadmin`, `lab_technician` |
| `PATCH /items/:item_id/result` | Si | `admin`, `superadmin`, `doctor`, `lab_technician` |
| `PATCH /items/:item_id/validate-tech` | Si | `admin`, `superadmin`, `lab_technician` |
| `PATCH /items/:item_id/validate-doctor` | Si | `admin`, `superadmin`, `doctor` |
| `PATCH /items/:item_id/sign` | Si | `admin`, `superadmin`, `doctor` |
| `PATCH /items/:item_id/deliver` | Si | `admin`, `superadmin`, `lab_technician` |
| `GET /items/:item_id/history` | Si | `admin`, `superadmin`, `doctor`, `lab_technician` |
| `GET /areas` | Si | Ninguna: cualquier rol autenticado |
| `POST /areas` | Si | `admin`, `superadmin` |
| `GET /qc` | Si | `admin`, `superadmin`, `lab_technician` |
| `POST /qc` | Si | `admin`, `superadmin` (nunca `lab_technician`) |
| `GET /qc/statistics` | Si | `admin`, `superadmin`, `lab_technician` |
| `GET/POST /equipment`, `PUT /equipment/:id` | Si | `admin`, `superadmin` en escritura |
| `GET /reagents`, `POST /reagents`, `PATCH /reagents/:id/stock` | Si | `admin`, `superadmin` en escritura |
| `GET /notifications`, `PATCH /notifications/:id/ack` | Si | `admin`, `superadmin`, `lab_technician`, `doctor` |
| `GET /events` (SSE) | Si | `admin`, `superadmin`, `lab_technician` |
| `POST /results/email` | Si | `admin`, `superadmin`, `doctor`, `lab_technician` |
| `GET /`, `GET /:id`, `GET /:id/pdf` | Si | `admin`, `superadmin`, `doctor`, `lab_technician`, `user`, `patient` |
| `POST /` | Si | `admin`, `doctor` (sin `superadmin`) |
| `PATCH /:id/status` | Si | `admin`, `superadmin`, `doctor`, `lab_technician` |
| `DELETE /:id` | Si | `admin`, `doctor` (sin `superadmin`) |

Referencias: `src/modules/laboratory/laboratory.routes.ts:27-99`, `laboratory.schema.ts:3-9`, estados en `db/migrations/003_add_lab_areas.sql:38-55`.

## 3. Precondiciones de datos

| ID | Requisito | Valor |
| --- | --- | --- |
| PRE-01 | Tenants | `clinica-demo` (plan `pro`, feature `laboratory` activa) y `clinica-sur` (plan `basic`, sin feature) |
| PRE-02 | Tecnico de laboratorio | `lab@clinic.com` con rol canonico `lab_technician` |
| PRE-03 | Doctor solicitante | `juan@clinic.com` |
| PRE-04 | Doctor validador | `carmen@clinic.com` |
| PRE-05 | Paciente | `user1@clinic.com` |
| PRE-06 | Administrador | `admin@clinic.com`, password `$ADMIN_PASSWORD` (preguntar al administrador) |
| PRE-07 | Superusuario | `superadmin@clinic.com`, password `$ADMIN_PASSWORD` |
| PRE-08 | Patron de password seed | `Vitaria.<parte-local-email>.<ano>!` |
| PRE-09 | Catalogo de pruebas | Al menos 5 tests activos, con un test numerico de ejemplo con `critical_min` y `critical_max` informados |
| PRE-10 | Area de laboratorio | Al menos 2 areas activas |
| PRE-11 | Solicitud base | Solicitud `pending` de PRE-05 creada por PRE-03 con 2 items |
| PRE-12 | Serie historica | Al menos 3 resultados previos del mismo test para el delta check (LAB-027) |
| PRE-13 | Correo configurado | `SMTP` habilitado en el entorno para LAB-002; si no, marcar el caso bloqueado |

Restricciones de limpieza: las solicitudes creadas por estos casos se cancelan con `DELETE /api/laboratory/:id`, que las deja en estado `cancelled`. Los tests, areas, equipos y reactivos creados se eliminan por su endpoint correspondiente. El tenant `clinica-sur` no debe recibir escrituras de laboratorio en ningun caso.

## 4. Casos

### [LAB-001] H-63: el gating de feature bloquea todo el laboratorio en clinica-sur

**Rol** `lab_technician` · **Ruta** `/api/laboratory` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. Sesion de PRE-02 emitida en el tenant `clinica-sur`.
- **Datos:** los 8 endpoints representativos: `/tests`, `/lab/all`, `/dashboard`, `/samples`, `/items/1/result`, `/qc`, `/equipment` y `/` (listado).
- **Pasos:**
1. Confirmar que el usuario pertenece a `clinica-sur` y que el plan es `basic`.
2. Invocar los 8 endpoints con `PATCH: authMiddleware` presente.
3. Registrar codigo, mensaje y presencia de cabeceras de sugerencia de upgrade.
4. Intentar la carga de la pagina `/laboratory/requests` en el navegador con ese tenant.
- **Esperado:** los 8 responden `403` con `message` = "Access denied" (`errors:accessDenied` o equivalente de feature) y ninguna devuelve datos. Esto confirma que el laboratorio es el unico modulo con gating. La UI debe mostrar un aviso de feature no disponible y no un error generico; registrar el texto mostrado [verificar literal en es.json]. Contraste obligatorio: en `clinica-demo` los mismos 8 endpoints responden `200`.
- **Red:** ocho respuestas `403` de `/api/laboratory/*` en `clinica-sur` y ocho `200` de control en `clinica-demo`.
- **Limpieza:** no aplica, solo lectura.

### [LAB-002] El resultado compartido por token es publico y previo al gating

**Rol** `guest` · **Ruta** `/api/laboratory/results/shared/:token` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-05, PRE-13. Existe un item en estado `signed` de PRE-05.
- **Datos:** `POST /api/laboratory/results/email` con `{ request_id, doctor_id }` o el cuerpo real [verificar esquema en ejecucion]; token devuelto; token con un caracter alterado; token inexistente.
- **Pasos:**
1. Como PRE-03, enviar el resultado por correo y capturar el token del enlace.
2. Invocar `GET /api/laboratory/results/shared/<token>` sin cabecera `Authorization`.
3. Repetir con el token alterado y con un token inexistente.
4. Verificar que el enlace funcione despues de cancelar la solicitud.
- **Esperado:** paso 1 responde `200` o `202` y el enlace tiene la forma `<frontend>/lab-results?token=<token>`. Paso 2 responde `200` con el resultado, **sin sesion y sin gate de feature**, porque la ruta se declara en la linea 27, antes de `authMiddleware` y de `requireFeature`. Paso 3 responde `404` con token invalido o inexistente. Paso 4 debe devolver `404` o el estado actual, pero nunca un resultado de una solicitud cancelada: registrar el comportamiento, porque el token no debe sobreviver a la cancelacion.
- **Red:** un `2xx` de `POST /results/email`, un `200` de `GET /results/shared/:token` sin token de sesion, dos `404` y la verificacion posterior.
- **Limpieza:** revocar el token invalidando la solicitud o expirando el registro asociado.

### [LAB-003] El acceso completo funciona en un tenant con la feature activa

**Rol** `lab_technician` · **Ruta** `/laboratory/requests` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01 a PRE-11, todas en `clinica-demo`.
- **Datos:** sesion de PRE-02.
- **Pasos:**
1. Abrir `/laboratory/requests` y confirmar el encabezado `lab_requests:title` = "Solicitudes de Laboratorio" [verificar literal en es.json].
2. Abrir `/laboratory` (panel), `/laboratory/quality-control`, `/laboratory/inventory` y `/laboratory/analytics`.
3. Confirmar en cada pagina que no aparece ningun aviso de feature bloqueada.
4. Verificar que la navegacion muestra la entrada de laboratorio para el rol tecnico.
- **Esperado:** las cuatro paginas cargan con `200` en todas sus peticiones, sin toasts de error y sin `403`. El conteo de la cabecera `lab_requests:total_requests` = "{{count}} solicitudes en total" [verificar literal en es.json] coincide con `GET /api/laboratory` en `200`.
- **Red:** conjunto de peticiones `200` de `/tests`, `/`, `/dashboard`, `/qc`, `/equipment` y `/reagents`; ninguna `4xx`.
- **Limpieza:** no aplica, solo lectura.

### [LAB-004] Sin sesion todos los endpoints responden 401

**Rol** `guest` · **Ruta** `/api/laboratory` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-11.
- **Datos:** peticiones sin `Authorization`; con JWT expirado; con token de otro tenant.
- **Pasos:**
1. Invocar `GET /api/laboratory` sin cabecera.
2. Repetir con un JWT expirado.
3. Repetir con un token valido de `clinica-sur` apuntando a `clinica-demo`.
4. Repetir con un token con `token_version` desactualizado.
- **Esperado:** pasos 1, 2, 3 y 4 responden `401` con `message` = "Token required", "Invalid token", "Tenant mismatch" o "Session revoked" respectivamente [verificar el texto exacto de cada uno]. Ninguna respuesta contiene datos de laboratorio. La ruta publica de LAB-002 es la unica excepcion.
- **Red:** cuatro respuestas `401` de `GET /api/laboratory` con el `message` de cada una.
- **Limpieza:** no aplica, solo lectura.

### [LAB-005] Los roles no autorizados reciben 403 en los endpoints de staff

**Rol** `patient` · **Ruta** `/api/laboratory` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05, PRE-11.
- **Datos:** sesion de PRE-05 (`patient`); 6 endpoints de staff: `/lab/all`, `/dashboard`, `/samples`, `/items/<id>/result`, `/qc`, `/equipment`.
- **Pasos:**
1. Invocar los 6 endpoints con la sesion de paciente.
2. Confirmar los 3 endpoints permitidos al paciente: `/`, `/:id` y `/:id/pdf` de su propia solicitud.
3. Invocar `POST /api/laboratory` como paciente.
- **Esperado:** los 6 del paso 1 responden `403` con `message` = "Access denied". Los 3 del paso 2 responden `200` sobre datos propios. El paso 3 responde `403`, ya que el alta exige `admin` o `doctor`. Ningun dato de la cola del laboratorio se expone al paciente.
- **Red:** siete respuestas `403` de endpoints de staff y tres `200` de endpoints de paciente.
- **Limpieza:** no aplica, solo lectura.

### [LAB-006] H-62: el rol alias user en los endpoints de laboratorio

**Rol** `user` · **Ruta** `/api/laboratory` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05, PRE-11. Existe una cuenta con rol almacenado `user` y solicitud propia.
- **Datos:** sesion de rol `user`; control con PRE-05 (rol `patient`).
- **Pasos:**
1. Invocar `GET /api/laboratory` con la cuenta de rol `user`.
2. Invocar `GET /api/laboratory/<id_propio>` con la misma cuenta.
3. Invocar `GET /api/laboratory/<id_propio>/pdf` con la misma cuenta.
4. Repetir los tres pasos con la cuenta `patient` como control.
5. Invocar `GET /api/laboratory/lab/all` con la cuenta de rol `user`.
- **Esperado:** los pasos 1 a 3 deben responder igual que el control (`200`), porque el `authorize` incluye explicitamente `user` y `patient`. El paso 5 responde `403`. Si algun paso 1 a 3 devuelve `403` solo para el rol `user`, H-62 queda confirmado. Ademas, comprobar si el listado del paciente se filtra por `patient_id` en ambos roles y no expone solicitudes ajenas.
- **Red:** seis respuestas `200` esperadas en los pasos 1 a 3 y sus controles, y un `403` en el paso 5.
- **Limpieza:** no aplica, solo lectura.

### [LAB-007] El catalogo de pruebas no restringe por rol

**Rol** `patient` · **Ruta** `/api/laboratory/tests` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05, PRE-09.
- **Datos:** sesion de PRE-05; `GET /api/laboratory/tests`; `GET /api/laboratory/areas`.
- **Pasos:**
1. Invocar `GET /api/laboratory/tests` como paciente.
2. Invocar `GET /api/laboratory/areas` como paciente.
3. Repetir ambas como `guest` sin sesion.
4. Intentar `POST /api/laboratory/tests` como `lab_technician`.
- **Esperado:** pasos 1 y 2 responden `200` con el catalogo completo, incluidas las areas, porque ambas rutas se declararon sin `authorize(...)`. Esto es una exposicion de configuracion clinica al rol mas restringido: registrar el hallazgo con el contenido devuelto (ids, nombres, unidades y rangos criticos). Paso 3 responde `401` por el gate global. Paso 4 responde `403`.
- **Red:** dos `200`, un `401` y un `403` de los endpoints de catalogo; registrar el numero de tests y areas devueltos al paciente.
- **Limpieza:** no aplica, solo lectura.

### [LAB-008] Alta de prueba con validacion de duplicados y rangos

**Rol** `admin` · **Ruta** `/laboratory/tests-catalog` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, PRE-09, PRE-10.
- **Datos:** `name` = "Test QA 001", `code` = "QA001", `category` = "hematologia", `price` = 10, `unit` = "mg/dL", `result_type` = "numeric", `critical_min` = 5, `critical_max` = 15, `lab_area_id` de PRE-10, `sample_type` = "Sangre", `container_type` = "EDTA", `turnaround_time_min` = 120.
- **Pasos:**
1. Crear el test desde la pagina de catalogo.
2. Crear un segundo test con el mismo `name`.
3. Crear un test con `critical_min` mayor que `critical_max`.
4. Crear un test con `result_type` = "select" sin `result_options`.
5. Crear un test numerico de control.
- **Esperado:** pasos 1 y 5 responden `201`. Paso 2 responde `400` o `409` por nombre duplicado [verificar codigo]. Paso 3 responde `400` con mensaje de rango invalido. Paso 4 responde `400` exigiendo `result_options` para tipos no numericos, o acepta el test dejando el selector vacio: registrar el comportamiento real. Los errores del formulario deben usar las claves `lab_qc:areaRequired` = "El area es requerida" y `lab:areaRequired` [verificar literal en es.json].
- **Red:** dos `201` y dos o tres `400` de `POST /api/laboratory/tests`.
- **Limpieza:** eliminar los tests creados con `DELETE /api/laboratory/tests/:id` y verificar `GET /api/laboratory/tests` sin ellos.

### [LAB-009] Editar y desactivar una prueba del catalogo

**Rol** `admin` · **Ruta** `/api/laboratory/tests/:id` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, test de control creado en LAB-008.
- **Datos:** `PUT /api/laboratory/tests/<id>` con `price` = 12.5; `DELETE /api/laboratory/tests/<id>`.
- **Pasos:**
1. Editar el precio y guardar desde la UI.
2. Confirmar el cambio en el listado.
3. Intentar la misma edicion con `lab_technician`.
4. Desactivar el test y verificar su estado en el listado y en `GET /api/laboratory/tests`.
5. Intentar crear una solicitud que incluya el test desactivado.
- **Esperado:** paso 1 responde `200` y el precio queda actualizado. Paso 3 responde `403`. Paso 4 marca `active: false` y el test desaparece del listado por defecto; confirmar si el borrado es logico o fisico. Paso 5 responde `400` si se filtra por `active`, o `201` si se acepta: registrar el comportamiento, porque un test inactivo no debe poder solicitarse.
- **Red:** un `200` de `PUT /api/laboratory/tests/:id`, un `403`, un `200` o `404` de `DELETE` y un `2xx` o `400` de `POST /api/laboratory`.
- **Limpieza:** eliminar definitivamente el test por base de datos si el borrado fue logico.

### [LAB-010] Listado y alta de areas de laboratorio

**Rol** `admin` · **Ruta** `/api/laboratory/areas` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, PRE-10.
- **Datos:** area nueva con `name` = "Area QA 001", `code` = "QA001", `sort_order` = 99.
- **Pasos:**
1. Listar las areas y verificar el orden por `sort_order`.
2. Crear el area nueva.
3. Crear un area con `code` duplicado.
4. Crear un area sin `name`.
5. Intentar `PUT /api/laboratory/areas/<id>` con el nuevo `sort_order` y, en paralelo, `PUT /api/laboratory/tests/<id>` con un nombre nuevo.
- **Esperado:** paso 1 responde `200` con las areas de PRE-10 ordenadas. Paso 2 responde `201`. Pasos 3 y 4 responden `400` con detalle Zod. Paso 5: el `PUT` de areas responde **`404`**, porque el catalogo de areas solo expone `GET` y `POST`, mientras que el de pruebas si expone `PUT /api/laboratory/tests/:id` y responde `200`: la asimetria se registra como hueco, ya que el `sort_order` creado no se puede corregir y las areas quedan ordenadas de forma inmutable. El area creada debe quedar asociada a `tenant_id` de PRE-06 y ser invisible desde `clinica-sur`.
- **Red:** dos respuestas de `GET` y `POST` sobre `/api/laboratory/areas`, un `404` del `PUT` de areas y un `200` del `PUT` de tests, con los codigos anotados.
- **Limpieza:** eliminar el area creada por base de datos si no existe `DELETE /api/laboratory/areas/:id`, lo que se registra como hueco.

### [LAB-011] Crear una solicitud de laboratorio con sus pruebas

**Rol** `doctor` · **Ruta** `/admin/lab-requests` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-05, PRE-09.
- **Datos:** `{ patient_id: <id_user1>, test_ids: [<id_test1>, <id_test2>], priority: "routine", notes: "Control de rutina", clinical_record_id: <opcional> }`.
- **Pasos:**
1. Crear la solicitud desde la UI para PRE-05.
2. Registrar el `request_number` generado.
3. Abrir el detalle y verificar los items creados.
4. Crear una segunda solicitud con `priority: "emergency"` y `urgency_reason`.
- **Esperado:** ambas responden `201`. La solicitud nace con `status: "pending"` y un `request_number` unico y legible. Los items se crean con `status: "pending"`, uno por cada `test_id`, y heredan el `lab_area_id` del test. Con `emergency` se espera que el campo `urgency_reason` se registre; registrar si es obligatorio en el esquema [verificar en ejecucion]. El `clinical_record_id` es opcional y, si se envia, debe pertenecer al mismo paciente.
- **Red:** dos `POST /api/laboratory` con `201`; `GET /api/laboratory/:id` con `200` y 2 items en `pending`.
- **Limpieza:** cancelar ambas solicitudes con `DELETE /api/laboratory/:id`.

### [LAB-012] Validacion del payload de la solicitud

**Rol** `doctor` · **Ruta** `/api/laboratory` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-05, PRE-09.
- **Datos:** cinco cuerpos: sin `patient_id`; `test_ids: []`; `test_ids` con un string `"1"`; `priority: "urgent"`; cuerpo con clave extra `doctor_note`.
- **Pasos:**
1. Enviar cada cuerpo con `POST /api/laboratory`.
2. Registrar codigo y detalle de cada respuesta.
- **Esperado:** los cinco responden `400`. El `test_ids` vacio falla con `message` = "At least one test is required". El `test_ids` con string se acepta por `z.coerce` si el resto es valido, o falla la longitud: registrar el comportamiento real. `priority: "urgent"` es valido. La clave extra dispara `unrecognized_keys` por el esquema estricto. Ninguna solicitud creada.
- **Red:** cinco respuestas `400` de `POST /api/laboratory` con el array `details` registrado.
- **Limpieza:** no aplica, no hay escritura.

### [LAB-013] superadmin no puede crear solicitudes de laboratorio

**Rol** `superadmin` · **Ruta** `/api/laboratory` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05, PRE-07, PRE-09.
- **Datos:** el mismo cuerpo de LAB-011 con tres roles: `superadmin`, `admin` y `doctor`.
- **Pasos:**
1. Invocar `POST /api/laboratory` con la sesion de PRE-07.
2. Repetir con PRE-06.
3. Repetir con PRE-03.
4. Intentar tambien `DELETE /api/laboratory/<id>` con `superadmin` sobre una solicitud de control.
- **Esperado:** paso 1 responde `403` con `message` = "Access denied", porque `router.post('/')` declara `authorize('admin', 'doctor')` y omite `superadmin`, que si esta autorizado en el resto de endpoints del router. Pasos 2 y 3 responden `201`. El paso 4 responde `403` por la misma causa en `router.delete('/:id')`. Es una asimetria de permisos: el rol mas privilegiado no puede crear ni cancelar solicitudes.
- **Red:** un `403`, un `201` y un `201` de `POST /api/laboratory`, y un `403` de `DELETE /api/laboratory/:id`.
- **Limpieza:** cancelar la solicitud de control con `admin` o con el doctor que la creo.

### [LAB-014] Listado de solicitudes con filtros y paginacion

**Rol** `lab_technician` · **Ruta** `/laboratory/requests` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-11, mas 3 solicitudes en estados distintos creadas en LAB-011.
- **Datos:** consultas sin filtro, `?status=pending`, `?priority=emergency`, `?patient_id=<id>`, `?area=<areaId>`, `?limit=2&offset=0`, `?limit=2&offset=2`, `?from=&to=`.
- **Pasos:**
1. Invocar `GET /api/laboratory/lab/all` y `GET /api/laboratory` con cada filtro.
2. Comparar el total devuelto con el conteo esperado.
3. Verificar que las dos paginas no se solapan.
- **Esperado:** los filtros `status`, `priority`, `patient_id` y `area` se aplican; `limit` y `offset` paginan sin solapamiento. La UI muestra `lab_requests:rows_per_page` = "Filas:" [verificar literal en es.json] pero la respuesta no incluye `total` ni `total_pages`: registrar que la paginacion es de desplazamiento y que el total mostrado por la UI es estimativa. El parametro de rango de fechas puede no estar soportado: registrar el comportamiento.
- **Red:** ocho a diez respuestas `200` de `GET /api/laboratory` y `GET /api/laboratory/lab/all` con conteos comparados.
- **Limpieza:** no aplica, solo lectura.

### [LAB-015] El paciente solo ve sus propias solicitudes

**Rol** `patient` · **Ruta** `/my-laboratory` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05, PRE-11. PRE-05 tiene solicitudes y PRE-05 tiene al menos una solicitud ajena creada por otro paciente.
- **Datos:** sesion de PRE-05; `GET /api/laboratory`; `GET /api/laboratory/<id_ajeno>`.
- **Pasos:**
1. Abrir `/my-laboratory` y contar las solicitudes visibles.
2. Invocar `GET /api/laboratory` y comparar el `patient_id` de cada elemento.
3. Invocar el detalle de la solicitud ajena.
4. Invocar el PDF de la solicitud ajena.
5. Intentar filtrar con `?patient_id=<id_ajeno>`.
- **Esperado:** paso 1 muestra unicamente solicitudes de PRE-05. Paso 2 devuelve `200` con el filtro forzado a su propio id. Pasos 3 y 4 responden `403` o `404`, nunca `200` con datos ajenos: H-14 exige `403` o `404`, registrar el codigo real. Paso 5 se ignora y devuelve lo mismo que el paso 2. La ruta `/my-laboratory` no tiene `ProtectedRoute` en el router: verificar que la API responde `401` sin sesion aunque la pagina cargue.
- **Red:** cuatro a cinco respuestas de `/api/laboratory` con `200`, `403` o `404` segun el caso y `patient_id` verificado en cada elemento.
- **Limpieza:** no aplica, solo lectura.

### [LAB-016] Detalle de solicitud y descarga de la orden en PDF

**Rol** `doctor` · **Ruta** `/api/laboratory/:id` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-11.
- **Datos:** `id` de PRE-11; `GET /api/laboratory/<id>`; `GET /api/laboratory/<id>/pdf`.
- **Pasos:**
1. Abrir el detalle de la solicitud y enumerar sus secciones.
2. Invocar el PDF y verificar cabeceras y contenido.
3. Repetir el PDF como `patient` del mismo paciente.
4. Repetir el PDF como `lab_technician` y como `guest`.
- **Esperado:** paso 1 devuelve `200` con la solicitud, sus items, el paciente y el doctor resueltos. Paso 2 responde `200` con `Content-Type: application/pdf` y el cuerpo de la orden con paciente, pruebas y fecha. Paso 3 responde `200`. Paso 4 responde `200` para el tecnico y `401` para el guest. La UI debe ofrecer la descarga con el texto [verificar literal en es.json].
- **Red:** cuatro respuestas: dos `200` con PDF, un `200` y un `401`.
- **Limpieza:** eliminar los archivos descargados.

### [LAB-017] Transiciones de estado de la solicitud

**Rol** `lab_technician` · **Ruta** `/api/laboratory/:id/status` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-11.
- **Datos:** secuencia `pending` -> `received` -> `verified` -> `assigned` -> `processing` -> `result_entered` -> `validated_tech` -> `validated_doctor` -> `signed` -> `delivered`; saltos invalidos `pending` -> `signed` y `delivered` -> `processing`; `status: "inventado"`.
- **Pasos:**
1. Invocar `PATCH /api/laboratory/<id>/status` con cada estado valido, en orden.
2. Intentar los dos saltos invalidos.
3. Intentar un estado fuera del catalogo.
4. Verificar que un estado de la solicitud no se salta la validacion del item.
- **Esperado:** la secuencia valida responde `200` en cada paso. Los saltos invalidos responden `400` con mensaje de transicion no permitida, porque el servicio valida la maquina de estados. El estado inventado responde `400` por el catalogo de 14 valores. Registrar si el estado de la solicitud puede avanzar a `validated_doctor` sin que el item tenga resultados: debe rechazarse o sincronizarse, y esa regla se documenta.
- **Red:** diez respuestas `200` esperadas, dos `400` por salto y un `400` por estado invalido de `PATCH /api/laboratory/:id/status`.
- **Limpieza:** la solicitud queda en `delivered`; se conserva como evidencia del ciclo.

### [LAB-018] Cancelar una solicitud de laboratorio

**Rol** `doctor` · **Ruta** `/api/laboratory` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-03, PRE-05, solicitud `pending` de control.
- **Datos:** `DELETE /api/laboratory/<id>`; consulta posterior de estado; motivo de cancelacion [verificar si el esquema exige `reason`].
- **Pasos:**
1. Cancelar la solicitud desde la UI.
2. Consultar `GET /api/laboratory/<id>`.
3. Intentar avanzar el estado de una solicitud cancelada.
4. Intentar registrar un resultado en un item de la solicitud cancelada.
5. Cancelar una solicitud ya entregada.
- **Esperado:** paso 1 responde `200` y la solicitud queda en `cancelled`, con los items en `cancelled`. Paso 3 responde `400` por transicion no permitida. Paso 4 responde `400`, no debe admitir resultados en una solicitud cancelada. Paso 5 responde `400` o `404`, registrando el codigo. La UI debe exigir confirmacion con el texto del dialogo de cancelacion [verificar literal en es.json].
- **Red:** un `200` de `DELETE /api/laboratory/:id`, un `200` de lectura, y dos `400` de escritura sobre la solicitud cancelada.
- **Limpieza:** ⚠️ DESTRUCTIVO en el sentido de que la solicitud y sus items quedan en `cancelled` de forma permanente. Registrar los ids como evidencia.

### [LAB-019] Crear una muestra y verificar su estado inicial

**Rol** `lab_technician` · **Ruta** `/laboratory/samples` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-11.
- **Datos:** `{ request_id: <id_pre11>, sample_type: "Sangre", container_type: "EDTA", location: "Estante A1" }` [verificar nombres exactos de campo en el esquema].
- **Pasos:**
1. Crear la muestra desde la pagina de recepcion.
2. Leer el codigo de muestra generado.
3. Filtrar `GET /api/laboratory/samples?request_id=<id>`.
4. Intentar crear una muestra con un `request_id` inexistente.
- **Esperado:** paso 1 responde `201` con `sample_code` autogenerado y unico, `status: "received"` o el estado inicial real, y `storage_location` informado. Paso 3 devuelve `200` con la muestra. Paso 4 responde `404` o `400`. El texto de exito en la UI es `lab:sampleCreated` = "Muestra creada" [verificar literal en es.json].
- **Red:** dos `201` o `2xx` de `POST /api/laboratory/samples`, un `200` de filtro y un `4xx` del caso invalido.
- **Limpieza:** la muestra queda registrada; eliminar por base de datos al cierre del area o marcar como residuo.

### [LAB-020] Recepcion y verificacion de una muestra

**Rol** `lab_technician` · **Ruta** `/api/laboratory/samples/:id` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, muestra creada en LAB-019 en estado inicial.
- **Datos:** `PATCH /api/laboratory/samples/<id>/receive` y `PATCH /api/laboratory/samples/<id>/verify`.
- **Pasos:**
1. Registrar los campos antes de la recepcion.
2. Pulsar "Recibir muestra" en la UI y observar los campos `received_at` y `received_by`.
3. Pulsar "Verificar muestra" y observar `verified_at` y `verified_by`.
4. Intentar verificar dos veces la misma muestra.
5. Intentar verificar con `doctor`.
- **Esperado:** paso 2 responde `200` y fija `received_at` con la hora actual y `received_by` con el id del tecnico. Paso 3 responde `200` y fija `verified_at` y `verified_by`, con la muestra en `verified`. Paso 4 responde `400` por transicion invalida. Paso 5 responde `403` con `message` = "Access denied". Los textos de exito son `lab:sampleReceived` = "Muestra recibida" y `lab:sampleVerified` = "Muestra verificada" [verificar literales en es.json].
- **Red:** dos `200`, un `400` y un `403` de los endpoints de muestra, con los cuatro campos de auditoria leidos en cada paso.
- **Limpieza:** sin limpieza, la muestra queda en `verified` como evidencia.

### [LAB-021] Asignacion y control de calidad de la muestra

**Rol** `lab_technician` · **Ruta** `/api/laboratory/samples/:id` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, muestra en `verified`.
- **Datos:** `PATCH /api/laboratory/samples/<id>/assign` con `storage_location`; `PATCH /api/laboratory/samples/<id>/qc` con `notes`.
- **Pasos:**
1. Asignar la ubicacion de almacenamiento.
2. Registrar el control de calidad de la muestra.
3. Intentar asignar una ubicacion vacia.
4. Intentar el QC con un `notes` de mas de 100 caracteres.
5. Consultar la muestra y verificar su estado.
- **Esperado:** pasos 1 y 2 responden `200`; la muestra pasa por `assigned` y registra la ubicacion. Paso 3 responde `400` con el mensaje de ubicacion obligatoria. Paso 4 responde `400` por el limite de 100 caracteres [verificar limite en el esquema]. Paso 5 devuelve la muestra con `status: "qc_review"` o el estado real y los campos informados. La UI valida con `lab:locationRequired` y `lab:maxChars100` [verificar literales en es.json].
- **Red:** dos `200` y dos `400` de los endpoints de muestra, mas un `200` de lectura.
- **Limpieza:** sin limpieza, la muestra queda en `qc_review`.

### [LAB-022] Rechazo de una muestra con motivo obligatorio

**Rol** `lab_technician` · **Ruta** `/api/laboratory/samples/:id/reject` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, dos muestras en `verified`.
- **Datos:** intento A con `{ reason: "Muestra hemolizada" }` (lo que envia el frontend); intento B con `{ rejection_reason: "Muestra hemolizada" }`; intento C sin motivo.
- **Pasos:**
1. Rechazar desde el dialogo de la UI y observar el cuerpo real de la peticion.
2. Repetir con el nombre de campo alterno.
3. Intentar el rechazo sin motivo.
4. Intentar rechazar una muestra ya rechazada.
- **Esperado:** el servicio lee `rejection_reason` mientras el frontend envia `reason`, por lo que el paso 1 deja el motivo en `null` o `undefined` y la muestra queda en `rejected` **sin motivo registrado**: registrar este defecto con el valor almacenado. El paso 2 si persiste el motivo. El paso 3 responde `400`. El paso 4 responde `400` por transicion invalida. El motivo nunca debe quedar vacio en una muestra rechazada.
- **Red:** tres a cuatro respuestas de `PATCH /api/laboratory/samples/:id/reject` con `200` o `400`, y lectura de `rejection_reason` en la base para cada caso.
- **Limpieza:** las muestras rechazadas quedan en `rejected`; eliminar por base de datos al cierre.

### [LAB-023] Filtros y detalle de muestras

**Rol** `lab_technician` · **Ruta** `/laboratory/samples` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, muestras en `received`, `verified`, `assigned`, `qc_review` y `rejected`.
- **Datos:** `GET /api/laboratory/samples` con `status`, `request_id`, `sample_type`, `location`, `limit` y `offset`.
- **Pasos:**
1. Listar todas las muestras y contar por estado.
2. Filtrar por cada estado y validar el conteo.
3. Filtrar por `request_id` y por `location`.
4. Abrir el detalle de una muestra con `GET /api/laboratory/samples/<id>`.
5. Intentar paginar con `?limit=1&offset=1`.
- **Esperado:** los filtros `status`, `request_id`, `sample_type` y `location` se aplican y los conteos coinciden. El detalle responde `200` con los datos de la muestra y su solicitud relacionada. La paginacion por `limit` y `offset` funciona, o se ignora si la consulta no la soporta: registrar. La UI muestra el texto `lab:noLocation` = "Sin ubicacion" [verificar literal en es.json] para las muestras sin localizar.
- **Red:** siete u ocho respuestas `200` de los endpoints de muestras con conteos comparados.
- **Limpieza:** no aplica, solo lectura.

### [LAB-024] Aislamiento de muestras entre tenants y entre roles

**Rol** `lab_technician` · **Ruta** `/api/laboratory/samples` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02. Muestras en `clinica-demo`; existe al menos una muestra en `clinica-sur` creada por su administrador.
- **Datos:** sesion de PRE-02 en `clinica-demo`; sesion del tecnico equivalente en `clinica-sur`; `id` de una muestra de cada tenant.
- **Pasos:**
1. Listar muestras en `clinica-demo` y verificar el `tenant_id` de cada una.
2. Invocar `GET /api/laboratory/samples/<id_de_clinica_sur>` desde `clinica-demo`.
3. Repetir el paso 1 en `clinica-sur`.
4. Intentar `PATCH /api/laboratory/samples/<id_ajeno>/receive`.
- **Esperado:** paso 1 devuelve solo muestras de `clinica-demo`. Paso 2 responde `404` o `[]` segun la implementacion, nunca datos del otro tenant. Paso 3 devuelve solo las de `clinica-sur`. Paso 4 responde `404` o `403`. Ningun dato cruza el limite de tenant, y la UI no debe mostrar la ubicacion fisica de muestras de otro tenant.
- **Red:** cuatro respuestas de los endpoints de muestras con los codigos anotados y el `tenant_id` de cada elemento.
- **Limpieza:** no aplica, solo lectura.

### [LAB-025] Registrar el resultado de un item

**Rol** `lab_technician` · **Ruta** `/api/laboratory/items/:item_id/result` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, item de PRE-11 en `processing`.
- **Datos:** `{ result_value: "5.4", unit: "mg/dL", result_notes: "Dentro de rango", results: { hemoglobina: 14.2, hematocrito: 42 } }`.
- **Pasos:**
1. Abrir el formulario de resultado del item y guardar.
2. Leer el item actualizado y sus campos.
3. Registrar un resultado de tipo texto en un test con `result_type: "text"`.
4. Intentar registrar un resultado no numerico en un test numerico.
5. Registrar un segundo resultado sobre el mismo item ya con resultado.
- **Esperado:** paso 1 responde `200` y el item pasa a `result_entered`; se persisten `result_value`, `result_notes` y `unit`. La columna JSONB `results` se mantiene: registrar si el objeto enviado se guarda o si el servicio lo ignora, porque el frontend envia `results: {}` y el controlador escribe campos escalares. Paso 3 responde `200` con el texto. Paso 4 responde `400` con validacion de tipo. Paso 5 responde `200` y crea una nueva version en el historial, no sobrescribe en silencio.
- **Red:** cuatro `200` y un `400` de `PATCH /api/laboratory/items/:item_id/result`, con los campos leidos en cada caso.
- **Limpieza:** sin limpieza, el item queda en `result_entered` con historial.

### [LAB-026] El formulario de resultados multiples no guarda el bloque JSONB

**Rol** `lab_technician` · **Ruta** `/laboratory/requests/:id` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-11 con 2 items en `processing`.
- **Datos:** formulario de resultados multiples con 2 filas y valores distintos; inspeccion de la peticion de red.
- **Pasos:**
1. Abrir el dialogo "Agregar Resultado" del detalle de la solicitud.
2. Completar las dos filas y guardar.
3. Inspeccionar el cuerpo de las peticiones emitidas.
4. Recargar la pagina y leer los resultados mostrados.
5. Intentar adjuntar un archivo al resultado.
- **Esperado:** paso 3 muestra una peticion **por fila** con `results: {}` fijo en el cuerpo, porque `handleAddResults` mapea las filas y delega en el endpoint de un solo item. Confirmado el defecto del area: el bloque JSONB nunca se puebla. Paso 4 muestra los valores, por lo que la UI funciona pese al defecto. Paso 5 no ofrece control de adjuntos: el stub documentado en el detalle de solicitud no tiene implementacion, registrar la ausencia del control.
- **Red:** dos peticiones `PATCH /api/laboratory/items/:item_id/result` con `200`, cada una con `results: {}`; ninguna peticion de subida de archivo.
- **Limpieza:** sin limpieza.

### [LAB-027] Delta check y marcacion de valores criticos

**Rol** `lab_technician` · **Ruta** `/laboratory/requests/:id` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-12. Al menos 3 resultados previos del mismo test para PRE-05.
- **Datos:** resultado actual con una variacion mayor al `delta_check_pct` (por defecto 20); resultado dentro del rango; resultado fuera de `critical_min` y `critical_max`.
- **Pasos:**
1. Registrar un resultado que varia mas del 20 por ciento respecto al anterior.
2. Registrar un resultado estable.
3. Registrar un resultado fuera del rango critico.
4. Observar las alertas y el grafico de tendencia en el detalle.
5. Intentar el delta check con menos de dos resultados historicos.
- **Esperado:** paso 1 genera la alerta de verificacion delta con los textos `lab:results.deltaMessage` = "Paciente {{patient}}: resultado {{current}} vs anterior {{previous}}" y `lab:results.needTwo` = "Se requieren al menos 2 resultados." [verificar literales en es.json]. Paso 2 no genera alerta. Paso 3 marca el resultado como critico con `lab:results.critical` = "Critico" [verificar literal]. Paso 4 muestra el sparkline y la tendencia. Paso 5 muestra "No hay datos historicos disponibles." y no calcula variacion.
- **Red:** tres `200` de `PATCH /api/laboratory/items/:item_id/result` y las alertas visibles en el DOM; texto de las alertas transcrito literalmente.
- **Limpieza:** sin limpieza.

### [LAB-028] Validacion tecnica del resultado

**Rol** `lab_technician` · **Ruta** `/api/laboratory/items/:item_id/validate-tech` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, item en `result_entered`.
- **Datos:** `PATCH /api/laboratory/items/<id>/validate-tech` sin cuerpo y con `{ notes }`.
- **Pasos:**
1. Pulsar "Validado por tecnico" en la UI.
2. Leer el estado del item.
3. Intentar la misma validacion con `doctor`.
4. Intentar validar un item que sigue en `processing` sin resultado.
5. Intentar validar dos veces.
- **Esperado:** paso 1 responde `200` y el item pasa de `result_entered` a `validated_tech`; el mensaje es `lab:validatedByTech` = "Validado por tecnico" [verificar literal en es.json]. Paso 3 responde `403` con `message` = "Access denied", porque la ruta no incluye `doctor`. Paso 4 responde `400` por transicion invalida. Paso 5 responde `400`. La validacion tecnica es obligatoria antes de la medica.
- **Red:** un `200`, un `403` y dos `400` de `PATCH /api/laboratory/items/:item_id/validate-tech`.
- **Limpieza:** sin limpieza, el item queda en `validated_tech`.

### [LAB-029] Validacion medica del resultado

**Rol** `doctor` · **Ruta** `/api/laboratory/items/:item_id/validate-doctor` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, item en `validated_tech`.
- **Datos:** `PATCH /api/laboratory/items/<id>/validate-doctor`; intento con `lab_technician`; intento con un item en `result_entered`.
- **Pasos:**
1. Validar el resultado como doctor.
2. Leer el estado y la trazabilidad del item.
3. Intentar la misma llamada como `lab_technician`.
4. Intentar validar sin la validacion tecnica previa.
- **Esperado:** paso 1 responde `200` y el item pasa a `validated_doctor`, con el mensaje `lab:validatedByDoctor` = "Validado por medico" [verificar literal en es.json]. El item registra who valid each stage. Paso 3 responde `403`. Paso 4 responde `400` por transicion no permitida: el orden tecnica antes que medica es obligatorio y no se puede saltar. Verificar que un doctor distinto del solicitante puede validar.
- **Red:** un `200`, un `403` y un `400` de `PATCH /api/laboratory/items/:item_id/validate-doctor`, con los campos de trazabilidad leidos.
- **Limpieza:** sin limpieza, el item queda en `validated_doctor`.

### [LAB-030] Firma del resultado validado

**Rol** `doctor` · **Ruta** `/api/laboratory/items/:item_id/sign` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, item en `validated_doctor`.
- **Datos:** `PATCH /api/laboratory/items/<id>/sign` sin cuerpo.
- **Pasos:**
1. Firmar el resultado desde la UI.
2. Leer el item y su historial.
3. Intentar firmar con `lab_technician`.
4. Intentar firmar un item en `validated_tech`.
5. Firmar de nuevo el mismo item.
- **Esperado:** paso 1 responde `200` y el item pasa a `signed` con el mensaje `lab:resultSigned` = "Resultado firmado" [verificar literal en es.json]. Paso 3 responde `403`. Paso 4 responde `400` por transicion no permitida. Paso 5 responde `400`, la firma no es idempotente y no debe duplicarse. Verificar si la firma registra autor y hora.
- **Red:** un `200`, un `403` y dos `400` de `PATCH /api/laboratory/items/:item_id/sign`, con los campos de firma leidos.
- **Limpieza:** sin limpieza, el item queda en `signed`.

### [LAB-031] Entrega del resultado e historial de item

**Rol** `lab_technician` · **Ruta** `/api/laboratory/items/:item_id/deliver` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, item en `signed`.
- **Datos:** `PATCH /api/laboratory/items/<id>/deliver` con `{ notes }`; `GET /api/laboratory/items/<id>/history`.
- **Pasos:**
1. Entregar el resultado firmado.
2. Consultar el historial del item y enumerar las versiones.
3. Verificar que el paciente ve el resultado entregado.
4. Intentar entregar un item no firmado.
5. Intentar consultar el historial con `patient`.
- **Esperado:** paso 1 responde `200` y el item pasa a `delivered`, con el mensaje `lab:resultDelivered` = "Resultado entregado" [verificar literal en es.json]. Paso 2 devuelve `200` con el historial completo: cada version con valor, fecha y responsable, permitiendo reconstruir el ciclo. Paso 3 muestra el resultado en `/my-laboratory` del paciente. Paso 4 responde `400`. Paso 5 responde `403`.
- **Red:** un `200`, un `200` con historial, un `200` en la vista del paciente, un `400` y un `403`.
- **Limpieza:** sin limpieza, el item queda en `delivered`.

### [LAB-032] Las transiciones invalidas de item se rechazan

**Rol** `lab_technician` · **Ruta** `/api/laboratory/items/:item_id` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-11. Items-crafted en los 14 estados posibles.
- **Datos:** intentos de `validate-tech` sobre item en `pending`, `deliver` sobre item en `result_entered`, `sign` sobre item en `signed`, `cancel` repetido y estado inexistente.
- **Pasos:**
1. Intentar cada transicion invalida.
2. Registrar codigo y mensaje de cada respuesta.
3. Confirmar que el estado del item no cambia en ningun intento fallido.
- **Esperado:** los cinco intentos responden `400` con mensaje de transicion no permitida, sin cambio de estado. La maquina de estados del item debe ser estricta en las 14 transiciones del catalogo. Ningun intento puede dejar el item en un estado inconsistente con la solicitud.
- **Red:** cinco respuestas `400` de los endpoints de item, con lectura de `status` antes y despues de cada intento.
- **Limpieza:** sin limpieza.

### [LAB-033] Actualizacion del estado de item por el flujo tecnico

**Rol** `lab_technician` · **Ruta** `/api/laboratory/lab/items/:item_id/status` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, item en `processing`.
- **Datos:** `PATCH /api/laboratory/lab/items/<item_id>/status` con `{ status: "qc_review" }` y con `{ status: "inventado" }`.
- **Pasos:**
1. Mover el item a `qc_review` desde el tablero kanban.
2. Intentar un estado fuera del catalogo.
3. Intentar moverlo a `signed` directamente desde `qc_review`.
4. Repetir la operacion como `doctor`.
- **Esperado:** paso 1 responde `200` y sincroniza el estado del item y de la solicitud, con el mensaje `lab:statusUpdated` = "Estado actualizado" [verificar literal en es.json]. Paso 2 responde `400`. Paso 3 responde `400`. Paso 4 responde `403` con `message` = "Access denied". Verificar que el tablero kanban refleja el cambio sin recargar la pagina completa.
- **Red:** un `200`, un `400`, un `400` y un `403` de `PATCH /api/laboratory/lab/items/:item_id/status`.
- **Limpieza:** devolver el item a `processing` con una llamada valida o dejarlo en `qc_review` como evidencia.

### [LAB-034] Dashboard, dashboard por area y analiticas

**Rol** `lab_technician` · **Ruta** `/laboratory` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-10, PRE-11 y Solicitudes en varios estados.
- **Datos:** `GET /api/laboratory/dashboard`, `GET /api/laboratory/dashboard/area/<areaId>`, `GET /api/laboratory/dashboard/analytics` con y sin `doctor_id`.
- **Pasos:**
1. Cargar el panel y comparar los metricos con la base.
2. Abrir el dashboard de un area.
3. Abrir analiticas globales.
4. Filtrar analiticas por `doctor_id` de PRE-03.
5. Comparar con `/laboratory/analytics` y verificar los textos.
6. Repetir el panel como `doctor` y como `patient`.
- **Esperado:** pasos 1 a 4 responden `200` con metricas coherentes: solicitudes en cola, en proceso, validadas, urgentes, criticas, tiempo promedio de turnaround y SLA incumplido. Los nombres de metricas son `lab:metrics.pending`, `inProgress`, `validated`, `urgent`, `critical`, `lab:slaBreached` = "SLA incumplido" y `lab:avgProcessingTime` = "Tiempo promedio de proceso" [verificar literales en es.json]. Paso 6: `doctor` y `patient` responden `403` porque el dashboard restringe a `admin`, `superadmin` y `lab_technician`.
- **Red:** seis respuestas de los endpoints de dashboard y analiticas con los codigos anotados y las metricas transcritas.
- **Limpieza:** no aplica, solo lectura.

### [LAB-035] Los eventos SSE del laboratorio se emiten en tiempo real

**Rol** `lab_technician` · **Ruta** `/api/laboratory/events` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-11. Un item de PRE-11 en `processing`.
- **Datos:** `GET /api/laboratory/events` con `Accept: text/event-stream`; eventos emitidos al cambiar estados.
- **Pasos:**
1. Abrir la conexion SSE desde la pagina y registrar el primer evento.
2. Con la conexion abierta, registrar un resultado en un item en otra pestana.
3. Crear una solicitud nueva desde otra sesion.
4. Dejar la conexion abierta mas de 40 segundos sin actividad.
5. Intentar la conexion como `doctor` y como `patient`.
- **Esperado:** paso 1 recibe el evento `connected` de inmediato. Paso 2 emite `status-change` y `notification` con el id del item afectado. Paso 3 emite `new-request` y actualiza el contador de la cola sin recargar. Paso 4 emite un comentario de heartbeat cada 30 segundos, manteniendo la conexion viva. Paso 5 responde `403` con `message` = "Access denied" en el handshake. La UI consume los eventos sin errores en consola ni duplicar filas.
- **Red:** una conexion `200` con `Content-Type: text/event-stream`; eventos `connected`, `new-request`, `status-change` y `notification` transcritos literalmente; un comentario `: heartbeat` en el minuto.
- **Limpieza:** cerrar la conexion SSE al terminar el caso; no dejar conexiones abiertas.

### [LAB-036] H-44: el registro de control de calidad responde 201 y alimenta el grafico

**Rol** `admin` · **Ruta** `/laboratory/quality-control` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, PRE-09, PRE-10.
- **Datos:** `{ lab_test_id: <id_test1>, lab_area_id: <areaId>, qc_type: "internal", control_name: "Control QA 001", lot_number: "LOT-001", expiration_date: "<fecha futura>", expected_min: 4, expected_max: 6, measured_value: 5.1 }`.
- **Pasos:**
1. Crear el registro QC desde la pestana "Registros QC".
2. Registrar el codigo de respuesta y el mensaje en pantalla.
3. Abrir la pestana "Grafico de Control" y verificar el punto nuevo.
4. Intentar la misma creacion con `lab_technician`.
5. Intentar crearlo con `expected_min` mayor que `expected_max`.
- **Esperado:** paso 1 responde `201` y el mensaje es `lab:qcCreated` = "Registro QC creado" [verificar literal en es.json]. Paso 3 muestra el punto en el grafico de Levey-Jennings con los limites de control; H-44 queda cerrado en backend: el endpoint existe y responde `201`. Paso 4 responde `403` con `message` = "Access denied", porque `POST /qc` solo autoriza a `admin` y `superadmin`: registrar que el tecnico, que es quien ejecuta los controles, no puede crearlos desde la API. Paso 5 responde `400` con el mensaje `lab:minLessThanMax` [verificar literal en es.json].
- **Red:** un `201` de `POST /api/laboratory/qc`, un `200` de `GET /api/laboratory/qc` con el registro nuevo, un `403` y un `400`.
- **Limpieza:** eliminar el registro QC por base de datos, dado que no existe `DELETE /api/laboratory/qc/:id`.

### [LAB-037] Las rutas de QC que invoca la UI no existen

**Rol** `admin` · **Ruta** `/api/laboratory/qc` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, registro QC creado en LAB-036.
- **Datos:** `PUT /api/laboratory/qc/<id>` con `measured_value: 5.3`; `POST /api/laboratory/qc/<id>/approve`.
- **Pasos:**
1. Enumerar las rutas `qc` declaradas en el router.
2. Editar el valor medido de un registro QC desde la UI e inspeccionar la peticion.
3. Aprobar el registro QC desde la UI e inspeccionar la peticion.
4. Invocar manualmente ambas rutas.
5. Invocar `GET /api/laboratory/qc?area_id=<areaId>&test_id=<id>`.
- **Esperado:** pasos 3 y 4 responden `404` porque `PUT /qc/:id` y `POST /qc/:id/approve` no existen, aunque el servicio del frontend los invoca. El servicio expone ademas `POST /api/laboratory/notifications/acknowledge-all` para las notificaciones, que tambien devuelve `404`. Consecuencia funcional: la edicion y la aprobacion de un control de calidad son imposibles desde la UI, y el boton "Aprobar QC" queda sin efecto aunque `es.json` define `lab:qcApproved` = "Registro QC aprobado" [verificar literal]. Paso 5 responde `200` con los registros filtrados.
- **Red:** dos `404` de las rutas de QC inexistentes, un `404` de `POST /api/laboratory/notifications/acknowledge-all` y un `200` de `GET /api/laboratory/qc`.
- **Limpieza:** no aplica, no hay escritura efectiva.

### [LAB-038] QC statistics y el estado del grafico de Levey-Jennings

**Rol** `lab_technician` · **Ruta** `/laboratory/quality-control` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-09, y el registro QC de LAB-036.
- **Datos:** `GET /api/laboratory/qc/statistics?lab_test_id=<id>&lab_area_id=<areaId>`; grafico con un solo punto; grafico sin registros.
- **Pasos:**
1. Abrir la pestana "Grafico de Control" sin ningun registro QC previo.
2. Registrar el texto mostrado.
3. Crear un unico registro y volver a abrir el grafico.
4. Invocar `GET /api/laboratory/qc/statistics` y comparar con lo que muestra el grafico.
5. Filtrar por area y por test.
- **Esperado:** paso 1 y 2 muestran `lab:insufficientData` = "Datos insuficientes para mostrar el grafico" [verificar literal en es.json]. Paso 3 el grafico sigue mostrando un punto con la media y los limites calculados, y las etiquetas `lab:mean` = "Media", `upperControlLimit` = "Limite Superior Control" y `lowerControlLimit` [verificar literales]. Paso 4 responde `200` con las estadisticas; verificar si la UI usa este endpoint o calcula el grafico en el cliente a partir de `GET /qc`, porque el servicio del frontend solo invoca `/qc`. Paso 5 responde `200` con los datos filtrados.
- **Red:** dos o tres respuestas `200` de `GET /api/laboratory/qc` y `GET /api/laboratory/qc/statistics`; texto del grafico transcrito literalmente.
- **Limpieza:** no aplica, solo lectura.

### [LAB-039] Inventario de equipos y sus estados

**Rol** `admin` · **Ruta** `/laboratory/inventory` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06.
- **Datos:** `{ name: "Analizador QA 001", model: "QA-1", serial_number: "SN-QA-001", status: "operational", last_maintenance: "<fecha>" }`; update con `status: "maintenance"`.
- **Pasos:**
1. Crear el equipo y listarlo.
2. Verificar el calculo de dias desde el ultimo mantenimiento.
3. Editar el estado a `maintenance` y luego a `out_of_service`.
4. Intentar la misma edicion con `lab_technician`.
5. Invocar `POST /api/laboratory/equipment` con un equipo sin `name`.
- **Esperado:** paso 1 responde `201` y el equipo aparece con los estados de `lab:equipmentStatuses.operational`, `maintenance` y `out_of_service` [verificar literales en es.json]. Paso 3 responde `200` en cada cambio. Paso 4 responde `403`. Paso 5 responde `400` con el mensaje de nombre obligatorio. La UI muestra `lab:lastMaintenance` y el conteo `lab:totalEquipment` [verificar literales en es.json]. Registrar que no existe `DELETE` de equipos: solo se pueden desactivar.
- **Red:** un `201`, dos `200`, un `403` y un `400` de los endpoints de equipment, con el estado de cada equipo listado.
- **Limpieza:** ⚠️ sin via de API: el equipo permanece. Eliminar por base de datos con autorizacion o dejarlo como inventario de prueba registrado.

### [LAB-040] Reactivos, notificaciones y alertas de vencimiento

**Rol** `admin` · **Ruta** `/laboratory/inventory` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, PRE-09. Reactivo con lote proximo a vencer y otro con stock bajo.
- **Datos:** alta de reactivo con `current_stock` y `minimum_stock`; `PATCH /api/laboratory/reagents/<id>/stock` con `{ quantity_delta: -5 }`; `GET /api/laboratory/notifications`; `PATCH /api/laboratory/notifications/<id>/ack`; `POST /api/laboratory/notifications/acknowledge-all`.
- **Pasos:**
1. Crear el reactivo y verificar su categorizacion por vencimiento y por stock.
2. Descontar stock hasta quedar por debajo del minimo.
3. Leer el panel de alertas con los conteos `lab:reagentsExpiring`, `reagentsExpired`, `reagentsLow`.
4. Listar notificaciones y acusar una con `PATCH /notifications/:id/ack`.
5. Pulsar "Marcar todas como leidas" en la UI e invocar `POST /api/laboratory/notifications/acknowledge-all`.
6. Intentar el descuento de stock con `lab_technician`.
- **Esperado:** pasos 1 y 2 responden `201` y `200`; el reactivo pasa a la categoria de stock bajo cuando `current_stock` queda por debajo de `minimum_stock`. Paso 3 muestra los conteos y los textos [verificar literales en es.json]. Paso 4 responde `200` y la notificacion queda marcada. Paso 5 responde `404`, porque la ruta no existe: "marcar todas como leidas" es inoperante y las notificaciones siguen visibles al recargar, registrar el defecto con el texto del boton. Paso 6 responde `403`.
- **Red:** un `201`, dos `200`, dos `404` y un `403` de los endpoints de reactivos y notificaciones.
- **Limpieza:** eliminar el reactivo por base de datos, dado que no existe `DELETE` de reactivos.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
| --- | --- | --- | --- |
| H-44 | El endpoint de control de calidad responde `403` a `lab_technician` porque `POST /qc` solo autoriza a `admin` y `superadmin`; el tecnico que ejecuta los controles no puede registrarlos. | LAB-036 | `POST /api/laboratory/qc` con `403` para el tecnico y `201` para `admin`, con el punto alimentando el grafico de Levey-Jennings. |
| H-14 | El acceso denegado a una solicitud o a un item ajeno responde `4xx` con codigos inconsistentes entre endpoints (`400` con `ACCESS_DENIED`, `403` de `authorize`) y el literal del backend esta en ingles. | LAB-005, LAB-015, LAB-028, LAB-033 | Nunca `200` con datos ajenos; registrar el codigo exacto por endpoint. |
| H-63 | El gating de feature se aplica solo a este modulo: es el unico con `requireFeature('laboratory')`, mientras el resto de modulos responde `200` en tenants sin la feature. | LAB-001 | Todos los endpoints de laboratorio con `403` en `clinica-sur` frente a `200` en `clinica-demo`. |
| H-62 | La autorizacion depende de comparaciones literales de rol en 25 rutas, con listas de roles repetidas endpoint por endpoint. | LAB-006, LAB-007, LAB-036 | El rol alias `user` puede obtener `403` donde `patient` obtiene `200`, o acceder a rutas sin `authorize`. |
| H-44-2 | `PUT /api/laboratory/qc/:id` y `POST /api/laboratory/qc/:id/approve` no existen, aunque el servicio del frontend las invoca: la edicion y la aprobacion de controles de calidad son imposibles. | LAB-037 | `404` en ambas rutas; el boton "Aprobar QC" no produce efecto. |
| H-44-3 | `POST /api/laboratory/notifications/acknowledge-all` no existe: "marcar todas como leidas" no funciona y las notificaciones reaparecen al recargar. | LAB-040 | `404` en `POST /api/laboratory/notifications/acknowledge-all`. |
| H-44-4 | `GET /api/laboratory/tests` y `GET /api/laboratory/areas` se declaran sin `authorize(...)`, de modo que cualquier rol autenticado, incluido el paciente, lee el catalogo con unidades y rangos criticos. | LAB-007 | `200` con el catalogo completo para `patient`. |
| H-44-5 | `POST /api/laboratory` y `DELETE /api/laboratory/:id` omiten `superadmin` en su `authorize`, a diferencia del resto de endpoints del router. | LAB-013, LAB-018 | `403` para `superadmin` en el alta y la cancelacion, con `201` para `admin` y `doctor`. |
| H-44-6 | El formulario de resultados multiples envia una peticion por fila con `results: {}` fijo, por lo que la columna JSONB nunca se puebla. | LAB-026 | Cada `PATCH /items/:item_id/result` incluye `results: {}`; el bloque queda vacio en la base. |
| H-44-7 | `PATCH /api/laboratory/samples/:id/reject` lee `rejection_reason` mientras el frontend envia `reason`: las muestras quedan rechazadas sin motivo registrado. | LAB-022 | `rejection_reason` en `null` tras el rechazo desde la UI. |
| H-44-8 | No existen `PATCH /api/laboratory/:id`, `POST /api/laboratory/items` ni `DELETE /api/laboratory/items/:item_id`, aunque el servicio del frontend los invoca para editar, agregar y quitar pruebas. | LAB-011, LAB-014 | `404` en las tres rutas cuando la UI intenta agregar o quitar una prueba de una solicitud. |
| H-44-9 | La pagina `/my-laboratory` no esta protegida por `ProtectedRoute` en el router del frontend. | LAB-015 | La pagina carga sin sesion y la API responde `401`, dejando una pantalla vacia sin mensaje de reautenticacion. |
| H-44-10 | La UI de detalle de solicitud tiene un stub de adjuntos sin implementacion: no hay `POST` de archivos en ningun endpoint de laboratorio. | LAB-026 | Ningun control de adjuntos visible ni peticion de subida. |

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Como verificarlo |
| --- | --- | --- |
| No existe `GET /api/laboratory/results/patient/:patientId` | El area 23 no puede validar la ruta que el catalogo describe para el detalle de resultados del paciente; la UI usa `GET /api/laboratory/:id` con filtro. | Buscar la ruta en `laboratory.routes.ts` (no esta) y revisar `PatientLabResultsPage.tsx:113`. |
| No existe `GET /api/admin/lab-requests` | La pagina de solicitudes del administrador no tiene endpoint propio; reutiliza `GET /api/laboratory/lab/all`. | Revisar los `app.use` de `src/app.ts`. |
| No existe `GET /api/laboratory/doctor/results` | El panel de resultados del doctor depende de las solicitudes, no de un endpoint dedicado. | Revisar `DoctorLabResultsPage.tsx`. |
| La tabla de estados tiene 14 valores y la UI define etiquetas para 13 | `completed` e `in_progress` fueron migrados a `delivered` y `processing`; comprobar que ningun estado huerfano quede en la base. | Comparar el `CHECK` de `003_add_lab_areas.sql:53` con `lab:statusLabels.*` en `es.json`. |
| El grafico de Levey-Jennings se calcula en el cliente | `GET /qc/statistics` existe pero el servicio del frontend no lo invoca; la UI opera sobre `GET /qc`. | Revisar `LabQualityControlPage.tsx:45` y `ControlChart.tsx`. |
| No hay paginacion en `GET /api/laboratory/samples` con todos los filtros | Depende de la implementacion de cada filtro; registrar el comportamiento. | Ejecutar LAB-023. |
| La muestra no tiene vida util ni ubicacion obligatoria en el alta | `location` solo se exige en la asignacion, no en la creacion. | Enviar la muestra sin `location` y observar el `201`. |
| No hay notificacion al paciente cuando el resultado se entrega | El paciente debe revisar `/my-laboratory` de forma activa. | Registrar si LAB-031 genera notificacion. |
| El envio por correo depende de SMTP configurado | Si `SMTP` no esta definido, LAB-002 queda bloqueado en el paso 1. | Revisar la configuracion de `lab-result-email.service.ts`. |
| El token publico no tiene expiracion automatica | Un enlace de resultado compartido permanece valido mientras exista la solicitud. | Verificar si existe tarea de limpieza de tokens expirados. |
| Los tests y areas no tienen `DELETE` fisico | El catalogo acumula registros inactivos. | Confirmar la ausencia de la ruta en `laboratory.routes.ts`. |
| Equipos y reactivos no tienen `DELETE` | Solo se puede cambiar el estado, no eliminar el registro. | Confirmar la ausencia de la ruta en `laboratory.routes.ts`. |
| Sin cobertura de la impresion de la orden | Solo se valida el PDF. | Verificar si existe ruta de impresion. |
| Los mensajes de error del laboratorio estan en ingles | `Access denied`, `Prescription not found` y similares no provienen de `es.json`. | Comparar las respuestas con el diccionario `lab:*`. |
| El tablero kanban depende de SSE | Si el evento no llega, el tablero queda desactualizado sin aviso. | Verificar el refresco manual en LAB-035. |

## 7. Resultado del área

| Campo | Valor |
| --- | --- |
| Casos ejecutados | `____ / 40` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 13` |
| Huecos confirmados | `____ / 15` |
| Evidencia guardada en | `pruebas-navegador/evidencia/23-laboratorio/` |
| Tester / fecha | `________________` |

Criterio de aprobado del area: los 40 casos ejecutados en Passed, los 13 defectos de la seccion 5 confirmados y el ciclo completo de una solicitud recorre los 14 estados sin inconsistencias entre el item y la solicitud. Si el alta de QC permanece restringida a `admin`, LAB-036 queda Approved con la limitacion documentada y se abre la incidencia de H-44.

---

Alcance: 40 casos sobre el modulo de laboratorio en los tenants `pro` y `basic`, cubriendo gating de feature, autorizacion por rol, catalogo de pruebas y areas, ciclo de la solicitud, muestras, resultados, doble validacion, firma, entrega, delta check, dashboard, control de calidad, equipos, reactivos, notificaciones, eventos SSE y los hallazgos H-14, H-44, H-62 y H-63. No cubre facturacion de pruebas (area 24) ni la consola de superadmin (hueco de cobertura: ver `99`). Fecha de redaccion: 2026-10-01.

# 22 — Recetas y PDF

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
| --- | --- | --- | --- | --- | --- | --- |
| `22` | `RCT` | C2 | Semanal | 20 | `21` | `24` |

## 1. Qué cubre

Verificacion funcional del modulo de recetas medicas: alta de medicamentos sobre un expediente clinico, listado por rol, edicion, borrado, descarga del PDF y aislamiento de datos entrepacientes y entre doctores.

Aspectos incluidos:

- Alta de receta con los campos obligatorios (`clinical_record_id`, `medication`, `dosage`, `frequency`) y con los opcionales (`duration`, `instructions`, `route`).
- Rechazo de payloads incompletos y de campos desconocidos por el esquema estricto.
- Deteccion de medicamento duplicado dentro del mismo expediente, insensible a mayusculas.
- Restriccion de escritura al doctor propietario del expediente.
- Listado de recetas del expediente, listado global del doctor, del admin y listados agrupados del paciente.
- Edicion y borrado de una receta, incluida la impossibility de limpiar campos.
- Descarga del PDF con verificacion de tipo de contenido, nombre de archivo y cabeceras anti-cache.
- Bloqueo de la descarga de recetas ajenas por parte de doctor y paciente.
- Los hallazgos H-14, H-62, H-69, H-70, H-71 y H-72 aplicados a esta area.

No cubre: el ciclo de vida del expediente clinico (area 21), el envio de la receta por correo (hueco de cobertura: ver `99`) ni la firma digital o el sello del profesional.

## 2. Roles y rutas

| Rol | Acceso a la UI | Endpoints que puede usar |
| --- | --- | --- |
| `patient` | `/patient/prescriptions` | `GET /api/clinical-records/prescriptions/mine`, `GET /api/clinical-records/prescriptions/:id/pdf` |
| `user` | Igual que `patient` | Igual que `patient` |
| `doctor` | Detalle del expediente, seccion de recetas | `GET/POST/PUT/DELETE` de recetas y `GET .../pdf` |
| `admin` | `/clinical-records` | `GET /api/clinical-records/prescriptions/all`, `GET /api/clinical-records/:record_id/prescriptions` |
| `superadmin` | Igual que `admin` | Igual que `admin` (con la limitacion registrada en RCT-003) |
| `lab_technician` | Sin UI de recetas | `403` en las rutas con `authorize(...)` |
| `guest` | Sin sesion | `401` en todas las rutas |

Nota critica de enrutamiento: las recetas no viven bajo `/api/prescriptions` sino bajo `/api/clinical-records/prescriptions`. No existe ningun router montado en `/api/prescriptions` en `src/app.ts`, por lo que cualquier llamada a esa ruta devuelve `404`.

| Superficie | Ruta / Metodo | Archivo |
| --- | --- | --- |
| Listado global | `GET /api/clinical-records/prescriptions/all` | `clinical-record.routes.ts:38` |
| Listado del paciente | `GET /api/clinical-records/prescriptions/mine` | `clinical-record.routes.ts:39` |
| PDF | `GET /api/clinical-records/prescriptions/:id/pdf` | `clinical-record.routes.ts:40` |
| Recetas del expediente | `GET /api/clinical-records/:record_id/prescriptions` | `clinical-record.routes.ts:50` |
| Alta | `POST /api/clinical-records/prescriptions` | `clinical-record.routes.ts:51` |
| Edicion | `PUT /api/clinical-records/prescriptions/:id` | `clinical-record.routes.ts:52` |
| Borrado | `DELETE /api/clinical-records/prescriptions/:id` | `clinical-record.routes.ts:53` |
| Esquema de receta | `prescriptionSchema` | `clinical-record.schema.ts:33-41` |
| Reglas de negocio | alta, duplicados, edicion y borrado | `prescription.service.ts:46`, `:69`, `:96`, `:175` |
| PDF | generacion y cabeceras | `clinical-record.controller.ts:265-287` |
| UI paciente | `prescriptions:*` | `frontend/src/modules/prescriptions/pages/PatientPrescriptionsPage.tsx` |

Las rutas `PUT /prescriptions/:id` y `DELETE /prescriptions/:id` se declaran despues de `PUT /:id` y `DELETE /:id`. Express evalua las rutas en orden de registro, por lo que ambas quedan capturadas por la ruta parametrizada del expediente. RCT-009 y RCT-012 verifican el comportamiento real en ejecucion.

## 3. Precondiciones de datos

| ID | Requisito | Valor |
| --- | --- | --- |
| PRE-01 | Tenant | `clinica-demo` (plan `pro`) |
| PRE-02 | Doctor principal | `juan@clinic.com`, propietario de PRE-08 |
| PRE-03 | Doctor alterno | `carmen@clinic.com`, propietario de PRE-10 |
| PRE-04 | Paciente principal | `user1@clinic.com` |
| PRE-05 | Paciente ajeno | `user2@clinic.com` |
| PRE-06 | Administrador | `admin@clinic.com`, password `$ADMIN_PASSWORD` (preguntar al administrador) |
| PRE-07 | Patron de password seed | `Vitaria.<parte-local-email>.<ano>!` |
| PRE-08 | Expediente draft del doctor principal | `draft` de PRE-04 creado por PRE-02, sin recetas |
| PRE-09 | Expediente draft ajeno | `draft` de PRE-05 creado por PRE-03 |
| PRE-10 | Expediente sin receta | `draft` de PRE-04 creado por PRE-02, que nunca recibio receta, para RCT-004 |
| PRE-11 | Medicamento de prueba | `Amoxicilina` (usado en RCT-001 y RCT-005) |
| PRE-12 | Superusuario | `superadmin@clinic.com`, password `$ADMIN_PASSWORD` |

Restricciones de limpieza: toda receta creada por estos casos se elimina con `DELETE /api/clinical-records/prescriptions/<id>` usando sesion del doctor propietario. Si esa ruta devuelve `404` por el defecto de enrutamiento, la limpieza exige una intervencion autorizada en base de datos y el caso se marca como bloqueado en su paso de limpieza.

## 4. Casos

### [RCT-001] Crear una receta con los campos obligatorios

**Rol** `doctor` · **Ruta** `/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08, PRE-11.
- **Datos:** `{ clinical_record_id: <id_pre08>, medication: "Amoxicilina", dosage: "500 mg", frequency: "3 veces al dia" }`.
- **Pasos:**
1. Abrir el detalle de PRE-08 y agregar un medicamento desde la seccion de recetas.
2. Completar nombre, dosis y frecuencia, dejando vacios duracion e instrucciones.
3. Guardar y recargar el detalle.
4. Consultar `GET /api/clinical-records/<id_pre08>/prescriptions`.
- **Esperado:** `POST /api/clinical-records/prescriptions` responde `201` con el objeto creado, incluyendo `route: "oral"` como valor por defecto del enum. `duration` e `instructions` se guardan en `null`. Paso 4 devuelve `200` con un array que contiene la receta y `tenant_id` igual al del tenant.
- **Red:** `POST /api/clinical-records/prescriptions` con `201`; `GET /api/clinical-records/:record_id/prescriptions` con `200` y 1 elemento.
- **Limpieza:** `DELETE /api/clinical-records/prescriptions/<recipe_id>` con sesion de PRE-02 y verificar el codigo devuelto (ver RCT-012).

### [RCT-002] Crear una receta completa con via de administracion

**Rol** `doctor` · **Ruta** `/clinical-records` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08.
- **Datos:** `{ clinical_record_id: <id_pre08>, medication: "Ibuprofeno", dosage: "400 mg", frequency: "cada 8 horas", duration: "5 dias", instructions: "Tomar con alimentos", route: "oral" }`.
- **Pasos:**
1. Crear la receta con los siete campos.
2. Abrir el detalle del expediente y leer la seccion de recetas.
3. Repetir con `route: "sublingual"`.
4. Repetir con `route: "intraocular"` como valor fuera del enum.
- **Pasos complementarios:** registrar el codigo de cada intento.
- **Esperado:** pasos 1 y 3 responden `201` y persisten los 7 campos, incluido `route` con el valor enviado. Paso 4 responde `400` con detalle de Zod `Invalid enum value` sobre `route`, confirmando que el enum tiene exactamente 11 valores: `oral`, `intravenous`, `intramuscular`, `subcutaneous`, `topical`, `rectal`, `sublingual`, `inhaled`, `ophthalmic`, `otic` y `nasal` [verificar el listado final en ejecucion].
- **Red:** dos `201` y un `400` de `POST /api/clinical-records/prescriptions`.
- **Limpieza:** eliminar ambas recetas con `DELETE /api/clinical-records/prescriptions/<id>`.

### [RCT-003] Listado global: el doctor ve solo lo suyo y el superadmin no ve nada

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions/all` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-04, PRE-05, PRE-08, PRE-09, PRE-12. PRE-08 y PRE-09 tienen al menos una receta.
- **Datos:** llamadas con `?limit=200`, `?limit=200&offset=0` y sin parametros.
- **Pasos:**
1. Invocar `GET /api/clinical-records/prescriptions/all` como PRE-02.
2. Invocar la misma ruta como PRE-03.
3. Invocar la misma ruta como PRE-06 (`admin`).
4. Invocar la misma ruta como PRE-12 (`superadmin`).
5. Invocar la misma ruta con `?limit=9999`.
- **Esperado:** paso 1 devuelve `200` y solo expedientes de PRE-02, agrupados con la clave `medications` como array de objetos `{ name, dosage, frequency, duration, instructions }`. Paso 2 devuelve solo los de PRE-03. Paso 3 devuelve los de todo el tenant. Paso 4 devuelve `200` con `[]`: el controlador pasa `tenantId` `undefined` al servicio para `superadmin`, la consulta queda con `tenant_id = NULL` y no coincide ninguna fila, por lo que la vista de superadmin esta rota. Paso 5 limita a 200 por el `Math.min` del controlador.
- **Red:** cinco respuestas `200` de `GET /api/clinical-records/prescriptions/all`; contar elementos y `clinical_record_id` distintos en cada una.
- **Limpieza:** no aplica, solo lectura.

### [RCT-004] El listado del paciente incluye expedientes sin receta

**Rol** `patient` · **Ruta** `/patient/prescriptions` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-08 (con receta de RCT-001), PRE-10 (sin receta).
- **Datos:** sesion de `user1@clinic.com`.
- **Pasos:**
1. Abrir `/patient/prescriptions`.
2. Contar los grupos mostrados.
3. Identificar cuales tienen `medications` vacio.
4. Invocar `GET /api/clinical-records/prescriptions/mine` y comparar.
- **Esperado:** `GET /api/clinical-records/prescriptions/mine` responde `200`. El servicio usa `LEFT JOIN prescriptions`, por lo que devuelve **todos** los expedientes del paciente, incluso los que no tienen receta, con `medications: []`. La UI debe mostrar un placeholder o vacio en lugar del grupo. Registrar como observacion el hecho de que la lista "Mis recetas" no filtra por `p.id IS NOT NULL`, de modo que el paciente ve expedientes sin medicamento. El texto de la cabecera usa `prescriptions:*` [verificar literal en es.json].
- **Red:** `GET /api/clinical-records/prescriptions/mine` con `200`; registrar cuantos elementos tienen `medications: []`.
- **Limpieza:** no aplica, solo lectura.

### [RCT-005] Rechaza medicamento duplicado en el mismo expediente

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08, PRE-11. PRE-08 ya tiene la receta "Amoxicilina" de RCT-001.
- **Datos:** intento 1 con `medication: "Amoxicilina"`; intento 2 con `medication: "amoxicilina"`; intento 3 con `medication: "AMOXICILINA"`; control con `medication: "Azitromicina"`.
- **Pasos:**
1. Crear desde la UI un medicamento con el mismo nombre que el existente.
2. Invocar el alta con las tres variantes de capitalizacion.
3. Invocar el alta con un medicamento distinto como control.
- **Esperado:** pasos 1 y 2 responden `400` con `message` = "This medication was already prescribed in this clinical record" (`PRESCRIPTION_DUPLICATE`), porque la comprobacion usa `ILIKE` y es insensible a mayusculas. El control responde `201`. Confirmar ademas que el mismo medicamento **si** se puede recetar en un expediente distinto.
- **Red:** tres `400` y un `201` de `POST /api/clinical-records/prescriptions`; un `201` adicional en otro expediente como control positivo.
- **Limpieza:** eliminar la receta del control con `DELETE /api/clinical-records/prescriptions/<id>`.

### [RCT-006] Valida el payload de la receta

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08.
- **Datos:** cinco cuerpos: sin `clinical_record_id`; sin `medication`; sin `dosage`; sin `frequency`; con `clinical_record_id: "8"` (string) y `medication` de 300 caracteres.
- **Pasos:**
1. Enviar cada cuerpo con `POST /api/clinical-records/prescriptions`.
2. Registrar codigo y detalle de cada respuesta.
- **Esperado:** los cuatro primeros responden `400` con detalle Zod sobre el campo faltante. El quinto responde `201` para el `clinical_record_id` string (el esquema usa `z.coerce`) y `400` para el `medication` de 300 caracteres, que supera el `max(255)`. Ninguna receta invalida creada.
- **Red:** cinco respuestas `4xx` de `POST /api/clinical-records/prescriptions` con el array `details` registrado.
- **Limpieza:** eliminar la receta creada por el quinto intento.

### [RCT-007] El doctor no puede recetar sobre el expediente de otro doctor

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-09.
- **Datos:** `{ clinical_record_id: <id_pre09>, medication: "Paracetamol", dosage: "500 mg", frequency: "cada 6 horas" }`.
- **Pasos:**
1. Con sesion de PRE-02, intentar crear la receta sobre PRE-09.
2. Con sesion de PRE-03 (propietario), crear la misma receta como control.
3. Con sesion de PRE-02, invocar el alta con un `clinical_record_id` inexistente.
- **Esperado:** paso 1 responde `400` con `message` = "You can only add prescriptions to your own records" (`PRESCRIPTION_OWN_ONLY`). Paso 2 responde `201`. Paso 3 responde `404` con `message` = "Clinical record not found" (`CLINICAL_RECORD_NOT_FOUND`). Ninguna receta queda asociada a PRE-09 por el paso 1.
- **Red:** un `400`, un `201` y un `404` de `POST /api/clinical-records/prescriptions`.
- **Limpieza:** eliminar la receta del control con `DELETE /api/clinical-records/prescriptions/<id>`.

### [RCT-008] El alta es transaccional y no deja recetas a medias

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08.
- **Datos:** dos peticiones `POST` simultaneas con el mismo `medication` sobre PRE-08.
- **Pasos:**
1. Enviar dos altas identicas en paralelo desde dos pestanas.
2. Contar las recetas creadas con ese medicamento en PRE-08.
3. Verificar el estado de PRE-08 en la base de datos.
- **Esperado:** exactamente una de las dos peticiones responde `201` y la otra `400` con `PRESCRIPTION_DUPLICATE`. El servicio usa un `pg_advisory_xact_lock` sobre `create_prescription:<record_id>:<tenant_id>` mas una transaccion con `BEGIN`/`COMMIT`, por lo que no puede quedar una receta parcial ni duplicada. PRE-08 conserva `status: "draft"`.
- **Red:** dos respuestas de `POST /api/clinical-records/prescriptions` (`201` y `400`); `GET /api/clinical-records/:record_id/prescriptions` con `200` y 1 elemento con ese medicamento.
- **Limpieza:** eliminar la receta creada con `DELETE /api/clinical-records/prescriptions/<id>`.

### [RCT-009] La edicion de receta responde 404 por captura de ruta

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions/:id` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08. PRE-08 tiene la receta de RCT-001.
- **Datos:** `PUT /api/clinical-records/prescriptions/<recipe_id>` con `{ dosage: "250 mg" }`; control `PUT /api/clinical-records/<id_pre08>` con `{ id: <id_pre08>, dosage: "250 mg" }`.
- **Pasos:**
1. Enumerar el orden de declaracion de las rutas `PUT` en el router.
2. Invocar el `PUT` sobre la ruta de receta.
3. Invocar el `PUT` sobre la ruta del expediente como control.
4. Como control adicional, invocar `PATCH /api/clinical-records/prescriptions/<recipe_id>`.
- **Esperado:** paso 2 responde `404` o `400`, porque `PUT /:id` se registro antes que `PUT /prescriptions/:id` y captura el prefijo `prescriptions` como si fuera el id del expediente. Paso 3 responde `200`, lo que confirma que la ruta de edicion de recetas es inalcanzable. Paso 4 responde `404` por ausencia de `PATCH`. Registrar el `404` como funcional, no como de seguridad: el recurso existe pero no se puede editar.
- **Red:** `404` o `400` de `PUT /api/clinical-records/prescriptions/:id`; `200` de `PUT /api/clinical-records/:id`; `404` de `PATCH`.
- **Limpieza:** restaurar `chief_complaint` de PRE-08 con un `PUT` al expediente y eliminar la receta por base de datos si no hay via de API (ver RCT-012).

### [RCT-010] La edicion no puede limpiar un campo con valor null

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08. Existe una receta con `duration` e `instructions` informados (creada en RCT-002).
- **Datos:** `{ duration: null, instructions: null, dosage: "500 mg" }`.
- **Pasos:**
1. Localizar la ruta funcional de edicion (ver resultado de RCT-009).
2. Si esta disponible, enviar el cuerpo con `null` en `duration` e `instructions` y `dosage` distinto.
3. Si devuelve `404`, invocar directamente el servicio mediante una ruta alternativa o registrar el caso como bloqueado.
4. Consultar el estado final de la receta.
- **Esperado:** los campos enviados en `null` **no se limpian**: el servicio usa `COALESCE($n, columna)`, por lo que un `null` conserva el valor anterior. Solo `dosage` cambia. Registrar este comportamiento como limitacion funcional si la ruta resulta accesible; en el caso contrario, dejar el caso bloqueado y anotarlo en la seccion 7.
- **Red:** `PUT` con `4xx` por el defecto de RCT-009, o `200` si la ruta fuera accesible; `GET /api/clinical-records/:record_id/prescriptions` con `200` y los valores finales.
- **Limpieza:** eliminar la receta por base de datos con autorizacion, dado que el borrado por API tampoco es accesible.

### [RCT-011] El listado por expediente no filtra ni pagina

**Rol** `doctor` · **Ruta** `/api/clinical-records/:record_id/prescriptions` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08. PRE-08 tiene 2 recetas.
- **Datos:** `record_id` de PRE-08; `record_id` inexistente `999999`; `record_id` de PRE-09 (ajeno).
- **Pasos:**
1. Invocar el listado del expediente propio.
2. Invocar el listado con `record_id` inexistente.
3. Invocar el listado del expediente de PRE-03 con sesion de PRE-02.
4. Intentar paginar con `?limit=1&offset=1`.
- **Esperado:** paso 1 devuelve `200` con 2 recetas ordenadas por `created_at` descendente. Paso 2 devuelve `200` con `[]`, no `404`. Paso 3 devuelve `200` con las recetas del expediente ajeno: la ruta no valida pertenencia y solo filtra por `tenant_id`, por lo que se expone un dato de otro doctor dentro del mismo tenant. Registrar la fuga. Paso 4 se ignora, la consulta no acepta paginacion.
- **Red:** cuatro respuestas `200` de `GET /api/clinical-records/:record_id/prescriptions` con los conteos anotados.
- **Limpieza:** eliminar las recetas de PRE-08 con `DELETE /api/clinical-records/prescriptions/<id>`.

### [RCT-012] El borrado de receta responde 404 por captura de ruta

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions/:id` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08. PRE-08 tiene al menos una receta.
- **Datos:** `DELETE /api/clinical-records/prescriptions/<recipe_id>`; control `DELETE /api/clinical-records/<id_pre08>`.
- **Pasos:**
1. Enumerar el orden de declaracion de las rutas `DELETE` en el router.
2. Invocar el borrado de la receta.
3. Consultar `GET /api/clinical-records/:record_id/prescriptions`.
4. Invocar el borrado del expediente como control.
- **Esperado:** paso 2 responde `404` o `400`, porque `DELETE /:id` se registro antes que `DELETE /prescriptions/:id`. Paso 3 confirma que la receta **sigue existiendo**: el borrado es inalcanzable por API. Paso 4 responde `200` y cancela el expediente completo, lo que demuestra que la UI puede eliminar un expediente con recetas pero no una receta aislada. Registrar el mensaje del servicio `deletePrescription`, que en su rama valida devuelve el literal en ingles "Prescription deleted successfully", no internacionalizado.
- **Red:** `404` o `400` de `DELETE /api/clinical-records/prescriptions/:id`; `200` de `GET /api/clinical-records/:record_id/prescriptions` con la receta presente; `200` o `404` de `DELETE /api/clinical-records/:id`.
- **Limpieza:** ⚠️ DESTRUCTIVO si se ejecuto el paso 4. Restaurar el expediente con `PUT` a `status: "draft"` autorizado por `admin` y eliminar la receta por base de datos con respaldo previo.

### [RCT-013] Descargar el PDF de la receta propia

**Rol** `patient` · **Ruta** `/patient/prescriptions` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-08. PRE-08 tiene la receta de RCT-001 y pertenece a PRE-04.
- **Datos:** `recipe_id` de la receta propia.
- **Pasos:**
1. Iniciar sesion como `user1@clinic.com` y abrir `/patient/prescriptions`.
2. Pulsar la accion de descargar el PDF de la receta.
3. Inspeccionar las cabeceras de la respuesta en la pestana Network.
4. Abrir el archivo descargado.
- **Esperado:** `GET /api/clinical-records/prescriptions/<recipe_id>/pdf` responde `200` con `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=receta-<recipe_id>.pdf`, `X-Content-Type-Options: nosniff` y `Cache-Control: private, no-store, no-cache, must-revalidate`. El archivo abre en un visor PDF y su contenido incluye el nombre del medicamento, la dosis, la frecuencia y la fecha.
- **Red:** una respuesta `200` con las cuatro cabeceras verificadas una por una.
- **Limpieza:** eliminar el archivo descargado de la carpeta de descargas del navegador.

### [RCT-014] El PDF no se puede descargar sin sesion

**Rol** `guest` · **Ruta** `/api/clinical-records/prescriptions/:id/pdf` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-08 con receta de RCT-001.
- **Datos:** peticiones sin cabecera `Authorization`; con un token expirado; con un token de otro tenant.
- **Pasos:**
1. Invocar la descarga sin cabecera `Authorization`.
2. Invocar la descarga con un JWT expirado.
3. Invocar la descarga con un token valido emitido para `clinica-sur` mientras la receta pertenece a `clinica-demo`.
4. Intentar la descarga directa por URL sin pasar por la UI.
- **Esperado:** pasos 1 y 2 responden `401` con `message` = "Token required" o "Invalid token". Paso 3 responde `401` con `message` = "Tenant mismatch" [verificar texto exacto en ejecucion]. Ningun caso devuelve contenido PDF. La UI no debe ofrecer un enlace directo que evite el control de autorizacion.
- **Red:** tres respuestas `401` de `GET /api/clinical-records/prescriptions/:id/pdf`; verificar que ninguna tenga `Content-Type: application/pdf`.
- **Limpieza:** no aplica, solo lectura.

### [RCT-015] El doctor no puede descargar el PDF de una receta ajena

**Rol** `doctor` · **Ruta** `/api/clinical-records/prescriptions/:id/pdf` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-09. PRE-09 tiene una receta creada por PRE-03.
- **Datos:** `recipe_id` de la receta de PRE-03.
- **Pasos:**
1. Con sesion de PRE-02, invocar la descarga del PDF.
2. Con sesion de PRE-03, invocar la misma descarga como control.
3. Con sesion de `lab_technician`, invocar la descarga.
4. Con sesion de PRE-04 (paciente de PRE-09), invocar la descarga.
- **Esperado:** paso 1 responde `400` con `message` = "Access denied", porque el controlador compara `prescription.doctor_id` con el doctor autenticado. Paso 2 responde `200` con el PDF. Paso 3 responde `403` con `message` = "Access denied" por `authorize(...)`, ya que la ruta no incluye `lab_technician`. Paso 4 responde `400` con `message` = "Access denied" por `patient_id` distinto. H-14 exige `403` o `404` en los casos de denegacion: registrar los `400` como desviacion semantica.
- **Red:** un `400`, un `200` con PDF, un `403` y un `400` de `GET /api/clinical-records/prescriptions/:id/pdf`.
- **Limpieza:** eliminar el archivo descargado en el paso 2.

### [RCT-016] El paciente no puede descargar el PDF de una receta ajena

**Rol** `patient` · **Ruta** `/api/clinical-records/prescriptions/:id/pdf` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-05, PRE-09. PRE-09 pertenece a PRE-05 y tiene receta.
- **Datos:** `recipe_id` de la receta de PRE-05; control `recipe_id` de la receta propia en PRE-08.
- **Pasos:**
1. Con sesion de PRE-04, invocar la descarga de la receta de PRE-05.
2. Invocar la descarga de un `recipe_id` inexistente (`999999`).
3. Invocar la descarga de la receta propia.
4. Manipular el `recipe_id` en la URL para probar un id de otro tenant.
- **Esperado:** paso 1 responde `400` con `message` = "Access denied". Paso 2 responde `404` con `message` = "Prescription not found". Paso 3 responde `200` con el PDF. Paso 4 responde `404`, porque el servicio filtra por `tenant_id`. Ninguna respuesta de denegacion incluye bytes de PDF.
- **Red:** un `400`, un `404`, un `200` con PDF y un `404` de la ruta de PDF.
- **Limpieza:** eliminar el archivo descargado en el paso 3.

### [RCT-017] El PDF respeta el aislamiento por tenant

**Rol** `admin` · **Ruta** `/api/clinical-records/prescriptions/:id/pdf` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-06, PRE-08 con receta. El tenant `clinica-sur` existe con su propio administrador.
- **Datos:** `recipe_id` de PRE-08 en `clinica-demo`; sesion del administrador de `clinica-sur`.
- **Pasos:**
1. Invocar la descarga con la sesion del admin de `clinica-sur`.
2. Invocar la descarga con la sesion de PRE-06 en `clinica-demo`.
3. Invocar `GET /api/clinical-records/prescriptions/mine` desde `clinica-sur` con un paciente de ese tenant.
- **Esperado:** paso 1 responde `404` con `message` = "Prescription not found", porque la consulta del servicio exige `p.tenant_id = $2`. Paso 2 responde `200`. Paso 3 responde `200` con los datos del propio tenant. Ningun dato de `clinica-demo` es visible desde `clinica-sur`.
- **Red:** un `404`, un `200` con PDF y un `200` de `GET /api/clinical-records/prescriptions/mine`, con el `tenant_id` de cada elemento verificado.
- **Limpieza:** eliminar el archivo descargado en el paso 2.

### [RCT-018] La UI de recetas del paciente no ofrece edicion ni borrado

**Rol** `patient` · **Ruta** `/patient/prescriptions` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-08 con receta de RCT-001.
- **Datos:** inspeccion de los botones disponibles en cada fila de la lista.
- **Pasos:**
1. Abrir `/patient/prescriptions` como PRE-04.
2. Enumerar las acciones disponibles por receta.
3. Intentar invocar `PUT` y `DELETE` sobre la receta con la sesion del paciente.
4. Verificar el estado de la receta al recargar.
- **Esperado:** la UI solo ofrece descargar el PDF y el detalle; no hay acciones de editar ni eliminar, en concordancia con las rutas, que restringen la escritura a `doctor`. Los intentos del paso 3 responden `403` con `message` = "Access denied". La receta permanece intacta.
- **Red:** dos `403` de `PUT /api/clinical-records/prescriptions/:id` y `DELETE /api/clinical-records/prescriptions/:id`; `GET /api/clinical-records/prescriptions/mine` con `200`.
- **Limpieza:** no aplica, no hay escritura efectiva.

### [RCT-019] La validacion de la UI no duplica ni omite el contrato del backend

**Rol** `doctor` · **Ruta** `/clinical-records` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08.
- **Datos:** formulario de receta con nombre de 256 caracteres, sin dosis y sin frecuencia.
- **Pasos:**
1. Escribir un nombre de medicamento de 256 caracteres y pulsar guardar.
2. Enviar el formulario con la dosis vacia.
3. Enviar el formulario con la frecuencia vacia.
4. Enviar un formulario valido de control.
- **Esperado:** los pasos 1 a 3 ideally no deben llegar al backend: se espera un error de validacion en linea con los textos `prescriptions:medicationName` = "Nombre del Medicamento", `prescriptions:dosage` = "Dosis" y `prescriptions:frequency` = "Frecuencia" [verificar literales en es.json]. Si la UI los envia, el backend responde `400` con detalle Zod. El control responde `201`. Registrar si la UI valida el limite de 255 caracteres o deja que el backend lo rechace.
- **Red:** hasta tres `400` y un `201` de `POST /api/clinical-records/prescriptions`; texto de los errores visible en la UI.
- **Limpieza:** eliminar la receta del control con `DELETE /api/clinical-records/prescriptions/<id>`.

### [RCT-020] H-62: el rol alias user no puede listar sus recetas

**Rol** `user` · **Ruta** `/patient/prescriptions` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-08 con receta. Existe una cuenta con rol almacenado `user` y expediente propio.
- **Datos:** sesion de la cuenta con rol `user`; control con `user1@clinic.com` (rol `patient`).
- **Pasos:**
1. Iniciar sesion con la cuenta de rol `user` e ir a `/patient/prescriptions`.
2. Invocar `GET /api/clinical-records/prescriptions/mine`.
3. Invocar `GET /api/clinical-records/prescriptions/:id/pdf` sobre la receta propia.
4. Repetir los pasos 2 y 3 con la cuenta `patient` como control.
5. Invocar `GET /api/clinical-records/prescriptions/all` con la cuenta de rol `user`.
- **Esperado:** los pasos 2 y 3 deben recibir `200` igual que el control, porque la ruta declara `authorize('user', 'patient')` y el controlador compara ambos literales. El paso 5 responde `403` con `message` = "Access denied". Si algun paso devuelve `403` solo para el rol `user`, H-62 queda confirmado como fallo de autorizacion por comparacion literal de rol.
- **Red:** cuatro respuestas `200` esperadas en los pasos 2, 3 y sus controles, y un `403` en el paso 5; registrar los codigos reales por rol.
- **Limpieza:** no aplica, solo lectura.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
| --- | --- | --- | --- |
| H-14 | El acceso denegado a una receta responde `400` con `message` = "Access denied" en lugar de `403` o `404`, tanto para doctor como para paciente. | RCT-015, RCT-016 | `400` con mensaje de acceso denegado; nunca `200` ni bytes de PDF ajenos. |
| H-62 | La autorizacion depende de comparaciones literales de rol (`role === 'user' || role === 'patient'`) replicadas en el controlador, en lugar de la tabla de roles canonicos. | RCT-020, RCT-015 | Una cuenta con rol `user` recibe `403` donde un `patient` obtiene `200`. |
| H-14-2 | `GET /api/clinical-records/:record_id/prescriptions` no valida que el expediente pertenezca al doctor autenticado: filtra solo por `tenant_id`. | RCT-011 | Un doctor obtiene `200` con las recetas del expediente de otro doctor del mismo tenant. |
| H-14-3 | `GET /api/clinical-records/prescriptions/mine` y `/all` usan `LEFT JOIN prescriptions` y devuelven expedientes sin receta con `medications: []`. | RCT-004, RCT-003 | La lista de recetas del paciente incluye expedientes sin ningun medicamento. |
| H-69 | El listado global esta roto para `superadmin`: el controlador pasa `tenantId` `undefined` y la consulta con `tenant_id = NULL` no devuelve filas. | RCT-003 | `GET /api/clinical-records/prescriptions/all` devuelve `200` con `[]` para `superadmin`. |
| H-70 | La edicion usa `COALESCE($n, columna)`, por lo que un `null` conserva el valor anterior y ningun campo opcional se puede limpiar. | RCT-010 | `duration` e `instructions` mantienen su valor tras un `PUT` con `null`. |
| H-71 | El mensaje de borrado exitoso del servicio es un literal en ingles, "Prescription deleted successfully", fuera del diccionario i18n. | RCT-012 | La respuesta de borrado no proviene de `es.json`. |
| H-72 | Falta paginacion en `GET /api/clinical-records/:record_id/prescriptions` y en `/prescriptions/mine`. | RCT-011, RCT-004 | `?limit` y `?offset` se ignoran en esos dos listados. |

> **Correccion 2026-10-02.** Este archivo afirmaba que `PUT`/`DELETE /prescriptions/:id` eran
> inalcanzables por sombreado de rutas de Express. Es **falso**: `/:id` (un segmento) no captura
> `/prescriptions/:id` (dos segmentos). Las rutas existen (`clinical-record.routes.ts:52-53`) y el
> frontend las llama bien con `put` (`prescription.service.ts:36`), asi que RCT-009 y RCT-012 deben
> dar `200`. Ese hallazgo local se descarto; los cuatro restantes se promovieron al registro global
> como H-69…H-72 tras verificar el codigo. Nota: `/prescriptions/all` **si** pagina (100 por
> defecto, tope 200), por lo que la afirmacion local de "sin paginacion" era incorrecta para ese
> endpoint.

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Como verificarlo |
| --- | --- | --- |
| No existe router en `/api/prescriptions` | Toda llamada a esa ruta devuelve `404`; los casos usan exclusivamente el prefijo `/api/clinical-records/prescriptions`. | Revisar los `app.use` de `src/app.ts`. |
| La receta no tiene estado ni vigencia | No hay `status` (`active`, `expired`, `cancelled`) ni `valid_until`, pese a que `es.json` define `prescriptions:statusLabels.active` = "Activa" y `expired` = "Vencida". | Revisar `prescriptionSchema` y la tabla `prescriptions` en `db/init.sql`. |
| El PDF no incluye firma digital ni sello | No hay verificacion de profesional firmante ni de codigo de verificacion consultable. | Abrir el PDF generado y enumerar su contenido. |
| No hay historial de cambios de la receta | Una edicion sobrescribe sin versionado ni auditoria. | Revisar la tabla `prescriptions` en `db/init.sql`. |
| La receta no enlaza con `lab_test_ids` ni con otros tipos de prescripcion | Solo existe un tipo de medicamento: no hay insumos, gotas oftalmicas ni recetas compuestas. | Revisar `prescriptionSchema` (un solo medicamento por fila). |
| El envio de la receta al paciente por correo no se verifica aqui | Queda fuera del alcance de esta area. | Hueco de cobertura: ver `99`. |
| El listado agrupado no distingue recetas canceladas | Sin estado en la tabla, no hay forma de ocultar una receta ya suspendida. | Confirmar la ausencia de la columna `status` en `prescriptions`. |
| El nombre del archivo del PDF no incluye al paciente | El nombre es `receta-<id>.pdf`; con varias recetas descargadas el paciente no puede distinguirlas sin abrirlas. | Descargar dos recetas y comparar los nombres. |
| `medication` de 255 caracteres no tiene validacion de plausibilidad clinica | Se aceptan cadenas arbitrarias, incluidos simbolos o marcadores de posicion sin letras. | Enviar un medicamento de 255 caracteres formado solo por simbolos. |
| Los mensajes de error de receta estan en ingles | El backend devuelve literales en ingles (`PRESCRIPTION_DUPLICATE`, `PRESCRIPTION_OWN_ONLY`) que la UI deberia traducir. | Comparar las respuestas del backend con las claves de `prescriptions:*` en `es.json`. |

## 7. Resultado del área

| Campo | Valor |
| --- | --- |
| Casos ejecutados | `____ / 20` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 9` |
| Huecos confirmados | `____ / 10` |
| Evidencia guardada en | `pruebas-navegador/evidencia/22-recetas-pdf/` |
| Tester / fecha | `________________` |

Criterio de aprobado del area: los 20 casos ejecutados en Passed, los 9 defectos de la seccion 5 confirmados y cero fugas de recetas entre pacientes, entre doctores y entre tenants en RCT-011, RCT-015, RCT-016, RCT-017 y RCT-020. Si la edicion y el borrado por API siguen devolviendo `404` (H-15), el area queda Approved con la cleanup de base de datos documentada.

---

Alcance: 20 casos sobre recetas medicas y su PDF en el tenant `pro`, cubriendo alta, validacion, duplicados, transaccionalidad, listados por rol, edicion, borrado, descarga del PDF, aislamiento entre pacientes, doctores y tenants, y los hallazgos H-14, H-62, H-69, H-70, H-71 y H-72. No cubre el ciclo del expediente (area 21), el envio por correo (hueco de cobertura: ver `99`) ni facturacion (area 24). Fecha de redaccion: 2026-10-01.

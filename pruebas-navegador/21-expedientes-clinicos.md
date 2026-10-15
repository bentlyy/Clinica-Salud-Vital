# 21 — Expedientes clínicos e historial

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
| --- | --- | --- | --- | --- | --- | --- |
| `21` | `CLI` | C2 | Semanal | 28 | `16`, `22` | `22` |

## 1. Qué cubre

Verificacion funcional del modulo de expedientes clinicos y del historial medico del paciente, con foco en la separacion de datos por rol, la validacion de entrada y la consistencia entre el backend y la UI.

Aspectos incluidos:

- Alta de expediente con el conjunto minimo (`patient_id` y `chief_complaint`) y con el conjunto completo (anamnesis, examen fisico, diagnostico, codigos CIE-10, plan de tratamiento, notas).
- Registro de los ocho signos vitales, incluido el BMI calculado, y el rechazo de campos no reconocidos por el esquema estricto.
- Vinculacion opcional con una cita (`booking_id`) y rechazo de citas de otros pacientes.
- Listado por rol: el doctor ve solo lo suyo, el admin ve todo el tenant, el superadmin ve todos los tenants, el paciente ve lo suyo y excluye los cancelados.
- Filtros de listado (`patient_id`, `doctor_id`, `status`) y paginacion por `limit` y `offset`.
- Detalle de expediente con `prescriptions` y `lab_results` embebidos.
- Actualizacion con `PUT` (exige `id` en el body) y bloqueo de expedientes en estado `completed`.
- Borrado de expedientes solo en estado `draft` y solo por su doctor propietario.
- Catalogo CIE-10: busqueda, categorias y detalle por codigo, incluyendo el bloqueo para pacientes.
- Historial medico: listado global y por paciente, alta, edicion, y la restriccion de escritura a staff.
- Los hallazgos H-14, H-22, H-60, H-62, H-63 y H-68 aplicados a esta área.

No cubre: la emision de recetas y el PDF (area 22), la vista de resultados de laboratorio desde el expediente (cubierta aqui solo como dato embebido, ciclo completo en area 23) ni el calculo de derivaciones a especialistas.

## 2. Roles y rutas

| Rol | Acceso a la UI | Endpoints que puede usar |
| --- | --- | --- |
| `patient` | `/patient/clinical-records`, `/medical-history/:id` | `GET /api/clinical-records`, `GET /api/clinical-records/:id`, `GET /api/clinical-records/:id/lab-results` |
| `user` | Igual que `patient` | Igual que `patient` |
| `doctor` | `/clinical-records`, `/patient-history` | `GET/POST/PUT/DELETE /api/clinical-records`, `GET/POST/PATCH/DELETE /api/medical-history` |
| `admin` | `/clinical-records`, `/admin/medical-history` | `GET /api/clinical-records`, `GET /api/medical-history`, `POST/PATCH/DELETE /api/medical-history`, CIE-10 |
| `superadmin` | Igual que `admin` | Igual que `admin` (el tenant no se restringe) |
| `lab_technician` | Sin UI de expedientes | `403` en las rutas con `authorize(...)` |
| `guest` | Sin sesion | `401` en todas las rutas (`authMiddleware` global) |

| Superficie | Ruta / Metodo | Archivo |
| --- | --- | --- |
| Listado | `GET /api/clinical-records` | `src/modules/clinical-record/clinical-record.routes.ts:42` |
| Detalle | `GET /api/clinical-records/:id` | `src/modules/clinical-record/clinical-record.routes.ts:43` |
| Laboratorio del expediente | `GET /api/clinical-records/:id/lab-results` | `src/modules/clinical-record/clinical-record.routes.ts:44` |
| Por paciente | `GET /api/clinical-records/patient/:patient_id` | `src/modules/clinical-record/clinical-record.routes.ts:45` |
| Alta | `POST /api/clinical-records` | `src/modules/clinical-record/clinical-record.routes.ts:46` |
| Actualizacion | `PUT /api/clinical-records/:id` | `src/modules/clinical-record/clinical-record.routes.ts:47` |
| Borrado | `DELETE /api/clinical-records/:id` | `src/modules/clinical-record/clinical-record.routes.ts:48` |
| Recetas del expediente | `GET /api/clinical-records/:record_id/prescriptions` | `src/modules/clinical-record/clinical-record.routes.ts:50` |
| CIE-10 busqueda | `GET /api/clinical-records/cie10/search?q=` | `src/modules/clinical-record/clinical-record.routes.ts:35` |
| CIE-10 categorias | `GET /api/clinical-records/cie10/categories` | `src/modules/clinical-record/clinical-record.routes.ts:36` |
| CIE-10 detalle | `GET /api/clinical-records/cie10/:code` | `src/modules/clinical-record/clinical-record.routes.ts:37` |
| Historial global | `GET /api/medical-history` | `src/modules/medical-history/medical-history.routes.ts:26` |
| Historial por paciente | `GET /api/medical-history/patient/:patientId` | `src/modules/medical-history/medical-history.routes.ts:25` |
| Historial alta | `POST /api/medical-history` | `src/modules/medical-history/medical-history.routes.ts:27` |
| Historial edicion | `PATCH /api/medical-history/:id` | `src/modules/medical-history/medical-history.routes.ts:28` |
| Historial borrado | `DELETE /api/medical-history/:id` | `src/modules/medical-history/medical-history.routes.ts:29` |
| UI expedientes | `clinical_records:*` | `frontend/src/modules/clinical-records/pages/ClinicalRecordsPage.tsx` |
| UI historial | `medical_history:*` | `frontend/src/modules/medical-history/pages/MedicalHistoryPage.tsx` |

Nota de enrutamiento: las rutas `GET /:id` y `PUT /:id` se declaran antes que `GET /patient/:patient_id` y `PUT /prescriptions/:id` en el mismo router, por lo que las rutas de coleccion con prefijo literal pueden quedar capturadas por la ruta parametrizada. CLI-013 y CLI-018 verifican este comportamiento en ejecucion.

## 3. Precondiciones de datos

| ID | Requisito | Valor |
| --- | --- | --- |
| PRE-01 | Tenants | `clinica-demo` (plan `pro`) y `clinica-sur` (plan `basic`, sin feature `laboratory`) |
| PRE-02 | Doctor principal | `juan@clinic.com` en `clinica-demo`, con al menos un expediente propio |
| PRE-03 | Doctor alterno | `carmen@clinic.com` en `clinica-demo` |
| PRE-04 | Paciente principal | `user1@clinic.com` con historial clinico mas completo |
| PRE-05 | Paciente ajeno | `user2@clinic.com`, sin relacion clinica con PRE-02 |
| PRE-06 | Administrador | `admin@clinic.com`, password `$ADMIN_PASSWORD` (preguntar al administrador) |
| PRE-07 | Patron de password seed | `Vitaria.<parte-local-email>.<ano>!` |
| PRE-08 | Expediente de trabajo | Registro en estado `draft` de PRE-04 creado por PRE-02, sin recetas |
| PRE-09 | Expediente completado | Registro en estado `completed` de PRE-04 creado por PRE-02 |
| PRE-10 | Expediente ajeno | Registro en estado `draft` de PRE-05 creado por PRE-03 |
| PRE-11 | Cita propia | Cita confirmada de PRE-04 con PRE-02 (creada en el area 16) |
| PRE-12 | Cita ajena | Cita confirmada de PRE-05 con PRE-02 (creada en el area 16) |
| PRE-13 | Catalogo CIE-10 | Poblado con al menos 50 codigos; debe existir el prefijo `J06` (faringitis) |
| PRE-14 | Entrada de historial residual | Registro `id = 27` del caso H-60, perteneciente a `user1@clinic.com`, en estado `active` |

Restricciones de limpieza: los expedientes creados por estos casos se eliminan con `DELETE /api/clinical-records/:id` solo mientras esten en `draft`; si el caso los deja en `completed`, la limpieza exige `PUT` a `draft` previo o se marca como destructivo. Las entradas de historial se eliminan con `DELETE /api/medical-history/:id` usando sesion de staff.

## 4. Casos

### [CLI-001] Crear expediente con el conjunto minimo de datos

**Rol** `doctor` · **Ruta** `/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-06 (sesion `doctor` de PRE-02).
- **Datos:** `{ patient_id: <id_user1>, chief_complaint: "Dolor de garganta" }`.
- **Pasos:**
1. En el formulario "Nuevo Expediente", seleccionar a PRE-04 como paciente y escribir la consulta principal.
2. Dejar vacios anamnesis, examen fisico, diagnostico, plan de tratamiento, notas y signos vitales.
3. Guardar.
4. Abrir el detalle del expediente creado.
- **Esperado:** `POST /api/clinical-records` responde `201`. El registro nace con `status: "draft"` (default de la base) y `chief_complaint` igual al texto enviado. Los campos opcionales quedan en `null`. La tabla muestra la fila y la etiqueta de estado `clinical_records:statusLabels.draft` [verificar literal en es.json].
- **Red:** `POST /api/clinical-records` con `201`; `GET /api/clinical-records/:id` con `200` y `status: "draft"`.
- **Limpieza:** `DELETE /api/clinical-records/:id` con sesion de PRE-02 y confirmar `404` en una segunda llamada.

### [CLI-002] Crear expediente completo con CIE-10 y plan de tratamiento

**Rol** `doctor` · **Ruta** `/clinical-records` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-13.
- **Datos:** `patient_id` de PRE-04; `chief_complaint`: "Fiebre y tos"; `anamnesis`: texto de 3 lineas; `physical_exam`: "Faringe eritematosa"; `diagnosis`: "Faringitis aguda"; `cie10_codes`: `["J06"]`; `treatment_plan`: "Antibiotico 7 dias"; `notes`: "Control en 15 dias".
- **Pasos:**
1. Crear el expediente con todos los campos desde el formulario.
2. Abrir el detalle y verificar cada seccion: Consulta Principal, Diagnostico, Tratamiento, Notas.
3. Confirmar que el codigo CIE-10 aparece asociado al expediente.
- **Esperado:** `POST /api/clinical-records` responde `201` con los 7 campos persistidos. El detalle muestra los valores exactos enviados, incluidos `cie10_codes: ["J06"]`. No se pierde ningun campo opcional.
- **Red:** `POST /api/clinical-records` con `201`; `GET /api/clinical-records/:id` con `200` y los 7 campos.
- **Limpieza:** `DELETE /api/clinical-records/:id`.

### [CLI-003] Registrar los ocho signos vitales incluido el BMI

**Rol** `doctor` · **Ruta** `/clinical-records` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04.
- **Datos:** `vital_signs` = `{ blood_pressure: "120/80", heart_rate: 72, temperature: 37.5, respiratory_rate: 18, oxygen_saturation: 98, weight: 70.5, height: 175, bmi: 23.0 }`.
- **Pasos:**
1. Crear el expediente con el bloque de signos vitales completo.
2. Abrir el detalle y leer la seccion "Signos Vitales".
3. Crear un segundo expediente enviando `heart_rate` y `weight` como cadenas (`"72"`, `"70.5"`).
- **Esperado:** pasos 1 y 2 muestran los 8 valores; `blood_pressure` se conserva como texto. Paso 3 responde `201` y los numeros se convierten a number gracias al `z.coerce`, confirmando que el esquema acepta strings numericos.
- **Red:** dos `POST /api/clinical-records` con `201`; `GET /api/clinical-records/:id` con `200` y los 8 campos de `vital_signs`.
- **Limpieza:** `DELETE` de ambos expedientes.

### [CLI-004] Rechaza signos vitales con un campo no reconocido

**Rol** `doctor` · **Ruta** `/api/clinical-records` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04.
- **Datos:** `vital_signs` = `{ temperature: 37, saturacion: 98 }` (clave en espanol en lugar de `oxygen_saturation`).
- **Pasos:**
1. Invocar `POST /api/clinical-records` con el bloque anterior.
2. Invocar el mismo alta con `vital_signs` = `{}` como control.
- **Esperado:** paso 1 responde `400` con detalle de Zod de tipo `unrecognized_keys` sobre `saturacion`, confirmando que `vitalSignsSchema` es `.strict()`. Paso 2 responde `201`. Ninguna fila creada por el paso 1.
- **Red:** un `400` con array `details` y un `201` de `POST /api/clinical-records`.
- **Limpieza:** `DELETE` del expediente del control.

### [CLI-005] Rechaza consulta principal vacia

**Rol** `doctor` · **Ruta** `/clinical-records` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04.
- **Datos:** `chief_complaint` = `""`; control `chief_complaint` = "A".
- **Pasos:**
1. Guardar el expediente con la consulta principal vacia desde el formulario.
2. Invocar el alta con `chief_complaint` = `""`.
3. Invocar el alta con `chief_complaint` = "A" como control de longitud minima.
- **Esperado:** pasos 1 y 2 responden `400` con `message` = "Motivo de consulta es requerido". Paso 3 responde `201`, confirmando que el minimo es 1 caracter y no 3.
- **Red:** dos `400` y un `201` de `POST /api/clinical-records`.
- **Limpieza:** `DELETE` del expediente del control.

### [CLI-006] Rechaza campos desconocidos en el alta (esquema estricto)

**Rol** `doctor` · **Ruta** `/api/clinical-records` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04.
- **Datos:** cuerpo con `patient_id`, `chief_complaint` y dos claves extra: `motivo` y `seguro_medico`.
- **Pasos:**
1. Invocar `POST /api/clinical-records` con el cuerpo anterior.
2. Como control, reenviar el mismo cuerpo sin las claves extra.
- **Esperado:** paso 1 responde `400` con detalle `unrecognized_keys` para `motivo` y `seguro_medico`. Paso 2 responde `201`.
- **Red:** un `400` y un `201` de `POST /api/clinical-records`.
- **Limpieza:** `DELETE` del expediente del control.

### [CLI-007] Crear expediente vinculado a una cita propia

**Rol** `doctor` · **Ruta** `/clinical-records` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-11.
- **Datos:** `booking_id` = id de PRE-11.
- **Pasos:**
1. Crear el expediente con `booking_id` de PRE-11.
2. Verificar el vinculo en el detalle.
3. Intentar vincular el mismo `booking_id` a un segundo expediente.
- **Esperado:** paso 1 responde `201` y el detalle muestra la cita asociada. Paso 3 responde `400` o `409` con mensaje de conflicto de vinculacion [verificar codigo de error exacto en ejecucion], porque la validacion comprueba que la cita pertenece al mismo doctor y al mismo paciente antes de insertar.
- **Red:** `POST /api/clinical-records` con `201`; segundo intento con `4xx`; `GET /api/bookings/:id` para confirmar que la cita sigue activa.
- **Limpieza:** `DELETE` de ambos expedientes si se crearon; en caso contrario no aplica.

### [CLI-008] Rechaza vincular una cita de otro paciente

**Rol** `doctor` · **Ruta** `/api/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-05, PRE-12.
- **Datos:** `patient_id` = id de PRE-04, `booking_id` = id de PRE-12 (cita de PRE-05 con PRE-02).
- **Pasos:**
1. Invocar `POST /api/clinical-records` con ambos identificadores.
2. Intentar el mismo alta con una `booking_id` inexistente (`999999`).
- **Esperado:** ambos intentos responden `400` con mensaje de acceso denegado o de cita no encontrada [verificar texto exacto en ejecucion]. Ningun expediente creado: la validacion cruza `bookings.doctor_id`, `bookings.user_id` y `tenant_id` antes de insertar.
- **Red:** dos `400` de `POST /api/clinical-records`; `GET /api/clinical-records?patient_id=<id_user1>` sin aumento de conteo.
- **Limpieza:** no aplica, no hay escritura.

### [CLI-009] El doctor lista solo sus propios expedientes ordenados por fecha

**Rol** `doctor` · **Ruta** `/clinical-records` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-04, PRE-05, PRE-08, PRE-10.
- **Datos:** PRE-08 pertenece a PRE-02; PRE-10 pertenece a PRE-03.
- **Pasos:**
1. Abrir `/clinical-records` con sesion de PRE-02.
2. Contar filas y comparar con `GET /api/clinical-records?limit=200`.
3. Repetir con sesion de PRE-03.
4. Intentar forzar `?doctor_id=<id_otro>`.
- **Esperado:** paso 2 devuelve solo expedientes de PRE-02, ordenados por `created_at` descendente (mas reciente primero). Paso 3 devuelve solo los de PRE-03. Paso 4 se ignora: el filtro `doctor_id` se sobrescribe con el id del doctor autenticado, por lo que el resultado no cambia.
- **Red:** tres `200` de `GET /api/clinical-records`; comparar el conjunto de `doctor_id` devueltos.
- **Limpieza:** no aplica, solo lectura.

### [CLI-010] El admin lista todo el tenant y el superadmin todos los tenants

**Rol** `admin` · **Ruta** `/api/clinical-records` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-08, PRE-10.
- **Datos:** sesion de PRE-06 (`admin`) y sesion de `superadmin@clinic.com`.
- **Pasos:**
1. Invocar `GET /api/clinical-records?limit=200` como `admin`.
2. Repetir la llamada con `X-Tenant-Id: clinica-sur` como `admin`.
3. Repetir la llamada como `superadmin` sin cabecera de tenant.
4. Filtrar por `status=draft`.
- **Esperado:** paso 1 devuelve expedientes de PRE-02 y PRE-03, todos con `tenant_id` = `clinica-demo`. Paso 2 devuelve unicamente los de `clinica-sur`. Paso 3 devuelve expedientes de los dos tenants, porque el controlador pasa `tenantId` `undefined` al servicio cuando el rol es `superadmin`. Paso 4 devuelve solo los `draft`.
- **Red:** cuatro `200` de `GET /api/clinical-records`; registrar el `tenant_id` de cada elemento.
- **Limpieza:** no aplica, solo lectura.

### [CLI-011] Filtros y paginacion del listado

**Rol** `admin` · **Ruta** `/api/clinical-records` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-08, PRE-09, PRE-10.
- **Datos:** consultas `?patient_id=<id>`, `?status=completed`, `?limit=1&offset=0`, `?limit=1&offset=1`, `?limit=abc` y `?offset=-5`.
- **Pasos:**
1. Invocar cada consulta y registrar conteo y contenido.
2. Verificar que la pagina 1 y la pagina 2 no comparten elementos.
- **Esperado:** los filtros `patient_id` y `status` se aplican. `limit=1&offset=0` y `limit=1&offset=1` devuelven elementos distintos, confirmando el offset. `limit=abc` cae al default de 100. `offset=-5` devuelve `[]` o el conjunto completo segun la interpretacion de PostgreSQL; registrar el comportamiento. Ninguna consulta expone un total de paginas.
- **Red:** seis respuestas `200` de `GET /api/clinical-records` con conteos de elementos.
- **Limpieza:** no aplica, solo lectura.

### [CLI-012] H-22: el paciente ve sus expedientes sin toast de acceso denegado

**Rol** `patient` · **Ruta** `/patient/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-08, PRE-09. Sesion iniciada como `user1@clinic.com`.
- **Datos:** conteo de toasts visibles con el texto "No tienes permisos para acceder a esta página".
- **Pasos:**
1. Iniciar sesion como `user1@clinic.com` e ir a `/patient/clinical-records`.
2. Contar los toasts de acceso denegado durante la carga completa de la pagina y esperar 5 segundos sin interactuar.
3. Revisar la consola del navegador y la pestana Network para identificar toda peticion que devuelva `4xx`.
4. Anotar el estado del listado y el texto de la cabecera `clinical_records:total_label` = "Total: {{count}} expedientes" [verificar literal en es.json].
- **Esperado:** `GET /api/clinical-records` responde `200` con un array (no con error) y el listado se muestra. El conteo de toasts de acceso denegado debe ser **0**. Ninguna peticion de la carga inicial debe devolver `403`. Resultado actual esperado segun H-22: **2 toasts**, lo que indica que un componente hijo dispara una peticion prohibida que el controlador filtra en un segundo render.
- **Red:** `GET /api/clinical-records` con `200` y `[]` o con elementos propios; registrar cualquier `403` adicional identificado en el paso 3.
- **Limpieza:** no aplica, solo lectura.

### [CLI-013] El paciente no puede pedir expedientes de otro paciente

**Rol** `patient` · **Ruta** `/api/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-05, PRE-10.
- **Datos:** `patient_id` = id de PRE-05; control `patient_id` = id de PRE-04.
- **Pasos:**
1. Invocar `GET /api/clinical-records?patient_id=<id_pre05>` como `user1@clinic.com`.
2. Invocar `GET /api/clinical-records/patient/<id_pre05>` como el mismo usuario.
3. Invocar `GET /api/clinical-records/patient/<id_pre04>` (propio) como control.
- **Esperado:** paso 1 responde `400` con `message` = "Access denied" (literal del backend, `E.ACCESS_DENIED`), porque el controlador fuerza el filtro al id del usuario para roles `user` y `patient`. Paso 2 se espera `400` por dos motivos encadenados: la ruta `GET /:id` se declara antes que `GET /patient/:patient_id`, por lo que `patient` se captura como `id` y falla la validacion numerica. Paso 3 debe devolver `200`; si devuelve `4xx`, queda confirmado que la ruta de paciente es inalcanzable.
- **Red:** tres respuestas de `GET /api/clinical-records` y `GET /api/clinical-records/patient/:patient_id` con los codigos anotados.
- **Limpieza:** no aplica, solo lectura.

### [CLI-014] El detalle incluye prescripciones y resultados de laboratorio

**Rol** `doctor` · **Ruta** `/clinical-records` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08. PRE-08 tiene al menos una receta creada en el area 22.
- **Datos:** `id` de PRE-08.
- **Pasos:**
1. Invocar `GET /api/clinical-records/<id>` y registrar las claves del objeto devuelto.
2. Invocar `GET /api/clinical-records/<id>/lab-results`.
3. Invocar `GET /api/clinical-records/<id>/prescriptions`.
- **Esperado:** paso 1 devuelve el expediente mas las claves `prescriptions` (array) y `lab_results` (array), populated desde las tablas hijas. Paso 2 devuelve `200` con el array de resultados de laboratorio del expediente, o `[]` si no hay. Paso 3 devuelve `200` con las recetas del expediente (ruta restringida a `doctor` y `admin`).
- **Red:** tres `200` de `GET /api/clinical-records/:id`, `GET /api/clinical-records/:id/lab-results` y `GET /api/clinical-records/:record_id/prescriptions`.
- **Limpieza:** no aplica, solo lectura. La receta se elimina en el area 22.

### [CLI-015] H-14: el acceso a un expediente ajeno no debe devolver 200

**Rol** `doctor` · **Ruta** `/api/clinical-records/:id` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-10. PRE-10 es un expediente `draft` de PRE-05 creado por PRE-03.
- **Datos:** `id` de PRE-10.
- **Pasos:**
1. Con sesion de PRE-02, invocar `GET /api/clinical-records/<id_pre10>`.
2. Con sesion de PRE-02, invocar `PUT /api/clinical-records/<id_pre10>` con `{ id, chief_complaint: "secuestro" }`.
3. Con sesion de PRE-02, invocar `DELETE /api/clinical-records/<id_pre10>`.
4. Con sesion de PRE-04 (paciente de otro expediente), invocar `GET /api/clinical-records/<id_pre10>`.
- **Esperado:** paso 1 responde `400` con `message` = "Access denied" (literal del backend, `E.ACCESS_DENIED`), no el texto en espanol; el toast en la UI, si se dispara, usa `errors.accessDenied` = "No tienes permisos para acceder a esta página". Los pasos 2, 3 y 4 no devuelven `200` ni exponen datos del expediente ajeno. En los pasos 1, 2 y 4 el codigo lanza `BadRequestError(E.ACCESS_DENIED)`, es decir `400` con un mensaje de permiso, y en el paso 3 el borrado filtra por `doctor_id` y devuelve `404` porque no retorna filas. H-14 exige `403` o `404`: registrar la desviacion (`400` con mensaje de acceso denegado) como observacion, y confirmar que jamas se devuelve `200`.
- **Red:** respuestas `400`, `404` y `400` de los tres verbos; `GET /api/clinical-records/<id_pre10>` como `admin` con `200` como control.
- **Limpieza:** no aplica, no hay escritura efectiva. Verificar que `chief_complaint` de PRE-10 sigue siendo el original.

### [CLI-016] Actualizar un expediente con PUT exige el id en el body

**Rol** `doctor` · **Ruta** `/clinical-records` · **P0** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08.
- **Datos:** `PUT /api/clinical-records/<id_pre08>` con `{ id, diagnosis: "Faringitis bacteriana", treatment_plan: "Antibiotico 7 dias" }`; control sin `id` en el body.
- **Pasos:**
1. Editar el expediente desde la UI y guardar.
2. Invocar el `PUT` con el `id` en el body.
3. Invocar el `PUT` sin `id` en el body.
- **Esperado:** pasos 1 y 2 responden `200` y el expediente conserva el resto de campos, incluidos los opcionales que no se enviaron (actualizacion parcial). Paso 3 responde `400` con detalle de Zod porque `updateClinicalRecordSchema` extiende el esquema de alta con `id` obligatorio. La UI debe funcionar pese a no enviar `id` de forma explicita: registrar si aparece o no la incidencia.
- **Red:** tres respuestas de `PUT /api/clinical-records/:id` con los codigos anotados; `GET /api/clinical-records/:id` con `200` y `diagnosis` actualizado.
- **Limpieza:** restaurar `diagnosis` al valor original con un segundo `PUT` y luego `DELETE` del expediente.

### [CLI-017] Un expediente completed no se puede modificar

**Rol** `doctor` · **Ruta** `/api/clinical-records` · **P1** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-09.
- **Datos:** `id` de PRE-09 con `status: "completed"`; `PUT` con `{ id, diagnosis: "diagnostico nuevo" }`.
- **Pasos:**
1. Invocar el `PUT` sobre PRE-09.
2. Consultar `GET /api/clinical-records/<id_pre09>` y leer `diagnosis` y `status`.
- **Esperado:** paso 1 responde `400` con mensaje de expediente completado, porque el servicio bloquea la edicion cuando el estado actual es `completed`. El `diagnosis` permanece intacto y el estado sigue en `completed`.
- **Red:** `PUT` con `400`; `GET /api/clinical-records/:id` con `200`, `status: "completed"` y `diagnosis` original.
- **Limpieza:** no aplica. PRE-09 debe permanecer `completed` para el area 22; si el caso lo altera, marcar como fallo.

### [CLI-018] H-68: la UI envía PATCH y el backend solo expone PUT

**Rol** `doctor` · **Ruta** `/api/clinical-records/:id` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-08.
- **Datos:** `PATCH /api/clinical-records/<id_pre08>` con `{ diagnosis: "vía PATCH" }`; `PUT` con el mismo body mas `id`.
- **Pasos:**
1. Inspeccionar la peticion de red que emite el servicio del frontend al guardar un expediente.
2. Invocar `PATCH /api/clinical-records/<id_pre08>` manualmente.
3. Invocar `PUT` con el mismo cuerpo como control.
- **Esperado:** paso 2 responde `404` o `405` (no existe la ruta). Paso 3 responde `200`. Si el paso 1 muestra que la UI usa `PATCH`, el guardado desde el formulario falla en silencio y el defecto H-68 queda confirmado con el `404` del paso 2; si la UI ya usa `PUT`, registrar la correccion y dejar constancia de la divergencia entre capas.
- **Red:** `PATCH` con `404` o `405`; `PUT` con `200`; peticion del formulario registrada en el paso 1.
- **Limpieza:** restaurar `diagnosis` con un `PUT` y `DELETE` del expediente.

### [CLI-019] Eliminar un expediente en estado draft

**Rol** `doctor` · **Ruta** `/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04. Existe un expediente `draft` creado por CLI-001.
- **Datos:** `id` del expediente `draft`.
- **Pasos:**
1. Pulsar "Eliminar" en la fila del expediente y confirmar el dialogo `clinical_records:confirm_delete_title` [verificar literal en es.json].
2. Confirmar la eliminacion.
3. Recargar la tabla.
4. Consultar `GET /api/clinical-records/<id>`.
- **Esperado:** `DELETE /api/clinical-records/:id` responde `200` y el registro desaparece del listado. Paso 4 responde `404`. El borrado se materializa como un `UPDATE ... SET status = 'cancelled'` en la base, por lo que la fila no se elimina fisicamente: verificar con una consulta directa que `status` quedo en `cancelled` y que la fila sigue existiendo.
- **Red:** `DELETE /api/clinical-records/:id` con `200`; `GET /api/clinical-records/:id` con `404`; `GET /api/clinical-records` con `200` sin la fila.
- **Limpieza:** la fila queda como `cancelled` en la base. Registrarla como residuo conocido y eliminarla por SQL solo con autorizacion del administrador de base de datos.

### [CLI-020] No se puede eliminar un expediente completed ni uno ajeno

**Rol** `doctor` · **Ruta** `/api/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-03, PRE-09, PRE-10.
- **Datos:** `id` de PRE-09 (`completed`, de PRE-02) y `id` de PRE-10 (`draft`, de PRE-03).
- **Pasos:**
1. Con sesion de PRE-02, invocar `DELETE` sobre PRE-09.
2. Con sesion de PRE-02, invocar `DELETE` sobre PRE-10 (ajeno pero `draft`).
3. Verificar con `admin` que ambos expedientes siguen existiendo.
- **Esperado:** los dos intentos responden `404`, porque el borrado exige simultaneamente `status = 'draft'` y `doctor_id` igual al del doctor autenticado. Ningun dato se modifica.
- **Red:** dos `404` de `DELETE /api/clinical-records/:id`; `GET /api/clinical-records/:id` como `admin` con `200` en ambos casos.
- **Limpieza:** no aplica, no hay escritura efectiva.

### [CLI-021] Eliminar un expediente con recetas y resultados asociados

**Rol** `doctor` · **Ruta** `/api/clinical-records` · **P1** · **DESTRUCTIVO** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04. Un expediente `draft` con una receta creada en el area 22 y, opcionalmente, con una solicitud de laboratorio vinculada desde el area 23.
- **Datos:** `id` del expediente con dependencias; `recipe_id` de la receta asociada.
- **Pasos:**
1. Registrar el estado previo: receta, solicitud de laboratorio y paciente.
2. Confirmar con el administrador de la base de datos que se tomo un respaldo del registro antes de ejecutar.
3. Invocar `DELETE /api/clinical-records/<id>`.
4. Consultar `GET /api/clinical-records/prescriptions/<recipe_id>/pdf` y `GET /api/clinical-records/<id>/lab-results`.
- **Esperado:** el `DELETE` responde `200` y el expediente queda en `cancelled`. Paso 4 revela el comportamiento de integridad referencial: la receta puede quedar huerfana o devolver `404`, y los resultados de laboratorio permanecen asociados. Registrar exactamente que ocurre, porque un `cancelled` logico no debe dejar datos inconsistentes. Este caso es destructivo: la fila no se puede restaurar desde la UI.
- **Red:** `DELETE` con `200`; `GET /api/clinical-records/prescriptions/:id/pdf` y `GET /api/clinical-records/:id/lab-results` con los codigos anotados.
- **Limpieza:** restaurar el expediente con un `PUT` a `status: "draft"` autorizado por `admin` y volver a crear la receta. Requiere intervencion de base de datos; no intentar sin respaldo.

### [CLI-022] H-63: el gating de features solo esta activo en laboratorio

**Rol** `admin` · **Ruta** `/api/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. Sesion de `admin@clinica-sur.com` en el tenant `clinica-sur` con plan `basic`.
- **Datos:** `GET /api/clinical-records` en `clinica-sur` frente a `GET /api/laboratory` en el mismo tenant.
- **Pasos:**
1. Invocar `GET /api/laboratory` con la sesion del tenant `clinica-sur` como control.
2. Invocar `GET /api/clinical-records` con la misma sesion.
3. Invocar `GET /api/medical-history` con la misma sesion.
4. Invocar `GET /api/waitlist` con la misma sesion.
- **Esperado:** paso 1 responde `403` por `requireFeature('laboratory')`. Los pasos 2, 3 y 4 responden `200`, confirmando que el unico modulo con gating de feature es el laboratorio. H-63 documenta que el resto de modulos no respeta el plan del tenant: registrar los tres `200` como observacion y abrir la incidencia correspondiente, ya que un plan `basic` no deberia habilitar modulos de la plataforma.
- **Red:** un `403` y tres `200` de los cuatro endpoints, todos en el tenant `clinica-sur`.
- **Limpieza:** no aplica, solo lectura.

### [CLI-023] H-62: reconocimiento del rol alias user

**Rol** `user` · **Ruta** `/patient/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-08. Existe una cuenta con rol almacenado `user` en la base, distinta de `patient`.
- **Datos:** sesion de la cuenta con rol `user`; control con `user1@clinic.com` (rol `patient`).
- **Pasos:**
1. Iniciar sesion con la cuenta de rol `user` e ir a `/patient/clinical-records`.
2. Invocar `GET /api/clinical-records` con esa sesion.
3. Invocar `GET /api/clinical-records/:id` sobre PRE-08 con esa sesion.
4. Repetir los pasos 2 y 3 con la cuenta `patient` como control.
- **Esperado:** el controlador compara `req.user.role === 'user' || req.user.role === 'patient'`, por lo que ambas cuentas deben recibir el mismo tratamiento: paso 2 con `200` filtrado a su propio id, paso 3 con `403` o `400` de acceso denegado para un expediente ajeno. Si el rol `user` devuelve `403` en el listado, H-62 queda confirmado como fallo de autorizacion.
- **Red:** cuatro respuestas de `GET /api/clinical-records` y `GET /api/clinical-records/:id` con los codigos anotados por rol.
- **Limpieza:** no aplica, solo lectura.

### [CLI-024] Catalogo CIE-10: busqueda, categorias y detalle

**Rol** `doctor` · **Ruta** `/clinical-records` · **P2** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-13.
- **Datos:** `q` = "faring"; `q` = "J06"; `q` = "xyzqqq"; `/categories`; `/J06`.
- **Pasos:**
1. Invocar `GET /api/clinical-records/cie10/search?q=faring` y registrar los codigos devueltos.
2. Invocar la busqueda con `q` = "J06" y con `q` inexistente.
3. Invocar `GET /api/clinical-records/cie10/categories` y contar categorias.
4. Invocar `GET /api/clinical-records/cie10/J06` y con un codigo inexistente `ZZZ99`.
- **Esperado:** paso 1 devuelve coincidencias que incluyen `J06`. Paso 2 con codigo exacto devuelve el registro; sin coincidencias devuelve `200` con `[]`, no `404`. Paso 3 devuelve el listado de categorias [verificar clave i18n del selector]. Paso 4 devuelve el registro completo y `404` para el inexistente.
- **Red:** cinco respuestas `200` de los endpoints CIE-10, con el codigo `404` esperado solo para `ZZZ99`.
- **Limpieza:** no aplica, solo lectura.

### [CLI-025] El catalogo CIE-10 no esta disponible para pacientes

**Rol** `patient` · **Ruta** `/api/clinical-records/cie10` · **P2** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-13.
- **Datos:** sesion de `user1@clinic.com`.
- **Pasos:**
1. Invocar `GET /api/clinical-records/cie10/search?q=faring` como paciente.
2. Invocar `GET /api/clinical-records/cie10/categories` como paciente.
3. Invocar `GET /api/clinical-records/cie10/J06` como paciente.
4. Como `lab_technician`, repetir el paso 1.
- **Esperado:** pasos 1, 2, 3 y 4 responden `403` con `message` = "Access denied" (literal del backend), porque las tres rutas CIE-10 restringen a `doctor` y `admin` y no incluyen `patient` ni `lab_technician`. El toast en la UI, si se dispara, usa `errors.accessDenied` = "No tienes permisos para acceder a esta página". Ningun dato del catalogo se filtra.
- **Red:** cuatro respuestas `403` de los endpoints CIE-10.
- **Limpieza:** no aplica, solo lectura.

### [CLI-026] Listar el historial medico global y por paciente

**Rol** `doctor` · **Ruta** `/patient-history` · **P1** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-02, PRE-04, PRE-05, PRE-14.
- **Datos:** `patientId` = id de PRE-04; `patientId` = id de PRE-05.
- **Pasos:**
1. Invocar `GET /api/medical-history/patient/<id_pre04>` y contar entradas.
2. Invocar `GET /api/medical-history` sin filtro y comparar el conteo.
3. Repetir el paso 1 con PRE-05.
4. Invocar `GET /api/medical-history?patient_id=<id_pre05>`.
- **Esperado:** los cuatro pasos responden `200` con arrays. El paso 1 devuelve solo las entradas de PRE-04, incluida la entrada residual `id = 27`. El paso 2 devuelve el conjunto del tenant. El paso 4 acepta el filtro `patient_id` y su resultado coincide con el paso 3. La cabecera del listado muestra `medical_history:patient_entries` = "Tu historial: {{count}} entradas" [verificar literal en es.json].
- **Red:** cuatro respuestas `200` de `GET /api/medical-history` y `GET /api/medical-history/patient/:patientId` con conteos de elementos.
- **Limpieza:** no aplica, solo lectura.

### [CLI-027] El alta de historial medico falla con la fecha que envia la UI

**Rol** `admin` · **Ruta** `/admin/medical-history` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-06 (sesion `admin`).
- **Datos:** intento 1 desde la UI con `condition` = "Hipertension", `status` = "chronic" y `onset_date` de tipo `date` (`YYYY-MM-DD`); intento 2 con `onset_date` = `2024-03-15`; intento 3 con `onset_date` = `2024-03-15T00:00:00.000Z`; intento 4 con `patient_id` = "1" (string).
- **Pasos:**
1. Crear la entrada desde el formulario `/admin/medical-history` escribiendo la fecha de inicio.
2. Invocar `POST /api/medical-history` con el cuerpo del intento 2.
3. Invocar el mismo endpoint con el cuerpo del intento 3.
4. Invocar el mismo endpoint con el cuerpo del intento 4 y `onset_date` valido.
- **Esperado:** pasos 1 y 2 responden `400` con detalle de Zod `Invalid datetime`, porque el esquema exige `z.string().datetime()` (ISO 8601 con hora y zona) mientras la UI y el formulario envian solo `YYYY-MM-DD`. Paso 3 responde `201`, lo que confirma que el endpoint funciona y que el defecto esta en el contrato entre la UI y el backend. Paso 4 responde `400` porque el esquema usa `z.number()` sin `z.coerce`, a diferencia del resto de modulos. Ninguna entrada creada en los pasos fallidos.
- **Red:** dos `400`, un `201` y un `400` de `POST /api/medical-history`; registrar el texto exacto del array `details`.
- **Limpieza:** eliminar la entrada creada en el paso 3 con `DELETE /api/medical-history/:id`.

### [CLI-028] H-60: el paciente no puede escribir ni borrar su historial

**Rol** `patient` · **Ruta** `/api/medical-history` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-04, PRE-05, PRE-14. La entrada `id = 27` pertenece a PRE-04 y esta en estado `active`.
- **Datos:** `id` = 27; `condition` = "Diabetes tipo 2"; `status` = "active".
- **Pasos:**
1. Invocar `POST /api/medical-history` como `user1@clinic.com`.
2. Invocar `PATCH /api/medical-history/27` como el mismo usuario.
3. Invocar `DELETE /api/medical-history/27` como el mismo usuario.
4. Invocar `DELETE /api/medical-history` (sin id) como el mismo usuario y como `admin`.
5. Como `admin`, verificar el estado de la entrada 27 tras los intentos.
- **Esperado:** los pasos 1, 2 y 3 responden `403` con `message` = "Access denied" (literal del backend; el toast de la UI usa `errors.accessDenied` = "No tienes permisos para acceder a esta página"), porque la escritura y el borrado restringen a `doctor`, `admin` y `superadmin`. El paso 4 responde `404` en ambos casos: no existe la ruta de coleccion. Confirmado H-60: el paciente no tiene ninguna via para corregir ni limpiar su propia entrada, y la entrada `id = 27` permanece visible de forma indefinida. El paso 5 muestra `200` con la entrada intacta.
- **Red:** tres `403` de `POST`, `PATCH /:id` y `DELETE /:id`; un `404` de `DELETE /api/medical-history` por rol; `GET /api/medical-history/patient/<id_pre04>` con `200`.
- **Limpieza:** la entrada 27 no se puede limpiar desde la API. Requiere una intervencion autorizada en base de datos; registrarla como deuda de datos en la seccion 7.

## 5. Defectos conocidos a verificar primero

| ID | Defecto | Caso que lo ejercita | Observable esperado |
| --- | --- | --- | --- |
| H-22 | En `/patient/clinical-records` el listado responde `200` pero se muestran 2 toasts "No tienes permisos para acceder a esta página". | CLI-012 | `GET /api/clinical-records` con `200` y conteo de toasts de acceso denegado igual a 2 en lugar de 0. |
| H-60 | No existe `DELETE /api/medical-history` de coleccion y el paciente no puede borrar su entrada: el registro residual `id = 27` no se puede limpiar desde la UI ni desde la API. | CLI-028 | `DELETE /api/medical-history` responde `404`; `DELETE /api/medical-history/:id` responde `403` para el paciente; la entrada permanece. |
| H-14 | El acceso denegado responde `400` con `message` = "Access denied" en lugar de `403` o `404`: un mensaje de permiso viaja en un codigo de error de peticion invalida, y el literal del backend esta en ingles mientras la UI lo traduce con `errors.accessDenied`. | CLI-015, CLI-013 | `400` con mensaje de acceso denegado; nunca `200` ni fuga de datos del recurso ajeno. |
| H-63 | El gating de features solo esta aplicado a `laboratory`; los demas modulos responden `200` en tenants con plan que no los incluye. | CLI-022 | `GET /api/laboratory` con `403` frente a `GET /api/clinical-records`, `GET /api/medical-history` y `GET /api/waitlist` con `200` en `clinica-sur`. |
| H-62 | La autorizacion depende de comparaciones literales de rol en el controlador, duplicadas por endpoint, en lugar de la tabla de roles canonicos. | CLI-023, CLI-013, CLI-025 | Un rol alias `user` puede recibir `403` en el listado que un `patient` si obtiene, o `400` en lugar de `403`. |
| H-68 | El servicio del frontend envia `PATCH /api/clinical-records/:id` y el backend solo expone `PUT /:id`. | CLI-018 | `PATCH` responde `404` o `405`; el guardado desde la UI no persiste. |
| H-60-2 | El esquema de historial medico exige `z.string().datetime()` para `onset_date` mientras la UI envia `YYYY-MM-DD`; el alta desde el formulario es imposible. | CLI-027 | `POST /api/medical-history` responde `400` con `Invalid datetime` desde la UI y `201` solo con ISO completo. |
| H-60-3 | El esquema de historial medico usa `z.number()` sin `z.coerce` para `patient_id`, a diferencia del resto de modulos, por lo que rechaza el id enviado como string. | CLI-027 | `POST /api/medical-history` con `patient_id: "1"` responde `400`. |
| H-14-2 | Las rutas `GET /:id` y `PUT /:id` se declaran antes que las rutas de coleccion con prefijo literal (`GET /patient/:patient_id`, `PUT /prescriptions/:id`), por lo que las captura la ruta parametrizada. | CLI-013, CLI-014 | `GET /api/clinical-records/patient/5` responde `400` en lugar de `200`. |
| H-14-3 | El borrado logico de un expediente deja la fila en `cancelled`; los datos clinicalos nunca se eliminan y las recetas asociadas pueden quedar huerfanas. | CLI-019, CLI-021 | La fila permanece con `status: "cancelled"` y la receta sigue asociada. |

## 6. Huecos conocidos

| Hueco | Impacto en las pruebas | Como verificarlo |
| --- | --- | --- |
| No existe `PATCH /api/clinical-records/:id` | La edicion depende de `PUT` con `id` obligatorio en el body; la UI usa `PATCH` (H-68). | Enumerar los verbos de `clinical-record.routes.ts`. |
| No existe total de paginacion | El listado devuelve un array plano sin `total` ni `total_pages`; el frontend no puede mostrar el total real. | Revisar `clinical_records:labelDisplayedRows` frente a la respuesta de `GET /api/clinical-records`. |
| El estado `draft` no tiene etiqueta en `es.json` confirmada | CLI-001 usa `[verificar literal en es.json]` para la etiqueta de estado. | Buscar `statusLabels` bajo `clinical_records` en `es.json`. |
| El enum de `status` solo admite `draft`, `completed` y `cancelled` | No hay estados intermedios ni `signed`; el ciclo documental es minimo. | Revisar `updateClinicalRecordSchema` y el `CHECK` de la columna en `db/init.sql`. |
| `status` no se puede fijar en el alta | El schema de creacion no acepta `status`: todo expediente nace `draft` y requiere un `PUT` para cerrarse. | Revisar `createClinicalRecordSchema` (no incluye `status`). |
| Los signos vitales se validan en rango solo por tipo | El esquema acepta cualquier numero, incluidos negativos o fuera del rango clinico; no hay validacion de plausibilidad. | Enviar `temperature: -50` y `heart_rate: 900` y observar que se aceptan. |
| No hay filtro por rango de fechas | El listado solo filtra por paciente, doctor y estado; no hay `from` ni `to`. | Revisar `ClinicalRecordQuery` en el servicio. |
| El BMI se recibe, no se calcula | `bmi` es un campo de entrada mas; el backend no lo deriva de `weight` y `height`. | Crear un expediente con `weight` y `height` y `bmi` ausente. |
| El historial medico no tiene auditoria de cambios | `PATCH` sobrescribe sin registrar autor ni fecha de modificacion. | Revisar la tabla `medical_history` en `db/init.sql`. |
| El namespace `medical_history` incluye `status_family` pero el enum no acepta `family` | La UI puede ofrecer un estado que el backend rechaza con `400`. | Comparar `medical_history:status_family` con el enum de `medical-history.routes.ts:13`. |
| Sin cobertura del PDF de recetas | El PDF se valida en el area 22. | Ver area 22. |
| Sin cobertura de notificaciones de expediente | No se valida si la creacion de un expediente notifica al paciente. | Buscar llamadas a `notificationService` en `clinical-record.service.ts`. |

## 7. Resultado del área

| Campo | Valor |
| --- | --- |
| Casos ejecutados | `____ / 28` |
| Casos Approved | `____` |
| Casos Fallidos | `____` |
| Casos Blocked | `____` |
| Casos N/A | `____` |
| Defectos H-xx confirmados | `____ / 10` |
| Huecos confirmados | `____ / 12` |
| Evidencia guardada en | `pruebas-navegador/evidencia/21-expedientes-clinicos/` |
| Tester / fecha | `________________` |

Criterio de aprobado del area: los 28 casos ejecutados en Passed, los 10 defectos de la seccion 5 confirmados con el observable indicado y ninguna fuga de datos entre pacientes en CLI-013, CLI-015, CLI-023 y CLI-025. La entrada residual `id = 27` de H-60 debe quedar registrada como pendiente de limpieza autorizada.

---

Alcance: 28 casos sobre expedientes clinicos e historial medico en los tenants `pro` y `basic`, cubriendo alta, validacion, listado por rol, filtros, paginacion, detalle, actualizacion, borrado logico, CIE-10, historial medico y los hallazgos H-68, H-14, H-22, H-60, H-62 y H-63. No cubre recetas ni PDF (area 22), el ciclo de resultados de laboratorio (area 23) ni facturacion (area 24). Fecha de redaccion: 2026-10-01.

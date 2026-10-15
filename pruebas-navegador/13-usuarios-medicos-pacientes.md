# 13 — Usuarios, médicos y pacientes

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `13` | `USR` | C2 | Semanal | 22 | `11` | `16`, `17`, `18`, `20`, `23` |

## 1. Qué cubre

- Superficie real del backend. **No existe un router `/api/users`.** Todo lo relativo a usuarios y médicos
  vive en `/api/doctors`: `GET|POST /api/doctors`, `PATCH /api/doctors/:id`, `GET /api/doctors/me`,
  `GET /api/doctors/public` (sin sesión), `POST /api/doctors/register`, `POST /api/doctors/invite`,
  `GET /api/doctors/users` y `PATCH /api/doctors/users/:userId/active`. El `superadmin` tiene su
  propia copia en `/api/super-admin/users`.
- Filtros de `role` y `search` de usuarios resueltos en PostgreSQL (`ILIKE` sobre `name` y `email`), con
  el filtro de estado `active`/`inactive` aplicado en el cliente.
- Paginación real de `GET /api/doctors/users` (`page`, `limit`, tope 100) frente a la falsa de
  `GET /api/doctors`, que devuelve un arreglo plano.
- Alta por dos caminos: `POST /api/doctors/register` para médicos (crea `users` + `doctors` +
  `doctor_availability` en una transacción) e `POST /api/doctors/invite` (solo envía correo, no crea la
  cuenta) para pacientes y técnicos.
- Regresión H-19: `POST /api/doctors` con `specialty_id` debe devolver **201**.
- Validación y normalización del RUT chileno (`cleanRut` → `validateRut` → `formatRut`) y rechazo del RUT
  duplicado, cuyo filtro es **global** y no incluye `tenant_id`.
- Especialidades: `GET /api/specialties` y `GET /api/specialties/:id` funcionan **sin sesión**; `POST`,
  `PUT` y `DELETE` exigen `admin` o `superadmin` y son `.strict()`.
- Aislamiento por tenant del alta de usuario, del RUT y del correo.
- Auditoría: el trigger `security_audit` sobre `users` solo registra `UPDATE` y `DELETE`.
- Alias de rol `user`, que el frontend normaliza a `patient` con `normalizeRole()`.

No cubre: el login, el 2FA y las sesiones (área `10-`), la matriz de RBAC y el BOLA (área `11-`), el
onboarding que crea tenants (área `14-`), los listados de superadmin (área `15-`) y los datos de
laboratorio que consumen el catálogo de médicos (área `23-`).

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints que puede usar |
|---|---|---|
| `admin` | `/users`, `/doctors`, `/specialties`, `/patients` | `GET /api/doctors/users`, `PATCH /api/doctors/users/:userId/active`, `GET|POST /api/doctors`, `PATCH /api/doctors/:id`, `POST /api/doctors/register`, `POST /api/doctors/invite`, `GET|POST /api/specialties`, `PUT|DELETE /api/specialties/:id` |
| `superadmin` | `/users` renderiza `SuperAdminUsersPage`, `/tenants`, `/specialties` | Igual que `admin`, más `GET /api/super-admin/users` y `PATCH /api/super-admin/users/:userId/active` (H-61) |
| `doctor` | `/patients`, `/patient-history` | `GET /api/doctors`, `GET /api/doctors/users`, `GET /api/doctors/me`. **No** `POST|PATCH /api/doctors` ni `PATCH /api/doctors/users/:userId/active` |
| `lab_technician` | — | Ninguno de esta área |
| `patient`, `user` | — | Ninguno: `/users`, `/doctors`, `/specialties` exigen `ADMIN_STAFF` y `/patients` exige `admin` o `doctor` |
| `anónimo` | `/booking`, `/login` | `GET /api/doctors/public`, `GET /api/specialties`, `GET /api/specialties/:id` |

Tabla de autorización por endpoint:

| Endpoint | `authorize(...)` | Control adicional |
|---|---|---|
| `GET /api/doctors` | `admin`, `superadmin`, `doctor` | Arreglo plano, sin envoltorio ni paginación; el frontend pagina en falso |
| `GET /api/doctors/public` | *(ninguno)* | Solo `id`, `name`, `specialty`; `Cache-Control: public, max-age=60` |
| `GET /api/doctors/me` | `doctor` | Perfil por `user_id` de sesión; `404 DOCTOR_PROFILE_NOT_FOUND` sin fila en `doctors` |
| `POST /api/doctors` | `admin`, `superadmin` | Sin `user_id` delega en `registerDoctor`; con `user_id` exige `users.role = 'doctor'` |
| `PATCH /api/doctors/:id` | `admin`, `superadmin` | Esquema `.strict()` que **solo** admite `name` y `specialty` |
| `POST /api/doctors/register` | `admin` | `users` + `doctors` + 5 filas de disponibilidad; `201 { message, doctor, email }`, **sin contraseña** |
| `POST /api/doctors/invite` | `admin`, `superadmin` | `201 { message }`; firma JWT `purpose: 'invite'` con 7 días |
| `GET /api/doctors/users` | `admin`, `superadmin`, `doctor` | `{ data, pagination }`; `search` por `ILIKE`, `role` exacto |
| `PATCH /api/doctors/users/:userId/active` | `admin`, `superadmin` | `UPDATE users SET active = NOT active` por `tenant_id`; al desactivar revoca `refresh_tokens` |
| `GET /api/specialties` | *(ninguno)* | Filtra por `tenant_id`; agrupa médicos por `tenant_id:name` |
| `POST /api/specialties` | `admin`, `superadmin` | `.strict()`; acepta `doctors[]` y `tenant_id` |
| `GET /api/super-admin/users` | `superadmin` | Listado global, no filtrado por tenant |

## 3. Precondiciones de datos

| Id | Precondición | Cómo se cumple |
|---|---|---|
| PRE-01 | `ADMIN_PASSWORD` y `SUPERADMIN_PASSWORD` disponibles | Preguntar al administrador **antes** de empezar; no hay fallback |
| PRE-02 | Sesión de `admin@clinic.com` en el tenant `default` | `POST /api/auth/login` |
| PRE-03 | Sesión de `superadmin@clinic.com` | `POST /api/auth/login`; su `tenant_id` es `NULL` |
| PRE-04 | Sesión de `juan@clinic.com` (médico de Cardiología) con fila en `doctors` | Seed estándar, patrón `Vitaria.<parte-local-email>.<año>!` |
| PRE-05 | Sesión de `user1@clinic.com` (paciente con historial) | Seed estándar |
| PRE-06 | Al menos 25 usuarios en el tenant `default` | Seed estándar: 4 médicos, 1 técnico, 3 pacientes y el admin. Si no llegan a 25, registrar el total real y ajustar USR-002 |
| PRE-07 | Un `user_id` real de `doctor` del tenant `default`, para USR-009 | `GET /api/doctors/users?role=doctor` y cruzar con `GET /api/doctors` por `user_id` |
| PRE-08 | Un `specialty_id` real del tenant `default` | `GET /api/specialties` |
| PRE-09 | Un RUT válido y libre del tenant para las altas de prueba | Calcular el dígito verificador con el módulo 11; no reutilizar el de `user1@clinic.com` |
| PRE-10 | Correo `EMAIL_TEST` configurado | Sin él, USR-016, USR-017 y USR-003 quedan `BLOQUEADO` |
| PRE-11 | `clinica-norte` operativo, con `admin@norte.clinic.com` | Seed estándar, patrón `Vitaria.<parte-local-email>.<año>!` |
| PRE-12 | Conocimiento del `user_id` de un paciente de `clinica-norte` y de su `patient_id` equivalente | `GET /api/doctors/users?role=patient` con la sesión de `clinica-norte` |
| PRE-13 | `ALLOW_DESTRUCTIVE=true` anotado | Solo para USR-006 |

Todos los datos creados llevan el prefijo `QA-` en `name`, `email` y `specialty` (USR-021).

## 4. Casos

### [USR-001] Listar usuarios aplicando el filtro de rol y el buscador en el servidor

**Rol** `admin` · **Ruta** `/users` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-06. El navegador está limpio.
- **Datos:** filtro de rol `patient`; texto de búsqueda `QA-` y, en control, `user1@clinic.com`.
- **Pasos:**
  1. Iniciar sesión con PRE-02 y abrir `/users`.
  2. Seleccionar el rol "Paciente" en el desplegable etiquetado con `users:role`.
  3. Esperar a que la tabla se estabilice y anotar las filas y la petición.
  4. Escribir `user1` en el buscador con su texto accesible `Buscar por nombre o email...`.
  5. Anotar el `role` y el `search` que viajan en la URL de la petición.
- **Esperado:** el paso 3 emite `GET /api/doctors/users?page=1&limit=10&role=patient` → `200` con
  `{ data, pagination }`, y todas las filas de `data` traen `role` igual a `patient`. El paso 4 envía
  `search=user1` y reduce el resultado a la fila de `user1@clinic.com`; el filtro se resuelve en
  PostgreSQL con `ILIKE` sobre `name` y `email`, no en el cliente. Cada fila expone `id`, `email`, `name`,
  `role`, `rut`, `phone`, `active` y `created_at`, y ninguna trae `password` ni `totp_secret`. El subtítulo
  de la cabecera muestra el conteo de `pagination.total` [verificar literal de `users:total_users` en
  `es.json`].
- **Red:** un `200` de `GET /api/doctors/users`; verificar `role` y `search` en la cadena de consulta y
  `data[].role` en el cuerpo.
- **Limpieza:** ninguna, el caso solo lee.

### [USR-002] Verificar la paginación real del listado y el filtro de estado en el cliente

**Rol** `admin` · **Ruta** `/users` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-06, con más de 10 usuarios activos y al menos 1 inactivo en `default`.
- **Datos:** `limit` por defecto 10 de la tabla; estado `active` y `inactive`.
- **Pasos:**
  1. En `/users`, avanzar a la segunda página con el control de paginación de MUI.
  2. Anotar `pagination.total`, `pagination.totalPages` y el `id` de la primera fila de cada página.
  3. Aplicar el filtro de estado "Inactivos" y contar las filas visibles.
  4. Comparar ese conteo con el `total` que devuelve la misma petición.
- **Esperado:** el paso 1 emite `GET /api/doctors/users?page=2&limit=10` → `200` con filas distintas de
  la página 1 y con `pagination.total` igual al número real de usuarios del tenant; el servidor acota
  `limit` a 100. El paso 3 es un filtro **de cliente**: `GET /api/doctors/users` **no** acepta un
  parámetro de estado, la respuesta llega con los 20 primeros usuarios y la tabla reduce la vista a los
  inactivos, de modo que el número de filas no coincide con `pagination.total`. Registrar los dos
  números como evidencia de que la paginación y el filtro de estado no están alineados.
- **Red:** dos `200` de `GET /api/doctors/users`, con `page` distinto y sin ningún parámetro de estado.
- **Limpieza:** ninguna.

### [USR-003] Crear un usuario desde la UI según el rol elegido

**Rol** `admin` · **Ruta** `/users` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-09, PRE-10.
- **Datos:** `QA- Medico Alta`, `qa.medico.alta@clinic.com`, especialidad `QA-Cardiología`, RUT válido de
  PRE-09; para el segundo alta, `QA- Paciente Alta`, `qa.paciente.alta@clinic.com`, rol `patient`.
- **Pasos:**
  1. Pulsar "Nuevo Usuario" (`users:newUser`) y abrir el diálogo.
  2. Elegir rol "Doctor", rellenar los campos y enviar.
  3. Repetir el alta con rol "Paciente" y un correo nuevo.
  4. Anotar los cuerpos enviados y los códigos de respuesta.
- **Esperado:** con rol `doctor`, la UI **no** llama a `/api/doctors` sino a `POST /api/doctors/register`
  → `201` con `{ message: "Doctor registrado correctamente. Instrucciones enviadas por email.", doctor, email }`;
  la respuesta **no incluye contraseña**, solo `email`. Con rol `patient`, la UI llama a
  `POST /api/doctors/invite` → `201` con `{ message: "Invitación enviada correctamente" }` y **no crea
  ninguna fila en `users`**: el alta real ocurre cuando el invitado se registra (USR-017). Registrar los
  literales de los dos mensajes y el texto del toast [verificar literal de `users:userCreated` y
  `users:inviteSent` en `es.json`]. Si `POST /api/doctors/invite` no envía correo porque falta
  `EMAIL_TEST`, marcar el caso `BLOQUEADO`, nunca `FALLÓ`.
- **Red:** un `201` de `POST /api/doctors/register` y un `201` de `POST /api/doctors/invite`; verificar
  `doctor.email` y `message` en el cuerpo.
- **Limpieza:** USR-016 y USR-017 completan el alta del médico y del paciente; si se omiten, eliminar el
  alta del médico con `POST /api/auth/reset-admin` **no** es válido: no hay `DELETE /api/users/:id`
  (USR-006). Anotar el `email` creado como deuda de limpieza.

### [USR-004] Confirmar que no existe endpoint de edición de usuario

**Rol** `admin` · **Ruta** `/users` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-05.
- **Datos:** el `id` de `user1@clinic.com`; un cuerpo de edición `{ name: "QA- Editado", phone: "+56900000000" }`.
- **Pasos:**
  1. En `/users`, buscar `user1` y abrir "Ver detalle".
  2. Localizar el texto que explica la ausencia de edición.
  3. Invocar `PATCH /api/users/<id>`, `PUT /api/users/<id>` y `PATCH /api/doctors/users/<id>` con el
     cuerpo de edición.
  4. Anotar los tres códigos de respuesta.
- **Esperado:** el paso 2 muestra el literal
  `"La edición de usuarios estará disponible próximamente. El endpoint de actualización no existe aún en el backend."`
  [verificar literal exacto de `users:edit_limitation` en `es.json`]. Los tres `PATCH`/`PUT` del paso 3
  responden `404`, porque `src/app.ts` no monta `/api/users` y el router de médicos solo expone
  `PATCH /api/doctors/:id` (médicos) y `PATCH /api/doctors/users/:userId/active` (activación). Confirmar
  que la fila de `user1@clinic.com` conserva `name` y `phone` originales después de los tres intentos.
- **Red:** tres `404`; el `404` de `/api/doctors/users/<id>` no debe confundirse con el `200` de
  `/api/doctors/users/<id>/active`.
- **Limpieza:** ninguna, todas las peticiones fallan.

### [USR-005] Desactivar un usuario y comprobar el efecto en su sesión

**Rol** `admin` · **Ruta** `/users` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02 y una segunda sesión abierta de `user2@clinic.com` en otra pestaña.
- **Datos:** el `id` de `user2@clinic.com`; el motivo del diálogo de confirmación.
- **Pasos:**
  1. En `/users`, localizar `user2@clinic.com` y pulsar el icono con nombre accesible
     `Desactivar usuario`.
  2. Confirmar en el diálogo y esperar la respuesta.
  3. En la otra pestaña, navegar a `/dashboard` y luego a cualquier recurso de la API.
  4. Intentar iniciar sesión de nuevo con `user2@clinic.com`.
  5. Volver a activar el usuario desde `/users`.
- **Esperado:** el paso 2 emite `PATCH /api/doctors/users/<id>/active` → `200` con `{ id, email, name,
  role, active: false }`; la fila pasa al estado "Inactivo". El paso 3 falla: el `access_token` ya emitido
  sigue siendo válido hasta expirar porque la revocación solo alcanza a `refresh_tokens`, así que anota
  si `/dashboard` carga con datos o si la API responde `401`. El paso 4 debe fallar el login con un error
  de credenciales o de cuenta deshabilitada; registrar el `message` literal que devuelva
  `POST /api/auth/login`. El paso 5 devuelve `active: true`.
- **Red:** dos `200` de `PATCH /api/doctors/users/<id>/active`, uno por cada toggle; verificar `active`
  en ambos cuerpos.
- **Limpieza:** el usuario queda activo tras el paso 5. Si el paso 5 falla, usar
  `PATCH /api/doctors/users/<id>/active` de nuevo e informar como hallazgo.

### [USR-006] ⚠️ DESTRUCTIVO Comprobar que no existe borrado de usuario y su efecto en cascada

**Rol** `admin` · **Ruta** `/users` · **P2** · **Resultado** `______`
- **Precondición:** `ALLOW_DESTRUCTIVE=true` anotado y autorización explícita del operador. PRE-02.
  Crear un usuario desechable con `POST /api/doctors/register` y anotar su `users.id`.
- **Datos:** el `id` del usuario desechable `QA- Descartable`.
- **Pasos:**
  1. Buscar el usuario `QA-` en `/users` y comprobar qué acciones ofrece la fila.
  2. Invocar `DELETE /api/users/<id>`, `DELETE /api/doctors/users/<id>` y `DELETE /api/doctors/<id>`.
  3. Consultar `GET /api/doctors/users?search=QA- Descartable`.
- **Esperado:** la fila solo ofrece "Ver detalle" y el toggle de activación: **no hay acción de borrar**,
  pese a que `es.json` declara `users:confirmDelete` ("¿Estás seguro de que deseas eliminar este
  usuario?") [verificar literal en `es.json`]. Los tres `DELETE` del paso 2 responden `404`, porque no
  existe ninguna ruta de borrado de usuario ni de médico en `src/app.ts`; el paso 3 sigue listando al
  usuario, así que nada se borró. Consecuencia: **una baja de usuario es irreversible en el producto**;
  la única forma de deshacerla es desactivar. Si el operador autoriza el borrado manual por base de datos,
  la cascada `fk_user ... ON DELETE SET NULL` sobre `bookings` dejaría las citas huérfanas y `fk_doctor ...
  ON DELETE CASCADE` eliminaría las citas del médico; verificar ambas antes de ejecutar.
- **Red:** tres `404` y un `200` de listado que confirma que el usuario sigue existiendo.
- **Limpieza:** si se borró por base de datos, no queda nada que limpiar; en caso contrario, desactivar el
  usuario con `PATCH /api/doctors/users/<id>/active` y anotar la fila como deuda.

### [USR-007] Comprobar que el rol propio y el rol ajeno no se pueden cambiar

**Rol** `admin` · **Ruta** `/users` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03. El `user_id` de PRE-02 y el de PRE-03, anotados.
- **Datos:** `PATCH /api/doctors/users/<propio>/active` con el propio `user_id`; `PATCH /api/users/<propio>`
  con `{ role: "superadmin" }`.
- **Pasos:**
  1. En `/users`, abrir el detalle del propio usuario `admin@clinic.com` y buscar un control de rol.
  2. Invocar `PATCH /api/doctors/users/<propio>/active` sobre la propia cuenta.
  3. Invocar `PATCH /api/users/<propio>` con `{ role: "superadmin" }`.
  4. Repetir el paso 3 con el `user_id` de `user2@clinic.com`.
  5. Cerrar sesión y volver a iniciar sesión con PRE-02.
- **Esperado:** el paso 1 no ofrece ningún selector de rol: el diálogo de detalle solo muestra los datos
  de lectura [verificar literales de `users:changeRole` y `users:resetPassword` en `es.json`, que existen
  en `es.json` pero no tienen control asociado]. El paso 2 **sí** desactiva la propia cuenta: el
  endpoint no excluye el propio `user_id`, así que el admin se desactiva a sí mismo y pierde el acceso;
  registrar el `200` con `active: false` y reponer con otro `PATCH` en el paso 5. El paso 3 responde `404`
  y el paso 4 también, porque no existe ruta de cambio de rol: **ningún rol puede cambiarse por la
  aplicación**, ni el propio ni el de otro usuario. Tras el paso 5 la sesión de PRE-02 debe funcionar con
  `active: true`.
- **Red:** dos `200` del toggle (desactivar y reactivar) y dos `404` del intento de cambio de rol.
- **Limpieza:** reactivar la cuenta propia con `PATCH /api/doctors/users/<propio>/active`.

### [USR-008] Listar médicos y contrastar el endpoint público sin sesión

**Rol** `admin`, `anónimo` · **Ruta** `/doctors` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02 y un contexto de navegador sin sesión.
- **Datos:** los 4 médicos seed: `juan@clinic.com`, `maria@clinic.com`, `carmen@clinic.com`, `pedro@clinic.com`.
- **Pasos:**
  1. Con PRE-02, abrir `/doctors` y anotar las filas y la petición.
  2. Invocar `GET /api/doctors` con sesión y anotar la forma de la respuesta.
  3. En el contexto sin sesión, invocar `GET /api/doctors/public` y `GET /api/doctors`.
  4. Comparar el `Cache-Control` de la respuesta pública.
- **Esperado:** el paso 1 emite `GET /api/doctors` → `200` con un **arreglo plano** de objetos `{ id,
  name, specialty, email, user_id }`, sin `data` ni `pagination`; el servicio del frontend lo normaliza a
  una sola página con `totalPages: 1`, de modo que con más de un médico la tabla no pagina. El paso 3
  devuelve `200` en `/api/doctors/public` con únicamente `id`, `name` y `specialty` — **sin `email` ni
  `user_id`** — y `Cache-Control: public, max-age=60`; en cambio `GET /api/doctors` sin sesión responde
  `401`. Anotar el comportamiento del buscador: el servicio del frontend filtra `search` en el cliente, no
  lo envía al backend [verificar el texto del buscador de `/doctors` en `es.json`].
- **Red:** un `200` autenticado, un `200` público y un `401`.
- **Limpieza:** ninguna.

### [USR-009] H-19 Crear un médico con specialty_id y obtener 201

**Rol** `admin` · **Ruta** `POST /api/doctors` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-07, PRE-08. Un `user_id` de `doctor` del tenant `default` que todavía no
  tenga fila en `doctors`; si los 4 médicos seed ya la tienen, crear antes el usuario con
  `POST /api/doctors/invite` y aceptar la invitación (USR-017), o apuntar a un `doctor` recién creado.
- **Datos:** `{ user_id: <PRE-07>, name: "QA Medico specialty_id", specialty: "QA-Cardiología",
  email: "qa.medico.sid@clinic.com", specialty_id: <PRE-08>, license_number: "QA-LIC-0001",
  consultation_fee: 30000, bio: "QA ficha de prueba", phone: "+56900000001", rut: <PRE-09> }`.
- **Pasos:**
  1. Invocar `POST /api/doctors` con PRE-02 y ese cuerpo.
  2. Consultar `GET /api/doctors` y localizar la fila creada.
  3. Consultar `GET /api/doctors/users?role=doctor` y comprobar si el `email` cambió.
  4. Intentar el mismo alta con un campo desconocido, `license_type: "QA"`, para medir el `.strict()`.
- **Esperado:** el paso 2 responde `200` con el registro creado (regresión H-19: la alta ya no es
  rechazada por Zod `.strict()`, porque `createDoctorSchema` acepta `specialty_id`, `license_number`,
  `bio` y `consultation_fee`). El paso 2 encuentra la fila con `name` y `specialty` correctos. El paso 3
  revela dos cosas que hay que registrar: el `email` de `doctors` es el del cuerpo,
  **no** el del `users.id` al que apunta, y `specialty_id`, `license_number`, `bio` y `consultation_fee`
  **no se persisten**: el `INSERT` solo escribe `name, specialty, email, user_id, tenant_id`. El paso 4
  responde `400` de validación por campo desconocido, confirmando que el esquema es estricto. Si el
  paso 1 devolviera `400`, sería `FALLÓ (defecto conocido: H-19)`.
- **Red:** un `201` y un `400` de validación; verificar el `id` devuelto y compararlo con el `id` de
  `GET /api/doctors`.
- **Limpieza:** la fila en `doctors` **no se puede borrar por la API** (USR-006). Anotar el `doctor_id`
  creado; el área `17-` la usa como precondición y el área `16-` como médico de prueba.

### [USR-010] Editar un médico y medir qué campos acepta el esquema

**Rol** `admin` · **Ruta** `/doctors` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02 y el `doctor_id` de `juan@clinic.com`.
- **Datos:** `{ name: "QA Juan Editado", specialty: "QA-Cardiología", phone: "+56900000002", email: "qa.juan@clinic.com" }`.
- **Pasos:**
  1. En `/doctors`, abrir el diálogo de edición de `juan@clinic.com` y guardar los campos que ofrece.
  2. Invocar `PATCH /api/doctors/<doctor_id>` con `{ name, specialty }` solo.
  3. Repetir con el mismo cuerpo añadiendo `phone` y `email`.
  4. Consultar `GET /api/doctors` y `GET /api/doctors/users?search=juan` para ver qué cambió.
- **Esperado:** el paso 2 responde `200` y actualiza `name` y `specialty` en `doctors`. El paso 3
  responde **`400`** de validación: `updateDoctorSchema` es `.strict()` y solo admite `name` y
  `specialty`, así que **`email`, `phone`, `rut`, `specialty_id`, `license_number`, `bio` y
  `consultation_fee` no se pueden editar** aunque la ficha del formulario los muestre [verificar literales
  de los botones del diálogo en `es.json`]. El paso 4 confirma que `doctors.email` y `doctors.user_id`
  quedan intactos. Registrar además que la UI no envía `specialty_id`, por lo que el vínculo con la
  tabla `specialties` no se mantiene nunca.
- **Red:** un `200` y un `400`; verificar `name` y `specialty` en el cuerpo del `200`.
- **Limpieza:** restaurar `name: "Juan Pérez"` y `specialty: "Cardiología"` con un segundo `PATCH`.

### [USR-011] Consultar especialidades con y sin `:id` y comprobar su exposición

**Rol** `admin`, `anónimo` · **Ruta** `/specialties` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02 y un contexto sin sesión.
- **Datos:** el `specialty_id` de `Cardiología` y el de una especialidad sin médicos.
- **Pasos:**
  1. Con PRE-02, abrir `/specialties` y anotar la petición.
  2. En el contexto sin sesión, invocar `GET /api/specialties` y `GET /api/specialties/<id>`.
  3. Crear una especialidad `QA-Especialidad` con `POST /api/specialties` y después consultar su `:id`.
  4. Intentar borrarla con `DELETE /api/specialties/<id>`.
- **Esperado:** el paso 2 devuelve **`200` sin credenciales** en ambos casos, porque `/api/specialties`
  está en `PUBLIC_PATHS` de `tenant.middleware.ts:16-33` y las rutas no llevan `authMiddleware`: el
  catálogo de especialidades y el detalle de una especialidad son legibles por cualquiera. La respuesta
  incluye `id`, `name`, `tenant_id`, `description`, `department`, `procedures`, `color` y un arreglo
  `doctors` con `{ id, name, email }` agregado por `tenant_id:name`. El paso 3 responde `201` y devuelve
  la especialidad creada. El paso 4 debe devolver `400` con un motivo de uso si la especialidad tiene
  médicos; si la `QA-` está vacía, el borrado **sí** procede y hay que registrarlo, porque no hay
 mecanismo de borrado en la UI.
- **Red:** dos `200` sin sesión, un `201` de alta y un `400` o `200` de borrado según el paso 4.
- **Limpieza:** eliminar la especialidad `QA-` con `DELETE /api/specialties/<id>` si el paso 4 no la borró.

### [USR-012] Listar pacientes y observar las dos consultas y la paginación en el cliente

**Rol** `admin`, `doctor` · **Ruta** `/patients` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-04 y PRE-05. Existen pacientes con rol `patient` y al menos uno con rol
  `user` en `default`.
- **Datos:** filtro de género `female`; texto de búsqueda `user1`.
- **Pasos:**
  1. Con PRE-02, abrir `/patients` y esperar a que se estabilice la tabla.
  2. Anotar todas las peticiones de red que se emiten al cargar.
  3. Aplicar el filtro de género y contar las filas.
  4. Escribir `user1` en el buscador.
- **Esperado:** el paso 2 emite **dos** peticiones: `GET /api/doctors/users?limit=20&role=user` y
  `GET /api/doctors/users?limit=20&role=patient`, ambas `200`; el servicio las concatena y deduplica por
  `id`, porque `user` y `patient` son filas distintas de `users` y una misma persona no aparece dos veces.
  El paso 3 **no cambia el resultado**: la tabla `users` no tiene columna `gender`, así que el filtro
  aplica `!p.gender` y conserva todas las filas, y la columna "Género" muestra siempre `—`. Registrar
  ambos como defectos observables. Además, la paginación de `/patients` es de cliente: el servicio corta
  con `slice` sobre el conjunto combinado, de modo que con más de 20 pacientes las filas de la segunda
  mitad nunca se piden al backend.
- **Red:** dos `200` de `GET /api/doctors/users`; verificar `role` en la cadena de consulta.
- **Limpieza:** ninguna.

### [USR-013] Abrir la ficha de paciente y verificar que su consulta principal no existe

**Rol** `doctor` · **Ruta** `/patient-history?patientId=<id>` · **P1** · **Resultado** `______`
- **Precondición:** PRE-04. El `users.id` de `user1@clinic.com` anotado como `<patientId>`.
- **Datos:** `/patient-history?patientId=<patientId>`.
- **Pasos:**
  1. Con PRE-04, navegar por URL a `/patient-history?patientId=<patientId>`.
  2. Anotar las peticiones que emite la ficha y sus códigos.
  3. Buscar un control de "Ver paciente" en `/patients` con PRE-02.
  4. Invocar `GET /api/users/<patientId>` y `GET /api/patients/<patientId>` a mano.
- **Esperado:** el paso 2 muestra que la ficha lanza **seis** consultas en paralelo y que la primera,
  `GET /api/patients/<patientId>`, responde **`404`**: `src/app.ts` no monta `/api/patients`. La ficha
  depende además de `/clinical-records`, `/laboratory/requests`, `/medical-history/patient/:id`,
  `/clinical-records/prescriptions/all` y `/bookings/doctor`, esta última restringida al rol `doctor`, por
  lo que el resumen del paciente queda sin nombre ni ficha aunque las demás respondan `200`. El paso 3
  confirma que la tabla de `/patients` **no ofrece ninguna acción de detalle**, así que la ficha es
  inalcanzable desde la interfaz. El paso 4 confirma los dos `404`. Registrar todo como el mismo
  defecto: la ficha de paciente no tiene endpoint de cabecera.
- **Red:** un `404` en `/api/patients/:id`, un `200` en `/api/users/:id` inexistente también `404`, y el
  resto de consultas de la ficha con su estado real.
- **Limpieza:** ninguna.

### [USR-014] Crear un paciente con RUT válido y rechazar un RUT con dígito verificador inválido

**Rol** `admin`, `anónimo` · **Ruta** `/register`, `POST /api/doctors/register` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-09, PRE-10. Sin sesión para el registro público; con PRE-02 para el alta de médico.
- **Datos:** RUT válido de PRE-09, su variante sin puntos ni guion, el mismo RUT con el dígito
  verificador cambiado a `0`, y el texto `QA-RUT` en `name`.
- **Pasos:**
  1. Registrar un paciente en `/register` con el RUT válido de PRE-09 → `201`.
  2. Registrar otro con el RUT en formato crudo, sin puntos ni guion, y comparar el `rut` devuelto.
  3. Registrar un tercero con el dígito verificador alterado.
  4. Con PRE-02, dar de alta un médico con `POST /api/doctors/register` usando el RUT inválido.
- **Esperado:** el paso 1 responde `201` y devuelve `{ id, email, rut, phone }` con el RUT **normalizado**
  a `12.345.678-5` (puntos cada tres dígitos y guion antes del verificador), porque el servicio aplica
  `cleanRut` → `validateRut` → `formatRut`. El paso 2 devuelve exactamente la misma cadena formateada:
  el formato de entrada es irrelevante. El paso 3 responde `400` con `code` `AUTH_INVALID_RUT` y
  `message` **"Invalid RUT"**, en inglés y sin i18n; registrar el mensaje literal. El paso 4 responde
  `400` con `code` `DOCTOR_INVALID_RUT` y `message` **"Invalid RUT"**. Ninguno de los dos formatos
  necesita estar en mayúsculas ni llevar `K`: `cleanRut` normaliza a mayúsculas.
- **Red:** dos `201` de `POST /api/auth/register` y dos `400` de validación; verificar `rut` normalizado
  en el cuerpo del `201`.
- **Limpieza:** los usuarios creados por registro público **no se pueden borrar por la API** (USR-006);
  desactivar con `PATCH /api/doctors/users/<id>/active` y anotar los `email` como deuda de limpieza.

### [USR-015] Rechazar un RUT ya registrado y medir su alcance entre tenants

**Rol** `admin` · **Ruta** `POST /api/doctors/register` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-11. El RUT de un paciente de `clinica-demo` y el de `clinica-norte`,
  anotados en su formato formateado.
- **Datos:** `{ name: "QA Medico RUT", specialty: "QA-Cardiología", email: "qa.medico.rut@clinic.com",
  rut: <RUT de clinica-demo> }`.
- **Pasos:**
  1. Con PRE-02, enviar el alta con el RUT ya usado dentro del propio tenant.
  2. Repetir con un correo nuevo y el **mismo** RUT.
  3. Iniciar sesión con el admin de `clinica-norte` y repetir el alta con el RUT de `clinica-norte`.
  4. Intentar el mismo alta desde `clinica-norte` con el RUT que pertenece a `clinica-demo`.
- **Esperado:** el paso 1 responde `400` con `code` `DOCTOR_RUT_EXISTS` y `message` **"RUT already
  registered"**. El paso 2 confirma que el rechazo depende **solo** del RUT, no del correo. El paso 4
  también debe ser `400`: la consulta de duplicados es `SELECT 1 FROM users WHERE rut = $1` **sin
  `tenant_id`**, así que el RUT es único de forma **global** en toda la plataforma, no por clínica. Es un
  defecto de aislamiento entre tenants, no una protección: registrar el código y el mensaje literales.
  Anotar además que el mismo filtro sin `tenant_id` se aplica al correo, por lo que ningún tenant puede
  registrar un correo ya usado en otro.
- **Red:** tres `400` con `code` distinto de `400` genérico; verificar `code` y `message` en el cuerpo.
- **Limpieza:** ninguna, todos los intentos fallan antes del `INSERT`.

### [USR-016] Invitar a un médico por email y comprobar el token de invitación

**Rol** `admin` · **Ruta** `POST /api/doctors/invite` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02 y PRE-10 (`EMAIL_TEST`). Sin esta variable, el caso es `BLOQUEADO`.
- **Datos:** `{ email: "qa.medico.invitado@clinic.com", name: "QA Medico Invitado", role: "doctor",
  specialty: "QA-Dermatología" }`.
- **Pasos:**
  1. Invocar `POST /api/doctors/invite` con PRE-02 y ese cuerpo.
  2. Capturar el correo en `EMAIL_TEST` y anotar el asunto y el enlace.
  3. Comprobar en `GET /api/doctors/users?search=qa.medico.invitado` que la cuenta **no** existe.
  4. Repetir la invitación con el mismo correo.
  5. Repetir la invitación con `role: "doctor"` y sin `specialty`.
- **Esperado:** el paso 1 responde `201` con `{ message: "Invitación enviada correctamente" }`. El paso 3
  confirma que la invitación **no crea la cuenta**: solo firma un JWT con `purpose: 'invite'`,
  `email`, `name`, `role`, `specialty` y `tenant_id`, válido 7 días, y lo envía por correo. El paso 4
  responde `400` con `code` `DOCTOR_EMAIL_EXISTS` y `message` **"Email already registered"**. El paso 5
  responde `400` con `code` `DOCTOR_SPECIALTY_REQUIRED` y `message` **"Specialty is required for
  doctors"**. Verificar en el correo que el enlace apunta a `FRONTEND_URL || RENDER_EXTERNAL_URL ||
  'http://localhost:5173'` (mismo patrón de H-08): si contiene `localhost:5173`, registrarlo, porque en
  ese caso el enlace no abre para el invitado.
- **Red:** un `201` y dos `400`; verificar `message` y `code` en cada cuerpo.
- **Limpieza:** el token de invitación no se puede revocar: **no existe**
  `DELETE /api/doctors/invitations/:id` pese a lo que declara el catálogo U-12. Si la invitación no se
  acepta, el registro queda como token vivo; anotar el correo.

### [USR-017] Aceptar la invitación de médico y comprobar si la cuenta queda usable

**Rol** `anónimo` · **Ruta** `/register` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** USR-016 ejecutado y el token de invitación extraído del correo de PRE-10. Sin
  `EMAIL_TEST`, el caso es `BLOQUEADO`.
- **Datos:** el `invite_token` de la invitación de USR-016 y la contraseña `QA-Invitado.<año>!`.
- **Pasos:**
  1. Consultar `GET /api/auth/invite-info?token=<invite_token>`.
  2. Registrarse en `/register` enviando `{ email, password, name, invite_token }`.
  3. Consultar `GET /api/doctors/users?search=qa.medico.invitado` y `GET /api/doctors`.
  4. Intentar iniciar sesión con `qa.medico.invitado@clinic.com` y esa contraseña.
  5. Invocar `POST /api/auth/invite-info?token=` con el mismo token por segunda vez.
- **Esperado:** el paso 1 devuelve `200` con `{ email, name, role: "doctor", specialty, tenant_id }`. El
  paso 2 devuelve `201`; el registro **hereda** `email`, `name`, `role`, `specialty` y `tenant_id` del
  token, ignorando los valores del cuerpo, y en una transacción crea `users` con `role: 'doctor'`,
  `doctors` y 5 filas de disponibilidad de 09:00 a 17:00. El paso 3 lo confirma. El paso 4 **debe
  fallar**: la contraseña nunca se envía ni se devuelve, así que hay que usar el flujo de restablecimiento;
  registrar el resultado real. Anotar además un defecto observable: las filas de disponibilidad se
  insertan con `user.id` como `doctor_id` en lugar del `id` de la fila creada en `doctors`, por lo que el
  horario puede quedar asociado al médico equivocado y afecta al área `17-`. El paso 5 devuelve `200`
  otra vez: **el token no se consume ni se invalida** y admite reuso ilimitado durante 7 días.
- **Red:** un `200` de `invite-info`, un `201` de `POST /api/auth/register`, dos `200` de control y un
  intento de login con su código real.
- **Limpieza:** la cuenta creada no se puede borrar por la API (USR-006); desactivar con
  `PATCH /api/doctors/users/<id>/active` y anotar el correo.

### [USR-018] Rechazar los roles no permitidos en la invitación y en el registro

**Rol** `admin`, `anónimo` · **Ruta** `POST /api/doctors/invite`, `POST /api/auth/register` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02.
- **Datos:** `role` = `admin`, `superadmin`, `guest` y un valor inexistente `qa_rol`, con el mismo cuerpo
  base de USR-016; y `role: "admin"` en el cuerpo del registro.
- **Pasos:**
  1. Invocar `POST /api/doctors/invite` con cada uno de los cuatro `role`.
  2. Invocar `POST /api/auth/register` con `{ email, password, name, role: "admin" }`.
  3. Revisar los códigos y mensajes de cada respuesta.
  4. Comprobar si algún intento creó alguna fila.
- **Esperado:** los cuatro `role` del paso 1 responden `400` de validación: `invitePersonSchema` es un
  `z.enum(['patient', 'doctor', 'lab_technician'])`, así que `admin`, `superadmin`, `guest` y `qa_rol` se
  rechazan antes de tocar la base de datos. La escalada está cerrada **solo** en este endpoint. El paso 2
  es el agujero: `registerSchema` **no tiene campo `role`** y es `.strict()`, así que un `role` explícito
  responde `400` por campo desconocido; pero sin `invite_token`, el registro libre asigna `role: 'patient'`
  por defecto y cualquier visitante puede crear la cuenta que quiera dentro del tenant por defecto. El
  paso 4 confirma que ninguno de los cuatro intentos de invitación creó filas.
- **Red:** cinco `400` de validación; verificar que el `message` menciona el campo problemático.
- **Limpieza:** ninguna.

### [USR-019] Comprobar el aislamiento de un usuario entre tenants

**Rol** `admin` · **Ruta** `/users`, `PATCH /api/doctors/users/<id>/active` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-11, PRE-12. El `user_id` de un paciente de `clinica-norte`, anotado como
  `<id-norte>`.
- **Datos:** `<id-norte>`; `search=QA-` para listar.
- **Pasos:**
  1. Con el admin de `default`, invocar `PATCH /api/doctors/users/<id-norte>/active`.
  2. Con el admin de `default`, invocar `GET /api/doctors/users?search=QA-` y comparar con el total.
  3. Con el admin de `clinica-norte`, invocar el mismo listado.
  4. Con el admin de `default`, intentar `GET /api/doctors/users?role=patient&page=999`.
- **Esperado:** el paso 1 responde **`404`** con `code` `DOCTOR_NOT_FOUND_TENANT` y `message` **"User not
  found in this tenant"**: el `UPDATE` filtra por `tenant_id`, así que un `id` de otro tenant es
  indistinguible de uno inexistente y no se puede enumerar por diferencia de mensajes. El paso 2 y el 3
  devuelven totales distintos y disjuntos: cada sesión ve únicamente su `tenant_id`. El paso 4 devuelve
  `200` con `data: []` y `total: 0`, nunca `500`, porque `page` se acota por `Math.max(1, …)`. Registrar
  los tres totales como evidencia de que el aislamiento por `tenant_id` funciona en el módulo de
  médicos, y dejar constancia de que el aislamiento real lo refuerza la RLS de la base de datos (área
  `19-`), no este filtro.
- **Red:** un `404`, tres `200` de listado y un `200` con arreglo vacío.
- **Limpieza:** el paso 1 falla, no hay nada que revertir.

### [USR-020] Verificar qué deja registrado el trigger security_audit al crear y al cambiar usuarios

**Rol** `admin`, `superadmin` · **Ruta** `—` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02, PRE-03. Acceso de solo lectura a `audit_logs` del tenant `default` para contar
  filas por criterio.
- **Datos:** filtro `action = 'security_update'`, `resource_type = 'users'` y `resource_id` = el `id`
  creado; filtro `action = 'phi_create'`.
- **Pasos:**
  1. Contar las filas de `audit_logs` con `resource_type = 'users'` antes de empezar y anotar el número.
  2. Crear un usuario con `POST /api/doctors/register` y contar de nuevo.
  3. Desactivarlo y reactivarlo con `PATCH /api/doctors/users/<id>/active`, contando tras cada paso.
  4. Localizar en `/audit` la fila correspondiente, con la sesión de PRE-03.
- **Esperado:** el paso 2 revela un defecto: el trigger `security_audit` de `db/security.sql:260-293`
  **no tiene rama de `INSERT`**, solo de `UPDATE` y `DELETE`, así que crear un usuario **no deja ninguna
  fila** en `audit_logs`: el conteo no cambia. Contradice la regla de `00-README.md` §7.3 punto 17 y hay que
  reportarlo como hallazgo nuevo. El paso 3 sí deja rastro: cada `PATCH` genera una fila
  `action = 'security_update'` con `old_values` y `new_values` que contienen `active_changed`,
  `role_changed: false`, `password_changed: false`, `blocked_changed: false` y `totp_changed: false`, y con
  `password` y `totp_secret` eliminados del JSON. El paso 4 debe mostrar esa fila en `/audit` con el
  recurso `users`. Anotar que un cambio de `name` o de `phone` **no** genera fila, porque el trigger solo
  vigila `password`, `role`, `active`, `blocked_until` y `totp_enabled`.
- **Red:** un `201` de alta, dos `200` de activación y un `200` de `GET /api/audit` con el filtro
  `resource_type = 'users'`.
- **Limpieza:** reactivar el usuario si quedó inactivo; las filas de `audit_logs` no se borran.

### [USR-021] Verificar que todos los datos de prueba llevan el prefijo QA-

**Rol** `admin` · **Ruta** `/users`, `/doctors`, `/specialties`, `/patients` · **P2** · **Resultado** `______`
- **Precondición:** USR-003, USR-009, USR-011, USR-014 y USR-017 ejecutados.
- **Datos:** el prefijo `QA-`; los correos `qa.*@clinic.com`; los identificadores con `QA-`.
- **Pasos:**
  1. Listar `/users` con `search=QA-` y con `search=qa.` y contar los resultados.
  2. Repetir en `/doctors` con `QA-` y en `/specialties`.
  3. Consultar `GET /api/doctors/users?search=QA-` y `GET /api/doctors/users?search=qa.`.
  4. Repetir la búsqueda con minúsculas y con el prefijo en mayúsculas.
- **Esperado:** el paso 3 confirma que `search` es un `ILIKE` insensible a mayúsculas, por lo que `QA-`,
  `qa-` y `Qa-` devuelven el mismo conjunto y ninguna creación de prueba queda oculta. El paso 1 debe
  encontrar **todos** los registros creados por esta área: los médicos de USR-003, USR-009 y USR-017, los
  pacientes de USR-003 y USR-014 y la especialidad de USR-011. Cada uno debe tener `QA-` o `qa.` en al
  menos `name`, `email` o `specialty`. Anotar cualquier creación cuyo `name` sea el nombre del médico
  seed, porque significa que USR-010 no restauró el valor original. El conteo final de la sesión debe
  quedar en el reporte como la lista exacta de filas que hay que desactivar al terminar, ya que no
  existe borrado por API.
- **Red:** cuatro `200` de listado; verificar `search` en la cadena de consulta y que `data` no está vacío.
- **Limpieza:** lista final de `user_id` a desactivar en el reporte de sesión.

### [USR-022] Verificar la normalización del alias user a patient

**Rol** `admin`, `patient`, `user` · **Ruta** `/users`, `/panel` · **P1** · **Resultado** `______`
- **Precondición:** PRE-02 y dos cuentas del mismo tenant, una con `role: 'patient'` y otra con
  `role: 'user'`, con el mismo conjunto de datos.
- **Datos:** filtro `role=patient` y filtro `role=user` sobre `GET /api/doctors/users`.
- **Pasos:**
  1. Listar con `role=patient` y con `role=user` y anotar los `id` de cada conjunto.
  2. Iniciar sesión con la cuenta de rol `user` y abrir `/dashboard`.
  3. Con esa misma cuenta, abrir `/users` por URL directa.
  4. Con esa misma cuenta, invocar `GET /api/doctors/users?page=1`.
  5. Comparar el destino tras el login de ambas cuentas.
- **Esperado:** el paso 1 confirma que son conjuntos **disjuntos**: el filtro `role` es una igualdad
  exacta y no incluye el alias, de modo que las cuentas `user` desaparecen del filtro "Paciente" y solo
  aparecen en "Usuario". El paso 2 confirma que el frontend **sí** normaliza: `normalizeRole()` en
  `frontend/src/shared/utils/role.utils.ts:24` convierte `user` en `patient`, y ambas cuentas aterrizan
  en `/dashboard`. El paso 3 redirige a la página de acceso denegado, porque `/users` exige `ADMIN_STAFF`.
  El paso 4 responde `200` con la lista completa del tenant, **incluidos admins y médicos**: el backend
  permite a un `doctor` leer el directorio de usuarios de toda la clínica sin restricciones por rol. El
  paso 5 compara los destinos. Registrar el riesgo de H-62: el backend repite
  `role === 'user' || role === 'patient'` inline en lugar de usar una tabla canónica, así que cualquier
  módulo nuevo que olvide la comparación rechazará a un paciente con rol `user` con un `403` espurio.
- **Red:** tres `200` de listado con conjuntos distintos y un `200` de listado completo desde la cuenta
  `user`; verificar `role` en la cadena de consulta.
- **Limpieza:** ninguna.

## 5. Defectos conocidos a verificar primero

| Id | Defecto | Archivo y línea | Casos | Verificar |
|---|---|---|---|---|
| H-19 | El alta de médico con `specialty_id` fue rechazada por Zod `.strict()`; el esquema ya lo acepta, pero el `INSERT` **descarta** `specialty_id`, `license_number`, `bio` y `consultation_fee` | `src/modules/doctor/doctor.schema.ts:11-22` y `doctor.service.ts:174-179` | USR-009 | `POST /api/doctors` con `specialty_id` → **201**, y el registro devuelto no contiene esos campos |
| H-62 | El alias `user`/`patient` se repite inline en 20 sitios del backend en lugar de una tabla canónica | `src/modules/booking/booking.controller.ts:97`, entre otros | USR-022 | Una cuenta con rol `user` recibe el mismo tratamiento que una `patient` |
| H-61 | Como `superadmin`, `/users` renderiza `SuperAdminUsersPage` y usa endpoints `/api/super-admin/*`, no los del tenant | `frontend/src/app/router/AppRouter.tsx:131-135,220-224` | USR-003, USR-007 | El listado de `superadmin` muestra usuarios de todos los tenants |
| H-60 | Higiene de datos: el historial de `user1@clinic.com` debe contener solo seed legítimo | `DELETE /api/medical-history` no existe | USR-021 | Ningún registro con texto `QA-` sobrevive al cierre de sesión sin desactivar |
| H-53 | Los mensajes de rechazo se emiten en inglés sin i18n; en esta área afecta a RUT, email y rol | `src/utils/error-codes.ts:249-364` | USR-014, USR-015, USR-018 | `"Invalid RUT"`, `"RUT already registered"`, `"Email already registered"` se muestran crudos en una app `es` |
| H-08 | `FRONTEND_URL || RENDER_EXTERNAL_URL || 'http://localhost:5173'` en los correos de alta e invitación | `src/modules/doctor/doctor.service.ts:129`, `doctor.service.ts:274` | USR-016, USR-017 | El enlace del correo apunta a `localhost:5173` si falta la variable |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.
> USR-009 fallaría con `400` si H-19 reaparece; USR-016 y USR-017 son `BLOQUEADO` sin `EMAIL_TEST`.

## 6. Huecos conocidos

| Id | Hueco | Impacto | Casos |
|---|---|---|---|
| G-13-01 | No existe router `/api/users`: no hay `GET /api/users`, ni `/:id`, ni `PATCH /:id`, ni `DELETE /:id`, ni `/stats`, ni `/search` | El catálogo U-01 a U-06 y U-21 describe endpoints inexistentes; la gestión de usuarios es de solo lectura | USR-001, USR-004, USR-006, USR-013 |
| G-13-02 | No existe edición de usuario: solo nombre y especialidad de médicos | El admin no puede corregir email, teléfono ni rol | USR-004, USR-007 |
| G-13-03 | No existe borrado de usuario | Una baja es irreversible: solo se puede desactivar | USR-006 |
| G-13-04 | No se puede cambiar ningún rol, ni propio ni ajeno | Los permisos quedan fijos en el seed | USR-007, USR-018 |
| G-13-05 | El correo de `POST /api/doctors/register` apunta a `/setup-password?token=`, ruta **inexistente** en `AppRouter` | El médico recién creado nunca puede fijar su contraseña | USR-003, USR-017 |
| G-13-06 | La contraseña temporal del médico se genera y se descarta: la respuesta solo trae `email` | El admin no puede entregar credenciales por otra vía | USR-003 |
| G-13-07 | El token de invitación no se consume ni se revoca, y no hay `DELETE /api/doctors/invitations/:id` | Una invitación robada sirve 7 días y es reutilizable | USR-016, USR-017 |
| G-13-08 | El alta por invitación no crea la cuenta; sin `EMAIL_TEST` no hay forma de completarla | El alta de pacientes depende por completo del correo | USR-003, USR-016, USR-017 |
| G-13-09 | El filtro de estado de `/users` y el de género de `/patients` se aplican en el cliente | Los conteos mostrados no coinciden con el total del servidor | USR-002, USR-012 |
| G-13-10 | `users` no tiene columna `gender` | La columna "Género" y su filtro no pueden funcionar | USR-012 |
| G-13-11 | No hay ficha de paciente: `GET /api/patients/:id` y `GET /api/users/:id` no existen | La ficha de `/patient-history` arranca con un `404` | USR-013 |
| G-13-12 | La unicidad de `rut` y de `email` es global, sin `tenant_id` | Un tenant no puede registrar un correo o RUT usado en otro | USR-015, USR-019 |
| G-13-13 | El trigger `security_audit` no registra `INSERT` de usuarios | No hay traza de altas de cuentas | USR-020 |
| G-13-14 | `GET /api/doctors` no pagina y el frontend pagina en falso | Con muchos médicos la tabla no muestra el total | USR-008 |
| G-13-15 | `GET /api/doctors` filtra por `search` en el cliente | Cada pulsación del buscador re-renderiza toda la lista | USR-008 |
| G-13-16 | El alta de disponibilidad al aceptar una invitación usa `user.id` como `doctor_id` | El horario puede quedar asociado al médico equivocado | USR-017, área `17-` |
| G-13-17 | `GET /api/doctors/users` está abierto a `doctor` sin filtrar por rol | Cualquier médico lee el directorio completo de la clínica | USR-022 |
| G-13-18 | No hay contadores por rol ni por estado pese a `UsersStats` | El panel de usuarios no muestra métricas reales | USR-001 |
| G-13-19 | No hay auditoría de cambios de nombre, teléfono ni correo | La trazabilidad de usuarios es incompleta | USR-020 |
| G-13-20 | No hay reset de contraseña desde `/users`, pese a `users:resetPassword` en `es.json` | El admin depende del flujo de correo | USR-003, USR-007 |

## 7. Resultado del área

| Métrica | Valor |
|---|---|
| Casos escritos | 22 (9 P0, 9 P1, 2 P2, 2 bloqueables por `EMAIL_TEST`) |
| Casos destructivos | 1 (USR-006, requiere `ALLOW_DESTRUCTIVE=true`) |
| Endpoints del backend cubiertos | 13 de 13 de `doctor` y `specialties` |
| Endpoints del catálogo sin respaldo | 8 (`/api/users`, `/api/users/:id`, `/api/users/stats`, `/api/users/search`, `/api/doctors/:id`, `/api/doctors/:id/stats`, `/api/doctors/:id/schedule`, `/api/doctors/:id/invite`) |
| Rutas de UI cubiertas | `/users`, `/doctors`, `/specialties`, `/patients`, `/patient-history`, `/register` |
| Roles cubiertos | `admin`, `superadmin`, `doctor`, `patient`, `user`, `anónimo` |
| Defectos registrados | 6 |
| Huecos registrados | 20 |

Estado inicial esperado: el área **no es aprobable**. Un médico creado por `POST /api/doctors/register`
recibe un correo con un enlace a `/setup-password` que no existe, de modo que la cuenta queda inutilizable
(G-13-05); el `user_id` de sus filas de disponibilidad apunta al médico equivocado (G-13-16); no existe
ninguna forma de editar ni de borrar un usuario (G-13-02, G-13-03); y la ficha de paciente arranca con un
`404` (G-13-11). USR-003, USR-009, USR-013, USR-014 y USR-017 deben ejecutarse primero porque bloquean las
áreas `16`, `17`, `18`, `20` y `23`.

Fecha de redacción: 2026-10-01.
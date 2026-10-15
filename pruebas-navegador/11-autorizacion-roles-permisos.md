# 11 — Autorización, roles y permisos

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `11` | `AUTZ` | C1 | Semanal | 24 | `10` | Toda prueba con rol específico |

## 1. Qué cubre

Este área valida autorización por roles, ownership, aislamiento por tenant, feature gating y protección de rutas. Cubre enforcement en backend/frontend, alias `user`/`patient`, deep links, sidebar por rol, candados visuales vs reales y matrices de acceso. Responde a hallazgos H-14, H-15, H-18, H-22, H-23, H-61, H-62, H-63. Solo documentación (sin ejecución de pruebas).

## 2. Roles y rutas

**Roles definidos**: `superadmin`, `admin`, `doctor`, `lab_technician`, `patient`, `guest`. Alias histórico: `user` = `patient` (normalizado).  
**Home por rol**: superadmin → `/saas`; lab_technician → `/laboratory`; admin, doctor, patient, user → `/dashboard`.  
**Base API**: `/api` (sin `/api/v1/`).  
**Protecciones clave**: rutas protegidas sin sesión redirigen a `/login` (sin bucle). Ruta no autorizada para rol redirige a home del rol (sin bucle).  
**Feature keys**: `bookings`, `clinical_records`, `laboratory`, `analytics`, `api_access`, `white_label`, `custom_domain`, `sms`, `advanced_reports`.  
**Enforcement**: `requireFeature` solo en backend para `laboratory` (`laboratory.routes.ts:30`). `FeatureRoute` solo frontend para `laboratory` (`AppRouter.tsx:287`). `clinical_records`, `analytics`, `advanced_reports`, `api_access` no tienen enforcement (candado visual).  
**Matriz aplicable**: SUPERADMIN_ONLY (4 rutas restringidas), ADMIN_STAFF (superadmin+admin), STAFF_ROLES (admin+doctor), CLINICAL_ROLES (admin+doctor, más patient para expedientes propios), BOOKING_ROLES.

## 3. Precondiciones de datos

**Tenants**: `default` (principal), `clinica-demo` (admin@demo.clinic.com, `DemoVitaria2026!`, plan pro, todas features), `clinica-norte` (admin@norte.clinic.com, plan pro), `clinica-sur` (admin@sur.clinic.com, plan **basic**, **SIN** feature `laboratory`).  
**Cuentas**: superadmin@clinic.com (password = `$SUPERADMIN_PASSWORD`, preguntar), admin@clinic.com (password = `$ADMIN_PASSWORD`, preguntar), juan@clinic.com (doctor), maria@clinic.com (doctor), lab@clinic.com (`lab_technician`), user1@clinic.com (`patient`), user2@clinic.com (`patient`).  
**Passwords seed**: patrón `Vitaria.<parte-local-email>.<año>!`; usar `<año>` (dinámico, por defecto 2026), nunca año literal.  
**Notas**: RLS aplicado en 37 tablas con `FORCE ROW LEVEL SECURITY` (incluso al owner). Exención en `users` permite a superadmin con `tenant_id IS NULL` leer todo. Alias `user`/`patient` reimplementado inline en 20 sitios del backend. Proyecto sin `data-testid`.

## 4. Casos

### [AUTZ-001] Ruta protegida sin sesión debe redirigir a login sin bucle

**Rol** `guest` · **Ruta** `/dashboard` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Sin sesión activa. No autenticado.  
- **Datos:** Navegación directa a `/dashboard`.  
- **Pasos:**  
  1. Navegar a `/dashboard` sin credenciales.  
  2. Observar redirección.  
- **Esperado:** Redirige a `/login`. Sin bucle de redirecciones. Sin contenido protegido renderizado.  
- **Red:** No llamadas `/api/*` protegidas exitosas (o redirige antes). Verificar `location`/estado de navegación.  
- **Limpieza:** Restaurar estado de sesión limpio.

### [AUTZ-002] Usuario patient intenta acceder a ruta de solo superadmin y redirige a home

**Rol** `patient` · **Ruta** `/saas` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Sesión `patient` válida (tenant `default`).  
- **Datos:** user1@clinic.com.  
- **Pasos:**  
  1. Autenticar como `patient`.  
  2. Navegar a `/saas`.  
- **Esperado:** No autorizado para rol → redirige a home del rol `patient` = `/dashboard`. Sin bucle.  
- **Red:** `GET /api/super-admin/*` no ejecutado o responde 403/401. Verificar `X` en cuerpo si presente.  
- **Limpieza:** Cerrar sesión.

### [AUTZ-003] Alias user se normaliza a patient

**Rol** `user` · **Ruta** `/dashboard` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Cuenta con rol `user` (alias histórico de `patient`).  
- **Datos:** user1@clinic.com con rol `user` (seed).  
- **Pasos:**  
  1. Autenticar con credenciales válidas.  
  2. Acceder a rutas `/patient/*` y `/dashboard`.  
- **Esperado:** Normalizado a `patient`. Home `/dashboard`. Permisos de patient aplicados. Sin 403 espurios (H-22).  
- **Red:** `/api/auth/me` devuelve rol normalizado.  
- **Limpieza:** Restablecer sesión.

### [AUTZ-004] Ownership: expediente de otro paciente → 403 o 404 (nunca 200)

**Rol** `patient` · **Ruta** `/patient/clinical-records/:id` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** user1 autenticado, expediente pertenece a user2 (mismo tenant).  
- **Datos:** Expediente ajeno en `default`.  
- **Pasos:**  
  1. Intentar acceder a detalle de expediente ajeno.  
  2. Observar respuesta UI/ruta.  
- **Esperado:** Fail-closed: **403 o 404**, **nunca 200** (H-14).  
- **Red:** `GET /api/clinical-records/:id` → 403 o 404. Verificar `X` en cuerpo.  
- **Limpieza:** Limpiar navegación.

### [AUTZ-005] Ownership historial médico vía assertPatientInTenant

**Rol** `patient` · **Ruta** `/patient/medical-history/:id` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Recurso pertenece a otro paciente mismo tenant.  
- **Datos:** IDs consistentes con tenant `default`.  
- **Pasos:**  
  1. Acceder a historial ajeno.  
  2. Evaluar enforcement.  
- **Esperado:** 403 o 404 (nunca 200). Se ejerce `assertPatientInTenant`. Fail-closed.  
- **Red:** Llamada API correspondiente → 403/404.  
- **Limpieza:** Sin cambios en datos.

### [AUTZ-006] Médico sin relación no ve fichas de pacientes ajenos

**Rol** `doctor` · **Ruta** `/patients/:id/records` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** `juan@clinic.com` sin relación con paciente de `maria@clinic.com`.  
- **Datos:** Paciente ajeno sin vínculo.  
- **Pasos:**  
  1. Doctor intenta acceder a ficha ajena.  
  2. Ver respuesta.  
- **Esperado:** Denegado (403/404) vía `assertDoctorPatientRelationship`. No revela existencia.  
- **Red:** Endpoint clínico → 403/404.  
- **Limpieza:** Cerrar sesión.

### [AUTZ-007] Paciente de otro tenant → 403 o 404

**Rol** `patient` · **Ruta** `/patient/clinical-records/:id` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Recurso existe en `clinica-demo`, sesión `patient` en `default`.  
- **Datos:** IDs entre tenants distintos.  
- **Pasos:**  
  1. Intentar acceso cross-tenant.  
- **Esperado:** Aislamiento por tenant: 403 o 404, nunca 200.  
- **Red:** API → 403/404. Verificar aislamiento.  
- **Limpieza:** Estado limpio.

### [AUTZ-008] Feature gating middleware: tenant sin feature → 403 (no 200)

**Rol** `lab_technician` · **Ruta** `/laboratory` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Tenant `clinica-sur` plan **basic**, **SIN** `laboratory`. Sesión con rol habilitado en teoría pero feature ausente.  
- **Datos:** admin@sur.clinic.com / `DemoVitaria2026!` según seed (usar `<año>`).  
- **Pasos:**  
  1. Autenticar en `clinica-sur`.  
  2. Navegar a `/laboratory`.  
- **Esperado:** Feature gating en middleware da **403**, **no 200** (H-15). Candado puede mostrarse, pero enforcement real.  
- **Red:** Rutas `laboratory` (`laboratory.routes.ts:30`, `requireFeature`) → 403.  
- **Limpieza:** Cambiar a tenant con feature si procede.

### [AUTZ-009] PremiumLocked con "Ver Planes" redirige a /saas

**Rol** `patient` · **Ruta** `/patient/advanced-reports` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Feature `advanced_reports` no contratada para tenant.  
- **Datos:** Tenant sin `advanced_reports`.  
- **Pasos:**  
  1. Intentar acceder a ruta con candado visual.  
  2. Interactuar con `PremiumLocked` → acción "Ver Planes".  
- **Esperado:** Redirige a `/saas`. No renderiza contenido protegido.  
- **Red:** Sin llamada exitosa a API protegida.  
- **Limpieza:** Navegación normal.

### [AUTZ-010] Sidebar muestra candado para ítems con feature ausente

**Rol** `admin` · **Ruta** `/dashboard` · **P2** · **No bloqueante** · **Resultado** `______`  
- **Precondición:** Tenant `clinica-sur` sin `laboratory`.  
- **Datos:** admin@sur.clinic.com.  
- **Pasos:**  
  1. Renderizar sidebar con sesión válida.  
  2. Inspeccionar ítem `laboratory`.  
- **Esperado:** Ítem presenta candado visual (feature ausente). No es enlace activo para contenido no contratado.  
- **Red:** Sin requests innecesarias.  
- **Limpieza:** Limpiar estado.

### [AUTZ-011] SUPERADMIN_ONLY: 4 rutas restringidas

**Rol** `superadmin` vs `admin` · **Ruta** `/saas/users`, `/saas/tenants`, `/saas/billing`, `/saas/settings` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** superadmin autenticado; admin autenticado en otro contexto.  
- **Datos:** superadmin@clinic.com, admin@clinic.com.  
- **Pasos:**  
  1. `superadmin` accede a las 4 rutas → permitido (renderiza plataforma).  
  2. `admin` accede a las 4 → redirige a home `/dashboard` (o 403).  
- **Esperado:** Matriz SUPERADMIN_ONLY aplicada. Sin acceso cruzado.  
- **Red:** `/api/super-admin/*` usado por superadmin en `/saas/users` (H-61).  
- **Limpieza:** Cerrar sesiones.

### [AUTZ-012] ADMIN_STAFF: superadmin + admin

**Rol** `superadmin, admin` · **Ruta** `/users`, `/settings/clinic` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Sesiones por rol.  
- **Datos:** cuentas seed.  
- **Pasos:**  
  1. `superadmin` y `admin` acceden → permitidos.  
  2. `doctor`, `patient`, `lab_technician` → denegados a home.  
- **Esperado:** Cumple matriz ADMIN_STAFF.  
- **Red:** Endpoints con guard correspondiente.  
- **Limpieza:** Restaurar estado.

### [AUTZ-013] STAFF_ROLES: admin + doctor

**Rol** `admin, doctor` · **Ruta** `/patients`, `/appointments/calendar` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Roles definidos.  
- **Pasos:**  
  1. admin y doctor → permitidos.  
  2. Otros roles → redirigen a home.  
- **Esperado:** STAFF_ROLES correcto.  
- **Red:** API protegida con 403 si aplica.  
- **Limpieza:** Limpio.

### [AUTZ-014] CLINICAL_ROLES: admin+doctor, patient solo expedientes propios

**Rol** `admin, doctor, patient` · **Ruta** `/clinical-records` (contexto) · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Tres sesiones.  
- **Pasos:**  
  1. `admin`, `doctor` → ven listado clínico según alcance.  
  2. `patient` → accede solo a sus expedientes propios; no ve ajenos (AUTZ-004).  
- **Esperado:** Matriz CLINICAL_ROLES respetada con ownership.  
- **Red:** Filtros por tenant/owner.  
- **Limpieza:** Cerrar sesiones.

### [AUTZ-015] BOOKING_ROLES

**Rol** `admin, doctor, patient, guest` · **Ruta** `/bookings` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Roles habilitados para reservas.  
- **Pasos:**  
  1. `admin, doctor, patient` → acceso a bookings según rol.  
  2. `guest` → reserva anónima (no crea usuario). Verificar enforcement esquema (guest existe, API no crea usuario).  
- **Esperado:** BOOKING_ROLES aplicado. Guest permitido para flujo anónimo sin conversión forzosa.  
- **Red:** Endpoints de booking respetan rol.  
- **Limpieza:** Datos de prueba no persistidos innecesarios.

### [AUTZ-016] Patient en /patient/clinical-records produce 0 toasts 403

**Rol** `patient` · **Ruta** `/patient/clinical-records` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Sesión `patient` válida, datos propios existentes.  
- **Datos:** user1@clinic.com.  
- **Pasos:**  
  1. Navegar a `/patient/clinical-records`.  
  2. Observar UI (toasts/errores).  
- **Esperado:** Renderiza listado propio. **0 toasts 403** (H-22). Sin 403 espurios.  
- **Red:** API devuelve 200 con datos filtrados por owner.  
- **Limpieza:** Normal.

### [AUTZ-017] Superadmin ve /users como plataforma y usa /api/super-admin/* con su sidebar

**Rol** `superadmin` · **Ruta** `/saas/users` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** `superadmin@clinic.com` con `tenant_id IS NULL`.  
- **Datos:** ámbito plataforma.  
- **Pasos:**  
  1. Acceder a `/saas/users`.  
  2. Verificar que es vista de plataforma (no clínica).  
  3. Observar llamadas API y sidebar.  
- **Esperado:** Renderiza página de plataforma. Usa `/api/super-admin/*`. Sidebar propio de superadmin (plataforma). Separa superadmin vs clínica (H-61). Exención RLS en `users` aplicable.  
- **Red:** Llamadas a `/api/super-admin/*`.  
- **Limpieza:** Cerrar sesión.

### [AUTZ-018] Sidebar por rol muestra solo ítems del rol y sin candados si todo contratado

**Rol** `doctor` · **Ruta** `/dashboard` · **P2** · **No bloqueante** · **Resultado** `______`  
- **Precondición:** Tenant con todas las features contratadas (`clinica-demo`). Sesión `doctor`.  
- **Pasos:**  
  1. Cargar dashboard.  
  2. Revisar ítems sidebar.  
- **Esperado:** Solo ítems correspondientes a rol `doctor`. **Sin candados** si todo contratado. Coherente con rutas declaradas (H-23).  
- **Red:** Sin requests extra.  
- **Limpieza:** Volver a estado default.

### [AUTZ-019] Clic en todos los ítems del sidebar → 0 NotFoundPage

**Rol** `admin` · **Ruta** `/dashboard` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** `admin` en tenant completo. Sidebar renderizado.  
- **Datos:** Navegación secuencial por ítems visibles.  
- **Pasos:**  
  1. Recorrer todos los ítems del sidebar del rol.  
  2. Verificar cada destino.  
- **Esperado:** **0** `NotFoundPage`. Todas las rutas existen para ese rol (H-23: sidebar vs rutas declaradas).  
- **Red:** Sin 404 de ruta frontend no mapeada.  
- **Limpieza:** Regresar a `/dashboard`.

### [AUTZ-020] Deep link a /account y /patient/settings con sesión válida renderiza SettingsPage, no 404

**Rol** `patient` · **Ruta** `/account`, `/patient/settings` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Sesión `patient` válida. Deep link directo (sin navegación previa).  
- **Datos:** user1@clinic.com.  
- **Pasos:**  
  1. Navegar directamente a `/account`.  
  2. Navegar directamente a `/patient/settings`.  
- **Esperado:** Renderiza `SettingsPage`, **no 404**. Sin bucle de redirecciones. Regresión F-1 corregida (H-18).  
- **Red:** Auth check antes de render.  
- **Limpieza:** Limpiar historial.

### [AUTZ-021] Ruta inexistente muestra NotFoundPage con "Volver al inicio"

**Rol** `patient` · **Ruta** `/ruta-inexistente-xyz` · **P2** · **No bloqueante** · **Resultado** `______`  
- **Precondición:** Sesión válida.  
- **Pasos:**  
  1. Navegar a ruta inexistente.  
- **Esperado:** Muestra `NotFoundPage`. Texto incluye "Volver al inicio" (i18n: `[verificar literal en es.json]`). Botón/acción redirige a home del rol.  
- **Red:** Ninguna API crítica.  
- **Limpieza:** Volver a home.

### [AUTZ-022] Rol guest existe en esquema pero no tiene enforcement en API (reserva anónima no crea usuario)

**Rol** `guest` · **Ruta** `/bookings/new` · **P2** · **No bloqueante** · **Resultado** `______`  
- **Precondición:** Sin sesión. Flujo de reserva anónima habilitado.  
- **Datos:** Datos mínimos de reserva.  
- **Pasos:**  
  1. Completar flujo anónimo.  
  2. Verificar efecto en entidades de usuario.  
- **Esperado:** `guest` existe en esquema. No hay enforcement en API que obligue a crear usuario. Reserva anónima **no crea usuario**. Flujo permitido por BOOKING_ROLES.  
- **Red:** `POST /api/bookings` (anónimo) → 200/201 según validación, sin creación de usuario autenticable.  
- **Limpieza:** Revertir datos de prueba si creados.

### [AUTZ-023] RLS: 37 tablas con FORCE ROW LEVEL SECURITY aplicable incluso al owner

**Rol** `patient` · **Ruta** `/api/clinical-records` · **P1** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Datos propios en tenant `default`.  
- **Datos:** user1@clinic.com (owner de registros).  
- **Pasos:**  
  1. Consultar recursos propios vía API con sesión.  
  2. Validar aplicación de políticas RLS (concepto).  
- **Esperado:** RLS activo en 37 tablas con `FORCE ROW LEVEL SECURITY`, aplicable **incluso al owner**. Consultas respetan tenant y policies. No bypass indebido.  
- **Red:** Respuestas filtradas por policies.  
- **Limpieza:** Sin cambios.

### [AUTZ-024] Escalada horizontal por alias user/patient inline en 20 sitios + candado visual sin enforcement

**Rol** `patient` · **Ruta** `/patient/clinical-records` · **P0** · **Bloqueante** · **Resultado** `______`  
- **Precondición:** Alias `user` presente en código backend (20 sitios) y features con solo candado visual.  
- **Datos:** user1@clinic.com.  
- **Pasos:**  
  1. Intentar acceder a recurso ajeno (AUTZ-004).  
  2. Intentar acceder a `laboratory` sin feature (AUTZ-008).  
  3. Intentar acceder a ruta con feature visual no aplicada (`advanced_reports`) y verificar enforcement.  
- **Esperado:** Alias `user`/`patient` reimplementado inline en 20 sitios del backend (H-62) no permite escalada horizontal (ownership fail-closed). `requireFeature` solo `laboratory` (H-63); `clinical_records`, `analytics`, `advanced_reports`, `api_access` sin enforcement → candado **visual** sin enforcement real. Superadmin `tenant_id IS NULL` con exención en `users` permitido (H-61).  
- **Red:** Verificaciones 403/404 donde corresponde.  
- **Limpieza:** Estado limpio.

## 5. Defectos conocidos a verificar primero

| Hallazgo | Descripción | Caso que lo ejercita | Prioridad |
|----------|-------------|---------------------|-----------|
| H-14 | Ownership fail-closed | [AUTZ-004] | 🔴 Alta |
| H-15 | Feature gating debe dar 403 en middleware | [AUTZ-008] | 🔴 Alta |
| H-18 | Regresión F-1 deep link a `/account` | [AUTZ-020] | 🔴 Alta |
| H-22 | 403 espurios | [AUTZ-003], [AUTZ-016] | 🔴 Alta |
| H-23 | Sidebar vs rutas declaradas | [AUTZ-018], [AUTZ-019] | 🟡 Media |
| H-61 | Separación superadmin vs clínica | [AUTZ-011], [AUTZ-017] | 🔴 Alta |
| H-62 | Alias `user`/`patient` inline en el backend | [AUTZ-024] | 🔴 Alta |
| H-63 | Feature gating solo aplicado a `laboratory` | [AUTZ-008], [AUTZ-024] | 🟡 Media |

## 6. Huecos conocidos

- `requireFeature` y `FeatureRoute` limitados a `laboratory`; candados visuales para otras features no garantizan enforcement backend (riesgo de acceso directo por API). Validar con llamadas directas a `/api/*`.  
- Alias `user`/`patient` inline (20 sitios) requiere verificación exhaustiva de normalización en cada guard (posible regresión).  
- RLS activo incluso al owner: verificar policies en escenarios cross-tenant y con `tenant_id IS NULL` (superadmin).  
- Guest solo para reserva anónima: no debe crear usuario.  
- No existe versionado `/api/v1/`; mantener base `/api`.  
- Proyecto sin `data-testid`: uso obligatorio de roles/textos/i18n (con `[verificar literal en es.json]` si duda).  
- Captcha: si `RECAPTCHA_HUMAN!=true`, casos de captcha van `BLOQUEADO` (no FALLÓ).

## 7. Resultado del área

| Métrica | Valor |
|---------|-------|
| Casos totales | 24 (AUTZ-001 – AUTZ-024) |
| P0 | 12 |
| P1 | 8 |
| P2/No bloqueante | 4 |
| Roles cubiertos | 7 (`superadmin, admin, doctor, lab_technician, patient, user, guest`) |
| Tenants evaluados | 4 (`default, clinica-demo, clinica-norte, clinica-sur`) |
| Criterio de pase | 0 bloqueantes abiertos, 0 403 espurios (H-22), 0 acceso cross-tenant/ownership indebido (H-14), feature gating correcto para `laboratory` (H-15), deep links sin 404 (H-18) |
| Estado sugerido | `OK` / `PARCIAL` / `FALLIDO` (registrar al cerrar área) |
| Cobertura hallazgos | 8/8 (H-14,H-15,H-18,H-22,H-23,H-61,H-62,H-63) |
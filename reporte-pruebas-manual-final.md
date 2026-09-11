# 📋 Reporte Final de Pruebas Manuales — Vitaria Clinic

> **Proyecto:** Vitaria — Clinic Management System (SaaS médico multi-tenant)
> **Entorno probado:** Producción `https://clinica-salud-vital.onrender.com/`
> **Fecha de ejecución:** 2026-09-10 (sesiones previas + ronda final)
> **Método:** Pruebas UI manuales (Chrome DevTools/browser MCP) + llamadas API directas para diagnóstico
> **Alcance:** Módulos 1–10 de `RUTAS-PRUEBA-MANUAL.md`
> **Tenant principal:** `default` (Clínica Vital). Tenant secundario: `norte` (Clínica Norte)

---

## 1. Resumen ejecutivo

La plataforma Vitaria se probó de extremo a extremo en producción con todos los roles
(superadmin, admin, doctor, lab_technician, patient, guest). El **núcleo del sistema es
funcional**: autenticación, paneles por rol, CRUD de doctores/pacientes/usuarios/especialidades,
disponibilidad y calendario, historial clínico, laboratorio, facturación, analytics y auditoría
operan correctamente en la mayoría de los flujos.

Existen **dos fallas críticas globales** que rompen el flujo de citas en todos los roles, y
**varios defectos de ruta/UI** que dejan funcionalidad prometida inaccesible (perfil de paciente,
descarga de recetas, flujo guest).

### Estado por módulo

| Módulo | Función | Estado global |
|---|---|---|
| 1 | Autenticación | 🟡 Funcional con salvedades (CAPTCHA en API, registro por invite con bug) |
| 2 | Configuración de cuenta | 🟡 Mayormente OK; perfil de paciente inalcanzable |
| 3 | Super Admin | 🟢 Funcional (excepto 3.10 no ejecutado) |
| 4 | Admin | 🟡 Funcional; crear/reprogramar citas 🔴 roto |
| 5 | Doctor | 🟢 Funcional con salvedades |
| 6 | Lab Technician | 🟡 Funcional; bug en QC/resultados y stub de PDF |
| 7 | Patient | 🔴 Funcionalidad central rota/inalcanzable |
| 8 | Guest | 🔴 Flujo de booking completamente roto |
| 9 | Notificaciones | 🟢 Funcional |
| 10 | Cross-cutting | 🟢 Funcional parcial; items sin verificar |

---

## 2. Módulo 1 — Autenticación

| # | Prueba | Resultado |
|---|---|---|
| 1.1 | Registro `/register?invite=TOKEN` | ⚠️ Parcial — la ruta existe pero la creación de usuario por invite falla (error 500 en backend al finalizar registro). Solo se verificó con datos de la UI; ver Hallazgo F-6 |
| 1.2 | Login exitoso | ✅ OK — admin, doctor, lab y patient inician sesión desde la landing y redirigen a su dashboard por rol |
| 1.3 | Login incorrecto + lockout 5 intentos | ✅ OK — mensaje "Credenciales inválidas" y bloqueo de cuenta a los 5 intentos (15 min) |
| 1.4 | Login 2FA | ✅ OK — con 2FA habilitado redirige a paso TOTP y valida código |
| 1.5 | 2FA código inválido | ✅ OK — permanece en el paso 2FA con error |
| 1.6 | Refresh token automático | ✅ OK — sesión prolongada sin logout |
| 1.7 | Cerrar sesión | ✅ OK — redirige a `/`, cookies limpiadas, `/dashboard` protegido redirige a `/` |
| 1.8 | Cerrar todas las sesiones | ⚠️ Parcial — opción presente en Settings > Seguridad; no se validó contra segunda sesión |
| 1.9 | Cambiar contraseña | ✅ OK — con validación de política y re-verificación post-login |
| 1.10 | Olvidé contraseña | ✅ OK — mensaje genérico anti-enumeración: "Si existe una cuenta con ese correo, recibirás instrucciones" |
| 1.11 | Rate limit auth | ✅ OK — protección rate-limit activa |
| 1.12 | Token refresh | ✅ OK |

**Observaciones**
- 🔴 Login por **API directa** exige resolver el reCAPTCHA del modal de la landing; no hay ruta `/login` dedicada (`/login` → 404 y redirige a `/`). Es una protección intencional pero dificulta pruebas E2E/automatizadas.
- 🟡 El botón "Entrar como invitado" de la landing navega a `/dashboard`, donde el guard de rutas refresca (`/api/auth/refresh` → 400) y devuelve al guest a `/`. El botón es un callejón sin salida (ver Módulo 8).

---

## 3. Módulo 2 — Configuración de cuenta

| # | Prueba | Resultado |
|---|---|---|
| 2.1 | Ver perfil (nombre, email, teléfono, rol, tenant) | ✅ OK — tab Perfil en `/settings` (admin/doctor/lab/superadmin). 🔴 **Paciente: `/patient/settings` y `/account` no tienen ruta en el router → 404** (F-1) |
| 2.2 | Cambiar contraseña | ✅ OK (es 1.9) |
| 2.3 | Sesiones activas + revocación | ✅ OK — lista con IP/dispositivo/última actividad y revocación individual |
| 2.4 | Habilitar 2FA (QR + secreto + TOTP) | ✅ OK |
| 2.5 | Deshabilitar 2FA | ✅ OK |
| 2.6 | Cambiar idioma | ✅ OK — selector ES/EN/PT/FR; persiste al recargar. ⚠️ Existen claves i18n sin traducción que se muestran raw (F-7) |
| 2.7 | Tema claro/oscuro | ✅ OK — persiste al recargar |
| 2.8 | Exportar datos personales | ⚠️ No verificado (requiere validar endpoint de exportación con datos reales) |

---

## 4. Módulo 3 — Super Admin

| # | Prueba | Resultado |
|---|---|---|
| 3.1 | Panel SaaS `/saas` (KPIs, MRR, tenants, salud) | ✅ OK — KPIs y gráficos visibles |
| 3.2 | Gestión de Tenants `/tenants` | ✅ OK — listado, crear tenant, editar, detalle con estadísticas |
| 3.3 | Usuarios Globales `/super-admin/users` | ✅ OK — listado multi-tenant, búsqueda, activar/desactivar usuario |
| 3.4 | Especialidades `/specialties` | ✅ OK — crear, editar, eliminar (con validación de doctores asociados) |
| 3.5 | Feriados `/holidays` | ✅ OK rutas …, ⚠️ defecto cosmético: el ítem de menú muestra la clave `holidays` sin traducir; al crear se generan fechas espurias `0002/0020` mientras se tipea (F-3) |
| 3.6 | Auditoría `/audit` | ✅ OK — logs con fecha/usuario/acción/recurso + detalle con valores anterior/nuevo |
| 3.7 | Facturación SaaS `/cobros` | ✅ OK |
| 3.8 | Laboratorio feature-gated | ✅ OK — gate por plan funciona (PremiumLocked) |
| 3.9 | Demo data `/super-admin/demo-data` | ✅ OK |
| 3.10 | Reset-admin `POST /api/auth/reset-admin` | ⚠️ **No ejecutado** — acción destructiva (cambia la contraseña del admin destino). Se recomienda probar en entorno de staging. Endpoint existe |

---

## 5. Módulo 4 — Admin

| # | Prueba | Resultado |
|---|---|---|
| 4.1 | Dashboard `/dashboard` (tabs + KPIs) | ✅ OK — Overview/Users/Doctors/Patients/Specialties, KPIs de citas/pacientes |
| 4.2 | Gestión de Doctores | 🟡 Parcial — listado, invitar, editar y vista grid OK. 🔴 **Crear doctor falla con 400** por validación `.strict()` del schema (campo `specialty_id` no incluido) (F-2) |
| 4.3 | Gestión de Usuarios `/users` | ✅ OK — crear (invite), toggle activo, detalle |
| 4.4 | Gestión de Citas | 🟡 Parcial — **crear y reprogramar 🔴 fallan con 500 42883** (F-0); cancelar ✅ OK; slots disponibles se cargan (con fechas espurias mientras se tipea, F-3); recurrente ⚠️ no verificado |
| 4.5 | Pacientes `/patients` | ✅ OK — listado y búsqueda por nombre/RUT |
| 4.6 | Historial Clínico | 🟡 Parcial — registro clínico crea desde la ficha del paciente; el diálogo genérico "Nuevo Registro" falla por `patient_id` requerido (F-6); CIE-10 ✅ OK; completar/editar ✅ OK |
| 4.7 | Prescripciones | 🟡 Parcial — crear desde la ficha ✅; diálogo genérico falla (F-6); ver/descargar PDF ✅ vía PDF generado por prescripción individual |
| 4.8 | Historial Médico | ✅ OK — crear/editar/ver detalle; 🔴 sin endpoint DELETE → entradas no se pueden eliminar (F-5) |
| 4.9 | Disponibilidad `/availability` | ✅ OK — regla, bulk, excepción (día completo/horas) |
| 4.10 | Calendario `/calendar` | ✅ OK — FullCalendar, navegación y detalle de cita |
| 4.11 | Facturación `/billing` | ✅ OK — lista, crear factura con ítems, cambio de estado a paid/cancelled/refunded, stats |
| 4.12 | Laboratorio (admin) | Ver Módulo 6 (misma UI) |
| 4.13 | Reportes `/reports` | ⚠️ Verificado parcialmente — generación y PDF disponibles en su mayoría |
| 4.14 | Analytics `/analytics` | ✅ OK — GET `/api/analytics/dashboard` 200 con gráficos, filtros por fecha, forecast/anomalías (ML) presentes |
| 4.15 | Notificaciones | ✅ OK — campana con lista, tipos, marcar leída/todas |
| 4.16 | Waitlist | 🟡 API ✅ (GET admin 200 `[]`, crear/borrar OK vía API); **sin UI en admin**; el paciente no puede usar la entrada (F-4) |
| 4.17 | Webhooks | 🟡 API ✅ (create 201, delete 200, GET 200); **sin UI en frontend** — solo backend admin/superadmin |

---

## 6. Módulo 5 — Doctor

| # | Prueba | Resultado |
|---|---|---|
| 5.1 | Dashboard doctor | ✅ OK — próximas citas, pacientes atendidos, registros clínicos |
| 5.2 | Panel `/panel` | ✅ OK — links rápidos, agenda del día, estadísticas |
| 5.3 | Mis Citas | ✅ OK — completar ✅, no-show ✅ (incrementa contador del paciente) |
| 5.4 | Mis Pacientes | ✅ OK — solo pacientes propios |
| 5.5 | Historial de paciente (tabs) | ✅ OK — Resumen/Citas/Historial/Prescripciones/Archivos/Laboratorio |
| 5.6 | Crear registro clínico | 🟡 Parcial — desde la ficha del paciente ✅ (con CIE-10 ✅); diálogo genérico falla por `patient_id` (F-6) |
| 5.7 | Crear prescripción | 🟡 Parcial — misma limitación (F-6); PDF ✅ por prescripción |
| 5.8 | Disponibilidad | ✅ OK — grilla, slots, excepción |
| 5.9 | Laboratorio (solicitar/validar/PDF) | 🟡 OK solicitudes y validación; PDF de solicitud depende del stub de `LabRequestDetailPage` (F-8) |
| 5.10 | Analytics doctor | ✅ OK — stats propias con filtro por período |
| 5.11 | Adjuntos (subir/descargar/eliminar) | ✅ OK — subida, listado, descarga y eliminación |
| 5.12 | Calendario ICS | ⚠️ No verificado (descarga CSV/ICS no ejercitada) |

---

## 7. Módulo 6 — Laboratory Technician

| # | Prueba | Resultado |
|---|---|---|
| 6.1 | Dashboard lab | ✅ OK — métricas de laboratorio |
| 6.2 | Panel `/laboratory` | ✅ OK — KPIs (pendientes/en progreso/completadas), cola kanban, alertas |
| 6.3 | Solicitudes | ✅ OK — lista, filtros (estado/prioridad/paciente), detalle, cambios de estado |
| 6.4 | Muestras | ✅ OK — registrar, recibir, verificar, asignar, rechazar |
| 6.5 | Resultados | 🟡 Parcial — ingreso de valor ✅, validación técnica ✅, entrega ✅. 🔴 **Guardar QC falla con 42703** (`undefined_column`) al completar resultados (F-8) |
| 6.6 | Catálogo de tests | ✅ OK — listar/crear/editar/eliminar con rangos, unidades, áreas |
| 6.7 | Control de Calidad | 🟡 Ver gráficos ✅; 🔴 crear registro QC depende del bug 42703 (F-8) |
| 6.8 | Áreas | ✅ OK — CRUD y dashboard por área |
| 6.9 | Equipos | ✅ OK — CRUD y estados online/offline/maintenance/calibration |
| 6.10 | Reactivos | ✅ OK — CRUD, stock, expiración |
| 6.11 | Notificaciones lab | ✅ OK — severidad info/warning/error y acknowledge |
| 6.12 | Enviar resultados por email | ⚠️ No verificado (depende de resultado completo + envío real) |
| 6.13 | Analytics lab | ✅ OK — promedio, volumen, tendencias |

---

## 8. Módulo 7 — Patient

| # | Prueba | Resultado |
|---|---|---|
| 7.1 | Dashboard `/dashboard` | ✅ OK — stats próximas/completadas/canceladas/total |
| 7.2 | Mis Citas `/bookings` | 🟡 Parcial — listado ✅; **crear/reprogramar 🔴 500 42883** (F-0); cancelar propio ✅ OK (cita #59 cancelada) |
| 7.3 | Mis Registros Clínicos `/clinical-records` | ✅ OK — lista (7 expedientes), detalle modal ✅. ⚠️ Ruido: 2 alerts "No tienes permisos" por GET `/api/clinical-templates` (403 paciente) al cargar la página |
| 7.4 | Mis Prescripciones `/prescriptions` | 🟡 **Lista OK (7 recetas) pero SIN botón de detalle ni descarga PDF** para el paciente (F-9). El subtítulo "Consulta y descarga tus recetas médicas" es engañoso |
| 7.5 | Mi Historial Médico `/medical-history` | 🟡 Lista "Tu historial: 6 entradas" ✅ con filtros (Todas/Activa/Resuelta/Crónica/Familiar); tarjetas **no clicables (sin detalle)**; 🔴 **residuo de QA visible al paciente** (entrada id=27 "Entrada QA doctor - se eliminará") que no se puede eliminar por falta de DELETE (F-5) |
| 7.6 | Mis Resultados de Laboratorio `/my-laboratory` | 🟡 Lista "Pendientes (2)" (Solicitud #64, #16) ✅; detalle `/my-laboratory/64` ✅ ("No hay datos disponibles"). ⚠️ **Compartir no testeable**: no hay resultados completados ni botón de share |
| 7.7 | Subir archivos | 🔴 **Paciente read-only**: `/account` → 404, `/patient/settings` → 404 (F-1); en `/clinical-records/21` la sección "Archivos adjuntos" muestra el input oculto pero `canManage=false` → sin botón adjuntar (F-10). GET attachments 200 `[]` |
| 7.8 | Waitlist | 🟡 API paciente `/me` ✅ (creó id=1 y eliminó); **UI del paciente usa GET admin `/api/waitlist` → 403** (F-4) |
| 7.9 | Cancelar reserva invitado `/confirm/:token` | 🟡 Token inválido → ✅ UI correcta ("El enlace puede haber expirado"). **Happy path no testeable** — depende de crear cita guest (roto, Módulo 8) |

---

## 9. Módulo 8 — Guest (no autenticado)

| # | Prueba | Resultado |
|---|---|---|
| 8.1 | Landing `/` | ✅ OK — hero con login/booking, funcionalidades, stack, precios (con conversión por país), testimonios, FAQ, footer. ⚠️ Menú "Tech Stack/COMO FUNCIONA/PRECIOS" navega por anclas; links "API Docs/Changelog/..." apuntan a `#` (inactivos) |
| 8.2 | Booking como invitado `/booking` | 🔴 **Completamente roto en 3 capas**: ① `GET /api/bookings/slots` → **400 "X-Tenant-Id header is required"** → la UI siempre muestra "No hay horarios disponibles" (sin guest session no se envía el header); ② al confirmar el frontend llama `POST /api/bookings/guest` → **404 Route not found** (el backend está en `/api/guest/booking`); ③ llamada correcta directa a `/api/guest/booking` con payload válido → **500 42883** (F-0). Además los labels `guest_booking.step_personal/step_doctor/step_confirm` se ven como claves raw (F-7) |
| 8.3 | Confirmar cita por email | 🔴 **Bloqueada** — depende de crear una cita guest (8.2) |
| 8.4 | Buscar por RUT `/api/guest/bookings/:rut` | ⚠️ Endpoint existe con rate-limit (3/15min); sin UI. No probado a fondo por ausencia de reservas creadas |
| 8.5 | Rate limit guest (5/hora) | ⚠️ Configurado en router; no alcanzable por las fallas anteriores |

**Otros flujos guest**
- "Entrar como invitado" (landing): navega a `/dashboard` → el guard de rutas intenta refresh (`/api/auth/refresh` 400) → redirige a `/`. Sin efecto. 🔴
- `/contratar`: wizard de alta de clínica renderiza y valida ("Completa todos los campos obligatorios") ✅. **No se completó el alta real** (crearía un tenant en producción — destructivo).
- `/forgot-password`: ✅ mensaje genérico anti-enumeración.
- `/login`: 404 (toda la auth se hace desde el modal de la landing).

---

## 10. Módulo 9 — Notificaciones

| # | Prueba | Resultado |
|---|---|---|
| 9.1 | Ver notificaciones (campana) | ✅ OK — admin/doctor/lab con campana; lista tipo/título/mensaje/fecha |
| 9.2 | Marcar como leída | ✅ OK — contador decrementa |
| 9.3 | Marcar todas | ✅ OK — contador a 0 |
| 9.4 | Contador no leídas | ✅ OK |

---

## 11. Módulo 10 — Cross-cutting

| # | Prueba | Resultado |
|---|---|---|
| 10.1 | Multi-tenancy | ✅ OK — admin de `default` solo ve sus datos; admin de `norte` aislado; superadmin ve todos los tenants |
| 10.2 | CSRF | ✅ OK — cookie `csrf_token` presente; POST sin header → 403 "CSRF token mismatch"; con header `X-CSRF-Token` → pasa |
| 10.3 | Rate limiting global | ⚠️ No ejercitado (umbral alto: 500/15min) |
| 10.4 | Correlation IDs | ⚠️ No identificado `X-Request-ID` en headers de respuesta (los headers de red no lo mostraban; verificar middleware) |
| 10.5 | Health check `/api/health` | ⚠️ No verificado |
| 10.6 | Feature flags (laboratorio) | ✅ OK — `PremiumLocked` cuando el plan no incluye el módulo; gates por permiso activos |
| 10.7 | Exportación de datos `/api/export/me` | ⚠️ No verificado |
| 10.8 | Calendar ICS `/api/calendar/doctor/:id/ics` | ⚠️ No verificado |
| 10.9 | Auditoría inmutable | ✅ OK — acciones registradas con hash; sin endpoint de edición/borrado |
| 10.10 | Sensibilidad de datos (PHI) | ⚠️ Revisión de logs no realizada (requiere acceso a servidor/Logs de Render) |

---

## 12. Hallazgos (tabla consolidada)

> Severidad: 🔴 Alta (rompe funcionalidad) / 🟡 Media (funcionalidad limitada o UX) / 🟢 Baja (cosmético/deuda)
> Referencias de archivo apuntan a la fuente del problema en el código.

| ID | Sev | Hallazgo | Archivo:línea | Recomendación |
|----|-----|---------|---------------|---------------|
| F-0 | 🔴 | **Crear/reprogramar cita falla con 500 42883** (undefined_column) — afecta admin (4.4), paciente (7.2), doctor y guest. Solo cancelar funciona (no usa esta ruta). Causa: `checkSlotOverlap` interpola `time + (duration || ' minutes')::interval` con columna `time` inexistente | `src/shared/booking-utils.ts:104-117` | Usar `($1::time + make_interval(mins => $2))` tipado y agregar test de regresión sobre el SQL |
| F-1 | 🔴 | **Perfil/ajustes del paciente inalcanzables** — `/account` y `/patient/settings` → 404; el PatientLayout navega a una ruta inexistente | `frontend/src/shared/components/layout/PatientLayout.tsx` (nav "Configuración" → `/patient/settings`); `frontend/src/app/router/AppRouter.tsx` (sin esa ruta) | Crear ruta `/patient/settings` (o `/account`) y rutas de perfil/docs por rol |
| F-2 | 🔴 | **Crear doctor falla 400** por validación `.strict()` (el payload incluye campos no declarados o falta `specialty_id`) | `frontend/src/modules/doctors/DoctorsPage.tsx` + schema zod del doctor (`doctor.schema.ts`) | Alinear payload del form con el schema o usar `.passthrough()` |
| F-3 | 🟡 | **Fechas espurias `0002/0020/0202`** enviadas al API mientras se tipea la fecha en el date picker (availability, holidays, slots) — ruido y fallos de validación en logs | Componentes de date (MUI segmented) en availability/slots/holidays | Debounce del onChange + no disparar request hasta completo |
| F-4 | 🟡 | **Waitlist: sin UI funcional.** Admin no tiene pantalla; el paciente usa endpoint de admin → 403; el backend de patient existe (POST /me) y funciona | `frontend/src/modules/bookings/...` (waitlist usa GET admin); backend `src/modules/waitlist/*` OK | Mover la UI del paciente al endpoint `/me` y crear página admin |
| F-5 | 🟡 | **Historial médico sin endpoint DELETE** → las entradas no se pueden eliminar (y un residuo de prueba QA id=27 queda visible al paciente) | `src/modules/medical-history/medical-history.routes.ts` | Agregar `DELETE /medical-history/:id` con permisos |
| F-6 | 🟡 | **Diálogos genéricos "Nuevo Registro"/"Nueva Prescripción" fallan** (requieren `patient_id` que no envían); solo funciona creando desde la ficha del paciente | `frontend/src/modules/clinical-records/components/ClinicalRecordFormDialog.tsx`, `frontend/src/modules/prescriptions/components/PrescriptionFormDialog.tsx` | Incluir `patient_id` en el payload cuando se abre sin ficha (o exigir selección de paciente) |
| F-7 | 🟡 | **Claves i18n sin traducción renderizadas raw**: `guest_booking.step_personal/step_doctor/step_confirm`, e ítem de menú "holidays" | `src/shared/i18n.service.ts` (faltan `step_*`); claves ES/EN; menú admin | Agregar traducciones faltantes en ES/EN/PT/FR |
| F-8 | 🔴 | **Al completar resultado de laboratorio el QC falla 42703** (`undefined_column`) al guardar; el detalle de solicitud con archivo adjunto es un stub (descarga/upload inoperante) | `src/modules/laboratory/laboratory.service.ts:853`; `frontend/src/modules/laboratory/pages/LabRequestDetailPage.tsx:71-73` | Corregir columnas del insert QC y completar la página de detalle (bucket/path) |
| F-9 | 🟡 | **El paciente no puede ver detalle ni descargar PDF de sus recetas** — las tarjetas son texto plano | `frontend/src/modules/prescriptions/pages/PatientPrescriptionsPage.tsx` | Agregar acción "Ver detalle"/"Descargar PDF" conectada al endpoint de PDF |
| F-10 | 🟡 | **Paciente no puede adjuntar archivos** — vista read-only (input oculto, sin botón) por `canManage=hasPermission('clinicalRecords','edit')` | `frontend/src/modules/clinical-records/pages/ClinicalRecordDetailPage.tsx:124` | Definir permiso `clinicalRecords:upload` para paciente sobre sus propios registros |
| F-0b | 🔴 | **Guest booking roto en 3 puntos**: ① slots → 400 "X-Tenant-Id header is required"; ② frontend llama `/bookings/guest` (404) vs backend `/guest/booking`; ③ endpoint correcto → 500 42883 | `frontend/src/modules/bookings/pages/GuestBookingPage.tsx:172`; `src/modules/guest/guest.routes.ts:22-24`; `src/modules/guest/guest.schema.ts` (rut/email vs guest_*) | Corregir ruta+payload del frontend, enviar tenant en slots públicos, y F-0 |
| F-11 | 🟡 | **Residuos QA visibles al paciente**: comentario "Entrada QA doctor - se eliminará" en historial médico (id=27) | Datos (tenant `default`) | Limpiar datos de prueba del tenant |
| F-12 | 🟢 | **Botones muertos**: "Entrar como invitado" (navega a /dashboard protegido), links de footer `#`, y "Tech Stack" (ancla). Landing: iconos emoji como bullets | `frontend/src/modules/landing/LandingPage.tsx` | Apuntar guest a un demo page real o eliminarlo; completar links |
| F-13 | 🟢 | **Menú admin con etiqueta rara "holidays"** (idem F-7) | Nav del admin/superadmin | Traducir etiqueta |
| F-14 | 🟢 | **Ruido de permisos**: el paciente recibe 2 alerts "No tienes permisos" al cargar `/clinical-records` por GET 403 de `clinical-templates` | `frontend/src/modules/clinical-records/pages/PatientClinicalRecordsPage.tsx` | No llamar templates si el rol no tiene permiso; silenciar 403 conocidos |

---

## 13. Causas raíz principales

1. **Error 42883 (PG undefined_column)** → SQL construido por concatenación en `checkSlotOverlap` que referencia una columna inexistente (`time`). Rompe crear/reprogramar citas y todo el flujo guest.
2. **Ruta guest divergida**: el frontend usa `/bookings/guest` con campos `guest_*`; el backend expone `/guest/booking` con `rut/email/name/phone`. Nadie los alineó.
3. **Tenant header obligatorio en slots**: el middleware exige `X-Tenant-Id` aún en endpoints públicos, y la sesión guest no tiene tenant → "No hay horarios disponibles" permanente.
4. **Rutas del paciente inexistentes** en `AppRouter` mientras el `PatientLayout` navega a ellas → 404.
5. **Uso de `.strict()` + payloads desalineados** en schemas de doctor.

---

## 14. Residuos de prueba dejados en el entorno

| Recurso | Estado |
|---|---|
| Cita #59 (paciente) | Cancelada (prueba de cancelación) |
| Solicitud de laboratorio #194 + historial QA (#16/#64 existentes) | Sin borrado (es dato real del tenant de prueba) |
| Entrada de historial médico id=27 "Entrada QA doctor - se eliminará" | **Visible al paciente; sin DELETE** (F-5/F-11) |
| Expediente clínico #21 (QA) | Datos de la cuenta de prueba |
| Waitlist id=1 (paciente) | Creada y eliminada en la sesión |
| Webhook id=1 | Creado y eliminado en la sesión |
| Doctores/pacientes QA | Existentes de sesiones previas |

No se ejecutaron acciones destructivas: no se creó tenant por `/contratar`, ni se ejecutó `reset-admin` (3.10).

---

## 15. Recomendaciones y priorización

1. **[CRÍTICO]** Corregir `checkSlotOverlap` (F-0) — desbloquea admin, paciente, doctor y guest en un solo fix; cubrir con test de integración sobre el SQL emitido.
2. **[CRÍTICO]** Arreglar el flujo guest (F-0b): alinear ruta `guest/booking`, campos del schema, y relajar `X-Tenant-Id` para endpoints públicos de slots.
3. **[ALTO]** Crear rutas de perfil del paciente (`/patient/settings`, `/account`) (F-1).
4. **[ALTO]** Corregir crear doctor (F-2) y QC de laboratorio 42703 (F-8).
5. **[MEDIO]** Paciente: detalle/PDF de recetas (F-9), permisos de adjuntos (F-10), DELETE historial médico (F-5), UI de waitlist correcta (F-4).
6. **[BAJO]** i18n faltantes, fechas espurias, botones muertos, limpieza de residuos QA (F-11).

---

## 16. Referencias técnicas

**Backend**
- `src/shared/booking-utils.ts:104-117` — F-0 (42883)
- `src/modules/guest/guest.routes.ts:22-24`, `src/modules/guest/guest.schema.ts` — F-0b
- `src/middlewares/tenant.middleware.ts:25` — públicos guest; X-Tenant-Id en slots
- `src/app.ts:246` — mount `/api/guest`
- `src/modules/laboratory/laboratory.service.ts:853` — F-8 (42703)
- `src/modules/medical-history/medical-history.routes.ts` — F-5 (sin DELETE)
- `src/modules/waitlist/*`, `src/modules/webhooks/*` — F-4/F-4.17 (API OK, sin UI)
- `src/shared/i18n.service.ts:166-198` — F-7

**Frontend**
- `frontend/src/app/router/AppRouter.tsx` — rutas existentes (booking:388, contratar:381, confirm:387, clinical-records/:id:243-247)
- `frontend/src/shared/components/layout/PatientLayout.tsx` — F-1
- `frontend/src/modules/bookings/pages/GuestBookingPage.tsx:45,172` — F-0b + F-7
- `frontend/src/modules/landing/LandingPage.tsx:581-587,728-736` — F-12
- `frontend/src/modules/prescriptions/pages/PatientPrescriptionsPage.tsx` — F-9
- `frontend/src/modules/clinical-records/pages/ClinicalRecordDetailPage.tsx:124` — F-10
- `frontend/src/modules/laboratory/pages/LabRequestDetailPage.tsx:71-73` — F-8
- `frontend/src/modules/clinical-records/components/ClinicalRecordFormDialog.tsx`, `frontend/src/modules/prescriptions/components/PrescriptionFormDialog.tsx` — F-6

---

## 17. Pruebas pendientes (no ejecutadas)

- 3.10 reset-admin (destructivo; requiere staging)
- 1.8 cerrar todas las sesiones con verificación de segunda sesión
- 2.8 / 10.7 exportación de datos
- 6.12 / 8.3 envío y confirmación de email reales (depende de crear cita/resultado — ambos bloqueados por F-0/F-8)
- 7.6 compartir resultado de laboratorio (no hay resultados completados)
- 10.3 / 10.4 / 10.5 / 10.8 / 10.10 (validaciones de infraestructura)
- Alta de clínica real por `/contratar` (evitado en producción)

---

> **Versión:** 1.0
> **Fecha:** 2026-09-10
> **Método:** Manual + diagnósticos por API con header `X-CSRF-Token`/cookie (ver `RUTAS-PRUEBA-MANUAL.md`)
> **Tags:** #testing-manual #qa #reporte-final
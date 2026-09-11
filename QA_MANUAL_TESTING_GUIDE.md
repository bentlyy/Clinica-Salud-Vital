# Guía Maestra de Pruebas Manuales — Vitaria

> **Versión:** 1.0 · **Fecha:** 2026-09-11 · **Estado:** Listo para ejecución
> **Plataforma:** Vitaria — SaaS de gestión clínica multi-tenant
> **Stack:** React 19 + Vite 6 + Express 4 + PostgreSQL 15

---

## Contenido

1. [Descripción del Sistema](#1-descripción-del-sistema)
2. [Inventario de Funcionalidades](#2-inventario-de-funcionalidades)
3. [Roles y Usuarios](#3-roles-y-usuarios)
4. [Datos de Prueba](#4-datos-de-prueba)
5. [Pruebas de Autenticación](#5-pruebas-de-autenticación)
6. [Pruebas de Autorización y Permisos](#6-pruebas-de-autorización-y-permisos)
7. [Pruebas CRUD](#7-pruebas-crud)
8. [Pruebas de Formularios](#8-pruebas-de-formularios)
9. [Pruebas de Navegación](#9-pruebas-de-navegación)
10. [Pruebas de Flujos Completos](#10-pruebas-de-flujos-completos)
11. [Pruebas de Búsqueda y Filtros](#11-pruebas-de-búsqueda-y-filtros)
12. [Pruebas de Errores](#12-pruebas-de-errores)
13. [Pruebas de Estados de Interfaz](#13-pruebas-de-estados-de-interfaz)
14. [Pruebas de Archivos](#14-pruebas-de-archivos)
15. [Pruebas de Integraciones](#15-pruebas-de-integraciones)
16. [Pruebas de Seguridad Funcional](#16-pruebas-de-seguridad-funcional)
17. [Pruebas de Responsive](#17-pruebas-de-responsive)
18. [Pruebas de Compatibilidad](#18-pruebas-de-compatibilidad)
19. [Pruebas de Rendimiento Percibido](#19-pruebas-de-rendimiento-percibido)
20. [Pruebas de Concurrencia](#20-pruebas-de-concurrencia)
21. [Pruebas de Datos](#21-pruebas-de-datos)
22. [Smoke Test](#22-smoke-test)
23. [Suite de Regresión](#23-suite-de-regresión)
24. [Matriz General de Pruebas](#24-matriz-general-de-pruebas)
25. [Priorización](#25-priorización)
26. [Funcionalidades No Testeables](#26-funcionalidades-no-testeables)
27. [Hallazgos Detectados Durante el Análisis](#27-hallazgos-detectados-durante-el-análisis)
28. [Criterios para Considerar el Proyecto Funcional](#28-criterios-para-considerar-el-proyecto-funcional)
29. [Checklist Final](#29-checklist-final)

---

## 1. Descripción del Sistema

### Qué es Vitaria

Vitaria es una plataforma **SaaS (Software as a Service)** de gestión clínica centralizada, orientada a centros de salud, consultas médicas y profesionales. Permite administrar pacientes, citas, fichas clínicas, recetas, laboratorio, facturación, reportes y más, todo en una única plataforma web.

### Arquitectura

- **Modelo:** Monolito modular con arquitectura multi-tenant
- **Tenant por defecto:** `default` (separación de datos mediante PostgreSQL Row-Level Security)
- **Separación de datos:** Cada tenant ve ÚNICAMENTE sus datos gracias a RLS + tenant middleware

### Módulos Principales

| Módulo | Descripción |
|--------|-------------|
| Auth | Login, registro, refresh tokens, 2FA/TOTP, sesiones, forgot/reset password |
| Doctors | CRUD de médicos, disponibilidad, invitación por email |
| Booking | Reservas de citas, slots disponibles, series, confirmación por token |
| Clinical Records | Fichas clínicas SOAP, signos vitales, diagnóstico CIE-10 |
| Prescriptions | Recetas médicas asociadas a fichas clínicas |
| Medical History | Historial médico del paciente |
| Laboratory | Solicitudes de lab, áreas, resultados, control de calidad, equipos, reactivos, muestras, notificaciones |
| Billing | Facturas, pagos, estados (pending/paid/overdue) |
| Analytics | Dashboard con KPIs, gráficos de demanda, diagnósticos, vital signs |
| Reports | Generación de reportes por tipo con PDF |
| Audit | Logs de auditoría con cadena HMAC |
| SaaS | Planes, suscripciones, checkout Mercado Pago, onboarding |
| Super Admin | Gestión global de tenants, usuarios, facturación, analytics SaaS |
| Notifications | Notificaciones in-app por usuario |
| Specialties | Catálogo de especialidades médicas |
| Holidays | Feriados de la clínica |
| Attachments | Subida/descarga de archivos (imágenes, PDFs, DICOM) |
| Waitlist | Lista de espera para pacientes |
| Webhooks | Suscripciones a eventos con HMAC-SHA256 |
| Calendar | Exportación de calendario ICS |
| Data Portability | Exportación de datos del paciente (GDPR) |
| Guest Booking | Reserva sin login por RUT |
| Clinical Templates | Plantillas clínicas reutilizables |
| Availability | Horarios semanales y excepciones de disponibilidad |

### Integraciones Externas

| Integración | Estado | Descripción |
|-------------|--------|-------------|
| Mercado Pago (CLP, Chile) | Stub mode sin token real | Pagos de suscripciones SaaS |
| SendGrid / SMTP (Gmail) | Configurable | Envío de correos (reset password, recordatorios, invitaciones) |
| Sentry | Opcional | Monitoreo de errores |
| reCAPTCHA | Opcional (obligatorio en producción) | Protección contra bots |
| open.er-api.com | Activo | Tasas de cambio (USD → CLP/ARS/BRL/MXN) |
| Twilio (SMS) | NO implementado | No existe sms.service.ts |

### Endpoints Totales: ~221 (26 públicos, 19 con auth sin authorize, 159 con authorize)

---

## 2. Inventario de Funcionalidades

| ID | Funcionalidad | Módulo | Rol(es) | Estado |
|----|---------------|--------|---------|--------|
| F01 | Login con email/password | Auth | Todos | COMPLETA |
| F02 | Login con 2FA/TOTP | Auth | Todos (si activado) | COMPLETA |
| F03 | Registro por invitación | Auth | Público (con token) | COMPLETA |
| F04 | Forgot password (email reset) | Auth | Todos | COMPLETA |
| F05 | Reset password (con token) | Auth | Público (con token) | COMPLETA |
| F06 | Cambio de contraseña (autenticado) | Auth | Todos (autenticados) | COMPLETA |
| F07 | Habilitar/deshabilitar 2FA | Auth | Todos (autenticados) | COMPLETA |
| F08 | Gestión de sesiones activas | Auth | Todos (autenticados) | COMPLETA |
| F09 | Logout / Logout all | Auth | Todos | COMPLETA |
| F10 | Perfil del usuario (/auth/me) | Auth | Todos (autenticados) | COMPLETA |
| F11 | Reset admin (por superadmin) | Auth | superadmin | COMPLETA |
| F12 | Gestión de médicos (CRUD) | Doctors | admin, superadmin | COMPLETA |
| F13 | Invitar médico por email | Doctors | admin, superadmin | COMPLETA |
| F14 | Panel del médico | Doctors | doctor | COMPLETA |
| F15 | Historial de pacientes del médico | Doctors | doctor | COMPLETA |
| F16 | Resultados de lab del médico | Doctors | doctor | COMPLETA |
| F17 | Crear reserva | Booking | Todos (autenticados) | COMPLETA |
| F18 | Reserva de invitado (sin login) | Guest | guest (público) | COMPLETA |
| F19 | Confirmar reserva por token | Booking | Público | COMPLETA |
| F20 | Cancelar/reagendar reserva | Booking | Todos (autenticados) | COMPLETA |
| F21 | Slots disponibles | Booking | Público | COMPLETA |
| F22 | Reservas serie | Booking | Todos (autenticados) | COMPLETA |
| F23 | Disponibilidad semanal | Availability | doctor, admin, superadmin | COMPLETA |
| F24 | Excepciones de disponibilidad | Availability | doctor | COMPLETA |
| F25 | Calendario del médico | Calendar | doctor, admin, superadmin | COMPLETA |
| F26 | Crear ficha clínica | Clinical Records | doctor | COMPLETA |
| F27 | Ver fichas clínicas | Clinical Records | doctor, admin, patient, superadmin | COMPLETA |
| F28 | Búsqueda CIE-10 | Clinical Records | doctor, admin | COMPLETA |
| F29 | Prescripciones (CRUD) | Clinical Records | doctor (CRUD), patient (lectura) | COMPLETA |
| F30 | Exportar prescripción PDF | Clinical Records | doctor, user, patient | COMPLETA |
| F31 | Historial médico (CRUD) | Medical History | doctor, admin (CRUD), patient (lectura) | COMPLETA |
| F32 | Plantillas clínicas | Clinical Templates | doctor, admin | COMPLETA |
| F33 | Panel de laboratorio | Laboratory | lab_technician, admin, doctor | COMPLETA |
| F34 | Solicitudes de laboratorio | Laboratory | admin, doctor, lab_technician | COMPLETA |
| F35 | Áreas de laboratorio | Laboratory | Todos (autenticados) | COMPLETA |
| F36 | Catálogo de tests | Laboratory | Todos (autenticados) | COMPLETA |
| F37 | Resultados de lab (paciente) | Laboratory | patient | COMPLETA |
| F38 | Control de calidad | Laboratory | lab_technician, admin | COMPLETA |
| F39 | Analíticas de lab | Laboratory | lab_technician, admin | COMPLETA |
| F40 | Muestras de lab | Laboratory | lab_technician, admin | COMPLETA |
| F41 | Equipos de lab | Laboratory | lab_technician, admin | COMPLETA |
| F42 | Reactivos | Laboratory | lab_technician, admin | COMPLETA |
| F43 | Notificaciones de lab | Laboratory | lab_technician, admin, doctor | COMPLETA |
| F44 | Resultados compartidos por token | Laboratory | Público | COMPLETA |
| F45 | Crear/editar facturas | Billing | admin, doctor, superadmin | COMPLETA |
| F46 | Cambiar estado de factura | Billing | admin, superadmin | COMPLETA |
| F47 | Dashboard analytics | Analytics | admin, doctor, superadmin | COMPLETA |
| F48 | Generar reportes | Reports | admin, doctor, lab_technician | COMPLETA |
| F49 | Descargar reporte PDF | Reports | admin, superadmin | COMPLETA |
| F50 | Logs de auditoría | Audit | admin, superadmin | COMPLETA |
| F51 | Planes SaaS | SaaS | Público (lectura), admin/superadmin (gestión) | COMPLETA |
| F52 | Checkout Mercado Pago | SaaS | admin, superadmin | COMPLETA |
| F53 | Onboarding de clínica | SaaS | admin, superadmin | COMPLETA |
| F54 | Revisión de onboarding | SaaS | superadmin | COMPLETA |
| F55 | Gestión de tenants | Super Admin | superadmin | COMPLETA |
| F56 | Usuarios globales | Super Admin | superadmin | COMPLETA |
| F57 | Analytics SaaS | Super Admin | superadmin | COMPLETA |
| F58 | Cobros/facturación SaaS | Super Admin | superadmin | COMPLETA |
| F59 | Especialidades (CRUD) | Specialties | admin, superadmin | COMPLETA |
| F60 | Feriados (CRUD) | Holidays | admin, superadmin | COMPLETA |
| F61 | Notificaciones in-app | Notifications | Todos (autenticados) | COMPLETA |
| F62 | Adjuntos (upload/download/delete) | Attachments | Todos (con ownership) | COMPLETA |
| F63 | Lista de espera | Waitlist | Todos (autenticados) | COMPLETA |
| F64 | Webhooks (CRUD + dispatch) | Webhooks | admin, superadmin | COMPLETA |
| F65 | Exportar datos del paciente | Data Portability | Todos (autenticados) | COMPLETA |
| F66 | Dashboard principal | Dashboard | Todos (autenticados) | COMPLETA |
| F67 | Gestión de usuarios | Users | admin, superadmin | COMPLETA |
| F68 | Tema claro/oscuro | Settings | Todos | COMPLETA |
| F69 | Cambio de idioma (es/en/pt/fr) | i18n | Todos | COMPLETA |
| F70 | Landing page pública | Landing | Público | COMPLETA |
| F71 | Contratación de clínica | Onboarding | Público | COMPLETA |
| F72 | Panel del médico (citas por estado) | Doctors | doctor | COMPLETA |
| F73 | Generar datos demo | Admin | admin, superadmin | COMPLETA |
| F74 | Feature flags (laboratorio gated) | SaaS | Todos | COMPLETA |
| F75 | Health check / Liveness | System | Público | COMPLETA |
| F76 | Tasas de cambio | Currencies | Público | COMPLETA |

---

## 3. Roles y Usuarios

### Roles Existentes (7)

| Rol | Descripción | Tenant | Acceso Principal |
|-----|-------------|--------|------------------|
| `superadmin` | Administrador de plataforma (todas las clínicas) | NULL (cross-clinic) | Panel SaaS, tenants, usuarios globales, analytics, cobros, auditoría |
| `admin` | Administrador de una clínica específica | Asignado | Dashboard, gestión clínica, doctores, usuarios, facturación, analytics, reportes, configuración |
| `doctor` | Médico de una clínica | Asignado | Panel médico, fichas clínicas, recetas, historial, disponibilidad, calendario, laboratorio (parcial) |
| `lab_technician` | Técnico de laboratorio (plan Pro) | Asignado | Panel de lab completo, solicitudes, áreas, QC, analíticas |
| `patient` / `user` | Paciente registrado | Asignado | Dashboard, reservas, fichas clínicas (lectura), recetas (lectura), historial, resultados de lab, configuración |
| `guest` | Visitante no autenticado | N/A | Reserva de invitado, landing page |

### Permisos por Rol (Resumen Frontend)

| Funcionalidad | superadmin | admin | doctor | lab_technician | patient |
|---------------|:----------:|:-----:|:------:|:--------------:|:-------:|
| Panel SaaS | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestión de tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Usuarios globales | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cobros SaaS | ✅ | ❌ | ❌ | ❌ | ❌ |
| Onboarding (revisión) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard clínica | ❌ | ✅ | ✅ | ✅ | ✅ |
| Gestión de doctores | ❌ | ✅ | ❌ | ❌ | ❌ |
| Gestión de usuarios | ❌ | ✅ | ❌ | ❌ | ❌ |
| Disponibilidad | ✅ | ✅ | ✅ | ❌ | ❌ |
| Calendario médico | ✅ | ✅ | ✅ | ❌ | ❌ |
| Fichas clínicas (crear) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Fichas clínicas (ver) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Prescripciones (CRUD) | ❌ | ❌ | ✅ | ❌ | ❌ (solo lectura) |
| Historial médico | ✅ | ✅ | ✅ | ❌ | ✅ (lectura) |
| Reservas | ✅ | ✅ | ✅ | ❌ | ✅ |
| Laboratorio (panel) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Laboratorio (results) | ❌ | ❌ | ❌ | ❌ | ✅ (/my-laboratory) |
| Facturación | ✅ | ✅ | ❌ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reportes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Auditoría | ✅ | ✅ | ❌ | ❌ | ❌ |
| Especialidades | ✅ | ✅ | ❌ | ❌ | ❌ |
| Feriados | ✅ | ✅ | ❌ | ❌ | ❌ |
| Notificaciones | ✅ | ✅ | ✅ | ✅ | ❌ |
| Perfil / Ajustes | ✅ | ✅ | ✅ | ✅ | ✅ |

### Acciones Prohibidas por Rol

| Acción Prohibida | Rol que Intenta | Resultado Esperado |
|------------------|-----------------|---------------------|
| Crear ficha clínica | admin | 403 Forbidden (backend) |
| Crear reserva de otro usuario | patient | 403 Forbidden (backend ownership check) |
| Ver analytics SaaS | admin | Redirige a home (frontend), 403 (backend) |
| Gestionar tenants | doctor | Redirige a home (frontend), 403 (backend) |
| Crear solicitud de lab | lab_technician | 403 Forbidden (solo admin/doctor) |
| Cambiar estado de factura | doctor | 403 Forbidden (solo admin/superadmin) |
| Eliminar ficha clínica de otro doctor | doctor | 403 Forbidden (ownership check) |
| Ver archivos de otro paciente | patient | 403 Forbidden (ownership check) |
| Acceder a /tenants | admin | Redirige a home |
| Acceder a /clinical | patient | Redirige a home |

---

## 4. Datos de Prueba

### Usuarios del Tenant "default" (Desarrollo Local)

> **Nota:** Las contraseñas dependen de las variables de entorno. Las indicadas son las del fallback en desarrollo.

| Usuario | Email | Rol | Contraseña (dev fallback) |
|---------|-------|-----|---------------------------|
| Super Admin | superadmin@clinic.com | superadmin | `REPLACED_PASSWORD` (o `SUPERADMIN_PASSWORD` del .env) |
| Admin | admin@clinic.com | admin | `REPLACED_PASSWORD` (o `ADMIN_PASSWORD` del .env) |
| Dr. Juan Pérez | juan@clinic.com | doctor | `Vitaria.juan.2026!` |
| Dra. María López | maria@clinic.com | doctor | `Vitaria.maria.2026!` |
| Dr. Carlos Soto | carlos@clinic.com | doctor | `Vitaria.carlos.2026!` |
| Dra. Ana Torres | ana@clinic.com | doctor | `Vitaria.ana.2026!` |
| Dr. Pedro González | pedro@clinic.com | doctor | `Vitaria.pedro.2026!` |
| Dra. Claudia Muñoz | claudia@clinic.com | doctor | `Vitaria.claudia.2026!` |
| Dr. Ricardo Díaz | ricardo@clinic.com | doctor | `Vitaria.ricardo.2026!` |
| Dra. Patricia Vega | patricia@clinic.com | doctor | `Vitaria.patricia.2026!` |
| Dr. Mauricio Rojas | mauricio@clinic.com | doctor | `Vitaria.mauricio.2026!` |
| Dra. Carmen Flores | carmen@clinic.com | doctor | `Vitaria.carmen.2026!` |
| Dr. Francisco Mora | francisco@clinic.com | doctor | `Vitaria.francisco.2026!` |
| Dra. Verónica Pizarro | veronica@clinic.com | doctor | `Vitaria.veronica.2026!` |
| Técnico de Laboratorio | lab@clinic.com | lab_technician | `Vitaria.lab.2026!` |
| Pacientes (30+) | `nombre.apellido@clinic.com` | user (patient) | `Vitaria.nombre.apellido.2026!` |
| user1 | user1@clinic.com | user (patient) | `Vitaria.user1.2026!` |
| user2 | user2@clinic.com | user (patient) | `Vitaria.user2.2026!` |
| user3 | user3@clinic.com | user (patient) | `Vitaria.user3.2026!` |

### Regla de Contraseñas Seed

Para usuarios creados por el seed (no superadmin/admin):
```
Vitaria.<slug_del_email>.<año_actual>!
```
Ejemplo: `juan@clinic.com` → `Vitaria.juan.2026!`

### Datos Ya Cargados por el Seed

El seed crea automáticamente en el tenant default:
- 12 doctores con disponibilidad (lun-vie 09:00-17:00)
- 30+ pacientes
- Reservas pasadas (18) y futuras (7)
- Fichas clínicas (≈65% de las reservas completadas)
- Prescripciones (≈50% de las fichas clínicas)
- Solicitudes de laboratorio (≈40% de las fichas clínicas)
- Facturas (≈50% de las reservas completadas)
- Historial médico (10+ pacientes)
- Logs de auditoría (35+)
- Áreas de lab, tests, equipos, reactivos, QC records, notificaciones de lab

### Para Probar Multi-tenancy

Los tenants `clinica-norte` y `clinica-sur` pueden crearse vía onboarding (`/contratar`) o SQL directo. Si ya existen:

| Tenant | Admin | Lab Tech | Plan |
|--------|-------|----------|------|
| clinica-norte | admin@norte.clinic.com / `Vitaria.admin.2026!` | lab@norte.clinic.com / `Vitaria.lab.2026!` | pro |
| clinica-sur | admin@sur.clinic.com / `Vitaria.admin.2026!` | — | basic |

---

## 5. Pruebas de Autenticación

### TEST-AUTH-001 — Login exitoso (admin)

**Categoría:** Autenticación · **Prioridad:** CRITICAL · **Rol:** admin · **Módulo:** Auth

**Objetivo:** Verificar que un usuario admin puede iniciar sesión correctamente.

**Precondiciones:** Aplicación corriendo en localhost:5173. Usuario admin@clinic.com existe.

**Datos necesarios:** Email: admin@clinic.com, Password: (según .env)

**Pasos:**
1. Abre http://localhost:5173 en el navegador
2. Haz clic en el botón "Iniciar sesión" en la landing page
3. En el modal de login, ingresa `admin@clinic.com` en el campo email
4. Ingresa la contraseña correcta en el campo password
5. Haz clic en "Iniciar sesión"
6. Observa la redirección

**Resultado esperado:** Redirige a `/dashboard`. Se muestra el dashboard con estadísticas y el menú lateral con las opciones del admin (Dashboard, Clínica, Gestión, Feriados, Laboratorio, Plan SaaS, Ajustes).

**Resultado que representa FAIL:** Aparece un mensaje de error, la página no carga, o se queda en la landing.

**Estado:** NOT TESTED

---

### TEST-AUTH-002 — Login exitoso (doctor)

**Categoría:** Autenticación · **Prioridad:** CRITICAL · **Rol:** doctor · **Módulo:** Auth

**Objetivo:** Verificar que un doctor puede iniciar sesión y acceder a su panel.

**Precondiciones:** Aplicación corriendo. Doctor juan@clinic.com existe.

**Datos necesarios:** Email: juan@clinic.com, Password: Vitaria.juan.2026!

**Pasos:**
1. Abre la landing page
2. Haz clic en "Iniciar sesión"
3. Ingresa `juan@clinic.com` y `Vitaria.juan.2026!`
4. Haz clic en "Iniciar sesión"

**Resultado esperado:** Redirige a `/dashboard`. Menú lateral muestra: Dashboard, Clínica, Gestión, Laboratorio, Ajustes. Opciones como "Gestión de doctores" NO aparecen.

**Resultado que representa FAIL:** Error de login, acceso a menús restringidos, o redirección a `/`.

**Estado:** NOT TESTED

---

### TEST-AUTH-003 — Login exitoso (patient)

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** patient · **Módulo:** Auth

**Objetivo:** Verificar que un paciente puede iniciar sesión y ver su panel.

**Pasos:**
1. Abre la landing page y haz clic en "Iniciar sesión"
2. Ingresa `user1@clinic.com` y `Vitaria.user1.2026!`
3. Haz clic en "Iniciar sesión"

**Resultado esperado:** Redirige a `/dashboard`. Menú lateral: Dashboard, Reservas, Fichas Clínicas, Recetas, Historial Médico, Resultados de Laboratorio, Ajustes.

**Estado:** NOT TESTED

---

### TEST-AUTH-004 — Login exitoso (lab_technician)

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** lab_technician · **Módulo:** Auth

**Pasos:**
1. Login con `lab@clinic.com` / `Vitaria.lab.2026!`

**Resultado esperado:** Menú lateral incluye: Dashboard, Laboratorio (submenú completo), Analíticas, Reportes, Ajustes.

**Estado:** NOT TESTED

---

### TEST-AUTH-005 — Login exitoso (superadmin)

**Categoría:** Autenticación · **Prioridad:** CRITICAL · **Rol:** superadmin · **Módulo:** Auth

**Pasos:**
1. Login con `superadmin@clinic.com` / `REPLACED_PASSWORD`

**Resultado esperado:** Menú lateral incluye: Panel SaaS, Clínicas, Solicitudes Onboarding, Usuarios, Especialidades, Feriados, Auditoría, Cobros, Plan SaaS, Ajustes.

**Estado:** NOT TESTED

---

### TEST-AUTH-006 — Login con contraseña incorrecta

**Categoría:** Autenticación · **Prioridad:** CRITICAL · **Rol:** — · **Módulo:** Auth

**Pasos:**
1. Abre el modal de login
2. Ingresa `admin@clinic.com` y `wrongpassword123`
3. Haz clic en "Iniciar sesión"

**Resultado esperado:** Se muestra mensaje de error "Credenciales inválidas" (o similar). No se redirige. Se permanece en el modal de login.

**Estado:** NOT TESTED

---

### TEST-AUTH-007 — Login con email inexistente

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** — · **Módulo:** Auth

**Pasos:**
1. Login con `noexiste@clinic.com` / `anypassword`

**Resultado esperado:** Mensaje de error genérico (NO debe indicar si el email existe o no por seguridad anti-reconnaissance). No se redirige.

**Estado:** NOT TESTED

---

### TEST-AUTH-008 — Login con campos vacíos

**Categoría:** Autenticación · **Prioridad:** MEDIUM · **Rol:** — · **Módulo:** Auth

**Pasos:**
1. Abre el modal de login
2. Deja email y password vacíos
3. Haz clic en "Iniciar sesión"

**Resultado esperado:** Validación de formulario muestra errores "Email requerido" y "Contraseña requerida" (o similar). No se envía la petición al backend.

**Estado:** NOT TESTED

---

### TEST-AUTH-009 — Login con email formato inválido

**Categoría:** Autenticación · **Prioridad:** MEDIUM · **Rol:** — · **Módulo:** Auth

**Pasos:**
1. Ingresa `emailinvalido` en el campo email
2. Ingresa cualquier password
3. Haz clic en "Iniciar sesión"

**Resultado esperado:** Validación de formulario muestra "Email inválido". No se envía la petición.

**Estado:** NOT TESTED

---

### TEST-AUTH-010 — Login con contraseña incorrecta ×5 (Account Lockout)

**Categoría:** Autenticación · **Prioridad:** CRITICAL · **Rol:** — · **Módulo:** Auth

**Pasos:**
1. Abre el modal de login
2. Ingresa `admin@clinic.com` y `wrongpass`
3. Haz clic en "Iniciar sesión" → Error
4. Repite los pasos 2-3 hasta 5 veces

**Resultado esperado:** A partir del 5° intento fallido, el mensaje de error indica que la cuenta está bloqueada temporalmente (15 minutos). No importa si se usa la contraseña correcta, el login falla.

**Estado:** NOT TESTED

---

### TEST-AUTH-011 — Logout

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Auth

**Pasos:**
1. Inicia sesión como admin
2. Haz clic en "Cerrar sesión" (en el menú/perfil)
3. Intenta navegar a `/dashboard` directamente en la barra de direcciones

**Resultado esperado:** Se redirige a la landing page (`/`). La sesión se invalida. Navegar a `/dashboard` redirige a `/`.

**Estado:** NOT TESTED

---

### TEST-AUTH-012 — Refresh de página (persistencia de sesión)

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Auth

**Pasos:**
1. Inicia sesión como admin
2. Presiona F5 (refrescar página)
3. Observa el estado

**Resultado esperado:** La sesión se restaura automáticamente (via refresh token cookie). El usuario permanece en `/dashboard` con sus datos visibles. No se muestra pantalla de carga infinita.

**Estado:** NOT TESTED

---

### TEST-AUTH-013 — Forgot password

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** — · **Módulo:** Auth

**Pasos:**
1. Abre el modal de login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa `admin@clinic.com`
4. Haz clic en "Enviar"

**Resultado esperado:** Se muestra mensaje de éxito "Se ha enviado un enlace de recuperación a tu correo" (o similar). El mensaje se muestra SIEMPRE aunque el email no exista (anti-reconnaissance).

**Estado:** NOT TESTED

---

### TEST-AUTH-014 — Cambio de contraseña (autenticado)

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Auth

**Pasos:**
1. Inicia sesión como admin
2. Ve a Ajustes → Seguridad
3. Ingresa la contraseña actual
4. Ingresa una nueva contraseña que cumpla la política (8+ chars, mayúscula, minúscula, dígito, especial)
5. Confirma la nueva contraseña
6. Haz clic en "Guardar"
7. Haz logout
8. Intenta login con la contraseña antigua
9. Login con la nueva contraseña

**Resultado esperado:** El cambio se confirma. Login con contraseña antigua falla. Login con la nueva funciona. Todas las sesiones anteriores se invalidan.

**Estado:** NOT TESTED

---

### TEST-AUTH-015 — Habilitar 2FA

**Categoría:** Autenticación · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Auth

**Pasos:**
1. Inicia sesión como admin
2. Ve a Ajustes → Seguridad
3. Haz clic en "Habilitar 2FA"
4. Escanea el código QR con una app de autenticación (Google Authenticator, Authy)
5. Ingresa el código de 6 dígitos
6. Haz clic en "Verificar"

**Resultado esperado:** Se muestra confirmación de que 2FA está activo. La próxima vez que inicie sesión, se le pedirá el código TOTP después de la contraseña.

**Estado:** NOT TESTED

---

### TEST-AUTH-016 — Login con 2FA habilitado

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Auth

**Precondiciones:** 2FA está habilitado para la cuenta.

**Pasos:**
1. Abre el modal de login
2. Ingresa credenciales correctas
3. Haz clic en "Iniciar sesión"

**Resultado esperado:** Aparece un segundo paso pidiendo el código de 6 dígitos. Se redirige a `/2fa`.

**Pasos adicionales:**
4. Ingresa un código incorrecto
5. Haz clic en "Verificar"
6. Observa el error
7. Ingresa el código correcto de la app de autenticación
8. Haz clic en "Verificar"

**Resultado esperado (paso 5):** Error "Código 2FA incorrecto".
**Resultado esperado (paso 8):** Login exitoso, redirige a `/dashboard`.

**Estado:** NOT TESTED

---

### TEST-AUTH-017 — Deshabilitar 2FA

**Categoría:** Autenticación · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Auth

**Precondiciones:** 2FA está habilitado.

**Pasos:**
1. Inicia sesión (con 2FA)
2. Ve a Ajustes → Seguridad
3. Haz clic en "Deshabilitar 2FA"
4. Ingresa tu contraseña y un código TOTP válido
5. Confirma

**Resultado esperado:** 2FA se desactiva. La próxima vez que inicie sesión, solo pide email/password.

**Estado:** NOT TESTED

---

### TEST-AUTH-018 — Sesiones activas

**Categoría:** Autenticación · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Auth

**Pasos:**
1. Inicia sesión como admin en Chrome
2. Inicia sesión como admin en Firefox (misma IP)
3. Desde Chrome, ve a Ajustes → Seguridad → Sesiones activas

**Resultado esperado:** Se listan al menos 2 sesiones con información de dispositivo/navegador. Puede revocar una sesión específica.

**Estado:** NOT TESTED

---

### TEST-AUTH-019 — Acceso directo a página protegida sin sesión

**Categoría:** Autenticación · **Prioridad:** HIGH · **Rol:** — · **Módulo:** Auth

**Pasos:**
1. Cierra todas las sesiones
2. Abre http://localhost:5173/dashboard directamente

**Resultado esperado:** Se redirige a `/` (landing page). No se muestra el dashboard.

**Estado:** NOT TESTED

---

### TEST-AUTH-020 — Acceso con token expirado (refresh automático)

**Categoría:** Autenticación · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Auth

**Pasos:**
1. Inicia sesión como admin
2. Espera más de 15 minutos (o manipula manualmente la cookie access_token para simular expiración)
3. Realiza una acción que haga una petición API

**Resultado esperado:** El sistema refresca el token automáticamente usando el refresh_token. No se muestra error. La sesión continúa.

**Estado:** NOT TESTED

---

## 6. Pruebas de Autorización y Permisos

### TEST-AUTHZ-001 — Admin no puede crear fichas clínicas

**Categoría:** Autorización · **Prioridad:** CRITICAL · **Rol:** admin · **Módulo:** Clinical Records

**Pasos:**
1. Inicia sesión como admin
2. Intenta navegar a la funcionalidad de creación de ficha clínica
3. Intenta hacer un POST directo a `/api/clinical-records/` con datos válidos

**Resultado esperado:**
- Frontend: El botón/interfaz de crear ficha clínica no está disponible para admin.
- Backend: Retorna `403 Forbidden` (solo doctor puede crear).

**Estado:** NOT TESTED

---

### TEST-AUTHZ-002 — Patient no puede ver analytics

**Categoría:** Autorización · **Prioridad:** HIGH · **Rol:** patient · **Módulo:** Analytics

**Pasos:**
1. Inicia sesión como patient (user1@clinic.com)
2. Intenta navegar a `http://localhost:5173/analytics`

**Resultado esperado:** Se redirige a `/dashboard`. El menú lateral no muestra "Analíticas".

**Estado:** NOT TESTED

---

### TEST-AUTHZ-003 — Doctor no puede gestionar usuarios

**Categoría:** Autorización · **Prioridad:** HIGH · **Rol:** doctor · **Módulo:** Users

**Pasos:**
1. Inicia sesión como doctor (juan@clinic.com)
2. Intenta navegar a `http://localhost:5173/users`

**Resultado esperado:** Se redirige a `/dashboard`. El menú no muestra "Gestión de usuarios" ni "Doctores".

**Estado:** NOT TESTED

---

### TEST-AUTHZ-004 — Lab technician no puede crear solicitudes de lab

**Categoría:** Autorización · **Prioridad:** HIGH · **Rol:** lab_technician · **Módulo:** Laboratory

**Pasos:**
1. Inicia sesión como lab_technician (lab@clinic.com)
2. Intenta crear una solicitud de lab vía API: `POST /api/laboratory/` con datos válidos

**Resultado esperado:** Backend retorna `403 Forbidden`. Solo admin y doctor pueden crear solicitudes.

**Estado:** NOT TESTED

---

### TEST-AUTHZ-005 — Superadmin no puede crear fichas clínicas

**Categoría:** Autorización · **Prioridad:** HIGH · **Rol:** superadmin · **Módulo:** Clinical Records

**Pasos:**
1. Inicia sesión como superadmin
2. Intenta hacer POST a `/api/clinical-records/`

**Resultado esperado:** Backend retorna `403 Forbidden`. El superadmin NO tiene permiso explícito para crear fichas clínicas.

**Estado:** NOT TESTED

---

### TEST-AUTHZ-006 — Superadmin puede gestionar tenants

**Categoría:** Autorización · **Prioridad:** CRITICAL · **Rol:** superadmin · **Módulo:** Super Admin

**Pasos:**
1. Inicia sesión como superadmin
2. Navega a `/tenants`
3. Haz clic en "Crear tenant"
4. Completa el formulario con datos válidos
5. Guarda

**Resultado esperado:** El tenant se crea exitosamente. Aparece en la lista.

**Estado:** NOT TESTED

---

### TEST-AUTHZ-007 — Admin no puede acceder a `/tenants`

**Categoría:** Autorización · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Super Admin

**Pasos:**
1. Inicia sesión como admin
2. Navega a `http://localhost:5173/tenants`

**Resultado esperado:** Se redirige a `/dashboard`.

**Estado:** NOT TESTED

---

### TEST-AUTHZ-008 — Patient no puede cancelar reserva de otro usuario

**Categoría:** Autorización · **Prioridad:** CRITICAL · **Rol:** patient · **Módulo:** Booking

**Pasos:**
1. Inicia sesión como patient (user1@clinic.com)
2. Anota el ID de una reserva que NO le pertenece
3. Intenta cancelar esa reserva: `PATCH /api/bookings/{id}/cancel` con motivo

**Resultado esperado:** Backend retorna `403 Forbidden` (ownership check). La reserva no se modifica.

**Estado:** NOT TESTED

---

### TEST-AUTHZ-009 — Doctor no puede ver ficha clínica de otro doctor (sin relación)

**Categoría:** Autorización · **Prioridad:** HIGH · **Rol:** doctor · **Módulo:** Clinical Records

**Pasos:**
1. Inicia sesión como doctor A (juan@clinic.com)
2. Intenta acceder a `GET /api/clinical-records/{id}` donde el id pertenece a un paciente atendido SOLO por doctor B

**Resultado esperado:** Backend retorna `403 Forbidden` (ownership check: `assertDoctorPatientRelationship`).

**Estado:** NOT TESTED

---

### TEST-AUTHZ-010 — Superadmin accede a datos de otros tenants

**Categoría:** Autorización · **Prioridad:** CRITICAL · **Rol:** superadmin · **Módulo:** Multi-tenancy

**Pasos:**
1. Inicia sesión como superadmin
2. Navega a `/super-admin/users`
3. Filtra por diferentes clínicas

**Resultado esperado:** El superadmin ve usuarios de TODOS los tenants (tenant_id = NULL en su JWT le permite cross-clinic).

**Estado:** NOT TESTED

---

## 7. Pruebas CRUD

### TEST-CRUD-001 — Crear médico (admin)

**Categoría:** CRUD · **Prioridad:** CRITICAL · **Rol:** admin · **Módulo:** Doctors

**Pasos:**
1. Inicia sesión como admin
2. Ve a Doctores (menú lateral)
3. Haz clic en "Agregar médico" o "Registrar médico"
4. Completa: Nombre "Dr. Test QA", Email "test.qa@clinic.com", Especialidad "Cardiología", RUT "12345678-5", Teléfono "+56912345678"
5. Haz clic en "Guardar"

**Resultado esperado:** El médico aparece en la lista. Se muestra confirmación.

**Estado:** NOT TESTED

---

### TEST-CRUD-002 — Editar médico

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Doctors

**Pasos:**
1. Encuentra al médico "Dr. Test QA" en la lista
2. Haz clic en editar (ícono de lápiz)
3. Cambia la especialidad a "Dermatología"
4. Guarda

**Resultado esperado:** La especialidad se actualiza en la lista y en el detalle.

**Estado:** NOT TESTED

---

### TEST-CRUD-003 — Desactivar médico

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Doctors

**Pasos:**
1. Encuentra al médico a desactivar
2. Haz clic en "Desactivar" o cambia el toggle de estado
3. Confirma la acción

**Resultado esperado:** El médico se marca como inactivo. No aparece en la lista de selección de doctores para reservas.

**Estado:** NOT TESTED

---

### TEST-CRUD-004 — Crear reserva

**Categoría:** CRUD · **Prioridad:** CRITICAL · **Rol:** admin · **Módulo:** Booking

**Pasos:**
1. Inicia sesión como admin
2. Ve a Reservas
3. Haz clic en "Nueva reserva"
4. Selecciona un doctor, paciente, fecha (mañana), hora (10:00)
5. Guarda

**Resultado esperado:** La reserva aparece en la lista con estado "pending" o "confirmed".

**Estado:** NOT TESTED

---

### TEST-CRUD-005 — Cancelar reserva

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Booking

**Pasos:**
1. Selecciona una reserva existente
2. Haz clic en "Cancelar"
3. Ingresa un motivo de cancelación
4. Confirma

**Resultado esperado:** La reserva cambia a estado "cancelled". Se muestra en la lista con el nuevo estado.

**Estado:** NOT TESTED

---

### TEST-CRUD-006 — Reagendar reserva

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Booking

**Pasos:**
1. Selecciona una reserva "pending" o "confirmed"
2. Haz clic en "Reagendar"
3. Selecciona una nueva fecha y hora
4. Confirma

**Resultado esperado:** La reserva se actualiza con la nueva fecha/hora.

**Estado:** NOT TESTED

---

### TEST-CRUD-007 — Crear ficha clínica (doctor)

**Categoría:** CRUD · **Prioridad:** CRITICAL · **Rol:** doctor · **Módulo:** Clinical Records

**Pasos:**
1. Inicia sesión como doctor (juan@clinic.com)
2. Ve a Clínica → Fichas clínicas (o selecciona una cita completada)
3. Haz clic en "Crear ficha clínica"
4. Completa: Motivo de consulta, Anamnesis, Signos vitales (PA, FC, Temp, etc.), Examen físico, Diagnóstico (usa búsqueda CIE-10), Plan de tratamiento
5. Guarda

**Resultado esperado:** La ficha clínica se crea. Aparece en la lista de fichas del paciente.

**Estado:** NOT TESTED

---

### TEST-CRUD-008 — Crear prescripción

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** doctor · **Módulo:** Clinical Records

**Pasos:**
1. Abre una ficha clínica existente
2. Sección de prescripciones → "Agregar prescripción"
3. Completa: Medicamento "Ibuprofeno 400mg", Dosis "1 comprimido", Frecuencia "cada 8 horas", Duración "7 días", Instrucciones "Tomar con alimentos"
4. Guarda

**Resultado esperado:** La prescripción aparece asociada a la ficha clínica. El paciente puede verla en "Mis recetas".

**Estado:** NOT TESTED

---

### TEST-CRUD-009 — Crear solicitud de laboratorio

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** doctor · **Módulo:** Laboratory

**Pasos:**
1. Inicia sesión como doctor
2. Ve a Laboratorio → Solicitudes
3. Haz clic en "Nueva solicitud"
4. Selecciona paciente, prioridad "routine", tests (ej: "Hemograma completo")
5. Guarda

**Resultado esperado:** La solicitud se crea con estado "pending". El lab_technician la ve en su panel.

**Estado:** NOT TESTED

---

### TEST-CRUD-010 — Crear factura

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Billing

**Pasos:**
1. Inicia sesión como admin
2. Ve a Gestión → Facturación
3. Haz clic en "Crear factura"
4. Completa: Paciente, concepto, monto
5. Guarda

**Resultado esperado:** La factura aparece con estado "pending".

**Estado:** NOT TESTED

---

### TEST-CRUD-011 — Marcar factura como pagada

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Billing

**Pasos:**
1. Selecciona una factura "pending"
2. Cambia estado a "paid"
3. Selecciona método de pago

**Resultado esperado:** La factura se marca como pagada. El monto se refleja en las estadísticas de facturación.

**Estado:** NOT TESTED

---

### TEST-CRUD-012 — Crear especialidad

**Categoría:** CRUD · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Specialties

**Pasos:**
1. Inicia sesión como admin
2. Ve a Especialidades
3. Haz clic en "Agregar"
4. Ingresa nombre "Oncología"
5. Guarda

**Resultado esperado:** La especialidad aparece en la lista.

**Estado:** NOT TESTED

---

### TEST-CRUD-013 — Crear feriado

**Categoría:** CRUD · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Holidays

**Pasos:**
1. Inicia sesión como admin
2. Ve a Feriados
3. Haz clic en "Agregar feriado"
4. Selecciona fecha, nombre "Feriado de prueba", días de anticipación 7
5. Guarda

**Resultado esperado:** El feriado aparece en la lista. Las reservas en esa fecha muestran advertencia.

**Estado:** NOT TESTED

---

### TEST-CRUD-014 — Eliminar especialidad

**Categoría:** CRUD · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Specialties

**Pasos:**
1. Selecciona la especialidad "Oncología" que se creó
2. Haz clic en "Eliminar"
3. Confirma

**Resultado esperado:** La especialidad se elimina de la lista.

**Estado:** NOT TESTED

---

### TEST-CRUD-015 — Crear historial médico

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** doctor · **Módulo:** Medical History

**Pasos:**
1. Inicia sesión como doctor
2. Ve a Historial Médico
3. Selecciona un paciente
4. Haz clic en "Agregar condición"
5. Completa: Condición "Diabetes tipo 2", Fecha de inicio, Estado "chronic", Notas "En tratamiento con Metformina"
6. Guarda

**Resultado esperado:** La condición aparece en el historial del paciente.

**Estado:** NOT TESTED

---

### TEST-CRUD-016 — Persistencia después de refresh

**Categoría:** CRUD · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Todos

**Pasos:**
1. Crea una entidad (ej: especialidad "Persistencia Test")
2. Refresca la página (F5)
3. Navega al módulo nuevamente

**Resultado esperado:** La entidad creada persiste después del refresh.

**Estado:** NOT TESTED

---

## 8. Pruebas de Formularios

### TEST-FORM-001 — Login: campos vacíos

**Categoría:** Formularios · **Prioridad:** HIGH · **Módulo:** Auth

**Pasos:**
1. Abre el modal de login
2. Deja ambos campos vacíos
3. Haz clic en "Iniciar sesión"

**Resultado esperado:** Errores de validación en ambos campos. No se envía petición al backend.

**Estado:** NOT TESTED

---

### TEST-FORM-002 — Login: email con espacios

**Categoría:** Formularios · **Prioridad:** MEDIUM · **Módulo:** Auth

**Pasos:**
1. Ingresa ` admin@clinic.com ` (con espacios al inicio y final)
2. Ingresa contraseña correcta
3. Intenta login

**Resultado esperado:** El sistema trimea los espacios y el login funciona (o muestra error claro).

**Estado:** NOT TESTED

---

### TEST-FORM-003 — Login: doble click en botón

**Categoría:** Formularios · **Prioridad:** MEDIUM · **Módulo:** Auth

**Pasos:**
1. Ingresa credenciales correctas
2. Haz doble clic rápido en "Iniciar sesión"

**Resultado esperado:** Solo se envía UNA petición de login. No se duplica la sesión. El botón se deshabilita durante el envío.

**Estado:** NOT TESTED

---

### TEST-FORM-004 — Crear reserva: campos obligatorios vacíos

**Categoría:** Formularios · **Prioridad:** HIGH · **Módulo:** Booking

**Pasos:**
1. Abre el formulario de nueva reserva
2. Deja todos los campos vacíos
3. Haz clic en "Guardar"

**Resultado esperado:** Errores de validación en doctor, paciente, fecha, hora.

**Estado:** NOT TESTED

---

### TEST-FORM-005 — Crear reserva: fecha en el pasado

**Categoría:** Formularios · **Prioridad:** HIGH · **Módulo:** Booking

**Pasos:**
1. Intenta crear una reserva con fecha de hace 3 días
2. Guarda

**Resultado esperado:** Error de validación indicando que la fecha debe ser futura.

**Estado:** NOT TESTED

---

### TEST-FORM-006 — Crear ficha clínica: signos vitales inválidos

**Categoría:** Formularios · **Prioridad:** MEDIUM · **Módulo:** Clinical Records

**Pasos:**
1. Abre formulario de ficha clínica
2. Ingresa presión arterial "999/999"
3. Ingresa temperatura "50"
4. Intenta guardar

**Resultado esperado:** Validación indica valores fuera de rango aceptable.

**Estado:** NOT TESTED

---

### TEST-FORM-007 — Onboarding: formulario de contratación (4 pasos)

**Categoría:** Formularios · **Prioridad:** HIGH · **Módulo:** Onboarding

**Pasos:**
1. Navega a `http://localhost:5173/contratar`
2. Paso 1 (Cuenta): Completa tenant_name, domain, admin_name, admin_email, admin_password
3. Haz clic en "Siguiente"
4. Paso 2 (Perfil): Completa país, datos legales, especialidades
5. Haz clic en "Siguiente"
6. Paso 3 (Documentos): Sube archivos de prueba
7. Haz clic en "Siguiente"
8. Paso 4 (Revisión): Verifica datos
9. Haz clic en "Enviar solicitud"

**Resultado esperado:** La solicitud se envía. Se muestra confirmación. El superadmin puede ver la solicitud en `/onboarding-applications`.

**Estado:** NOT TESTED

---

### TEST-FORM-008 — Cambio de contraseña: contraseñas no coinciden

**Categoría:** Formularios · **Prioridad:** MEDIUM · **Módulo:** Auth

**Pasos:**
1. Ve a Ajustes → Seguridad
2. Ingresa contraseña actual correcta
3. Nueva contraseña: "NewPass123!"
4. Confirmar: "NewPass456!"
5. Guarda

**Resultado esperado:** Error "Las contraseñas no coinciden".

**Estado:** NOT TESTED

---

### TEST-FORM-009 — Crear factura: monto negativo

**Categoría:** Formularios · **Prioridad:** MEDIUM · **Módulo:** Billing

**Pasos:**
1. Abre formulario de nueva factura
2. Ingresa monto "-5000"
3. Intenta guardar

**Resultado esperado:** Error de validación: el monto debe ser positivo.

**Estado:** NOT TESTED

---

### TEST-FORM-010 — Reporte: rango de fechas inválido

**Categoría:** Formularios · **Prioridad:** LOW · **Módulo:** Reports

**Pasos:**
1. Ve a Reportes
2. Selecciona fecha desde "2026-12-01" y fecha hasta "2026-01-01"
3. Intenta generar

**Resultado esperado:** Error indicando que la fecha desde debe ser anterior a la fecha hasta.

**Estado:** NOT TESTED

---

## 9. Pruebas de Navegación

### TEST-NAV-001 — Menú lateral por rol (admin)

**Categoría:** Navegación · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión como admin
2. Revisa el menú lateral

**Resultado esperado:** Opciones visibles: Dashboard, Clínica, Gestión, Feriados, Laboratorio (con submenú), Plan SaaS, Ajustes. NO aparecen: Panel SaaS, Clínicas (tenants), Usuarios globales, Cobros.

**Estado:** NOT TESTED

---

### TEST-NAV-002 — Navegación entre módulos

**Categoría:** Navegación · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión como admin
2. Haz clic en "Dashboard"
3. Haz clic en "Clínica"
4. Haz clic en "Gestión"
5. Haz clic en "Ajustes"
6. Haz clic en "Dashboard" nuevamente

**Resultado esperado:** Cada clic carga la página correspondiente. No hay errores ni pantallas en blanco.

**Estado:** NOT TESTED

---

### TEST-NAV-003 — Refresh de página (F5)

**Categoría:** Navegación · **Prioridad:** HIGH · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión como admin
2. Navega a Facturación
3. Presiona F5

**Resultado esperado:** La página de facturación se recarga correctamente. No se pierde el contexto.

**Estado:** NOT TESTED

---

### TEST-NAV-004 — Botón atrás del navegador

**Categoría:** Navegación · **Prioridad:** MEDIUM · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión → Dashboard
2. Navega a Clínica
3. Navega a Gestión
4. Presiona el botón "Atrás" del navegador

**Resultado esperado:** Regresa a Clínica. No se sale de la sesión.

**Estado:** NOT TESTED

---

### TEST-NAV-005 — URL directa a ruta protegida (sin sesión)

**Categoría:** Navegación · **Prioridad:** HIGH · **Módulo:** Navegación

**Pasos:**
1. Cierra sesión completamente
2. Navega directamente a `http://localhost:5173/dashboard`

**Resultado esperado:** Redirige a `/` (landing).

**Estado:** NOT TESTED

---

### TEST-NAV-006 — URL directa a ruta restringida por rol

**Categoría:** Navegación · **Prioridad:** HIGH · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión como patient
2. Navega directamente a `http://localhost:5173/tenants`

**Resultado esperado:** Redirige a `/dashboard` (patient no tiene acceso a tenants).

**Estado:** NOT TESTED

---

### TEST-NAV-007 — Ruta inexistente (404)

**Categoría:** Navegación · **Prioridad:** MEDIUM · **Módulo:** Navegación

**Pasos:**
1. Navega a `http://localhost:5173/ruta-que-no-existe-abc123`

**Resultado esperado:** Se muestra la página 404 con un mensaje amigable y opción de volver al inicio.

**Estado:** NOT TESTED

---

### TEST-NAV-008 — Landing page

**Categoría:** Navegación · **Prioridad:** HIGH · **Módulo:** Landing

**Pasos:**
1. Abre `http://localhost:5173`

**Resultado esperado:** Se muestra la landing page con información del producto, botón de login, y CTA para contratar. Los botones de navegación funcionan.

**Estado:** NOT TESTED

---

### TEST-NAV-009 — Navegación del paciente

**Categoría:** Navegación · **Prioridad:** HIGH · **Rol:** patient · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión como patient (user1@clinic.com)
2. Revisa el menú lateral

**Resultado esperado:** Opciones: Dashboard, Reservas, Fichas Clínicas, Recetas, Historial Médico, Resultados de Laboratorio, Ajustes. NO aparecen: Clínica, Gestión, Laboratorio (panel), Facturación, Analytics.

**Estado:** NOT TESTED

---

### TEST-NAV-010 — Navegación del superadmin

**Categoría:** Navegación · **Prioridad:** HIGH · **Rol:** superadmin · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión como superadmin
2. Revisa el menú lateral

**Resultado esperado:** Opciones: Panel SaaS, Clínicas, Solicitudes Onboarding, Usuarios, Especialidades, Feriados, Auditoría, Cobros, Plan SaaS, Ajustes. NO aparecen: Dashboard clínico, Clínica, Gestión, Laboratorio.

**Estado:** NOT TESTED

---

## 10. Pruebas de Flujos Completos

### TEST-FLOW-001 — Flujo completo: Reserva → Ficha clínica → Prescripción

**Categoría:** Flujo End-to-End · **Prioridad:** CRITICAL · **Módulos:** Booking → Clinical Records → Prescriptions

**Precondiciones:** Doctor y paciente existen en el tenant.

**Pasos:**
1. Inicia sesión como admin
2. Ve a Reservas → Crea una reserva para mañana a las 10:00 con el Dr. Juan Pérez y el paciente user1@clinic.com
3. Confirma que la reserva aparece con estado "pending"
4. Cierra sesión
5. Inicia sesión como doctor (juan@clinic.com)
6. Ve a Panel del Médico → Localiza la reserva
7. Marca la cita como "completed"
8. Crea una ficha clínica para esta cita: motivo "Control de presión arterial", diagnóstico "I10 - Hipertensión", tratamiento "Seguimiento mensual"
9. Agrega una prescripción: "Enalapril 10mg", "1 comprimido cada 12 horas", "30 días"
10. Cierra sesión
11. Inicia sesión como patient (user1@clinic.com)
12. Ve a Fichas Clínicas → Verifica que la ficha aparece
13. Ve a Recetas → Verifica que la prescripción aparece

**Resultado esperado:** El flujo completo funciona: reserva creada → completada → ficha clínica visible para el paciente → prescripción visible para el paciente.

**Estado:** NOT TESTED

---

### TEST-FLOW-002 — Flujo completo: Solicitud de laboratorio

**Categoría:** Flujo End-to-End · **Prioridad:** CRITICAL · **Módulos:** Laboratory

**Precondiciones:** Plan Pro activo, doctor, paciente y lab_technician existen.

**Pasos:**
1. Inicia sesión como doctor
2. Crea una solicitud de laboratorio para un paciente (test: "Hemograma completo", prioridad: "routine")
3. Cierra sesión
4. Inicia sesión como lab_technician (lab@clinic.com)
5. Ve a Panel de Laboratorio → Solicitudes
6. Localiza la solicitud → Cambia estado a "in_progress" (receive sample)
7. Ingresa resultados: hemoglobin=14.2, hematocrit=42, leukocytes=7500
8. Valida como técnico (validate-tech)
9. Cierra sesión
10. Inicia sesión como doctor
11. Ve la solicitud → Valida como doctor (validate-doctor)
12. Firma el resultado (sign)
13. Cierra sesión
14. Inicia sesión como patient
15. Ve a "Mis Resultados de Laboratorio"
16. Verifica que el resultado aparece con los valores correctos

**Resultado esperado:** Flujo completo de laboratorio: solicitud → procesamiento → validación técnica → validación médica → firma → resultado visible para el paciente.

**Estado:** NOT TESTED

---

### TEST-FLOW-003 — Flujo completo: Onboarding de nueva clínica

**Categoría:** Flujo End-to-End · **Prioridad:** HIGH · **Módulos:** SaaS, Onboarding

**Pasos:**
1. Abre `http://localhost:5173/contratar`
2. Completa el wizard de 4 pasos con datos de una nueva clínica
3. Envía la solicitud
4. Cierra sesión
5. Inicia sesión como superadmin
6. Ve a "Solicitudes Onboarding"
7. Localiza la solicitud
8. Aprueba la solicitud
9. Verifica que el tenant se creó
10. Verifica que el admin de la nueva clínica puede iniciar sesión

**Resultado esperado:** La nueva clínica queda operativa con su admin y plan activo.

**Estado:** NOT TESTED

---

### TEST-FLOW-004 — Flujo: Reserva de invitado (sin login)

**Categoría:** Flujo End-to-End · **Prioridad:** HIGH · **Módulos:** Guest Booking

**Pasos:**
1. Abre `http://localhost:5173/booking`
2. Wizard paso 1: Ingresa datos personales (nombre, email, teléfono, RUT)
3. Wizard paso 2: Selecciona doctor
4. Wizard paso 3: Selecciona fecha y horario disponible
5. Confirma la reserva

**Resultado esperado:** La reserva se crea con estado "pending". Se muestra confirmación con opción de cancelar. (Si hubiera email configurado, se enviaría confirmación por token).

**Estado:** NOT TESTED

---

### TEST-FLOW-005 — Flujo: Generación y descarga de reporte

**Categoría:** Flujo End-to-End · **Prioridad:** MEDIUM · **Módulos:** Reports

**Pasos:**
1. Inicia sesión como admin
2. Ve a Gestión → Reportes
3. Selecciona tipo "appointments"
4. Selecciona rango de fechas (último mes)
5. Haz clic en "Generar"
6. Espera a que cambie el estado a "completed"
7. Haz clic en "Descargar"

**Resultado esperado:** Se descarga un archivo PDF con el reporte de citas del período seleccionado.

**Estado:** NOT TESTED

---

### TEST-FLOW-006 — Flujo: Facturación completa

**Categoría:** Flujo End-to-End · **Prioridad:** HIGH · **Módulos:** Billing

**Pasos:**
1. Inicia sesión como admin
2. Ve a Gestión → Facturación
3. Crea una factura para una cita completada
4. Verifica que aparece con estado "pending"
5. Cambia estado a "paid"
6. Verifica que las estadísticas de facturación se actualizan
7. Refresca la página y verifica persistencia

**Resultado esperado:** La factura se crea, se paga, y las métricas reflejan el cambio.

**Estado:** NOT TESTED

---

## 11. Pruebas de Búsqueda y Filtros

### TEST-SEARCH-001 — Búsqueda de usuarios (admin)

**Categoría:** Búsqueda · **Prioridad:** HIGH · **Rol:** admin · **Módulo:** Users

**Pasos:**
1. Inicia sesión como admin
2. Ve a Usuarios
3. Escribe "juan" en el campo de búsqueda
4. Observa los resultados

**Resultado esperado:** La lista se filtra mostrando usuarios cuyo nombre o email contiene "juan". La búsqueda funciona con debounce (no se envía petición por cada tecla).

**Estado:** NOT TESTED

---

### TEST-SEARCH-002 — Filtro de doctores por especialidad

**Categoría:** Búsqueda · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Doctors

**Pasos:**
1. Ve a Doctores
2. Filtra por especialidad "Cardiología"

**Resultado esperado:** Solo aparecen doctores de cardiología.

**Estado:** NOT TESTED

---

### TEST-SEARCH-003 — Búsqueda de pacientes sin resultados

**Categoría:** Búsqueda · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Patients

**Pasos:**
1. Ve a Pacientes
2. Busca "xyznonexistente123"

**Resultado esperado:** Se muestra "No se encontraron resultados" o empty state. No hay error.

**Estado:** NOT TESTED

---

### TEST-SEARCH-004 — Filtros de laboratorio

**Categoría:** Búsqueda · **Prioridad:** HIGH · **Rol:** lab_technician · **Módulo:** Laboratory

**Pasos:**
1. Inicia sesión como lab_technician
2. Ve a Laboratorio → Solicitudes
3. Filtra por estado "pending"
4. Limpia el filtro
5. Filtra por prioridad "urgent"

**Resultado esperado:** Los filtros se aplican correctamente. Al limpiar, se muestran todas las solicitudes.

**Estado:** NOT TESTED

---

### TEST-SEARCH-005 — Paginación

**Categoría:** Búsqueda · **Prioridad:** MEDIUM · **Módulo:** Varios

**Pasos:**
1. Ve a un módulo con muchos registros (ej: Usuarios, Auditoría)
2. Navega a la página 2
3. Cambia el tamaño de página (si está disponible)

**Resultado esperado:** La paginación funciona. Los registros se cargan correctamente en cada página.

**Estado:** NOT TESTED

---

### TEST-SEARCH-006 — Búsqueda en auditoría

**Categoría:** Búsqueda · **Prioridad:** MEDIUM · **Rol:** admin · **Módulo:** Audit

**Pasos:**
1. Ve a Auditoría
2. Filtra por acción "user.login"
3. Filtra por entidad "booking"

**Resultado esperado:** Los logs se filtran por acción y/o entidad correctamente.

**Estado:** NOT TESTED

---

## 12. Pruebas de Errores

### TEST-ERR-001 — Acceso a recurso inexistente (404 API)

**Categoría:** Errores · **Prioridad:** HIGH · **Módulo:** API

**Pasos:**
1. Inicia sesión como admin
2. Intenta acceder a `GET /api/doctors/99999` (ID inexistente)

**Resultado esperado:** Backend retorna `404 Not Found` con mensaje claro. No se muestra error técnico al usuario.

**Estado:** NOT TESTED

---

### TEST-ERR-002 — Sesión expirada durante operación

**Categoría:** Errores · **Prioridad:** HIGH · **Módulo:** Auth

**Pasos:**
1. Inicia sesión como admin
2. Abre DevTools → Application → Cookies
3. Elimina manualmente la cookie `access_token`
4. Intenta realizar una operación (ej: buscar usuarios)

**Resultado esperado:** El sistema intenta refrescar el token. Si falla, redirige a la landing page. No muestra error técnico.

**Estado:** NOT TESTED

---

### TEST-ERR-003 — Endpoint sin autorización (401)

**Categoría:** Errores · **Prioridad:** HIGH · **Módulo:** API

**Pasos:**
1. Sin sesión activa, intenta: `GET /api/doctors/` sin header de autorización

**Resultado esperado:** Backend retorna `401 Unauthorized` con mensaje "Token required".

**Estado:** NOT TESTED

---

### TEST-ERR-004 — Acción no autorizada (403)

**Categoría:** Errores · **Prioridad:** HIGH · **Módulo:** API

**Pasos:**
1. Inicia sesión como patient
2. Intenta: `POST /api/clinical-records/` (crear ficha clínica)

**Resultado esperado:** Backend retorna `403 Forbidden` con mensaje "Access denied".

**Estado:** NOT TESTED

---

### TEST-ERR-005 — Rate limit excedido

**Categoría:** Errores · **Prioridad:** MEDIUM · **Módulo:** API

**Pasos:**
1. Intenta hacer login con credenciales incorrectas repetidamente (>10 veces en 15 min)

**Resultado esperado:** Backend retorna `429 Too Many Requests` con mensaje "Demasiados intentos. Intenta de nuevo en 15 minutos."

**Estado:** NOT TESTED

---

### TEST-ERR-006 — CSRF token mismatch

**Categoría:** Errores · **Prioridad:** MEDIUM · **Módulo:** Security

**Pasos:**
1. Abre la app en el navegador (para obtener cookies)
2. Abre la consola del navegador
3. Intenta hacer un POST a `/api/doctors/` sin el header `X-CSRF-Token`

**Resultado esperado:** Backend retorna `403 CSRF token mismatch`.

**Estado:** NOT TESTED

---

## 13. Pruebas de Estados de Interfaz

### TEST-UI-001 — Loading state

**Categoría:** UI States · **Prioridad:** HIGH · **Módulo:** Todos

**Pasos:**
1. Inicia sesión como admin
2. Navega a Usuarios (o cualquier módulo con datos)
3. Observa el estado de carga inicial

**Resultado esperado:** Se muestra un spinner o skeleton mientras se cargan los datos. No se muestra contenido vacío o parpadeante.

**Estado:** NOT TESTED

---

### TEST-UI-002 — Empty state

**Categoría:** UI States · **Prioridad:** HIGH · **Módulo:** Varios

**Pasos:**
1. Inicia sesión como admin
2. Busca algo que no exista (ej: "xyznonexistente" en Usuarios)

**Resultado esperado:** Se muestra un componente de "empty state" con mensaje descriptivo e icono. No se muestra una tabla vacía sin contexto.

**Estado:** NOT TESTED

---

### TEST-UI-003 — Botón deshabilitado durante envío

**Categoría:** UI States · **Prioridad:** HIGH · **Módulo:** Formularios

**Pasos:**
1. Abre un formulario de creación (ej: nueva reserva)
2. Completa todos los campos
3. Haz clic en "Guardar"
4. Observa el botón inmediatamente después del clic

**Resultado esperado:** El botón se deshabilita y muestra un spinner durante el envío. No se puede hacer clic varias veces.

**Estado:** NOT TESTED

---

### TEST-UI-004 — Modal de confirmación antes de eliminar

**Categoría:** UI States · **Prioridad:** HIGH · **Módulo:** Varios

**Pasos:**
1. Intenta eliminar una entidad (ej: especialidad, reserva)
2. Observa lo que aparece antes de la eliminación

**Resultado esperado:** Aparece un diálogo de confirmación "¿Estás seguro de eliminar...?". La eliminación NO ocurre hasta que se confirma.

**Estado:** NOT TESTED

---

### TEST-UI-005 — Toast de éxito/error

**Categoría:** UI States · **Prioridad:** MEDIUM · **Módulo:** Varios

**Pasos:**
1. Realiza una operación exitosa (ej: crear reserva)
2. Observa la notificación
3. Realiza una operación con error (ej: campos obligatorios vacíos)

**Resultado esperado:** Se muestra toast verde de éxito o toast rojo de error. Se cierra automáticamente después de unos segundos.

**Estado:** NOT TESTED

---

## 14. Pruebas de Archivos

### TEST-FILE-001 — Subir archivo adjunto

**Categoría:** Archivos · **Prioridad:** HIGH · **Rol:** doctor · **Módulo:** Attachments

**Pasos:**
1. Inicia sesión como doctor
2. Abre una ficha clínica
3. Haz clic en "Subir adjunto" o sección de adjuntos
4. Selecciona un archivo PDF (dentro del límite de 10MB)
5. Sube el archivo

**Resultado esperado:** El archivo se sube y aparece en la lista de adjuntos de la ficha clínica.

**Estado:** NOT TESTED

---

### TEST-FILE-002 — Subir archivo excediendo tamaño máximo

**Categoría:** Archivos · **Prioridad:** MEDIUM · **Módulo:** Attachments

**Pasos:**
1. Intenta subir un archivo de más de 10MB

**Resultado esperado:** Error indicando que el archivo excede el tamaño máximo permitido.

**Estado:** NOT TESTED

---

### TEST-FILE-003 — Subir archivo con tipo no permitido

**Categoría:** Archivos · **Prioridad:** MEDIUM · **Módulo:** Attachments

**Pasos:**
1. Intenta subir un archivo `.exe` o `.bat`

**Resultado esperado:** Error indicando que el tipo de archivo no está permitido.

**Estado:** NOT TESTED

---

### TEST-FILE-004 — Descargar archivo

**Categoría:** Archivos · **Prioridad:** HIGH · **Módulo:** Attachments

**Pasos:**
1. Inicia sesión como doctor
2. Abre una ficha clínica con adjuntos
3. Haz clic en "Descargar" en un adjunto

**Resultado esperado:** El archivo se descarga con el nombre correcto y tipo MIME correcto.

**Estado:** NOT TESTED

---

### TEST-FILE-005 — Patient no puede descargar archivo de otro paciente

**Categoría:** Archivos · **Prioridad:** CRITICAL · **Rol:** patient · **Módulo:** Attachments

**Pasos:**
1. Inicia sesión como patient (user1@clinic.com)
2. Intenta descargar un adjunto de la ficha clínica de OTRO paciente vía URL directa: `GET /api/attachments/{id}` (donde {id} es un adjunto de otro paciente)

**Resultado esperado:** Backend retorna `403 Forbidden` (ownership check). El archivo no se descarga.

**Estado:** NOT TESTED

---

## 15. Pruebas de Integraciones

### TEST-INT-001 — Mercado Pago (Stub Mode)

**Categoría:** Integraciones · **Prioridad:** HIGH · **Módulo:** SaaS

**Pasos:**
1. Inicia sesión como admin
2. Ve a Plan SaaS
3. Selecciona un plan
4. Haz clic en "Suscribirse" o "Cambiar plan"
5. Observa el redireccionamiento

**Resultado esperado:** En modo stub (sin token real), el checkout redirige al frontend con URLs simuladas. No se procesa un pago real.

**Estado:** NOT TESTED

---

### TEST-INT-002 — Health check endpoint

**Categoría:** Integraciones · **Prioridad:** HIGH · **Módulo:** System

**Pasos:**
1. Abre `http://localhost:3000/health` (o `http://localhost:3000/api/health`)

**Resultado esperado:** Responde `200 OK` con JSON: `{ status: "ok", timestamp: "...", version: "1.0.0", checks: { database: { status: "ok" } } }`

**Estado:** NOT TESTED

---

### TEST-INT-003 — Rate limits (Auth)

**Categoría:** Integraciones · **Prioridad:** MEDIUM · **Módulo:** Auth

**Pasos:**
1. Sin sesión activa, envía más de 10 peticiones POST a `/api/auth/login` en menos de 15 minutos

**Resultado esperado:** A partir de la 11ª petición, retorna `429 Too Many Requests`.

**Estado:** NOT TESTED

---

### TEST-INT-004 — Exchange rates (tasas de cambio)

**Categoría:** Integraciones · **Prioridad:** LOW · **Módulo:** Currencies

**Pasos:**
1. Abre `http://localhost:3000/api/currencies/rates`

**Resultado esperado:** Retorna un JSON con las tasas de cambio de USD a CLP, ARS, BRL, MXN.

**Estado:** NOT TESTED

---

### TEST-INT-005 — Webhook HMAC signature

**Categoría:** Integraciones · **Prioridad:** MEDIUM · **Módulo:** Webhooks

**Pasos:**
1. Crea un webhook con URL válida y evento "booking.created"
2. Crea una reserva

**Resultado esperado:** El webhook se dispara. La petición incluye header `X-Webhook-Signature: sha256=...` y `X-Webhook-Event`.

**Estado:** NOT TESTED

---

## 16. Pruebas de Seguridad Funcional

### TEST-SEC-001 — Acceso sin autenticación a endpoints protegidos

**Categoría:** Seguridad · **Prioridad:** CRITICAL · **Módulo:** API

**Pasos:**
1. Sin sesión, intenta acceder a:
   - `GET /api/doctors/`
   - `GET /api/bookings/all`
   - `GET /api/clinical-records/`
   - `GET /api/billing/`
   - `GET /api/audit/`

**Resultado esperado:** Todos retornan `401 Unauthorized`. Ninguno retorna datos.

**Estado:** NOT TESTED

---

### TEST-SEC-002 — BOLA: Acceder a reserva de otro tenant

**Categoría:** Seguridad · **Prioridad:** CRITICAL · **Módulo:** Multi-tenancy

**Pasos:**
1. Inicia sesión como admin del tenant "default"
2. Intenta acceder a datos de otro tenant (si existiera): `GET /api/doctors/` forzando otro tenant_id en headers

**Resultado esperado:** RLS filtra los datos. Solo se muestran los datos del tenant del usuario. No se puede acceder a datos de otros tenants.

**Estado:** NOT TESTED

---

### TEST-SEC-003 — Manipulación de token JWT

**Categoría:** Seguridad · **Prioridad:** CRITICAL · **Módulo:** Auth

**Pasos:**
1. Inicia sesión y obtén el access_token
2. Decodifica el JWT (jwt.io)
3. Modifica el campo "role" a "superadmin"
4. Recodifica el JWT (con firma inválida)
5. Usa el token modificado en un request

**Resultado esperado:** Backend retorna `401 Invalid token` porque la firma no coincide.

**Estado:** NOT TESTED

---

### TEST-SEC-004 — SQL Injection básica

**Categoría:** Seguridad · **Prioridad:** CRITICAL · **Módulo:** API

**Pasos:**
1. En el campo de búsqueda de usuarios, ingresa: `'; DROP TABLE users; --`
2. Observa el resultado

**Resultado esperado:** La búsqueda retorna 0 resultados. No hay errores del servidor. La tabla no se elimina (las queries usan parámetros preparados).

**Estado:** NOT TESTED

---

### TEST-SEC-005 — XSS básico

**Categoría:** Seguridad · **Prioridad:** HIGH · **Módulo:** UI

**Pasos:**
1. En un campo de texto (ej: nombre de usuario), ingresa: `<script>alert('XSS')</script>`
2. Guarda
3. Observa si se ejecuta el script

**Resultado esperado:** El texto se muestra como texto plano, no se ejecuta el script. La sanitización funciona.

**Estado:** NOT TESTED

---

### TEST-SEC-006 — Rate limit en guest booking

**Categoría:** Seguridad · **Prioridad:** HIGH · **Módulo:** Guest

**Pasos:**
1. Sin sesión, envía más de 5 peticiones POST a `/api/guest/booking` en 1 hora

**Resultado esperado:** A partir de la 6ª petición, retorna `429 Too Many Requests`.

**Estado:** NOT TESTED

---

### TEST-SEC-007 — Patient no puede ver audit logs

**Categoría:** Seguridad · **Prioridad:** HIGH · **Rol:** patient · **Módulo:** Audit

**Pasos:**
1. Inicia sesión como patient
2. Intenta acceder a `http://localhost:5173/audit`
3. Intenta hacer GET a `/api/audit/`

**Resultado esperado:** Frontend: redirige a `/dashboard`. Backend: retorna `403 Forbidden`.

**Estado:** NOT TESTED

---

### TEST-SEC-008 — Cookie de sesión: httpOnly y secure

**Categoría:** Seguridad · **Prioridad:** HIGH · **Módulo:** Auth

**Pasos:**
1. Inicia sesión
2. Abre DevTools → Application → Cookies
3. Inspecciona las cookies `access_token` y `refresh_token`

**Resultado esperado:** Ambas cookies tienen flag `HttpOnly`. En producción, tienen flag `Secure`. `SameSite=Lax`.

**Estado:** NOT TESTED

---

## 17. Pruebas de Responsive

### TEST-RESP-001 — Desktop (1920×1080)

**Categoría:** Responsive · **Prioridad:** HIGH · **Módulo:** Todos

**Pasos:**
1. Abre la app en Desktop 1920×1080
2. Navega por los módulos principales
3. Verifica sidebar, tablas, formularios, gráficos

**Resultado esperado:** Todo se muestra correctamente. El sidebar es visible. Las tablas tienen scroll horizontal si es necesario. Los gráficos se ajustan al espacio.

**Estado:** NOT TESTED

---

### TEST-RESP-002 — Tablet (768×1024)

**Categoría:** Responsive · **Prioridad:** MEDIUM · **Módulo:** Todos

**Pasos:**
1. Cambia el tamaño del navegador a 768×1024 (o usa DevTools responsive mode)
2. Navega por la app

**Resultado esperado:** El sidebar se colapsa o se oculta. Los formularios se adaptan. Las tablas son scrollables. Los modales se ajustan.

**Estado:** NOT TESTED

---

### TEST-RESP-003 — Mobile (375×667)

**Categoría:** Responsive · **Prioridad:** MEDIUM · **Módulo:** Todos

**Pasos:**
1. Cambia a tamaño móvil (375×667)
2. Abre la landing page
3. Abre el login
4. Inicia sesión y navega

**Resultado esperado:** La landing se muestra correctamente. El login es usable. El dashboard carga. El sidebar es accesible (menú hamburguesa). Los formularios son utilizables.

**Estado:** NOT TESTED

---

### TEST-RESP-004 — Formulario largo en mobile

**Categoría:** Responsive · **Prioridad:** MEDIUM · **Módulo:** Formularios

**Pasos:**
1. En mobile, abre un formulario largo (ej: onboarding o crear reserva)
2. Haz scroll para completar todos los campos
3. Envía el formulario

**Resultado esperado:** Todos los campos son accesibles. El scroll funciona. El botón de envío es visible. No hay elementos superpuestos.

**Estado:** NOT TESTED

---

## 18. Pruebas de Compatibilidad

### TEST-COMPAT-001 — Chrome

**Categoría:** Compatibilidad · **Prioridad:** HIGH · **Navegador:** Chrome

**Pasos:**
1. Abre la app en Chrome (última versión)
2. Realiza un login completo
3. Navega por 3-4 módulos principales

**Resultado esperado:** Todo funciona correctamente. No hay errores en consola. CSS se renderiza bien.

**Estado:** NOT TESTED

---

### TEST-COMPAT-002 — Firefox

**Categoría:** Compatibilidad · **Prioridad:** MEDIUM · **Navegador:** Firefox

**Pasos:**
1. Abre la app en Firefox (última versión)
2. Login + navegación por módulos principales

**Resultado esperado:** Funciona correctamente. Las cookies httpOnly/SameSite funcionan.

**Estado:** NOT TESTED

---

### TEST-COMPAT-003 — Edge

**Categoría:** Compatibilidad · **Prioridad:** MEDIUM · **Navegador:** Edge

**Pasos:**
1. Abre la app en Edge
2. Login + navegación por módulos principales

**Resultado esperado:** Funciona correctamente.

**Estado:** NOT TESTED

---

## 19. Pruebas de Rendimiento Percibido

### TEST-PERF-001 — Tiempo de carga del dashboard

**Categoría:** Rendimiento · **Prioridad:** HIGH · **Módulo:** Dashboard

**Pasos:**
1. Inicia sesión como admin
2. Mide el tiempo desde que se completa el login hasta que el dashboard se muestra completamente

**Resultado esperado:** El dashboard se carga en menos de 3 segundos (conexión local). No hay parpadeos ni contenido que aparezca incrementalmente de forma molesta.

**Estado:** NOT TESTED

---

### TEST-PERF-002 — Tabla de usuarios con muchos registros

**Categoría:** Rendimiento · **Prioridad:** MEDIUM · **Módulo:** Users

**Pasos:**
1. Ve a Usuarios (con 30+ usuarios en el seed)
2. Observa el tiempo de carga
3. Aplica un filtro y observa la respuesta

**Resultado esperado:** La tabla carga en menos de 2 segundos. Los filtros responden en menos de 1 segundo.

**Estado:** NOT TESTED

---

### TEST-PERF-003 — Loading de lazy routes

**Categoría:** Rendimiento · **Prioridad:** MEDIUM · **Módulo:** Navegación

**Pasos:**
1. Inicia sesión como admin
2. Navega a un módulo que no se ha visitado aún (ej: Laboratorio)
3. Observa el tiempo de carga

**Resultado esperado:** La primera carga de un módulo lazy puede tardar un poco más. Las cargas subsecuentes son instantáneas (caché).

**Estado:** NOT TESTED

---

## 20. Pruebas de Concurrencia

### TEST-CONC-001 — Edición simultánea de disponibilidad

**Categoría:** Concurrencia · **Prioridad:** MEDIUM · **Módulo:** Availability

**Documentación:** Si dos usuarios (ej: admin y doctor) intentan modificar la disponibilidad del mismo doctor simultáneamente, el último en guardar sobrescribe los cambios. No existe bloqueo pesimista.

**Comportamiento esperado:** La operación más reciente gana. No hay corrupción de datos. Se muestra el estado más actualizado al refrescar.

**Estado:** NOT TESTED

---

### TEST-CONC-002 — Reserva del mismo slot por dos usuarios

**Categoría:** Concurrencia · **Prioridad:** HIGH · **Módulo:** Booking

**Documentación:** Si dos usuarios intentan reservar el mismo slot de tiempo (doctor X, fecha Y, hora Z) simultáneamente, solo una debería tener éxito.

**Comportamiento esperado:** La primera reserva se crea. La segunda falla con error de conflicto (duplicate key o mensaje claro). No se crean reservas duplicadas.

**Estado:** NOT TESTED

---

## 21. Pruebas de Datos

### TEST-DATA-001 — Persistencia de datos tras refresh

**Categoría:** Datos · **Prioridad:** HIGH · **Módulo:** Todos

**Pasos:**
1. Crea una entidad (reserva, factura, etc.)
2. Refresca la página
3. Verifica que la entidad sigue existiendo

**Resultado esperado:** Los datos persisten correctamente.

**Estado:** NOT TESTED

---

### TEST-DATA-002 — Relación reserva → ficha clínica

**Categoría:** Datos · **Prioridad:** HIGH · **Módulo:** Clinical Records

**Pasos:**
1. Completa una reserva (marca como completed)
2. Crea una ficha clínica asociada
3. Verifica que la ficha referencia la reserva correcta

**Resultado esperado:** La ficha clínica tiene el booking_id correcto. Al ver la reserva, se muestra vinculada a la ficha.

**Estado:** NOT TESTED

---

### TEST-DATA-003 — Eliminación en cascada

**Categoría:** Datos · **Prioridad:** HIGH · **Módulo:** Varios

**Pasos:**
1. Verifica que si se cancela una reserva que tiene ficha clínica, la ficha no se elimina
2. Verifica que si se elimina una ficha clínica, las prescripciones asociadas se manejan correctamente

**Resultado esperado:** Las eliminaciones en cascada se comportan según las foreign keys definidas. No quedan datos huérfanos visibles.

**Estado:** NOT TESTED

---

### TEST-DATA-004 — Datos de otro tenant no visibles

**Categoría:** Datos · **Prioridad:** CRITICAL · **Módulo:** Multi-tenancy

**Pasos:**
1. Inicia sesión como admin del tenant "default"
2. Busca pacientes, doctores, reservas

**Resultado esperado:** Solo se muestran datos del tenant "default". Los datos de clinica-norte o clinica-sur no aparecen.

**Estado:** NOT TESTED

---

## 22. Smoke Test

> **Objetivo:** Responder rápidamente "¿La aplicación está funcional para comenzar una prueba completa?"
> **Tiempo estimado:** 15-20 minutos

### SMOKE-001 — Aplicación inicia correctamente

1. Ejecuta `npm run dev`
2. Verifica que el backend arranca sin errores en el puerto 3000
3. Abre http://localhost:5173
4. Verifica que la landing page se carga

### SMOKE-002 — Health check responde

1. Abre http://localhost:3000/health
2. Verifica respuesta 200 con status "ok" y database "ok"

### SMOKE-003 — Login como admin funciona

1. Abre la landing → Login modal
2. Ingresa admin@clinic.com / contraseña del .env
3. Verifica que redirige a /dashboard

### SMOKE-004 — Dashboard carga datos

1. Verifica que se muestran estadísticas (tarjetas KPI)
2. Verifica que el menú lateral muestra las opciones del admin

### SMOKE-005 — Navegación a módulos funciona

1. Navega a Clínica → Se carga la página
2. Navega a Gestión → Se carga la página
3. Navega a Ajustes → Se carga la página

### SMOKE-006 — Login como doctor funciona

1. Logout
2. Login con juan@clinic.com / Vitaria.juan.2026!
3. Verifica menú del doctor (Dashboard, Clínica, Gestión, Laboratorio, Ajustes)

### SMOKE-007 — Login como patient funciona

1. Logout
2. Login con user1@clinic.com / Vitaria.user1.2026!
3. Verifica menú del paciente (Dashboard, Reservas, Fichas, Recetas, Historial, Lab, Ajustes)

### SMOKE-008 — Crear reserva funciona

1. Login como admin
2. Ve a Reservas → Nueva reserva
3. Selecciona doctor, paciente, fecha (mañana), hora
4. Guarda
5. Verifica que aparece en la lista

### SMOKE-009 — Ver listado de doctores

1. Login como admin
2. Ve a Doctores (o Clínica → Doctores)
3. Verifica que se listan los doctores del seed

### SMOKE-010 — Ver listado de pacientes

1. Login como admin
2. Ve a Pacientes
3. Verifica que se listan los pacientes del seed

### SMOKE-011 — Crear ficha clínica funciona

1. Login como doctor
2. Selecciona una cita completada o crea una nueva ficha
3. Completa datos mínimos (motivo, diagnóstico)
4. Guarda
5. Verifica que aparece en la lista de fichas clínicas

### SMOKE-012 — Ver prescripciones

1. Login como patient
2. Ve a Recetas
3. Verifica que se muestran las recetas (si existen en el seed)

### SMOKE-013 — Ver resultados de laboratorio

1. Login como patient
2. Ve a "Resultados de Laboratorio"
3. Verifica que se muestran resultados (si existen en el seed)

### SMOKE-014 — Login como lab_technician funciona

1. Logout
2. Login con lab@clinic.com / Vitaria.lab.2026!
3. Verifica menú (Dashboard, Laboratorio con submenú, Analíticas, Reportes, Ajustes)

### SMOKE-015 — Panel de laboratorio carga

1. Login como lab_technician
2. Ve a Laboratorio
3. Verifica que se muestra el dashboard de lab con métricas y/o solicitudes

### SMOKE-016 — Login como superadmin funciona

1. Logout
2. Login con superadmin@clinic.com / contraseña del .env
3. Verifica menú (Panel SaaS, Clínicas, Usuarios, etc.)

### SMOKE-017 — Gestionar tenants funciona

1. Login como superadmin
2. Ve a Clínicas
3. Verifica que se listan los tenants existentes

### SMOKE-018 — Ver analytics

1. Login como admin
2. Ve a Gestión → Analíticas
3. Verifica que se muestran gráficos y KPIs

### SMOKE-019 — Logout funciona

1. Login como admin
2. Haz clic en "Cerrar sesión"
3. Verifica que redirige a la landing
4. Intenta navegar a /dashboard → redirige a /

### SMOKE-020 — 404 funciona

1. Navega a http://localhost:5173/ruta-inexistente
2. Verifica que se muestra la página 404

---

## 23. Suite de Regresión

> **Objetivo:** Detectar rápidamente si una modificación rompió funcionalidades existentes.
> **Tiempo estimado:** 30-45 minutos
> **Ejecutar después de cada cambio importante.**

| # | Prueba | Rol | Módulo | Tiempo aprox. |
|---|--------|-----|--------|---------------|
| R01 | Login admin → verificar menú | admin | Auth | 1 min |
| R02 | Login doctor → verificar menú | doctor | Auth | 1 min |
| R03 | Login patient → verificar menú | patient | Auth | 1 min |
| R04 | Login lab_tech → verificar menú | lab_tech | Auth | 1 min |
| R05 | Login superadmin → verificar menú | superadmin | Auth | 1 min |
| R06 | Logout → verificar redirección | — | Auth | 1 min |
| R07 | Crear reserva (admin) | admin | Booking | 2 min |
| R08 | Cancelar reserva | admin | Booking | 1 min |
| R09 | Ver slots disponibles (público) | — | Booking | 1 min |
| R10 | Crear ficha clínica (doctor) | doctor | Clinical | 3 min |
| R11 | Ver ficha clínica (patient) | patient | Clinical | 1 min |
| R12 | Crear prescripción | doctor | Clinical | 2 min |
| R13 | Ver prescripciones (patient) | patient | Clinical | 1 min |
| R14 | Ver historial médico | patient | Medical History | 1 min |
| R15 | Crear solicitud de lab | doctor | Laboratory | 2 min |
| R16 | Ver solicitudes (lab_tech) | lab_tech | Laboratory | 1 min |
| R17 | Crear factura | admin | Billing | 2 min |
| R18 | Ver analytics | admin | Analytics | 1 min |
| R19 | Buscar en usuarios | admin | Users | 1 min |
| R20 | Ver auditoría | admin | Audit | 1 min |
| R21 | Crear especialidad | admin | Specialties | 1 min |
| R22 | Crear feriado | admin | Holidays | 1 min |
| R23 | Ver notificaciones | admin | Notifications | 1 min |
| R24 | Cambiar tema claro/oscuro | admin | Settings | 1 min |
| R25 | Verificar 404 | — | Navigation | 1 min |
| R26 | Acceso directo a /dashboard sin sesión | — | Auth | 1 min |
| R27 | Health check endpoint | — | System | 1 min |
| R28 | Verificar tenant isolation (admin) | admin | Multi-tenancy | 2 min |
| R29 | Autorización: patient no accede a /analytics | patient | AuthZ | 1 min |
| R30 | Autorización: doctor no accede a /users | doctor | AuthZ | 1 min |

---

## 24. Matriz General de Pruebas

| ID | Categoría | Módulo | Rol | Prioridad | Prueba | Estado |
|----|-----------|--------|-----|-----------|--------|--------|
| TEST-AUTH-001 | Auth | Auth | admin | CRITICAL | Login exitoso admin | NOT TESTED |
| TEST-AUTH-002 | Auth | Auth | doctor | CRITICAL | Login exitoso doctor | NOT TESTED |
| TEST-AUTH-003 | Auth | Auth | patient | HIGH | Login exitoso patient | NOT TESTED |
| TEST-AUTH-004 | Auth | Auth | lab_tech | HIGH | Login exitoso lab_tech | NOT TESTED |
| TEST-AUTH-005 | Auth | Auth | superadmin | CRITICAL | Login exitoso superadmin | NOT TESTED |
| TEST-AUTH-006 | Auth | Auth | — | CRITICAL | Login contraseña incorrecta | NOT TESTED |
| TEST-AUTH-007 | Auth | Auth | — | HIGH | Login email inexistente | NOT TESTED |
| TEST-AUTH-008 | Auth | Auth | — | MEDIUM | Login campos vacíos | NOT TESTED |
| TEST-AUTH-009 | Auth | Auth | — | MEDIUM | Login email formato inválido | NOT TESTED |
| TEST-AUTH-010 | Auth | Auth | — | CRITICAL | Account lockout ×5 | NOT TESTED |
| TEST-AUTH-011 | Auth | Auth | admin | HIGH | Logout | NOT TESTED |
| TEST-AUTH-012 | Auth | Auth | admin | HIGH | Persistencia sesión (refresh) | NOT TESTED |
| TEST-AUTH-013 | Auth | Auth | — | HIGH | Forgot password | NOT TESTED |
| TEST-AUTH-014 | Auth | Auth | admin | HIGH | Cambio de contraseña | NOT TESTED |
| TEST-AUTH-015 | Auth | Auth | admin | MEDIUM | Habilitar 2FA | NOT TESTED |
| TEST-AUTH-016 | Auth | Auth | admin | HIGH | Login con 2FA | NOT TESTED |
| TEST-AUTH-017 | Auth | Auth | admin | MEDIUM | Deshabilitar 2FA | NOT TESTED |
| TEST-AUTH-018 | Auth | Auth | admin | MEDIUM | Sesiones activas | NOT TESTED |
| TEST-AUTH-019 | Auth | Auth | — | HIGH | Acceso directo sin sesión | NOT TESTED |
| TEST-AUTH-020 | Auth | Auth | admin | MEDIUM | Token expirado (refresh auto) | NOT TESTED |
| TEST-AUTHZ-001 | AuthZ | Clinical Records | admin | CRITICAL | Admin no crea fichas | NOT TESTED |
| TEST-AUTHZ-002 | AuthZ | Analytics | patient | HIGH | Patient no ve analytics | NOT TESTED |
| TEST-AUTHZ-003 | AuthZ | Users | doctor | HIGH | Doctor no gestiona usuarios | NOT TESTED |
| TEST-AUTHZ-004 | AuthZ | Laboratory | lab_tech | HIGH | Lab tech no crea solicitud | NOT TESTED |
| TEST-AUTHZ-005 | AuthZ | Clinical Records | superadmin | HIGH | Superadmin no crea fichas | NOT TESTED |
| TEST-AUTHZ-006 | AuthZ | Super Admin | superadmin | CRITICAL | Superadmin gestiona tenants | NOT TESTED |
| TEST-AUTHZ-007 | AuthZ | Super Admin | admin | HIGH | Admin no accede /tenants | NOT TESTED |
| TEST-AUTHZ-008 | AuthZ | Booking | patient | CRITICAL | Patient no cancela otra reserva | NOT TESTED |
| TEST-AUTHZ-009 | AuthZ | Clinical Records | doctor | HIGH | Doctor no ve ficha sin relación | NOT TESTED |
| TEST-AUTHZ-010 | AuthZ | Multi-tenancy | superadmin | CRITICAL | Superadmin cross-clinic | NOT TESTED |
| TEST-CRUD-001 | CRUD | Doctors | admin | CRITICAL | Crear médico | NOT TESTED |
| TEST-CRUD-002 | CRUD | Doctors | admin | HIGH | Editar médico | NOT TESTED |
| TEST-CRUD-003 | CRUD | Doctors | admin | HIGH | Desactivar médico | NOT TESTED |
| TEST-CRUD-004 | CRUD | Booking | admin | CRITICAL | Crear reserva | NOT TESTED |
| TEST-CRUD-005 | CRUD | Booking | admin | HIGH | Cancelar reserva | NOT TESTED |
| TEST-CRUD-006 | CRUD | Booking | admin | HIGH | Reagendar reserva | NOT TESTED |
| TEST-CRUD-007 | CRUD | Clinical Records | doctor | CRITICAL | Crear ficha clínica | NOT TESTED |
| TEST-CRUD-008 | CRUD | Clinical Records | doctor | HIGH | Crear prescripción | NOT TESTED |
| TEST-CRUD-009 | CRUD | Laboratory | doctor | HIGH | Crear solicitud lab | NOT TESTED |
| TEST-CRUD-010 | CRUD | Billing | admin | HIGH | Crear factura | NOT TESTED |
| TEST-CRUD-011 | CRUD | Billing | admin | HIGH | Marcar factura pagada | NOT TESTED |
| TEST-CRUD-012 | CRUD | Specialties | admin | MEDIUM | Crear especialidad | NOT TESTED |
| TEST-CRUD-013 | CRUD | Holidays | admin | MEDIUM | Crear feriado | NOT TESTED |
| TEST-CRUD-014 | CRUD | Specialties | admin | MEDIUM | Eliminar especialidad | NOT TESTED |
| TEST-CRUD-015 | CRUD | Medical History | doctor | HIGH | Crear historial médico | NOT TESTED |
| TEST-CRUD-016 | CRUD | Todos | admin | HIGH | Persistencia post-refresh | NOT TESTED |
| TEST-FORM-001 | Formularios | Auth | — | HIGH | Login campos vacíos | NOT TESTED |
| TEST-FORM-002 | Formularios | Auth | — | MEDIUM | Login email con espacios | NOT TESTED |
| TEST-FORM-003 | Formularios | Auth | — | MEDIUM | Login doble click | NOT TESTED |
| TEST-FORM-004 | Formularios | Booking | admin | HIGH | Reserva campos obligatorios | NOT TESTED |
| TEST-FORM-005 | Formularios | Booking | admin | HIGH | Reserva fecha pasada | NOT TESTED |
| TEST-FORM-006 | Formularios | Clinical Records | doctor | MEDIUM | Ficha signos vitales inválidos | NOT TESTED |
| TEST-FORM-007 | Formularios | Onboarding | — | HIGH | Onboarding 4 pasos | NOT TESTED |
| TEST-FORM-008 | Formularios | Auth | admin | MEDIUM | Cambio contraseña no coinciden | NOT TESTED |
| TEST-FORM-009 | Formularios | Billing | admin | MEDIUM | Factura monto negativo | NOT TESTED |
| TEST-FORM-010 | Formularios | Reports | admin | LOW | Reporte fechas inválidas | NOT TESTED |
| TEST-NAV-001 | Navegación | Nav | admin | HIGH | Menú lateral admin | NOT TESTED |
| TEST-NAV-002 | Navegación | Nav | admin | HIGH | Navegación entre módulos | NOT TESTED |
| TEST-NAV-003 | Navegación | Nav | admin | HIGH | Refresh F5 | NOT TESTED |
| TEST-NAV-004 | Navegación | Nav | admin | MEDIUM | Botón atrás | NOT TESTED |
| TEST-NAV-005 | Navegación | Nav | — | HIGH | URL directa sin sesión | NOT TESTED |
| TEST-NAV-006 | Navegación | Nav | patient | HIGH | URL restringida por rol | NOT TESTED |
| TEST-NAV-007 | Navegación | Nav | — | MEDIUM | Ruta inexistente 404 | NOT TESTED |
| TEST-NAV-008 | Navegación | Landing | — | HIGH | Landing page | NOT TESTED |
| TEST-NAV-009 | Navegación | Nav | patient | HIGH | Menú paciente | NOT TESTED |
| TEST-NAV-010 | Navegación | Nav | superadmin | HIGH | Menú superadmin | NOT TESTED |
| TEST-FLOW-001 | Flujo E2E | Booking→Clinical→Rx | admin/doctor/patient | CRITICAL | Flujo completo reserva→ficha→receta | NOT TESTED |
| TEST-FLOW-002 | Flujo E2E | Laboratory | doctor/lab_tech/patient | CRITICAL | Flujo completo laboratorio | NOT TESTED |
| TEST-FLOW-003 | Flujo E2E | SaaS Onboarding | —/superadmin | HIGH | Onboarding nueva clínica | NOT TESTED |
| TEST-FLOW-004 | Flujo E2E | Guest Booking | guest | HIGH | Reserva invitado | NOT TESTED |
| TEST-FLOW-005 | Flujo E2E | Reports | admin | MEDIUM | Generar y descargar reporte | NOT TESTED |
| TEST-FLOW-006 | Flujo E2E | Billing | admin | HIGH | Facturación completa | NOT TESTED |
| TEST-SEARCH-001 | Búsqueda | Users | admin | HIGH | Búsqueda de usuarios | NOT TESTED |
| TEST-SEARCH-002 | Búsqueda | Doctors | admin | MEDIUM | Filtro por especialidad | NOT TESTED |
| TEST-SEARCH-003 | Búsqueda | Patients | admin | MEDIUM | Búsqueda sin resultados | NOT TESTED |
| TEST-SEARCH-004 | Búsqueda | Laboratory | lab_tech | HIGH | Filtros laboratorio | NOT TESTED |
| TEST-SEARCH-005 | Búsqueda | Varios | — | MEDIUM | Paginación | NOT TESTED |
| TEST-SEARCH-006 | Búsqueda | Audit | admin | MEDIUM | Búsqueda auditoría | NOT TESTED |
| TEST-ERR-001 | Errores | API | — | HIGH | Recurso inexistente 404 | NOT TESTED |
| TEST-ERR-002 | Errores | Auth | admin | HIGH | Sesión expirada | NOT TESTED |
| TEST-ERR-003 | Errores | API | — | HIGH | Sin autorización 401 | NOT TESTED |
| TEST-ERR-004 | Errores | API | patient | HIGH | No autorizado 403 | NOT TESTED |
| TEST-ERR-005 | Errores | API | — | MEDIUM | Rate limit 429 | NOT TESTED |
| TEST-ERR-006 | Errores | Security | — | MEDIUM | CSRF mismatch 403 | NOT TESTED |
| TEST-UI-001 | UI States | Todos | — | HIGH | Loading state | NOT TESTED |
| TEST-UI-002 | UI States | Varios | — | HIGH | Empty state | NOT TESTED |
| TEST-UI-003 | UI States | Formularios | — | HIGH | Botón deshabilitado durante envío | NOT TESTED |
| TEST-UI-004 | UI States | Varios | — | HIGH | Modal de confirmación | NOT TESTED |
| TEST-UI-005 | UI States | Varios | — | MEDIUM | Toast de éxito/error | NOT TESTED |
| TEST-FILE-001 | Archivos | Attachments | doctor | HIGH | Subir archivo | NOT TESTED |
| TEST-FILE-002 | Archivos | Attachments | doctor | MEDIUM | Archivo excede tamaño | NOT TESTED |
| TEST-FILE-003 | Archivos | Attachments | doctor | MEDIUM | Tipo no permitido | NOT TESTED |
| TEST-FILE-004 | Archivos | Attachments | doctor | HIGH | Descargar archivo | NOT TESTED |
| TEST-FILE-005 | Archivos | Attachments | patient | CRITICAL | Patient no descarga de otro | NOT TESTED |
| TEST-INT-001 | Integraciones | SaaS | admin | HIGH | Mercado Pago stub | NOT TESTED |
| TEST-INT-002 | Integraciones | System | — | HIGH | Health check | NOT TESTED |
| TEST-INT-003 | Integraciones | Auth | — | MEDIUM | Rate limit auth | NOT TESTED |
| TEST-INT-004 | Integraciones | Currencies | — | LOW | Exchange rates | NOT TESTED |
| TEST-INT-005 | Integraciones | Webhooks | admin | MEDIUM | Webhook HMAC | NOT TESTED |
| TEST-SEC-001 | Security | API | — | CRITICAL | Acceso sin auth a endpoints | NOT TESTED |
| TEST-SEC-002 | Security | Multi-tenancy | admin | CRITICAL | BOLA cross-tenant | NOT TESTED |
| TEST-SEC-003 | Security | Auth | — | CRITICAL | Token JWT manipulado | NOT TESTED |
| TEST-SEC-004 | Security | API | — | CRITICAL | SQL injection | NOT TESTED |
| TEST-SEC-005 | Security | UI | — | HIGH | XSS básico | NOT TESTED |
| TEST-SEC-006 | Security | Guest | — | HIGH | Rate limit guest booking | NOT TESTED |
| TEST-SEC-007 | Security | Audit | patient | HIGH | Patient no ve audit | NOT TESTED |
| TEST-SEC-008 | Security | Auth | — | HIGH | Cookies httpOnly/secure | NOT TESTED |
| TEST-RESP-001 | Responsive | Todos | — | HIGH | Desktop 1920×1080 | NOT TESTED |
| TEST-RESP-002 | Responsive | Todos | — | MEDIUM | Tablet 768×1024 | NOT TESTED |
| TEST-RESP-003 | Responsive | Todos | — | MEDIUM | Mobile 375×667 | NOT TESTED |
| TEST-RESP-004 | Responsive | Formularios | — | MEDIUM | Formulario largo mobile | NOT TESTED |
| TEST-COMPAT-001 | Compatibilidad | Todos | — | HIGH | Chrome | NOT TESTED |
| TEST-COMPAT-002 | Compatibilidad | Todos | — | MEDIUM | Firefox | NOT TESTED |
| TEST-COMPAT-003 | Compatibilidad | Todos | — | MEDIUM | Edge | NOT TESTED |
| TEST-PERF-001 | Rendimiento | Dashboard | — | HIGH | Tiempo carga dashboard | NOT TESTED |
| TEST-PERF-002 | Rendimiento | Users | — | MEDIUM | Tabla muchos registros | NOT TESTED |
| TEST-PERF-003 | Rendimiento | Navegación | — | MEDIUM | Lazy routes | NOT TESTED |
| TEST-CONC-001 | Concurrencia | Availability | — | MEDIUM | Edición simultánea | NOT TESTED |
| TEST-CONC-002 | Concurrencia | Booking | — | HIGH | Slot doble reserva | NOT TESTED |
| TEST-DATA-001 | Datos | Todos | — | HIGH | Persistencia post-refresh | NOT TESTED |
| TEST-DATA-002 | Datos | Clinical Records | — | HIGH | Relación reserva→ficha | NOT TESTED |
| TEST-DATA-003 | Datos | Varios | — | HIGH | Eliminación en cascada | NOT TESTED |
| TEST-DATA-004 | Datos | Multi-tenancy | admin | CRITICAL | Tenant isolation | NOT TESTED |

---

## 25. Priorización

### CRITICAL (Ejecutar primero — 18 pruebas)

Si alguna falla, la aplicación NO está lista.

| ID | Prueba |
|----|--------|
| TEST-AUTH-001 | Login admin exitoso |
| TEST-AUTH-002 | Login doctor exitoso |
| TEST-AUTH-005 | Login superadmin exitoso |
| TEST-AUTH-006 | Login contraseña incorrecta |
| TEST-AUTH-010 | Account lockout ×5 |
| TEST-AUTHZ-001 | Admin no crea fichas clínicas |
| TEST-AUTHZ-006 | Superadmin gestiona tenants |
| TEST-AUTHZ-008 | Patient no cancela otra reserva |
| TEST-AUTHZ-010 | Superadmin cross-clinic access |
| TEST-CRUD-001 | Crear médico |
| TEST-CRUD-004 | Crear reserva |
| TEST-CRUD-007 | Crear ficha clínica |
| TEST-FLOW-001 | Flujo completo reserva→ficha→receta |
| TEST-FLOW-002 | Flujo completo laboratorio |
| TEST-FILE-005 | Patient no descarga de otro |
| TEST-SEC-001 | Acceso sin auth a endpoints |
| TEST-SEC-002 | BOLA cross-tenant |
| TEST-SEC-003 | Token JWT manipulado |
| TEST-SEC-004 | SQL injection |
| TEST-DATA-004 | Tenant isolation datos |

### HIGH (Ejecutar después — 40+ pruebas)

Funcionalidades importantes que no funcionan correctamente.

### MEDIUM (Ejecutar si hay tiempo)

Problemas relevantes pero con alternativas.

### LOW (Última prioridad)

Problemas menores o cosméticos.

---

## 26. Funcionalidades No Testeables

| Funcionalidad | Motivo | Qué falta | Cómo probar después |
|---------------|--------|-----------|---------------------|
| Email de reset password | Requiere SMTP/SendGrid configurado | Credenciales de email real | Configurar EMAIL_USER/EMAIL_PASS en .env y verificar bandeja |
| Email de recordatorios de cita | Requiere SMTP | Mismo que arriba | Verificar bandeja del paciente después de crear cita |
| Email de invitación de doctor | Requiere SMTP | Mismo que arriba | Verificar que el doctor recibe el email de invitación |
| Mercado Pago pago real | Requiere token APP_USR- real | Credenciales Mercado Pago producción/sandbox | Usar sandbox MP para checkout de prueba |
| reCAPTCHA | Deshabilitado en dev | RECAPTCHA_SECRET_KEY configurada | Activar en .env y probar en producción |
| SMS (Twilio) | No implementado | sms.service.ts no existe | Implementar integración Twilio primero |
| Sentry error monitoring | Opcional | SENTRY_DSN configurado | Configurar DSN de Sentry y provocar un error |
| Webhook delivery real | Requiere URL pública accesible | Servidor receptor de webhooks | Usar webhook.site para capturar payloads |
| Exportación PDF de reportes | Requiere datos suficientes | Datos de reportes generados | Generar reporte primero, luego verificar descarga |
| SSE en tiempo real (lab) | Requiere conexión persistente | Cliente SSE activo | Probar con múltiples pestañas abiertas |
| Superadmin pool (BYPASSRLS) | Requiere rol DB dedicado | DATABASE_URL_SUPERADMIN configurado | Configurar en .env y probar queries cross-tenant |

---

## 27. Hallazgos Detectados Durante el Análisis

| # | Tipo | Problema | Ubicación | Impacto | Prioridad |
|---|------|----------|-----------|---------|-----------|
| H01 | ARCHITECTURE | `PatientLayout` existe pero NO se usa en el router; `DashboardLayout` se usa para todas las rutas `/patient/*` | frontend/src/app/router/AppRouter.tsx | Dead code; posiblemente funcionalidad incompleta de layout móvil para pacientes | LOW |
| H02 | INCOMPLETE | `LoginPage.tsx` existe como componente standalone pero NO está registrado en el router; el login se hace via `LoginModal` en `LandingPage` | frontend/src/modules/auth/pages/LoginPage.tsx | Componente no utilizado; puede confundir | LOW |
| H03 | ARCHITECTURE | `seedAdmin()` está exportado pero NO se llama desde `app.ts`; los tenants de prueba (clinica-norte/clinica-sur) se saltan si no existen | src/seed/admin.seed.ts, src/app.ts | Los tenants de prueba requieren creación manual o via onboarding | MEDIUM |
| H04 | SECURITY | Superadmin NO puede crear fichas clínicas ni plantillas clínicas (no está en la lista de roles de `authorize`) | src/modules/clinical-record/clinical-record.routes.ts | Limitación de diseño: el superadmin no puede operar clínicamente (puede ser intencional) | LOW |
| H05 | INCOMPLETE | Módulo `clinical-templates` no tiene páginas frontend dedicadas; solo tiene services/types/hooks | frontend/src/modules/clinical-templates/ | Plantillas clínicas solo consumibles internamente, no accesibles desde UI directamente | MEDIUM |
| H06 | ARCHITECTURE | `@types` están en `dependencies` en vez de `devDependencies` en package.json raíz | package.json | Aumenta tamaño del bundle de producción innecesariamente | LOW |
| H07 | INCOMPLETE | No existe integración SMS real (Twilio); solo se menciona en .env.example | .env.example, src/shared/ | Funcionalidad de SMS no disponible | MEDIUM |
| H08 | PERFORMANCE | Seeds ejecutados en cada startup en desarrollo; backfills repetitivos | src/app.ts líneas 446-481 | Lentitud al reiniciar el servidor en dev | LOW |
| H09 | UX | `GET /api/laboratory/tests` y `GET /api/laboratory/areas` no requieren authorize (cualquier autenticado) | src/modules/laboratory/laboratory.routes.ts | Datos de catálogo visibles para todos los roles autenticados (probablemente intencional) | LOW |

---

## 28. Criterios para Considerar el Proyecto Funcional

### 🟢 FUNCIONAL

Todas las condiciones se cumplen:
- Todas las pruebas CRITICAL pasan
- Flujo principal completo funciona (reserva → ficha clínica → prescripción)
- Flujo de laboratorio completo funciona
- Login/logout funciona para todos los roles
- Autorización funciona (roles restringidos bloqueados en frontend Y backend)
- Multi-tenancy funciona (aislamiento de datos)
- No hay errores CRITICAL en consola del navegador
- Las integraciones mock/stub funcionan correctamente

### 🟡 FUNCIONAL CON OBSERVACIONES

Se cumple lo anterior MÁS:
- Algunas pruebas HIGH fallidas con workarounds disponibles
- Problemas MEDIUM identificados pero no bloqueantes
- Funcionalidades no testeables documentadas
- Cosméticos o UX menores pendientes

### 🔴 NO FUNCIONAL / NO LISTO

Cualquiera de estas condiciones:
- Cualquier prueba CRITICAL fallida
- Problema de autorización importante (un rol accede a funcionalidad restringida)
- Flujo principal roto (reserva → ficha clínica no funciona)
- Multi-tenancy roto (datos de otro tenant visibles)
- Login falla para algún rol
- Errores del servidor no manejados (500 sin respuesta clara)
- Múltiples pruebas HIGH fallidas sin workarounds

---

## 29. Checklist Final

- [ ] Aplicación inicia correctamente (backend + frontend)
- [ ] Health check responde 200
- [ ] Login funciona para admin
- [ ] Login funciona para doctor
- [ ] Login funciona para patient
- [ ] Login funciona para lab_technician
- [ ] Login funciona para superadmin
- [ ] Logout funciona (invalida sesión)
- [ ] Roles funcionan (cada uno ve su menú)
- [ ] Permisos funcionan (acciones bloqueadas para roles no autorizados)
- [ ] Flujo principal funciona (reserva → ficha → receta)
- [ ] CRUD de doctores funciona
- [ ] CRUD de reservas funciona
- [ ] CRUD de fichas clínicas funciona
- [ ] CRUD de prescripciones funciona
- [ ] CRUD de laboratorio funciona
- [ ] CRUD de facturación funciona
- [ ] CRUD de especialidades funciona
- [ ] CRUD de feriados funciona
- [ ] Validaciones de formulario funcionan
- [ ] Manejo de errores funciona (401, 403, 404, 429)
- [ ] Navegación funciona (menús, links, botón atrás)
- [ ] Búsquedas funcionan
- [ ] Filtros funcionan
- [ ] Paginación funciona
- [ ] Archivos funcionan (upload/download con ownership check)
- [ ] Multi-tenancy funciona (aislamiento de datos)
- [ ] Seguridad funcional revisada (CSRF, rate limits, auth)
- [ ] Responsive revisado (desktop, tablet, mobile)
- [ ] Navegadores revisados (Chrome mínimo)
- [ ] Regresión ejecutada (suite de 30 pruebas)
- [ ] No existen errores CRITICAL
- [ ] No existen problemas HIGH sin resolver
- [ ] Funcionalidades no testeables documentadas
- [ ] Aplicación lista para siguiente etapa

---

## Datos de Prueba

### Usuarios Principales

| Rol | Email | Contraseña | Notas |
|-----|-------|-----------|-------|
| superadmin | superadmin@clinic.com | Ver .env (SUPERADMIN_PASSWORD) | Cross-clinic |
| admin | admin@clinic.com | Ver .env (ADMIN_PASSWORD) | Tenant default |
| doctor | juan@clinic.com | Vitaria.juan.2026! | Cardiología |
| doctor | maria@clinic.com | Vitaria.maria.2026! | Dermatología |
| doctor | pedro@clinic.com | Vitaria.pedro.2026! | Medicina General |
| lab_tech | lab@clinic.com | Vitaria.lab.2026! | Solo tenant default |
| patient | user1@clinic.com | Vitaria.user1.2026! | — |
| patient | user2@clinic.com | Vitaria.user2.2026! | — |

### Datos del Seed

- **12 doctores** con disponibilidad lun-vie
- **30+ pacientes** con RUT y teléfono
- **18+ reservas pasadas** (completed, cancelled, no_show)
- **7+ reservas futuras** (pending, confirmed)
- **Fichas clínicas** en ~65% de las reservas completadas
- **Prescripciones** en ~50% de las fichas
- **Solicitudes de lab** en ~40% de las fichas (con resultados)
- **Facturas** en ~50% de las reservas completadas
- **Historial médico** para 10+ pacientes
- **35+ logs de auditoría**
- **9 áreas de laboratorio** con tests, equipos, reactivos, QC records

---

> **Documento generado el:** 2026-09-11
> **Basado en:** Análisis completo del código fuente del repositorio
> **Autor:** QA Lead (análisis automatizado)
> **Próximos pasos:** Ejecutar Smoke Test primero, luego pruebas CRITICAL, completar la matriz

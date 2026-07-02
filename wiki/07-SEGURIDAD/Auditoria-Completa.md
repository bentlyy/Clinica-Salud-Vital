---
tags: [auditoria, seguridad, calidad, frontend, backend]
---

# Auditoría Técnica Completa — Clínica Salud Vital

> Score de Salud: **45/100** | Criticidad alta: 7 | Criticidad media: 55 | Criticidad baja: 12

---

## Resumen Ejecutivo

Se auditaron ~136 archivos fuente (86 backend + 50 frontend). Se encontraron **74 hallazgos**: 7 críticos, 55 medios, 12 bajos. Las áreas más débiles son: seguridad en autenticación (4 hallazgos críticos), performance del frontend (componentes anidados sin memo), y cobertura de tests (0%). El frontend abusa de estilos inline en todas las páginas y tiene strings hardcodeadas sin i18n.

---

## Frontend — Hallazgos

### 🔴 Críticos

| ID | Categoría | Descripción | Archivo:línea |
|----|-----------|-------------|---------------|
| F1 | Performance | `AppLayout` definido dentro de `AppRoutes` — causa remount completo en cada render | `routes/AppRoutes.tsx:37-46` |
| F2 | Performance | `NavLabLink` definido dentro de `Navbar` — mismo problema, remount en cada render | `components/Navbar.tsx:40-50` |
| F3 | Observabilidad | Logger silencia TODOS los errores en producción | `utils/logger.js:3-7` |
| F4 | TypeScript | `createContext(null)` sin tipo — contexto sin type safety | `context/AuthContext.tsx:4` |
| F5 | TypeScript | `checkJs: false` excluye ~40% del código de type checking | `tsconfig.json:9` |
| F6 | Estado | Context value nunca memoizado en Auth, Theme, Feature — todos los consumers re-renderizan | `context/AuthContext.tsx:77-80` |
| F7 | Seguridad | Hardcoded fallback URL expone infraestructura interna | `api/axios.js:4` |

### 🟡 Medios

| ID | Categoría | Descripción | Archivo:línea |
|----|-----------|-------------|---------------|
| F8 | i18n | ~200+ strings hardcodeadas sin traducción | `pages/DoctorClinicalRecordsPage.tsx`, `pages/LabTechnicianDashboardPage.tsx`, `pages/SuperAdminDashboardPage.tsx` |
| F9 | Estilos | Estilos inline masivos en TODAS las páginas | Todas `pages/*.tsx` |
| F10 | useEffect | 20+ archivos sin AbortController ni cleanup | `pages/MyBookingsPage.tsx`, `pages/DoctorPanel.tsx`, `pages/HomePage.tsx`, etc. |
| F11 | Errores | Catch silencioso sin feedback al usuario | `pages/DoctorClinicalRecordsPage.tsx:96-98`, `pages/SuperAdminTenantsPage.tsx:54-61` |
| F12 | Errores | `alert()` usado para errores en vez de componente React | `pages/LabTechnicianDashboardPage.tsx:49,58,70` |
| F13 | Loading | Múltiples páginas usan `<p>` tag en vez de `<LoadingState>` | 15+ páginas |
| F14 | useCallback | Funciones handler sin memoizar recreadas en cada render | `pages/HomePage.tsx:37`, `pages/LoginPage.tsx:23-28` |
| F15 | React.memo | Ningún componente usa React.memo | Todos los componentes |
| F16 | Navegación | `window.location.href` usado 3 veces en vez de `useNavigate` | `api/axios.js:54,62`, `components/Navbar.tsx:150` |
| F17 | Prop drilling | `t()` (i18n) drilldeado 4 niveles en RegisterDoctorPage | `pages/RegisterDoctorPage.tsx` |
| F18 | Duplicación | ToggleSwitch, UserRow, RoleCard duplicados | `pages/RegisterDoctorPage.tsx`, `pages/SuperAdminTenantDetailPage.tsx` |
| F19 | Código | `document.getElementById()` anti-patrón React | `pages/DoctorLabResultsPage.tsx:113-114` |
| F20 | i18n | Sin tipo para claves de traducción — errores silenciosos | `i18n/translations.js` |
| F21 | ESLint | Reglas `no-explicit-any` y `no-unused-vars` como warning, no error | `eslint.config.js:24-25` |
| F22 | Autenticación | `logout()` limpia localStorage antes de la llamada API | `context/AuthContext.tsx:11-19` |
| F23 | Estado | `loading` nunca se resetea en errores de login/register | `context/AuthContext.tsx:45-67` |
| F24 | Modal | Sin TypeScript, body overflow frágil | `components/CoreModal.jsx` |
| F25 | Combobox | Error de API silencioso, sin debounce | `components/Combobox.tsx:17` |
| F26 | ErrorBoundary | No captura info de component stack | `components/ErrorBoundary.tsx:17-18` |
| F27 | Missing CSRF | En 401 sin TOKEN_EXPIRED no refresca CSRF | `api/axios.js:59-63` |
| F28 | CSS | Sin `prefers-reduced-motion` | `index.css` |
| F29 | CSS | Sin `@media print` | `index.css` |
| F30 | Vite | `host: true` expone dev server a la red | `vite.config.js:7` |
| F31 | Vite | `@/*` alias configurado en tsconfig pero no en vite | `vite.config.js` |
| F32 | Testing | No existen tests (0 suites, 0 archivos) | `src/test/` |
| F33 | Testing | Sin `@testing-library/user-event` | `package.json` |
| F34 | Testing | Sin `msw` para mock de API | `package.json` |
| F35 | Testing | Sin configuración de coverage en vitest | `vitest.config.js` |
| F36 | Navbar | Menú hamburguesa sin `aria-expanded` | `components/Navbar.tsx:63-71` |
| F37 | Combobox | Sin `role="combobox"` ni `aria-activedescendant` | `components/Combobox.tsx:72-121` |

### 🟢 Bajos

| ID | Categoría | Descripción | Archivo:línea |
|----|-----------|-------------|---------------|
| F38 | Import | `import React` innecesario en React 19 | `main.tsx:1` |
| F39 | CSS | Sin breakpoints para pantallas <360px o >1440px | `index.css:242-246` |
| F40 | Traducciones | Archivo translations.js >800 líneas, difícil de mantener | `i18n/translations.js` |
| F41 | RUT | Sin validación de longitud antes de parseInt | `utils/rut.js:11-12` |
| F42 | ErrorBoundary | Error silencioso al recuperarse — posible loop infinito | `components/ErrorBoundary.tsx:39` |
| F43 | Modal | `setTimeout(..., 50)` magic number | `components/CoreModal.jsx:38` |

---

## Backend — Hallazgos

### 🔴 Críticos

| ID | Categoría | Descripción | Archivo:línea |
|----|-----------|-------------|---------------|
| B1 | SQL Injection | SET SESSION app.tenant_id con interpolación de string | `shared/db.ts:40` |
| B2 | Auth | `/api/auth/reset-admin` en PUBLIC_PATHS sin autenticación | `middlewares/tenant.middleware.ts:28` |
| B3 | Auth | Degradación silenciosa en token_version check — DB caída permite tokens revocados | `middlewares/auth.middleware.ts:80-82` |
| B4 | Auth | resetAdminPassword() backdoor usable vía env vars | `modules/auth/auth.service.ts:618-636` |
| B5 | JWT | Fallback genera nuevo secret en cada restart — invalida todos los tokens | `shared/jwt.service.ts:5` |
| B6 | SSL | rejectUnauthorized condicional — MITM si falta DB_CA_CERT | `shared/db.ts:19-24` |
| B7 | Concurrencia | Race condition en loadingLock multi-tenant | `shared/multi-tenant.service.ts:41-43` |

### 🟡 Medios

| ID | Categoría | Descripción | Archivo:línea |
|----|-----------|-------------|---------------|
| B8 | Info Disclosure | SQL errors loggeados en migraciones | `app.ts:265-268` |
| B9 | Info Disclosure | Reset token en query param — leak en logs/referrer | `modules/auth/auth.service.ts:545` |
| B10 | CORS | Sin Origin header permitido en producción | `app.ts:113-115` |
| B11 | PHI | Datos clínicos sin cifrar en reposo | `modules/clinical-record/clinical-record.service.ts` |
| B12 | CSP | `unsafe-inline` para estilos debilita CSP | `middlewares/security.middleware.ts:15` |
| B13 | Error type | validateEnvSecurity usa UnauthorizedError (401) para config | `middlewares/security.middleware.ts:57,61,64,69,73,86` |
| B14 | Email | Modo log silencioso en producción sin advertencia | `shared/email.service.ts:132-135` |
| B15 | Duplicación | _migrations table creada 2 veces | `app.ts:232-236,243-245` |
| B16 | Duplicación | DELETE FROM _migrations duplicado | `app.ts:235-236,248-249` |
| B17 | Complejidad | startServer con 15+ pasos en setImmediate | `app.ts:285-374` |
| B18 | Graceful | SIGTERM no espera pool.drain() | `app.ts:382-392` |
| B19 | Duplicación | generateAccessToken duplicado 3 veces | `modules/auth/auth.service.ts:63-68,267-273,339-345` |
| B20 | Duplicación | validatePassword duplicado | `modules/auth/auth.service.ts:564-569` |
| B21 | Duplicación | Paginación repetida en 5+ servicios | Varios servicios |
| B22 | O(n²) | filter + findIndex en getAll() | `shared/multi-tenant.service.ts:32-34` |
| B23 | Colisión | tenant.id = tenant.domain sobreescribe entrada en Map | `shared/multi-tenant.service.ts:19-21,52-53` |
| B24 | Booking | No verifica ownership user_id | `modules/booking/booking.service.ts:77` |
| B25 | Booking | Race condition hash collision en advisory lock | `modules/booking/booking.service.ts:96` |
| B26 | Booking | Date comparison con new Date() en vez de NOW() de DB | `modules/booking/booking.service.ts:84-87` |
| B27 | Clinical | getClinicalRecordById sin verificación de ownership | `modules/clinical-record/clinical-record.service.ts:107-122` |
| B28 | SaaS | Funciones retornan hardcoded defaults — sin lógica real | `modules/saas/saas.service.ts:19-68` |
| B29 | Auth | 2FA_REQUIRED code casteado como any | `modules/auth/auth.service.ts:257` |
| B30 | Auth | Dummy hash fijo permite enumeración | `modules/auth/auth.service.ts:219-220` |
| B31 | readPool | Configurado pero nunca usado | `shared/db.ts:52-61` |
| B32 | Performance | token_version query en cada request autenticado | `middlewares/auth.middleware.ts:75` |
| B33 | Performance | N+1 subqueries en super-admin | `modules/super-admin/super-admin.service.ts:50-56` |
| B34 | Tests | 0 tests para servicios (auth.service.ts 636 líneas sin test) | — |
| B35 | Tests | Global fetch mock nunca se restaura | `tests/setup.js:12` |
| B36 | Tests | Vitest thresholds en 50% — muy bajo | `vitest.config.js:15-19` |
| B37 | Calidad | `dynamic import('bcrypt')` dentro de función | `modules/super-admin/super-admin.service.ts:771` |
| B38 | Calidad | `pool.query.bind(pool)` exportado pero usado inconsistentemente | `shared/db.ts:49` |
| B39 | Calidad | Función addMinutes definida dentro de getAvailableSlots | `modules/booking/booking.service.ts:229-233` |
| B40 | Calidad | Lógica de lab request items duplicada | `modules/clinical-record/clinical-record.service.ts:198-226,300-327` |
| B41 | Calidad | JWKS retorna empty keys array — rompe verificación | `shared/jwt.service.ts:37` |
| B42 | Calidad | jwtManager.destroy() es no-op | `shared/jwt.service.ts:29-31` |

### 🟢 Bajos

| ID | Categoría | Descripción | Archivo:línea |
|----|-----------|-------------|---------------|
| B43 | Env | validateEmailConfig no await transporter.verify() | `shared/email.service.ts:83-89` |
| B44 | Config | global stripeWarning mutable | `app.ts:31-32` |
| B45 | ML | Tabla ml_demand_forecast referenciada en seed pero sin CREATE TABLE | `seed/seed.ts` |

---

## Score de Salud por Área

| Área | Score | Hallazgos C/M/B |
|------|-------|-----------------|
| Frontend — Calidad de Código | 35/100 | 2C, 12M, 3B |
| Frontend — TypeScript | 20/100 | 2C, 2M, 1B |
| Frontend — Performance | 25/100 | 2C, 3M, 0B |
| Frontend — Testing | 0/100 | 0C, 4M, 0B |
| Frontend — Accesibilidad | 40/100 | 0C, 4M, 1B |
| Frontend — i18n | 50/100 | 0C, 2M, 1B |
| Backend — Seguridad | 30/100 | 6C, 8M, 0B |
| Backend — Calidad de Código | 45/100 | 0C, 14M, 2B |
| Backend — Performance | 60/100 | 0C, 3M, 0B |
| Backend — Testing | 10/100 | 0C, 3M, 0B |
| **Total General** | **45/100** | **7C, 55M, 12B** |

---

## Top 10 Prioridades de Acción

| # | ID | Área | Acción | Impacto |
|---|----|------|--------|---------|
| 1 | B1 | Backend | Parametrizar SET SESSION app.tenant_id | Elimina SQL injection |
| 2 | B2 | Backend | Proteger reset-admin con autenticación | Cierra vector escalación |
| 3 | B3 | Backend | Fail closed en token_version check | Evita bypass de auth |
| 4 | F1 | Frontend | Sacar AppLayout de AppRoutes | Remoción completa de layout |
| 5 | F6 | Frontend | Memoizar valores de contexto | Reduce re-renders masivos |
| 6 | B6 | Backend | Forzar rejectUnauthorized en producción | Previene MITM en DB |
| 7 | F7 | Frontend | Eliminar fallback URL hardcodeada | Seguridad infraestructura |
| 8 | F32 | Testing | Crear suite de tests (Vitest + Testing Library) | Calidad y regresión |
| 9 | F9 | Frontend | Migrar estilos inline a clases CSS | Mantenibilidad y consistencia |
| 10 | F8 | Frontend | Externalizar strings hardcodeadas a i18n | Internacionalización completa |

---

## Relacionados

- [[00-INICIO/Resumen-Completo-Sistema|Resumen Completo del Sistema]]
- [[03-FRONTEND/Frontend|Frontend]]
- [[02-BACKEND/Backend|Backend]]

---

Tags: #auditoria #seguridad #calidad #frontend #backend #hallazgos

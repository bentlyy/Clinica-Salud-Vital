# Navegación por Rol (Barra Lateral)

> La barra lateral se genera dinámicamente según el rol del usuario autenticado. Definición central en `frontend/src/shared/constants/navigation.tsx` (array `NAV_ITEMS_DEF` + función `getNavItems(role, t)`), renderizada por `DashboardLayout` mediante `SidebarItem`.

## Mecanismo

1. `getNavItems(role, t)` filtra `NAV_ITEMS_DEF` con `item.roles.includes(effectiveRole)`.
2. `effectiveRole` mapea `'user' → 'patient'` (los usuarios sin rol explícito ven el panel paciente).
3. El item **Laboratorio** lleva `featureKey: 'laboratory'` y se bloquea con `<PremiumLocked />` si el plan SaaS del tenant no tiene la feature habilitada (`useFeature`).
4. Los items con `children` (Laboratorio) despliegan submenú colapsable.
5. Rutas protegidas por rol en `app/router/AppRouter.tsx` refuerzan el acceso a nivel de navegación.

## Secciones por Rol

| Rol | Ítems de navegación |
|-----|---------------------|
| **superadmin** | Panel SaaS (`/saas`) · Clínicas (`/tenants`) · Usuarios (`/users`) · Especialidades (`/specialties`) · Auditoría (`/audit`) · Cobros (`/cobros`) · Configuración (`/settings`) |
| **admin** | Dashboard (`/dashboard`) · Clínica (`/clinical`) · Gestión (`/management`) · Laboratorio (submenú) · Configuración |
| **doctor** | Dashboard · Clínica · Gestión · Laboratorio (submenú) · Configuración |
| **lab_technician** | Dashboard · Laboratorio (submenú) · Analytics (`/analytics`) · Reportes (`/reports`) · Configuración |
| **patient** | Dashboard · Mis Citas (`/bookings`) · Fichas Clínicas (`/clinical-records`) · Recetas (`/prescriptions`) · Historial Médico (`/medical-history`) · Mis Resultados de Laboratorio (`/my-laboratory`) · Configuración |
| **guest / user** | Sin barra lateral (solo landing pública y reserva por RUT). `user` se mapea a `patient`. |

## Submenú Laboratorio

| Subitem | Ruta | Roles |
|---------|------|-------|
| Panel | `/laboratory` | admin, doctor, lab_technician |
| Solicitudes | `/laboratory/requests` | admin, doctor, lab_technician |
| Catálogo | `/laboratory/catalog` | admin, doctor, lab_technician |
| Control de Calidad | `/laboratory/quality-control` | admin, doctor, lab_technician |
| Analytics | `/laboratory/analytics` | admin, doctor, lab_technician |
| Resultados (Doctor) | `/doctor/lab-results` | doctor (protegido por rol) |

## Hubs por Rol

- **`/clinical` (Clínica)**: pestañas de bookings, fichas clínicas, recetas e historial; para doctor agrega pacientes y disponibilidad.
- **`/management` (Gestión)**: pestañas de analytics, reportes, auditoría y billing; para doctor solo analytics y reportes.

## Topbar

- **Campana de notificaciones**: oculta para `patient`/`user`.
- **Selector de idioma** (es/en/pt/fr) y **toggle tema claro/oscuro** para todos los roles.
- **Menú de perfil**: acceso a Configuración y logout.

---

Tags: #frontend #navegacion #roles #sidebar

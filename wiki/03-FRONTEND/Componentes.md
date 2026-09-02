# Componentes

> Componentes compartidos y páginas del frontend (2026-09-01, sincronizado con `AppRouter.tsx`).

## Componentes Compartidos (18)

Ruta base: `shared/components/`

| Componente | Ruta | Propósito |
|------------|------|-----------|
| ErrorBoundary | `ErrorBoundary.tsx` | Captura de errores React (clase) |
| LanguageSwitcher | `LanguageSwitcher.tsx` | Selector de idioma (4 locales) |
| PremiumLocked | `PremiumLocked.tsx` | Overlay para features premium |
| WithFeature | `WithFeature.tsx` | Feature-flag wrapper |
| LabIcons | `lab-icons/LabIcons.tsx` | Iconos SVG del lab |
| AuthLayout | `layout/AuthLayout.tsx` | Layout de autenticación |
| DashboardLayout | `layout/DashboardLayout.tsx` | Layout principal con sidebar |
| PatientLayout | `layout/PatientLayout.tsx` | Layout portal paciente (bottom-nav) |
| SidebarItem | `layout/SidebarItem.tsx` | Item de la barra lateral |
| Combobox | `ui/Combobox.tsx` | Autocomplete accesible |
| ConfirmDialog | `ui/ConfirmDialog.tsx` | Diálogo de confirmación |
| DataTable | `ui/DataTable.tsx` | Tabla de datos reutilizable |
| EmptyState | `ui/EmptyState.tsx` | Placeholder sin datos |
| ErrorState | `ui/ErrorState.tsx` | UI de error genérica |
| LoadingState | `ui/LoadingState.tsx` | Spinner/skeleton |
| PageHeader | `ui/PageHeader.tsx` | Encabezado de página |
| Pagination | `ui/Pagination.tsx` | Paginación |
| PlaceholderPage | `ui/PlaceholderPage.tsx` | Página placeholder de módulo |

> El anterior `Navbar.tsx` y `ui.css` ya no existen; la navegación vive en `shared/constants/navigation.tsx`.

## Páginas (53 en `modules/`, 50 enrutadas en `AppRouter.tsx`)

### Públicas
| Ruta | Componente |
|------|-----------|
| `/` | LandingPage |
| `/register` | RegisterPage |
| `/forgot-password` | ForgotPasswordPage |
| `/confirm/:token` | ConfirmPage |
| `/booking` | GuestBookingPage |
| `/2fa` | TwoFAPage |
| `*` | NotFoundPage |

### Dashboard principal (DashboardLayout)
| Ruta | Componente |
|------|-----------|
| `/dashboard` | DashboardPage |
| `/users` | UsersPage (superadmin → SuperAdminUsersPage) |
| `/tenants` y `/tenants/:id` | SuperAdminTenantsPage / TenantDetail |
| `/cobros` | SuperAdminBillingPage |
| `/doctors` | DoctorsPage |
| `/bookings` | BookingsPage |
| `/availability` | AvailabilityPage |
| `/calendar` | DoctorCalendarPage |
| `/clinical` | ClinicalPage |
| `/clinical-records` y `/:id` | ClinicalRecordsPage / ClinicalRecordDetailPage |
| `/prescriptions` | PatientPrescriptionsPage |
| `/medical-history` y `/:id` | MedicalHistoryPage / MyMedicalHistoryDetailPage |
| `/patients` | PatientsPage |
| `/billing` | BillingPage |
| `/analytics` | AdminAnalyticsPage |
| `/reports` | ReportsPage |
| `/audit` | AuditPage |
| `/settings` | SettingsPage |
| `/notifications` | NotificationsPage |
| `/specialties` | SpecialtiesPage |
| `/holidays` | HolidaysPage |
| `/panel` | DoctorPanel |
| `/patient-history` | DoctorPatientHistoryPage |
| `/doctor/lab-results` | DoctorLabResultsPage |
| `/admin/demo-data` | AdminDemoDataPage |
| `/admin/lab-requests` | AdminLabRequestsPage |
| `/admin/medical-history` | AdminMedicalHistoryPage |
| `/management` | ManagementPage |
| `/super-admin/demo-data` | SuperAdminDemoDataPage |
| `/saas` | SuperAdminDashboardPage |

### Laboratorio (`/laboratory`, requireFeature='laboratory')
| Ruta | Componente |
|------|-----------|
| `/` | LabDashboardPage |
| `requests` y `requests/:id` | LabRequestsPage / LabRequestDetailPage |
| `area/:areaId` | LabAreaDashboardPage |
| `analytics` | LabAnalyticsPage |
| `quality-control` | LabQualityControlPage |
| `catalog` | LabTestsCatalogPage |
| `lab-results/:id` | LabResultDetailPage |

### Paciente
| Ruta | Componente |
|------|-----------|
| `/my-laboratory` y `/:id` | PatientLabResultsPage / LabResultDetailPage |

### Componentes de página sin ruta activa
| Componente | Nota |
|------------|------|
| `LoginPage` | `auth/pages/LoginPage.tsx` existe pero **no hay ruta `/login`** en AppRouter (acceso vía Landing/AuthProvider) |
| `PrescriptionsPage` | `prescriptions/pages/PrescriptionsPage.tsx` legacy; la ruta usa <code>PatientPrescriptionsPage</code> |
| `SuperAdminAnalyticsPage` | `super-admin/pages/SuperAdminAnalyticsPage.tsx` legacy sin ruta |

> `PatientLayout` sigue existiendo (con tests) pero no está montado en `AppRouter.tsx`; las rutas paciente viven bajo DashboardLayout. Ver [[03-FRONTEND/Routing|Routing]].

---

Tags: #frontend #componentes #paginas
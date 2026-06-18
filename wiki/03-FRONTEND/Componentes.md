# Componentes

> Componentes compartidos y páginas del frontend.

## Componentes Compartidos (9)

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| Navbar | `Navbar.tsx` | Navegación responsiva con roles, locale switcher, theme toggle |
| ErrorBoundary | `ErrorBoundary.tsx` | Captura de errores React |
| ErrorState | `ErrorState.tsx` | UI de error genérica |
| LoadingState | `LoadingState.tsx` | Spinner/skeleton de carga |
| EmptyState | `EmptyState.tsx` | Placeholder cuando no hay datos |
| Combobox | `Combobox.tsx` | Autocomplete accesible |
| PremiumLocked | `PremiumLocked.tsx` | Overlay para features premium |
| WithFeature | `WithFeature.tsx` | Feature-flag wrapper |
| ui.css | `ui.css` | Estilos compartidos |

## Páginas (29)

### Públicas
| Ruta | Componente |
|------|-----------|
| `/` | HomePage |
| `/login` | LoginPage |
| `/register` | RegisterPage |
| `/booking` | BookingPage |
| `/specialists` | SpecialistsPage |
| `/confirm/:token` | ConfirmPage |

### Paciente
| Ruta | Componente |
|------|-----------|
| `/my-bookings` | MyBookingsPage |
| `/my-medical-history` | MyMedicalHistoryPage |
| `/my-medical-history/:id` | MyMedicalHistoryDetailPage |
| `/my-lab-results` | MyLabResultsPage |
| `/my-lab-results/:id` | LabResultDetailPage |

### Doctor
| Ruta | Componente |
|------|-----------|
| `/doctor` | DoctorPanel |
| `/doctor/availability` | DoctorAvailabilityPage |
| `/doctor/calendar` | DoctorCalendarPage |
| `/doctor/clinical-records` | DoctorClinicalRecordsPage |
| `/doctor/patient-history` | DoctorPatientHistoryPage |
| `/doctor/lab-results` | DoctorLabResultsPage |

### Laboratorio
| Ruta | Componente |
|------|-----------|
| `/lab` | LabTechnicianDashboardPage |

### Admin
| Ruta | Componente |
|------|-----------|
| `/admin/register-doctor` | RegisterDoctorPage |
| `/admin/analytics` | AnalyticsPage |
| `/admin/specialties` | AdminSpecialtiesPage |
| `/admin/lab-tests` | AdminLabTestsPage |
| `/admin/demo-data` | AdminDemoDataPage |
| `/admin/lab-requests` | AdminLabRequestsPage |
| `/admin/medical-history` | AdminMedicalHistoryPage |

### Super Admin
| Ruta | Componente |
|------|-----------|
| `/super-admin` | SuperAdminDashboardPage |
| `/super-admin/tenants` | SuperAdminTenantsPage |
| `/super-admin/tenants/:id` | SuperAdminTenantDetailPage |

---

Tags: #frontend #componentes #paginas

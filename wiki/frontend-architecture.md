# Frontend Architecture — Salud Vital Clinic SaaS

> Generated from exhaustive backend analysis. 14 modules, 111 endpoints, 32 tables, 62 indexes.

---

## 1. Executive Summary

**Backend:** Node.js + Express + TypeScript + PostgreSQL  
**Frontend Stack:** React 19 + Vite + TypeScript + TanStack Query + Material UI + Framer Motion  
**Database:** PostgreSQL with multi-tenant isolation via `tenant_id` column on every table  
**Auth:** JWT (HS256, 15min) + Refresh Tokens (30d, rotation) + 2FA/TOTP  
**Roles:** 7 — `superadmin`, `admin`, `doctor`, `lab_technician`, `patient`, `guest`, `user`  
**Total API Endpoints:** 111  
**Total Database Tables:** 32 (including migrations table)  
**i18n Locales:** `es` (primary), `en` (secondary) — 363 translation keys  

---

## 2. Backend API Catalog (Complete)

### 2.1 API Base: `/api`

### 2.2 Endpoints by Module

#### AUTH (`/api/auth`) — 14 endpoints

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/.well-known/jwks.json` | Public | Global | JWKS keys |
| GET | `/invite-info?token=` | Public | Global | Decode invite token |
| POST | `/register` | Public | Auth (10/15m) | Register user |
| POST | `/login` | Public | Auth (10/15m) | Login, returns JWT + refresh |
| POST | `/refresh` | Public | Auth (10/15m) | Rotate refresh token |
| POST | `/logout` | Public | Global | Revoke token, clear cookies |
| POST | `/logout-all` | Auth required | Global | Revoke all user tokens |
| POST | `/change-password` | Auth required | Global | Change password |
| POST | `/2fa/enable` | Auth required | Global | Generate TOTP secret+QR |
| POST | `/2fa/verify` | Auth required | Global | Verify TOTP, enable 2FA |
| POST | `/2fa/disable` | Auth required | Global | Disable 2FA |
| POST | `/forgot-password` | Public | Global | Send reset email |
| POST | `/reset-password` | Public | Global | Reset with token |
| POST | `/reset-admin` | Superadmin | Global | Reset admin to seed password |

**Login Response Shape:**
```typescript
{
  access_token: string;   // 15min JWT
  refresh_token: string;  // 30d opaque token
  user: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    rut: string;
    phone: string;
    password_changed: boolean;
    totp_enabled: boolean;
    tenant_id: string;
  };
}
```

**Refresh Response Shape:**
```typescript
{
  access_token: string;
  refresh_token: string;
}
```

#### DOCTORS (`/api/doctors`) — 8 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/register` | Auth | admin | Register doctor (auto password) |
| POST | `/invite` | Auth | admin, superadmin | Invite doctor/patient/lab_tech |
| GET | `/` | Auth | admin, superadmin | List all doctors |
| GET | `/public` | Public | — | Public doctor list (name, specialty, id) |
| POST | `/` | Auth | admin, superadmin | Create doctor profile |
| GET | `/me` | Auth | doctor | Get own profile |
| GET | `/users` | Auth | admin, superadmin | Paginated user list `?page=&limit=&role=&search=` |
| PATCH | `/users/:userId/active` | Auth | admin, superadmin | Toggle user active |

#### BOOKINGS (`/api/bookings`) — 7 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/` | Auth | Any | Create booking (advisory lock) |
| GET | `/me` | Auth | Any | My paginated bookings `?page=&limit=` |
| PATCH | `/id/cancel` | Auth | Any | Cancel own booking |
| GET | `/available-slots` | Public | — | `?doctor_id=&date=` → `string[]` |
| GET | `/doctor/daily-density` | Auth | doctor | `?start=&end=` |
| GET | `/doctor` | Auth | doctor | Doctor's paginated bookings |
| GET | `/all` | Auth | admin, superadmin | All bookings with patient/doctor info |

#### AVAILABILITY (`/api/availability`) — 4 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/me` | Auth | doctor | Own availability |
| GET | `/:id` | Public | — | Doctor's availability |
| POST | `/` | Auth | doctor | Create availability block |
| DELETE | `/:id` | Auth | doctor | Delete own availability |

#### EXCEPTIONS (`/api/exceptions`) — 3 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/me` | Auth | doctor | Own exceptions |
| POST | `/` | Auth | doctor | Block a date/time range |
| DELETE | `/:id` | Auth | doctor | Remove exception |

#### CLINICAL RECORDS (`/api/clinical-records`) — 15 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/cie10/search` | Auth | doctor, admin | Search CIE-10 `?q=&category=&limit=&offset=` |
| GET | `/cie10/categories` | Auth | doctor, admin | List CIE-10 categories |
| GET | `/cie10/:code` | Auth | doctor, admin | Get CIE-10 by code |
| GET | `/prescriptions/:id/pdf` | Auth | doctor | Download prescription PDF |
| GET | `/` | Auth | All (filtered) | List records `?patient_id=&status=&limit=&offset=` |
| GET | `/:id` | Auth | All (filtered) | Get record + prescriptions + lab results |
| GET | `/:id/lab-results` | Auth | All (filtered) | Lab results for a record |
| GET | `/patient/:patient_id` | Auth | All (filtered) | All records for a patient |
| POST | `/` | Auth | doctor | Create clinical record |
| PUT | `/:id` | Auth | doctor | Update record (optimistic locking) |
| DELETE | `/:id` | Auth | doctor | Soft-cancel (draft only) |
| GET | `/:record_id/prescriptions` | Auth | doctor, admin | List prescriptions |
| POST | `/prescriptions` | Auth | doctor | Create prescription |
| PUT | `/prescriptions/:id` | Auth | doctor | Update prescription |
| DELETE | `/prescriptions/:id` | Auth | doctor | Delete prescription |

#### AUDIT (`/api/audit`) — 1 endpoint

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Auth | admin | `?user_id=&action=&resource_type=&start_date=&end_date=&limit=&offset=` |

#### ANALYTICS (`/api/analytics`) — 10 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/dashboard` | Auth | admin, superadmin | Total patients, doctors, bookings, today, confirmed, cancelled |
| GET | `/bookings-by-month` | Auth | admin, doctor, superadmin | `?months=12` |
| GET | `/top-doctors` | Auth | admin, superadmin | `?limit=10` |
| GET | `/status-distribution` | Auth | admin, doctor, superadmin | Status → count |
| GET | `/my-stats` | Auth | doctor | Own stats |
| GET | `/no-shows` | Auth | admin, superadmin | 6-month no-show data |
| GET | `/diagnoses` | Auth | admin, superadmin | Top 20 diagnoses |
| GET | `/demand` | Auth | admin, superadmin | `?days=30` + 7-day forecast |
| GET | `/schedules` | Auth | admin, superadmin | Optimal schedule analysis |
| GET | `/vitals` | Auth | admin, superadmin | Vital signs anomaly detection |

#### BILLING (`/api/billing`) — 6 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Auth | All (filtered) | `?patient_id=&status=&start_date=&end_date=&limit=&offset=` |
| GET | `/stats` | Auth | admin, doctor | `{ total_outstanding, total_paid, overdue_invoices }` |
| GET | `/:id` | Auth | All (filtered) | Single invoice |
| POST | `/` | Auth | admin, doctor | Create invoice with items |
| PATCH | `/:id/status` | Auth | admin | Update status + payment data |
| DELETE | `/:id` | Auth | admin, doctor | Cascade delete |

#### LABORATORY (`/api/laboratory`) — 44 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/tests` | Auth | Any auth | Test catalog `?category=&area_id=&active=` |
| POST | `/tests` | Auth | admin, superadmin | Create test |
| PUT | `/tests/:id` | Auth | admin, superadmin | Update test |
| DELETE | `/tests/:id` | Auth | admin, superadmin | Delete test |
| GET | `/lab/all` | Auth | admin, superadmin, lab_technician | All requests for lab view |
| PATCH | `/lab/items/:item_id/status` | Auth | admin, superadmin, lab_technician | Update item status |
| PATCH | `/lab/:id/lab-type` | Auth | admin, superadmin, lab_technician | Set lab_type |
| GET | `/dashboard` | Auth | admin, superadmin, lab_technician | Lab dashboard metrics |
| GET | `/dashboard/area/:areaId` | Auth | admin, superadmin, lab_technician | Per-area dashboard |
| GET | `/dashboard/analytics` | Auth | admin, superadmin, lab_technician | Daily/weekly/monthly analytics |
| GET | `/samples` | Auth | admin, superadmin, lab_technician | `?status=&lab_request_id=` |
| GET | `/samples/:id` | Auth | admin, superadmin, lab_technician | Sample by ID |
| POST | `/samples` | Auth | admin, superadmin, lab_technician | Create sample |
| PATCH | `/samples/:id/receive` | Auth | admin, superadmin, lab_technician | Mark received |
| PATCH | `/samples/:id/verify` | Auth | admin, superadmin, lab_technician | Verify sample |
| PATCH | `/samples/:id/assign` | Auth | admin, superadmin, lab_technician | Assign to tech/equipment |
| PATCH | `/samples/:id/qc` | Auth | admin, superadmin, lab_technician | Record QC check |
| PATCH | `/samples/:id/reject` | Auth | admin, superadmin, lab_technician | Reject sample |
| PATCH | `/items/:item_id/result` | Auth | admin, superadmin, doctor, lab_technician | Enter result |
| PATCH | `/items/:item_id/validate-tech` | Auth | admin, superadmin, lab_technician | Tech validation |
| PATCH | `/items/:item_id/validate-doctor` | Auth | admin, superadmin, doctor | Doctor validation |
| PATCH | `/items/:item_id/sign` | Auth | admin, superadmin, doctor | Sign item |
| PATCH | `/items/:item_id/deliver` | Auth | admin, superadmin, lab_technician | Deliver item |
| GET | `/items/:item_id/history` | Auth | admin, superadmin, doctor, lab_technician | Last 10 results + delta% |
| GET | `/areas` | Auth | Any auth | List active lab areas |
| POST | `/areas` | Auth | admin, superadmin | Create lab area |
| GET | `/qc` | Auth | admin, superadmin, lab_technician | QC records |
| POST | `/qc` | Auth | admin, superadmin | Create QC record |
| GET | `/qc/statistics` | Auth | admin, superadmin, lab_technician | QC stats |
| GET | `/equipment` | Auth | admin, superadmin, lab_technician | Equipment list |
| POST | `/equipment` | Auth | admin, superadmin | Create equipment |
| PUT | `/equipment/:id` | Auth | admin, superadmin | Update equipment |
| GET | `/reagents` | Auth | admin, superadmin, lab_technician | Reagent list |
| POST | `/reagents` | Auth | admin, superadmin | Create reagent |
| PATCH | `/reagents/:id/stock` | Auth | admin, superadmin | Update stock |
| GET | `/notifications` | Auth | admin, superadmin, lab_technician | Lab notifications |
| PATCH | `/notifications/:id/ack` | Auth | admin, superadmin, lab_technician | Acknowledge |
| GET | `/events` | Auth | admin, superadmin, lab_technician | **SSE stream** |
| GET | `/` | Auth | All (filtered) | Lab requests list |
| GET | `/:id` | Auth | All (filtered) | Lab request detail |
| POST | `/` | Auth | admin, doctor | Create lab request |
| PATCH | `/:id/status` | Auth | admin, superadmin, doctor, lab_technician | Update status |
| DELETE | `/:id` | Auth | admin, doctor | Cancel request |
| GET | `/:id/pdf` | Auth | All (filtered) | Download lab order PDF |

#### SPECIALTIES (`/api/specialties`) — 5 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Public | — | All specialties with embedded doctors |
| GET | `/:id` | Public | — | Specialty by ID |
| POST | `/` | Auth | admin, superadmin | Create specialty (idempotent) |
| PUT | `/:id` | Auth | admin, superadmin | Update specialty |
| DELETE | `/:id` | Auth | admin, superadmin | Delete specialty |

#### SAAS (`/api/saas`) — 12 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/webhook/stripe` | Public | — | Stripe webhook (stub) |
| GET | `/plans` | Public | — | Public plans list |
| POST | `/onboard` | Public | — | Onboard new tenant (3/hr limit) |
| GET | `/subscription` | Auth | admin, superadmin | Get subscription |
| POST | `/checkout` | Auth | admin, superadmin | Simulated Stripe checkout |
| POST | `/change-plan` | Auth | admin, superadmin | Change plan |
| POST | `/cancel` | Auth | admin, superadmin | Cancel subscription |
| GET | `/usage` | Auth | admin, superadmin | Usage data (stub) |
| GET | `/usage/summary` | Auth | admin, superadmin | Usage summary (stub) |
| GET | `/limits` | Auth | admin, superadmin | Plan limits |
| GET | `/features` | Auth | Any auth | Feature flags for tenant |
| PATCH | `/tenant` | Auth | admin, superadmin | Update tenant config |

#### SUPER-ADMIN (`/api/super-admin`) — 21 endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/stats` | Auth | superadmin | Global stats |
| GET | `/tenants` | Auth | superadmin | Paginated tenants |
| GET | `/tenants/:id` | Auth | superadmin | Tenant detail |
| POST | `/tenants` | Auth | superadmin | Create tenant |
| PATCH | `/tenants/:id` | Auth | superadmin | Update tenant |
| DELETE | `/tenants/:id` | Auth | superadmin | Soft-delete tenant |
| GET | `/users` | Auth | superadmin | Cross-tenant users |
| PATCH | `/users/:userId/active` | Auth | superadmin | Toggle user active |
| GET | `/analytics/dashboard` | Auth | superadmin | Global dashboard |
| GET | `/analytics/top-tenants` | Auth | superadmin | Top tenants |
| GET | `/analytics/revenue` | Auth | superadmin | Revenue data |
| GET | `/analytics/growth` | Auth | superadmin | Growth data |
| GET | `/analytics/tenant-growth/:tenantId` | Auth | superadmin | Per-tenant growth |
| GET | `/analytics/health` | Auth | superadmin | Health scores |
| GET | `/analytics/health/:tenantId` | Auth | superadmin | Tenant health detail |
| GET | `/analytics/operations` | Auth | superadmin | Operations analytics |
| GET | `/analytics/churn` | Auth | superadmin | Churn metrics |
| GET | `/analytics/comparison` | Auth | superadmin | Cross-tenant comparison |
| GET | `/analytics/occupancy` | Auth | superadmin | Slot occupancy |
| GET | `/analytics/activity` | Auth | superadmin | Activity data |
| GET | `/analytics/alerts` | Auth | superadmin | Automated alerts |

#### GUEST (`/api/guest`) — 3 endpoints

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/booking` | Public | Guest (5/hr) | Guest booking by RUT |
| GET | `/bookings/:rut` | Public | RUT (3/15m) | Lookup guest bookings |
| DELETE | `/booking/:id` | Optional | Guest | Cancel (by RUT+token or user_id) |

---

## 3. Database Schema Summary

### 3.1 Tables (32 total)

**Core:** tenants, users, doctors, bookings, doctor_availability, doctor_exceptions  
**Clinical:** clinical_records, prescriptions, cie10_catalog  
**Lab:** lab_tests, lab_areas, lab_requests, lab_request_items, lab_samples, lab_result_history, lab_equipment, lab_reagents, lab_qc_records, lab_notifications  
**Billing:** invoices, invoice_items, payments, insurance_claims  
**Auth:** refresh_tokens, password_reset_tokens  
**SaaS:** plans, subscriptions, subscription_invoices, tenant_features, tenant_usage  
**System:** audit_logs, _migrations  

### 3.2 Key Relationships

```
tenants ──< users, doctors, bookings, clinical_records, invoices, lab_*, specialties, subscriptions
users ──< doctors (user_id), bookings (user_id), clinical_records (patient_id)
doctors ──< bookings, doctor_availability, doctor_exceptions, clinical_records
bookings ──< clinical_records, invoices
clinical_records ──< prescriptions, lab_requests
invoices ──< invoice_items, payments, insurance_claims
lab_requests ──< lab_request_items ──< lab_samples, lab_result_history
lab_areas ──< lab_tests, lab_requests, lab_request_items, lab_equipment, lab_reagents, lab_qc_records
plans ──< subscriptions ──< subscription_invoices
```

### 3.3 Status Enums (Critical for Frontend Types)

```
Bookings: pending | confirmed | cancelled | completed | no_show
Clinical Records: draft | completed | cancelled
Invoices: pending | paid | cancelled | refunded | overdue
Lab Requests: pending | received | verified | assigned | processing | qc_review | result_entered | validated_tech | validated_doctor | signed | delivered | cancelled | rejected | repeated
Lab Samples: pending | received | verified | assigned | processing | completed | rejected | disposed
Lab QC: passed | failed | warning | review
Subscriptions: active | trialing | past_due | canceled | incomplete
Users: superadmin | admin | doctor | lab_technician | patient | guest | user
```

---

## 4. Frontend Architecture Proposal

### 4.1 Directory Structure

```
frontend-v2/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── .env
├── .env.example
├── public/
│   ├── favicon.svg
│   └── logo.svg
└── src/
    ├── main.tsx                          # Entry point
    ├── App.tsx                           # Root component with providers
    ├── vite-env.d.ts                     # Vite type declarations
    │
    ├── app/
    │   ├── config/
    │   │   ├── api.config.ts             # Axios instance, interceptors, base URL
    │   │   ├── auth.config.ts            # Token storage keys, expiry times
    │   │   ├── query.config.ts           # TanStack Query defaults
    │   │   └── theme.config.ts           # MUI theme tokens
    │   │
    │   ├── router/
    │   │   ├── index.tsx                 # createBrowserRouter
    │   │   ├── routes.tsx                # Route definitions
    │   │   ├── guards.tsx                # AuthGuard, RoleGuard, FeatureGuard
    │   │   └── lazy.tsx                  # Lazy-loaded page imports
    │   │
    │   └── layouts/
    │       ├── AuthLayout.tsx            # Login/Register layout (centered)
    │       ├── DashboardLayout.tsx       # Sidebar + Topbar + Content
    │       ├── PublicLayout.tsx          # Landing page layout
    │       └── MinimalLayout.tsx         # Minimal (confirmation, 404)
    │
    ├── modules/
    │   ├── auth/
    │   │   ├── components/
    │   │   │   ├── LoginForm.tsx
    │   │   │   ├── RegisterForm.tsx
    │   │   │   ├── ForgotPasswordForm.tsx
    │   │   │   ├── ResetPasswordForm.tsx
    │   │   │   ├── TwoFactorSetup.tsx
    │   │   │   ├── TwoFactorVerify.tsx
    │   │   │   └── InviteAcceptForm.tsx
    │   │   ├── pages/
    │   │   │   ├── LoginPage.tsx
    │   │   │   ├── RegisterPage.tsx
    │   │   │   ├── ForgotPasswordPage.tsx
    │   │   │   ├── ResetPasswordPage.tsx
    │   │   │   ├── TwoFactorPage.tsx
    │   │   │   └── InviteAcceptPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useLogin.ts
    │   │   │   ├── useRegister.ts
    │   │   │   ├── useRefreshToken.ts
    │   │   │   ├── useLogout.ts
    │   │   │   ├── useForgotPassword.ts
    │   │   │   ├── useResetPassword.ts
    │   │   │   ├── useTwoFactor.ts
    │   │   │   └── useInviteInfo.ts
    │   │   ├── services/
    │   │   │   └── auth.service.ts
    │   │   ├── types/
    │   │   │   └── auth.types.ts
    │   │   ├── schemas/
    │   │   │   └── auth.schema.ts        # Zod schemas (mirror backend)
    │   │   └── constants/
    │   │       └── auth.constants.ts
    │   │
    │   ├── doctors/
    │   │   ├── components/
    │   │   │   ├── DoctorCard.tsx
    │   │   │   ├── DoctorForm.tsx
    │   │   │   ├── DoctorTable.tsx
    │   │   │   └── InviteDoctorModal.tsx
    │   │   ├── pages/
    │   │   │   ├── DoctorPanelPage.tsx
    │   │   │   ├── DoctorProfilePage.tsx
    │   │   │   ├── AdminDoctorsPage.tsx
    │   │   │   └── RegisterDoctorPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useDoctors.ts
    │   │   │   ├── useDoctorProfile.ts
    │   │   │   ├── useUsers.ts
    │   │   │   └── useToggleUserActive.ts
    │   │   ├── services/
    │   │   │   └── doctor.service.ts
    │   │   ├── types/
    │   │   │   └── doctor.types.ts
    │   │   └── constants/
    │   │       └── doctor.constants.ts
    │   │
    │   ├── bookings/
    │   │   ├── components/
    │   │   │   ├── BookingCalendar.tsx     # FullCalendar integration
    │   │   │   ├── BookingForm.tsx
    │   │   │   ├── BookingCard.tsx
    │   │   │   ├── BookingTable.tsx
    │   │   │   ├── BookingTimeline.tsx
    │   │   │   ├── AvailableSlots.tsx
    │   │   │   └── DoctorDensityChart.tsx
    │   │   ├── pages/
    │   │   │   ├── BookingPage.tsx
    │   │   │   ├── MyBookingsPage.tsx
    │   │   │   ├── DoctorBookingsPage.tsx
    │   │   │   └── AdminBookingsPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useBookings.ts
    │   │   │   ├── useCreateBooking.ts
    │   │   │   ├── useCancelBooking.ts
    │   │   │   ├── useAvailableSlots.ts
    │   │   │   └── useDoctorDensity.ts
    │   │   ├── services/
    │   │   │   └── booking.service.ts
    │   │   ├── types/
    │   │   │   └── booking.types.ts
    │   │   └── constants/
    │   │       └── booking.constants.ts
    │   │
    │   ├── availability/
    │   │   ├── components/
    │   │   │   ├── AvailabilityForm.tsx
    │   │   │   ├── AvailabilityList.tsx
    │   │   │   ├── ExceptionForm.tsx
    │   │   │   └── ExceptionCalendar.tsx
    │   │   ├── pages/
    │   │   │   └── AvailabilityPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useMyAvailability.ts
    │   │   │   ├── useCreateAvailability.ts
    │   │   │   ├── useDeleteAvailability.ts
    │   │   │   ├── useExceptions.ts
    │   │   │   ├── useCreateException.ts
    │   │   │   └── useDeleteException.ts
    │   │   ├── services/
    │   │   │   └── availability.service.ts
    │   │   └── types/
    │   │       └── availability.types.ts
    │   │
    │   ├── clinical-records/
    │   │   ├── components/
    │   │   │   ├── ClinicalRecordForm.tsx
    │   │   │   ├── ClinicalRecordCard.tsx
    │   │   │   ├── ClinicalRecordTimeline.tsx
    │   │   │   ├── VitalSignsForm.tsx
    │   │   │   ├── PrescriptionForm.tsx
    │   │   │   ├── PrescriptionList.tsx
    │   │   │   ├── Cie10Search.tsx
    │   │   │   └── Cie10Picker.tsx
    │   │   ├── pages/
    │   │   │   ├── ClinicalRecordsPage.tsx
    │   │   │   ├── ClinicalRecordDetailPage.tsx
    │   │   │   ├── PatientHistoryPage.tsx
    │   │   │   ├── MyMedicalHistoryPage.tsx
    │   │   │   └── MyMedicalHistoryDetailPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useClinicalRecords.ts
    │   │   │   ├── useClinicalRecord.ts
    │   │   │   ├── useCreateClinicalRecord.ts
    │   │   │   ├── useUpdateClinicalRecord.ts
    │   │   │   ├── usePrescriptions.ts
    │   │   │   ├── useCreatePrescription.ts
    │   │   │   ├── useCie10Search.ts
    │   │   │   └── usePrescriptionPDF.ts
    │   │   ├── services/
    │   │   │   └── clinical-record.service.ts
    │   │   ├── types/
    │   │   │   └── clinical-record.types.ts
    │   │   ├── schemas/
    │   │   │   └── clinical-record.schema.ts
    │   │   └── constants/
    │   │       └── clinical-record.constants.ts
    │   │
    │   ├── billing/
    │   │   ├── components/
    │   │   │   ├── InvoiceForm.tsx
    │   │   │   ├── InvoiceCard.tsx
    │   │   │   ├── InvoiceTable.tsx
    │   │   │   ├── InvoiceDetail.tsx
    │   │   │   ├── PaymentStatusBadge.tsx
    │   │   │   └── BillingStatsCards.tsx
    │   │   ├── pages/
    │   │   │   ├── BillingPage.tsx
    │   │   │   └── InvoiceDetailPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useInvoices.ts
    │   │   │   ├── useInvoice.ts
    │   │   │   ├── useCreateInvoice.ts
    │   │   │   ├── useUpdateInvoiceStatus.ts
    │   │   │   └── useBillingStats.ts
    │   │   ├── services/
    │   │   │   └── billing.service.ts
    │   │   ├── types/
    │   │   │   └── billing.types.ts
    │   │   └── schemas/
    │   │       └── billing.schema.ts
    │   │
    │   ├── laboratory/
    │   │   ├── components/
    │   │   │   ├── lab-dashboard/
    │   │   │   │   ├── LabMetricsCards.tsx
    │   │   │   │   ├── LabAreaSelector.tsx
    │   │   │   │   └── LabRecentActivity.tsx
    │   │   │   ├── lab-requests/
    │   │   │   │   ├── LabRequestTable.tsx
    │   │   │   │   ├── LabRequestCard.tsx
    │   │   │   │   ├── LabRequestForm.tsx
    │   │   │   │   ├── LabRequestDetail.tsx
    │   │   │   │   └── LabRequestTimeline.tsx
    │   │   │   ├── lab-samples/
    │   │   │   │   ├── SampleCard.tsx
    │   │   │   │   ├── SampleTimeline.tsx
    │   │   │   │   ├── SampleQCForm.tsx
    │   │   │   │   └── SampleRejectDialog.tsx
    │   │   │   ├── lab-results/
    │   │   │   │   ├── ResultEntryForm.tsx
    │   │   │   │   ├── ValidationWorklist.tsx
    │   │   │   │   ├── ResultHistoryChart.tsx
    │   │   │   │   └── DeltaCheckBadge.tsx
    │   │   │   ├── lab-pipeline/
    │   │   │   │   ├── PipelineView.tsx       # Visual pipeline
    │   │   │   │   └── PipelineStep.tsx
    │   │   │   ├── lab-equipment/
    │   │   │   │   ├── EquipmentTable.tsx
    │   │   │   │   └── EquipmentStatusBadge.tsx
    │   │   │   ├── lab-reagents/
    │   │   │   │   ├── ReagentTable.tsx
    │   │   │   │   └── StockAlertBadge.tsx
    │   │   │   ├── lab-qc/
    │   │   │   │   ├── QCTable.tsx
    │   │   │   │   ├── QCForm.tsx
    │   │   │   │   └── QCStatsCards.tsx
    │   │   │   ├── lab-areas/
    │   │   │   │   └── AreaCard.tsx
    │   │   │   ├── lab-notifications/
    │   │   │   │   ├── LabNotificationBell.tsx
    │   │   │   │   └── LabNotificationList.tsx
    │   │   │   └── shared/
    │   │   │       ├── LabStatusBadge.tsx
    │   │   │       ├── LabSplitView.tsx
    │   │   │       ├── LabSearchInput.tsx
    │   │   │       ├── LabQuickActions.tsx
    │   │   │       └── LabIcons.tsx
    │   │   ├── pages/
    │   │   │   ├── LabDashboardPage.tsx
    │   │   │   ├── LabAreaDashboardPage.tsx
    │   │   │   ├── LabRequestsPage.tsx
    │   │   │   ├── LabRequestDetailPage.tsx
    │   │   │   ├── LabSamplesPage.tsx
    │   │   │   ├── LabResultsPage.tsx
    │   │   │   ├── LabEquipmentPage.tsx
    │   │   │   ├── LabReagentsPage.tsx
    │   │   │   ├── LabQCPage.tsx
    │   │   │   ├── LabAnalyticsPage.tsx
    │   │   │   ├── LabNotificationsPage.tsx
    │   │   │   ├── LabTestsCatalogPage.tsx
    │   │   │   └── LabPatientResultsPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useLabRequests.ts
    │   │   │   ├── useLabRequest.ts
    │   │   │   ├── useCreateLabRequest.ts
    │   │   │   ├── useUpdateLabRequestStatus.ts
    │   │   │   ├── useLabSamples.ts
    │   │   │   ├── useCreateSample.ts
    │   │   │   ├── useSampleActions.ts
    │   │   │   ├── useLabResults.ts
    │   │   │   ├── useEnterResult.ts
    │   │   │   ├── useValidateItem.ts
    │   │   │   ├── useLabDashboard.ts
    │   │   │   ├── useLabAreaDashboard.ts
    │   │   │   ├── useLabAnalytics.ts
    │   │   │   ├── useLabEquipment.ts
    │   │   │   ├── useLabReagents.ts
    │   │   │   ├── useLabQC.ts
    │   │   │   ├── useLabNotifications.ts
    │   │   │   ├── useLabRealtime.ts        # SSE EventSource
    │   │   │   ├── useLabTests.ts
    │   │   │   ├── useLabAreas.ts
    │   │   │   ├── useLabKeyboard.ts        # Keyboard shortcuts
    │   │   │   └── useItemHistory.ts
    │   │   ├── services/
    │   │   │   ├── laboratory.service.ts
    │   │   │   └── lab-sse.service.ts       # SSE connection manager
    │   │   ├── types/
    │   │   │   └── laboratory.types.ts
    │   │   ├── schemas/
    │   │   │   └── laboratory.schema.ts
    │   │   ├── context/
    │   │   │   ├── LabFiltersContext.tsx
    │   │   │   └── LabDashboardContext.tsx
    │   │   └── constants/
    │   │       ├── lab-status.ts
    │   │       ├── lab-areas.ts
    │   │       └── lab-pipeline.ts
    │   │
    │   ├── analytics/
    │   │   ├── components/
    │   │   │   ├── DashboardStatsCards.tsx
    │   │   │   ├── BookingsByMonthChart.tsx
    │   │   │   ├── TopDoctorsChart.tsx
    │   │   │   ├── StatusDistributionChart.tsx
    │   │   │   ├── DemandForecastChart.tsx
    │   │   │   ├── DiagnosesChart.tsx
    │   │   │   ├── NoShowsChart.tsx
    │   │   │   ├── VitalsAnomalyTable.tsx
    │   │   │   └── ScheduleOptimizationChart.tsx
    │   │   ├── pages/
    │   │   │   ├── AdminAnalyticsPage.tsx
    │   │   │   └── DoctorAnalyticsPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useDashboardStats.ts
    │   │   │   ├── useBookingsByMonth.ts
    │   │   │   ├── useTopDoctors.ts
    │   │   │   ├── useStatusDistribution.ts
    │   │   │   ├── useDemandForecast.ts
    │   │   │   ├── useDiagnoses.ts
    │   │   │   ├── useNoShows.ts
    │   │   │   ├── useMyStats.ts
    │   │   │   ├── useSchedules.ts
    │   │   │   └── useVitalsAnomalies.ts
    │   │   ├── services/
    │   │   │   └── analytics.service.ts
    │   │   └── types/
    │   │       └── analytics.types.ts
    │   │
    │   ├── audit/
    │   │   ├── components/
    │   │   │   ├── AuditLogTable.tsx
    │   │   │   └── AuditLogDetail.tsx
    │   │   ├── pages/
    │   │   │   └── AuditLogsPage.tsx
    │   │   ├── hooks/
    │   │   │   └── useAuditLogs.ts
    │   │   ├── services/
    │   │   │   └── audit.service.ts
    │   │   └── types/
    │   │       └── audit.types.ts
    │   │
    │   ├── specialties/
    │   │   ├── components/
    │   │   │   ├── SpecialtyCard.tsx
    │   │   │   ├── SpecialtyGrid.tsx
    │   │   │   └── SpecialtyForm.tsx
    │   │   ├── pages/
    │   │   │   ├── SpecialistsPage.tsx
    │   │   │   └── AdminSpecialtiesPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useSpecialties.ts
    │   │   │   ├── useCreateSpecialty.ts
    │   │   │   └── useDeleteSpecialty.ts
    │   │   ├── services/
    │   │   │   └── specialty.service.ts
    │   │   └── types/
    │   │       └── specialty.types.ts
    │   │
    │   ├── saas/
    │   │   ├── components/
    │   │   │   ├── PlanCard.tsx
    │   │   │   ├── PlanComparison.tsx
    │   │   │   ├── SubscriptionStatus.tsx
    │   │   │   ├── UsageMeter.tsx
    │   │   │   └── OnboardForm.tsx
    │   │   ├── pages/
    │   │   │   ├── LandingPage.tsx
    │   │   │   ├── PricingPage.tsx
    │   │   │   ├── OnboardPage.tsx
    │   │   │   └── SubscriptionPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── usePlans.ts
    │   │   │   ├── useSubscription.ts
    │   │   │   ├── useCheckout.ts
    │   │   │   ├── useChangePlan.ts
    │   │   │   ├── useCancelSubscription.ts
    │   │   │   ├── useFeatures.ts
    │   │   │   └── useOnboard.ts
    │   │   ├── services/
    │   │   │   └── saas.service.ts
    │   │   └── types/
    │   │       └── saas.types.ts
    │   │
    │   ├── super-admin/
    │   │   ├── components/
    │   │   │   ├── TenantTable.tsx
    │   │   │   ├── TenantCard.tsx
    │   │   │   ├── GlobalStatsCards.tsx
    │   │   │   ├── RevenueChart.tsx
    │   │   │   ├── GrowthChart.tsx
    │   │   │   ├── HealthScoresGrid.tsx
    │   │   │   ├── ChurnMetrics.tsx
    │   │   │   ├── OccupancyChart.tsx
    │   │   │   └── AlertsPanel.tsx
    │   │   ├── pages/
    │   │   │   ├── SuperAdminDashboardPage.tsx
    │   │   │   ├── SuperAdminTenantsPage.tsx
    │   │   │   ├── SuperAdminTenantDetailPage.tsx
    │   │   │   └── SuperAdminUsersPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useGlobalStats.ts
    │   │   │   ├── useTenants.ts
    │   │   │   ├── useTenantDetail.ts
    │   │   │   ├── useCreateTenant.ts
    │   │   │   ├── useUpdateTenant.ts
    │   │   │   ├── useDeleteTenant.ts
    │   │   │   ├── useSuperAdminUsers.ts
    │   │   │   ├── useRevenue.ts
    │   │   │   ├── useGrowth.ts
    │   │   │   ├── useHealthScores.ts
    │   │   │   ├── useChurn.ts
    │   │   │   ├── useComparison.ts
    │   │   │   ├── useOccupancy.ts
    │   │   │   ├── useActivity.ts
    │   │   │   └── useAlerts.ts
    │   │   ├── services/
    │   │   │   └── super-admin.service.ts
    │   │   └── types/
    │   │       └── super-admin.types.ts
    │   │
    │   ├── guest/
    │   │   ├── components/
    │   │   │   ├── GuestBookingForm.tsx
    │   │   │   └── GuestBookingLookup.tsx
    │   │   ├── pages/
    │   │   │   ├── GuestBookingPage.tsx
    │   │   │   └── GuestLookupPage.tsx
    │   │   ├── hooks/
    │   │   │   ├── useGuestBooking.ts
    │   │   │   └── useGuestLookup.ts
    │   │   ├── services/
    │   │   │   └── guest.service.ts
    │   │   └── types/
    │   │       └── guest.types.ts
    │   │
    │   └── patients/
    │       ├── components/
    │       │   └── PatientCard.tsx
    │       ├── pages/
    │       │   └── MyLabResultsPage.tsx
    │       ├── hooks/
    │       │   └── useMyLabResults.ts
    │       └── types/
    │           └── patient.types.ts
    │
    ├── shared/
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── Alert.tsx              # Reusable alert component
    │   │   │   ├── Badge.tsx              # Status badge
    │   │   │   ├── Button.tsx             # MUI Button wrapper
    │   │   │   ├── Card.tsx               # Card wrapper
    │   │   │   ├── ConfirmDialog.tsx       # Confirmation modal
    │   │   │   ├── DataTable.tsx           # Generic data table (TanStack Table)
    │   │   │   ├── DatePicker.tsx          # Date picker wrapper
    │   │   │   ├── Divider.tsx
    │   │   │   ├── EmptyState.tsx          # Empty state illustration
    │   │   │   ├── ErrorBoundary.tsx       # React Error Boundary
    │   │   │   ├── ErrorState.tsx          # Error state display
    │   │   │   ├── FormField.tsx           # Form field wrapper
    │   │   │   ├── IconButton.tsx
    │   │   │   ├── LoadingOverlay.tsx      # Full-page loading
    │   │   │   ├── LoadingState.tsx        # Skeleton loader
    │   │   │   ├── Modal.tsx               # Modal dialog
    │   │   │   ├── PageContainer.tsx       # Page wrapper with padding
    │   │   │   ├── PageHeader.tsx          # Page title + actions
    │   │   │   ├── Pagination.tsx          # Table pagination
    │   │   │   ├── Skeleton.tsx            # Skeleton component
    │   │   │   ├── StatusBadge.tsx         # Colored status badge
    │   │   │   ├── Text.tsx                # Typography wrapper
    │   │   │   ├── Toast.tsx               # Toast notification
    │   │   │   ├── Tooltip.tsx
    │   │   │   └── index.ts
    │   │   ├── layout/
    │   │   │   ├── Sidebar.tsx             # Navigation sidebar
    │   │   │   ├── Topbar.tsx              # Top bar with user menu
    │   │   │   ├── Breadcrumb.tsx
    │   │   │   └── UserMenu.tsx
    │   │   ├── charts/
    │   │   │   ├── BarChart.tsx
    │   │   │   ├── LineChart.tsx
    │   │   │   ├── PieChart.tsx
    │   │   │   └── AreaChart.tsx
    │   │   └── feedback/
    │   │       ├── NotificationBell.tsx
    │   │       ├── ToastContainer.tsx
    │   │       └── OfflineBanner.tsx
    │   │
    │   ├── hooks/
    │   │   ├── useDebounce.ts
    │   │   ├── useLocalStorage.ts
    │   │   ├── useMediaQuery.ts
    │   │   ├── useOnlineStatus.ts
    │   │   ├── useClickOutside.ts
    │   │   ├── useKeyboard.ts
    │   │   ├── usePagination.ts
    │   │   ├── useSearchParams.ts
    │   │   └── usePrevious.ts
    │   │
    │   ├── services/
    │   │   ├── api-client.ts              # Axios instance with interceptors
    │   │   ├── error-handler.ts           # Global error handling
    │   │   └── storage.service.ts         # localStorage/cookie helpers
    │   │
    │   ├── types/
    │   │   ├── api.types.ts               # PaginatedResponse, ApiError, etc.
    │   │   ├── auth.types.ts              # JwtUser, UserRole, etc.
    │   │   ├── common.types.ts            # Shared utility types
    │   │   └── index.ts                   # Re-exports
    │   │
    │   ├── utils/
    │   │   ├── cn.ts                      # className merger
    │   │   ├── date.ts                    # Date formatting
    │   │   ├── format.ts                  # Number/currency formatting
    │   │   ├── rut.ts                     # RUT validation
    │   │   ├── sanitize.ts                # Input sanitization
    │   │   ├── download.ts                # File download helper
    │   │   └── constants.ts               # Global constants
    │   │
    │   └── constants/
    │       ├── roles.ts                   # Role definitions
    │       ├── permissions.ts             # Permission matrix
    │       ├── routes.ts                  # Route path constants
    │       └── status.ts                  # Status color/icon maps
    │
    ├── contexts/
    │   ├── AuthContext.tsx                 # Auth state + user
    │   ├── ThemeContext.tsx                # Light/dark mode
    │   ├── FeatureContext.tsx              # Feature flags from API
    │   └── NotificationContext.tsx         # Global notifications
    │
    ├── providers/
    │   ├── AppProviders.tsx               # Combines all providers
    │   ├── QueryProvider.tsx              # TanStack Query
    │   ├── AuthProvider.tsx               # Auth context provider
    │   ├── ThemeProvider.tsx              # MUI ThemeProvider
    │   ├── FeatureProvider.tsx            # Feature flags provider
    │   ├── NotificationProvider.tsx       # Toast notification provider
    │   └── I18nProvider.tsx               # i18n context provider
    │
    ├── i18n/
    │   ├── index.ts                       # i18n config
    │   ├── useI18n.ts                     # Translation hook
    │   ├── locales/
    │   │   ├── es.ts                      # Spanish translations
    │   │   └── en.ts                      # English translations
    │   └── types/
    │       └── i18n.types.ts
    │
    ├── assets/
    │   ├── images/
    │   │   ├── logo.svg
    │   │   ├── logo-dark.svg
    │   │   ├── empty-state.svg
    │   │   ├── error-state.svg
    │   │   └── auth-bg.jpg
    │   └── icons/
    │       └── index.ts                   # SVG icon components
    │
    └── styles/
        ├── globals.css                    # Global styles
        ├── variables.css                  # CSS custom properties
        └── animations.css                 # Framer Motion presets
```

### 4.2 Route System

```typescript
// src/app/router/routes.tsx

// PUBLIC ROUTES
/                                    → LandingSaaS (PublicLayout)
/login                              → Redirects to /?openLogin=1
/register                            → RegisterPage (AuthLayout)
/booking                             → BookingPage (PublicLayout)
/specialists                         → SpecialistsPage (PublicLayout)
/confirm/:token                      → ConfirmPage (MinimalLayout)
/forgot-password                     → ForgotPasswordPage (AuthLayout)
/reset-password                      → ResetPasswordPage (AuthLayout)
/accept-invite?token=                → InviteAcceptPage (AuthLayout)
/saas/plans                          → PricingPage (PublicLayout)
/onboard                             → OnboardPage (AuthLayout)

// PATIENT ROUTES (role: patient)
/my-bookings                         → MyBookingsPage (DashboardLayout)
/my-medical-history                  → MyMedicalHistoryPage (DashboardLayout)
/my-medical-history/:id              → MyMedicalHistoryDetailPage (DashboardLayout)
/my-lab-results                      → MyLabResultsPage (DashboardLayout)
/my-lab-results/:id                  → LabResultDetailPage (DashboardLayout)

// DOCTOR ROUTES (role: doctor)
/doctor                              → DoctorPanelPage (DashboardLayout)
/doctor/availability                 → AvailabilityPage (DashboardLayout)
/doctor/calendar                     → DoctorCalendarPage (DashboardLayout)
/doctor/clinical-records             → ClinicalRecordsPage (DashboardLayout)
/doctor/clinical-records/:id         → ClinicalRecordDetailPage (DashboardLayout)
/doctor/patient-history              → PatientHistoryPage (DashboardLayout)
/doctor/lab-results                  → DoctorLabResultsPage (DashboardLayout)
/doctor/lab-results/:id              → LabResultDetailPage (DashboardLayout)

// ADMIN ROUTES (role: admin)
/admin/register-doctor               → RegisterDoctorPage (DashboardLayout)
/admin/analytics                     → AdminAnalyticsPage (DashboardLayout)
/admin/specialties                   → AdminSpecialtiesPage (DashboardLayout)
/admin/billing                       → BillingPage (DashboardLayout)
/admin/billing/:id                   → InvoiceDetailPage (DashboardLayout)
/admin/lab-tests                     → LabTestsCatalogPage (DashboardLayout)
/admin/lab-requests                  → AdminLabRequestsPage (DashboardLayout)
/admin/audit                         → AuditLogsPage (DashboardLayout)
/admin/bookings                      → AdminBookingsPage (DashboardLayout)
/admin/users                         → AdminUsersPage (DashboardLayout)

// LAB TECHNICIAN ROUTES (role: lab_technician)
/lab                                 → LabDashboardPage (DashboardLayout)
/lab/dashboard                       → LabDashboardPage (DashboardLayout)
/lab/dashboard/:areaId               → LabAreaDashboardPage (DashboardLayout)
/lab/requests                        → LabRequestsPage (DashboardLayout)
/lab/requests/:id                    → LabRequestDetailPage (DashboardLayout)
/lab/samples                         → LabSamplesPage (DashboardLayout)
/lab/equipment                       → LabEquipmentPage (DashboardLayout)
/lab/reagents                        → LabReagentsPage (DashboardLayout)
/lab/qc                              → LabQCPage (DashboardLayout)
/lab/analytics                       → LabAnalyticsPage (DashboardLayout)
/lab/notifications                   → LabNotificationsPage (DashboardLayout)

// SUPER ADMIN ROUTES (role: superadmin)
/super-admin                         → SuperAdminDashboardPage (DashboardLayout)
/super-admin/tenants                 → SuperAdminTenantsPage (DashboardLayout)
/super-admin/tenants/:id             → SuperAdminTenantDetailPage (DashboardLayout)
/super-admin/users                   → SuperAdminUsersPage (DashboardLayout)

// CATCH ALL
*                                    → NotFoundPage (MinimalLayout)
```

### 4.3 Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                    AUTH FLOW                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Login                                               │
│     POST /api/auth/login                                │
│     → { access_token, refresh_token, user }             │
│     → Store access_token in memory (context)            │
│     → Store refresh_token in httpOnly cookie             │
│                                                         │
│  2. Token Refresh (automatic)                           │
│     Axios interceptor detects 401                       │
│     → POST /api/auth/refresh                            │
│     → New { access_token, refresh_token }               │
│     → Retry failed request                              │
│                                                         │
│  3. Session Expiry                                      │
│     Access token expires (15min)                        │
│     → Interceptor tries refresh                         │
│     → If refresh fails → logout                         │
│     → Redirect to /login                                │
│                                                         │
│  4. Logout                                              │
│     POST /api/auth/logout                               │
│     → Clear tokens from storage                         │
│     → Clear user context                                │
│     → Redirect to /                                     │
│                                                         │
│  5. 2FA Flow                                            │
│     Login returns user with totp_enabled                │
│     → If totp_enabled: show 2FA prompt                  │
│     → POST /api/auth/login with totp_token              │
│     → Full access_token issued                          │
│                                                         │
│  6. Password Reset                                      │
│     POST /api/auth/forgot-password                      │
│     → User clicks email link                            │
│     → POST /api/auth/reset-password (token + email)     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.4 API Layer Design

```typescript
// src/shared/services/api-client.ts

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken(); // from AuthContext
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401, refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { data } = await apiClient.post('/auth/refresh');
        setAccessToken(data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch {
        clearAuth();
        window.location.href = '/?openLogin=1';
        return Promise.reject(error);
      }
    }
    
    // Global error handling
    handleApiError(error);
    return Promise.reject(error);
  }
);
```

### 4.5 Service Layer Pattern

```typescript
// Example: src/modules/bookings/services/booking.service.ts

import { apiClient } from '@/shared/services/api-client';
import type { CreateBookingInput, Booking, PaginatedResponse } from '../types/booking.types';

export const bookingService = {
  create: (data: CreateBookingInput) =>
    apiClient.post<Booking>('/bookings', data).then(r => r.data),

  getMyBookings: (page = 1, limit = 10) =>
    apiClient.get<PaginatedResponse<Booking>>('/bookings/me', { params: { page, limit } }).then(r => r.data),

  getDoctorBookings: (page = 1, limit = 10) =>
    apiClient.get<PaginatedResponse<Booking>>('/bookings/doctor', { params: { page, limit } }).then(r => r.data),

  getAllBookings: (page = 1, limit = 10) =>
    apiClient.get<PaginatedResponse<Booking>>('/bookings/all', { params: { page, limit } }).then(r => r.data),

  cancel: (id: number) =>
    apiClient.patch(`/bookings/${id}/cancel`).then(r => r.data),

  getAvailableSlots: (doctorId: number, date: string) =>
    apiClient.get<string[]>('/bookings/available-slots', { params: { doctor_id: doctorId, date } }).then(r => r.data),

  getDailyDensity: (start: string, end: string) =>
    apiClient.get<{ data: { date: string; count: number }[] }>('/bookings/doctor/daily-density', { params: { start, end } }).then(r => r.data),
};
```

### 4.6 TanStack Query Strategy

```typescript
// Query Keys Pattern
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (params: BookingListParams) => [...bookingKeys.lists(), params] as const,
  myBookings: (page: number) => [...bookingKeys.all, 'my', page] as const,
  doctorBookings: (page: number) => [...bookingKeys.all, 'doctor', page] as const,
  detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
  availableSlots: (doctorId: number, date: string) =>
    [...bookingKeys.all, 'slots', doctorId, date] as const,
};

// Example Hook
export function useMyBookings(page = 1, limit = 10) {
  return useQuery({
    queryKey: bookingKeys.myBookings(page),
    queryFn: () => bookingService.getMyBookings(page, limit),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bookingService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success('Cita creada exitosamente');
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.error || 'Error al crear la cita');
    },
  });
}
```

### 4.7 Permission Matrix

```typescript
// src/shared/constants/permissions.ts

export const ROLE_PERMISSIONS = {
  superadmin: {
    dashboard: true,
    tenants: { view: true, create: true, edit: true, delete: true },
    users: { view: true, edit: true, toggleActive: true },
    doctors: { view: true, create: true, edit: true, invite: true },
    bookings: { view: true, create: true, cancel: true },
    clinicalRecords: { view: true, create: true, edit: true, delete: true },
    billing: { view: true, create: true, edit: true, delete: true },
    laboratory: { view: true, create: true, edit: true },
    analytics: { view: true },
    audit: { view: true },
    specialties: { view: true, create: true, edit: true, delete: true },
    saas: { view: true, manage: true },
  },
  admin: {
    dashboard: true,
    doctors: { view: true, create: true, invite: true },
    bookings: { view: true, create: true, cancel: true },
    clinicalRecords: { view: true },
    billing: { view: true, create: true, edit: true, delete: true },
    laboratory: { view: true, create: true, edit: true },
    analytics: { view: true },
    audit: { view: true },
    specialties: { view: true, create: true, edit: true, delete: true },
  },
  doctor: {
    dashboard: true,
    bookings: { view: true },
    availability: { view: true, create: true, delete: true },
    clinicalRecords: { view: true, create: true, edit: true, delete: true },
    prescriptions: { view: true, create: true, edit: true, delete: true },
    laboratory: { view: true, validate: true, sign: true },
    analytics: { myStats: true },
  },
  lab_technician: {
    dashboard: true,
    laboratory: { view: true, create: true, edit: true, validate: true, deliver: true },
  },
  patient: {
    dashboard: true,
    bookings: { view: true, create: true, cancel: true },
    clinicalRecords: { view: true },
    laboratory: { view: true },
  },
  guest: {
    bookings: { create: true, view: true, cancel: true },
  },
} as const;

export type Permission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS];
```

### 4.8 Design System Tokens

```typescript
// src/app/config/theme.config.ts

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB',        // Blue-600 (medical trust)
      light: '#60A5FA',       // Blue-400
      dark: '#1D4ED8',        // Blue-700
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#10B981',        // Emerald-500 (health)
      light: '#34D399',       // Emerald-400
      dark: '#059669',        // Emerald-600
    },
    error: {
      main: '#EF4444',        // Red-500
    },
    warning: {
      main: '#F59E0B',        // Amber-500
    },
    info: {
      main: '#3B82F6',        // Blue-500
    },
    success: {
      main: '#10B981',        // Emerald-500
    },
    background: {
      default: '#F8FAFC',     // Slate-50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',     // Slate-900
      secondary: '#64748B',   // Slate-500
    },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontWeight: 400, lineHeight: 1.6 },
    body2: { fontWeight: 400, lineHeight: 1.5 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.05)',
    '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
    '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
    ...Array(14).fill('0 25px 50px rgba(0,0,0,0.15)'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
  },
});
```

### 4.9 Error Handling Strategy

```typescript
// src/shared/services/error-handler.ts

import { toast } from 'react-toastify';

interface ApiErrorResponse {
  error: string;
  statusCode?: number;
  code?: string;
  stack?: string;
}

export function handleApiError(error: unknown): void {
  if (!axios.isAxiosError(error)) {
    toast.error('Error inesperado. Intenta de nuevo.');
    return;
  }

  const status = error.response?.status;
  const data = error.response?.data as ApiErrorResponse | undefined;
  const message = data?.error || error.message;

  switch (status) {
    case 400:
      toast.warning(message || 'Datos inválidos');
      break;
    case 401:
      toast.error('Sesión expirada. Inicia sesión nuevamente.');
      break;
    case 403:
      toast.error('No tienes permisos para esta acción');
      break;
    case 404:
      toast.info('Recurso no encontrado');
      break;
    case 409:
      toast.warning(message || 'Conflicto con datos existentes');
      break;
    case 429:
      toast.warning('Demasiadas solicitudes. Espera un momento.');
      break;
    case 500:
      toast.error('Error del servidor. Intenta más tarde.');
      break;
    default:
      toast.error(message || 'Error de conexión');
  }
}
```

### 4.10 Component State Patterns

```typescript
// Every page follows this pattern:

// 1. Loading State
if (isLoading) return <LoadingState />;

// 2. Error State
if (isError) return <ErrorState error={error} onRetry={refetch} />;

// 3. Empty State
if (!data?.data.length) return <EmptyState icon="..." title="..." action={...} />;

// 4. Forbidden State
if (error?.status === 403) return <ErrorState variant="forbidden" />;

// 5. Content
return <Content data={data} />;
```

### 4.11 Lazy Loading & Code Splitting

```typescript
// src/app/router/lazy.tsx

import { lazy } from 'react';

// Auth
export const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'));
export const RegisterPage = lazy(() => import('@/modules/auth/pages/RegisterPage'));
export const ForgotPasswordPage = lazy(() => import('@/modules/auth/pages/ForgotPasswordPage'));
export const ResetPasswordPage = lazy(() => import('@/modules/auth/pages/ResetPasswordPage'));

// Bookings
export const BookingPage = lazy(() => import('@/modules/bookings/pages/BookingPage'));
export const MyBookingsPage = lazy(() => import('@/modules/bookings/pages/MyBookingsPage'));

// Clinical Records
export const ClinicalRecordsPage = lazy(() => import('@/modules/clinical-records/pages/ClinicalRecordsPage'));
export const ClinicalRecordDetailPage = lazy(() => import('@/modules/clinical-records/pages/ClinicalRecordDetailPage'));

// Laboratory (large module - split further)
export const LabDashboardPage = lazy(() => import('@/modules/laboratory/pages/LabDashboardPage'));
export const LabRequestsPage = lazy(() => import('@/modules/laboratory/pages/LabRequestsPage'));
export const LabRequestDetailPage = lazy(() => import('@/modules/laboratory/pages/LabRequestDetailPage'));
export const LabEquipmentPage = lazy(() => import('@/modules/laboratory/pages/LabEquipmentPage'));

// Analytics (charts are heavy)
export const AdminAnalyticsPage = lazy(() => import('@/modules/analytics/pages/AdminAnalyticsPage'));

// Super Admin
export const SuperAdminDashboardPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminDashboardPage'));
export const SuperAdminTenantsPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminTenantsPage'));
```

### 4.12 SSE (Server-Sent Events) for Lab Real-time

```typescript
// src/modules/laboratory/services/lab-sse.service.ts

class LabSSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect(): void {
    this.eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/laboratory/events`,
      { withCredentials: true }
    );

    this.eventSource.addEventListener('connected', (e) => {
      console.log('[SSE] Connected:', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('new-request', (e) => {
      this.emit('new-request', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('status-change', (e) => {
      this.emit('status-change', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('notification', (e) => {
      this.emit('notification', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('metrics', (e) => {
      this.emit('metrics', JSON.parse(e.data));
    });

    this.eventSource.onerror = () => {
      console.warn('[SSE] Connection lost. Reconnecting in 5s...');
      this.disconnect();
      setTimeout(() => this.connect(), 5000);
    };
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}

export const labSSE = new LabSSEService();
```

### 4.13 FullCalendar Integration

```typescript
// src/modules/bookings/components/BookingCalendar.tsx

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Events from API → FullCalendar format
const events = bookings.map(booking => ({
  id: String(booking.id),
  title: `${booking.guest_name || 'Paciente'} - Dr. ${booking.doctor_name}`,
  start: `${booking.date}T${booking.time}`,
  end: calculateEndTime(booking.date, booking.time, booking.duration),
  backgroundColor: getStatusColor(booking.status),
  borderColor: getStatusColor(booking.status),
  extendedProps: { booking },
}));

<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
  events={events}
  eventClick={handleEventClick}
  selectable
  select={handleDateSelect}
  locale="es"
  businessHours={doctorAvailability}
  slotMinTime="08:00:00"
  slotMaxTime="20:00:00"
  allDaySlot={false}
/>
```

### 4.14 Recharts Dashboard Patterns

```typescript
// src/modules/analytics/components/BookingsByMonthChart.tsx

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function BookingsByMonthChart({ data }: { data: BookingsByMonth[] }) {
  return (
    <Card>
      <PageHeader title="Citas por Mes" />
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="confirmed" name="Confirmadas" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cancelled" name="Canceladas" fill="#EF4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="total" name="Total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

### 4.15 TanStack Table (DataTable) Pattern

```typescript
// src/shared/components/ui/DataTable.tsx

import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { useState } from 'react';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

export function DataTable<T>({
  data, columns, totalCount, page, pageSize,
  onPageChange, onSearch, searchPlaceholder, actions
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pageSize),
    state: { sorting, globalFilter, pagination: { pageIndex: page - 1, pageSize } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  return (
    <Card>
      {/* Search + Actions bar */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        {onSearch && (
          <TextField
            placeholder={searchPlaceholder || 'Buscar...'}
            value={globalFilter}
            onChange={(e) => { setGlobalFilter(e.target.value); onSearch(e.target.value); }}
            InputProps={{ startAdornment: <SearchIcon /> }}
            size="small"
            sx={{ minWidth: 300 }}
          />
        )}
        <Box sx={{ flex: 1 }} />
        {actions}
      </Stack>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow key={row.id} hover>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page - 1}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Card>
  );
}
```

---

## 5. Consistency Checklist

Before every PR:
- [ ] No `any` types — use proper TypeScript types
- [ ] No direct Axios calls from components — use service layer
- [ ] Every API call uses TanStack Query (useQuery/useMutation)
- [ ] Every page handles loading, error, empty, forbidden states
- [ ] Every form uses React Hook Form + Zod validation
- [ ] Every table uses DataTable component with search/filter/sort/pagination
- [ ] Every chart uses Recharts with ResponsiveContainer
- [ ] Every list item has a unique `key` prop
- [ ] No inline styles — use MUI sx or styled components
- [ ] No console.log in production code
- [ ] Accessibility: all interactive elements keyboard navigable
- [ ] Responsive: works on 320px, 768px, 1024px, 1440px+
- [ ] i18n: all user-facing text uses translation function
- [ ] Lazy loading for all page-level components

---

## 6. Known Backend Inconsistencies (Frontend Should Handle)

1. **patient module is empty** — no dedicated patient endpoints. Patient data comes from `users` table.
2. **Stripe is stubbed** — checkout/subscription endpoints return mock data.
3. **SSE endpoint** (`/api/laboratory/events`) requires auth but browser EventSource doesn't support headers — may need `fetch`-based approach.
4. **Some endpoints return `data` wrapper, some don't** — frontend should normalize.
5. **i18n: only `es` and `en` are active** — `pt` and `fr` are deprecated.
6. **Refresh tokens** — backend supports both cookie and body delivery; frontend should use cookie-based for SPA.
7. **Feature flags** — `/api/saas/features` returns feature toggles per tenant; frontend must gate UI accordingly.

---

*Generated: 2026-07-20 | Backend Analysis: 14 modules, 111 endpoints, 32 tables, 62 indexes*

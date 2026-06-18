# Entidades

> Descripción detallada de cada tabla en la base de datos.

## 1. Tenants

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  locale TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Santiago',
  config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Propósito: Almacena los clientes (clínicas) del sistema multi-tenant.

## 2. Users

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('superadmin','admin','doctor','lab_technician','patient','guest','user')),
  rut TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  blocked_until TIMESTAMPTZ,
  no_show_count INT DEFAULT 0,
  password_changed BOOLEAN DEFAULT false,
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT false,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  token_version INTEGER DEFAULT 0,
  ...
  tenant_id TEXT NOT NULL DEFAULT 'default'
);
```

Propósito: Usuarios del sistema con soporte para 2FA, bloqueo y control de sesiones.

## 3. Doctors

```sql
CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT,
  user_id INT UNIQUE REFERENCES users(id),
  slot_duration INT DEFAULT 30 CHECK (slot_duration IN (15,30,45,60)),
  ...
);
```

Propósito: Perfiles médicos asociados a usuarios.

## 4. Bookings

```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES doctors(id),
  user_id INT REFERENCES users(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT DEFAULT 30,
  status TEXT DEFAULT 'pending',
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT UNIQUE,
  guest_rut TEXT, guest_name TEXT, guest_email TEXT, guest_phone TEXT,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  CONSTRAINT unique_booking UNIQUE (doctor_id, date, time),
  CONSTRAINT check_guest_or_user CHECK (user_id IS NOT NULL OR (guest_rut IS NOT NULL AND guest_email IS NOT NULL)),
  ...
);
```

Propósito: Reservas de citas médicas. Soporta usuarios registrados e invitados.

## 5. Doctor Availability

```sql
CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES doctors(id),
  day_of_week INT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT check_time_range CHECK (start_time < end_time),
  ...
);
```

Propósito: Bloques de disponibilidad semanal por doctor.

## 6. Doctor Exceptions

```sql
CREATE TABLE doctor_exceptions (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERNCES doctors(id),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN DEFAULT FALSE,
  ...
);
```

Propósito: Excepciones a la disponibilidad regular (días completos o parciales).

## 7. Clinical Records

```sql
CREATE TABLE clinical_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES doctors(id),
  booking_id INTEGER REFERENCES bookings(id),
  chief_complaint TEXT NOT NULL,
  anamnesis TEXT, vital_signs JSONB,
  physical_exam TEXT, diagnosis TEXT,
  cie10_codes TEXT[], treatment_plan TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','completed','cancelled')),
  ...
);
```

Propósito: Registros clínicos en formato SOAP. `vital_signs` es JSONB para flexibilidad.

## 8. Prescriptions

```sql
CREATE TABLE prescriptions (
  id SERIAL PRIMARY KEY,
  clinical_record_id INTEGER REFERENCES clinical_records(id),
  medication VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(100), instructions TEXT,
  route VARCHAR(50) DEFAULT 'oral',
  ...
);
```

Propósito: Recetas/prescripciones asociadas a registros clínicos.

## 9. CIE-10 Catalog

```sql
CREATE TABLE cie10_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  ...
);
```

Propósito: Catálogo de códigos CIE-10 (26 códigos precargados).

## 10. Audit Logs

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50), resource_id INTEGER,
  old_values JSONB, new_values JSONB,
  ip_address INET, user_agent TEXT,
  hash VARCHAR(64), previous_hash VARCHAR(64),
  ...
);
```

Propósito: Logs de auditoría encadenados con HMAC-SHA256.

## 11. Invoices

Tabla principal de facturación con items, pagos y reclamos a seguros.

## 12. Lab Tests / Requests / Items

Catálogo de exámenes, solicitudes y resultados de laboratorio.

## 13. SaaS: Plans / Subscriptions / Tenant Features / Tenant Usage

Planes de suscripción, suscripciones activas, features por tenant y uso medido.

---

Tags: #base-de-datos #entidades #tablas

# Consumo de API

> Capa de comunicación entre frontend y backend.

## Módulos API (10)

| Archivo | Funciones | Endpoints |
|---------|-----------|-----------|
| `bookings.js` | CRUD reservas, slots disponibles | `/api/bookings/*` |
| `doctors.js` | CRUD doctores, públicos | `/api/doctors/*` |
| `specialties.js` | CRUD especialidades | `/api/specialties/*` |
| `clinicalRecords.js` | CRUD registros clínicos, CIE-10 | `/api/clinical-records/*` |
| `laboratory.js` | Tests, solicitudes, resultados | `/api/laboratory/*` |
| `availability.js` | Disponibilidad semanal | `/api/availability/*` |
| `exceptions.js` | Excepciones de disponibilidad | `/api/exceptions/*` |
| `saas.js` | Planes, suscripciones, uso | `/api/saas/*` |
| `super-admin.js` | Gestión de tenants | `/api/super-admin/*` |

## Cliente Axios (`axios.js`)

Configuración:
- `baseURL`: Desde `VITE_API_URL` (default `/api`)
- **Request interceptor**: Inyecta `Authorization: Bearer <token>` desde AuthContext
- **Response interceptor**: En 401, intenta refresh automático; si falla, redirige a login
- **Headers**: `Content-Type: application/json`

---

Tags: #frontend #api #axios

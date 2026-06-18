# Módulo Analytics

> Dashboard analítico y KPIs del sistema.

## Ubicación: `src/modules/analytics/`

| Archivo | Propósito |
|---------|-----------|
| `analytics.controller.ts` | Handlers de rutas |
| `analytics.service.ts` | Consultas analíticas |
| `analytics.routes.ts` | Definición de rutas |

## Endpoints: `/api/analytics`

- `GET /dashboard` — KPIs principales (admin/superadmin)
- `GET /bookings-by-month` — Reservas por mes
- `GET /top-doctors` — Doctores más solicitados
- `GET /status-distribution` — Distribución de estados
- `GET /my-stats` — Estadísticas del doctor
- `GET /no-shows` — Análisis de inasistencias
- `GET /diagnoses` — Diagnósticos más frecuentes
- `GET /demand` — Pronóstico de demanda
- `GET /schedules` — Análisis de horarios
- `GET /vitals` — Signos vitales (estadísticas)

## Visualización

Los datos son consumidos por el frontend usando Recharts para gráficos interactivos.

---

Tags: #modulo #analytics #dashboard

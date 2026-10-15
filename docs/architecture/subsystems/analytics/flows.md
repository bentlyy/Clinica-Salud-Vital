# SUB-12 — Flujos

## F1. Dashboard del tenant

```
GET /api/analytics/dashboard   (authMiddleware + authorize admin|superadmin)
   -> analytics.controller.getDashboardStats
   -> analytics.service.getDashboardStats(tenant_id)
       * total_patients = users.role='user'  (NO incluye role='patient'; ver FND-L5)
       * total_doctors  = doctors por tenant
       * bookings: total / today / confirmed / cancelled (tenant)
   -> res.json({ data })
```

## F2. Serie mensual de citas

```
GET /api/analytics/bookings-by-month?months=N
   -> getQueryInt(months, 12)   (sin cota superior; ver FND-L10)
   -> SELECT to_char(date,'YYYY-MM'), total, confirmed, cancelled
        FROM bookings
        WHERE date >= NOW() - INTERVAL '1 months' * N AND tenant_id = $2
        GROUP BY 1 ORDER BY 1
```

## F3. Top doctores / distribución por estado

```
GET /api/analytics/top-doctors?limit=N
   -> LEFT JOIN bookings (status != 'cancelled', mismo tenant) -> total/confirmed
      ORDER BY total_bookings DESC LIMIT N
GET /api/analytics/status-distribution
   -> GROUP BY status WHERE tenant_id = $1
```

## F4. Estadísticas del doctor (`/my-stats`)

```
GET /api/analytics/my-stats   (authorize 'doctor')
   -> doctorService.getDoctorByUserId(req.user.id, tenant_id)
       * si no existe perfil -> NotFoundError('Doctor profile not found')
   -> Promise.all([ total, upcoming, patients_served(DISTINCT user|guest_rut), clinical_records ])
```

## F5. Analítica clínica (diagnósticos, no-shows, vitales)

```
GET /api/analytics/diagnoses   -> clinical_records: GROUP BY diagnosis (top 20, tenant)
GET /api/analytics/no-shows    -> doctors LEFT JOIN bookings 6 meses: total vs status='no_show'
GET /api/analytics/vitals      -> clinical_records.vital_signs (30 días, LIMIT 50)
       * reglas: presión>140/90, FC>100|<60, T>37.5|<36
       * mlScore = 0  (no hay ML; ver FND-L4)
```

## F6. Predicción de demanda (SMA)

```
GET /api/analytics/demand?days=N
   -> query diaria + stats(AVG, STDDEV)
   -> smaForecast(historical, horizon=7, fallback=avg)
       * base = promedio de las últimas 7 (o AVG); 7 puntos futuros con la misma base
   -> [...historical, ...forecast]
   * si la query principal falla -> fallback query simple (sin forecast)
```

## F7. Generación asíncrona de informe

```
POST /api/reports/generate   (authorize admin|superadmin; generateReportSchema .strict())
   -> report.service.createReport(type, config, user_id, tenant_id)
       * valida type en ['appointments','revenue','patients','laboratory','custom']
       * INSERT reports(status='generating', config=JSON)
       * enqueueJob('report:generate', { reportId, tenantId })
   -> responde la fila (status 'generating')

(queue) poll 2s -> UPDATE jobs ... FOR UPDATE SKIP LOCKED
   -> worker report:generate -> report.service.processReport(reportId, tenantId)
       * genera por tipo (ver F8) -> UPDATE reports SET status='completed', result_url=JSON
       * error -> status='failed' (reintenta hasta 3; luego dead + notifyCritical)
```

## F8. Generadores de informe (SQL)

```
appointments -> bookings LEFT JOIN users p ON b.user_id=p.id
                          LEFT JOIN doctors d ON b.doctor_id = d.user_id   <-- JOIN INCORRECTO (FND-L2)
                          LEFT JOIN specialties s ON d.specialty = s.name
revenue      -> invoices + invoice_items (json_agg); totalRevenue = Σ total_amount
patients     -> users role IN ('user','patient') LEFT JOIN bookings (todos, incluso 0 citas) (FND-L8)
laboratory   -> lab_requests LEFT JOIN users p ON lr.patient_id=p.id
                              LEFT JOIN users u ON lr.doctor_id = u.id    <-- JOIN INCORRECTO (FND-L3)
custom       -> { message, type }
```

## F9. Descarga de informe (cliente)

```
GET /api/reports/:id   (polling)
   -> report.service.getById(id, tenant_id)   -> devuelve row con result_url (JSON string)

(frontend) ReportsPage: downloadReport(type, result_url, date_from, date_to)
   -> JSON.parse(result_url)
   -> generateXReport(rows, ...) -> CSV en memoria (BOM UTF-8)
   -> Blob + URL.createObjectURL -> descarga {citas|ingresos|pacientes|laboratorio}_*.csv
   * el endpoint /reports/:id/pdf NO se usa desde el SPA (FND-L6)
```

## F10. Descarga PDF de informe (endpoint backend, no consumido por el SPA)

```
GET /api/reports/:id/pdf   (authorize admin|superadmin)
   -> report.service.getByIdParsed(id, tenant_id)   (JSON.parse de result_url; FND-L7)
   -> import report-pdf.service -> generateReportPDF(report, tenant_id) -> Buffer
   -> headers: application/pdf; attachment; nosniff; no-store
```

## F11. Scrape de métricas Prometheus

```
GET /metrics | /api/metrics   (montado app.ts:141-142, ANTES de auth y rate limiter)
   -> metricsHandler:
        token = METRICS_TOKEN  (si está definido: exige Authorization: Bearer <token>)
        refreshSystemMetrics()  -> os.loadavg, fs.statfsSync('/')
        refreshDbMetrics()      -> pool counts + pg_stat_activity/pg_database_size
   -> registry.metrics() (texto Prometheus)
   * si METRICS_TOKEN no está definido -> público (FND-L1)
   * metricsMiddleware (app.ts:195) instrumenta cada request (path normalizado a :id)
```

# SUB-8 — Flujos

## F1. Crear solicitud (`POST /api/laboratory`, `admin`/`doctor`)

```
authMiddleware → requireFeature('laboratory') → authorize(admin,doctor)
 → validateZod(createLabRequestSchema) → controller.createLabRequest
    doctor = getDoctorByUserId(req.user.id, tenant)          ← 404 si no es doctor (FND-E11)
    service.createLabRequest({...body, doctor_id: doctor.id}, tenant):
      BEGIN
      INSERT lab_requests (request_number generado, retry 23505 x3)   ← LAB-YYYY-NNNNNN
      SELECT lab_tests WHERE id = ANY(test_ids) AND active AND tenant
         ↳ si faltan tests → 400 LAB_TESTS_NOT_FOUND
      INSERT lab_request_items (bulk, parametrizado)
      COMMIT
    emit NEW_REQUEST + METRICS_UPDATE (SSE, canal por tenant)
    201 {request}
```

> No valida relación médico-paciente ni pertenencia de `clinical_record_id` (FND-E7).

## F2. Captura de resultado (`PATCH /api/laboratory/items/:item_id/result`)

```
authorize(admin,superadmin,doctor,lab_technician)
 → updateLabRequestItemResult(item_id, result_value, tenant, result_notes):
      UPDATE lab_request_items SET result_value, result_notes, updated_at
      WHERE id AND tenant                                       ← 404 si no existe
      ⚠ NO cambia status a 'result_entered' (FND-E2)
   emit METRICS_UPDATE
```

## F3. Validación y entrega (tech → doctor → firma → entrega)

```
PATCH /items/:item_id/validate-tech   (admin,superadmin,lab_technician)
   UPDATE ... SET status='validated_tech'  WHERE status IN ('result_entered','processing')
      ↳ 400 LAB_ITEM_INVALID_STATUS si no cumple   ⚠ F2 no llevó a 'result_entered' (FND-E2)

PATCH /items/:item_id/validate-doctor (admin,superadmin,doctor)
   UPDATE ... SET status='validated_doctor' WHERE status='validated_tech'  ← 400 si no

PATCH /items/:item_id/sign            (admin,superadmin,doctor)
   UPDATE ... SET status='signed'           WHERE status='validated_doctor'

PATCH /items/:item_id/deliver         (admin,superadmin,lab_technician)
   BEGIN
   UPDATE lab_request_items SET status='delivered', delivered_at, delivery_method
   SELECT COUNT(*) ítems restantes != delivered/cancelled
   si 0: UPDATE lab_requests SET status='delivered', completed_at
         → prepara createNotification(patient, 'Resultados publicados')
   COMMIT
   createNotification (in-app, tras commit)
```

## F4. Muestras (`POST /samples`, `PATCH /samples/:id/{receive,verify,assign,qc,reject}`)

```
POST /samples (admin,superadmin,lab_technician):
   sample_code = SMP-NNNNNN                                    ⚠ sin unicidad (FND-E7)
   INSERT lab_samples (..., received_by=req.user.id, reception_time=NOW(), tenant)
   INSERT lab_notifications 'Muestra recibida'
receive  → status='received'
verify   → status='verified', verification_time, verified_by
assign   → status='assigned', assigned_tech_id, assigned_equipment_id
qc       → qc_status, qc_notes; si 'failed' → lab_notifications 'critical'
reject   → status='rejected', rejection_reason
```

## F5. Dashboard y analytics (`GET /dashboard`, `/dashboard/analytics`)

```
getDashboardMetrics(tenant, areaId?)  → Promise.all de 6 queries (readPool):
   statusCounts, avgTime, samplesToday, productivity, slaBreached, slaAtRisk
getAnalyticsData(tenant)             → Promise.all de 8 queries:
   daily, monthly, byDoctor, byArea, topTests, revenue, repeatRate, sla
   ⚠ by_priority=[], avg_processing_time=0, error_rate=0 (placeholders, FND-E8)
```

## F6. Entrega pública de resultados por token

```
POST /results/email (admin,superadmin,doctor,lab_technician)
   email = req.body.email  (si falta → patient_email)
   sendLabResultsByEmail(id, email, tenant):
      getLabResultsByRequest(id, tenant)                       ← PHI completo
      token = signInvite({scope:'lab-result', labRequestId, tenantId, email}, '7d')
      link = FRONTEND_URL + '/lab-results?token=' + token
      enqueueJob('email:send', {type:'lab-results', to:email, html, tenantId})
      ⚠ `to` es arbitrario y no se valida ownership de la orden (FND-E1)

GET /results/shared/:token   (PÚBLICO)
   getLabResultsByToken(token):
      payload = verify(token)  → require scope='lab-result' + labRequestId + tenantId
      getLabResultsByRequest(payload.labRequestId, payload.tenantId)   ← filtra por tenant del token
   ⚠ sin rate limiter; token reutilizable 7d; acepta ?token= en query (FND-E5)
```

## F7. Eventos SSE (`GET /events`)

```
handleLabEvents (admin,superadmin,lab_technician):
   tenantId = (superadmin con ?tenant_id) o req.tenant_id
   res.writeHead(200, text/event-stream …)
   por cada LAB_EVENT: onLabEvent(event, tenantId, listener → res.write)
   heartbeat setInterval 30s
   req.on('close'): clearInterval + off listeners
   ⚠ EventEmitter local → no multi-instancia
```

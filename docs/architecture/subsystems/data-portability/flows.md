# SUB-14 — Flujos

## F1. Export de datos del propio usuario

```
GET /api/export/me   (authMiddleware)
  -> exportMeCtrl: exportPatientData(req.user.id, req.tenant_id)
     -> SELECT users (safe fields) WHERE id=$1 AND tenant_id=$2  [NotFound si 0]
     -> redactPatient (elimina password, totp_secret, token_version, ...)
     -> Promise.all: bookings, clinical_records, medical_history, lab_requests,
        invoices, prescriptions
     -> Promise.all: lab_request_items, invoice_items, payments, attachments
     -> { exported_at, schema_version, patient, bookings, clinical_records,
          prescriptions, medical_history, lab_requests[], invoices[], attachments[] }
  -> Content-Disposition: attachment; filename="patient-data-<id>.json"
  -> res.json({ data })
```

## F2. Export de un paciente (por admin/doctor/paciente)

```
GET /api/export/patients/:patientId
  (authMiddleware + authorize('admin','doctor','superadmin','patient') + validate params)
  -> if role==='patient' && requesterId !== patientId -> ForbiddenError
  -> exportPatientData(patientId, req.tenant_id)   (mismo agregado que F1)
  -> res.json({ data })
* No valida que patientId sea un paciente; no registra auditoría del acceso (FND-N4/N8)
```

## F3. Alta de suscripción de webhook

```
POST /api/webhooks  (authMiddleware + authorize('admin','superadmin'))
  validateZod(createWebhookSchema { url, events[>=1], secret? })
  -> createCtrl -> createSubscription(tenant_id, user.id, body)
       assertValidUrl  (bloquea IP/host privado — SSRF básico)
       assertValidEvents
       secret = provisto || randomBytes(32).hex
       INSERT webhook_subscriptions(..., secret, events, active=TRUE, created_by)
       RETURNING ... ; devuelve { ...subscription, secret }   (secreto en claro — FND-N2)
```

## F4. Entrega de un evento (prevista — NO CONECTADA)

```
[dominio: booking/lab/billing]  -> debería llamar dispatchEvent(event, payload, tenant_id)
   (HOY: ningún módulo llama dispatchEvent — FND-N1)
   -> SELECT webhook_subscriptions WHERE tenant_id=$1 AND active AND $2 = ANY(events)
   -> por suscripción: enqueueJob('webhook:dispatch', { subscriptionId, url, secret, event, payload, tenantId })
        -> worker webhook:dispatch  (registrado en queue.service.ts:151-152)
           -> dispatchWebhook(...)
                timestamp = ISO now
                body = JSON({ event, payload, timestamp })
                signature = HMAC_SHA256(secret, `${timestamp}.${JSON.stringify({event,payload})}`)
                fetch(url, POST, { X-Webhook-Signature, X-Webhook-Event, X-Webhook-Timestamp },
                      timeout 10s, redirect: follow)   <-- SSRF vía redirect (FND-N3)
                respuesta OK -> logger.info ; error -> throw (reintento por cola)
   * No se escribe webhook_deliveries (FND-N5)
```

## F5. Baja/actualización de suscripción

```
PUT /api/webhooks/:id  -> updateSubscription(id, tenant_id, body)  (valida URL/eventos si se envían)
DELETE /api/webhooks/:id -> deleteSubscription(id, tenant_id)  (DELETE físico; ON DELETE CASCADE a deliveries)
```

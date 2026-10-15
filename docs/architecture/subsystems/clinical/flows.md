# SUB-7 — Flujos

## F1. Crear ficha clínica (`POST /api/clinical-records`, doctor)

```
phiWriteLimiter → authMiddleware → authorize('doctor') → validateZod(createClinicalRecordSchema)
   controller.createClinicalRecord:
      doctor = getDoctorByUserId(req.user.id, tenant)         ← 404 si no existe perfil
      service.createClinicalRecord({...body, doctor_id: doctor.id}, tenant)
         BEGIN
         si booking_id: advisory lock + anti-duplicado (booking ya tiene ficha)
         verifica paciente existe en tenant  ✓
         verifica booking existe en tenant   ✓
         sanitizeTextStrict(6 campos PHI)
         INSERT clinical_records
         si lab_test_ids: valida tests activos → INSERT lab_requests + lab_request_items
         COMMIT
      ⚠ NO valida relación médico↔paciente (FND-C1)
   201 {ficha}
```

## F2. Leer ficha por id

```
GET /:id → controller.getClinicalRecordById:
   record = service.getClinicalRecordById(id, tenant)   (RLS + tenant filter)
   si doctor: doctor = getDoctorByUserId → record.doctor_id !== doctor.id → 403
   si user/patient: record.patient_id !== req.user.id → 403
   adjunta prescriptions + lab_results
   200 {ficha, prescriptions, lab_results}
```

## F3. Listar fichas por paciente (doctor) — chequeo de relación inline

```
GET /patient/:patient_id → controller:
   si doctor:
      existingRecords = getClinicalRecordsByPatient(patientId, tenant)
      hasRelationship = existingRecords.some(r => r.doctor_id === doctor.id)
      hasBooking = doesDoctorHaveBookingWithPatient(doctor.id, patientId, tenant)
      si !hasRelationship && !hasBooking → 403 (ACCESS_DENIED)
      devuelve solo las fichas de ESE doctor para ese paciente
   si admin/superadmin: devuelve todas (tenant del request)
```

## F4. Crear receta (`POST /api/clinical-records/prescriptions`, doctor)

```
doctor = getDoctorByUserId
service.createPrescription(body, doctor.id, tenant):
   BEGIN
   advisory lock create_prescription:<recordId>
   record = SELECT ... clinical_records WHERE id AND tenant
   si record.doctor_id !== doctor.id → PRESCRIPTION_OWN_ONLY
   anti-duplicado: misma medication (ILIKE) en la ficha
   INSERT prescriptions
   COMMIT
```

## F5. Antecedentes médicos (`medical-history`) — relación fail-closed

```
POST /api/medical-history (doctor)
   controller.createMedicalHistory:
      si doctor: assertDoctorAccessToPatient(userId, patient_id, tenant)   ← ownership.ts
      assertPatientInTenant(patient_id, tenant)
      service.createMedicalHistory(body, tenant)
   (admin/superadmin: omiten el chequeo de relación; superadmin usa tenant 'default')
```

## F6. Descargar PDF de receta

```
GET /prescriptions/:id/pdf (doctor|user|patient)
   prescription = getPrescriptionById(id, tenant)     ← 404 cross-tenant
   si doctor: prescription.doctor_id !== doctor.id → 403
   si user/patient: prescription.patient_id !== req.user.id → 403
   generatePrescriptionPDF(id, tenant) → headers no-store + nosniff → application/pdf
```

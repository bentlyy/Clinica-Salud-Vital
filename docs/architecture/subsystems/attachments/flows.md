# SUB-9 — Flujos

## F1. Subida de adjunto

```
POST /api/attachments  (doctor|admin|superadmin|patient|user)
  body: { entity_type, entity_id, file_name, mime_type, data_base64 }   [.strict()]
   |
   v
controller.resolveDoctorId()  -> si role=doctor: getDoctorByUserId -> doctor.id
   |
   v
service.uploadAttachment()
   - ALLOWED_ENTITIES? -> si no, BadRequest
   - entity_id > 0?    -> si no, BadRequest
   - ALLOWED_MIME?     -> si no, "Tipo de archivo no permitido"
   - data_base64 presente?
   - ownership = getEntityOwnership(entity_type, entity_id, tenant_id)
   - assertOwnership()  (admin/superadmin ok; doctor=attending; patient/user=self)
   - buffer = Buffer.from(data_base64,'base64')      [nunca lanza -> try/catch muerto]
   - 0 < buffer.length <= 10MB ?  (efectivamente limitado por express.json 100kb) [FND-K1]
   - mkdir <UPLOAD_ROOT>/<tenant>; storedName = random.hex + ext
   - fs.writeFile(...)
   - INSERT attachments (...) RETURNING ...
   -> 201 record
```

## F2. Listado y descarga

```
GET /api/attachments?entity_type&entity_id      (roles varios)
   -> ownership + assertOwnership
   -> SELECT ... WHERE tenant_id AND entity_type AND entity_id ORDER BY created_at ASC
   -> { data: [...] }        (sin paginación)

GET /api/attachments/:id/download
   -> SELECT record WHERE id AND tenant_id   (NotFound si no existe)
   -> ownership del entity_type/entity_id + assertOwnership
   -> filePath = <UPLOAD_ROOT>/<tenant>/<stored_name>
   -> existsSync? si no -> NotFound
   -> headers: Content-Type=mime_type; Content-Disposition=inline; filename=...
   -> createReadStream(filePath).pipe(res)      (sin X-Content-Type-Options: nosniff)
```

## F3. Borrado

```
DELETE /api/attachments/:id
   -> SELECT record; ownership + assertOwnership
   -> si role no es admin/superadmin/doctor Y record.uploaded_by != user -> Forbidden
   -> DELETE FROM attachments WHERE id AND tenant_id
   -> fs.unlink (ignora error si falta)   [archivo huérfano tolerado]
```

## F4. PDF de receta

```
GET /api/clinical-records/prescriptions/:id/pdf   (doctor|user|patient)
   -> getPrescriptionById(id, tenant_id)
   -> doctor:  debe ser prescription.doctor_id
      user/patient: debe ser prescription.patient_id
   -> generatePrescriptionPDF(id, tenant_id)  -> Buffer (pdfkit)
   -> Content-Type application/pdf; Disposition attachment; nosniff; no-store
```

## F5. PDF de orden de laboratorio

```
GET /api/laboratory/:id/pdf   (admin|superadmin|doctor|lab_technician|user|patient)
   -> getLabRequestById(id, tenant_id)
   -> user/patient: debe ser request.patient_id
      doctor: debe ser request.doctor_id
   -> generateLabOrderPDF(id, tenant_id) -> Buffer
   -> headers pdf + nosniff + no-store
```

## F6. PDF de informe

```
GET /api/reports/:id/pdf   (authMiddleware + authorize('admin','superadmin'))
   -> getByIdParsed(id, tenant_id)
   -> generateReportPDF(report, tenant_id) -> Buffer
   -> headers pdf + nosniff + no-store
   * control de acceso = admin/superadmin del tenant (`report.routes.ts:16-17`)  [ver SUB-12]
```

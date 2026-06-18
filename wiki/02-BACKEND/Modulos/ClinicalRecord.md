# Módulo Clinical Record

> Historia Clínica Electrónica (EHR).

## Ubicación: `src/modules/clinical-record/`

| Archivo | Propósito |
|---------|-----------|
| `clinical-record.controller.ts` | Handlers de rutas |
| `clinical-record.service.ts` | CRUD de registros clínicos |
| `clinical-record.routes.ts` | Definición de rutas |
| `clinical-record.schema.ts` | Validación Zod |
| `cie10.service.ts` | Búsqueda de códigos CIE-10 |
| `prescription.service.ts` | Gestión de recetas |
| `prescription-pdf.service.ts` | Generación de PDF de recetas |

## Endpoints: `/api/clinical-records`

- CRUD completo de registros clínicos
- Búsqueda de diagnósticos CIE-10
- Gestión de prescripciones
- Descarga de PDF de recetas
- Vinculación con resultados de laboratorio

## Formato SOAP

Los registros clínicos siguen el formato SOAP:
- **S**ubjective: chief_complaint
- **O**bjective: vital_signs, physical_exam
- **A**ssessment: diagnosis, cie10_codes
- **P**lan: treatment_plan

## CIE-10

Catálogo precargado con 26 códigos CIE-10 comunes (desde `db/init.sql` seed data).

---

Tags: #modulo #clinical-record #ehr

# Clinical Record (EHR)

## Endpoints
- `GET /clinical-records` — Lista EHR
- `POST /clinical-records` — Crear (doctor)
- `GET /clinical-records/:id` — Detalle
- `GET /clinical-records/:id/pdf` — Receta PDF

## Features
- Historia clínica electrónica completa
- Prescripciones médicas
- Catálogo CIE-10 para diagnósticos
- Generación de PDF con PDFKit
- Asociado a bookings (cita → EHR)

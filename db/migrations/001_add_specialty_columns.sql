ALTER TABLE specialties
ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '🔬',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS department VARCHAR(255) DEFAULT '',
ADD COLUMN IF NOT EXISTS procedures JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#1976D2';

UPDATE specialties SET
  icon = CASE name
    WHEN 'Cardiología' THEN '❤️'
    WHEN 'Dermatología' THEN '🧴'
    WHEN 'Neurología' THEN '🧠'
    WHEN 'Pediatría' THEN '👶'
    WHEN 'Medicina General' THEN '🩺'
    WHEN 'Ginecología' THEN '🌸'
    WHEN 'Traumatología' THEN '🦴'
    WHEN 'Oftalmología' THEN '👁️'
    WHEN 'Psiquiatría' THEN '💭'
    WHEN 'Endocrinología' THEN '⚖️'
    WHEN 'Urología' THEN '🫀'
    WHEN 'Reumatología' THEN '🦋'
  END,
  description = CASE name
    WHEN 'Cardiología' THEN 'Diagnóstico y tratamiento de enfermedades del corazón y sistema circulatorio'
    WHEN 'Dermatología' THEN 'Cuidado de la piel, diagnóstico de enfermedades cutáneas y tratamientos estéticos'
    WHEN 'Neurología' THEN 'Estudio y tratamiento de trastornos del sistema nervioso central y periférico'
    WHEN 'Pediatría' THEN 'Atención médica integral para niños, adolescentes y control de su desarrollo'
    WHEN 'Medicina General' THEN 'Atención primaria, prevención y diagnóstico de enfermedades comunes'
    WHEN 'Ginecología' THEN 'Salud femenina, estudios ginecológicos y acompañamiento en el embarazo'
    WHEN 'Traumatología' THEN 'Lesiones del sistema musculoesquelético, fracturas y cirugía ortopédica'
    WHEN 'Oftalmología' THEN 'Diagnóstico y tratamiento de enfermedades visuales y cirugía ocular'
    WHEN 'Psiquiatría' THEN 'Diagnóstico y tratamiento de trastornos de salud mental y emocional'
    WHEN 'Endocrinología' THEN 'Trastornos hormonales, metabolismo y enfermedades de las glándulas'
    WHEN 'Urología' THEN 'Enfermedades del sistema urinario y salud reproductiva masculina'
    WHEN 'Reumatología' THEN 'Enfermedades autoinmunes e inflamatorias del sistema musculoesquelético'
  END,
  department = CASE name
    WHEN 'Cardiología' THEN 'Departamento de Cardiología'
    WHEN 'Dermatología' THEN 'Departamento de Dermatología'
    WHEN 'Neurología' THEN 'Departamento de Neurología'
    WHEN 'Pediatría' THEN 'Departamento de Pediatría'
    WHEN 'Medicina General' THEN 'Departamento de Medicina General'
    WHEN 'Ginecología' THEN 'Departamento de Ginecología'
    WHEN 'Traumatología' THEN 'Departamento de Traumatología'
    WHEN 'Oftalmología' THEN 'Departamento de Oftalmología'
    WHEN 'Psiquiatría' THEN 'Departamento de Psiquiatría'
    WHEN 'Endocrinología' THEN 'Departamento de Endocrinología'
    WHEN 'Urología' THEN 'Departamento de Urología'
    WHEN 'Reumatología' THEN 'Departamento de Reumatología'
  END,
  color = CASE name
    WHEN 'Cardiología' THEN '#ef4444'
    WHEN 'Dermatología' THEN '#f59e0b'
    WHEN 'Neurología' THEN '#8b5cf6'
    WHEN 'Pediatría' THEN '#06b6d4'
    WHEN 'Medicina General' THEN '#10b981'
    WHEN 'Ginecología' THEN '#ec4899'
    WHEN 'Traumatología' THEN '#f97316'
    WHEN 'Oftalmología' THEN '#3b82f6'
    WHEN 'Psiquiatría' THEN '#a855f7'
    WHEN 'Endocrinología' THEN '#14b8a6'
    WHEN 'Urología' THEN '#0ea5e9'
    WHEN 'Reumatología' THEN '#e11d48'
  END,
  procedures = CASE name
    WHEN 'Cardiología' THEN '["Electrocardiograma", "Ecocardiograma", "Prueba de Esfuerzo", "Holter 24h", "Cateterismo", "Control de Hipertensión"]'::jsonb
    WHEN 'Dermatología' THEN '["Dermatoscopia", "Biopsia de Piel", "Tratamiento de Acné", "Cirugía de Lunares", "Crioterapia", "Terapia Láser"]'::jsonb
    WHEN 'Neurología' THEN '["Electroencefalograma", "Resonancia Magnética", "Potenciales Evocados", "Tratamiento de Migraña", "Manejo de Epilepsia", "Neurorehabilitación"]'::jsonb
    WHEN 'Pediatría' THEN '["Control de Salud Infantil", "Vacunación", "Control de Crecimiento", "Enfermedades Infecciosas", "Alergias Pediátricas", "Nutrición Infantil"]'::jsonb
    WHEN 'Medicina General' THEN '["Chequeo General", "Análisis Clínicos", "Control de Presión Arterial", "Vacunación", "Certificados Médicos", "Consejería Preventiva"]'::jsonb
    WHEN 'Ginecología' THEN '["Papanicolaou", "Ecografía Ginecológica", "Colposcopía", "Control de Embarazo", "Evaluación de Fertilidad", "Cirugía Ginecológica"]'::jsonb
    WHEN 'Traumatología' THEN '["Radiografías", "Resonancia Musculoesquelética", "Reducción de Fracturas", "Artroscopia", "Prótesis Articular", "Rehabilitación"]'::jsonb
    WHEN 'Oftalmología' THEN '["Examen de Agudeza Visual", "Fondo de Ojo", "Cirugía de Cataratas", "Tratamiento de Glaucoma", "Cirugía Láser", "Estrabismo"]'::jsonb
    WHEN 'Psiquiatría' THEN '["Evaluación Psiquiátrica", "Terapia Cognitivo-Conductual", "Manejo de Ansiedad", "Tratamiento de Depresión", "Trastorno Bipolar", "Terapia de Pareja"]'::jsonb
    WHEN 'Endocrinología' THEN '["Perfil Hormonal", "Control de Diabetes", "Prueba de Tiroides", "Estudio de Metabolismo", "Osteoporosis", "Trastornos Suprarrenales"]'::jsonb
    WHEN 'Urología' THEN '["Uroflujometría", "Ecografía Renal", "Cistoscopia", "Cirugía Prostática", "Infertilidad Masculina", "Infecciones Urinarias"]'::jsonb
    WHEN 'Reumatología' THEN '["Perfil Reumatológico", "Artritis Reumatoide", "Lupus Eritematoso", "Osteoporosis", "Gota", "Espondilitis Anquilosante"]'::jsonb
  END
WHERE icon IS NULL OR icon = '🔬';

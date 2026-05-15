CREATE TABLE IF NOT EXISTS specialties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO specialties (name) VALUES
  ('Cardiología'),
  ('Dermatología'),
  ('Neurología'),
  ('Pediatría'),
  ('Medicina General'),
  ('Ginecología'),
  ('Traumatología'),
  ('Oftalmología'),
  ('Psiquiatría'),
  ('Endocrinología'),
  ('Urología'),
  ('Reumatología')
ON CONFLICT (name) DO NOTHING;

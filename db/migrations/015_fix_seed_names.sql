-- Fix seed user names that were NULL before 009_add_user_name.sql
-- Map known seed emails to their proper names

-- Admin
UPDATE users SET name = 'Admin' WHERE email = 'admin@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);

-- Doctors (seed.ts)
UPDATE users SET name = 'Dr. Juan Pérez' WHERE email = 'juan@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dra. María López' WHERE email = 'maria@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dr. Carlos Soto' WHERE email = 'carlos@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dra. Ana Torres' WHERE email = 'ana@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dr. Pedro González' WHERE email = 'pedro@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dra. Claudia Muñoz' WHERE email = 'claudia@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dr. Ricardo Díaz' WHERE email = 'ricardo@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dra. Patricia Vega' WHERE email = 'patricia@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dr. Mauricio Rojas' WHERE email = 'mauricio@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dra. Carmen Flores' WHERE email = 'carmen@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dr. Francisco Mora' WHERE email = 'francisco@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Dra. Verónica Pizarro' WHERE email = 'veronica@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);

-- Simple patients (seed.ts)
UPDATE users SET name = 'user1' WHERE email = 'user1@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'user2' WHERE email = 'user2@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'user3' WHERE email = 'user3@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);

-- 30 seed patients (seed.ts)
UPDATE users SET name = 'Luis Ramírez' WHERE email = 'luis.ramírez@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Marta Sepúlveda' WHERE email = 'marta.sepúlveda@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Jorge Castillo' WHERE email = 'jorge.castillo@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Rosa Herrera' WHERE email = 'rosa.herrera@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Alberto Contreras' WHERE email = 'alberto.contreras@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Silvia Medina' WHERE email = 'silvia.medina@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Raúl Valenzuela' WHERE email = 'raúl.valenzuela@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Nancy Campos' WHERE email = 'nancy.campos@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Héctor Vega' WHERE email = 'héctor.vega@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Diana Paredes' WHERE email = 'diana.paredes@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Oscar Fuentes' WHERE email = 'oscar.fuentes@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Paola Figueroa' WHERE email = 'paola.figueroa@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Fernando Rivas' WHERE email = 'fernando.rivas@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Gabriela Acosta' WHERE email = 'gabriela.acosta@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Cristián Guzmán' WHERE email = 'cristián.guzmán@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Teresa Delgado' WHERE email = 'teresa.delgado@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Pablo Navarro' WHERE email = 'pablo.navarro@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Angélica Silva' WHERE email = 'angélica.silva@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Rodrigo Peña' WHERE email = 'rodrigo.peña@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Elena Soto' WHERE email = 'elena.soto@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Manuel Cruz' WHERE email = 'manuel.cruz@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Juana Ortiz' WHERE email = 'juana.ortiz@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Sergio Vargas' WHERE email = 'sergio.vargas@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Lorena Reyes' WHERE email = 'lorena.reyes@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Andrés Morales' WHERE email = 'andrés.morales@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Carolina Espinoza' WHERE email = 'carolina.espinoza@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Tomás Castillo' WHERE email = 'tomás.castillo@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Bárbara Molina' WHERE email = 'bárbara.molina@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Felipe Campos' WHERE email = 'felipe.campos@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);
UPDATE users SET name = 'Verónica Sandoval' WHERE email = 'verónica.sandoval@clinic.com' AND name IS NOT DISTINCT FROM SPLIT_PART(email, '@', 1);

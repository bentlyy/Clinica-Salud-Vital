-- 🔹 DOCTORS
CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔹 USERS (pacientes por ahora)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔹 BOOKINGS
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,

  doctor_id INT NOT NULL,
  user_id INT NOT NULL,

  date DATE NOT NULL,
  time TIME NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 🔥 Relaciones (más estrictas)
  CONSTRAINT fk_doctor
    FOREIGN KEY (doctor_id)
    REFERENCES doctors(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  -- 🔥 Evita doble reserva (CRÍTICO)
  CONSTRAINT unique_booking UNIQUE (doctor_id, date, time)
);

-- 🔥 Índices para rendimiento
CREATE INDEX idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_date ON bookings(date);
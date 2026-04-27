-- 🔹 USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔹 DOCTORS
CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT, -- opcional (el real está en users)
  user_id INT UNIQUE,

  CONSTRAINT fk_doctor_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- 🔹 BOOKINGS (🔥 actualizado con duration)
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,

  doctor_id INT NOT NULL,
  user_id INT NOT NULL,

  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT DEFAULT 30,

  -- 🔥 NUEVO: control de recordatorios
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_doctor
    FOREIGN KEY (doctor_id)
    REFERENCES doctors(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT unique_booking UNIQUE (doctor_id, date, time),
  CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE),
  CONSTRAINT check_duration CHECK (duration > 0 AND duration <= 480)
);

-- 🔹 AVAILABILITY
CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,

  doctor_id INT NOT NULL,
  day_of_week INT NOT NULL, -- 0 domingo - 6 sábado

  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  CONSTRAINT fk_doctor_availability
    FOREIGN KEY (doctor_id)
    REFERENCES doctors(id)
    ON DELETE CASCADE,

  -- 🔥 validación básica
  CONSTRAINT check_time_range CHECK (start_time < end_time)
);

-- 🔹 (🔥 OPCIONAL PERO PRO) EXCEPCIONES / BLOQUEOS
CREATE TABLE doctor_exceptions (
  id SERIAL PRIMARY KEY,

  doctor_id INT NOT NULL,
  date DATE NOT NULL,

  start_time TIME,
  end_time TIME,

  is_full_day BOOLEAN DEFAULT FALSE,

  CONSTRAINT fk_doctor_exception
    FOREIGN KEY (doctor_id)
    REFERENCES doctors(id)
    ON DELETE CASCADE
);

-- 🔥 ÍNDICES
CREATE INDEX idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_date ON bookings(date);

CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);

CREATE INDEX idx_exceptions_doctor ON doctor_exceptions(doctor_id);
CREATE INDEX idx_exceptions_date ON doctor_exceptions(date);


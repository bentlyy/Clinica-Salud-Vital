CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  rut TEXT UNIQUE,
  phone TEXT,
  blocked_until TIMESTAMP,
  no_show_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT,
  user_id INT UNIQUE,
  slot_duration INT DEFAULT 30,
  CONSTRAINT fk_doctor_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_slot_duration CHECK (slot_duration IN (15, 30, 45, 60))
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,
  user_id INT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT DEFAULT 30,
  status TEXT DEFAULT 'pending',
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT UNIQUE,
  guest_rut TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_guest_or_user
    CHECK (user_id IS NOT NULL OR (guest_rut IS NOT NULL AND guest_email IS NOT NULL)),
  CONSTRAINT unique_booking UNIQUE (doctor_id, date, time),
  CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE),
  CONSTRAINT check_duration CHECK (duration > 0 AND duration <= 480)
);

CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT fk_doctor_availability FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT check_time_range CHECK (start_time < end_time)
);

CREATE TABLE doctor_exceptions (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_doctor_exception FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX idx_bookings_user   ON bookings(user_id);
CREATE INDEX idx_bookings_date   ON bookings(date);
CREATE INDEX idx_bookings_doctor_date ON bookings(doctor_id, date);
CREATE INDEX idx_bookings_guest_rut ON bookings(guest_rut);
CREATE INDEX idx_bookings_confirmation_token ON bookings(confirmation_token);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_confirmed ON bookings(confirmed);

CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);

CREATE INDEX idx_exceptions_doctor ON doctor_exceptions(doctor_id);
CREATE INDEX idx_exceptions_date   ON doctor_exceptions(date);
CREATE INDEX idx_exceptions_doctor_date ON doctor_exceptions(doctor_id, date);

CREATE INDEX idx_users_rut ON users(rut);

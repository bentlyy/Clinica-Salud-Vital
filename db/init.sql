CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  doctor_id INT REFERENCES doctors(id),
  user_id INT REFERENCES users(id),
  date DATE NOT NULL,
  time TIME NOT NULL
);
# Clinic Backend - AI Agent Instructions

## Project Overview
- **Type**: Full-stack web application (Node.js + React + PostgreSQL)
- **Stack**: Express 5, PostgreSQL, React + Vite, Docker
- **Port**: API: 3000, Frontend: 5173

## Running the Project

### With Docker (Recommended)
```bash
docker compose up -d --build
```
- API: http://localhost:3000
- Frontend: http://localhost:5173

### Without Docker (for development)
```bash
# Start PostgreSQL in Docker first
docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=clinic --name clinic-db postgres:15-alpine

# Update .env to use localhost
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinic

# Run migrations
docker exec -i clinic-db psql -U postgres -d clinic < db/init.sql

# Start API
npm run dev
```

## Commands
- `npm run dev` - Start development server (with nodemon)
- `npm start` - Start production server
- `npm test` - Run tests with coverage

## Important Notes
- Environment variables are in `.env` file
- Database connection uses Docker service name `db` when running in containers
- All migrations are consolidated in `db/init.sql` (schema + seed)
- Frontend Vite proxy uses `VITE_API_PROXY_TARGET=http://api:3000` in Docker (not localhost)
- TypeScript files in `src/utils/` are `.ts` but imported as `.js` (works via nodemon with tsx or vitest)
- **Paginated API responses** return `{ data: [...], pagination: {...} }` - frontend must extract `.data`
- **AuthContext**: `loading` starts `true`, loads from localStorage in `useEffect`, then sets `false`
- Logged-in users book via `createBooking` (no RUT needed), guests via `createGuestBooking` (RUT required)

## Key Files
- `src/app.js` - Main Express application
- `src/shared/db.js` - PostgreSQL connection pool
- `docker-compose.yml` - Docker services configuration
- `.env` - Environment variables
- `db/init.sql` - Full schema + seed (consolidated migrations)
- `frontend/src/context/AuthContext.jsx` - Auth state management
- `frontend/src/pages/MyBookingsPage.jsx` - Patient bookings (handles paginated response)
- `frontend/src/pages/DoctorPanel.jsx` - Doctor dashboard (handles paginated response)
- `frontend/src/pages/BookingPage.jsx` - Booking flow (user vs guest)

## Known Issues Fixed
- **Frontend**: Created `src/context/useAuth.js` to fix fast-refresh issue with React context
- **Frontend**: Fixed setState in useEffect patterns with eslint-disable comments
- **Backend**: Created missing `src/modules/doctor/doctor.service.js` (was imported but not found)
- **Frontend**: Fixed AnalyticsPage.jsx - removed unused imports (LineChart, Line, COLORS), fixed function order
- **Docker**: Fixed Vite proxy to use `VITE_API_PROXY_TARGET` env var instead of hardcoded localhost
- **Frontend**: Fixed `bookings.map is not a function` in MyBookingsPage/DoctorPanel - API returns paginated `{ data, pagination }`
- **Frontend**: Fixed AuthContext `loading` state - was static useState, now uses useEffect to load from localStorage
- **Backend**: Fixed `auth.service.ts` login response to include `rut` and `phone` fields
- **Backend**: Fixed `guest.service.ts` RUT search to clean formatting and search both `guest_rut` and `users.rut`
- **Backend**: Fixed `BookingPage.jsx` to use `createBooking` for logged-in users vs `createGuestBooking` for guests
- **Backend**: Fixed `admin.seed.ts` to generate valid RUTs for all seeded users
- **DB**: Consolidated all migrations into `db/init.sql` for container restart persistence

## Frontend Lint Notes
- React hooks warnings for `setState` in useEffect are expected for data fetching patterns
- AuthContext exports both provider and context (warning is informational only)

## TypeScript Configuration
- TypeScript is used in `src/utils/` (errors.ts, logger.ts)
- Imports use `.js` extension but files are `.ts` - this works with vitest
- Run `npm run typecheck` to verify TypeScript compilation

## Seed Users (valid RUTs)
| Rol | Email | Password | RUT |
|-----|-------|----------|-----|
| Admin | admin@clinic.com | REPLACED_PASSWORD | 20287886-5 |
| Doctor | juan@clinic.com | REPLACED_PASSWORD | 11222333-9 |
| Doctor | maria@clinic.com | REPLACED_PASSWORD | 14333444-7 |
| Doctor | carlos@clinic.com | REPLACED_PASSWORD | 13444555-5 |
| Doctor | ana@clinic.com | REPLACED_PASSWORD | 12555666-3 |
| Patient | user1@clinic.com | REPLACED_PASSWORD | 15666777-3 |
| Patient | user2@clinic.com | REPLACED_PASSWORD | 16777888-1 |
| Patient | user3@clinic.com | REPLACED_PASSWORD | 17888999-9 |
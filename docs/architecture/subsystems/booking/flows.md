# SUB-6 — Flujos

## F1. Crear cita autenticada (`POST /api/bookings`)

```
authMiddleware → validateZod(createBookingSchema) → controller.createBooking
   service.createBooking({...body, user_id: req.user.id}, tenant):
      valida fecha futura, duración (>0, ≤480, múltiplo de 5)
      BEGIN
      pg_advisory_xact_lock(doctor_id, hashtext(date))
      doctor = getDoctorById(doctor_id, tenant)            ← 404 si no existe
      duration ≤ doctor.slot_duration?                     ← 400 si excede
      user = SELECT email,rut,phone,blocked_until WHERE id AND tenant  ← 404
      blocked_until > NOW()?                               ← 400 BOOKING_USER_BLOCKED
      validateBookingSlot(holiday + avail + exception + overlap)
      confirmToken = signInvite({user_id,doctor_id,date,time}, '7d')   ⚠ sin tenant_id (FND-D5)
      INSERT bookings (..., confirmed=true, confirmation_token, tenant)   ⚠ confirmed=true (FND-D2)
      recordBookingStatusChange(to='pending', actor='user')
      COMMIT
      enqueueJob('email:send', booking-confirmation)
      createNotification(in-app 'Cita agendada')
   201 {booking}
```

## F2. Reservar como invitado (`POST /api/guest/booking`, público)

```
guestBookingLimiter(5/h) → validateZod(guestBookingSchema) → controller.createGuestBooking
   valida rut (validateRut), fecha, hora
   checkRutBlocked(rut, tenant)                            ← 400 GUEST_RUT_BLOCKED
   BEGIN
   pg_advisory_xact_lock(doctor_id, hashtext(date))
   doctor = getDoctorById(doctor_id, tenant)
   validateBookingSlot(...)
   confirmToken = signInvite({rut,email,doctor_id,date,time,tenant_id}, '7d')
   INSERT bookings (..., confirmed=true, guest_rut/name/email/phone, confirmation_token, tenant)
   COMMIT
   sendEmail(guestConfirmationEmail)   ← directo (sin cola), sin tenantId
   201 {booking}
```

## F3. Huecos disponibles (`GET /api/bookings/available-slots`, público)

```
validateZod(query) → getAvailableSlots(doctor_id, date, tenant)
   SET TRANSACTION ISOLATION LEVEL REPEATABLE READ   ⚠ sin BEGIN → sin efecto (FND-D7)
   holiday? → []
   availability[day_of_week] → [] si vacío
   duration = doctors.slot_duration || 30
   genera slots (start_time, +duration … hasta end_time)
   booked = bookings WHERE date AND status != 'cancelled'   ← descarta huecos ocupados
   exceptions = doctor_exceptions
   filtra slots que caen en excepción o solapan una cita
   200 [slots]
```

## F4. Confirmar cita por token (`POST /api/bookings/confirm/:token`, público)

```
confirmBooking(token, tenant):
   payload = verify(token)                        ← 400 AUTH_TOKEN_INVALID_EXPIRED
   si payload.tenant_id && != tenant → 404
   UPDATE bookings SET confirmed=TRUE WHERE confirmation_token AND tenant AND confirmed=FALSE
      ↳ 0 filas porque las citas ya se insertan confirmed=TRUE (FND-D2)
   si 0: SELECT confirmed (404 si no existe) → {confirmed:true, alreadyConfirmed:true}
```

## F5. Reprogramar (`PATCH /api/bookings/:id/reschedule`)

```
authMiddleware → service.rescheduleBooking(id, req.user.id, tenant, {date,time,duration})
   existing = SELECT ... WHERE id AND user_id AND tenant   ← solo el dueño (404)
   status == 'cancelled'? → 400
   BEGIN
   advisory lock(doctor_id, date)
   duration ≤ slot_duration?
   validateBookingSlot(excludeBookingId=id)
   UPDATE bookings SET date,time,duration
   recordBookingStatusChange(from=status, to=status)       ⚠ mismo estado (FND-D10)
   COMMIT
   enqueueJob(booking-rescheduled)
   si cambió de fecha: notifyWaitlistForSlot(doctor, fecha_original)
   createNotification(in-app)
```

## F6. Cancelar (`PATCH /api/bookings/:id/cancel`) vs `DELETE /api/guest/booking/:id`

```
booking.service.cancelBooking(id, user_id, tenant):
   existing = SELECT WHERE id AND user_id AND tenant     ← solo el dueño (404)
   UPDATE bookings SET status='cancelled'
   recordBookingStatusChange(to='cancelled', from=fromStatus)
   si fromStatus != 'cancelled': notifyWaitlistForSlot(doctor, fecha)   ✓ notifica
   createNotification(in-app 'Cita cancelada')

guest.service.cancelGuestBooking(id, userIdOrRut, role, tenant, token):
   staff (admin/doctor)  → UPDATE ... WHERE id AND tenant                ← cancela cualquiera
   dueño (userId)        → UPDATE ... WHERE id AND user_id AND tenant
   invitado (rut)        → UPDATE ... WHERE id AND guest_rut AND confirmation_token AND tenant
   recordBookingStatusChange(to='cancelled')       ⚠ NO notifica waitlist ni in-app (FND-D6)
```

## F7. Serie recurrente (`POST /api/bookings/series`)

```
authMiddleware → authorize(doctor,admin,superadmin,patient,user) → createBookingSeries
   controller: si rol patient/user y body.user_id != req.user.id → ACCESS_DENIED
               (doctor/admin pueden crear para otro user_id)
   service (tenant):
      valida frecuencia/occurrences (1..52), fecha futura
      BEGIN
      doctor = getDoctorById; duration ≤ slot_duration
      user existe en tenant
      INSERT booking_series
      por cada ocurrencia (getSeriesDate daily/weekly/monthly):
         si fecha < hoy → skip
         advisory lock; validateBookingSlot
         INSERT bookings (confirmed=true, series_id)      ⚠ confirmed=true (FND-D2)
         recordBookingStatusChange(to='pending', notes 'recurrente')
         (si 23505 → skip)
      UPDATE booking_series.created_count
      COMMIT
      createNotification(in-app con nº creadas/omitidas)
```

## F8. Feriado con cancelación en cascada (`POST /api/holidays`)

```
authMiddleware → authorize(admin,superadmin) → createHoliday
   valida duplicado por fecha
   INSERT clinic_holidays
   si cancel_bookings (default true):
      BEGIN
      bookings = SELECT citas WHERE date=feriado AND status != 'cancelled'
      UPDATE bookings SET status='cancelled'
      INSERT booking_status_history masivo (UNNEST)       ⚠ from_status fijo 'confirmed' (FND-D8)
      COMMIT
      por cada cita: enqueueJob(email cancelación) + notifyWaitlistForSlot  ⚠ hueco inexistente
   {holiday, cancelled_bookings, short_notice}
```

## F9. Recordatorios (cron cada 5 min — `JOB`)
```
startReminderJob → sendReminders('55m','65m','reminder_1h_sent') + ('23h','25h','reminder_24h_sent')
   SELECT bookings WHERE sentField=FALSE AND status='pending' AND tenant_id IS NOT NULL
        AND (date+time) BETWEEN NOW()+interval          ⚠ sin contexto de tenant (FND-D1)
   por cita: sendWithRetry(sendEmail)   ⚠ sin tenantId → SMTP default
             UPDATE bookings SET sentField=TRUE
```

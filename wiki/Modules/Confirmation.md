# Confirmation

> **Nota:** Este módulo ya no existe como módulo independiente. Su funcionalidad fue absorbida por [[Modules/Booking|Booking]] y [[Modules/Guest|Guest]].

## Estado Actual
- Las reservas se crean con `confirmed = true` (auto-confirmado)
- El email es solo notificación: "Cita agendada - Salud Vital"
- No requiere clic en link de confirmación

## Historial
- Anteriormente tenía endpoints dedicados de confirmación
- Se eliminó la warning de bloqueo por no confirmar
- Booking genera `confirmation_token` JWT y dispatches webhook
- Guest usa token para flujo de cancelación

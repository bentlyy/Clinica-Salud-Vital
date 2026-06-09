# Notification

Servicio unificado de notificaciones multicanal.

## Canales
| Canal | Provider | Modo |
|-------|----------|------|
| Email | SendGrid / Gmail SMTP | Producción |
| SMS | Twilio | Producción (log en dev) |
| WhatsApp | Twilio | Producción (log en dev) |

## Features
- Servicio único: `sendNotification(channel, to, content)`
- Re-exporta `notification.service.ts` desde `shared/`
- Modo `log` para desarrollo (solo imprime en consola)
- Configurable via `SMS_PROVIDER=log|twilio|whatsapp`

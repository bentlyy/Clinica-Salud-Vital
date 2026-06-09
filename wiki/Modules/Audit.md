# Audit

Middleware que logga cambios a entidades críticas.

- `audit.middleware.ts` — Intercepta requests y registra
- Tabla `audit_logs` con detalle de cambios
- Accesible via endpoint admin
- Solo admin puede consultar logs

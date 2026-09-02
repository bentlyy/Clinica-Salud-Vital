# Autorización

> RBAC, roles y control de acceso.

## Jerarquía de Roles

```
superadmin → admin → doctor → patient / user
```

## Roles del Sistema

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Administrador global | Todos los tenants, gestión de plataforma |
| `admin` | Administrador de clínica | Su tenant, gestión local |
| `doctor` | Médico | Agenda, registros clínicos, stats |
| `lab_technician` | Técnico de laboratorio | Resultados de laboratorio |
| `patient` | Paciente registrado | Sus citas, historial |
| `guest` | Usuario invitado | Solo booking |
| `user` | Usuario genérico | Depende del contexto |

## Pipeline de Autorización

```
Request → authMiddleware (JWT) → authorizeRoles() → requireFeature()
```

| Middleware | Propósito |
|------------|-----------|
| `authMiddleware` | Verifica JWT + `token_version` + active + tenant → inyecta `req.user` |
| `optionalAuth` | Igual pero no falla sin token (rutas públicas parciales) |
| `authorize('admin', 'doctor')` | RBAC por lista blanca de roles |
| `requireFeature('laboratory')` | Gating por feature flag del plan SaaS (403 + `PremiumLocked`) |
| `ownership.ts` | Chequeos BOLA fail-closed (médico ↔ paciente) |

> API de autorización: `authorize(...roles)`. No existe `requireLimit` ni `authorizeRoles` en el código real.

---

Tags: #seguridad #autorizacion #rbac

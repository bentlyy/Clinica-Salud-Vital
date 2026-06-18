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
| `authMiddleware` | Verifica JWT → inyecta `req.user` |
| `optionalAuth` | Igual pero no falla sin token |
| `authorizeRoles('admin', 'doctor')` | Verifica rol del usuario |
| `requireFeature('laboratory')` | Gating por plan SaaS |
| `requireLimit('doctors')` | Verifica límites del plan |

---

Tags: #seguridad #autorizacion #rbac

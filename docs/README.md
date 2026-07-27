# Índice de Documentación

```
docs/
├── README.md                           # ← Estás aquí
├── adr/
│   └── 001-monolito-modular.md         # Por qué monolito modular (no microservicios)
├── architecture/
│   └── (diagramas C4 - próximamente)
├── modules/
│   ├── ml-paper.md                     # Modelos TF.js, caché, fallbacks
│   └── auth-security.md                # JWT, 2FA, refresh tokens, pipeline de middlewares
├── performance/
│   └── monitoring-setup.md             # Memoria, DB, Clinic.js, PM2, GC
├── api/
│   └── overview.md                     # Endpoints, convenciones, validación, errores
└── runbooks/
    └── (deploy, backup, respuesta a incidentes - próximamente)
```

## Decisiones arquitectónicas clave

| Documento | Resumen |
|-----------|---------|
| [ADR-001: Monolito Modular](adr/001-monolito-modular.md) | Unidad única de deploy, transacciones ACID, módulos aislados |
| [Paper Módulo ML](modules/ml-paper.md) | 4 modelos TF.js, caché LRU, locks de entrenamiento, fallbacks |
| [Autenticación y Seguridad](modules/auth-security.md) | JWT + rotación refresh, 2FA, política de contraseñas, Helmet CSP |
| [Monitoreo de Performance](performance/monitoring-setup.md) | Snapshots de memoria, detección de leaks, perfilado Clinic.js, límites PM2 |
| [Visión General API](api/overview.md) | Todos los endpoints, convenciones, paginación, validación, multi-tenencia |

## Relacionados

- [AGENTS.md](../AGENTS.md) — Instrucciones para agente IA
- [Render.yaml](../render.yaml) — Configuración de deploy

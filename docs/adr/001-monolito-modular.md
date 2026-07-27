# ADR-001: Arquitectura de Monolito Modular

**Estado:** Aceptado  
**Fecha:** 2025  
**Decisores:** Equipo de Desarrollo  

---

## Contexto

El sistema de gestión clínica requiere soportar 14+ dominios funcionales (auth, booking, registros clínicos, facturación, laboratorio, ML, etc.) con consistencia de datos fuerte, operaciones en tiempo real y la capacidad de evolucionar de forma independiente. Se evaluaron dos estilos arquitectónicos: microservicios y monolito modular.

## Decisión

Adoptar un **monolito modular** — una sola unidad de deploy (Express 5) con módulos lógicamente separados, cada uno con su propio controlador, servicio, rutas, esquema y extras opcionales.

### Estructura de módulo

```
module/
├── module.controller.ts   # Handlers de Express (envueltos en asyncHandler)
├── module.service.ts      # Lógica de negocio + consultas DB
├── module.routes.ts       # Definición de router
├── module.schema.ts       # Esquemas de validación Zod
└── (extras opcionales)
    ├── module.email.ts    # Plantillas de email
    ├── module.middleware.ts
    └── ...
```

### Por qué no microservicios

| Aspecto | Microservicios | Monolito Modular |
|---------|---------------|------------------|
| Consistencia de datos | Eventual (patrón Saga) | Fuerte (ACID vía PostgreSQL) |
| Condiciones de carrera en booking | Locks distribuidos | Advisory locks (misma DB) |
| Latencia de inferencia ML | Salto de red cada llamada | En proceso (TF.js lazy-load) |
| Complejidad de deploy | CI/CD por servicio | Deploy único |
| Autonomía de equipo | Requerida | No necesaria (equipo único) |

### Cuándo extraer a microservicios

Si algún módulo demuestra:
- Uso de CPU/memoria sostenido >5x vs otros
- Cadencia de deploy independiente requerida
- Necesidad de otro motor de almacenamiento

Entonces extraerlo — el límite del módulo ya está bien definido.

---

## Consecuencias

### Positivas
- Transacciones ACID fuertes entre módulos (ej. booking + factura + registro clínico en una transacción)
- Sin overhead de red entre módulos
- Deploy único, monitoreo único
- Módulos testeables independientemente (cada uno puede simularse)

### Negativas
- Todos los módulos comparten el mismo espacio de memoria de Node.js (presión de heap de TF.js)
- No se pueden escalar módulos independientemente
- La fuga de memoria de un módulo afecta a todos
- El tiempo de build aumenta con la cantidad de módulos

### Mitigaciones
- `--max-old-space-size=400` limita el heap por proceso
- Middleware de monitoreo rastrea RSS/heap por módulo
- PM2 reinicia automáticamente al alcanzar umbral de memoria
- Los modelos ML se cargan bajo demanda y son desechables

---

## Relacionados

- ADR-002: Multi-tenencia (base de datos compartida)
- ADR-003: Estrategia lazy-load de TF.js
- Documentos de performance: `/docs/performance/monitoring-setup.md`

# ADR-001: Arquitectura de Monolito Modular

**Estado:** Aceptado  
**Fecha:** 2025  
**Decisores:** Equipo de Desarrollo

---

## Contexto

El sistema requiere soportar 14+ dominios funcionales (auth, booking, registros clínicos, facturación, laboratorio) con consistencia de datos fuerte, operaciones en tiempo real y capacidad de evolucionar de forma independiente.

## Decisión

Adoptar un **monolito modular** — una sola unidad de deploy (Express 4) con módulos lógicamente separados.

### Por qué no microservicios

| Aspecto | Microservicios | Monolito Modular |
|---------|---------------|------------------|
| Consistencia de datos | Eventual (patrón Saga) | Fuerte (ACID vía PostgreSQL) |
| Condiciones de carrera | Locks distribuidos | Advisory locks (misma DB) |
| Latencia ML | Salto de red | En proceso (TF.js lazy-load) |
| Complejidad de deploy | CI/CD por servicio | Deploy único |
| Autonomía de equipo | Requerida | No necesaria (equipo único) |

### Cuándo extraer a microservicios

Si algún módulo demuestra:
- Uso de CPU/memoria sostenido >5x vs otros
- Cadencia de deploy independiente requerida
- Necesidad de otro motor de almacenamiento

## Consecuencias

### Positivas
- Transacciones ACID fuertes entre módulos
- Sin overhead de red entre módulos
- Deploy único, monitoreo único

### Negativas
- Todos los módulos comparten heap de Node.js
- No se pueden escalar módulos independientemente
- Fuga de memoria de un módulo afecta a todos

### Mitigaciones
- `--max-old-space-size=400` limita heap por proceso
- Middleware de monitoreo rastrea RSS/heap por módulo
- PM2 reinicia automáticamente al alcanzar umbral
- Modelos ML se cargan bajo demanda

---

## Relacionados

- [[01-ARQUITECTURA/Arquitectura-General|Arquitectura General]]
- [[01-ARQUITECTURA/Multi-Tenancy|Multi-Tenancy]]

---

Tags: #adr #arquitectura #decision

# Roadmap

> Próximos pasos para la evolución del sistema.

## Corto Plazo

- [ ] Implementar módulo `patient/` (portal paciente funcional)
- [ ] Restaurar fuente del módulo ML en `src/modules/ml/`
- [ ] Limpiar locales `pt` y `fr` (deprecar oficialmente)
- [ ] Agregar tests de frontend (Vitest + Testing Library)
- [ ] Convención de commits (Conventional Commits)

## Mediano Plazo

- [ ] Migrar a Express 5 (actualmente Express 4)
- [ ] Agregar migraciones automatizadas (vs SQL manual)
- [ ] Documentar runbooks de incidentes
- [ ] Agregar health checks más granulares por módulo
- [ ] Implementar rate limiting por tenant (no solo global)

## Largo Plazo

- [ ] Evaluar extracción de módulo de facturación a microservicio si escala
- [ ] Portal de autoservicio para pacientes (citas online, historial)
- [ ] App mobile (React Native)
- [ ] Integración FHIR R4 completa
- [ ] Migración a pago con Stripe real (quitar stub)

---

Tags: #roadmap #planificacion

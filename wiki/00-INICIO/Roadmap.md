# Roadmap

> Próximos pasos para la evolución del sistema.

## Corto Plazo

- [ ] Optimizar seed/backfills en producción (evitar trabajo al arrancar)
- [ ] Agregar lint (ESLint + Prettier) al pipeline de CI
- [ ] Migrar tests backend de `.js` a `.ts`
- [ ] Mover `@types/*` de `dependencies` a `devDependencies`
- [ ] Eliminar `frontend-v3/` residual del repo
- [ ] Subir reportes de cobertura (Codecov/Coveralls)

## Mediano Plazo

- [ ] Migrar a Express 5 (actualmente Express 4.21)
- [ ] Implementar rate limiting por tenant (no solo global)
- [ ] Robustecer ejecución de migraciones (transacciones, lógica por migración)
- [ ] Documentar runbooks de incidentes e integrarlos al repo
- [ ] Evaluar `phiWriteLimiter` sobre rutas PHI adicionales (medical-history, laboratory)

## Largo Plazo

- [ ] Evaluar extracción de facturación a módulo/escala independiente si crece
- [ ] Portal de autoservicio avanzado para pacientes (citas online, historial, pagos)
- [ ] App mobile (React Native)
- [ ] Integración FHIR R4
- [ ] Migración a pago con Stripe real (quitar stub)
- [ ] Modelos de ML reales (hoy `smaForecast` = media móvil simple)

## Completado

- [x] Portal paciente funcional (PatientLayout con bottom-nav)
- [x] Tests de frontend (Vitest + Testing Library, 178 archivos)
- [x] i18n completo en 4 idiomas (es/en/pt/fr) con paridad verificada
- [x] Módulo patient consolidado (frontend `modules/patients`, `medical-history`, etc.)
- [x] TypeScript strict en backend y frontend
- [x] Cola de jobs persistente (tabla `jobs`) en lugar de cola en memoria
- [x] Limpieza periódica de sesiones/actividad (evita memory leak)
- [x] Hardening BOLA/ownership + RLS forzada
- [x] Módulo de plantillas clínicas (`/api/clinical-templates`)
- [x] Sesiones de usuario + endpoints `/api/auth/sessions`

---

Tags: #roadmap #planificacion
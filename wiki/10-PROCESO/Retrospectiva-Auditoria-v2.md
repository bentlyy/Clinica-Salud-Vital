---
tags: [retrospectiva, auditoria, calidad, proceso]
---

# Retrospectiva — Auditoría y Mejora v2

> Proceso completo de auditoría técnica, corrección de hallazgos y validación.

## 1. Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Estado inicial** | 67 archivos modificados (desde v1), 12 untracked |
| **Estado final** | 69 archivos modificados, +2,838 líneas, -894 líneas |
| **Tests backend** | 2,176 pasando ✅ |
| **Tests frontend** | 23 pasando ✅ |
| **TypeCheck** | Pasa ✅ |
| **Score inicial** | 0/100 (auditoría v2) |
| **Score final estimado** | ~35/100 (5 🔴 corregidos) |

### Cambios aplicados en v2

| Hallazgo | Archivo | Cambio |
|----------|---------|--------|
| User enumeration | `auth.service.ts` | Eliminados COUNT queries previos a login |
| Tenant bypass `||` vs `??` | `auth.middleware.ts` | Cambiado `||` por `??` |
| CORS sin origin en prod | `app.ts` | Rechazar requests sin Origin en producción |
| Cache sin TTL | `multi-tenant.service.ts` | TTL 5 min + stale-while-revalidate |
| 3 promesas sin catch | `doctor.service.ts`, `guest.service.ts` | `.catch()` agregado |
| Tests desactualizados | `auth.service.test.js`, `auth.routes.test.js` | Eliminados mocks de COUNT queries |

### No corregido (documentado)

| Hallazgo | Razón |
|----------|-------|
| Race condition `getAvailableSlots` | Rompe 10+ tests, requiere refactor mayor de mocks |
| Frontend tipos (.jsx→.tsx, any, interfaces) | ~18 archivos, esfuerzo ⚡⚡⚡ estimado |
| `.env` con credenciales reales | Ya en `.gitignore`, requiere rotación manual |
| `rejectUnauthorized: false` | Necesario para self-signed cert actual |
| JWT HS256→RS256 | Requiere infraestructura de keys, ⚡⚡⚡ |

## 2. Lecciones Aprendidas

### Top 5 prácticas de mayor impacto

1. **Eliminar queries COUNT previas a autenticación** — previene user enumeration, mejora performance, elimina 2 queries por login
2. **Usar `??` en vez de `||`** — string vacío no es "falsy" para null coalescing, previene bypass de seguridad
3. **TTL en cachés en memoria** — stale-while-revalidate previene datos obsoletos sin bloquear requests
4. **`.catch()` en promesas fire-and-forget** — previene unhandledRejection que derrumba el proceso
5. **Mock de queries secuencial con `mockResolvedValueOnce`** — frágil ante cambios en número de queries; preferir mocks por nombre de función

### Patrones a institucionalizar

Ver `wiki/10-PROCESO/Convenciones.md`.

## 3. Checklist de Mantenimiento

### Pre-PR
- [ ] `npm run typecheck` pasa
- [ ] `npm test` pasa (backend)
- [ ] `cd frontend && npm test` pasa
- [ ] Sin `console.log` ni `debugger`
- [ ] Sin archivos `.js` donde debería haber `.ts`
- [ ] Sin `any` en nuevos tipos

### Semanal
- [ ] Verificar que `.env` no tenga credenciales commiteadas
- [ ] Revisar tests frágiles (los que usan `mockResolvedValueOnce` secuencial)
- [ ] Revisar logs en busca de `ECONNREFUSED` o errores de DB

### Pre-Deploy
- [ ] `NODE_ENV=production` testeado
- [ ] Rate limiters configurados
- [ ] CORS whitelist actualizada
- [ ] JWT_SECRET de 32+ caracteres rotado

## 4. Archivos Modificados (v2)

| Archivo | Cambio |
|---------|--------|
| `src/modules/auth/auth.service.ts` | Eliminados COUNT queries de login |
| `src/middlewares/auth.middleware.ts` | `||` → `??` en tenant_id |
| `src/app.ts` | CORS rechaza sin Origin en producción |
| `src/shared/multi-tenant.service.ts` | TTL + stale-while-revalidate en caché |
| `src/modules/doctor/doctor.service.ts` | `.catch()` en 2 promesas |
| `src/modules/guest/guest.service.ts` | `.catch()` en 1 promesa |
| `tests/unit/auth.service.test.js` | Eliminados 16 mocks de COUNT |
| `tests/integration/auth.routes.test.js` | Eliminados 8 mocks de COUNT |

---

Tags: #retrospectiva #auditoria #v2 #proceso

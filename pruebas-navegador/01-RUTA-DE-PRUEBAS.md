# 01 — Ruta de pruebas: índice maestro y orden de ejecución

> Este archivo es el **mapa**. Dice qué archivo cubre qué funcionalidad, en qué orden correrlos,
> qué bloquea qué, y con qué frecuencia. Los detalles de cada caso están en su archivo de área.

---

## 1. Cómo usar esta ruta

```
1. Leer 00-README.md           → reglas, roles, credenciales, entorno
2. Leer 01-RUTA-DE-PRUEBAS.md  → este mapa: qué correr y en qué orden
3. Consultar 02-CATALOGO-FUNCIONES.md → "¿dónde se prueba esta función?"
4. Ejecutar el gate (G0)       → si falla, parar y reportar
5. Ejecutar las capas 1-4       → en el orden indicado
6. Entregar el reporte (§10)
```

**No se empieza por el código.** Se empieza por el gate. Si el login falla, probar el laboratorio
no tiene sentido.

---

## 2. Las 4 capas

| Capa | Qué cubre | Áreas | Frecuencia | Duración |
|---|---|---|---|---|
| **G0 · Gate** | ¿El sistema está arriba y usable? | 1 bloque, 14 casos | **Cada deploy** | 8–12 min |
| **C1 · Transversal** | Todo lo que condiciona a lo demás: auth, permisos, aislamiento | `10`, `11`, `19` — 70 casos | Semanal / pre-release | 60–75 min |
| **C2 · Negocio** | Los módulos que la clínica usa todos los días | `13`, `16`, `17`, `18`, `20`, `21`, `22`, `23`, `24` — 238 casos | Semanal | 150–200 min |
| **C3 · Plataforma** | Superadmin, SaaS, onboarding, auditoría, integraciones | `14`, `15`, `25`, `26`, `28` — 84 casos | Quincenal | 100–130 min |
| **C4 · Sistemática** | Seguridad, i18n/UX, rendimiento, adjuntos, landing | `12`, `27`, `29`, `30`, `31`, `32` — 108 casos | Mensual | 90–120 min |
| **Total áreas** | | **23 áreas · 500 casos** | | **~7 h** |
| **Total con gate** | | **514 casos (500 + 14 G0)** | | **~7 h 15** |

---

## 3. Gate G0 — Smoke de entrada

> **Regla: si un caso P0 de este bloque falla, DETENER y reportar.** Nada de lo que sigue es
> interpretable con el sistema caído.

| # | Caso | Verificación mínima | P |
|---|---|---|---|
| SMK-001 | El sitio carga | `GET /` → 200. `<title>` y hero renderizados. 0 errores de consola | P0 |
| SMK-002 | Los bundles son del origen propio | Todo JS desde el dominio, sin unpkg/cdn.jsdelivr. `favicon.ico` → 200 | P0 |
| SMK-003 | Health check responde | `GET /api/health` → 200 con `status`, `uptime`, `version` | P0 |
| SMK-004 | La API responde | `GET /api/specialties` → 200 sin sesión | P0 |
| SMK-005 | El login funciona | `POST /api/auth/login` → 200, cookie `httpOnly`, redirige a `/dashboard` | P0 |
| SMK-006 | La sesión persiste | Recargar mantiene sesión. El nombre del usuario sigue en el topbar | P0 |
| SMK-007 | El logout cierra la sesión | `POST /api/auth/logout` → 200. `/dashboard` vuelve a pedir login | P0 |
| SMK-008 | La ruta protegida bloquea sin sesión | `/dashboard` sin cookie → redirige a `/login`, sin bucle | P0 |
| SMK-009 | El refresh rota el token | `POST /api/auth/refresh` → 200 con par nuevo. El antiguo no sirve | P0 |
| SMK-010 | Los slots públicos se ven sin sesión | `GET /api/bookings/available-slots` → **200**, no 400 por `X-Tenant-Id` | P0 |
| SMK-011 | El alta de médico funciona | `POST /api/doctors` con `specialty_id` → **201** (regresión F-2) | P0 |
| SMK-012 | Deep link a `/account` | `$BASE_URL/account` con sesión → `SettingsPage`, no 404 (regresión F-1) | P0 |
| SMK-013 | El sidebar no tiene enlaces rotos | Clic en todos los ítems por rol → 0× `NotFoundPage` | P0 |
| SMK-014 | El tenant correcto se aplica | 2 tenants distintos devuelven datos distintos, sin 500 | P0 |

**Resultado del gate:**

| Resultado | Acción |
|---|---|
| Todos `PASÓ` | Continuar a C1 |
| Algún P0 `FALLÓ` | **Detener.** Reportar solo el gate. No ejecutar nada más |
| Algún P0 `BLOQUEADO` | Continuar solo con las áreas que no dependan de ese caso. Marcar el resto `BLOQUEADO` |

---

## 4. Capa 1 — Transversal

> Condiciona todo lo demás. Un fallo aquí explica muchos fallos de C2.

### 10 · Autenticación, sesiones y 2FA · 26 casos · semanal

Cubre: login, refresh con rotación de familia, reutilización de token, `BroadcastChannel` entre
pestañas, logout, sesiones activas, cambio y reset de contraseña, anti-enumeración, 2FA TOTP,
registro por invitación, JWKS.

| Depende de | Bloquea |
|---|---|
| Gate G0 | Todas las áreas: sin sesión no hay nada |

**Defectos conocidos a verificar primero:** H-10 (reutilización de refresh), H-11
(anti-enumeración), H-12 (2FA sin cookie), H-13 (deep link a `/login`).

### 11 · Autorización, roles y permisos · 24 casos · semanal

Cubre: matriz rol→ruta del router, `ProtectedRoute`, redirección sin bucle, ownership/BOLA
(`assertPatientInTenant`, `assertDoctorPatientRelationship`), feature gating por plan en middleware,
`PremiumLocked`, candado del sidebar, 403 espurios, separación superadmin vs clínica.

| Depende de | Bloquea |
|---|---|
| `10` | Toda prueba con rol específico |

**Defectos conocidos:** H-14 (fail-closed), H-15 (gating en endpoint), H-22 (403 espurios),
H-23 (coherencia sidebar), H-61 (separación de espacios).

### 19 · Multi-tenancy y aislamiento · 20 casos · semanal

Cubre: `X-Tenant-Id`, GUC `app.tenant_id`, RLS `FORCE` en 37 tablas, roles `clinic_app` /
`clinic_superadmin` con `BYPASSRLS`, la exención de la política de `users`, `cie10_catalog` global,
fuga entre tenants, `unique_booking` **sin `tenant_id`**, fallback silencioso a `'default'`.

| Depende de | Bloquea |
|---|---|
| `10` | Cualquier prueba que compare datos entre tenants |

> **Riesgo conocido:** el fallback a `tenant_id = 'default'` cuando el GUC no está seteado. Una
> query sin GUC **no falla**: ve el tenant `default`. Probar explícitamente.

---

## 5. Capa 2 — Negocio

> Lo que la clínica usa todos los días. En orden de dependencia clínica, no alfabético.

| # | Área | Casos | Frecuencia | Depende de | Roles |
|---|---|---:|---|---|---|
| `13` | Usuarios, médicos y pacientes | 22 | Semanal | `11` | admin, superadmin |
| `16` | Agenda y citas | 32 | Semanal | `13`, `17` | admin, doctor, patient |
| `17` | Disponibilidad, calendario y feriados | 30 | Semanal | `13` | doctor, admin |
| `18` | Reserva de invitado | 26 | Semanal | `17` | invitado |
| `20` | Lista de espera | 14 | Semanal | `16` | patient, admin |
| `21` | Expedientes clínicos e historial | 28 | Semanal | `16`, `22` | doctor, admin, patient |
| `22` | Recetas y PDF | 20 | Semanal | `21` | doctor, patient |
| `23` | Laboratorio | 40 | Semanal | `13`, feature `laboratory` | lab_technician, doctor |
| `24` | Facturación | 26 | Semanal | `16`, `22` | admin, doctor |

### Orden interno de C2

`13` → `17` → `16` → `18` → `20` → `21` → `22` → `23` → `24`

- Los médicos deben existir **antes** de probar agenda y disponibilidad.
- La disponibilidad debe existir **antes** de reservar.
- Las citas deben existir **antes** de abrir expedientes, recetas y facturas.
- `21` y `22` van juntas: la receta cuelga del expediente
  (`prescriptions.clinical_record_id` es obligatorio).

**Defectos conocidos por área:**

| Área | Hallazgos |
|---|---|
| `16` | H-06 (sin unique), H-08 (email localhost), H-09 (duración al reprogramar), H-31 (solape sin test), H-32 (historial invisible), H-33 (`confirmed` vs `status`), H-53 (mensajes en inglés) |
| `17` | H-01 (domingo imposible), H-02 (4 rutas rotas), H-03 (días desplazados), H-34 (excepción imposible), H-35 (historial miente), H-36 (ICS sin cota), H-37 (ruta pública), H-54/H-55 (ICS no conforme) |
| `18` | H-04 (cancelación 400), H-05 (candado 42883), H-06, H-38 (enlace no confirma), H-39 (bloqueo inoperante), H-40 (agenda expuesta), H-41 (sin UI cancelar), H-42 (rate limit por IP), H-43, H-56…H-59 |
| `21` | H-22 (403 espurios), H-60 (residuos de QA) |
| `23` | H-44 (QC 42703) |
| `13` | H-19 (alta de médico) |

---

## 6. Capa 3 — Plataforma

| # | Área | Casos | Frecuencia | Depende de | Roles |
|---|---|---:|---|---|---|
| `14` | Onboarding y contratación | 16 | Quincenal | `11` | cualquiera, superadmin |
| `15` | SaaS, planes y checkout | 18 | Quincenal | `14` | admin, superadmin |
| `25` | Analítica y reportes | 20 | Quincenal | `16`, `24` | admin, lab_technician |
| `26` | Auditoría y trazabilidad | 14 | Quincenal | `19` | superadmin |
| `28` | Webhooks e integraciones | 16 | Quincenal | `15` | superadmin |

> ⚠️ **Destructivos.** `14` tiene un caso que **aproba** una solicitud: crea un tenant, un admin,
> una suscripción y datos iniciales que la UI **no puede deshacer** (H-07). Solo con
> `ALLOW_DESTRUCTIVE=true`. El camino de **rechazo** sí se prueba siempre.
>
> ⚠️ `28` tiene un hallazgo estructural conocido: `dispatchEvent()` **nunca se invoca**, así que
> `webhook_deliveries` no tiene una sola escritura. Los casos de entrega observarán `0` entregas.
> Verificar si es el defecto o si existe otro emisor.

---

## 7. Capa 4 — Sistemática

| # | Área | Casos | Frecuencia | Depende de |
|---|---|---:|---|---|
| `12` | Landing, marketing, precios y SEO | 18 | Mensual | — |
| `27` | Notificaciones | 16 | Mensual | `10` |
| `29` | Adjuntos y exportación | 14 | Mensual | `21` |
| `30` | Seguridad transversal | 24 | Mensual | `10`, `19` |
| `31` | i18n, tema, accesibilidad y responsive | 20 | Mensual | `10` |
| `32` | Rendimiento y operación | 16 | Mensual | — |

`12` y `32` no requieren sesión: se pueden correr en cualquier momento, incluso con el gate
fallando. Son la opción cuando el sistema está caído y hay que confirmar que al menos el público
funciona.

---

## 8. Dependencias entre áreas

```
G0 Gate
  ↓
10 Auth ──────┬──→ 11 Autorización ──┬──→ 13 Usuarios/médicos
              │                       │         ↓
              │                       │      17 Disponibilidad
              │                       │         ↓
              │                       ├──→ 16 Agenda ──┬──→ 20 Lista de espera
              │                       │                ├──→ 21 Expedientes ──→ 22 Recetas
              │                       │                └──→ 24 Facturación
              │                       │                       ↓
              │                       └──→ 23 Laboratorio   25 Analítica
              ↓
           19 Multi-tenancy ──→ 26 Auditoría
              ↓
   14 Onboarding ──→ 15 SaaS ──→ 28 Webhooks

12 Landing          (sin sesión, paralelizable)
27 Notificaciones ─→ depende de 10
29 Adjuntos ──────→ depende de 21
30 Seguridad ─────→ depende de 10 y 19
31 i18n/UX ───────→ depende de 10
32 Rendimiento     (sin sesión, paralelizable)
```

**Reglas de bloqueo:**

| Si falla | No ejecutar |
|---|---|
| G0 | Nada |
| `10` (login) | Todas las áreas con sesión |
| `11` (permisos) | Toda prueba con rol específico. Queda indeterminado si el 403 es correcto |
| `13` (médicos) | `16`, `17`, `18`, `20`, `23` |
| `17` (disponibilidad) | `16`, `18` |
| `16` (citas) | `21`, `22`, `24`, `25` |
| `21` (expedientes) | `22` (la receta cuelga del expediente) |
| Feature `laboratory` ausente | `23` completo |

---

## 9. Matriz de cobertura por rol

| Área | superadmin | admin | doctor | lab_tech | patient | invitado | anónimo |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `10` Auth | ✔ | ✔ | ✔ | ✔ | ✔ | | |
| `11` Autorización | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `12` Landing | | | | | | | ✔ |
| `13` Usuarios | ✔ | ✔ | | | | | |
| `14` Onboarding | ✔ | | | | | ✔ | ✔ |
| `15` SaaS | ✔ | ✔ | | | | | |
| `16` Agenda | ✔ | ✔ | ✔ | | ✔ | ✔ | |
| `17` Disponibilidad | ✔ | ✔ | ✔ | | | | |
| `18` Invitado | | | | | | ✔ | ✔ |
| `19` Multi-tenancy | ✔ | ✔ | ✔ | ✔ | ✔ | | |
| `20` Lista de espera | | ✔ | ✔ | | ✔ | | |
| `21` Expedientes | ✔ | ✔ | ✔ | | ✔ | | |
| `22` Recetas | | ✔ | ✔ | | ✔ | | |
| `23` Laboratorio | ✔ | ✔ | ✔ | ✔ | ✔ | | |
| `24` Facturación | ✔ | ✔ | ✔ | | | | |
| `25` Analítica | | ✔ | ✔ | ✔ | | | |
| `26` Auditoría | ✔ | | | | | | |
| `27` Notificaciones | ✔ | ✔ | ✔ | ✔ | ✔ | | |
| `28` Webhooks | ✔ | | | | | | |
| `29` Adjuntos | | ✔ | ✔ | | ✔ | | |
| `30` Seguridad | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `31` i18n/UX | ✔ | ✔ | ✔ | ✔ | ✔ | | ✔ |
| `32` Rendimiento | | | | | | | ✔ |

> **Hueco detectado:** `patient` **no tiene** casos propios de notificaciones (`27`) pese a ser
> el destinatario real. Según el análisis previo, el badge de la campana cuenta el total en vez
> de las no leídas, y `/notifications` excluye a `patient` y `user`. Ver `99-HUECOS-COBERTURA.md`.

---

## 10. Frecuencia y calendario sugerido

| Momento | Áreas | Casos | Tiempo |
|---|---|---:|---|
| **Cada deploy** | G0 | 14 | 10 min |
| **Semanal** | `10`, `11`, `19` (C1) + `13`, `16`, `17`, `18`, `20`, `21`, `22`, `23`, `24` (C2) | 308 | 3 h 30 |
| **Quincenal** | `14`, `15`, `25`, `26`, `28` | 84 | 2 h |
| **Mensual** | `12`, `27`, `29`, `30`, `31`, `32` | 108 | 2 h |
| **Trimestral (todo)** | 23 áreas + G0 | 514 | ~7 h 15 |

---

## 11. Criterios de aceptación

La ruta se considera satisfactoria cuando:

- [ ] Los 14 casos del gate pasan
- [ ] Ningún P0 falla
- [ ] Ningún P1 falla
- [ ] Los P2 pasan ≥ 90 %
- [ ] Ningún caso de seguridad (`30-`) falla
- [ ] Ningún caso de aislamiento (`19-`) falla
- [ ] 0 errores de consola no justificados
- [ ] 0 respuestas 4xx/5xx inesperadas
- [ ] Los casos marcados ⚠️ DESTRUCTIVO se omitieron o se ejecutaron con autorización
- [ ] Los defectos conocidos de `90-` están confirmados o refutados, no ignorados
- [ ] Todos los datos creados están limpios o listados como pendientes

---

## 12. Entrega del reporte

```markdown
# Reporte de pruebas — <fecha>

**Entorno:** https://clinica-salud-vital.onrender.com
**Alcance:** archivos ejecutados
**Duración:** <minutos>

## Resumen
| Prioridad | Total | Pasó | Falló | Bloqueado | N/A | Omitido |
|---|---:|---:|---:|---:|---:|---:|

**Semáforo:** 🟢 apto / 🟡 con observaciones / 🔴 no apto

## Gate G0
| Caso | Resultado | Nota |
|---|---|---|

## Detalle por caso
### [AUT-007] Lockout tras 5 intentos
- **Resultado:** FALLÓ
- **Observado (literal):** tras el 6.º intento la UI muestra "Credenciales inválidas"
- **Esperado:** mensaje de bloqueo con minutos restantes
- **Red:** `POST /api/auth/login` → 401 `AUTH_LOCKED` (el backend responde bien, el mapeo de i18n no)
- **Causa probable:** mapeo de errores en `frontend/src/i18n`
- **Evidencia:** `aut-007-lockout.png`

## Defectos conocidos confirmados
| Hallazgo | Área | Estado observado |
|---|---|---|

## Hallazgos nuevos
| # | Sev | Descripción | Evidencia | Archivo sugerido |
|---|---|---|---|---|

## Datos creados y limpieza
| Entidad | Identificador | Limpiado |
|---|---|---|

## Limitaciones
- Sin `EMAIL_TEST` → casos de confirmación BLOQUEADOS
- Captcha resuelto manualmente por el operador
```

---

*Índice generado a partir de 23 áreas funcionales (500 casos), un gate de 14 casos, 24 módulos
backend, ~220 endpoints, 60+ rutas frontend, 31 migraciones y 48 tablas. Última revisión: 2026-10-01.*

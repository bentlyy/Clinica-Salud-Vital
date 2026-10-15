# 00 — README: ruta de pruebas del sistema Vitaria

> **Qué es esta carpeta.** Un mapa funcional y una ruta de pruebas del sistema **Vitaria**, una
> plataforma SaaS multi-tenant de gestión clínica. Cada archivo describe **qué funciones existen,
> cómo deberían funcionar y cómo verificarlas**. No es documentación de uso: es material de trabajo
> para quien vaya a probar el sistema.

> **Estado: análisis completo, ejecución pendiente.** La ruta fue construida leyendo el código
> fuente. **Ningún caso se ha ejecutado en esta versión.** Nada aquí está validado contra
> producción hasta que se corra.

---

## 1. Regla de oro

> Un caso que hay que interpretar no está bien escrito.
>
> - Si hay que preguntar *«¿qué valor pongo aquí?»* → falta **Datos**.
> - Si hay que adivinar si algo está bien o mal → falta un **Esperado** observable.
> - Si no se sabe qué debe ser verdad antes de empezar → falta **Precondición**.
> - Si no se sabe cómo limpiar lo que se creó → falta **Limpieza**.
> - Si no hay dónde escribir el veredicto → falta **Resultado**.

---

## 2. Identificación del sistema

| Campo | Valor |
|---|---|
| **Nombre** | Vitaria — Sistema de Gestión Clínica SaaS |
| **Propósito** | Plataforma multi-tenant para clínicas: agenda médica, expedientes clínicos, laboratorio, facturación, analítica y control de planes SaaS |
| **Arquitectura** | Monolito modular (ADR-001): SPA React independiente + API REST monolítica |
| **Repositorio** | `bentlyy/Clinica-Salud-Vital` |
| **Producción** | `https://clinica-salud-vital.onrender.com` |
| **Backend** | Node.js 20 · Express 4.22 · TypeScript 5.8 · PostgreSQL 15 (`pg`, SQL crudo, **sin ORM**) · Zod 4 |
| **Frontend** | React 19 · Vite 6 · TypeScript 5.7 · MUI 6 · TanStack Query 5 · React Hook Form 7 · Recharts 2 · FullCalendar 6 · i18next |
| **Despliegue** | Render (`vitaria-api` + `vitaria-frontend`) · Docker/nginx para self-hosted |
| **Idiomas** | 4 — `es` (default) · `en` · `pt` · `fr` |

### Superficie de código

| Capa | Volumen |
|---|---|
| Módulos backend | 24 directorios en `src/modules/` |
| Endpoints REST | ~220 en 24 routers bajo prefijo `/api` (**sin versionado**) |
| Archivos backend | 132 `.ts` |
| Tablas | 48 |
| Migraciones | 31 (`db/migrations/001…031`) |
| Rutas frontend | 60+ (`AppRouter.tsx`) |
| Módulos frontend | 31 carpetas en `frontend/src/modules` |
| Claves i18n | 3 768 en `es.json` (72 namespaces × 4 idiomas) |
| Tablas con RLS `FORCE` | 37 |
| Tests existentes | Vitest (unitarios + integración) bajo `tests/`. **No hay E2E.** |

---

## 3. Los 7 roles

| Rol | Identificador | Home tras login | Alcance |
|---|---|---|---|
| Superadministrador | `superadmin` | `/saas` | Plataforma: tenants, onboarding, usuarios globales, cobros |
| Administrador de clínica | `admin` | `/dashboard` | Usuarios, médicos, agenda, facturación, auditoría |
| Médico | `doctor` | `/dashboard` | Agenda propia, fichas, recetas, historial, resultados lab |
| Técnico de laboratorio | `lab_technician` | `/laboratory` | Muestras, trabajo, validación técnica, QC |
| Paciente | `patient` | `/dashboard` | Citas, expedientes propios, recetas, resultados |
| Usuario | `user` | `/dashboard` | **Alias histórico** de `patient`: el `CHECK` de `users.role` lo acepta y el backend lo trata como tal, pero no es un rol con permisos propios |
| Invitado | `guest` | — | Anónimo: reserva pública por RUT, sin sesión |

> El rol `guest` existe en el esquema (`CHECK` de `users.role`) pero **no tiene enforcement en la
> API**: la reserva anónima no crea usuario. Ver `19-` y `30-`.

---

## 4. Estructura de la carpeta

| Archivo | Contenido | Casos |
|---|---|---|
| `00-README.md` | Este documento: reglas, roles, credenciales, entorno, formato de reporte | — |
| `01-RUTA-DE-PRUEBAS.md` | **Índice maestro**: qué archivo cubre qué, en qué orden, con qué frecuencia | — |
| `02-CATALOGO-FUNCIONES.md` | Inventario maestro: función → módulo → ruta → endpoint → rol → dónde se prueba | — |
| `98-TEMPLATE-AREA.md` | Formato de un archivo de área. **Leer antes de escribir un caso.** | — |
| `90-HALLAZGOS-CODIGO.md` | 61 defectos conocidos por análisis estático | — |
| `99-HUECOS-COBERTURA.md` | Funcionalidades sin cobertura, riesgos y plan de cierre | — |
| `10-autenticacion-sesiones-2fa.md` | Auth, sesiones, refresh, 2FA, contraseñas, invitaciones | 26 |
| `11-autorizacion-roles-permisos.md` | RBAC, ownership/BOLA, feature gating por plan | 24 |
| `12-landing-marketing-precios.md` | Landing, SEO, cookies/GA, multimoneda, páginas legales | 18 |
| `13-usuarios-medicos-pacientes.md` | Usuarios, médicos, invitaciones, pacientes, especialidades | 22 |
| `14-onboarding-saas-contratacion.md` | Solicitud de contratación, documentos, aprobación/rechazo | 16 |
| `15-saas-planes-checkout.md` | Planes, límites, suscripción, cancelaciones, uso | 18 |
| `16-agenda-citas.md` | Ciclo de vida de citas, series, reprogramación, cancelaciones | 32 |
| `17-disponibilidad-calendario-feriados.md` | Bloques horarios, excepciones, feriados, FullCalendar, `.ics` | 30 |
| `18-reserva-invitada.md` | Reserva anónima por RUT, consulta, cancelación, confirmación | 26 |
| `19-multi-tenancy-aislamiento.md` | RLS, GUC, `X-Tenant-Id`, fuga entre tenants | 20 |
| `20-lista-espera.md` | Unirse, notificar, reservar desde la lista, salir | 14 |
| `21-expedientes-clinicos.md` | Fichas, CIE-10, signos vitales, historial médico | 28 |
| `22-recetas-pdf.md` | Recetas, medicamentos, PDF, vista del paciente | 20 |
| `23-laboratorio.md` | Ciclo de 7+ estados, doble validación, muestras, QC, equipos, SSE | 40 |
| `24-facturacion.md` | Facturas, ítems, pagos, estados, totales | 26 |
| `25-analitica-reportes.md` | KPIs, series, rankings, reportes, export CSV/JSON | 20 |
| `26-auditoria-trazabilidad.md` | Bitácora, cadena HMAC, correlación, exports | 14 |
| `27-notificaciones.md` | Bandeja, campana, no leídas, SSE de laboratorio | 16 |
| `28-webhooks-integraciones.md` | Suscripciones, entregas, firmas, reintentos | 16 |
| `29-adjuntos-exportacion.md` | Adjuntos base64, portabilidad de datos | 14 |
| `30-seguridad.md` | CSRF, rate limit, lockout, cabeceras, RUT, anti-enumeración | 24 |
| `31-i18n-tema-accesibilidad.md` | 4 idiomas, tema, responsive, navegación por teclado | 20 |
| `32-rendimiento-operacion.md` | Health, métricas, cola, jobs, migraciones, consola | 16 |

**Total previsto: 23 áreas de dominio (archivos `10-` a `32-`) · 500 casos, más 14 casos del gate
G0 = 514 casos en total.** El gate vive en `01-RUTA-DE-PRUEBAS.md` §3, no en un archivo de área.

---

## 5. Variables de entorno

La IA debe pedir estos valores **antes de empezar**. No adivinar contraseñas.

| Variable | Valor por defecto | Notas |
|---|---|---|
| `BASE_URL` | `https://clinica-salud-vital.onrender.com` | Sin barra final |
| `ADMIN_PASSWORD` | *(preguntar)* | Del entorno del servidor. Sin fallback |
| `SUPERADMIN_PASSWORD` | *(preguntar)* | Del entorno del servidor. Sin fallback |
| `SEED_YEAR` | `2026` | Año para derivar contraseñas seed |
| `EMAIL_TEST` | *(opcional)* | Buzón para capturar emails. Sin él, los casos dependientes son `BLOQUEADO` |
| `TOTP_SECRET` | *(opcional)* | Para 2FA automático. Sin él, la 2FA es manual |
| `ALLOW_DESTRUCTIVE` | `false` | `true` **solo** con autorización explícita del operador |
| `RECAPTCHA_HUMAN` | `false` | `true` cuando el operador resuelva captchas manualmente |

> **Captcha.** El login y el onboarding usan reCAPTCHA. El ejecutor **no puede resolverlo**:
> la variable `RECAPTCHA_HUMAN` marca los casos que requieren intervención humana, y el
> operador completa el widget. Un caso bloqueado por captcha es `BLOQUEADO`, nunca `FALLÓ`.

> **Cold start.** Render duerme el servicio tras inactividad. El primer request puede tardar
> ~50 s. **Esperar una vez al inicio** y luego medir en caliente; un timeout en la primera
> petición no es un defecto del sistema.

---

## 6. Credenciales de prueba

### 6.1 Regla de derivación de contraseñas

Los usuarios seed reciben una contraseña derivada de su email:

```
Vitaria.<parte-local-del-email>.<año>!
```

| Ejemplo | Resultado |
|---|---|
| `juan@clinic.com` | `Vitaria.juan.2026!` |
| `user1@clinic.com` | `Vitaria.user1.2026!` |
| `lab@clinic.com` | `Vitaria.lab.2026!` |

> **El año es dinámico** (`seed-credentials.ts:20-23`). Calcularlo desde `SEED_YEAR`, nunca
> hardcodear `2026` en un reporte.

### 6.2 Tabla de cuentas

| Rol | Email | Contraseña | Tenant | Plan | Notas |
|---|---|---|---|---|---|
| `superadmin` | `superadmin@clinic.com` | `$SUPERADMIN_PASSWORD` | *(ninguno)* | — | `tenant_id` NULL, pool `BYPASSRLS` |
| `admin` | `admin@clinic.com` | `$ADMIN_PASSWORD` | `default` | — | Clínica principal |
| `doctor` | `juan@clinic.com` | `Vitaria.juan.<año>!` | `default` | — | Cardiología |
| `doctor` | `maria@clinic.com` | `Vitaria.maria.<año>!` | `default` | — | Dermatología |
| `doctor` | `carmen@clinic.com` | `Vitaria.carmen.<año>!` | `default` | — | Endocrinología |
| `doctor` | `pedro@clinic.com` | `Vitaria.pedro.<año>!` | `default` | — | Medicina general |
| `lab_technician` | `lab@clinic.com` | `Vitaria.lab.<año>!` | `default` | — | Técnico de laboratorio |
| `patient` | `user1@clinic.com` | `Vitaria.user1.<año>!` | `default` | — | Paciente con historial |
| `patient` | `user2@clinic.com` | `Vitaria.user2.<año>!` | `default` | — | Paciente |
| `patient` | `user3@clinic.com` | `Vitaria.user3.<año>!` | `default` | — | Paciente |
| `admin` | `admin@demo.clinic.com` | `DemoVitaria2026!` | `clinica-demo` | pro | **Demo pública** |
| `lab_technician` | `lab@demo.clinic.com` | `DemoVitaria2026!` | `clinica-demo` | pro | Demo |
| `admin` | `admin@norte.clinic.com` | `Vitaria.admin.<año>!` | `clinica-norte` | pro | **Tenant de comparación** |
| `lab_technician` | `lab@norte.clinic.com` | `Vitaria.lab.<año>!` | `clinica-norte` | pro | |
| `admin` | `admin@sur.clinic.com` | `Vitaria.admin.<año>!` | `clinica-sur` | basic | **Tenant SIN feature `laboratory`** |

> ⚠️ La contraseña de la demo es **pública por diseño** (`frontend/src/shared/config/demo.ts`):
> cualquiera que visite `/` la lee en el bundle. El tenant `clinica-demo` **no debe contener
> datos reales**.

### 6.3 Mapeo rol → ruta de inicio

| Rol | Destino |
|---|---|
| `superadmin` | `/saas` |
| `lab_technician` | `/laboratory` |
| `admin`, `doctor`, `patient`, `user` | `/dashboard` |

---

## 7. Reglas obligatorias para quien ejecuta

### 7.1 Seguridad

1. **Nunca inventar contraseñas.** Si falta `ADMIN_PASSWORD` o `SUPERADMIN_PASSWORD`, preguntar.
2. **Nunca escribir secretos en el reporte.** Enmascarar: `Vitaria.j***.2026!`.
3. **No ejecutar casos `⚠️ DESTRUCTIVO` sin `ALLOW_DESTRUCTIVE=true`.** Destructivos: eliminar
   tenant, `reset-admin`, eliminar usuario real, `logout-all` de otro usuario, **aprobar una
   solicitud de onboarding** (H-07: crea un tenant que la UI no puede deshacer).
4. **No tocar `clinica-demo` más allá de lo necesario.** Es público.
5. **No hacer signup real de tenants** sin autorización: crea tenants que hay que limpiar.
6. **No modificar datos de producción** fuera de los tenants de prueba.

### 7.2 Ejecución

7. **Contexto de navegador limpio por caso P0.** Si falla, limpiar cookies y `localStorage`.
8. **Una sesión por rol.** Nunca cambiar de identidad a mitad de un caso.
9. **Verificar red además de UI.** Cada caso indica la petición a inspeccionar.
10. **Esperar a que la UI se estabilice.** No afirmar nada sobre un `LoadingState`.
11. **Evidencia en cada fallo:** captura + consola + petición de red + URL.
12. **Un caso bloqueado por captcha es `BLOQUEADO`**, no `FALLÓ`.

### 7.3 Datos

13. **Prefijar los datos de prueba** con `QA-` o `ZZ-TEST-` para localizarlos y limpiarlos.
14. **Anotar la limpieza.** Si un caso crea un registro, indicar cómo se eliminó.
15. **No reutilizar datos** de casos anteriores salvo que el caso lo diga.
16. **Usar fechas futuras siempre.** El backend tiene
    `CHECK (date >= CURRENT_DATE - INTERVAL '1 day')` en `bookings`.
17. **Contar filas de `audit_logs` con criterio.** Los triggers `security_audit` y `phi_audit`
    insertan filas extra en cada `INSERT` de `users`, `clinical_records`, `invoices` y `payments`.

### 7.4 Reporte

18. **Un resultado por caso:** `PASÓ` · `FALLÓ` · `BLOQUEADO` · `N/A` · `OMITIDO`.
19. **`BLOQUEADO` ≠ `FALLÓ`.** Bloqueado = dependencia externa ausente. Reportar por separado.
20. **Incluir el error literal** del toast, de la respuesta de red o de la consola.
21. **Reportar hallazgos nuevos** no contemplados, con su propia evidencia.
22. **Anotar defectos conocidos** como `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.

---

## 8. Checklist de sesión por rol

Antes de cada bloque de pruebas de un rol:

- [ ] Abrir contexto de navegador limpio (sin cookies ni storage)
- [ ] Navegar a `$BASE_URL/`
- [ ] Resolver o aceptar el captcha de forma **consistente** en toda la sesión
- [ ] Autenticar con las credenciales del rol
- [ ] Confirmar que la URL de destino coincide con §6.3
- [ ] Confirmar que el nombre del usuario aparece en el topbar
- [ ] Confirmar **0 errores en la consola**

---

## 9. Configuración del navegador

| Aspecto | Valor | Motivo |
|---|---|---|
| Viewport escritorio | `1440 x 900` | Layout con sidebar visible (breakpoint MUI: móvil < 900 px) |
| Viewport móvil | `390 x 844` | Responsive (`31-`) |
| Viewport tablet | `820 x 1180` | Responsive (`31-`) |
| Idioma | `es-CL` | Default del producto |
| Zona horaria | `America/Santiago` | Citas, recordatorios y `.ics` |
| Consola | Visible, sin filtrar | Detección de errores |
| Red | Visible, sin throttling | Salvo `32-` |

> **Tema:** atributo `data-theme` en `<html>`, persistido en `localStorage['theme_mode']`.
> Valores `light` / `dark`. Inicial según `prefers-color-scheme`.
> **Idioma:** `localStorage['lang']`, actualiza `document.documentElement.lang`.
> El tema **no** es una clase CSS.

---

## 10. Formato de un caso

Cada caso tiene esta forma exacta. Detalle completo en `98-TEMPLATE-AREA.md`.

```markdown
### [PREFIX-NNN] Título en imperativo

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** el paciente tiene 2 citas próximas y ninguna leída.
**Datos:** `fecha` = 2026-11-15 · `hora` = 10:00

1. Abrir `/bookings`.
2. Pulsar "Cancelar" en la cita del 15.

**Esperado**
- `PATCH /api/bookings/:id/cancel` → 200 con `status: "cancelled"`
- La cita desaparece de "Próximas" y aparece en "Pasadas"
- Toast "Cita cancelada"

**Red:** `PATCH /api/bookings/:id/cancel` → 200. Verificar `status` en el cuerpo.
**Limpieza:** ninguna (la cita queda cancelada; es el estado esperado)
```

### Línea de encabezado, siempre en este orden

```
**Rol** `rol` · **Ruta** `/ruta` · **P0` · `Bloqueante** · **Resultado** `______`
```

| Parte | Regla |
|---|---|
| `**Rol**` | Uno de: `superadmin`, `admin`, `doctor`, `lab_technician`, `patient`, `user`, `invitado`, `cualquiera`. Varios separados por coma |
| `**Ruta**` | Ruta de UI donde empieza el caso, o `—` si es solo por red |
| `**P0`…`P3**` | Ver tabla de prioridades |
| `**Bloqueante**` | Solo si es `P0` y su fallo detiene el área. Si no, se omite |
| `**Resultado** \`______\`` | **Obligatorio y siempre el último.** Aquí va el veredicto |

---

## 11. Prioridades

| Nivel | Definición | Si falla |
|---|---|---|
| **P0** | Bloqueante: el sistema no es usable | **Detener el área** y reportar |
| **P1** | Funcionalidad principal rota para un rol | Continuar, reportar como crítico |
| **P2** | Funcionalidad secundaria o caso borde | Continuar |
| **P3** | Cosmético, i18n, accesibilidad | Anotar |

---

## 12. Vocabulario de resultados

| Resultado | Cuándo usarlo |
|---|---|
| `PASÓ` | Se cumplieron todos los esperados |
| `FALLÓ` | Al menos un esperado no se cumplió. **Obligatorio:** observación literal + esperado + evidencia |
| `BLOQUEADO` | No se pudo ejecutar por dependencia externa. Indicar qué falta |
| `N/A` | No aplica en este entorno (ej: un plan que este tenant no tiene) |
| `OMITIDO` | No ejecutado a propósito (destructivo, o impedido por un caso previo). Indicar motivo |

> `BLOQUEADO` no es `FALLÓ`. Un caso bloqueado no cuenta como defecto del sistema, pero sí como
> hueco de cobertura. Reportar ambos por separado.

---

## 13. Prefijos por área

| Prefijo | Área | Archivo |
|---|---|---|
| `SMK` | Smoke (gate de entrada) | `01-RUTA-DE-PRUEBAS.md` §Gate |
| `AUT` | Autenticación, sesiones, 2FA | `10-` |
| `AUTZ` | Autorización, roles, permisos | `11-` |
| `LND` | Landing, marketing, precios | `12-` |
| `USR` | Usuarios, médicos, pacientes | `13-` |
| `ONB` | Onboarding y contratación | `14-` |
| `SAS` | SaaS, planes, checkout | `15-` |
| `AGD` | Agenda y citas | `16-` |
| `AVL` | Disponibilidad, calendario, feriados | `17-` |
| `GST` | Reserva de invitado | `18-` |
| `TEN` | Multi-tenancy y aislamiento | `19-` |
| `WTL` | Lista de espera | `20-` |
| `CLI` | Expedientes clínicos, historial | `21-` |
| `RCT` | Recetas, PDF | `22-` |
| `LAB` | Laboratorio | `23-` |
| `FAC` | Facturación | `24-` |
| `ANA` | Analítica y reportes | `25-` |
| `AUD` | Auditoría y trazabilidad | `26-` |
| `NTF` | Notificaciones | `27-` |
| `WHK` | Webhooks e integraciones | `28-` |
| `ADJ` | Adjuntos y exportación | `29-` |
| `SEC` | Seguridad transversal | `30-` |
| `UX` | i18n, tema, accesibilidad, responsive | `31-` |
| `RND` | Rendimiento y operación | `32-` |

---

## 14. Fuentes de verdad

> **El código gana.** Si una prueba y el código discrepan, el código es correcto y la prueba está
> mal. Reportar la discrepancia como hallazgo, no como fallo del sistema.

| Fuente | Para qué |
|---|---|
| `src/modules/**` | Comportamiento real del backend, middlewares, validaciones |
| `src/app.ts` | Orden de middlewares y montaje de routers. **Ningún prefijo `/api/v1`** |
| `db/migrations/**` | Estados, CHECK constraints, FKs, defaults reales |
| `db/init.sql` | Esquema base: enums, índices, vistas |
| `frontend/src/app/router/AppRouter.tsx` | Rutas de UI, roles permitidos, features exigidas |
| `frontend/src/shared/constants/navigation.tsx` | Ítems del sidebar y sus rutas |
| `frontend/src/i18n/locales/es.json` | Texto literal de la UI (3 768 claves) |
| `90-HALLAZGOS-CODIGO.md` | 61 defectos conocidos. No re-reportarlos como nuevos |
| `../wiki/` | Documentación del proyecto. **Desalineada en varios puntos** (ver `99-`) |

---

## 15. Facts del sistema que surprise a quien prueba

Estas cosas **no son bugs**. Verificarlas antes de reportarlas.

| # | Hecho | Detalle |
|---|---|---|
| 1 | No hay versionado de API | El base path es `/api`, **no** `/api/v1/`. Cualquier doc que diga lo contrario está mal |
| 2 | No hay tipos ENUM en Postgres | Todos los estados son `CHECK (col IN (...))`. No hay `CREATE TYPE` |
| 3 | No hay vistas ni funciones de negocio | Cero `CREATE VIEW`. La lógica está en TypeScript |
| 4 | No hay FSM en la base de datos | Las transiciones de estado **solo** están en el código TS |
| 5 | `bookings` tiene dos campos de estado | `confirmed` (booleano legacy) y `status` (texto). Coexisten y a veces discrepan (H-33, H-43) |
| 6 | `bookings` no tiene `updated_at` | Ninguna de las tablas de citas lo tiene |
| 7 | El `unique` de booking es **global** | `unique_booking (doctor_id, date, time)` **no incluye `tenant_id`** |
| 8 | El aislamiento SÍ existe en la BD | RLS `FORCE` en 37 tablas, GUC `app.tenant_id`, roles `clinic_app` / `clinic_superadmin` |
| 9 | …pero con fallback silencioso | Sin GUC seteado, la política usa `tenant_id = 'default'`. Una query sin GUC ve el tenant `default` |
| 10 | `tenants` no tiene `status` | Solo `active BOOLEAN` + `deleted_at` (soft delete) |
| 11 | Los resultados de lab viven en JSONB | No hay tabla `lab_results`: están en `lab_request_items.results` |
| 12 | Las recetas son 1 fila = 1 medicamento | No hay tabla de ítems. `clinical_record_id` es obligatorio |
| 13 | `jobs.status` y `reports.status` no tienen CHECK | Aceptan valores arbitrarios |
| 14 | `cie10_catalog` es global sin RLS | Por diseño: es catálogo transversal |
| 15 | 2 carpetas frontend están vacías | `clinical-templates/` y `tenants/` no tienen `.tsx` |
| 16 | Hay código muerto en el frontend | `SuperAdminAnalyticsPage.tsx` (787 líneas) y `PrescriptionsPage.tsx` (401) **no están enrutadas** |
| 17 | Existen 2 carpetas de layouts sin usar | `PatientLayout.tsx` y `AuthLayout.tsx` no están en el router |
| 18 | `user` es alias de `patient` | `normalizeRole()` en `frontend/src/shared/utils/role.utils.ts:24`. **El backend no lo centraliza**: repite `role === 'user' \|\| role === 'patient'` inline en 20 sitios (H-62) |
| 19 |JWKS está en stub | El endpoint devuelve `{ keys: [] }` |
| 20 | El SSE de laboratorio es el único tiempo real | El resto de la app no tiene push |

---

*Construido leyendo el código fuente: 132 archivos backend, 24 módulos, ~220 endpoints,
31 migraciones, 48 tablas, 37 con RLS; 31 módulos frontend, 60+ rutas, 3 768 claves i18n.
Última revisión: 2026-10-01.*

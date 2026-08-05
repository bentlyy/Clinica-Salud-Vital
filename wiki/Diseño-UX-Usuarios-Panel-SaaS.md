# 🎨 Diseño UX/UI — Gestión de Usuarios y Panel SaaS (Superadmin)

> Documento de diseño de nivel comercial para las secciones de **Gestión de Usuarios** y **Panel SaaS (Superadmin)**.
> Inspirado en Linear, Stripe Dashboard, Vercel Analytics, Notion, Clerk, Supabase y Figma.
> Stack objetivo: **React 19 + TypeScript + Material UI (v6) + Framer Motion**.

[[SuperAdmin]] · [[SaaS]] · [[Usuarios]] · [[Arquitectura-Frontend]] · [[Componentes]] · [[Convenciones]]

---

## 1. Principios de diseño

1. **Densidad inteligente** — la información se agrupa por tarjetas y filas-tarjeta, nunca en tablas "Bootstrap".
2. **Jerarquía visual primero** — el ojo lee: valor principal → tendencia → contexto → acción.
3. **Microinteracciones (≤200 ms)** — todo feedback es inmediato, sutil y con easing `cubic-bezier(0.4, 0, 0.2, 1)`.
4. **Color = significado** — los colores se usan SOLO para comunicar estado, rol o tendencia. Nunca como decoración.
5. **Espacio en blanco generoso** — las cards flotan, los bordes respiran (16 px), las sombras son suaves.
6. **Accesibilidad WCAG 2.2 AA como requisito, no como check** — contraste, foco visible y navegación por teclado desde el primer pixel.

---

## 2. Design System tokens (Material Design 3)

### 2.1 Paleta semántica

| Token | Valor | Uso |
|---|---|---|
| `brand.primary` | `#1976D2` (azul) | Acciones primarias, enlaces, acentos |
| `success` | `#2E7D32` | Activo, positivo, tendencia al alza |
| `error` | `#D32F2F` | Bloqueado, cancelado, caída |
| `warning` | `#ED6C02` | Past due, trial próximo a vencer, alertas media |
| `info` | `#0288D1` | Informativo |
| `neutral` | `#64748B` | Inactivo, "nunca", sin dato |

> Mantener ratio de contraste ≥ 4.5:1 para texto, ≥ 3:1 para componentes. Colores de badge siempre en pares `bg 10–15% alpha` + `fg sólido` (patrón ya usado en el repo).

### 2.2 Badges de rol

| Rol | Fg | Bg |
|---|---|---|
| Administrador | `#1565C0` | `#1565C020` |
| Médico | `#2E7D32` | `#2E7D3220` |
| Laboratorio | `#6D28D9` | `#6D28D920` |
| Recepción | `#EA580C` | `#EA580C20` |
| Paciente | `#6B7280` | `#6B728020` |
| Superadmin | `#D32F2F` | `#D32F2F20` |

### 2.3 Badges de estado

| Estado | Fg | Bg | Dot |
|---|---|---|---|
| Activo | `#2E7D32` | `#E8F5E9` | ● vivo |
| Bloqueado | `#D32F2F` | `#FFEBEE` | ● pulso suave |
| Inactivo | `#64748B` | `#F1F5F9` | ○ |

### 2.4 Tipografía

- Display: **Sora / Inter** (headings 24–32 px, weight 700, `letter-spacing: -0.02em`).
- Body: **Inter / Manrope** (14 px base, 16 px en lectura).
- Números/métricas: **tabular-nums** (esencial para KPIs y MRR).
- Micro-labels: 11–12 px, weight 500, uppercase opcional.

### 2.5 Shape / Elevación / Movimiento

- Cards: `border-radius: 16px`, borde `1px solid divider`, sombra `0 1px 2px rgba(16,24,40,.05), 0 8px 24px rgba(16,24,40,.06)`.
- Hover: translateY(-2px) + sombra elevada, 200 ms.
- Entrada de página: fade + `y: 12px → 0`, stagger 40 ms entre elementos.
- Skeletons: shimmer con gradiente animado `#F1F5F9 → #E2E8F0`.

---

## 3. Sección 1 — Gestión de Usuarios

### 3.1 Arquitectura de la pantalla

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Usuarios · "Administra los usuarios y permisos…"  [Nuevo usuario] │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Buscar usuario…]  [Rol ▾]  [Estado ▾]        [Limpiar] │
├─────────────────────────────────────────────────────────────┤
│ [Users]  [Active]  [Blocked]  [LastLogin]      ← 4 stat cards │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Avatar  Nombre    Rol █   Estado ●   Último acceso  ⚙  ⋯ │ │  ← fila-tarjeta desktop
│ │         cargo · correo · tel · RUT     ▰▰▰ actividad    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ …                                                            │
├─────────────────────────────────────────────────────────────┤
│ Paginación · "Mostrando 1–10 de 47"                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes

#### `UserAvatar`
- Iniciales (1–2 chars) o foto; **anillo de 2 px con el color del rol**.
- Tooltip con nombre + rol.

#### `RoleBadge`
- Chip pastel con dot de color; label traducido (`roleLabels.*`). Reutiliza `getRoleLabel/getRoleColor`.

#### `StatusBadge`
- Chip con dot: Activo (verde, dot vivo), Bloqueado (rojo, pulso), Inactivo (gris, dot vacío).
- **Nunca texto plano** — siempre badge.

#### `UserRow` / `UserCard` (fila-tarjeta)
Desktop = fila horizontal; Tablet/Mobile = card vertical. Contenido:
1. `UserAvatar` + nombre (600) + cargo secundario.
2. Datos contacto en una línea `correo · teléfono · RUT` (se truncan con `…`).
3. `RoleBadge`.
4. `StatusBadge`.
5. **Último acceso**: texto relativo ("Hace 2 horas", "Hace 3 días", "Nunca") + icono de actividad; 3 puntos de actividad reciente con opacidad según frecuencia.
6. Acciones: icono **Editar**, botón **Activar/Desactivar** (icono contextual), menú **⋯** (más opciones).
- Hover: elevación + borde primario 10% + fondo sutil.
- `aria-label` descriptivo por fila; acciones accesibles por teclado (orden tab natural).

#### `UserFilters`
- Input de búsqueda con icono y **debounce 400 ms** (busca nombre, correo, teléfono, RUT).
- Select **Rol**: Todos / Administrador / Médico / Laboratorio / Recepción / Paciente.
- Select **Estado**: Activos / Bloqueados / Inactivos / Todos.
- Botón **Limpiar filtros** (solo visible si hay filtros activos).
- Todo en una única fila; en mobile colapsa en columna.

#### `UsersStats` (4 cards)
| Card | Icono | Métrica |
|---|---|---|
| Usuarios | People | total |
| Activos | CheckCircle | count + % |
| Bloqueados | Block | count |
| Últimos ingresos | Login/History | timestamp |

Cada card: icono en contenedor `border-radius: 12px` con bg pastel, número `tabular-nums` 24 px, label 12 px, **micro-indicador de tendencia** (↑ +x% / ↓ −x% vs periodo anterior) con color verde/rojo y `ArrowUpward/ArrowDownward` de 14 px. Micro-chart opcional (sparkline 3 puntos).

#### `UserFormModal` (crear/editar)
- **Dos columnas** (stack en mobile), ancho 640 px, `border-radius: 16px`.
- Campos: Nombre, Correo, Contraseña (solo crear), Rol, Teléfono, RUT, Sexo, Clínica (solo superadmin/select condicional), Estado (solo editar), Permisos (chips de capabilities).
- Validación **Zod** + react-hook-form (patrón existente); errores inline accesibles con `aria-describedby`.
- Botones: Cancelar (outlined) / Guardar (contained, disabled mientras `isPending`, muestra spinner).
- En editar: precarga los valores y muestra "Guardando…".

#### `UserStatusDialog`
- Diálogo moderno (patrón [[ConfirmDialog]] existente con `message: ReactNode`).
- Contenido: "¿Deseas **desactivar** a {nombre}?" + explicación "Perderá acceso inmediatamente a la plataforma." + warning si aplica.
- Botones Cancelar / Confirmar (rojo para desactivar, primario para activar).

#### `UsersEmptyState` / `UsersLoading` / `UsersError`
- **Loading**: 5 skeletons de fila-tarjeta (avatar círculo + 3 barras shimmer).
- **Sin resultados**: `EmptyState` con icono, título y botón "Limpiar filtros" cuando hay búsqueda.
- **Sin usuarios**: CTA "Nuevo usuario".
- **Error**: `ErrorState` con retry.

### 3.3 Flujos

1. **Crear** → `UserFormModal` → `POST /auth/register` (o `POST /doctors/register` si rol médico) → invalidar query `['users']` → toast éxito → cierre.
2. **Editar** → modal precargado → PATCH → invalidar query.
3. **Activar/Desactivar** → `UserStatusDialog` → `PATCH /doctors/users/:id/active` → refresh; si es desactivar, el backend revoca refresh tokens (`doctor.service.ts:310`).
4. **Búsqueda/filtros** → estado local con debounce → query params → servidor paginado.

### 3.4 Responsive

| Breakpoint | Patrón |
|---|---|
| ≥ 1024 px | Filas-tarjeta horizontales (grid de columnas) |
| 600–1023 px | Cards en grid 2 columnas |
| < 600 px | Cards verticales apiladas; filtros en columna; stats en grid 2×2 |

### 3.5 Reuso existente

`PageHeader` · `ConfirmDialog` · `EmptyState` · `ErrorState` · `LoadingState` · `role.utils.getRoleColor/Label` · patrones de `SpecialtyRow/SpecialtyFilters/SpecialtyStatsCards` ([[Specialties]]) como referencia visual.

---

## 4. Sección 2 — Panel SaaS (Superadmin)

### 4.1 Dashboard principal

#### `DashboardKPI` (8 cards)
MRR · ARR · Clientes activos · Nuevas clínicas · Cancelaciones · Trials activos · Conversión · Facturación mensual.

Cada card:
```
┌──────────────────────────────┐
│ 🏷 icono            ↑ +12%   │   ← tendencia vs mes anterior
│ $4,820 MRR                  │   ← valor principal (tabular-nums)
│ label 12px  ·  ▁▃▂▅▇▆  sparkline │
└──────────────────────────────┘
```
- Click en card → navega a la vista analítica correspondiente (`/saas/analytics?kpi=mrr`).
- Fuente de datos: `getGlobalDashboard` + `getRevenueAnalytics` ([[SuperAdmin]]).

#### Gráficos (todos minimalistas, sin gridlines ruidosos)
| Gráfico | Tipo | Fuente backend |
|---|---|---|
| Ingresos mensuales | Área suave con gradiente | `getRevenueAnalytics` |
| Crecimiento | Barras por mes | `getGrowthMetrics` |
| Distribución de planes | Donut pastel | `getPlanDistribution` |
| Estado de suscripciones | Donut (activa/trial/past_due/cancelada) | `getGlobalDashboard` |
| Uso de módulos | Barras horizontales | `getOperationMetrics` |
| No-show promedio | Gauge | `getOperationMetrics` |
| Actividad diaria | Heatmap semana/hora | `getOperationMetrics.hourly_demand` |
| Health Score | Gauge circular | `getTenantHealthScores` |

### 4.2 Gestión de Clínicas

#### `TenantTable` / `TenantCard`
Filas-tarjeta con: **Logo/Avatar de clínica**, Nombre, Dominio (mono), **Plan** (chip pastel con `TENANT_PLAN_CONFIG`), Estado, Usuarios, Doctores, Pacientes, Uso de almacenamiento (barra de progreso 12 px), Última actividad (relativo), **Health Score** (mini-circular), acciones: Editar · Ver detalles · Suspender · Eliminar.

- Suspender/eliminar → diálogo de confirmación (soft-delete real en backend: `deleteTenant` revoca tokens y desactiva usuarios, [[SuperAdmin]]).
- Ordenable por columna; búsqueda por nombre/dominio.

#### `TenantDrawer` (detalle en pestañas)
`Drawer` ancho 480 px con **tabs**:
1. **General** — info de tenant, admin responsable, locale/timezone.
2. **Suscripción** — plan, estado, fechas de período, `SubscriptionCard`.
3. **Uso** — `UsageCard` con barras de consumo vs límites del plan (`checkLimits`).
4. **Facturación** — últimas facturas, totales (pending/paid/overdue).
5. **Módulos** — chips de features activas (`getTenantFeatures`).
6. **Actividad** — bookings 7d/30d, últimos eventos.
7. **Alertas** — `AlertCard` del tenant.

### 4.3 Gestión de Planes — `PlanCard`
Cards premium por plan: Nombre, Precio mensual/anual, lista de características (checks), límites (doctores/pacientes/storage), **N° clientes** y **Ingresos** (de `subscription_invoices`), botón **Editar plan**. Estado visual: plan "recomendado" con borde primario + badge.

### 4.4 Suscripciones — `SubscriptionCard`
Estado con chip (Trial / Activa / Past Due / Cancelada), fecha de renovación (relativa), método de pago, últimas facturas, botón **Cambiar plan** → modal con planes y advertencia de prorrateo.

### 4.5 Facturación — `BillingTable`
Filas-tarjeta: Factura (ID), Monto, Estado (chip), Fecha, Cliente (clínica), acciones Descargar/Ver (placeholder — actualmente no hay PDFs en el repo; documentar como deuda técnica).

### 4.6 Analytics — `AnalyticsCard` (vista ejecutiva)
Top clínicas (`TopTenantCard`), Ingresos (`RevenueWidget`/`MRRWidget`), Health Score, Retención, Churn, Growth, Uso de módulos, Actividad, Demanda, Especialidades más usadas, Top doctores. Todos consumen endpoints ya existentes de [[SuperAdmin]].

### 4.7 Alertas inteligentes — `AlertCard`
Sección dedicada con alertas desde `getAlerts` ([[SuperAdmin]]):

| Tipo | Severidad | Icono | Color |
|---|---|---|---|
| Sin actividad 15+ días | critical | ⏰ | rojo |
| Posible churn | high | ⚠️ | naranja |
| Uso superior al plan | high | 📦 | naranja |
| Trial próximo a vencer | medium | ⏳ | ámbar |
| Pago vencido | high | 💳 | rojo |
| Health Score bajo | medium | 🩺 | ámbar |

Cada alerta: icono, prioridad (badge), descripción, **acción rápida** ("Ver clínica", "Enviar correo"), dismiss. Ordenadas por severidad (patrón ya implementado en `getAlerts`).

### 4.8 Health Score — `HealthScore`
- Gauge circular SVG 0–100 con gradiente de color:
  - 0–40 rojo, 41–69 amarillo, 70+ verde.
- Debajo: desglose de las 5 dimensiones (actividad, tendencia, pacientes, cancelaciones, módulos) con mini-barras y **explicación textual** ("Perdió puntos por 15 días sin actividad").

---

## 5. Accesibilidad WCAG 2.2 AA

1. **Contraste**: texto ≥ 4.5:1, UI ≥ 3:1 (verificar badges pastel con fg sólido).
2. **Focus visible**: anillo `2px` primario con offset `2px` en todos los controles; nunca eliminarlo.
3. **Teclado**: orden tab lógico, `Esc` cierra modales/drawers, `Enter`/`Space` activan, flechas en selects, `role="dialog"` + `aria-modal`.
4. **Formularios**: `label` visible + `aria-describedby` de error, `aria-invalid`, autocomplete correcto (`email`, `tel`, `name`, `new-password`).
5. **Estados**: loading con `aria-busy="true"` y `role="status"`; animaciones respetando `prefers-reduced-motion` (framer-motion: desactivar traslaciones, mantener opacity).
6. **Toasts**: `role="status"`/`role="alert"` y no bloquear navegación.

---

## 6. Roadmap de implementación

| Fase | Alcance | Esfuerzo |
|---|---|---|
| **1. Design tokens + core primitives** | Paleta semántica, badges, avatar con anillo, skeletons | 0.5 d |
| **2. Gestión de Usuarios** | `UserFilters`, `UsersStats`, `UserRow/Card`, `UserFormModal`, `UserStatusDialog`, refactor de `UsersPage` | 2–3 d |
| **3. Dashboard SaaS** | `DashboardKPI` con sparkline, gráficos (area/donut/gauge), `HealthScore` | 2 d |
| **4. Clínicas + Drawer** | `TenantCard/Table`, `TenantDrawer` con tabs, `UsageCard`, `SubscriptionCard` | 2–3 d |
| **5. Planes / Facturación / Analytics** | `PlanCard`, `BillingTable`, `AnalyticsCard`, `TopTenantCard` | 2 d |
| **6. Alertas + accesibilidad** | `AlertCard`, audit WCAG, keyboard e2e | 1 d |

**Total estimado: 10–12 días-hombre.**

---

## 7. Bugs/Deuda detectados a corregir durante la implementación

1. `superAdminService.toggleUserActive` apunta a `/super-admin/users/:id/toggle-active` pero la ruta real es `PATCH /super-admin/users/:id/active` → **404** ([[SuperAdmin]]).
2. `user.service.ts` hardcodea `tenant_id: 0` en el mapeo.
3. Toasts en `useUsers.ts` en español fijo (pasar a i18n).
4. Facturas sin PDF descargable (Backend: generar PDF → deuda técnica a futuro).

---

## 8. Métricas de éxito

- Tiempo para localizar un usuario: **< 5 s** (búsqueda + filtros).
- Acciones frecuentes (activar/desactivar, editar) en **≤ 2 clicks**.
- Dashboard SaaS: comprensión de MRR/churn en **< 10 s** (jerarquía de KPIs).
- Lighthouse Accessibility score ≥ 95; zero violaciones axe-core en las 2 secciones.

---

Tags: #ux #ui #diseño #usuarios #saas #superadmin #accesibilidad #materialui

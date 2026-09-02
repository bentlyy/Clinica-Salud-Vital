# Frontend

> Documentación del frontend React 19 + Vite 6 + TypeScript 5.7 (strict).

## Páginas

| Página | Descripción |
|--------|-------------|
| [[03-FRONTEND/Arquitectura-Frontend\|Arquitectura Frontend]] | Estructura, contexto, providers |
| [[03-FRONTEND/Componentes\|Componentes]] | Componentes compartidos y páginas |
| [[03-FRONTEND/Navegacion-por-Rol\|Navegación por Rol]] | Barra lateral y separaciones por usuario |
| [[03-FRONTEND/Routing\|Routing]] | Sistema de rutas y protección |
| [[03-FRONTEND/Consumo-API\|Consumo de API]] | Capa de comunicación con backend |

## Stack Frontend

| Componente | Tecnología |
|------------|-----------|
| Framework | React 19 |
| Build tool | Vite 6 |
| Lenguaje | TypeScript 5.7 (`strict: true`, `noUncheckedIndexedAccess`) |
| Routing | React Router 7 (lazy loading total) |
| UI | MUI 6 (@mui/material + @emotion) |
| Estado servidor | TanStack Query 5 + TanStack Table 8 |
| Gráficos | Recharts 2 |
| Calendario | FullCalendar 6 |
| Animaciones | framer-motion 11 |
| Formularios | react-hook-form 7 + zod 3 |
| HTTP | Axios |
| Notificaciones UI | react-hot-toast |
| CAPTCHA | react-google-recaptcha |
| i18n | i18next / react-i18next (es/en/pt/fr) |
| Testing | Vitest 3 + Testing Library (jsdom) |

## Frontend en números

| Métrica | Valor |
|---------|-------|
| Archivos `src/` | 431 (303 `.tsx`) |
| Páginas | 53 (lazy) |
| Componentes compartidos | 18 |
| Módulos por feature | 27 |
| Providers | 4 + QueryClientProvider |
| Archivos de test | 178 |
| Idiomas / namespaces | 4 / 66 |

---

Tags: #frontend #indice
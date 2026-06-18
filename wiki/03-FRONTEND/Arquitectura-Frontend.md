# Arquitectura Frontend

> Estructura y organización del frontend React.

## Estructura de Directorios

```
frontend/src/
├── api/           # 10 módulos de API (Axios)
│   ├── axios.js           # Instancia Axios con interceptores
│   ├── bookings.js
│   ├── doctors.js
│   ├── specialties.js
│   ├── clinicalRecords.js
│   ├── laboratory.js
│   ├── availability.js
│   ├── exceptions.js
│   ├── saas.js
│   └── super-admin.js
├── components/    # 9 componentes compartidos
├── context/       # 6 archivos de contexto global
├── i18n/          # Traducciones y hook
├── pages/         # 29 páginas
├── routes/        # Router y guards
├── utils/         # Utilidades (RUT, logger, sanitizer)
├── App.tsx        # Entry point
├── index.css      # Estilos globales
└── main.tsx       # Render root
```

## Provider Stack

```
BrowserRouter
  → AuthProvider
    → ThemeProvider (claro/oscuro)
      → FeatureProvider (feature flags)
        → I18nProvider (es/en)
          → App (ErrorBoundary)
            → AppRoutes
```

## Contextos

| Contexto | Archivo | Propósito |
|----------|---------|-----------|
| Auth | `AuthContext.tsx` / `useAuth.js` | Estado de autenticación, login/logout |
| Theme | `ThemeContext.tsx` / `useTheme.js` | Tema claro/oscuro |
| Feature | `FeatureContext.tsx` / `useFeature.js` | Feature flags por plan SaaS |

## API Layer

`src/api/axios.js` configura:
- Base URL desde `VITE_API_URL`
- Interceptor para inyectar token JWT
- Interceptor para refresh automático en 401
- Manejo de errores centralizado

---

Tags: #frontend #arquitectura #react

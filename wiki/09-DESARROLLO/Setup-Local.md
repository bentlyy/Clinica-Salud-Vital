# Setup Local

> Configuración del entorno de desarrollo.

## Requisitos

- Node.js 20.x
- Docker Desktop
- Git

## Pasos

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd vitaria-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores locales

# 4. Iniciar base de datos
docker compose up -d db

# 5. Iniciar backend (desarrollo con hot-reload)
npm run dev

# 6. Iniciar frontend
cd frontend && npm install && npm run dev
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (tsx watch) |
| `npm start` | Producción (node dist/app.js) |
| `npm test` | Tests + cobertura |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Compilar TS + frontend |

## Usuarios de Prueba (Seed)

Las contraseñas de los usuarios seed se definen mediante la variable de entorno `SEED_PASSWORD` (NUNCA se usa una contraseña por defecto hardcodeada). Si `SEED_PASSWORD` no está definida, el seed falla deliberadamente para evitar crear usuarios con contraseñas débiles.

| Rol | Email |
|-----|-------|
| Super Admin | superadmin@clinic.com |
| Admin | admin@clinic.com |
| Doctor | juan@clinic.com |
| Patient | user1@clinic.com |

---

Tags: #desarrollo #setup #local

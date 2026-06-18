# Troubleshooting

> Problemas comunes y sus soluciones.

## Base de Datos

| Problema | Causa | Solución |
|----------|-------|----------|
| `ECONNREFUSED` al conectar DB | PostgreSQL no iniciado | `docker compose up -d db` |
| `relation "tenants" does not exist` | Schema no inicializado | Verificar `db/init.sql` montado en Docker |
| `duplicate key value violates unique constraint` | Conflicto de datos | Verificar `unique_booking` constraint |
| Conexiones agotadas | Pool máximo alcanzado | Aumentar `DB_POOL_MAX` o reiniciar app |

## API

| Problema | Causa | Solución |
|----------|-------|----------|
| 401 en todas las rutas | Token expirado | Refrescar token |
| 403 en rutas accesibles | Rol incorrecto | Verificar `req.user.role` |
| 429 Too Many Requests | Rate limit alcanzado | Esperar ventana de tiempo |
| CORS error en frontend | `FRONTEND_URL` incorrecta | Verificar `.env` |

## Frontend

| Problema | Causa | Solución |
|----------|-------|----------|
| Blank screen | Error en lazy load | Revisar consola, verificar rutas |
| Recarga infinita | Error en refresh token | Limpiar localStorage, relogin |
| Traducción en inglés | Locale no coincide | Verificar `APP_LOCALE` |

---

Tags: #operaciones #troubleshooting

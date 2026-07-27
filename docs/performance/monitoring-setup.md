# Configuración de Performance y Monitoreo

**Versión:** 1.0  
**Fecha:** 2025  
**Herramientas:** Clinic.js, PM2, express-status-monitor (vía endpoints personalizados), pg_stat_activity

---

## 1. Arquitectura de Monitoreo de Memoria

```
┌─────────────────────────────────────────────────────────────────┐
│                    monitoringService (singleton)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ Snapshot Memoria │    │ Verificación  │    │ Cola de        │  │
│  │ (cada 30s)      │───>│ de Umbrales   │───>│ Alertas        │  │
│  └─────────────────┘    └──────────────┘    │ (máx 100)      │  │
│         │                       │            └────────────────┘  │
│         ▼                       ▼                                │
│  ┌─────────────────┐    ┌──────────────┐                        │
│  │ Últimos 60 snaps│    │ Detección    │                        │
│  └─────────────────┘    │ de leak      │                        │
│                         │ (10 snaps    │                        │
│                         │  tendencia   │                        │
│                         │  >50MB)      │                        │
│                         └──────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Snapshots registrados

| Métrica | Fuente | Unidad |
|---------|--------|--------|
| rss | `process.memoryUsage().rss` | MB |
| heapTotal | `process.memoryUsage().heapTotal` | MB |
| heapUsed | `process.memoryUsage().heapUsed` | MB |
| external | `process.memoryUsage().external` | MB |
| arrayBuffers | `process.memoryUsage().arrayBuffers` | MB |

### Umbrales de alerta

| Alerta | Umbral | Acción |
|--------|--------|--------|
| Heap alto | heapUsed > 85% de heapTotal | Log de advertencia |
| RSS alto | RSS > 85% del total del sistema | Log de advertencia |
| Sospecha de leak | +50MB heap en 10 snaps (5 min) | Log de advertencia + alerta |
| Presión de GC | heapUsed > 90% de heapTotal | Log de advertencia |

---

## 2. Monitoreo de PostgreSQL

### Salud del pool de conexiones

Verificado vía `db-monitor.service.ts`:

```
Salud del pool:
  status: healthy / warning / critical
  metrics:
    totalCount: 3        # Conexiones activas en el pool
    idleCount: 2         # Conexiones inactivas
    waitingCount: 0      # Solicitudes esperando conexión
    connectionUsage: "3/100"  # Usadas / max_connections
    usageRatio: "15.0%"
    waiting: 0           # Consultas esperando bloqueo
    idleInTransaction: 0 # Transacciones abiertas inactivas
```

### Detección de consultas lentas

Las consultas que ejecutan > 1 segundo se registran cada 60 segundos y se exponen vía:
```
GET /api/v1/monitoring/database/slow-queries
```

### Seguimiento de tamaños de tabla

```
GET /api/v1/monitoring/database/table-sizes

Retorna por tabla:
  - row_count, total_size, table_size, index_size
  - data_pct, index_pct
  - seq_scan, idx_scan (análisis de uso de índices)
  - n_tup_ins, n_tup_upd, n_tup_del (actividad de escritura)
```

Exportar a CSV:
```
POST /api/v1/monitoring/database/export-sizes
```

Salida: `logs/db-table-sizes.csv`

---

## 3. Perfilado con Clinic.js

### Perfiles disponibles

```bash
npm run profile:doctor       # Puntos críticos CPU + memoria
npm run profile:flame        # Flamegraph de pila de llamadas
npm run profile:heapprofiler # Asignación de memoria en el tiempo
npm run profile:dev          # Doctor + modo desarrollo
npm run profile:gc           # Salida --trace-gc a logs/gc-trace.log
```

### Cuándo usar cada uno

| Herramienta | Detecta | Caso de uso |
|-------------|---------|-------------|
| Clinic Doctor | Cuellos de botella CPU, lag de event loop | Tiempos de respuesta lentos |
| Clinic Flame | Pilas de llamadas profundas, funciones calientes | Qué función es la más lenta |
| Clinic Heap Profiler | Asignaciones de memoria, presión de GC | Fugas de memoria, pausas GC altas |
| Trace GC | Frecuencia de GC, tiempos de pausa | Ajuste de --max-old-space-size |

### Flujo de trabajo

```bash
# 1. Iniciar perfilado
npx clinic doctor -- npx tsx src/app.ts

# 2. Ejecutar carga de prueba (mientras clinic corre)
curl -X POST http://localhost:3000/api/v1/ml/train

# 3. Detener (Ctrl+C) → Clinic abre reporte HTML
```

---

## 4. Gestión de Procesos con PM2

### Límites de memoria

```javascript
// ecosystem.config.cjs
{
  max_memory_restart: '500M',
  memory_threshold: 400,
  node_args: [
    '--max-old-space-size=400',
    '--max-semi-space-size=16',
    '--optimize-for-size',
  ]
}
```

### Comandos

```bash
npm run pm2:start         # Producción
npm run pm2:dev           # Desarrollo (+ --inspect)
npm run pm2:profiling     # Modo perfilado
npm run pm2:monit         # Dashboard en tiempo real
npm run pm2:logs          # Ver logs
```

### Estrategia de reinicio automático

```
max_restarts: 5
restart_delay: 5000
exp_backoff_restart_delay: 100  # Backoff exponencial
```

---

## 5. Gestión de Garbage Collector

### Exponer GC

```bash
node --expose-gc --max-old-space-size=400 dist/app.js
```

### Disparo manual

```bash
curl -X POST http://localhost:3000/api/v1/monitoring/gc \
  -H "Authorization: Bearer <token>"
```

Retorna la memoria liberada en MB.

### GC automático

El servicio de monitoreo dispara `global.gc()` cada 5 minutos si `--expose-gc` está activado (nivel de log: debug).

---

## 6. Perfil de Memoria del Módulo ML

| Componente | Memoria | Notas |
|-----------|---------|-------|
| TF.js core | ~30-50 MB heap | Cargado bajo demanda en primer predict |
| Modelo No-Show | ~0.5 MB | Solo capas densas |
| Modelo Diagnóstico | ~1-2 MB | Depende del tamaño del vocabulario |
| Modelo Demanda | ~0.3 MB | LSTM tiene más parámetros |
| Modelo Signos Vitales | ~0.001 MB | Solo arrays mean/std |
| Caché LRU (lleno) | ~5-10 MB | 100 entradas máximo |

Overhead total ML: ~35-65 MB cuando todos los modelos están cargados.

### Buenas prácticas para memoria ML

1. Siempre llamar `safeDispose()` en tensores después de predict/train
2. Llamar `disposeAllModels()` antes de reiniciar modelos
3. Caché LRU auto-evicta en 100 entradas
4. TF.js se carga bajo demanda (no al inicio)
5. Entrenamiento tiene timeout de 60s para evitar memoria descontrolada

---

## 7. Resumen de Endpoints de Monitoreo

| Endpoint | Auth | Descripción |
|----------|------|-------------|
| `GET /health` | Público | Latencia DB, memoria, lag de event loop |
| `GET /api/v1/monitoring/health` | Público | Salud completa del sistema |
| `GET /api/v1/monitoring/memory` | Admin | Snapshots, alertas, tendencia |
| `GET /api/v1/monitoring/database` | Admin | Conexiones, pool, cache hit |
| `GET /api/v1/monitoring/database/slow-queries` | Admin | Consultas lentas activas |
| `GET /api/v1/monitoring/database/table-sizes` | Admin | Tamaños de tabla con ratio de índice |
| `GET /api/v1/monitoring/ml` | Admin | Métricas ML + memoria |
| `GET /api/v1/monitoring/logs` | Admin | Cola de logs |
| `GET /api/v1/monitoring/dashboard` | Admin | Dashboard unificado |
| `POST /api/v1/monitoring/gc` | Admin | Disparo manual de GC |
| `POST /api/v1/monitoring/database/export-sizes` | Admin | Exportar tabla CSV |

---

## 8. Referencia de Flags de Memoria de Node.js

| Flag | Efecto | Valor recomendado |
|------|--------|-------------------|
| `--max-old-space-size` | Heap máximo para objetos de larga vida | 400 MB |
| `--max-semi-space-size` | Tamaño de generación joven | 16 MB |
| `--optimize-for-size` | Optimizar para memoria sobre velocidad | — |
| `--expose-gc` | Exponer `global.gc()` | — |
| `--inspect` | Depuración con Chrome DevTools | 9229 |

---

## Relacionados

- ADR-001: Monolito Modular (consideraciones de memoria)
- Paper ML: `/docs/modules/ml-paper.md`
- Runbook: Respuesta a incidentes por errores OOM

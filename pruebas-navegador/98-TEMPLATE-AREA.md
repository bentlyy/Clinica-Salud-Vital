# 98 — Plantilla de archivo de área

> **Lee esto antes de escribir un caso.** Copia la sección 4 al final de tu archivo y rellena cada
> hueco. Si un hueco de esta plantilla no aplica, se marca `—` explícitamente; no se omite.
>
> Reglas generales, roles, credenciales, prioridades y vocabulario: `00-README.md`.
> Orden de ejecución y dependencias: `01-RUTA-DE-PRUEBAS.md`.
> Catálogo de funciones de cada área: `02-CATALOGO-FUNCIONES.md`.
> Defectos conocidos: `90-HALLAZGOS-CODIGO.md`.

---

## 1. Cuándo este archivo está bien

Un archivo de área está bien si una persona que **nunca vio el módulo** puede ejecutarlo entero
sin preguntar nada. Se valida con las 5 preguntas de `00-README.md` §1:

| Pregunta | Si la respuesta es "no" |
|---|---|
| ¿Sé qué valor poner en cada campo? | Falta **Datos** |
| ¿Sé si algo está bien o mal? | Falta un **Esperado** observable |
| ¿Sé qué debe ser verdad antes de empezar? | Falta **Precondición** |
| ¿Sé cómo limpiar lo que se cree? | Falta **Limpieza** |
| ¿Dónde escribo el veredicto? | Falta el campo **Resultado** |

---

## 2. Estructura obligatoria del archivo

El archivo debe tener **exactamente** estas secciones, en este orden:

```markdown
# NN — <Nombre del área>

> Una frase: qué cubre este archivo y por qué importa.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `NN` | `XXX` | C1..C4 | Semanal | N | — | — |

## 1. Qué cubre
## 2. Roles y rutas
## 3. Precondiciones de datos
## 4. Casos
## 5. Defectos conocidos a verificar primero
## 6. Huecos conocidos
## 7. Resultado del área

---

*<Pie: una línea de alcance y fecha.>*
```

Si una sección no aplica, se escribe `## N. <Título>` seguido de `No aplica.`

---

## 3. Reglas de los casos

### 3.1 Encabezado

Cada caso empieza con un encabezado `###` y una línea de metadatos **en este orden exacto**:

```
**Rol** `rol` · **Ruta** `/ruta` · **P0` · **Bloqueante** · **Resultado** `______`
```

| Parte | Regla |
|---|---|
| `**Rol**` | Uno o varios de `superadmin`, `admin`, `doctor`, `lab_technician`, `patient`, `user`, `invitado`, `cualquiera`, `anónimo`, separados por coma |
| `**Ruta**` | Ruta de UI donde arranca el caso, o `—` si es solo por red |
| Prioridad | `**P0**` … `**P3**` |
| `**Bloqueante**` | Solo si es `P0` **y** su fallo detiene el área. Si no, se omite |
| `**Resultado**` | **Obligatorio y siempre el último.** Es donde va el veredicto |

### 3.2 Título

Imperativo y específico. `Verifica que…` es demasiado vago.

```
### [AUT-007] Bloquea el acceso tras 5 intentos fallidos
```

### 3.3 Numeración

`[PREFIJO-NNN]`, tres dígitos, **correlativo y sin huecos** dentro del área. El prefijo es el de
`00-README.md` §13. No reutilizar un número de un caso retirado: dejarlo registrado.

### 3.4 Cuerpo mínimo

```markdown
**Precondición:** <qué debe ser verdad antes de abrir la pantalla>
**Datos:** <valores concretos, con marcador `<año>` si es dinámico>

1. <Paso imperativo>
2. <Paso imperativo>

**Esperado**
- <observable 1, con valor o código exacto>
- <observable 2>

**Red:** `<METHOD /ruta>` → <status esperado>. <qué verificar en el cuerpo>
**Limpieza:** <qué se creó y cómo se elimina, o "ninguna">
```

### 3.5 Reglas de "Esperado"

- Al menos **un observable de red** (status + campo del cuerpo) o **uno de UI** (texto o estado exacto).
- Los textos van **entre comillas y literales**, tal como aparecen en pantalla. Si el texto sale de
  `es.json`, citar la clave i18n: `"errors.AUTH_LOCKED"`.
- Si el caso depende de un defecto conocido, decirlo: `**Esperado:** … (defecto conocido H-15: hoy devuelve 200)`.
- Prohibido "funciona", "responde correctamente", "se ve bien".

### 3.6 Casos destructivos

Un caso que crea algo que la UI no puede deshacer (tenant, suscripción aprobada, usuario real)
lleva `⚠️ DESTRUCTIVO` en el título **y** en la primera línea del cuerpo. No se ejecuta sin
`ALLOW_DESTRUCTIVE=true` (`00-README.md` §5).

---

## 4. Bloque de caso listo para copiar

```markdown
### [XXX-001] <Título en imperativo>

**Rol** `patient` · **Ruta** `/bookings` · **P0** · **Resultado** `______`
**Precondición:** el paciente tiene 2 citas próximas y ninguna notification sin leer.
**Datos:** `fecha` = <YYYY-MM-DD futura> · `hora` = 10:00 · `motivo` = `QA-consulta`

1. Abrir `/bookings` con la sesión del paciente.
2. Localizar la cita del día futuro en la pestaña "Próximas".
3. Pulsar "Cancelar" y confirmar el diálogo.

**Esperado**
- `PATCH /api/bookings/:id/cancel` → 200 con `status: "cancelled"`
- La cita desaparece de "Próximas" y aparece en "Pasadas"
- Toast "Cita cancelada"
- `GET /api/bookings` ya no la devuelve en las próximas

**Red:** `PATCH /api/bookings/:id/cancel` → 200. Verificar `status` y `cancellation_reason` en el cuerpo.
**Limpieza:** ninguna (la cita queda `cancelled`, que es el estado esperado). Si se rehace la prueba,
restaurar con `PATCH /api/bookings/:id/reschedule` y otra fecha.
```

---

## 5. Sección 5 de un archivo de área — defectos conocidos

Se listan **solo los hallazgos de `90-HALLAZGOS-CODIGO.md` que afectan a esta área**, con el caso
concreto que los ejercita. No se copia la lista completa.

```markdown
## 5. Defectos conocidos a verificar primero

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-15 | AUTZ-008 | Tenant `clinica-sur` (sin `laboratory`) → `GET /api/laboratory/dashboard` debe dar 403 |
| H-10 | AUT-006 | Reutilizar un refresh antiguo revoca la familia; la UI no debe expulsar al usuario |

> Si un caso falla por uno de estos, anotar `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.
```

---

## 6. Lista de verificación antes de dar el archivo por terminado

- [ ] Todos los casos llevan `**Resultado** \`______\`` como último campo
- [ ] Numeración correlativa sin huecos
- [ ] Cada caso tiene `Precondición`, `Datos`, `Esperado`, `Red` y `Limpieza`
- [ ] Al menos un `Esperado` observable (red o texto literal)
- [ ] Ningún caso dice "funciona" sin especificar qué
- [ ] Los casos destructivos están marcados y listados en la advertencia del área
- [ ] Los casos que dependen de captcha o email dicen `BLOQUEADO` si no hay `RECAPTCHA_HUMAN` / `EMAIL_TEST`
- [ ] Los Prefijos coinciden con `00-README.md` §13
- [ ] El conteo de casos de la tabla del encabezado coincide con los casos realmente escritos
- [ ] Los hallazgos aplicables están en la sección 5, con su caso
- [ ] Los huecos están en la sección 6, no inventados casos para taparlos
- [ ] El pie tiene alcance y fecha

---

## 7. Anti-patrones

| No hacer | Por qué | Hacer en su lugar |
|---|---|---|
| `Verificar que el login funciona` | No hay esperado observable | `POST /api/auth/login` → 200 + cookie `httpOnly` + redirect a `/dashboard` |
| `Revisar la página` | No hay datos ni limpieza | Datos concretos + `Limpieza: ninguna` |
| Inventar un `data-testid` | No existe en el código | Rol, nombre accesible, texto o `id` real de `es.json` |
| Suponer que un texto está en inglés | Los mensajes a veces se hardcodean (H-53) | Citar la clave i18n **y** el literal esperado |
| Marcar `FALLÓ` por captcha | No es defecto del sistema | `BLOQUEADO` con el motivo |
| Probar "un endpoint" en bloque | Un fallo no dice cuál | Un caso por endpoint, con su status esperado |
| Dejar `Resultado` al principio | Se llena antes de ejecutar | Siempre al final, como campo a rellenar |
| Asumir 200 | Muchos endpoints devuelven 400/403 por diseño | Citar el status esperado y su razón |

---

*Plantilla de los 23 archivos de área (`10-` … `32-`). Requisitos de formato heredados de
`00-README.md` §§10-13. Última revisión: 2026-10-01.*

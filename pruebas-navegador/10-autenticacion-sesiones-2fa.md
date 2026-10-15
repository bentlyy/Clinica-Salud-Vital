# 10 — Autenticación, sesiones y 2FA

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `10` | `AUT` | C1 | Semanal | 26 | G0 | Todas las áreas con sesión |

## 1. Qué cubre

Este área verifica el ciclo completo de autenticación de Vitaria: login válido con establecimiento de sesión mediante cookie `httpOnly`, manejo de captcha cuando corresponde, respuesta genérica ante credenciales inexistentes o incorrectas para evitar anti-enumeración, contador de intentos fallidos y bloqueo temporal con minutos restantes, flujo de 2FA con respuesta intermedia `requires_2fa` sin establecer cookie, activación/desactivación de 2FA con QR `otpauth://` y secreto cifrado AES-256-GCM, verificación TOTP válida e inválida, ciclo de tokens de refresco (par nuevo e invalidez del previo), reutilización de refresh (revocación de familia completa), ventana de gracia entre pestañas (`REUSE_GRACE_SECONDS`) y sincronización vía `BroadcastChannel` (`vitaria-auth`), logout y logout de todas las sesiones, listado y revocación individual de sesiones activas, cambio de contraseña con exigencia de la actual e invalidación de refresh vía `token_version`, reset por email con anti-enumeración, registro por invitación con política de contraseña robusta, deep link a `/login`, expiración por inactividad con un solo toast y sin bucle, límites de cookie (idle 24 h, máximo 30 días vía `SESSION_IDLE_HOURS`), stub de `GET /api/auth/jwks` devolviendo `{ keys: [] }`, y mapeo de códigos `AUTH_LOCKED` e `INVALID_CREDENTIALS` a i18n en los 4 idiomas.

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `superadmin` | `/login`, `/2fa`, `/settings` | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/logout-all`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password`, `GET /api/auth/jwks` |
| `admin` | `/login`, `/2fa`, `/settings` | Idem anteriores + `POST /api/auth/2fa/enable`, `POST /api/auth/2fa/verify`, `POST /api/auth/2fa/disable` |
| `doctor` | `/login`, `/2fa`, `/settings` | Idem flujo 2FA según configuración de cuenta |
| `lab_technician` | `/login`, `/2fa`, `/settings` | Flujos básicos de autenticación y sesiones |
| `patient` | `/login`, `/2fa`, `/settings` | Flujos básicos de autenticación y sesiones |
| `user` | `/login`, `/2fa`, `/settings` | Alias histórico de `patient`. El backend lo trata como `patient` |
| `invitado` | `/login`, `/register`, `/forgot-password` | `POST /api/auth/register` (con token de invitación válido) |

**Home por rol tras login:** `superadmin` → `/saas`; `lab_technician` → `/laboratory`; `admin`, `doctor`, `patient`, `user` → `/dashboard`.

## 3. Precondiciones de datos

| ID | Requisito | Valor |
|---|---|---|
| PRE-01 | Contexto limpio | Navegador limpio por caso P0 (cookies y `localStorage` vacíos) |
| PRE-02 | Base URL | `$BASE_URL` sin barra final (por defecto `https://clinica-salud-vital.onrender.com`) |
| PRE-03 | Superadmin | `superadmin@clinic.com`, contraseña `$SUPERADMIN_PASSWORD` (preguntar). Tenant nulo |
| PRE-04 | Admin | `admin@clinic.com`, contraseña `$ADMIN_PASSWORD` (preguntar). Tenant `default` |
| PRE-05 | Cuentas seed | `juan@clinic.com`, `maria@clinic.com`, `carmen@clinic.com`, `pedro@clinic.com`, `lab@clinic.com`, `user1@clinic.com`, `user2@clinic.com`, `user3@clinic.com`. Tenant `default`. Contraseña derivada: `Vitaria.<parte-local-email>.<año>!` con `<año>` dinámico desde `SEED_YEAR` (por defecto 2026) |
| PRE-06 | Demo pública | `admin@demo.clinic.com` / `DemoVitaria2026!`, tenant `clinica-demo` (plan pro). Contraseña pública por diseño |
| PRE-07 | Captcha | `RECAPTCHA_HUMAN=true` si el operador resuelve el widget de reCAPTCHA. Si `false`, los casos dependientes de captcha son `BLOQUEADO` |
| PRE-08 | Email de pruebas | `EMAIL_TEST` definido para flujos de reset/registro por email. Si no existe, los casos dependientes de email son `BLOQUEADO` |
| PRE-09 | 2FA automático | `TOTP_SECRET` definido para verificación automática. Si no existe, la verificación 2FA es manual y los casos A-06/A-07 van `BLOQUEADO` |
| PRE-10 | Datos etiquetados | Cualquier dato creado se prefija con `QA-AUT-`. Limpieza explícita por caso cuando procede |
| PRE-11 | Cliente HTTP/Red | Capacidad para inspeccionar red (pestañas Network/Fetch). Verificar peticiones `POST /api/auth/*`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `GET /api/auth/jwks` |

## 4. Casos

### [AUT-001] Login válido establece cookie httpOnly y redirige a la home del rol

**Rol** `patient` · **Ruta** `/login` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, PRE-05 (`user1@clinic.com` / `Vitaria.user1.<año>!`). Sin sesión activa.
- **Datos:** email = `user1@clinic.com` · password = `Vitaria.user1.<año>!` · home esperado = `/dashboard`.
- **Pasos:**
1. Abrir `/login` con contexto limpio.
2. Rellenar credenciales del paciente y enviar el formulario.
3. Observar redirección tras respuesta exitosa.
- **Esperado:**
  - `POST /api/auth/login` → 200.
  - Respuesta incluye cookie de sesión con atributos `httpOnly` presente (no accesible vía JS), `Secure` en producción y `SameSite=Lax` o equivalente según configuración.
  - Redirección automática a `/dashboard` (home de `patient`).
  - Nombre del usuario aparece en topbar. No hay errores en consola.
- **Red:** `POST /api/auth/login` → 200. Verificar presencia de `Set-Cookie` para la sesión (`httpOnly`).
- **Limpieza:** ninguna (sesión queda establecida para siguientes casos solo si necesario; caso aislado).

### [AUT-002] Login sin captcha válido

**Rol** `patient` · **Ruta** `/login` · **P0** · **Resultado** `______`
- **Precondición:** PRE-07 (`RECAPTCHA_HUMAN=false`). Formulario de login no requiere resolución manual de captcha en este escenario o la validación de captcha está ausente/acepta ausencia.
- **Datos:** email = `user1@clinic.com` · password = `Vitaria.user1.<año>!`.
- **Pasos:**
1. Abrir `/login` con contexto limpio.
2. Enviar credenciales sin resolver captcha.
3. Observar respuesta de red y UI.
- **Esperado:**
  - Si el backend no exige `captcha_token` válido o `RECAPTCHA_SECRET_KEY` está ausente, `POST /api/auth/login` → 200 y se establece sesión (redirige a home). Si el backend exige captcha y `RECAPTCHA_HUMAN=false`, el caso es `BLOQUEADO` (intervención manual requerida). En cualquier caso, nunca `FALLÓ` por dependencia externa.
- **Red:** `POST /api/auth/login` → 200 (o bloquear por captcha si exigido).
- **Limpieza:** ninguna.

### [AUT-003] Login con email inexistente no revela existencia de la cuenta

**Rol** `cualquiera` · **Ruta** `/login` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. Sin sesión.
- **Datos:** email = `qa-noexiste+<timestamp>@example.invalid` · password = `Vitaria.user1.2026!`.
- **Pasos:**
1. Abrir `/login`.
2. Enviar credenciales con email inexistente.
3. Registrar mensaje de error, status y tiempo de respuesta.
- **Esperado:**
  - `POST /api/auth/login` → 401 con mensaje genérico (clave i18n de `errors.INVALID_CREDENTIALS` o equivalente). No revela si el email existe ni el estado de la cuenta.
  - No se crea cookie de sesión.
  - Contador `failed_attempts` no incrementa información distinguible (comportamiento genérico).
  - Status, cuerpo y tiempo aproximado son iguales al intento con contraseña incorrecta para el mismo email (anti-enumeración). Ver [verificar literal en es.json].
- **Red:** `POST /api/auth/login` → 401. Verificar cuerpo contiene mensaje genérico.
- **Limpieza:** ninguna.

### [AUT-004] Contraseña incorrecta incrementa failed_attempts

**Rol** `patient` · **Ruta** `/login` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01, cuenta `user1@clinic.com` existente con estado activo.
- **Datos:** email = `user1@clinic.com` · password = `IncorrectaTemporal<timestamp>!`.
- **Pasos:**
1. Abrir `/login`.
2. Enviar contraseña incorrecta.
3. Repetir si necesario y observar contador.
- **Esperado:**
  - `POST /api/auth/login` → 401 con mensaje genérico `errors.INVALID_CREDENTIALS` [verificar literal en es.json].
  - El campo/efecto `failed_attempts` se incrementa en +1 respecto al estado anterior (comprobable vía auditoría o por efecto en siguiente intento; en ausencia de lectura directa, verificar comportamiento consistente con bloqueo en 5 intentos).
  - No revela qué campo falló.
  - No se establece sesión.
- **Red:** `POST /api/auth/login` → 401.
- **Limpieza:** ninguna (estado de intentos puede persistir; documentar si se resetea tras éxito posterior).

### [AUT-005] Bloqueo tras 5 intentos con minutos restantes

**Rol** `patient` · **Ruta** `/login` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-01. Utilizar una cuenta de prueba (`QA-AUT-locked@clinic.com`) o la misma `user1@clinic.com` con precaución para no bloquearla permanentemente en entorno no-destructivo. Marcar caso como `BLOQUEADO` si no es seguro reintentar 5 veces.
- **Datos:** email = `user1@clinic.com` · contraseña incorrecta repetida 5 veces.
- **Pasos:**
1. Con contexto limpio, realizar 4 intentos fallidos consecutivos (contraseña incorrecta).
2. Realizar 5.º intento fallido.
3. Realizar 6.º intento con credenciales correctas.
- **Esperado:**
  - Intentos 1-4: `POST /api/auth/login` → 401 `errors.INVALID_CREDENTIALS`.
  - 5.º intento: `POST /api/auth/login` → 401 con código de error `AUTH_LOCKED` y mensaje asociado a `errors.AUTH_LOCKED` [verificar literal en es.json], incluyendo "minutos restantes" o tiempo estimado de desbloqueo (informativo).
  - 6.º intento con credenciales válidas: bloqueado mientras `failed_attempts` alcanza umbral; respuesta sigue siendo `AUTH_LOCKED` (401). El desbloqueo requiere esperar el tiempo indicado o reset por política del sistema.
- **Red:** `POST /api/auth/login` → 401 con `AUTH_LOCKED`.
- **Limpieza:** ninguna (cuenta puede quedar bloqueada temporalmente). Documentar estado y evitar repetir en el mismo día sin autorización.

### [AUT-006] Login con 2FA activo devuelve requires_2fa sin cookie

**Rol** `admin` · **Ruta** `/login` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-04, cuenta `admin@clinic.com` con 2FA activado. Si no está activado, el caso es `BLOQUEADO` (configuración requerida). PRE-09 no es obligatorio para este paso (solo para verificación).
- **Datos:** email = `admin@clinic.com` · password = `$ADMIN_PASSWORD` (preguntar).
- **Pasos:**
1. Abrir `/login` con contexto limpio.
2. Enviar credenciales válidas de cuenta con 2FA habilitado.
3. Inspeccionar respuesta de red.
- **Esperado:**
  - `POST /api/auth/login` → 200 con `requires_2fa: true`.
  - **No** se establece cookie de sesión (`Set-Cookie` ausente en esta respuesta).
  - Usuario permanece sin sesión completa; redirección no va a home, permanece en flujo `/2fa`.
  - No hay errores en consola.
- **Red:** `POST /api/auth/login` → 200. Verificar `requires_2fa: true` en el cuerpo. Verificar ausencia de `Set-Cookie` de sesión.
- **Limpieza:** ninguna.

### [AUT-007] Verificación TOTP válida establece sesión

**Rol** `admin` · **Ruta** `/2fa` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** PRE-06/PRE-09. Haber alcanzado estado `requires_2fa` (AUT-006) o tener código TOTP válido. Si `TOTP_SECRET` no existe, el caso es `BLOQUEADO` (verificación manual no automatizable). 
- **Datos:** código TOTP válido generado con `TOTP_SECRET`.
- **Pasos:**
1. Tras `requires_2fa: true`, enviar código TOTP a `POST /api/auth/2fa/verify`.
2. Observar respuesta y redirección.
- **Esperado:**
  - `POST /api/auth/2fa/verify` → 200.
  - Se establece sesión completa (cookie `httpOnly` presente).
  - Redirección a home del rol (`/dashboard` para `admin`).
  - No hay errores en consola.
- **Red:** `POST /api/auth/2fa/verify` → 200. Verificar `Set-Cookie` de sesión.
- **Limpieza:** ninguna.

### [AUT-008] TOTP inválido rechaza sin establecer sesión

**Rol** `admin` · **Ruta** `/2fa` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** Estado `requires_2fa` activo. PRE-09 opcional (usar código inválido fijo).
- **Datos:** código TOTP inválido = `000000` (o valor incorrecto).
- **Pasos:**
1. Enviar código inválido a `POST /api/auth/2fa/verify`.
2. Observar respuesta.
- **Esperado:**
  - `POST /api/auth/2fa/verify` → 401.
  - Mensaje "Código inválido" (clave i18n asociada a error de 2FA) [verificar literal en es.json].
  - No se establece sesión. Cookie ausente.
- **Red:** `POST /api/auth/2fa/verify` → 401.
- **Limpieza:** ninguna.

### [AUT-009] Activación de 2FA devuelve QR otpauth y secreto cifrado

**Rol** `admin` · **Ruta** `/settings` · **P0** · **Resultado** `______`
- **Precondición:** Sesión activa de `admin@clinic.com`. Cuenta sin 2FA activo (o caso `BLOQUEADO` si no es seguro desactivar). Marcar `BLOQUEADO` si configuración no permite activación en entorno de prueba; caso solo lectura/observacional cuando procede.
- **Datos:** — 
- **Pasos:**
1. Abrir `/settings` (perfil/seguridad).
2. Iniciar activación de 2FA: `POST /api/auth/2fa/enable`.
3. Inspeccionar respuesta (QR y secreto).
- **Esperado:**
  - `POST /api/auth/2fa/enable` → 200.
  - Respuesta incluye QR con formato `otpauth://totp/...`.
  - Secreto almacenado/cifrado con algoritmo AES-256-GCM (verificación observacional en respuesta: no debe exponerse en texto plano). No se activa hasta verificación TOTP (flujo de confirmación).
- **Red:** `POST /api/auth/2fa/enable` → 200. Verificar presencia de `otpauth://`.
- **Limpieza:** si se activó, desactivar en AUT-010 o documentar `OMITIDO` con motivo.

### [AUT-010] Desactivación de 2FA elimina el secreto

**Rol** `admin` · **Ruta** `/settings` · **P0** · **Resultado** `______`
- **Precondición:** 2FA activo en la cuenta. Exige confirmación según UI/API.
- **Datos:** confirmación de desactivación (si requerida).
- **Pasos:**
1. Solicitar desactivación de 2FA: `POST /api/auth/2fa/disable` (con confirmación requerida).
2. Observar respuesta.
- **Esperado:**
  - `POST /api/auth/2fa/disable` → 200 tras confirmación válida.
  - Se elimina el secreto asociado a 2FA de la cuenta.
  - Login posterior (AUT-001/AUT-002) no devuelve `requires_2fa: true`.
- **Red:** `POST /api/auth/2fa/disable` → 200.
- **Limpieza:** ninguna (estado restaurado a sin 2FA).

### [AUT-011] Refresh devuelve nuevo par e invalida el anterior

**Rol** `patient` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** Sesión activa de `user1@clinic.com`. Se dispone de refresh token válido.
- **Datos:** token de refresco actual.
- **Pasos:**
1. Realizar `POST /api/auth/refresh` con el refresh token actual.
2. Intentar reutilizar el mismo refresh token inmediatamente.
- **Esperado:**
  - Primer `POST /api/auth/refresh` → 200 con nuevo par de tokens (access y refresh nuevos).
  - El refresh token previo queda invalidado.
  - Segundo intento con refresh previo → 401/403 (token inválido o familia revocada). Comportamiento coherente con AUT-012.
- **Red:** `POST /api/auth/refresh` → 200; segundo → 401.
- **Limpieza:** ninguna.

### [AUT-012] Reutilización de refresh revoca la familia completa

**Rol** `patient` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** Sesión activa con al menos un refresh válido (familia de tokens activa). Hallazgo H-10.
- **Datos:** refresh token activo.
- **Pasos:**
  1. Obtener refresh token R1 (válido).
  2. Usar R1 para obtener nuevo par (R2, access A2) → 200.
  3. **Reutilizar R1** (ya inválido) en `POST /api/auth/refresh`.
- **Esperado:**
  - Paso 2 → 200 con nuevo par; R1 queda invalidado.
  - Paso 3 → 401 (token revocado o familia completa revocada). La familia completa de sesiones asociada se revoca (seguridad ante reutilización robada). La UI no debe expulsar al usuario erráticamente (ver H-10 en sección 5).
- **Red:** `POST /api/auth/refresh` → 200, luego → 401.
- **Limpieza:** ninguna.

### [AUT-013] Gracia de 30 s entre pestañas (REUSE_GRACE_SECONDS)

**Rol** `patient` · **Ruta** `—` · **P0** · **Resultado** `______`
- **Precondición:** Sesión activa abierta en dos pestañas del navegador. Variable `REUSE_GRACE_SECONDS` = 30 (por configuración). Entorno multi-pestaña disponible.
- **Datos:** refresh token compartido entre pestañas.
- **Pasos:**
  1. Pestaña A realiza refresh exitoso (obtiene R2).
  2. Pestaña B intenta refresh casi simultáneamente con R1 dentro de ventana de gracia (≤ 30 s).
- **Esperado:**
  - Dentro de `REUSE_GRACE_SECONDS`, Pestaña B no es expulsada inmediatamente por reutilización (ventana de gracia permite sincronización entre pestañas). Comportamiento observado según configuración del sistema.
- **Red:** refresh → 200 en A; respuesta aceptable en B dentro de ventana (sin revocación drástica entre pestañas).
- **Limpieza:** ninguna.

### [AUT-014] BroadcastChannel sincroniza token entre pestañas (vitaria-auth)

**Rol** `patient` · **Ruta** `—` · **P0** · **Resultado** `______`
- **Precondición:** Dos pestañas abiertas con misma sesión. Canal `BroadcastChannel` = `vitaria-auth` (H-21).
- **Datos:** — 
- **Pasos:**
  1. Pestaña A realiza refresh exitoso y emite evento por `BroadcastChannel` (`vitaria-auth`).
  2. Pestaña B recibe el evento con nuevo token.
  3. Pestaña B utiliza token nuevo y no reutiliza el revocado.
- **Esperado:**
  - Evento broadcast recibido en Pestaña B con nuevo token/actualización de sesión.
  - Pestaña B sincroniza estado y evita uso del token revocado.
- **Red:** eventos broadcast observados (sin petición HTTP adicional obligatoria).
- **Limpieza:** ninguna.

### [AUT-015] Logout borra la cookie de sesión

**Rol** `patient` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** Sesión activa de `user1@clinic.com`.
- **Datos:** — 
- **Pasos:**
  1. Ejecutar `POST /api/auth/logout`.
  2. Intentar acceder a ruta protegida `/dashboard`.
- **Esperado:**
  - `POST /api/auth/logout` → 200.
  - Cookie de sesión borrada (instrucción `Set-Cookie` para expiración).
  - Al navegar a `/dashboard`, redirige a `/login`. Sin bucle de redirección.
- **Red:** `POST /api/auth/logout` → 200. Verificar borrado de cookie.
- **Limpieza:** ninguna.

### [AUT-016] Logout de todas las sesiones

**Rol** `patient` · **Ruta** `/settings` · **P0** · **Resultado** `______`
- **Precondición:** Sesión activa en al menos 2 dispositivos/pestañas (o simulado). **⚠️ DESTRUCTIVO** si afecta otras sesiones activas del operador.
- **Datos:** — 
- **Pasos:**
  1. Con sesión activa en dispositivo A, abrir sesión en dispositivo B (simulado).
  2. Desde dispositivo A ejecutar `POST /api/auth/logout-all`.
  3. Verificar estado en dispositivo B.
- **Esperado:**
  - `POST /api/auth/logout-all` → 200.
  - Todas las sesiones del usuario son revocadas. Dispositivo B pierde sesión y es redirigido a `/login` en siguiente petición protegida.
- **Red:** `POST /api/auth/logout-all` → 200.
- **Limpieza:** ninguna (estado esperado tras logout global). Marcar `⚠️ DESTRUCTIVO` en ejecución y solo ejecutar con `ALLOW_DESTRUCTIVE=true` si autorizado.

### [AUT-017] Listar sesiones activas con dispositivo, IP y última actividad

**Rol** `patient` · **Ruta** `/settings` · **P0** · **Resultado** `______`
- **Precondición:** Sesión activa de `user1@clinic.com`.
- **Datos:** — 
- **Pasos:**
  1. Abrir `/settings` > Seguridad/Sesiones.
  2. Solicitar listado: `GET /api/auth/sessions`.
- **Esperado:**
  - `GET /api/auth/sessions` → 200.
  - Lista sesiones activas con campos: dispositivo, IP, última actividad (y metadatos identificadores). Al menos la sesión actual aparece.
- **Red:** `GET /api/auth/sessions` → 200. Verificar presencia de campos observables.
- **Limpieza:** ninguna.

### [AUT-018] Revocar sesión concreta sin matar las demás

**Rol** `patient` · **Ruta** `/settings` · **P0** · **Resultado** `______`
- **Precondición:** ≥ 2 sesiones activas para `user1@clinic.com`.
- **Datos:** ID de sesión distinta a la actual (`session_id`).
- **Pasos:**
  1. Obtener listado de sesiones (AUT-017).
  2. Revocar sesión concreta: `DELETE /api/auth/sessions/:id`.
  3. Verificar estado de sesión revocada y de sesión actual.
- **Esperado:**
  - `DELETE /api/auth/sessions/:id` → 200.
  - Sesión concreta revocada; las demás sesiones siguen activas (incluida la actual).
- **Red:** `DELETE /api/auth/sessions/:id` → 200.
- **Limpieza:** ninguna.

### [AUT-019] Cambio de contraseña exige la actual e invalida refresh vía token_version

**Rol** `patient` · **Ruta** `/settings` · **P0** · **Bloqueante** · **Resultado** `______`
- **Precondición:** Sesión activa de `user1@clinic.com`. Preparar nueva contraseña temporal con política válida (8+ chars, mayúscula, minúscula, número, especial).
- **Datos:** current_password = `Vitaria.user1.<año>!` · new_password = `QaTempPass9!<timestamp>` (política válida) · confirmar nueva.
- **Pasos:**
  1. Enviar cambio de contraseña: `POST /api/auth/change-password` con current/new.
  2. Intentar usar refresh token previo al cambio.
- **Esperado:**
  - `POST /api/auth/change-password` → 200.
  - Cambio exige contraseña actual (validación previa). 
  - Refresh tokens previos quedan inválidos vía `token_version` (incremento). Intento con refresh previo → 401.
  - Nueva contraseña permite login posterior (verificación opcional).
- **Red:** `POST /api/auth/change-password` → 200; refresh previo → 401.
- **Limpieza:** restaurar contraseña original de `user1@clinic.com` a `Vitaria.user1.<año>!` (o documentar estado). Marcar limpieza explícita.

### [AUT-020] Contraseña débil rechazada indicando requisito concreto

**Rol** `patient` · **Ruta** `/settings` · **P0** · **Resultado** `______`
- **Precondición:** Sesión activa.
- **Datos:** current_password válida · new_password débil = `abc123` (no cumple 8+ chars, mayúscula, minúscula, número, especial).
- **Pasos:**
  1. Intentar `POST /api/auth/change-password` con contraseña débil.
- **Esperado:**
  - `POST /api/auth/change-password` → 400.
  - Mensaje de error indica el requisito concreto (no genérico), según `auth.schema` (8+ caracteres, mayúscula, minúscula, número, especial).
- **Red:** `POST /api/auth/change-password` → 400. Verificar requisito concreto en cuerpo.
- **Limpieza:** ninguna.

### [AUT-021] Reset por email con anti-enumeración

**Rol** `cualquiera` · **Ruta** `/forgot-password` · **P0** · **Resultado** `______`
- **Precondición:** PRE-08 (`EMAIL_TEST` definido). Si no existe, caso `BLOQUEADO`.
- **Datos:** email existente = `user1@clinic.com` · email inexistente = `qa-noexiste+<timestamp>@example.invalid`.
- **Pasos:**
  1. Enviar `POST /api/auth/forgot-password` con email existente.
  2. Enviar `POST /api/auth/forgot-password` con email inexistente (mismo instante o consecutivo).
  3. Comparar status, cuerpo y tiempo de respuesta.
- **Esperado:**
  - Ambos casos devuelven **mismo status**, **mismo cuerpo** y **mismo tiempo** aproximado (anti-enumeración H-11).
  - No revela si la cuenta existe.
- **Red:** `POST /api/auth/forgot-password` → 200 (o status consistente) en ambos casos.
- **Limpieza:** ninguna.

### [AUT-022] Registro por invitación con política de contraseña robusta

**Rol** `invitado` · **Ruta** `/register` · **P0** · **Resultado** `______`
- **Precondición:** Token de invitación válido (7 días). Generado por `POST /api/doctors/invite` (admin). Si no disponible, caso `BLOQUEADO`.
- **Datos:** token válido · password = `QaInvit3!<timestamp>` (cumple 8+ chars, mayúscula, minúscula, número, especial).
- **Pasos:**
  1. Abrir `/register?token=<token_valido>`.
  2. Completar formulario y enviar `POST /api/auth/register`.
- **Esperado:**
  - `POST /api/auth/register` → 201/200 con registro exitoso.
  - Password validado: 8+ caracteres, mayúscula, minúscula, número, especial.
  - Solo con token válido (no permite registro sin invitación).
- **Red:** `POST /api/auth/register` → 200/201.
- **Limpieza:** eliminar usuario creado con prefijo `QA-AUT-` si procede (destructivo opcional; documentar `OMITIDO` si no autorizado).

### [AUT-023] Deep link a /login renderiza página completa por URL directa

**Rol** `cualquiera` · **Ruta** `/login` · **P1** · **Resultado** `______`
- **Precondición:** Contexto limpio. Navegación por URL directa (no SPA transition interna).
- **Datos:** URL absoluta `$BASE_URL/login`.
- **Pasos:**
  1. Navegar directamente a `/login` por URL.
  2. Verificar renderizado completo de la página (no 404, no pantalla en blanco).
- **Esperado:**
  - Página `/login` renderiza completa por URL directa (deep link funciona). Sin bucle de redirección (H-13).
- **Red:** solicitud inicial → 200 (HTML). Sin redirecciones erráticas.
- **Limpieza:** ninguna.

### [AUT-024] Expiración por inactividad con un solo toast y sin bucle

**Rol** `patient` · **Ruta** `—` · **P1** · **Resultado** `______`
- **Precondición:** Sesión activa. Simular expiración por inactividad (idle timeout). Hallazgo CU-112.
- **Datos:** — 
- **Pasos:**
  1. Mantener sesión inactiva hasta expirar (o forzar expiración del token).
  2. Realizar acción que requiera token válido.
- **Esperado:**
  - Al expirar, aparece **un solo toast** de sesión expirada.
  - Redirección a `/login` **sin bucle** de redirección.
  - No se repiten toasts ni peticiones en bucle.
- **Red:** petición con token expirado → 401/403; respuesta dispara logout único.
- **Limpieza:** ninguna.

### [AUT-025] Límites de cookie (idle 24 h, máximo 30 días) y SESSION_IDLE_HOURS

**Rol** `patient` · **Ruta** `—` · **P2** · **Resultado** `______`
- **Precondición:** Sesión activa. Revisar atributos de cookie `SESSION_IDLE_HOURS`.
- **Datos:** — 
- **Pasos:**
  1. Inspeccionar `Set-Cookie` de sesión tras login/refresh.
  2. Verificar atributos `Max-Age`/`Expires` según límites: idle 24 h, máximo 30 días.
- **Esperado:**
  - Cookie de sesión aplica límites: idle 24 h y máximo 30 días (configurados vía `SESSION_IDLE_HOURS`).
  - Atributos coherentes (`HttpOnly`, `Secure` según entorno, `SameSite`).
- **Red:** `Set-Cookie` presente con atributos esperados.
- **Limpieza:** ninguna.

### [AUT-026] JWKS devuelve { keys: [] } y códigos mapeados a i18n en 4 idiomas

**Rol** `cualquiera` · **Ruta** `—` · **P3** · **Resultado** `______`
- **Precondición:** Sin sesión requerida.
- **Datos:** `GET /api/auth/jwks`.
- **Pasos:**
  1. Solicitar `GET /api/auth/jwks`.
  2. Verificar stub declarado (README §15.19).
  3. Revisar mapeo de códigos `AUTH_LOCKED` e `INVALID_CREDENTIALS` a i18n en `es.json`, `en.json`, `pt.json`, `fr.json` (ns `errors`) [verificar literales].
- **Esperado:**
  - `GET /api/auth/jwks` → 200 devolviendo `{ keys: [] }` (stub declarado, no fallo).
  - Códigos `AUTH_LOCKED` e `INVALID_CREDENTIALS` están mapeados a claves i18n en los 4 idiomas. Textos no hardcodeados en español únicamente cuando procede.
- **Red:** `GET /api/auth/jwks` → 200 con cuerpo `{ "keys": [] }`.
- **Limpieza:** ninguna.

## 5. Defectos conocidos a verificar primero

| Hallazgo | Caso que lo ejercita | Verificar |
|---|---|---|
| H-10 reutilización de refresh | AUT-012 | Reutilizar refresh antiguo revoca la familia; la UI no debe expulsar al usuario erráticamente |
| H-11 anti-enumeración | AUT-021 | Reset por email devuelve mismo status/cuerpo/tiempo exista o no la cuenta |
| H-12 2FA sin cookie | AUT-006 | Login con 2FA activo → 200 `requires_2fa: true` **sin** `Set-Cookie` |
| H-13 deep link a `/login` | AUT-023 | Navegación directa a `/login` renderiza completa sin bucle |
| H-21 `BroadcastChannel` multi-pestaña | AUT-014 | Pestaña B recibe token nuevo vía `vitaria-auth` y no usa el revocado |

## 6. Huecos conocidos

No aplica.

## 7. Resultado del área

- Casos escritos: 26 (AUT-001 … AUT-026)
- Estado: Pendiente de ejecución. Todos los casos cumplen estructura obligatoria (Precondición, Datos, Pasos, Esperado, Red, Limpieza). Resultado marcado como `______` para rellenar al ejecutar.

---
*Área: Autenticación, sesiones y 2FA. Alcance: login, refresh, logout, sesiones, 2FA, contraseñas, registro por invitación, JWKS. Última revisión: 2026-10-01.*
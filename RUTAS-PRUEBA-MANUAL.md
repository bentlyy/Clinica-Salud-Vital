# 🧪 Rutas de Prueba Manual — Vitaria Clinic

> Guía paso a paso para verificar que cada funcionalidad del sistema funciona correctamente,
> organizada por rol de usuario. Ejecutar cada bloque secuencialmente.

---

## Credenciales de Prueba (ajustar según tu entorno)

| Rol | Email | Password |
|-----|-------|----------|
| superadmin | superadmin@vitaria.com | * definir |
| admin | admin@clinica.com | * definir |
| doctor | doctor@clinica.com | * definir |
| lab_technician | lab@clinica.com | * definir |
| patient | patient@clinica.com | * definir |

---

## 🔐 MÓDULO 1: AUTENTICACIÓN (todos los roles)

### 1.1 Registro de usuario nuevo
1. Ir a `/register?invite=TOKEN_VÁLIDO` (generar invite previamente desde admin)
2. Completar: nombre, contraseña (debe cumplir: min 8, mayúscula, minúscula, número, especial)
3. Confirmar contraseña
4. Hacer clic en "Registrarse"
5. **Esperado:** Redirige a login o dashboard. Usuario creado con rol `patient` por defecto

### 1.2 Login exitoso
1. Ir a `/` (landing page)
2. Abrir modal de login
3. Ingresar email y contraseña válidos
4. Hacer clic en "Iniciar Sesión"
5. **Esperado:** Redirige al dashboard correspondiente al rol

### 1.3 Login con credenciales incorrectas
1. Abrir modal de login
2. Ingresar email correcto, contraseña incorrecta
3. Hacer clic en "Iniciar Sesión"
4. **Esperado:** Mensaje de error "Credenciales inválidas"
5. Repetir 5 veces con contraseña incorrecta
6. **Esperado:** Cuenta bloqueada por 15 minutos (mensaje de lockout)

### 1.4 Login con 2FA habilitado
1. Habilitar 2FA desde Settings > Security (ver sección 2.4)
2. Cerrar sesión
3. Iniciar sesión con credenciales válidas
4. **Esperado:** Redirige a `/2fa` pidiendo código TOTP de 6 dígitos
5. Ingresar código desde app autenticadora
6. **Esperado:** Acceso concedido, redirige a dashboard

### 1.5 Login con 2FA — código inválido
1. En la pantalla de 2FA, ingresar código incorrecto
2. **Esperado:** Mensaje de error, permanece en `/2fa`

### 1.6 Refresh token (sesión prolongada)
1. Iniciar sesión normalmente
2. Esperar 15+ minutos (o modificar token manualmente)
3. Realizar cualquier acción en la UI
4. **Esperado:** La sesión se renueva automáticamente sin redirigir a login

### 1.7 Cerrar sesión
1. Hacer clic en avatar > "Cerrar Sesión"
2. **Esperado:** Redirige a `/`, cookies eliminadas
3. Intentar navegar a `/dashboard` directamente por URL
4. **Esperado:** Redirige a `/` (no autenticado)

### 1.8 Cerrar todas las sesiones
1. Ir a Settings > Security > Sesiones
2. Hacer clic en "Cerrar todas las sesiones"
3. **Esperado:** Todas las sesiones excepto la actual quedan revocadas

### 1.9 Cambiar contraseña
1. Ir a Settings > Security
2. Ingresar contraseña actual
3. Ingresar nueva contraseña (cumplir validación)
4. Confirmar nueva contraseña
5. Hacer clic en "Cambiar Contraseña"
6. **Esperado:** Mensaje de éxito. Cerrar sesión y verificar que la nueva contraseña funciona

### 1.10 Olvidé mi contraseña
1. Cerrar sesión
2. Ir a `/forgot-password`
3. Ingresar email registrado
4. **Esperado:** Mensaje "Si el email existe, se envió un enlace de recuperación"
5. Ir al email y hacer clic en el enlace
6. **Esperado:** Redirige a `/reset-password?token=...&email=...`
7. Ingresar nueva contraseña
8. **Esperado:** Contraseña cambiada, puede login con nueva contraseña

### 1.11 Rate limiting en autenticación
1. Intentar login 10 veces en 15 minutos con credenciales incorrectas
2. **Esperado:** after intentos, respuesta 429 (Too Many Requests)

### 1.12 Token refresh automático
1. Iniciar sesión
2. Esperar que expire el access token (15 min)
3. Navegar por la app
4. **Esperado:** Se refresca automáticamente sin perder sesión

---

## ⚙️ MÓDULO 2: CONFIGURACIÓN DE CUENTA (todos los roles)

### 2.1 Ver perfil
1. Ir a Settings
2. **Esperado:** Se muestran datos: nombre, email, teléfono, rol, tenant

### 2.2 Cambiar contraseña
- (Ver 1.9)

### 2.3 Ver sesiones activas
1. Ir a Settings > Security
2. **Esperado:** Lista de sesiones con IP, dispositivo, última actividad
3. Revocar una sesión específica
4. **Esperado:** Sesión eliminada de la lista

### 2.4 Habilitar 2FA
1. Ir a Settings > Security
2. Hacer clic en "Habilitar 2FA"
3. **Esperado:** Se muestra QR code + código secreto
4. Escanear QR con Google Authenticator / Authy
5. Ingresar código de 6 dígitos
6. Hacer clic en "Verificar"
7. **Esperado:** 2FA habilitado, estado actualizado

### 2.5 Deshabilitar 2FA
1. Ir a Settings > Security
2. Hacer clic en "Deshabilitar 2FA"
3. Ingresar contraseña actual
4. Ingresar código TOTP actual
5. **Esperado:** 2FA deshabilitado

### 2.6 Cambiar idioma (i18n)
1. Hacer clic en el ítem de idioma (ES/EN) en el topbar
2. **Esperado:** Toda la interfaz cambia al idioma seleccionado
3. Recargar la página
4. **Esperado:** Idioma persiste

### 2.7 Cambiar tema (claro/oscuro)
1. Hacer clic en el ítem de tema en el topbar
2. **Esperado:** Tema cambia entre claro y oscuro
3. Recargar la página
4. **Esperado:** Tema persiste

### 2.8 Exportar datos personales
1. Ir a Settings o buscar opción de exportar
2. Solicitar exportación de datos
3. **Esperado:** Se genera archivo con todos los datos del usuario

---

## 👑 MÓDULO 3: SUPER ADMIN

### 3.1 Panel SaaS (`/saas`)
1. Login como superadmin
2. Ir a `/saas`
3. **Esperado:** KPIs visibles: tenants activos, MRR, usuarios totales, salud del sistema
4. Verificar gráficos de ingresos y crecimiento

### 3.2 Gestión de Tenants (`/tenants`)
1. Ir a `/tenants`
2. **Esperado:** Lista de todos los tenants/clínicas
3. **Crear tenant:**
   - Hacer clic en "Crear Tenant"
   - Ingresar nombre, dominio, seleccionar plan
   - Guardar
   - **Esperado:** Tenant aparece en la lista
4. **Editar tenant:**
   - Hacer clic en un tenant
   - Modificar nombre o configuración
   - Guardar
   - **Esperado:** Cambios reflejados
5. **Ver detalle:**
   - Hacer clic en un tenant
   - **Esperado:** Se muestra información completa con estadísticas

### 3.3 Gestión de Usuarios Globales (`/super-admin/users`)
1. Ir a `/super-admin/users`
2. **Esperado:** Lista de todos los usuarios de todos los tenants
3. Buscar usuario por nombre o email
4. **Esperado:** Filtrado funciona
5. Activar/desactivar un usuario
6. **Esperado:** Estado del usuario cambia
7. Intentar login con usuario desactivado
8. **Esperado:** Login falla con "Cuenta desactivada"

### 3.4 Gestión de Especialidades (`/specialties`)
1. Ir a `/specialties`
2. **Crear especialidad:**
   - Hacer clic en "Crear"
   - Ingresar nombre, descripción, color
   - Guardar
   - **Esperado:** Especialidad aparece en la lista
3. **Editar especialidad:**
   - Modificar nombre o color
   - Guardar
   - **Esperado:** Cambios reflejados
4. **Eliminar especialidad:**
   - Hacer clic en eliminar
   - Confirmar
   - **Esperado:** Especialidad eliminada (solo si no tiene doctores asociados)

### 3.5 Gestión de Feriados (`/holidays`)
1. Ir a `/holidays`
2. **Crear feriado:**
   - Seleccionar fecha
   - Ingresar nombre del feriado
   - Opcional: días de anticipación para cancelar citas
   - Guardar
   - **Esperado:** Feriado registrado
3. **Eliminar feriado**
4. **Esperado:** Feriado removido

### 3.6 Auditoría (`/audit`)
1. Ir a `/audit`
2. **Esperado:** Logs de auditoría con: fecha, usuario, acción, recurso, detalles
3. Filtrar por fecha, usuario, o tipo de acción
4. **Esperado:** Filtrado funciona
5. Ver detalle de un log
6. **Esperado:** Se muestran valores anteriores/nuevos

### 3.7 Facturación SaaS (`/cobros`)
1. Ir a `/cobros`
2. **Esperado:** Resumen de suscripciones, facturas pendientes, ingresos

### 3.8 Gestión de Laboratorio (feature-gated)
1. Ir a Laboratory en el sidebar
2. **Esperado:** Panel de laboratorio visible (si feature "laboratory" está habilitado)
3. Ver catálogo de tests, control de calidad, analytics

### 3.9 Datos Demo (`/super-admin/demo-data`)
1. Ir a `/super-admin/demo-data`
2. Generar datos demo
3. **Esperado:** Datos creados exitosamente

### 3.10 Resetear contraseña de admin
1. Usar endpoint `POST /api/auth/reset-admin` con token de superadmin
2. **Esperado:** Contraseña del admin objetivo cambiada

---

## 🏥 MÓDULO 4: ADMIN

### 4.1 Dashboard (`/dashboard`)
1. Login como admin
2. **Esperado:** Vista de tabs: Overview, Users, Doctors, Patients, Specialties
3. **KPIs visibles:** Citas de hoy, total pacientes, total citas, confirmadas
4. Cambiar entre tabs
5. **Esperado:** Cada tab muestra información relevante

### 4.2 Gestión de Doctores (`/doctors`)
1. Ir a `/doctors`
2. **Ver lista:** Lista de doctores con especialidad, estado, email
3. **Crear doctor:**
   - Hacer clic en "Crear Doctor"
   - Completar: nombre, email, especialidad, teléfono, biografía, tarifa
   - Guardar
   - **Esperado:** Doctor creado, usuario asociado generado
4. **Invitar doctor:**
   - Hacer clic en "Invitar"
   - Ingresar email del doctor
   - Enviar invitación
   - **Esperado:** Email de invitación enviado
5. **Editar doctor:**
   - Modificar datos
   - Guardar
   - **Esperado:** Cambios reflejados
6. **Ver doctor en modo card/grid**
7. **Esperado:** Cambia entre vista de lista y tarjetas

### 4.3 Gestión de Usuarios (`/users`)
1. Ir a `/users`
2. **Crear usuario (invite):**
   - Hacer clic en "Crear Usuario"
   - Seleccionar rol (doctor/lab_tech/patient)
   - Si doctor: seleccionar especialidad (obligatorio)
   - Ingresar email, RUT, teléfono
   - Enviar invitación
   - **Esperado:** Email de invitación enviado, usuario en lista con estado "pendiente"
3. **Activar/desactivar usuario:**
   - Toggle active/inactive
   - **Esperado:** Estado cambia, usuario no puede login si desactivado
4. **Ver detalle de usuario**
5. **Esperado:** Información completa del usuario

### 4.4 Gestión de Citas (`/clinical` > tab Bookings)
1. Ir a Clinical > Bookings
2. **Crear cita:**
   - Hacer clic en "Nueva Cita"
   - Seleccionar doctor
   - Seleccionar fecha
   - Seleccionar horario disponible
   - Guardar
   - **Esperado:** Cita creada con estado "pending"
3. **Crear cita recurrente:**
   - En el formulario de nueva cita, marcar "Recurrente"
   - Seleccionar frecuencia (semanal/mensual)
   - Ingresar número de ocurrencias
   - **Esperado:** Serie de citas creadas
4. **Cancelar cita:**
   - Seleccionar cita existente
   - Hacer clic en "Cancelar"
   - Confirmar
   - **Esperado:** Estado cambia a "cancelled"
5. **Reprogramar cita:**
   - Seleccionar cita
   - Cambiar fecha/hora
   - **Esperado:** Cita actualizada
6. **Verificar slots disponibles:**
   - Al seleccionar doctor + fecha, se cargan slots
   - **Esperado:** Solo se muestran horarios sin ocupar

### 4.5 Gestión de Pacientes (`/patients`)
1. Ir a `/patients`
2. **Ver lista:** Pacientes con nombre, email, teléfono
3. **Buscar paciente** por nombre o RUT
4. **Esperado:** Filtrado funciona

### 4.6 Historial Clínico (`/clinical` > tab Records)
1. Ir a Clinical > Records
2. **Crear registro clínico:**
   - Hacer clic en "Nuevo Registro"
   - Seleccionar paciente
   - Ingresar: motivo de consulta, anamnesis, signos vitales, examen físico, diagnóstico, plan de tratamiento
   - Buscar código CIE-10
   - Guardar
   - **Esperado:** Registro creado con estado "draft"
3. **Editar registro clínico**
4. **Completar registro** (cambiar estado a "completed")
5. **Eliminar registro** (solo doctor que lo creó)
6. **Verificar CIE-10:**
   - Buscar código por descripción
   - **Esperado:** Se muestran resultados relevantes

### 4.7 Prescripciones (`/clinical` > tab Prescriptions)
1. Ir a Clinical > Prescriptions
2. **Crear prescripción:**
   - Seleccionar paciente
   - Agregar medicamentos (nombre, dosis, frecuencia, duración, instrucciones)
   - Agregar múltiples medicamentos
   - Guardar
   - **Esperado:** Prescripción creada
3. **Ver prescripciones existentes**
4. **Descargar PDF** de prescripción
5. **Esperado:** PDF generado correctamente

### 4.8 Historial Médico (`/clinical` > tab History)
1. Ir a Clinical > History
2. **Crear entrada:** Condición, fecha de inicio, estado (active/resolved/chronic/family), notas
3. **Editar entrada**
4. **Ver detalle de entrada**

### 4.9 Disponibilidad de Doctores (`/availability`)
1. Ir a `/availability`
2. **Crear regla de disponibilidad:**
   - Seleccionar doctor
   - Seleccionar día de la semana
   - Definir hora inicio y fin
   - Guardar
   - **Esperado:** Regla creada, visible en la grilla
3. **Crear disponibilidad masiva (bulk)**
4. **Eliminar regla de disponibilidad**
5. **Crear excepción (día libre):**
   - Seleccionar fecha
   - Marcar "día completo" o definir horas
   - **Esperado:** Excepción registrada, no se muestran slots para esa fecha

### 4.10 Calendario (`/calendar`)
1. Ir a `/calendar`
2. **Ver vista de calendario:** Citas del doctor mostradas en FullCalendar
3. **Navegar entre semanas/meses**
4. **Hacer clic en una cita**
5. **Esperado:** Se muestran detalles de la cita

### 4.11 Facturación (`/billing`)
1. Ir a `/billing`
2. **Ver lista de facturas**
3. **Crear factura:**
   - Seleccionar paciente
   - Agregar ítems (descripción, cantidad, precio unitario)
   - Guardar
   - **Esperado:** Factura creada con estado "pending"
4. **Cambiar estado de factura:** pending → paid / cancelled / refunded
5. **Ver estadísticas de facturación**
6. **Eliminar factura**

### 4.12 Gestión de Laboratorio (`/laboratory`)
1. Ir a Laboratory
2. **Ver dashboard:** KPIs de laboratorio, cola de trabajo, alertas
3. **Crear solicitud de laboratorio:**
   - Seleccionar paciente
   - Agregar tests del catálogo
   - Asignar prioridad
   - **Esperado:** Solicitud creada con estado "pending"
4. **Ver solicitudes existentes**
5. **Cambiar estado de solicitud:** pending → in_progress → completed
6. **Gestionar muestras:**
   - Registrar muestra
   - Recibir muestra
   - Verificar muestra
   - Asignar muestra
   - **Esperado:** Estados se actualizan correctamente
7. **Ingresar resultados:**
   - Ingresar valores de resultados
   - Validar como técnico
   - Validar como doctor
   - Firmar resultado
   - Entregar resultado
   - **Esperado:** Flujo completo de validación funciona
8. **Enviar resultados por email**
9. **Descargar PDF** de solicitud de laboratorio
10. **Ver historial de un item** de laboratorio
11. **Gestionar control de calidad:**
    - Crear registro QC
    - Ver estadísticas QC
12. **Gestionar equipos:**
    - Crear equipo
    - Verificar estados (online/offline/maintenance/calibration)
13. **Gestionar reactivos:**
    - Crear reactivo
    - Actualizar stock
    - Verificar fechas de expiración

### 4.13 Reportes (`/reports`)
1. Ir a Reports
2. **Ver tipos de reporte disponibles**
3. **Generar reporte:** Seleccionar tipo, configurar parámetros
4. **Esperado:** Reporte generado
5. **Descargar PDF** del reporte

### 4.14 Analytics (`/analytics`)
1. Ir a `/analytics`
2. **Ver gráficos:** Citas por mes, doctores top, distribución de estados, no-shows, diagnósticos
3. **Filtrar por rango de fechas**
4. **Ver forecast de demanda** (ML)
5. **Ver análisis de horarios óptimos**
6. **Ver detección de anomalías en signos vitales**

### 4.15 Notificaciones (`/notifications`)
1. Hacer clic en campana de notificaciones (topbar)
2. **Esperado:** Lista de notificaciones con tipo (info/warning/success/error)
3. Marcar una como leída
4. **Esperado:** Estado de leída actualizado
5. Marcar todas como leídas
6. **Esperado:** Todas marcadas

### 4.16 Lista de Espera (`/bookings` > waitlist)
1. Unirse a la lista de espera para un doctor/fecha sin disponibilidad
2. **Esperado:** Entrada creada
3. Ver propias entradas en waitlist
4. Salir de la lista de espera
5. **Esperado:** Entrada eliminada

### 4.17 Webhooks
1. Crear suscripción de webhook (URL, eventos)
2. **Esperado:** Webhook registrado
3. Actualizar webhook
4. Eliminar webhook
5. Verificar deliveries en log

---

## 👨‍⚕️ MÓDULO 5: DOCTOR

### 5.1 Dashboard (`/dashboard`)
1. Login como doctor
2. **Esperado:** Stats: próximas citas, pacientes atendidos, total citas, registros clínicos
3. **Esperado:** Lista de próximas citas

### 5.2 Panel del Doctor (`/panel`)
1. Ir a `/panel`
2. **Esperado:** Links rápidos, agenda del día, estadísticas personales

### 5.3 Mis Citas (`/clinical` > tab Bookings)
1. Ver citas propias (solo las asignadas a este doctor)
2. **Completar cita:**
   - Cambiar estado a "completed"
   - **Esperado:** Cita marcada como completada
3. **Marcar no-show:**
   - Cambiar estado a "no_show"
   - **Esperado:** Contador de no_show del paciente incrementa

### 5.4 Mis Pacientes (`/patients`)
1. Ver lista de pacientes atendidos
2. **Esperado:** Solo pacientes de este doctor

### 5.5 Historial de Paciente (`/patient-history`)
1. Seleccionar un paciente
2. **Ver tabs:**
   - **Resumen:** Datos generales del paciente
   - **Citas:** Historial de citas
   - **Historial:** Condiciones médicas
   - **Prescripciones:** Medicamentos recetados
   - **Archivos:** Adjuntos subidos
   - **Laboratorio:** Resultados de laboratorio
3. **Esperado:** Cada tab muestra información correcta y completa

### 5.6 Crear Registro Clínico (`/clinical` > Records)
1. Ir a Clinical > Records
2. Hacer clic en "Nuevo Registro"
3. Seleccionar paciente (autocomplete)
4. Completar campos:
   - Motivo de consulta
   - Anamnesis
   - Signos vitales (temp, presión, pulso, peso, saturación)
   - Examen físico
   - Diagnóstico (buscar CIE-10)
   - Plan de tratamiento
   - Notas adicionales
5. Guardar
6. **Esperado:** Registro creado. Verificar que aparece en la lista

### 5.7 Crear Prescripción
1. Ir a Clinical > Prescriptions
2. Hacer clic en "Nueva Prescripción"
3. Seleccionar paciente
4. Agregar medicamentos (nombre, dosis, frecuencia, duración, instrucciones)
5. Agregar varios medicamentos
6. Guardar
7. **Esperado:** Prescripción creada
8. **Descargar PDF**
9. **Esperado:** PDF contiene todos los medicamentos

### 5.8 Gestionar Disponibilidad
1. Ir a `/availability`
2. **Ver disponibilidad actual:** Grilla de días/horarios
3. **Agregar nuevo slot:** Día, hora inicio, hora fin
4. **Eliminar slot**
5. **Crear excepción (día libre):**
   - Fecha específica
   - "Día completo" o rango de horas
   - **Esperado:** Excepción visible, slots no disponibles para esa fecha

### 5.9 Gestionar Laboratorio
1. Crear solicitud de laboratorio para paciente
2. Agregar tests
3. **Ver resultados** de laboratorio de pacientes
4. **Validar resultados** (firma doctor)
5. **Descargar PDF** de solicitud

### 5.10 Ver Analytics
1. Ir a Management > Analytics
2. **Ver estadísticas propias:** Citas, pacientes, tendencias
3. **Filtrar por período**

### 5.11 Subir Archivos Adjuntos
1. En historial de paciente > tab Archivos
2. Subir archivo (imagen, PDF, documento)
3. **Esperado:** Archivo listado
4. Descargar archivo
5. **Esperado:** Descarga funciona
6. Eliminar archivo
7. **Esperado:** Archivo removido

### 5.12 Calendario ICS
1. Ir a `/calendar`
2. Descargar archivo ICS
3. **Esperado:** Archivo ICS válido, se puede importar en Google Calendar / Outlook

---

## 🔬 MÓDULO 6: LABORATORY TECHNICIAN

### 6.1 Dashboard (`/dashboard`)
1. Login como lab_technician
2. **Esperado:** Dashboard con métricas de laboratorio

### 6.2 Panel de Laboratorio (`/laboratory`)
1. Ir a `/laboratory`
2. **Ver KPIs:** Solicitudes pendientes, en progreso, completadas
3. **Ver cola de trabajo** (kanban)
4. **Ver alertas** de laboratorio

### 6.3 Solicitudes de Laboratorio (`/laboratory/requests`)
1. Ver lista de solicitudes
2. Filtrar por estado, prioridad, paciente
3. Ver detalle de solicitud
4. **Cambiar estado:** pending → in_progress → completed
5. **Esperado:** Estados se actualizan correctamente

### 6.4 Gestión de Muestras
1. **Registrar muestra:**
   - Asociar a solicitud de laboratorio
   - Tipo de muestra, código
   - **Esperado:** Muestra registrada
2. **Recibir muestra:**
   - Cambiar estado a "received"
   - **Esperado:** Muestra marcada como recibida
3. **Verificar muestra:**
   - Cambiar estado a "verified"
   - **Esperado:** Muestra verificada
4. **Asignar muestra** a área/tecnico
5. **Control de calidad:**
   - Registrar valores medidos vs esperados
   - **Esperado:** QC pass/fail determinado
6. **Rechazar muestra:**
   - Motivo de rechazo
   - **Esperado:** Muestra rechazada, notificación al doctor

### 6.5 Ingresar Resultados
1. Seleccionar item de solicitud
2. Ingresar valor resultado
3. Marcar si es normal/anormal
4. Agregar notas
5. **Validar como técnico:**
   - Hacer clic en "Validar (Técnico)"
   - **Esperado:** Item marcado como validado técnicamente
6. **Esperar validación del doctor** (firmar)
7. **Entregar resultado:**
   - Cambiar estado a "delivered"
   - **Esperado:** Resultado entregado

### 6.6 Catálogo de Tests (`/laboratory/catalog`)
1. Ver lista de tests disponibles
2. **Crear test:**
   - Nombre, descripción, código, categoría
   - Unidad, rangos de referencia
   - Precio, tipo de resultado, tipo de muestra
   - Área de laboratorio
   - Guardar
   - **Esperado:** Test agregado al catálogo
3. **Editar test**
4. **Eliminar test**

### 6.7 Control de Calidad (`/laboratory/quality-control`)
1. Ir a QC
2. **Ver gráficos de control**
3. **Crear registro QC:**
   - Seleccionar test
   - Tipo de QC
   - Valor medido vs rango esperado
   - **Esperado:** QC registrado
4. **Ver estadísticas QC**

### 6.8 Áreas de Laboratorio
1. Ver áreas configuradas
2. **Crear área:** nombre, código, descripción, ícono, color
3. **Ver dashboard por área**
4. **Esperado:** Métricas filtradas por área

### 6.9 Equipos de Laboratorio
1. Ver lista de equipos
2. **Crear equipo:** nombre, modelo, número de serie, estado
3. **Actualizar estado:** online/offline/maintenance/calibration
4. **Verificar fechas de calibración**

### 6.10 Reactivos
1. Ver lista de reactivos
2. **Crear reactivo:** nombre, número de catálogo, stock, fecha de expiración
3. **Actualizar stock**
4. **Verificar reactivos por expirar**

### 6.11 Notificaciones de Laboratorio
1. Ver notificaciones
2. **Verificar severidad:** info/warning/error
3. **Acknowledger notificación**
4. **Ver eventos en tiempo real** (SSE)

### 6.12 Enviar Resultados por Email
1. Seleccionar solicitud/item completo
2. Enviar por email
3. **Esperado:** Email enviado al paciente/doctor

### 6.13 Analytics de Laboratorio
1. Ir a `/laboratory/analytics`
2. **Ver métricas:** Tiempo promedio, volumen, tendencias

---

## 🤒 MÓDULO 7: PATIENT

### 7.1 Dashboard (`/dashboard`)
1. Login como patient
2. **Esperado:** Stats: próximas, completadas, canceladas, total
3. **Ver lista de próximas citas**

### 7.2 Mis Citas (`/bookings`)
1. Ir a `/bookings`
2. **Ver citas propias**
3. **Crear nueva cita:**
   - Seleccionar doctor
   - Seleccionar fecha y horario
   - Confirmar
   - **Esperado:** Cita creada con estado "pending"
4. **Cancelar cita:**
   - Seleccionar cita pendiente
   - Cancelar
   - **Esperado:** Estado cambia a "cancelled"
5. **Reprogramar cita:**
   - Cambiar fecha/hora
   - **Esperado:** Cita actualizada

### 7.3 Mis Registros Clínicos (`/clinical-records`)
1. Ir a `/clinical-records`
2. **Ver lista** de registros clínicos propios
3. **Ver detalle** de un registro
4. **Esperado:** Se muestra información completa: motivo, diagnóstico, tratamiento

### 7.4 Mis Prescripciones (`/prescriptions`)
1. Ir a `/prescriptions`
2. **Ver prescripciones** recibidas
3. **Ver detalle** de una prescripción
4. **Esperado:** Lista de medicamentos con dosis e instrucciones

### 7.5 Mi Historial Médico (`/medical-history`)
1. Ir a `/medical-history`
2. **Ver condiciones** médicas registradas
3. **Ver detalle** de una condición
4. **Esperado:** Información completa: condición, fecha inicio, estado, notas

### 7.6 Mis Resultados de Laboratorio (`/my-laboratory`)
1. Ir a `/my-laboratory`
2. **Ver resultados** de laboratorio
3. **Ver detalle** de un resultado
4. **Esperado:** Valores, rangos de referencia, estado normal/anormal
5. **Compartir resultado** (share link/token)
6. **Esperado:** Link de acceso público generado

### 7.7 Subir Archivos
1. En perfil o desde clinical records
2. Subir archivo adjunto
3. **Esperado:** Archivo listado
4. Descargar archivo

### 7.8 Unirse a Lista de Espera
1. Intentar agendar cita en horario sin disponibilidad
2. **Esperado:** Opción de unirse a waitlist
3. Unirse
4. **Esperado:** Entrada creada
5. Ver mis entradas en waitlist
6. Salir de la lista

### 7.9 Cancelar Reserva de Invitado
1. Ir a `/confirm/:token` con token de confirmación
2. **Esperado:** Detalles de la reserva
3. Cancelar reserva
4. **Esperado:** Reserva cancelada

---

## 🌐 MÓDULO 8: GUEST (no autenticado)

### 8.1 Landing Page (`/`)
1. Ir a `/`
2. **Esperado:** Página de marketing con:
   - Sección hero con botones de login y booking
   - Características del sistema
   - Planes de precios
   - Testimonios
   - FAQ
   - Formulario de contacto

### 8.2 Booking como invitado (`/booking`)
1. Ir a `/booking`
2. **Paso 1 - Datos personales:**
   - Ingresar nombre, email, teléfono, RUT
   - **Esperado:** Validación de RUT chileno funciona
3. **Paso 2 - Seleccionar doctor y fecha:**
   - Seleccionar doctor del dropdown
   - Seleccionar fecha
   - **Esperado:** Slots disponibles se cargan
   - Seleccionar horario
   - **Esperado:** Slot seleccionado resaltado
4. **Paso 3 - Confirmación:**
   - Ver resumen de la cita
   - Confirmar
   - **Esperado:** Cita creada, se muestra confirmación
5. **Verificar:** Email de confirmación enviado

### 8.3 Confirmar cita por email
1. Recibir email de confirmación
2. Hacer clic en enlace de confirmación
3. **Esperado:** Redirige a `/confirm/:token`
4. Ver detalles de la cita
5. Confirmar asistencia
6. **Esperado:** Cita marcada como "confirmed"

### 8.4 Buscar citas por RUT
1. Ir a endpoint `/api/guest/bookings/:rut`
2. **Esperado:** Lista de citas asociadas al RUT

### 8.5 Rate limiting de guest
1. Intentar crear 6 citas en 1 hora como invitado
2. **Esperado:** after la 5ta, respuesta 429

---

## 🔔 MÓDULO 9: NOTIFICACIONES (todos los roles autenticados)

### 9.1 Ver notificaciones
1. Login con rol que tenga campana (admin/doctor/lab_technician)
2. Hacer clic en campana de notificaciones
3. **Esperado:** Lista de notificaciones con: tipo, título, mensaje, fecha

### 9.2 Marcar como leída
1. Hacer clic en una notificación no leída
2. **Esperado:** Marcada como leída, contador decrementa

### 9.3 Marcar todas como leídas
1. Hacer clic en "Marcar todas como leídas"
2. **Esperado:** Todas marcadas, contador en 0

### 9.4 Contador de no leídas
1. **Esperado:** Número en campana refleja cantidad de no leídas

---

## 📊 MÓDULO 10: CROSS-CUTTING CONCERNS

### 10.1 Multi-tenancy
1. Login como admin de Tenant A
2. **Esperado:** Solo ve datos de Tenant A
3. Intentar acceder a datos de Tenant B (por URL o API)
4. **Esperado:** Acceso denegado o sin datos
5. Login como superadmin
6. **Esperado:** Puede ver datos de todos los tenants

### 10.2 CSRF Protection
1. Inspeccionar cookies: debe existir `csrf_token`
2. Hacer petición POST sin header `X-CSRF-Token`
3. **Esperado:** 403 Forbidden
4. Agregar header `X-CSRF-Token` con valor del cookie
5. **Esperado:** Petición exitosa

### 10.3 Rate Limiting Global
1. Hacer 500+ peticiones en 15 minutos
2. **Esperado:** after 500, respuesta 429

### 10.4 Correlation IDs
1. Inspeccionar headers de respuesta
2. **Esperado:** Header `X-Request-ID` presente con UUID

### 10.5 Health Check
1. Ir a `/health` o `/api/health`
2. **Esperado:** JSON con status de DB, memoria, Stripe

### 10.6 Feature Flags (Laboratorio)
1. Login como admin
2. Si plan no incluye "laboratory"
3. Ir a `/laboratory`
4. **Esperado:** Se muestra `PremiumLocked` en vez del contenido
5. Si plan incluye "laboratory"
6. **Esperado:** Contenido de laboratorio visible

### 10.7 Exportación de Datos (Data Portability)
1. Login como cualquier usuario
2. Solicitar exportación de datos propios (`GET /api/export/me`)
3. **Esperado:** Archivo con todos los datos del usuario
4. Como admin/doctor, exportar datos de un paciente
5. **Esperado:** Archivo con datos del paciente

### 10.8 Calendar ICS
1. Ir a `/api/calendar/doctor/:doctorId/ics` (público)
2. **Esperado:** Archivo ICS válido con eventos del doctor

### 10.9 Auditoría Inmutable
1. Realizar acciones como admin (crear usuario, modificar datos)
2. Ir a `/audit`
3. **Esperado:** Acciones registradas con hash de integridad
4. Verificar que logs no se pueden modificar (sin endpoint de edición)

### 10.10 Sensibilidad de Datos (PHI)
1. Revisar logs del servidor
2. **Esperado:** No se loguea información de salud (PHI) en texto plano
3. **Esperado:** Audit logs sanitizados

---

## 📋 MATRIZ DE COBERTURA POR ROL

| Funcionalidad | superadmin | admin | doctor | lab_tech | patient | guest |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Login/Logout | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Registro | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| 2FA | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Cambiar contraseña | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Gestionar tenants | ✅ | - | - | - | - | - |
| Gestionar usuarios | ✅ | ✅ | - | - | - | - |
| Gestionar doctores | - | ✅ | - | - | - | - |
| Crear/editar citas | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| Cancelar/reprogramar citas | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| Registro clínico | - | ✅ | ✅ | - | - | - |
| Prescripciones | - | ✅ | ✅ | - | - | - |
| Historial médico | - | ✅ | ✅ | - | - | - |
| Disponibilidad | ✅ | ✅ | ✅ | - | - | - |
| Calendario | ✅ | ✅ | ✅ | - | - | - |
| Laboratorio (solicitar) | - | ✅ | ✅ | - | - | - |
| Laboratorio (procesar) | ✅ | ✅ | - | ✅ | - | - |
| Laboratorio (resultados) | ✅ | ✅ | ✅ | ✅ | - | - |
| Ver resultados lab | - | ✅ | ✅ | ✅ | ✅ | - |
| Facturación | ✅ | ✅ | ✅ | - | - | - |
| Analytics | ✅ | ✅ | ✅ | ✅ | - | - |
| Reportes | ✅ | ✅ | ✅ | ✅ | - | - |
| Auditoría | ✅ | ✅ | - | - | - | - |
| Notificaciones | ✅ | ✅ | ✅ | ✅ | - | - |
| Especialidades | ✅ | ✅ | - | - | - | - |
| Feriados | ✅ | ✅ | - | - | - | - |
| Lista de espera | ✅ | ✅ | ✅ | - | ✅ | - |
| Webhooks | ✅ | ✅ | - | - | - | - |
| Adjuntos/archivos | ✅ | ✅ | ✅ | - | ✅ | - |
| Exportar datos | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Booking invitado | - | - | - | - | - | ✅ |
| Confirmar cita email | - | - | - | - | ✅ | ✅ |

---

## 🏃 FLUJO E2E RECOMENADO (happy path completo)

Este flujo prueba el ciclo de vida completo de una cita, desde la creación hasta el resultado:

1. **Admin** crea un doctor → invite → doctor se registra
2. **Admin** configura especialidad y disponibilidad del doctor
3. **Patient** crea una cita con ese doctor
4. **Admin/Doctor** confirma la cita
5. **Doctor** atiende la cita → crea registro clínico + prescripción
6. **Doctor** solicita análisis de laboratorio
7. **Lab Tech** procesa la muestra → ingresa resultados
8. **Doctor** valida y firma resultados
9. **Patient** ve resultados en `/my-laboratory`
10. **Admin** crea factura por la consulta
11. **Admin** revisa auditoría de todas las acciones
12. **Admin** revisa analytics con datos reales

---

## ⚠️ NOTAS PARA EL TESTER

- **CSRF:** El frontend maneja cookies `csrf_token` automáticamente. Si pruebas API directamente, necesitas el header `X-CSRF-Token`.
- **Rate Limiting:** Auth: 10 req/15min. Global: 500 req/15min. Guest booking: 5 req/hora.
- **2FA:** Necesitas una app como Google Authenticator para generar códigos TOTP.
- **Email:** Verificar que el servicio de email está configurado (para invitaciones, reset passwords, confirmaciones).
- **Tenant:** Todos los datos están aislados por tenant. Asegúrate de probar dentro del mismo tenant.
- **Feature Flags:** Laboratorio puede estar deshabilitado según el plan SaaS del tenant.
- **Rate limits:** Si usas credenciales de prueba, no excedas 5 intentos de login fallidos (bloqueo 15 min).

---

> **Versión:** 1.0
> **Última actualización:** 2026-08-25
> **Proyecto:** Vitaria — Clinic Management System

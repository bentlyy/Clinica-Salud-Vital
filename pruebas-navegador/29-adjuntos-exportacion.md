# 29 — Adjuntos y exportacion

> Cubre el almacen de archivos adjuntos a entidades clinicas (subida en base64, listado, descarga y
> borrado con su control de propiedad) y la exportacion de datos de portabilidad del paciente, incluida
> la inclusion de los propios adjuntos en el paquete exportado.

| # | Prefijo | Capa | Frecuencia | Casos | Depende de | Bloquea |
|---|---|---|---|---:|---|---|
| `29` | `ADJ` | C4 | Mensual | 14 | `21-` | — |

## 1. Que cubre

- `POST /api/attachments`: subida de un archivo codificado en base64 a una entidad clinica, con su
  respuesta 201 y el nombre interno generado.
- Limites reales de tamano: el limite del cuerpo de la peticion y el limite de 10 MB del servicio, y la
  diferencia entre ambos.
- Lista blanca de tipos MIME y su mensaje de rechazo.
- `GET /api/attachments` con `entity_type` y `entity_id`, y su sobre `{ data: [...] }`.
- `GET /api/attachments/:id/download` con sus cabeceras de contenido.
- `DELETE /api/attachments/:id`, la distincion entre el que subio el archivo y quien puede borrarlo.
- Los seis tipos de entidad admitidos y el rechazo de cualquiera que no este en la lista.
- `GET /api/export/me` y `GET /api/export/patients/:patientId`, con las nueve claves del paquete y su
  bloque de aislamiento.

No cubre los adjuntos de imagenes de la interfaz de la clinica (rayos X en la vista de paciente) ni la
exportacion masiva del area 25: aqui solo se verifica la exportacion de un paciente.

## 2. Roles y rutas

| Rol | Rutas de UI | Endpoints observados |
|---|---|---|
| `doctor` | `/patient/:id/clinical-records` (ficha clinica) | `POST /api/attachments`, `GET /api/attachments?entity_type=&entity_id=`, `GET /api/attachments/:id/download`, `DELETE /api/attachments/:id` |
| `admin`, `superadmin` | idem | los cuatro endpoints |
| `patient` | ficha propia | los cuatro endpoints, restringidos por propiedad |
| `cualquiera` (autenticado) | `—` | los cuatro, mas `GET /api/export/me`, `GET /api/export/patients/:patientId` |

Las cuatro rutas de adjuntos declaran `authorize('doctor', 'admin', 'superadmin', 'patient', 'user')`, de
modo que `patient` y `user` tambien pueden llamar a la API. La restriccion real la aplica
`assertOwnership` dentro del servicio, no el middleware. Ver ADJ-007, ADJ-009 y ADJ-012.

## 3. Precondiciones de datos

- Sesiones validas de `doctor`, `admin` y `patient` (area `10-`), y el `users.doctor_id` del doctor de
  prueba para las comprobaciones de propiedad.
- Un expediente clinico (`clinical_records`) del paciente de prueba, creado en el area `21-`, con su
  `id` anotado.
- Un segundo paciente, con su propio expediente, para las comprobaciones de acceso cruzado.
- Al menos una cita, un resultado de laboratorio y una entrada de historial médico, para ADJ-010, con sus
  `id`.
- Un archivo PDF valido pequeno (menos de 60 KB) y su base64, generado antes de empezar.
- Un archivo PDF valido de 150 KB y su base64, para medir el limite real del cuerpo.
- Conocer el limite del cuerpo de la API antes de empezar: la aplicacion lo fija en `100kb`, de modo que
  el limite efectivo de la subida no es el mensaje de 10 MB del servicio. Ver ADJ-002.
- Anotar el numero de filas de `attachments` antes de empezar: la subida y el borrado son mutaciones
  sobre una tabla que la UI no puede deshacer sola.

## 4. Casos

### [ADJ-001] Subir un archivo a un expediente clinico propio

**Rol** `doctor` · **Ruta** `/patient/:id/clinical-records` · **P1** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; existe un `clinical_records` creado por ese mismo doctor; el
archivo PDF de prueba tiene menos de 60 KB.
**Datos:** `entity_type: clinical_record` · `entity_id: <id del expediente>` · `mime_type: application/pdf` · `file_name: informe-qa.pdf` · `data_base64: <base64 del PDF>`

1. Emitir `POST /api/attachments` con el cuerpo del paso de Datos.
2. Anotar el status, el `id` asignado y el `stored_name` devuelto.
3. Listar los adjuntos de esa entidad y confirmar que aparece la fila nueva.
4. Consultar en el sistema de ficheros que existe el archivo con ese `stored_name` dentro del directorio
   del tenant.
5. Consultar `attachments` en la base de datos y comparar `size_bytes` con el tamano real del PDF.

**Esperado**
- `POST /api/attachments` -> 201 con el registro completo: `id`, `tenant_id`, `entity_type`, `entity_id`,
  `original_name`, `stored_name`, `mime_type`, `size_bytes`, `uploaded_by`, `created_at`.
- `original_name` conserva el nombre enviado (`informe-qa.pdf`) y `stored_name` es un nombre aleatorio
  de 32 caracteres hexadecimales mas la extension, distinto del nombre original.
- `size_bytes` coincide con el tamano real del archivo decodificado, no con el largo de la cadena base64.
- `uploaded_by` es el `id` del doctor que subio el archivo.
- El archivo se escribe en el directorio del tenant, no en una ruta compartida entre clinicas.

**Red:** `POST /api/attachments` -> 201 y `GET /api/attachments?entity_type=clinical_record&entity_id=<id>`
-> 200. Verificar en el cuerpo de la lista que la fila tiene el mismo `id` que devolvio la subida.
**Limpieza:** `DELETE /api/attachments/<id devuelto>` y comprobar que el fichero desaparece del disco.

### [ADJ-002] Subir un archivo mayor que el limite del cuerpo y medir el corte real

**Rol** `doctor` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; existen el PDF de 60 KB y el PDF de 150 KB con su base64.
**Datos:** `application/pdf` de 60 KB · `application/pdf` de 150 KB · limite de cuerpo `100kb` · limite del servicio `10 MB`

1. Emitir `POST /api/attachments` con el PDF de 60 KB.
2. Emitir `POST /api/attachments` con el PDF de 150 KB.
3. Anotar el status y el cuerpo de cada respuesta.
4. Medir en bytes el tamano exacto del cuerpo JSON de cada peticion.
5. Emitir una tercera subida con un cuerpo de 99 KB y una de 101 KB.
6. Consultar en la base de datos si se creo alguna fila con el paso 2 o el 5.

**Esperado**
- El PDF de 60 KB -> 201: su base64 cabe en el cuerpo y pasa el filtro.
- El PDF de 150 KB -> 413, con el error de cuerpo demasiado grande, y no 400.
- El corte se produce por el limite del cuerpo de la peticion, alrededor de los 100 KB de JSON: un
  cuerpo de 99 KB pasa y uno de 101 KB falla con 413.
- El mensaje `El archivo excede el tamaño máximo permitido (10MB)` del servicio no llega a verse nunca
  desde la API, porque el cuerpo se rechaza antes. Anotar en la seccion 6 que el limite de 10 MB es
  inalcanzable y que el limite efectivo ronda los 73 KB de archivo.
- Ninguna fila se crea en `attachments` para las peticiones rechazadas, y ningun archivo queda escrito en
  disco.

**Red:** los cinco status esperados, 201 / 413 / y 201 con 413 en el limite. Verificar que el 413 lo emite
la capa de analisis del cuerpo y no el controlador, comparando el cuerpo de la respuesta con el de un
400 de validacion.
**Limpieza:** eliminar con `DELETE` el adjunto del PDF de 60 KB y el del cuerpo de 99 KB si se crearon.

### [ADJ-003] Rechazar un tipo MIME fuera de la lista blanca

**Rol** `doctor` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; expediente clinico propio disponible.
**Datos:** `application/x-msdownload` · `text/html` · `application/zip` · `image/svg+xml`

1. Emitir `POST /api/attachments` con `mime_type: application/x-msdownload`.
2. Repetir con `text/html`, `application/zip` e `image/svg+xml`.
3. Emitir una quinta vez con `mime_type: IMAGE/JPEG` en mayusculas.
4. Emitir una sexta vez con `mime_type: image/jpeg; charset=binary`.
5. Anotar el status y el mensaje de cada respuesta.

**Esperado**
- Los cuatro tipos fuera de lista -> 400 con el mensaje `Tipo de archivo no permitido`.
- El tipo en mayusculas y el tipo con parametros tambien se rechazan con 400: la comparacion es exacta
  contra la lista, no normaliza mayusculas ni parametros.
- El mensaje no distingue "tipo no permitido" de "tipo vacio": los dos son 400 con el mismo texto.
- No se escribe ningun archivo en disco para los cuatro rechazos.
- Ningun `data_base64` se decodifica antes de validar el tipo, de modo que un base64 invalido con un tipo
  no permitido produce el error de tipo y no el de base64.

**Red:** los cuatro 400 con `Tipo de archivo no permitido`. Verificar que el mensaje va en el campo
`error` del cuerpo, con la misma forma que el resto de errores de la API.
**Limpieza:** ninguna (nada se creo).

### [ADJ-004] Rechazar un base64 vacio o mal formado

**Rol** `doctor` · **Ruta** `—` · **P2** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; expediente clinico propio disponible.
**Datos:** `data_base64: ""` · `data_base64: "no-es-base64!!"` · `data_base64: "QQ=="` (byte valido)

1. Emitir `POST /api/attachments` con `data_base64` vacio.
2. Emitir con `data_base64: no-es-base64!!`.
3. Emitir con `data_base64: QQ==`.
4. Emitir con `file_name` de 256 caracteres.
5. Emitir con una clave extra `patient_id` en el cuerpo.
6. Anotar el status de cada una.

**Esperado**
- El base64 vacio -> 400. La validacion de esquema lo rechaza antes de llegar al servicio.
- El base64 mal formado -> 201 si `Buffer.from` no lanza, porque el decodificador es tolerante: el archivo
  se guarda con el contenido parcial. Si devuelve 400 con `data_base64 inválido`, anotarlo; si devuelve
  201 con `size_bytes` menor de lo esperado, tambien, porque es la observacion relevante.
- `QQ==` -> 201 con `size_bytes: 1`: un archivo de un byte es valido.
- `file_name` de 256 caracteres -> 400 por el limite de 255 del esquema.
- La clave extra `patient_id` -> 400, porque el esquema es estricto y rechaza campos desconocidos.
- Ningun caso devuelve 500.

**Red:** los cinco status, y el cuerpo de error de los rechazos con el nombre del campo culpable.
**Limpieza:** eliminar los adjuntos creados en los pasos 3 y 4 si dieron 201.

### [ADJ-005] Listar los adjuntos de una entidad

**Rol** `doctor` · **Ruta** `/patient/:id/clinical-records` · **P2** · **Resultado** `______`
**Precondición:** el expediente clinico de ADJ-001 tiene al menos un adjunto; se conoce el total.
**Datos:** `entity_type=clinical_record` · `entity_id=<id>` · `entity_type=patient` · `entity_id=<id del paciente>`

1. Emitir `GET /api/attachments?entity_type=clinical_record&entity_id=<id>`.
2. Anotar el sobre devuelto y el numero de elementos.
3. Subir un segundo adjunto a la misma entidad y volver a listar.
4. Emitir la misma consulta con `entity_type=patient` y el `id` del paciente.
5. Emitir la consulta con `entity_type` ausente.

**Esperado**
- `GET /api/attachments` -> 200 con el sobre `{ data: [...] }`, no con una lista desnuda.
- Cada elemento incluye los campos del paso 1 de ADJ-001 y no incluye `stored_name` en la respuesta de
  la UI si el listado se muestra en pantalla: verificar si el campo viaja y anotarlo.
- Tras la segunda subida, el listado devuelve 2 elementos y conserva el orden de `created_at` ascendente.
- `entity_type=patient` devuelve los adjuntos asociados al paciente, que son un conjunto distinto del
  del expediente, no el mismo listado.
- Sin `entity_type` -> 400 por esquema: el parametro es obligatorio, no opcional.
- El listado nunca devuelve adjuntos de otro `entity_id` ni de otro tenant.

**Red:** los cuatro status, 200 / 200 / 200 / 400. Verificar en el cuerpo que los `entity_id` de todos los
elementos coinciden con el solicitado.
**Limpieza:** eliminar el segundo adjunto del paso 3.

### [ADJ-006] Descargar el adjunto y comprobar sus cabeceras

**Rol** `doctor` · **Ruta** `/patient/:id/clinical-records` · **P2** · **Resultado** `______`
**Precondición:** existe el adjunto de ADJ-001 con `id` y `stored_name` conocidos.
**Datos:** `id` del adjunto · `mime_type: application/pdf`

1. Emitir `GET /api/attachments/<id>/download` y abrir la respuesta en una pestana nueva.
2. Anotar el status y las cabeceras de respuesta.
3. Guardar el archivo descargado y comparar su hash con el del original.
4. Repetir la descarga con un adjunto de tipo `image/jpeg`.

**Esperado**
- `GET /api/attachments/:id/download` -> 200 con `Content-Type: application/pdf`, el `mime_type`
  almacenado y no el delContent-Type deducido de la extension.
- `Content-Disposition` es `inline`, con el nombre entrecomillado: el PDF se abre en el navegador y no se
  descarga como adjunto.
- El contenido recibido es identico al del archivo enviado originally: mismos bytes, mismo hash.
- Un adjunto de imagen se muestra como imagen en el navegador, no como descarga forzada.
- El `Content-Disposition` codifica el nombre en UTF-8, de modo que un nombre con acentos o espacios
  llega íntegro.

**Red:** las dos descargas -> 200. Verificar `Content-Type` y `Content-Disposition` en las cabeceras de
respuesta, no en el cuerpo.
**Limpieza:** cerrar la pestana de la vista previa.

### [ADJ-007] Descargar el adjunto de otro paciente

**Rol** `patient` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** el paciente A tiene un expediente con adjunto; el paciente B tiene el suyo con otro
adjunto. Los `id` de ambos adjuntos estan anotados.
**Datos:** `id` del adjunto de A · `id` del adjunto de B · sesion del paciente B

1. Iniciar sesion como el paciente B.
2. Emitir `GET /api/attachments/<id del adjunto de A>/download`.
3. Anotar el status y el mensaje.
4. Emitir `GET /api/attachments?entity_type=clinical_record&entity_id=<expediente de A>`.
5. Emitir `GET /api/attachments?entity_type=patient&entity_id=<users.id de A>`.
6. Verificar que el paciente A sigue viendo su propio adjunto.

**Esperado**
- La descarga del adjunto ajeno -> 403 con el mensaje `No tienes acceso a esta entidad`, no 404 ni 200.
- El listado de los adjuntos del expediente ajeno -> 403 con el mismo mensaje.
- El listado con `entity_type=patient` del `users.id` de A -> 403 con el mismo mensaje.
- El mensaje es idéntico en los tres casos, para no revelar si el recurso existe.
- El paciente A sigue descargando correctamente su propio adjunto: el rechazo no se coló en su sesion.

**Red:** los tres 403 con `No tienes acceso a esta entidad`. Verificar que ninguna respuesta incluye el
nombre del archivo, su `stored_name` ni su `mime_type`.
**Limpieza:** cerrar sesion y volver a entrar con el paciente A.

### [ADJ-008] Descargar o borrar un adjunto con id inexistente

**Rol** `admin` · **Ruta** `—` · **P2** · **Resultado** `______`
**Precondición:** sesion de `admin` de la clinica del adjunto.
**Datos:** `id: 999999` · `id: 0` · `id: -1` · `id: abc`

1. Emitir `GET /api/attachments/999999/download`.
2. Emitir `DELETE /api/attachments/999999`.
3. Emitir `GET /api/attachments/0/download`.
4. Emitir `GET /api/attachments/abc/download`.
5. Emitir `GET /api/attachments/-1/download`.
6. Anotar el status de cada una.

**Esperado**
- `999999` en descarga -> 404 con `Attachment not found`.
- `999999` en borrado -> 404 con `Attachment not found`.
- `0` y `-1` -> 400 por el esquema, que exige un entero positivo.
- `abc` -> 400 por el esquema: el parametro se convierte con `Number` y se rechaza antes de consultar.
- Ninguno de los cuatro devuelve 500, y ninguno filtra si existe un adjunto con ese id en otro tenant.
- El mensaje de 404 no distingue entre "no existe" y "existe en otra clinica".

**Red:** los cinco status, 404 / 404 / 400 / 400 / 400. Verificar que los cuerpos de 400 nombran el
parametro `id`.
**Limpieza:** ninguna (no se borro nada).

### [ADJ-009] Subir un adjunto a una entidad que no existe

**Rol** `doctor` · **Ruta** `—` · **P1** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; se conoce un `entity_id` que no existe en ninguna tabla de
entidades.
**Datos:** `entity_type: clinical_record` con `entity_id: 999999` · `entity_id: 0`

1. Emitir `POST /api/attachments` con `entity_type: clinical_record` y `entity_id: 999999`.
2. Emitir con `entity_type: lab_result` y un `entity_id` de laboratorio inexistente.
3. Emitir con `entity_type: prescription` y un `entity_id` de receta inexistente.
4. Emitir con `entity_id: 0`.
5. Anotar el status y el mensaje de cada respuesta.

**Esperado**
- Los tres `entity_id` inexistentes -> 404 con el mensaje `<entity_type> #<id> not found`, en ingles y con
  el tipo de entidad literal.
- `entity_id: 0` -> 400 con `Invalid entity_id`, antes de tocar la base de datos.
- Ninguno de los cuatro escribe un archivo en disco: la verificacion de existencia ocurre antes de la
  escritura.
- El mensaje de 404 nombra la entidad pedida pero no revela nada sobre la base de datos.

**Red:** los cuatro status, 404 / 404 / 404 / 400. Verificar que los cuerpos no filtran nombres de tabla
ni consultas SQL.
**Limpieza:** ninguna (nada se creo).

### [ADJ-010] Recorrer los seis tipos de entidad admitidos

**Rol** `doctor` · **Ruta** `—` · **P2** · **Resultado** `______`
**Precondición:** sesion de `doctor` activa; existen un expediente clinico, una receta, un resultado de
laboratorio, una cita y una entrada de historial medico propios de ese doctor, con sus `id`. Para
`patient` hace falta el `users.id` del propio doctor como paciente, que no aplica: ese tipo de entidad se
prueba con el rol `patient` en el paso 6.
**Datos:** `clinical_record` · `prescription` · `lab_result` · `booking` · `medical_history` · `patient` · `invoice` (no admitido)

1. Para cada uno de los cinco primeros tipos, emitir `POST /api/attachments` con su `entity_id` real.
2. Anotar el status de cada uno.
3. Emitir con `entity_type: invoice` y un `entity_id` real de factura.
4. Emitir con `entity_type: attachments` (el nombre de la propia tabla).
5. Emitir con `entity_type: CLINICAL_RECORD` en mayusculas.
6. Con rol `patient`, emitir con `entity_type: patient` y su propio `users.id`.
7. Comprobar la propiedad de `lab_result`: el servicio lo resuelve contra la tabla de solicitudes de
   laboratorio, no contra la de resultados.

**Esperado**
- Los cinco tipos admitidos -> 201 cada uno, con `entity_type` devuelto tal cual se envio, en minuscula.
- `invoice` -> 400 por esquema: no esta en el enum, aunque la tabla de adjuntos tenga la columna
  `entity_type` sin restriccion.
- `attachments` -> 400 por esquema.
- `CLINICAL_RECORD` en mayusculas -> 400 por esquema: el enum distingue mayusculas.
- Con rol `patient` y su propio `users.id` -> 201, y la propiedad se cumple porque el `users.id` coincide
  con el del paciente.
- El `lab_result` aceptado con un `id` de `lab_requests` demuestra que la resolucion de propiedad usa esa
  tabla; con un `id` que exista en otra tabla, el resultado es 404.

**Red:** los nueve status esperados, cinco 201 y cuatro 400. Verificar que los cinco 201 devuelven el
`entity_type` enviado.
**Limpieza:** eliminar los cinco adjuntos creados en el paso 1.

### [ADJ-011] Eliminar un adjunto propio y comprobar que el archivo desaparece ⚠️ DESTRUCTIVO

⚠️ DESTRUCTIVO

**Rol** `doctor` · **Ruta** `/patient/:id/clinical-records` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** `ALLOW_DESTRUCTIVE=true`; existe el adjunto de ADJ-001 y se ha guardado su `id`, su
`stored_name` y su ruta en disco.
**Datos:** `id` del adjunto · `stored_name` con 32 caracteres hexadecimales

1. Anotar la ruta completa del archivo en disco a partir de `stored_name` y del tenant.
2. Confirmar que el archivo existe.
3. Emitir `DELETE /api/attachments/<id>`.
4. Intentar `GET /api/attachments/<id>/download`.
5. Intentar `GET /api/attachments?entity_type=clinical_record&entity_id=<id del expediente>`.
6. Comprobar si el archivo sigue en disco.

**Esperado**
- `DELETE /api/attachments/:id` -> 200 con el mensaje `Attachment deleted`.
- La descarga posterior -> 404 `Attachment not found`.
- El listado de la entidad ya no incluye la fila.
- El archivo desaparece del disco. Si sigue presente, anotarlo: el borrado de la fila no arrastra al
  fichero y queda un huerfano.
- La base de datos ya no tiene la fila, coherente con la respuesta 404 del paso 4.

**Red:** los tres status, 200 / 404 / 200. Verificar que el listado del paso 5 devuelve `data: []` o los
demas adjuntos sin el borrado.
**Limpieza:** ⚠️ DESTRUCTIVO e irreversible: la fila y el archivo no se recuperan. Volver a subir el Requiere `ALLOW_DESTRUCTIVE=true`.
archivo de ADJ-001 para reponer el estado de partida.

### [ADJ-012] Comprobar quien puede borrar un adjunto ⚠️ DESTRUCTIVO

**Rol** `doctor`, `patient` · **Ruta** `—` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** existen dos adjuntos en un expediente propio: uno subido por el doctor de prueba y otro
subido por otro doctor del mismo tenant. El paciente del expediente tiene sesion.
**Datos:** adjunto A subido por el doctor 1 · adjunto B subido por el doctor 2

1. Con el rol `doctor` 1, intentar `DELETE` del adjunto B.
2. Con el rol `admin`, intentar `DELETE` del adjunto B.
3. Con el rol `patient` propietario del expediente, intentar `DELETE` del adjunto A.
4. Con el rol `patient` propietario, intentar `DELETE` de un adjunto subido por el mismo paciente.
5. Anotar el status de cada intento y el numero de filas tras cada uno.

**Esperado**
- El doctor 1 sobre el adjunto de otro doctor -> 403 `No tienes permiso para eliminar este archivo`, o 403
  `No tienes acceso a esta entidad` si falla antes el filtro de propiedad del medico. Anotar cual de los
  dos mensajes aparece.
- El `admin` sobre el mismo adjunto -> 200: los roles `admin` y `superadmin` borran cualquier adjunto
  del tenant, y tambien los `doctor` aunque no lo hayan subido.
- El paciente sobre un adjunto que no subio -> 403 `No tienes permiso para eliminar este archivo`.
- El paciente sobre un adjunto que el mismo subio -> 200: la comparacion es por `uploaded_by`.
- El borrado de un adjunto ajeno no borra su fila ni su archivo, comprobable en el paso 2.

**Red:** los cuatro status. Verificar que el 403 del paso 1 no borra nada y que el 200 del paso 2 si.
**Limpieza:** ⚠️ DESTRUCTIVO: el adjunto borrado en el paso 2 no se recupera. Volver a subirlo con el Requiere `ALLOW_DESTRUCTIVE=true`.
doctor 2.

### [ADJ-013] Exportar los datos propios y comprobar las nueve claves ⚠️ DESTRUCTIVO

**Rol** `patient` · **Ruta** `/patient/profile` · **P1** · **Resultado** `______`
> ⚠️ DESTRUCTIVO: no se ejecuta sin `ALLOW_DESTRUCTIVE=true`.
**Precondición:** el paciente de prueba tiene al menos una cita, un expediente clinico, una receta, una
entrada de historial, una solicitud de laboratorio, una factura con sus items y pagos, y un adjunto.
**Datos:** `GET /api/export/me` · `schema_version: 1.0` · `filename: patient-data-<users.id>.json`

1. Emitir `GET /api/export/me` con la sesion del paciente.
2. Anotar el status y las cabeceras de respuesta.
3. Enumerar las claves de primer nivel del objeto `data`.
4. Comprobar el valor de `schema_version`.
5. Contar los elementos de cada una de las listas anidadas.
6. Abrir la descarga y confirmar que el nombre del archivo corresponde al `id` del paciente.
7. Comparar el numero de adjuntos del paquete con los que tiene el paciente en la base de datos.

**Esperado**
- `GET /api/export/me` -> 200 con el cuerpo `{ data: { ... } }` y nueve claves de primer nivel:
  `schema_version`, `patient`, `bookings`, `clinical_records`, `prescriptions`, `medical_history`,
  `lab_requests`, `invoices` y `attachments`.
- `schema_version` es exactamente `1.0`.
- `Content-Disposition` es `attachment` con `filename="patient-data-<id>.json"`, a diferencia del
  `inline` de los adjuntos de ADJ-006.
- Las listas anidadas de `lab_requests` e `invoices` traen sus items agrupados dentro de cada elemento,
  no como listas planas aparte.
- El numero de elementos de cada lista coincide con el de la base de datos del paciente.
- `patient` incluye su perfil, y ningun campo sensible de otros usuarios.
- El JSON descargado es valido y se abre sin errores en un editor.

**Red:** `GET /api/export/me` -> 200. Verificar las nueve claves en el cuerpo y las cabeceras
`Content-Disposition` y `Content-Type`.
**Limpieza:** ⚠️ DESTRUCTIVO por privacidad: el archivo exportado contiene historia clinica completa. Requiere `ALLOW_DESTRUCTIVE=true`.
Borrarlo del disco y de la carpeta de descargas en cuanto termine el caso.

### [ADJ-014] Bloquear la exportación de los datos de otro paciente

**Rol** `patient`, `doctor` · **Ruta** `—` · **P0** · **Bloqueante** · **Resultado** `______`
**Precondición:** existen dos pacientes con historia clinica; sus `users.id` estan anotados; el rol
`patient` y el rol `doctor` tienen sesion.
**Datos:** `GET /api/export/patients/<users.id de A>` con sesion de B

1. Con la sesion del paciente B, emitir `GET /api/export/patients/<users.id de A>`.
2. Anotar el status y el mensaje.
3. Con la sesion del paciente B, emitir `GET /api/export/patients/<users.id de B>`.
4. Con la sesion de un doctor, emitir `GET /api/export/patients/<users.id de A>`.
5. Con la sesion de un doctor de otra clinica, emitir la misma peticion.
6. Emitir `GET /api/export/patients/999999`.

**Esperado**
- El paso 1 -> 403 con el mensaje `ACCESS_DENIED`, no 404 y no 200: el rol `patient` solo puede exportar
  su propio `id`.
- El paso 3 -> 200, con un paquete cuyo `patient` corresponde a B.
- El paso 4 -> 200 con la historia clinica de A, porque el rol `doctor` tiene alcance de lectura sobre
  los pacientes de su clinica.
- El paso 5 -> 200 con `data` vacio o sin filas de A: el filtro por tenant impide el acceso cruzado entre
  clinicas. Anotar si devuelve 200 con un paquete vacio en lugar de 403, porque no es lo mismo.
- El paso 6 -> 200 con listas vacias o 404, pero en ningún caso datos de otro paciente.
- Ninguna de las respuestas de 403 incluye datos clinicos, nombres ni identificadores del paciente
  objetivo.

**Red:** los cinco status. Verificar en el paso 5 que ninguna fila devuelta pertenece al tenant de A, y en
el paso 6 que el paquete no incluye historia clinica de ninguna persona.
**Limpieza:** ninguna (solo lectura).

## 5. Defectos conocidos a verificar primero

No aplica. Ningun hallazgo de `90-HALLAZGOS-CODIGO.md` afecta al modulo de adjuntos ni al de
exportacion. Los cuatro comportamientos sospechosos verificados en esta area (limite de cuerpo de 100 KB
frente al mensaje de 10 MB, `Content-Disposition: inline` en la descarga, borrado de adjuntos por
cualquier `doctor` y exportacion de un paciente completo por parte de cualquier `doctor`) se registran
como huecos en la seccion 6.

## 6. Huecos conocidos

- El limite efectivo de subida no es el que anuncia el servicio. La aplicacion fija el cuerpo de la
  peticion en `100kb`, de modo que un archivo de mas de unos 73 KB se rechaza con 413 antes de alcanzar la
  comprobacion `MAX_FILE_BYTES` de 10 MB, y el mensaje `El archivo excede el tamaño máximo permitido
  (10MB)` es inalcanzable desde la API. ADJ-002 mide el corte real. El catalogo no tiene un ID para esto.
- La descarga de un adjunto responde `Content-Disposition: inline`, no `attachment`. Un PDF se abre en el
  navegador en lugar de descargarse, y un tipo que el navegador interpreta como ejecutable podria
  ejecutarse en el origen de la aplicacion. El `Content-Type` siempre es el `mime_type` almacenado, lo que
  hace esto mas relevante. ADJ-006 lo mide.
- Cualquier `doctor` puede borrar un adjunto que no subio, porque la comprobacion de borrado solo exime a
  `admin` y `superadmin` y luego compara `uploaded_by`; la rama de `doctor` concede el permiso
  incondicionalmente. ADJ-012 lo mide.
- No hay cuota de almacenamiento por tenant ni limpieza de huerfanos: si el borrado de la fila se ejecuta
  y el `unlink` falla, el archivo queda en disco sin fila. Ningun caso del area comprueba el accumulation
  de archivos.
- El campo `stored_name` viaja en la respuesta de la subida y del listado. No es un secreto (es un nombre
  aleatorio dentro de un directorio de tenant), pero la UI no necesita recibirlo.
- La comparacion de `data_base64` usa el decodificador tolerante de Node, que no lanza ante caracteres
  invalidos. Un base64 corrupto puede producir un archivo truncado con 201 en lugar de 400. ADJ-004 lo
  mide.
- Los mensajes de error del servicio estan en ingles (`Attachment not found`, `Invalid entity_type`,
  `data_base64 is required`) mientras los del limite usan texto en espanol. No hay clave i18n para
  ninguno: son literales del backend.
- `GET /api/export/me` no tiene forma de filtrar por rango de fechas ni de excluir categorias. El paquete
  es siempre completo, lo que para un paciente con historia larga produce un archivo de tamaño
  indeterminado.
- La autorizacion de `GET /api/export/patients/:id` no comprueba que el rol `doctor` sea el tratante del
  paciente, solo que pertenezca al tenant. ADJ-014 mide el alcance, no la necesidad.

## 7. Resultado del area

| Metrica | Valor |
|---|---|
| Casos escritos | 14 |
| Casos requeridos | 14 |
| P0 | 3 (ADJ-002, ADJ-007, ADJ-014) |
| P1 | 6 |
| P2 | 5 |
| P3 | 0 |
| Casos destructivos | 3 (ADJ-011, ADJ-012, ADJ-013) |
| Casos que dependen de `21-` | 1 (ADJ-013) |
| Hallazgos en la seccion 5 | 0 |
| Huecos registrados | 9 |
| Ejecucion | `______` |

---

*Alcance: 14 casos de adjuntos y exportacion; las subidas, los borrados y el archivo exportado se
revierten o se eliminan en la limpieza de cada caso, y ADJ-011, ADJ-012 y ADJ-013 exigen
`ALLOW_DESTRUCTIVE=true`, el ultimo por tratarse de historia clinica en texto plano. 2026-10-01.*

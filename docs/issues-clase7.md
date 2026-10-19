# Hallazgos de la Clase 7 — para registrar en GitHub Issues

Un issue por bug. Cada bloque es autocontenido: se copia entero a GitHub Issues.
El título va en el campo de título y el resto en el cuerpo; la severidad se carga además como etiqueta.

---

## 1. [Tareas] La fecha de vencimiento se devuelve un día antes de la cargada

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-16 CA3: "La fecha que se devuelve es siempre la misma que se cargó, sin importar la zona horaria del cliente ni la del servidor".

**Pasos:** abrir el detalle de una tarea, cargar `2026-09-15` en Vencimiento y guardar.

**Esperado:** `2026-09-15`, en el detalle y en el tablero.
**Obtenido:** `2026-09-14`. En el tablero pasa lo mismo: `2026-11-20` se muestra como `2026-11-19`.

**Reproducibilidad:** 2 de 2 tests en cada corrida. En una máquina en UTC o en zona horaria positiva no ocurriría.

**Evidencia:** `test-results/us16-vencimiento-*/`. El PATCH devuelve `"dueDate": "2026-09-14"`.

**Test:** `e2e/tests/us16-vencimiento.spec.ts` › "la fecha que se guarda es la que se muestra (CA2 y CA3)" y "el vencimiento guardado se ve en el tablero".

**Sospecha:** se guarda `new Date('2026-09-15')`, medianoche UTC, y `formatDueDate` la lee con `getFullYear`/`getMonth`/`getDate`, que son hora local. En UTC-3 cae a las 21:00 del día anterior.

**Severidad:** alta · **Prioridad:** alta

---

## 2. [Tareas] Un ex-miembro sigue figurando como responsable de sus tareas

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-11 CA6: "Al quitar un miembro, las tareas que tenía asignadas quedan sin asignado".

**Pasos:** agregar un miembro, asignarle una tarea, quitarlo del proyecto (la API responde 204) y abrir el tablero.

**Esperado:** la tarjeta muestra "Sin asignar".
**Obtenido:** sigue mostrando el email de quien ya no pertenece al proyecto.

**Reproducibilidad:** 3 de 3.

**Evidencia:** `test-results/us14-asignar-*-US-11-CA6-*/`.

**Test:** `e2e/tests/us14-asignar.spec.ts` › "al quitar a un miembro, sus tareas quedan sin asignado (US-11 CA6)".

**Sospecha:** `removeMember` en `projects.service.ts` borra la membresía y no toca las tareas asignadas.

**Severidad:** alta · **Prioridad:** media

---

## 3. [Tareas] Agregar dos veces la misma etiqueta la duplica

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-15 CA3: "Una tarea no puede tener la misma etiqueta más de una vez; volver a agregarla devuelve HTTP 200 y no genera un duplicado".

**Pasos:** en el detalle de una tarea, agregar la etiqueta `bug` y volver a agregar `bug`.

**Esperado:** HTTP 200 y una sola etiqueta.
**Obtenido:** HTTP 201 y dos etiquetas `bug` idénticas.

**Reproducibilidad:** 2 de 2.

**Evidencia:** `test-results/us15-etiquetas-*-CA3-*/`.

**Test:** `e2e/tests/us15-etiquetas.spec.ts` › "agregar la misma etiqueta dos veces no la duplica (CA3)".

**Sospecha:** `addTag` inserta en `task_tags` sin verificar si el vínculo existe, y la tabla no tiene unicidad sobre `(taskId, tagId)`.

**Severidad:** media · **Prioridad:** media

---

## 4. [Tareas] Las etiquetas distinguen mayúsculas y no se normalizan

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-15 CA1 ("se guardan normalizadas a minúsculas") y CA2 ("'Bug', 'BUG' y 'bug' son la misma etiqueta").

**Pasos:** en el detalle de una tarea, agregar `bug` y después `BUG`.

**Esperado:** una sola etiqueta, llamada `bug`.
**Obtenido:** dos etiquetas, `bug` y `BUG`.

**Reproducibilidad:** 2 de 2.

**Evidencia:** `test-results/us15-etiquetas-*-mayusculas-*/`.

**Test:** `e2e/tests/us15-etiquetas.spec.ts` › "las etiquetas no distinguen mayusculas (CA1 y CA2)".

**Sospecha:** `addTag` hace `trim()` sin pasar a minúsculas, y `tag.findFirst({ where: { name } })` compara con la colación binaria de SQLite.

**Severidad:** media · **Prioridad:** baja

---

## 5. [Tareas] El estado inicial de una tarea se puede forzar desde la solicitud

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-05 CA3: "El estado inicial de toda tarea es siempre TODO, aunque la solicitud incluya otro estado".

**Pasos:** `POST /api/projects/{projectId}/tasks` con `{ "title": "No debe nacer terminada", "status": "DONE" }`.

**Esperado:** HTTP 201 y `status: "TODO"`.
**Obtenido:** HTTP 201 y `status: "DONE"`.

**Reproducibilidad:** 3 de 3.

**Evidencia:** salida de `npm test` en `server` (adjuntar la captura del test en rojo, quitandole el `.failing`).

**Test:** `server/tests/task-lifecycle-findings.test.ts` › "US-05 CA3: ignora el estado enviado al crear una tarea".

**Sospecha:** `createTask` hace spread del cuerpo entero (`...body`) dentro del `db.task.create`, así que cualquier campo del cliente llega a la base.

**Severidad:** alta · **Prioridad:** alta

---

## 6. [Tareas] Un usuario ajeno al proyecto puede editar una tarea

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-12 CA5: "Solo los miembros del proyecto al que pertenece la tarea pueden editarla (HTTP 403)".

**Pasos:** autenticado con un usuario que no es miembro, `PATCH /api/tasks/{taskId}` con un título nuevo.

**Esperado:** HTTP 403 y el título original intacto.
**Obtenido:** HTTP 200 y el título queda modificado.

**Reproducibilidad:** 3 de 3.

**Evidencia:** salida de `npm test` en `server` (adjuntar la captura del test en rojo, quitandole el `.failing`).

**Test:** `server/tests/task-lifecycle-findings.test.ts` › "US-12 CA5: impide que un usuario ajeno edite una tarea".

**Sospecha:** en `tasks.routes.ts`, `PATCH /:taskId` y `DELETE /:taskId` son las únicas rutas sin `requireTaskProjectMember`.

**Severidad:** crítica · **Prioridad:** alta

---

## 7. [Tareas] Un usuario ajeno al proyecto puede eliminar una tarea

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-13 CA1: "Solo los miembros del proyecto al que pertenece la tarea pueden eliminarla (HTTP 403)".

**Pasos:** autenticado con un usuario que no es miembro, `DELETE /api/tasks/{taskId}`.

**Esperado:** HTTP 403 y la tarea sigue existiendo.
**Obtenido:** HTTP 204, y el `GET` posterior da 404. Se borran también sus comentarios, su historial y sus etiquetas.

**Reproducibilidad:** 3 de 3.

**Evidencia:** salida de `npm test` en `server` (adjuntar la captura del test en rojo, quitandole el `.failing`).

**Test:** `server/tests/task-lifecycle-findings.test.ts` › "US-13 CA1: impide que un usuario ajeno elimine una tarea".

**Sospecha:** la misma ruta sin middleware del issue anterior. Acá la pérdida de datos es irreversible.

**Severidad:** crítica · **Prioridad:** alta

---

## 8. [Auth] El token de reseteo no se valida: se puede reutilizar y nunca expira

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-17 CA3 ("se genera un token de un solo uso"), CA4 ("expira a los 60 minutos de generado") y CA5 ("Un token vencido, inexistente o ya utilizado devuelve HTTP 400").

**Pasos:**
1. Pedir un token con `POST /api/auth/forgot-password`.
2. Usarlo en `POST /api/auth/reset-password`.
3. Volver a usar el mismo token con otra contraseña.
4. Aparte: adelantar `expiresAt` en la base y volver a usarlo.

**Esperado:** HTTP 400 en los dos casos.
**Obtenido:** HTTP 200 en los dos: la contraseña cambia con un token ya usado y con uno vencido.

**Reproducibilidad:** 3 de 3.

**Evidencia:** salida de `npm test` en `server` (adjuntar la captura del test en rojo, quitandole el `.failing`).

**Tests:** `server/tests/auth-recovery.test.ts` › "US-17 CA5: un token ya utilizado no se puede reutilizar" y "US-17 CA4: un token vencido no sirve".

**Sospecha:** `resetPassword` busca el token y actualiza la contraseña sin leer `usedAt` ni comparar `expiresAt`, y tampoco marca el token como usado.

**Impacto:** un token filtrado sirve para siempre y las veces que haga falta.

**Severidad:** alta · **Prioridad:** alta

---

## 9. [Auth] La recuperación de contraseña revela qué emails están registrados

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-17 CA2: "La respuesta es idéntica exista o no un usuario con ese email (HTTP 200 y el mismo mensaje genérico), para no revelar qué direcciones están registradas".

**Pasos:** `POST /api/auth/forgot-password` con un email registrado, y después con uno que no existe.

**Esperado:** las dos respuestas iguales, HTTP 200 con el mismo mensaje.
**Obtenido:** la del email inexistente devuelve HTTP 404 con `"No account found for that email"`.

**Reproducibilidad:** 3 de 3.

**Evidencia:** salida de `npm test` en `server` (adjuntar la captura del test en rojo, quitandole el `.failing`).

**Test:** `server/tests/auth-recovery.test.ts` › "US-17 CA2: no revela si el email esta registrado".

**Impacto:** permite enumerar las cuentas del sistema probando direcciones.

**Severidad:** media · **Prioridad:** media

---

## 10. [Auth] Se aceptan contraseñas de 7 caracteres

**Entorno:** Windows 11 · Node 20 · Chromium (Playwright 1.63) · zona horaria America/Montevideo (UTC-3) · commit `e4e4ee5` · base reseteada con `npm run db:reset`

**Criterio violado:** US-01 CA3: "La contraseña debe tener mínimo 8 caracteres, al menos 1 número y 1 mayúscula".

**Pasos:** `POST /api/auth/register` con `password: "Abcde19"` (7 caracteres, con número y mayúscula).

**Esperado:** HTTP 400.
**Obtenido:** HTTP 201, la cuenta se crea.

**Reproducibilidad:** 3 de 3.

**Evidencia:** salida de `npm test` en `server` (adjuntar la captura del test en rojo, quitandole el `.failing`).

**Test:** `server/tests/auth-recovery.test.ts` › "US-01 CA3: rechaza una contrasena de 7 caracteres".

**Sospecha:** `assertPassword` en `lib/validation.ts` valida `length >= 7` mientras su mensaje de error dice "at least 8 characters". La misma función valida el registro y el reseteo, así que afecta a US-01 CA3 y a US-17 CA7.

**Severidad:** media · **Prioridad:** media

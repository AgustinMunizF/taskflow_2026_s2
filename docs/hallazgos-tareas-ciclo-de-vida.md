# Informe de pruebas exploratorias: ciclo de vida de tareas

## Alcance

Se exploraron tres endpoints del módulo **Tareas - ciclo de vida**:

| Método | Endpoint | Aspecto explorado |
| --- | --- | --- |
| `POST` | `/api/projects/:projectId/tasks` | Estado inicial ante un valor enviado por el cliente |
| `PATCH` | `/api/tasks/:taskId` | Edición por un usuario autenticado sin acceso al proyecto |
| `DELETE` | `/api/tasks/:taskId` | Eliminación por un usuario autenticado sin acceso al proyecto |

La fuente de verdad utilizada fue `taskflow_especificacion_requerimientos.docx`, versión 1.0.

## Preparación en Postman

1. Ejecutar la API en `http://localhost:3000`.
2. Registrar dos usuarios mediante `POST /api/auth/register` y guardar los tokens como variables `ownerToken` y `outsiderToken`.
3. Crear un proyecto con `ownerToken` mediante `POST /api/projects` y guardar su `id` como `projectId`.
4. No agregar al segundo usuario como miembro del proyecto.

En las solicitudes autenticadas se usa la cabecera:

```text
Authorization: Bearer {{ownerToken}}
```

o `{{outsiderToken}}`, según el caso.

## TF-TASK-001: se puede forzar el estado inicial

**Endpoint:** `POST /api/projects/{{projectId}}/tasks`

**Criterio de la especificación:** US-05, criterio de aceptación 3. Toda tarea debe crearse en estado `TODO`, aunque la solicitud incluya otro estado.

**Pasos para reproducir:**

1. Enviar la solicitud con `ownerToken`.
2. Usar este cuerpo:

```json
{
  "title": "No debe nacer terminada",
  "status": "DONE"
}
```

**Resultado esperado:** HTTP `201` y `status: "TODO"` en la tarea creada.

**Resultado obtenido:** HTTP `201` y `status: "DONE"`.

**Impacto:** un cliente puede omitir por completo el flujo de estados y crear trabajo ya terminado.

**Test automatizado:** `US-05 CA3: ignora el estado enviado al crear una tarea`.

## TF-TASK-002: un usuario ajeno puede editar una tarea

**Endpoint:** `PATCH /api/tasks/{{taskId}}`

**Criterio de la especificación:** US-12, criterio de aceptación 5. Solo los miembros del proyecto pueden editar sus tareas; un usuario ajeno debe recibir HTTP `403` y la tarea debe conservar sus datos.

**Pasos para reproducir:**

1. Crear una tarea con `ownerToken` y guardar su `id` como `taskId`.
2. Enviar la siguiente solicitud con `outsiderToken`:

```json
{
  "title": "Titulo alterado por un usuario ajeno"
}
```

3. Consultar `GET /api/tasks/{{taskId}}` con `ownerToken`.

**Resultado esperado:** el `PATCH` devuelve HTTP `403` y el título original no cambia.

**Resultado obtenido:** el `PATCH` devuelve HTTP `200` y el nuevo título queda persistido.

**Impacto:** cualquier usuario autenticado que conozca un identificador de tarea puede modificar sus datos.

**Test automatizado:** `US-12 CA5: impide que un usuario ajeno edite una tarea`.

## TF-TASK-003: un usuario ajeno puede eliminar una tarea

**Endpoint:** `DELETE /api/tasks/{{taskId}}`

**Criterio de la especificación:** US-13, criterio de aceptación 1. Solo los miembros del proyecto pueden eliminar tareas; un usuario ajeno debe recibir HTTP `403` y la tarea debe seguir existiendo.

**Pasos para reproducir:**

1. Crear otra tarea con `ownerToken` y guardar su `id` como `taskId`.
2. Enviar `DELETE /api/tasks/{{taskId}}` con `outsiderToken`.
3. Consultar `GET /api/tasks/{{taskId}}` con `ownerToken`.

**Resultado esperado:** el `DELETE` devuelve HTTP `403` y el `GET` posterior devuelve HTTP `200`.

**Resultado obtenido:** el `DELETE` devuelve HTTP `204` y el `GET` posterior devuelve HTTP `404`.

**Impacto:** cualquier usuario autenticado que conozca un identificador de tarea puede borrar definitivamente la tarea y sus datos asociados.

**Test automatizado:** `US-13 CA1: impide que un usuario ajeno elimine una tarea`.

## Ejecución de los tests

Desde la raíz del proyecto:

```bash
nvm use 20
npm --prefix server test -- --runTestsByPath tests/task-lifecycle-findings.test.ts
```

Los tres tests deben quedar en rojo mientras los defectos existan. El diff de Jest muestra en cada caso el valor esperado por la especificación y el comportamiento obtenido de la API.

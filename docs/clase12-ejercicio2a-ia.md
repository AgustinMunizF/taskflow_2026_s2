# Ejercicio 2a — De la historia a los tests con IA

**Historia:** US-16, fecha de vencimiento de tarea (8 criterios).
**Herramienta:** Claude (Anthropic), mediante un agente que recibió únicamente el prompt, sin acceso
al repositorio ni a herramientas.
**Tests generados:** `server/tests/us16-ia.test.ts`, guardados tal como los devolvió la IA.

## Prompt utilizado

```text
ROL
Sos un ingeniero de QA que diseña tests de integración para una API REST.

CONTEXTO
TaskFlow es un gestor de tareas. Backend en Express + Prisma + SQLite, tests con
Jest + Supertest. Las rutas llevan el prefijo /api y requieren un JWT en la cabecera
Authorization. Los ids son legibles y prefijados: 'user-1', 'proj-1', 'task-1'.

Ya existen estos helpers en server/tests/helpers.ts:

  import { app, auth, createProject, createTask, registerUser } from './helpers';

  registerUser(email: string, password = 'Password1')
    -> Promise<{ token: string; id: string; res }>
  createProject(token: string, name: string)      -> Promise<proyecto>   (proyecto.id = 'proj-N')
  createTask(token, projectId, body)              -> Promise<tarea>      (tarea.id = 'task-N')
  auth(token: string)                             -> { Authorization: 'Bearer ...' }

Quien crea un proyecto queda como miembro. Un usuario recién registrado que no fue
agregado al proyecto NO es miembro.

Endpoints que existen y tocan la fecha de vencimiento:
  POST  /api/projects/:projectId/tasks   body: { title, priority?, dueDate? }   -> 201 + tarea
  PATCH /api/tasks/:taskId               body: { dueDate }                      -> 200 + tarea
  GET   /api/tasks/:taskId                                                      -> 200 + tarea
La tarea devuelta incluye el campo dueDate.

INSTRUCCIÓN
Escribí los casos de prueba de la historia US-16, uno por criterio de aceptación.

DATOS DE ENTRADA
US-16 · Fecha de vencimiento de tarea
Como miembro del proyecto quiero asignar una fecha de vencimiento a una tarea para
poder priorizar el trabajo según urgencia.

Criterios de aceptación:
1. La fecha de vencimiento es un día calendario, sin hora.
2. Se envía y se devuelve en formato ISO 8601 de fecha, por ejemplo '2026-09-15'.
3. La fecha que se devuelve es siempre la misma que se cargó, sin importar la zona
   horaria del cliente ni la del servidor.
4. La fecha de vencimiento es opcional: una tarea puede no tener vencimiento.
5. Se puede quitar la fecha de vencimiento enviando el campo en nulo.
6. Una fecha con formato inválido devuelve HTTP 400.
7. Se admite cargar una fecha pasada; el sistema no la rechaza y la tarea se considera
   vencida.
8. Solo los miembros del proyecto pueden modificar la fecha de vencimiento (HTTP 403).

RESTRICCIONES
- Usá solo los endpoints y helpers listados. No inventes rutas ni parámetros.
- No inventes criterios ni reglas que no estén en la historia.
- Cada test verifica lo que ve el cliente: código de estado y cuerpo de la respuesta.

FORMATO DE SALIDA
Un único archivo TypeScript listo para guardar como server/tests/us16-ia.test.ts,
con un describe('US-16') y un it() por criterio, nombrado con el número de criterio.
Solo el código, sin explicaciones.
```

## Resultado

`npm run test:coverage`: de los 8 tests generados, **2 verdes y 6 rojos**.

| Test | Resultado | Clasificación         | Dónde falla y por qué                                                                    |
| ---- | --------- | --------------------- | ---------------------------------------------------------------------------------------- |
| CA1  | Rojo      | Rojo por bug real     | Espera `2026-09-15`, recibe `2026-09-14`. Es el bug de zona horaria de CA3, no de CA1    |
| CA2  | Rojo      | Rojo por bug real     | Mismo corrimiento de un día al crear la tarea                                             |
| CA3  | Rojo      | Rojo por bug real     | `2026-01-01` vuelve como `2025-12-31`. Ver la observación sobre zonas horarias            |
| CA4  | Verde     | Verde y correcto      | Una tarea creada sin fecha devuelve `dueDate: null`                                       |
| CA5  | Verde     | Verde y correcto      | Enviar `dueDate: null` quita la fecha y se persiste                                       |
| CA6  | Rojo      | Rojo por bug real     | Los 7 formatos inválidos dan 400: el criterio se cumple. Cae al releer la fecha original  |
| CA7  | Rojo      | Rojo por bug real     | La fecha pasada se acepta con 201, pero vuelve un día antes                               |
| CA8  | Rojo      | Rojo por bug real     | Un usuario ajeno al proyecto modifica la fecha: recibe 200 en lugar de 403                |

| Categoría                   | Tests |
| --------------------------- | ----- |
| Verde y correcto            | 2     |
| Verde pero no prueba nada   | 0     |
| Rojo por bug real           | 6     |
| Rojo por test mal escrito   | 0     |
| Alucinado                   | 0     |

**Los 6 rojos corresponden a solo 2 defectos, y los dos ya estaban documentados:**

- **Zona horaria** (issue 1 de la clase 7): la fecha se guarda como medianoche UTC y se devuelve
  leída en hora local; en UTC-3 vuelve un día antes. Rompe CA1, CA2, CA3, CA6 y CA7, porque los cinco
  comparan el valor de la fecha devuelta.
- **Control de acceso** (SEC-01 del reporte de seguridad): `PATCH /api/tasks/:taskId` no verifica la
  membresía. Rompe CA8.

## Observaciones sobre los tests de la IA

- **No alucinó.** Usó solo los endpoints y helpers del prompt y no inventó reglas.
- **CA3 no prueba lo que dice.** Cambia `process.env.TZ` entre pedidos para simular zonas horarias
  distintas, pero el cambio no llega al servidor: en la primera vuelta, con UTC+14, donde el bug no
  debería notarse, la fecha igual volvió corrida. El test detecta el defecto solo porque la máquina
  está en UTC-3; en una máquina en UTC pasaría en verde.
- **Los tests no aíslan su criterio.** CA6 y CA7 verifican bien su regla, pero también comparan el
  valor exacto de la fecha, así que el bug de CA3 los pone en rojo. Un rojo en CA6 sugiere que la
  validación de formato falla, cuando en realidad funciona.
- **CA7 cubre la mitad del criterio.** Verifica que la fecha pasada se acepta, pero no que la tarea
  "se considere vencida". La propia IA lo aclara en un comentario: la historia no dice cómo se expone.

## Cobertura

| Métrica    | Antes   | Después | Diferencia |
| ---------- | ------- | ------- | ---------- |
| Líneas     | 88,05 % | 89,58 % | +1,53      |
| Ramas      | 61,50 % | 63,27 % | +1,77      |
| Sentencias | 84,12 % | 85,65 % | +1,53      |

La mayor parte de la suba está en `ids.ts` (ramas de 34,78 % a 43,47 %), que es donde se parsea la
fecha, y en `tasks.service.ts` (ramas de 67,3 % a 71,15 %).

## Conclusión

La IA cubrió los 8 criterios sin alucinar, y sus tests encontraron los dos defectos reales de la
historia. Pero la cantidad de rojos exagera el problema: 6 tests rojos son 2 bugs, porque los tests
mezclan su criterio con la verificación del valor de la fecha. Y el test diseñado específicamente para
la zona horaria no hace lo que promete.

Los tests en rojo no se corrigieron, como pide la consigna.

---

# Ejercicio 2b · Revisión encadenada

**Archivo:** `server/tests/us16-ia-revision.test.ts` (10 tests, sin modificar)

## Prompt de revisión

Se le pasó a la misma IA, en la misma conversación, este segundo prompt:

> Revisá estos tests contra los criterios y marcá lo que falta: casos borde, entradas inválidas,
> criterios que quedaron sin cubrir o cubiertos a medias. Devolvé una lista breve de lo que falta y un
> único archivo `server/tests/us16-ia-revision.test.ts` con un `describe('US-16 · revisión')`.
> No repitas los tests que ya escribiste.

## Lo que la IA marcó como faltante

- **CA1:** no define qué pasa si se manda una fecha con hora. No inventó la regla.
- **CA3:** el test puede pasar sin probar nada si cambiar `process.env.TZ` no tiene efecto. Faltaban
  fechas de cambio de horario de verano y el 29 de febrero, y crear y leer en zonas distintas.
- **CA4:** faltaba mandar `dueDate: null` explícito al crear.
- **CA5:** faltaba quitar la fecha de una tarea que no tenía, y volver a asignarla después de quitarla.
- **CA6:** faltaban fechas con buen formato pero inexistentes (`2026-02-30`) y valores que no son texto.
- **CA7:** "se considera vencida" no se puede verificar: ningún endpoint lo expone. No inventó la regla.
- **CA8:** faltaba que un no miembro intente cargar la fecha al crear la tarea.

## Resultado

| Test                                         | Resultado | Categoría           | Motivo                                                     |
| -------------------------------------------- | --------- | ------------------- | ---------------------------------------------------------- |
| CA3 · precondición de zona horaria           | Rojo      | Test mal escrito \* | Los 3 offsets dieron igual: cambiar `TZ` no tiene efecto   |
| CA3 · horario de verano y 29 de febrero      | Rojo      | Bug real            | Zona horaria: `2026-03-08` vuelve `2026-03-07`             |
| CA3 · crear, modificar y leer en otras zonas | Rojo      | Bug real            | Zona horaria: `2026-01-01` vuelve `2025-12-31`             |
| CA4 · crear con `dueDate: null`              | Verde     | Verde y correcto    |                                                            |
| CA5 · quitar fecha a tarea sin fecha         | Verde     | Verde y correcto    |                                                            |
| CA5 · quitar y volver a asignar              | Rojo      | Bug real            | Zona horaria: `2026-11-20` vuelve `2026-11-19`             |
| CA6 · fechas inexistentes                    | Rojo      | Bug real (nuevo)    | `2026-09-31` se acepta con 201                             |
| CA6 · valores que no son texto               | Rojo      | Bug real            | Los 5 dieron 400; falla al releer la fecha por zona horaria |
| CA8 · no miembro crea tarea con fecha        | Verde     | Verde y correcto    |                                                            |
| CA8 · el 403 no devuelve la tarea            | Rojo      | Bug real            | SEC-01: el PATCH de un no miembro da 200                   |

\* El test no tiene un error: hace bien su trabajo, que es avisar que la técnica de CA3 no funciona en
este entorno. Se clasifica así porque el rojo no viene de la app.

| Categoría                   | 2a  | 2b  |
| --------------------------- | --- | --- |
| Verde y correcto            | 2   | 3   |
| Verde pero no prueba nada   | 0   | 0   |
| Rojo por bug real           | 6   | 6   |
| Rojo por test mal escrito   | 0   | 1   |
| Alucinado                   | 0   | 0   |

## Defecto nuevo

**Se aceptan fechas que no existen.** `parseDueDate` (`server/src/lib/ids.ts`) valida el formato con una
regex y después usa `new Date(value)`, que no rechaza días fuera de rango sino que los corre al mes
siguiente: `2026-09-31` se guarda como `2026-10-01` y `2026-02-30` como `2026-03-02`. Los meses o días
imposibles (`2026-13-01`, `2026-09-00`) sí dan 400. Viola CA6. Este defecto no aparecía en el 2a ni
en los issues de la clase 7.

## Cobertura

| Métrica    | Después del 2a | Después del 2b | Diferencia |
| ---------- | -------------- | -------------- | ---------- |
| Líneas     | 89,58 %        | 89,58 %        | 0          |
| Ramas      | 63,27 %        | 64,15 %        | +0,88      |
| Sentencias | 85,65 %        | 85,79 %        | +0,14      |

## ¿Mejoró?

Sí, aunque la cobertura casi no se movió. La revisión encontró un defecto que el 2a no había visto
(fechas inexistentes), cubrió dos criterios que habían quedado a medias (CA4 con `null` y CA8 al
crear) y demostró con un test lo que en el 2a era solo una sospecha: cambiar `process.env.TZ` no simula
otra zona horaria, así que la parte de zonas de CA3 no prueba nada en ninguna de las dos versiones.

Lo que no mejoró: los tests siguen sin aislar su criterio. CA5 y CA6 vuelven a salir en rojo por el
bug de zona horaria y no por su propia regla. Y CA7 sigue cubierto a medias, aunque esta vez la IA lo
dijo explícitamente en lugar de inventar cómo se expone una tarea vencida.

La cobertura no sube porque los tests nuevos pasan por las mismas líneas que los del 2a: miden más
casos, no más código.


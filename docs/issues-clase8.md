# Performance con k6 — Clase 8

## Resultados de la prueba de carga

Medido el 3/11/2026 · Windows 11 · Node 20 · API y SQLite en la misma máquina ·
`GET /api/projects/:projectId/tasks` · script `performance/scenarios/api-load.k6.js`.

| Métrica                        | Seed chica, 1 VU, 30s | Seed grande, 1 VU, 30s | Seed grande, 20 VU, 1m |
| ------------------------------ | --------------------- | ---------------------- | ---------------------- |
| p95 (`http_req_duration`)      | 15,00 ms              | 19,25 ms               | 62,68 ms               |
| Error rate (`http_req_failed`) | 0,00 %                | 0,00 %                 | 0,00 %                 |
| Iteraciones por segundo        | 0,98                  | 0,98                   | 19,41                  |

La columna del medio no la pide la consigna: sirve para separar el efecto de los datos
del efecto de la concurrencia. Las iteraciones por segundo con 1 usuario no miden
capacidad, están topeadas por el `sleep(1)` del script.

**Hipótesis.** Multiplicar los datos por 400 sumó 4 ms al p95; pasar de 1 a 20 usuarios
sumó 43 ms. Con los datos crecen solo el `COUNT` del total y el tamaño de la respuesta,
porque el listado pagina de a 20 y usa tres consultas fijas. El resto es contención
entre pedidos concurrentes sobre un único archivo SQLite.

**Criterio de los 500 ms (RNF Rendimiento 2): se cumple**, con 62,68 ms y 0 % de errores.
El issue de abajo es por el criterio 1 del mismo apartado.

---

## [Proyectos] `GET /api/projects` devuelve los 200 proyectos juntos, sin paginar

**Criterio violado.** Requerimientos no funcionales, Rendimiento, criterio 1:
"Todo endpoint de listado devuelve resultados paginados; ningún endpoint devuelve una
colección completa sin límite".

**Entorno.** Windows 11 · Node 20 · API y base SQLite en la misma máquina · k6 1.4.2 ·
base cargada con `npm --prefix server run db:seed:large`, que deja 200 proyectos,
5.000 tareas y 20.000 comentarios · rama `K6`.

**Qué pasa, en una línea.** Pedir la lista de proyectos trae los 200 de una sola vez. No
hay forma de pedir "los primeros 20": el endpoint no acepta ningún parámetro para
acotar la respuesta.

**Pasos para reproducirlo.**

1. Cargar la base de prueba: `npm --prefix server run db:seed:large`.
2. Entrar como `ana@test.com`, que es dueña de esos 200 proyectos.
3. Pedir `GET /api/projects`. Vuelven los 200 en una lista.
4. Intentar acotarla: `GET /api/projects?limit=20&offset=0`. La respuesta es exactamente
   la misma, con los 200 adentro.

**Resultado esperado.** Que devuelva una página de resultados, como ya hace el listado de
tareas, que responde `{ items, total, limit, offset }` y trae 20 por vez.

**Resultado obtenido.** Una lista plana con los 200 proyectos. Los parámetros `limit` y
`offset` se ignoran por completo.

**Reproducibilidad.** 3 de 3 intentos.

**Evidencia.** Corrida de `performance/scenarios/projects-list.k6.js` el 4/11/2026:

```
✓ status 200
✗ la respuesta viene paginada
  ↳  0% — ✓ 0 / ✗ 20

data_received: 838 kB en 21 pedidos  (~42 KB por respuesta)
```

Cada respuesta pesa unos 42 KB. El listado de tareas, que sí pagina, devuelve unos 8 KB
y ese número no cambia aunque el proyecto tenga 5.000 tareas.

**Por qué pasa.** `projects.service.list()` le pide al repositorio todos los proyectos del
usuario y los devuelve tal cual. La consulta no tiene `take` ni `skip`, y el controlador
no lee ningún parámetro de la URL.

**Por qué importa.** El costo de este endpoint no tiene techo: crece junto con la
cantidad de proyectos del usuario, sin límite. Con 200 todavía responde en 22 ms, pero
alguien con años de uso acumulado va a esperar cada vez más y el navegador va a recibir
una respuesta cada vez más pesada.

Se agrava porque el cliente lo llama todo el tiempo: para mostrar **un** proyecto,
`useProject` pide la lista entera y después busca el que necesita. O sea que la respuesta
de 42 KB viaja en cada navegación.

**Severidad:** media · **Prioridad:** media

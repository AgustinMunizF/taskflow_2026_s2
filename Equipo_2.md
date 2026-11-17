# Equipo 2 — Calificaciones por equipo, Testing y Calidad de Software 2026

**Repo:** https://github.com/AgustinMunizF/taskflow_2026_s2

Este archivo tiene solo las tareas calificadas por equipo. Las notas individuales (cuestionario de la clase 1, cuestionarios de Moodle y participación) se llevan aparte.

_Escala de las notas: 0-100._

## Tareas por equipo

| Tarea | Clase | Peso | Puntos del curso (máx., de 100) | Nota | Aporta a la final (puntos) | Observaciones |
|---|---|---|---|---|---|---|
| Taller de refinamiento | 2 | 5,3 | 2,65 | pendiente |  | Pendiente de entrega: no figura en el repo (se buscó en `docs/`, el README y las 13 ramas). |
| Integration + cobertura + refactor (código pestilente + Ej. 1 de clase 7) | 3 y 7 | 10,6 | 5,30 | 91 | 4,82 | Refactors con PRs chicos y tests agregados, y cobertura de 89,7 % de líneas y 63,8 % de ramas con umbral en Jest (verificado). Falta documentar qué smells detectaron y tests de caracterización previos para `updateTask` y `assertEmail`. |
| Postman + Supertest, caza de bugs | 5 | 5,3 | 2,65 | 76 | 2,01 | Suite Supertest amplia (82 de 86 pasan; los 4 rojos son bugs de US-16 contra la spec). Los reportes de `hallazgos-tareas-ciclo-de-vida.md` no tienen entorno, reproducibilidad, evidencia ni severidad. Postman no se cuenta. |
| ADR | 6 | 5,3 | 2,65 | 53 | 1,40 | ADR bien razonado (alternativas y costos), pero describe un framework que el repo no tiene: no existe `e2e/components/` (Component Object) ni `api/`, `config/` ni `test-data/`, y dice `fullyParallel: true` cuando la config usa `false`. |
| E2E + bugs | 7 y 8 | 10,6 | 5,30 | 80 | 4,24 | 25 tests E2E pasan (verificado), con 4 o más casos en cada una de US-12, 14, 15 y 16. Los 10 bugs están completos en `docs/issues-clase7.md` pero no son GitHub issues (el repo tiene 0). |
| Performance (k6: tabla seed chica vs grande + issue) | 9 | 5,3 | 2,65 | 80 | 2,12 | Tabla seed chica vs. grande, hipótesis y reporte del issue de paginación sólidos; reproduje que `GET /api/projects` ignora `limit` y `offset`. El issue está en `docs/issues-clase8.md`, no abierto en GitHub. |
| Seguridad + accesibilidad (ZAP, axe-core, CVSS) | 11 | 5,3 | 2,65 | 66 | 1,75 | Buenos hallazgos manuales, axe-core con fix verificado y user stories de remediación para SEC-01 y ACC-01. No usaron OWASP ZAP y falta el puntaje CVSS. |
| Pipeline (`ci.yml` y job de E2E) | 12 | 10,6 | 5,30 | 100 | 5,30 | `ci.yml` con 5 jobs independientes y cache de npm, más job de E2E; hay 24 runs reales en Actions. Lint y builds verificados en local. Los tests y la cobertura rojos en CI son por los bugs conocidos de US-16 y no se penalizan. |
| Presentación (por definir) | 16 | 15,9 | 7,95 | pendiente |  | Pendiente: todavía no la hicieron. |
| Informe de una página | 12 | 12,8 | 6,40 | 90 | 5,76 | Informe claro con tabla de métricas y recomendación explícita de no liberar; los números coinciden con el repo. Pasa de una página (801 palabras, 4 tablas) y la versión nueva está en la rama `actualizar-informe`, sin mergear. |
| **Total por equipo** | | **87,0** (65,8 ya calificados) | **43,50** | 83 (promedio ponderado de lo calificado) | **27,40** | Faltan por entregar: Taller de refinamiento y Presentación. |
| Tareas individuales (Moodle 6, participación 5, cuestionario clase 1 2; pesos provisorios) | | 13 | 6,50 | | pendiente | Se llevan aparte, ver `Calificacion_final.md`. |
| **Proyecto final corregido** | | | **50,00** | pendiente | pendiente | Vale el 50 % de la nota final. Se califica después de que arreglen lo señalado en las tareas. |
| **Total del curso** | | | **100,00** | | **27,40** de 100 (hasta ahora; faltan individuales y proyecto final) | 43,50 (equipo) + 6,50 (individuales) + 50,00 (proyecto) |

_Los 13 de peso restantes de las tareas (6,5 puntos del curso: Moodle 6, participación 5, cuestionario clase 1 2) son individuales. Pesos provisorios, pendientes de confirmar._

## Proyecto corregido

| Concepto | Nota | Observaciones |
|---|---|---|
| Nota del proyecto corregido (incluye Rúbrica C de Pact) | | |

## Sugerencias de arreglo para el equipo (2026-11-17)

Notas en escala 0-100. Los "GitHub issues" son los tickets de la pestaña Issues del repo.

### ADR
- **Component Object sin implementar:** `e2e/components/` no existe. Crear `e2e/components/TaskCard.ts` y `AppHeader.ts` como clases que reciben un `Locator` en el constructor, y hacer que `BoardPage.tarjeta()` devuelva `new TaskCard(locator)`. Recupera hasta unos 28 puntos de la tarea.
- **ADR desalineado con el repo:** ajustar `docs/ADR.md` a lo que existe (carpetas reales, `LoginPage` y `ProjectsPage` que no están, `fullyParallel: false` y `workers: 1` por SQLite) o implementar lo que promete. Hasta 5 puntos.

### E2E + bugs
- **Bugs como GitHub issues:** `docs/issues-clase7.md` tiene los 10 bugs con el formato completo pero ninguno está en Issues. Abrir un GitHub issue por bloque, con etiqueta de severidad, y cerrar con el PR los que ya corrigieron (#12 a #14). Recupera hasta unos 20 puntos.

### Performance
- **Issue de paginación sin abrir:** abrir el bloque de `docs/issues-clase8.md` como GitHub issue (criterio de RNF Rendimiento 1 ya citado). Recupera hasta unos 19 puntos.

### Seguridad + accesibilidad
- **Falta OWASP ZAP:** correr un baseline scan contra la app local, guardar el reporte HTML en `docs/` y cruzar sus hallazgos con los manuales. Hasta 13 puntos.
- **Falta CVSS:** calcular vector y puntaje (CVSS 3.1, calculadora de first.org/cvss/calculator/3.1) de SEC-01 y SEC-02 y anotarlos junto a la severidad. Hasta 17 puntos.
- **Stories de remediación incompletas:** sumar stories con criterios de aceptación para SEC-02, ACC-02 y ACC-03. Hasta 4 puntos.

### Postman + Supertest
- **Reportes de bug incompletos:** en `docs/hallazgos-tareas-ciclo-de-vida.md` agregar entorno, reproducibilidad, evidencia y severidad a los 3 hallazgos (o referenciar los issues 5 a 7 de `issues-clase7.md`). Hasta 20 puntos.
- **Tests que solo miran el largo:** en `tasks.test.ts` el caso "filtra las tareas por estado" debería verificar también el `status` de cada item devuelto. Hasta 4 puntos.

### Integration + cobertura + refactor
- **Smells sin documentar:** agregar a `docs/` una tabla "smell, dónde estaba, refactor que lo resolvió, commit". 6 puntos.
- **Refactors sin test previo:** escribir tests de caracterización de `updateTask` y `assertEmail` antes de refactorizar. Hasta 3 puntos.

### Informe de una página
- **Más de una página:** recortar a una sola página y mergear por PR la rama `actualizar-informe`, que tiene la versión con "82 de 86" que coincide con CI. Hasta 10 puntos.

### Pendientes de entrega
- Taller de refinamiento y Presentación.

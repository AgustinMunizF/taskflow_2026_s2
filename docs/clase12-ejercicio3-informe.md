# Ejercicio 3 · Informe de estado de TaskFlow

**Fecha:** 17/11/2026 · **Lector:** quien decide si se libera
**Base:** `main` en `5994e7d`, con los tests de US-16 ya mergeados (PR #15)

## Resumen

En GitHub Actions pasaron 82 de los 86 tests unitarios y de integración. Los cuatro
fallos corresponden a US-16. Build del servidor, build del cliente, lint y E2E pasaron.
Sigue abierto el defecto crítico que permite modificar tareas de proyectos ajenos.

## Estado contra los criterios de salida

| Etapa                      | Antes (run #20) | Actual (main) |
| -------------------------- | --------------- | ------------- |
| Build del servidor         | ✓               | ✓             |
| Lint                       | ✓               | ✓             |
| Tests                      | ✓               | ✗             |
| Cobertura (umbral 70 / 40) | ✓               | ✗             |
| Build del cliente          | ✓               | ✓             |
| E2E (Playwright, Chromium) | ✓               | ✓             |

- La primera columna corresponde al run #20, anterior al PR #15. La segunda recoge el resultado de la [corrida de Actions en `5994e7d`](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/43973100246).
- **Lint:** se corrigió (PR #12); en el Ejercicio 1A estaba en rojo.
- **Tests.** Dos pruebas de CA8 recibieron `200` al modificar el vencimiento desde una cuenta ajena al proyecto. Ambas esperaban `403`. En CA6, una fecha inexistente devolvió `201` cuando se esperaba `400`. En CA3 falló la precondición del test que verifica el cambio de huso horario.
- **Cobertura.** El job vuelve a ejecutar la suite y falla por los mismos cuatro tests. La medición registrada supera los umbrales de líneas (70 %) y ramas (40 %).
- **E2E.** La suite de Chromium verifica que retirar un miembro desasigne sus tareas en ese proyecto y que repetir una etiqueta, incluso con distintas mayúsculas, deje una sola copia. Los tres escenarios pasaron. [Prueba de miembros](../e2e/tests/us14-asignar.spec.ts) · [Pruebas de etiquetas](../e2e/tests/us15-etiquetas.spec.ts)

## Métricas

| Métrica                            | Valor                           |
| ---------------------------------- | ------------------------------- |
| Defectos abiertos por severidad    | 2 críticos · 2 altos · 3 medios |
| Criterios de US-16 sin tests rojos | 1 de 8 en la corrida local en UTC−3 (CA4)                    |
| Duración del pipeline              | 2 min 9 s                       |

- **Defectos por severidad:** decide sola; un crítico abierto alcanza para no liberar.
- **Criterios sin tests rojos:** mide lo que recibe el usuario, no las líneas que recorre
  un test. En 6 de los 7 criterios con rojos, al menos uno es el bug de la fecha.
- **Duración del pipeline:** el job más largo es E2E (126 s). Si crece mucho, el equipo
  deja de esperarlo antes de mergear. Hoy no hace falta actuar.

**Descartada: cobertura de líneas.** En el 2b se sumaron 10 tests que encontraron un
defecto nuevo, y las líneas no se movieron (89,58 % antes y después). Y con casi 90 % hay
un defecto crítico abierto. Se ve bien pero no cambia la decisión: queda solo como umbral
del CI.

## Defectos abiertos

| Severidad | Defecto                                | Evidencia                       |
| --------- | -------------------------------------- | ------------------------------- |
| Crítica   | Usuario ajeno edita tareas (SEC-01)    | Issue 6 · US-12 CA5 · US-16 CA8 |
| Crítica   | Usuario ajeno elimina tareas (SEC-01)  | Issue 7 · US-13 CA1             |
| Alta      | Vencimiento vuelve un día antes        | Issue 1 · US-16                 |
| Alta      | Se puede forzar el estado inicial      | Issue 5 · US-05 CA3             |
| Media     | Se aceptan fechas inexistentes         | Nuevo (2b) · US-16 CA6          |
| Media     | `GET /api/projects` no pagina          | Clase 8 (k6)                    |
| Media     | Sin headers de seguridad, CORS abierto | SEC-02                          |

Los issues son los de `docs/issues-clase7.md`; los tests de US-05, US-12 y US-13 están
marcados con `it.failing`. Quedan además dos hallazgos de accesibilidad (ACC-02 y ACC-03).
**Corregidos en los PRs #12 a #14:** issues 2, 3, 4, 8, 9 y 10 de la clase 7.

## Riesgos sin mitigar

- **Vencimientos en Uruguay.** Los E2E pasan en UTC. En Montevideo, el detalle y el tablero muestran el día anterior al guardado. La prueba CA3 de CI falla al preparar el cambio de huso horario.
- **Los defectos no están en GitHub Issues.** Están solo en `docs/`, sin estado ni
  responsable.
- **`proxy-addr`** (crítica según `npm audit`) sigue sin `npm audit fix`, aunque el riesgo
  real es bajo.
- **E2E solo en Chromium.** No hay evidencia en Firefox ni en WebKit.

## Recomendación: no liberar

Cualquier usuario registrado puede editar y borrar tareas de proyectos ajenos (SEC-01), y
las fechas de vencimiento se muestran mal a todos los usuarios en Uruguay. Se puede pasar a
**liberar con riesgos** cuando esos dos defectos estén corregidos y sus tests en verde; los
defectos medios pueden quedar como riesgos aceptados.

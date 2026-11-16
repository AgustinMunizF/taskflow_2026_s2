# Ejercicio 3 · Informe de estado de TaskFlow

**Fecha:** 16/11/2026 · **Lector:** quien decide si se libera
**Base:** `main` en `fce9f42`, con los tests de US-16 ya mergeados (PR #15)

## Resumen

Antes de mergear los tests de US-16, `main` estaba en verde, pero no porque la app
estuviera libre de defectos: los que tenían test estaban marcados con `it.failing`, y el de
la fecha de vencimiento no tenía ninguno. Con esos tests mergeados, en local fallan 13 de
86: 12 por 3 defectos reales y 1 por una limitación de Windows. Hoy se corrigieron 6 de los
10 issues de la clase 7, pero sigue abierto un defecto crítico de permisos.

## Estado contra los criterios de salida

| Etapa                      | Antes (run #20) | Hoy (run #23) |
| -------------------------- | --------------- | ------------- |
| Build del servidor         | ✓               | ✓             |
| Lint                       | ✓               | ✓             |
| Tests                      | ✓               | ✗             |
| Cobertura (umbral 70 / 40) | ✓               | ✗             |
| Build del cliente          | ✓               | ✓             |
| E2E (Playwright, Chromium) | ✓               | ✓             |

- **Columnas:** run #20 es `main` antes del PR #15; run #23, después del merge.
- **Lint:** se corrigió hoy (PR #12); en el Ejercicio 1A estaba en rojo.
- **Tests:** en local (UTC-3), 73 de 86 en verde; los 13 rojos son tests de US-16. Uno es
  la precondición de zona horaria, que falla porque Windows ignora el cambio de
  `process.env.TZ`. En el CI deberían fallar menos, porque corre en UTC (ver riesgos).
- **Cobertura:** 89,7 % de líneas y 63,8 % de ramas, por encima del umbral. El job falla
  porque corre los tests y algunos están en rojo.

## Métricas

| Métrica                            | Valor                           |
| ---------------------------------- | ------------------------------- |
| Defectos abiertos por severidad    | 2 críticos · 2 altos · 3 medios |
| Criterios de US-16 sin tests rojos | 1 de 8 (CA4)                    |
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
**Corregidos hoy:** issues 2, 3, 4, 8, 9 y 10 de la clase 7 (PRs #12 a #14).

## Riesgos sin mitigar

- **El CI no ve el bug de la fecha.** Corre en UTC, donde la fecha vuelve bien; solo lo
  detectan los tests de CA3, que cambian la zona horaria. En Uruguay (UTC-3) se ve siempre.
- **Arreglos sin test de regresión.** La normalización de etiquetas y la desasignación al
  retirar un miembro se corrigieron sin tests nuevos: nada avisa si se rompen de nuevo.
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

# Informe de estado de TaskFlow

17/11/2026 · `main` en `5994e7d` · [CI](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/43973100246)

**Resumen y recomendación: no liberar.** Pasa a liberar con riesgos cuando permisos y
vencimiento estén corregidos y sus tests en verde. `main` estaba en verde solo porque los
defectos conocidos estaban marcados con `it.failing`.

**Estado**

| Verificación                  | Resultado                                  |
| ----------------------------- | ------------------------------------------ |
| Builds, lint y E2E (UTC)      | Pasan (E2E: 25 de 25)                      |
| Tests unitarios e integración | 82 de 86; los 4 fallos son de US-16        |
| Cobertura                     | Supera 70 / 40; el job falla por los tests |

**Métricas**

| Métrica                              | Valor                     | Por qué                            |
| ------------------------------------ | ------------------------- | ---------------------------------- |
| Defectos abiertos por severidad      | 2 crít. · 2 alt. · 3 med. | Un crítico alcanza para no liberar |
| Criterios de US-16 sin rojos (UTC-3) | 1 de 8                    | Mide lo que recibe el usuario      |
| Duración del pipeline                | 1 min 41 s                | Si crece, se deja de esperar       |

**Descartada: cobertura de líneas.** El 2b halló un defecto nuevo sin moverla.

**Defectos y riesgos**

**Críticos:** editar y borrar tareas ajenas (#22, #23). **Altos:** vencimiento corrido
(#17) y estado inicial forzable (#21). **Medios:** fechas inexistentes, sin paginación
(#27), headers permisivos. **Riesgos:** el CI corre en UTC y no ve el bug de la fecha;
E2E solo en Chromium.

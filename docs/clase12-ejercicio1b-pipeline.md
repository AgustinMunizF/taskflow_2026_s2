# Ejercicio 1B — Clasificación de las etapas en rojo

Se analizó la ejecución **CI de calidad (informativo) #1**, disparada por un push a `main` el **10 de noviembre de 2026 a las 18:56:50**. El resultado global fue `failure`: falló lint y las otras cuatro etapas terminaron correctamente.

- [Ejecución analizada](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/42909893348), intento 1.
- Commit: `4766d75b79d01d486a9deed46d4c16c981ed20d2` — Agregar pipeline de calidad con GitHub Actions.
- Configuración: `.github/workflows/ci.yml` en ese commit.

## Entregable

| Etapa en rojo                                              | Categoría                | Línea del log o anotación que lo demuestra                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lint (ESLint)** → paso **Analizar el código con ESLint** | **c. Calidad de código** | En `server/src/modules/comments/comments.service.ts`: `7:30 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`; `16:12 error 'e' is defined but never used @typescript-eslint/no-unused-vars`; `26:70 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`. El resumen indica `3 problems (3 errors, 0 warnings)` y `Process completed with exit code 1.` |

Los tres errores pertenecen a una misma etapa, por eso se presentan en una sola fila. La instalación de dependencias terminó correctamente y ESLint pudo analizar el código. No es un fallo de configuración o entorno: las reglas detectaron dos tipos `any` explícitos y una variable `e` sin usar. Tampoco es evidencia de un bug funcional detectado por un test ni de cobertura insuficiente.

## Estado de las demás etapas

| Etapa                                                                                                                                      | Resultado de GitHub Actions |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| [Build del servidor](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/42909893348/job/130157469697)                          | `success`                   |
| [Tests (unit e integración)](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/42909893348/job/130157469808)                  | `success`                   |
| [Cobertura con umbral (líneas 70 / ramas 40)](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/42909893348/job/130157469754) | `success`                   |
| [Build del cliente](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/42909893348/job/130157469495)                           | `success`                   |

En esta ejecución no hay etapas en rojo para clasificar como **a. Bug real**, **b. Falta de tests** o **d. Pipeline o entorno**. Esto describe el resultado de esta ejecución; no demuestra que TaskFlow esté libre de defectos o que sus tests sean exhaustivos.

Los avisos de dependencias vulnerables y de versiones deprecadas durante la instalación no causaron el fallo de esta ejecución. La causa acreditada del estado rojo es la salida con código 1 de ESLint.

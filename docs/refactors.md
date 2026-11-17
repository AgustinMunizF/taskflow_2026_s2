# Refactors y evidencia

| Smell | Dónde estaba | Refactor aplicado | Commit |
| --- | --- | --- | --- |
| Método con responsabilidades múltiples | `updateTask`, servicio de tareas | Extracción de validación de campos, resolución del asignado, permisos y transición de estado, y registro del historial | [c97db8f](https://github.com/AgustinMunizF/taskflow_2026_s2/commit/c97db8f) |
| Validación de email duplicada con reglas diferentes | Auth, controlador de proyectos y validaciones | Centralización en `assertEmail`. El commit también endureció la validación de miembros y cambió el mensaje de error | [3328863](https://github.com/AgustinMunizF/taskflow_2026_s2/commit/3328863) |
| Acceso a datos y validación de propietario mezclados en las rutas | Módulo de proyectos | Separación de controlador, servicio y repositorio, con chequeo centralizado del dueño | [16a6773](https://github.com/AgustinMunizF/taskflow_2026_s2/commit/16a6773) |

Los commits de extracción de `updateTask` y unificación de `assertEmail` no incluyen
tests de caracterización previos. El 17/11/2026 se agregó cobertura posterior en
[refactor-characterization.test.ts](../server/tests/refactor-characterization.test.ts).
Los 17 casos verifican normalización y rechazo de emails, campos omitidos, limpieza
de descripción, actualización vacía, historial idempotente, asignados ajenos,
rechazo de reapertura de tareas terminadas y tareas inexistentes.

La suite pasó con `npm --prefix server test -- --runTestsByPath tests/refactor-characterization.test.ts`.
La evidencia corresponde al comportamiento actual. La secuencia histórica previa
al refactor sigue siendo una limitación del proceso.

## Verificación de la rama

El 17/11/2026 pasaron lint y build. La ejecución completa de cobertura en
America/Montevideo terminó con 90 de 103 tests aprobados y 13 fallos en los
dos archivos de US-16. Los 17 tests nuevos pasaron. La cobertura fue 90,95 %
de líneas y 67,67 % de ramas, sobre los umbrales de 70 % y 40 %.

Una primera corrida de cobertura falló al preparar las tablas de SQLite.
Al repetir el comando se obtuvo la corrida completa indicada arriba.
El informe de una página conserva la referencia explícita a la corrida
histórica de CI en main; estos valores pertenecen a la rama de correcciones.

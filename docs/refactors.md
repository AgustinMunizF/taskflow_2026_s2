# Refactors y evidencia

| Smell | Dónde estaba | Refactor aplicado | Commit |
| --- | --- | --- | --- |
| Método con responsabilidades múltiples | `updateTask`, servicio de tareas | Extracción de validación de campos, resolución del asignado, permisos y transición de estado, y registro del historial | [c97db8f](https://github.com/AgustinMunizF/taskflow_2026_s2/commit/c97db8f) |
| Validación de email duplicada con reglas diferentes | Auth, controlador de proyectos y validaciones | Centralización en `assertEmail`. El commit también endureció la validación de miembros y cambió el mensaje de error | [3328863](https://github.com/AgustinMunizF/taskflow_2026_s2/commit/3328863) |
| Acceso a datos y validación de propietario mezclados en las rutas | Módulo de proyectos | Separación de controlador, servicio y repositorio, con chequeo centralizado del dueño | [16a6773](https://github.com/AgustinMunizF/taskflow_2026_s2/commit/16a6773) |

Los commits de extracción de `updateTask` y unificación de `assertEmail` no incluyen
tests de caracterización previos. Las pruebas actuales aportan cobertura posterior.
Esta limitación del proceso histórico sigue pendiente en la evaluación.

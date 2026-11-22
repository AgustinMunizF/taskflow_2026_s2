# Informe de estado de TaskFlow

17/11/2026 · Destinatario: responsable de liberación.
Base evaluada: `main` en `5994e7d`, con los tests de US-16 del PR #15.

**Decisión propuesta: no liberar.** Un usuario registrado puede modificar y eliminar
tareas de proyectos ajenos. Además, en Montevideo el vencimiento se muestra un día
antes del guardado.

## Estado de las verificaciones

| Verificación | Resultado |
| --- | --- |
| Builds del servidor y cliente | Pasan |
| Lint | Pasa |
| Tests unitarios e integración | 82 de 86 pasan |
| Cobertura | Supera 70 % de líneas y 40 % de ramas; job rojo por los tests |
| E2E Chromium en UTC | 25 de 25 pasan |

La [corrida de Actions](https://github.com/AgustinMunizF/taskflow_2026_s2/actions/runs/43973100246)
registra cuatro fallos en US-16. Dos reciben 200 al modificar una tarea ajena cuando
se esperaba 403. Otro acepta una fecha inexistente (201 en lugar de 400).
El cuarto falla en la precondición del cambio de huso horario del test.

## Defectos y riesgos

Hay siete defectos funcionales y de configuración registrados: dos críticos,
dos altos y tres medios. Los críticos son editar y borrar tareas ajenas.
Los altos son el desplazamiento del vencimiento y permitir un estado inicial
distinto de TODO. Los medios son aceptar fechas inexistentes, listar proyectos
sin paginación y la configuración de seguridad HTTP. Quedan también dos
hallazgos de accesibilidad.

Los PR #13 y #14 corrigieron recuperación de cuenta, desasignación al retirar un
miembro y duplicación de etiquetas. Los E2E existentes verifican los dos últimos
arreglos. El PR #12 corrigió lint.

La cobertura supera los umbrales, pero los tests todavía demuestran defectos
críticos. La ejecución E2E en UTC oculta el desplazamiento de fechas observado
en Montevideo. Solo se verificó Chromium.

## Condiciones para reconsiderar la liberación

Corregir los permisos de edición y borrado, demostrar que el intento ajeno no
modifica datos y verificar vencimientos en UTC y Montevideo. Los tests de esas
reglas deben pasar como pruebas normales. Los defectos restantes requieren
responsable y decisión explícita sobre su aceptación.

Los detalles reproducibles y el estado de seguimiento están en [bugs de clase 7](issues-clase7.md),
[performance](issues-clase8.md) y [seguridad y accesibilidad](clase12-m2-reporte.md).

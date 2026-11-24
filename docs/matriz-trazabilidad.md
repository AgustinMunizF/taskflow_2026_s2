# Matriz de trazabilidad

Cada fila va de un criterio de aceptación de la especificación
(`taskflow_especificacion_requerimientos.docx`, v1.0) a los tests que lo verifican y a su
resultado. Cubre las cuatro historias que tienen tests de API y E2E.

- **API:** `server/tests/` (Jest y Supertest). **E2E:** `e2e/tests/` (Playwright).
- **Resultado:** corrida local del 23/11/2026, en Windows y UTC-3: `npm test` (90 de 103) y
  `npx playwright test` (23 de 25). Los números con `#` son los issues de GitHub.
- **Parcial:** hay un test, pero no cubre todo el criterio. **Rojo:** el criterio no se cumple,
  aunque alguno de sus tests pase en verde.
- **rev.:** `us16-ia-revision.test.ts`, la revisión del Ejercicio 2b.

## US-12 · Editar tarea

| CA  | Qué exige                              | Test                           | Resultado |
| --- | -------------------------------------- | ------------------------------ | --------- |
| CA1 | Editar título, descripción y prioridad | E2E us12 (CA1) · API refactor  | Verde     |
| CA2 | Título obligatorio, 3 a 200 caracteres | E2E us12, corto y de 200 (CA2) | Parcial   |
| CA3 | Prioridad solo de los 4 valores        | API task-extras, al crear      | Parcial   |
| CA4 | El estado sigue las reglas de US-06    | API refactor, reabrir DONE     | Verde     |
| CA5 | Solo miembros editan (403)             | API lifecycle · us16-ia CA8    | Rojo: #22 |
| CA6 | Campos ausentes conservan su valor     | E2E us12 (CA6) · API refactor  | Verde     |
| CA7 | Tarea inexistente: 404                 | API refactor, inexistente      | Verde     |

US-12 CA2: se prueba un título corto y uno de 200, pero no uno de 201 ni uno vacío al editar.
US-12 CA3: la prioridad inválida solo se prueba al crear la tarea, no al editarla.

## US-14 · Asignar tarea a un miembro

| CA  | Qué exige                         | Test                          | Resultado |
| --- | --------------------------------- | ----------------------------- | --------- |
| CA1 | Solo a miembros; si no, 400       | E2E us14 (CA1) · API refactor | Verde     |
| CA2 | Se puede reasignar a otro miembro | —                             | Sin test  |
| CA3 | Asignado en nulo desasigna        | E2E us14 (CA3)                | Verde     |
| CA4 | Cualquier miembro puede asignar   | —                             | Sin test  |
| CA5 | Asignar no cambia el estado       | E2E us14 (CA5)                | Verde     |
| CA6 | Tarea inexistente: 404            | API refactor, sin asignado    | Parcial   |

## US-15 · Etiquetar tareas

| CA  | Qué exige                              | Test                       | Resultado |
| --- | -------------------------------------- | -------------------------- | --------- |
| CA1 | Se guardan en minúsculas, sin espacios | E2E us15 (CA1 y CA2)       | Parcial   |
| CA2 | No distinguen mayúsculas               | E2E us15 (CA1 y CA2)       | Verde     |
| CA3 | Repetir una: 200, sin duplicar         | E2E us15 (CA3)             | Verde     |
| CA4 | Entre 1 y 30 caracteres                | E2E us15 · API task-extras | Parcial   |
| CA5 | Máximo 10 etiquetas por tarea          | —                          | Sin test  |
| CA6 | Quitar una que no tiene: 404           | API task-extras (404)      | Verde     |
| CA7 | Solo miembros etiquetan (403)          | —                          | Sin test  |

US-15 CA1: la etiqueta en mayúsculas se agrega después de una igual en minúsculas, así que no
prueba que una etiqueta nueva se guarde en minúsculas, ni que se recorten los espacios.
US-15 CA4: se prueba la etiqueta vacía, pero no una de 31 caracteres.

## US-16 · Fecha de vencimiento

| CA  | Qué exige                            | Test                       | Resultado   |
| --- | ------------------------------------ | -------------------------- | ----------- |
| CA1 | Día calendario, sin hora             | API us16-ia CA1            | Rojo: #17   |
| CA2 | Formato ISO YYYY-MM-DD               | API us16-ia CA2 · E2E us16 | Rojo: #17   |
| CA3 | Misma fecha en toda zona horaria     | API us16-ia y rev. · E2E   | Rojo: #17   |
| CA4 | La fecha es opcional                 | API us16-ia y rev. CA4     | Verde       |
| CA5 | Se quita enviando nulo               | E2E · API us16-ia y rev.   | Rojo: #17   |
| CA6 | Formato inválido: 400                | API us16-ia y rev. CA6     | Rojo: nuevo |
| CA7 | Se admite una fecha pasada           | E2E us16 · API us16-ia CA7 | Rojo: #17   |
| CA8 | Solo miembros cambian la fecha (403) | API us16-ia y rev. · E2E   | Rojo: #22   |

US-16 CA5: quitar la fecha funciona; el rojo es al volver a asignarla (#17). CA6: se
aceptan fechas que no existen, como `2026-02-30` (defecto nuevo del Ejercicio 2b).

## Resumen

| Resultado | Criterios | Cuáles                                        |
| --------- | --------- | --------------------------------------------- |
| Verde     | 11 de 28  | La mitad de US-12, US-14 y US-15, y US-16 CA4 |
| Parcial   | 5 de 28   | US-12 CA2 y CA3, US-14 CA6, US-15 CA1 y CA4   |
| Sin test  | 4 de 28   | US-14 CA2 y CA4, US-15 CA5 y CA7              |
| Rojo      | 8 de 28   | US-12 CA5 y 7 de los 8 criterios de US-16     |

Los 8 rojos vienen de 3 defectos: permisos (#22), la fecha corrida (#17) y las fechas
inexistentes. Los 4 criterios sin test pueden fallar sin que nada avise.

## Cómo se verificó que coincide con los tests reales

Cada fila se armó leyendo el código del test, no solo su nombre. Eso dejó ver cuatro casos
en los que el nombre del test no coincide con lo que prueba:

- `tasks.test.ts` "impide que un usuario ajeno vea o modifique tareas" pasa en verde, pero
  envía `status: DONE` y lo frena la regla de estados, no la de permisos. No cuenta para
  US-12 CA5.
- En `us12-editar.spec.ts`, "guardar sin descripción la deja vacía (CA6)" no toca la
  descripción: cambia la prioridad y verifica que el título se conserve.
- En `us15-etiquetas.spec.ts`, el test marcado "CA6" verifica que quitar una etiqueta la
  saca; el CA6 de la especificación es quitar una que la tarea no tiene (404).
- En `us16-vencimiento.spec.ts`, el test marcado "CA8" verifica que un ajeno no puede
  **abrir** la tarea; el CA8 de la especificación es que no pueda **modificar** la fecha.

En el CI, que corre en UTC, CA1, CA2 y CA7 de US-16 pasan en verde: el bug de la fecha
solo se ve en una zona horaria con diferencia respecto de UTC.

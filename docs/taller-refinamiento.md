# Taller de refinamiento · Épica C

**Clase 2 · Agile, requerimientos y BDD.** El taller se hizo en papel durante la clase. Esta
es una versión escrita, armada el 23/11/2026 para dejarlo en el repo; no es una copia de la
hoja original.

**Épica C · Organización del trabajo.** Como equipo, necesitamos asignar, etiquetar y
priorizar tareas según su fecha límite.

La épica se descompone en cuatro historias. Cada una cumple INVEST, tiene criterios de
aceptación verificables y al menos un escenario Gherkin del caso principal.

## HU-C1 · Asignar una tarea a un miembro

**Como** miembro del proyecto **quiero** asignar o reasignar una tarea a otro miembro
**para** que quede claro quién se encarga de cada cosa.

**Criterios de aceptación**

1. Una tarea solo se puede asignar a un miembro del proyecto; si no lo es, responde 400.
2. Una tarea asignada se puede reasignar a otro miembro.
3. Enviar el asignado en nulo deja la tarea sin asignar.
4. Asignar no cambia el estado de la tarea.

```gherkin
Scenario: Asignar una tarea a un miembro del proyecto
  Given que Ana y Bob son miembros del proyecto de la tarea "Diseñar login"
  When Ana asigna la tarea "Diseñar login" a Bob
  Then la respuesta tiene status 200
  And la tarea "Diseñar login" figura asignada a Bob
  And su estado no cambió
```

## HU-C2 · Etiquetar una tarea

**Como** miembro del proyecto **quiero** agregar y quitar etiquetas a una tarea
**para** agrupar el trabajo por tema y encontrarlo rápido.

**Criterios de aceptación**

1. Las etiquetas se guardan en minúsculas y sin espacios al inicio ni al final.
2. Agregar una etiqueta que la tarea ya tiene no la duplica.
3. Cada etiqueta tiene entre 1 y 30 caracteres; si no, responde 400.
4. Quitar una etiqueta la saca solo de esa tarea.

```gherkin
Scenario: Agregar dos veces la misma etiqueta con distinta mayúscula
  Given que la tarea "Diseñar login" tiene la etiqueta "bug"
  When agrego la etiqueta "BUG" a la tarea "Diseñar login"
  Then la tarea "Diseñar login" tiene exactamente una etiqueta "bug"
```

## HU-C3 · Fecha de vencimiento

**Como** miembro del proyecto **quiero** ponerle una fecha de vencimiento a una tarea
**para** saber qué tiene que estar listo primero.

**Criterios de aceptación**

1. La fecha es un día calendario, sin hora, en formato `YYYY-MM-DD`.
2. La fecha que se devuelve es la misma que se cargó, sin importar la zona horaria.
3. La fecha es opcional y se puede quitar enviándola en nulo.
4. Un formato inválido o una fecha que no existe (`2026-02-30`) responde 400.

```gherkin
Scenario: La fecha no cambia según la zona horaria
  Given que mi cliente está en la zona horaria UTC-3
  When le pongo a la tarea "Diseñar login" la fecha de vencimiento "2026-09-15"
  And vuelvo a consultar la tarea
  Then la fecha de vencimiento es "2026-09-15"
```

## HU-C4 · Ver las tareas ordenadas por vencimiento

**Como** miembro del proyecto **quiero** ver las tareas ordenadas por fecha de vencimiento
**para** decidir en qué trabajar primero.

**Criterios de aceptación**

1. Las tareas con fecha aparecen de la más próxima a la más lejana.
2. Las tareas sin fecha aparecen al final.
3. Las tareas con fecha anterior a hoy se marcan como vencidas.
4. El orden se puede combinar con los filtros de estado y asignado.

```gherkin
Scenario: Las tareas vencidas aparecen primero y marcadas
  Given que el proyecto tiene la tarea "A" con vencimiento ayer
  And la tarea "B" con vencimiento mañana
  And la tarea "C" sin vencimiento
  When listo las tareas ordenadas por vencimiento
  Then el orden es "A", "B", "C"
  And la tarea "A" está marcada como vencida
```

## Chequeo INVEST

| Historia | I | N | V | E | S | T | Comentario                                        |
| -------- | - | - | - | - | - | - | ------------------------------------------------- |
| HU-C1    | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Independiente de etiquetas y fechas               |
| HU-C2    | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | El límite de etiquetas por tarea queda a definir  |
| HU-C3    | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Criterios 1 y 2 se pueden probar en otra zona     |
| HU-C4    | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | Depende de HU-C3: necesita que exista la fecha    |

HU-C4 no es independiente porque sin fecha de vencimiento no hay nada que ordenar. Se
acepta la dependencia y se planifica después de HU-C3.

## Preguntas para el Product Owner

Lo que el refinamiento dejó abierto y conviene aclarar antes de implementar:

- **Fecha con hora:** si llega `2026-09-15T10:00`, ¿se rechaza o se toma solo el día?
- **"Vencida":** ¿se calcula con la zona horaria del usuario o con la del servidor? ¿Se
  muestra en el tablero, en la API o en los dos?
- **Máximo de etiquetas:** ¿hay un límite por tarea?
- **Ex-miembros:** si se quita a alguien del proyecto, ¿sus tareas quedan sin asignar?

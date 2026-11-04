# Pruebas de performance con k6

Mide el endpoint `GET /api/projects/:projectId/tasks`, que es el que la
especificación acota en los requerimientos no funcionales:

> **RNF Rendimiento, criterio 2:** "Con un volumen de 5.000 tareas y 20.000 comentarios,
> el tiempo de respuesta del listado de tareas (percentil 95) no supera los 500 ms."

El script traduce ese criterio a dos umbrales de k6: `p(95)<500` y `rate<0.01`.

## Requisitos

- k6 instalado (`k6 version`). En Windows: `winget install k6 --source winget`.
- La API levantada (`npm run dev` desde la raíz).

## Paso 1 · Línea base con datos chicos

```powershell
npm run db:reset
npm run dev            # dejar corriendo en una terminal
```

En otra terminal:

```powershell
k6 run -e VUS=1 -e DURATION=30s performance/scenarios/api-load.k6.js
```

## Paso 2 · Con datos grandes

Sin bajar la API:

```powershell
npm --prefix server run db:seed:large
```

El resumen tiene que decir 200 proyectos de carga, 5000 tareas y 20000 comentarios.

```powershell
k6 run -e VUS=20 -e DURATION=1m performance/scenarios/api-load.k6.js
```

Para guardar evidencia del issue, agregá `--summary-export`:

```powershell
k6 run -e VUS=20 -e DURATION=1m --summary-export performance/results/seed-grande.json performance/scenarios/api-load.k6.js
```

(`performance/results/` está en el `.gitignore`.)

Los resultados y el análisis están en `docs/issues-clase8.md`.

## Para volver a los datos chicos

```powershell
npm run db:reset
```

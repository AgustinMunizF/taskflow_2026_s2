# ADR: Arquitectura del framework de testing E2E con Playwright

**Estado:** Aceptada (22/09/2026)
**Equipo:** TaskFlow — Testing y Calidad de Software 2026

## Contexto

TaskFlow tiene un cliente React (Vite, puerto 5173) y una API Express con Prisma y
SQLite (puerto 3000). Son cinco pantallas y cuatro recursos de API.

Lo único automatizado hasta ahora son los tests de Jest y Supertest en
`server/tests/`, que solo cubren el backend. Nada verifica que los flujos funcionen
desde la interfaz. El framework de Playwright lo armamos de cero, teniendo en cuenta
que somos tres personas con un semestre por delante, que el frontend ya está hecho con
componentes React y tiene unos cien `data-testid`, y que la suite tiene que correr en
CI.

## Decisión

### Carpetas por capa

```
e2e/
├── fixtures/        # usuarios, sesiones y datos creados por API
├── page-objects/    # BoardPage, MembersPage, TaskDetailPage
├── components/      # TaskCard y AppHeader
└── tests/           # flujos UI, seguridad y accesibilidad
```

La configuración vive en `playwright.config.ts`. Los helpers de API y los datos
de prueba se mantienen en `fixtures/taskflow.ts`, donde se usan.


### Qué patrón usamos y dónde

| Patrón | Dónde | Por qué |
| --- | --- | --- |
| Page Object | `BoardPage`, `MembersPage`, `TaskDetailPage` | Una clase por pantalla. Tienen lógica propia y poca repetición entre sí |
| Component Object | `AppHeader`, `TaskCard` | Piezas que se repiten y que el frontend ya tiene como componentes |
| Fixtures | `owner`, `sesion`, `proyecto`, `tarea` | Todos los tests necesitan estado previo, y acá se arma y se limpia solo |
| Screenplay | No lo usamos | Es para frameworks grandes con varios equipos. Demasiado setup para este proyecto |

`TaskCard` recibe un `Locator` que delimita una tarjeta. `BoardPage.tarjeta()`
devuelve ese componente y delega en él las acciones y lecturas de sus campos.
`AppHeader` recibe el locator del encabezado y expone el usuario y la navegación.
El test de asignación comprueba el usuario conectado mediante este componente.
Las aserciones permanecen en los tests.

### Preparar por API, validar por UI

Salvo los tests del login, ninguno se loguea por formulario: el fixture registra por
`POST /api/auth/register` e inyecta el token con `storageState`. Los datos de cada
caso también se crean por API. La idea es usar la interfaz para validar lo que estamos
probando y no para armar el escenario, que además es mucho más rápido.

Cada test crea datos con nombres únicos. La suite corre en serie
(`fullyParallel: false`, `workers: 1`) porque comparte un archivo SQLite y
la escritura concurrente puede bloquear la base.

Los escenarios están directamente en `e2e/tests/`. Preparan los datos por API
y verifican el comportamiento por UI. El login de esos escenarios se prepara
mediante el fixture de sesión.

### Locators y aserciones

El orden de preferencia es `getByRole`, `getByLabel`, `getByText` y, si nada de eso
sirve, `getByTestId` sobre los `data-testid` que ya existen. Evitamos los selectores
por clase de CSS o por posición en el DOM porque se rompen con cualquier cambio de
estilos. Sin esperas manuales: Playwright ya espera solo antes de cada acción.

Los Page Objects y Component Objects solo tienen locators y acciones. Las aserciones
van en el test.

### CI

```ts
retries: process.env.CI ? 2 : 0,
workers: 1,
fullyParallel: false,
trace: 'on-first-retry',
screenshot: 'only-on-failure',
reporter: [['list'], ['html', { open: 'never' }]],
```

Los reintentos se habilitan en CI. La configuración captura la trace en el primer
reintento, si lo hay, y las screenshots ante fallos. El workflow fuerza `--trace=on` para
guardar traces de la corrida, y publica el reporte HTML y `test-results/` como
artefactos incluso cuando falla un test. Playwright inicia API y cliente y
espera sus URLs antes de ejecutar la suite.

## Consecuencias

A favor: si cambia un selector se corrige en un solo archivo, los tests se leen fácil,
y preparar el estado por API mantiene la suite rápida.

En contra: hay más archivos que en una suite plana y el primer test cuesta más de
escribir. Además quedamos atados al contrato de la API, así que si cambia el endpoint
de registro se rompe toda la suite. Y los reintentos de CI pueden tapar un test
inestable, así que vamos a mirar los que pasan recién en el segundo intento.

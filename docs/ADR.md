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
├── config/          # entornos y constantes
├── fixtures/        # arma y limpia el estado de cada test
├── page-objects/    # pantallas completas (POM)
├── components/      # piezas reutilizables (COM)
├── api/             # clients y schemas
├── tests/           # e2e, api, hybrid
└── test-data/
```

Una carpeta única se nos queda corta con cinco pantallas, y organizar por feature no
sirve porque hay piezas compartidas: el encabezado está en todas las pantallas
autenticadas y todas usan el mismo login.

### Qué patrón usamos y dónde

| Patrón | Dónde | Por qué |
| --- | --- | --- |
| Page Object | `LoginPage`, `ProjectsPage`, `BoardPage`, `MembersPage`, `TaskDetailPage` | Una clase por pantalla. Tienen lógica propia y poca repetición entre sí |
| Component Object | `AppHeader`, `TaskCard`, `CommentItem`, `MemberItem` | Piezas que se repiten y que el frontend ya tiene como componentes |
| Fixtures | `authenticatedUser`, `loggedInPage`, `seededProject`, `seededTask` | Todos los tests necesitan estado previo, y acá se arma y se limpia solo |
| Screenplay | No lo usamos | Es para frameworks grandes con varios equipos. Demasiado setup para este proyecto |

`AppHeader` es Component Object porque aparece en todas las pantallas. `TaskCard`,
`CommentItem` y `MemberItem` están en una sola pantalla cada una, pero se repiten
muchas veces dentro de ella, y cada instancia necesita su propio scope: con un
componente que recibe la tarjeta como locator podemos afirmar sobre una sola sin que
las otras molesten.

### Preparar por API, validar por UI

Salvo los tests del login, ninguno se loguea por formulario: el fixture registra por
`POST /api/auth/register` e inyecta el token con `storageState`. Los datos de cada
caso también se crean por API. La idea es usar la interfaz para validar lo que estamos
probando y no para armar el escenario, que además es mucho más rápido.

Para poder correr en paralelo (`fullyParallel: true`), cada test crea sus propios
datos con nombres únicos y no depende de lo que haya creado otro.

### Qué va en cada carpeta de tests

`e2e/` para flujos completos desde la UI, `api/` para contratos de endpoints y
`hybrid/` para los que preparan por API y verifican por UI. No repetimos en Playwright
los casos que ya cubre la suite de Jest.

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
workers: process.env.CI ? 2 : undefined,
fullyParallel: true,
trace: 'on-first-retry',
screenshot: 'only-on-failure',
reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
```

Los reintentos van solo en CI, porque en local esconderían un bug real detrás de un
segundo intento. Las traces y screenshots se guardan únicamente cuando algo falla. El
reporte HTML es para mirarlo nosotros y el JUnit para que lo lea el pipeline.

## Consecuencias

A favor: si cambia un selector se corrige en un solo archivo, los tests se leen fácil,
y preparar el estado por API mantiene la suite rápida.

En contra: hay más archivos que en una suite plana y el primer test cuesta más de
escribir. Además quedamos atados al contrato de la API, así que si cambia el endpoint
de registro se rompe toda la suite. Y los reintentos de CI pueden tapar un test
inestable, así que vamos a mirar los que pasan recién en el segundo intento.

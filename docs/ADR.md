# ADR: Arquitectura del framework de testing E2E con Playwright

**Estado:** Aceptada
**Equipo:** TaskFlow - Testing y Calidad de Software 2026

## Contexto

TaskFlow tiene un cliente React con Vite en el puerto 5173 y una API Express con
Prisma y SQLite en el puerto 3000. La suite automatizada existente cubre el backend
con Jest y Supertest en `server/tests/`. Faltaba verificar los flujos desde la
interfaz y la suite E2E debe correr de forma reproducible en CI.

El repositorio ya ofrece identificadores `data-testid` en el frontend. Playwright
puede mantener los tests enfocados en comportamiento sin acoplarlos a clases CSS ni
usar esperas manuales.

## Decisión

### Organización real del framework

```
e2e/
├── fixtures/        # datos y sesión preparados para cada test
├── page-objects/    # Page Objects de pantallas existentes
├── components/      # Component Objects con Locator propio
└── tests/           # casos E2E
```

Esta estructura refleja lo implementado en el repositorio. No se agregan carpetas
`api/`, `config/` ni `test-data/` porque no existen como capas separadas; los datos,
tokens y llamadas HTTP se encuentran en `e2e/fixtures/taskflow.ts`. La única excepción
es `security-xss.spec.ts`, que crea por API la tarea con el payload a probar.

### Patrones implementados

| Patrón | Implementación real | Uso |
| --- | --- | --- |
| Page Object | `BoardPage`, `MembersPage`, `TaskDetailPage` | Encapsula navegación y acciones de las pantallas que existen |
| Component Object | `TaskCard`, `AppHeader` | Recibe un `Locator` y expone una parte aislada de la interfaz |
| Fixtures | `owner`, `ajeno`, `proyecto`, `tarea`, `sesion` | Prepara registros, proyectos y tareas por API |
| Screenplay | No se usa | Introduciría setup innecesario para el tamaño actual del proyecto |

`TaskCard` recibe el `Locator` de una tarjeta concreta y permite apuntar a su título,
asignado, vencimiento, prioridad y estado sin afectar otras tarjetas.
`BoardPage.tarjeta(titulo)` crea la instancia correspondiente con ese scope.
`AppHeader` encapsula los controles compartidos del encabezado autenticado.
`BoardPage.encabezado` crea el componente y el test de asignación verifica con
él el email de la sesión. Las aserciones permanecen en los tests.

Las pantallas `LoginPage` y `ProjectsPage` figuran en la interfaz de TaskFlow, pero
no tienen Page Object propio hoy. Solo se implementan objetos para las pantallas y
componentes que usan la suite actual.

### Preparar por API, validar por UI

Los fixtures crean usuarios con `POST /api/auth/register`, proyectos y tareas por
los endpoints respectivos, y cargan el token en `localStorage` con `iniciarSesion`.
Los tests usan la UI para verificar el flujo seleccionado y la API solo para preparar
el estado cuando es necesario.

Cada test registra su propio usuario, con un email único, y crea su propio proyecto y
tarea. Los nombres de proyecto y tarea se repiten, pero cada registro pertenece a un
usuario distinto, así que los casos no comparten datos. La ejecución igual es serial
por restricciones de SQLite.

### Locators y aserciones

Los locators usan `getByTestId` sobre los `data-testid` que ya tiene el frontend. Los
únicos selectores CSS son el de errores de `TaskDetailPage`, que todavía admite la clase
`.error` junto con `role="alert"`, y el de `security-xss.spec.ts`, que busca una imagen
inyectada. Las aserciones permanecen en los tests y los Page/Component Objects solo
contienen locators y acciones.

No hay esperas manuales. Los selectores por posición se limitan a tres `.first()`: quitar
la primera etiqueta en `TaskDetailPage` y esperar las primeras tarjetas en `a11y.spec.ts`.

### Configuración de ejecución

La configuración real de `playwright.config.ts` es:

```ts
fullyParallel: false,
workers: 1,
retries: process.env.CI ? 2 : 0,
```

La ejecución es serial porque las operaciones E2E comparten un único archivo SQLite,
que admite un solo escritor concurrente y puede producir colisiones o estados
cruzados si varias pruebas escriben a la vez. `workers: 1` hace la ejecución local y
CI seriales.

La configuración usa Chromium y levanta API y cliente mediante `webServer`.
Espera a `/api/health` y a la URL del cliente antes de iniciar los tests.
Produce reportes list y HTML, screenshots ante fallos y videos retenidos ante
fallos. La trace se captura en el primer reintento, si lo hay.

En CI, el workflow fuerza `--trace=on` y guarda `playwright-report/` y
`test-results/` como artefactos incluso cuando falla la suite. Los reintentos
deben revisarse para detectar tests inestables.

## Consecuencias

A favor: los objetos aíslan selectores, `BoardPage` usa tarjetas con scope propio,
los fixtures permiten construir escenarios sin repetir llamadas HTTP y la suite no
depende de datos compartidos entre tests.

En contra: mantener POM y Component Objects agrega archivos y duplicar el contrato
HTTP o los selectores puede requerir cambios coordinados. Además, SQLite limita la
concurrencia y obliga a mantener `workers: 1`.

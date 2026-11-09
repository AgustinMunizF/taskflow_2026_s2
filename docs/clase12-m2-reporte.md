# Clase 12 · Módulo 2 — Seguridad y accesibilidad

**Entorno:** Windows 11 · Node 20 · API en `http://localhost:3000/api` · cliente en `:5173` ·
SQLite local · Chromium (Playwright 1.63) · axe-core 4.14 · 9/11/2026.

## 1. Dependencias (`npm audit` en `server/`)

El repo no usa workspaces, así que el audit se corre por paquete.

| Comando                   | Total | Crítica | Altas | Moderada | Bajas |
| ------------------------- | ----- | ------- | ----- | -------- | ----- |
| `npm audit`               | 16    | 1       | 7     | 1        | 7     |
| `npm audit --omit=dev`    | 8     | 1       | 6     | 1        | 0     |

Las 8 que quedan al excluir desarrollo son las que importan. Las dos analizadas:

- **`proxy-addr` (CRITICAL, spoofing de IP)**, llega vía Express y corre en producción. Se arregla
  con `npm audit fix`, sin romper compatibilidad. El riesgo real hoy es bajo, porque la app no usa
  `trust proxy` ni decide nada según la IP, pero no cuesta nada aplicarlo.
- **`deepmerge-ts` (HIGH, agotamiento de pila)**, llega vía el CLI de Prisma. Aparece también en el
  audit con `--omit=dev`, aunque `prisma` esté declarado en `devDependencies`: npm lo incluye
  porque `@prisma/client`, que sí es dependencia de producción, lo declara como *peer dependency*
  opcional. En la práctica el CLI solo se usa para migraciones y seeds, no en el servidor
  desplegado, así que el riesgo es mucho menor que el de `proxy-addr`. Arreglarla exige subir a
  Prisma 7, un cambio mayor.

Conclusión: la severidad que publica npm no es el riesgo real, y la etiqueta de "producción"
tampoco alcanza por sí sola: hay que mirar dónde corre de verdad cada librería.

## 2. Hallazgos de seguridad

### SEC-01 — Un usuario ajeno puede editar y borrar tareas de otro proyecto · CRITICAL

`PATCH /api/tasks/:taskId` y `DELETE /api/tasks/:taskId` son las únicas rutas de
`tasks.routes.ts` sin el middleware `requireTaskProjectMember`. Incumple US-12 CA5, US-13 CA1 y el
RNF de Seguridad 2.

**Pasos:** Ana crea un proyecto con una tarea; Bob, que no es miembro, hace `PATCH` y `DELETE` sobre esa tarea.

**Esperado:** 403 en ambos. **Obtenido:** 200 y 204. Evidencia (`security/checks.ps1`):

```
Bob lista las tareas del proyecto  -> 403   (esperado 403)
Bob lee la tarea                   -> 403   (esperado 403)
Bob EDITA la tarea                 -> 200   (esperado 403)
Bob BORRA la tarea                 -> 204   (esperado 403)
```

**Impacto:** cualquiera con una sesión válida puede alterar o destruir trabajo ajeno; el borrado
arrastra comentarios, historial y etiquetas, y es irreversible.

**Remediación:** agregar `requireTaskProjectMember('taskId')` a esas dos rutas.

### SEC-02 — La API no envía headers de seguridad y acepta cualquier origen · MEDIUM

No hay `helmet` y el CORS es `cors()` sin opciones. Salida de `curl.exe -I http://localhost:3000/api/health`:

| Header                        | Valor                                       |
| ----------------------------- | ------------------------------------------- |
| `Content-Security-Policy`     | no aparece — sin mitigación de XSS          |
| `Strict-Transport-Security`   | no aparece — no se fuerza HTTPS             |
| `X-Frame-Options`             | no aparece — clickjacking posible           |
| `X-Content-Type-Options`      | no aparece — falta `nosniff`                |
| `X-Powered-By`                | `Express` — sobra, revela la tecnología     |
| `Access-Control-Allow-Origin` | `*` — cualquier sitio puede llamar a la API |

Los mismos seis valores se repiten en el endpoint protegido `GET /api/projects` con el token de
Ana: la configuración es global, no cambia entre rutas públicas y autenticadas.

**Impacto:** sin ser explotable por sí solo, elimina las defensas del navegador y amplifica
cualquier otro fallo.

**Remediación:** `app.use(helmet())` y CORS con una lista explícita de orígenes.

## 3. Controles verificados

Tres pruebas que la aplicación resistió. Un reporte de seguridad dice qué se probó y aguantó, no
solo qué falló.

**Inyección SQL.** Esperábamos que el payload se tratara como dato, porque no queda SQL crudo en
`server/src`: la consulta de tareas usa la API de Prisma, que parametriza. El `$queryRawUnsafe`
que existía se eliminó en el refactor de code smells. Resultado: login con `' OR '1'='1' --` →
**401**; el buscador con ese mismo texto → **0 resultados**, o sea que lo busca literal.

**Token sin firma (`alg: none`).** Esperábamos un rechazo, porque `middleware/auth.ts` usa
`jwt.verify` de `jsonwebtoken` 9, que no acepta `alg: none` salvo que se lo habilite. Resultado:
**401**.

**XSS almacenado.** Esperábamos que el payload se guardara pero no se ejecutara, porque React
escapa el contenido por defecto y no hay ningún `dangerouslySetInnerHTML` en `client/src`.
Se guardó `<img src=x onerror=alert(1)>` como título de una tarea y se abrieron el tablero y el
detalle: el título se muestra como texto, no aparece ningún `<img>` en el DOM y no se dispara
ningún `alert`. Verificado de forma automatizada en `e2e/tests/security-xss.spec.ts`
(`npx playwright test security-xss` → 1 passed).

## 4. Hallazgos de accesibilidad

Auditoría con `@axe-core/playwright` sobre Login, Registro, Proyectos, Tablero y Detalle de tarea
(`npx playwright test a11y`): cuatro vistas limpias, una con una violación.

| ID     | SC WCAG 2.1                  | Nivel | POUR     | Detección          | Vista                      |
| ------ | ---------------------------- | ----- | -------- | ------------------ | -------------------------- |
| ACC-01 | 4.1.2 Nombre, función, valor | A     | Robusto  | axe-core (`label`) | Detalle de tarea           |
| ACC-02 | 2.4.2 Página titulada        | A     | Operable | Manual             | Todas                      |
| ACC-03 | 4.1.3 Mensajes de estado     | AA    | Robusto  | Manual             | Detalle, Tablero, Miembros |

**ACC-01.** `tag-add-input` y `comment-add-input` no tienen etiqueta asociada: un lector de
pantalla los anuncia como "cuadro de texto" sin decir para qué sirven.
*Fix (aplicado):* envolverlos en `<label>` con texto visible, como el resto de los formularios.
Sin tocar los `data-testid`.
*Verificación:* con `VERIFICAR.regla = 'label'`, `npx playwright test a11y` da **6 passed**, cinco
vistas en cero violaciones y el test de verificación en verde.

**ACC-02.** El `<title>` es siempre "TaskFlow": no describe el tema ni el propósito de cada
pantalla, que es lo que pide el criterio. No hay un solo `document.title` en el código, así que el
listado de proyectos, el tablero y el detalle de una tarea se anuncian con el mismo texto genérico.
Quien navega con lector de pantalla o tiene varias pestañas abiertas no puede distinguir dónde está.
*Fix:* escribir un título que identifique el contenido de cada vista, por ejemplo
"Tablero · Proyecto X · TaskFlow".

**ACC-03.** Los errores se anuncian (`ErrorMessage` usa `role="alert"`), pero las acciones
exitosas no: guardar una tarea o publicar un comentario no comunica nada.
*Fix:* una región con `role="status"` que confirme cada acción.

## 5. User stories de remediación

### Seguridad (SEC-01)

**Como** miembro de un proyecto **quiero** que solo los miembros puedan editar o eliminar sus
tareas **para** que nadie ajeno altere ni destruya el trabajo de mi equipo.

- **CA-01:** `PATCH /api/tasks/:taskId` con el token de un no miembro responde 403 y la tarea conserva sus campos.
- **CA-02:** `DELETE /api/tasks/:taskId` con ese token responde 403 y un `GET` posterior devuelve 200.
- **CA-03:** los tests `US-12 CA5` y `US-13 CA1` pasan sin el marcador `.failing`.

### Accesibilidad (ACC-01)

**Como** persona que usa un lector de pantalla **quiero** que todos los campos tengan etiqueta
**para** completar los formularios sin adivinar qué se espera en cada uno.

- **CA-01:** `npx playwright test a11y` no reporta violaciones de la regla `label` en ninguna vista.
- **CA-02:** el test de verificación de `a11y.spec.ts` pasa en verde.
- **CA-03:** los `data-testid` no cambian y la suite E2E existente sigue dando los mismos resultados.

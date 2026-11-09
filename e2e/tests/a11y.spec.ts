import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';
import { crearProyectoApi, crearTareaApi, iniciarSesion, registrarUsuario } from '../fixtures/taskflow';

/**
 * Auditoría de accesibilidad WCAG 2.1 AA — Clase 12, Módulo 2
 *
 * Cómo se usa:
 *   1. Correr el informe:   npx playwright test a11y
 *   2. Leer la salida: cada violación muestra la regla de axe, el criterio de éxito
 *      (SC) de WCAG, el nivel y los elementos afectados.
 *   3. Corregir UNA violación en client/src/.
 *   4. Poner el id de esa regla en VERIFICAR.regla (más abajo) y volver a correr:
 *      el test de verificación pasa de rojo a verde cuando la corrección funciona.
 *
 * La configuración de Playwright levanta la API y el cliente si no están corriendo.
 * Los usuarios se crean por API en cada corrida, así que no depende del seed.
 */

// ── Configuración ───────────────────────────────────────────────────────────

const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** La regla corregida y las vistas donde se corrigió. Con esto el test de abajo deja de saltearse. */
const VERIFICAR: { regla: string | null; vistas: string[] } = {
  regla: 'label',
  vistas: ['Detalle de tarea'],
};

// ── Vistas a auditar ────────────────────────────────────────────────────────

const VISTAS = [
  {
    nombre: 'Login',
    abrir: async ({ page }: Contexto) => {
      await page.goto('/login');
      await expect(page.getByTestId('login-form')).toBeVisible();
    },
  },
  {
    nombre: 'Registro',
    abrir: async ({ page }: Contexto) => {
      await page.goto('/login');
      // En TaskFlow el registro es el mismo formulario, con un botón que cambia de modo.
      await page.getByTestId('login-mode-toggle').click();
      await expect(page.getByTestId('login-name-input')).toBeVisible();
    },
  },
  {
    nombre: 'Proyectos',
    abrir: async ({ page, sesion }: Contexto) => {
      await sesion();
      await page.goto('/projects');
      await expect(page.getByTestId('project-card').first()).toBeVisible();
    },
  },
  {
    nombre: 'Tablero del proyecto',
    abrir: async ({ page, sesion, proyectoId }: Contexto) => {
      await sesion();
      await page.goto(`/projects/${proyectoId()}`);
      await expect(page.getByTestId('task-card').first()).toBeVisible();
    },
  },
  {
    nombre: 'Detalle de tarea',
    abrir: async ({ page, sesion, proyectoId, tareaId }: Contexto) => {
      await sesion();
      await page.goto(`/projects/${proyectoId()}/tasks/${tareaId()}`);
      await expect(page.getByTestId('task-edit-form')).toBeVisible();
    },
  },
];

interface Contexto {
  page: Page;
  sesion: () => Promise<void>;
  proyectoId: () => string;
  tareaId: () => string;
}

// ── Utilidades ──────────────────────────────────────────────────────────────

/** 'wcag143' -> '1.4.3' ; 'wcag2410' -> '2.4.10' */
function tagASc(tag: string): string | null {
  const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

function nivel(tags: string[]): string {
  return tags.some((t) => t.endsWith('aa')) ? 'AA' : 'A';
}

async function auditar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  return violations;
}

/** Arma el escenario: un usuario con un proyecto y una tarea, todo por API. */
function contextoDe(page: Page, request: Parameters<typeof registrarUsuario>[0]): Contexto {
  let proyecto = '';
  let tarea = '';
  return {
    page,
    sesion: async () => {
      const usuario = await registrarUsuario(request, 'a11y');
      const p = await crearProyectoApi(request, usuario, 'Proyecto accesibilidad');
      const t = await crearTareaApi(request, usuario, p.id, {
        title: 'Tarea de la auditoria de accesibilidad',
        priority: 'HIGH',
      });
      proyecto = p.id;
      tarea = t.id;
      await iniciarSesion(page, usuario);
    },
    proyectoId: () => proyecto,
    tareaId: () => tarea,
  };
}

// ── 1) Informe (no falla: sirve para leer y documentar los hallazgos) ──────

test.describe('Informe de accesibilidad WCAG 2.1 AA', () => {
  for (const vista of VISTAS) {
    test(`${vista.nombre}: informe de violaciones`, async ({ page, request }, testInfo) => {
      await vista.abrir(contextoDe(page, request));
      const violations = await auditar(page);

      console.log(`\n=== ${vista.nombre}: ${violations.length} regla(s) violada(s) ===`);
      for (const v of violations) {
        const sc = v.tags.map(tagASc).filter(Boolean).join(', ');
        console.log(`\n[${(v.impact ?? 'n/a').toUpperCase()}] ${v.id} — ${v.help}`);
        console.log(`   SC WCAG: ${sc || 'n/a'}  ·  Nivel ${nivel(v.tags)}`);
        console.log(`   Elementos afectados: ${v.nodes.length}`);
        v.nodes.slice(0, 3).forEach((n) => console.log(`   · ${n.target.join(' ')}`));
        console.log(`   Más info: ${v.helpUrl}`);
      }

      await testInfo.attach(`axe-${vista.nombre}.json`, {
        body: JSON.stringify(violations, null, 2),
        contentType: 'application/json',
      });
    });
  }
});

// ── 2) Verificación de la corrección (rojo → verde) ────────────────────────

test.describe('Verificación de la corrección', () => {
  test.skip(!VERIFICAR.regla, 'Definí VERIFICAR.regla con el id de la regla que corregiste');

  for (const vista of VISTAS.filter((v) => VERIFICAR.vistas.includes(v.nombre))) {
    test(`${vista.nombre}: ya no hay violaciones de "${VERIFICAR.regla}"`, async ({ page, request }) => {
      await vista.abrir(contextoDe(page, request));
      const ids = (await auditar(page)).map((v) => v.id);
      expect(ids).not.toContain(VERIFICAR.regla);
    });
  }
});

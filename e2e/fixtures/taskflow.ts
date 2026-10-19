import { APIRequestContext, Page, test as base, expect } from '@playwright/test';

export interface Usuario {
  id: string;
  email: string;
  password: string;
  token: string;
}

export interface Proyecto {
  id: string;
  name: string;
}

export interface Tarea {
  id: string;
  title: string;
}

const PASSWORD = 'Password1';

/** Registra un usuario nuevo por API. El email es unico para no chocar con corridas anteriores. */
export async function registrarUsuario(request: APIRequestContext, prefijo: string): Promise<Usuario> {
  const email = `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}@test.com`;
  const res = await request.post('/api/auth/register', {
    data: { email, password: PASSWORD },
  });
  expect(res.status(), 'el registro de prueba tiene que funcionar').toBe(201);
  const body = await res.json();
  return { id: body.user.id, email, password: PASSWORD, token: body.token };
}

export async function crearProyectoApi(
  request: APIRequestContext,
  usuario: Usuario,
  name: string,
): Promise<Proyecto> {
  const res = await request.post('/api/projects', {
    headers: { Authorization: `Bearer ${usuario.token}` },
    data: { name },
  });
  expect(res.status(), 'la creacion de proyecto de prueba tiene que funcionar').toBe(201);
  return res.json();
}

export async function crearTareaApi(
  request: APIRequestContext,
  usuario: Usuario,
  proyectoId: string,
  body: Record<string, unknown>,
): Promise<Tarea> {
  const res = await request.post(`/api/projects/${proyectoId}/tasks`, {
    headers: { Authorization: `Bearer ${usuario.token}` },
    data: body,
  });
  expect(res.status(), 'la creacion de tarea de prueba tiene que funcionar').toBe(201);
  return res.json();
}

export async function agregarMiembroApi(
  request: APIRequestContext,
  owner: Usuario,
  proyectoId: string,
  email: string,
): Promise<void> {
  const res = await request.post(`/api/projects/${proyectoId}/members`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { email },
  });
  expect(res.status(), 'agregar al miembro de prueba tiene que funcionar').toBe(201);
}

/** Inyecta la sesion en el navegador: la pagina nace autenticada, sin pasar por el formulario. */
export async function iniciarSesion(page: Page, usuario: Usuario): Promise<void> {
  await page.addInitScript(
    ([token, user]) => {
      localStorage.setItem('taskflow_token', token);
      localStorage.setItem('taskflow_user', user);
    },
    [usuario.token, JSON.stringify({ id: usuario.id, email: usuario.email, name: null })],
  );
}

interface Fixtures {
  owner: Usuario;
  ajeno: Usuario;
  proyecto: Proyecto;
  tarea: Tarea;
  /** Pagina ya autenticada como owner del proyecto. */
  sesion: Page;
}

export const test = base.extend<Fixtures>({
  owner: async ({ request }, use) => {
    await use(await registrarUsuario(request, 'owner'));
  },

  ajeno: async ({ request }, use) => {
    await use(await registrarUsuario(request, 'ajeno'));
  },

  proyecto: async ({ request, owner }, use) => {
    await use(await crearProyectoApi(request, owner, 'Proyecto E2E'));
  },

  tarea: async ({ request, owner, proyecto }, use) => {
    await use(await crearTareaApi(request, owner, proyecto.id, { title: 'Tarea de prueba E2E' }));
  },

  sesion: async ({ page, owner }, use) => {
    await iniciarSesion(page, owner);
    await use(page);
  },
});

export { expect };

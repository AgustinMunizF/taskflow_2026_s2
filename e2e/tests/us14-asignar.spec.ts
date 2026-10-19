import { expect, registrarUsuario, test } from '../fixtures/taskflow';
import { BoardPage } from '../page-objects/BoardPage';
import { MembersPage } from '../page-objects/MembersPage';
import { TaskDetailPage } from '../page-objects/TaskDetailPage';
import type { Page } from '@playwright/test';
import type { Usuario } from '../fixtures/taskflow';

/**
 * El desplegable de "Asignado" se arma con los miembros que el navegador conoce,
 * asi que el alta del miembro se hace por la interfaz y no por API.
 */
async function sumarMiembroPorUI(page: Page, proyectoId: string, miembro: Usuario): Promise<void> {
  const miembros = new MembersPage(page);
  await miembros.ir(proyectoId);
  const alta = await miembros.agregar(miembro.email);
  expect(alta.status(), 'el alta del miembro de prueba tiene que funcionar').toBe(201);
  await expect(miembros.miembro(miembro.email)).toHaveCount(1);
}

test.describe('US-14 · Asignar tarea a un miembro', () => {
  test('caso feliz · asignar la tarea a un miembro se ve en el tablero (CA1)', async ({
    request,
    sesion,
    proyecto,
    tarea,
  }) => {
    const miembro = await registrarUsuario(request, 'miembro');
    await sumarMiembroPorUI(sesion, proyecto.id, miembro);

    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);
    await expect(detalle.asignadoSelect).toContainText(miembro.email);
    await detalle.asignadoSelect.selectOption({ label: miembro.email });
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);

    const tablero = new BoardPage(sesion);
    await tablero.ir(proyecto.id);
    await expect(tablero.asignadoDe(tarea.title)).toHaveText(miembro.email);
  });

  test('caso de borde · se puede desasignar la tarea (CA3)', async ({
    request,
    sesion,
    proyecto,
    tarea,
  }) => {
    const miembro = await registrarUsuario(request, 'miembro');
    await sumarMiembroPorUI(sesion, proyecto.id, miembro);

    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);
    await expect(detalle.asignadoSelect).toContainText(miembro.email);
    await detalle.asignadoSelect.selectOption({ label: miembro.email });
    await detalle.guardar();

    await detalle.asignadoSelect.selectOption({ label: 'Sin asignar' });
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);

    const tablero = new BoardPage(sesion);
    await tablero.ir(proyecto.id);
    await expect(tablero.asignadoDe(tarea.title)).toHaveText('Sin asignar');
  });

  test('caso de borde · la asignacion no cambia el estado de la tarea (CA5)', async ({
    request,
    sesion,
    proyecto,
    tarea,
  }) => {
    const miembro = await registrarUsuario(request, 'miembro');
    await sumarMiembroPorUI(sesion, proyecto.id, miembro);

    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);
    await expect(detalle.asignadoSelect).toContainText(miembro.email);
    await detalle.asignadoSelect.selectOption({ label: miembro.email });
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);
    await expect(sesion.getByTestId('task-current-status')).toHaveText('TODO');
  });

  test('caso de error · al quitar a un miembro, sus tareas quedan sin asignado (US-11 CA6)', async ({
    request,
    sesion,
    proyecto,
    tarea,
  }) => {
    const miembro = await registrarUsuario(request, 'miembro');
    await sumarMiembroPorUI(sesion, proyecto.id, miembro);

    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);
    await expect(detalle.asignadoSelect).toContainText(miembro.email);
    await detalle.asignadoSelect.selectOption({ label: miembro.email });
    await detalle.guardar();

    const miembros = new MembersPage(sesion);
    await miembros.ir(proyecto.id);
    const baja = await miembros.quitar(miembro.email);
    expect(baja.status()).toBe(204);

    // US-11 CA6: "Al quitar un miembro, las tareas que tenia asignadas quedan sin asignado"
    const tablero = new BoardPage(sesion);
    await tablero.ir(proyecto.id);
    await expect(tablero.asignadoDe(tarea.title)).toHaveText('Sin asignar');
  });
});

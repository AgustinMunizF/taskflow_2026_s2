import { expect, iniciarSesion, test } from '../fixtures/taskflow';
import { BoardPage } from '../page-objects/BoardPage';
import { TaskDetailPage } from '../page-objects/TaskDetailPage';

test.describe('US-16 · Fecha de vencimiento', () => {
  test('caso feliz · la fecha que se guarda es la que se muestra (CA2 y CA3)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.vencimientoInput.fill('2026-09-15');
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);
    // CA3: la fecha devuelta es siempre la que se cargo, sin importar la zona horaria.
    await expect(detalle.vencimientoActual).toHaveText('2026-09-15');
  });

  test('caso de borde · se admite una fecha pasada (CA7)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.vencimientoInput.fill('2020-01-10');
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);
    await expect(detalle.vencimientoActual).not.toHaveText('—');
  });

  test('caso de borde · se puede quitar la fecha de vencimiento (CA5)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);
    await detalle.vencimientoInput.fill('2026-12-01');
    await detalle.guardar();

    await detalle.vencimientoInput.fill('');
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);
    await expect(detalle.vencimientoActual).toHaveText('—');
  });

  test('caso de error · un usuario ajeno al proyecto no puede abrir la tarea (CA8)', async ({
    page,
    proyecto,
    tarea,
    ajeno,
  }) => {
    await iniciarSesion(page, ajeno);

    const respuesta = page.waitForResponse(
      (r) => r.url().includes(`/api/tasks/${tarea.id}`) && r.request().method() === 'GET',
    );
    await page.goto(`/projects/${proyecto.id}/tasks/${tarea.id}`);

    expect((await respuesta).status()).toBe(403);
    await expect(page.getByTestId('task-duedate-input')).toHaveCount(0);
  });

  test('caso feliz · el vencimiento guardado se ve en el tablero', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);
    await detalle.vencimientoInput.fill('2026-11-20');
    const respuesta = await detalle.guardar();
    expect(respuesta.status()).toBe(200);

    const tablero = new BoardPage(sesion);
    await tablero.ir(proyecto.id);

    await expect(tablero.vencimientoDe(tarea.title)).toHaveText('2026-11-20');
  });
});

import { expect, test } from '../fixtures/taskflow';
import { BoardPage } from '../page-objects/BoardPage';
import { TaskDetailPage } from '../page-objects/TaskDetailPage';

test.describe('US-12 · Editar tarea', () => {
  test('caso feliz · editar titulo y prioridad se refleja en el tablero (CA1)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.tituloInput.fill('Implementar login con OAuth');
    await detalle.prioridadSelect.selectOption('HIGH');
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);

    const tablero = new BoardPage(sesion);
    await tablero.ir(proyecto.id);
    await expect(tablero.tarjeta('Implementar login con OAuth')).toHaveCount(1);
    await expect(tablero.prioridadDe('Implementar login con OAuth')).toHaveText('HIGH');
  });

  test('caso de error · un titulo demasiado corto se rechaza y no se guarda (CA2)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.tituloInput.fill('ab');
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(400);

    const tablero = new BoardPage(sesion);
    await tablero.ir(proyecto.id);
    await expect(tablero.tarjeta(tarea.title)).toHaveCount(1);
    await expect(tablero.tarjeta('ab')).toHaveCount(0);
  });

  test('caso de borde · se acepta un titulo de exactamente 200 caracteres (CA2)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const titulo = 'T'.repeat(200);
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.tituloInput.fill(titulo);
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);
    await expect(detalle.tituloInput).toHaveValue(titulo);
  });

  test('caso de borde · guardar sin descripcion la deja vacia y no rompe (CA6)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.prioridadSelect.selectOption('CRITICAL');
    const respuesta = await detalle.guardar();

    expect(respuesta.status()).toBe(200);
    await expect(detalle.tituloInput).toHaveValue(tarea.title);
    await expect(detalle.prioridadSelect).toHaveValue('CRITICAL');
  });
});

import { expect, test } from '../fixtures/taskflow';
import { TaskDetailPage } from '../page-objects/TaskDetailPage';

test.describe('US-15 · Etiquetar tareas', () => {
  test('caso feliz · agregar una etiqueta la muestra en la tarea (CA4)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    const respuesta = await detalle.agregarEtiqueta('backend');

    expect(respuesta.status()).toBe(201);
    await expect(detalle.etiquetas).toHaveCount(1);
    await expect(detalle.nombresDeEtiquetas).toHaveText(['backend']);
  });

  test('caso de error · una etiqueta vacia se rechaza y no se agrega (CA4)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    const respuesta = await detalle.agregarEtiqueta('   ');

    expect(respuesta.status()).toBe(400);
    await expect(detalle.etiquetas).toHaveCount(0);
  });

  test('caso de borde · agregar la misma etiqueta dos veces no la duplica (CA3)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.agregarEtiqueta('bug');
    const segunda = await detalle.agregarEtiqueta('bug');

    // CA3: "volver a agregarla devuelve HTTP 200 y no genera un duplicado"
    expect(segunda.status()).toBe(200);
    await expect(detalle.etiquetas).toHaveCount(1);
  });

  test('caso de borde · las etiquetas no distinguen mayusculas (CA1 y CA2)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);

    await detalle.agregarEtiqueta('bug');
    await detalle.agregarEtiqueta('BUG');

    // CA2: 'Bug', 'BUG' y 'bug' son la misma etiqueta. CA1: se guardan en minusculas.
    await expect(detalle.etiquetas).toHaveCount(1);
    await expect(detalle.nombresDeEtiquetas).toHaveText(['bug']);
  });

  test('caso feliz · quitar una etiqueta la saca de la tarea (CA6)', async ({
    sesion,
    proyecto,
    tarea,
  }) => {
    const detalle = new TaskDetailPage(sesion);
    await detalle.ir(proyecto.id, tarea.id);
    await detalle.agregarEtiqueta('frontend');
    await expect(detalle.etiquetas).toHaveCount(1);

    const respuesta = await detalle.quitarPrimeraEtiqueta();

    expect(respuesta.status()).toBe(204);
    await expect(detalle.etiquetas).toHaveCount(0);
  });
});

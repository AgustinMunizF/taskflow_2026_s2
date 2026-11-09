import { expect, test } from '../fixtures/taskflow';
import { BoardPage } from '../page-objects/BoardPage';
import { TaskDetailPage } from '../page-objects/TaskDetailPage';

/**
 * XSS almacenado (Clase 12, Módulo 2).
 *
 * Guarda el payload clásico como título de una tarea y comprueba que el navegador
 * no lo ejecute: ni en el tablero ni en el detalle. Si React dejara de escapar el
 * contenido, el diálogo se abriría y el test fallaría.
 */

const PAYLOAD = '<img src=x onerror=alert(1)>';

test('el titulo de una tarea no se ejecuta como HTML (XSS almacenado)', async ({
  request,
  sesion,
  owner,
  proyecto,
}) => {
  const dialogos: string[] = [];
  sesion.on('dialog', async (d) => {
    dialogos.push(d.message());
    await d.dismiss();
  });

  // Arrange: una tarea cuyo titulo es el payload, guardada por API.
  const res = await request.post(`/api/projects/${proyecto.id}/tasks`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { title: PAYLOAD, priority: 'HIGH' },
  });
  expect(res.status()).toBe(201);
  const tarea = await res.json();

  // Act + Assert: el tablero lo muestra como texto, no como etiqueta.
  const tablero = new BoardPage(sesion);
  await tablero.ir(proyecto.id);
  await expect(tablero.tarjeta(PAYLOAD).getByTestId('task-card-title')).toHaveText(PAYLOAD);
  await expect(sesion.locator('img[src="x"]')).toHaveCount(0);

  // Y el detalle tampoco lo ejecuta.
  const detalle = new TaskDetailPage(sesion);
  await detalle.ir(proyecto.id, tarea.id);
  await expect(detalle.tituloInput).toHaveValue(PAYLOAD);
  await expect(sesion.locator('img[src="x"]')).toHaveCount(0);

  expect(dialogos, 'no se tiene que abrir ningun alert').toEqual([]);
});

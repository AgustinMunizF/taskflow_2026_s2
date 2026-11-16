import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

let seq = 0;
const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${++seq}@us16.test`;

async function setupMember() {
  const { token } = await registerUser(uniqueEmail('owner'));
  const project = await createProject(token, `US-16 project ${seq}`);
  return { token, projectId: project.id as string };
}

describe('US-16', () => {
  it('CA1 - la fecha de vencimiento es un día calendario, sin hora', async () => {
    const { token, projectId } = await setupMember();

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(token))
      .send({ title: 'Tarea CA1', dueDate: '2026-09-15' });

    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe('2026-09-15');
    expect(res.body.dueDate).toMatch(ISO_DATE);
    expect(res.body.dueDate).not.toContain('T');
    expect(res.body.dueDate).not.toContain(':');
  });

  it('CA2 - se envía y se devuelve en formato ISO 8601 de fecha (YYYY-MM-DD)', async () => {
    const { token, projectId } = await setupMember();

    const created = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(token))
      .send({ title: 'Tarea CA2', dueDate: '2026-09-15' });

    expect(created.status).toBe(201);
    expect(created.body.dueDate).toBe('2026-09-15');

    const patched = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .set(auth(token))
      .send({ dueDate: '2026-10-01' });

    expect(patched.status).toBe(200);
    expect(patched.body.dueDate).toBe('2026-10-01');
    expect(patched.body.dueDate).toMatch(ISO_DATE);

    const fetched = await request(app)
      .get(`/api/tasks/${created.body.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2026-10-01');
    expect(fetched.body.dueDate).toMatch(ISO_DATE);
  });

  it('CA3 - la fecha devuelta es la misma que se cargó, sin importar la zona horaria', async () => {
    const originalTZ = process.env.TZ;
    // Zonas extremas: UTC+14, UTC-11, UTC-3 y UTC
    const zones = ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'America/Montevideo', 'UTC'];
    // Fechas en bordes de día, mes y año donde un corrimiento de zona se nota
    const dates = ['2026-01-01', '2026-12-31', '2026-03-01', '2026-09-15'];

    try {
      const { token, projectId } = await setupMember();

      for (const tz of zones) {
        process.env.TZ = tz;

        for (const dueDate of dates) {
          const created = await request(app)
            .post(`/api/projects/${projectId}/tasks`)
            .set(auth(token))
            .send({ title: `Tarea CA3 ${tz} ${dueDate}`, dueDate });

          expect(created.status).toBe(201);
          expect(created.body.dueDate).toBe(dueDate);

          // Se lee la tarea desde otras zonas horarias
          for (const readTz of zones) {
            process.env.TZ = readTz;
            const fetched = await request(app)
              .get(`/api/tasks/${created.body.id}`)
              .set(auth(token));

            expect(fetched.status).toBe(200);
            expect(fetched.body.dueDate).toBe(dueDate);
          }

          process.env.TZ = tz;
          const patched = await request(app)
            .patch(`/api/tasks/${created.body.id}`)
            .set(auth(token))
            .send({ dueDate });

          expect(patched.status).toBe(200);
          expect(patched.body.dueDate).toBe(dueDate);
        }
      }
    } finally {
      if (originalTZ === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTZ;
      }
    }
  });

  it('CA4 - la fecha de vencimiento es opcional', async () => {
    const { token, projectId } = await setupMember();

    const created = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(token))
      .send({ title: 'Tarea CA4 sin vencimiento' });

    expect(created.status).toBe(201);
    expect(created.body).toHaveProperty('dueDate');
    expect(created.body.dueDate).toBeNull();

    const fetched = await request(app)
      .get(`/api/tasks/${created.body.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBeNull();
  });

  it('CA5 - se puede quitar la fecha de vencimiento enviando el campo en nulo', async () => {
    const { token, projectId } = await setupMember();
    const task = await createTask(token, projectId, { title: 'Tarea CA5', dueDate: '2026-09-15' });

    const patched = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ dueDate: null });

    expect(patched.status).toBe(200);
    expect(patched.body.dueDate).toBeNull();

    const fetched = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBeNull();
  });

  it('CA6 - una fecha con formato inválido devuelve HTTP 400', async () => {
    const { token, projectId } = await setupMember();
    const task = await createTask(token, projectId, { title: 'Tarea CA6', dueDate: '2026-09-15' });

    const invalidDates = ['15/09/2026', '2026/09/15', '09-15-2026', '2026-9-15', 'mañana', 'not-a-date', ''];

    for (const dueDate of invalidDates) {
      const created = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set(auth(token))
        .send({ title: `Tarea CA6 ${dueDate}`, dueDate });

      expect(created.status).toBe(400);

      const patched = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ dueDate });

      expect(patched.status).toBe(400);
    }

    // La fecha original no se modificó tras los intentos inválidos
    const fetched = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2026-09-15');
  });

  it('CA7 - se admite cargar una fecha pasada', async () => {
    const { token, projectId } = await setupMember();

    const created = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(token))
      .send({ title: 'Tarea CA7', dueDate: '2020-01-01' });

    expect(created.status).toBe(201);
    expect(created.body.dueDate).toBe('2020-01-01');

    const patched = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .set(auth(token))
      .send({ dueDate: '2019-06-30' });

    expect(patched.status).toBe(200);
    expect(patched.body.dueDate).toBe('2019-06-30');

    // La historia no define cómo se expone el estado "vencida" en la respuesta,
    // por lo que este test solo verifica que la fecha pasada no se rechaza.
  });

  it('CA8 - solo los miembros del proyecto pueden modificar la fecha de vencimiento (403)', async () => {
    const { token: ownerToken, projectId } = await setupMember();
    const task = await createTask(ownerToken, projectId, { title: 'Tarea CA8', dueDate: '2026-09-15' });

    const { token: outsiderToken } = await registerUser(uniqueEmail('outsider'));

    const patchDate = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(outsiderToken))
      .send({ dueDate: '2026-12-31' });

    expect(patchDate.status).toBe(403);

    const patchNull = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(outsiderToken))
      .send({ dueDate: null });

    expect(patchNull.status).toBe(403);

    // La fecha sigue intacta para el miembro
    const fetched = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set(auth(ownerToken));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2026-09-15');

    // Un miembro sí puede modificarla
    const memberPatch = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(ownerToken))
      .send({ dueDate: '2026-12-31' });

    expect(memberPatch.status).toBe(200);
    expect(memberPatch.body.dueDate).toBe('2026-12-31');
  });
});

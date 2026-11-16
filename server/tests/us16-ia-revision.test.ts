import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

let seq = 0;
const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${++seq}@us16-rev.test`;

async function prepararMiembro() {
  const { token } = await registerUser(uniqueEmail('owner'));
  const project = await createProject(token, `US-16 revisión ${seq}`);
  return { token, projectId: project.id as string };
}

async function conZonaHoraria<T>(tz: string, fn: () => Promise<T>): Promise<T> {
  const original = process.env.TZ;
  process.env.TZ = tz;
  try {
    return await fn();
  } finally {
    if (original === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = original;
    }
  }
}

function offsetEn(tz: string, isoInstant: string): number {
  const original = process.env.TZ;
  process.env.TZ = tz;
  const offset = new Date(isoInstant).getTimezoneOffset();
  if (original === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = original;
  }
  return offset;
}

function esperarQueNoSeaTarea(body: any) {
  expect(body?.id).toBeUndefined();
  expect(body?.dueDate).toBeUndefined();
}

describe('US-16 · revisión', () => {
  it('CA3 - precondición: el cambio de zona horaria del proceso tiene efecto', () => {
    const instante = '2026-07-01T00:00:00Z';
    const offsets = ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'UTC'].map((tz) => offsetEn(tz, instante));

    // Si los offsets coinciden, el runtime ignora process.env.TZ y los tests de CA3 no prueban nada
    expect(new Set(offsets).size).toBe(offsets.length);
  });

  it('CA3 - fechas en cambio de horario de verano y 29 de febrero se devuelven iguales en zonas con DST', async () => {
    const { token, projectId } = await prepararMiembro();
    const zonas = ['America/New_York', 'Europe/Madrid', 'Australia/Sydney'];
    const fechas = ['2026-03-08', '2026-11-01', '2026-03-29', '2026-10-25', '2026-04-05', '2026-10-04', '2028-02-29'];

    for (const tz of zonas) {
      for (const dueDate of fechas) {
        await conZonaHoraria(tz, async () => {
          const created = await request(app)
            .post(`/api/projects/${projectId}/tasks`)
            .set(auth(token))
            .send({ title: `CA3 DST ${tz} ${dueDate}`, dueDate });

          expect(created.status).toBe(201);
          expect(created.body.dueDate).toBe(dueDate);

          const fetched = await request(app)
            .get(`/api/tasks/${created.body.id}`)
            .set(auth(token));

          expect(fetched.status).toBe(200);
          expect(fetched.body.dueDate).toBe(dueDate);
        });
      }
    }
  });

  it('CA3 - crear, modificar y leer en zonas horarias distintas conserva la fecha', async () => {
    const { token, projectId } = await prepararMiembro();

    const created = await conZonaHoraria('Pacific/Kiritimati', () =>
      request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set(auth(token))
        .send({ title: 'CA3 cruzado', dueDate: '2026-01-01' }),
    );

    expect(created.status).toBe(201);
    expect(created.body.dueDate).toBe('2026-01-01');

    const patched = await conZonaHoraria('Pacific/Pago_Pago', () =>
      request(app)
        .patch(`/api/tasks/${created.body.id}`)
        .set(auth(token))
        .send({ dueDate: '2026-12-31' }),
    );

    expect(patched.status).toBe(200);
    expect(patched.body.dueDate).toBe('2026-12-31');

    for (const tz of ['America/Montevideo', 'Asia/Tokyo', 'UTC']) {
      const fetched = await conZonaHoraria(tz, () =>
        request(app).get(`/api/tasks/${created.body.id}`).set(auth(token)),
      );

      expect(fetched.status).toBe(200);
      expect(fetched.body.dueDate).toBe('2026-12-31');
    }
  });

  it('CA4 - crear una tarea con dueDate explícitamente nulo la deja sin vencimiento', async () => {
    const { token, projectId } = await prepararMiembro();

    const created = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(token))
      .send({ title: 'CA4 nulo explícito', dueDate: null });

    expect(created.status).toBe(201);
    expect(created.body).toHaveProperty('dueDate');
    expect(created.body.dueDate).toBeNull();

    const fetched = await request(app)
      .get(`/api/tasks/${created.body.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBeNull();
  });

  it('CA5 - enviar nulo a una tarea que ya no tenía vencimiento responde 200 y sigue en nulo', async () => {
    const { token, projectId } = await prepararMiembro();
    const task = await createTask(token, projectId, { title: 'CA5 sin fecha' });

    const patched = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ dueDate: null });

    expect(patched.status).toBe(200);
    expect(patched.body.dueDate).toBeNull();
  });

  it('CA5 - después de quitar la fecha se puede volver a asignar', async () => {
    const { token, projectId } = await prepararMiembro();
    const task = await createTask(token, projectId, { title: 'CA5 reasignar', dueDate: '2026-09-15' });

    const removed = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ dueDate: null });

    expect(removed.status).toBe(200);
    expect(removed.body.dueDate).toBeNull();

    const reassigned = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ dueDate: '2026-11-20' });

    expect(reassigned.status).toBe(200);
    expect(reassigned.body.dueDate).toBe('2026-11-20');
    expect(reassigned.body.dueDate).toMatch(ISO_DATE);

    const fetched = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2026-11-20');
  });

  it('CA6 - fechas con forma YYYY-MM-DD pero inexistentes en el calendario devuelven 400', async () => {
    const { token, projectId } = await prepararMiembro();
    const task = await createTask(token, projectId, { title: 'CA6 calendario', dueDate: '2026-09-15' });

    const inexistentes = ['2026-13-01', '2026-00-10', '2026-09-00', '2026-09-31', '2026-02-30', '2027-02-29'];

    for (const dueDate of inexistentes) {
      const created = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set(auth(token))
        .send({ title: `CA6 ${dueDate}`, dueDate });

      expect(created.status).toBe(400);
      esperarQueNoSeaTarea(created.body);

      const patched = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ dueDate });

      expect(patched.status).toBe(400);
      esperarQueNoSeaTarea(patched.body);
    }

    const fetched = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2026-09-15');
  });

  it('CA6 - valores que no son texto devuelven 400', async () => {
    const { token, projectId } = await prepararMiembro();
    const task = await createTask(token, projectId, { title: 'CA6 tipos', dueDate: '2026-09-15' });

    const noTexto: unknown[] = [20260915, true, {}, [], ['2026-09-15']];

    for (const dueDate of noTexto) {
      const created = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set(auth(token))
        .send({ title: 'CA6 tipo inválido', dueDate });

      expect(created.status).toBe(400);
      esperarQueNoSeaTarea(created.body);

      const patched = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ dueDate });

      expect(patched.status).toBe(400);
      esperarQueNoSeaTarea(patched.body);
    }

    const fetched = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.dueDate).toBe('2026-09-15');
  });

  it('CA8 - un no miembro no puede asignar fecha de vencimiento al crear una tarea en el proyecto (403)', async () => {
    const { projectId } = await prepararMiembro();
    const { token: outsiderToken } = await registerUser(uniqueEmail('outsider'));

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(outsiderToken))
      .send({ title: 'CA8 intruso', dueDate: '2026-09-15' });

    expect(res.status).toBe(403);
    esperarQueNoSeaTarea(res.body);
  });

  it('CA8 - la respuesta 403 no devuelve la tarea con la fecha modificada', async () => {
    const { token: ownerToken, projectId } = await prepararMiembro();
    const task = await createTask(ownerToken, projectId, { title: 'CA8 cuerpo', dueDate: '2026-09-15' });
    const { token: outsiderToken } = await registerUser(uniqueEmail('outsider'));

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(outsiderToken))
      .send({ dueDate: '2030-01-01' });

    expect(res.status).toBe(403);
    expect(res.body?.dueDate).not.toBe('2030-01-01');
    esperarQueNoSeaTarea(res.body);
  });
});

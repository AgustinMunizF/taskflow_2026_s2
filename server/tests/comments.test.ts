import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

describe('Comentarios', () => {
  it('agrega un comentario a una tarea', async () => {
    const { token } = await registerUser('com1@test.com');
    const project = await createProject(token, 'Proyecto con comentarios');
    const task = await createTask(token, project.id, { title: 'Tarea comentada' });

    const res = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Revisado y aprobado' });

    expect(res.status).toBe(201);
  });

  it('devuelve los comentarios de una tarea', async () => {
    const { token } = await registerUser('com2@test.com');
    const project = await createProject(token, 'Proyecto con listado');
    const task = await createTask(token, project.id, { title: 'Otra tarea' });
    await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Primer comentario' });

    const res = await request(app).get(`/api/tasks/${task.id}/comments`).set(auth(token));

    expect(res.body).toHaveLength(1);
  });
});

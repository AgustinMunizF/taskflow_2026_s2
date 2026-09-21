import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

describe('Hallazgos: ciclo de vida de tareas', () => {
  it('US-05 CA3: ignora el estado enviado al crear una tarea', async () => {
    const { token } = await registerUser('finding-create-owner@test.com');
    const project = await createProject(token, 'Hallazgo estado inicial');

    const response = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'No debe nacer terminada', status: 'DONE' });

    expect({ httpStatus: response.status, taskStatus: response.body.status }).toEqual({
      httpStatus: 201,
      taskStatus: 'TODO',
    });
  });

  it('US-12 CA5: impide que un usuario ajeno edite una tarea', async () => {
    const { token: ownerToken } = await registerUser('finding-edit-owner@test.com');
    const { token: outsiderToken } = await registerUser('finding-edit-outsider@test.com');
    const project = await createProject(ownerToken, 'Hallazgo permisos de edicion');
    const task = await createTask(ownerToken, project.id, { title: 'Titulo original' });

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(outsiderToken))
      .send({ title: 'Titulo alterado por un usuario ajeno' });

    const detail = await request(app).get(`/api/tasks/${task.id}`).set(auth(ownerToken));

    expect({ httpStatus: response.status, persistedTitle: detail.body.title }).toEqual({
      httpStatus: 403,
      persistedTitle: 'Titulo original',
    });
  });

  it('US-13 CA1: impide que un usuario ajeno elimine una tarea', async () => {
    const { token: ownerToken } = await registerUser('finding-delete-owner@test.com');
    const { token: outsiderToken } = await registerUser('finding-delete-outsider@test.com');
    const project = await createProject(ownerToken, 'Hallazgo permisos de eliminacion');
    const task = await createTask(ownerToken, project.id, { title: 'Tarea protegida' });

    const response = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set(auth(outsiderToken));

    const detail = await request(app).get(`/api/tasks/${task.id}`).set(auth(ownerToken));

    expect({ deleteStatus: response.status, detailStatus: detail.status }).toEqual({
      deleteStatus: 403,
      detailStatus: 200,
    });
  });
});

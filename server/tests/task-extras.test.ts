import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

describe('Transiciones de estado', () => {
  it('no permite volver una tarea de DONE a TODO', async () => {
    const { token } = await registerUser('trans-done@test.com');
    const project = await createProject(token, 'Transiciones');
    const task = await createTask(token, project.id, { title: 'Tarea con ciclo completo' });

    await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'IN_PROGRESS' });
    await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'DONE' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ status: 'TODO' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 422,
      code: 'INVALID_TRANSITION',
    });
  });

  it('permite retroceder de IN_PROGRESS a TODO', async () => {
    const { token } = await registerUser('trans-back@test.com');
    const project = await createProject(token, 'Transicion hacia atras');
    const task = await createTask(token, project.id, { title: 'Tarea que vuelve atras' });

    await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'IN_PROGRESS' });
    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ status: 'TODO' });

    expect({ status: res.status, taskStatus: res.body.status }).toEqual({
      status: 200,
      taskStatus: 'TODO',
    });
  });

  it('rechaza un estado que no existe', async () => {
    const { token } = await registerUser('trans-invalid@test.com');
    const project = await createProject(token, 'Estado invalido');
    const task = await createTask(token, project.id, { title: 'Tarea con estado raro' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ status: 'TERMINADA' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('impide que un miembro comun cambie el estado de una tarea que no tiene asignada', async () => {
    const { token: ownerToken } = await registerUser('trans-owner@test.com');
    const memberEmail = 'trans-member@test.com';
    const { token: memberToken } = await registerUser(memberEmail);
    const project = await createProject(ownerToken, 'Permisos de estado');
    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set(auth(ownerToken))
      .send({ email: memberEmail });
    const task = await createTask(ownerToken, project.id, { title: 'Tarea sin responsable' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(memberToken))
      .send({ status: 'IN_PROGRESS' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 403,
      code: 'FORBIDDEN',
    });
  });
});

describe('Historial de una tarea', () => {
  it('registra la creacion y cada cambio de estado', async () => {
    const { token } = await registerUser('history-owner@test.com');
    const project = await createProject(token, 'Historial');
    const task = await createTask(token, project.id, { title: 'Tarea con historial' });

    await request(app).patch(`/api/tasks/${task.id}`).set(auth(token)).send({ status: 'IN_PROGRESS' });
    const res = await request(app).get(`/api/tasks/${task.id}/history`).set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect({ from: res.body[1].fromStatus, to: res.body[1].toStatus }).toEqual({
      from: 'TODO',
      to: 'IN_PROGRESS',
    });
  });
});

describe('Etiquetas de una tarea', () => {
  it('agrega una etiqueta y despues la quita', async () => {
    const { token } = await registerUser('tags-owner@test.com');
    const project = await createProject(token, 'Etiquetas');
    const task = await createTask(token, project.id, { title: 'Tarea etiquetada' });

    const added = await request(app)
      .post(`/api/tasks/${task.id}/tags`)
      .set(auth(token))
      .send({ name: 'urgente' });

    const removed = await request(app)
      .delete(`/api/tasks/${task.id}/tags/${added.body.id}`)
      .set(auth(token));

    expect({ added: added.status, name: added.body.name, removed: removed.status }).toEqual({
      added: 201,
      name: 'urgente',
      removed: 204,
    });
  });

  it('rechaza una etiqueta con nombre vacio', async () => {
    const { token } = await registerUser('tags-empty@test.com');
    const project = await createProject(token, 'Etiqueta vacia');
    const task = await createTask(token, project.id, { title: 'Tarea sin etiqueta valida' });

    const res = await request(app)
      .post(`/api/tasks/${task.id}/tags`)
      .set(auth(token))
      .send({ name: '   ' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('responde 404 al quitar una etiqueta que la tarea no tiene', async () => {
    const { token } = await registerUser('tags-missing@test.com');
    const project = await createProject(token, 'Etiqueta inexistente');
    const task = await createTask(token, project.id, { title: 'Tarea sin esa etiqueta' });

    const res = await request(app).delete(`/api/tasks/${task.id}/tags/tag-9999`).set(auth(token));

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('Eliminacion de comentarios', () => {
  it('deja que el autor borre su propio comentario', async () => {
    const { token } = await registerUser('comment-author@test.com');
    const project = await createProject(token, 'Comentario propio');
    const task = await createTask(token, project.id, { title: 'Tarea comentada' });

    const comment = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Un comentario mio' });

    const res = await request(app).delete(`/api/comments/${comment.body.id}`).set(auth(token));

    expect(res.status).toBe(204);
  });

  it('impide que otro usuario borre un comentario ajeno', async () => {
    const { token: ownerToken } = await registerUser('comment-owner@test.com');
    const { token: otherToken } = await registerUser('comment-other@test.com');
    const project = await createProject(ownerToken, 'Comentario ajeno');
    const task = await createTask(ownerToken, project.id, { title: 'Tarea con comentario ajeno' });

    const comment = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(ownerToken))
      .send({ body: 'Comentario del duenio' });

    const res = await request(app).delete(`/api/comments/${comment.body.id}`).set(auth(otherToken));

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('responde 404 al borrar un comentario inexistente', async () => {
    const { token } = await registerUser('comment-missing@test.com');

    const res = await request(app).delete('/api/comments/comment-9999').set(auth(token));

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('rechaza un comentario vacio', async () => {
    const { token } = await registerUser('comment-empty@test.com');
    const project = await createProject(token, 'Comentario vacio');
    const task = await createTask(token, project.id, { title: 'Tarea con comentario vacio' });

    const res = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: '   ' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('Validaciones al crear una tarea', () => {
  it('rechaza una prioridad que no existe', async () => {
    const { token } = await registerUser('valid-priority@test.com');
    const project = await createProject(token, 'Prioridad invalida');

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Tarea con prioridad rara', priority: 'URGENTE' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rechaza un titulo mas corto que el minimo', async () => {
    const { token } = await registerUser('valid-title@test.com');
    const project = await createProject(token, 'Titulo corto');

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'ab' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rechaza una fecha de vencimiento mal formada', async () => {
    const { token } = await registerUser('valid-duedate@test.com');
    const project = await createProject(token, 'Fecha invalida');

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Tarea con fecha rara', dueDate: '31-12-2026' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});

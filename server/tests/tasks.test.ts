import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

describe('Tareas', () => {
  it('crea una tarea en un proyecto', async () => {
    const { token } = await registerUser('task1@test.com');
    const project = await createProject(token, 'Proyecto de tareas');

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Implementar login', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('TODO');
  });

  it('avanza una tarea de TODO a IN_PROGRESS', async () => {
    const { token, id } = await registerUser('task2@test.com');
    const project = await createProject(token, 'Proyecto de estados');
    const task = (
      await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea con estados', assigneeId: id })
    ).body;

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('filtra las tareas por estado', async () => {
    const { token } = await registerUser('task3@test.com');
    const project = await createProject(token, 'Proyecto de filtros');
    await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Primera tarea' });
    await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Segunda tarea' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?status=TODO`)
      .set(auth(token));

    expect(res.body.items).toHaveLength(2);
  });

  it('combina dos filtros a la vez en vez de aplicar solo el ultimo', async () => {
    const { token, id } = await registerUser('task4@test.com');
    const project = await createProject(token, 'Proyecto de filtros combinados');

    // HIGH pero ya movida fuera de TODO: no debe aparecer.
    const movida = await createTask(token, project.id, {
      title: 'Tarea HIGH en progreso',
      priority: 'HIGH',
      assigneeId: id,
    });
    await request(app)
      .patch(`/api/tasks/${movida.id}`)
      .set(auth(token))
      .send({ status: 'IN_PROGRESS' });

    // HIGH y en TODO: la unica que cumple las dos condiciones.
    await createTask(token, project.id, { title: 'Tarea HIGH pendiente', priority: 'HIGH' });
    // TODO pero LOW: tampoco cumple las dos.
    await createTask(token, project.id, { title: 'Tarea LOW pendiente', priority: 'LOW' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?status=TODO&priority=HIGH`)
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Tarea HIGH pendiente');
  });

  it('busca por texto sin romperse con una comilla', async () => {
    const { token } = await registerUser('task5@test.com');
    const project = await createProject(token, 'Proyecto de busqueda');
    await createTask(token, project.id, { title: "Informe de O'Brien" });
    await createTask(token, project.id, { title: 'Otra tarea cualquiera' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?search=${encodeURIComponent("O'Brien")}`)
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("Informe de O'Brien");
  });

  it('aplica los filtros tambien cuando hay busqueda por texto', async () => {
    const { token, id } = await registerUser('task6@test.com');
    const project = await createProject(token, 'Proyecto de busqueda filtrada');

    const movida = await createTask(token, project.id, {
      title: 'Revisar informe anual',
      assigneeId: id,
    });
    await request(app)
      .patch(`/api/tasks/${movida.id}`)
      .set(auth(token))
      .send({ status: 'IN_PROGRESS' });

    await createTask(token, project.id, { title: 'Revisar informe mensual' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?search=informe&status=TODO`)
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Revisar informe mensual');
  });
});

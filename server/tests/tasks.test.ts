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
  it('pagina de verdad y devuelve el total real, no el largo de la pagina', async () => {
    const { token } = await registerUser('task7@test.com');
    const project = await createProject(token, 'Proyecto paginado');
    for (const n of [1, 2, 3, 4, 5]) {
      await createTask(token, project.id, { title: `Tarea numero ${n}` });
    }

    const primera = await request(app)
      .get(`/api/projects/${project.id}/tasks?limit=2`)
      .set(auth(token));

    expect(primera.status).toBe(200);
    expect(primera.body.items).toHaveLength(2);
    expect(primera.body.total).toBe(5);
    expect(primera.body.items[0].title).toBe('Tarea numero 1');

    const segunda = await request(app)
      .get(`/api/projects/${project.id}/tasks?limit=2&offset=2`)
      .set(auth(token));

    expect(segunda.body.items).toHaveLength(2);
    expect(segunda.body.total).toBe(5);
    expect(segunda.body.items[0].title).toBe('Tarea numero 3');
  });

  it('devuelve el responsable y el conteo de comentarios de cada tarea', async () => {
    const { token, id } = await registerUser('task8@test.com');
    const project = await createProject(token, 'Proyecto con comentarios');
    const conComentarios = await createTask(token, project.id, {
      title: 'Tarea comentada',
      assigneeId: id,
    });
    await createTask(token, project.id, { title: 'Tarea sin comentar' });

    for (const body of ['primero', 'segundo']) {
      await request(app)
        .post(`/api/tasks/${conComentarios.id}/comments`)
        .set(auth(token))
        .send({ body });
    }

    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(token));

    expect(res.status).toBe(200);
    const comentada = res.body.items.find((t: { title: string }) => t.title === 'Tarea comentada');
    const sinComentar = res.body.items.find(
      (t: { title: string }) => t.title === 'Tarea sin comentar',
    );
    expect(comentada.commentCount).toBe(2);
    expect(comentada.assignee.email).toBe('task8@test.com');
    expect(sinComentar.commentCount).toBe(0);
    expect(sinComentar.assignee).toBeNull();
  });
});

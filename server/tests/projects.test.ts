import request from 'supertest';
import { app, auth, createProject, registerUser } from './helpers';

describe('Proyectos', () => {
  it('crea un proyecto', async () => {
    const { token } = await registerUser('proj1@test.com');

    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({ name: 'Mi Proyecto', description: 'Descripción' });

    expect(res.status).toBe(201);
  });

  it('lista los proyectos del usuario', async () => {
    const { token } = await registerUser('proj2@test.com');
    await request(app).post('/api/projects').set(auth(token)).send({ name: 'Proyecto A' });
    await request(app).post('/api/projects').set(auth(token)).send({ name: 'Proyecto B' });

    const res = await request(app).get('/api/projects').set(auth(token));

    expect(res.body).toHaveLength(2);
  });

  it('rechaza crear un proyecto sin autenticación', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'Sin token' });

    expect(res.status).toBe(401);
  });

  it('rechaza crear un proyecto con nombre demasiado corto', async () => {
    const { token } = await registerUser('proj3@test.com');

    const res = await request(app).post('/api/projects').set(auth(token)).send({ name: 'a' });

    expect(res.status).toBe(400);
  });

  it('rechaza crear un proyecto sin nombre', async () => {
    const { token } = await registerUser('proj4@test.com');

    const res = await request(app).post('/api/projects').set(auth(token)).send({});

    expect(res.status).toBe(400);
  });

  it('le responde 403 a un extrano que intenta agregar miembros', async () => {
    const { token: duenio } = await registerUser('proj5@test.com');
    const { token: extranio } = await registerUser('extranio@test.com');
    const project = await createProject(duenio, 'Proyecto privado');

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set(auth(extranio))
      .send({ email: 'extranio@test.com' });

    // US-11, criterio 1: cualquier usuario que no sea el owner recibe 403.
    expect(res.status).toBe(403);
  });

  it('le responde 404 a un extrano que intenta editar el proyecto', async () => {
    const { token: duenio } = await registerUser('proj8@test.com');
    const { token: extranio } = await registerUser('ajeno@test.com');
    const project = await createProject(duenio, 'Proyecto de otro');

    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(extranio))
      .send({ name: 'Nombre robado' });

    // US-09, criterio 7: editar un proyecto ajeno devuelve 404.
    expect(res.status).toBe(404);
  });

  it('le responde 403 a un miembro que no es dueno', async () => {
    const { token: duenio } = await registerUser('proj6@test.com');
    const { token: miembro } = await registerUser('miembro@test.com');
    const project = await createProject(duenio, 'Proyecto compartido');

    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set(auth(duenio))
      .send({ email: 'miembro@test.com' });

    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(miembro))
      .send({ name: 'Nombre cambiado' });

    expect(res.status).toBe(403);
  });

  it('no permite sacar al dueno de su propio proyecto', async () => {
    const { token, id } = await registerUser('proj7@test.com');
    const project = await createProject(token, 'Proyecto del dueno');

    const res = await request(app)
      .delete(`/api/projects/${project.id}/members/${id}`)
      .set(auth(token));

    expect(res.status).toBe(400);
  });
});

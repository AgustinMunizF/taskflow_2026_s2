import request from 'supertest';
import { app, auth, registerUser } from './helpers';

describe('Recuperacion de contrasena y bloqueo de cuenta', () => {
  it('devuelve un token de reseteo para un email registrado', async () => {
    const email = 'recovery-ok@test.com';
    await registerUser(email);

    const res = await request(app).post('/api/auth/forgot-password').send({ email });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  // US-17 CA2: la respuesta tiene que ser identica exista o no el usuario.
  // Hoy devuelve 404 y revela que direcciones estan registradas. Ver issue de US-17 CA2.
  it.failing('US-17 CA2: no revela si el email esta registrado', async () => {
    const registrado = 'recovery-identica@test.com';
    await registerUser(registrado);

    const conCuenta = await request(app).post('/api/auth/forgot-password').send({ email: registrado });
    const sinCuenta = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'no-existe@test.com' });

    expect(sinCuenta.status).toBe(200);
    expect(sinCuenta.body.message).toBe(conCuenta.body.message);
  });

  it('responde 400 si el email tiene formato invalido', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'no-es-un-email' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('cambia la contrasena y permite iniciar sesion con la nueva', async () => {
    const email = 'recovery-reset@test.com';
    await registerUser(email);

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.token, newPassword: 'NuevaClave9' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'NuevaClave9' });

    expect({ reset: reset.status, login: login.status }).toEqual({ reset: 200, login: 200 });
  });

  it('rechaza un token de reseteo inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-que-no-existe', newPassword: 'NuevaClave9' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rechaza una contrasena nueva que no cumple las reglas', async () => {
    const email = 'recovery-weak@test.com';
    await registerUser(email);
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.token, newPassword: 'claveflojita' });

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  // US-17 CA3 y CA5: el token es de un solo uso; reutilizarlo devuelve 400.
  // Hoy resetPassword no marca el token como usado ni lo verifica. Ver issue de US-17 CA5.
  it.failing('US-17 CA5: un token ya utilizado no se puede reutilizar', async () => {
    const email = 'recovery-reuso@test.com';
    await registerUser(email);
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.token, newPassword: 'PrimeraClave9' });

    const segundo = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.token, newPassword: 'SegundaClave9' });

    expect(segundo.status).toBe(400);
  });

  // US-17 CA4 y CA5: el token expira a los 60 minutos.
  // El vencimiento se prepara en la base porque la API no ofrece ese camino; lo que se
  // verifica sigue pasando por la API. Ver issue de US-17 CA4.
  it.failing('US-17 CA4: un token vencido no sirve', async () => {
    const email = 'recovery-vencido@test.com';
    await registerUser(email);
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });

    const { db } = await import('../src/lib/db');
    await db.passwordResetToken.update({
      where: { token: forgot.body.token },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.token, newPassword: 'ClaveNueva9' });

    expect(res.status).toBe(400);
  });

  // US-01 CA3: "La contrasena debe tener minimo 8 caracteres".
  // assertPassword exige length >= 7 mientras su propio mensaje habla de 8. Ver issue de US-01 CA3.
  it.failing('US-01 CA3: rechaza una contrasena de 7 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'password-corta@test.com', password: 'Abcde19' }); // 7 caracteres, con numero y mayuscula

    expect(res.status).toBe(400);
  });

  it('bloquea la cuenta despues de cinco intentos fallidos', async () => {
    const email = 'recovery-lock@test.com';
    await registerUser(email);

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').send({ email, password: 'ClaveIncorrecta9' });
    }

    const res = await request(app).post('/api/auth/login').send({ email, password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.error?.message).toMatch(/locked/i);
  });
});

describe('Autenticacion de las rutas protegidas', () => {
  it('responde 401 si no se envia el header de autorizacion', async () => {
    const res = await request(app).get('/api/projects');

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('responde 401 si el token es invalido', async () => {
    const res = await request(app).get('/api/projects').set(auth('token-roto'));

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('responde 404 en una ruta que no existe', async () => {
    const res = await request(app).get('/api/no-existe');

    expect({ status: res.status, code: res.body.error?.code }).toEqual({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

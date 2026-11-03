import request from 'supertest';
import { db } from '../src/lib/db';
import { app } from './helpers';

describe('Auth', () => {
  it('registra un usuario nuevo', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: ' ANA@TEST.COM ', password: 'Password1', name: ' Ana ' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'ana@test.com', name: 'Ana' });
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rechaza registrar un email duplicado', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'duplicate@test.com', password: 'Password1' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'DUPLICATE@TEST.COM', password: 'Password1' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Email already registered');
  });

  it.each([
    [{ email: 'invalid-email', password: 'Password1' }, 'Email must be a valid address'],
    [{ email: 'invalid-password@test.com', password: 'short' }, 'Password must be at least 8 characters and include a number and an uppercase letter'],
  ])('rechaza datos inválidos al registrar', async (body, message) => {
    const res = await request(app).post('/api/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(message);
  });

  it('inicia sesión con credenciales válidas', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@test.com', password: 'Password1' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Password1' });

    expect(res.status).toBe(200);
  });

  it('rechaza el login con contraseña incorrecta', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'wrong@test.com', password: 'Password1' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'Otracosa9' });

    expect(res.status).toBe(401);
  });

  it('rechaza el login de un usuario inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  it('acepta un login con campos ausentes como credenciales inválidas', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  it('limpia un bloqueo ya expirado al iniciar sesión', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'expired-lock@test.com', password: 'Password1' });
    const user = await db.user.findUnique({ where: { email: 'expired-lock@test.com' } });
    if (!user) throw new Error('Test user was not created');

    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: 5, lockedUntil: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'expired-lock@test.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(await db.user.findUnique({ where: { id: user.id } })).toMatchObject({
      failedAttempts: 5,
      lockedUntil: null,
    });
  });

  it('bloquea la cuenta después de cinco intentos fallidos', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'locked@test.com', password: 'Password1' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'locked@test.com', password: 'Wrongpass1' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'locked@test.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Account temporarily locked. Try again later.');
  });

  it('solicita y completa el restablecimiento de contraseña', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'reset@test.com', password: 'Password1' });

    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'RESET@TEST.COM' });

    expect(forgot.status).toBe(200);
    expect(forgot.body).toMatchObject({
      message: 'Password reset requested',
      token: expect.any(String),
    });

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.token, newPassword: 'NewPassword2' });

    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ message: 'Password updated' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@test.com', password: 'NewPassword2' });

    expect(login.status).toBe(200);
  });

  it('rechaza recuperar una cuenta inexistente y un token inválido', async () => {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing-reset@test.com' });

    expect(forgot.status).toBe(404);
    expect(forgot.body.error.message).toBe('No account found for that email');

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token', newPassword: 'NewPassword2' });

    expect(reset.status).toBe(400);
    expect(reset.body.error.message).toBe('Invalid or expired reset token');

    const missingToken = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword: 'NewPassword2' });

    expect(missingToken.status).toBe(400);
    expect(missingToken.body.error.message).toBe('Invalid or expired reset token');
  });
});

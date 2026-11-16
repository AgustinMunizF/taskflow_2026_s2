import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../../lib/db';
import { badRequest, conflict, unauthorized } from '../../lib/http';
import { toPublicId } from '../../lib/ids';
import { assertEmail, assertPassword, normalizeEmail } from '../../lib/validation';
import { signToken } from '../../middleware/auth';

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export function serializeUser(u: {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: toPublicId('user', u.id),
    email: u.email,
    name: u.name,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function register(body: Record<string, unknown>) {
  const email = assertEmail(body.email);
  const password = assertPassword(body.password);
  const name = typeof body.name === 'string' ? body.name.trim() : null;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw conflict('Email already registered');

  const user = await db.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 10), name },
  });

  return {
    user: serializeUser(user),
    token: signToken({ userId: user.id, email: user.email }),
  };
}

export async function login(body: Record<string, unknown>) {
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw unauthorized('Invalid credentials');

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw unauthorized('Account temporarily locked. Try again later.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    const data: { failedAttempts: number; lockedUntil?: Date } = { failedAttempts: attempts };
    if (attempts >= 5) {
      data.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await db.user.update({ where: { id: user.id }, data });
    throw unauthorized('Invalid credentials');
  }

  if (user.lockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { lockedUntil: null } });
  }

  return {
    user: serializeUser(user),
    token: signToken({ userId: user.id, email: user.email }),
  };
}

export async function forgotPassword(body: Record<string, unknown>) {
  const email = assertEmail(body.email);

  const user = await db.user.findUnique({ where: { email } });
  const token = crypto.randomBytes(24).toString('hex');
  if (user) {
    const now = new Date();
    await db.$transaction([
      db.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      db.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt: new Date(now.getTime() + 60 * 60 * 1000) },
      }),
    ]);
  }

  // No hay servicio de email en el proyecto: el token se devuelve en la respuesta.
  return { message: 'Password reset requested', token };
}

export async function resetPassword(body: Record<string, unknown>) {
  const token = typeof body.token === 'string' ? body.token : '';
  const newPassword = assertPassword(body.newPassword);

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw badRequest('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.$transaction(async (tx) => {
    const now = new Date();
    const consumed = await tx.passwordResetToken.updateMany({
      where: { token, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (!consumed.count) throw badRequest('Invalid or expired reset token');
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null },
    });
  });

  return { message: 'Password updated' };
}

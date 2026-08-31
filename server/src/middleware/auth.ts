import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../lib/http';

export const JWT_SECRET = process.env.JWT_SECRET ?? 'taskflow-dev-secret';

export interface TokenPayload {
  userId: number;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    next(unauthorized());
    return;
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

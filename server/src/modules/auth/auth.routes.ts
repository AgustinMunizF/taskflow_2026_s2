import { NextFunction, Request, Response, Router } from 'express';
import * as service from './auth.service';

const router = Router();

function handle(
  fn: (body: Record<string, unknown>) => Promise<unknown>,
  status: number,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(status).json(await fn(req.body ?? {}));
    } catch (err) {
      next(err);
    }
  };
}

router.post('/register', handle(service.register, 201));
router.post('/login', handle(service.login, 200));
router.post('/forgot-password', handle(service.forgotPassword, 200));
router.post('/reset-password', handle(service.resetPassword, 200));

export default router;

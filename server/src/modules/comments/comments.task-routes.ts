import { NextFunction, Request, Response, Router } from 'express';
import { notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import { requireTaskProjectMember } from '../../middleware/membership';
import * as service from './comments.service';

// Montado en /tasks/:taskId/comments
const router = Router({ mergeParams: true });

router.use(requireTaskProjectMember('taskId'));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.json(await service.list(taskId));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.status(201).json(await service.create(taskId, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
});

export default router;

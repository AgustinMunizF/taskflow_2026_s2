import { NextFunction, Request, Response, Router } from 'express';
import { notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import { authenticate } from '../../middleware/auth';
import * as service from './comments.service';

const router = Router();

router.use(authenticate);

router.delete('/:commentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = parsePublicId(req.params.commentId, 'comment');
    if (commentId === null) throw notFound('Comment not found');
    await service.remove(commentId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

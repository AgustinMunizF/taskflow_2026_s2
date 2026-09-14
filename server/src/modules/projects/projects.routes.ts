import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireProjectOwner } from '../../middleware/membership';
import * as controller from './projects.controller';
import tasksRouter from '../tasks/tasks.project-routes';

const router = Router();

router.use(authenticate);

router.post('/', controller.create);
router.get('/', controller.list);
// US-09: el proyecto ajeno o inexistente es 404; el miembro no dueño, 403.
router.patch('/:projectId', requireProjectOwner({ hideExistence: true }), controller.update);
router.delete('/:projectId', requireProjectOwner({ hideExistence: true }), controller.remove);
// US-11: en la gestión de miembros, todo el que no sea dueño recibe 403.
router.post('/:projectId/members', requireProjectOwner(), controller.addMember);
router.delete('/:projectId/members/:userId', requireProjectOwner(), controller.removeMember);

router.use('/:projectId/tasks', tasksRouter);

export default router;

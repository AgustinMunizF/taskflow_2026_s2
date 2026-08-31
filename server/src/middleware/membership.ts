import { NextFunction, Request, Response } from 'express';
import { db } from '../lib/db';
import { forbidden, notFound, unauthorized } from '../lib/http';
import { parsePublicId } from '../lib/ids';

export async function isMember(userId: number, projectId: number): Promise<boolean> {
  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return membership !== null;
}

export async function isOwner(userId: number, projectId: number): Promise<boolean> {
  const project = await db.project.findUnique({ where: { id: projectId } });
  return project !== null && project.ownerId === userId;
}

/**
 * Verifica que el usuario autenticado sea miembro vigente del proyecto
 * indicado en el parámetro de ruta :projectId.
 */
export function requireProjectMember(paramName = 'projectId') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(unauthorized());
        return;
      }
      const projectId = parsePublicId(req.params[paramName], 'proj');
      if (projectId === null) {
        next(notFound('Project not found'));
        return;
      }
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) {
        next(notFound('Project not found'));
        return;
      }
      if (!(await isMember(req.user.userId, projectId))) {
        next(forbidden('You are not a member of this project'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Verifica membresía a partir de una tarea (:taskId). */
export function requireTaskProjectMember(paramName = 'taskId') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(unauthorized());
        return;
      }
      const taskId = parsePublicId(req.params[paramName], 'task');
      if (taskId === null) {
        next(notFound('Task not found'));
        return;
      }
      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        next(notFound('Task not found'));
        return;
      }
      if (!(await isMember(req.user.userId, task.projectId))) {
        next(forbidden('You are not a member of this project'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

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

export interface ProjectOwnerOptions {
  /**
   * Cuando es true, a quien no es miembro se le responde 404 en lugar de 403:
   * no debe enterarse de que el proyecto existe.
   */
  hideExistence?: boolean;
  paramName?: string;
}

/**
 * Verifica que el usuario autenticado sea el dueño del proyecto en :projectId.
 *
 * La especificación define dos respuestas distintas para el no-dueño, según
 * el recurso, y por eso la regla es un parámetro y no una constante:
 *   - US-09, criterio 7: editar un proyecto inexistente o ajeno devuelve 404,
 *     y el miembro no dueño, 403  -> hideExistence: true
 *   - US-11, criterio 1: en la gestión de miembros, cualquier usuario que no
 *     sea el dueño recibe 403     -> hideExistence: false (default)
 */
export function requireProjectOwner({
  hideExistence = false,
  paramName = 'projectId',
}: ProjectOwnerOptions = {}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(unauthorized());
        return;
      }
      const userId = req.user.userId;
      const projectId = parsePublicId(req.params[paramName], 'proj');

      if (projectId !== null && (await isOwner(userId, projectId))) {
        next();
        return;
      }

      if (hideExistence && (projectId === null || !(await isMember(userId, projectId)))) {
        next(notFound('Project not found'));
        return;
      }

      next(forbidden('Only the project owner can perform this action'));
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

import { NextFunction, Request, Response } from 'express';
import { notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import * as service from './projects.service';

/** Lee :projectId de la ruta. El middleware de dueño ya validó el acceso. */
function projectIdOf(req: Request): number {
  const id = parsePublicId(req.params.projectId, 'proj');
  if (id === null) throw notFound('Project not found');
  return id;
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await service.create(req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.list(req.user!.userId));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.update(projectIdOf(req), req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.remove(projectIdOf(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await service.addMember(projectIdOf(req), req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const memberId = parsePublicId(req.params.userId, 'user');
    if (memberId === null) throw notFound('Project not found');
    await service.removeMember(projectIdOf(req), memberId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

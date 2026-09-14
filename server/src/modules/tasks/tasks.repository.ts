import { Prisma } from '@prisma/client';
import { db } from '../../lib/db';

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigneeId?: number;
  search?: string;
}

/**
 * Arma el filtro de Prisma a partir de los parámetros de query.
 * Los filtros se acumulan sobre el mismo objeto: pedir dos a la vez aplica los dos.
 */
export function buildFilters(projectId: number, f: TaskFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { projectId };

  if (f.status) {
    where.status = f.status;
  }
  if (f.priority) {
    where.priority = f.priority;
  }
  if (f.assigneeId !== undefined) {
    where.assigneeId = f.assigneeId;
  }
  if (f.search) {
    where.OR = [{ title: { contains: f.search } }, { description: { contains: f.search } }];
  }

  return where;
}

/** Página pedida por el cliente. Si no viene, se devuelven todas las filas. */
export interface TaskPage {
  limit: number;
  offset: number;
}

/** Trae la página de tareas con su responsable ya resuelto, en una sola consulta. */
export async function findTasks(projectId: number, f: TaskFilters, page?: TaskPage) {
  return db.task.findMany({
    where: buildFilters(projectId, f),
    orderBy: { id: 'asc' },
    include: { assignee: true },
    take: page?.limit,
    skip: page?.offset,
  });
}

/**
 * Cuenta los comentarios de varias tareas de una sola vez.
 * Comment no declara relación con Task en el schema, así que no se puede
 * usar _count desde findTasks(); este groupBy cumple la misma función.
 */
export async function countCommentsByTask(taskIds: number[]): Promise<Map<number, number>> {
  if (taskIds.length === 0) return new Map();

  const rows = await db.comment.groupBy({
    by: ['taskId'],
    where: { taskId: { in: taskIds } },
    _count: { _all: true },
  });

  return new Map(rows.map((r) => [r.taskId, r._count._all]));
}

export async function countTasks(projectId: number, f: TaskFilters): Promise<number> {
  return db.task.count({ where: buildFilters(projectId, f) });
}

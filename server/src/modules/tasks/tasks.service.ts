import { db } from '../../lib/db';
import { badRequest, forbidden, notFound } from '../../lib/http';
import { formatDueDate, parseDueDate, parsePublicId, toPublicId } from '../../lib/ids';
import {
  assertOptionalString,
  assertPriority,
  assertStatus,
  assertString,
  Status,
} from '../../lib/validation';
import { isMember } from '../../middleware/membership';
import { assertTransition } from './transitions';

export interface TaskRow {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeTask(t: TaskRow, extra: Record<string, unknown> = {}) {
  return {
    id: toPublicId('task', t.id),
    projectId: toPublicId('proj', t.projectId),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId === null ? null : toPublicId('user', t.assigneeId),
    dueDate: formatDueDate(t.dueDate),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    ...extra,
  };
}

export async function createTask(projectId: number, userId: number, body: Record<string, unknown>) {
  const title = assertString(body.title, 'title', 3, 200);
  const description = assertOptionalString(body.description, 'description', 500);
  const priority = body.priority === undefined ? 'MEDIUM' : assertPriority(body.priority);

  let assigneeId: number | null = null;
  if (body.assigneeId !== undefined && body.assigneeId !== null) {
    const parsed = parsePublicId(body.assigneeId, 'user');
    if (parsed === null) throw badRequest('assigneeId must be a valid user id');
    if (!(await isMember(parsed, projectId))) {
      throw badRequest('The assignee must be a member of the project');
    }
    assigneeId = parsed;
  }

  const dueDate = body.dueDate === undefined ? undefined : parseDueDate(body.dueDate);
  if (dueDate === undefined && body.dueDate !== undefined) {
    throw badRequest('dueDate must be a calendar date in YYYY-MM-DD format');
  }

  const task = await db.task.create({
    data: {
      ...(body as object),
      projectId,
      title,
      description: description ?? null,
      priority,
      assigneeId,
      dueDate: dueDate ?? null,
    } as never,
  });

  await db.taskHistory.create({
    data: { taskId: task.id, changedById: userId, fromStatus: null, toStatus: task.status },
  });

  return serializeTask(task);
}

/** Valida los campos simples de la tarea. Solo mira los que vienen en el body. */
export function validateTaskFields(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) {
    data.title = assertString(body.title, 'title', 3, 200);
  }

  if (body.description !== undefined) {
    data.description = assertOptionalString(body.description, 'description', 500) ?? null;
  }

  if (body.priority !== undefined) {
    data.priority = assertPriority(body.priority);
  }

  if (body.dueDate !== undefined) {
    const parsed = parseDueDate(body.dueDate);
    if (parsed === undefined) {
      throw badRequest('dueDate must be a calendar date in YYYY-MM-DD format');
    }
    data.dueDate = parsed;
  }

  return data;
}

/**
 * Regla de autorización del cambio de estado: solo el responsable de la tarea
 * o un admin/owner del proyecto pueden moverlo. Pura: no toca la base.
 */
export function canChangeStatus(
  task: Pick<TaskRow, 'assigneeId'>,
  userId: number,
  membership: { role: string } | null,
): boolean {
  if (task.assigneeId === userId) return true;
  if (!membership) return false;
  return membership.role === 'OWNER' || membership.role === 'ADMIN';
}

/** Resuelve el nuevo responsable: null desasigna; si no, debe ser miembro del proyecto. */
async function resolveAssignee(raw: unknown, projectId: number): Promise<number | null> {
  if (raw === null) return null;

  const assigneeId = parsePublicId(raw, 'user');
  if (assigneeId === null) {
    throw badRequest('assigneeId must be a valid user id');
  }
  if (!(await isMember(assigneeId, projectId))) {
    throw badRequest('The assignee must be a member of the project');
  }
  return assigneeId;
}

/**
 * Resuelve la transición de estado: autoriza y valida que el movimiento sea
 * legal. Devuelve el estado nuevo, o null si no hay cambio real de estado.
 */
async function resolveStatusChange(
  task: Pick<TaskRow, 'assigneeId' | 'projectId' | 'status'>,
  userId: number,
  rawStatus: unknown,
): Promise<Status | null> {
  const requested = assertStatus(rawStatus);
  if (requested === task.status) return null;

  const membership =
    task.assigneeId === userId
      ? null
      : await db.projectMember.findUnique({
          where: { projectId_userId: { projectId: task.projectId, userId } },
        });

  if (!canChangeStatus(task, userId, membership)) {
    throw forbidden('Only the assignee or a project admin can change the status');
  }

  assertTransition(task.status as Status, requested);
  return requested;
}

/** Deja asentado en el historial el paso de un estado al siguiente. */
async function recordStatusChange(
  taskId: number,
  userId: number,
  fromStatus: string,
  toStatus: Status,
): Promise<void> {
  await db.taskHistory.create({
    data: { taskId, changedById: userId, fromStatus, toStatus },
  });
}

/** Orquesta la actualización de una tarea: cada regla vive en su propia función. */
export async function updateTask(taskId: number, userId: number, body: Record<string, unknown>) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw notFound('Task not found');

  const data = validateTaskFields(body);

  if (body.assigneeId !== undefined) {
    data.assigneeId = await resolveAssignee(body.assigneeId, task.projectId);
  }

  const nextStatus =
    body.status === undefined ? null : await resolveStatusChange(task, userId, body.status);

  if (nextStatus !== null) {
    data.status = nextStatus;
  }

  if (Object.keys(data).length === 0) {
    return serializeTask(task);
  }

  const updated = await db.task.update({ where: { id: taskId }, data });

  if (nextStatus !== null) {
    await recordStatusChange(taskId, userId, task.status, nextStatus);
  }

  return serializeTask(updated);
}

export async function deleteTask(taskId: number): Promise<void> {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw notFound('Task not found');

  await db.comment.deleteMany({ where: { taskId } });
  await db.taskHistory.deleteMany({ where: { taskId } });
  await db.taskTag.deleteMany({ where: { taskId } });
  await db.task.delete({ where: { id: taskId } });
}

const MAX_TAGS_PER_TASK = 10;

export async function addTag(taskId: number, rawName: unknown) {
  if (typeof rawName !== 'string' || rawName.trim().length < 1 || rawName.trim().length > 30) {
    throw badRequest('Tag name must be between 1 and 30 characters');
  }
  const name = rawName.trim();

  const current = await db.taskTag.count({ where: { taskId } });
  if (current >= MAX_TAGS_PER_TASK) {
    throw badRequest(`A task can have at most ${MAX_TAGS_PER_TASK} tags`);
  }

  let tag = await db.tag.findFirst({ where: { name } });
  if (!tag) tag = await db.tag.create({ data: { name } });

  await db.taskTag.create({ data: { taskId, tagId: tag.id } });

  return { id: toPublicId('tag', tag.id), name: tag.name };
}

export async function removeTag(taskId: number, tagId: number): Promise<void> {
  const link = await db.taskTag.findFirst({ where: { taskId, tagId } });
  if (!link) throw notFound('The task does not have that tag');
  await db.taskTag.delete({ where: { id: link.id } });
}

export async function listTags(taskId: number) {
  const links = await db.taskTag.findMany({ where: { taskId }, include: { tag: true } });
  return links.map((l) => ({ id: toPublicId('tag', l.tag.id), name: l.tag.name }));
}

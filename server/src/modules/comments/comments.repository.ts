import { db } from '../../lib/db';

export function listByTask(taskId: number) {
  return db.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });
}

export function findById(id: number) {
  return db.comment.findUnique({ where: { id } });
}

export function insert(taskId: number, authorId: number, body: string) {
  return db.comment.create({ data: { taskId, authorId, body } });
}

export function removeById(id: number) {
  return db.comment.delete({ where: { id } });
}

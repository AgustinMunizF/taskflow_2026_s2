import { db } from '../../lib/db';

export function findById(id: number) {
  return db.project.findUnique({ where: { id } });
}

/** Proyectos propios no archivados, más aquellos donde el usuario es miembro. */
export function listForUser(userId: number) {
  return db.project.findMany({
    where: {
      OR: [
        { ownerId: userId, archived: false },
        { members: { some: { userId } }, ownerId: { not: userId } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
}

/** Busca un proyecto homónimo del mismo dueño, opcionalmente excluyendo uno. */
export function findByOwnerAndName(ownerId: number, name: string, exceptId?: number) {
  return db.project.findFirst({
    where: { ownerId, name, ...(exceptId === undefined ? {} : { id: { not: exceptId } }) },
  });
}

export function insert(ownerId: number, name: string, description: string | null) {
  return db.project.create({ data: { name, description, ownerId } });
}

export function updateById(id: number, data: { name?: string; description?: string | null }) {
  return db.project.update({ where: { id }, data });
}

export function removeById(id: number) {
  return db.project.delete({ where: { id } });
}

export function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export function findMember(projectId: number, userId: number) {
  return db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export function insertMember(projectId: number, userId: number, role: string) {
  return db.projectMember.create({ data: { projectId, userId, role } });
}

export function removeMemberById(id: number) {
  return db.projectMember.delete({ where: { id } });
}

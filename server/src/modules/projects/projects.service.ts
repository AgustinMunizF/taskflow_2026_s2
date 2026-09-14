import { badRequest, conflict, notFound } from '../../lib/http';
import { toPublicId } from '../../lib/ids';
import { assertEmail, assertOptionalString, assertString } from '../../lib/validation';
import * as repo from './projects.repository';

const NAME_MIN = 3;
const NAME_MAX = 100;

export interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  archived: boolean;
  createdAt: Date;
}

export function serialize(p: ProjectRow) {
  return {
    id: toPublicId('proj', p.id),
    name: p.name,
    description: p.description,
    ownerId: toPublicId('user', p.ownerId),
    archived: p.archived,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Única validación del nombre de proyecto: la comparten create y update. */
function assertProjectName(raw: unknown): string {
  return assertString(raw, 'name', NAME_MIN, NAME_MAX);
}

/** Falla si el usuario ya tiene otro proyecto con ese nombre. */
async function assertNameIsFree(ownerId: number, name: string, exceptId?: number): Promise<void> {
  const duplicate = await repo.findByOwnerAndName(ownerId, name, exceptId);
  if (duplicate) throw conflict('You already have a project with that name');
}

export async function create(userId: number, body: Record<string, unknown>) {
  const name = assertProjectName(body?.name);
  const description = assertOptionalString(body?.description, 'description', 500);

  await assertNameIsFree(userId, name);

  const project = await repo.insert(userId, name, description ?? null);
  await repo.insertMember(project.id, userId, 'OWNER');

  return serialize(project);
}

export async function list(userId: number) {
  const projects = await repo.listForUser(userId);
  return projects.map(serialize);
}

export async function update(projectId: number, ownerId: number, body: Record<string, unknown>) {
  const data: { name?: string; description?: string | null } = {};

  if (body?.name !== undefined) {
    const name = assertProjectName(body.name);
    await assertNameIsFree(ownerId, name, projectId);
    data.name = name;
  }

  if (body?.description !== undefined) {
    data.description = assertOptionalString(body.description, 'description', 500) ?? null;
  }

  return serialize(await repo.updateById(projectId, data));
}

export async function remove(projectId: number): Promise<void> {
  await repo.removeById(projectId);
}

export async function addMember(projectId: number, body: Record<string, unknown>) {
  const email = assertEmail(body?.email);

  const user = await repo.findUserByEmail(email);
  if (!user) throw notFound('No user found with that email');

  const existing = await repo.findMember(projectId, user.id);
  if (existing) throw conflict('User is already a member of this project');

  await repo.insertMember(projectId, user.id, 'MEMBER');

  return {
    projectId: toPublicId('proj', projectId),
    userId: toPublicId('user', user.id),
    email: user.email,
    role: 'MEMBER',
  };
}

export async function removeMember(projectId: number, memberId: number): Promise<void> {
  const project = await repo.findById(projectId);
  if (!project) throw notFound('Project not found');

  if (memberId === project.ownerId) {
    throw badRequest('The project owner cannot be removed from the project');
  }

  const membership = await repo.findMember(projectId, memberId);
  if (!membership) throw notFound('User is not a member of this project');

  await repo.removeMemberById(membership.id);
}

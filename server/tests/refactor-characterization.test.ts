import { assertEmail } from '../src/lib/validation';
import { updateTask } from '../src/modules/tasks/tasks.service';
import { db } from '../src/lib/db';

describe('Caracterización posterior a los refactors', () => {
  describe('assertEmail', () => {
    it('recorta espacios y normaliza mayúsculas', () => {
      expect(assertEmail('  Ana.Pereira@EXAMPLE.COM  ')).toBe('ana.pereira@example.com');
    });

    it.each([undefined, null, 12, '', 'ana', 'ana@', '@example.com', 'ana@example', 'a b@example.com'])(
      'rechaza el valor inválido %p',
      (value) => {
        expect(() => assertEmail(value)).toThrow('Email must be a valid address');
      },
    );

    it('acepta puntos, guiones, porcentaje y guion bajo en la parte local', () => {
      expect(assertEmail('a.b-c_d%tag@example.com')).toBe('a.b-c_d%tag@example.com');
    });
  });

  describe('updateTask', () => {
    async function escenario() {
      const owner = await db.user.create({
        data: { email: `owner-${Date.now()}-${Math.random()}@test.com`, passwordHash: 'unused' },
      });
      const project = await db.project.create({
        data: { name: 'Caracterización', ownerId: owner.id },
      });
      await db.projectMember.create({
        data: { projectId: project.id, userId: owner.id, role: 'OWNER' },
      });
      const task = await db.task.create({
        data: { title: 'Tarea original', description: 'Descripción', projectId: project.id },
      });
      return { owner, project, task };
    }

    it('conserva los campos omitidos y permite limpiar la descripción', async () => {
      const { owner, task } = await escenario();
      const result = await updateTask(task.id, owner.id, { title: '  Nuevo título  ', description: null });
      expect(result).toMatchObject({ title: 'Nuevo título', description: null, status: 'TODO', priority: 'MEDIUM' });
      expect(await db.taskHistory.count({ where: { taskId: task.id } })).toBe(0);
    });

    it('una actualización vacía conserva la tarea y su fecha de actualización', async () => {
      const { owner, task } = await escenario();
      await updateTask(task.id, owner.id, {});
      expect(await db.task.findUnique({ where: { id: task.id } })).toEqual(task);
    });

    it('registra una transición una sola vez al repetir el mismo estado', async () => {
      const { owner, task } = await escenario();
      await updateTask(task.id, owner.id, { status: 'IN_PROGRESS' });
      await updateTask(task.id, owner.id, { status: 'IN_PROGRESS' });
      const history = await db.taskHistory.findMany({ where: { taskId: task.id } });
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ changedById: owner.id, fromStatus: 'TODO', toStatus: 'IN_PROGRESS' });
    });

    it('rechaza asignar a un usuario ajeno sin guardar los demás campos', async () => {
      const { owner, task } = await escenario();
      const outsider = await db.user.create({ data: { email: 'outsider@test.com', passwordHash: 'unused' } });
      await expect(updateTask(task.id, owner.id, { title: 'Cambio parcial', assigneeId: `user-${outsider.id}` }))
        .rejects.toMatchObject({ status: 400 });
      expect(await db.task.findUnique({ where: { id: task.id } })).toEqual(task);
    });

    it('rechaza reabrir una tarea terminada sin cambiarla ni agregar historial', async () => {
      const { owner, task } = await escenario();
      const terminada = await db.task.update({ where: { id: task.id }, data: { status: 'DONE' } });
      await expect(updateTask(task.id, owner.id, { title: 'Cambio parcial', status: 'TODO' }))
        .rejects.toMatchObject({ status: 422 });
      expect(await db.task.findUnique({ where: { id: task.id } })).toEqual(terminada);
      expect(await db.taskHistory.count({ where: { taskId: task.id } })).toBe(0);
    });

    it('devuelve 404 al actualizar una tarea inexistente', async () => {
      await expect(updateTask(2147483647, 1, { title: 'Inexistente' })).rejects.toMatchObject({ status: 404 });
    });
  });
});

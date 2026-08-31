import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  await db.taskTag.deleteMany();
  await db.tag.deleteMany();
  await db.comment.deleteMany();
  await db.taskHistory.deleteMany();
  await db.task.deleteMany();
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password1', 10);

  const ana = await db.user.create({
    data: { email: 'ana@test.com', name: 'Ana Pereira', passwordHash },
  });
  const bob = await db.user.create({
    data: { email: 'bob@test.com', name: 'Bob Silva', passwordHash },
  });
  const caro = await db.user.create({
    data: { email: 'caro@test.com', name: 'Caro Méndez', passwordHash },
  });

  const sitio = await db.project.create({
    data: {
      name: 'Rediseño del sitio',
      description: 'Renovación completa del sitio institucional',
      ownerId: ana.id,
    },
  });
  const app = await db.project.create({
    data: {
      name: 'App móvil',
      description: 'Primera versión de la app para Android e iOS',
      ownerId: bob.id,
    },
  });
  const legacy = await db.project.create({
    data: {
      name: 'Migración legacy',
      description: 'Proyecto cerrado el año pasado',
      ownerId: ana.id,
      archived: true,
    },
  });

  await db.projectMember.createMany({
    data: [
      { projectId: sitio.id, userId: ana.id, role: 'OWNER' },
      { projectId: sitio.id, userId: bob.id, role: 'MEMBER' },
      { projectId: app.id, userId: bob.id, role: 'OWNER' },
      { projectId: app.id, userId: caro.id, role: 'MEMBER' },
      { projectId: legacy.id, userId: ana.id, role: 'OWNER' },
      { projectId: legacy.id, userId: bob.id, role: 'MEMBER' },
    ],
  });

  const tasks = [
    { p: sitio.id, t: 'Implementar login', s: 'IN_PROGRESS', pr: 'HIGH', a: ana.id },
    { p: sitio.id, t: 'Revisar diseño de la home', s: 'TODO', pr: 'MEDIUM', a: bob.id },
    { p: sitio.id, t: 'Migrar contenidos', s: 'TODO', pr: 'LOW', a: null },
    { p: sitio.id, t: 'Configurar dominio', s: 'DONE', pr: 'MEDIUM', a: ana.id },
    { p: sitio.id, t: 'Ajustar accesibilidad', s: 'TODO', pr: 'HIGH', a: bob.id },
    { p: sitio.id, t: 'Optimizar imágenes', s: 'IN_PROGRESS', pr: 'LOW', a: null },
    { p: app.id, t: 'Definir arquitectura', s: 'DONE', pr: 'CRITICAL', a: bob.id },
    { p: app.id, t: 'Pantalla de onboarding', s: 'IN_PROGRESS', pr: 'HIGH', a: caro.id },
    { p: app.id, t: 'Integrar notificaciones push', s: 'TODO', pr: 'MEDIUM', a: null },
    { p: app.id, t: 'Publicar beta interna', s: 'TODO', pr: 'HIGH', a: caro.id },
    { p: app.id, t: 'Corregir crash al iniciar', s: 'TODO', pr: 'CRITICAL', a: bob.id },
    { p: app.id, t: 'Escribir textos legales', s: 'TODO', pr: 'LOW', a: null },
  ];

  const created = [];
  for (const t of tasks) {
    created.push(
      await db.task.create({
        data: { projectId: t.p, title: t.t, status: t.s, priority: t.pr, assigneeId: t.a },
      }),
    );
  }

  for (const task of created) {
    await db.taskHistory.create({
      data: { taskId: task.id, changedById: ana.id, fromStatus: null, toStatus: 'TODO' },
    });
  }

  const bodies = [
    'Arranco con esto hoy.',
    'Ojo que depende del endpoint de sesiones.',
    'Ya está el diseño aprobado.',
    'Lo pasé a revisión.',
    'Revisado y aprobado.',
  ];
  for (const body of bodies) {
    await db.comment.create({
      data: { taskId: created[0].id, authorId: bob.id, body },
    });
  }

  for (const name of ['backend', 'frontend', 'urgente', 'diseño']) {
    const tag = await db.tag.create({ data: { name } });
    await db.taskTag.create({ data: { taskId: created[0].id, tagId: tag.id } });
  }

  // eslint-disable-next-line no-console
  console.log('Seed listo: 3 usuarios, 3 proyectos, 12 tareas, 5 comentarios, 4 etiquetas.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

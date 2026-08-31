import cors from 'cors';
import express, { Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware/errors';
import authRoutes from './modules/auth/auth.routes';
import commentsRoutes from './modules/comments/comments.routes';
import projectsRoutes from './modules/projects/projects.routes';
import tasksRoutes from './modules/tasks/tasks.routes';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/comments', commentsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

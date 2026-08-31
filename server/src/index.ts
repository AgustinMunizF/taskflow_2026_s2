import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3000;

createApp().listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`TaskFlow API escuchando en http://localhost:${PORT}/api`);
});

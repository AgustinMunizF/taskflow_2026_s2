import { TaskCard } from '../components/TaskCard';
import { AppHeader } from '../components/AppHeader';
import { Locator, Page } from '@playwright/test';

/** Tablero de un proyecto: /projects/:projectId */
export class BoardPage {
  constructor(private readonly page: Page) {}

  get encabezado(): AppHeader {
    return new AppHeader(this.page.getByTestId('app-header'));
  }

  async ir(proyectoId: string): Promise<void> {
    await this.page.goto(`/projects/${proyectoId}`);
  }

  get tarjetas(): Locator {
    return this.page.getByTestId('task-card');
  }

  /** Una tarjeta concreta, para poder afirmar sobre ella sin que las demas interfieran. */
  tarjeta(titulo: string): TaskCard {
    return new TaskCard(this.page.getByTestId('task-card').filter({
      has: this.page.getByTestId('task-card-title').filter({ hasText: titulo }),
    }));
  }

  asignadoDe(titulo: string): Locator {
    return this.tarjeta(titulo).asignado;
  }

  vencimientoDe(titulo: string): Locator {
    return this.tarjeta(titulo).vencimiento;
  }

  prioridadDe(titulo: string): Locator {
    return this.tarjeta(titulo).prioridad;
  }

  async abrirTarea(titulo: string): Promise<void> {
    await this.tarjeta(titulo).abrir();
  }
}

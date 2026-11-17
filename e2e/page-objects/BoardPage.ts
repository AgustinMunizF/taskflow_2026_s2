import { Locator, Page } from '@playwright/test';
import { TaskCard } from '../components/TaskCard';

/** Tablero de un proyecto: /projects/:projectId */
export class BoardPage {
  constructor(private readonly page: Page) {}

  async ir(proyectoId: string): Promise<void> {
    await this.page.goto(`/projects/${proyectoId}`);
  }

  get tarjetas(): Locator {
    return this.page.getByTestId('task-card');
  }

  /** Una tarjeta concreta, para poder afirmar sobre ella sin que las demas interfieran. */
  tarjeta(titulo: string): TaskCard {
    const locator = this.page.getByTestId('task-card').filter({ hasText: titulo });
    return new TaskCard(locator);
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

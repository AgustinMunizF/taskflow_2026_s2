import { Locator, Page } from '@playwright/test';

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
  tarjeta(titulo: string): Locator {
    return this.page.getByTestId('task-card').filter({ hasText: titulo });
  }

  asignadoDe(titulo: string): Locator {
    return this.tarjeta(titulo).getByTestId('task-card-assignee');
  }

  vencimientoDe(titulo: string): Locator {
    return this.tarjeta(titulo).getByTestId('task-card-duedate');
  }

  prioridadDe(titulo: string): Locator {
    return this.tarjeta(titulo).getByTestId('task-card-priority');
  }

  async abrirTarea(titulo: string): Promise<void> {
    await this.tarjeta(titulo).getByTestId('task-card-title').click();
  }
}

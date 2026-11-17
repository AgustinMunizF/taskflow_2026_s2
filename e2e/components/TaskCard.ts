import { Locator } from '@playwright/test';

/** Componente reutilizable para una tarjeta concreta del tablero. */
export class TaskCard {
  constructor(private readonly locator: Locator) {}

  get root(): Locator {
    return this.locator;
  }

  get titulo(): Locator {
    return this.locator.getByTestId('task-card-title');
  }

  get asignado(): Locator {
    return this.locator.getByTestId('task-card-assignee');
  }

  get vencimiento(): Locator {
    return this.locator.getByTestId('task-card-duedate');
  }

  get prioridad(): Locator {
    return this.locator.getByTestId('task-card-priority');
  }

  get estado(): Locator {
    return this.locator.getByTestId('task-card-status-select');
  }

  async abrir(): Promise<void> {
    await this.titulo.click();
  }
}

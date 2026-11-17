import { Locator } from '@playwright/test';

export class TaskCard {
  constructor(readonly root: Locator) {}

  get titulo(): Locator {
    return this.root.getByTestId('task-card-title');
  }
  get asignado(): Locator {
    return this.root.getByTestId('task-card-assignee');
  }
  get vencimiento(): Locator {
    return this.root.getByTestId('task-card-duedate');
  }
  get prioridad(): Locator {
    return this.root.getByTestId('task-card-priority');
  }

  async abrir(): Promise<void> {
    await this.titulo.click();
  }
}

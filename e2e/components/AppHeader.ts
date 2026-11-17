import { Locator } from '@playwright/test';

export class AppHeader {
  constructor(readonly root: Locator) {}

  get email(): Locator {
    return this.root.getByTestId('header-user-email');
  }

  async irAProyectos(): Promise<void> {
    await this.root.getByTestId('header-home-link').click();
  }

  async salir(): Promise<void> {
    await this.root.getByTestId('logout-button').click();
  }
}

import { Locator } from '@playwright/test';

/** Componente compartido del encabezado autenticado. */
export class AppHeader {
  constructor(private readonly locator: Locator) {}

  get inicio(): Locator {
    return this.locator.getByTestId('header-home-link');
  }

  get emailUsuario(): Locator {
    return this.locator.getByTestId('header-user-email');
  }

  get salir(): Locator {
    return this.locator.getByTestId('logout-button');
  }
}

import { Locator, Page, Response } from '@playwright/test';

/** Pantalla de miembros de un proyecto: /projects/:projectId/members */
export class MembersPage {
  constructor(private readonly page: Page) {}

  async ir(proyectoId: string): Promise<void> {
    await this.page.goto(`/projects/${proyectoId}/members`);
  }

  get miembros(): Locator {
    return this.page.getByTestId('member-item');
  }

  miembro(email: string): Locator {
    return this.page.getByTestId('member-item').filter({ hasText: email });
  }

  async agregar(email: string): Promise<Response> {
    await this.page.getByTestId('member-email-input').fill(email);
    const respuesta = this.page.waitForResponse(
      (r) => r.url().includes('/members') && r.request().method() === 'POST',
    );
    await this.page.getByTestId('member-add-button').click();
    return respuesta;
  }

  async quitar(email: string): Promise<Response> {
    const respuesta = this.page.waitForResponse(
      (r) => r.url().includes('/members/') && r.request().method() === 'DELETE',
    );
    await this.miembro(email).getByTestId('member-remove-button').click();
    return respuesta;
  }
}

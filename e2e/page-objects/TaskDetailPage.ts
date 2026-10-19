import { Locator, Page, Response } from '@playwright/test';

/** Pantalla de detalle de una tarea: /projects/:projectId/tasks/:taskId */
export class TaskDetailPage {
  constructor(private readonly page: Page) {}

  async ir(proyectoId: string, tareaId: string): Promise<void> {
    await this.page.goto(`/projects/${proyectoId}/tasks/${tareaId}`);
  }

  get tituloInput(): Locator {
    return this.page.getByTestId('task-title-input');
  }

  get prioridadSelect(): Locator {
    return this.page.getByTestId('task-priority-select');
  }

  get asignadoSelect(): Locator {
    return this.page.getByTestId('task-assignee-select');
  }

  get vencimientoInput(): Locator {
    return this.page.getByTestId('task-duedate-input');
  }

  get vencimientoActual(): Locator {
    return this.page.getByTestId('task-duedate-value');
  }

  get etiquetas(): Locator {
    return this.page.getByTestId('tag-chip');
  }

  get nombresDeEtiquetas(): Locator {
    return this.page.getByTestId('tag-chip-name');
  }

  get mensajeDeError(): Locator {
    return this.page.locator('.error, [role="alert"]');
  }

  /** Guarda el formulario y devuelve la respuesta del PATCH. */
  async guardar(): Promise<Response> {
    const respuesta = this.page.waitForResponse(
      (r) => r.url().includes('/api/tasks/') && r.request().method() === 'PATCH',
    );
    await this.page.getByTestId('task-save-button').click();
    return respuesta;
  }

  /** Agrega una etiqueta y devuelve la respuesta del POST. */
  async agregarEtiqueta(nombre: string): Promise<Response> {
    await this.page.getByTestId('tag-add-input').fill(nombre);
    const respuesta = this.page.waitForResponse(
      (r) => r.url().includes('/tags') && r.request().method() === 'POST',
    );
    await this.page.getByTestId('tag-add-button').click();
    return respuesta;
  }

  /** Quita la primera etiqueta de la lista y devuelve la respuesta del DELETE. */
  async quitarPrimeraEtiqueta(): Promise<Response> {
    const respuesta = this.page.waitForResponse(
      (r) => r.url().includes('/tags/') && r.request().method() === 'DELETE',
    );
    await this.page.getByTestId('tag-remove-button').first().click();
    return respuesta;
  }

  async borrarTarea(): Promise<Response> {
    const respuesta = this.page.waitForResponse(
      (r) => r.url().includes('/api/tasks/') && r.request().method() === 'DELETE',
    );
    await this.page.getByTestId('task-delete-button').click();
    return respuesta;
  }
}

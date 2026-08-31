import { invalidTransition } from '../../lib/http';
import type { Status } from '../../lib/validation';

/**
 * Reglas de transición de estado de una tarea.
 * Válidas: TODO -> IN_PROGRESS, IN_PROGRESS -> DONE, IN_PROGRESS -> TODO.
 */
const FORBIDDEN_TRANSITIONS: Array<[Status, Status]> = [
  ['DONE', 'TODO'],
  ['DONE', 'IN_PROGRESS'],
];

export function assertTransition(from: Status, to: Status): void {
  if (from === to) return;

  const blocked = FORBIDDEN_TRANSITIONS.some(([f, t]) => f === from && t === to);
  if (blocked) {
    throw invalidTransition(`Cannot move a task from ${from} to ${to}`);
  }
}

import type { ReactNode } from 'react';

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="loading" data-testid="loading" role="status">
      {label}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="error" data-testid="error-message" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="empty" data-testid="empty-state">
      {children}
    </p>
  );
}

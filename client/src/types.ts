export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  archived: boolean;
  createdAt: string;
}

export interface TaskAssignee {
  id: string;
  email: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskAssignee | null;
  commentCount?: number;
  tags?: Tag[];
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: number;
  taskId: string;
  changedBy: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
}

export interface Member {
  userId: string;
  email: string;
  role: string;
}

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Hecho',
};

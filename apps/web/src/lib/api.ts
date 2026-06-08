import axios from 'axios';
import type { TaskDto } from '@conductor/shared-types';

const baseURL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export async function createTask(
  goal: string,
  taskType: string
): Promise<{ taskId: string }> {
  const { data } = await api.post<{ taskId: string }>('/tasks', {
    goal,
    taskType,
  });
  return data;
}

export async function getTasks(): Promise<TaskDto[]> {
  const { data } = await api.get<TaskDto[]>('/tasks');
  return data;
}

export async function getTask(id: string): Promise<TaskDto> {
  const { data } = await api.get<TaskDto>(`/tasks/${id}`);
  return data;
}

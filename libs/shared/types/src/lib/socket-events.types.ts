import type { ExecutionPlan, PlannedStep } from './task.types';

export interface TaskPlanningEvent {
  taskId: string;
  message: string;
  steps: PlannedStep[] | ExecutionPlan['steps'];
  plan?: ExecutionPlan;
}

export interface TaskStepEvent {
  taskId: string;
  stepNumber: number;
  message: string;
  status: 'INFO' | 'SUCCESS' | 'ERROR' | 'SCREENSHOT';
  screenshotB64?: string;
}

export interface TaskFrameEvent {
  taskId: string;
  frameIndex: number;
  screenshotB64: string;
  timestamp: string;
}

export interface TaskHighlightEvent {
  taskId: string;
  selector: string;
  index: number;
  message?: string;
  timestamp: string;
}

export interface TaskCompletedEvent {
  taskId: string;
  result: unknown;
}

export interface TaskErrorEvent {
  taskId: string;
  message: string;
}

export interface ServerToClientEvents {
  'task:planning': (data: TaskPlanningEvent) => void;
  'task:step': (data: TaskStepEvent) => void;
  'task:frame': (data: TaskFrameEvent) => void;
  'task:highlight': (data: TaskHighlightEvent) => void;
  'task:completed': (data: TaskCompletedEvent) => void;
  'task:error': (data: TaskErrorEvent) => void;
}

export interface ClientToServerEvents {
  'task:subscribe': (data: { taskId: string }) => void;
}

export interface EventsMap {
  ServerToClient: ServerToClientEvents;
  ClientToServer: ClientToServerEvents;
}

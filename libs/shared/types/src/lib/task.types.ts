export enum TaskStatus {
  PENDING = 'PENDING',
  PLANNING = 'PLANNING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type StepAction =
  | 'navigate'
  | 'extract'
  | 'search'
  | 'screenshot'
  | 'summarise';

export interface PlannedStep {
  stepNumber: number;
  action: StepAction;
  target: string;
  description: string;
  expectedOutput: string;
}

export type ExecutionPlanVersion = 2;

export type ExecutionPlanStep =
  | {
      type: 'navigate';
      stepNumber: number;
      url: string;
      description: string;
    }
  | {
      type: 'search';
      stepNumber: number;
      query: string;
      engine?: 'google';
      description: string;
    }
  | {
      type: 'waitForSelector';
      stepNumber: number;
      selector: string;
      timeoutMs?: number;
      description: string;
    }
  | {
      type: 'type';
      stepNumber: number;
      selector: string;
      text: string;
      submit?: boolean;
      description: string;
    }
  | {
      type: 'click';
      stepNumber: number;
      selector: string;
      description: string;
    }
  | {
      type: 'scroll';
      stepNumber: number;
      mode: 'smooth-bottom' | 'page';
      scrollY?: number;
      description: string;
    }
  | {
      type: 'extract';
      stepNumber: number;
      prompt: string;
      limit?: number;
      selectorHint?: string;
      description: string;
    }
  | {
      type: 'highlight';
      stepNumber: number;
      selector: string;
      index: number;
      message?: string;
      description: string;
    }
  | {
      type: 'summarise';
      stepNumber: number;
      text: string;
      description: string;
    }
  | {
      type: 'healthCheck';
      stepNumber: number;
      url: string;
      description: string;
    };

export interface ExecutionPlan {
  version: ExecutionPlanVersion;
  site: string;
  targetUrl: string;
  searchQuery?: string;
  extractLimit?: number;
  steps: ExecutionPlanStep[];
}

export type LogStatus = 'INFO' | 'SUCCESS' | 'ERROR' | 'SCREENSHOT';

export interface ExecutionLogDto {
  id: string;
  taskId: string;
  stepNumber: number;
  message: string;
  screenshotB64?: string;
  status: LogStatus;
  createdAt: string;
}

export interface TaskDto {
  id: string;
  goal: string;
  status: TaskStatus;
  taskType: string;
  stepsJson: PlannedStep[] | null;
  resultJson: unknown;
  createdAt: string;
  logs: ExecutionLogDto[];
}

export type TaskType = 'web-search' | 'scraper' | 'health-check';

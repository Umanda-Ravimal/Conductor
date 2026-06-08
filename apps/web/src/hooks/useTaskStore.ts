import { create } from 'zustand';
import {
  TaskStatus,
  type ExecutionLogDto,
} from '@conductor/shared-types';

export interface TaskFrame {
  screenshotB64: string;
  timestamp: string;
}

export interface TaskHighlight {
  selector: string;
  index: number;
  message?: string;
  timestamp: string;
}

interface TaskStore {
  currentTaskId: string | null;
  status: TaskStatus;
  logs: ExecutionLogDto[];
  result: unknown;
  latestScreenshot: string | null;
  frames: TaskFrame[];
  highlights: TaskHighlight[];
  setTask: (taskId: string) => void;
  addLog: (log: ExecutionLogDto) => void;
  setResult: (result: unknown) => void;
  setStatus: (status: TaskStatus) => void;
  setScreenshot: (screenshotB64: string) => void;
  addFrame: (frame: TaskFrame) => void;
  addHighlight: (highlight: TaskHighlight) => void;
  reset: () => void;
}

const initialState = {
  currentTaskId: null as string | null,
  status: TaskStatus.PENDING,
  logs: [] as ExecutionLogDto[],
  result: null as unknown,
  latestScreenshot: null as string | null,
  frames: [] as TaskFrame[],
  highlights: [] as TaskHighlight[],
};

export const useTaskStore = create<TaskStore>((set) => ({
  ...initialState,
  setTask: (taskId) =>
    set({
      currentTaskId: taskId,
      status: TaskStatus.PENDING,
      logs: [],
      result: null,
      latestScreenshot: null,
      frames: [],
      highlights: [],
    }),
  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log],
      latestScreenshot: log.screenshotB64 ?? state.latestScreenshot,
    })),
  setResult: (result) => set({ result, status: TaskStatus.COMPLETED }),
  setStatus: (status) => set({ status }),
  setScreenshot: (screenshotB64) => set({ latestScreenshot: screenshotB64 }),
  addFrame: (frame) =>
    set((state) => {
      const next = [...state.frames, frame];
      const capped = next.length > 30 ? next.slice(next.length - 30) : next;
      return {
        frames: capped,
        latestScreenshot: frame.screenshotB64,
      };
    }),
  addHighlight: (highlight) =>
    set((state) => ({
      highlights: [...state.highlights, highlight],
    })),
  reset: () => set(initialState),
}));

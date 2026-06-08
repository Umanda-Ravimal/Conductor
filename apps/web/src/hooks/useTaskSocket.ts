'use client';

import { useEffect, useState } from 'react';
import {
  TaskStatus,
  type ExecutionLogDto,
  type TaskFrameEvent,
  type TaskHighlightEvent,
  type TaskStepEvent,
} from '@conductor/shared-types';
import { getSocket } from '../lib/socket';
import { useTaskStore } from './useTaskStore';

interface UseTaskSocketResult {
  logs: ExecutionLogDto[];
  result: unknown;
  status: TaskStatus;
  isConnected: boolean;
}

export function useTaskSocket(taskId: string | null): UseTaskSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const logs = useTaskStore((s) => s.logs);
  const result = useTaskStore((s) => s.result);
  const status = useTaskStore((s) => s.status);
  const addLog = useTaskStore((s) => s.addLog);
  const setResult = useTaskStore((s) => s.setResult);
  const setStatus = useTaskStore((s) => s.setStatus);
  const setScreenshot = useTaskStore((s) => s.setScreenshot);
  const addFrame = useTaskStore((s) => s.addFrame);
  const addHighlight = useTaskStore((s) => s.addHighlight);

  useEffect(() => {
    if (!taskId) {
      return;
    }

    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const stepToLog = (event: TaskStepEvent): ExecutionLogDto => ({
      id: `${event.taskId}-${event.stepNumber}-${Date.now()}`,
      taskId: event.taskId,
      stepNumber: event.stepNumber,
      message: event.message,
      screenshotB64: event.screenshotB64,
      status: event.status,
      createdAt: new Date().toISOString(),
    });

    const onPlanning = (data: {
      taskId: string;
      message: string;
    }) => {
      if (data.taskId !== taskId) return;
      setStatus(TaskStatus.PLANNING);
      addLog({
        id: `planning-${Date.now()}`,
        taskId,
        stepNumber: 0,
        message: data.message,
        status: 'INFO',
        createdAt: new Date().toISOString(),
      });
    };

    const onStep = (data: TaskStepEvent) => {
      if (data.taskId !== taskId) return;
      setStatus(TaskStatus.RUNNING);
      addLog(stepToLog(data));
      if (data.screenshotB64) {
        setScreenshot(data.screenshotB64);
      }
    };

    const onFrame = (data: TaskFrameEvent) => {
      if (data.taskId !== taskId) return;
      addFrame({ screenshotB64: data.screenshotB64, timestamp: data.timestamp });
    };

    const onHighlight = (data: TaskHighlightEvent) => {
      if (data.taskId !== taskId) return;
      addHighlight({
        selector: data.selector,
        index: data.index,
        message: data.message,
        timestamp: data.timestamp,
      });
      addLog({
        id: `highlight-${Date.now()}`,
        taskId,
        stepNumber: 0,
        message: data.message ?? `Highlighted item ${data.index + 1}`,
        status: 'INFO',
        createdAt: new Date().toISOString(),
      });
    };

    const onCompleted = (data: { taskId: string; result: unknown }) => {
      if (data.taskId !== taskId) return;
      setResult(data.result);
    };

    const onError = (data: { taskId: string; message: string }) => {
      if (data.taskId !== taskId) return;
      setStatus(TaskStatus.FAILED);
      addLog({
        id: `error-${Date.now()}`,
        taskId,
        stepNumber: 0,
        message: data.message,
        status: 'ERROR',
        createdAt: new Date().toISOString(),
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('task:planning', onPlanning);
    socket.on('task:step', onStep);
    socket.on('task:frame', onFrame);
    socket.on('task:highlight', onHighlight);
    socket.on('task:completed', onCompleted);
    socket.on('task:error', onError);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('task:planning', onPlanning);
      socket.off('task:step', onStep);
      socket.off('task:frame', onFrame);
      socket.off('task:highlight', onHighlight);
      socket.off('task:completed', onCompleted);
      socket.off('task:error', onError);
    };
  }, [taskId, addLog, addFrame, addHighlight, setResult, setStatus, setScreenshot]);

  return { logs, result, status, isConnected };
}

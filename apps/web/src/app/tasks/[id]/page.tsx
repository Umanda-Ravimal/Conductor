'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { TaskStatus } from '@conductor/shared-types';
import { ExecutionPanel } from '../../../components/ExecutionPanel/ExecutionPanel';
import { ResultPanel } from '../../../components/ResultPanel/ResultPanel';
import { Spinner } from '../../../components/ui/spinner';
import { Card, CardContent } from '../../../components/ui/card';
import { useTaskSocket } from '../../../hooks/useTaskSocket';
import { useTaskStore } from '../../../hooks/useTaskStore';
import { getTask } from '../../../lib/api';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = typeof params['id'] === 'string' ? params['id'] : null;

  const setTask = useTaskStore((s) => s.setTask);
  const logs = useTaskStore((s) => s.logs);
  const result = useTaskStore((s) => s.result);
  const status = useTaskStore((s) => s.status);
  const latestScreenshot = useTaskStore((s) => s.latestScreenshot);
  const frames = useTaskStore((s) => s.frames);
  const setStatus = useTaskStore((s) => s.setStatus);
  const addLog = useTaskStore((s) => s.addLog);
  const setResult = useTaskStore((s) => s.setResult);

  const { isConnected } = useTaskSocket(taskId);
  const resultRef = useRef<HTMLDivElement>(null);
  const seenLiveProgressRef = useRef(false);
  const [hydrating, setHydrating] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    seenLiveProgressRef.current = false;
  }, [taskId]);

  useEffect(() => {
    if (
      status === TaskStatus.PLANNING ||
      status === TaskStatus.RUNNING
    ) {
      seenLiveProgressRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (status !== TaskStatus.COMPLETED || result == null) return;
    if (!seenLiveProgressRef.current) return;

    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [status, result]);

  useEffect(() => {
    if (!taskId) return;
    setHydrating(true);
    setLoadError(null);
    setTask(taskId);
    void getTask(taskId)
      .then((task) => {
        setStatus(task.status);
        task.logs.forEach((log) => addLog(log));
        if (task.resultJson) {
          setResult(task.resultJson);
        }
        const lastShot = [...task.logs]
          .reverse()
          .find((l) => l.screenshotB64)?.screenshotB64;
        if (lastShot) {
          useTaskStore.getState().setScreenshot(lastShot);
        }
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load task';
        setLoadError(message);
      })
      .finally(() => setHydrating(false));
  }, [taskId, setTask, setStatus, addLog, setResult]);

  if (!taskId) {
    return <p>Invalid task ID</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Task Execution</h1>
        <p className="text-sm text-muted-foreground font-mono">{taskId}</p>
      </div>
      {loadError && (
        <p className="text-sm text-destructive">{loadError}</p>
      )}
      {hydrating ? (
        <Card>
          <CardContent className="flex h-[420px] flex-col items-center justify-center gap-3">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Loading execution…</p>
          </CardContent>
        </Card>
      ) : (
        <ExecutionPanel
          logs={logs}
          status={status}
          isConnected={isConnected}
          latestScreenshot={latestScreenshot}
          frames={frames}
        />
      )}
      {result !== null && result !== undefined && (
        <div ref={resultRef} id="task-result" className="scroll-mt-8">
          <ResultPanel result={result} />
        </div>
      )}
    </div>
  );
}

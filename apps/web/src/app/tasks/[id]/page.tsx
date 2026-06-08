'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ExecutionPanel } from '../../../components/ExecutionPanel/ExecutionPanel';
import { ResultPanel } from '../../../components/ResultPanel/ResultPanel';
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

  useEffect(() => {
    if (!taskId) return;
    setTask(taskId);
    void getTask(taskId).then((task) => {
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
    });
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
      <ExecutionPanel
        logs={logs}
        status={status}
        isConnected={isConnected}
        latestScreenshot={latestScreenshot}
        frames={frames}
      />
      {result !== null && result !== undefined && (
        <ResultPanel result={result} />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { Textarea } from '../ui/textarea';
import { createTask } from '../../lib/api';
import { useTaskStore } from '../../hooks/useTaskStore';
import {
  mapTaskTypeToApi,
  TaskTypeSelector,
  type TaskTypeOption,
} from './TaskTypeSelector';

export function TaskInput() {
  const router = useRouter();
  const setTask = useTaskStore((s) => s.setTask);
  const [goal, setGoal] = useState('');
  const [taskType, setTaskType] = useState<TaskTypeOption>('web-search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!goal.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { taskId } = await createTask(
        goal.trim(),
        mapTaskTypeToApi(taskType)
      );
      setTask(taskId);
      router.push(`/tasks/${taskId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start task';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-4">
      {loading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Starting agent…</p>
          </div>
        </div>
      )}
      <Textarea
        placeholder="Search for the top 5 NestJS open source projects on GitHub and summarise them"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={5}
        disabled={loading}
      />
      <div className="max-w-xs">
        <TaskTypeSelector value={taskType} onChange={setTaskType} disabled={loading} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={() => void handleSubmit()} disabled={loading || !goal.trim()}>
        {loading ? (
          <>
            <Spinner className="mr-2 text-primary-foreground" />
            Starting…
          </>
        ) : (
          'Run Agent'
        )}
      </Button>
    </div>
  );
}

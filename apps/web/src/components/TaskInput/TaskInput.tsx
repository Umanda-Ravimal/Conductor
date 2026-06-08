'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
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
    if (!goal.trim()) return;
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Search for the top 5 NestJS open source projects on GitHub and summarise them"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={5}
      />
      <div className="max-w-xs">
        <TaskTypeSelector value={taskType} onChange={setTaskType} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={() => void handleSubmit()} disabled={loading || !goal.trim()}>
        {loading ? 'Starting…' : 'Run Agent'}
      </Button>
    </div>
  );
}

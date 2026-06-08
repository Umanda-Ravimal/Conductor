'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TaskStatus, type TaskDto } from '@conductor/shared-types';
import { getTasks } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

function statusVariant(
  status: TaskStatus
): 'default' | 'secondary' | 'success' | 'error' | 'warning' {
  switch (status) {
    case TaskStatus.COMPLETED:
      return 'success';
    case TaskStatus.FAILED:
      return 'error';
    case TaskStatus.RUNNING:
    case TaskStatus.PLANNING:
      return 'warning';
    default:
      return 'secondary';
  }
}

export function TaskHistory() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getTasks()
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Task History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        )}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/tasks/${task.id}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="line-clamp-2 text-sm font-medium">{task.goal}</p>
                  <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {task.taskType} · {new Date(task.createdAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

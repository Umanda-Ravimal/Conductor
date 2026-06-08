'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { ExecutionLogDto, TaskStatus } from '@conductor/shared-types';
import { StepLog } from './StepLog';
import { BrowserStreamViewer } from './BrowserStreamViewer';
import type { TaskFrame } from '../../hooks/useTaskStore';

interface ExecutionPanelProps {
  logs: ExecutionLogDto[];
  status: TaskStatus;
  isConnected: boolean;
  latestScreenshot: string | null;
  frames: TaskFrame[];
}

export function ExecutionPanel({
  logs,
  status,
  isConnected,
  latestScreenshot,
  frames,
}: ExecutionPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Live Execution</CardTitle>
          <div className="flex gap-2">
            <Badge variant={isConnected ? 'success' : 'secondary'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="outline">{status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Waiting for agent steps…</p>
          ) : (
            logs.map((log) => <StepLog key={log.id} log={log} />)
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Browser View</CardTitle>
        </CardHeader>
        <CardContent>
          {frames.length > 0 ? (
            <BrowserStreamViewer frames={frames} />
          ) : (
            // fallback to legacy single screenshot
            <div className="text-sm text-muted-foreground">
              {latestScreenshot ? 'Waiting for live stream…' : 'Waiting for browser…'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

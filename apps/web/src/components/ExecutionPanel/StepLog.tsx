'use client';

import { CheckCircle2, Circle, Image, XCircle } from 'lucide-react';
import type { ExecutionLogDto } from '@conductor/shared-types';
import { cn } from '../../lib/utils';

interface StepLogProps {
  log: ExecutionLogDto;
}

export function StepLog({ log }: StepLogProps) {
  const Icon =
    log.status === 'SUCCESS'
      ? CheckCircle2
      : log.status === 'ERROR'
        ? XCircle
        : log.status === 'SCREENSHOT'
          ? Image
          : Circle;

  const color =
    log.status === 'SUCCESS'
      ? 'text-emerald-400'
      : log.status === 'ERROR'
        ? 'text-red-400'
        : log.status === 'SCREENSHOT'
          ? 'text-blue-400'
          : 'text-muted-foreground';

  return (
    <div className="flex gap-3 py-2 border-b border-border/50 last:border-0">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="text-muted-foreground">Step {log.stepNumber}: </span>
          {log.message}
        </p>
      </div>
    </div>
  );
}

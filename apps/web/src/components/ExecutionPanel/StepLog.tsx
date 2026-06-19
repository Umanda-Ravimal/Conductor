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
    <div className="flex gap-3 rounded-md bg-highlight px-3 py-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border">
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="text-muted-foreground">Step {log.stepNumber}: </span>
          {log.message}
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import type { TaskFrame } from '../../hooks/useTaskStore';

interface BrowserStreamViewerProps {
  frames: TaskFrame[];
}

export function BrowserStreamViewer({ frames }: BrowserStreamViewerProps) {
  const latest = useMemo(() => frames[frames.length - 1] ?? null, [frames]);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!latest) return;
    setFading(true);
    const timer = setTimeout(() => {
      setDisplaySrc(`data:image/jpeg;base64,${latest.screenshotB64}`);
      setFading(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [latest]);

  if (!displaySrc) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-highlight text-sm text-muted-foreground">
        Waiting for live frames…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-highlight">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt="Browser stream frame"
        className={cn(
          'h-auto w-full transition-opacity duration-200',
          fading ? 'opacity-40' : 'opacity-100'
        )}
      />
    </div>
  );
}


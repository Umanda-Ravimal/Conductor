'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TaskFrame } from '../../hooks/useTaskStore';

interface BrowserStreamViewerProps {
  frames: TaskFrame[];
}

export function BrowserStreamViewer({ frames }: BrowserStreamViewerProps) {
  const latest = useMemo(() => frames[frames.length - 1] ?? null, [frames]);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    if (!latest) return;

    const src = `data:image/jpeg;base64,${latest.screenshotB64}`;
    const img = new Image();
    let cancelled = false;

    img.onload = () => {
      if (!cancelled) setDisplaySrc(src);
    };
    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [latest?.screenshotB64, latest?.timestamp]);

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
        className="h-auto w-full"
      />
    </div>
  );
}


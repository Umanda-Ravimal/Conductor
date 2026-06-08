'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface ScreenshotViewerProps {
  screenshotB64: string | null;
}

export function ScreenshotViewer({ screenshotB64 }: ScreenshotViewerProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!screenshotB64) return;
    setFading(true);
    const timer = setTimeout(() => {
      setDisplaySrc(`data:image/png;base64,${screenshotB64}`);
      setFading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [screenshotB64]);

  if (!displaySrc) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Waiting for browser screenshot…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt="Browser screenshot"
        className={cn(
          'h-auto w-full transition-opacity duration-300',
          fading ? 'opacity-40' : 'opacity-100'
        )}
      />
    </div>
  );
}

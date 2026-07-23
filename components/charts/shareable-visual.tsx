'use client';

import { useCallback, useRef, useState, type ReactNode, type RefObject } from 'react';
import { toPng } from 'html-to-image';
import { Check, Loader2, Share2 } from 'lucide-react';
import type { VisualType } from '@/types/chapter';

interface ShareChartButtonProps {
  captureRef: RefObject<HTMLElement | null>;
  visualType: VisualType;
  title?: string;
}

type ShareState = 'idle' | 'exporting' | 'done' | 'error';

const filenameFor = (visualType: VisualType): string => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `meridian-${visualType}-${stamp}.png`;
};

const downloadPng = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
};

const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'image/png' });
};

/** Accessible PNG share/download control; pair with ShareableVisual capture root. */
export const ShareChartButton = ({
  captureRef,
  visualType,
  title,
}: ShareChartButtonProps): JSX.Element => {
  const [state, setState] = useState<ShareState>('idle');

  const exportPng = useCallback(async (): Promise<void> => {
    const node = captureRef.current;
    if (!node || state === 'exporting') return;
    setState('exporting');
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#fcfcfb',
        filter: (element) => {
          if (!(element instanceof HTMLElement)) return true;
          return !element.hasAttribute('data-export-ignore');
        },
      });
      const filename = filenameFor(visualType);
      const file = await dataUrlToFile(dataUrl, filename);
      const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canShare) {
        try {
          await navigator.share({
            files: [file],
            title: title ?? 'Meridian chart',
            text: title ?? 'Meridian product intelligence chart',
          });
        } catch (shareErr) {
          if (shareErr instanceof DOMException && shareErr.name === 'AbortError') {
            setState('idle');
            return;
          }
          downloadPng(dataUrl, filename);
        }
      } else {
        downloadPng(dataUrl, filename);
      }
      setState('done');
      window.setTimeout(() => setState('idle'), 1800);
    } catch {
      setState('error');
      window.setTimeout(() => setState('idle'), 2400);
    }
  }, [captureRef, state, title, visualType]);

  return (
    <div className="flex items-center gap-2" data-export-ignore>
      {state === 'error' && (
        <span className="rounded-lg bg-coral-soft px-2 py-1 text-[11px] font-medium text-coral" role="status">
          Export failed
        </span>
      )}
      <button
        type="button"
        onClick={() => void exportPng()}
        disabled={state === 'exporting'}
        aria-label="Share chart as PNG"
        title="Share chart as PNG"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-secondary shadow-depth-4 transition hover:border-accent/30 hover:text-accent hover:shadow-depth-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      >
        {state === 'exporting' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : state === 'done' ? (
          <Check className="h-3.5 w-3.5 text-aqua" aria-hidden="true" />
        ) : (
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {state === 'exporting' ? 'Exporting…' : state === 'done' ? 'Saved' : 'Share'}
      </button>
    </div>
  );
};

interface ShareableVisualProps {
  visualType: VisualType;
  title?: string;
  children: ReactNode;
}

/** Capture root + Share control for every visual rendered on the canvas. */
export const ShareableVisual = ({
  visualType,
  title,
  children,
}: ShareableVisualProps): JSX.Element => {
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ShareChartButton captureRef={captureRef} visualType={visualType} title={title} />
      </div>
      <div
        ref={captureRef}
        className="rounded-2xl bg-card-strong ring-1 ring-black/[0.04]"
      >
        {title && (
          <p className="border-b border-line/70 px-4 py-3 font-display text-sm font-semibold tracking-tight text-ink">
            {title}
          </p>
        )}
        <div className="p-1">{children}</div>
      </div>
    </div>
  );
};

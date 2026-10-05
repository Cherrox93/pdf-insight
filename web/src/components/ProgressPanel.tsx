import { Check, FileText, LoaderCircle, ScanText, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buttonSecondary } from '../lib/styles';
import type { Step } from '../lib/useAnalysis';

interface ProgressPanelProps {
  fileName: string;
  step: Step;
  detail: string;
  withOcr: boolean;
  onCancel: () => void;
}

const STEPS: Record<Step, { label: string; icon: typeof Sparkles }> = {
  extract: { label: 'Odczyt tekstu', icon: FileText },
  ocr: { label: 'OCR skanów', icon: ScanText },
  analyze: { label: 'Analiza AI', icon: Sparkles },
};

/** F-06: stan ładowania - kroki, postęp, licznik czasu i szkielet przyszłego wyniku. */
export function ProgressPanel({ fileName, step, detail, withOcr, onCancel }: ProgressPanelProps) {
  const [elapsed, setElapsed] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const steps: Step[] =
    withOcr || step === 'ocr' ? ['extract', 'ocr', 'analyze'] : ['extract', 'analyze'];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-4">
      <section aria-labelledby="progress-heading" className="card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">Analizuję dokument</p>
            <h2
              id="progress-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {fileName}
            </h2>
          </div>
          <span
            className="shrink-0 rounded-full bg-surface-muted px-3 py-1 font-mono text-sm tabular-nums text-muted"
            aria-hidden="true"
          >
            {elapsed}s
          </span>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-flow-col sm:auto-cols-fr">
          {steps.map((item, index) => {
            const status =
              index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
            const { label, icon: Icon } = STEPS[item];
            return (
              <li
                key={item}
                aria-current={status === 'current' ? 'step' : undefined}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  status === 'current'
                    ? 'border-accent-text/40 bg-accent-soft'
                    : 'border-border bg-surface-muted/50'
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    status === 'done'
                      ? 'bg-accent text-accent-ink'
                      : status === 'current'
                        ? 'bg-surface-solid text-accent-text'
                        : 'bg-surface-solid text-muted'
                  }`}
                  aria-hidden="true"
                >
                  {status === 'done' ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : status === 'current' ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span className={`text-sm ${status === 'todo' ? 'text-muted' : 'font-medium'}`}>
                  {label}
                  <span className="sr-only">
                    {status === 'done' ? ' (ukończono)' : status === 'current' ? ' (w toku)' : ''}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 h-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <div className="h-full w-1/4 animate-[progress_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-accent to-violet" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {detail}
          </p>
          <button type="button" onClick={onCancel} className={buttonSecondary}>
            <X aria-hidden="true" />
            Anuluj
          </button>
        </div>
      </section>

      {/* Szkielet wyniku - sygnalizuje, czego się spodziewać. */}
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        <div className="card space-y-3 p-6 sm:col-span-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
        </div>
        <div className="card space-y-3 p-6">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

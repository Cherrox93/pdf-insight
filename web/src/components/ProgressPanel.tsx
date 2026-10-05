import { useEffect, useRef, useState } from 'react';
import type { Step } from '../lib/useAnalysis';

interface ProgressPanelProps {
  fileName: string;
  step: Step;
  detail: string;
  withOcr: boolean;
  onCancel: () => void;
}

const STEP_LABELS: Record<Step, string> = {
  extract: 'Odczyt tekstu',
  ocr: 'OCR skanów',
  analyze: 'Analiza AI',
};

/** F-06: stan ładowania z postępem kroków i licznikiem czasu. */
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
    <section
      aria-labelledby="progress-heading"
      className="rounded-xl border border-border bg-surface p-6 sm:p-8"
    >
      <h2
        id="progress-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold break-words"
      >
        Analizuję: {fileName}
      </h2>

      <ol className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-6">
        {steps.map((item, index) => {
          const status =
            index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
          return (
            <li
              key={item}
              className="flex items-center gap-2"
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  status === 'done'
                    ? 'bg-accent text-bg'
                    : status === 'current'
                      ? 'border-2 border-accent text-accent'
                      : 'border border-border text-muted'
                }`}
              >
                {status === 'done' ? '✓' : index + 1}
              </span>
              <span className={status === 'todo' ? 'text-muted' : 'font-medium'}>
                {STEP_LABELS[item]}
                <span className="sr-only">
                  {status === 'done' ? ' (ukończono)' : status === 'current' ? ' (w toku)' : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div className="h-full w-1/3 animate-[progress_1.4s_ease-in-out_infinite] rounded-full bg-accent" />
      </div>

      <p className="mt-4 text-muted" role="status" aria-live="polite">
        {detail}
      </p>
      <p className="mt-1 font-mono text-sm text-muted" aria-hidden="true">
        {elapsed} s
      </p>

      <button
        type="button"
        onClick={onCancel}
        className="mt-6 rounded-lg border border-border px-4 py-2 hover:border-text"
      >
        Anuluj
      </button>
    </section>
  );
}

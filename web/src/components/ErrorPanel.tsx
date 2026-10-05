import { FileUp, RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { buttonPrimary, buttonSecondary } from '../lib/styles';

interface ErrorPanelProps {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
  onReset: () => void;
}

/** F-06: błąd z opcją ponowienia. */
export function ErrorPanel({ message, canRetry, onRetry, onReset }: ErrorPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      role="alert"
      aria-labelledby="error-heading"
      className="card animate-fade-up mx-auto flex max-w-2xl flex-col items-center px-6 py-10 text-center sm:px-10"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-7" aria-hidden="true" />
      </span>
      <h2
        id="error-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-xl font-semibold tracking-tight"
      >
        Nie udało się przeanalizować dokumentu
      </h2>
      <p className="mt-2 max-w-md text-muted">{message}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {canRetry && (
          <button type="button" onClick={onRetry} className={buttonPrimary}>
            <RotateCcw aria-hidden="true" />
            Spróbuj ponownie
          </button>
        )}
        <button type="button" onClick={onReset} className={buttonSecondary}>
          <FileUp aria-hidden="true" />
          Wybierz inny plik
        </button>
      </div>
    </section>
  );
}

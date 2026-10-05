import { useEffect, useRef } from 'react';

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
      className="rounded-xl border border-danger/50 bg-danger/5 p-6 sm:p-8"
    >
      <h2 id="error-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold">
        Nie udało się przeanalizować dokumentu
      </h2>
      <p className="mt-2 text-danger">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg hover:bg-accent/90"
          >
            Spróbuj ponownie
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border px-5 py-2.5 hover:border-text"
        >
          Wybierz inny plik
        </button>
      </div>
    </section>
  );
}

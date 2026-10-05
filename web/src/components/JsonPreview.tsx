import { useState } from 'react';

interface JsonPreviewProps {
  json: string;
}

/** F-05: podgląd JSON — renderowany jako zwykły tekst (bez dangerouslySetInnerHTML). */
export function JsonPreview({ json }: JsonPreviewProps) {
  const [copyStatus, setCopyStatus] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopyStatus('Skopiowano JSON do schowka.');
    } catch {
      setCopyStatus('Nie udało się skopiować — zaznacz tekst ręcznie.');
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {copyStatus}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-text"
        >
          Kopiuj JSON
        </button>
      </div>
      {/* Przewijany region musi być osiągalny klawiaturą (WCAG 2.1.1). */}
      <pre
        role="region"
        tabIndex={0}
        aria-label="Wynik analizy w formacie JSON"
        className="max-h-[36rem] overflow-auto rounded-lg border border-border bg-bg p-4 font-mono text-xs leading-relaxed sm:text-sm"
      >
        {json}
      </pre>
    </div>
  );
}

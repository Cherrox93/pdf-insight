import { Info } from 'lucide-react';

/** Wymóg bezpieczeństwa: informacja, że treść pliku trafia do zewnętrznego API AI. */
export function PrivacyNotice() {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-2xl border border-warning/25 bg-warning-soft px-4 py-3.5 text-sm leading-relaxed"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-muted">
        <strong className="font-semibold text-text">
          Twój plik trafia do zewnętrznego API AI.
        </strong>{' '}
        Tekst odczytany z PDF (w przeglądarce) zostanie wysłany przez nasz serwer do modelu DeepSeek
        (serwery poza UE) w celu analizy. Nie przesyłaj dokumentów z danymi poufnymi lub osobowymi.
      </p>
    </div>
  );
}

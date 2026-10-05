/** Wymóg bezpieczeństwa: informacja, że treść pliku trafia do zewnętrznego API AI. */
export function PrivacyNotice() {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-warning">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-6h2zm0-8h-2V7h2z"
        />
      </svg>
      <p>
        <strong className="font-semibold">Twój plik trafia do zewnętrznego API AI.</strong> Tekst
        odczytany z PDF (w przeglądarce) zostanie wysłany przez nasz serwer do modelu DeepSeek
        (serwery poza UE) w celu analizy. Nie przesyłaj dokumentów zawierających dane poufne lub
        osobowe.
      </p>
    </div>
  );
}

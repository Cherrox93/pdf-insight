const STEPS = [
  { title: 'Wgranie PDF', description: 'Przeciągnij plik lub wybierz go z dysku.' },
  { title: 'Odczyt tekstu', description: 'Tekst odczytujemy w przeglądarce, skany przez OCR.' },
  { title: 'Analiza AI', description: 'Podsumowanie i dane strukturalne zgodne ze schematem.' },
  { title: 'Wynik', description: 'Przejrzyj wynik i pobierz plik JSON.' },
];

/** F-06: stan pusty — krótka instrukcja dla osoby, która widzi aplikację pierwszy raz. */
export function EmptyState() {
  return (
    <section aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="text-sm font-semibold tracking-widest text-accent uppercase">
        Jak to działa
      </h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-xs text-accent">KROK {index + 1}</p>
            <p className="mt-1 font-semibold">{step.title}</p>
            <p className="mt-1 text-sm text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

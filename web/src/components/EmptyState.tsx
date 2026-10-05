import { Download, FileUp, ScanText, Sparkles } from 'lucide-react';
import { sectionLabel } from '../lib/styles';

const STEPS = [
  {
    icon: FileUp,
    title: 'Wgranie PDF',
    description: 'Przeciągnij plik lub wybierz go z dysku. Sprawdzamy typ i rozmiar.',
  },
  {
    icon: ScanText,
    title: 'Odczyt tekstu',
    description: 'Tekst odczytujemy w przeglądarce, a zeskanowane strony przez OCR.',
  },
  {
    icon: Sparkles,
    title: 'Analiza AI',
    description: 'Podsumowanie i dane strukturalne, zweryfikowane z treścią dokumentu.',
  },
  {
    icon: Download,
    title: 'Wynik i eksport',
    description: 'Przejrzyj wynik i pobierz plik JSON zgodny ze schematem.',
  },
];

/** F-06: stan pusty - krótka instrukcja dla osoby, która widzi aplikację pierwszy raz. */
export function EmptyState() {
  return (
    <section aria-labelledby="how-it-works" className="space-y-4">
      <h2 id="how-it-works" className={sectionLabel}>
        Jak to działa
      </h2>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <li
            key={title}
            className="card group relative p-5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs text-muted" aria-hidden="true">
                0{index + 1}
              </span>
            </div>
            <p className="mt-4 font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

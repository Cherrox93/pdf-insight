import { CodeXml, FileSearch, Monitor, Moon, Sun } from 'lucide-react';
import { iconButton } from '../lib/styles';
import { useTheme, type ThemePreference } from '../lib/useTheme';

const REPO_URL = 'https://github.com/Cherrox93/pdf-insight';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Motyw: systemowy',
  light: 'Motyw: jasny',
  dark: 'Motyw: ciemny',
};

const THEME_ICONS: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

interface AppHeaderProps {
  onLogoClick: () => void;
}

export function AppHeader({ onLogoClick }: AppHeaderProps) {
  const { preference, cycle } = useTheme();
  const ThemeIcon = THEME_ICONS[preference];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={onLogoClick}
          className="group flex items-center gap-2.5 rounded-xl"
          aria-label="PDF Insight - strona główna"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#7ddc4a] text-accent-ink shadow-[0_6px_20px_-8px_var(--accent)] transition-transform group-hover:-rotate-6">
            <FileSearch className="size-5" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">PDF Insight</span>
        </button>

        <nav aria-label="Nawigacja" className="flex items-center gap-1">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-text sm:inline-flex"
          >
            <CodeXml className="size-4" aria-hidden="true" />
            Kod źródłowy
          </a>
          <button
            type="button"
            onClick={cycle}
            className={iconButton}
            aria-label={`${THEME_LABELS[preference]}. Kliknij, aby zmienić.`}
            title={THEME_LABELS[preference]}
          >
            <ThemeIcon aria-hidden="true" />
          </button>
        </nav>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Wyniki generuje AI i mogą zawierać błędy - weryfikuj je z dokumentem źródłowym. Tekst
          dokumentu jest przetwarzany przez zewnętrzne API AI (DeepSeek).
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 underline-offset-4 hover:text-text hover:underline"
        >
          github.com/Cherrox93/pdf-insight
        </a>
      </div>
    </footer>
  );
}

/** Wspólne klasy przycisków — spójny wygląd i stany hover/active/disabled w całej aplikacji. */
const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0';

export const buttonPrimary = `${base} bg-accent px-4 py-2.5 text-accent-ink shadow-[0_8px_24px_-10px_var(--accent)] hover:bg-accent-hover`;

export const buttonSecondary = `${base} border border-border-strong bg-surface-solid/60 px-4 py-2.5 text-text hover:bg-surface-muted`;

export const buttonGhost = `${base} px-3 py-2 text-muted hover:bg-surface-muted hover:text-text`;

export const iconButton =
  'inline-flex size-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-muted hover:text-text [&_svg]:size-[18px]';

export const badge =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted [&_svg]:size-3.5';

export const sectionLabel =
  'flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted uppercase [&_svg]:size-4 [&_svg]:text-accent-text';

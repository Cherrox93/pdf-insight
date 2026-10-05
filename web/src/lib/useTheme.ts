import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'pdf-insight:theme';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/** Motyw: systemowy / jasny / ciemny — zapamiętywany w przeglądarce. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    applyTheme(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // zapamiętanie motywu jest tylko udogodnieniem
    }
    if (preference !== 'system') return;
    // W trybie systemowym reagujemy na zmianę ustawień systemu na żywo.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? 'system');
  }, []);

  return { preference, cycle };
}

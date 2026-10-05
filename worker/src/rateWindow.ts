export interface RateWindow {
  start: number;
  count: number;
}

/**
 * Limit żądań w stałym oknie czasowym (np. 10 na 60 s) dla jednego klucza (adresu IP).
 * Czysta funkcja - stan przechowuje wywołujący (Durable Object), dzięki czemu da się ją testować.
 */
export function consumeRate(
  windows: Map<string, RateWindow>,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): boolean {
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    pruneExpired(windows, windowMs, now);
    return true;
  }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}

/** Usuwa wygasłe okna, żeby mapa adresów nie rosła bez końca. */
function pruneExpired(windows: Map<string, RateWindow>, windowMs: number, now: number): void {
  if (windows.size < 1000) return;
  for (const [key, window] of windows) {
    if (now - window.start >= windowMs) windows.delete(key);
  }
}

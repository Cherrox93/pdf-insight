import { insightSchema, type Insight } from '@pdf-insight/schema';
import { z } from 'zod';

const STORAGE_KEY = 'pdf-insight:history:v1';
export const HISTORY_LIMIT = 10;

const entrySchema = z.object({
  id: z.string().min(1),
  savedAt: z.iso.datetime(),
  insight: insightSchema,
});

export type HistoryEntry = z.infer<typeof entrySchema>;

/** Minimalny interfejs Storage — ułatwia testy i obsługę braku localStorage. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // np. tryb prywatny lub zablokowane dane witryny
  }
}

/** Wczytuje historię; uszkodzone lub niezgodne ze schematem wpisy są pomijane. */
export function loadHistory(storage = defaultStorage()): HistoryEntry[] {
  if (!storage) return [];
  try {
    const raw: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      const parsed = entrySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[], storage: KeyValueStorage | null): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // brak miejsca lub zablokowany zapis — historia jest tylko udogodnieniem
  }
}

/** Zapisuje wynik na początku listy (bez tekstu PDF — tylko wynik analizy). */
export function addToHistory(insight: Insight, storage = defaultStorage()): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    insight,
  };
  const entries = [entry, ...loadHistory(storage)].slice(0, HISTORY_LIMIT);
  saveHistory(entries, storage);
  return entries;
}

export function removeFromHistory(id: string, storage = defaultStorage()): HistoryEntry[] {
  const entries = loadHistory(storage).filter((entry) => entry.id !== id);
  saveHistory(entries, storage);
  return entries;
}

export function clearHistory(storage = defaultStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignorujemy — patrz saveHistory
  }
}

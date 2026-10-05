import type { Insight } from '@pdf-insight/schema';
import { describe, expect, it } from 'vitest';
import { jsonFileName } from './download';
import { hasPdfSignature, MAX_FILE_BYTES, validatePdfFile } from './fileValidation';
import { formatAmount, formatDate } from './format';
import {
  addToHistory,
  HISTORY_LIMIT,
  loadHistory,
  removeFromHistory,
  type KeyValueStorage,
} from './history';
import { joinTextItems, meaningfulLength } from './text';

function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const insight: Insight = {
  document: {
    fileName: 'umowa.pdf',
    pages: 2,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa',
    date: null,
  },
  summary: 'Pierwsze. Drugie. Trzecie.',
  keyPoints: ['a', 'b', 'c'],
  entities: { organizations: [], people: [] },
  amounts: [],
  dates: [],
  keywords: [],
};

const pdfBytes = new TextEncoder().encode('%PDF-1.7\n...');

describe('validatePdfFile', () => {
  it('rozpoznaje sygnaturę PDF', () => {
    expect(hasPdfSignature(pdfBytes)).toBe(true);
    expect(hasPdfSignature(new TextEncoder().encode('<html>'))).toBe(false);
  });

  it('akceptuje poprawny PDF', async () => {
    const file = new File([pdfBytes], 'a.pdf', { type: 'application/pdf' });
    await expect(validatePdfFile(file)).resolves.toEqual({ ok: true });
  });

  it('odrzuca plik innego typu', async () => {
    const result = await validatePdfFile(new File(['x'], 'a.docx', { type: 'application/msword' }));
    expect(result.ok).toBe(false);
  });

  it('odrzuca plik z rozszerzeniem .pdf, który nie jest PDF-em', async () => {
    const result = await validatePdfFile(new File(['<html>'], 'fake.pdf'));
    expect(result.ok ? '' : result.message).toContain('nie jest poprawnym dokumentem PDF');
  });

  it('odrzuca pusty plik oraz plik większy niż 10 MB', async () => {
    expect((await validatePdfFile(new File([], 'a.pdf'))).ok).toBe(false);
    const big = new File([pdfBytes, new Uint8Array(MAX_FILE_BYTES)], 'big.pdf');
    const result = await validatePdfFile(big);
    expect(result.ok ? '' : result.message).toContain('10 MB');
  });
});

describe('joinTextItems', () => {
  it('składa tekst z zachowaniem końców linii i pomija znaczniki', () => {
    const text = joinTextItems([
      { str: 'Umowa', hasEOL: false },
      { str: ' ramowa', hasEOL: true },
      { type: 'beginMarkedContent' },
      { str: '184 500,00 zł', hasEOL: false },
    ]);
    expect(text).toBe('Umowa ramowa\n184 500,00 zł');
  });

  it('liczy znaki bez białych znaków', () => {
    expect(meaningfulLength(' a \n b ')).toBe(2);
  });
});

describe('history (F-09)', () => {
  it('zapisuje i wczytuje wyniki, najnowszy pierwszy', () => {
    const storage = memoryStorage();
    addToHistory(insight, storage);
    addToHistory({ ...insight, document: { ...insight.document, fileName: 'b.pdf' } }, storage);
    expect(loadHistory(storage).map((e) => e.insight.document.fileName)).toEqual([
      'b.pdf',
      'umowa.pdf',
    ]);
  });

  it(`przechowuje maksymalnie ${HISTORY_LIMIT} wyników`, () => {
    const storage = memoryStorage();
    for (let i = 0; i < HISTORY_LIMIT + 3; i++) addToHistory(insight, storage);
    expect(loadHistory(storage)).toHaveLength(HISTORY_LIMIT);
  });

  it('pomija uszkodzone wpisy', () => {
    const storage = memoryStorage();
    addToHistory(insight, storage);
    const raw = JSON.parse(storage.getItem('pdf-insight:history:v1') ?? '[]') as unknown[];
    storage.setItem('pdf-insight:history:v1', JSON.stringify([...raw, { id: 'x', broken: true }]));
    expect(loadHistory(storage)).toHaveLength(1);
  });

  it('zwraca pustą historię przy niepoprawnym JSON lub braku storage', () => {
    const storage = memoryStorage();
    storage.setItem('pdf-insight:history:v1', '{nie json');
    expect(loadHistory(storage)).toEqual([]);
    expect(loadHistory(null)).toEqual([]);
  });

  it('usuwa pojedynczy wpis', () => {
    const storage = memoryStorage();
    const [entry] = addToHistory(insight, storage);
    expect(removeFromHistory(entry?.id ?? '', storage)).toEqual([]);
  });
});

describe('format', () => {
  it('formatuje nazwę pliku eksportu', () => {
    expect(jsonFileName('Umowa 14-2026.PDF')).toBe('Umowa 14-2026-insight.json');
    expect(jsonFileName('a/b:c.pdf')).toBe('a_b_c-insight.json');
  });

  it('formatuje kwoty i daty po polsku', () => {
    expect(formatAmount(184500, 'PLN').replace(/\s/g, ' ')).toBe('184 500,00 zł');
    expect(formatDate('2026-03-12')).toBe('12 marca 2026');
  });
});

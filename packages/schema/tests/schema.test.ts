import { describe, expect, it } from 'vitest';
import { insightSchema, llmAnalysisSchema, type Insight } from '../src';

function validInsight(): Insight {
  return {
    document: {
      fileName: 'umowa.pdf',
      pages: 4,
      language: 'pl',
      type: 'umowa',
      title: 'Umowa serwisowa',
      date: '2026-09-01',
    },
    summary:
      'Umowa określa zasady świadczenia usług serwisowych. Okres obowiązywania wynosi 12 miesięcy. Wynagrodzenie płatne jest miesięcznie.',
    keyPoints: ['Okres umowy 12 mies.', 'Wynagrodzenie 12 500 PLN', 'SLA 99,5%'],
    entities: { organizations: ['Przykład sp. z o.o.'], people: [] },
    amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie' }],
    dates: [{ date: '2026-10-01', context: 'termin płatności' }],
    keywords: ['serwis', 'SLA'],
  };
}

describe('insightSchema', () => {
  it('akceptuje poprawny wynik zgodny z briefem', () => {
    expect(insightSchema.safeParse(validInsight()).success).toBe(true);
  });

  it('akceptuje dodatkowe pola (pola można dodawać)', () => {
    const data = {
      ...validInsight(),
      meta: {
        schemaVersion: '1.0',
        model: 'deepseek-chat',
        analyzedAt: '2026-10-05T12:00:00Z',
        chunks: 1,
        ocrPages: [11],
        warnings: [],
      },
      extra: 'dozwolone',
    };
    expect(insightSchema.safeParse(data).success).toBe(true);
  });

  it('akceptuje null jako brak tytułu i daty', () => {
    const data = validInsight();
    data.document.title = null;
    data.document.date = null;
    expect(insightSchema.safeParse(data).success).toBe(true);
  });

  it('akceptuje puste tablice jako brak informacji', () => {
    const data = { ...validInsight(), amounts: [], dates: [], keywords: [] };
    data.entities = { organizations: [], people: [] };
    expect(insightSchema.safeParse(data).success).toBe(true);
  });

  it.each(['document', 'summary', 'keyPoints', 'entities', 'amounts', 'dates', 'keywords'])(
    'odrzuca wynik bez wymaganego pola %s',
    (field) => {
      const data = Object.fromEntries(
        Object.entries(validInsight()).filter(([key]) => key !== field),
      );
      expect(insightSchema.safeParse(data).success).toBe(false);
    },
  );

  it('odrzuca nieznany typ dokumentu', () => {
    const data = validInsight();
    expect(
      insightSchema.safeParse({ ...data, document: { ...data.document, type: 'list' } }).success,
    ).toBe(false);
  });

  it.each(['12.03.2026', '2026-13-01', '2026-02-30', '2026-3-1', ''])(
    'odrzuca datę niezgodną z ISO 8601: "%s"',
    (date) => {
      const data = validInsight();
      data.dates = [{ date, context: 'termin' }];
      expect(insightSchema.safeParse(data).success).toBe(false);
    },
  );

  it('akceptuje 29 lutego w roku przestępnym', () => {
    const data = validInsight();
    data.document.date = '2028-02-29';
    expect(insightSchema.safeParse(data).success).toBe(true);
  });

  it.each(['zł', 'PLNN', 'pln', 'XYZ', '€'])('odrzuca walutę spoza ISO 4217: "%s"', (currency) => {
    const data = validInsight();
    data.amounts = [{ value: 10, currency, context: 'opłata' }];
    expect(insightSchema.safeParse(data).success).toBe(false);
  });

  it('odrzuca kwotę zapisaną jako tekst', () => {
    const data = {
      ...validInsight(),
      amounts: [{ value: '12 500,00', currency: 'PLN', context: 'x' }],
    };
    expect(insightSchema.safeParse(data).success).toBe(false);
  });

  it.each(['PL', 'pol', 'polski', 'xx'])('odrzuca kod języka spoza ISO 639-1: "%s"', (language) => {
    const data = validInsight();
    expect(
      insightSchema.safeParse({ ...data, document: { ...data.document, language } }).success,
    ).toBe(false);
  });

  it.each([2, 8])('odrzuca %i kluczowych punktów (dozwolone 3–7)', (count) => {
    const data = { ...validInsight(), keyPoints: Array.from({ length: count }, (_, i) => `P${i}`) };
    expect(insightSchema.safeParse(data).success).toBe(false);
  });

  it('odrzuca liczbę stron mniejszą niż 1 lub ułamkową', () => {
    const data = validInsight();
    for (const pages of [0, 1.5]) {
      expect(
        insightSchema.safeParse({ ...data, document: { ...data.document, pages } }).success,
      ).toBe(false);
    }
  });
});

describe('llmAnalysisSchema', () => {
  function validLlm() {
    return {
      document: { language: 'pl', type: 'umowa', title: 'Umowa', date: '2026-03-12' },
      summarySentences: ['Zdanie pierwsze.', 'Zdanie drugie.', 'Zdanie trzecie.'],
      keyPoints: ['a', 'b', 'c'],
      entities: { organizations: [], people: [] },
      amounts: [],
      dates: [],
      keywords: [],
      injectionDetected: false,
    };
  }

  it('akceptuje poprawną odpowiedź modelu', () => {
    expect(llmAnalysisSchema.safeParse(validLlm()).success).toBe(true);
  });

  it.each([2, 6])('odrzuca podsumowanie z %i zdaniami (dozwolone 3–5)', (count) => {
    const data = {
      ...validLlm(),
      summarySentences: Array.from({ length: count }, (_, i) => `Zdanie ${i}.`),
    };
    expect(llmAnalysisSchema.safeParse(data).success).toBe(false);
  });

  it('normalizuje wielkość liter języka, typu i waluty', () => {
    const data = {
      ...validLlm(),
      document: { language: 'PL', type: 'Umowa', title: 'Umowa', date: null },
      amounts: [{ value: 100, currency: 'pln', context: 'opłata' }],
    };
    const result = llmAnalysisSchema.parse(data);
    expect(result.document.language).toBe('pl');
    expect(result.document.type).toBe('umowa');
    expect(result.amounts[0]?.currency).toBe('PLN');
  });

  it('zamienia pusty tytuł i pustą datę na null', () => {
    const data = { ...validLlm(), document: { language: 'pl', type: 'inne', title: '', date: '' } };
    const result = llmAnalysisSchema.parse(data);
    expect(result.document.title).toBeNull();
    expect(result.document.date).toBeNull();
  });

  it('odrzuca odpowiedź bez flagi injectionDetected', () => {
    const data: Record<string, unknown> = { ...validLlm() };
    delete data.injectionDetected;
    expect(llmAnalysisSchema.safeParse(data).success).toBe(false);
  });
});

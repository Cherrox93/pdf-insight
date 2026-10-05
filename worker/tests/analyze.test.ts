import { insightSchema, llmAnalysisSchema } from '@pdf-insight/schema';
import { describe, expect, it } from 'vitest';
import {
  AiInvalidResponseError,
  analyzeDocument,
  buildInsight,
  generateValidated,
} from '../src/analyze';
import { mapWithConcurrency, splitIntoChunks } from '../src/chunking';
import { CONTRACT_PAGES, fakeLlm, validAnalysis } from './fixtures';

const request = {
  fileName: 'umowa.pdf',
  pages: CONTRACT_PAGES.length,
  pagesText: CONTRACT_PAGES,
  ocrPages: [],
};

const ctx = {
  fileName: 'umowa.pdf',
  pages: 3,
  ocrPages: [],
  chunks: 1,
  fullText: CONTRACT_PAGES.join('\n'),
  model: 'fake-model',
  now: new Date('2026-10-06T10:00:00Z'),
};

describe('generateValidated', () => {
  it('zwraca wynik przy poprawnej pierwszej odpowiedzi', async () => {
    const llm = fakeLlm([JSON.stringify(validAnalysis())]);
    await generateValidated(llm, [], llmAnalysisSchema);
    expect(llm.calls).toHaveLength(1);
  });

  it('ponawia raz z listą błędów i akceptuje poprawioną odpowiedź', async () => {
    const invalid = JSON.stringify({ ...validAnalysis(), summarySentences: ['Jedno zdanie.'] });
    const llm = fakeLlm([invalid, JSON.stringify(validAnalysis())]);
    await generateValidated(llm, [], llmAnalysisSchema);
    expect(llm.calls).toHaveLength(2);
    expect(llm.calls[1]?.at(-1)?.content).toContain('summarySentences');
  });

  it('ponawia po odpowiedzi, która nie jest JSON-em', async () => {
    const llm = fakeLlm(['to nie jest json', JSON.stringify(validAnalysis())]);
    await expect(generateValidated(llm, [], llmAnalysisSchema)).resolves.toBeDefined();
  });

  it('akceptuje JSON opakowany w blok markdown', async () => {
    const llm = fakeLlm(['```json\n' + JSON.stringify(validAnalysis()) + '\n```']);
    await expect(generateValidated(llm, [], llmAnalysisSchema)).resolves.toBeDefined();
  });

  it('po drugiej błędnej odpowiedzi zgłasza błąd (dokładnie 1 ponowna próba)', async () => {
    const llm = fakeLlm(['{}', '{}', JSON.stringify(validAnalysis())]);
    await expect(generateValidated(llm, [], llmAnalysisSchema)).rejects.toBeInstanceOf(
      AiInvalidResponseError,
    );
    expect(llm.calls).toHaveLength(2);
  });
});

describe('buildInsight', () => {
  it('buduje wynik zgodny ze schematem z briefu', () => {
    const insight = buildInsight(validAnalysis(), ctx);
    expect(insightSchema.safeParse(insight).success).toBe(true);
    expect(insight.document.fileName).toBe('umowa.pdf');
    expect(insight.document.pages).toBe(3);
    expect(insight.summary.split('. ').length).toBeGreaterThanOrEqual(3);
  });

  it('usuwa kwoty i daty, których nie ma w dokumencie, i dodaje ostrzeżenie', () => {
    const insight = buildInsight(
      validAnalysis({
        amounts: [
          { value: 184500, currency: 'PLN', context: 'wynagrodzenie' },
          { value: 999999, currency: 'PLN', context: 'zmyślona kwota' },
        ],
        dates: [
          { date: '2026-04-01', context: 'start' },
          { date: '2030-01-01', context: 'zmyślona data' },
        ],
      }),
      ctx,
    );
    expect(insight.amounts.map((a) => a.value)).toEqual([184500]);
    expect(insight.dates.map((d) => d.date)).toEqual(['2026-04-01']);
    expect(insight.meta?.warnings.join(' ')).toContain('kwoty');
    expect(insight.meta?.warnings.join(' ')).toContain('daty');
  });

  it('ostrzega o prompt injection wykrytym heurystyką, nawet gdy model go nie zgłosił', () => {
    const insight = buildInsight(validAnalysis({ injectionDetected: false }), ctx);
    expect(insight.meta?.warnings.some((w) => w.includes('polecenie dla systemu AI'))).toBe(true);
  });

  it('deduplikuje encje i łączy konteksty tej samej daty', () => {
    const insight = buildInsight(
      validAnalysis({
        entities: {
          organizations: ['Kwadrat Software S.A.', 'kwadrat software s.a. '],
          people: ['Anna Kowalczyk', 'Anna  Kowalczyk'],
        },
        dates: [
          { date: '2026-04-01', context: 'początek umowy' },
          { date: '2026-04-01', context: 'start etapu E1' },
        ],
      }),
      ctx,
    );
    expect(insight.entities.organizations).toEqual(['Kwadrat Software S.A.']);
    expect(insight.entities.people).toEqual(['Anna Kowalczyk']);
    expect(insight.dates).toEqual([
      { date: '2026-04-01', context: 'początek umowy; start etapu E1' },
    ]);
  });

  it('ustawia datę dokumentu na null, gdy nie występuje w tekście', () => {
    const analysis = validAnalysis();
    analysis.document.date = '2025-01-01';
    expect(buildInsight(analysis, ctx).document.date).toBeNull();
  });
});

describe('chunking (F-08)', () => {
  const page = (number: number, length: number) => ({
    number,
    text: 'x'.repeat(length),
    ocr: false,
  });

  it('krótki dokument analizuje w jednym przebiegu', () => {
    expect(splitIntoChunks([page(1, 1000), page(2, 1000)])).toHaveLength(1);
  });

  it('długi dokument dzieli po granicach stron', () => {
    const pages = Array.from({ length: 10 }, (_, i) => page(i + 1, 10_000));
    const chunks = splitIntoChunks(pages);
    expect(chunks).toHaveLength(3);
    expect(chunks.flat().map((p) => p.number)).toEqual(pages.map((p) => p.number));
    for (const chunk of chunks) {
      expect(chunk.reduce((sum, p) => sum + p.text.length, 0)).toBeLessThanOrEqual(40_000);
    }
  });

  it('dzieli pojedynczą bardzo długą stronę', () => {
    const chunks = splitIntoChunks([page(1, 100_000)]);
    expect(chunks.length).toBe(3);
  });

  it('mapWithConcurrency zachowuje kolejność wyników', async () => {
    const result = await mapWithConcurrency([30, 10, 20], 2, async (ms, i) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return i;
    });
    expect(result).toEqual([0, 1, 2]);
  });

  it('łączy wyniki fragmentów w jeden wynik', async () => {
    // 4 strony po ~15 tys. znaków → 2 fragmenty (po 2 strony) + 1 wywołanie łączące
    const longPages = Array.from(
      { length: 4 },
      (_, i) => `${CONTRACT_PAGES[i % 3] ?? ''} ${'x'.repeat(15_000)}`,
    );
    const partial = (org: string) =>
      JSON.stringify(
        validAnalysis({ entities: { organizations: [org], people: ['Anna Kowalczyk'] } }),
      );
    const reduced = JSON.stringify({
      document: validAnalysis().document,
      summarySentences: ['Zdanie A.', 'Zdanie B.', 'Zdanie C.'],
      keyPoints: ['a', 'b', 'c'],
      keywords: ['CRM'],
      injectionDetected: false,
    });
    const llm = fakeLlm([partial('Org A'), partial('Org B'), reduced]);
    const insight = await analyzeDocument(
      { fileName: 'dlugi.pdf', pages: 4, pagesText: longPages, ocrPages: [] },
      llm,
    );
    expect(llm.calls).toHaveLength(3);
    expect(insight.meta?.chunks).toBe(2);
    expect(insight.entities.organizations).toEqual(['Org A', 'Org B']);
    expect(insight.summary).toBe('Zdanie A. Zdanie B. Zdanie C.');
  });
});

describe('analyzeDocument', () => {
  it('przekazuje treść dokumentu w delimiterach z losowym identyfikatorem', async () => {
    const llm = fakeLlm([JSON.stringify(validAnalysis())]);
    await analyzeDocument(request, llm);
    const userMessage = llm.calls[0]?.[1]?.content ?? '';
    expect(userMessage).toMatch(/<document_[0-9a-f]{8}>/);
    expect(userMessage).toContain('--- Page 3 ---');
  });

  it('oznacza strony odczytane przez OCR', async () => {
    const llm = fakeLlm([JSON.stringify(validAnalysis())]);
    const insight = await analyzeDocument({ ...request, ocrPages: [2] }, llm);
    expect(llm.calls[0]?.[1]?.content).toContain('--- Page 2 (OCR) ---');
    expect(insight.meta?.ocrPages).toEqual([2]);
  });
});

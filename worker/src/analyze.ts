import {
  describeIssues,
  insightSchema,
  llmAnalysisSchema,
  SCHEMA_VERSION,
  type Insight,
  type LlmAnalysis,
} from '@pdf-insight/schema';
import type { z } from 'zod';
import { mapWithConcurrency, splitIntoChunks } from './chunking';
import {
  DATE_GROUNDING_LANGUAGES,
  isAmountGrounded,
  isDateGrounded,
  normalizeText,
} from './grounding';
import { looksLikePromptInjection } from './injection';
import type { ChatMessage, LlmClient } from './llm';
import { buildAnalysisMessages, buildReduceMessages, retryMessage, type PageText } from './prompt';
import type { AnalyzeRequest } from './request';

/** Model zwrócił odpowiedź niezgodną ze schematem również przy ponownej próbie. */
export class AiInvalidResponseError extends Error {
  constructor() {
    super('Odpowiedź modelu jest niezgodna ze schematem.');
    this.name = 'AiInvalidResponseError';
  }
}

const reduceSchema = llmAnalysisSchema.pick({
  document: true,
  summarySentences: true,
  keyPoints: true,
  keywords: true,
  injectionDetected: true,
});

const LIMITS = { amounts: 20, dates: 20, keywords: 10, organizations: 30, people: 30 } as const;
const MAP_CONCURRENCY = 3;

function parseJson(raw: string): unknown {
  // Na wypadek gdyby model mimo trybu JSON opakował odpowiedź w blok ```json.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '');
  return JSON.parse(cleaned);
}

/**
 * Wywołuje model i waliduje odpowiedź schematem Zod.
 * Przy błędzie: dokładnie 1 ponowna próba z listą błędów, potem AiInvalidResponseError.
 */
export async function generateValidated<S extends z.ZodType>(
  llm: LlmClient,
  messages: ChatMessage[],
  schema: S,
): Promise<z.infer<S>> {
  let conversation = messages;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await llm.complete(conversation);
    let issues: string;
    try {
      const result = schema.safeParse(parseJson(raw));
      if (result.success) return result.data;
      issues = describeIssues(result.error);
    } catch {
      issues = '- (root): the answer is not valid JSON';
    }
    conversation = [...messages, { role: 'assistant', content: raw }, retryMessage(issues)];
  }
  throw new AiInvalidResponseError();
}

const textKey = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();

function uniqueStrings(values: string[], limit: number): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const key = textKey(value);
    if (!seen.has(key)) seen.set(key, value.trim());
  }
  return [...seen.values()].slice(0, limit);
}

/** Łączy listy z analiz fragmentów (F-08) z deduplikacją. */
export function mergePartials(
  partials: LlmAnalysis[],
  reduced: z.infer<typeof reduceSchema>,
): LlmAnalysis {
  return {
    ...reduced,
    injectionDetected: reduced.injectionDetected || partials.some((p) => p.injectionDetected),
    entities: {
      organizations: partials.flatMap((p) => p.entities.organizations),
      people: partials.flatMap((p) => p.entities.people),
    },
    amounts: partials.flatMap((p) => p.amounts),
    dates: partials.flatMap((p) => p.dates),
  };
}

function ensureSentenceEnd(sentence: string): string {
  const trimmed = sentence.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function ocrWarning(pages: number[]): string {
  return pages.length === 1
    ? `Strona ${pages[0] ?? ''} została odczytana za pomocą OCR - dane z niej mogą zawierać błędy rozpoznawania.`
    : `Strony ${pages.join(', ')} zostały odczytane za pomocą OCR - dane z nich mogą zawierać błędy rozpoznawania.`;
}

interface BuildContext {
  fileName: string;
  pages: number;
  ocrPages: number[];
  chunks: number;
  fullText: string;
  model: string;
  now: Date;
}

/** Buduje wynik końcowy: grounding, deduplikacja, limity, meta, walidacja schematem z briefu. */
export function buildInsight(analysis: LlmAnalysis, ctx: BuildContext): Insight {
  const text = normalizeText(ctx.fullText);
  const warnings: string[] = [];

  // Kwoty: zostawiamy tylko te, które występują w tekście; duplikaty (wartość+waluta) łączymy.
  const amounts = new Map<string, LlmAnalysis['amounts'][number]>();
  const droppedAmounts: string[] = [];
  for (const amount of analysis.amounts) {
    if (!isAmountGrounded(amount.value, text)) {
      droppedAmounts.push(`${amount.value} ${amount.currency} (${amount.context})`);
      continue;
    }
    const key = `${amount.value.toFixed(2)}|${amount.currency}`;
    if (!amounts.has(key)) amounts.set(key, amount);
  }

  // Daty: weryfikujemy, gdy znamy zapis słowny miesięcy w języku dokumentu.
  const checkDates = DATE_GROUNDING_LANGUAGES.has(analysis.document.language);
  const dates = new Map<string, string[]>();
  const droppedDates: string[] = [];
  for (const entry of analysis.dates) {
    if (checkDates && !isDateGrounded(entry.date, text)) {
      droppedDates.push(`${entry.date} (${entry.context})`);
      continue;
    }
    const contexts = dates.get(entry.date) ?? [];
    if (!contexts.some((c) => textKey(c) === textKey(entry.context))) contexts.push(entry.context);
    dates.set(entry.date, contexts);
  }

  const documentDate =
    analysis.document.date && (!checkDates || isDateGrounded(analysis.document.date, text))
      ? analysis.document.date
      : null;

  if (droppedAmounts.length > 0) {
    warnings.push(
      `Pominięto kwoty, których nie znaleziono w treści dokumentu (możliwy błąd AI): ${droppedAmounts.join('; ')}.`,
    );
  }
  if (droppedDates.length > 0) {
    warnings.push(
      `Pominięto daty, których nie znaleziono w treści dokumentu (możliwy błąd AI): ${droppedDates.join('; ')}.`,
    );
  }
  if (analysis.injectionDetected || looksLikePromptInjection(ctx.fullText)) {
    warnings.push(
      'Dokument zawiera fragment wyglądający na polecenie dla systemu AI. Potraktowano go wyłącznie jako treść dokumentu i nie wykonano zawartych w nim instrukcji.',
    );
  }
  if (ctx.ocrPages.length > 0) {
    warnings.push(ocrWarning(ctx.ocrPages));
  }

  const insight: Insight = {
    document: {
      fileName: ctx.fileName,
      pages: ctx.pages,
      language: analysis.document.language,
      type: analysis.document.type,
      title: analysis.document.title,
      date: documentDate,
    },
    summary: analysis.summarySentences.map(ensureSentenceEnd).join(' '),
    keyPoints: analysis.keyPoints,
    entities: {
      organizations: uniqueStrings(analysis.entities.organizations, LIMITS.organizations),
      people: uniqueStrings(analysis.entities.people, LIMITS.people),
    },
    amounts: [...amounts.values()].slice(0, LIMITS.amounts),
    dates: [...dates.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, LIMITS.dates)
      .map(([date, contexts]) => ({ date, context: contexts.join('; ') })),
    keywords: uniqueStrings(analysis.keywords, LIMITS.keywords),
    meta: {
      schemaVersion: SCHEMA_VERSION,
      model: ctx.model,
      analyzedAt: ctx.now.toISOString(),
      chunks: ctx.chunks,
      ocrPages: ctx.ocrPages,
      warnings,
    },
  };

  // Ostatnia linia obrony: wynik musi być zgodny ze schematem z briefu.
  return insightSchema.parse(insight);
}

export async function analyzeDocument(
  input: AnalyzeRequest,
  llm: LlmClient,
  now: Date = new Date(),
): Promise<Insight> {
  const ocrPages = new Set(input.ocrPages);
  const pages: PageText[] = input.pagesText.map((text, index) => ({
    number: index + 1,
    text: text.trim(),
    ocr: ocrPages.has(index + 1),
  }));

  // Losowy identyfikator delimitera - treść PDF nie może „zamknąć” bloku dokumentu.
  const id = crypto.randomUUID().slice(0, 8);
  const chunks = splitIntoChunks(pages);

  let analysis: LlmAnalysis;
  if (chunks.length === 1) {
    analysis = await generateValidated(llm, buildAnalysisMessages(pages, id), llmAnalysisSchema);
  } else {
    const partials = await mapWithConcurrency(chunks, MAP_CONCURRENCY, (chunk, index) =>
      generateValidated(
        llm,
        buildAnalysisMessages(chunk, id, { index, total: chunks.length }),
        llmAnalysisSchema,
      ),
    );
    const reduced = await generateValidated(llm, buildReduceMessages(partials, id), reduceSchema);
    analysis = mergePartials(partials, reduced);
  }

  return buildInsight(analysis, {
    fileName: input.fileName,
    pages: input.pages,
    ocrPages: [...ocrPages].sort((a, b) => a - b),
    chunks: chunks.length,
    fullText: input.pagesText.join('\n'),
    model: llm.model,
    now,
  });
}

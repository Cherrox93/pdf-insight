import { z } from 'zod';
import { ISO_4217, ISO_639_1 } from './codes';

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const;
export const SUMMARY_SENTENCES = { min: 3, max: 5 } as const;
export const KEY_POINTS = { min: 3, max: 7 } as const;
export const SCHEMA_VERSION = '1.0';

const text = z.string().trim().min(1, 'Pole nie może być puste');

/** Data kalendarzowa ISO 8601 (RRRR-MM-DD); odrzuca nieistniejące dni, np. 2026-02-30. */
export const isoDateSchema = z.iso.date({ error: 'Data musi mieć format ISO 8601 (RRRR-MM-DD)' });

export const languageSchema = z
  .string()
  .refine((v) => ISO_639_1.has(v), 'Kod języka musi być zgodny z ISO 639-1 (np. "pl")');

export const currencySchema = z
  .string()
  .refine((v) => ISO_4217.has(v), 'Kod waluty musi być zgodny z ISO 4217 (np. "PLN")');

export const documentTypeSchema = z.enum(DOCUMENT_TYPES);

export const amountSchema = z.looseObject({
  value: z.number(),
  currency: currencySchema,
  context: text,
});

export const dateEntrySchema = z.looseObject({
  date: isoDateSchema,
  context: text,
});

export const metaSchema = z.looseObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  model: text,
  analyzedAt: z.iso.datetime(),
  chunks: z.number().int().min(1),
  ocrPages: z.array(z.number().int().min(1)),
  warnings: z.array(text),
});

/**
 * Wynik analizy — schemat z sekcji 04 briefu. Pola z briefu są wymagane,
 * dodatkowe pola są dozwolone (looseObject), `meta` to nasze rozszerzenie.
 */
export const insightSchema = z.looseObject({
  document: z.looseObject({
    fileName: text,
    pages: z.number().int().min(1),
    language: languageSchema,
    type: documentTypeSchema,
    title: text.nullable(),
    date: isoDateSchema.nullable(),
  }),
  summary: text.max(2000),
  keyPoints: z.array(text).min(KEY_POINTS.min).max(KEY_POINTS.max),
  entities: z.looseObject({
    organizations: z.array(text),
    people: z.array(text),
  }),
  amounts: z.array(amountSchema),
  dates: z.array(dateEntrySchema),
  keywords: z.array(text),
  meta: metaSchema.optional(),
});

export type Insight = z.infer<typeof insightSchema>;
export type InsightMeta = z.infer<typeof metaSchema>;
export type Amount = z.infer<typeof amountSchema>;
export type DateEntry = z.infer<typeof dateEntrySchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;

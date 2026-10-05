import { z } from 'zod';
import {
  currencySchema,
  DOCUMENT_TYPES,
  isoDateSchema,
  KEY_POINTS,
  languageSchema,
  SUMMARY_SENTENCES,
} from './schema';

/*
 * Schemat odpowiedzi modelu językowego. Różni się od wyniku końcowego:
 * - podsumowanie to tablica zdań, dzięki czemu regułę „3–5 zdań” wymusza walidacja,
 *   a nie zawodne liczenie kropek (skróty typu „sp. z o.o.”),
 * - fileName/pages/meta ustawia kod, nie model,
 * - drobne różnice formatu (wielkość liter, pusty string zamiast null) są normalizowane.
 */

const text = z.string().trim().min(1);
const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const lenientLanguage = z.string().trim().toLowerCase().pipe(languageSchema);
const lenientCurrency = z.string().trim().toUpperCase().pipe(currencySchema);
const lenientType = z.string().trim().toLowerCase().pipe(z.enum(DOCUMENT_TYPES));

export const llmAnalysisSchema = z.object({
  document: z.object({
    language: lenientLanguage,
    type: lenientType,
    title: z.preprocess(emptyToNull, text.nullable()),
    date: z.preprocess(emptyToNull, isoDateSchema.nullable()),
  }),
  summarySentences: z.array(text).min(SUMMARY_SENTENCES.min).max(SUMMARY_SENTENCES.max),
  keyPoints: z.array(text).min(KEY_POINTS.min).max(KEY_POINTS.max),
  entities: z.object({
    organizations: z.array(text),
    people: z.array(text),
  }),
  amounts: z.array(
    z.object({
      value: z.number(),
      currency: lenientCurrency,
      context: text,
    }),
  ),
  dates: z.array(z.object({ date: isoDateSchema, context: text })),
  keywords: z.array(text),
  injectionDetected: z.boolean(),
});

export type LlmAnalysis = z.infer<typeof llmAnalysisSchema>;

/** Czytelna lista błędów walidacji - trafia do modelu przy ponownej próbie. */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 15)
    .map((issue) => `- ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

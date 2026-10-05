import { z } from 'zod';
import { HttpError } from './http';

export const MAX_BODY_BYTES = 1_500_000;
export const MAX_TEXT_CHARS = 300_000;
export const MIN_TEXT_CHARS = 200;

export const analyzeRequestSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    pages: z.number().int().min(1).max(2000),
    pagesText: z.array(z.string()).min(1).max(2000),
    ocrPages: z.array(z.number().int().min(1)).max(2000).default([]),
  })
  .refine((r) => r.pagesText.length === r.pages, {
    message: 'pagesText musi zawierać tekst każdej strony',
    path: ['pagesText'],
  });

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export async function parseAnalyzeRequest(request: Request): Promise<AnalyzeRequest> {
  const contentLength = Number(request.headers.get('Content-Length'));
  if (!contentLength) {
    throw new HttpError(411, 'LENGTH_REQUIRED', 'Brak nagłówka Content-Length.');
  }
  if (contentLength > MAX_BODY_BYTES) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dokument jest zbyt duży do analizy.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', 'Nieprawidłowe dane żądania.');
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, 'INVALID_REQUEST', 'Nieprawidłowe dane żądania.');
  }

  const totalChars = parsed.data.pagesText.reduce((sum, page) => sum + page.length, 0);
  if (totalChars > MAX_TEXT_CHARS) {
    throw new HttpError(
      413,
      'PAYLOAD_TOO_LARGE',
      'Dokument zawiera zbyt dużo tekstu do analizy (limit ok. 300 tys. znaków).',
    );
  }

  const meaningfulChars = parsed.data.pagesText.join('').replace(/\s/g, '').length;
  if (meaningfulChars < MIN_TEXT_CHARS) {
    throw new HttpError(
      422,
      'TEXT_TOO_SHORT',
      'Dokument zawiera zbyt mało tekstu, aby rzetelnie go podsumować.',
    );
  }

  return parsed.data;
}

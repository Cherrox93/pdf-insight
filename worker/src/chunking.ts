import type { PageText } from './prompt';

/** Powyżej tego progu dokument dzielimy na fragmenty (limit kontekstu i czas odpowiedzi modelu). */
export const SINGLE_PASS_MAX_CHARS = 60_000;
export const CHUNK_MAX_CHARS = 40_000;

/**
 * Dzieli strony na fragmenty po granicach stron. Strona dłuższa niż limit
 * jest cięta na części (każda z tym samym numerem strony).
 */
export function splitIntoChunks(
  pages: PageText[],
  singlePassMax = SINGLE_PASS_MAX_CHARS,
  chunkMax = CHUNK_MAX_CHARS,
): PageText[][] {
  const total = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (total <= singlePassMax) return [pages];

  const pieces = pages.flatMap((page) => {
    if (page.text.length <= chunkMax) return [page];
    const parts: PageText[] = [];
    for (let start = 0; start < page.text.length; start += chunkMax) {
      parts.push({ ...page, text: page.text.slice(start, start + chunkMax) });
    }
    return parts;
  });

  const chunks: PageText[][] = [];
  let current: PageText[] = [];
  let currentLength = 0;
  for (const piece of pieces) {
    if (currentLength + piece.text.length > chunkMax && current.length > 0) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(piece);
    currentLength += piece.text.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** Wykonuje zadania z ograniczoną równoległością (limity RPM dostawcy LLM). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index] as T, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

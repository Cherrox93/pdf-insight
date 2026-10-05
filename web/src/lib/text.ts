/** Strona z mniejszą liczbą znaków (bez białych) uznawana jest za skan bez warstwy tekstowej. */
export const MIN_PAGE_CHARS = 20;

export function meaningfulLength(text: string): number {
  return text.replace(/\s/g, '').length;
}

export class PdfReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfReadError';
  }
}

/** Minimalny kształt elementu tekstowego pdf.js (TextItem / TextMarkedContent). */
export type PdfTextContentItem = { str: string; hasEOL: boolean } | { type: string };

/**
 * Składa tekst strony w kolejności strumienia treści PDF. Ta kolejność zachowuje układ
 * wielokolumnowy (sortowanie po współrzędnych przeplatałoby kolumny).
 */
export function joinTextItems(items: PdfTextContentItem[]): string {
  let text = '';
  for (const item of items) {
    if (!('str' in item)) continue;
    text += item.str;
    if (item.hasEOL) text += '\n';
  }
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

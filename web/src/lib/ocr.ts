import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Limit stron OCR - rozpoznawanie trwa kilka sekund na stronę (wymóg: wynik < 30 s). */
export const MAX_OCR_PAGES = 5;
const RENDER_SCALE = 2;

async function renderPage(pdf: PDFDocumentProxy, pageNumber: number): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  page.cleanup();
  return canvas;
}

/**
 * F-10: rozpoznaje tekst stron bez warstwy tekstowej (skanów).
 * Tesseract.js ładowany jest dynamicznie - tylko gdy dokument zawiera skany.
 */
export async function recognizePages(
  pdf: PDFDocumentProxy,
  pageNumbers: number[],
  onProgress: (done: number, total: number) => void,
): Promise<Map<number, string>> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['pol', 'eng']);
  const results = new Map<number, string>();
  try {
    for (const [index, pageNumber] of pageNumbers.entries()) {
      onProgress(index, pageNumbers.length);
      const canvas = await renderPage(pdf, pageNumber);
      const { data } = await worker.recognize(canvas);
      results.set(pageNumber, data.text.trim());
    }
    onProgress(pageNumbers.length, pageNumbers.length);
  } finally {
    await worker.terminate();
  }
  return results;
}

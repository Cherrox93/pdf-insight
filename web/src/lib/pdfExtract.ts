import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
// Vite zwraca URL workera z uwzględnieniem `base` (/pdf-insight/) - pułapka GitHub Pages.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { joinTextItems, meaningfulLength, MIN_PAGE_CHARS, PdfReadError } from './text';

GlobalWorkerOptions.workerSrc = workerUrl;

export interface ExtractedPdf {
  pdf: PDFDocumentProxy;
  pagesText: string[];
  /** Numery stron (od 1) bez warstwy tekstowej - kandydaci do OCR. */
  emptyPages: number[];
  /** Zwalnia dokument i worker pdf.js. */
  release: () => Promise<void>;
}

export async function extractPdfText(
  data: ArrayBuffer,
  onProgress: (page: number, total: number) => void,
): Promise<ExtractedPdf> {
  const loadingTask = getDocument({ data });
  let pdf: PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new PdfReadError('Plik PDF jest zabezpieczony hasłem. Usuń hasło i spróbuj ponownie.');
    }
    throw new PdfReadError('Nie udało się otworzyć pliku PDF. Plik może być uszkodzony.');
  }

  const pagesText: string[] = [];
  const emptyPages: number[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress(pageNumber, pdf.numPages);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = joinTextItems(content.items);
    pagesText.push(text);
    if (meaningfulLength(text) < MIN_PAGE_CHARS) emptyPages.push(pageNumber);
    page.cleanup();
  }

  return { pdf, pagesText, emptyPages, release: () => loadingTask.destroy() };
}

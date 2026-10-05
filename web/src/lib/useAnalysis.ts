import type { Insight } from '@pdf-insight/schema';
import { useCallback, useRef, useState } from 'react';
import { AnalysisError, requestAnalysis, type AnalyzePayload } from '../api/analyzeClient';
import { validatePdfFile } from './fileValidation';
import {
  addToHistory,
  clearHistory,
  loadHistory,
  removeFromHistory,
  type HistoryEntry,
} from './history';
import { MAX_OCR_PAGES, recognizePages } from './ocr';
import { meaningfulLength, MIN_PAGE_CHARS, PdfReadError } from './text';

/** Zgodne z limitem serwera — poniżej nie da się uczciwie napisać 3–5 zdań podsumowania. */
const MIN_DOCUMENT_CHARS = 200;

export type Step = 'extract' | 'ocr' | 'analyze';

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'processing'; fileName: string; step: Step; detail: string; withOcr: boolean }
  | { status: 'error'; message: string; canRetry: boolean }
  | { status: 'done'; insight: Insight; fromHistory: boolean };

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const controllerRef = useRef<AbortController | null>(null);
  const fileRef = useRef<File | null>(null);
  /** Wyekstrahowany tekst — ponowienie nie wymaga ponownego odczytu i OCR. */
  const payloadRef = useRef<{ payload: AnalyzePayload; clientWarnings: string[] } | null>(null);

  const startController = () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller;
  };

  const sendForAnalysis = useCallback(
    async (payload: AnalyzePayload, clientWarnings: string[], controller: AbortController) => {
      setState({
        status: 'processing',
        fileName: payload.fileName,
        step: 'analyze',
        detail: 'AI tworzy podsumowanie i wyodrębnia dane…',
        withOcr: payload.ocrPages.length > 0,
      });
      try {
        const result = await requestAnalysis(payload, controller.signal);
        if (controller.signal.aborted) return;
        const insight: Insight =
          clientWarnings.length > 0 && result.meta
            ? {
                ...result,
                meta: { ...result.meta, warnings: [...result.meta.warnings, ...clientWarnings] },
              }
            : result;
        setHistory(addToHistory(insight));
        setState({ status: 'done', insight, fromHistory: false });
      } catch (error) {
        if (controller.signal.aborted || isAbort(error)) return;
        setState({
          status: 'error',
          message: error instanceof AnalysisError ? error.message : 'Wystąpił nieoczekiwany błąd.',
          canRetry: error instanceof AnalysisError ? error.retryable : true,
        });
      }
    },
    [],
  );

  const analyzeFile = useCallback(
    async (file: File) => {
      const controller = startController();
      fileRef.current = file;
      payloadRef.current = null;
      const processing = (step: Step, detail: string, withOcr = false) => {
        if (!controller.signal.aborted) {
          setState({ status: 'processing', fileName: file.name, step, detail, withOcr });
        }
      };

      processing('extract', 'Sprawdzanie pliku…');
      const validation = await validatePdfFile(file);
      if (!validation.ok) {
        setState({ status: 'error', message: validation.message, canRetry: false });
        return;
      }

      try {
        // pdf.js (~400 KB) ładujemy dopiero po wybraniu pliku — szybsze pierwsze otwarcie strony.
        const { extractPdfText } = await import('./pdfExtract');
        const extracted = await extractPdfText(await file.arrayBuffer(), (page, total) => {
          processing('extract', `Odczyt tekstu: strona ${page} z ${total}`);
        });
        const pagesText = [...extracted.pagesText];
        const ocrPages: number[] = [];
        const clientWarnings: string[] = [];

        // F-10: OCR stron bez warstwy tekstowej
        const toRecognize = extracted.emptyPages.slice(0, MAX_OCR_PAGES);
        if (extracted.emptyPages.length > MAX_OCR_PAGES) {
          clientWarnings.push(
            `OCR wykonano tylko dla ${MAX_OCR_PAGES} z ${extracted.emptyPages.length} stron bez warstwy tekstowej.`,
          );
        }
        if (toRecognize.length > 0 && !controller.signal.aborted) {
          try {
            const recognized = await recognizePages(extracted.pdf, toRecognize, (done, total) => {
              processing(
                'ocr',
                `Rozpoznawanie tekstu ze skanu (OCR): ${done} z ${total} stron`,
                true,
              );
            });
            for (const [pageNumber, text] of recognized) {
              if (meaningfulLength(text) >= MIN_PAGE_CHARS) {
                pagesText[pageNumber - 1] = text;
                ocrPages.push(pageNumber);
              }
            }
          } catch {
            clientWarnings.push(
              'Nie udało się odczytać stron zeskanowanych (OCR) — analiza obejmuje tylko warstwę tekstową.',
            );
          }
        }
        await extracted.release();
        if (controller.signal.aborted) return;

        if (meaningfulLength(pagesText.join('')) < MIN_DOCUMENT_CHARS) {
          setState({
            status: 'error',
            message:
              'Nie znaleziono w dokumencie wystarczającej ilości tekstu. Plik może być pustym skanem lub obrazem niskiej jakości.',
            canRetry: false,
          });
          return;
        }

        const payload: AnalyzePayload = {
          fileName: file.name,
          pages: pagesText.length,
          pagesText,
          ocrPages,
        };
        payloadRef.current = { payload, clientWarnings };
        await sendForAnalysis(payload, clientWarnings, controller);
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message:
            error instanceof PdfReadError ? error.message : 'Nie udało się odczytać pliku PDF.',
          canRetry: !(error instanceof PdfReadError),
        });
      }
    },
    [sendForAnalysis],
  );

  /** F-06: ponowienie — bez ponownego odczytu pliku, jeśli tekst jest już wyodrębniony. */
  const retry = useCallback(() => {
    const saved = payloadRef.current;
    if (saved) {
      void sendForAnalysis(saved.payload, saved.clientWarnings, startController());
    } else if (fileRef.current) {
      void analyzeFile(fileRef.current);
    }
  }, [analyzeFile, sendForAnalysis]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    payloadRef.current = null;
    fileRef.current = null;
    setState({ status: 'idle' });
  }, []);

  const showFromHistory = useCallback((entry: HistoryEntry) => {
    setState({ status: 'done', insight: entry.insight, fromHistory: true });
  }, []);

  const removeHistoryEntry = useCallback((id: string) => {
    setHistory(removeFromHistory(id));
  }, []);

  const clearAllHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  return {
    state,
    history,
    analyzeFile,
    retry,
    reset,
    showFromHistory,
    removeHistoryEntry,
    clearAllHistory,
  };
}

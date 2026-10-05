import { useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { EmptyState } from './components/EmptyState';
import { ErrorPanel } from './components/ErrorPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ProgressPanel } from './components/ProgressPanel';
import { ResultView } from './components/ResultView';
import { useAnalysis } from './lib/useAnalysis';

/** Upuszczenie pliku poza strefą nie może otworzyć PDF-a w karcie (utrata stanu aplikacji). */
function usePreventWindowDrop() {
  useEffect(() => {
    const prevent = (event: DragEvent) => {
      event.preventDefault();
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);
}

export function App() {
  const analysis = useAnalysis();
  const { state } = analysis;
  usePreventWindowDrop();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-bg"
      >
        Przejdź do treści
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
          <div>
            <p className="text-lg font-bold tracking-tight">PDF Insight</p>
            <p className="text-xs text-muted">Podsumowanie i dane strukturalne z dokumentów PDF</p>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="sr-only">PDF Insight — analiza dokumentów PDF</h1>

        {state.status === 'idle' && (
          <div className="grid gap-8">
            <div className="grid gap-4">
              <Dropzone onFile={(file) => void analysis.analyzeFile(file)} />
              <PrivacyNotice />
            </div>
            <EmptyState />
            <HistoryPanel
              entries={analysis.history}
              onOpen={analysis.showFromHistory}
              onRemove={analysis.removeHistoryEntry}
              onClear={analysis.clearAllHistory}
            />
          </div>
        )}

        {state.status === 'processing' && (
          <ProgressPanel
            fileName={state.fileName}
            step={state.step}
            detail={state.detail}
            withOcr={state.withOcr}
            onCancel={analysis.reset}
          />
        )}

        {state.status === 'error' && (
          <ErrorPanel
            message={state.message}
            canRetry={state.canRetry}
            onRetry={analysis.retry}
            onReset={analysis.reset}
          />
        )}

        {state.status === 'done' && (
          <ResultView
            insight={state.insight}
            fromHistory={state.fromHistory}
            onReset={analysis.reset}
          />
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted">
          Wyniki generuje AI i mogą zawierać błędy — weryfikuj je z dokumentem źródłowym. Tekst
          dokumentu jest przetwarzany przez zewnętrzne API AI (DeepSeek).
        </div>
      </footer>
    </div>
  );
}

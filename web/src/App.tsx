import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppFooter, AppHeader } from './components/AppHeader';
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
  // Po powrocie do stanu pustego (anuluj / nowa analiza) fokus wraca na wybór pliku.
  const [refocusFileButton, setRefocusFileButton] = useState(false);
  const { reset, state } = analysis;
  const resetAndRefocus = useCallback(() => {
    setRefocusFileButton(true);
    reset();
  }, [reset]);
  usePreventWindowDrop();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="app-backdrop" aria-hidden="true" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-accent focus:px-4 focus:py-2 focus:font-medium focus:text-accent-ink"
      >
        Przejdź do treści
      </a>

      <AppHeader onLogoClick={resetAndRefocus} />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {state.status === 'idle' && (
          <div className="space-y-14">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="animate-fade-up space-y-4 text-center">
                <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted backdrop-blur">
                  <Sparkles className="size-3.5 text-accent-text" aria-hidden="true" />
                  Analiza dokumentów z AI
                </p>
                <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
                  Zamień PDF w <span className="text-gradient">konkretne dane</span>
                </h1>
                <p className="mx-auto max-w-xl text-base text-pretty text-muted sm:text-lg">
                  Wgraj umowę, fakturę lub raport — otrzymasz krótkie podsumowanie, kluczowe punkty,
                  kwoty, daty i podmioty w formacie JSON.
                </p>
              </div>
              <div className="animate-fade-up space-y-3 [animation-delay:80ms]">
                <Dropzone
                  onFile={(file) => void analysis.analyzeFile(file)}
                  focusOnMount={refocusFileButton}
                />
                <PrivacyNotice />
              </div>
            </div>
            <div className="animate-fade-up [animation-delay:160ms]">
              <EmptyState />
            </div>
            <div className="animate-fade-up [animation-delay:220ms]">
              <HistoryPanel
                entries={analysis.history}
                onOpen={analysis.showFromHistory}
                onRemove={analysis.removeHistoryEntry}
                onClear={analysis.clearAllHistory}
              />
            </div>
          </div>
        )}

        {state.status === 'processing' && (
          <ProgressPanel
            fileName={state.fileName}
            step={state.step}
            detail={state.detail}
            withOcr={state.withOcr}
            onCancel={resetAndRefocus}
          />
        )}

        {state.status === 'error' && (
          <ErrorPanel
            message={state.message}
            canRetry={state.canRetry}
            onRetry={analysis.retry}
            onReset={resetAndRefocus}
          />
        )}

        {state.status === 'done' && (
          <ResultView
            insight={state.insight}
            fromHistory={state.fromHistory}
            onReset={resetAndRefocus}
          />
        )}
      </main>

      <AppFooter />
    </div>
  );
}

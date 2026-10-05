import { ChevronRight, Clock, FileText, Trash } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, timeAgo } from '../lib/format';
import type { HistoryEntry } from '../lib/history';
import { buttonGhost, sectionLabel } from '../lib/styles';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

/** F-09: ostatnie wyniki zapisane lokalnie w przeglądarce. */
export function HistoryPanel({ entries, onOpen, onRemove, onClear }: HistoryPanelProps) {
  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="history-heading" className={sectionLabel}>
          <Clock aria-hidden="true" />
          Ostatnie analizy
        </h2>
        {entries.length > 0 && (
          <button type="button" onClick={onClear} className={`${buttonGhost} text-xs`}>
            Wyczyść historię
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong px-5 py-6 text-sm text-muted">
          <Clock className="size-5 shrink-0" aria-hidden="true" />
          Nie masz jeszcze żadnych analiz. Wyniki zapisują się tylko w tej przeglądarce.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {entries.map((entry) => {
            const { document } = entry.insight;
            return (
              <li key={entry.id} className="card group flex min-w-0 items-center gap-1 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpen(entry);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-soft text-violet">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {document.title ?? document.fileName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {DOCUMENT_TYPE_LABELS[document.type]} · {document.pages} str. ·{' '}
                      {timeAgo(entry.savedAt)}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemove(entry.id);
                  }}
                  aria-label={`Usuń z historii: ${document.fileName}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

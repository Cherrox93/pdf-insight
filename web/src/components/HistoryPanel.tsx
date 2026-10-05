import type { HistoryEntry } from '../lib/history';
import { DOCUMENT_TYPE_LABELS, formatDateTime } from '../lib/format';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

/** F-09: ostatnie wyniki zapisane lokalnie w przeglądarce. */
export function HistoryPanel({ entries, onOpen, onRemove, onClear }: HistoryPanelProps) {
  return (
    <section aria-labelledby="history-heading">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="history-heading"
          className="text-sm font-semibold tracking-widest text-accent uppercase"
        >
          Ostatnie analizy
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-muted underline hover:text-text"
          >
            Wyczyść historię
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted">
          Nie masz jeszcze żadnych analiz. Wyniki zapisują się tylko w tej przeglądarce.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 p-2 sm:p-3">
              <button
                type="button"
                onClick={() => {
                  onOpen(entry);
                }}
                className="min-w-0 flex-1 rounded-md p-1 text-left hover:bg-bg"
              >
                <span className="block truncate font-medium">
                  {entry.insight.document.title ?? entry.insight.document.fileName}
                </span>
                <span className="block truncate text-sm text-muted">
                  {DOCUMENT_TYPE_LABELS[entry.insight.document.type]} ·{' '}
                  {entry.insight.document.fileName} · {formatDateTime(entry.savedAt)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemove(entry.id);
                }}
                aria-label={`Usuń z historii: ${entry.insight.document.fileName}`}
                className="shrink-0 rounded-md px-3 py-2 text-muted hover:bg-bg hover:text-danger"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { Insight } from '@pdf-insight/schema';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { downloadJson, toPrettyJson } from '../lib/download';
import {
  DOCUMENT_TYPE_LABELS,
  formatAmount,
  formatDate,
  formatDateTime,
  languageName,
} from '../lib/format';
import { JsonPreview } from './JsonPreview';
import { Tabs } from './Tabs';

interface ResultViewProps {
  insight: Insight;
  fromHistory: boolean;
  onReset: () => void;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold tracking-widest text-accent uppercase">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyValue() {
  return <p className="text-muted">Brak w dokumencie</p>;
}

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <EmptyValue />;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full border border-border px-3 py-1 text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Overview({ insight }: { insight: Insight }) {
  const { document, meta } = insight;
  return (
    <div className="grid gap-4">
      {meta && meta.warnings.length > 0 && (
        <section
          aria-label="Ostrzeżenia"
          className="rounded-xl border border-warning/50 bg-warning/5 p-5"
        >
          <h3 className="font-semibold text-warning">Uwagi do wyniku</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {meta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <Card title="Podsumowanie">
        <p className="leading-relaxed">{insight.summary}</p>
      </Card>

      <Card title="Kluczowe punkty">
        <ul className="list-disc space-y-1.5 pl-5">
          {insight.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Dokument">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Typ</dt>
            <dd>{DOCUMENT_TYPE_LABELS[document.type]}</dd>
            <dt className="text-muted">Język</dt>
            <dd>
              {languageName(document.language)} ({document.language})
            </dd>
            <dt className="text-muted">Data</dt>
            <dd>{document.date ? formatDate(document.date) : 'brak'}</dd>
            <dt className="text-muted">Strony</dt>
            <dd>{document.pages}</dd>
            <dt className="text-muted">Plik</dt>
            <dd className="break-all">{document.fileName}</dd>
          </dl>
        </Card>

        <Card title="Podmioty">
          <h4 className="text-sm text-muted">Organizacje</h4>
          <div className="mt-2">
            <Chips items={insight.entities.organizations} />
          </div>
          <h4 className="mt-4 text-sm text-muted">Osoby</h4>
          <div className="mt-2">
            <Chips items={insight.entities.people} />
          </div>
        </Card>
      </div>

      <Card title="Kwoty">
        {insight.amounts.length === 0 ? (
          <EmptyValue />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Kwoty wymienione w dokumencie</caption>
              <thead className="text-muted">
                <tr>
                  <th scope="col" className="pr-4 pb-2 font-medium">
                    Kwota
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Opis
                  </th>
                </tr>
              </thead>
              <tbody>
                {insight.amounts.map((amount) => (
                  <tr
                    key={`${amount.value}-${amount.currency}-${amount.context}`}
                    className="border-t border-border"
                  >
                    <td className="py-2 pr-4 font-mono whitespace-nowrap">
                      {formatAmount(amount.value, amount.currency)}
                    </td>
                    <td className="py-2">{amount.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Daty">
        {insight.dates.length === 0 ? (
          <EmptyValue />
        ) : (
          <ol className="space-y-2">
            {insight.dates.map((entry) => (
              <li
                key={`${entry.date}-${entry.context}`}
                className="grid gap-x-4 sm:grid-cols-[11rem_1fr]"
              >
                <time dateTime={entry.date} className="font-mono text-sm text-accent">
                  {formatDate(entry.date)}
                </time>
                <span>{entry.context}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Słowa kluczowe">
        <Chips items={insight.keywords} />
      </Card>
    </div>
  );
}

export function ResultView({ insight, fromHistory, onReset }: ResultViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const json = useMemo(() => toPrettyJson(insight), [insight]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [insight]);

  return (
    <article aria-labelledby="result-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {fromHistory ? 'Wynik z historii' : 'Wynik analizy'}
            {insight.meta && ` · ${formatDateTime(insight.meta.analyzedAt)}`}
          </p>
          <h2
            id="result-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-2xl font-bold break-words"
          >
            {insight.document.title ?? insight.document.fileName}
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              downloadJson(insight);
            }}
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-bg hover:bg-accent/90"
          >
            Pobierz .json
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-border px-4 py-2 hover:border-text"
          >
            Nowa analiza
          </button>
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          label="Widok wyniku"
          activeId={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'overview', label: 'Wynik', content: <Overview insight={insight} /> },
            { id: 'json', label: 'JSON', content: <JsonPreview json={json} /> },
          ]}
        />
      </div>
    </article>
  );
}

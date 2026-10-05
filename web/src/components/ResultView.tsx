import type { Insight } from '@pdf-insight/schema';
import {
  ArrowLeft,
  Braces,
  Building,
  CalendarDays,
  Check,
  Clock,
  Coins,
  Copy,
  Download,
  FileText,
  Languages,
  LayoutGrid,
  ListChecks,
  Sparkles,
  Tag,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { downloadJson, toPrettyJson } from '../lib/download';
import {
  DOCUMENT_TYPE_LABELS,
  formatAmount,
  formatDate,
  formatDateTime,
  initials,
  languageName,
} from '../lib/format';
import { badge, buttonGhost, buttonPrimary, buttonSecondary, sectionLabel } from '../lib/styles';
import { JsonPreview } from './JsonPreview';
import { Tabs } from './Tabs';

interface ResultViewProps {
  insight: Insight;
  fromHistory: boolean;
  onReset: () => void;
}

function Panel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h3 className={sectionLabel}>
        {icon}
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyValue() {
  return <p className="text-sm text-muted">Brak w dokumencie</p>;
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <p className="text-2xl leading-none font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function KeyPoints({ points, className }: { points: string[]; className: string }) {
  return (
    <Panel title="Kluczowe punkty" icon={<ListChecks aria-hidden="true" />} className={className}>
      <ul className="space-y-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-sm leading-relaxed">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            </span>
            {point}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Overview({ insight }: { insight: Insight }) {
  const { entities } = insight;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Kolumna główna */}
      <div className="grid content-start gap-4 lg:col-span-2">
        <Panel title="Podsumowanie" icon={<Sparkles aria-hidden="true" />}>
          <p className="text-[15px] leading-relaxed sm:text-base">{insight.summary}</p>
        </Panel>

        {/* Na wąskich ekranach kluczowe punkty zaraz po podsumowaniu (na desktopie - w bocznej kolumnie). */}
        <KeyPoints points={insight.keyPoints} className="lg:hidden" />

        <Panel title="Kwoty" icon={<Coins aria-hidden="true" />}>
          {insight.amounts.length === 0 ? (
            <EmptyValue />
          ) : (
            <ul className="divide-y divide-border">
              {insight.amounts.map((amount) => (
                <li
                  key={`${amount.value}-${amount.currency}-${amount.context}`}
                  className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="text-sm text-muted">{amount.context}</span>
                  <span className="font-mono text-[15px] font-medium whitespace-nowrap tabular-nums">
                    {formatAmount(amount.value, amount.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Oś czasu" icon={<CalendarDays aria-hidden="true" />}>
          {insight.dates.length === 0 ? (
            <EmptyValue />
          ) : (
            <ol className="relative ml-1.5 space-y-4 border-l border-border-strong pl-6">
              {insight.dates.map((entry) => (
                <li key={`${entry.date}-${entry.context}`} className="relative">
                  <span
                    className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-accent ring-4 ring-bg"
                    aria-hidden="true"
                  />
                  <time
                    dateTime={entry.date}
                    className="font-mono text-xs font-medium text-accent-text"
                  >
                    {formatDate(entry.date)}
                  </time>
                  <p className="mt-0.5 text-sm">{entry.context}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* Kolumna boczna */}
      <div className="grid content-start gap-4">
        <KeyPoints points={insight.keyPoints} className="hidden lg:block" />

        <Panel title="Podmioty" icon={<Users aria-hidden="true" />}>
          <h4 className="text-xs font-medium text-muted">Organizacje</h4>
          {entities.organizations.length === 0 ? (
            <div className="mt-2">
              <EmptyValue />
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {entities.organizations.map((org) => (
                <li key={org} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-soft text-violet">
                    <Building className="size-3.5" aria-hidden="true" />
                  </span>
                  {org}
                </li>
              ))}
            </ul>
          )}
          <h4 className="mt-5 text-xs font-medium text-muted">Osoby</h4>
          {entities.people.length === 0 ? (
            <div className="mt-2">
              <EmptyValue />
            </div>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {entities.people.map((person) => (
                <li
                  key={person}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted py-1 pr-3 pl-1 text-sm"
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-violet text-[10px] font-semibold text-accent-ink"
                    aria-hidden="true"
                  >
                    {initials(person)}
                  </span>
                  {person}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Słowa kluczowe" icon={<Tag aria-hidden="true" />}>
          {insight.keywords.length === 0 ? (
            <EmptyValue />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {insight.keywords.map((keyword) => (
                <li
                  key={keyword}
                  className="rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-sm"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function ResultView({ insight, fromHistory, onReset }: ResultViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const json = useMemo(() => toPrettyJson(insight), [insight]);
  const { document, meta } = insight;

  useEffect(() => {
    headingRef.current?.focus();
  }, [insight]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast('');
    }, 2500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setToast('Skopiowano JSON do schowka');
    } catch {
      setToast('Nie udało się skopiować - użyj zakładki JSON');
    }
  };

  const entityCount = insight.entities.organizations.length + insight.entities.people.length;

  return (
    <article aria-labelledby="result-heading" className="animate-fade-up space-y-5">
      {/* Pasek akcji */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onReset} className={buttonGhost}>
          <ArrowLeft aria-hidden="true" />
          Nowa analiza
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyJson()} className={buttonSecondary}>
            <Copy aria-hidden="true" />
            Kopiuj JSON
          </button>
          <button
            type="button"
            onClick={() => {
              downloadJson(insight);
              setToast('Pobrano plik .json');
            }}
            className={buttonPrimary}
          >
            <Download aria-hidden="true" />
            Pobierz .json
          </button>
        </div>
      </div>

      {/* Karta dokumentu */}
      <header className="card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-accent-soft blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            <span className={`${badge} border-accent-text/30 bg-accent-soft text-accent-text`}>
              <FileText aria-hidden="true" />
              {DOCUMENT_TYPE_LABELS[document.type]}
            </span>
            <span className={badge}>
              <Languages aria-hidden="true" />
              {languageName(document.language)}
            </span>
            {fromHistory && (
              <span className={badge}>
                <Clock aria-hidden="true" />Z historii
              </span>
            )}
          </div>
          <h2
            id="result-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl"
          >
            {document.title ?? document.fileName}
          </h2>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <div className="flex gap-1.5">
              <dt>Data dokumentu:</dt>
              <dd className="text-text">{document.date ? formatDate(document.date) : 'brak'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Strony:</dt>
              <dd className="text-text">{document.pages}</dd>
            </div>
            <div className="flex min-w-0 gap-1.5">
              <dt>Plik:</dt>
              <dd className="truncate text-text">{document.fileName}</dd>
            </div>
            {meta && (
              <div className="flex gap-1.5">
                <dt>Analiza:</dt>
                <dd className="text-text">{formatDateTime(meta.analyzedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {/* Statystyki */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Coins aria-hidden="true" />} label="kwot" value={insight.amounts.length} />
        <StatTile
          icon={<CalendarDays aria-hidden="true" />}
          label="dat"
          value={insight.dates.length}
        />
        <StatTile icon={<Users aria-hidden="true" />} label="podmiotów" value={entityCount} />
        <StatTile
          icon={<ListChecks aria-hidden="true" />}
          label="kluczowych punktów"
          value={insight.keyPoints.length}
        />
      </div>

      {/* Ostrzeżenia */}
      {meta && meta.warnings.length > 0 && (
        <section
          aria-label="Uwagi do wyniku"
          className="flex gap-3 rounded-2xl border border-warning/25 bg-warning-soft p-4 sm:p-5"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-warning">Uwagi do wyniku</h3>
            <ul className="mt-1.5 space-y-1 text-sm text-muted">
              {meta.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Tabs
        label="Widok wyniku"
        activeId={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'overview',
            label: 'Przegląd',
            icon: <LayoutGrid aria-hidden="true" />,
            content: <Overview insight={insight} />,
          },
          {
            id: 'json',
            label: 'JSON',
            icon: <Braces aria-hidden="true" />,
            content: <JsonPreview json={json} />,
          },
        ]}
      />

      {/* Toast - komunikat o akcji (dla czytników ekranu przez role=status). */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-30 -translate-x-1/2 transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        {toast && (
          <span className="inline-flex items-center gap-2 rounded-full bg-text px-4 py-2.5 text-sm font-medium text-bg shadow-card">
            <Check className="size-4" aria-hidden="true" />
            {toast}
          </span>
        )}
      </div>
    </article>
  );
}

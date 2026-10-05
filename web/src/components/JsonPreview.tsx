import { useMemo } from 'react';
import { tokenizeJson, type JsonTokenType } from '../lib/jsonTokens';

interface JsonPreviewProps {
  json: string;
}

const TOKEN_CLASSES: Record<JsonTokenType, string> = {
  key: 'text-accent-text',
  string: 'text-violet',
  number: 'text-warning',
  literal: 'text-danger italic',
  plain: 'text-muted',
};

/** F-05: podgląd JSON z kolorowaniem składni - renderowany jako tekst (bez dangerouslySetInnerHTML). */
export function JsonPreview({ json }: JsonPreviewProps) {
  const tokens = useMemo(() => tokenizeJson(json), [json]);
  const lineCount = useMemo(() => json.split('\n').length, [json]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs text-muted">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-danger/60" />
          <span className="size-2.5 rounded-full bg-warning/60" />
          <span className="size-2.5 rounded-full bg-accent/80" />
        </span>
        <span className="font-mono">wynik.json · {lineCount} linii</span>
      </div>
      {/* Przewijany region musi być osiągalny klawiaturą (WCAG 2.1.1). */}
      <pre
        role="region"
        tabIndex={0}
        aria-label="Wynik analizy w formacie JSON"
        className="max-h-[38rem] overflow-auto p-4 font-mono text-xs leading-relaxed sm:p-5 sm:text-[13px]"
      >
        {tokens.map((token, index) => (
          <span key={index} className={TOKEN_CLASSES[token.type]}>
            {token.text}
          </span>
        ))}
      </pre>
    </div>
  );
}

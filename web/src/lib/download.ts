import type { Insight } from '@pdf-insight/schema';

export function toPrettyJson(insight: Insight): string {
  return JSON.stringify(insight, null, 2);
}

/** „Umowa 14-2026.pdf” → „Umowa 14-2026-insight.json” */
export function jsonFileName(pdfFileName: string): string {
  const base = pdfFileName.replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '_') || 'dokument';
  return `${base}-insight.json`;
}

/** F-05: pobranie wyniku jako pliku .json (generowany lokalnie, bez serwera). */
export function downloadJson(insight: Insight): void {
  const blob = new Blob([toPrettyJson(insight)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = jsonFileName(insight.document.fileName);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

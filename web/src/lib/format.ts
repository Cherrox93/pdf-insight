import type { DocumentType } from '@pdf-insight/schema';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  faktura: 'Faktura',
  umowa: 'Umowa',
  oferta: 'Oferta',
  raport: 'Raport',
  inne: 'Inny dokument',
};

export function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} ${currency}`;
  }
}

/** „2026-03-12” → „12 marca 2026” (bez przesunięć strefy czasowej). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatDateTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(isoDateTime),
  );
}

/** „2 min temu”, „wczoraj”, „3 dni temu”. */
export function timeAgo(isoDateTime: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(isoDateTime).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('pl-PL', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'przed chwilą';
}

/** Inicjały do awatara: „Anna Kowalczyk” → „AK”. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('pl-PL') ?? '')
    .join('');
}

export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['pl'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

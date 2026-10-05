/*
 * Grounding — sprawdzenie, czy kwoty i daty zwrócone przez model rzeczywiście
 * występują w tekście dokumentu. Chroni przed halucynacjami („model nie zgaduje”).
 * Szukamy wszystkich typowych zapisów danej wartości zamiast parsować liczby z tekstu,
 * bo tabele z PDF sklejają sąsiednie kolumny („30.04.2026 15% 27 675,00 zł”).
 */

/**
 * Ujednolica białe znaki do pojedynczej spacji. `\s` w JS obejmuje też twarde spacje
 * (U+00A0, U+202F), których PDF-y używają jako separatora tysięcy.
 */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function groupThousands(integer: string, separator: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Możliwe zapisy liczby w dokumencie, np. 184500 → „184 500,00”, „184.500”, „184500”. */
export function numberVariants(value: number): string[] {
  const [integer = '0', decimals = '00'] = Math.abs(value).toFixed(2).split('.');
  const variants = new Set<string>();

  for (const separator of ['', ' ', '.', ',', "'"]) {
    const grouped = groupThousands(integer, separator);
    if (decimals === '00') {
      variants.add(grouped);
    }
    for (const decimalMark of [',', '.']) {
      if (decimalMark === separator) continue;
      variants.add(`${grouped}${decimalMark}${decimals}`);
      if (decimals.endsWith('0')) variants.add(`${grouped}${decimalMark}${decimals[0] ?? '0'}`);
    }
  }
  return [...variants];
}

const SCALES: { factor: number; words: string }[] = [
  { factor: 1e3, words: 'tys\\.?|tysi[ąę]c\\w*|thousand' },
  { factor: 1e6, words: 'mln|milion\\w*|million\\w*' },
  { factor: 1e9, words: 'mld|miliard\\w*|billion\\w*' },
];

const NUMBER_START = "(?<!\\d)(?<!\\d[ .,'])";
const NUMBER_END = "(?![ .,']?\\d)";

export function isAmountGrounded(value: number, normalizedText: string): boolean {
  const patterns = numberVariants(value).map(
    (variant) => `${NUMBER_START}${escapeRegExp(variant)}${NUMBER_END}`,
  );

  // Zapisy skrócone: „4,2 mln zł” → 4 200 000
  for (const { factor, words } of SCALES) {
    const scaled = Math.abs(value) / factor;
    const rounded = Math.round(scaled * 1000) / 1000;
    // Tylko gdy wartość da się dokładnie zapisać z maks. 3 miejscami po przecinku.
    if (scaled >= 1 && Math.abs(scaled - rounded) < 1e-9) {
      const short = String(rounded);
      for (const variant of new Set([short, short.replace('.', ',')])) {
        patterns.push(`${NUMBER_START}${escapeRegExp(variant)}\\s?(?:${words})`);
      }
    }
  }

  return new RegExp(patterns.join('|'), 'i').test(normalizedText);
}

const MONTHS: Record<string, string[]> = {
  pl: [
    'stycznia',
    'lutego',
    'marca',
    'kwietnia',
    'maja',
    'czerwca',
    'lipca',
    'sierpnia',
    'września',
    'października',
    'listopada',
    'grudnia',
  ],
  en: [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ],
  de: [
    'januar',
    'februar',
    'märz',
    'april',
    'mai',
    'juni',
    'juli',
    'august',
    'september',
    'oktober',
    'november',
    'dezember',
  ],
};

/** Języki, dla których potrafimy rozpoznać daty zapisane słownie. */
export const DATE_GROUNDING_LANGUAGES = new Set(Object.keys(MONTHS));

export function isDateGrounded(isoDate: string, normalizedText: string): boolean {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return false;

  const d = `0?${day}`;
  const m = `0?${month}`;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  const patterns = [`${d}[./-]${m}[./-]${year}`, `${year}[./-]${mm}[./-]${dd}`];

  for (const names of Object.values(MONTHS)) {
    const name = names[month - 1];
    if (!name) continue;
    patterns.push(`${d}(?:\\.|st|nd|rd|th)?\\s${name},?\\s${year}`);
    patterns.push(`${name}\\s${d}(?:st|nd|rd|th)?,?\\s${year}`);
  }

  return new RegExp(`(?<!\\d)(?:${patterns.join('|')})(?!\\d)`, 'iu').test(normalizedText);
}

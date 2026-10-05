import { describe, expect, it } from 'vitest';
import { isAmountGrounded, isDateGrounded, normalizeText, numberVariants } from '../src/grounding';
import { CONTRACT_PAGES } from './fixtures';

const text = normalizeText(CONTRACT_PAGES.join('\n'));

describe('numberVariants', () => {
  it('generuje typowe zapisy kwoty', () => {
    const variants = numberVariants(184500);
    expect(variants).toEqual(
      expect.arrayContaining(['184500', '184 500', '184 500,00', '184.500,00', '184,500.00']),
    );
  });

  it('generuje zapisy z częścią dziesiętną', () => {
    expect(numberVariants(68080.5)).toEqual(expect.arrayContaining(['68 080,50', '68 080,5']));
  });
});

describe('isAmountGrounded', () => {
  it.each([184500, 226935, 27675, 250000, 1200000, 2150, 8600, 890])(
    'znajduje kwotę %d w tekście umowy',
    (value) => {
      expect(isAmountGrounded(value, text)).toBe(true);
    },
  );

  it('rozpoznaje zapis skrócony „4,2 mln zł”', () => {
    expect(isAmountGrounded(4_200_000, text)).toBe(true);
  });

  it.each([310000, 999, 184000, 500])('odrzuca kwotę %d, której nie ma w dokumencie', (value) => {
    expect(isAmountGrounded(value, text)).toBe(false);
  });

  it('znajduje kwoty w wierszu tabeli z sąsiednimi kolumnami liczbowymi', () => {
    // Wiersz z faktury zaliczkowej w pliku testowym (regresja: 55 350 PLN było odrzucane).
    const row = normalizeText('Razem 55 350,00 12 730,50 68 080,50\nDo zapłaty: 68 080,50 zł');
    for (const value of [55350, 12730.5, 68080.5]) {
      expect(isAmountGrounded(value, row)).toBe(true);
    }
  });

  it('znajduje kwotę poprzedzoną rokiem w sąsiedniej kolumnie tabeli', () => {
    // Regresja z testu E2E na fakturze: „1 200,00 zł” było odrzucane przez „2026 ” przed kwotą.
    const row = normalizeText(
      '2 Pielęgnacja zieleni - październik 2026\n1 200,00 zł 8% 1 296,00 zł',
    );
    expect(isAmountGrounded(1200, row)).toBe(true);
    expect(isAmountGrounded(1296, row)).toBe(true);
  });

  it('nie dopasowuje fragmentu większej liczby', () => {
    expect(isAmountGrounded(200000, normalizeText('kapitał 1 200 000,00 zł'))).toBe(false);
    expect(isAmountGrounded(675, normalizeText('27 675,00 zł'))).toBe(false);
  });
});

describe('isDateGrounded', () => {
  it.each(['2026-03-12', '2026-04-01', '2026-04-30', '2028-03-31'])(
    'znajduje datę %s zapisaną liczbowo lub słownie',
    (date) => {
      expect(isDateGrounded(date, text)).toBe(true);
    },
  );

  it('rozpoznaje zapisy angielskie i ISO', () => {
    expect(isDateGrounded('2026-10-12', normalizeText('Go-live on October 12, 2026.'))).toBe(true);
    expect(isDateGrounded('2026-10-12', normalizeText('deadline 2026-10-12'))).toBe(true);
  });

  it.each(['2026-03-13', '2027-04-01', '2026-11-20'])('odrzuca datę %s spoza dokumentu', (date) => {
    expect(isDateGrounded(date, text)).toBe(false);
  });
});

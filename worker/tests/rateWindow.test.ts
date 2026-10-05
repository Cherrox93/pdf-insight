import { describe, expect, it } from 'vitest';
import { consumeRate, type RateWindow } from '../src/rateWindow';

describe('consumeRate', () => {
  it('przepuszcza dokładnie limit żądań w oknie, kolejne blokuje', () => {
    const windows = new Map<string, RateWindow>();
    const results = Array.from({ length: 12 }, (_, i) =>
      consumeRate(windows, '1.2.3.4', 10, 60_000, 1_000 + i),
    );
    expect(results.filter(Boolean)).toHaveLength(10);
    expect(results.slice(10)).toEqual([false, false]);
  });

  it('liczy osobno dla każdego adresu IP', () => {
    const windows = new Map<string, RateWindow>();
    for (let i = 0; i < 10; i++) consumeRate(windows, 'a', 10, 60_000, 0);
    expect(consumeRate(windows, 'a', 10, 60_000, 1)).toBe(false);
    expect(consumeRate(windows, 'b', 10, 60_000, 1)).toBe(true);
  });

  it('po upływie okna znowu przepuszcza', () => {
    const windows = new Map<string, RateWindow>();
    for (let i = 0; i < 10; i++) consumeRate(windows, 'a', 10, 60_000, 0);
    expect(consumeRate(windows, 'a', 10, 60_000, 59_999)).toBe(false);
    expect(consumeRate(windows, 'a', 10, 60_000, 60_000)).toBe(true);
  });

  it('usuwa wygasłe okna przy dużej liczbie adresów', () => {
    const windows = new Map<string, RateWindow>();
    for (let i = 0; i < 1000; i++) consumeRate(windows, `ip-${i}`, 10, 60_000, 0);
    consumeRate(windows, 'nowy', 10, 60_000, 120_000);
    expect(windows.size).toBe(1);
  });
});

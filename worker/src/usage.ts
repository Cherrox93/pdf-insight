import { DurableObject } from 'cloudflare:workers';
import { consumeRate, type RateWindow } from './rateWindow';

interface DailyUsage {
  day: string;
  count: number;
}

/**
 * Liczniki limitów. Durable Object jest spójny (w przeciwieństwie do KV i wbudowanego
 * Rate Limiting Cloudflare, które liczą przybliżenie per lokalizacja), więc limity są dokładne.
 */
export class UsageCounter extends DurableObject {
  /** Okna per adres IP - tylko w pamięci, adresy IP nie są zapisywane na dysku. */
  private readonly rateWindows = new Map<string, RateWindow>();

  checkRate(ip: string, limit: number, windowMs: number): boolean {
    return consumeRate(this.rateWindows, ip, limit, windowMs, Date.now());
  }

  async tryConsume(day: string, limit: number): Promise<boolean> {
    const current = await this.ctx.storage.get<DailyUsage>('usage');
    const count = current?.day === day ? current.count : 0;
    if (count >= limit) return false;
    await this.ctx.storage.put<DailyUsage>('usage', { day, count: count + 1 });
    return true;
  }
}

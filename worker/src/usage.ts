import { DurableObject } from 'cloudflare:workers';

interface DailyUsage {
  day: string;
  count: number;
}

/**
 * Globalny licznik analiz na dobę. Durable Object daje spójny licznik
 * (w przeciwieństwie do KV), więc limit nie „przecieka” przy równoległych żądaniach.
 */
export class UsageCounter extends DurableObject {
  async tryConsume(day: string, limit: number): Promise<boolean> {
    const current = await this.ctx.storage.get<DailyUsage>('usage');
    const count = current?.day === day ? current.count : 0;
    if (count >= limit) return false;
    await this.ctx.storage.put<DailyUsage>('usage', { day, count: count + 1 });
    return true;
  }
}

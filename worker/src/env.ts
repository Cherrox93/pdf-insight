import type { UsageCounter } from './usage';

export interface Env {
  /** Klucz API dostawcy LLM - wyłącznie jako sekret (`wrangler secret put LLM_API_KEY`). */
  LLM_API_KEY?: string;
  /** Bazowy adres API zgodnego z OpenAI, np. https://api.deepseek.com */
  LLM_BASE_URL: string;
  LLM_MODEL: string;
  /** "true" - wysyła `thinking: { type: "disabled" }` (DeepSeek); szybsza odpowiedź. */
  LLM_DISABLE_THINKING?: string;
  /** Lista dozwolonych originów oddzielona przecinkami. */
  ALLOWED_ORIGINS: string;
  /** Globalny limit analiz na dobę (ochrona salda API). */
  DAILY_LIMIT: string;
  RATE_LIMITER: RateLimit;
  USAGE: DurableObjectNamespace<UsageCounter>;
}

import { z } from 'zod';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmClient {
  readonly model: string;
  /** Zwraca surową treść odpowiedzi modelu (oczekiwany JSON). */
  complete(messages: ChatMessage[]): Promise<string>;
}

/** Dostawca LLM nie odpowiedział poprawnie (sieć, timeout, błąd HTTP, limit). */
export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
        finish_reason: z.string().nullable(),
      }),
    )
    .min(1),
});

export interface OpenAiCompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxTokens?: number;
  fetchFn?: typeof fetch;
}

/**
 * Klient dla API zgodnego z OpenAI Chat Completions (DeepSeek, Gemini, OpenAI…).
 * Zmiana dostawcy = zmiana LLM_BASE_URL / LLM_MODEL / LLM_API_KEY, bez zmian w kodzie.
 */
export function createOpenAiCompatibleClient(options: OpenAiCompatibleOptions): LlmClient {
  const { baseUrl, apiKey, model, timeoutMs = 45_000, maxTokens = 4096 } = options;
  const fetchFn = options.fetchFn ?? fetch;
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return {
    model,
    async complete(messages) {
      let response: Response;
      try {
        response = await fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            stream: false,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.name : 'unknown';
        throw new LlmUnavailableError(`Brak odpowiedzi od dostawcy LLM (${reason}).`);
      }

      if (!response.ok) {
        throw new LlmUnavailableError(`Dostawca LLM zwrócił status ${response.status}.`);
      }

      const parsed = chatCompletionSchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) {
        throw new LlmUnavailableError('Nieoczekiwany format odpowiedzi dostawcy LLM.');
      }

      // Pusta treść lub obcięcie (finish_reason = "length") traktujemy jak błędną odpowiedź —
      // zweryfikuje to walidacja i ewentualnie ponowna próba.
      const choice = parsed.data.choices[0];
      return choice?.message.content ?? '';
    },
  };
}

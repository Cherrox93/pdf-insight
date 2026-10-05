import { insightSchema, type Insight } from '@pdf-insight/schema';

export interface AnalyzePayload {
  fileName: string;
  pages: number;
  pagesText: string[];
  ocrPages: number[];
}

/** Czas oczekiwania na wynik (z zapasem na ponowną próbę po stronie serwera). */
const REQUEST_TIMEOUT_MS = 90_000;

export class AnalysisError extends Error {
  constructor(
    message: string,
    /** Czy ponowienie tego samego żądania ma sens. */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

const ERROR_MESSAGES: Record<string, { message: string; retryable: boolean }> = {
  RATE_LIMITED: {
    message: 'Wykonano zbyt wiele analiz w krótkim czasie. Odczekaj minutę i spróbuj ponownie.',
    retryable: true,
  },
  DAILY_LIMIT: {
    message: 'Wyczerpano dzienny limit analiz w wersji demo. Spróbuj ponownie jutro.',
    retryable: false,
  },
  PAYLOAD_TOO_LARGE: {
    message: 'Dokument zawiera zbyt dużo tekstu do analizy (limit ok. 300 tys. znaków).',
    retryable: false,
  },
  TEXT_TOO_SHORT: {
    message: 'Dokument zawiera zbyt mało tekstu, aby rzetelnie go podsumować.',
    retryable: false,
  },
  AI_INVALID_RESPONSE: {
    message: 'AI zwróciło wynik niezgodny ze schematem (również po ponownej próbie).',
    retryable: true,
  },
  AI_UNAVAILABLE: {
    message: 'Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę.',
    retryable: true,
  },
  FORBIDDEN_ORIGIN: {
    message: 'Serwer odrzucił żądanie z tej domeny.',
    retryable: false,
  },
};

const GENERIC_ERROR = {
  message: 'Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie.',
  retryable: true,
};

function apiUrl(): string {
  const base = import.meta.env.VITE_API_URL;
  if (!base) throw new AnalysisError('Aplikacja nie ma skonfigurowanego adresu API.', false);
  return `${base.replace(/\/+$/, '')}/analyze`;
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const { error } = body;
      if (typeof error === 'object' && error !== null && 'code' in error) {
        return typeof error.code === 'string' ? error.code : null;
      }
    }
  } catch {
    // brak treści JSON — użyjemy komunikatu ogólnego
  }
  return null;
}

export async function requestAnalysis(
  payload: AnalyzePayload,
  signal: AbortSignal,
): Promise<Insight> {
  let response: Response;
  try {
    response = await fetch(apiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new AnalysisError('Analiza trwa zbyt długo. Spróbuj ponownie.', true);
    }
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AnalysisError(
      'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
      true,
    );
  }

  if (!response.ok) {
    const code = await readErrorCode(response);
    const known = (code ? ERROR_MESSAGES[code] : undefined) ?? GENERIC_ERROR;
    throw new AnalysisError(known.message, known.retryable);
  }

  // F-04: wynik walidowany schematem przed wyświetleniem.
  const parsed = insightSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new AnalysisError('Serwer zwrócił dane niezgodne ze schematem wyniku.', true);
  }
  return parsed.data;
}

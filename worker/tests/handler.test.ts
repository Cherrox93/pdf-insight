import { describe, expect, it } from 'vitest';
import type { Env } from '../src/env';
import { handleRequest } from '../src/handler';
import { CONTRACT_PAGES, fakeLlm, validAnalysis } from './fixtures';

const ORIGIN = 'https://cherrox93.github.io';

function makeEnv(options: { rateLimitOk?: boolean; quotaOk?: boolean } = {}): Env {
  const { rateLimitOk = true, quotaOk = true } = options;
  return {
    LLM_BASE_URL: 'https://example.invalid',
    LLM_MODEL: 'fake-model',
    ALLOWED_ORIGINS: `${ORIGIN}, http://localhost:5173`,
    DAILY_LIMIT: '300',
    RATE_LIMITER: { limit: () => Promise.resolve({ success: rateLimitOk }) },
    USAGE: {
      idFromName: () => ({}),
      get: () => ({ tryConsume: () => Promise.resolve(quotaOk) }),
    },
  } as unknown as Env;
}

function analyzeRequest(body: unknown, origin = ORIGIN): Request {
  const json = JSON.stringify(body);
  return new Request('https://api.example/analyze', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'Content-Length': String(new TextEncoder().encode(json).length),
    },
    body: json,
  });
}

const validBody = {
  fileName: 'umowa.pdf',
  pages: CONTRACT_PAGES.length,
  pagesText: CONTRACT_PAGES,
  ocrPages: [],
};

async function errorCode(response: Response): Promise<string> {
  const body: { error: { code: string } } = await response.json();
  return body.error.code;
}

describe('handleRequest', () => {
  it('zwraca wynik analizy z nagłówkami CORS dla dozwolonego originu', async () => {
    const llm = fakeLlm([JSON.stringify(validAnalysis())]);
    const response = await handleRequest(analyzeRequest(validBody), makeEnv(), { llm });
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('odrzuca niedozwolony origin bez wywołania AI', async () => {
    const llm = fakeLlm([]);
    const response = await handleRequest(
      analyzeRequest(validBody, 'https://evil.example'),
      makeEnv(),
      { llm },
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(llm.calls).toHaveLength(0);
  });

  it('obsługuje preflight OPTIONS', async () => {
    const request = new Request('https://api.example/analyze', {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN },
    });
    const response = await handleRequest(request, makeEnv(), { llm: fakeLlm([]) });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('zwraca 429 po przekroczeniu limitu żądań', async () => {
    const response = await handleRequest(
      analyzeRequest(validBody),
      makeEnv({ rateLimitOk: false }),
      { llm: fakeLlm([]) },
    );
    expect(response.status).toBe(429);
    expect(await errorCode(response)).toBe('RATE_LIMITED');
  });

  it('zwraca 429 po wyczerpaniu dziennego limitu', async () => {
    const response = await handleRequest(analyzeRequest(validBody), makeEnv({ quotaOk: false }), {
      llm: fakeLlm([]),
    });
    expect(await errorCode(response)).toBe('DAILY_LIMIT');
  });

  it('zwraca 400 dla nieprawidłowego żądania', async () => {
    const response = await handleRequest(analyzeRequest({ ...validBody, pages: 5 }), makeEnv(), {
      llm: fakeLlm([]),
    });
    expect(response.status).toBe(400);
  });

  it('zwraca 422 dla dokumentu ze zbyt małą ilością tekstu', async () => {
    const response = await handleRequest(
      analyzeRequest({ fileName: 'a.pdf', pages: 1, pagesText: ['Faktura nr 5'], ocrPages: [] }),
      makeEnv(),
      { llm: fakeLlm([]) },
    );
    expect(response.status).toBe(422);
    expect(await errorCode(response)).toBe('TEXT_TOO_SHORT');
  });

  it('zwraca 413 dla zbyt dużego dokumentu', async () => {
    const response = await handleRequest(
      analyzeRequest({
        fileName: 'a.pdf',
        pages: 1,
        pagesText: ['x'.repeat(300_001)],
        ocrPages: [],
      }),
      makeEnv(),
      { llm: fakeLlm([]) },
    );
    expect(response.status).toBe(413);
  });

  it('zwraca 502 po dwóch niepoprawnych odpowiedziach AI', async () => {
    const llm = fakeLlm(['{}', '{"x":1}']);
    const response = await handleRequest(analyzeRequest(validBody), makeEnv(), { llm });
    expect(response.status).toBe(502);
    expect(await errorCode(response)).toBe('AI_INVALID_RESPONSE');
  });

  it('zwraca 500 CONFIG_ERROR, gdy brakuje klucza API', async () => {
    const response = await handleRequest(analyzeRequest(validBody), makeEnv(), { llm: null });
    expect(await errorCode(response)).toBe('CONFIG_ERROR');
  });

  it('odpowiada na /health', async () => {
    const response = await handleRequest(new Request('https://api.example/health'), makeEnv(), {
      llm: null,
    });
    expect(response.status).toBe(200);
  });
});

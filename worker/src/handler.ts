import { AiInvalidResponseError, analyzeDocument } from './analyze';
import { corsHeaders, isOriginAllowed, parseAllowedOrigins } from './cors';
import type { Env } from './env';
import { errorResponse, HttpError, jsonResponse } from './http';
import { LlmUnavailableError, type LlmClient } from './llm';
import { parseAnalyzeRequest } from './request';

export interface Deps {
  llm: LlmClient | null;
  now?: () => Date;
}

const RATE_WINDOW_MS = 60_000;

function usageCounter(env: Env) {
  return env.USAGE.get(env.USAGE.idFromName('global'));
}

async function enforceRateLimit(request: Request, env: Env): Promise<void> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const limit = Number(env.RATE_LIMIT_PER_MINUTE) || 10;
  const allowed = await usageCounter(env).checkRate(ip, limit, RATE_WINDOW_MS);
  if (!allowed) {
    throw new HttpError(429, 'RATE_LIMITED', 'Zbyt wiele analiz w krótkim czasie.');
  }
}

async function consumeDailyQuota(env: Env, now: Date): Promise<void> {
  const limit = Number(env.DAILY_LIMIT) || 300;
  const allowed = await usageCounter(env).tryConsume(now.toISOString().slice(0, 10), limit);
  if (!allowed) {
    throw new HttpError(429, 'DAILY_LIMIT', 'Wyczerpano dzienny limit analiz demo.');
  }
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof AiInvalidResponseError) {
    return new HttpError(502, 'AI_INVALID_RESPONSE', 'AI zwróciło niepoprawny wynik.');
  }
  if (error instanceof LlmUnavailableError) {
    return new HttpError(503, 'AI_UNAVAILABLE', 'Usługa AI jest chwilowo niedostępna.');
  }
  return new HttpError(500, 'INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd serwera.');
}

export async function handleRequest(request: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/health' && request.method === 'GET') {
    return jsonResponse({ status: 'ok' }, 200);
  }

  // CORS: odpowiadamy wyłącznie dozwolonym originom (domena demo na GitHub Pages).
  const origin = request.headers.get('Origin');
  if (!isOriginAllowed(origin, parseAllowedOrigins(env.ALLOWED_ORIGINS))) {
    return errorResponse(new HttpError(403, 'FORBIDDEN_ORIGIN', 'Niedozwolone źródło żądania.'));
  }
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (url.pathname !== '/analyze') {
    return errorResponse(new HttpError(404, 'NOT_FOUND', 'Nie znaleziono.'), cors);
  }
  if (request.method !== 'POST') {
    return errorResponse(new HttpError(405, 'METHOD_NOT_ALLOWED', 'Metoda niedozwolona.'), {
      ...cors,
      Allow: 'POST, OPTIONS',
    });
  }

  const now = deps.now?.() ?? new Date();
  try {
    if (!deps.llm) {
      throw new HttpError(500, 'CONFIG_ERROR', 'Serwer nie ma skonfigurowanego dostępu do AI.');
    }
    await enforceRateLimit(request, env);
    const input = await parseAnalyzeRequest(request);
    await consumeDailyQuota(env, now);
    const insight = await analyzeDocument(input, deps.llm, now);
    return jsonResponse(insight, 200, cors);
  } catch (error) {
    const httpError = toHttpError(error);
    if (httpError.status >= 500) {
      // Logujemy wyłącznie typ błędu - nigdy treści dokumentu.
      console.error(
        JSON.stringify({
          event: 'analyze_failed',
          code: httpError.code,
          cause: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
    return errorResponse(httpError, cors);
  }
}

export type ErrorCode =
  | 'FORBIDDEN_ORIGIN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'LENGTH_REQUIRED'
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'TEXT_TOO_SHORT'
  | 'RATE_LIMITED'
  | 'DAILY_LIMIT'
  | 'AI_INVALID_RESPONSE'
  | 'AI_UNAVAILABLE'
  | 'CONFIG_ERROR'
  | 'INTERNAL_ERROR';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

/** Odpowiedź błędu: tylko kod i komunikat - bez stack trace i surowej odpowiedzi modelu. */
export function errorResponse(error: HttpError, headers: Record<string, string> = {}): Response {
  return jsonResponse(
    { error: { code: error.code, message: error.message } },
    error.status,
    headers,
  );
}

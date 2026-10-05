import { describe, expect, it } from 'vitest';
import { createOpenAiCompatibleClient, LlmUnavailableError } from '../src/llm';

function fakeFetch(status: number, body: unknown) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const fetchFn = (url: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: url as string,
      body: JSON.parse(init?.body as string) as Record<string, unknown>,
    });
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
  return { fetchFn: fetchFn, requests };
}

const okBody = { choices: [{ message: { content: '{"a":1}' }, finish_reason: 'stop' }] };

describe('createOpenAiCompatibleClient', () => {
  it('wysyła żądanie w trybie JSON do /chat/completions i zwraca treść', async () => {
    const { fetchFn, requests } = fakeFetch(200, okBody);
    const client = createOpenAiCompatibleClient({
      baseUrl: 'https://api.example/',
      apiKey: 'k',
      model: 'm',
      fetchFn,
    });
    await expect(client.complete([{ role: 'user', content: 'x' }])).resolves.toBe('{"a":1}');
    expect(requests[0]?.url).toBe('https://api.example/chat/completions');
    expect(requests[0]?.body).toMatchObject({
      model: 'm',
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    expect(requests[0]?.body).not.toHaveProperty('thinking');
  });

  it('wyłącza tryb thinking, gdy disableThinking = true', async () => {
    const { fetchFn, requests } = fakeFetch(200, okBody);
    const client = createOpenAiCompatibleClient({
      baseUrl: 'https://api.example',
      apiKey: 'k',
      model: 'm',
      disableThinking: true,
      fetchFn,
    });
    await client.complete([]);
    expect(requests[0]?.body.thinking).toEqual({ type: 'disabled' });
  });

  it.each([402, 429, 500])('zgłasza LlmUnavailableError dla statusu %i', async (status) => {
    const { fetchFn } = fakeFetch(status, { error: 'x' });
    const client = createOpenAiCompatibleClient({ baseUrl: 'u', apiKey: 'k', model: 'm', fetchFn });
    await expect(client.complete([])).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it('zgłasza LlmUnavailableError dla nieoczekiwanego formatu odpowiedzi', async () => {
    const { fetchFn } = fakeFetch(200, { unexpected: true });
    const client = createOpenAiCompatibleClient({ baseUrl: 'u', apiKey: 'k', model: 'm', fetchFn });
    await expect(client.complete([])).rejects.toBeInstanceOf(LlmUnavailableError);
  });
});

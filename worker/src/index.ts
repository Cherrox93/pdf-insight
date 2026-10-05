import type { Env } from './env';
import { handleRequest } from './handler';
import { createOpenAiCompatibleClient } from './llm';

export { UsageCounter } from './usage';

export default {
  fetch(request, env) {
    const llm = env.LLM_API_KEY
      ? createOpenAiCompatibleClient({
          baseUrl: env.LLM_BASE_URL,
          apiKey: env.LLM_API_KEY,
          model: env.LLM_MODEL,
        })
      : null;
    return handleRequest(request, env, { llm });
  },
} satisfies ExportedHandler<Env>;

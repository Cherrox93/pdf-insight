/*
 * Deterministyczna heurystyka wykrywania prób prompt injection — działa niezależnie
 * od modelu (model zgłasza to samo przez pole injectionDetected). Wynik służy wyłącznie
 * do ostrzeżenia użytkownika; tekstu nie usuwamy, bo to część treści dokumentu.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions|prompts?|rules)/i,
  /disregard\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above)/i,
  /zignoruj\s+(?:wszystkie\s+)?(?:wcześniejsze|poprzednie|powyższe)\s+(?:polecenia|instrukcje)/i,
  /instrukcj\w*\s+dla\s+(?:systemu\s+)?(?:ai|sztucznej\s+inteligencji|modelu|asystenta)/i,
  /(?:system|developer)\s+prompt/i,
  /you\s+are\s+now\s+(?:a|an|in)\b/i,
];

export function looksLikePromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

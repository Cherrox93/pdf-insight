export type JsonTokenType = 'key' | 'string' | 'number' | 'literal' | 'plain';

export interface JsonToken {
  type: JsonTokenType;
  text: string;
}

const TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

/**
 * Dzieli sformatowany JSON na tokeny do kolorowania składni. Wynik renderujemy jako
 * elementy React (tekst), więc nie ma ryzyka XSS jak przy wstrzykiwaniu HTML.
 */
export function tokenizeJson(json: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let last = 0;
  for (const match of json.matchAll(TOKEN_PATTERN)) {
    const index = match.index;
    if (index > last) tokens.push({ type: 'plain', text: json.slice(last, index) });
    const [whole, quoted, colon] = match;
    if (quoted !== undefined) {
      tokens.push({ type: colon ? 'key' : 'string', text: quoted });
      if (colon) tokens.push({ type: 'plain', text: colon });
    } else {
      tokens.push({ type: /^-?\d/.test(whole) ? 'number' : 'literal', text: whole });
    }
    last = index + whole.length;
  }
  if (last < json.length) tokens.push({ type: 'plain', text: json.slice(last) });
  return tokens;
}

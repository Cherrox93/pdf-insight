# AI_LOG — praca z AI przy PDF Insight

## Narzędzia

| Narzędzie                                                 | Zastosowanie                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code** (rozszerzenie VS Code, model Claude Opus) | Analiza briefu i pliku testowego, plan architektury, generowanie kodu, testów, CI i dokumentacji, przegląd błędów lintera/typów |
| **DeepSeek API** (`deepseek-flash`)                       | Model wykorzystywany przez aplikację do analizy dokumentów (runtime, nie do pisania kodu)                                       |

Każdy fragment kodu został przeze mnie przejrzany; decyzje architektoniczne (poniżej) podejmowałem świadomie, porównując warianty zaproponowane przez AI.

## Kluczowe prompty

1. **Analiza wymagań i plan**

   > „Najpierw zapoznaj się w pełni z dokumentami (brief + PDF testowy), przygotuj plan wszystkiego, co aplikacja ma zawierać, jak działać oraz spełniać wszystkie wymogi, i przedstaw pełną architekturę. Kodowaniem zajmiemy się, kiedy będziemy mieć gotowy plan.”

   Efekt: lista pułapek w pliku testowym (prompt injection na str. 4, skan aneksu bez warstwy tekstowej na str. 11, trzy waluty, fragment po angielsku, mylące kwoty typu budżet/kapitał zakładowy), architektura front → proxy → LLM, plan commitów.

2. **Weryfikacja planu z briefem**

   > „Sprawdź, czy spełniamy wszystkie wymagania ze stacku, frontendu, backendu, pułapek GitHub Pages, schematu danych, standardów i kryteriów oceny. Do LLM użyjemy DeepSeek API — co o tym sądzisz?”

   Efekt: wykryto 6 luk (m.in. brak `404.html`, `title` musi dopuszczać `null`, brak `prettier --check` w CI, sformułowanie informacji o wysyłce do AI, potrzeba globalnego dziennego limitu przy płatnym API) oraz ryzyka DeepSeek (brak wymuszania schematu JSON, opóźnienia, lokalizacja danych) → decyzja o warstwie `LlmClient` zgodnej z API OpenAI, aby móc zmienić dostawcę bez zmian w kodzie.

3. **Implementacja backendu**

   > „Zbuduj Cloudflare Worker: CORS tylko dla domeny demo, limit żądań per IP i dzienny limit globalny, walidacja żądania Zod, wywołanie LLM w trybie JSON, walidacja odpowiedzi i dokładnie jedna ponowna próba z listą błędów, obrona przed prompt injection, chunking długich dokumentów.”

4. **Grounding (jakość wyników AI)**

   > „Dodaj weryfikację, że każda kwota i data zwrócona przez model występuje w tekście dokumentu w dowolnym typowym zapisie (184 500,00 zł / 184.500 / 4,2 mln zł / 12.03.2026 / 12 marca 2026). Niezweryfikowane pozycje usuń i dodaj ostrzeżenie.”

5. **Frontend i dostępność**
   > „Zbuduj UI: dropzone obsługiwany klawiaturą, stany ładowania/błędu/pusty, zakładki Wynik/JSON zgodne z WAI-ARIA, pobieranie .json, historia w localStorage walidowana Zod, responsywność od 360 px, komunikaty po polsku.”

## Gdzie AI się pomyliło i jak to poprawiłem

| #   | Błąd AI                                                                                                                                          | Jak wykryto                                     | Poprawka                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Warunek skalowania kwot (`4,2 mln`) w `grounding.ts` był zawsze prawdziwy: `Number.isInteger(Math.round(x*1000)/1000*1000)`                      | Przegląd kodu przed uruchomieniem testów        | Porównanie `abs(scaled - rounded) < 1e-9` + test dla „4,2 mln zł”      |
| 2   | Wyrażenie dla dat słownych wymagało dwóch spacji przed rokiem (`\s?,?\s`), więc „31 marca 2028” nie przechodziło                                 | Przegląd kodu                                   | Wzorzec `,?\s` + testy dat z pliku testowego                           |
| 3   | Escape'y `  ` w wyrażeniu regularnym zostały zapisane jako niewidoczne znaki (ESLint: `no-irregular-whitespace`)                                 | ESLint                                          | Uproszczenie do `\s+` — w JS `\s` obejmuje twarde spacje               |
| 4   | Plan zakładał sortowanie fragmentów tekstu PDF po współrzędnych X/Y — to przeplatałoby kolumny na stronie dwukolumnowej (str. 6 pliku testowego) | Analiza układu pliku testowego                  | Kolejność strumienia treści pdf.js + `hasEOL`                          |
| 5   | Kod pod starsze API pdf.js (`isEvalSupported`, `pdf.destroy()`), nieistniejące w pdf.js 6                                                        | `tsc` (TypeScript strict)                       | Sprawdzenie typów w `node_modules/pdfjs-dist`, `loadingTask.destroy()` |
| 6   | Zod 4: użycie przestarzałego `.finite()` (w v4 `z.number()` odrzuca już Infinity)                                                                | ESLint `no-deprecated`                          | Usunięcie wywołania                                                    |
| 7   | Propozycja najnowszych wersji ESLint 10 i TypeScript 7 — niekompatybilne z `eslint-plugin-jsx-a11y` i `typescript-eslint`                        | Sprawdzenie `peerDependencies` przed instalacją | ESLint 9 + TypeScript 6.0                                              |
| 8   | Pierwsza wersja testu chunkingu zakładała 3 fragmenty, a algorytm tworzył 4 (każda strona osobno)                                                | Przeliczenie progów                             | Dane testowe dopasowane do progów (2 fragmenty + wywołanie łączące)    |

## Czego AI nie robiło samodzielnie

- Klucze API (DeepSeek, Cloudflare) ustawiałem sam przez `wrangler secret put` / sekrety GitHub — nigdy nie trafiły do czatu ani repozytorium.
- Decyzje: wybór dostawcy LLM, backendu (Cloudflare Workers), zakresu OCR.

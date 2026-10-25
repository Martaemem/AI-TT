import { Settings, Step, Term, Tip } from './types';
import { CATEGORIES } from './theme';

const TIKTOK_RE = /https?:\/\/(?:[\w-]+\.)?tiktok\.com\/[^\s]+/i;

export const extractTikTokUrl = (text: string): string | null => text.match(TIKTOK_RE)?.[0] ?? null;

export type Analysis = Pick<
  Tip,
  'title' | 'summary' | 'tool' | 'category' | 'difficulty' | 'steps' | 'prompts' | 'toolsNeeded' | 'tags' | 'keyPoints' | 'terms'
>;

const SYSTEM = `Jesteś asystentem, który porządkuje porady o AI zebrane z filmów TikTok.
Dostajesz opis filmu i/lub transkrypcję. Zwróć WYŁĄCZNIE obiekt JSON (bez markdown) o polach:
{
 "title": krótki tytuł po polsku (maks. 60 znaków),
 "summary": 1-2 zdania: co ta porada daje,
 "keyPoints": [3-6 najważniejszych informacji z filmu, każda jedno konkretne zdanie],
 "terms": [{"name": nazwa hasła/komendy/funkcji/ustawienia do użycia, "desc": do czego służy, jedno zdanie}],
 "tool": główne narzędzie AI (np. "ChatGPT", "Claude", "Midjourney"; jeśli brak: "AI"),
 "category": jedna z: ${CATEGORIES.join(', ')},
 "difficulty": "łatwe" | "średnie" | "trudne",
 "toolsNeeded": [narzędzia/konta/rzeczy potrzebne do wykonania],
 "steps": [{"text": instrukcja kroku w trybie rozkazującym, "prompt": opcjonalnie gotowy prompt do wklejenia w tym kroku}],
 "prompts": [wszystkie prompty wspomniane w materiale, gotowe do skopiowania],
 "tags": [2-5 krótkich tagów małymi literami]
}
Nie zmyślaj faktów, których nie ma w materiale; jeśli materiał jest skąpy, daj mniej kroków. Pisz po polsku.`;

function parseJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Odpowiedź AI nie zawiera JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

function normalize(j: any, fallbackTitle: string): Analysis {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const steps: Step[] = Array.isArray(j.steps)
    ? j.steps
        .map((s: any) => (typeof s === 'string' ? { text: s } : { text: String(s?.text ?? ''), prompt: s?.prompt ? String(s.prompt) : undefined }))
        .filter((s: Step) => s.text.trim())
    : [];
  const difficulty = ['łatwe', 'średnie', 'trudne'].includes(j.difficulty) ? j.difficulty : 'łatwe';
  return {
    title: String(j.title || fallbackTitle || 'Porada AI').slice(0, 80),
    summary: String(j.summary ?? ''),
    tool: String(j.tool || 'AI'),
    category: CATEGORIES.includes(j.category) ? j.category : 'Inne',
    difficulty,
    steps,
    prompts: arr(j.prompts),
    keyPoints: arr(j.keyPoints),
    terms: Array.isArray(j.terms)
      ? j.terms.map((t: any): Term => ({ name: String(t?.name ?? ''), desc: String(t?.desc ?? '') })).filter((t: Term) => t.name)
      : [],
    toolsNeeded: arr(j.toolsNeeded),
    tags: arr(j.tags).slice(0, 5),
  };
}

export async function analyzeWithClaude(source: string, apiKey: string, model: string): Promise<Analysis> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 2000, system: SYSTEM, messages: [{ role: 'user', content: source }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(res.status === 401 ? 'Nieprawidłowy klucz API (Więcej → Ustawienia AI).' : `Błąd API ${res.status}: ${body.slice(0, 160)}`);
  }
  const json = await res.json();
  const text: string = (json.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  return normalize(parseJson(text), source.slice(0, 60));
}

export async function analyzeWithGemini(source: string, apiKey: string, model: string): Promise<Analysis> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: source }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 3000 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 400 || res.status === 403) throw new Error('Gemini odrzucił klucz API. Sprawdź go w Więcej → Ustawienia AI.');
    if (res.status === 404) throw new Error(`Nie ma modelu „${model}”. Zmień nazwę modelu w Więcej → Ustawienia AI.`);
    if (res.status === 429) throw new Error('Przekroczony darmowy limit Gemini. Spróbuj za minutę.');
    throw new Error(`Błąd Gemini ${res.status}: ${body.slice(0, 160)}`);
  }
  const json = await res.json();
  const text: string = (json.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
  return normalize(parseJson(text), source.slice(0, 60));
}

/** Porządkuje materiał wybranym AI; przy braku klucza lub błędzie używa trybu offline. */
export async function analyzeTip(source: string, settings: Settings, fallbackTitle: string): Promise<{ analysis: Analysis; error?: string }> {
  const key = settings.apiKey.trim();
  if (!key) return { analysis: analyzeLocally(source, fallbackTitle) };
  try {
    const analysis =
      settings.provider === 'claude'
        ? await analyzeWithClaude(source, key, settings.model)
        : await analyzeWithGemini(source, key, settings.model);
    return { analysis };
  } catch (e) {
    return { analysis: analyzeLocally(source, fallbackTitle), error: (e as Error).message };
  }
}

const TOOLS: [string, RegExp][] = [
  ['ChatGPT', /(chat|czat\w*)\s?gpt|openai/i],
  ['Claude', /claude/i],
  ['Gemini', /gemini/i],
  ['Midjourney', /midjourney/i],
  ['Perplexity', /perplexity/i],
  ['Copilot', /copilot/i],
  ['Sora', /\bsora\b/i],
  ['Suno', /\bsuno\b/i],
  ['Runway', /runway/i],
  ['Cursor', /cursor/i],
  ['NotebookLM', /notebook\s?lm/i],
  ['Canva', /canva/i],
];
const CAT_KEYWORDS: [string, RegExp][] = [
  ['Obrazy i grafika', /obraz|grafik|zdję|logo|midjourney|canva|ilustrac/i],
  ['Wideo i audio', /wideo|video|film|muzyk|dźwięk|głos|sora|suno|runway/i],
  ['Programowanie', /\bkod(?!y do czat)|program|aplikacj|cursor|python|github/i],
  ['Nauka', /nauk|uczy|język|egzamin|notatk|notebooklm/i],
  ['Biznes i marketing', /biznes|marketing|sprzeda|klient|firm|reklam/i],
  ['Pisanie', /pisa|tekst|mail|cv|list motywac|artyku/i],
  ['Automatyzacja', /automat|zapier|make\.com|n8n|workflow/i],
  ['Produktywność', /produktyw|czas|plan|organiz|zadani/i],
];

const VERBS = 'użyj|użyć|wpisz|kliknij|otwórz|wybierz|dodaj|wklej|ustaw|zaznacz|zapisz|stwórz|wygeneruj|poproś|napisz|włącz|przejdź|pobierz|skopiuj|sprawdź|zacznij|spróbuj|zamień|podaj|wyślij|uruchom';
const IMPERATIVE = new RegExp(`^(?:${VERBS})(?![\\p{L}])`, 'iu');
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Wycina z materiału samą transkrypcję / notatki oraz odcina doklejone „obserwuj”, „Po więcej”. */
function spokenPart(source: string): string {
  const m = source.match(/Transkrypcja \/ notatki:\n([\s\S]*)$/);
  const body = (m ? m[1] : source.replace(/^(Opis filmu|Autor):.*$/gm, '')).trim();
  return body.replace(/\s*(obserwuj|Po więcej|więcej)\s*(Po więcej)?\s*$/i, '').replace(/\s+/g, ' ').trim();
}

/** Tryb offline (bez klucza API): rozbija tekst na intro i kroki rozpoczynające się od czasownika w trybie rozkazującym. */
export function analyzeLocally(source: string, fallbackTitle: string): Analysis {
  const body = spokenPart(source);
  const pieces = body
    .split(new RegExp(`(?<=[.!?])\\s+|\\s+(?=(?:${VERBS})(?![\\p{L}]))`, 'iu'))
    .map((p) => p.trim().replace(/[,;]$/, ''))
    .filter((p) => p.length > 3);
  const stepPieces = pieces.filter((p) => IMPERATIVE.test(p));
  const intro = pieces.filter((p) => !IMPERATIVE.test(p));
  const steps: Step[] = (stepPieces.length >= 2 ? stepPieces : pieces.slice(0, 8)).map((p) => ({ text: cap(p) }));

  const terms: Term[] = stepPieces
    .map((p) => p.match(/^(?:użyj|użyć|wpisz|wybierz|włącz)\s+(.+?)\s+(?:żeby|aby|by|do|na)\s+(.+)$/i))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ name: m[1].trim(), desc: cap(m[2].trim()) }));

  const keyPoints = [...intro.slice(0, 2).map(cap), ...terms.map((t) => `${t.name} – ${t.desc.charAt(0).toLowerCase()}${t.desc.slice(1)}`)];
  const prompts = [...body.matchAll(/[„"“]([^„"”“]{25,})[”"“]/g)].map((m) => m[1].trim());
  const tool = TOOLS.find(([, re]) => re.test(source))?.[0] ?? 'AI';
  const category = CAT_KEYWORDS.find(([, re]) => re.test(body))?.[0] ?? 'Inne';
  const tags = [...new Set([...source.matchAll(/#([\p{L}\d_]+)/gu)].map((m) => m[1].toLowerCase()))].slice(0, 5);
  const generic = !fallbackTitle || /^TikTok\b/i.test(fallbackTitle);
  const title = (generic ? cap(intro[0] ?? pieces[0] ?? 'Porada AI') : fallbackTitle).replace(/#\w+/g, '').trim();
  return {
    title: title.length > 60 ? `${title.slice(0, 57)}…` : title || 'Porada AI',
    summary: intro[0] ? cap(intro[0]) : '',
    keyPoints,
    terms,
    tool,
    category,
    difficulty: steps.length > 6 ? 'średnie' : 'łatwe',
    steps,
    prompts,
    toolsNeeded: tool === 'AI' ? [] : [tool],
    tags,
  };
}

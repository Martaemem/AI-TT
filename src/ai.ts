import { Step, Tip } from './types';
import { CATEGORIES } from './theme';

const TIKTOK_RE = /https?:\/\/(?:[\w-]+\.)?tiktok\.com\/[^\s]+/i;

export const extractTikTokUrl = (text: string): string | null => text.match(TIKTOK_RE)?.[0] ?? null;

export type Analysis = Pick<
  Tip,
  'title' | 'summary' | 'tool' | 'category' | 'difficulty' | 'steps' | 'prompts' | 'toolsNeeded' | 'tags'
>;

const SYSTEM = `Jesteś asystentem, który porządkuje porady o AI zebrane z filmów TikTok.
Dostajesz opis filmu i/lub transkrypcję. Zwróć WYŁĄCZNIE obiekt JSON (bez markdown) o polach:
{
 "title": krótki tytuł po polsku (maks. 60 znaków),
 "summary": 1-2 zdania: co ta porada daje,
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

const TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Perplexity', 'Copilot', 'Sora', 'Suno', 'Runway', 'Cursor', 'NotebookLM', 'Canva'];
const CAT_KEYWORDS: [string, RegExp][] = [
  ['Obrazy i grafika', /obraz|grafik|zdję|logo|midjourney|canva|ilustrac/i],
  ['Wideo i audio', /wideo|video|film|muzyk|dźwięk|głos|sora|suno|runway/i],
  ['Programowanie', /kod|program|aplikacj|cursor|python|github/i],
  ['Nauka', /nauk|uczy|język|egzamin|notatk|notebooklm/i],
  ['Biznes i marketing', /biznes|marketing|sprzeda|klient|firm|reklam/i],
  ['Pisanie', /pisa|tekst|mail|cv|list motywac|artyku/i],
  ['Automatyzacja', /automat|zapier|make\.com|n8n|workflow/i],
  ['Produktywność', /produktyw|czas|plan|organiz|zadani/i],
];

/** Tryb offline (bez klucza API): proste porządkowanie tekstu heurystykami. */
export function analyzeLocally(source: string, fallbackTitle: string): Analysis {
  const lines = source.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const listLines = lines.filter((l) => /^(\d+[.)]|[-•*])\s+/.test(l)).map((l) => l.replace(/^(\d+[.)]|[-•*])\s+/, ''));
  const sentences = source.replace(/#\w+/g, '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
  const steps: Step[] = (listLines.length >= 2 ? listLines : sentences.slice(0, 8)).map((text) => ({ text }));
  const prompts = [...source.matchAll(/[„"“]([^„"”“]{25,})[”"“]/g)].map((m) => m[1].trim());
  const tool = TOOLS.find((t) => new RegExp(t, 'i').test(source)) ?? 'AI';
  const category = CAT_KEYWORDS.find(([, re]) => re.test(source))?.[0] ?? 'Inne';
  const tags = [...new Set([...source.matchAll(/#([\p{L}\d_]+)/gu)].map((m) => m[1].toLowerCase()))].slice(0, 5);
  const title = (fallbackTitle || lines[0] || 'Porada AI').replace(/#\w+/g, '').trim().slice(0, 60);
  return {
    title: title || 'Porada AI',
    summary: sentences[0] ?? '',
    tool,
    category,
    difficulty: steps.length > 6 ? 'średnie' : 'łatwe',
    steps,
    prompts,
    toolsNeeded: tool === 'AI' ? [] : [tool],
    tags,
  };
}

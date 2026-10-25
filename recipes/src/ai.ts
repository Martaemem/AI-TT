import { Ingredient, Recipe, Settings, Step } from './types';
import { minutesFromText } from './units';

export type Parsed = Pick<Recipe, 'title' | 'servings' | 'category' | 'ingredients' | 'steps' | 'tags'> & { time?: number };

const GROQ = 'https://api.groq.com/openai/v1';

const system = (categories: string[]) => `Jesteś asystentem, który zamienia opis filmu, post lub tekst ze strony w uporządkowany przepis kulinarny.
Zwróć WYŁĄCZNIE obiekt JSON (bez markdown) o polach:
{
 "title": nazwa dania po polsku,
 "servings": liczba porcji (liczba całkowita). Weź ją z tekstu; jeśli jej nie ma, oszacuj realistycznie z ilości składników (np. ciasto z 500 g mąki to 10 porcji, obiad dla rodziny 4),
 "time": łączny czas w minutach (liczba) lub null,
 "category": jedna z: ${categories.join(', ')},
 "ingredients": [{"amount": liczba lub null, "unit": jednostka w mianowniku liczby pojedynczej (np. "łyżka", "szklanka", "g", "ml", "sztuka", "ząbek") lub null, "name": nazwa składnika}],
 "steps": [{"text": jeden krok przygotowania w trybie rozkazującym, "minutes": czas tego kroku w minutach (liczba) lub null}],
 "tags": [2-5 krótkich tagów małymi literami]
}
Ilości zapisuj jako liczby dziesiętne (½ = 0.5). Nie zmyślaj składników ani kroków, których nie ma w materiale. Pisz po polsku.`;

function parseJson(text: string): any {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Odpowiedź AI nie zawiera JSON.');
  return JSON.parse(text.slice(a, b + 1));
}

function normalize(j: any, categories: string[], fallbackTitle: string): Parsed {
  const ingredients: Ingredient[] = (Array.isArray(j.ingredients) ? j.ingredients : [])
    .map((i: any) => ({
      amount: typeof i?.amount === 'number' && i.amount > 0 ? i.amount : undefined,
      unit: i?.unit ? String(i.unit).toLowerCase() : undefined,
      name: String(i?.name ?? '').trim(),
    }))
    .filter((i: Ingredient) => i.name);
  const steps: Step[] = (Array.isArray(j.steps) ? j.steps : [])
    .map((s: any) => {
      const text = String(typeof s === 'string' ? s : s?.text ?? '').trim();
      const minutes = typeof s?.minutes === 'number' && s.minutes > 0 ? Math.round(s.minutes) : minutesFromText(text);
      return { text, minutes };
    })
    .filter((s: Step) => s.text);
  return {
    title: String(j.title || fallbackTitle || 'Przepis').slice(0, 100),
    servings: Number.isFinite(Number(j.servings)) && Number(j.servings) > 0 ? Math.round(Number(j.servings)) : 4,
    time: typeof j.time === 'number' && j.time > 0 ? Math.round(j.time) : undefined,
    category: categories.includes(j.category) ? j.category : 'Inne',
    ingredients,
    steps,
    tags: (Array.isArray(j.tags) ? j.tags : []).map(String).slice(0, 5),
  };
}

const apiMessage = (body: string): string => {
  try {
    return String(JSON.parse(body)?.error?.message ?? body).slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
};

async function viaClaude(source: string, key: string, model: string, sys: string): Promise<any> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 3000, system: sys, messages: [{ role: 'user', content: source }] }),
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Nieprawidłowy klucz Claude.' : `Claude ${res.status}: ${apiMessage(await res.text())}`);
  return parseJson(((await res.json()).content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join(''));
}

async function viaGemini(source: string, key: string, rawModel: string, sys: string): Promise<any> {
  const cleaned = rawModel.replace(/^models\//, '').trim();
  const model = /^gemini/i.test(cleaned) ? cleaned : 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: 'user', parts: [{ text: source }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 3000 },
    }),
  });
  if (!res.ok) {
    const msg = apiMessage(await res.text());
    if (res.status === 401 || res.status === 403) throw new Error(`Google odrzucił klucz (${res.status}): ${msg}. Klucze „AQ.” bywają nieobsługiwane – użyj Groq.`);
    throw new Error(`Gemini ${res.status}: ${msg}`);
  }
  return parseJson(((await res.json()).candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join(''));
}

async function pickGroqModel(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${GROQ}/models`, { headers: { authorization: `Bearer ${key}` } });
    if (!res.ok) return null;
    const ids: string[] = ((await res.json()).data ?? []).map((m: any) => String(m.id));
    const chat = ids.filter((id) => !/whisper|guard|safeguard|tts|orpheus|playai|embed|distil/i.test(id));
    for (const re of [/gpt-oss-120b/i, /llama-3\.3-70b/i, /llama-4/i, /gpt-oss-20b/i, /qwen/i, /llama/i]) {
      const hit = chat.find((id) => re.test(id));
      if (hit) return hit;
    }
    return chat[0] ?? null;
  } catch {
    return null;
  }
}

async function viaGroq(source: string, key: string, model: string, sys: string): Promise<any> {
  const call = (m: string, json: boolean) =>
    fetch(`${GROQ}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: m,
        temperature: 0.2,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: sys }, { role: 'user', content: source }],
      }),
    });
  let res = await call(model, true);
  if (res.status === 404) {
    const alt = await pickGroqModel(key);
    if (alt && alt !== model) res = await call(alt, true);
  }
  if (res.status === 400) res = await call(model, false);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Groq odrzucił klucz API.');
    if (res.status === 429) throw new Error('Przekroczony darmowy limit Groq – spróbuj za minutę.');
    throw new Error(`Groq ${res.status}: ${apiMessage(await res.text())}`);
  }
  return parseJson(String((await res.json()).choices?.[0]?.message?.content ?? ''));
}

/** Rozpisuje tekst (opis posta, transkrypcję, treść strony) na przepis. Rzuca błąd, gdy AI jest niedostępne. */
export async function recipeWithAi(source: string, settings: Settings, categories: string[], fallbackTitle: string): Promise<Parsed> {
  const key = settings.apiKey.trim();
  if (!key) throw new Error('Brak klucza AI (Więcej → Ustawienia AI).');
  const sys = system(categories);
  const run = { claude: viaClaude, groq: viaGroq, gemini: viaGemini }[settings.provider];
  return normalize(await run(source.slice(0, 12000), key, settings.model, sys), categories, fallbackTitle);
}

import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { Settings } from './types';

const GROQ = 'https://api.groq.com/openai/v1';

export type Slide = { uri: string; base64?: string | null };

const apiMessage = (body: string): string => {
  try {
    return String(JSON.parse(body)?.error?.message ?? body).slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
};

const describe = (e: unknown): string => {
  const err = e as { code?: string; message?: string };
  return [err?.code, err?.message].filter(Boolean).join(': ') || String(e);
};

const OCR_PROMPT =
  'To są slajdy z posta w mediach społecznościowych o AI. Przepisz dokładnie CAŁY tekst widoczny na każdym zdjęciu, w kolejności slajdów, ' +
  'zachowując nagłówki, listy i gotowe prompty (cały ich tekst, razem z polami w nawiasach kwadratowych). ' +
  'Nie opisuj grafiki i niczego nie komentuj – zwróć sam tekst, slajdy rozdziel pustą linią.';

/** Pierwszy sposób: rozpoznawanie tekstu wbudowane w telefon (Google ML Kit) – bez klucza i internetu. */
async function readOnDevice(slides: Slide[]): Promise<string> {
  if (!isSupported) throw new Error('telefon nie obsługuje rozpoznawania tekstu');
  const out: string[] = [];
  for (const s of slides) {
    const lines = await extractTextFromImage(s.uri);
    const text = lines.map((l) => l.trim()).filter(Boolean).join('\n');
    if (text) out.push(text);
  }
  return out.join('\n\n');
}

/** Wybiera model Groq z obsługą obrazów z aktualnej listy; przy braku zwraca też listę modeli do diagnozy. */
async function pickGroqVisionModel(apiKey: string): Promise<{ model: string | null; all: string[] }> {
  try {
    const res = await fetch(`${GROQ}/models`, { headers: { authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return { model: null, all: [] };
    const all: string[] = ((await res.json()).data ?? []).map((m: any) => String(m.id));
    for (const re of [/llama-4-scout/i, /llama-4-maverick/i, /scout|maverick/i, /vision|[-_]vl\b|[-_]vl[-_]/i, /pixtral|llava|gemma-3/i]) {
      const hit = all.find((id) => re.test(id));
      if (hit) return { model: hit, all };
    }
    return { model: null, all };
  } catch {
    return { model: null, all: [] };
  }
}

/** Drugi sposób: AI z rozpoznawaniem obrazów (wymaga klucza). */
async function readWithAi(b64: string[], settings: Settings): Promise<string> {
  const key = settings.apiKey.trim();
  if (!key) throw new Error('brak klucza AI');
  if (settings.provider === 'groq') {
    const { model, all } = await pickGroqVisionModel(key);
    if (!model) throw new Error(`Groq nie ma modelu z obrazami (dostępne: ${all.slice(0, 12).join(', ') || 'brak danych'})`);
    const res = await fetch(`${GROQ}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{ role: 'user', content: [{ type: 'text', text: OCR_PROMPT }, ...b64.map((d) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${d}` } }))] }],
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${apiMessage(await res.text())}`);
    return String((await res.json()).choices?.[0]?.message?.content ?? '');
  }
  if (settings.provider === 'gemini') {
    const model = /^gemini/i.test(settings.model) ? settings.model : 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: OCR_PROMPT }, ...b64.map((d) => ({ inline_data: { mime_type: 'image/jpeg', data: d } }))] }] }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${apiMessage(await res.text())}`);
    return ((await res.json()).candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: [...b64.map((d) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } })), { type: 'text', text: OCR_PROMPT }] }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${apiMessage(await res.text())}`);
  return ((await res.json()).content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
}

/**
 * Odczytuje tekst ze slajdów: najpierw lokalnie w telefonie, a gdy się nie uda – przez AI z obrazami.
 * Rzuca błąd z opisem obu prób, jeśli żadna nie zadziała.
 */
export async function readSlides(slides: Slide[], settings: Settings): Promise<string> {
  const problems: string[] = [];
  try {
    const text = await readOnDevice(slides);
    if (text.trim()) return text;
    problems.push('w telefonie: nie rozpoznano tekstu');
  } catch (e) {
    problems.push(`w telefonie: ${describe(e)}`);
  }
  const b64 = slides.map((s) => s.base64).filter((b): b is string => !!b);
  if (b64.length > 0) {
    try {
      const parts: string[] = [];
      for (let i = 0; i < b64.length; i += 4) parts.push((await readWithAi(b64.slice(i, i + 4), settings)).trim());
      const text = parts.filter(Boolean).join('\n\n');
      if (text) return text;
      problems.push('AI: pusta odpowiedź');
    } catch (e) {
      problems.push(`AI: ${describe(e)}`);
    }
  }
  throw new Error(problems.join('\n'));
}

import { Settings } from './types';

const GROQ = 'https://api.groq.com/openai/v1';

const apiMessage = (body: string): string => {
  try {
    return String(JSON.parse(body)?.error?.message ?? body).slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
};

const OCR_PROMPT =
  'To są slajdy z posta w mediach społecznościowych o AI. Przepisz dokładnie CAŁY tekst widoczny na każdym zdjęciu, w kolejności slajdów, ' +
  'zachowując nagłówki, listy i gotowe prompty (cały ich tekst, razem z polami w nawiasach kwadratowych). ' +
  'Nie opisuj grafiki i niczego nie komentuj – zwróć sam tekst, slajdy rozdziel pustą linią.';

/** Wybiera model Groq z obsługą obrazów z aktualnej listy. */
async function pickGroqVisionModel(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${GROQ}/models`, { headers: { authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return null;
    const ids: string[] = ((await res.json()).data ?? []).map((m: any) => String(m.id));
    for (const re of [/llama-4-scout/i, /llama-4-maverick/i, /vision/i, /llama-4/i]) {
      const hit = ids.find((id) => re.test(id));
      if (hit) return hit;
    }
    return null;
  } catch {
    return null;
  }
}

async function ocrBatch(b64: string[], settings: Settings): Promise<string> {
  const key = settings.apiKey.trim();
  if (settings.provider === 'groq') {
    const model = await pickGroqVisionModel(key);
    if (!model) throw new Error('Groq nie ma teraz modelu rozpoznającego obrazy. Wybierz Gemini lub Claude albo wklej tekst ręcznie.');
    const res = await fetch(`${GROQ}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{ role: 'user', content: [{ type: 'text', text: OCR_PROMPT }, ...b64.map((d) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${d}` } }))] }],
      }),
    });
    if (!res.ok) throw new Error(`Odczyt zdjęć (Groq ${res.status}): ${apiMessage(await res.text())}`);
    return String((await res.json()).choices?.[0]?.message?.content ?? '');
  }
  if (settings.provider === 'gemini') {
    const model = /^gemini/i.test(settings.model) ? settings.model : 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: OCR_PROMPT }, ...b64.map((d) => ({ inline_data: { mime_type: 'image/jpeg', data: d } }))] }] }),
    });
    if (!res.ok) throw new Error(`Odczyt zdjęć (Gemini ${res.status}): ${apiMessage(await res.text())}`);
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
  if (!res.ok) throw new Error(`Odczyt zdjęć (Claude ${res.status}): ${apiMessage(await res.text())}`);
  return ((await res.json()).content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
}

/** Odczytuje tekst ze slajdów (zdjęć w base64) wybranym AI; wysyła po 4 zdjęcia naraz. */
export async function readSlides(base64Images: string[], settings: Settings): Promise<string> {
  if (!settings.apiKey.trim()) throw new Error('Odczyt tekstu ze zdjęć wymaga klucza AI (Więcej → Ustawienia AI).');
  const parts: string[] = [];
  for (let i = 0; i < base64Images.length; i += 4) parts.push((await ocrBatch(base64Images.slice(i, i + 4), settings)).trim());
  return parts.filter(Boolean).join('\n\n');
}

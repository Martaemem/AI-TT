const UA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

type Sub = { LanguageCodeName?: string; Url?: string; UrlList?: string[]; Format?: string };

/** Wyciąga tekst z WebVTT/SRT: bez znaczników czasu, numeracji i duplikatów linii. */
export function subtitleToText(raw: string): string {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l === 'WEBVTT' || /^\d+$/.test(l) || /-->/.test(l) || /^(NOTE|STYLE|Kind:|Language:)/.test(l)) continue;
    const clean = l.replace(/<[^>]+>/g, '').trim();
    if (clean && out[out.length - 1] !== clean) out.push(clean);
  }
  return out.join(' ');
}

/** Wyszukuje tablicę JSON o danym kluczu w HTML (odporne na zmiany układu strony). */
function extractArray(html: string, key: string): Sub[] {
  const start = html.indexOf(`"${key}":[`);
  if (start < 0) return [];
  let i = html.indexOf('[', start);
  const begin = i;
  let depth = 0;
  let inStr = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) break;
  }
  try {
    return JSON.parse(html.slice(begin, i + 1));
  } catch {
    return [];
  }
}

/**
 * Próbuje pobrać napisy (automatyczne lub dodane przez autora) ze strony filmu TikTok.
 * Zwraca null, gdy film nie ma napisów albo TikTok zmienił format strony.
 */
export async function fetchTikTokTranscript(url: string): Promise<string | null> {
  try {
    const page = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pl,en;q=0.8' } });
    if (!page.ok) return null;
    const html = (await page.text()).replace(/\\u002F/g, '/');
    const subs = [...extractArray(html, 'subtitleInfos'), ...extractArray(html, 'captionInfos')];
    const withUrl = subs
      .map((s) => ({ lang: s.LanguageCodeName ?? '', url: s.Url ?? s.UrlList?.[0] }))
      .filter((s): s is { lang: string; url: string } => !!s.url);
    if (withUrl.length === 0) return null;
    const pick = withUrl.find((s) => s.lang.startsWith('pol')) ?? withUrl.find((s) => s.lang.startsWith('eng')) ?? withUrl[0];
    const res = await fetch(pick.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const text = subtitleToText(await res.text());
    return text.length > 20 ? text : null;
  } catch {
    return null;
  }
}

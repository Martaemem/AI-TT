import { Log, USER_AGENTS } from './tiktok';

const UA = USER_AGENTS[2][1];

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
export async function fetchTikTokTranscript(url: string, log: Log = () => {}): Promise<string | null> {
  try {
    // Napisy są tylko w pełnej stronie, więc pomijamy bota (indeks 0) i próbujemy przeglądarek.
    for (const [tag, ua] of USER_AGENTS.slice(1)) {
      const page = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'pl,en;q=0.8' } });
      const html = (await page.text()).replace(/\\u002F/g, '/');
      const subs = [...extractArray(html, 'subtitleInfos'), ...extractArray(html, 'captionInfos')];
      const withUrl = subs
        .map((s) => ({ lang: s.LanguageCodeName ?? '', url: s.Url ?? s.UrlList?.[0] }))
        .filter((s): s is { lang: string; url: string } => !!s.url);
      log(`napisy (${tag}): HTTP ${page.status}, ${html.length} B, ${withUrl.length} ścieżek`);
      if (withUrl.length === 0) continue;
      const pick = withUrl.find((s) => s.lang.startsWith('pol')) ?? withUrl.find((s) => s.lang.startsWith('eng')) ?? withUrl[0];
      const res = await fetch(pick.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        log(`napisy: pobranie ${res.status}`);
        continue;
      }
      const text = subtitleToText(await res.text());
      if (text.length > 20) return text;
    }
    return null;
  } catch (e) {
    log(`napisy: ${(e as Error).message}`);
    return null;
  }
}

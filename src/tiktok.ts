export type TikTokMeta = { title: string; author?: string; thumbnail?: string };
export type Log = (line: string) => void;

// Boty społecznościowe dostają od TikToka stronę z gotowymi metadanymi, zwykłe przeglądarki bywają blokowane.
export const USER_AGENTS: [string, string][] = [
  ['bot', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'],
  ['desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'],
  ['mobile', 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'],
];

const decode = (t: string) =>
  t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const metaTag = (html: string, prop: string): string | undefined => {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
  return m ? decode(m[1]) : undefined;
};

/** Opis filmu z danych osadzonych na stronie (gdy brakuje znaczników og:*). */
const embeddedDesc = (html: string): string | undefined => {
  const m = html.match(/"desc":"((?:[^"\\]|\\.)*)"/);
  if (!m) return undefined;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return undefined;
  }
};

const fromHtml = (html: string, finalUrl: string): TikTokMeta | null => {
  const title = embeddedDesc(html) ?? metaTag(html, 'og:description') ?? metaTag(html, 'description') ?? metaTag(html, 'og:title') ?? '';
  const thumbnail = metaTag(html, 'og:image');
  const author = finalUrl.match(/tiktok\.com\/@([^/?]+)/)?.[1];
  return title || thumbnail ? { title, author, thumbnail } : null;
};

async function oembed(url: string, log: Log): Promise<TikTokMeta | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    log(`oEmbed: HTTP ${res.status}`);
    if (!res.ok) return null;
    const j = await res.json();
    return j.title || j.thumbnail_url ? { title: j.title ?? '', author: j.author_name, thumbnail: j.thumbnail_url } : null;
  } catch (e) {
    log(`oEmbed: ${(e as Error).message}`);
    return null;
  }
}

/**
 * Pobiera opis, autora i miniaturę filmu. Rozwija krótkie linki (vm.tiktok.com),
 * próbuje kilku „przeglądarek”, a na końcu oEmbed. Każdy krok trafia do `log`.
 */
export async function fetchTikTokMeta(url: string, log: Log = () => {}): Promise<TikTokMeta | null> {
  let finalUrl = url;
  for (const [tag, ua] of USER_AGENTS) {
    try {
      const page = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'pl,en;q=0.8' } });
      const html = await page.text();
      if (page.url) finalUrl = page.url;
      log(`${tag}: HTTP ${page.status}, ${html.length} B, ${finalUrl.slice(0, 70)}`);
      const meta = fromHtml(html, finalUrl);
      if (meta) return meta;
    } catch (e) {
      log(`${tag}: ${(e as Error).message}`);
    }
  }
  const clean = finalUrl.split('?')[0];
  return (await oembed(clean, log)) ?? (clean !== url ? await oembed(url, log) : null);
}

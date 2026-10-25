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

/**
 * Opis wpisu z danych osadzonych na stronie. Na stronie jest kilka pól „desc” (część pusta lub ogólna),
 * a prawdziwy podpis jest zwykle najdłuższy – dotyczy to zwłaszcza karuzel zdjęć (/photo/).
 */
const embeddedDesc = (html: string): string | undefined => {
  let best = '';
  for (const m of html.matchAll(/"desc":"((?:[^"\\]|\\.)*)"/g)) {
    try {
      const text = JSON.parse(`"${m[1]}"`) as string;
      if (text.length > best.length) best = text;
    } catch {
      // uszkodzony zapis – pomijamy
    }
  }
  return best || undefined;
};

/** Tytuł strony ma postać: „autor on TikTok: \"opis\"” – ostatnia deska ratunku dla opisu. */
const titleCaption = (html: string): string | undefined => {
  const t = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  if (!t) return undefined;
  const m = decode(t).match(/TikTok:\s*["“„]?([\s\S]*?)["”]?\s*$/i);
  return m?.[1]?.trim() || undefined;
};

/** Ogólne nagłówki typu „TikTok · autor” nie są opisem filmu. */
export const isGeneric = (t?: string) => !t || t.trim().length < 3 || (/^TikTok\b/i.test(t.trim()) && t.length < 80);

/** og:description TikToka ma postać: „1K Likes, 2 Comments. TikTok video from x (@x): "opis"”. */
const captionFromDescription = (d?: string): string | undefined => {
  if (!d) return undefined;
  const m = d.match(/TikTok video from [^:]*:\s*["“„]?([\s\S]*?)["”]?\s*$/i);
  return (m ? m[1] : d).trim() || undefined;
};

const fromHtml = (html: string, finalUrl: string): TikTokMeta | null => {
  const candidates = [embeddedDesc(html), captionFromDescription(metaTag(html, 'og:description')), captionFromDescription(metaTag(html, 'description')), titleCaption(html)];
  const title = candidates.find((c) => !isGeneric(c)) ?? '';
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
  const acc: { best: TikTokMeta | null } = { best: null };
  const merge = (m: TikTokMeta | null) => {
    if (!m) return;
    const b = acc.best;
    acc.best = {
      title: b && !isGeneric(b.title) ? b.title : m.title,
      author: b?.author ?? m.author,
      thumbnail: b?.thumbnail ?? m.thumbnail,
    };
  };
  const done = () => !!acc.best && !isGeneric(acc.best.title) && !!acc.best.thumbnail;

  for (const [tag, ua] of USER_AGENTS) {
    try {
      const page = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'pl,en;q=0.8' } });
      const html = await page.text();
      if (page.url) finalUrl = page.url;
      const meta = fromHtml(html, finalUrl);
      log(`${tag}: HTTP ${page.status}, ${html.length} B, opis: ${meta?.title ? 'tak' : 'nie'}, ${finalUrl.slice(0, 60)}`);
      merge(meta);
    } catch (e) {
      log(`${tag}: ${(e as Error).message}`);
    }
    if (done()) return acc.best;
    if (tag === 'bot') {
      // oEmbed zwykle zwraca prawdziwy opis filmu – próbujemy go zaraz po stronie dla botów
      merge(await oembed(finalUrl.split('?')[0], log));
      if (done()) return acc.best;
    }
  }
  if (isGeneric(acc.best?.title)) merge(await oembed(url, log));
  return acc.best;
}

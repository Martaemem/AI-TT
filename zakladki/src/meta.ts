/** Pobieranie tytułu, obrazka i nazwy strony prosto z telefonu. */

const UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

export const extractUrl = (text: string): string | null => text.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ?? null;

export const domainOf = (url: string): string =>
  url
    .replace(/^https?:\/\/(www\.|m\.)?/i, '')
    .split(/[/?#]/)[0]
    .toLowerCase();

const ENT: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>', oacute: 'ó', ndash: '–', mdash: '—', hellip: '…' };
const decode = (t: string) =>
  t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();

function metaTag(html: string, prop: string): string | undefined {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'));
  return m && m[1].trim() ? decode(m[1]) : undefined;
}

function absolute(src: string, base: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return 'https:' + src;
  const origin = base.match(/^https?:\/\/[^/]+/i)?.[0] ?? '';
  if (src.startsWith('/')) return origin + src;
  return base.replace(/[^/]*$/, '') + src;
}

export type Meta = { title?: string; image?: string; site?: string; description?: string };

export async function fetchMeta(url: string): Promise<Meta> {
  const site = domainOf(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.6' } });
    const html = (await res.text()).slice(0, 500000);
    const base = res.url || url;
    const title =
      metaTag(html, 'og:title') ?? metaTag(html, 'twitter:title') ?? (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]) : undefined);
    const img = metaTag(html, 'og:image') ?? metaTag(html, 'twitter:image') ?? metaTag(html, 'og:image:url');
    return {
      title: title && title.length > 1 ? title.slice(0, 200) : undefined,
      image: img ? absolute(img, base) : undefined,
      site: metaTag(html, 'og:site_name') ?? site,
      description: metaTag(html, 'og:description') ?? metaTag(html, 'description'),
    };
  } catch {
    return { site };
  } finally {
    clearTimeout(timer);
  }
}

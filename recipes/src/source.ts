import { Ingredient, Recipe, Step } from './types';
import { isoToMinutes, minutesFromText, parseIngredient } from './units';
import { fetchTikTokMeta, isGeneric, Log, USER_AGENTS } from './tiktok';
import { fetchTikTokTranscript } from './transcript';

export type Draft = Pick<Recipe, 'title' | 'servings' | 'ingredients' | 'steps' | 'tags'> & { time?: number; image?: string; author?: string };

export type Source = {
  url: string;
  title: string;
  image?: string;
  author?: string;
  /** Gotowy przepis ze strukturalnych danych strony (schema.org) – nie wymaga AI. */
  structured?: Draft;
  /** Tekst do rozpisania przez AI: opis posta, transkrypcja, treść strony. */
  text: string;
};

export const extractUrl = (text: string): string | null => text.match(/https?:\/\/[^\s]+/i)?.[0] ?? null;
const isTikTok = (url: string) => /tiktok\.com/i.test(url);

const decode = (t: string) =>
  t
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const stripTags = (t: string) => decode(t.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();

const metaTag = (html: string, prop: string): string | undefined => {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
  return m ? decode(m[1]) : undefined;
};

/** Zbiera wszystkie obiekty JSON-LD ze strony (także zagnieżdżone w @graph). */
function jsonLdNodes(html: string): any[] {
  const out: any[] = [];
  const walk = (n: any) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      out.push(n);
      if (n['@graph']) walk(n['@graph']);
    }
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1].trim()));
    } catch {
      // uszkodzony blok – pomijamy
    }
  }
  return out;
}

const isRecipeNode = (n: any) => [].concat(n?.['@type'] ?? []).some((t: string) => /^Recipe$/i.test(String(t)));

function instructionSteps(node: any): Step[] {
  const out: Step[] = [];
  const walk = (x: any) => {
    if (!x) return;
    if (typeof x === 'string') {
      x.split(/\n+/).map(stripTags).filter(Boolean).forEach((t) => out.push({ text: t, minutes: minutesFromText(t) }));
    } else if (Array.isArray(x)) x.forEach(walk);
    else if (typeof x === 'object') {
      if (x.itemListElement) walk(x.itemListElement);
      else walk(x.text ?? x.name);
    }
  };
  walk(node);
  return out;
}

function servingsFrom(y: any): number {
  const s = Array.isArray(y) ? y.join(' ') : String(y ?? '');
  const n = s.match(/\d+/);
  return n ? Math.min(Math.max(Number(n[0]), 1), 100) : 4;
}

function imageFrom(img: any): string | undefined {
  if (!img) return undefined;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return imageFrom(img[0]);
  return img.url ?? img.contentUrl;
}

export function recipeFromJsonLd(html: string): Draft | null {
  const node = jsonLdNodes(html).find(isRecipeNode);
  if (!node) return null;
  const ingredients: Ingredient[] = ([] as any[]).concat(node.recipeIngredient ?? []).map((x) => parseIngredient(stripTags(String(x)))).filter((i) => i.name);
  const steps = instructionSteps(node.recipeInstructions);
  if (ingredients.length === 0 && steps.length === 0) return null;
  const time = isoToMinutes(node.totalTime) ?? ((isoToMinutes(node.prepTime) ?? 0) + (isoToMinutes(node.cookTime) ?? 0) || undefined);
  const author = Array.isArray(node.author) ? node.author[0]?.name : typeof node.author === 'string' ? node.author : node.author?.name;
  const keywords = typeof node.keywords === 'string' ? node.keywords.split(',') : [].concat(node.keywords ?? []);
  return {
    title: stripTags(String(node.name ?? 'Przepis')),
    servings: servingsFrom(node.recipeYield),
    ingredients,
    steps,
    tags: keywords.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean).slice(0, 5),
    time,
    image: imageFrom(node.image),
    author: author ? String(author) : undefined,
  };
}

/** Prosty podział wklejonego tekstu na składniki i kroki (tryb bez AI). */
export function parseRecipeText(text: string): Pick<Draft, 'ingredients' | 'steps'> {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const isIngHead = (l: string) => /^(składniki|ingredients)\b/i.test(l.replace(/[:\s]+$/, ''));
  const isStepHead = (l: string) => /^(przygotowanie|sposób przygotowania|sposób wykonania|wykonanie|instrukcja|kroki|metoda|method|directions)\b/i.test(l.replace(/[:\s]+$/, ''));
  const ingStart = lines.findIndex(isIngHead);
  const stepStart = lines.findIndex(isStepHead);
  let ingLines: string[] = [];
  let stepLines: string[] = [];
  if (ingStart >= 0 || stepStart >= 0) {
    if (ingStart >= 0) ingLines = lines.slice(ingStart + 1, stepStart > ingStart ? stepStart : undefined);
    if (stepStart >= 0) stepLines = lines.slice(stepStart + 1, ingStart > stepStart ? ingStart : undefined);
    if (stepStart < 0) stepLines = [];
  } else {
    const qty = /^[-•*]?\s*(\d|[½¼¾])/;
    ingLines = lines.filter((l) => qty.test(l) && l.length < 80);
    stepLines = lines.filter((l) => !qty.test(l) && l.length > 25);
  }
  const clean = (l: string) => l.replace(/^(\d+[.)]\s+|[-•*]\s+)/, '');
  return {
    ingredients: ingLines.map(clean).map(parseIngredient).filter((i) => i.name),
    steps: stepLines.flatMap((l) => (l.length > 220 ? l.split(/(?<=[.!?])\s+/) : [l])).map(clean).filter((t) => t.length > 3).map((text) => ({ text, minutes: minutesFromText(text) })),
  };
}

/** Pobiera stronę jako różne „przeglądarki”, aż znajdzie przepis lub treść. */
async function fetchPage(url: string, log: Log): Promise<{ html: string; finalUrl: string }> {
  let best = { html: '', finalUrl: url };
  for (const [tag, ua] of [USER_AGENTS[1], USER_AGENTS[0], USER_AGENTS[2]]) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'pl,en;q=0.8' } });
      const html = await res.text();
      log(`${tag}: HTTP ${res.status}, ${html.length} B`);
      if (html.length > best.html.length) best = { html, finalUrl: res.url || url };
      if (recipeFromJsonLd(html)) return { html, finalUrl: res.url || url };
    } catch (e) {
      log(`${tag}: ${(e as Error).message}`);
    }
  }
  return best;
}

export async function fetchSource(url: string, log: Log): Promise<Source> {
  if (isTikTok(url)) {
    const meta = await fetchTikTokMeta(url, log);
    const caption = meta?.title && !isGeneric(meta.title) ? meta.title : '';
    const transcript = (await fetchTikTokTranscript(url, log)) ?? '';
    return {
      url,
      title: caption.split('\n')[0].slice(0, 80),
      image: meta?.thumbnail,
      author: meta?.author,
      text: [caption && `Opis filmu: ${caption}`, transcript && `Transkrypcja:\n${transcript}`].filter(Boolean).join('\n\n'),
    };
  }
  const { html, finalUrl } = await fetchPage(url, log);
  const structured = recipeFromJsonLd(html);
  const ogTitle = metaTag(html, 'og:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const ogDesc = metaTag(html, 'og:description') ?? metaTag(html, 'description');
  const body = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<\/(p|li|h[1-6]|div|br)>/gi, '\n');
  const pageText = stripTags(body).split('\n').map((l) => l.trim()).filter((l) => l.length > 2).join('\n').slice(0, 8000);
  return {
    url: finalUrl,
    title: decode(ogTitle ?? '').trim(),
    image: metaTag(html, 'og:image') ?? structured?.image,
    author: structured?.author ?? finalUrl.match(/instagram\.com\/([^/?]+)/i)?.[1],
    structured: structured ?? undefined,
    text: [ogDesc && `Opis: ${ogDesc}`, !ogDesc || ogDesc.length < 200 ? pageText : ''].filter(Boolean).join('\n\n'),
  };
}

/** Zgadywanie kategorii po słowach kluczowych (gdy nie zrobi tego AI). */
export function guessCategory(text: string, categories: string[]): string {
  const rules: [RegExp, string][] = [
    [/zup|rosół|krem z |barszcz|bulion/i, 'Zupy'],
    [/ciast|tort|sernik|brownie|babk|szarlotk|muffin|drożdżow|pierni|makowiec/i, 'Ciasta'],
    [/deser|lody|mus |pudding|cannoli|tiramisu|panna cotta|krem /i, 'Desery'],
    [/sałat/i, 'Sałatki'],
    [/śniadani|naleśnik|omlet|jajecznic|owsiank|tost|gofr/i, 'Śniadania'],
    [/kolacj|kanapk|sandwich|wrap|tortill/i, 'Kolacje'],
    [/napój|koktajl|smoothie|lemoniad|drink|herbat|kawa/i, 'Napoje'],
    [/przekąsk|chips|nachos|dip |hummus|guacamole/i, 'Przekąski'],
  ];
  const hit = rules.find(([re]) => re.test(text))?.[1];
  if (hit && categories.includes(hit)) return hit;
  return categories.includes('Obiady') ? 'Obiady' : categories[0] ?? 'Inne';
}

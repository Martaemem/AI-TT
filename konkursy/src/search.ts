import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contest, daysLeft, shopKey } from './data';

/**
 * Wyszukiwanie nowych konkursów prosto z telefonu: aplikacja pobiera listy z e-konkursy.info,
 * odrzuca te z komentowaniem w mediach społecznościowych i te, które już są na liście.
 */

const BASE = 'https://www.e-konkursy.info';
const PAGES = [
  '/konkursy-dzisiaj-dodane',
  '/konkursy/konkursy-aktualne',
  '/konkursy/konkursy-aktualne?strona=2',
  '/konkursy/konkursy-aktualne?strona=3',
  '/konkursy/konkursy-promocyjne',
  '/konkursy/konkursy-promocyjne?strona=2',
  '/konkursy/konkursy-promocyjne?strona=3',
];
const FOUND_KEY = 'konkursy:found:v1';

const SOCIAL = /facebook|instagram|tik\s?tok|komentarz|oznacz|udost[eę]pnij|polub|na swojej tablicy|relacj[iaę]|rolk[aęi]|hashtag/i;
const EXCLUDE = /\bkrus\b|ubezpieczon|wpisowe|op[łl]ata za udzia[łl]|dla uczni[óo]w|dla nauczycieli|dla absolwent|praca dyplomow|pracę dyplomow/i;
const PURCHASE = /\bkup|zakup|paragon|dow[óo]d zakupu|kupuj[aą]c/i;
const NO_PURCHASE = /bez zakupu|nie wymaga zakupu|bez paragonu/i;

const SHOPS: [string, RegExp][] = [
  ['Biedronka', /biedronk/i],
  ['Lidl', /\blidl/i],
  ['Żabka', /[żz]abk|[żz]abce|[żz]appk/i],
  ['Dino', /\bdino\b/i],
  ['Kaufland', /kaufland/i],
  ['Auchan', /auchan/i],
  ['Carrefour', /carrefour/i],
  ['Rossmann', /rossmann/i],
  ['Hebe', /\bhebe\b/i],
  ['Aldi', /\baldi\b/i],
  ['Netto', /\bnetto\b/i],
  ['Stokrotka', /stokrot/i],
  ['Intermarché', /intermarch/i],
  ['Selgros', /selgros/i],
  ['E.Leclerc', /leclerc/i],
  ['Polomarket', /polomarket/i],
  ['Lewiatan', /lewiatan/i],
  ['Delikatesy Centrum', /delikatesy centrum/i],
  ['Super-Pharm', /super-?pharm/i],
  ['Pepco', /\bpepco/i],
  ['Action', /\baction\b/i],
  ['Dealz', /\bdealz/i],
  ['Douglas', /\bdouglas/i],
  ['Arhelan', /arhelan/i],
  ['Chata Polska', /chata polska/i],
];

const ENT: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>', oacute: 'ó', Oacute: 'Ó', bdquo: '„', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', eacute: 'é', times: '×',
};
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENT[n] ?? m);
}
function toText(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|li|h\d|div|ul|span|strong|b)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

type Raw = { slug: string; title: string; text: string };

function parsePage(html: string): Raw[] {
  const re = /href="(?:https?:\/\/(?:www\.)?e-konkursy\.info)?\/konkurs\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const hits: { slug: string; idx: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) hits.push({ slug: m[1], idx: m.index, title: toText(m[2]).replace(/\n/g, ' ') });
  const out: Raw[] = [];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    if (i > 0 && hits[i - 1].slug === h.slug) continue; // ta sama karta (obrazek + tytuł)
    let j = i + 1;
    let title = h.title;
    while (j < hits.length && hits[j].slug === h.slug) {
      if (hits[j].title.length > title.length) title = hits[j].title;
      j++;
    }
    const end = j < hits.length ? hits[j].idx : Math.min(html.length, h.idx + 6000);
    out.push({ slug: h.slug, title, text: toText(html.slice(h.idx, end).replace(/<[^>]*$/, '')) });
  }
  return out;
}

function toContest(r: Raw): Contest | null {
  const t = r.text;
  const endM = t.match(/trwa do\s*(\d{4}-\d{2}-\d{2})/i);
  if (!endM || r.title.length < 4) return null; // linki z menu bocznego nie mają dat
  const end = endM[1];
  const n = daysLeft(end);
  if (n === null || n < 0) return null;
  const start = t.match(/trwa od\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ?? null;
  const organizer = t.match(/Organizator\s*:?\s*\n?\s*([^\n]+)/i)?.[1]?.trim();
  // Opis: wiersze po organizatorze, bez metadanych serwisu
  const lines = t.split('\n');
  const orgIdx = lines.findIndex((l) => /^Organizator/i.test(l));
  const desc = lines
    .slice(orgIdx >= 0 ? orgIdx + 1 : 1)
    .filter((l) => l !== organizer && !/trwa (od|do)|Nadesłane przez|Rodzaje nagród|wyszukaj konkursy|Do zakończenia|Kończy się|Start za|^\d+$/i.test(l))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const all = `${r.title} ${desc}`;
  if (SOCIAL.test(all) || EXCLUDE.test(all)) return null;
  const purchase = PURCHASE.test(all) && !NO_PURCHASE.test(all);
  const shops = purchase ? SHOPS.filter(([, rx]) => rx.test(all)).map(([n]) => n) : [];
  // Podział na zdania z ochroną skrótów typu „min.”, „np.”
  const guarded = desc.replace(/\b(min|np|ok|tj|ul|godz|szt|op|in)\./gi, '$1§');
  const buySentence = (guarded.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((s) => s.replace(/§/g, '.').trim())
    .find((s) => /\bkup|zakup/i.test(s));
  const min = all.match(/(?:min\.?|minimum|co najmniej|za)\s*(\d+(?:[.,]\d{1,2})?)\s*z[łl]/i);
  return {
    id: 'ek-' + r.slug,
    title: r.title.replace(/^Konkurs\s+/i, '').replace(/^"(.*)"$/, '$1') || r.title,
    organizer,
    task: desc ? (desc.length > 260 ? desc.slice(0, 257) + '…' : desc) : 'Szczegóły na stronie konkursu.',
    prizes: undefined,
    start,
    end,
    purchase,
    url: `${BASE}/konkurs/${r.slug}`,
    note: 'Znalezione wyszukiwaniem w aplikacji – sprawdź regulamin przed zgłoszeniem.',
    addedAt: new Date().toISOString(),
    shops,
    toBuy: purchase && buySentence ? (buySentence.length > 160 ? buySentence.slice(0, 157) + '…' : buySentence) : undefined,
    minSpend: purchase && min ? Number(min[1].replace(',', '.')) : null,
  };
}

/** Klucze do rozpoznawania tego samego konkursu z różnych źródeł. */
function keys(c: Contest): string[] {
  const k: string[] = [];
  const u = (c.url || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (u) k.push('u:' + u);
  const slug = u.match(/e-konkursy\.info\/konkurs\/([a-z0-9-]+)/)?.[1];
  if (slug) k.push('s:' + slug.replace(/\d+$/, ''));
  const t = shopKey(c.title.replace(/konkurs|loteria|wygraj|promocyjn[ay]/gi, ''));
  if (t.length >= 6) k.push('t:' + t);
  return k;
}
export function sameContest(a: Contest, b: Contest): boolean {
  const ka = new Set(keys(a));
  return keys(b).some((k) => ka.has(k));
}

export async function loadFound(): Promise<Contest[]> {
  try {
    const raw = await AsyncStorage.getItem(FOUND_KEY);
    return raw ? (JSON.parse(raw) as Contest[]) : [];
  } catch {
    return [];
  }
}
export async function saveFound(list: Contest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FOUND_KEY, JSON.stringify(list));
  } catch {
    // brak miejsca – wyniki zostają do zamknięcia aplikacji
  }
}

async function getPage(path: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(BASE + path, { signal: ctrl.signal, headers: { 'Accept-Language': 'pl-PL,pl;q=0.9' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Zwraca tylko konkursy, których nie ma ani na liście, ani wśród wcześniej znalezionych. */
export async function searchNew(existing: Contest[]): Promise<{ added: Contest[]; pagesOk: number }> {
  const results = await Promise.allSettled(PAGES.map(getPage));
  const pagesOk = results.filter((r) => r.status === 'fulfilled').length;
  const known = [...existing];
  const added: Contest[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const raw of parsePage(r.value)) {
      const c = toContest(raw);
      if (!c) continue;
      if (known.some((k) => sameContest(k, c))) continue;
      known.push(c);
      added.push(c);
    }
  }
  return { added, pagesOk };
}

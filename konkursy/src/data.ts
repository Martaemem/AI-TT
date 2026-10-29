import AsyncStorage from '@react-native-async-storage/async-storage';

/** Plik z listą konkursów, aktualizowany codziennie rano przez zaplanowane zadanie. */
export const DATA_URL = 'https://raw.githubusercontent.com/Martaemem/AI-TT/konkursy-data/konkursy.json';

export type Contest = {
  id: string;
  title: string;
  organizer?: string;
  task?: string;
  prizes?: string;
  start?: string | null;
  end?: string | null;
  /** true = trzeba kupić, false = bez zakupu (potwierdzone), null = nie wiadomo – do sprawdzenia w regulaminie. */
  purchase: boolean | null;
  /** Sprawdzone w oficjalnym regulaminie lub na stronie organizatora. */
  verified?: boolean;
  /** Link do oficjalnego regulaminu. */
  rulesUrl?: string;
  url: string;
  note?: string;
  addedAt?: string;
  /** Sklepy, w których trzeba kupić; pusta lista = dowolny sklep. */
  shops?: string[];
  /** Co i ile kupić, np. „2 batony KitKat”. */
  toBuy?: string;
  /** Minimalna kwota zakupu w zł, jeśli regulamin ją podaje. */
  minSpend?: number | null;
};

export type Status = '' | 'sent' | 'later' | 'no';
export type Entry = {
  status: Status;
  answer: string;
  updatedAt?: string;
  /** Sklep wybrany przez Martę dla konkursu „w dowolnym sklepie”. */
  shop?: string;
  /** Odhaczone na liście zakupów. */
  bought?: boolean;
  /** Usunięte przez Martę z listy (można przywrócić). */
  hidden?: boolean;
};
export type Mine = Record<string, Entry>;

/** Porównywanie nazw sklepów bez wielkości liter, ogonków i spacji. */
export function shopKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]/g, '');
}

export function fmtZl(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0).replace('.', ',') + ' zł';
}

const SHOPS_KEY = 'konkursy:shops:v1';

export async function loadCustomShops(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SHOPS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function saveCustomShops(list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SHOPS_KEY, JSON.stringify(list));
  } catch {
    // nieistotne
  }
}
export type Feed = { updatedAt?: string; contests: Contest[] };

const LIST_KEY = 'konkursy:list:v1';
const MINE_KEY = 'konkursy:mine:v1';
const FILTER_KEY = 'konkursy:filters:v1';

export async function fetchFeed(): Promise<Feed> {
  const res = await fetch(DATA_URL + '?t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = (await res.json()) as Partial<Feed>;
  const contests = Array.isArray(json.contests) ? json.contests.filter((c) => c && c.id && c.title && c.url) : [];
  const feed: Feed = { updatedAt: json.updatedAt, contests };
  try {
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify(feed));
  } catch {
    // brak miejsca – lista zostaje tylko w pamięci
  }
  return feed;
}

export async function loadCachedFeed(): Promise<Feed | null> {
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    return raw ? (JSON.parse(raw) as Feed) : null;
  } catch {
    return null;
  }
}

export async function loadMine(): Promise<Mine> {
  try {
    const raw = await AsyncStorage.getItem(MINE_KEY);
    return raw ? (JSON.parse(raw) as Mine) : {};
  } catch {
    return {};
  }
}

export async function saveMine(mine: Mine): Promise<void> {
  try {
    await AsyncStorage.setItem(MINE_KEY, JSON.stringify(mine));
  } catch {
    // błąd zapisu – dane zostają w pamięci
  }
}

export type Filters = { buy: 'all' | 'free' | 'buy' | 'check'; status: 'todo' | 'later' | 'sent' | 'no' | 'all' | 'hidden' };

export async function loadFilters(): Promise<Filters | null> {
  try {
    const raw = await AsyncStorage.getItem(FILTER_KEY);
    return raw ? (JSON.parse(raw) as Filters) : null;
  } catch {
    return null;
  }
}

export async function saveFilters(f: Filters): Promise<void> {
  try {
    await AsyncStorage.setItem(FILTER_KEY, JSON.stringify(f));
  } catch {
    // nieistotne
  }
}

/** Liczba dni do daty (YYYY-MM-DD) względem dzisiejszej północy; null gdy brak daty. */
export function daysLeft(d?: string | null): number | null {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return null;
  const end = new Date(y, m - 1, day).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((end - today) / 86400000);
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

export function isNew(c: Contest): boolean {
  if (!c.addedAt) return false;
  const t = new Date(c.addedAt).getTime();
  return !isNaN(t) && Date.now() - t < 36 * 3600 * 1000;
}

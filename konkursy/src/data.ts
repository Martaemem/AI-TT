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
  purchase: boolean;
  url: string;
  note?: string;
  addedAt?: string;
};

export type Status = '' | 'sent' | 'later' | 'no';
export type Mine = Record<string, { status: Status; answer: string; updatedAt?: string }>;
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

export type Filters = { buy: 'all' | 'free' | 'buy'; status: 'todo' | 'later' | 'sent' | 'no' | 'all' };

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

import { Ingredient } from './types';

// jednostka kanoniczna -> [1, 2-4, 5+]
const FORMS: Record<string, [string, string, string]> = {
  łyżka: ['łyżka', 'łyżki', 'łyżek'],
  łyżeczka: ['łyżeczka', 'łyżeczki', 'łyżeczek'],
  szklanka: ['szklanka', 'szklanki', 'szklanek'],
  szczypta: ['szczypta', 'szczypty', 'szczypt'],
  opakowanie: ['opakowanie', 'opakowania', 'opakowań'],
  sztuka: ['sztuka', 'sztuki', 'sztuk'],
  puszka: ['puszka', 'puszki', 'puszek'],
  ząbek: ['ząbek', 'ząbki', 'ząbków'],
  plaster: ['plaster', 'plastry', 'plasterków'],
  kostka: ['kostka', 'kostki', 'kostek'],
  garść: ['garść', 'garście', 'garści'],
  pęczek: ['pęczek', 'pęczki', 'pęczków'],
  listek: ['listek', 'listki', 'listków'],
  łodyga: ['łodyga', 'łodygi', 'łodyg'],
  tabliczka: ['tabliczka', 'tabliczki', 'tabliczek'],
  kromka: ['kromka', 'kromki', 'kromek'],
};

const PLAIN = ['kg', 'g', 'dag', 'mg', 'l', 'ml', 'dl', 'cl'];

// każda odmiana -> forma kanoniczna
const LOOKUP: Record<string, string> = {};
for (const [canon, forms] of Object.entries(FORMS)) {
  LOOKUP[canon] = canon;
  forms.forEach((f) => (LOOKUP[f] = canon));
}
Object.assign(LOOKUP, {
  łyżkę: 'łyżka', łyżeczę: 'łyżeczka', szklankę: 'szklanka', szczyptę: 'szczypta', szt: 'sztuka', 'szt.': 'sztuka',
  opak: 'opakowanie', 'opak.': 'opakowanie', tbsp: 'łyżka', tsp: 'łyżeczka', cup: 'szklanka', cups: 'szklanka',
  litr: 'l', litra: 'l', gram: 'g', gramy: 'g', gramów: 'g', 'g.': 'g', 'ml.': 'ml',
});
PLAIN.forEach((u) => (LOOKUP[u] = u));

const VULGAR: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

const num = (s: string): number => {
  const t = s.trim();
  if (VULGAR[t] !== undefined) return VULGAR[t];
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(t.replace(',', '.'));
};

const AMOUNT = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+[.,]\d+|\d+\s?[½¼¾⅓⅔]|\d+|[½¼¾⅓⅔])/;

/** „2 łyżki oliwy” -> { amount: 2, unit: 'łyżka', name: 'oliwy' }. Zakresy („2-3”) zostają w nazwie. */
export function parseIngredient(raw: string): Ingredient {
  let line = raw.trim().replace(/^[-–•*·]+\s*/, '').replace(/\s+/g, ' ');
  const m = line.match(AMOUNT);
  if (!m || /^\s*[-–]\s*\d/.test(line.slice(m[0].length))) return { name: line };
  let amountText = m[1].replace(/^(\d+)\s?([½¼¾⅓⅔])$/, (_, w, f) => String(Number(w) + VULGAR[f]));
  const amount = num(amountText);
  let rest = line.slice(m[0].length).trim();
  let unit: string | undefined;
  // przymiotnik przed jednostką („czubata łyżka”) przenosimy za nazwę
  const adj = rest.match(/^(czubat\p{L}*|płask\p{L}*|duż\p{L}*|mał\p{L}*|głębok\p{L}*)\s+(?=\p{L})/iu);
  let adjective = '';
  if (adj) {
    const after = rest.slice(adj[0].length).match(/^([\p{L}.]+)(?=\s|$)/u);
    if (after && LOOKUP[after[1].toLowerCase()]) {
      adjective = adj[1];
      rest = rest.slice(adj[0].length);
    }
  }
  const w = rest.match(/^([\p{L}.]+)(?=\s|$)/u);
  if (w) {
    const key = w[1].toLowerCase();
    const canon = LOOKUP[key] ?? LOOKUP[key.replace(/\.$/, '')];
    if (canon) {
      unit = canon;
      rest = rest.slice(w[0].length).trim();
    }
  }
  rest = rest.replace(/^(z|ze|of)\s+/i, '');
  if (adjective && rest) rest = `${rest} (${adjective.toLowerCase()})`;
  return { amount: Number.isFinite(amount) ? amount : undefined, unit, name: rest || line };
}

const FRAC: [number, string][] = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];

export function formatAmount(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  if (frac < 0.04) return String(whole);
  if (frac > 0.96) return String(whole + 1);
  const hit = FRAC.find(([v]) => Math.abs(frac - v) < 0.04);
  if (hit) return `${whole > 0 ? whole : ''}${hit[1]}`;
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function unitLabel(unit: string | undefined, amount: number | undefined): string {
  if (!unit) return '';
  const forms = FORMS[unit];
  if (!forms) return unit;
  if (amount === undefined || amount === 1) return forms[0];
  if (!Number.isInteger(amount)) return forms[1];
  const last = amount % 10;
  const lastTwo = amount % 100;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? forms[1] : forms[2];
}

export function formatIngredient(ing: Ingredient, factor = 1): string {
  if (ing.amount === undefined) return ing.name;
  const amount = ing.amount * factor;
  const unit = unitLabel(ing.unit, Number.isInteger(amount) ? amount : 1.5);
  return `${formatAmount(amount)}${unit ? ` ${unit}` : ''} ${ing.name}`;
}

/** Podział „1 h 30 min” itp. */
export function formatMinutes(min?: number): string {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Czas z tekstu kroku: „piecz 25 minut”, „gotuj 1,5 godziny”. */
export function minutesFromText(text: string): number | undefined {
  const h = text.match(/(\d+(?:[.,]\d+)?)\s*(?:godz|h\b)/i);
  const m = text.match(/(\d+)(?:\s*[-–]\s*\d+)?\s*(?:minut|min\b)/i);
  const total = (h ? Math.round(num(h[1]) * 60) : 0) + (m ? Number(m[1]) : 0);
  return total > 0 ? total : undefined;
}

/** ISO 8601 („PT1H30M”) -> minuty. */
export function isoToMinutes(iso?: string): number | undefined {
  const m = iso?.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const total = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  return total > 0 ? total : undefined;
}

/** Łączy takie same składniki (ta sama nazwa i jednostka) na liście zakupów. */
export const ingredientKey = (i: { name: string; unit?: string }) => `${i.name.trim().toLowerCase()}|${i.unit ?? ''}`;

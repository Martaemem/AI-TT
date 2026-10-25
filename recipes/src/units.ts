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
  łyżkę: 'łyżka', łyżeczkę: 'łyżeczka', szklankę: 'szklanka', szczyptę: 'szczypta', szt: 'sztuka', 'szt.': 'sztuka',
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

// ---------- łączenie składników na liście zakupów ----------

const MASS_G: Record<string, number> = { mg: 0.001, g: 1, dag: 10, kg: 1000 };
const VOL_ML: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000, szklanka: 250, łyżka: 15, łyżeczka: 5 };

// gramy na mililitr dla typowych produktów sypkich (pozwala zsumować „szklanki” z gramami)
const DENSITY: [RegExp, number][] = [
  [/^cukier\s+puder|^cukr\S*\s+puder/, 0.5],
  [/^mąk/, 0.56],
  [/^cukier|^cukr/, 0.8],
  [/^masł/, 0.9],
  [/^kasz/, 0.75],
  [/^ryż/, 0.8],
  [/^kakao/, 0.4],
  [/^miód|^miod/, 1.4],
  [/^sól|^soli/, 1.2],
  [/^płatk/, 0.3],
];

/** Klucz do łączenia: pierwsze dwa słowa po 3 litery, więc „mąki pszennej” = „mąka pszenna”. */
export function ingredientStem(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[^\p{L}\d]+/u)
    .filter((w) => w.length > 2 && !/\d/.test(w) && w !== 'typ')
    .slice(0, 2)
    .map((w) => w.slice(0, 3))
    .join(' ');
}

export type Base = { dim: string; amount?: number; unit?: string };

/** Sprowadza ilość do g / ml albo zostawia jednostkę „sztukową”. */
export function toBase(ing: { amount?: number; unit?: string; name: string }, factor = 1): Base {
  const a = ing.amount === undefined ? undefined : ing.amount * factor;
  const u = ing.unit;
  if (u && MASS_G[u] !== undefined) return { dim: 'g', amount: a === undefined ? undefined : a * MASS_G[u], unit: 'g' };
  if (u && VOL_ML[u] !== undefined) {
    const ml = a === undefined ? undefined : a * VOL_ML[u];
    const d = DENSITY.find(([re]) => re.test(ing.name.toLowerCase()));
    if (d) return { dim: 'g', amount: ml === undefined ? undefined : ml * d[1], unit: 'g' };
    return { dim: 'ml', amount: ml, unit: 'ml' };
  }
  return { dim: u ?? '', amount: a, unit: u };
}

/** 1500 g -> „1,5 kg”, 250 ml -> „250 ml”, reszta jak w przepisie. */
export function formatBase(amount: number | undefined, unit: string | undefined): string {
  if (amount === undefined) return '';
  if (unit === 'g') return amount >= 1000 ? `${formatAmount(amount / 1000)} kg` : `${Math.round(amount)} g`;
  if (unit === 'ml') return amount >= 1000 ? `${formatAmount(amount / 1000)} l` : `${Math.round(amount)} ml`;
  const u = unitLabel(unit, Number.isInteger(amount) ? amount : 1.5);
  return `${formatAmount(amount)}${u ? ` ${u}` : ''}`;
}

/** Liczba porcji z tekstu („dla 6 osób”, „8 porcji”). */
export function servingsFromText(text: string): number | undefined {
  const m = text.match(/(\d{1,2})\s*(?:porcj|osób|osoby|osoba|os\.|sztuk|kawałk)/i) ?? text.match(/dla\s+(\d{1,2})\b/i);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 50 ? n : undefined;
}

/** Szacunek, gdy przepis nie podaje porcji: ok. 300 g składników na osobę. */
export function estimateServings(ings: Ingredient[]): number {
  const total = ings.reduce((sum, i) => {
    const b = toBase(i);
    return b.unit === 'g' || b.unit === 'ml' ? sum + (b.amount ?? 0) : sum;
  }, 0);
  if (total <= 0) return 4;
  return Math.min(12, Math.max(2, Math.round(total / 300)));
}

const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/** YYYY-MM-DD w czasie lokalnym (toISOString zwracałoby UTC i przesuwało dzień). */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function nextDays(n: number): { iso: string; date: Date }[] {
  const out: { iso: string; date: Date }[] = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    out.push({ iso: isoDate(d), date: d });
  }
  return out;
}

export function dayLabel(d: Date): string {
  const today = isoDate(new Date());
  const tomorrow = isoDate(new Date(Date.now() + 86400000));
  const iso = isoDate(d);
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return iso === today ? `Dziś · ${base}` : iso === tomorrow ? `Jutro · ${base}` : base;
}

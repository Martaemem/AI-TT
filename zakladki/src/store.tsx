import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Category, Data, Item } from './types';
import { CAT_COLORS } from './theme';
import { deletePhoto } from './photos';

/** Baza w pliku – przy tysiącach wpisów pamięć AsyncStorage byłaby za mała. */
const dbFile = () => new File(Paths.document, 'inspirownik.json');

const DEFAULT_CATS: [string, string][] = [
  ['podroze', 'Podróże'],
  ['ai', 'AI'],
  ['przedszkole', 'Przedszkole – inspiracje'],
  ['wczesnoszkolna', 'Edukacja wczesnoszkolna'],
  ['kaszubski', 'Kaszubski'],
  ['materialy', 'Pomysły na moje materiały'],
];

export const defaultData = (): Data => ({
  items: [],
  categories: DEFAULT_CATS.map(([id, name], i) => ({ id, name, color: CAT_COLORS[i % CAT_COLORS.length] })),
});

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Sprawdza i porządkuje dane z pliku (także z kopii zapasowej). */
export function normalize(p: unknown): Data | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Partial<Data>;
  if (!Array.isArray(o.items)) return null;
  const items = o.items
    .filter((i): i is Item => !!i && typeof i === 'object' && typeof (i as Item).id === 'string')
    .map((i) => ({ ...i, title: i.title ?? '', note: i.note ?? '', photos: Array.isArray(i.photos) ? i.photos : [], cats: Array.isArray(i.cats) ? i.cats : [] }));
  const categories = Array.isArray(o.categories) && o.categories.length ? o.categories : defaultData().categories;
  return { items, categories };
}

type Ctx = {
  ready: boolean;
  data: Data;
  saveItem: (item: Item) => void;
  addItems: (items: Item[]) => void;
  deleteItem: (id: string) => void;
  addCategory: (name: string) => Category;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  replaceAll: (data: Data) => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(defaultData);
  const ref = useRef<Data>(data);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const f = dbFile();
        if (f.exists) {
          const next = normalize(JSON.parse(await f.text()));
          if (next) {
            ref.current = next;
            setData(next);
          }
        }
      } catch {
        // uszkodzony plik – zaczynamy od domyślnych
      }
      setReady(true);
    })();
  }, []);

  const persist = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const f = dbFile();
        if (!f.exists) f.create();
        f.write(JSON.stringify(ref.current));
      } catch {
        // błąd zapisu – dane zostają w pamięci do następnej zmiany
      }
    }, 300);
  }, []);

  const commit = useCallback(
    (next: Data) => {
      ref.current = next;
      setData(next);
      persist();
    },
    [persist],
  );

  const saveItem = useCallback(
    (item: Item) => {
      const cur = ref.current;
      const exists = cur.items.some((i) => i.id === item.id);
      commit({ ...cur, items: exists ? cur.items.map((i) => (i.id === item.id ? item : i)) : [item, ...cur.items] });
    },
    [commit],
  );

  const addItems = useCallback(
    (items: Item[]) => {
      if (!items.length) return;
      const cur = ref.current;
      commit({ ...cur, items: [...items, ...cur.items] });
    },
    [commit],
  );

  const deleteItem = useCallback(
    (id: string) => {
      const cur = ref.current;
      const it = cur.items.find((i) => i.id === id);
      it?.photos.forEach(deletePhoto); // usuwa tylko kopie w aplikacji, nigdy zdjęć z galerii
      commit({ ...cur, items: cur.items.filter((i) => i.id !== id) });
    },
    [commit],
  );

  const addCategory = useCallback(
    (name: string): Category => {
      const cur = ref.current;
      const clean = name.trim();
      const existing = cur.categories.find((c) => c.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      const cat: Category = { id: newId(), name: clean, color: CAT_COLORS[cur.categories.length % CAT_COLORS.length] };
      commit({ ...cur, categories: [...cur.categories, cat] });
      return cat;
    },
    [commit],
  );

  const renameCategory = useCallback(
    (id: string, name: string) => {
      const cur = ref.current;
      const clean = name.trim();
      if (!clean) return;
      commit({ ...cur, categories: cur.categories.map((c) => (c.id === id ? { ...c, name: clean } : c)) });
    },
    [commit],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      const cur = ref.current;
      commit({
        categories: cur.categories.filter((c) => c.id !== id),
        items: cur.items.map((i) => (i.cats.includes(id) ? { ...i, cats: i.cats.filter((c) => c !== id) } : i)),
      });
    },
    [commit],
  );

  const replaceAll = useCallback((d: Data) => commit(d), [commit]);

  return (
    <StoreContext.Provider value={{ ready, data, saveItem, addItems, deleteItem, addCategory, renameCategory, deleteCategory, replaceAll }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('StoreProvider missing');
  return ctx;
}

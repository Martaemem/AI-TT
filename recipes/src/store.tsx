import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Data, Ingredient, PlanEntry, Recipe, Settings, ShoppingItem } from './types';
import { defaultData, loadData, saveData } from './storage';
import { formatBase, ingredientStem, toBase } from './units';

type Store = {
  ready: boolean;
  data: Data;
  saveRecipe: (r: Recipe) => void;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  addToShopping: (ings: Ingredient[], factor: number, recipeTitle?: string) => number;
  addShoppingItem: (name: string) => void;
  toggleShopping: (id: string) => void;
  removeShopping: (id: string) => void;
  clearChecked: () => void;
  clearShopping: () => void;
  addToPlan: (date: string, recipeId: string) => void;
  removeFromPlan: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  setSettings: (s: Settings) => void;
};

const Ctx = createContext<Store | null>(null);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(defaultData);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      loaded.current = true;
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (loaded.current) saveData(data);
  }, [data]);

  const saveRecipe = useCallback(
    (r: Recipe) =>
      setData((d) => ({ ...d, recipes: d.recipes.some((x) => x.id === r.id) ? d.recipes.map((x) => (x.id === r.id ? r : x)) : [r, ...d.recipes] })),
    [],
  );
  const updateRecipe = useCallback(
    (id: string, patch: Partial<Recipe>) => setData((d) => ({ ...d, recipes: d.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    [],
  );
  const deleteRecipe = useCallback(
    (id: string) => setData((d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== id), plan: d.plan.filter((p) => p.recipeId !== id) })),
    [],
  );

  /** Dodaje składniki (przeskalowane) do listy zakupów, sumując te same pozycje. Zwraca liczbę dodanych/zaktualizowanych pozycji. */
  const addToShopping = useCallback((ings: Ingredient[], factor: number, recipeTitle?: string) => {
    setData((d) => {
      const list = [...d.shopping];
      for (const ing of ings) {
        const base = toBase(ing, factor);
        const key = `${ingredientStem(ing.name)}|${base.dim}`;
        const src = { title: recipeTitle ?? '', amount: ing.amount === undefined ? undefined : ing.amount * factor, unit: ing.unit };
        const idx = list.findIndex((s) => !s.checked && (s.key ?? `${ingredientStem(s.name)}|${toBase(s).dim}`) === key);
        if (idx >= 0) {
          const cur = list[idx];
          const sum = base.amount !== undefined && cur.amount !== undefined ? cur.amount + base.amount : cur.amount ?? base.amount;
          list[idx] = { ...cur, key, amount: sum, sources: [...(cur.sources ?? []), src] };
        } else {
          list.push({ id: uid(), name: ing.name, amount: base.amount, unit: base.unit, checked: false, recipeTitle, key, sources: [src] });
        }
      }
      return { ...d, shopping: list };
    });
    return ings.length;
  }, []);
  const addShoppingItem = useCallback(
    (name: string) => setData((d) => ({ ...d, shopping: [...d.shopping, { id: uid(), name, checked: false } as ShoppingItem] })),
    [],
  );
  const toggleShopping = useCallback(
    (id: string) => setData((d) => ({ ...d, shopping: d.shopping.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s)) })),
    [],
  );
  const removeShopping = useCallback((id: string) => setData((d) => ({ ...d, shopping: d.shopping.filter((s) => s.id !== id) })), []);
  const clearChecked = useCallback(() => setData((d) => ({ ...d, shopping: d.shopping.filter((s) => !s.checked) })), []);
  const clearShopping = useCallback(() => setData((d) => ({ ...d, shopping: [] })), []);

  const addToPlan = useCallback(
    (date: string, recipeId: string) => setData((d) => ({ ...d, plan: [...d.plan, { id: uid(), date, recipeId } as PlanEntry] })),
    [],
  );
  const removeFromPlan = useCallback((id: string) => setData((d) => ({ ...d, plan: d.plan.filter((p) => p.id !== id) })), []);

  const addCategory = useCallback(
    (name: string) => setData((d) => (d.categories.includes(name) ? d : { ...d, categories: [...d.categories, name] })),
    [],
  );
  const deleteCategory = useCallback(
    (name: string) =>
      setData((d) => ({
        ...d,
        categories: d.categories.filter((c) => c !== name),
        recipes: d.recipes.map((r) => (r.category === name ? { ...r, category: 'Inne' } : r)),
      })),
    [],
  );
  const setSettings = useCallback((settings: Settings) => setData((d) => ({ ...d, settings })), []);

  return (
    <Ctx.Provider
      value={{ ready, data, saveRecipe, updateRecipe, deleteRecipe, addToShopping, addShoppingItem, toggleShopping, removeShopping, clearChecked, clearShopping, addToPlan, removeFromPlan, addCategory, deleteCategory, setSettings }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore poza StoreProvider');
  return s;
}

export const shoppingLabel = (s: ShoppingItem) => {
  const qty = formatBase(s.amount, s.unit);
  return qty ? `${qty} ${s.name}` : s.name;
};

/** „Szarlotka: 2 szklanki · Karpatka: 300 g” – skąd się wzięła suma. */
export const shoppingSources = (s: ShoppingItem): string => {
  const src = s.sources ?? [];
  if (src.length < 2 && !(src.length === 1 && src[0].title)) return '';
  return src.map((x) => `${x.title || 'ręcznie'}${x.amount !== undefined ? `: ${formatBase(x.amount, x.unit)}` : ''}`).join(' · ');
};

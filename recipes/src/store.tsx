import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Data, Ingredient, PlanEntry, Recipe, Settings, ShoppingItem } from './types';
import { defaultData, loadData, saveData } from './storage';
import { formatAmount, ingredientKey, unitLabel } from './units';

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
        const amount = ing.amount !== undefined ? ing.amount * factor : undefined;
        const existing = list.findIndex((s) => !s.checked && ingredientKey(s) === ingredientKey(ing));
        if (existing >= 0 && amount !== undefined && list[existing].amount !== undefined) {
          list[existing] = { ...list[existing], amount: (list[existing].amount as number) + amount };
        } else if (existing < 0) {
          list.push({ id: uid(), name: ing.name, amount, unit: ing.unit, checked: false, recipeTitle });
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

export const shoppingLabel = (s: ShoppingItem) =>
  s.amount !== undefined ? `${formatAmount(s.amount)}${s.unit ? ` ${unitLabel(s.unit, Number.isInteger(s.amount) ? s.amount : 1.5)}` : ''} ${s.name}` : s.name;
